"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
// Copyright 2023 The Nakama Authors
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
var aiUserId = "ai-user-id";
var tfServingAddress = "http://tf:8501/v1/models/ttt:predict";
var aiPresence = {
    userId: aiUserId,
    sessionId: "",
    username: aiUserId,
    node: "",
};
function aiMessage(code, data) {
    return {
        sender: aiPresence,
        persistence: true,
        status: "",
        opCode: code,
        data: data,
        reliable: true,
        receiveTimeMs: Date.now(),
    };
}
function aiTurn(state, logger, nk) {
    var aiCell = [1, 0];
    var playerCell = [0, 1];
    var undefCell = [0, 0];
    // Convert board state into expected model format
    var b = [
        [undefCell, undefCell, undefCell],
        [undefCell, undefCell, undefCell],
        [undefCell, undefCell, undefCell],
    ];
    state.board.forEach(function (mark, idx) {
        var rowIdx = Math.floor(idx / 3);
        var cellIdx = idx % 3;
        if (mark === state.marks[aiUserId])
            b[rowIdx][cellIdx] = aiCell;
        else if (mark === null || mark === Mark.UNDEFINED)
            b[rowIdx][cellIdx] = undefCell;
        else
            b[rowIdx][cellIdx] = playerCell;
    });
    // Send the vectors to TF
    var headers = { 'Accept': 'application/json' };
    var resp = nk.httpRequest(tfServingAddress, 'post', headers, JSON.stringify({ instances: [b] }));
    var body = JSON.parse(resp.body);
    var predictions = [];
    try {
        predictions = body.predictions[0];
    }
    catch (error) {
        logger.error("received unexpected TF response: %v: %v", error, body);
        return;
    }
    // Find the index with the highest predicted value
    var maxVal = -Infinity;
    var aiMovePos = -1;
    predictions.forEach(function (val, idx) {
        if (val > maxVal) {
            maxVal = val;
            aiMovePos = idx;
        }
    });
    // Append message to m.messages to be consumed by the next loop run
    if (aiMovePos > -1) {
        var move = nk.stringToBinary(JSON.stringify({ position: aiMovePos }));
        state.aiMessage = aiMessage(OpCode.MOVE, move);
    }
}
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
var rpcIdFindMatch = "find_match_js";
var rpcIdGetProfile = "get_profile_js";
var rpcIdGetMatchHistory = "get_match_history_js";
var rpcIdGetLeaderboard = "get_leaderboard_js";
var rpcIdUpdateUsername = "update_username_js";
function InitModule(ctx, logger, nk, initializer) {
    initializer.registerRpc(rpcIdFindMatch, rpcFindMatch);
    initializer.registerRpc(rpcIdGetProfile, rpcGetOrCreateProfile);
    initializer.registerRpc(rpcIdGetMatchHistory, rpcGetMatchHistory);
    initializer.registerRpc(rpcIdGetLeaderboard, rpcGetLeaderboard);
    initializer.registerRpc(rpcIdUpdateUsername, rpcUpdateUsername);
    initializer.registerMatch(moduleName, {
        matchInit: matchInit,
        matchJoinAttempt: matchJoinAttempt,
        matchJoin: matchJoin,
        matchLeave: matchLeave,
        matchLoop: matchLoop,
        matchTerminate: matchTerminate,
        matchSignal: matchSignal,
    });
    logger.info("JavaScript logic loaded.");
}
var Mark;
(function (Mark) {
    Mark[Mark["UNDEFINED"] = 0] = "UNDEFINED";
    Mark[Mark["X"] = 1] = "X";
    Mark[Mark["O"] = 2] = "O";
})(Mark || (Mark = {}));
// The complete set of opcodes used for communication between clients and server.
var OpCode;
(function (OpCode) {
    // New game round starting.
    OpCode[OpCode["START"] = 1] = "START";
    // Update to the state of an ongoing round.
    OpCode[OpCode["UPDATE"] = 2] = "UPDATE";
    // A game round has just completed.
    OpCode[OpCode["DONE"] = 3] = "DONE";
    // A move the player wishes to make and sends to the server.
    OpCode[OpCode["MOVE"] = 4] = "MOVE";
    // Move was rejected.
    OpCode[OpCode["REJECTED"] = 5] = "REJECTED";
    // Opponent has left the game.
    OpCode[OpCode["OPPONENT_LEFT"] = 6] = "OPPONENT_LEFT";
    // Invite AI player to join instead of the opponent who left the game.
    OpCode[OpCode["INVITE_AI"] = 7] = "INVITE_AI";
})(OpCode || (OpCode = {}));
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
// ============================================================================
// STATE ISOLATION VERIFICATION (Requirements 4.1, 4.2, 4.3, 4.4, 4.5)
// ============================================================================
// This match handler ensures complete isolation between concurrent match instances:
//
// 1. NO GLOBAL MUTABLE STATE: All module-level constants are immutable (const).
//    - moduleName, tickRate, maxEmptySec, etc. are read-only configuration
//    - winningPositions is a constant array that is never modified
//
// 2. STATE PARAMETER ISOLATION: Each match handler function receives its own
//    independent State object via the state parameter. Functions only access
//    and modify this parameter, never global or shared mutable state.
//
// 3. INDEPENDENT STATE INITIALIZATION: matchInit creates a fresh State object
//    for each match instance with no shared references between matches.
//
// 4. SYNCHRONOUS LABEL UPDATES: Match label updates via dispatcher.matchLabelUpdate()
//    are called synchronously when player count changes, ensuring matchmaking
//    queries always see accurate match availability.
//
// 5. INDEPENDENT TICK LOOPS: Each match instance has its own tick loop managed
//    by Nakama, with state isolated per instance.
//
// All match handler functions are annotated with STATE ISOLATION comments to
// document that they only access the state parameter for their specific match.
// ============================================================================
var moduleName = "tic-tac-toe_js";
var tickRate = 5;
var maxEmptySec = 30;
var delaybetweenGamesSec = 5;
var turnTimeFastSec = 10;
var turnTimeNormalSec = 20;
var winningPositions = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];
function parseParamBoolean(value) {
    if (value === undefined || value === null || value === "") {
        return false;
    }
    var lowerValue = value.toLowerCase();
    if (lowerValue === "0" || lowerValue === "false") {
        return false;
    }
    if (lowerValue === "1" || lowerValue === "true") {
        return true;
    }
    // For any other non-empty string, return true (following the spec requirement)
    return true;
}
var matchInit = function (ctx, logger, nk, params) {
    var fast = parseParamBoolean(params["fast"]);
    var ai = parseParamBoolean(params["ai"]);
    var label = {
        open: 1,
        fast: fast ? 1 : 0,
        mode: "classic",
        ai: ai ? 1 : 0,
    };
    logger.info("Match %s: Initializing with fast=%s, ai=%s", ctx.matchId, fast, ai);
    // STATE ISOLATION: Each match instance gets its own independent state object
    // This ensures complete isolation between concurrent match instances
    var state = {
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
    logger.info("Match %s initialized: tickRate=%d, fast=%s, ai=%s, label=%s", ctx.matchId, tickRate, fast, ai, JSON.stringify(label));
    return {
        state: state,
        tickRate: tickRate,
        label: JSON.stringify(label),
    };
};
var matchJoinAttempt = function (ctx, logger, nk, dispatcher, tick, state, presence, metadata) {
    if (presence.userId in state.presences) {
        if (state.presences[presence.userId] === null) {
            // User rejoining after a disconnect.
            state.joinsInProgress++;
            logger.info("Match %s: Player %s rejoining after disconnect", ctx.matchId, presence.userId);
            return {
                state: state,
                accept: true,
            };
        }
        else {
            // User attempting to join from 2 different devices at the same time.
            logger.warn("Match %s: Player %s rejected - already joined", ctx.matchId, presence.userId);
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
    var maxPlayers = state.ai ? 1 : 2;
    var currentHumanPlayers = connectedHumanPlayers(state);
    if (currentHumanPlayers + state.joinsInProgress >= maxPlayers) {
        logger.info("Match %s: Player %s rejected - match full (humans=%d/%d, ai=%s)", ctx.matchId, presence.userId, currentHumanPlayers, maxPlayers, state.ai);
        return {
            state: state,
            accept: false,
            rejectMessage: "match full",
        };
    }
    // New player attempting to connect.
    state.joinsInProgress++;
    logger.info("Match %s: Player %s join attempt accepted (connected=%d, joining=%d)", ctx.matchId, presence.userId, connectedPlayers(state), state.joinsInProgress);
    return {
        state: state,
        accept: true,
    };
};
var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    // STATE ISOLATION: Only accesses the state parameter for this specific match instance
    var t = msecToSec(Date.now());
    for (var _i = 0, presences_1 = presences; _i < presences_1.length; _i++) {
        var presence = presences_1[_i];
        state.emptyTicks = 0;
        state.presences[presence.userId] = presence;
        state.joinsInProgress--;
        logger.info("Match %s: Player %s joined (connected=%d, playing=%s)", ctx.matchId, presence.userId, connectedPlayers(state), state.playing);
        // Check if we must send a message to this user to update them on the current game state.
        if (state.playing) {
            // There's a game still currently in progress, the player is re-joining after a disconnect. Give them a state update.
            var update = {
                board: state.board,
                mark: state.mark,
                deadline: t + Math.floor(state.deadlineRemainingTicks / tickRate),
            };
            // Send a message to the user that just joined.
            dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(update));
            logger.debug("Match %s: Sent UPDATE to rejoining player %s", ctx.matchId, presence.userId);
        }
        else if (state.board.length !== 0 &&
            Object.keys(state.marks).length !== 0 &&
            state.marks[presence.userId]) {
            logger.debug("Match %s: Player %s rejoined after game ended", ctx.matchId, presence.userId);
            // There's no game in progress but we still have a completed game that the user was part of.
            // They likely disconnected before the game ended, and have since forfeited because they took too long to return.
            var done = {
                board: state.board,
                winner: state.winner,
                winnerPositions: state.winnerPositions,
                nextGameStart: t + Math.floor(state.nextGameRemainingTicks / tickRate),
            };
            // Send a message to the user that just joined.
            dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(done));
        }
    }
    // LABEL UPDATE: Synchronously update match label when capacity is reached
    // For AI matches: close when 1 human player joins (AI is already present)
    // For normal matches: close when 2 human players join
    var maxPlayers = state.ai ? 1 : 2;
    var currentHumanPlayers = connectedHumanPlayers(state);
    if (currentHumanPlayers >= maxPlayers && state.label.open != 0) {
        state.label.open = 0;
        var labelJSON = JSON.stringify(state.label);
        dispatcher.matchLabelUpdate(labelJSON);
        logger.info("Match %s: Label updated to closed (humans=%d/%d, ai=%s, label=%s)", ctx.matchId, currentHumanPlayers, maxPlayers, state.ai, labelJSON);
    }
    return { state: state };
};
var matchLeave = function (ctx, logger, nk, dispatcher, tick, state, presences) {
    // STATE ISOLATION: Only accesses the state parameter for this specific match instance
    for (var _i = 0, presences_2 = presences; _i < presences_2.length; _i++) {
        var presence = presences_2[_i];
        logger.info("Match %s: Player %s left (connected=%d, playing=%s)", ctx.matchId, presence.userId, connectedPlayers(state) - 1, state.playing);
        state.presences[presence.userId] = null;
    }
    // LABEL UPDATE: Synchronously reopen match if space is now available and match hasn't started
    // For AI matches: reopen if no human players (AI stays)
    // For normal matches: reopen if less than 2 players
    var maxPlayers = state.ai ? 1 : 2;
    var currentHumanPlayers = connectedHumanPlayers(state);
    if (currentHumanPlayers < maxPlayers &&
        state.label.open === 0 &&
        !state.playing) {
        state.label.open = 1;
        var labelJSON = JSON.stringify(state.label);
        dispatcher.matchLabelUpdate(labelJSON);
        logger.info("Match %s: Label updated to open (humans=%d/%d, ai=%s, label=%s)", ctx.matchId, currentHumanPlayers, maxPlayers, state.ai, labelJSON);
    }
    var humanPlayersRemaining = [];
    Object.keys(state.presences).forEach(function (userId) {
        if (userId !== aiUserId && state.presences[userId] !== null)
            humanPlayersRemaining.push(state.presences[userId]);
    });
    // Notify remaining player that the opponent has left the game
    if (humanPlayersRemaining.length === 1) {
        dispatcher.broadcastMessage(OpCode.OPPONENT_LEFT, null, humanPlayersRemaining, null, true);
        logger.info("Match %s: Notified remaining player of opponent departure", ctx.matchId);
    }
    else if (state.ai && humanPlayersRemaining.length === 0) {
        delete state.presences[aiUserId];
        state.ai = false;
        logger.info("Match %s: AI player removed (no human players)", ctx.matchId);
    }
    return { state: state };
};
var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
    // STATE ISOLATION: Only accesses the state parameter for this specific match instance
    // Each match has its own independent tick loop
    var _a;
    if (connectedPlayers(state) + state.joinsInProgress === 0) {
        state.emptyTicks++;
        if (state.emptyTicks >= maxEmptySec * tickRate) {
            // Match has been empty for too long, close it.
            logger.info("Match %s: Closing due to idle timeout (emptyTicks=%d)", ctx.matchId, state.emptyTicks);
            return null;
        }
    }
    var t = msecToSec(Date.now());
    // If there's no game in progress check if we can (and should) start one!
    if (!state.playing) {
        // Between games any disconnected users are purged, there's no in-progress game for them to return to anyway.
        for (var userID in state.presences) {
            if (state.presences[userID] === null) {
                delete state.presences[userID];
            }
        }
        // Check if we need to update the label so the match now advertises itself as open to join.
        if (Object.keys(state.presences).length < 2 && state.label.open != 1) {
            state.label.open = 1;
            var labelJSON = JSON.stringify(state.label);
            dispatcher.matchLabelUpdate(labelJSON);
        }
        // Check if we have enough players to start a game.
        if (Object.keys(state.presences).length < 2) {
            return { state: state };
        }
        // Check if enough time has passed since the last game.
        if (state.nextGameRemainingTicks > 0) {
            state.nextGameRemainingTicks--;
            return { state: state };
        }
        // We can start a game! Set up the game state and assign the marks to each player.
        state.playing = true;
        state.board = [null, null, null, null, null, null, null, null, null];
        state.marks = {};
        var marks_1 = [Mark.X, Mark.O];
        Object.keys(state.presences).forEach(function (userId) {
            var _a;
            if (state.ai) {
                if (userId === aiUserId) {
                    state.marks[userId] = Mark.O;
                }
                else {
                    state.marks[userId] = Mark.X;
                }
            }
            else {
                state.marks[userId] = (_a = marks_1.shift()) !== null && _a !== void 0 ? _a : null;
            }
        });
        state.mark = Mark.X;
        state.winner = Mark.UNDEFINED;
        state.winnerPositions = null;
        state.deadlineRemainingTicks = calculateDeadlineTicks(state.label);
        state.nextGameRemainingTicks = 0;
        logger.info("Match %s: Game started (players=%d, marks=%s)", ctx.matchId, Object.keys(state.presences).length, JSON.stringify(state.marks));
        // Notify the players a new game has started.
        var msg = {
            board: state.board,
            marks: state.marks,
            mark: state.mark,
            deadline: t + Math.floor(state.deadlineRemainingTicks / tickRate),
        };
        dispatcher.broadcastMessage(OpCode.START, JSON.stringify(msg));
        return { state: state };
    }
    if (state.aiMessage !== null) {
        messages.push(state.aiMessage);
        state.aiMessage = null;
    }
    var _loop_1 = function (message) {
        switch (message.opCode) {
            case OpCode.MOVE:
                var mark = (_a = state.marks[message.sender.userId]) !== null && _a !== void 0 ? _a : null;
                logger.debug("Received move message from user: %s (mark: %s)", message.sender.userId, mark === Mark.X ? "X" : "O");
                var sender = message.sender.userId == aiUserId ? null : [message.sender];
                if (mark === null || state.mark != mark) {
                    // It is not this player's turn.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    return "continue";
                }
                var msg = {};
                try {
                    msg = JSON.parse(nk.binaryToString(message.data));
                }
                catch (error) {
                    // Client sent bad data.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    logger.debug("Bad data received: %v", error);
                    return "continue";
                }
                if (state.board[msg.position]) {
                    // Client sent a position outside the board, or one that has already been played.
                    dispatcher.broadcastMessage(OpCode.REJECTED, null, sender);
                    return "continue";
                }
                // Update the game state.
                state.board[msg.position] = mark;
                state.mark = mark === Mark.O ? Mark.X : Mark.O;
                state.deadlineRemainingTicks = calculateDeadlineTicks(state.label);
                // Check if game is over through a winning move.
                var _b = winCheck(state.board, mark), winner = _b[0], winningPos = _b[1];
                if (winner) {
                    state.winner = mark;
                    state.winnerPositions = winningPos;
                    state.playing = false;
                    state.deadlineRemainingTicks = 0;
                    state.nextGameRemainingTicks =
                        delaybetweenGamesSec * tickRate;
                    logger.info("Match %s: Game ended - winner=%s, positions=%s", ctx.matchId, mark === Mark.X ? "X" : "O", JSON.stringify(winningPos));
                    // Update player profiles
                    if (ctx.matchId) {
                        updatePlayerProfilesAfterMatch(nk, logger, state, ctx.matchId);
                    }
                }
                // Check if game is over because no more moves are possible.
                var tie = state.board.every(function (v) { return v !== null; });
                if (tie) {
                    // Update state to reflect the tie, and schedule the next game.
                    state.playing = false;
                    state.deadlineRemainingTicks = 0;
                    state.nextGameRemainingTicks =
                        delaybetweenGamesSec * tickRate;
                    logger.info("Match %s: Game ended - tie", ctx.matchId);
                    // Update player profiles for tie
                    if (ctx.matchId) {
                        updatePlayerProfilesAfterMatch(nk, logger, state, ctx.matchId);
                    }
                }
                var opCode = void 0;
                var outgoingMsg = void 0;
                if (state.playing) {
                    opCode = OpCode.UPDATE;
                    var msg_1 = {
                        board: state.board,
                        mark: state.mark,
                        deadline: t +
                            Math.floor(state.deadlineRemainingTicks / tickRate),
                    };
                    outgoingMsg = msg_1;
                }
                else {
                    opCode = OpCode.DONE;
                    var msg_2 = {
                        board: state.board,
                        winner: state.winner,
                        winnerPositions: state.winnerPositions,
                        nextGameStart: t +
                            Math.floor(state.nextGameRemainingTicks / tickRate),
                    };
                    outgoingMsg = msg_2;
                }
                dispatcher.broadcastMessage(opCode, JSON.stringify(outgoingMsg));
                break;
            case OpCode.INVITE_AI:
                if (state.ai) {
                    logger.error("AI player is already playing");
                    return "continue";
                }
                var activePlayers_1 = [];
                Object.keys(state.presences).forEach(function (userId) {
                    var p = state.presences[userId];
                    if (p === null) {
                        delete state.presences[userId];
                    }
                    else {
                        activePlayers_1.push(p);
                    }
                });
                logger.debug("active users: %d", activePlayers_1.length);
                if (activePlayers_1.length != 1) {
                    logger.error("one active player is required to enable AI mode");
                    return "continue";
                }
                state.ai = true;
                state.presences[aiUserId] = aiPresence;
                if (state.marks[activePlayers_1[0].userId] == Mark.O) {
                    state.marks[aiUserId] = Mark.X;
                }
                else {
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
    };
    // There's a game in progress. Check for input, update match state, and send messages to clientstate.
    for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
        var message = messages_1[_i];
        _loop_1(message);
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
            var msg = {
                board: state.board,
                winner: state.winner,
                nextGameStart: t + Math.floor(state.nextGameRemainingTicks / tickRate),
                winnerPositions: null,
            };
            dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(msg));
        }
    }
    // The next turn is AI's
    if (state.ai && state.mark === state.marks[aiUserId]) {
        aiTurn(state, logger, nk);
    }
    return { state: state };
};
var matchTerminate = function (ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
    // STATE ISOLATION: Only accesses the state parameter for this specific match instance
    logger.info("Match %s: Terminating (graceSeconds=%d, connected=%d)", ctx.matchId, graceSeconds, connectedPlayers(state));
    return { state: state };
};
var matchSignal = function (ctx, logger, nk, dispatcher, tick, state) {
    return { state: state };
};
function msecToSec(n) {
    return Math.floor(n / 1000);
}
function calculateDeadlineTicks(l) {
    if (l.fast === 1) {
        return turnTimeFastSec * tickRate;
    }
    else {
        return turnTimeNormalSec * tickRate;
    }
}
function winCheck(board, mark) {
    for (var _i = 0, winningPositions_1 = winningPositions; _i < winningPositions_1.length; _i++) {
        var wp = winningPositions_1[_i];
        if (board[wp[0]] === mark &&
            board[wp[1]] === mark &&
            board[wp[2]] === mark) {
            return [true, wp];
        }
    }
    return [false, null];
}
function connectedPlayers(s) {
    var count = 0;
    for (var _i = 0, _a = Object.keys(s.presences); _i < _a.length; _i++) {
        var p = _a[_i];
        if (s.presences[p] !== null) {
            count++;
        }
    }
    return count;
}
function connectedHumanPlayers(s) {
    var count = 0;
    for (var _i = 0, _a = Object.keys(s.presences); _i < _a.length; _i++) {
        var p = _a[_i];
        if (s.presences[p] !== null && p !== aiUserId) {
            count++;
        }
    }
    return count;
}
function updatePlayerProfilesAfterMatch(nk, logger, state, matchId) {
    var _a, _b;
    // Get both players
    var playerIds = Object.keys(state.marks).filter(function (id) { return id !== aiUserId; });
    if (playerIds.length !== 2) {
        logger.warn("Cannot update profiles: expected 2 players, got %d", playerIds.length);
        return;
    }
    var player1Id = playerIds[0], player2Id = playerIds[1];
    var player1Mark = state.marks[player1Id];
    var player2Mark = state.marks[player2Id];
    // Get usernames
    var player1Username = "Player 1";
    var player2Username = "Player 2";
    try {
        var account1 = nk.accountGetId(player1Id);
        var account2 = nk.accountGetId(player2Id);
        player1Username = ((_a = account1.user) === null || _a === void 0 ? void 0 : _a.username) || player1Username;
        player2Username = ((_b = account2.user) === null || _b === void 0 ? void 0 : _b.username) || player2Username;
    }
    catch (error) {
        logger.error("Error fetching account info: %v", error);
    }
    // Determine results
    var player1Result;
    var player2Result;
    if (state.winner === null || state.winner === Mark.UNDEFINED) {
        // Draw
        player1Result = "draw";
        player2Result = "draw";
    }
    else if (state.winner === player1Mark) {
        player1Result = "win";
        player2Result = "loss";
    }
    else {
        player1Result = "loss";
        player2Result = "win";
    }
    // Update both profiles
    updateProfileAfterMatchLocal(nk, logger, player1Id, player1Result, player2Id, player2Username, matchId, state.ai);
    updateProfileAfterMatchLocal(nk, logger, player2Id, player2Result, player1Id, player1Username, matchId, state.ai);
}
function updateProfileAfterMatchLocal(nk, logger, userId, result, opponentId, opponentUsername, matchId, isAI) {
    var _a, _b;
    var COLLECTION_PROFILES = "profiles";
    var COLLECTION_MATCH_HISTORY = "match_history";
    // Don't update stats for AI matches
    if (isAI) {
        logger.info("Skipping profile update for AI match");
        return;
    }
    try {
        // Read current profile
        var objects = nk.storageRead([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: userId,
            },
        ]);
        var profile = void 0;
        if (objects.length === 0) {
            // Create new profile if doesn't exist
            var account = nk.accountGetId(userId);
            profile = {
                username: ((_a = account.user) === null || _a === void 0 ? void 0 : _a.username) || "Player",
                score: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                avatar_url: ((_b = account.user) === null || _b === void 0 ? void 0 : _b.avatarUrl) || "",
                created_at: Date.now(),
                updated_at: Date.now(),
            };
        }
        else {
            profile = objects[0].value;
        }
        // Calculate score change
        var scoreChange = 0;
        if (result === "win") {
            profile.wins++;
            scoreChange = 50;
        }
        else if (result === "loss") {
            profile.losses++;
            scoreChange = -10;
        }
        else {
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
        var historyEntry = {
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
        logger.info("Updated profile for user %s: result=%s, score_change=%d, new_score=%d", userId, result, scoreChange, profile.score);
    }
    catch (error) {
        logger.error("Error updating profile: %v", error);
    }
}
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
var rpcFindMatch = function (ctx, logger, nk, payload) {
    if (!ctx.userId) {
        throw Error("No user ID in context");
    }
    if (!payload) {
        throw Error("Expects payload.");
    }
    var request = {};
    try {
        request = JSON.parse(payload);
    }
    catch (error) {
        logger.error("Error parsing json message: %q", error);
        throw error;
    }
    var handlerName = moduleName;
    var labelMode = "classic";
    var fast = request.fast ? 1 : 0;
    logger.info("RPC findMatch: userId=%s, fast=%s (type=%s), ai=%s (type=%s), payload=%s", ctx.userId, request.fast, typeof request.fast, request.ai, typeof request.ai, payload);
    // AI Mode: Always create a new single-player match
    if (request.ai) {
        try {
            var matchId_1 = nk.matchCreate(handlerName, {
                fast: request.fast ? "1" : "0",
                ai: "1",
            });
            logger.info("RPC findMatch: Created AI match %s for user %s (fast=%s)", matchId_1, ctx.userId, request.fast);
            var res_1 = { matchIds: [matchId_1] };
            return JSON.stringify(res_1);
        }
        catch (error) {
            logger.error("Error creating AI match: %v", error);
            throw error;
        }
    }
    // Classic Mode: Find or create a 2-player match
    // Query for open classic matches (NOT AI matches)
    var query = "+label.open:1 +label.mode:".concat(labelMode, " +label.fast:").concat(fast, " +label.ai:0");
    var matches;
    try {
        // Use authoritative=true to get real-time match state
        matches = nk.matchList(10, true, null, null, 1, query);
        logger.info("RPC findMatch: Query '%s' returned %d matches", query, matches.length);
        // Log details of each match found
        matches.forEach(function (m, idx) {
            logger.info("RPC findMatch: Match %d: id=%s, size=%d, label=%s", idx, m.matchId, m.size, m.label);
        });
    }
    catch (error) {
        logger.error("Error listing matches: %v", error);
        throw error;
    }
    // Filter matches that have space (size < 2) and are truly open
    // Also exclude matches that are already at capacity
    var availableMatches = matches.filter(function (m) {
        var isAvailable = m.size < 2;
        logger.info("RPC findMatch: Evaluating match %s: size=%d, available=%s", m.matchId, m.size, isAvailable);
        return isAvailable;
    });
    logger.info("RPC findMatch: %d of %d matches have available space", availableMatches.length, matches.length);
    var matchId;
    if (availableMatches.length > 0) {
        // Join the first available match with space
        matchId = availableMatches[0].matchId;
        logger.info("RPC findMatch: User %s joining existing match %s (size=%d/%d)", ctx.userId, matchId, availableMatches[0].size, 2);
    }
    else {
        // No available matches, create a new one
        try {
            matchId = nk.matchCreate(handlerName, {
                fast: request.fast ? "1" : "0",
                ai: "0",
            });
            logger.info("RPC findMatch: Created new classic match %s for user %s (fast=%s)", matchId, ctx.userId, request.fast);
        }
        catch (error) {
            logger.error("Error creating match: %v", error);
            throw error;
        }
    }
    var res = { matchIds: [matchId] };
    return JSON.stringify(res);
};
// Profile management for Tic-Tac-Toe game
var COLLECTION_PROFILES = "profiles";
var COLLECTION_MATCH_HISTORY = "match_history";
// Initialize or get player profile
var rpcGetOrCreateProfile = function (ctx, logger, nk, payload) {
    var _a, _b;
    if (!ctx.userId) {
        throw Error("No user ID in context");
    }
    var account = nk.accountGetId(ctx.userId);
    // Try to read existing profile
    var objects;
    try {
        objects = nk.storageRead([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: ctx.userId,
            },
        ]);
    }
    catch (error) {
        logger.error("Error reading profile: %v", error);
        throw error;
    }
    var profile;
    if (objects.length === 0) {
        // Create new profile
        profile = {
            username: ((_a = account.user) === null || _a === void 0 ? void 0 : _a.username) || "Player",
            score: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            avatar_url: ((_b = account.user) === null || _b === void 0 ? void 0 : _b.avatarUrl) || "",
            created_at: Date.now(),
            updated_at: Date.now(),
        };
        logger.info("Creating new profile for user %s with username: %s", ctx.userId, profile.username);
        // Write new profile to storage
        try {
            nk.storageWrite([
                {
                    collection: COLLECTION_PROFILES,
                    key: "profile",
                    userId: ctx.userId,
                    value: profile,
                    permissionRead: 2, // Public read
                    permissionWrite: 0, // No client write
                },
            ]);
            logger.info("Profile created successfully for user %s", ctx.userId);
        }
        catch (error) {
            logger.error("Error creating profile: %v", error);
            throw error;
        }
    }
    else {
        profile = objects[0].value;
        logger.info("Found existing profile for user %s: %s", ctx.userId, profile.username);
    }
    return JSON.stringify(profile);
};
// Update username
var rpcUpdateUsername = function (ctx, logger, nk, payload) {
    var _a;
    if (!ctx.userId) {
        throw Error("No user ID in context");
    }
    if (!payload) {
        throw Error("Expects payload with username");
    }
    var request;
    try {
        request = JSON.parse(payload);
    }
    catch (error) {
        logger.error("Error parsing json message: %q", error);
        throw error;
    }
    if (!request.username || request.username.trim() === "") {
        throw Error("Username cannot be empty");
    }
    // Validate username length
    if (request.username.length < 3 || request.username.length > 20) {
        throw Error("Username must be between 3 and 20 characters");
    }
    var trimmedUsername = request.username.trim().toLowerCase();
    try {
        // Check if username is already taken by another user
        // List all profiles to check for duplicate usernames
        var allProfiles = nk.storageList(ctx.userId, COLLECTION_PROFILES, 1000);
        if (allProfiles.objects) {
            for (var _i = 0, _b = allProfiles.objects; _i < _b.length; _i++) {
                var obj = _b[_i];
                var existingProfile = obj.value;
                if (existingProfile.username.toLowerCase() ===
                    trimmedUsername &&
                    obj.userId !== ctx.userId) {
                    throw Error("Username is already taken");
                }
            }
        }
        // Read current profile
        var objects = nk.storageRead([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: ctx.userId,
            },
        ]);
        var profile = void 0;
        if (objects.length === 0) {
            // Create new profile
            var account = nk.accountGetId(ctx.userId);
            profile = {
                username: request.username.trim(),
                score: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                avatar_url: ((_a = account.user) === null || _a === void 0 ? void 0 : _a.avatarUrl) || "",
                created_at: Date.now(),
                updated_at: Date.now(),
            };
        }
        else {
            profile = objects[0].value;
            profile.username = request.username.trim();
            profile.updated_at = Date.now();
        }
        // Update Nakama account username as well
        nk.accountUpdateId(ctx.userId, undefined, undefined, undefined, undefined, undefined, undefined, { display_name: request.username.trim() });
        // Write updated profile
        nk.storageWrite([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: ctx.userId,
                value: profile,
                permissionRead: 2,
                permissionWrite: 0,
            },
        ]);
        logger.info("Updated username for user %s to %s", ctx.userId, request.username.trim());
        return JSON.stringify(profile);
    }
    catch (error) {
        logger.error("Error updating username: %v", error);
        throw error;
    }
};
// Get recent match history
var rpcGetMatchHistory = function (ctx, logger, nk, payload) {
    var _a;
    if (!ctx.userId) {
        throw Error("No user ID in context");
    }
    try {
        var objects = nk.storageList(ctx.userId, COLLECTION_MATCH_HISTORY, 10, "");
        var matches = ((_a = objects.objects) === null || _a === void 0 ? void 0 : _a.map(function (obj) { return obj.value; })) || [];
        return JSON.stringify({ matches: matches });
    }
    catch (error) {
        logger.error("Error reading match history: %v", error);
        throw error;
    }
};
// Update profile after match (called server-side only)
function updateProfileAfterMatch(nk, logger, userId, result, opponentId, opponentUsername, matchId, isAI) {
    // Don't update stats for AI matches
    if (isAI) {
        logger.info("Skipping profile update for AI match");
        return;
    }
    try {
        // Read current profile
        var objects = nk.storageRead([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: userId,
            },
        ]);
        if (objects.length === 0) {
            logger.error("Profile not found for user: %s", userId);
            return;
        }
        var profile = objects[0].value;
        // Calculate score change
        var scoreChange = 0;
        if (result === "win") {
            profile.wins++;
            scoreChange = 50;
        }
        else if (result === "loss") {
            profile.losses++;
            scoreChange = -10;
        }
        else {
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
        var historyEntry = {
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
                permissionRead: 1, // Owner read
                permissionWrite: 0,
            },
        ]);
        logger.info("Updated profile for user %s: result=%s, score_change=%d, new_score=%d", userId, result, scoreChange, profile.score);
    }
    catch (error) {
        logger.error("Error updating profile: %v", error);
    }
}
// Get leaderboard
var rpcGetLeaderboard = function (ctx, logger, nk, payload) {
    try {
        logger.info("RPC getLeaderboard called by user: %s", ctx.userId);
        // Get all user accounts to iterate through their profiles
        var users = nk.usersGetRandom(100); // Get up to 100 random users
        logger.info("Found %d users to check for profiles", users.length);
        var profiles = [];
        if (users.length > 0) {
            // Build read requests for all users' profiles
            var readRequests = users.map(function (user) { return ({
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: user.userId,
            }); });
            try {
                var profileObjects = nk.storageRead(readRequests);
                logger.info("Read %d profile objects", profileObjects.length);
                profiles = profileObjects
                    .filter(function (obj) { return obj.value !== null; })
                    .map(function (obj) { return (__assign(__assign({}, obj.value), { user_id: obj.userId || "" })); });
                logger.info("Mapped %d valid profiles", profiles.length);
                profiles.forEach(function (p, idx) {
                    logger.info("Profile %d: username=%s, score=%d", idx, p.username, p.score);
                });
            }
            catch (readError) {
                logger.error("Error reading profiles: %v", readError);
            }
        }
        // Sort by score descending
        profiles.sort(function (a, b) { return b.score - a.score; });
        // Take top 100
        var topProfiles = profiles.slice(0, 100);
        logger.info("Returning %d profiles in leaderboard", topProfiles.length);
        return JSON.stringify({ leaderboard: topProfiles });
    }
    catch (error) {
        logger.error("Error getting leaderboard: %v", error);
        throw error;
    }
};
