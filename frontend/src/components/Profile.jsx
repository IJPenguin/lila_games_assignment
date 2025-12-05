import { useState, useEffect } from "react";
import Nakama from "../nakama";

export default function Profile({ navigateTo }) {
    const [profile, setProfile] = useState(null);
    const [matchHistory, setMatchHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUsernameInput, setShowUsernameInput] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [updateStatus, setUpdateStatus] = useState("");

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const profileData = await Nakama.getProfile();
            setProfile(profileData);

            const historyData = await Nakama.getMatchHistory();
            setMatchHistory(historyData.matches || []);
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUsername = async (e) => {
        e.preventDefault();
        if (!newUsername.trim() || newUsername.length < 3 || newUsername.length > 20) {
            setUpdateStatus("Username must be 3-20 characters");
            return;
        }

        try {
            const updatedProfile = await Nakama.updateUsername(newUsername.trim());
            setProfile(updatedProfile);
            setShowUsernameInput(false);
            setNewUsername("");
            setUpdateStatus("");
        } catch (error) {
            console.error("Error updating username:", error);
            setUpdateStatus("Failed to update username");
        }
    };

    const getRankEmoji = (rank) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return `${rank}.`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-2xl text-[#F4D6CC]">Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-2xl space-y-6 py-6">
                <h1 className="text-4xl sm:text-5xl font-bold text-[#F4D6CC] text-center">
                    Profile
                </h1>

                <div className="bg-[#2a2a2a] rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-center gap-4">
                        <h2 className="text-2xl sm:text-3xl font-bold text-[#F4D6CC]">
                            {profile?.username || "Anonymous"}
                        </h2>
                        <button
                            onClick={() => setShowUsernameInput(true)}
                            className="px-4 py-2 bg-[#4df2f2] hover:bg-[#3de0e0] text-[#1e1e1e] font-semibold rounded-lg transition-colors text-sm"
                        >
                            Edit
                        </button>
                    </div>

                    <p className="text-xl sm:text-2xl text-[#4df2f2] text-center">
                        Score: {profile?.score || 0}
                    </p>

                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="text-center">
                            <p className="text-[#F4D6CC] text-sm sm:text-base">Wins</p>
                            <p className="text-[#4df2f2] text-2xl sm:text-3xl font-bold">
                                {profile?.wins || 0}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[#F4D6CC] text-sm sm:text-base">Losses</p>
                            <p className="text-[#4df2f2] text-2xl sm:text-3xl font-bold">
                                {profile?.losses || 0}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-[#F4D6CC] text-sm sm:text-base">Draws</p>
                            <p className="text-[#4df2f2] text-2xl sm:text-3xl font-bold">
                                {profile?.draws || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#2a2a2a] rounded-xl p-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F4D6CC] text-center mb-4">
                        Recent Matches
                    </h3>

                    {matchHistory.length === 0 ? (
                        <p className="text-center text-gray-400 py-4">No matches yet</p>
                    ) : (
                        <div className="space-y-2">
                            {matchHistory.slice(0, 5).map((match, index) => {
                                const resultColor =
                                    match.result === "win" ? "text-[#4df2f2]" :
                                    match.result === "loss" ? "text-[#c83e4d]" :
                                    "text-gray-400";

                                const resultText = match.result.toUpperCase();
                                const scoreChange = match.score_change >= 0 ? `+${match.score_change}` : match.score_change;

                                return (
                                    <div
                                        key={index}
                                        className={`${resultColor} text-sm sm:text-base text-center py-2`}
                                    >
                                        {resultText} vs {match.opponent_username} ({scoreChange})
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => navigateTo("Mainmenu")}
                    className="w-full py-3 bg-[#c83e4d] hover:bg-[#d2606c] text-[#F4D6CC] font-bold text-xl rounded-xl transition-colors"
                >
                    BACK
                </button>
            </div>

            {showUsernameInput && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#2a2a2a] rounded-xl p-6 max-w-md w-full space-y-4">
                        <h3 className="text-2xl font-bold text-[#F4D6CC] text-center">
                            Enter Username
                        </h3>

                        <form onSubmit={handleUpdateUsername} className="space-y-4">
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Username (3-20 characters)"
                                className="w-full px-4 py-3 bg-[#1a1a1a] text-[#F4D6CC] rounded-lg border-2 border-transparent focus:border-[#4df2f2] outline-none"
                                autoFocus
                            />

                            {updateStatus && (
                                <p className="text-red-500 text-sm text-center">{updateStatus}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-[#4df2f2] hover:bg-[#3de0e0] text-[#1e1e1e] font-bold rounded-lg transition-colors"
                                >
                                    Confirm
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUsernameInput(false);
                                        setNewUsername("");
                                        setUpdateStatus("");
                                    }}
                                    className="flex-1 py-3 bg-[#4a4a4a] hover:bg-[#5a5a5a] text-[#F4D6CC] font-semibold rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
