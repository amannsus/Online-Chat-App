import React, { useRef, useEffect, useState } from "react";
import { SendHorizontal, Paperclip, Smile, Image, FileText, X, Users, Settings, LogOut, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import EmojiPicker from 'emoji-picker-react';
import GroupSettingsModal from './GroupSettingsModal';

const ChatContainer = () => {
  const { authUser } = useAuthStore();
  const { 
    selectedContact,
    selectedGroup,
    messages, 
    sendMessage, 
    contacts, 
    loadMessages,
    clearIndividualChat,
    clearGroupChat,
    getMessageRetentionInfo
  } = useChatStore();

  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [showGroupSettings, setShowGroupSettings] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);


  const currentChat = selectedContact || selectedGroup;
  const isGroupChat = !!selectedGroup;
  const chatId = currentChat?._id;

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    }
  }, [chatId, loadMessages]);

  const currentMessages = chatId ? messages[chatId] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || !chatId) return;

    try {
      const messageData = {
        text: message.trim(),
        image: selectedFile && selectedFile.type.startsWith('image/') ? filePreview : null
      };

      await sendMessage(chatId, messageData);
      
      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  const onEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
      
      setShowAttachMenu(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = (msg, index) => {
    const isCurrentUser = msg.senderId === authUser._id || msg.senderId?._id === authUser._id;
    const senderName = msg.senderId?.fullName || 'Unknown';
    
    const messageKey = msg._id || `msg_${index}_${msg.senderId}_${msg.createdAt}_${msg.text?.substring(0, 10)}`;
    
    return (
      <div
        key={messageKey}
        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isCurrentUser
              ? "bg-primary text-primary-content"
              : "bg-base-300 text-base-content"
          }`}
        >
          {isGroupChat && !isCurrentUser && (
            <p className="text-xs font-semibold mb-1 opacity-70">
              {senderName}
            </p>
          )}
          
          {msg.text && <p className="text-sm">{msg.text}</p>}
          
          {msg.image && (
            <img 
              src={msg.image} 
              alt="Message attachment" 
              className="mt-2 max-w-full rounded cursor-pointer"
              onClick={() => window.open(msg.image, '_blank')}
            />
          )}
          
          {msg.file && !msg.file.type?.startsWith('image/') && (
            <div className="mt-2 p-2 bg-base-100 rounded border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">{msg.file.name}</span>
              </div>
              <p className="text-xs text-base-content/70">
                {formatFileSize(msg.file.size)}
              </p>
              <a 
                href={msg.file.url} 
                download={msg.file.name}
                className="text-xs text-primary hover:underline"
              >
                Download
              </a>
            </div>
          )}
          
          <p className="text-xs mt-1 opacity-70">
            {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}
          </p>

          {isCurrentUser && (
            <div className="flex items-center justify-end mt-1">
              {msg.sent && (
                <span className="text-xs opacity-70">
                  ✓ Sent
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-base-100">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-base-content/70 mb-2">
            Welcome to Chatty!
          </h3>
          <p className="text-base-content/50">
            Select a contact or group to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-base-100">
      <div className="p-4 border-b border-base-300 bg-base-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              {currentChat.avatar || currentChat.profilePic ? (
                <img 
                  src={currentChat.avatar || currentChat.profilePic} 
                  alt={currentChat.name || currentChat.fullName} 
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold">
                  {isGroupChat ? (
                    <Users className="size-5" />
                  ) : (
                    currentChat.fullName?.charAt(0) || 'U'
                  )}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold">
                {isGroupChat ? currentChat.name : currentChat.fullName}
              </h3>
              <p className="text-sm text-base-content/70">
                {isGroupChat 
                  ? `${currentChat.members?.length || 0} members`
                  : (currentChat.online ? 'Online' : 'Offline')
                }
              </p>
            </div>
          </div>

          {isGroupChat && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (window.confirm(`Are you sure you want to leave "${currentChat.name}"?`)) {
                    useChatStore.getState().leaveGroup(currentChat._id);
                  }
                }}
                className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                title="Leave Group"
              >
                <LogOut className="size-4" />
                Leave
              </button>
              <button 
                onClick={() => setShowGroupSettings(true)}
                className="btn btn-ghost btn-sm"
                title="Group Settings"
              >
                <Settings className="size-4" />
                Settings
              </button>
            </div>
          )}

          {!isGroupChat && (
            <div className="flex items-center gap-2">
              <button 
                onClick={async () => {
                  const retentionInfo = await getMessageRetentionInfo(chatId, false);
                  const confirmMessage = `Are you sure you want to clear all chat history with ${currentChat.fullName}?\n\nThis will delete all messages permanently.\n\nNote: Messages are automatically deleted after ${retentionInfo.messageRetentionDays} days.`;
                  
                  if (window.confirm(confirmMessage)) {
                    await useChatStore.getState().clearIndividualChat(chatId);
                  }
                }}
                className="btn btn-ghost btn-sm text-warning hover:bg-warning/10"
                title="Clear Chat History"
              >
                <Trash2 className="size-4" />
                Clear Chat
              </button>
            </div>
          )}

          {isGroupChat && (
            <div className="flex items-center gap-2">
              <button 
                onClick={async () => {
                  const retentionInfo = await getMessageRetentionInfo(chatId, true);
                  const confirmMessage = `Are you sure you want to clear all group chat history?\n\nThis will delete all messages permanently.\n\nNote: Messages are automatically deleted after ${retentionInfo.messageRetentionDays} days.`;
                  
                  if (window.confirm(confirmMessage)) {
                    await useChatStore.getState().clearGroupChat(chatId);
                  }
                }}
                className="btn btn-ghost btn-sm text-warning hover:bg-warning/10"
                title="Clear Group Chat History (Admin Only)"
              >
                <Trash2 className="size-4" />
                Clear Chat
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.length === 0 ? (
          <div className="text-center text-base-content/50 mt-20">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          currentMessages.map((msg, index) => renderMessage(msg, index))
        )}
        

        
        <div ref={messagesEndRef} />
      </div>

      {selectedFile && (
        <div className="px-4 py-2 border-t border-base-300 bg-base-200">
          <div className="flex items-center gap-3 p-2 bg-base-100 rounded">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
            ) : (
              <FileText className="w-12 h-12 text-base-content/50" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-base-content/70">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={removeSelectedFile}
              className="btn btn-ghost btn-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-base-300">
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-10">
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </div>
        )}

        {showAttachMenu && (
          <div 
            ref={attachMenuRef}
            className="absolute bottom-20 right-20 z-10 bg-base-200 shadow-lg rounded-lg p-2 border"
          >
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 w-full p-2 hover:bg-base-300 rounded text-left"
            >
              <Image className="w-5 h-5" />
              <span>Photo</span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full p-2 hover:bg-base-300 rounded text-left"
            >
              <FileText className="w-5 h-5" />
              <span>Document</span>
            </button>
            
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'image')}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
              onChange={(e) => handleFileSelect(e, 'file')}
              className="hidden"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn btn-ghost btn-sm"
            type="button"
          >
            <Smile className="size-5" />
          </button>

          <input
            type="text"
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${isGroupChat ? currentChat.name : currentChat.fullName}...`}
            className="input input-bordered flex-1"
          />

          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="btn btn-ghost btn-sm"
            type="button"
          >
            <Paperclip className="size-5" />
          </button>

          <button
            onClick={handleSend}
            disabled={!message.trim() && !selectedFile}
            className="btn btn-primary"
            type="button"
          >
            <SendHorizontal className="size-5" />
          </button>
        </div>
      </div>

      <GroupSettingsModal 
        isOpen={showGroupSettings} 
        onClose={() => setShowGroupSettings(false)} 
        group={currentChat} 
        onGroupUpdated={(updatedGroup) => {
          
        }}
      />
    </div>
  );
};

export default ChatContainer;        