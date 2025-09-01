================================================
FILE: Backend/src/index.js
================================================
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


const allowedOrigins = process.env.NODE_ENV === "production" 
  ? [
      process.env.FRONTEND_URL,
      "https://online-chat-app-hwop.onrender.com",
      "https://yappinng.netlify.app",  // Fixed: domain only, no path
    ].filter(Boolean)
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
            console.log(`CORS request from origin: ${origin}`);
            // For now, allow but log for debugging
            callback(null, true);
          }
        }
      : "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  // Add these to prevent connection issues
  pingTimeout: 60000,
  pingInterval: 25000
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
        // Allow requests with no origin
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          console.log(`CORS request from origin: ${origin}`);
          callback(null, true); // Allow for now but log
        }
      }
    : "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);

// Initialize socket connection handling
handleConnection(io);

// Serve static files from frontend build in production
if (process.env.NODE_ENV === "production") {
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
  
  // Catch-all handler
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
  app.get("/", (req, res) => {
    res.json({ 
      message: "Chat API is running in development mode!",
      environment: "development",
      timestamp: new Date().toISOString()
    });
  });
  
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



================================================
FILE: Backend/src/controllers/auth.controller.js
================================================
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      profilePic: "",
    });

    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" }); 
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};


================================================
FILE: Backend/src/controllers/message.controller.js
================================================
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    const user = await User.findById(loggedInUserId)
      .populate('friends', 'fullName email profilePic')
      .select('friends');
    
    res.status(200).json(user.friends || []);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ error: "Message must contain text or image" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || '',
      image: imageUrl,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'fullName profilePic');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const clearIndividualChat = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const myId = req.user._id;

    const result = await Message.deleteMany({
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    });

    const io = req.app.get('io');
    if (io) {
      io.to(myId.toString()).to(otherUserId.toString()).emit('chatHistoryCleared', {
        type: 'individual',
        chatId: otherUserId
      });
    }

    res.status(200).json({ 
      message: "Chat history cleared successfully",
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const clearGroupChat = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const isAdmin = group.admin.toString() === userId.toString();
    if (!isAdmin) {
      return res.status(403).json({ error: "Only group admin can clear chat history" });
    }

    const result = await Message.deleteMany({ groupId });

    const io = req.app.get('io');
    if (io) {
      io.to(groupId).emit('chatHistoryCleared', {
        type: 'group',
        groupId: groupId
      });
    }

    res.status(200).json({ 
      message: "Group chat history cleared successfully",
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessageRetentionInfo = async (req, res) => {
  try {
    if (req.path.includes('/group/')) {
      const { groupId } = req.params;
      
      const group = await Group.findById(groupId).select('messageRetentionDays autoDeleteMessages');
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      
      res.status(200).json({
        messageRetentionDays: group.messageRetentionDays,
        autoDeleteMessages: group.autoDeleteMessages,
        type: 'group'
      });
    } else {
      res.status(200).json({
        messageRetentionDays: 30,
        autoDeleteMessages: false,
        type: 'individual'
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};


================================================
FILE: Backend/src/lib/cloudinary.js
================================================
import { v2 as cloudinary } from "cloudinary";

import { config } from "dotenv";

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;


================================================
FILE: Backend/src/lib/db.js
================================================
import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        process.exit(1);
    }
};


================================================
FILE: Backend/src/lib/utils.js
================================================
import jwt from "jsonwebtoken";
import Message from '../models/message.model.js';
import Group from '../models/group.model.js';

export const generateToken= (userId, res) => {
    
    const token = jwt.sign({ userId}, process.env.JWT_SECRET, {
        expiresIn:"7d"
    });

    res.cookie("jwt",token, {
         maxAge: 7 * 24 * 60 * 60 * 1000,
         httpOnly: true,
         sameSite: "none",
         secure: true,
    });

    return token;
};

export const cleanupOldMessages = async () => {
  try {
    const groupsWithAutoDelete = await Group.find({ autoDeleteMessages: true });
    
    for (const group of groupsWithAutoDelete) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - group.messageRetentionDays);
      
      const deletedCount = await Message.deleteMany({
        groupId: group._id,
        createdAt: { $lt: cutoffDate }
      });
      
      if (deletedCount.deletedCount > 0) {
        
      }
    }
    
    const defaultCutoffDate = new Date();
    defaultCutoffDate.setDate(defaultCutoffDate.getDate() - 30);
    
    const deletedIndividualCount = await Message.deleteMany({
      groupId: { $exists: false },
      createdAt: { $lt: defaultCutoffDate }
    });
    
    if (deletedIndividualCount.deletedCount > 0) {
      
    }
  } catch (error) {
    console.error('Error during automatic message cleanup:', error);
  }
};

export const scheduleMessageCleanup = () => {
  setInterval(cleanupOldMessages, 24 * 60 * 60 * 1000);
  
  setTimeout(cleanupOldMessages, 5 * 60 * 1000);
};



================================================
FILE: Backend/src/middleware/auth.middleware.js
================================================
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized- No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized- Invalid token" });
        }

        const user = await User.findById(decoded.userId).select("-password");

        if(!user){
          return res.status(404).json({ message: "User not found" });
        }

        req.user = user;

        next();

      } catch (error) { 
    res.status(500).json({ message: "Internal server error" });
  }

};

export const socketAuth = async (socket, next) => {
    try {
        const cookies = socket.handshake.headers.cookie;
        let token = null;
        
        if (cookies) {
            const jwtCookie = cookies.split(';').find(cookie => cookie.trim().startsWith('jwt='));
            if (jwtCookie) {
                token = jwtCookie.split('=')[1];
            }
        }
        
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded) {
            return next(new Error('Authentication error: Invalid token'));
        }

        const user = await User.findById(decoded.userId).select("-password");
        
        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        socket.userId = user._id;
        socket.user = user;
        
        next();
      } catch (error) {
    next(new Error('Authentication error: ' + error.message));
  }
};

export default socketAuth;


================================================
FILE: Backend/src/models/friendRequest.model.js
================================================
import mongoose from 'mongoose';

const friendRequestSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

export default mongoose.model('FriendRequest', friendRequestSchema);


================================================
FILE: Backend/src/models/group.model.js
================================================
import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  messageRetentionDays: {
    type: Number,
    default: 30,
    min: 1,
    max: 365
  },
  autoDeleteMessages: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true 
});

groupSchema.index({ 'members.user': 1 });
groupSchema.index({ admin: 1 });

export default mongoose.model('Group', groupSchema);


================================================
FILE: Backend/src/models/message.model.js
================================================

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: function() { return !this.groupId; }
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: function() { return !this.receiverId; }
  },
  text: {
    type: String,
  },
  image: {
    type: String,
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text'
  }
}, { timestamps: true });


messageSchema.pre('save', function(next) {
  if (!this.receiverId && !this.groupId) {
    next(new Error('Either receiverId or groupId must be provided'));
  }
  if (this.receiverId && this.groupId) {
    next(new Error('Cannot have both receiverId and groupId'));
  }
  next();
});

const Message = mongoose.model("Message", messageSchema);
export default Message;


================================================
FILE: Backend/src/models/user.model.js
================================================
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;


================================================
FILE: Backend/src/routes/auth.route.js
================================================
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { signup, login, logout, updateProfile, checkAuth } from '../controllers/auth.controller.js';

const router = express.Router();


router.post("/signup", signup);
router.post("/login", login); 
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);
router.put("/update-profile", protectRoute, updateProfile);

export default router;


================================================
FILE: Backend/src/routes/group.route.js
================================================
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import Group from '../models/group.model.js';
import Message from '../models/message.model.js';
import User from '../models/user.model.js';

const router = express.Router();

router.get('/', protectRoute, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id,
      isActive: true
    })
    .populate('admin', 'fullName email profilePic')
    .populate('members.user', 'fullName email profilePic')
    .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', protectRoute, async (req, res) => {
  try {
    const { name, description, memberIds = [], messageRetentionDays = 30, autoDeleteMessages = false } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const members = [
      { user: req.user._id, role: 'admin' },
      ...memberIds.map(id => ({ user: id, role: 'member' }))
    ];

    const group = new Group({
      name: name.trim(),
      description: description?.trim() || '',
      admin: req.user._id,
      members,
      messageRetentionDays: parseInt(messageRetentionDays),
      autoDeleteMessages
    });

    await group.save();
    
    const populatedGroup = await Group.findById(group._id)
      .populate('admin', 'fullName email profilePic')
      .populate('members.user', 'fullName email profilePic');

    const io = req.app.get('io');
    if (io) {
      memberIds.forEach(memberId => {
        io.to(memberId).emit('groupCreated', {
          group: populatedGroup,
          message: `You've been added to group "${name}"`
        });
      });
    }

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', protectRoute, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('admin', 'fullName email profilePic')
      .populate('members.user', 'fullName email profilePic');

    if (!group || !group.members.some(m => m.user._id.equals(req.user._id))) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', protectRoute, async (req, res) => {
  try {
    const { name, description, avatar, messageRetentionDays, autoDeleteMessages } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group || !group.admin.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to update this group' });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (avatar !== undefined) group.avatar = avatar;
    if (messageRetentionDays !== undefined) group.messageRetentionDays = parseInt(messageRetentionDays);
    if (autoDeleteMessages !== undefined) group.autoDeleteMessages = autoDeleteMessages;

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('admin', 'fullName email profilePic')
      .populate('members.user', 'fullName email profilePic');

    const io = req.app.get('io');
    if (io) {
      group.members.forEach(member => {
        io.to(member.user._id).emit('groupUpdated', {
          groupId: group._id,
          group: populatedGroup
        });
      });
    }

    res.json(populatedGroup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/members', protectRoute, async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group || !group.admin.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (group.members.some(m => m.user.equals(userId))) {
      return res.status(400).json({ error: 'User already in group' });
    }

    group.members.push({ user: userId, role: 'member' });
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('admin', 'fullName email profilePic')
      .populate('members.user', 'fullName email profilePic');

    const io = req.app.get('io');
    if (io) {
      const newMember = await User.findById(userId);
      io.to(userId).emit('groupJoined', { group: populatedGroup });
      
      group.members.forEach(member => {
        if (!member.user.equals(userId)) {
          io.to(member.user._id).emit('memberAdded', {
            groupId: group._id,
            newMember: { _id: newMember._id, fullName: newMember.fullName }
          });
        }
      });
    }

    res.json(populatedGroup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/members/:userId', protectRoute, async (req, res) => {
  try {
    const { userId } = req.params;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!group.admin.equals(req.user._id) && !req.user._id.equals(userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (group.admin.equals(userId)) {
      return res.status(400).json({ error: 'Cannot remove group admin' });
    }

    group.members = group.members.filter(m => !m.user.equals(userId));
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('admin', 'fullName email profilePic')
      .populate('members.user', 'fullName email profilePic');

    const io = req.app.get('io');
    if (io) {
      const removedUser = await User.findById(userId);
      io.to(userId).emit('groupLeft', { groupId: group._id });
      
      group.members.forEach(member => {
        io.to(member.user._id).emit('memberRemoved', {
          groupId: group._id,
          removedMember: { _id: removedUser._id, fullName: removedUser.fullName }
        });
      });
    }

    res.json(populatedGroup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/leave', protectRoute, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isAdmin = group.admin.equals(req.user._id);
    
    if (isAdmin) {
      // If admin is leaving, transfer admin rights to the first member
      const otherMembers = group.members.filter(m => !m.user.equals(req.user._id));
      
      if (otherMembers.length === 0) {
        // If no other members, delete the group
        await Group.findByIdAndDelete(req.params.id);
        
        const io = req.app.get('io');
        if (io) {
          io.to(req.params.id).emit('groupDeleted', {
            groupId: group._id,
            message: 'Group has been deleted as the last member left'
          });
        }
        
        return res.json({ message: 'Group deleted successfully as you were the last member' });
      } else {
        // Transfer admin rights to the first member
        const newAdmin = otherMembers[0];
        group.admin = newAdmin.user;
        newAdmin.role = 'admin';
      }
    }

    // Remove the user from members
    group.members = group.members.filter(m => !m.user.equals(req.user._id));
    await group.save();

    const io = req.app.get('io');
    if (io) {
      group.members.forEach(member => {
        io.to(member.user._id.toString()).emit('memberLeft', {
          groupId: group._id,
          leftMember: { _id: req.user._id, fullName: req.user.fullName },
          newAdmin: isAdmin ? group.admin : null
        });
      });
    }

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/messages', protectRoute, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group || !group.members.some(m => m.user.equals(req.user._id))) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const messages = await Message.find({ groupId: req.params.id })
      .populate('senderId', 'fullName profilePic')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/messages', protectRoute, async (req, res) => {
  try {
    const { text, image } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group || !group.members.some(m => m.user.equals(req.user._id))) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const newMessage = new Message({
      senderId: req.user._id,
      groupId: req.params.id,
      text,
      image
    });

    await newMessage.save();
    
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'fullName profilePic');

    const io = req.app.get('io');
    if (io) {
      // Emit to the group room
      io.to(req.params.id).emit('newGroupMessage', {
        groupId: group._id,
        message: populatedMessage
      });
      
      // Also emit to individual members as fallback
      group.members.forEach(member => {
        if (!member.user.equals(req.user._id)) {
          io.to(member.user._id.toString()).emit('groupMessage', {
            groupId: group._id,
            message: populatedMessage
          });
        }
      });
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


================================================
FILE: Backend/src/routes/message.route.js
================================================
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getMessages, 
  getUsersForSidebar, 
  sendMessage, 
  clearIndividualChat, 
  clearGroupChat, 
  getMessageRetentionInfo 
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

router.delete("/clear/:id", protectRoute, clearIndividualChat);
router.delete("/group/:groupId/clear", protectRoute, clearGroupChat);

router.get("/retention", protectRoute, getMessageRetentionInfo);
router.get("/retention/group/:groupId", protectRoute, getMessageRetentionInfo);

export default router;


================================================
FILE: Backend/src/routes/user.route.js
================================================
import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import FriendRequest from '../models/friendRequest.model.js';

const router = express.Router();

router.get('/search', protectRoute, async (req, res) => {
  try {
    const { q } = req.query;
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        { $or: [
          { fullName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ]}
      ],
    }).limit(10).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/friend-request', protectRoute, async (req, res) => {
  try {
    const { userId } = req.body;
    const existingRequest = await FriendRequest.findOne({ 
      from: req.user._id, 
      to: userId 
    });
    
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    const friendRequest = new FriendRequest({ 
      from: req.user._id, 
      to: userId 
    });
    await friendRequest.save();

    const io = req.app.get('io');
    if (io) {
      io.to(userId).emit('friendRequestReceived', {
        from: req.user._id,
        fromName: req.user.fullName,
        requestId: friendRequest._id,
        message: `${req.user.fullName} sent you a friend request`
      });
    }

    res.json({ message: 'Friend request sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/friend-requests', protectRoute, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ 
      to: req.user._id, 
      status: 'pending' 
    }).populate('from', 'fullName email profilePic');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/friend-request/:id/accept', protectRoute, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request || request.to.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'accepted';
    await request.save();
    
    await User.findByIdAndUpdate(req.user._id, { 
      $addToSet: { friends: request.from } 
    });
    await User.findByIdAndUpdate(request.from, { 
      $addToSet: { friends: req.user._id } 
    });

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/friend-request/:id/reject', protectRoute, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    if (!request || request.to.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/contacts', protectRoute, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'fullName email profilePic')
      .select('friends');
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/block', protectRoute, async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { 
      $addToSet: { blockedUsers: userId } 
    });
    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/unblock', protectRoute, async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { 
      $pull: { blockedUsers: userId } 
    });
    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


================================================
FILE: Backend/src/socket/socketHandler.js
================================================
const handleConnection = (io) => {
  const onlineUsers = new Map();
  const userGroups = new Map();
  
  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      if (userId) {
        socket.userId = userId;
        socket.join(userId);
        onlineUsers.set(userId, socket.id);
        socket.broadcast.emit('userOnline', userId);
        io.emit('onlineUsers', Array.from(onlineUsers.keys()));
        console.log(`✅ User ${userId} connected and joined`);
      }
    });

    socket.on('joinGroups', (groupIds) => {
      if (Array.isArray(groupIds) && socket.userId) {
        groupIds.forEach(groupId => {
          socket.join(groupId);
          if (!userGroups.has(groupId)) {
            userGroups.set(groupId, new Set());
          }
          userGroups.get(groupId).add(socket.userId);
        });
        console.log(`✅ User ${socket.userId} joined groups:`, groupIds);
      }
    });
    
    const sentMessages = new Set();
    
    socket.on('sendMessage', async ({ receiverId, message }) => {
      try {
        const messageId = message._id || `socket_${Date.now()}_${Math.random()}`;
        
        if (sentMessages.has(messageId)) {
          return;
        }
        
        sentMessages.add(messageId);
        setTimeout(() => sentMessages.delete(messageId), 5 * 60 * 1000);
        
        if (!message || !message.text || !receiverId) {
          console.error('Invalid message data:', { message, receiverId });
          socket.emit('messageError', { error: 'Invalid message data', messageId });
          return;
        }
        
        const savedMessage = {
          ...message,
          _id: messageId,
          senderId: socket.userId,
          receiverId,
          timestamp: new Date(),
          createdAt: new Date()
        };
        
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newMessage', {
            senderId: socket.userId,
            message: savedMessage
          });
          console.log(`📨 Message delivered to ${receiverId} via socket`);
        } else {
          console.log(`📨 User ${receiverId} is offline, message will be delivered when they come online`);
        }
        
        socket.emit('messageDelivered', {
          message: savedMessage,
          delivered: !!receiverSocketId
        });
      } catch (error) {
        console.error('Socket message error:', error);
        socket.emit('messageError', { error: error.message, messageId: message?._id });
      }
    });

    socket.on('sendGroupMessage', async ({ groupId, message }) => {
      try {
        const messageId = message._id || `group_${Date.now()}_${Math.random()}`;
        
        if (sentMessages.has(messageId)) {
          return;
        }
        
        sentMessages.add(messageId);
        setTimeout(() => sentMessages.delete(messageId), 5 * 60 * 1000);
        
        if (!message || !message.text || !groupId) {
          console.error('Invalid group message data:', { message, groupId });
          socket.emit('groupMessageError', { error: 'Invalid message data', messageId });
          return;
        }
        
        const savedMessage = {
          ...message,
          _id: messageId,
          senderId: socket.userId,
          groupId,
          timestamp: new Date(),
          createdAt: new Date()
        };
        
        io.to(groupId).emit('newGroupMessage', {
          groupId,
          message: savedMessage
        });
        console.log(`📨 Group message sent to group ${groupId}`);
        
        socket.emit('groupMessageDelivered', {
          message: savedMessage,
          groupId
        });
      } catch (error) {
        console.error('Socket group message error:', error);
        socket.emit('groupMessageError', { error: error.message, messageId: message?._id });
      }
    });
    
    
    socket.on('typing', ({ contactId }) => {
      try {
        console.log('📝 Typing event received:', { userId: socket.userId, contactId });
        if (!contactId) {
          console.error('Invalid contactId for typing:', contactId);
          return;
        }
        
        const receiverSocketId = onlineUsers.get(contactId);
        console.log('📝 Sending typing to:', { receiverSocketId, contactId });
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('userTyping', {
            userId: socket.userId,
            contactId: contactId
          });
        }
      } catch (error) {
        console.error('Typing indicator error:', error);
      }
    });
    
    socket.on('stopTyping', ({ contactId }) => {
      try {
        console.log('🛑 Stop typing event received:', { userId: socket.userId, contactId });
        if (!contactId) {
          console.error('Invalid contactId for stopTyping:', contactId);
          return;
        }
        
        const receiverSocketId = onlineUsers.get(contactId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('userStopTyping', {
            userId: socket.userId,
            contactId: contactId
          });
        }
      } catch (error) {
        console.error('Stop typing indicator error:', error);
      }
    });

    socket.on('groupTyping', ({ groupId }) => {
      try {
        console.log('📝 Group typing event received:', { userId: socket.userId, groupId });
        if (!groupId) {
          console.error('Invalid groupId for groupTyping:', groupId);
          return;
        }
        
        socket.to(groupId).emit('groupUserTyping', {
          userId: socket.userId,
          groupId: groupId
        });
        console.log('📝 Group typing sent to group:', groupId);
      } catch (error) {
        console.error('Group typing indicator error:', error);
      }
    });
    
    socket.on('groupStopTyping', ({ groupId }) => {
      try {
        console.log('🛑 Group stop typing event received:', { userId: socket.userId, groupId });
        if (!groupId) {
          console.error('Invalid groupId for groupStopTyping:', groupId);
          return;
        }
        
        socket.to(groupId).emit('groupUserStopTyping', {
          userId: socket.userId,
          groupId: groupId
        });
      } catch (error) {
        console.error('Group stop typing indicator error:', error);
      }
    });

    socket.on('leaveGroup', ({ groupId }) => {
      try {
        if (!groupId) {
          console.error('Invalid groupId for leaveGroup:', groupId);
          return;
        }
        
        socket.leave(groupId);
        
        if (userGroups.has(groupId)) {
          userGroups.get(groupId).delete(socket.userId);
          if (userGroups.get(groupId).size === 0) {
            userGroups.delete(groupId);
          } else {
            io.to(groupId).emit('userLeftGroup', {
              userId: socket.userId,
              groupId: groupId
            });
          }
        }
        
        socket.to(groupId).emit('userLeftGroup', {
          userId: socket.userId,
          groupId: groupId
        });
      } catch (error) {
        console.error('Leave group error:', error);
      }
    });
    
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        socket.broadcast.emit('userOffline', socket.userId);
        io.emit('onlineUsers', Array.from(onlineUsers.keys()));
        
        userGroups.forEach((users, groupId) => {
          if (users.has(socket.userId)) {
            users.delete(socket.userId);
            if (users.size === 0) {
              userGroups.delete(groupId);
            } else {
              io.to(groupId).emit('userLeftGroup', {
                userId: socket.userId,
                groupId: groupId
              });
            }
          }
        });
      }
      
      sentMessages.clear();
    });
  });
};

export default handleConnection;


================================================
FILE: frontend/README.md
================================================
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



================================================
FILE: frontend/eslint.config.js
================================================
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      
    },
  },
])



================================================
FILE: frontend/index.html
================================================
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Match the app background to prevent white flashes on Android URL bar changes -->
    <meta name="theme-color" content="#0b0f19" />
    <title>Yap!</title>
    <script>
      // Apply theme immediately to prevent flash
      (function() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>



================================================
FILE: frontend/package.json
================================================
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.11.0",
    "emoji-picker-react": "^4.13.2",
    "lucide-react": "^0.540.0",
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "react-hot-toast": "^2.6.0",
    "react-router-dom": "^7.8.1",
    "socket.io-client": "^4.8.1",
    "zustand": "^5.0.7"
  },
  "devDependencies": {
    "@eslint/js": "^9.33.0",
    "@types/react": "^19.1.10",
    "@types/react-dom": "^19.1.7",
    "@vitejs/plugin-react": "^5.0.0",
    "autoprefixer": "^10.4.21",
    "daisyui": "^5.0.50",
    "eslint": "^9.33.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.3.0",
    "tailwindcss": "^3.4.17",
    "vite": "^7.1.2"
  }
}







================================================
FILE: frontend/tailwind.config.js
================================================

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}", 
  "./pages/**/*.{js,jsx,ts,tsx}",    
],
  theme: {
    extend: {},
  },
plugins: [require("daisyui")],
  daisyui: {
    themes: [
      "light", "dark", 
    ],
  },
}





================================================
FILE: frontend/vite.config.js
================================================
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";


export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
});



================================================
FILE: frontend/.env.production
================================================
# Backend URL for production deployment
VITE_BACKEND_URL=https://online-chat-app-hwop.onrender.com



================================================
FILE: frontend/public/_redirects
================================================
/api/* https://online-chat-app-hwop.onrender.com/api/:splat 200
/* /index.html 200



================================================
FILE: frontend/src/App.jsx
================================================
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ChatPage from "./pages/ChatPage";
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    checkAuth();
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const handleThemeChange = (event) => {
      const newTheme = localStorage.getItem('theme') || 'light';
      setCurrentTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };
    
    window.addEventListener('themechange', handleThemeChange);
    
    return () => {
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, [checkAuth]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Loader className="size-10 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="App" data-theme={currentTheme}>
      <Routes>
        <Route
          path="/"
          element={authUser ? <Navigate to="/home" /> : <Navigate to="/login" />}
        />
        <Route
          path="/home"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to="/home" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/home" />}
        />
        <Route
          path="/settings"
          element={authUser ? <SettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/chat"
          element={authUser ? <ChatPage /> : <Navigate to="/login" />}
        />
      </Routes>

      <Toaster />
    </div>
  );
};

export default App;


================================================
FILE: frontend/src/index.css
================================================
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Root: fill the visible viewport and keep app background (daisyUI --b2) */
html, body, #root {
  position: relative;
  min-height: 100dvh;              /* modern browsers */
  background: hsl(var(--b2));      /* match theme surface */
  color: hsl(var(--bc));           /* theme text color */
  overscroll-behavior: none;       /* avoid rubber-band showing page bg */
}

/* Fallbacks for older engines */
@supports not (min-height: 100dvh) {
  html, body, #root { min-height: 100svh; }
}
@supports (height: -webkit-fill-available) and not (min-height: 100dvh) {
  html, body, #root { min-height: -webkit-fill-available; }
}

/* Ensure any full-screen overlays/sidesheets cover the visible viewport */
.drawer-content,
.drawer-side,
.drawer-overlay,
.modal,
.modal-box,
[role="dialog"] {
  min-height: 100dvh !important;
}

/* Optional: respect device bottom safe area (gesture bar) */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}




================================================
FILE: frontend/src/main.jsx
================================================
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";

const initializeTheme = () => {
  try {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const html = document.documentElement;
    
    html.removeAttribute('data-theme');
    html.setAttribute('data-theme', savedTheme);
  } catch (error) {
    console.error('Error initializing theme:', error);
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

initializeTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);



================================================
FILE: frontend/src/components/AddFriendsModal.jsx
================================================
import React, { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

const AddFriendsModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchUsers, sendFriendRequest } = useChatStore();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast.error('Error searching users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await sendFriendRequest(userId);
      toast.success('Friend request sent!');
      setSearchResults(prev => 
        prev.map(user => 
          user._id === userId 
            ? { ...user, requestSent: true }
            : user
        )
      );
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2c2236] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Add Friends</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by email or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 bg-[#1a1823] text-white border border-[#372945]/40 rounded-lg outline-none focus:ring-2 focus:ring-violet-600"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {isSearching ? '...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-64 overflow-y-auto">
          {searchResults.length === 0 && !isSearching && searchQuery && (
            <div className="text-center text-gray-400 py-4">
              No users found
            </div>
          )}
          
          {searchResults.map((user) => (
            <div key={user._id} className="flex items-center gap-3 p-3 hover:bg-[#372945]/20 rounded-lg">
              <img 
                src={user.profilePic || '/avatar.png'} 
                alt={user.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="text-white font-medium">{user.fullName}</div>
                <div className="text-gray-400 text-sm">{user.email}</div>
              </div>
              <button
                onClick={() => handleAddFriend(user._id)}
                disabled={user.requestSent}
                className="p-2 bg-violet-600 text-white rounded-full hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <UserPlus size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddFriendsModal;


================================================
FILE: frontend/src/components/ChatContainer.jsx
================================================
import React, { useRef, useEffect, useState } from "react";
import { SendHorizontal, Paperclip, Smile, Image, FileText, X, Users, Settings, LogOut, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import EmojiPicker from 'emoji-picker-react';
import GroupSettingsModal from './GroupSettingsModal';

const ChatContainer = () => {
  const { authUser } = useAuthStore();
  const { 
    selectedContact,
    selectedGroup,
    messages, 
    sendMessage, 
    contacts, 
    loadMessages,
    clearIndividualChat,
    clearGroupChat,
    getMessageRetentionInfo
  } = useChatStore();

  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [showGroupSettings, setShowGroupSettings] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);


  const currentChat = selectedContact || selectedGroup;
  const isGroupChat = !!selectedGroup;
  const chatId = currentChat?._id;

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    }
  }, [chatId, loadMessages]);

  const currentMessages = chatId ? messages[chatId] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || !chatId) return;

    try {
      const messageData = {
        text: message.trim(),
        image: selectedFile && selectedFile.type.startsWith('image/') ? filePreview : null
      };

      await sendMessage(chatId, messageData);
      
      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const onEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
      
      setShowAttachMenu(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = (msg, index) => {
    const isCurrentUser = msg.senderId === authUser._id || msg.senderId?._id === authUser._id;
    const senderName = msg.senderId?.fullName || 'Unknown';
    
    const messageKey = msg._id || `msg_${index}_${msg.senderId}_${msg.createdAt}_${msg.text?.substring(0, 10)}`;
    
    return (
      <div
        key={messageKey}
        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isCurrentUser
              ? "bg-primary text-primary-content"
              : "bg-base-300 text-base-content"
          }`}
        >
          {isGroupChat && !isCurrentUser && (
            <p className="text-xs font-semibold mb-1 opacity-70">
              {senderName}
            </p>
          )}
          
          {msg.text && <p className="text-sm">{msg.text}</p>}
          
          {msg.image && (
            <img 
              src={msg.image} 
              alt="Message attachment" 
              className="mt-2 max-w-full rounded cursor-pointer"
              onClick={() => window.open(msg.image, '_blank')}
            />
          )}
          
          {msg.file && !msg.file.type?.startsWith('image/') && (
            <div className="mt-2 p-2 bg-base-100 rounded border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">{msg.file.name}</span>
              </div>
              <p className="text-xs text-base-content/70">
                {formatFileSize(msg.file.size)}
              </p>
              <a 
                href={msg.file.url} 
                download={msg.file.name}
                className="text-xs text-primary hover:underline"
              >
                Download
              </a>
            </div>
          )}
          
          <p className="text-xs mt-1 opacity-70">
            {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}
          </p>

          {isCurrentUser && (
            <div className="flex items-center justify-end mt-1">
              {msg.sent && (
                <span className="text-xs opacity-70">
                  ✓ Sent
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base-100">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-base-content/70 mb-2">
            Welcome to Chatty!
          </h3>
          <p className="text-base-content/50">
            Select a contact or group to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-base-100">
      <div className="p-4 border-b border-base-300 bg-base-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              {currentChat.avatar || currentChat.profilePic ? (
                <img 
                  src={currentChat.avatar || currentChat.profilePic} 
                  alt={currentChat.name || currentChat.fullName} 
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold">
                  {isGroupChat ? (
                    <Users className="size-5" />
                  ) : (
                    currentChat.fullName?.charAt(0) || 'U'
                  )}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold">
                {isGroupChat ? currentChat.name : currentChat.fullName}
              </h3>
              <p className="text-sm text-base-content/70">
                {isGroupChat 
                  ? `${currentChat.members?.length || 0} members`
                  : (currentChat.online ? 'Online' : 'Offline')
                }
              </p>
            </div>
          </div>

          {isGroupChat && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (window.confirm(`Are you sure you want to leave "${currentChat.name}"?`)) {
                    useChatStore.getState().leaveGroup(currentChat._id);
                  }
                }}
                className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                title="Leave Group"
              >
                <LogOut className="size-4" />
                Leave
              </button>
              <button 
                onClick={() => setShowGroupSettings(true)}
                className="btn btn-ghost btn-sm"
                title="Group Settings"
              >
                <Settings className="size-4" />
                Settings
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isGroupChat && (
              <button 
                onClick={async () => {
                  const retentionInfo = await getMessageRetentionInfo(chatId, false);
                  const confirmMessage = `Are you sure you want to clear all chat history with ${currentChat.fullName}?\n\nThis will delete all messages permanently.\n\nNote: Messages are automatically deleted after ${retentionInfo.messageRetentionDays} days.`;
                  
                  if (window.confirm(confirmMessage)) {
                    await useChatStore.getState().clearIndividualChat(chatId);
                  }
                }}
                className="btn btn-ghost btn-sm text-warning hover:bg-warning/10"
                title="Clear Chat History"
              >
                <Trash2 className="size-4" />
                Clear Chat
              </button>
            )}

            {isGroupChat && (
              <button 
                onClick={async () => {
                  const retentionInfo = await getMessageRetentionInfo(chatId, true);
                  const confirmMessage = `Are you sure you want to clear all group chat history?\n\nThis will delete all messages permanently.\n\nNote: Messages are automatically deleted after ${retentionInfo.messageRetentionDays} days.`;
                  
                  if (window.confirm(confirmMessage)) {
                    await useChatStore.getState().clearGroupChat(chatId);
                  }
                }}
                className="btn btn-ghost btn-sm text-warning hover:bg-warning/10"
                title="Clear Group Chat History (Admin Only)"
              >
                <Trash2 className="size-4" />
                Clear Chat
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.length === 0 ? (
          <div className="text-center text-base-content/50 mt-20">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          currentMessages.map((msg, index) => renderMessage(msg, index))
        )}
        

        
        <div ref={messagesEndRef} />
      </div>

      {selectedFile && (
        <div className="px-4 py-2 border-t border-base-300 bg-base-200">
          <div className="flex items-center gap-3 p-2 bg-base-100 rounded">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
            ) : (
              <FileText className="w-12 h-12 text-base-content/50" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-base-content/70">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={removeSelectedFile}
              className="btn btn-ghost btn-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-base-300">
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-10">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}

        {showAttachMenu && (
          <div 
            ref={attachMenuRef}
            className="absolute bottom-20 right-20 z-10 bg-base-200 shadow-lg rounded-lg p-2 border"
          >
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 w-full p-2 hover:bg-base-300 rounded text-left"
            >
              <Image className="w-5 h-5" />
              <span>Photo</span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full p-2 hover:bg-base-300 rounded text-left"
            >
              <FileText className="w-5 h-5" />
              <span>Document</span>
            </button>
            
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'image')}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
              onChange={(e) => handleFileSelect(e, 'file')}
              className="hidden"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn btn-ghost btn-sm"
            type="button"
          >
            <Smile className="size-5" />
          </button>

          <input
            type="text"
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${isGroupChat ? currentChat.name : currentChat.fullName}...`}
            className="input input-bordered flex-1"
          />

          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="btn btn-ghost btn-sm"
            type="button"
          >
            <Paperclip className="size-5" />
          </button>

          <button
            onClick={handleSend}
            disabled={!message.trim() && !selectedFile}
            className="btn btn-primary"
            type="button"
          >
            <SendHorizontal className="size-5" />
          </button>
        </div>
      </div>

      <GroupSettingsModal 
        isOpen={showGroupSettings} 
        onClose={() => setShowGroupSettings(false)} 
        group={currentChat} 
        onGroupUpdated={(updatedGroup) => {
          
        }}
      />
    </div>
  );
};

export default ChatContainer;        



================================================
FILE: frontend/src/components/CreateGroupModal.jsx
================================================
import React, { useState, useRef, useEffect } from 'react';
import { X, Users, Settings } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const { authUser } = useAuthStore();
  const { contacts, createGroup } = useChatStore();
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageRetentionDays, setMessageRetentionDays] = useState(30);
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const modalRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim() || selectedContacts.length === 0) {
      return;
    }

    setIsCreating(true);
    
    try {
      const groupData = {
        name: groupName.trim(),
        description: description.trim(),
        memberIds: selectedContacts,
        messageRetentionDays: parseInt(messageRetentionDays),
        autoDeleteMessages
      };

      const newGroup = await createGroup(groupData);
      onGroupCreated(newGroup);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setGroupName('');
    setDescription('');
    setSelectedContacts([]);
    setSearchQuery('');
    setMessageRetentionDays(30);
    setAutoDeleteMessages(false);
  };

  const toggleContact = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const filteredContacts = contacts.filter(contact =>
    contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedContacts.includes(contact._id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Create New Group</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">Group Name</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="input input-bordered w-full"
                required
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Description (Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description"
                className="textarea textarea-bordered w-full"
                rows="3"
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Message Retention</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoDelete"
                    checked={autoDeleteMessages}
                    onChange={(e) => setAutoDeleteMessages(e.target.checked)}
                    className="checkbox checkbox-sm"
                  />
                  <label htmlFor="autoDelete" className="label-text">
                    Automatically delete old messages
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">Keep messages for:</span>
                  <select
                    value={messageRetentionDays}
                    onChange={(e) => setMessageRetentionDays(e.target.value)}
                    className="select select-bordered select-sm"
                    disabled={!autoDeleteMessages}
                  >
                    <option value="7">7 days</option>
                    <option value="15">15 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                
                {autoDeleteMessages && (
                  <p className="text-xs text-base-content/70">
                    Messages older than {messageRetentionDays} days will be automatically deleted
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label">
                <span className="label-text">Add Members</span>
              </label>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="input input-bordered w-full mb-3"
              />
              
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                {filteredContacts.map(contact => (
                  <div
                    key={contact._id}
                    className="flex items-center gap-3 p-2 hover:bg-base-200 rounded cursor-pointer"
                    onClick={() => toggleContact(contact._id)}
                  >
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {contact.profilePic ? (
                        <img 
                          src={contact.profilePic} 
                          alt={contact.fullName} 
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-semibold text-sm">
                          {contact.fullName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="flex-1">{contact.fullName}</span>
                  </div>
                ))}
                
                {filteredContacts.length === 0 && searchQuery && (
                  <p className="text-center text-base-content/50 py-4">
                    No contacts found
                  </p>
                )}
              </div>
            </div>

            {selectedContacts.length > 0 && (
              <div>
                <label className="label">
                  <span className="label-text">Selected Members ({selectedContacts.length})</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map(contactId => {
                    const contact = contacts.find(c => c._id === contactId);
                    return (
                      <div
                        key={contactId}
                        className="badge badge-primary gap-2"
                      >
                        {contact?.fullName}
                        <button
                          type="button"
                          onClick={() => toggleContact(contactId)}
                          className="btn btn-ghost btn-xs"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost flex-1"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={!groupName.trim() || selectedContacts.length === 0 || isCreating}
              >
                {isCreating ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Create Group'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;


================================================
FILE: frontend/src/components/ErrorBoundary.jsx
================================================
import React from 'react';
import toast from 'react-hot-toast';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorCount: 0,
      lastError: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Prevent infinite loops
    const now = Date.now();
    if (this.state.lastError && (now - this.state.lastError) < 5000) {
      return;
    }
    
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1,
      lastError: now
    }));

    // Show user-friendly error messages
    if (this.state.errorCount < 3) {
      if (error.message.includes('filter') || error.message.includes('map')) {
        toast.error('Loading data... Please wait');
      } else if (error.message.includes('socket') || error.message.includes('connection')) {
        toast.error('Connecting to server...');
      } else {
        toast.error('Something went wrong. Retrying...');
      }
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorCount: 0,
      lastError: null 
    });
  }

  handleRefresh = () => {
    // Clear localStorage except theme
    try {
      const theme = localStorage.getItem('theme');
      localStorage.clear();
      if (theme) localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4 bg-base-100">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔄</div>
            <h2 className="text-lg font-semibold text-primary mb-2">
              Starting up...
            </h2>
            <p className="text-base-content/70 mb-4 text-sm">
              The app is loading. This may take a moment.
            </p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={this.handleRetry}
                className="btn btn-primary btn-sm"
              >
                Try Again
              </button>
              
              {this.state.errorCount > 2 && (
                <button 
                  onClick={this.handleRefresh}
                  className="btn btn-outline btn-sm"
                >
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;



================================================
FILE: frontend/src/components/FriendRequestsModal.jsx
================================================
import React from 'react';
import { Check, X, UserCheck, UserX } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

const FriendRequestsModal = ({ isOpen, onClose }) => {
  const { friendRequests, acceptFriendRequest, rejectFriendRequest } = useChatStore();

  const handleAccept = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      toast.success('Friend request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2c2236] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Friend Requests</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {friendRequests.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No pending friend requests
            </div>
          ) : (
            friendRequests.map((request) => (
              <div key={request._id} className="flex items-center gap-3 p-3 hover:bg-[#372945]/20 rounded-lg">
                <img 
                  src={request.from.profilePic || '/avatar.png'} 
                  alt={request.from.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{request.from.fullName}</div>
                  <div className="text-gray-400 text-sm">{request.from.email}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request._id)}
                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                  >
                    <UserCheck size={16} />
                  </button>
                  <button
                    onClick={() => handleReject(request._id)}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <UserX size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestsModal;


================================================
FILE: frontend/src/components/GroupSettingsModal.jsx
================================================
import React, { useState, useRef, useEffect } from 'react';
import { X, Settings, Users, Trash2, Save, UserPlus, UserMinus, Search } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';

const GroupSettingsModal = ({ isOpen, onClose, group, onGroupUpdated }) => {
  const { authUser } = useAuthStore();
  const { clearGroupChat, addMemberToGroup, removeMemberFromGroup } = useChatStore();
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [messageRetentionDays, setMessageRetentionDays] = useState(30);
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  
  const modalRef = useRef(null);

  useEffect(() => {
    if (group && isOpen) {
      setGroupName(group.name || '');
      setDescription(group.description || '');
      setMessageRetentionDays(group.messageRetentionDays || 30);
      setAutoDeleteMessages(group.autoDeleteMessages || false);
    }
  }, [group, isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const isAdmin = group?.admin === authUser?._id;

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axiosInstance.get(`/users/search?q=${query}`);
      const users = response.data.filter(user => 
        !group.members.some(member => member.user._id === user._id)
      );
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId) => {
    setIsAddingMember(true);
    try {
      const updatedGroup = await addMemberToGroup(group._id, userId);
      onGroupUpdated(updatedGroup);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (userId === group.admin) {
      toast.error('Cannot remove group admin');
      return;
    }

    if (window.confirm('Are you sure you want to remove this member from the group?')) {
      try {
        const updatedGroup = await removeMemberFromGroup(group._id, userId);
        onGroupUpdated(updatedGroup);
      } catch (error) {
        console.error('Error removing member:', error);
      }
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) return;

    setIsUpdating(true);
    
    try {
      const response = await axiosInstance.put(`/groups/${group._id}`, {
        name: groupName.trim(),
        description: description.trim(),
        messageRetentionDays: parseInt(messageRetentionDays),
        autoDeleteMessages
      });

      onGroupUpdated(response.data);
      toast.success('Group settings updated successfully');
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update group settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearChat = async () => {
    const confirmMessage = `Are you sure you want to clear all group chat history?\n\nThis will delete all messages permanently.\n\nNote: Messages are automatically deleted after ${messageRetentionDays} days.`;
    
    if (window.confirm(confirmMessage)) {
      setIsClearingChat(true);
      try {
        await useChatStore.getState().clearGroupChat(group._id);
      } catch (error) {
        console.error('Error clearing chat:', error);
      } finally {
        setIsClearingChat(false);
      }
    }
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Group Settings</h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={handleUpdateGroup} className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">Group Name</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="input input-bordered w-full"
                required
                disabled={!isAdmin}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description"
                className="textarea textarea-bordered w-full"
                rows="3"
                disabled={!isAdmin}
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">Message Retention</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoDelete"
                    checked={autoDeleteMessages}
                    onChange={(e) => setAutoDeleteMessages(e.target.checked)}
                    className="checkbox checkbox-sm"
                    disabled={!isAdmin}
                  />
                  <label htmlFor="autoDelete" className="label-text">
                    Automatically delete old messages
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">Keep messages for:</span>
                  <select
                    value={messageRetentionDays}
                    onChange={(e) => setMessageRetentionDays(e.target.value)}
                    className="select select-bordered select-sm"
                    disabled={!autoDeleteMessages || !isAdmin}
                  >
                    <option value="7">7 days</option>
                    <option value="15">15 days</option>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                
                {autoDeleteMessages && (
                  <p className="text-xs text-base-content/70">
                    Messages older than {messageRetentionDays} days will be automatically deleted
                  </p>
                )}
              </div>
            </div>

            <div className="divider">Members Management</div>

            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Current Members ({group.members?.length || 0})</span>
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {group.members?.map((member) => (
                    <div key={member.user._id} className="flex items-center justify-between p-2 bg-base-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content text-sm font-semibold">
                          {member.user.profilePic ? (
                            <img src={member.user.profilePic} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            member.user.fullName?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.user.fullName}</p>
                          <p className="text-xs text-base-content/70">{member.role}</p>
                        </div>
                      </div>
                      {isAdmin && member.user._id !== group.admin && (
                        <button
                          onClick={() => handleRemoveMember(member.user._id)}
                          className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                          title="Remove member"
                        >
                          <UserMinus className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div>
                  <label className="label">
                    <span className="label-text">Add New Members</span>
                  </label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-base-content/50" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users to add..."
                        className="input input-bordered w-full pl-10"
                      />
                    </div>
                    
                    {isSearching && (
                      <div className="text-center py-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="ml-2 text-sm">Searching...</span>
                      </div>
                    )}
                    
                    {searchResults.length > 0 && (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {searchResults.map((user) => (
                          <div key={user._id} className="flex items-center justify-between p-2 bg-base-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content text-sm font-semibold">
                                {user.profilePic ? (
                                  <img src={user.profilePic} alt="" className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                  user.fullName?.charAt(0) || 'U'
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{user.fullName}</p>
                                <p className="text-xs text-base-content/70">{user.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddMember(user._id)}
                              disabled={isAddingMember}
                              className="btn btn-primary btn-xs"
                              title="Add to group"
                            >
                              {isAddingMember ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <UserPlus className="size-4" />
                              )}
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchQuery && !isSearching && searchResults.length === 0 && (
                      <p className="text-center text-sm text-base-content/70 py-2">
                        No users found or all users are already in the group
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="divider">Danger Zone</div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                <div>
                  <h4 className="font-medium text-warning">Clear Chat History</h4>
                  <p className="text-sm text-base-content/70">
                    Delete all messages in this group permanently
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearChat}
                  disabled={!isAdmin || isClearingChat}
                  className="btn btn-warning btn-sm"
                >
                  {isClearingChat ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Clear
                </button>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost flex-1"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={!groupName.trim() || isUpdating}
                >
                  {isUpdating ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsModal;                      


================================================
FILE: frontend/src/components/GroupSidebar.jsx
================================================
import React, { useState, useEffect } from 'react';
import { Users, Plus, Settings, Search, LogOut } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import CreateGroupModal from './CreateGroupModal';

const GroupSidebar = () => {
  const { 
    groups, 
    selectedGroup, 
    setSelectedGroup, 
    loadGroups,
    leaveGroup
  } = useChatStore();
  
  const { authUser } = useAuthStore();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [leavingGroupId, setLeavingGroupId] = useState(null);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const safeGroups = Array.isArray(groups) ? groups : [];
  const filteredGroups = safeGroups.filter(group =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLeaveGroup = async (groupId, groupName) => {
    if (window.confirm(`Are you sure you want to leave "${groupName}"?`)) {
      try {
        setLeavingGroupId(groupId);
        await leaveGroup(groupId);
      } catch (error) {
        console.error('Failed to leave group:', error);
      } finally {
        setLeavingGroupId(null);
      }
    }
  };

  const isGroupAdmin = (group) => {
    return group.admin === authUser._id || group.admin?._id === authUser._id;
  };

  const closeDrawerIfOpen = () => {
    const el = document.getElementById('chat-drawer');
    if (el && el.checked) el.checked = false;
  };

  return (
    <div className="w-80 bg-base-200 border-r border-base-300 flex flex-col">
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-5" />
            Groups ({safeGroups.length})
          </h2>
          
          <button
            onClick={() => setShowCreateGroup(true)}
            className="btn btn-primary btn-sm"
            title="Create Group"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 size-4" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10 input-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-base-content/50">
            {safeGroups.length === 0 ? (
              <div>
                <p>No groups yet</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="btn btn-primary btn-sm mt-2"
                >
                  Create Group
                </button>
              </div>
            ) : (
              <p>No groups match your search</p>
            )}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group._id}
              className={`p-4 border-b border-base-300 ${
                selectedGroup?._id === group._id ? 'bg-primary/10' : ''
              }`}
            >
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => { setSelectedGroup(group); closeDrawerIfOpen(); }}
              >
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {group.avatar ? (
                    <img
                      src={group.avatar}
                      alt={group.name}
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-semibold">
                      {group.name?.charAt(0) || 'G'}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {group.name || 'Unknown Group'}
                  </h3>
                  <p className="text-sm text-base-content/70 truncate">
                    {group.members?.length || 0} members
                  </p>
                  {isGroupAdmin(group) && (
                    <span className="text-xs text-primary font-medium">Admin</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3">
                {!isGroupAdmin(group) && (
                  <button
                    onClick={() => handleLeaveGroup(group._id, group.name)}
                    disabled={leavingGroupId === group._id}
                    className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                    title="Leave Group"
                  >
                    {leavingGroupId === group._id ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <LogOut className="size-3" />
                    )}
                    Leave
                  </button>
                )}
                
                {isGroupAdmin(group) && (
                  <button className="btn btn-ghost btn-xs">
                    <Settings className="size-3" />
                    Settings
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={() => {
          setShowCreateGroup(false);
          loadGroups();
        }}
      />
    </div>
  );
};

export default GroupSidebar;



================================================
FILE: frontend/src/components/Sidebar.jsx
================================================
// frontend/src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Bell, Search } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import AddFriendsModal from './AddFriendsModal';
import FriendRequestsModal from './FriendRequestsModal';

const Sidebar = () => {
  const { 
    contacts, 
    selectedContact, 
    setSelectedContact, 
    friendRequests, 
    loadContacts,
    getFriendRequests 
  } = useChatStore();
  
  const [showAddFriends, setShowAddFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContacts();
    getFriendRequests();
  }, [loadContacts, getFriendRequests]);

  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeFriendRequests = Array.isArray(friendRequests) ? friendRequests : [];
  
  const filteredContacts = safeContacts.filter(contact =>
    contact.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const closeDrawerIfOpen = () => {
    const el = document.getElementById('chat-drawer');
    if (el && el.checked) el.checked = false;
  };

  return (
    <div className="w-80 bg-base-200 border-r border-base-300 flex flex-col">
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-5" />
            Contacts ({safeContacts.length})
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFriendRequests(true)}
              className="btn btn-ghost btn-sm relative"
              title="Friend Requests"
            >
              <Bell className="size-4" />
              {safeFriendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-error-content text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {safeFriendRequests.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowAddFriends(true)}
              className="btn btn-primary btn-sm"
              title="Add Friends"
            >
              <UserPlus className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50 size-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10 input-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="p-4 text-center text-base-content/50">
            {safeContacts.length === 0 ? (
              <div>
                <p>No contacts yet</p>
                <button
                  onClick={() => setShowAddFriends(true)}
                  className="btn btn-primary btn-sm mt-2"
                >
                  Add Friends
                </button>
              </div>
            ) : (
              <p>No contacts match your search</p>
            )}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact._id}
              onClick={() => { setSelectedContact(contact); closeDrawerIfOpen(); }}
              className={`flex items-center gap-3 p-4 hover:bg-base-300 cursor-pointer border-b border-base-300 ${
                selectedContact?._id === contact._id ? 'bg-primary/10' : ''
              }`}
            >
              <div className="relative">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {contact.profilePic ? (
                    <img
                      src={contact.profilePic}
                      alt={contact.fullName}
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-semibold">
                      {contact.fullName?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div
                  className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-base-200 ${
                    contact.online ? 'bg-success' : 'bg-base-content/30'
                  }`}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {contact.fullName || 'Unknown User'}
                </h3>
                <p className="text-sm text-base-content/70">
                  {contact.online ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <AddFriendsModal
        isOpen={showAddFriends}
        onClose={() => setShowAddFriends(false)}
      />
      
      <FriendRequestsModal
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
      />
    </div>
  );
};

export default Sidebar;



================================================
FILE: frontend/src/lib/axios.js
================================================

import axios from "axios";

// Build a base URL that keeps cookies first-party
const getBaseURL = () => {
  // Local development talks directly to the backend
  if (import.meta.env.MODE === "development" || import.meta.env.DEV) {
    return "http://localhost:5001/api";
  }

  // In production, use same-origin so Netlify proxies /api to Render
  // (configured in netlify.toml and public/_redirects)
  return "/api";
};

export const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,          // send/receive the jwt cookie
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Centralized 401 handling without loops
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const path = window.location.pathname;
    const url = error.config?.url || "";

    if (status === 401) {
      // Ignore the initial auth check to avoid flicker/loops
      const isAuthCheck = url.includes("/auth/check");
      const onAuthPages = path.startsWith("/login") || path.startsWith("/signup");

      if (!onAuthPages && !isAuthCheck) {
        if (window.navigateToLogin) {
          window.navigateToLogin();
        } else {
          window.location.replace("/login");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;



================================================
FILE: frontend/src/lib/socket.js
================================================
import { io } from 'socket.io-client';

const getSocketURL = () => {
  if (import.meta.env.MODE === "development") return 'http://localhost:5001';
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  return backendUrl || window.location.origin;
};

export const socket = io(getSocketURL(), {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  withCredentials: true,
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});



================================================
FILE: frontend/src/pages/ChatPage.jsx
================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import Sidebar from '../components/Sidebar';
import GroupSidebar from '../components/GroupSidebar';
import ChatContainer from '../components/ChatContainer';
import ErrorBoundary from '../components/ErrorBoundary';
import { Settings, User, LogOut, MessageSquare, Users, Home } from "lucide-react";

const ChatPage = () => {
  const { authUser, logout } = useAuthStore();
  const { connectSocket, isConnected } = useChatStore();
  const [activeTab, setActiveTab] = useState('contacts');

  useEffect(() => {
    if (authUser) {
      connectSocket(authUser._id);
    }
  }, [authUser, connectSocket]);

  if (!authUser) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Please log in to access chat</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-base-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between w-full p-4 border-b border-base-300">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {authUser.fullName?.charAt(0) || 'U'}
            </span>
          </div>
          <h1 className="text-lg font-semibold">Yap!🤗</h1>
          <div className={`ml-2 text-xs ${isConnected ? 'text-success' : 'text-error'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/" className="btn btn-sm gap-2" title="Home">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <Link to="/settings" className="btn btn-sm gap-2" title="Settings">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          <Link to="/profile" className="btn btn-sm gap-2" title="Profile">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </Link>

          <button className="btn btn-sm gap-2" onClick={logout} title="Logout">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Content area fills remaining dynamic viewport height */}
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col">
          <div className="flex bg-base-300">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
                activeTab === 'contacts'
                  ? 'bg-base-100 text-primary border-b-2 border-primary'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              <MessageSquare className="size-4" />
              Contacts
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
                activeTab === 'groups'
                  ? 'bg-base-100 text-primary border-b-2 border-primary'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              <Users className="size-4" />
              Groups
            </button>
          </div>

          {activeTab === 'contacts' ? (
            <ErrorBoundary>
              <Sidebar />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary>
              <GroupSidebar />
            </ErrorBoundary>
          )}
        </div>

        <ErrorBoundary>
          <ChatContainer />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ChatPage;



================================================
FILE: frontend/src/pages/HomePage.jsx
================================================
import React from "react";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";

const HomePage = () => {
  const { logout, authUser } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 pt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mt-4">Welcome to Yap! 🤗</h1>
            <p className="mt-4 text-base-content/60">
              You have successfully signed up and logged in.
            </p>
          </div>

          <div className="mt-12">
            <h2 className="text-xl font-semibold text-center mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Link
                to="/profile"
                className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="card-body items-center text-center">
                  <User className="w-8 h-8 text-primary" />
                  <h2 className="card-title">Profile</h2>
                  <p>View and edit your profile</p>
                </div>
              </Link>

              <Link
                to="/settings"
                className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="card-body items-center text-center">
                  <Settings className="w-8 h-8 text-primary" />
                  <h2 className="card-title">Settings</h2>
                  <p>Customize your preferences</p>
                </div>
              </Link>

              <Link
                to="/chat"
                className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="card-body items-center text-center">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  <h2 className="card-title">Chat</h2>
                  <p>Connect with your friends</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button onClick={handleLogout} className="btn btn-outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;


================================================
FILE: frontend/src/pages/LoginPage.jsx
================================================
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoggingIn, authUser } = useAuthStore();

  if (authUser) {
    return <Navigate to="/home" replace />;
  }

  const validateForm = () => {
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) login(formData);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden">
        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Logo section */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-16 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-2xl">
                <MessageSquare className="size-8 text-white drop-shadow-lg" />
              </div>
              <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-gray-400">
                Sign in to your account
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="form-control group">
              <label className="label">
                <span className="label-text font-medium text-gray-300">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="size-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-12 pr-4 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-white/10"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-control group">
              <label className="label">
                <span className="label-text font-medium text-gray-300">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="size-5 text-gray-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-12 pr-12 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-white/10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-gray-500 hover:text-purple-400" />
                  ) : (
                    <Eye className="size-5 text-gray-500 hover:text-purple-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white font-semibold py-3 rounded-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-purple-400 hover:text-purple-300 font-medium hover:underline"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm">
        <div className="text-center z-10 px-8">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
              <MessageSquare className="size-16 text-white/80" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-md">
            Sign in to continue your conversations and stay connected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;



================================================
FILE: frontend/src/pages/ProfilePage.jsx
================================================
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Calendar, Shield } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      
  
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white">
      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-black/20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent mb-2">
                Your Profile
              </h1>
              <p className="text-indigo-300 text-lg">Manage your account and personal settings</p>
            </div>

            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center mb-12">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <img
                  src={selectedImg || authUser?.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="relative w-40 h-40 rounded-full object-cover border-4 border-white/20"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-2 right-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 p-3 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110 shadow-xl ${
                    isUpdatingProfile ? "animate-pulse pointer-events-none opacity-70" : ""
                  }`}
                >
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>
              <p className="mt-4 text-sm text-indigo-300">
                {isUpdatingProfile ? "Uploading your photo..." : "Click the camera icon to update your photo"}
              </p>
            </div>

            {/* User Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
                  <User className="w-5 h-5" />
                  Full Name
                </label>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-white text-lg font-medium">
                    {authUser?.fullName || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
                  <Mail className="w-5 h-5" />
                  Email Address
                </label>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-white text-lg font-medium">
                    {authUser?.email || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Information Panel */}
            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="flex items-center gap-2 text-xl font-bold text-indigo-200 mb-6">
                <Shield className="w-6 h-6" />
                Account Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-300" />
                    <span className="text-gray-300">Member Since</span>
                  </div>
                  <span className="text-white font-semibold">
                    {authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-300">Account Status</span>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;


================================================
FILE: frontend/src/pages/SettingsPage.jsx
================================================
import { useState, useEffect } from "react";
import { Palette, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SettingsPage = () => {
  const [currentTheme, setCurrentTheme] = useState('light');

  const themes = [
    { name: 'light', label: 'Light', colors: ['#3b82f6', '#ec4899', '#14b8a6', '#f3f4f6'] },
    { name: 'dark', label: 'Dark', colors: ['#661ae6', '#d946ef', '#36d399', '#1f2937'] },
    
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (themeName) => {
    try {
      const html = document.documentElement;
      
      html.removeAttribute('data-theme');
      html.setAttribute('data-theme', themeName);
      
      localStorage.setItem('theme', themeName);
      setCurrentTheme(themeName);
      
      toast.success(`${themes.find(t => t.name === themeName)?.label} theme applied!`);
      
      window.dispatchEvent(new Event('themechange'));
    } catch (error) {
      console.error('Error applying theme:', error);
      toast.error('Failed to apply theme');
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content transition-colors duration-300">
      <div className="navbar bg-base-200 shadow-sm">
        <div className="navbar-start">
          <Link to="/" className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
        <div className="navbar-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Settings
          </h1>
        </div>
        <div className="navbar-end"></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Theme</h2>
          <p className="text-base-content/70 text-lg">Choose a theme for your chat interface</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
          {themes.map((theme) => (
            <div
              key={theme.name}
              className={`relative cursor-pointer transition-all duration-300 hover:scale-105 group ${
                currentTheme === theme.name ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''
              }`}
              onClick={() => handleThemeChange(theme.name)}
            >
              <div className="bg-base-200 rounded-lg p-3 border border-base-300 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                <div className="flex rounded-md overflow-hidden mb-3 h-8 shadow-sm">
                  {theme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 transition-all duration-300"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-base-content group-hover:text-primary transition-colors">
                    {theme.label}
                  </span>
                  {currentTheme === theme.name && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-pulse">
                      <Check className="w-3 h-3 text-primary-content" />
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute inset-0 bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        <div className="bg-base-200 rounded-xl p-6 border border-base-300 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary-content" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Current Theme</h3>
              <p className="text-base-content/70">
                You have selected <span className="font-semibold text-primary capitalize">
                  {themes.find(t => t.name === currentTheme)?.label}
                </span> theme
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;



================================================
FILE: frontend/src/pages/SignUpPage.jsx
================================================
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { signup, isSigningUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) signup(formData);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-pulse delay-300"></div>
          <div className="absolute bottom-1/4 left-1/4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-700"></div>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Logo section with enhanced animations */}
          <div className="text-center mb-8 animate-fade-in-down">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-16 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out border border-white/10 shadow-2xl">
                <MessageSquare className="size-8 text-white drop-shadow-lg animate-bounce-subtle" />
              </div>
              <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent animate-gradient">
                Create Account
              </h1>
              <p className="text-gray-400 animate-fade-in-up delay-300">
                Get started with your free account
              </p>
            </div>
          </div>

          {/* Form with staggered animations */}
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up delay-500">
            {/* Full Name Field */}
            <div className="form-control group">
              <label className="label">
                <span className="label-text font-medium text-gray-300 group-focus-within:text-purple-400 transition-colors">
                  Full Name
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="size-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-12 pr-4 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-white/10"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-control group animate-fade-in-up delay-700">
              <label className="label">
                <span className="label-text font-medium text-gray-300 group-focus-within:text-purple-400 transition-colors">
                  Email
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="size-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-12 pr-4 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-white/10"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-control group animate-fade-in-up delay-900">
              <label className="label">
                <span className="label-text font-medium text-gray-300 group-focus-within:text-purple-400 transition-colors">
                  Password
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="size-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-12 pr-12 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-white/10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-110 transition-transform duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-gray-500 hover:text-purple-400 transition-colors" />
                  ) : (
                    <Eye className="size-5 text-gray-500 hover:text-purple-400 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSigningUp}
              className="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white font-semibold py-3 rounded-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed animate-fade-in-up delay-1100"
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <div className="ml-2 transform group-hover:translate-x-1 transition-transform duration-200">→</div>
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div className="text-center animate-fade-in-up delay-1300">
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-purple-400 hover:text-purple-300 font-medium hover:underline transition-all duration-200 transform hover:scale-105 inline-block"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Enhanced visual */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm">
        {/* Animated background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
          <div className="absolute top-1/4 right-20 w-1 h-1 bg-purple-400/40 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-white/10 rounded-full animate-ping delay-700"></div>
        </div>

        <div className="text-center z-10 animate-fade-in-right delay-1000 px-8">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 animate-float">
              <MessageSquare className="size-16 text-white/80" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Join our community
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-md">
            Connect with friends, share moments, and stay in touch with your loved ones.
          </p>
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-fade-in-down { animation: fade-in-down 0.6s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
        .animate-fade-in-right { animation: fade-in-right 0.6s ease-out; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
        .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
        .delay-300 { animation-delay: 300ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-700 { animation-delay: 700ms; }
        .delay-900 { animation-delay: 900ms; }
        .delay-1100 { animation-delay: 1100ms; }
        .delay-1300 { animation-delay: 1300ms; }
      `}</style>
    </div>
  );
};

export default SignUpPage;



================================================
FILE: frontend/src/store/useAuthStore.js
================================================
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

 const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/"

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get('/auth/check');
      set({ authUser: res.data });
      
      if (res.data) {
        const { useChatStore } = await import("./useChatStore.js");
        useChatStore.getState().connectSocket(res.data._id);
      }
    } catch (error) {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully!");
      
      const { useChatStore } = await import("./useChatStore.js");
      useChatStore.getState().connectSocket(res.data._id);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully!");
      
      const { useChatStore } = await import("./useChatStore.js");
      useChatStore.getState().connectSocket(res.data._id);
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      
      const { useChatStore } = await import("./useChatStore.js");
      useChatStore.getState().disconnectSocket();
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  },
}));

export default useAuthStore;      


================================================
FILE: frontend/src/store/useChatStore.js
================================================
import { create } from 'zustand';
import { socket } from '../lib/socket';
import { axiosInstance } from '../lib/axios.js';
import toast from 'react-hot-toast';

export const useChatStore = create((set, get) => ({
  contacts: [],
  groups: [],
  messages: {},
  selectedContact: null,
  selectedGroup: null,
  onlineUsers: [],
  friendRequests: [],
  blockedUsers: [],
  isConnected: false,
  socketInitialized: false,

  setContacts: (contacts) => set({ contacts: Array.isArray(contacts) ? contacts : [] }),
  setGroups: (groups) => set({ groups: Array.isArray(groups) ? groups : [] }),
  setSelectedContact: (contact) => {
    set({ selectedContact: contact, selectedGroup: null });
  },
  setSelectedGroup: (group) => {
    set({ selectedGroup: group, selectedContact: null });
  },

  addMessage: (chatId, message) =>
    set((state) => {
      const existingMessages = state.messages[chatId] || [];
      const messageExists = existingMessages.some(msg => 
        msg._id === message._id || 
        (msg.text === message.text && msg.senderId === message.senderId && 
         Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
      );
      
      if (messageExists) {
        return state;
      }

      return {
        messages: {
          ...state.messages,
          [chatId]: [...existingMessages, message],
        },
      };
    }),

  setOnlineUsers: (userIds) =>
    set((state) => ({
      onlineUsers: Array.isArray(userIds) ? userIds : [],
      contacts: (state.contacts || []).map((contact) => ({
        ...contact,
        online: Array.isArray(userIds) ? userIds.includes(contact._id) : false,
        status: Array.isArray(userIds) && userIds.includes(contact._id) ? 'Online' : 'Offline',
      })),
    })),

  searchUsers: async (query) => {
    try {
      const response = await axiosInstance.get(`/users/search?q=${query}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Search users error:', error);
      toast.error('Failed to search users');
      return []; // Return empty array instead of throwing
    }
  },

  sendFriendRequest: async (userId) => {
    try {
      await axiosInstance.post('/users/friend-request', { userId });
      toast.success('Friend request sent!');
    } catch (error) {
      console.error('Send friend request error:', error);
      toast.error('Failed to send friend request');
      throw error;
    }
  },

  getFriendRequests: async () => {
    try {
      const response = await axiosInstance.get('/users/friend-requests');
      set({ friendRequests: Array.isArray(response.data) ? response.data : [] });
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      set({ friendRequests: [] }); // Ensure it's always an array
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
      toast.success('Friend request accepted!');
      get().getFriendRequests();
      get().loadContacts();
    } catch (error) {
      console.error('Accept friend request error:', error);
      toast.error('Failed to accept friend request');
      throw error;
    }
  },

  rejectFriendRequest: async (requestId) => {
    try {
      await axiosInstance.put(`/users/friend-request/${requestId}/reject`);
      toast.success('Friend request rejected');
      get().getFriendRequests();
    } catch (error) {
      console.error('Reject friend request error:', error);
      toast.error('Failed to reject friend request');
      throw error;
    }
  },

  loadContacts: async () => {
    try {
      const response = await axiosInstance.get('/users/contacts');
      set({ contacts: Array.isArray(response.data) ? response.data : [] });
    } catch (error) {
      console.error('Error loading contacts:', error);
      set({ contacts: [] }); // Ensure it's always an array
    }
  },

  loadGroups: async () => {
    try {
      const response = await axiosInstance.get('/groups');
      const groupsData = Array.isArray(response.data) ? response.data : [];
      set({ groups: groupsData });
      
      // Auto-join groups when they're loaded
      if (get().isConnected && groupsData.length > 0) {
        const groupIds = groupsData.map(g => g._id);
        socket.emit('joinGroups', groupIds);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      set({ groups: [] }); // Ensure it's always an array
    }
  },

  createGroup: async (groupData) => {
    try {
      const response = await axiosInstance.post('/groups', groupData);
      const newGroup = response.data;
      
      set((state) => ({
        groups: [...(state.groups || []), newGroup]
      }));
      
      toast.success('Group created successfully!');
      return newGroup;
    } catch (error) {
      console.error('Create group error:', error);
      toast.error('Failed to create group');
      throw error;
    }
  },

  updateGroup: async (groupId, updateData) => {
    try {
      const response = await axiosInstance.put(`/groups/${groupId}`, updateData);
      const updatedGroup = response.data;
      
      set((state) => ({
        groups: (state.groups || []).map(g => 
          g._id === groupId ? updatedGroup : g
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup
      }));
      
      toast.success('Group updated successfully!');
      return updatedGroup;
    } catch (error) {
      console.error('Update group error:', error);
      toast.error('Failed to update group');
      throw error;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      
      set((state) => ({
        groups: (state.groups || []).filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      
      toast.success('Group deleted successfully!');
    } catch (error) {
      console.error('Delete group error:', error);
      toast.error('Failed to delete group');
      throw error;
    }
  },

  addMemberToGroup: async (groupId, userId) => {
    try {
      const response = await axiosInstance.post(`/groups/${groupId}/members`, { userId });
      const updatedGroup = response.data;
      
      set((state) => ({
        groups: (state.groups || []).map(g => 
          g._id === groupId ? updatedGroup : g
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup
      }));
      
      toast.success('Member added to group successfully!');
      return updatedGroup;
    } catch (error) {
      console.error('Add member error:', error);
      toast.error('Failed to add member to group');
      throw error;
    }
  },

  removeMemberFromGroup: async (groupId, userId) => {
    try {
      const response = await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);
      const updatedGroup = response.data;
      
      set((state) => ({
        groups: (state.groups || []).map(g => 
          g._id === groupId ? updatedGroup : g
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup
      }));
      
      toast.success('Member removed from group successfully!');
      return updatedGroup;
    } catch (error) {
      console.error('Remove member error:', error);
      toast.error('Failed to remove member from group');
      throw error;
    }
  },

  loadMessages: async (chatId) => {
    try {
      const state = get();
      const isGroupChat = state.selectedGroup?._id === chatId;
      
      let response;
      if (isGroupChat) {
        response = await axiosInstance.get(`/groups/${chatId}/messages`);
      } else {
        response = await axiosInstance.get(`/message/${chatId}`);
      }
      
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: Array.isArray(response.data) ? response.data : []
        }
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: []
        }
      }));
    }
  },

  initSocketListeners: () => {
    if (get().socketInitialized) {
      return;
    }

    set({ socketInitialized: true });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      set({ isConnected: false });
    });

    socket.on('messageError', (errorData) => {
      console.error('Message error:', errorData);
      toast.error(`Failed to send message: ${errorData.error}`);
    });

    socket.on('groupMessageError', (errorData) => {
      console.error('Group message error:', errorData);
      toast.error(`Failed to send group message: ${errorData.error}`);
    });

    socket.on('newMessage', (data) => {
      try {
        if (!data || typeof data !== 'object') {
          console.error('Invalid message data received: data is not an object', data);
          return;
        }

        if (!data.senderId || !data.message) {
          console.error('Invalid message data received: missing senderId or message', data);
          return;
        }

        if (!data.message._id && !data.message.text) {
          console.error('Invalid message data received: message missing _id and text', data);
          return;
        }

        const safeMessage = {
          _id: data.message._id || `temp_${Date.now()}_${Math.random()}`,
          senderId: data.senderId,
          receiverId: data.message.receiverId || data.senderId,
          text: data.message.text || '',
          image: data.message.image || null,
          createdAt: data.message.createdAt || new Date().toISOString(),
          ...data.message
        };

        get().addMessage(data.senderId, safeMessage);
        
        const currentContact = get().selectedContact;
        const currentGroup = get().selectedGroup;
        if ((!currentContact || currentContact._id !== data.senderId) && 
            (!currentGroup || currentGroup._id !== data.senderId)) {
          const contact = (get().contacts || []).find(c => c._id === data.senderId);
          if (contact) {
            toast.success(`New message from ${contact.fullName}`);
          }
        }
      } catch (error) {
        console.error('Error handling newMessage:', error);
      }
    });

    socket.on('newGroupMessage', (data) => {
      try {
        if (!data || !data.groupId || !data.message) {
          console.error('Invalid group message data received:', data);
          return;
        }

        const safeMessage = {
          _id: data.message._id || `group_${Date.now()}_${Math.random()}`,
          senderId: data.message.senderId,
          groupId: data.groupId,
          text: data.message.text || '',
          image: data.message.image || null,
          createdAt: data.message.createdAt || new Date().toISOString(),
          ...data.message
        };

        get().addMessage(data.groupId, safeMessage);
        
        const currentGroup = get().selectedGroup;
        if (!currentGroup || currentGroup._id !== data.groupId) {
          const group = (get().groups || []).find(g => g._id === data.groupId);
          if (group) {
            const sender = (get().contacts || []).find(c => c._id === data.message.senderId);
            toast.success(`New message in ${group.name} from ${sender?.fullName || 'Unknown'}`);
          }
        }
      } catch (error) {
        console.error('Error handling newGroupMessage:', error);
      }
    });

    socket.on('groupMessage', (data) => {
      try {
        if (!data || !data.groupId || !data.message) {
          console.error('Invalid group message data received:', data);
          return;
        }

        const safeMessage = {
          _id: data.message._id || `group_${Date.now()}_${Math.random()}`,
          senderId: data.message.senderId,
          groupId: data.groupId,
          text: data.message.text || '',
          image: data.message.image || null,
          createdAt: data.message.createdAt || new Date().toISOString(),
          ...data.message
        };

        get().addMessage(data.groupId, safeMessage);
        
        const currentGroup = get().selectedGroup;
        if (!currentGroup || currentGroup._id !== data.groupId) {
          const group = (get().groups || []).find(g => g._id === data.groupId);
          if (group) {
            const sender = (get().contacts || []).find(c => c._id === data.message.senderId);
            toast.success(`New message in ${group.name} from ${sender?.fullName || 'Unknown'}`);
          }
        }
      } catch (error) {
        console.error('Error handling groupMessage:', error);
      }
    });

    socket.on('messageDelivered', (data) => {
      try {
        if (data.delivered) {
          toast.success('Message delivered');
        } else {
          toast.info('Message sent (user offline)');
        }
      } catch (error) {
        console.error('Error handling messageDelivered:', error);
      }
    });

    socket.on('groupMessageDelivered', (data) => {
      try {
        toast.success('Group message sent');
      } catch (error) {
        console.error('Error handling groupMessageDelivered:', error);
      }
    });

    socket.on('onlineUsers', (userIds) => {
      try {
        if (Array.isArray(userIds)) {
          get().setOnlineUsers(userIds);
        }
      } catch (error) {
        console.error('Error handling onlineUsers:', error);
      }
    });

    socket.on('memberAdded', (data) => {
      try {
        const { groupId, newMember } = data || {};
        if (groupId && newMember) {
          get().loadGroups();
          toast.success(`${newMember.fullName} was added to the group`);
        }
      } catch (error) {
        console.error('Error handling memberAdded:', error);
      }
    });

    socket.on('memberRemoved', (data) => {
      try {
        const { groupId, removedMember } = data || {};
        if (groupId && removedMember) {
          get().loadGroups();
          toast.info(`${removedMember.fullName} was removed from the group`);
        }
      } catch (error) {
        console.error('Error handling memberRemoved:', error);
      }
    });

    socket.on('groupJoined', (data) => {
      try {
        const { group } = data || {};
        if (group) {
          get().loadGroups();
          get().joinGroup(group._id);
          toast.success(`You've been added to group "${group.name}"`);
        }
      } catch (error) {
        console.error('Error handling groupJoined:', error);
      }
    });

    socket.on('groupUpdated', (data) => {
      try {
        const { groupId, group } = data || {};
        if (groupId && group) {
          get().loadGroups();
          
          const currentGroup = get().selectedGroup;
          if (currentGroup && currentGroup._id === groupId) {
            set({ selectedGroup: group });
          }
        }
      } catch (error) {
        console.error('Error handling groupUpdated:', error);
      }
    });

    socket.on('groupCreated', (data) => {
      try {
        const { group } = data || {};
        if (group) {
          get().loadGroups();
          get().joinGroup(group._id);
          toast.success(data.message || `You've been added to group "${group.name}"`);
        }
      } catch (error) {
        console.error('Error handling groupCreated:', error);
      }
    });

    socket.on('friendRequestReceived', (data) => {
      try {
        if (data?.fromName) {
          toast.success(`${data.fromName} sent you a friend request!`);
          get().getFriendRequests();
        }
      } catch (error) {
        console.error('Error handling friendRequestReceived:', error);
      }
    });

    socket.on('chatHistoryCleared', (data) => {
      try {
        if (data.type === 'individual') {
          set((state) => ({
            messages: {
              ...state.messages,
              [data.chatId]: []
            }
          }));
          toast.info('Chat history was cleared by the other user');
        } else if (data.type === 'group') {
          set((state) => ({
            messages: {
              ...state.messages,
              [data.groupId]: []
            }
          }));
          toast.info('Group chat history was cleared by admin');
        }
      } catch (error) {
        console.error('Error handling chatHistoryCleared:', error);
      }
    });
  },

  sendMessage: async (chatId, messageData) => {
    try {
      const isGroupChat = get().selectedGroup?._id === chatId;
      const currentChat = isGroupChat ? get().selectedGroup : get().selectedContact;

      if (!currentChat) {
        throw new Error('No chat selected');
      }

      const payload = {
        text: typeof messageData === 'string' ? messageData : messageData.text || '',
        image: messageData.image || null
      };

      let response;
      let newMessage;

      if (isGroupChat) {
        response = await axiosInstance.post(`/groups/${chatId}/messages`, payload);
        newMessage = {
          _id: response.data._id || `local_group_${Date.now()}_${Math.random()}`,
          senderId: response.data.senderId || get().authUser?._id,
          groupId: chatId,
          text: response.data.text,
          image: response.data.image,
          createdAt: response.data.createdAt || new Date().toISOString(),
          sent: true
        };

        socket.emit('sendGroupMessage', {
          groupId: chatId,
          message: newMessage
        });
      } else {
        response = await axiosInstance.post(`/message/send/${chatId}`, payload);
        newMessage = {
          _id: response.data._id || `local_${Date.now()}_${Math.random()}`,
          senderId: response.data.senderId || get().authUser?._id,
          receiverId: response.data.receiverId || chatId,
          text: response.data.text,
          image: response.data.image,
          createdAt: response.data.createdAt || new Date().toISOString(),
          sent: true
        };

        socket.emit('sendMessage', {
          receiverId: chatId,
          message: newMessage
        });
      }

      get().addMessage(chatId, newMessage);
      return newMessage;
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      throw error;
    }
  },

  clearIndividualChat: async (chatId) => {
    try {
      // Use the correct backend route
      await axiosInstance.delete(`/message/clear/${chatId}`);
      
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: []
        }
      }));

      toast.success('Chat history cleared successfully!');
    } catch (error) {
      console.error('Clear chat error:', error);
      toast.error('Failed to clear chat history');
      throw error;
    }
  },
  
  clearGroupChat: async (groupId) => {
    try {
      // Use the correct backend route - groups have their own clear endpoint
      await axiosInstance.delete(`/message/group/${groupId}/clear`);
      
      set((state) => ({
        messages: {
          ...state.messages,
          [groupId]: []
        }
      }));

      toast.success('Group chat history cleared successfully!');
    } catch (error) {
      console.error('Clear group chat error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to clear group chat history';
      toast.error(errorMessage);
      throw error;
    }
  },

  blockUser: async (userId) => {
    try {
      await axiosInstance.post(`/users/${userId}/block`);
      set((state) => ({
        blockedUsers: [...(state.blockedUsers || []), userId]
      }));
      toast.success('User blocked successfully!');
    } catch (error) {
      console.error('Block user error:', error);
      toast.error('Failed to block user');
      throw error;
    }
  },

  unblockUser: async (userId) => {
    try {
      await axiosInstance.post(`/users/${userId}/unblock`);
      set((state) => ({
        blockedUsers: (state.blockedUsers || []).filter(id => id !== userId)
      }));
      toast.success('User unblocked successfully!');
    } catch (error) {
      console.error('Unblock user error:', error);
      toast.error('Failed to unblock user');
      throw error;
    }
  },

  joinGroup: (groupId) => {
    if (get().isConnected) {
      socket.emit('joinGroups', [groupId]);
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      
      set((state) => ({
        groups: (state.groups || []).filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));

      if (get().isConnected) {
        socket.emit('leaveGroup', { groupId });
      }
      
      toast.success('Left group successfully!');
    } catch (error) {
      console.error('Leave group error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to leave group';
      toast.error(errorMessage);
      throw error;
    }
  },

  connectSocket: (userId) => {
    if (!get().isConnected && !get().socketInitialized) {
      socket.connect();
      socket.on('connect', () => {
        socket.emit('join', userId);
        // Join all user's groups when connecting
        const groups = get().groups || [];
        if (groups.length > 0) {
          const groupIds = groups.map(g => g._id);
          socket.emit('joinGroups', groupIds);
        }
      });
      get().initSocketListeners();
    }
  },

  disconnectSocket: () => {
    if (get().isConnected) {
      socket.disconnect();
      set({ isConnected: false, socketInitialized: false });
    }
  },

  getMessageRetentionInfo: async (chatId, isGroup) => {
    try {
      let response;
      if (isGroup) {
        response = await axiosInstance.get(`/message/retention/group/${chatId}`);
      } else {
        response = await axiosInstance.get(`/message/retention`);
      }
      return response.data;
    } catch (error) {
      console.error('Get message retention info error:', error);
      return {
        messageRetentionDays: 30,
        autoDeleteMessages: false,
        type: isGroup ? 'group' : 'individual'
      };
    }
  }
}));

export default useChatStore;


