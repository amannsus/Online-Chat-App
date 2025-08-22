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