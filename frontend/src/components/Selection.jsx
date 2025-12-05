export default function Selection({ navigateTo }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6">
            <div className="w-full max-w-md space-y-6 sm:space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-[#F4D6CC] mb-3">
                        Select Game Mode
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">Choose your game mode</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => navigateTo("Matchmaking", { ai: false })}
                        className="w-full py-6 bg-[#c83e4d] hover:bg-[#d2606c] text-[#F4D6CC] font-bold text-2xl sm:text-3xl rounded-xl transition-colors shadow-lg"
                    >
                        Classic Mode
                    </button>

                    <button
                        onClick={() => navigateTo("Matchmaking", { ai: true })}
                        className="w-full py-6 bg-[#4a90e2] hover:bg-[#5aa0f2] text-[#F4D6CC] font-bold text-2xl sm:text-3xl rounded-xl transition-colors shadow-lg"
                    >
                        AI Mode
                    </button>

                    <button
                        onClick={() => navigateTo("Mainmenu")}
                        className="w-full py-3 bg-[#4a4a4a] hover:bg-[#5a5a5a] text-[#F4D6CC] font-semibold text-lg rounded-xl transition-colors"
                    >
                        ← Back
                    </button>
                </div>
            </div>
        </div>
    );
}
