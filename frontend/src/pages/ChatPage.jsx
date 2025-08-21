import React from 'react';
import { useAuthStore } from "../store/useAuthStore";
import { Settings, User, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import Sidebar from '../components/Sidebar';
import ChatContainer from '../components/ChatContainer';

const ChatPage = () => {
  const { logout, authUser } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex flex-col h-screen dark bg-gradient-to-br from-[#20122d] to-[#232243]">
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#1a1823] border-b border-[#382e44]/50">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <span className="text-purple-400 font-bold text-lg">💬</span>
          </div>
          <h1 className="text-xl font-bold text-white">Chatty</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Settings Button */}
          <Link 
            to="/settings" 
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
          >
            <Settings className="size-4" />
            Settings
          </Link>

          {/* Profile Button */}
          <Link 
            to="/profile" 
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <User className="size-4" />
            Profile
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Chat Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Contacts List */}
        <div className="w-80 min-w-[220px] bg-[#1a1823] border-r border-[#382e44]/50 h-full flex-shrink-0">
          <Sidebar />
        </div>
        {/* Chat Container: Messages & Input */}
        <div className="flex-1 flex flex-col h-full">
          <ChatContainer />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
