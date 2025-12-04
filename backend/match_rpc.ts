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

let rpcFindMatch: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    if (!ctx.userId) {
        throw Error("No user ID in context");
    }

    if (!payload) {
        throw Error("Expects payload.");
    }

    let request = {} as RpcFindMatchRequest;
    try {
        request = JSON.parse(payload);
    } catch (error) {
        logger.error("Error parsing json message: %q", error);
        throw error;
    }

    const handlerName = moduleName;
    const labelMode = "classic";
    const fast = request.fast ? 1 : 0;

    logger.info(
        "RPC findMatch: userId=%s, fast=%s (type=%s), ai=%s (type=%s), payload=%s",
        ctx.userId,
        request.fast,
        typeof request.fast,
        request.ai,
        typeof request.ai,
        payload
    );

    // AI Mode: Always create a new single-player match
    if (request.ai) {
        try {
            const matchId = nk.matchCreate(handlerName, {
                fast: request.fast ? "1" : "0",
                ai: "1",
            });

            logger.info(
                "RPC findMatch: Created AI match %s for user %s (fast=%s)",
                matchId,
                ctx.userId,
                request.fast
            );

            const res: RpcFindMatchResponse = { matchIds: [matchId] };
            return JSON.stringify(res);
        } catch (error) {
            logger.error("Error creating AI match: %v", error);
            throw error;
        }
    }

    // Classic Mode: Find or create a 2-player match
    // Query for open classic matches (NOT AI matches)
    const query = `+label.open:1 +label.mode:${labelMode} +label.fast:${fast} +label.ai:0`;

    let matches: nkruntime.Match[];
    try {
        // Use authoritative=true to get real-time match state
        matches = nk.matchList(10, true, null, null, 1, query);
        logger.info(
            "RPC findMatch: Query '%s' returned %d matches",
            query,
            matches.length
        );
        
        // Log details of each match found
        matches.forEach((m, idx) => {
            logger.info(
                "RPC findMatch: Match %d: id=%s, size=%d, label=%s",
                idx,
                m.matchId,
                m.size,
                m.label
            );
        });
    } catch (error) {
        logger.error("Error listing matches: %v", error);
        throw error;
    }

    // Filter matches that have space (size < 2) and are truly open
    // Also exclude matches that are already at capacity
    const availableMatches = matches.filter((m) => {
        const isAvailable = m.size < 2;
        logger.info(
            "RPC findMatch: Evaluating match %s: size=%d, available=%s",
            m.matchId,
            m.size,
            isAvailable
        );
        return isAvailable;
    });

    logger.info(
        "RPC findMatch: %d of %d matches have available space",
        availableMatches.length,
        matches.length
    );

    let matchId: string;
    if (availableMatches.length > 0) {
        // Join the first available match with space
        matchId = availableMatches[0].matchId;
        logger.info(
            "RPC findMatch: User %s joining existing match %s (size=%d/%d)",
            ctx.userId,
            matchId,
            availableMatches[0].size,
            2
        );
    } else {
        // No available matches, create a new one
        try {
            matchId = nk.matchCreate(handlerName, {
                fast: request.fast ? "1" : "0",
                ai: "0",
            });
            logger.info(
                "RPC findMatch: Created new classic match %s for user %s (fast=%s)",
                matchId,
                ctx.userId,
                request.fast
            );
        } catch (error) {
            logger.error("Error creating match: %v", error);
            throw error;
        }
    }

    const res: RpcFindMatchResponse = { matchIds: [matchId] };
    return JSON.stringify(res);
};
