import { useState, useEffect } from "react";
import Nakama from "../nakama";

export default function Matchmaking({ navigateTo, data }) {
    const [status, setStatus] = useState("Finding opponent");
    const [dots, setDots] = useState("...");
    const playWithAI = data?.ai || false;

    useEffect(() => {
        const dotsInterval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
        }, 500);

        findMatch();

        return () => clearInterval(dotsInterval);
    }, []);

    const findMatch = async () => {
        if (playWithAI) {
            const maxRetries = 5;
            let attempt = 0;

            while (attempt < maxRetries) {
                try {
                    attempt++;
                    if (attempt > 1) {
                        setStatus(`Finding AI opponent (attempt ${attempt})`);
                        await new Promise((resolve) =>
                            setTimeout(resolve, 500)
                        );
                    }

                    const result = await Nakama.findMatch(playWithAI, false);
                    setStatus("Match found! Starting game...");
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    navigateTo("Game", {
                        matchID: result.matchID,
                        earlyMessages: result.earlyMessages,
                    });
                    return;
                } catch (error) {
                    console.error(`AI match attempt ${attempt} failed:`, error);

                    if (attempt >= maxRetries) {
                        setStatus("Failed to find AI match. Please try again.");
                        setTimeout(() => navigateTo("Selection"), 2000);
                    }
                }
            }
        } else {
            try {
                setStatus("Waiting for opponent");
                const result = await Nakama.findMatch(playWithAI, false);
                setStatus("Opponent found! Starting game...");
                await new Promise((resolve) => setTimeout(resolve, 100));
                navigateTo("Game", {
                    matchID: result.matchID,
                    earlyMessages: result.earlyMessages,
                });
            } catch (error) {
                console.error("Classic matchmaking failed:", error);
                setStatus("Connection error. Please try again.");
                setTimeout(() => navigateTo("Selection"), 2000);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="text-center space-y-6">
                <h1 className="text-4xl sm:text-5xl font-bold text-[#F4D6CC]">
                    Matchmaking
                </h1>

                <div className="space-y-2">
                    <p className="text-xl sm:text-2xl text-[#F4D6CC]">
                        {status}
                    </p>
                    <p className="text-3xl sm:text-4xl text-[#c83e4d] font-bold">
                        {dots}
                    </p>
                </div>

                <button
                    onClick={() => navigateTo("Selection")}
                    className="mt-8 px-8 py-3 bg-[#c83e4d] hover:bg-[#d2606c] text-[#F4D6CC] font-bold text-xl rounded-xl transition-colors"
                >
                    CANCEL
                </button>
            </div>
        </div>
    );
}
