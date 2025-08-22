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