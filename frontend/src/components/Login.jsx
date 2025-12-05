import { useState } from "react";
import Nakama from "../nakama";

export default function Login({ navigateTo }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState("");
    const [statusColor, setStatusColor] = useState("text-red-500");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setStatus("Please enter email and password");
            setStatusColor("text-red-500");
            return;
        }

        if (!email.includes("@") || !email.includes(".")) {
            setStatus("Please enter a valid email");
            setStatusColor("text-red-500");
            return;
        }

        if (password.length < 6) {
            setStatus("Password must be at least 6 characters");
            setStatusColor("text-red-500");
            return;
        }

        setStatus("Processing...");
        setStatusColor("text-cyan-400");

        try {
            if (isLogin) {
                await Nakama.authenticateEmail(email, password, null);
                setStatus("Login successful!");
                await Nakama.getProfile();
                setTimeout(() => navigateTo("Mainmenu"), 300);
            } else {
                const defaultUsername = email.split("@")[0].substring(0, 15);
                await Nakama.authenticateEmail(email, password, defaultUsername);
                setStatus("Account created!");
                await Nakama.getProfile();
                setTimeout(() => navigateTo("Mainmenu"), 300);
            }
        } catch (error) {
            console.error("Authentication error:", error);
            let errorMsg = "Authentication failed";

            if (error.message) {
                if (error.message.includes("Invalid credentials") || error.message.includes("not found")) {
                    errorMsg = isLogin ? "Invalid email or password" : "Account creation failed";
                } else if (error.message.includes("already exists")) {
                    errorMsg = "Account already exists. Try logging in.";
                } else if (error.message.includes("network") || error.message.includes("connect")) {
                    errorMsg = "Connection failed. Check server.";
                } else {
                    errorMsg = error.message;
                }
            }

            setStatus(errorMsg);
            setStatusColor("text-red-500");
        }
    };

    const handleGuestLogin = async () => {
        setStatus("Connecting...");
        setStatusColor("text-cyan-400");

        try {
            await Nakama.authenticate();
            setStatus("Connected!");
            navigateTo("Mainmenu");
        } catch (error) {
            console.error("Guest login error:", error);
            const errorMsg = `Connection failed: ${error.message || "Please try again"}`;
            setStatus(errorMsg);
            setStatusColor("text-red-500");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-[#F4D6CC] mb-3">
                        {isLogin ? "Login" : "Sign Up"}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">Enter your credentials</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[#F4D6CC] text-sm sm:text-base mb-2">Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-[#2a2a2a] text-[#F4D6CC] rounded-lg border-2 border-transparent focus:border-[#c83e4d] outline-none transition-colors"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-[#F4D6CC] text-sm sm:text-base mb-2">Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-[#2a2a2a] text-[#F4D6CC] rounded-lg border-2 border-transparent focus:border-[#c83e4d] outline-none transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-[#c83e4d] hover:bg-[#d2606c] text-[#F4D6CC] font-bold text-lg sm:text-xl rounded-xl transition-colors"
                    >
                        {isLogin ? "LOGIN" : "SIGN UP"}
                    </button>
                </form>

                <button
                    onClick={handleGuestLogin}
                    className="w-full py-3 bg-[#4a4a4a] hover:bg-[#5a5a5a] text-[#F4D6CC] font-semibold text-base sm:text-lg rounded-xl transition-colors"
                >
                    Play as Guest
                </button>

                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setStatus("");
                    }}
                    className="w-full text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
                </button>

                {status && (
                    <p className={`text-center text-sm sm:text-base ${statusColor}`}>
                        {status}
                    </p>
                )}
            </div>
        </div>
    );
}
