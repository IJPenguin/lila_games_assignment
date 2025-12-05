import Nakama from "../nakama";

class Game extends Phaser.Scene {
    constructor() {
        super({ key: "Game" });
        this.INDEX_TO_POS = {};
        this.headerText = null;
        this.matchID = null;
        this.gameStarted = false;
        this.playerTurn = false;
        this.playerPos = null;
        this.board = Array(9).fill(null);
        this.playAIBtn = null;
        this.playAIBtnText = null;
        this.graphics = []; // Track graphics objects for cleanup
        this.matchDataHandler = null; // Track match data handler for cleanup
        this.startTimeout = null; // Track timeout for game start detection
        this.gameEnded = false; // Track if game has ended to ignore further messages
    }

    init(data) {
        // Reset all game-specific state variables
        this.matchID = data?.matchID || Nakama.matchID;
        this.gameStarted = false;
        this.playerTurn = false;
        this.playerPos = null;
        this.board = Array(9).fill(null);
        this.cells = [];
        this.graphics = [];
        this.INDEX_TO_POS = {};
        this.gameEnded = false;

        console.log("Game scene initialized for match:", this.matchID);
    }

    updateBoard(board) {
        board.forEach((element, index) => {
            let pos = this.INDEX_TO_POS[index];

            if (element === 1 && !this.board[index]) {
                this.drawX(pos.x, pos.y, 100);
                this.board[index] = 1;
            } else if (element === 2 && !this.board[index]) {
                this.drawO(pos.x, pos.y, 100);
                this.board[index] = 2;
            }
        });
    }

    updatePlayerTurn() {
        this.playerTurn = !this.playerTurn;

        if (this.playerTurn) {
            this.headerText.setText("Your turn!");
        } else {
            this.headerText.setText("Opponent's turn!");
        }
    }

    setPlayerTurn(data) {
        const json_string = new TextDecoder().decode(data);
        const json = json_string ? JSON.parse(json_string) : "";

        let userId = sessionStorage.getItem("user_id");
        if (json.marks[userId] === 1) {
            this.playerTurn = true;
            this.playerPos = 1;
            this.headerText.setText("Your turn!");
        } else {
            this.playerPos = 2;
            this.playerTurn = false;
            this.headerText.setText("Opponent's turn!");
        }
    }

    opponentLeft() {
        this.headerText.setText("Opponent has left");
        this.playAIBtn.setVisible(true);
        this.playAIBtnText.setVisible(true);
    }

    endGame(data) {
        const json_string = new TextDecoder().decode(data);
        const json = json_string ? JSON.parse(json_string) : "";

        this.updateBoard(json.board);

        // Disable further moves and mark game as ended
        this.gameStarted = false;
        this.gameEnded = true; // Prevent processing any further messages

        let resultText = "";
        
        console.log("Game ended - winner:", json.winner, "playerPos:", this.playerPos);
        
        // Check for draw (winner is null, undefined, or 0)
        if (json.winner === null || json.winner === undefined || json.winner === 0) {
            this.headerText.setText("It's a Draw!");
            this.headerText.setColor("#ffaa00");
            resultText = "Draw";
        } else if (json.winner === this.playerPos) {
            this.headerText.setText("🏆 You Win!");
            this.headerText.setColor("#00ff00");
            resultText = "Victory!";
        } else {
            this.headerText.setText("You Lose");
            this.headerText.setColor("#c83e4d");
            resultText = "Defeat";
        }

        // Show end game screen after a short delay
        this.time.delayedCall(1500, () => {
            this.showEndGameScreen(resultText, json.winner);
        });
    }

    showEndGameScreen(resultText, winner) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Semi-transparent overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(
            0,
            0,
            this.cameras.main.width,
            this.cameras.main.height
        );

        // Result panel
        const panelWidth = 400;
        const panelHeight = 300;
        const panel = this.add.graphics();
        panel.fillStyle(0x2a2a2a, 1);
        panel.fillRoundedRect(
            centerX - panelWidth / 2,
            centerY - panelHeight / 2,
            panelWidth,
            panelHeight,
            12
        );
        panel.lineStyle(3, 0xc83e4d, 1);
        panel.strokeRoundedRect(
            centerX - panelWidth / 2,
            centerY - panelHeight / 2,
            panelWidth,
            panelHeight,
            12
        );

        // Result text
        let color = "#F4D6CC";
        if (resultText === "Victory!") color = "#00ff00";
        else if (resultText === "Draw") color = "#ffaa00";
        else if (resultText === "Defeat") color = "#c83e4d";

        this.add
            .text(centerX, centerY - 80, resultText, {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "48px",
                color: color,
            })
            .setOrigin(0.5);

        // Score info
        let scoreChange = "";
        if (resultText === "Victory!") scoreChange = "+50 points";
        else if (resultText === "Defeat") scoreChange = "-10 points";
        else scoreChange = "No change";

        this.add
            .text(centerX, centerY - 20, scoreChange, {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "20px",
                color: "#888888",
            })
            .setOrigin(0.5);

        // Main Menu button
        const btnWidth = 180;
        const btnHeight = 50;
        const menuBtn = this.add.graphics();
        menuBtn.fillStyle(0xc83e4d, 1);
        menuBtn.fillRoundedRect(
            centerX - btnWidth / 2,
            centerY + 40,
            btnWidth,
            btnHeight,
            12
        );

        this.add
            .text(centerX, centerY + 65, "Main Menu", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const menuZone = this.add
            .zone(centerX, centerY + 65, btnWidth, btnHeight)
            .setInteractive({ useHandCursor: true });

        menuZone.on("pointerover", () => {
            menuBtn.clear();
            menuBtn.fillStyle(0xd2606c, 1);
            menuBtn.fillRoundedRect(
                centerX - btnWidth / 2,
                centerY + 40,
                btnWidth,
                btnHeight,
                12
            );
        });

        menuZone.on("pointerout", () => {
            menuBtn.clear();
            menuBtn.fillStyle(0xc83e4d, 1);
            menuBtn.fillRoundedRect(
                centerX - btnWidth / 2,
                centerY + 40,
                btnWidth,
                btnHeight,
                12
            );
        });

        menuZone.on("pointerdown", async () => {
            // Leave match and clean up match-specific state
            try {
                await Nakama.leaveMatch();
                console.log("Successfully left match and cleaned up state");
            } catch (error) {
                console.error("Error leaving match:", error);
                // Clean up state even if leave fails
                Nakama.cleanupMatch();
            }
            this.scene.start("Mainmenu");
        });

        // Profile button
        const profileBtn = this.add.graphics();
        profileBtn.fillStyle(0x4a4a4a, 1);
        profileBtn.fillRoundedRect(
            centerX - btnWidth / 2,
            centerY + 105,
            btnWidth,
            btnHeight,
            12
        );

        this.add
            .text(centerX, centerY + 130, "View Profile", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const profileZone = this.add
            .zone(centerX, centerY + 130, btnWidth, btnHeight)
            .setInteractive({ useHandCursor: true });

        profileZone.on("pointerover", () => {
            profileBtn.clear();
            profileBtn.fillStyle(0x5a5a5a, 1);
            profileBtn.fillRoundedRect(
                centerX - btnWidth / 2,
                centerY + 105,
                btnWidth,
                btnHeight,
                12
            );
        });

        profileZone.on("pointerout", () => {
            profileBtn.clear();
            profileBtn.fillStyle(0x4a4a4a, 1);
            profileBtn.fillRoundedRect(
                centerX - btnWidth / 2,
                centerY + 105,
                btnWidth,
                btnHeight,
                12
            );
        });

        profileZone.on("pointerdown", async () => {
            // Leave match and clean up match-specific state
            try {
                await Nakama.leaveMatch();
                console.log("Successfully left match and cleaned up state");
            } catch (error) {
                console.error("Error leaving match:", error);
                // Clean up state even if leave fails
                Nakama.cleanupMatch();
            }
            this.scene.start("Profile");
        });
    }

    nakamaListener() {
        // Remove previous listener if exists
        if (this.matchDataHandler) {
            Nakama.socket.onmatchdata = null;
        }

        this.matchDataHandler = (result) => {
            // Validate message matchID matches current active matchID
            if (result.match_id !== this.matchID) {
                console.warn(
                    `Ignoring message from different match. Expected: ${this.matchID}, Received: ${result.match_id}`
                );
                return;
            }

            // Ignore all messages after game has ended (prevents auto-restart)
            if (this.gameEnded) {
                console.log(
                    `Ignoring message after game ended. OpCode: ${result.op_code}`
                );
                return;
            }

            console.log("Classic Game - Received match data:", result);
            console.log("OpCode:", result.op_code, "Data:", result.data);

            try {
                switch (result.op_code) {
                    case 1:
                        console.log("Case 1 - Game Start");
                        this.handleGameStart(result.data);
                        break;
                    case 2:
                        console.log("Case 2 - Move Update");
                        const json_string2 = new TextDecoder().decode(
                            result.data
                        );
                        const json2 = json_string2
                            ? JSON.parse(json_string2)
                            : "";
                        this.updateBoard(json2.board);
                        this.updatePlayerTurn();
                        break;
                    case 3:
                        console.log("Case 3 - Game End");
                        this.endGame(result.data);
                        break;
                    case 6:
                        console.log("Case 6 - Opponent Left");
                        this.opponentLeft();
                        break;
                    default:
                        console.warn(
                            "Unknown opCode received:",
                            result.op_code
                        );
                }
            } catch (error) {
                console.error("Error in nakamaListener:", error);
            }
        };

        Nakama.socket.onmatchdata = this.matchDataHandler;
    }

    handleGameStart(data) {
        console.log("Handling game start");
        this.gameStarted = true;
        // Cancel the start timeout since game has started
        if (this.startTimeout) {
            this.startTimeout.remove();
            this.startTimeout = null;
        }
        this.setPlayerTurn(data);
    }

    create() {
        // Set up the listener FIRST before any UI, to catch early messages
        this.nakamaListener();
        console.log("Match data listener set up for match:", this.matchID);

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Header text
        this.headerText = this.add
            .text(centerX, 80, "Game Starting...", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "28px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Increased timeout to 15 seconds to account for matchmaking delays
        this.startTimeout = this.time.delayedCall(15000, () => {
            if (!this.gameStarted) {
                console.error(
                    "Timeout waiting for game to start - likely failed to join match"
                );
                this.headerText.setText("Failed to join match");
                this.headerText.setColor("#c83e4d");

                // Return to matchmaking after a delay
                this.time.delayedCall(2000, () => {
                    Nakama.cleanupMatch();
                    this.scene.start("Selection");
                });
            }
        });

        // Game grid settings
        const cellSize = 100;
        const gridSize = 3;
        const gridWidth = cellSize * gridSize;
        const gridHeight = cellSize * gridSize;
        const startX = centerX - gridWidth / 2;
        const startY = centerY - gridHeight / 2 + 50;

        // Create 9 cells
        this.cells = [];
        for (let i = 0; i < 9; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const x = startX + col * cellSize;
            const y = startY + row * cellSize;
            const cellCenterX = x + cellSize / 2;
            const cellCenterY = y + cellSize / 2;

            // Store position mapping
            this.INDEX_TO_POS[i] = { x: cellCenterX, y: cellCenterY };

            // Draw cell background
            const cell = this.add.graphics();
            cell.fillStyle(0x4a4a4a, 1);
            cell.fillRoundedRect(x + 5, y + 5, cellSize - 10, cellSize - 10, 8);

            // Create interactive zone
            const zone = this.add
                .zone(cellCenterX, cellCenterY, cellSize - 10, cellSize - 10)
                .setInteractive({ useHandCursor: true });

            zone.on("pointerdown", async () => {
                if (this.playerTurn && !this.board[i]) {
                    await Nakama.makeMove(i);
                }
            });

            // Hover effect
            zone.on("pointerover", () => {
                if (!this.board[i]) {
                    cell.clear();
                    cell.fillStyle(0x5a5a5a, 1);
                    cell.fillRoundedRect(
                        x + 5,
                        y + 5,
                        cellSize - 10,
                        cellSize - 10,
                        8
                    );
                }
            });

            zone.on("pointerout", () => {
                if (!this.board[i]) {
                    cell.clear();
                    cell.fillStyle(0x4a4a4a, 1);
                    cell.fillRoundedRect(
                        x + 5,
                        y + 5,
                        cellSize - 10,
                        cellSize - 10,
                        8
                    );
                }
            });

            this.cells.push({ cell, zone, x, y });
        }

        // AI button (hidden by default)
        const buttonWidth = 250;
        const buttonHeight = 60;
        const buttonY = startY + gridHeight + 100;

        const aiBtnBg = this.add.graphics();
        aiBtnBg.fillStyle(0xc83e4d, 1);
        aiBtnBg.fillRoundedRect(
            centerX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            12
        );
        aiBtnBg.setVisible(false);

        this.playAIBtn = aiBtnBg;

        this.playAIBtnText = this.add
            .text(centerX, buttonY, "Continue with AI", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "24px",
                color: "#F4D6CC",
            })
            .setOrigin(0.5)
            .setVisible(false);

        const aiZone = this.add
            .zone(centerX, buttonY, buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true });

        aiZone.on("pointerdown", async () => {
            await Nakama.inviteAI();
            this.playAIBtn.setVisible(false);
            this.playAIBtnText.setVisible(false);
        });

        aiZone.on("pointerover", () => {
            if (this.playAIBtn.visible) {
                this.playAIBtn.setScale(1.05);
                this.playAIBtnText.setScale(1.05);
            }
        });

        aiZone.on("pointerout", () => {
            this.playAIBtn.setScale(1);
            this.playAIBtnText.setScale(1);
        });
    }

    drawX(x, y, cellSize) {
        const graphics = this.add.graphics();
        const size = cellSize / 3;
        graphics.lineStyle(6, 0xc83e4d, 1);
        graphics.beginPath();
        graphics.moveTo(x - size, y - size);
        graphics.lineTo(x + size, y + size);
        graphics.moveTo(x + size, y - size);
        graphics.lineTo(x - size, y + size);
        graphics.strokePath();

        // Track graphics for cleanup
        this.graphics.push(graphics);
    }

    drawO(x, y, cellSize) {
        const graphics = this.add.graphics();
        const radius = cellSize / 3;
        graphics.lineStyle(6, 0x4df2f2, 1);
        graphics.beginPath();
        graphics.arc(x, y, radius, 0, Math.PI * 2);
        graphics.strokePath();

        // Track graphics for cleanup
        this.graphics.push(graphics);
    }

    shutdown() {
        console.log("Game scene shutting down");

        // Cancel start timeout if it exists
        if (this.startTimeout) {
            this.startTimeout.remove();
            this.startTimeout = null;
        }

        // Clean up graphics objects
        this.graphics.forEach((g) => {
            if (g && g.destroy) {
                g.destroy();
            }
        });
        this.graphics = [];

        // Clean up cells
        if (this.cells) {
            this.cells.forEach((cell) => {
                if (cell.cell && cell.cell.destroy) {
                    cell.cell.destroy();
                }
                if (cell.zone && cell.zone.destroy) {
                    cell.zone.destroy();
                }
            });
            this.cells = [];
        }

        // Remove match data listener to prevent ghost messages
        if (this.matchDataHandler) {
            Nakama.socket.onmatchdata = null;
            this.matchDataHandler = null;
        }

        // Reset all game-specific state variables to initial values
        this.gameStarted = false;
        this.gameEnded = false;
        this.playerTurn = false;
        this.playerPos = null;
        this.board = Array(9).fill(null);
        this.INDEX_TO_POS = {};
        this.headerText = null;
        this.playAIBtn = null;
        this.playAIBtnText = null;

        console.log("Game scene cleanup complete");
    }
}

export default Game;
