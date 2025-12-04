import { Client } from "@heroiclabs/nakama-js";
import { v4 as uuidv4 } from "uuid";
import nakamaConfig from "./config";

class Nakama {
    constructor() {
        this.client = null;
        this.session = null;
        this.socket = null;
        this.matchID = null;
        this.currentMatchID = null; // Track the active match context
    }

    async authenticate() {
        console.log("Starting guest authentication...");
        try {
            const { host, port, key, useSSL } = nakamaConfig;

            // When using SSL, use "443" as string, otherwise use configured port
            const clientPort = useSSL ? "443" : port;

            this.client = new Client(key, host, clientPort);
            this.client.ssl = useSSL;
            console.log(
                `Nakama client created - ${
                    useSSL ? "https" : "http"
                }://${host}${useSSL ? "" : ":" + port}`
            );

            // Use sessionStorage instead of localStorage to create unique users per tab/window
            let deviceId = sessionStorage.getItem("deviceId");
            if (!deviceId) {
                deviceId = uuidv4();
                sessionStorage.setItem("deviceId", deviceId);
                console.log(
                    "Created new device ID for this session:",
                    deviceId
                );
            } else {
                console.log("Using existing device ID from session:", deviceId);
            }

            console.log("Authenticating device...");
            this.session = await this.client.authenticateDevice(deviceId, true);
            console.log("Device authenticated, session:", this.session);
            sessionStorage.setItem("user_id", this.session.user_id);

            const trace = false;
            console.log("Creating socket...");
            this.socket = this.client.createSocket(false, trace);
            console.log("Socket created, connecting...");
            await this.socket.connect(this.session);
            console.log("Socket connected successfully");
        } catch (error) {
            console.error("Authentication failed:", error);
            throw error;
        }
    }

    async authenticateEmail(email, password, username = null) {
        console.log("Authenticating email:", email, "username:", username);

        const { host, port, key, useSSL } = nakamaConfig;

        // When using SSL, use "443" as string, otherwise use configured port
        const clientPort = useSSL ? "443" : port;

        this.client = new Client(key, host, clientPort);
        this.client.ssl = useSSL;

        try {
            if (username) {
                // Sign up - create new account
                console.log("Creating new account with username:", username);
                this.session = await this.client.authenticateEmail(
                    email,
                    password,
                    true, // create account
                    username
                );
                console.log("Account created successfully");
            } else {
                // Login - authenticate existing account
                console.log("Logging in existing account");
                this.session = await this.client.authenticateEmail(
                    email,
                    password,
                    false // don't create account
                );
                console.log("Login successful");
            }
        } catch (error) {
            console.error("Email authentication failed:", error);
            throw error;
        }

        sessionStorage.setItem("user_id", this.session.user_id);
        sessionStorage.setItem("auth_type", "email");

        const trace = false;
        this.socket = this.client.createSocket(false, trace);
        await this.socket.connect(this.session);
        console.log("Socket connected for email auth");
    }

    isAuthenticated() {
        return this.session !== null;
    }

    getAuthType() {
        return sessionStorage.getItem("auth_type") || "device";
    }

    async findMatch(ai = false, fast = false) {
        const rpcid = "find_match_js";
        console.log("[DEBUG] findMatch called with ai=", ai, "fast=", fast);
        console.log("[DEBUG] Socket connected:", this.socket ? "yes" : "no");

        // Ensure socket is connected
        if (!this.socket) {
            console.error("Socket not connected, cannot join match");
            throw new Error("Socket connection has not been established yet.");
        }

        const matches = await this.client.rpc(this.session, rpcid, {
            ai: ai,
            fast: fast,
        });
        console.log("[DEBUG] RPC response:", matches.payload);

        this.matchID = matches.payload.matchIds[0];
        this.currentMatchID = this.matchID; // Set active match context

        // Join the match and wait for confirmation
        console.log("[DEBUG] Attempting to join match:", this.matchID);
        const match = await this.socket.joinMatch(this.matchID);
        console.log("Match joined:", this.matchID, "Match object:", match);

        // Verify we actually joined successfully
        if (!match || !match.match_id) {
            throw new Error("Failed to join match - no match object returned");
        }

        // Check if we have self presence (indicates successful join)
        if (!match.self) {
            console.warn(
                "Join returned match but no self presence - join rejected"
            );
            throw new Error(
                "Failed to join match - no self presence (match may be full)"
            );
        }

        console.log("Successfully joined match, our presence:", match.self);
        return this.matchID; // Return matchID for validation
    }

    async makeMove(index) {
        console.log(
            "makeMove called - socket:",
            this.socket,
            "matchID:",
            this.matchID
        );
        if (!this.socket) {
            console.error(
                "Socket not initialized - client:",
                this.client,
                "session:",
                this.session
            );
            throw new Error("Socket connection has not been established yet.");
        }
        var data = { position: index };
        console.log("Sending match state - OpCode 4, data:", data);
        await this.socket.sendMatchState(this.matchID, 4, JSON.stringify(data));
        console.log("Match data sent");
    }

    async inviteAI() {
        await this.socket.sendMatchState(this.matchID, 7, "");
        console.log("AI player invited");
    }

    async getProfile() {
        const result = await this.client.rpc(
            this.session,
            "get_profile_js",
            {}
        );
        // Handle double-encoded JSON
        let parsed = result.payload;
        if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
            if (typeof parsed === "string") {
                parsed = JSON.parse(parsed);
            }
        }
        return parsed;
    }

    async getMatchHistory() {
        const result = await this.client.rpc(
            this.session,
            "get_match_history_js",
            {}
        );
        // Handle double-encoded JSON
        let parsed = result.payload;
        if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
            if (typeof parsed === "string") {
                parsed = JSON.parse(parsed);
            }
        }
        return parsed;
    }

    async getLeaderboard() {
        const result = await this.client.rpc(
            this.session,
            "get_leaderboard_js",
            {}
        );
        // Handle double-encoded JSON
        let parsed = result.payload;
        if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
            if (typeof parsed === "string") {
                parsed = JSON.parse(parsed);
            }
        }
        return parsed;
    }

    async updateUsername(username) {
        const result = await this.client.rpc(
            this.session,
            "update_username_js",
            { username }
        );
        // Handle double-encoded JSON
        let parsed = result.payload;
        if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
            // Check if it's still a string (double-encoded)
            if (typeof parsed === "string") {
                parsed = JSON.parse(parsed);
            }
        }
        return parsed;
    }

    // Clean up match-specific state
    cleanupMatch() {
        this.matchID = null;
        this.currentMatchID = null;
        console.log("Match state cleaned up");
    }

    // Leave current match and clean up
    async leaveMatch() {
        if (this.socket && this.matchID) {
            await this.socket.leaveMatch(this.matchID);
            console.log("Left match:", this.matchID);
            this.cleanupMatch();
        }
    }
}

export default new Nakama();
