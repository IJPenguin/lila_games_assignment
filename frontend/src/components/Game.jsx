import { useState, useEffect, useRef } from "react";
import Nakama from "../nakama";

export default function Game({ navigateTo, data }) {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [playerTurn, setPlayerTurn] = useState(false);
    const [playerPos, setPlayerPos] = useState(null);
    const [headerText, setHeaderText] = useState("Game Starting...");
    const [gameStarted, setGameStarted] = useState(false);
    const [gameEnded, setGameEnded] = useState(false);
    const [showEndScreen, setShowEndScreen] = useState(false);
    const [gameResult, setGameResult] = useState(null);
    const [showAIButton, setShowAIButton] = useState(false);

    // Use refs for values that need to be checked in WebSocket callbacks
    const matchID = useRef(data?.matchID || Nakama.matchID);
    const gameEndedRef = useRef(false);
    const gameStartedRef = useRef(false);
    const playerPosRef = useRef(null);
    const startTimeoutRef = useRef(null);

    useEffect(() => {
        console.log("=== Game component mounted ===");
        console.log("Match ID:", matchID.current);
        console.log("Socket exists:", !!Nakama.socket);
        console.log("Socket connected:", Nakama.socket?.isConnected);
        console.log("Early messages:", data?.earlyMessages?.length || 0);

        // Process any early messages that arrived before component mounted
        if (data?.earlyMessages && data.earlyMessages.length > 0) {
            console.log(
                "⚡ Processing",
                data.earlyMessages.length,
                "early messages"
            );
            data.earlyMessages.forEach((msg, index) => {
                console.log(
                    `⚡ Early message ${index + 1} - OpCode:`,
                    msg.op_code
                );
                handleMessage(msg);
            });
        }

        setupMatchListener();

        startTimeoutRef.current = setTimeout(() => {
            if (!gameStartedRef.current) {
                console.error(
                    "❌ TIMEOUT: Game did not start within 15 seconds"
                );
                console.error(
                    "This usually means the START message (OpCode 1) was not received"
                );
                setHeaderText("Failed to join match");
                setTimeout(() => {
                    Nakama.cleanupMatch();
                    navigateTo("Selection");
                }, 2000);
            }
        }, 15000);

        return () => {
            console.log("=== Game component unmounting ===");
            if (startTimeoutRef.current) {
                clearTimeout(startTimeoutRef.current);
            }
            if (Nakama.socket) {
                Nakama.socket.onmatchdata = null;
            }
        };
    }, []);

    const handleMessage = (result) => {
        console.log(
            "📨 Processing message - OpCode:",
            result.op_code,
            "MatchID:",
            result.match_id
        );

        if (result.match_id !== matchID.current) {
            console.warn("⚠️ Ignoring message from different match");
            return;
        }

        if (gameEndedRef.current) {
            console.log("⚠️ Ignoring message after game ended");
            return;
        }

        try {
            switch (result.op_code) {
                case 1: // START - Game Start
                    console.log("✅ Handling game START");
                    handleGameStart(result.data);
                    break;
                case 2: // UPDATE - Move Update
                    console.log("✅ Handling move UPDATE");
                    handleMoveUpdate(result.data);
                    break;
                case 3: // DONE - Game End
                    console.log("✅ Handling game DONE");
                    handleGameEnd(result.data);
                    break;
                case 6: // OPPONENT_LEFT
                    console.log("✅ Handling OPPONENT_LEFT");
                    handleOpponentLeft();
                    break;
                default:
                    console.warn("⚠️ Unknown opCode:", result.op_code);
            }
        } catch (error) {
            console.error("❌ Error processing message:", error);
        }
    };

    const setupMatchListener = () => {
        console.log("📡 Setting up WebSocket listener");
        Nakama.socket.onmatchdata = handleMessage;
    };

    const handleGameStart = (data) => {
        console.log("Game starting!");
        gameStartedRef.current = true;
        setGameStarted(true);

        // Clear the start timeout since game has started
        if (startTimeoutRef.current) {
            clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = null;
        }

        const jsonString = new TextDecoder().decode(data);
        const json = JSON.parse(jsonString);
        console.log("Game start data:", json);

        const userId = sessionStorage.getItem("user_id");
        console.log("User ID:", userId, "Marks:", json.marks);

        if (json.marks[userId] === 1) {
            playerPosRef.current = 1;
            setPlayerPos(1);
            setPlayerTurn(true);
            setHeaderText("Your turn!");
            console.log("You are player 1 (X) - Your turn!");
        } else {
            playerPosRef.current = 2;
            setPlayerPos(2);
            setPlayerTurn(false);
            setHeaderText("Opponent's turn!");
            console.log("You are player 2 (O) - Opponent's turn!");
        }
    };

    const handleMoveUpdate = (data) => {
        const jsonString = new TextDecoder().decode(data);
        const json = JSON.parse(jsonString);
        console.log("Move update - board:", json.board);
        setBoard(json.board);
        setPlayerTurn((prev) => {
            const newTurn = !prev;
            console.log(
                "Turn changed to:",
                newTurn ? "Your turn" : "Opponent's turn"
            );
            return newTurn;
        });
        setHeaderText((prev) =>
            prev === "Your turn!" ? "Opponent's turn!" : "Your turn!"
        );
    };

    const handleGameEnd = (data) => {
        console.log("Game ending!");
        gameEndedRef.current = true;

        const jsonString = new TextDecoder().decode(data);
        const json = JSON.parse(jsonString);
        console.log("Game end data:", json);

        setBoard(json.board);
        setGameStarted(false);
        setGameEnded(true);

        let result = "Draw";
        if (
            json.winner === null ||
            json.winner === undefined ||
            json.winner === 0
        ) {
            setHeaderText("It's a Draw!");
            result = "Draw";
        } else if (json.winner === playerPosRef.current) {
            setHeaderText("🏆 You Win!");
            result = "Victory!";
        } else {
            setHeaderText("You Lose");
            result = "Defeat";
        }

        console.log("Game result:", result);
        setTimeout(() => {
            setGameResult(result);
            setShowEndScreen(true);
        }, 1500);
    };

    const handleOpponentLeft = () => {
        console.log("Opponent left the match");
        setHeaderText("Opponent has left");
        setShowAIButton(true);
    };

    const handleCellClick = async (index) => {
        if (playerTurn && !board[index] && gameStarted && !gameEnded) {
            await Nakama.makeMove(index);
        }
    };

    const handleInviteAI = async () => {
        await Nakama.inviteAI();
        setShowAIButton(false);
    };

    const handleMainMenu = async () => {
        try {
            await Nakama.leaveMatch();
        } catch (error) {
            console.error("Error leaving match:", error);
            Nakama.cleanupMatch();
        }
        navigateTo("Mainmenu");
    };

    const handleViewProfile = async () => {
        try {
            await Nakama.leaveMatch();
        } catch (error) {
            console.error("Error leaving match:", error);
            Nakama.cleanupMatch();
        }
        navigateTo("Profile");
    };

    const renderCell = (index) => {
        const value = board[index];
        return (
            <button
                key={index}
                onClick={() => handleCellClick(index)}
                className={`aspect-square bg-[#4a4a4a] rounded-lg flex items-center justify-center text-5xl sm:text-6xl md:text-7xl font-bold transition-all ${
                    !value && playerTurn && gameStarted && !gameEnded
                        ? "hover:bg-[#5a5a5a] cursor-pointer"
                        : "cursor-default"
                }`}
            >
                {value === 1 && <span className="text-[#c83e4d]">✕</span>}
                {value === 2 && <span className="text-[#4df2f2]">○</span>}
            </button>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
            <h2
                className={`text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 ${
                    headerText.includes("Win")
                        ? "text-green-500"
                        : headerText.includes("Lose")
                        ? "text-[#c83e4d]"
                        : headerText.includes("Draw")
                        ? "text-yellow-500"
                        : "text-[#F4D6CC]"
                }`}
            >
                {headerText}
            </h2>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[min(90vw,400px)] mb-6">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(renderCell)}
            </div>

            {showAIButton && (
                <button
                    onClick={handleInviteAI}
                    className="px-6 py-3 bg-[#c83e4d] hover:bg-[#d2606c] text-[#F4D6CC] font-bold text-lg rounded-xl transition-colors"
                >
                    Continue with AI
                </button>
            )}

            {showEndScreen && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#2a2a2a] rounded-xl p-6 sm:p-8 max-w-md w-full border-4 border-[#c83e4d] space-y-6">
                        <h2
                            className={`text-4xl sm:text-5xl font-bold text-center ${
                                gameResult === "Victory!"
                                    ? "text-green-500"
                                    : gameResult === "Draw"
                                    ? "text-yellow-500"
                                    : "text-[#c83e4d]"
                            }`}
                        >
                            {gameResult}
                        </h2>

                        <p className="text-center text-gray-400 text-lg">
                            {gameResult === "Victory!"
                                ? "+50 points"
                                : gameResult === "Defeat"
                                ? "-10 points"
                                : "No change"}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={handleMainMenu}
                                className="w-full py-3 bg-[#c83e4d] hover:bg-[#d2606c] text-[#F4D6CC] font-bold text-xl rounded-xl transition-colors"
                            >
                                Main Menu
                            </button>

                            <button
                                onClick={handleViewProfile}
                                className="w-full py-3 bg-[#4a4a4a] hover:bg-[#5a5a5a] text-[#F4D6CC] font-semibold text-xl rounded-xl transition-colors"
                            >
                                View Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
