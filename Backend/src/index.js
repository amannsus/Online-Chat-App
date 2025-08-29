import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { connectDB } from "./lib/db.js";
import { scheduleMessageCleanup } from "./lib/utils.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import userRoutes from "./routes/user.route.js";
import groupRoutes from "./routes/group.route.js";
import handleConnection from "./socket/socketHandler.js";

dotenv.config();

const __dirname = path.resolve();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? true  // Allow same origin in production
      : "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

const PORT = process.env.PORT || 5001;

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? true  // Allow same origin in production
    : "http://localhost:5173",
  credentials: true,
}));

// API Routes - these must come BEFORE static file serving
app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);

handleConnection(io);

// Serve static files from frontend build in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from frontend/dist
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  
  // Catch-all handler: send back index.html for any non-API routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
} else {
  // Development mode - just show API status
  app.get("/", (req, res) => {
    res.json({ message: "Chat API is running in development mode!" });
  });
}

server.listen(PORT, async () => {
  try {
    await connectDB();
    scheduleMessageCleanup();
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend served from: ${path.join(__dirname, "../frontend/dist")}`);
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
});
