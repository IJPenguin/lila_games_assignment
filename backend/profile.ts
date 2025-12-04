// Profile management for Tic-Tac-Toe game

const COLLECTION_PROFILES = "profiles";
const COLLECTION_MATCH_HISTORY = "match_history";

interface PlayerProfile {
    username: string;
    score: number;
    wins: number;
    losses: number;
    draws: number;
    avatar_url?: string;
    created_at: number;
    updated_at: number;
}

interface MatchHistoryEntry {
    match_id: string;
    opponent_id: string;
    opponent_username: string;
    result: "win" | "loss" | "draw";
    score_change: number;
    timestamp: number;
    is_ai: boolean;
}

// Initialize or get player profile
let rpcGetOrCreateProfile: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    if (!ctx.userId) {
        throw Error("No user ID in context");
    }

    const account = nk.accountGetId(ctx.userId);

    // Try to read existing profile
    let objects: nkruntime.StorageObject[];
    try {
        objects = nk.storageRead([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: ctx.userId,
            },
        ]);
    } catch (error) {
        logger.error("Error reading profile: %v", error);
        throw error;
    }

    let profile: PlayerProfile;

    if (objects.length === 0) {
        // Create new profile
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

        logger.info(
            "Creating new profile for user %s with username: %s",
            ctx.userId,
            profile.username
        );

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
        } catch (error) {
            logger.error("Error creating profile: %v", error);
            throw error;
        }
    } else {
        profile = objects[0].value as PlayerProfile;
        logger.info(
            "Found existing profile for user %s: %s",
            ctx.userId,
            profile.username
        );
    }

    return JSON.stringify(profile);
};

// Update username
let rpcUpdateUsername: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    if (!ctx.userId) {
        throw Error("No user ID in context");
    }

    if (!payload) {
        throw Error("Expects payload with username");
    }

    let request: { username: string };
    try {
        request = JSON.parse(payload);
    } catch (error) {
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

    const trimmedUsername = request.username.trim().toLowerCase();

    try {
        // Check if username is already taken by another user
        // List all profiles to check for duplicate usernames
        const allProfiles = nk.storageList(
            ctx.userId,
            COLLECTION_PROFILES,
            1000
        );

        if (allProfiles.objects) {
            for (const obj of allProfiles.objects) {
                const existingProfile = obj.value as PlayerProfile;
                if (
                    existingProfile.username.toLowerCase() ===
                        trimmedUsername &&
                    obj.userId !== ctx.userId
                ) {
                    throw Error("Username is already taken");
                }
            }
        }

        // Read current profile
        const objects = nk.storageRead([
            {
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: ctx.userId,
            },
        ]);

        let profile: PlayerProfile;

        if (objects.length === 0) {
            // Create new profile
            const account = nk.accountGetId(ctx.userId);
            profile = {
                username: request.username.trim(),
                score: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                avatar_url: account.user?.avatarUrl || "",
                created_at: Date.now(),
                updated_at: Date.now(),
            };
        } else {
            profile = objects[0].value as PlayerProfile;
            profile.username = request.username.trim();
            profile.updated_at = Date.now();
        }

        // Update Nakama account username as well
        nk.accountUpdateId(
            ctx.userId,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { display_name: request.username.trim() }
        );

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

        logger.info(
            "Updated username for user %s to %s",
            ctx.userId,
            request.username.trim()
        );

        return JSON.stringify(profile);
    } catch (error) {
        logger.error("Error updating username: %v", error);
        throw error;
    }
};

// Get recent match history
let rpcGetMatchHistory: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    if (!ctx.userId) {
        throw Error("No user ID in context");
    }

    try {
        const objects = nk.storageList(
            ctx.userId,
            COLLECTION_MATCH_HISTORY,
            10,
            ""
        );
        const matches: MatchHistoryEntry[] =
            objects.objects?.map((obj) => obj.value as MatchHistoryEntry) || [];

        return JSON.stringify({ matches });
    } catch (error) {
        logger.error("Error reading match history: %v", error);
        throw error;
    }
};

// Update profile after match (called server-side only)
function updateProfileAfterMatch(
    nk: nkruntime.Nakama,
    logger: nkruntime.Logger,
    userId: string,
    result: "win" | "loss" | "draw",
    opponentId: string,
    opponentUsername: string,
    matchId: string,
    isAI: boolean
): void {
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

        if (objects.length === 0) {
            logger.error("Profile not found for user: %s", userId);
            return;
        }

        const profile = objects[0].value as PlayerProfile;

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
        const historyEntry: MatchHistoryEntry = {
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

// Get leaderboard
let rpcGetLeaderboard: nkruntime.RpcFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        logger.info("RPC getLeaderboard called by user: %s", ctx.userId);

        // Get all user accounts to iterate through their profiles
        const users = nk.usersGetRandom(100); // Get up to 100 random users
        
        logger.info("Found %d users to check for profiles", users.length);

        let profiles: (PlayerProfile & { user_id: string })[] = [];

        if (users.length > 0) {
            // Build read requests for all users' profiles
            const readRequests = users.map((user) => ({
                collection: COLLECTION_PROFILES,
                key: "profile",
                userId: user.userId,
            }));

            try {
                const profileObjects = nk.storageRead(readRequests);
                
                logger.info("Read %d profile objects", profileObjects.length);

                profiles = profileObjects
                    .filter((obj) => obj.value !== null)
                    .map((obj) => ({
                        ...(obj.value as PlayerProfile),
                        user_id: obj.userId || "",
                    }));

                logger.info("Mapped %d valid profiles", profiles.length);
                profiles.forEach((p, idx) => {
                    logger.info(
                        "Profile %d: username=%s, score=%d",
                        idx,
                        p.username,
                        p.score
                    );
                });
            } catch (readError) {
                logger.error("Error reading profiles: %v", readError);
            }
        }

        // Sort by score descending
        profiles.sort((a, b) => b.score - a.score);

        // Take top 100
        const topProfiles = profiles.slice(0, 100);

        logger.info("Returning %d profiles in leaderboard", topProfiles.length);

        return JSON.stringify({ leaderboard: topProfiles });
    } catch (error) {
        logger.error("Error getting leaderboard: %v", error);
        throw error;
    }
};
