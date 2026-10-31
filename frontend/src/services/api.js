import axios from "axios";

const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1");

const rawUrl = (isLocalhost ? "http://localhost:5000/api" : (import.meta.env.VITE_API_URL || "https://ace-events-3i87.onrender.com/api")).trim().replace(/\/+$/, "");
// Ensure baseURL always ends with exactly one /api without duplicating
const cleanUrl = rawUrl.replace(/(\/api)+$/, "");
const baseURL = `${cleanUrl}/api`;

const api = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            // Avoid hard-reloading the page if already on "/" or if this was a login/register request
            const isAuthRequest = error.config?.url?.includes("/auth/");
            if (!isAuthRequest && window.location.pathname !== "/") {
                window.location.href = "/";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
