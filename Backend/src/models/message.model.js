// backend/src/models/message.model.js
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

// Ensure either receiverId or groupId is present
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
