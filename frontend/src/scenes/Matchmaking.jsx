import Nakama from "../nakama";

class Matchmaking extends Phaser.Scene {
    constructor() {
        super({ key: "Matchmaking" });
    }

    init(data) {
        // Get AI flag from Selection scene
        console.log("[DEBUG] Matchmaking.init() received data:", data);
        console.log("[DEBUG] data.ai value:", data.ai, "type:", typeof data.ai);
        this.playWithAI = data.ai || false;
        console.log("[DEBUG] this.playWithAI set to:", this.playWithAI);
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Add "Matchmaking" heading
        this.add
            .text(centerX, centerY - 150, "Matchmaking", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "48px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Add loading animation dots
        const modeText = this.playWithAI
            ? "Finding AI opponent"
            : "Finding opponent";
        const loadingText = this.add
            .text(centerX, centerY - 50, modeText, {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const dots = this.add
            .text(centerX, centerY, "...", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "32px",
                color: "#C83E4D",
            })
            .setOrigin(0.5);

        // Animate dots
        let dotCount = 0;
        this.time.addEvent({
            delay: 500,
            callback: () => {
                dotCount = (dotCount + 1) % 4;
                dots.setText(".".repeat(dotCount || 1));
            },
            loop: true,
        });

        // Add cancel button
        const buttonWidth = 200;
        const buttonHeight = 60;

        const cancelBg = this.add.graphics();
        cancelBg.fillStyle(0xc83e4d, 1);
        cancelBg.fillRoundedRect(
            centerX - buttonWidth / 2,
            centerY + 100 - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            12
        );

        const cancelText = this.add
            .text(centerX, centerY + 100, "CANCEL", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "32px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const cancelButton = this.add
            .zone(centerX, centerY + 100, buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true });

        cancelButton.on("pointerover", () => {
            cancelBg.clear();
            cancelBg.fillStyle(0xd2606c, 1);
            cancelBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                centerY + 100 - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        cancelButton.on("pointerout", () => {
            cancelBg.clear();
            cancelBg.fillStyle(0xc83e4d, 1);
            cancelBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                centerY + 100 - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        cancelButton.on("pointerdown", () => {
            this.scene.start("Selection");
        });

        // Find match with Nakama (don't await in create)
        this.findMatchAsync(loadingText);
    }

    async findMatchAsync(loadingText) {

        if (this.playWithAI) {
            const maxRetries = 5;
            let attempt = 0;

            while (attempt < maxRetries) {
                try {
                    attempt++;
                    if (attempt > 1) {
                        console.log(
                            `AI match attempt ${attempt}/${maxRetries}`
                        );
                        loadingText.setText(
                            `Finding AI opponent (attempt ${attempt})...`
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, 500)
                        );
                    }

                    const matchID = await Nakama.findMatch(
                        this.playWithAI,
                        false
                    );
                    console.log("AI match found:", matchID);
                    loadingText.setText("Match found! Starting game...");

                    await new Promise((resolve) => setTimeout(resolve, 100));
                    this.scene.start("Game", { matchID: matchID });
                    return;
                } catch (error) {
                    console.error(`AI match attempt ${attempt} failed:`, error);

                    if (attempt >= maxRetries) {
                        loadingText.setText(
                            "Failed to find AI match. Please try again."
                        );
                        this.time.delayedCall(2000, () => {
                            this.scene.start("Selection");
                        });
                    }
                }
            }
        } else {
            // Classic mode - wait indefinitely for another player
            try {
                loadingText.setText("Waiting for opponent...");
                console.log("Classic mode: Searching for opponent...");

                const matchID = await Nakama.findMatch(this.playWithAI, false);
                console.log("Match found with opponent:", matchID);
                loadingText.setText("Opponent found! Starting game...");

                await new Promise((resolve) => setTimeout(resolve, 100));
                this.scene.start("Game", { matchID: matchID });
            } catch (error) {
                console.error("Classic matchmaking failed:", error);
                loadingText.setText("Connection error. Please try again.");
                this.time.delayedCall(2000, () => {
                    this.scene.start("Selection");
                });
            }
        }
    }
}

export default Matchmaking;
