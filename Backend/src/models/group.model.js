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
