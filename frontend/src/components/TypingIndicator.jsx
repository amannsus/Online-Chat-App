
import React from 'react';
import { useChatStore } from '../store/useChatStore';

const TypingIndicator = ({ typingUsers, contacts, isGroup = false }) => {
  if (!typingUsers || typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 0) return '';
    
    if (typingUsers.length === 1) {
      const userId = typingUsers[0];
      const contact = contacts.find(c => c._id === userId);
      return `${contact?.fullName || 'Someone'} is typing...`;
    }
    
    if (typingUsers.length === 2) {
      const names = typingUsers.map(userId => {
        const contact = contacts.find(c => c._id === userId);
        return contact?.fullName || 'Someone';
      });
      return `${names[0]} and ${names[1]} are typing...`;
    }
    
    return 'Several people are typing...';
  };

  return (
    <div className="flex items-center gap-2 p-2 text-sm text-base-content/50">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-base-content/30 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-base-content/30 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-base-content/30 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
};

export default TypingIndicator;
