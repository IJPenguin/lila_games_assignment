import Nakama from "../nakama";

class Mainmenu extends Phaser.Scene {
    constructor() {
        super({ key: "Mainmenu" });
        this.leaderboardData = [];
    }

    async create() {
        // Check if user is authenticated, if not redirect to login
        if (!Nakama.isAuthenticated()) {
            console.warn("Not authenticated, redirecting to login");
            this.scene.start("Login");
            return;
        }

        // Load leaderboard data first
        await this.loadLeaderboard();
        this.renderUI();
    }

    async loadLeaderboard() {
        try {
            // Check if Nakama is authenticated before trying to load leaderboard
            if (!Nakama.isAuthenticated()) {
                console.warn(
                    "Nakama not authenticated, skipping leaderboard load"
                );
                this.leaderboardData = [];
                return;
            }

            const data = await Nakama.getLeaderboard();
            this.leaderboardData = data.leaderboard || [];
            console.log("Leaderboard loaded:", this.leaderboardData);
        } catch (error) {
            console.error("Failed to load leaderboard:", error);
            this.leaderboardData = [];
        }
    }

    renderUI() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Add "Tic Tac Toe" heading
        this.add
            .text(centerX, 80, "Tic Tac Toe", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "64px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Add Play button with rounded rectangle background
        const buttonWidth = 200;
        const buttonHeight = 80;

        // Create rounded rectangle for button background
        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0xc83e4d, 1);
        buttonBg.fillRoundedRect(
            centerX - buttonWidth / 2,
            200 - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            12
        );

        // Add button text
        this.add
            .text(centerX, 200, "PLAY", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "48px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Create interactive zone for the button
        const playButton = this.add
            .zone(centerX, 200, buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true });

        // Button hover effects
        playButton.on("pointerover", () => {
            buttonBg.clear();
            buttonBg.fillStyle(0xd2606c, 1);
            buttonBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                200 - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        playButton.on("pointerout", () => {
            buttonBg.clear();
            buttonBg.fillStyle(0xc83e4d, 1);
            buttonBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                200 - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        // Button click handler
        playButton.on("pointerdown", () => {
            this.scene.start("Selection");
        });

        // Add Profile button
        const profileBtnWidth = 150;
        const profileBtnHeight = 50;
        const profileBtnY = 300;

        const profileBg = this.add.graphics();
        profileBg.fillStyle(0x4a4a4a, 1);
        profileBg.fillRoundedRect(
            centerX - profileBtnWidth / 2,
            profileBtnY - profileBtnHeight / 2,
            profileBtnWidth,
            profileBtnHeight,
            12
        );

        this.add
            .text(centerX, profileBtnY, "PROFILE", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const profileButton = this.add
            .zone(centerX, profileBtnY, profileBtnWidth, profileBtnHeight)
            .setInteractive({ useHandCursor: true });

        profileButton.on("pointerover", () => {
            profileBg.clear();
            profileBg.fillStyle(0x5a5a5a, 1);
            profileBg.fillRoundedRect(
                centerX - profileBtnWidth / 2,
                profileBtnY - profileBtnHeight / 2,
                profileBtnWidth,
                profileBtnHeight,
                12
            );
        });

        profileButton.on("pointerout", () => {
            profileBg.clear();
            profileBg.fillStyle(0x4a4a4a, 1);
            profileBg.fillRoundedRect(
                centerX - profileBtnWidth / 2,
                profileBtnY - profileBtnHeight / 2,
                profileBtnWidth,
                profileBtnHeight,
                12
            );
        });

        profileButton.on("pointerdown", () => {
            this.scene.start("Profile");
        });

        // Add Leaderboard section
        this.renderLeaderboard(centerX, 380);
    }

    renderLeaderboard(centerX, startY) {
        // Leaderboard title
        this.add
            .text(centerX, startY, "🏆 Global Leaderboard", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "28px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Leaderboard container background
        const leaderboardWidth = 400;
        const leaderboardHeight = 280;
        const leaderboardBg = this.add.graphics();
        leaderboardBg.fillStyle(0x2a2a2a, 0.9);
        leaderboardBg.fillRoundedRect(
            centerX - leaderboardWidth / 2,
            startY + 30,
            leaderboardWidth,
            leaderboardHeight,
            8
        );

        // Display top 5 players
        const topPlayers = this.leaderboardData.slice(0, 5);

        if (topPlayers.length === 0) {
            this.add
                .text(centerX, startY + 170, "No players yet", {
                    fontFamily: "JetBrains Mono, sans-serif",
                    fontSize: "18px",
                    color: "#888888",
                })
                .setOrigin(0.5);
        } else {
            topPlayers.forEach((player, index) => {
                const yPos = startY + 60 + index * 50;
                const rank = index + 1;

                // Rank medal/number
                let rankText = `${rank}.`;
                let rankColor = "#F4D6CC";
                if (rank === 1) {
                    rankText = "🥇";
                } else if (rank === 2) {
                    rankText = "🥈";
                } else if (rank === 3) {
                    rankText = "🥉";
                }

                // Rank
                this.add
                    .text(centerX - 170, yPos, rankText, {
                        fontFamily: "JetBrains Mono, sans-serif",
                        fontSize: "20px",
                        color: rankColor,
                    })
                    .setOrigin(0, 0.5);

                // Username
                const username = player.username || "Anonymous";
                this.add
                    .text(centerX - 130, yPos, username, {
                        fontFamily: "JetBrains Mono, sans-serif",
                        fontSize: "18px",
                        color: "#F4D6CC",
                    })
                    .setOrigin(0, 0.5);

                // Score
                this.add
                    .text(centerX + 170, yPos, `${player.score}`, {
                        fontFamily: "JetBrains Mono, sans-serif",
                        fontSize: "18px",
                        color: "#C83E4D",
                        fontStyle: "bold",
                    })
                    .setOrigin(1, 0.5);
            });
        }
    }
}

export default Mainmenu;
