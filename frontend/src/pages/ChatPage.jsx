import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import Sidebar from '../components/Sidebar';
import GroupSidebar from '../components/GroupSidebar';
import ChatContainer from '../components/ChatContainer';
import ErrorBoundary from '../components/ErrorBoundary';
import { Settings, User, LogOut, MessageSquare, Users, Home, Menu } from "lucide-react";

const ChatPage = () => {
  const { authUser, logout } = useAuthStore();
  const { connectSocket, isConnected } = useChatStore();
  const [activeTab, setActiveTab] = useState('contacts');

  useEffect(() => {
    if (authUser) connectSocket(authUser._id);
  }, [authUser, connectSocket]);

  if (!authUser) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Please log in to access chat</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="drawer lg:drawer-open bg-base-200 min-h-dvh">
      {/* Drawer toggle */}
      <input id="chat-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main content */}
      <div className="drawer-content flex flex-col min-h-dvh">
        {/* Top bar */}
        <div className="flex items-center justify-between w-full p-4 border-b border-base-300 bg-base-100">
          <div className="flex items-center gap-3">
            {/* Mobile open button */}
            <label htmlFor="chat-drawer" className="btn btn-ghost btn-sm lg:hidden" aria-label="Open sidebar">
              <Menu className="w-5 h-5" />
            </label>

            <div className="size-10 rounded-full bg-primary/10 hidden md:flex items-center justify-center">
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
            <Link to="/" className="btn btn-sm gap-2" title="Home">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link to="/settings" className="btn btn-sm gap-2" title="Settings">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <Link to="/profile" className="btn btn-sm gap-2" title="Profile">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <button className="btn btn-sm gap-2" onClick={logout} title="Logout">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Body uses dynamic viewport height */}
        <div className="flex-1 min-h-0" style={{ height: 'calc(100dvh - 4rem)' }}>
          <div className="flex h-full">
            <ErrorBoundary>
              <div className="flex-1 min-w-0">
                <ChatContainer />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Drawer side */}
      <div className="drawer-side">
        <label htmlFor="chat-drawer" className="drawer-overlay" aria-label="Close sidebar"></label>

        <div className="w-80 bg-base-200 border-r border-base-300 flex flex-col">
          {/* Tabs inside drawer */}
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

          <div className="flex-1 min-h-0 overflow-y-auto">
            <ErrorBoundary>
              {activeTab === 'contacts' ? <Sidebar /> : <GroupSidebar />}
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
