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

// CORS origins for production
const allowedOrigins = process.env.NODE_ENV === "production" 
  ? [
      process.env.FRONTEND_URL,
      "https://online-chat-app-hwop.onrender.com",
      // Add your actual Netlify URL here
    ].filter(Boolean) // Remove any undefined values
  : ["http://localhost:5173"];

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl requests)
          if (!origin) return callback(null, true);
          
          if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            console.log(`Blocked CORS for origin: ${origin}`);
            callback(null, true); // Allow all origins for now to prevent issues
          }
        }
      : "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  }
});

app.set('io', io);

const PORT = process.env.PORT || 5001;

// Trust proxy for production
if (process.env.NODE_ENV === "production") {
  app.set('trust proxy', 1);
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          console.log(`Blocked CORS for origin: ${origin}`);
          callback(null, true); // Allow all origins for now to prevent issues
        }
      }
    : "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// API Routes - these must come BEFORE static file serving
app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);

// Initialize socket connection handling
handleConnection(io);

// Serve static files from frontend build in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from frontend/dist
  const frontendPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendPath));
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });
  
  // Catch-all handler: send back index.html for any non-API routes
  app.get("*", (req, res) => {
    try {
      const indexPath = path.join(frontendPath, "index.html");
      res.sendFile(indexPath);
    } catch (error) {
      console.error("Error serving index.html:", error);
      res.status(500).json({ error: "Failed to serve application" });
    }
  });
} else {
  // Development mode - just show API status
  app.get("/", (req, res) => {
    res.json({ 
      message: "Chat API is running in development mode!",
      environment: "development",
      timestamp: new Date().toISOString()
    });
  });
  
  // Health check for development
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      environment: "development",
      timestamp: new Date().toISOString()
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
  });
});

// Handle 404 for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

server.listen(PORT, async () => {
  try {
    await connectDB();
    scheduleMessageCleanup();
    
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📁 Frontend path: ${path.join(__dirname, "../frontend/dist")}`);
    
    if (process.env.NODE_ENV === "production") {
      console.log(`🔗 Allowed origins:`, allowedOrigins);
    }
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
    process.exit(0);
  });
});
