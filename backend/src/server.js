import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import eventRoutes from "./routes/eventRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import templateRoutes from "./routes/templateRoutes.js";
import connectDB from "./config/db.js";
import dns from "dns";
import automationRoutes from "./routes/automationRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import marketingRoutes from "./routes/marketingRoutes.js";
import checkInRoutes from "./routes/checkInRoutes.js";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "src/.env") });

const app = express();

const PORT = process.env.PORT || 5000;

connectDB();

const configuredOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const allowedOrigins = [
    ...new Set([
        ...configuredOrigins,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:5000",
    ]),
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const normalized = origin.replace(/\/+$/, "");
            if (
                allowedOrigins.includes(normalized) ||
                allowedOrigins.includes("*") ||
                /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)
            ) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true,
    })
);
app.use(express.json({ limit: "2mb" }));

// Health check endpoints for uptime monitors / cron-jobs
app.get(["/", "/health", "/api/health"], (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "ACE Events Backend",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/checkin", checkInRoutes);
app.use("/checkin", checkInRoutes);
app.use("/api/events", eventRoutes);
app.use("/events", eventRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/marketing", marketingRoutes);

app.use(errorMiddleware);



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});