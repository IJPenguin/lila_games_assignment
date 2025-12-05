import { useState } from "react";
import Login from "./components/Login";
import Mainmenu from "./components/Mainmenu";
import Selection from "./components/Selection";
import Matchmaking from "./components/Matchmaking";
import Game from "./components/Game";
import Profile from "./components/Profile";

function App() {
    const [currentScene, setCurrentScene] = useState("Login");
    const [sceneData, setSceneData] = useState({});

    const navigateTo = (scene, data = {}) => {
        setSceneData(data);
        setCurrentScene(scene);
    };

    const renderScene = () => {
        switch (currentScene) {
            case "Login":
                return <Login navigateTo={navigateTo} />;
            case "Mainmenu":
                return <Mainmenu navigateTo={navigateTo} />;
            case "Selection":
                return <Selection navigateTo={navigateTo} />;
            case "Matchmaking":
                return <Matchmaking navigateTo={navigateTo} data={sceneData} />;
            case "Game":
                return <Game navigateTo={navigateTo} data={sceneData} />;
            case "Profile":
                return <Profile navigateTo={navigateTo} />;
            default:
                return <Login navigateTo={navigateTo} />;
        }
    };

    return (
        <div className="w-screen h-screen bg-[#32373B] overflow-hidden">
            {renderScene()}
        </div>
    );
}

export default App;
