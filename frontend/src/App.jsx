import { useEffect, useRef } from "react";
import Login from "./scenes/Login";
import ProfileSetup from "./scenes/ProfileSetup";
import Game from "./scenes/Game";
import Mainmenu from "./scenes/Mainmenu";
import Selection from "./scenes/Selection";
import Matchmaking from "./scenes/Matchmaking";
import Profile from "./scenes/Profile";

function App() {
    const gameContainerRef = useRef(null);
    const gameRef = useRef(null);

    useEffect(() => {
        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: gameContainerRef.current,
            backgroundColor: "#32373B",
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            render: {
                antialias: true,
                roundPixels: true,
            },
            scene: [
                Login,
                ProfileSetup,
                Mainmenu,
                Selection,
                Matchmaking,
                Game,
                Profile,
            ],
        };
        gameRef.current = new Phaser.Game(config);
        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
            }
        };
    }, []);

    return (
        <div className=" flex items-center justify-center w-screen h-screen overflow-hidden">
            <div ref={gameContainerRef} id="game-container"></div>
        </div>
    );
}

export default App;
