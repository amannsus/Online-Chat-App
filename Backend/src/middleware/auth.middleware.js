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