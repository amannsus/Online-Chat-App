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