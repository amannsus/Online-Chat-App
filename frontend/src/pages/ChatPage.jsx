import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import Sidebar from '../components/Sidebar';
import GroupSidebar from '../components/GroupSidebar';
import ChatContainer from '../components/ChatContainer';
import ErrorBoundary from '../components/ErrorBoundary';
import { Settings, User, LogOut, MessageSquare, Users, Home } from "lucide-react";

const ChatPage = () => {
  const { authUser, logout } = useAuthStore();
  const { connectSocket, isConnected } = useChatStore();
  const [activeTab, setActiveTab] = useState('contacts');

  useEffect(() => {
    if (authUser) {
      connectSocket(authUser._id);
    }
  }, [authUser, connectSocket]);

  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Please log in to access chat</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] bg-base-200 flex flex-col safe-bottom">
      <div className="flex items-center justify-between w-full p-4 border-b border-base-300">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {authUser.fullName?.charAt(0) || 'U'}
            </span>
          </div>
          <h1 className="text-lg font-semibold">Yap!🤗</h1>
          <div className={`ml-2 text-xs ${isConnected ? 'text-success' : 'text-error'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            to="/" 
            className="btn btn-sm gap-2"
            title="Home"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          
          <Link 
            to="/settings" 
            className="btn btn-sm gap-2"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          
          <Link 
            to="/profile" 
            className="btn btn-sm gap-2"
            title="Profile"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </Link>
          
          <button 
            className="btn btn-sm gap-2" 
            onClick={logout}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col">
          <div className="flex bg-base-300">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
                activeTab === 'contacts' 
                  ? 'bg-base-100 text-primary border-b-2 border-primary' 
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              <MessageSquare className="size-4" />
              Contacts
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
                activeTab === 'groups' 
                  ? 'bg-base-100 text-primary border-b-2 border-primary' 
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              <Users className="size-4" />
              Groups
            </button>
          </div>

          {activeTab === 'contacts' ? (
            <ErrorBoundary>
              <Sidebar />
            </ErrorBoundary>
          ) : (
            <ErrorBoundary>
              <GroupSidebar />
            </ErrorBoundary>
          )}
        </div>

        <ErrorBoundary>
          <ChatContainer />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ChatPage;
