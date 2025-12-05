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

// Parse port - use standard ports for SSL if not specified
const parsePort = (port, useSSL) => {
    if (port && port !== "") {
        return port;
    }
    // Default ports: 443 for HTTPS, 7350 for HTTP
    return useSSL ? "443" : "7350";
};

const useSSL = parseSSL(import.meta.env.VITE_NAKAMA_USE_SSL);

export const nakamaConfig = {
    host: import.meta.env.VITE_NAKAMA_HOST || "localhost",
    port: parsePort(import.meta.env.VITE_NAKAMA_PORT, useSSL),
    key: import.meta.env.VITE_NAKAMA_KEY || "defaultkey",
    useSSL: useSSL,
};

// Log configuration on load (helps with debugging)
console.log("🔧 Nakama Configuration:", {
    host: nakamaConfig.host,
    port: nakamaConfig.port,
    useSSL: nakamaConfig.useSSL,
    url: `${nakamaConfig.useSSL ? "https" : "http"}://${nakamaConfig.host}:${nakamaConfig.port}`,
    websocket: `${nakamaConfig.useSSL ? "wss" : "ws"}://${nakamaConfig.host}:${nakamaConfig.port}`,
});

export default nakamaConfig;
