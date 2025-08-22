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
         sameSite: "strict",
         secure: process.env.NODE_ENV !== "development",
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
        // Messages cleaned up successfully
      }
    }
    
    const defaultCutoffDate = new Date();
    defaultCutoffDate.setDate(defaultCutoffDate.getDate() - 30);
    
    const deletedIndividualCount = await Message.deleteMany({
      groupId: { $exists: false },
      createdAt: { $lt: defaultCutoffDate }
    });
    
    if (deletedIndividualCount.deletedCount > 0) {
      // Individual messages cleaned up successfully
    }
  } catch (error) {
    console.error('Error during automatic message cleanup:', error);
  }
};

export const scheduleMessageCleanup = () => {
  setInterval(cleanupOldMessages, 24 * 60 * 60 * 1000);
  
  setTimeout(cleanupOldMessages, 5 * 60 * 1000);
};