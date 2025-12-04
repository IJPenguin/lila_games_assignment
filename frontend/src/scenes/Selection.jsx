import Nakama from "../nakama";

class Selection extends Phaser.Scene {
    constructor() {
        super({ key: "Selection" });
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Title
        this.add
            .text(centerX, 100, "Select Game Mode", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "48px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Subtitle
        this.add
            .text(centerX, 160, "Choose your game mode", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#888888",
            })
            .setOrigin(0.5);

        // Classic Mode button
        const btnWidth = 300;
        const btnHeight = 90;
        const btn1Y = centerY - 140;

        const classicBtn = this.add.graphics();
        classicBtn.fillStyle(0xc83e4d, 1);
        classicBtn.fillRoundedRect(
            centerX - btnWidth / 2,
            btn1Y - btnHeight / 2,
            btnWidth,
            btnHeight,
            12
        );

        this.add
            .text(centerX, btn1Y, "Classic Mode", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "32px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const classicZone = this.add
            .zone(centerX, btn1Y, btnWidth, btnHeight)
            .setInteractive({ useHandCursor: true });

        classicZone.on("pointerover", () => {
            classicBtn.clear();
            classicBtn.fillStyle(0xd2606c, 1);
            classicBtn.fillRoundedRect(
                centerX - btnWidth / 2,
                btn1Y - btnHeight / 2,
                btnWidth,
                btnHeight,
                12
            );
        });

        classicZone.on("pointerout", () => {
            classicBtn.clear();
            classicBtn.fillStyle(0xc83e4d, 1);
            classicBtn.fillRoundedRect(
                centerX - btnWidth / 2,
                btn1Y - btnHeight / 2,
                btnWidth,
                btnHeight,
                12
            );
        });

        classicZone.on("pointerdown", () => {
            this.scene.start("Matchmaking", { ai: false });
        });

        // AI Mode button
        const btn2Y = centerY - 20;

        const aiBtn = this.add.graphics();
        aiBtn.fillStyle(0x4a90e2, 1); // Blue for AI
        aiBtn.fillRoundedRect(
            centerX - btnWidth / 2,
            btn2Y - btnHeight / 2,
            btnWidth,
            btnHeight,
            12
        );

        this.add
            .text(centerX, btn2Y, "AI Mode", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "32px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const aiZone = this.add
            .zone(centerX, btn2Y, btnWidth, btnHeight)
            .setInteractive({ useHandCursor: true });

        aiZone.on("pointerover", () => {
            aiBtn.clear();
            aiBtn.fillStyle(0x5aa0f2, 1);
            aiBtn.fillRoundedRect(
                centerX - btnWidth / 2,
                btn2Y - btnHeight / 2,
                btnWidth,
                btnHeight,
                12
            );
        });

        aiZone.on("pointerout", () => {
            aiBtn.clear();
            aiBtn.fillStyle(0x4a90e2, 1);
            aiBtn.fillRoundedRect(
                centerX - btnWidth / 2,
                btn2Y - btnHeight / 2,
                btnWidth,
                btnHeight,
                12
            );
        });

        aiZone.on("pointerdown", () => {
            this.scene.start("Matchmaking", { ai: true });
        });

        // Back button
        const backBtnWidth = 150;
        const backBtnHeight = 50;
        const backY = centerY + 100;

        const backBtn = this.add.graphics();
        backBtn.fillStyle(0x4a4a4a, 1);
        backBtn.fillRoundedRect(
            centerX - backBtnWidth / 2,
            backY - backBtnHeight / 2,
            backBtnWidth,
            backBtnHeight,
            12
        );

        this.add
            .text(centerX, backY, "← Back", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const backZone = this.add
            .zone(centerX, backY, backBtnWidth, backBtnHeight)
            .setInteractive({ useHandCursor: true });

        backZone.on("pointerover", () => {
            backBtn.clear();
            backBtn.fillStyle(0x5a5a5a, 1);
            backBtn.fillRoundedRect(
                centerX - backBtnWidth / 2,
                backY - backBtnHeight / 2,
                backBtnWidth,
                backBtnHeight,
                12
            );
        });

        backZone.on("pointerout", () => {
            backBtn.clear();
            backBtn.fillStyle(0x4a4a4a, 1);
            backBtn.fillRoundedRect(
                centerX - backBtnWidth / 2,
                backY - backBtnHeight / 2,
                backBtnWidth,
                backBtnHeight,
                12
            );
        });

        backZone.on("pointerdown", () => {
            this.scene.start("Mainmenu");
        });
    }
}

export default Selection;
