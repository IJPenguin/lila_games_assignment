import { useState, useEffect } from "react";
import Nakama from "../nakama";

export default function Mainmenu({ navigateTo }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        try {
            if (!Nakama.isAuthenticated()) {
                navigateTo("Login");
                return;
            }

            const data = await Nakama.getLeaderboard();
            setLeaderboard(data.leaderboard || []);
        } catch (error) {
            console.error("Failed to load leaderboard:", error);
            setLeaderboard([]);
        } finally {
            setLoading(false);
        }
    };

    const getRankEmoji = (rank) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return `${rank}.`;
    };

    return (
        <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-2xl space-y-6 sm:space-y-8 py-6">
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-[#F4D6CC] text-center">
                    Tic Tac Toe
                </h1>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigateTo("Selection")}
                        className="px-12 py-4 bg-[#c83e4d] hover:bg-[#d2606c] text-[#F4D6CC] font-bold text-3xl sm:text-4xl rounded-xl transition-colors shadow-lg"
                    >
                        PLAY
                    </button>

                    <button
                        onClick={() => navigateTo("Profile")}
                        className="px-8 py-3 bg-[#4a4a4a] hover:bg-[#5a5a5a] text-[#F4D6CC] font-semibold text-xl sm:text-2xl rounded-xl transition-colors"
                    >
                        PROFILE
                    </button>
                </div>

                <div className="bg-[#2a2a2a] rounded-xl p-4 sm:p-6 shadow-xl">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#F4D6CC] text-center mb-4">
                        🏆 Global Leaderboard
                    </h2>

                    {loading ? (
                        <p className="text-center text-gray-400 py-8">Loading...</p>
                    ) : leaderboard.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">No players yet</p>
                    ) : (
                        <div className="space-y-3">
                            {leaderboard.slice(0, 5).map((player, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-3 sm:p-4 hover:bg-[#252525] transition-colors"
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <span className="text-xl sm:text-2xl w-8 sm:w-10 flex-shrink-0">
                                            {getRankEmoji(index + 1)}
                                        </span>
                                        <span className="text-[#F4D6CC] text-base sm:text-lg font-medium truncate">
                                            {player.username || "Anonymous"}
                                        </span>
                                    </div>
                                    <span className="text-[#c83e4d] text-lg sm:text-xl font-bold flex-shrink-0">
                                        {player.score}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
