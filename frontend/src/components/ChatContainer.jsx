import React, { useRef, useEffect, useState, useCallback } from "react";
import { SendHorizontal, Paperclip, Smile, Image, FileText, X, Users, Settings, Trash2, Camera, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import EmojiPicker from 'emoji-picker-react';

const ChatContainer = () => {
  const { authUser } = useAuthStore();
  const { 
    selectedContact,
    selectedGroup,
    messages, 
    sendMessage, 
    loadMessages,
    clearIndividualChat,
    clearGroupChat,
    setSelectedContact,
    setSelectedGroup
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
  const cameraInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const currentChat = selectedContact || selectedGroup;
  const isGroupChat = !!selectedGroup;
  const chatId = currentChat?._id;

  const handleBackButton = () => {
    setSelectedContact(null);
    setSelectedGroup(null);
  };

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    }
  }, [chatId, loadMessages]);

  const currentMessages = chatId && messages ? (messages[chatId] || []) : [];

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [currentMessages, scrollToBottom]);

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
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSend = useCallback(async () => {
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
      
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Send message error:', error);
    }
  }, [message, selectedFile, filePreview, chatId, sendMessage]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const onEmojiClick = useCallback((emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
    messageInputRef.current?.focus();
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files;
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
  }, []);

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const renderMessage = useCallback((msg, index) => {
    if (!msg || !authUser) return null;
    
    const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
    const isCurrentUser = senderId === authUser._id;
    const senderName = msg.senderId?.fullName || 'Unknown';
    
    const messageKey = msg._id || `msg_${index}_${senderId}_${msg.createdAt}`;
    
    return (
      <div
        key={messageKey}
        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-3 px-2 sm:px-4`}
      >
        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-md lg:max-w-lg">
          {!isCurrentUser && (
            <div className="size-6 sm:size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {msg.senderId?.profilePic ? (
                <img 
                  src={msg.senderId.profilePic} 
                  alt={senderName}
                  className="size-6 sm:size-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold text-xs">
                  {senderName.charAt(0)}
                </span>
              )}
            </div>
          )}
          
          <div
            className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-sm ${
              isCurrentUser
                ? "bg-primary text-primary-content rounded-br-md"
                : "bg-base-300 text-base-content rounded-bl-md"
            }`}
          >
            {isGroupChat && !isCurrentUser && (
              <p className="text-xs font-semibold mb-1 opacity-70">
                {senderName}
              </p>
            )}
            
            {msg.text && (
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                {msg.text}
              </p>
            )}
            
            {msg.image && (
              <div className="mt-2">
                <img 
                  src={msg.image} 
                  alt="Message attachment" 
                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(msg.image, '_blank')}
                  loading="lazy"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs opacity-70">
                {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }, [authUser, isGroupChat]);

  if (!currentChat) {
    return (
      <div className="flex flex-col h-full bg-base-100">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 max-w-md mx-auto">
            <div className="text-6xl mb-4 animate-bounce">💬</div>
            <h3 className="text-xl font-semibold text-base-content/70 mb-2">
              Welcome to Yap! 🤗
            </h3>
            <p className="text-base-content/50">
              Select a contact or group to start chatting
            </p>
          </div>
        </div>
      </div>
    );
  }

  const chatName = isGroupChat ? currentChat.name : currentChat.fullName;
  const chatAvatar = currentChat.avatar || currentChat.profilePic;

  return (
    <div className="flex flex-col h-full bg-base-100 relative">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-base-300 bg-base-200/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleBackButton}
              className="btn btn-ghost btn-sm btn-square md:hidden"
            >
              <ArrowLeft className="size-5" />
            </button>
            
            <div className="size-10 sm:size-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {chatAvatar ? (
                <img 
                  src={chatAvatar} 
                  alt={chatName} 
                  className="size-10 sm:size-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold text-sm sm:text-base">
                  {isGroupChat ? (
                    <Users className="size-5 sm:size-6" />
                  ) : (
                    chatName?.charAt(0) || 'U'
                  )}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate">
                {chatName}
              </h3>
              <p className="text-xs sm:text-sm text-base-content/70 truncate">
                {isGroupChat 
                  ? `${currentChat.members?.length || 0} members`
                  : (currentChat.online ? 'Online' : 'Offline')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {isGroupChat && (
              <button 
                onClick={() => setShowGroupSettings(true)}
                className="btn btn-ghost btn-sm btn-square"
                title="Group Settings"
              >
                <Settings className="size-4" />
              </button>
            )}
            
            <button 
              onClick={async () => {
                const confirmMessage = isGroupChat 
                  ? `Clear all messages in "${chatName}"?`
                  : `Clear all messages with ${chatName}?`;
                
                if (window.confirm(confirmMessage)) {
                  if (isGroupChat) {
                    await clearGroupChat(chatId);
                  } else {
                    await clearIndividualChat(chatId);
                  }
                }
              }}
              className="btn btn-ghost btn-sm btn-square text-warning"
              title="Clear Chat"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-base-100 to-base-200/30"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth'
        }}
      >
        {currentMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">👋</div>
              <p className="text-base-content/50">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {currentMessages.map((msg, index) => renderMessage(msg, index))}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        )}
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 py-3 border-t border-base-300 bg-base-200/50">
          <div className="flex items-center gap-3 p-3 bg-base-100 rounded-lg border border-base-300">
            {filePreview ? (
              <img 
                src={filePreview} 
                alt="Preview" 
                className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
              />
            ) : (
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-base-content/50" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base truncate">{selectedFile.name}</p>
              <p className="text-xs sm:text-sm text-base-content/70">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            
            <button
              onClick={removeSelectedFile}
              className="btn btn-ghost btn-sm btn-square flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-base-300 bg-base-200/50 backdrop-blur-sm">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef}
            className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-20 bg-base-100 rounded-xl shadow-xl border border-base-300 overflow-hidden"
          >
            <EmojiPicker 
              onEmojiClick={onEmojiClick}
              searchDisabled={window.innerWidth < 640}
              skinTonesDisabled={true}
              height={300}
            />
          </div>
        )}

        {/* Attachment Menu */}
        <div 
          ref={attachMenuRef}
          className={`absolute bottom-16 right-4 z-20 bg-base-200 shadow-xl rounded-xl p-2 border border-base-300 transform transition-all duration-200 ${
            showAttachMenu 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-3 w-full p-3 hover:bg-base-300 rounded-lg text-left transition-colors"
          >
            <Camera className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Camera</span>
          </button>
          
          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-3 w-full p-3 hover:bg-base-300 rounded-lg text-left transition-colors"
          >
            <Image className="w-5 h-5 text-secondary" />
            <span className="text-sm font-medium">Photo</span>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 w-full p-3 hover:bg-base-300 rounded-lg text-left transition-colors"
          >
            <FileText className="w-5 h-5 text-accent" />
            <span className="text-sm font-medium">Document</span>
          </button>
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Input Controls */}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="btn btn-ghost btn-sm btn-square flex-shrink-0"
            type="button"
          >
            <Smile className="size-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${chatName}...`}
              className="textarea textarea-bordered w-full resize-none min-h-[44px] max-h-32 text-base pr-12"
              rows={1}
              style={{ fontSize: '16px' }}
            />
            
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-sm btn-square"
              type="button"
            >
              <Paperclip className="size-4" />
            </button>
          </div>

          {/* Always-visible Send button */}
          <button
            onClick={handleSend}
            disabled={!message.trim() && !selectedFile}
            className="btn btn-primary btn-sm btn-square flex-shrink-0"
            type="button"
          >
            <SendHorizontal className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
