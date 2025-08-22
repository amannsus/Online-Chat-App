
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