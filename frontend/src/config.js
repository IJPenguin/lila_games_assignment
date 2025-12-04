// Nakama Configuration
// This file helps debug environment variable loading

export const nakamaConfig = {
    host: import.meta.env.VITE_NAKAMA_HOST || "localhost",
    port: import.meta.env.VITE_NAKAMA_PORT || "7350",
    key: import.meta.env.VITE_NAKAMA_KEY || "defaultkey",
};

// Log configuration on load (helps with debugging)
console.log("🔧 Nakama Configuration:", {
    host: nakamaConfig.host,
    port: nakamaConfig.port,
    url: `http://${nakamaConfig.host}:${nakamaConfig.port}`,
});

export default nakamaConfig;
