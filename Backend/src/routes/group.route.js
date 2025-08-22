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

    if (group.admin.equals(req.user._id)) {
      return res.status(400).json({ error: 'Admin cannot leave group. Transfer admin rights first.' });
    }

    group.members = group.members.filter(m => !m.user.equals(req.user._id));
    await group.save();

    const io = req.app.get('io');
    if (io) {
      group.members.forEach(member => {
        io.to(member.user._id).emit('memberLeft', {
          groupId: group._id,
          leftMember: { _id: req.user._id, fullName: req.user.fullName }
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
      group.members.forEach(member => {
        if (!member.user.equals(req.user._id)) {
          io.to(member.user._id).emit('groupMessage', {
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