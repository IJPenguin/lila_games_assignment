import Nakama from "../nakama";

class Profile extends Phaser.Scene {
    constructor() {
        super({ key: "Profile" });
        this.profileData = null;
        this.matchHistory = null;
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Title
        this.add
            .text(centerX, 60, "Profile", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "36px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Loading text
        const loadingText = this.add
            .text(centerX, centerY, "Loading profile...", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Back button
        this.createBackButton(centerX);

        // Load profile data
        this.loadProfileData(loadingText);
    }

    createBackButton(centerX) {
        const buttonWidth = 150;
        const buttonHeight = 50;
        const buttonY = 680;

        const backBg = this.add.graphics();
        backBg.fillStyle(0xc83e4d, 1);
        backBg.fillRoundedRect(
            centerX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            12
        );

        this.add
            .text(centerX, buttonY, "BACK", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const backButton = this.add
            .zone(centerX, buttonY, buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true });

        backButton.on("pointerover", () => {
            backBg.clear();
            backBg.fillStyle(0xd2606c, 1);
            backBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        backButton.on("pointerout", () => {
            backBg.clear();
            backBg.fillStyle(0xc83e4d, 1);
            backBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                buttonY - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        backButton.on("pointerdown", () => {
            this.scene.start("Mainmenu");
        });
    }

    async loadProfileData(loadingText) {
        try {
            // Get profile data
            this.profileData = await Nakama.getProfile();

            // Get match history
            const historyData = await Nakama.getMatchHistory();
            this.matchHistory = historyData.matches || [];

            loadingText.destroy();
            this.displayProfile();
        } catch (error) {
            console.error("Error loading profile:", error);
            loadingText.setText("Failed to load profile");
        }
    }

    displayProfile() {
        const centerX = this.cameras.main.width / 2;
        const startY = 120;

        // Username
        this.usernameText = this.add
            .text(centerX, startY, this.profileData.username, {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "32px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Edit username button (small button next to username)
        const editBtnWidth = 80;
        const editBtnHeight = 35;
        const editBtnX = centerX + 120;
        const editBtnY = startY;

        const editBg = this.add.graphics();
        editBg.fillStyle(0x4df2f2, 1);
        editBg.fillRoundedRect(
            editBtnX - editBtnWidth / 2,
            editBtnY - editBtnHeight / 2,
            editBtnWidth,
            editBtnHeight,
            8
        );

        this.add
            .text(editBtnX, editBtnY, "Edit", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "16px",
                color: "#1e1e1e",
            })
            .setOrigin(0.5);

        const editButton = this.add
            .zone(editBtnX, editBtnY, editBtnWidth, editBtnHeight)
            .setInteractive({ useHandCursor: true });

        editButton.on("pointerover", () => {
            editBg.clear();
            editBg.fillStyle(0x3de0e0, 1);
            editBg.fillRoundedRect(
                editBtnX - editBtnWidth / 2,
                editBtnY - editBtnHeight / 2,
                editBtnWidth,
                editBtnHeight,
                8
            );
        });

        editButton.on("pointerout", () => {
            editBg.clear();
            editBg.fillStyle(0x4df2f2, 1);
            editBg.fillRoundedRect(
                editBtnX - editBtnWidth / 2,
                editBtnY - editBtnHeight / 2,
                editBtnWidth,
                editBtnHeight,
                8
            );
        });

        editButton.on("pointerdown", () => {
            this.showUsernameInput();
        });

        // Score
        this.add
            .text(centerX, startY + 50, `Score: ${this.profileData.score}`, {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#4df2f2",
            })
            .setOrigin(0.5);

        // Stats container
        const statsY = startY + 110;
        const statsWidth = 350;
        const statsHeight = 140;

        const statsBg = this.add.graphics();
        statsBg.fillStyle(0x2a2a2a, 1);
        statsBg.fillRoundedRect(
            centerX - statsWidth / 2,
            statsY,
            statsWidth,
            statsHeight,
            12
        );

        // Stats
        const leftX = centerX - 100;
        const rightX = centerX + 100;

        this.add
            .text(leftX, statsY + 30, "Wins:", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#F4D6CC",
            })
            .setOrigin(0, 0.5);

        this.add
            .text(rightX, statsY + 30, this.profileData.wins.toString(), {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#4df2f2",
            })
            .setOrigin(1, 0.5);

        this.add
            .text(leftX, statsY + 70, "Losses:", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#F4D6CC",
            })
            .setOrigin(0, 0.5);

        this.add
            .text(rightX, statsY + 70, this.profileData.losses.toString(), {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#4df2f2",
            })
            .setOrigin(1, 0.5);

        this.add
            .text(leftX, statsY + 110, "Draws:", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#F4D6CC",
            })
            .setOrigin(0, 0.5);

        this.add
            .text(rightX, statsY + 110, this.profileData.draws.toString(), {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#4df2f2",
            })
            .setOrigin(1, 0.5);

        // Match History Title
        this.add
            .text(centerX, statsY + 170, "Recent Matches", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Display last 5 matches
        this.displayMatchHistory(centerX, statsY + 210);
    }

    displayMatchHistory(centerX, startY) {
        const maxMatches = Math.min(5, this.matchHistory.length);

        if (maxMatches === 0) {
            this.add
                .text(centerX, startY + 20, "No matches yet", {
                    fontFamily: "JetBrains Mono, sans-serif",
                    fontSize: "16px",
                    color: "#888888",
                })
                .setOrigin(0.5);
            return;
        }

        for (let i = 0; i < maxMatches; i++) {
            const match = this.matchHistory[i];
            const y = startY + i * 35;

            // Result color
            let resultColor;
            let resultText;
            if (match.result === "win") {
                resultColor = "#4df2f2";
                resultText = "WIN";
            } else if (match.result === "loss") {
                resultColor = "#c83e4d";
                resultText = "LOSS";
            } else {
                resultColor = "#888888";
                resultText = "DRAW";
            }

            // Match entry
            const matchText = `${resultText} vs ${match.opponent_username} (${
                match.score_change >= 0 ? "+" : ""
            }${match.score_change})`;

            this.add
                .text(centerX, y, matchText, {
                    fontFamily: "JetBrains Mono, sans-serif",
                    fontSize: "14px",
                    color: resultColor,
                })
                .setOrigin(0.5);
        }
    }

    showUsernameInput() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Create overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(
            0,
            0,
            this.cameras.main.width,
            this.cameras.main.height
        );

        // Input box background
        const inputWidth = 300;
        const inputHeight = 200;

        const inputBg = this.add.graphics();
        inputBg.fillStyle(0x2a2a2a, 1);
        inputBg.fillRoundedRect(
            centerX - inputWidth / 2,
            centerY - inputHeight / 2,
            inputWidth,
            inputHeight,
            12
        );

        // Title
        this.add
            .text(centerX, centerY - 70, "Enter Username", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Input prompt (since we can't use HTML input in canvas)
        const inputPrompt = this.add
            .text(centerX, centerY - 20, "Username will be set via prompt", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "14px",
                color: "#888888",
            })
            .setOrigin(0.5);

        // Confirm button
        const btnWidth = 120;
        const btnHeight = 45;

        const confirmBg = this.add.graphics();
        confirmBg.fillStyle(0x4df2f2, 1);
        confirmBg.fillRoundedRect(
            centerX - btnWidth / 2,
            centerY + 40,
            btnWidth,
            btnHeight,
            8
        );

        this.add
            .text(centerX, centerY + 62, "Confirm", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#1e1e1e",
            })
            .setOrigin(0.5);

        const confirmButton = this.add
            .zone(centerX, centerY + 62, btnWidth, btnHeight)
            .setInteractive({ useHandCursor: true });

        confirmButton.on("pointerdown", async () => {
            // Use browser prompt for input
            const newUsername = prompt(
                "Enter your username (3-20 characters):"
            );

            if (newUsername && newUsername.trim()) {
                try {
                    const updatedProfile = await Nakama.updateUsername(
                        newUsername.trim()
                    );
                    this.profileData = updatedProfile;

                    // Close overlay
                    overlay.destroy();
                    inputBg.destroy();

                    // Restart scene to show updated profile
                    this.scene.restart();
                } catch (error) {
                    console.error("Error updating username:", error);
                    alert(
                        "Failed to update username. Make sure it's 3-20 characters."
                    );
                }
            } else {
                // Close overlay without updating
                overlay.destroy();
                inputBg.destroy();
            }
        });
    }
}

export default Profile;
