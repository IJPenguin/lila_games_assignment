import Nakama from "../nakama";

class Login extends Phaser.Scene {
    constructor() {
        super({ key: "Login" });
        this.isLogin = true; // true = login, false = signup
        this.email = "";
        this.password = "";
        this.activeInput = null; // 'email' or 'password'
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Setup keyboard input
        this.input.keyboard.on("keydown", (event) => {
            if (!this.activeInput) return;

            if (event.key === "Backspace") {
                if (this.activeInput === "email") {
                    this.email = this.email.slice(0, -1);
                    this.updateEmailDisplay();
                } else if (this.activeInput === "password") {
                    this.password = this.password.slice(0, -1);
                    this.updatePasswordDisplay();
                }
            } else if (event.key === "Enter") {
                this.activeInput = null;
                this.emailBorder.clear();
                this.passwordBorder.clear();
            } else if (event.key.length === 1) {
                if (this.activeInput === "email") {
                    this.email += event.key;
                    this.updateEmailDisplay();
                } else if (this.activeInput === "password") {
                    this.password += event.key;
                    this.updatePasswordDisplay();
                }
            }
        });

        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const titleSize = Math.min(48, screenWidth * 0.12);
        const instructionSize = Math.min(18, screenWidth * 0.045);

        // Title
        this.titleText = this.add
            .text(centerX, screenHeight * 0.12, "Login", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: `${titleSize}px`,
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        // Instructions
        this.add
            .text(centerX, screenHeight * 0.2, "Enter your credentials", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: `${instructionSize}px`,
                color: "#888888",
            })
            .setOrigin(0.5);

        const inputWidth = Math.min(260, screenWidth * 0.7);
        const inputHeight = Math.min(40, screenHeight * 0.06);
        const labelSize = Math.min(16, screenWidth * 0.04);
        const inputSize = Math.min(16, screenWidth * 0.04);
        const inputLeft = centerX - inputWidth / 2;
        const emailY = screenHeight * 0.32;

        // Email label
        this.add
            .text(inputLeft, emailY - 30, "Email:", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: `${labelSize}px`,
                color: "#F4D6CC",
            })
            .setOrigin(0, 0.5);

        // Email input placeholder
        const emailBg = this.add.graphics();
        emailBg.fillStyle(0x2a2a2a, 1);
        emailBg.fillRoundedRect(inputLeft, emailY, inputWidth, inputHeight, 8);

        this.emailBorder = this.add.graphics();

        this.emailText = this.add
            .text(centerX, emailY + inputHeight / 2, "Click to type", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: `${inputSize}px`,
                color: "#666666",
            })
            .setOrigin(0.5);

        const emailZone = this.add
            .zone(centerX, emailY + inputHeight / 2, inputWidth, inputHeight)
            .setInteractive({ useHandCursor: true });

        emailZone.on("pointerdown", () => {
            this.activeInput = "email";
            this.emailBorder.clear();
            this.emailBorder.lineStyle(2, 0xc83e4d, 1);
            this.emailBorder.strokeRoundedRect(
                inputLeft,
                emailY,
                inputWidth,
                inputHeight,
                8
            );
            this.passwordBorder.clear();
        });

        // Store dimensions for password field
        this.inputDimensions = {
            inputWidth,
            inputHeight,
            inputLeft,
            inputSize,
            labelSize,
        };

        const passwordY = emailY + inputHeight + 60;

        // Password label
        this.add
            .text(this.inputDimensions.inputLeft, passwordY - 30, "Password:", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: `${this.inputDimensions.labelSize}px`,
                color: "#F4D6CC",
            })
            .setOrigin(0, 0.5);

        // Password input placeholder
        const passwordBg = this.add.graphics();
        passwordBg.fillStyle(0x2a2a2a, 1);
        passwordBg.fillRoundedRect(
            this.inputDimensions.inputLeft,
            passwordY,
            this.inputDimensions.inputWidth,
            this.inputDimensions.inputHeight,
            8
        );

        this.passwordBorder = this.add.graphics();

        this.passwordText = this.add
            .text(
                centerX,
                passwordY + this.inputDimensions.inputHeight / 2,
                "Click to type",
                {
                    fontFamily: "JetBrains Mono, sans-serif",
                    fontSize: `${this.inputDimensions.inputSize}px`,
                    color: "#666666",
                }
            )
            .setOrigin(0.5);

        const passwordZone = this.add
            .zone(
                centerX,
                passwordY + this.inputDimensions.inputHeight / 2,
                this.inputDimensions.inputWidth,
                this.inputDimensions.inputHeight
            )
            .setInteractive({ useHandCursor: true });

        passwordZone.on("pointerdown", () => {
            this.activeInput = "password";
            this.passwordBorder.clear();
            this.passwordBorder.lineStyle(2, 0xc83e4d, 1);
            this.passwordBorder.strokeRoundedRect(
                this.inputDimensions.inputLeft,
                passwordY,
                this.inputDimensions.inputWidth,
                this.inputDimensions.inputHeight,
                8
            );
            this.emailBorder.clear();
        });

        // Store for buttons
        const buttonStartY = passwordY + this.inputDimensions.inputHeight + 50;

        // Login/Signup button
        this.createSubmitButton(centerX, buttonStartY, screenWidth);

        // Guest play button
        this.createGuestButton(centerX, buttonStartY + 80, screenWidth);

        // Toggle button
        this.createToggleButton(centerX, buttonStartY + 150, screenWidth);

        // Status text
        this.statusText = this.add
            .text(centerX, Math.min(650, screenHeight * 0.95), "", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: "16px",
                color: "#c83e4d",
            })
            .setOrigin(0.5);
    }

    createSubmitButton(centerX, y, screenWidth) {
        const buttonWidth = Math.min(200, screenWidth * 0.5);
        const buttonHeight = Math.min(50, screenWidth * 0.12);
        const buttonTextSize = Math.min(24, screenWidth * 0.06);

        this.submitBg = this.add.graphics();
        this.submitBg.fillStyle(0xc83e4d, 1);
        this.submitBg.fillRoundedRect(
            centerX - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            12
        );

        this.submitText = this.add
            .text(centerX, y, "LOGIN", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: `${buttonTextSize}px`,
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const submitButton = this.add
            .zone(centerX, y, buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true });

        submitButton.on("pointerover", () => {
            this.submitBg.clear();
            this.submitBg.fillStyle(0xd2606c, 1);
            this.submitBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                y - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        submitButton.on("pointerout", () => {
            this.submitBg.clear();
            this.submitBg.fillStyle(0xc83e4d, 1);
            this.submitBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                y - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        submitButton.on("pointerdown", () => {
            this.handleSubmit();
        });
    }

    createToggleButton(centerX, y, screenWidth) {
        const toggleSize = Math.min(14, screenWidth * 0.035);
        this.toggleText = this.add
            .text(centerX, y, "Don't have an account? Sign up", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: `${toggleSize}px`,
                color: "#4df2f2",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        this.toggleText.on("pointerdown", () => {
            this.isLogin = !this.isLogin;
            if (this.isLogin) {
                this.titleText.setText("Login");
                this.submitText.setText("LOGIN");
                this.toggleText.setText("Don't have an account? Sign up");
            } else {
                this.titleText.setText("Sign Up");
                this.submitText.setText("SIGN UP");
                this.toggleText.setText("Already have an account? Login");
            }
            this.statusText.setText("");
        });
    }

    createGuestButton(centerX, y, screenWidth) {
        const buttonWidth = Math.min(200, screenWidth * 0.5);
        const buttonHeight = Math.min(45, screenWidth * 0.11);
        const buttonTextSize = Math.min(18, screenWidth * 0.045);

        const guestBg = this.add.graphics();
        guestBg.fillStyle(0x4a4a4a, 1);
        guestBg.fillRoundedRect(
            centerX - buttonWidth / 2,
            y - buttonHeight / 2,
            buttonWidth,
            buttonHeight,
            12
        );

        this.add
            .text(centerX, y, "Play as Guest", {
                fontFamily: "JetBrains Mono, sans-serif",
                fontSize: `${buttonTextSize}px`,
                color: "#F4D6CC",
            })
            .setOrigin(0.5);

        const guestButton = this.add
            .zone(centerX, y, buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true });

        guestButton.on("pointerover", () => {
            guestBg.clear();
            guestBg.fillStyle(0x5a5a5a, 1);
            guestBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                y - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        guestButton.on("pointerout", () => {
            guestBg.clear();
            guestBg.fillStyle(0x4a4a4a, 1);
            guestBg.fillRoundedRect(
                centerX - buttonWidth / 2,
                y - buttonHeight / 2,
                buttonWidth,
                buttonHeight,
                12
            );
        });

        guestButton.on("pointerdown", () => {
            this.handleGuestLogin();
        });
    }

    async handleSubmit() {
        if (!this.email || !this.password) {
            this.statusText.setText("Please enter email and password");
            this.statusText.setColor("#c83e4d");
            return;
        }

        // Basic email validation
        if (!this.email.includes("@") || !this.email.includes(".")) {
            this.statusText.setText("Please enter a valid email");
            this.statusText.setColor("#c83e4d");
            return;
        }

        // Password length check
        if (this.password.length < 6) {
            this.statusText.setText("Password must be at least 6 characters");
            this.statusText.setColor("#c83e4d");
            return;
        }

        this.statusText.setText("Processing...");
        this.statusText.setColor("#4df2f2");

        try {
            if (this.isLogin) {
                // Login - don't pass username
                await Nakama.authenticateEmail(this.email, this.password, null);
                this.statusText.setText("Login successful!");

                // Get or create profile - this ensures profile exists
                await Nakama.getProfile();

                // Small delay to show success message
                await new Promise((resolve) => setTimeout(resolve, 300));

                this.scene.start("Mainmenu");
            } else {
                // Sign up - use email prefix as default username
                const defaultUsername = this.email
                    .split("@")[0]
                    .substring(0, 15);
                await Nakama.authenticateEmail(
                    this.email,
                    this.password,
                    defaultUsername
                );
                this.statusText.setText("Account created!");

                // Create profile for new user
                await Nakama.getProfile();

                // Small delay to show success message
                await new Promise((resolve) => setTimeout(resolve, 300));

                this.scene.start("Mainmenu");
            }
        } catch (error) {
            console.error("Authentication error:", error);

            let errorMsg = "Authentication failed";

            // Parse error message for better user feedback
            if (error.message) {
                if (
                    error.message.includes("Invalid credentials") ||
                    error.message.includes("not found")
                ) {
                    errorMsg = this.isLogin
                        ? "Invalid email or password"
                        : "Account creation failed";
                } else if (error.message.includes("already exists")) {
                    errorMsg = "Account already exists. Try logging in.";
                } else if (
                    error.message.includes("network") ||
                    error.message.includes("connect")
                ) {
                    errorMsg = "Connection failed. Check server.";
                } else {
                    errorMsg = error.message;
                }
            }

            this.statusText.setText(errorMsg);
            this.statusText.setColor("#c83e4d");
        }
    }

    async handleGuestLogin() {
        this.statusText.setText("Connecting...");
        this.statusText.setColor("#4df2f2");

        try {
            await Nakama.authenticate();
            this.statusText.setText("Connected!");
            this.scene.start("Mainmenu");
        } catch (error) {
            console.error("Guest login error:", error);
            const errorMsg = `Connection failed: ${
                error.message || "Please try again"
            }`;
            this.statusText.setText(errorMsg);
            this.statusText.setColor("#c83e4d");
            alert(errorMsg);
        }
    }

    updateEmailDisplay() {
        if (this.email.length === 0) {
            this.emailText.setText("Click to type");
            this.emailText.setColor("#666666");
        } else {
            this.emailText.setText(this.email);
            this.emailText.setColor("#F4D6CC");
        }
    }

    updatePasswordDisplay() {
        if (this.password.length === 0) {
            this.passwordText.setText("Click to type");
            this.passwordText.setColor("#666666");
        } else {
            this.passwordText.setText("•".repeat(this.password.length));
            this.passwordText.setColor("#F4D6CC");
        }
    }
}

export default Login;
