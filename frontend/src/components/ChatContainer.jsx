import React, { useRef, useEffect, useState } from "react";
import { SendHorizontal, Paperclip, Smile, Image, FileText, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import EmojiPicker from 'emoji-picker-react';

const mockMessages = [
  { id: 1, user: "Jane Doe", avatar: "/avatar.png", text: "Hey jane it's me from react app", time: "22:40", sent: true },
  { id: 2, user: "Jane Doe", avatar: "/avatar.png", text: "hey!", time: "22:41", sent: false },
  { id: 3, user: "Jane Doe", avatar: "/avatar.png", text: "hey this is me in REAL LIFE", time: "22:43", sent: true },
];

const ChatContainer = () => {
  const { authUser } = useAuthStore();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(mockMessages);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close menus when clicking outside
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

  const handleSend = () => {
    if (message.trim() || selectedFile) {
      const newMessage = {
        id: Date.now(),
        user: authUser?.fullName || "You",
        text: message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sent: true,
      };

      // Add file attachment if exists
      if (selectedFile) {
        newMessage.file = {
          name: selectedFile.name,
          type: selectedFile.type,
          url: filePreview,
          size: selectedFile.size
        };
      }

      setMessages(prev => [...prev, newMessage]);
      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview for images
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getUserAvatar = (isCurrentUser) => {
    if (isCurrentUser) {
      return authUser?.profilePic || "/avatar.png";
    }
    return "/avatar.png";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = (msg) => {
    return (
      <div key={msg.id} className={`flex ${msg.sent ? "justify-end" : "justify-start"} group mb-4`}>
        {!msg.sent && (
          <img 
            src={getUserAvatar(false)} 
            alt="" 
            className="w-8 h-8 rounded-full object-cover mr-3 self-end" 
          />
        )}
        
        <div className="max-w-xs">
          <div className={`p-3 rounded-2xl ${
            msg.sent
              ? "bg-[#3C1866] text-white rounded-br-sm"
              : "bg-[#2c2236] text-zinc-100 rounded-bl-sm"
          }`}>
            {msg.text && <p className="mb-2">{msg.text}</p>}
            
            {/* Render file attachment */}
            {msg.file && (
              <div className="mt-2">
                {msg.file.type.startsWith('image/') ? (
                  <img 
                    src={msg.file.url} 
                    alt={msg.file.name}
                    className="max-w-full h-auto rounded-lg cursor-pointer"
                    onClick={() => window.open(msg.file.url, '_blank')}
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{msg.file.name}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(msg.file.size)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className={`text-xs mt-1 ${msg.sent ? "text-right" : "text-left"} text-violet-300`}>
            {msg.time}
          </div>
        </div>
        
        {msg.sent && (
          <img 
            src={getUserAvatar(true)} 
            alt="" 
            className="w-8 h-8 rounded-full object-cover ml-3 self-end" 
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#372945]/40 bg-[#232243]/80">
        <img src="/avatar.png" alt="" className="w-10 h-10 rounded-full object-cover" />
        <div>
          <div className="font-semibold text-white">Jane Doe</div>
          <div className="text-xs text-green-400">Online</div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#251932]">
        <div className="flex flex-col">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef}></div>
        </div>
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="px-6 py-3 bg-[#20122d] border-t border-[#372945]/40">
          <div className="flex items-center gap-3 p-3 bg-[#2c2236] rounded-lg">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
            ) : (
              <FileText className="w-12 h-12 text-blue-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-gray-400 text-xs">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button 
              onClick={removeSelectedFile}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 bg-[#20122d] border-t border-[#372945]/40 relative">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-50">
            <EmojiPicker 
              onEmojiClick={onEmojiClick}
              theme="dark"
              width={300}
              height={400}
            />
          </div>
        )}

        {/* Attachment Menu */}
        {showAttachMenu && (
          <div 
            ref={attachMenuRef}
            className="absolute bottom-16 left-14 bg-[#2c2236] rounded-lg p-2 shadow-xl border border-[#372945] z-40"
          >
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setShowAttachMenu(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-white hover:bg-[#372945] rounded-lg transition-colors"
            >
              <Image size={18} className="text-green-400" />
              <span>Image</span>
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.click();
                setShowAttachMenu(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-white hover:bg-[#372945] rounded-lg transition-colors"
            >
              <FileText size={18} className="text-blue-400" />
              <span>Document</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Attachment Button */}
          <button 
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Paperclip size={20} />
          </button>

          {/* Emoji Button */}
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
          >
            <Smile size={20} />
          </button>

          {/* Message Input */}
          <input
            className="flex-1 rounded-full px-4 py-3 bg-[#2c2236] text-white border border-[#382e44]/30 outline-none focus:ring-2 focus:ring-violet-600 transition placeholder-gray-500"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            className="p-3 bg-violet-600 rounded-full text-white hover:bg-violet-700 transition-colors"
            aria-label="Send message"
          >
            <SendHorizontal size={20} />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ChatContainer;
