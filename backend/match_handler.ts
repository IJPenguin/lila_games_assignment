// Copyright 2020 The Nakama Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const moduleName = "tic-tac-toe_js";
const tickRate = 5;
const maxEmptySec = 30;
const delaybetweenGamesSec = 5;
const turnTimeFastSec = 10;
const turnTimeNormalSec = 20;

const winningPositions: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

interface MatchLabel {
    open: number;
    fast: number;
    mode: string;
    ai: number;
}

interface State {
    // Match label
    label: MatchLabel;
    // Ticks where no actions have occurred.
    emptyTicks: number;
    // Currently connected users, or reserved spaces.
    presences: { [userId: string]: nkruntime.Presence | null };
    // Number of users currently in the process of connecting to the match.
    joinsInProgress: number;
    // True if there's a game currently in progress.
    playing: boolean;
    // Current state of the board.
    board: Board;
    // Mark assignments to player user IDs.
    marks: { [userId: string]: Mark | null };
    // Whose turn it currently is.
    mark: Mark;
    // Ticks until they must submit their move.
    deadlineRemainingTicks: number;
    // The winner of the current game.
    winner: Mark | null;
    // The winner positions.
    winnerPositions: BoardPosition[] | null;
    // Ticks until the next game starts, if applicable.
    nextGameRemainingTicks: number;
    // AI playing mode
    ai: boolean;
    // A move message from AI player
    aiMessage: nkruntime.MatchMessage | null;
}

function parseParamBoolean(value: string | undefined): boolean {
    if (value === undefined || value === null || value === "") {
        return false;
    }
    
    const lowerValue = value.toLowerCase();
    
    if (lowerValue === "0" || lowerValue === "false") {
        return false;
    }
    
    if (lowerValue === "1" || lowerValue === "true") {
        return true;
    }
    
    // For any other non-empty string, return true (following the spec requirement)
    return true;
}

let matchInit: nkruntime.MatchInitFunction<State> = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    params: { [key: string]: string }
) {
    const fast = parseParamBoolean(params["fast"]);
    const ai = parseParamBoolean(params["ai"]);

    let label: MatchLabel = {
        open: 1,
        fast: fast ? 1 : 0,
        mode: "classic",
        ai: ai ? 1 : 0,
    };

    logger.info(
        "Match %s: Initializing with fast=%s, ai=%s",
        ctx.matchId,
        fast,
        ai
    );

    // STATE ISOLATION: Each match instance gets its own independent state object
    // This ensures complete isolation between concurrent match instances
    let state: State = {
        label: label,
        emptyTicks: 0,
        presences: {},
        joinsInProgress: 0,
        playing: false,
        board: [],
        marks: {},
        mark: Mark.UNDEFINED,
        deadlineRemainingTicks: 0,
        winner: null,
        winnerPositions: null,
        nextGameRemainingTicks: 0,
        ai: ai,
        aiMessage: null,
    };

    if (ai) {
        state.presences[aiUserId] = aiPresence;
        // AI matches should be open initially to let the human player join
        // But will close after first human joins (capacity check will handle this)
    }

    logger.info(
        "Match %s initialized: tickRate=%d, fast=%s, ai=%s, label=%s",
        ctx.matchId,
        tickRate,
        fast,
        ai,
        JSON.stringify(label)
    );

    return {
        state,
        tickRate,
        label: JSON.stringify(label),
    };
};

let matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<State> = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: State,
    presence: nkruntime.Presence,
    metadata: { [key: string]: any }
) {
    if (presence.userId in state.presences) {
        if (state.presences[presence.userId] === null) {
            // User rejoining after a disconnect.
            state.joinsInProgress++;
            logger.info(
                "Match %s: Player %s rejoining after disconnect",
                ctx.matchId,
                presence.userId
            );
            return {
                state: state,
                accept: true,
            };
        } else {
            // User attempting to join from 2 different devices at the same time.
            logger.warn(
                "Match %s: Player %s rejected - already joined",
                ctx.matchId,
                presence.userId
            );
            return {
                state: state,
                accept: false,
                rejectMessage: "already joined",
            };
        }
    }

    // Check if match is full.
    // For AI matches: only allow 1 human player (AI is already present)
    // For normal matches: allow 2 human players
    const maxPlayers = state.ai ? 1 : 2;
    const currentHumanPlayers = connectedHumanPlayers(state);

    if (currentHumanPlayers + state.joinsInProgress >= maxPlayers) {
        logger.info(
            "Match %s: Player %s rejected - match full (humans=%d/%d, ai=%s)",
            ctx.matchId,
            presence.userId,
            currentHumanPlayers,
            maxPlayers,
            state.ai
        );
        return {
            state: state,
            accept: false,
            rejectMessage: "match full",
        };
    }

    // New player attempting to connect.
    state.joinsInProgress++;
    logger.info(
        "Match %s: Player %s join attempt accepted (connected=%d, joining=%d)",
        ctx.matchId,
        presence.userId,
        connectedPlayers(state),
        state.joinsInProgress
    );
    return {
        state,
        accept: true,
    };
};

let matchJoin: nkruntime.MatchJoinFunction<State> = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: State,
    presences: nkruntime.Presence[]
) {
    // STATE ISOLATION: Only accesses the state parameter for this specific match instance
    const t = msecToSec(Date.now());

    for (const presence of presences) {
        state.emptyTicks = 0;
        state.presences[presence.userId] = presence;
        state.joinsInProgress--;

        logger.info(
            "Match %s: Player %s joined (connected=%d, playing=%s)",
            ctx.matchId,
            presence.userId,
            connectedPlayers(state),
            state.playing
        );

        // Check if we must send a message to this user to update them on the current game state.
        if (state.playing) {
            // There's a game still currently in progress, the player is re-joining after a disconnect. Give them a state update.
            let update: UpdateMessage = {
                board: state.board,
                mark: state.mark,
                deadline:
                    t + Math.floor(state.deadlineRemainingTicks / tickRate),
            };
            // Send a message to the user that just joined.
            dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(update));
            logger.debug(
                "Match %s: Sent UPDATE to rejoining player %s",
                ctx.matchId,
                presence.userId
            );
        } else if (
            state.board.length !== 0 &&
            Object.keys(state.marks).length !== 0 &&
            state.marks[presence.userId]
        ) {
            logger.debug(
                "Match %s: Player %s rejoined after game ended",
                ctx.matchId,
                presence.userId
            );
            // There's no game in progress but we still have a completed game that the user was part of.
            // They likely disconnected before the game ended, and have since forfeited because they took too long to return.
            let done: DoneMessage = {
                board: state.board,
                winner: state.winner,
                winnerPositions: state.winnerPositions,
                nextGameStart:
                    t + Math.floor(state.nextGameRemainingTicks / tickRate),
            };
            // Send a message to the user that just joined.
            dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(done));
        }
    }

    // LABEL UPDATE: Synchronously update match label when capacity is reached
    // For AI matches: close when 1 human player joins (AI is already present)
    // For normal matches: close when 2 human players join
    const maxPlayers = state.ai ? 1 : 2;
    const currentHumanPlayers = connectedHumanPlayers(state);

    if (currentHumanPlayers >= maxPlayers && state.label.open != 0) {
        state.label.open = 0;
        const labelJSON = JSON.stringify(state.label);
        dispatcher.matchLabelUpdate(labelJSON);
        logger.info(
            "Match %s: Label updated to closed (humans=%d/%d, ai=%s, label=%s)",
            ctx.matchId,
            currentHumanPlayers,
            maxPlayers,
            state.ai,
            labelJSON
        );
    }

    return { state };
};

let matchLeave: nkruntime.MatchLeaveFunction<State> = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: State,
    presences: nkruntime.Presence[]
) {
    // STATE ISOLATION: Only accesses the state parameter for this specific match instance
    for (let presence of presences) {
        logger.info(
            "Match %s: Player %s left (connected=%d, playing=%s)",
            ctx.matchId,
            presence.userId,
            connectedPlayers(state) - 1,
            state.playing
        );
        state.presences[presence.userId] = null;
    }

    // LABEL UPDATE: Synchronously reopen match if space is now available and match hasn't started
    // For AI matches: reopen if no human players (AI stays)
    // For normal matches: reopen if less than 2 players
    const maxPlayers = state.ai ? 1 : 2;
    const currentHumanPlayers = connectedHumanPlayers(state);

    if (
        currentHumanPlayers < maxPlayers &&
        state.label.open === 0 &&
        !state.playing
    ) {
        state.label.open = 1;
        const labelJSON = JSON.stringify(state.label);
        dispatcher.matchLabelUpdate(labelJSON);
        logger.info(
            "Match %s: Label updated to open (humans=%d/%d, ai=%s, label=%s)",
            ctx.matchId,
            currentHumanPlayers,
            maxPlayers,
            state.ai,
            labelJSON
        );
    }

    let humanPlayersRemaining: nkruntime.Presence[] = [];
    Object.keys(state.presences).forEach((userId) => {
        if (userId !== aiUserId && state.presences[userId] !== null)
            humanPlayersRemaining.push(state.presences[userId]!);
    });

    // Notify remaining player that the opponent has left the game
    if (humanPlayersRemaining.length === 1) {
        dispatcher.broadcastMessage(
            OpCode.OPPONENT_LEFT,
            null,
            humanPlayersRemaining,
            null,
            true
        );
        logger.info(
            "Match %s: Notified remaining player of opponent departure",
            ctx.matchId
        );
    } else if (state.ai && humanPlayersRemaining.length === 0) {
        delete state.presences[aiUserId];
        state.ai = false;
        logger.info(
            "Match %s: AI player removed (no human players)",
            ctx.matchId
        );
    }

    return { state };
};

let matchLoop: nkruntime.MatchLoopFunction<State> = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: State,
    messages: nkruntime.MatchMessage[]
) {
    // STATE ISOLATION: Only accesses the state parameter for this specific match instance
    // Each match has its own independent tick loop

    if (connectedPlayers(state) + state.joinsInProgress === 0) {
        state.emptyTicks++;
        if (state.emptyTicks >= maxEmptySec * tickRate) {
            // Match has been empty for too long, close it.
            logger.info(
                "Match %s: Closing due to idle timeout (emptyTicks=%d)",
                ctx.matchId,
                state.emptyTicks
            );
            return null;
        }
    }

    let t = msecToSec(Date.now());

    // If there's no game in progress check if we can (and should) start one!
    if (!state.playing) {
        // Between games any disconnected users are purged, there's no in-progress game for them to return to anyway.
        for (let userID in state.presences) {
            if (state.presences[userID] === null) {
                delete state.presences[userID];
            }
        }

        // Check if we need to update the label so the match now advertises itself as open to join.
        if (Object.keys(state.presences).length < 2 && state.label.open != 1) {
            state.label.open = 1;
            let labelJSON = JSON.stringify(state.label);
            dispatcher.matchLabelUpdate(labelJSON);
        }

        // Check if we have enough players to start a game.
        if (Object.keys(state.presences).length < 2) {
            return { state };
        }

        // Check if enough time has passed since the last game.
        if (state.nextGameRemainingTicks > 0) {
            state.nextGameRemainingTicks--;
            return { state };
        }

        // We can start a game! Set up the game state and assign the marks to each player.
        state.playing = true;
        state.board = [null, null, null, null, null, null, null, null, null];
        state.marks = {};
        let marks = [Mark.X, Mark.O];
        Object.keys(state.presences).forEach((userId) => {
            if (state.ai) {
                if (userId === aiUserId) {
                    state.marks[userId] = Mark.O;
                } else {
                    state.marks[userId] = Mark.X;
                }
            } else {
                state.marks[userId] = marks.shift() ?? null;
            }
        });
        state.mark = Mark.X;
        state.winner = Mark.UNDEFINED;
        state.winnerPositions = null;
        state.deadlineRemainingTicks = calculateDeadlineTicks(state.label);
        state.nextGameRemainingTicks = 0;

        logger.info(
            "Match %s: Game started (players=%d, marks=%s)",
            ctx.matchId,
            Object.keys(state.presences).length,
            JSON.stringify(state.marks)
        );

        // Notify the players a new game has started.
        let msg: StartMessage = {
            board: state.board,
            marks: state.marks,
            mark: state.mark,
            deadline: t + Math.floor(state.deadlineRemainingTicks / tickRate),
        };
        dispatcher.broadcastMessage(OpCode.START, JSON.stringify(msg));

        return { state };
    }

    if (state.aiMessage !== null) {
        messages.push(state.aiMessage);
        state.aiMessage = null;
    }

    // There's a game in progress. Check for input, update match state, and send messages to clientstate.
    for (const message of messages) {
        switch (message.opCode) {
            case OpCode.MOVE:
                let mark = state.marks[message.sender.userId] ?? null;
                logger.debug(
                    "Received move message from user: %s (mark: %s)",
                    message.sender.userId,
                    mark === Mark.X ? "X" : "O"
                );
                let sender =
                    message.sender.userId == aiUserId ? null : [message.sender];
                if (mark === null || state.mark != mark) {
                    // It is not this player's turn.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    continue;
                }

                let msg = {} as MoveMessage;
                try {
                    msg = JSON.parse(nk.binaryToString(message.data));
                } catch (error) {
                    // Client sent bad data.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    logger.debug("Bad data received: %v", error);
                    continue;
                }
                if (state.board[msg.position]) {
                    // Client sent a position outside the board, or one that has already been played.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    continue;
                }

                // Update the game state.
                state.board[msg.position] = mark;
                state.mark = mark === Mark.O ? Mark.X : Mark.O;
                state.deadlineRemainingTicks = calculateDeadlineTicks(
                    state.label
                );

                // Check if game is over through a winning move.
                const [winner, winningPos] = winCheck(state.board, mark);
                if (winner) {
                    state.winner = mark;
                    state.winnerPositions = winningPos;
                    state.playing = false;
                    state.deadlineRemainingTicks = 0;
                    state.nextGameRemainingTicks =
                        delaybetweenGamesSec * tickRate;

                    logger.info(
                        "Match %s: Game ended - winner=%s, positions=%s",
                        ctx.matchId,
                        mark === Mark.X ? "X" : "O",
                        JSON.stringify(winningPos)
                    );

                    // Update player profiles
                    if (ctx.matchId) {
                        updatePlayerProfilesAfterMatch(
                            nk,
                            logger,
                            state,
                            ctx.matchId
                        );
                    }
                }
                // Check if game is over because no more moves are possible.
                let tie = state.board.every((v) => v !== null);
                if (tie) {
                    // Update state to reflect the tie, and schedule the next game.
                    state.playing = false;
                    state.deadlineRemainingTicks = 0;
                    state.nextGameRemainingTicks =
                        delaybetweenGamesSec * tickRate;

                    logger.info("Match %s: Game ended - tie", ctx.matchId);

                    // Update player profiles for tie
                    if (ctx.matchId) {
                        updatePlayerProfilesAfterMatch(
                            nk,
                            logger,
                            state,
                            ctx.matchId
                        );
                    }
                }

                let opCode: OpCode;
                let outgoingMsg: Message;
                if (state.playing) {
                    opCode = OpCode.UPDATE;
                    let msg: UpdateMessage = {
                        board: state.board,
                        mark: state.mark,
                        deadline:
                            t +
                            Math.floor(state.deadlineRemainingTicks / tickRate),
                    };
                    outgoingMsg = msg;
                } else {
                    opCode = OpCode.DONE;
                    let msg: DoneMessage = {
                        board: state.board,
                        winner: state.winner,
                        winnerPositions: state.winnerPositions,
                        nextGameStart:
                            t +
                            Math.floor(state.nextGameRemainingTicks / tickRate),
                    };
                    outgoingMsg = msg;
                }
                dispatcher.broadcastMessage(
                    opCode,
                    JSON.stringify(outgoingMsg)
                );
                break;
            case OpCode.INVITE_AI:
                if (state.ai) {
                    logger.error("AI player is already playing");
                    continue;
                }

                let activePlayers: nkruntime.Presence[] = [];

                Object.keys(state.presences).forEach((userId) => {
                    let p = state.presences[userId];
                    if (p === null) {
                        delete state.presences[userId];
                    } else {
                        activePlayers.push(p);
                    }
                });

                logger.debug("active users: %d", activePlayers.length);

                if (activePlayers.length != 1) {
                    logger.error(
                        "one active player is required to enable AI mode"
                    );
                    continue;
                }

                state.ai = true;
                state.presences[aiUserId] = aiPresence;

                if (state.marks[activePlayers[0].userId] == Mark.O) {
                    state.marks[aiUserId] = Mark.X;
                } else {
                    state.marks[aiUserId] = Mark.O;
                }

                logger.info("AI player joined match");
                break;

            default:
                // No other opcodes are expected from the client, so automatically treat it as an error.
                dispatcher.broadcastMessage(OpCode.REJECTED, null, [
                    message.sender,
                ]);
                logger.error("Unexpected opcode received: %d", message.opCode);
        }
    }

    // Keep track of the time remaining for the player to submit their move. Idle players forfeit.
    if (state.playing) {
        state.deadlineRemainingTicks--;
        if (state.deadlineRemainingTicks <= 0) {
            // The player has run out of time to submit their move.
            state.playing = false;
            state.winner = state.mark === Mark.O ? Mark.X : Mark.O;
            state.deadlineRemainingTicks = 0;
            state.nextGameRemainingTicks = delaybetweenGamesSec * tickRate;

            let msg: DoneMessage = {
                board: state.board,
                winner: state.winner,
                nextGameStart:
                    t + Math.floor(state.nextGameRemainingTicks / tickRate),
                winnerPositions: null,
            };
            dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(msg));
        }
    }

    // The next turn is AI's
    if (state.ai && state.mark === state.marks[aiUserId]) {
        aiTurn(state, logger, nk);
    }

    return { state };
};

let matchTerminate: nkruntime.MatchTerminateFunction<State> = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: State,
    graceSeconds: number
) {
    // STATE ISOLATION: Only accesses the state parameter for this specific match instance
    logger.info(
        "Match %s: Terminating (graceSeconds=%d, connected=%d)",
        ctx.matchId,
        graceSeconds,
        connectedPlayers(state)
    );
    return { state };
};

let matchSignal: nkruntime.MatchSignalFunction<State> = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: State
) {
    return { state };
};

function msecToSec(n: number): number {
    return Math.floor(n / 1000);
}

function calculateDeadlineTicks(l: MatchLabel): number {
    if (l.fast === 1) {
        return turnTimeFastSec * tickRate;
    } else {
        return turnTimeNormalSec * tickRate;
    }
}

function winCheck(board: Board, mark: Mark): [boolean, Mark[] | null] {
    for (let wp of winningPositions) {
        if (
            board[wp[0]] === mark &&
            board[wp[1]] === mark &&
            board[wp[2]] === mark
        ) {
            return [true, wp];
        }
    }

    return [false, null];
}

function connectedPlayers(s: State): number {
    let count = 0;
    for (const p of Object.keys(s.presences)) {
        if (s.presences[p] !== null) {
            count++;
        }
    }
    return count;
}

function connectedHumanPlayers(s: State): number {
    let count = 0;
    for (const p of Object.keys(s.presences)) {
        if (s.presences[p] !== null && p !== aiUserId) {
            count++;
        }
    }
    return count;
}

function updatePlayerProfilesAfterMatch(
    nk: nkruntime.Nakama,
    logger: nkruntime.Logger,
    state: State,
    matchId: string
): void {
    // Get both players
    const playerIds = Object.keys(state.marks).filter((id) => id !== aiUserId);

    if (playerIds.length !== 2) {
        logger.warn(
            "Cannot update profiles: expected 2 players, got %d",
            playerIds.length
        );
        return;
    }

    const [player1Id, player2Id] = playerIds;
    const player1Mark = state.marks[player1Id];
    const player2Mark = state.marks[player2Id];

    // Get usernames
    let player1Username = "Player 1";
    let player2Username = "Player 2";

    try {
        const account1 = nk.accountGetId(player1Id);
        const account2 = nk.accountGetId(player2Id);
        player1Username = account1.user?.username || player1Username;
        player2Username = account2.user?.username || player2Username;
    } catch (error) {
        logger.error("Error fetching account info: %v", error);
    }

    // Determine results
    let player1Result: "win" | "loss" | "draw";
    let player2Result: "win" | "loss" | "draw";

    if (state.winner === null || state.winner === Mark.UNDEFINED) {
        // Draw
        player1Result = "draw";
        player2Result = "draw";
    } else if (state.winner === player1Mark) {
        player1Result = "win";
        player2Result = "loss";
    } else {
        player1Result = "loss";
        player2Result = "win";
    }

    // Update both profiles
    updateProfileAfterMatchLocal(
        nk,
        logger,
        player1Id,
        player1Result,
        player2Id,
        player2Username,
        matchId,
        state.ai
    );
    updateProfileAfterMatchLocal(
        nk,
        logger,
        player2Id,
        player2Result,
        player1Id,
        player1Username,
        matchId,
        state.ai
    );
}

function updateProfileAfterMatchLocal(
    nk: nkruntime.Nakama,
    logger: nkruntime.Logger,
    userId: string,
    result: "win" | "loss" | "draw",
    opponentId: string,
    opponentUsername: string,
    matchId: string,
    isAI: boolean
): void {
    const COLLECTION_PROFILES = "profiles";
    const COLLECTION_MATCH_HISTORY = "match_history";

    // Don't update stats for AI matches
    if (isAI) {
        logger.info("Skipping profile update for AI match");
        return;
    }

    try {
        // Read current profile
        const objects = nk.storageRead([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: userId,
            },
        ]);

        let profile: any;
        if (objects.length === 0) {
            // Create new profile if doesn't exist
            const account = nk.accountGetId(userId);
            profile = {
                username: account.user?.username || "Player",
                score: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                avatar_url: account.user?.avatarUrl || "",
                created_at: Date.now(),
                updated_at: Date.now(),
            };
        } else {
            profile = objects[0].value;
        }

        // Calculate score change
        let scoreChange = 0;
        if (result === "win") {
            profile.wins++;
            scoreChange = 50;
        } else if (result === "loss") {
            profile.losses++;
            scoreChange = -10;
        } else {
            profile.draws++;
            scoreChange = 0;
        }

        profile.score += scoreChange;
        profile.updated_at = Date.now();

        // Update profile
        nk.storageWrite([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: userId,
                value: profile,
                permissionRead: 2,
                permissionWrite: 0,
            },
        ]);

        // Add to match history
        const historyEntry = {
            match_id: matchId,
            opponent_id: opponentId,
            opponent_username: opponentUsername,
            result: result,
            score_change: scoreChange,
            timestamp: Date.now(),
            is_ai: isAI,
        };

        nk.storageWrite([
            {
                collection: COLLECTION_MATCH_HISTORY,
                key: matchId,
                userId: userId,
                value: historyEntry,
                permissionRead: 1,
                permissionWrite: 0,
            },
        ]);

        logger.info(
            "Updated profile for user %s: result=%s, score_change=%d, new_score=%d",
            userId,
            result,
            scoreChange,
            profile.score
        );
    } catch (error) {
        logger.error("Error updating profile: %v", error);
    }
}
