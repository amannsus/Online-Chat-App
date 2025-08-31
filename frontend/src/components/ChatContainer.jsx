import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { SendHorizontal, Paperclip, Smile, Image, FileText, X, Users, Settings, LogOut, Trash2, Camera, Mic, MicOff } from "lucide-react";
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
  const [isRecording, setIsRecording] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [containerHeight, setContainerHeight] = useState('100vh');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);
  const messageInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const currentChat = selectedContact || selectedGroup;
  const isGroupChat = !!selectedGroup;
  const chatId = currentChat?._id;

  // Handle viewport changes and keyboard visibility
  useEffect(() => {
    const handleResize = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setContainerHeight(`${window.innerHeight}px`);
      
      // Detect virtual keyboard on mobile
      if (window.innerWidth < 768) {
        const heightDiff = window.screen.height - window.innerHeight;
        setIsKeyboardVisible(heightDiff > 150);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 300);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Load messages when chat changes
  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
    }
  }, [chatId, loadMessages]);

  const currentMessages = chatId ? messages[chatId] || [] : [];

  // Auto-scroll to bottom with smooth behavior
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  }, []);

  useEffect(() => {
    // Delay scroll to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [currentMessages, scrollToBottom]);

  // Handle outside clicks for dropdowns
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
      
      // Focus back to input after sending
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } catch (error) {
      console.error('Send message error:', error);
    }
  }, [message, selectedFile, filePreview, chatId, sendMessage]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      } else {
        e.preventDefault();
        handleSend();
      }
    }
  }, [handleSend]);

  const handleMessageChange = useCallback((e) => {
    setMessage(e.target.value);
  }, []);

  const onEmojiClick = useCallback((emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, []);

  const handleFileSelect = useCallback((e, type) => {
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

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // Handle audio file here - you can send it as a message
        console.log('Audio recorded:', audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Memoized message renderer for better performance
  const renderMessage = useCallback((msg, index) => {
    const isCurrentUser = msg.senderId === authUser._id || msg.senderId?._id === authUser._id;
    const senderName = msg.senderId?.fullName || 'Unknown';
    
    const messageKey = msg._id || `msg_${index}_${msg.senderId}_${msg.createdAt}_${msg.text?.substring(0, 10)}`;
    
    return (
      <div
        key={messageKey}
        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-3 px-2 sm:px-4 animate-fadeIn`}
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
            
            {msg.file && !msg.file.type?.startsWith('image/') && (
              <div className="mt-2 p-3 bg-base-100 rounded-lg border border-base-300">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{msg.file.name}</span>
                </div>
                <p className="text-xs text-base-content/70 mt-1">
                  {formatFileSize(msg.file.size)}
                </p>
                <a 
                  href={msg.file.url} 
                  download={msg.file.name}
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  Download
                </a>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs opacity-70">
                {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </p>
              
              {isCurrentUser && msg.sent && (
                <span className="text-xs opacity-70 ml-2">
                  ✓ Sent
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [authUser._id, isGroupChat, formatFileSize]);

  const attachmentMenu = useMemo(() => (
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
        onChange={(e) => handleFileSelect(e, 'camera')}
        className="hidden"
      />
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
  ), [showAttachMenu, handleFileSelect]);

  if (!currentChat) {
    return (
      <div 
        className="flex-1 flex items-center justify-center bg-base-100"
        style={{ height: containerHeight }}
      >
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
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-base-100 relative"
      style={{ 
        height: isKeyboardVisible ? 'auto' : containerHeight,
        minHeight: isKeyboardVisible ? '400px' : containerHeight
      }}
    >
      {/* Chat Header */}
      <div className="p-3 sm:p-4 border-b border-base-300 bg-base-200/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="size-10 sm:size-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {currentChat.avatar || currentChat.profilePic ? (
                <img 
                  src={currentChat.avatar || currentChat.profilePic} 
                  alt={currentChat.name || currentChat.fullName} 
                  className="size-10 sm:size-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary font-semibold text-sm sm:text-base">
                  {isGroupChat ? (
                    <Users className="size-5 sm:size-6" />
                  ) : (
                    currentChat.fullName?.charAt(0) || 'U'
                  )}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate">
                {isGroupChat ? currentChat.name : currentChat.fullName}
              </h3>
              <p className="text-xs sm:text-sm text-base-content/70 truncate">
                {isGroupChat 
                  ? `${currentChat.members?.length || 0} members`
                  : (currentChat.online ? 'Online' : 'Offline')
                }
              </p>
            </div>
          </div>

          {/* Header Actions */}
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
                  ? `Clear all messages in "${currentChat.name}"?`
                  : `Clear all messages with ${currentChat.fullName}?`;
                
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

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-base-100 to-base-200/30"
        style={{
          height: isKeyboardVisible ? 'auto' : 'calc(100% - 120px)',
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
        {attachmentMenu}

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
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${isGroupChat ? currentChat.name : currentChat.fullName}...`}
              className="textarea textarea-bordered w-full resize-none min-h-[44px] max-h-32 text-base pr-12"
              rows={1}
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
            
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-sm btn-square"
              type="button"
            >
              <Paperclip className="size-4" />
            </button>
          </div>

          {/* Voice/Send Button */}
          {message.trim() || selectedFile ? (
            <button
              onClick={handleSend}
              disabled={!message.trim() && !selectedFile}
              className="btn btn-primary btn-sm btn-square flex-shrink-0"
              type="button"
            >
              <SendHorizontal className="size-5" />
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`btn btn-sm btn-square flex-shrink-0 ${isRecording ? 'btn-error' : 'btn-secondary'}`}
              type="button"
            >
              {isRecording ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Group Settings Modal */}
      <GroupSettingsModal 
        isOpen={showGroupSettings} 
        onClose={() => setShowGroupSettings(false)} 
        group={currentChat} 
        onGroupUpdated={(updatedGroup) => {
          // Handle group updates
        }}
      />

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Smooth scrolling optimization */
        .messages-container {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        
        /* Better mobile textarea */
        textarea {
          font-family: inherit;
          line-height: 1.5;
        }
        
        /* iOS specific fixes */
        @supports (-webkit-touch-callout: none) {
          textarea {
            transform: translateZ(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ChatContainer;
