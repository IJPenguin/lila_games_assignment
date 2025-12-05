// Nakama Configuration
// This file helps debug environment variable loading

// Parse SSL setting from environment variable
const parseSSL = (value) => {
    if (value === undefined || value === null || value === "") {
        // Auto-detect: use SSL if frontend is HTTPS
        return window.location.protocol === "https:";
    }
    return value === "true" || value === "1";
};

export const nakamaConfig = {
    host: import.meta.env.VITE_NAKAMA_HOST || "localhost",
    port: import.meta.env.VITE_NAKAMA_PORT || "7350",
    key: import.meta.env.VITE_NAKAMA_KEY || "defaultkey",
    useSSL: parseSSL(import.meta.env.VITE_NAKAMA_USE_SSL),
};

// Log configuration on load (helps with debugging)
console.log("🔧 Nakama Configuration:", {
    host: nakamaConfig.host,
    port: nakamaConfig.port,
    useSSL: nakamaConfig.useSSL,
    url: `${nakamaConfig.useSSL ? "https" : "http"}://${nakamaConfig.host}:${nakamaConfig.port}`,
});

export default nakamaConfig;
