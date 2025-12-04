import Nakama from "../nakama";

class ProfileSetup extends Phaser.Scene {
    constructor() {
        super({ key: "ProfileSetup" });
        this.username = "";
        this.avatarUrl = "";
        this.activeInput = null; // 'username' or 'avatar'
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Setup keyboard input
        this.input.keyboard.on("keydown", (event) => {
            if (!this.activeInput) return;

            if (event.key === "Backspace") {
                if (this.activeInput === "username") {
                    this.username = this.username.slice(0, -1);
                    this.updateUsernameDisplay();
                } else if (this.activeInput === "avatar") {
                    this.avatarUrl = this.avatarUrl.slice(0, -1);
                    this.updateAvatarDisplay();
                }
            } else if (event.key === "Enter") {
                this.activeInput = null;
                this.usernameBorder.clear();
                this.avatarBorder.clear();
            } else if (event.key.length === 1) {
                if (
                    this.activeInput === "username" &&
                    this.username.length < 20
                ) {
                    this.username += event.key;
                    this.updateUsernameDisplay();
                } else if (this.activeInput === "avatar") {
                    this.avatarUrl += event.key;
                    this.updateAvatarDisplay();
                }
            }
        });

        // Title
        this.add
            .text(centerX, 80, "Setup Your Profile", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "36px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Instructions
        this.add
            .text(centerX, 140, "Customize your player profile", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "18px",
                color: "#888888",
            })
            .setOrigin(0.5);

        // Avatar preview circle
        const avatarRadius = 60;
        const avatarBg = this.add.graphics();
        avatarBg.fillStyle(0x2a2a2a, 1);
        avatarBg.fillCircle(centerX, centerY - 80, avatarRadius);

        // Avatar placeholder
        this.add
            .text(centerX, centerY - 80, "👤", {
                fontSize: "64px",
            })
            .setOrigin(0.5);

        // Username section
        this.add
            .text(centerX, centerY + 20, "Username", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Username input
        const inputBg = this.add.graphics();
        inputBg.fillStyle(0x2a2a2a, 1);
        inputBg.fillRoundedRect(centerX - 130, centerY + 50, 260, 45, 8);

        this.usernameBorder = this.add.graphics();

        this.usernameText = this.add
            .text(centerX, centerY + 72, "Click to type (3-20 chars)", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "18px",
                color: "#666666",
            })
            .setOrigin(0.5);

        const usernameZone = this.add
            .zone(centerX, centerY + 72, 260, 45)
            .setInteractive({ useHandCursor: true });

        usernameZone.on("pointerdown", () => {
            this.activeInput = "username";
            this.usernameBorder.clear();
            this.usernameBorder.lineStyle(2, 0xc83e4d, 1);
            this.usernameBorder.strokeRoundedRect(
                centerX - 130,
                centerY + 50,
                260,
                45,
                8
            );
            this.avatarBorder.clear();
        });

        // Avatar URL section (optional)
        this.add
            .text(centerX, centerY + 120, "Avatar URL (Optional)", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "16px",
                color: "#888888",
            })
            .setOrigin(0.5);

        const avatarInputBg = this.add.graphics();
        avatarInputBg.fillStyle(0x2a2a2a, 1);
        avatarInputBg.fillRoundedRect(centerX - 130, centerY + 145, 260, 40, 8);

        this.avatarBorder = this.add.graphics();

        this.avatarText = this.add
            .text(centerX, centerY + 165, "Click to type URL", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "14px",
                color: "#666666",
            })
            .setOrigin(0.5);

        const avatarZone = this.add
            .zone(centerX, centerY + 165, 260, 40)
            .setInteractive({ useHandCursor: true });

        avatarZone.on("pointerdown", () => {
            this.activeInput = "avatar";
            this.avatarBorder.clear();
            this.avatarBorder.lineStyle(2, 0xc83e4d, 1);
            this.avatarBorder.strokeRoundedRect(
                centerX - 130,
                centerY + 145,
                260,
                40,
                8
            );
            this.usernameBorder.clear();
        });

        // Continue button
        this.createContinueButton(centerX, centerY + 240);

        // Skip button
        this.createSkipButton(centerX, centerY + 310);

        // Status text
        this.statusText = this.add
            .text(centerX, 680, "", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "16px",
                color: "#c83e4d",
            })
            .setOrigin(0.5);
    }

    createContinueButton(centerX, y) {
        const buttonWidth = 200;
        const buttonHeight = 50;

        const continueBg = this.add.graphics();
        continueBg.fillStyle(0xc83e4d, 1);
        continueBg.fillRoundedRect(
            centerX - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            12
        );

        this.add
            .text(centerX, y, "CONTINUE", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const continueButton = this.add
            .zone(centerX, y, buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true });

        continueButton.on("pointerover", () => {
            continueBg.clear();
            continueBg.fillStyle(0xd2606c, 1);
            continueBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                y - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        continueButton.on("pointerout", () => {
            continueBg.clear();
            continueBg.fillStyle(0xc83e4d, 1);
            continueBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                y - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        continueButton.on("pointerdown", () => {
            this.handleContinue();
        });
    }

    createSkipButton(centerX, y) {
        const skipText = this.add
            .text(centerX, y, "Skip for now", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "16px",
                color: "#888888",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        skipText.on("pointerover", () => {
            skipText.setColor("#F4D6CC");
        });

        skipText.on("pointerout", () => {
            skipText.setColor("#888888");
        });

        skipText.on("pointerdown", () => {
            this.scene.start("Mainmenu");
        });
    }

    async handleContinue() {
        if (!this.username || this.username.length < 3) {
            const errorMsg = "Please enter a valid username (3-20 characters)";
            this.statusText.setText(errorMsg);
            alert(errorMsg);
            return;
        }

        this.statusText.setText("Saving profile...");
        this.statusText.setColor("#4df2f2");

        try {
            const result = await Nakama.updateUsername(this.username);
            console.log("Profile update result:", result);

            // Note: Avatar URL would need a separate RPC endpoint
            // For now we'll just save the username

            this.statusText.setText("Profile saved!");
            this.statusText.setColor("#00ff00");

            // Wait a moment then go to main menu
            this.time.delayedCall(1000, () => {
                this.scene.start("Mainmenu");
            });
        } catch (error) {
            console.error("Profile setup error:", error);
            const errorMsg = `Failed to save profile: ${
                error.message || "Please try again"
            }`;
            this.statusText.setText(errorMsg);
            this.statusText.setColor("#c83e4d");
            alert(errorMsg);
        }
    }

    updateUsernameDisplay() {
        if (this.username.length === 0) {
            this.usernameText.setText("Click to type (3-20 chars)");
            this.usernameText.setColor("#666666");
        } else {
            this.usernameText.setText(this.username);
            if (this.username.length >= 3 && this.username.length <= 20) {
                this.usernameText.setColor("#F4D6CC");
            } else {
                this.usernameText.setColor("#c83e4d");
            }
        }
    }

    updateAvatarDisplay() {
        if (this.avatarUrl.length === 0) {
            this.avatarText.setText("Click to type URL");
            this.avatarText.setColor("#666666");
        } else {
            // Truncate long URLs for display
            const displayUrl =
                this.avatarUrl.length > 30
                    ? this.avatarUrl.substring(0, 30) + "..."
                    : this.avatarUrl;
            this.avatarText.setText(displayUrl);
            this.avatarText.setColor("#4df2f2");
        }
    }
}

export default ProfileSetup;
