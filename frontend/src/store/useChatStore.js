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

  setContacts: (contacts) => set({ contacts }),
  setGroups: (groups) => set({ groups }),
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
      onlineUsers: userIds,
      contacts: state.contacts.map((contact) => ({
        ...contact,
        online: userIds.includes(contact._id),
        status: userIds.includes(contact._id) ? 'Online' : 'Offline',
      })),
    })),



  searchUsers: async (query) => {
    try {
      const response = await axiosInstance.get(`/users/search?q=${query}`);
      return response.data;
    } catch (error) {
      console.error('Search users error:', error);
      toast.error('Failed to search users');
      throw error;
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
      set({ friendRequests: response.data });
    } catch (error) {
      console.error('Error fetching friend requests:', error);
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
      set({ contacts: response.data });
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  },

  loadGroups: async () => {
    try {
      const response = await axiosInstance.get('/groups');
      set({ groups: response.data });
      
      // Auto-join groups when they're loaded
      if (get().isConnected && response.data.length > 0) {
        const groupIds = response.data.map(g => g._id);
        socket.emit('joinGroups', groupIds);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  },

  createGroup: async (groupData) => {
    try {
      const response = await axiosInstance.post('/groups', groupData);
      const newGroup = response.data;
      
      set((state) => ({
        groups: [...state.groups, newGroup]
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
        groups: state.groups.map(g => 
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
        groups: state.groups.filter(g => g._id !== groupId),
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
        groups: state.groups.map(g => 
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
        groups: state.groups.map(g => 
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
          [chatId]: response.data
        }
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
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
          const contact = get().contacts.find(c => c._id === data.senderId);
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
          const group = get().groups.find(g => g._id === data.groupId);
          if (group) {
            const sender = get().contacts.find(c => c._id === data.message.senderId);
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
          const group = get().groups.find(g => g._id === data.groupId);
          if (group) {
            const sender = get().contacts.find(c => c._id === data.message.senderId);
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
        blockedUsers: [...state.blockedUsers, userId]
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
        blockedUsers: state.blockedUsers.filter(id => id !== userId)
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
        groups: state.groups.filter(g => g._id !== groupId),
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
        const groups = get().groups;
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


