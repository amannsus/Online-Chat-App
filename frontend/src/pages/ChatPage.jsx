import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import Sidebar from '../components/Sidebar';
import GroupSidebar from '../components/GroupSidebar';
import ChatContainer from '../components/ChatContainer';
import ErrorBoundary from '../components/ErrorBoundary';
import { Settings, User, LogOut, MessageSquare, Users, Home, Menu, X } from "lucide-react";

const ChatPage = () => {
  const { authUser, logout } = useAuthStore();
  const { connectSocket, isConnected } = useChatStore();
  const [activeTab, setActiveTab] = useState('contacts');
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  useEffect(() => {
    if (authUser) connectSocket(authUser._id);
  }, [authUser, connectSocket]);

  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Please log in to access chat</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh md:min-h-screen bg-base-200 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between w-full p-4 border-b border-base-300 bg-base-100">
        <div className="flex items-center gap-3">
          {/* Mobile drawer toggle */}
          <button
            className="btn btn-ghost btn-sm md:hidden"
            onClick={() => setMobilePanelOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

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

      {/* Content area with dvh height and vh fallback */}
      <div
        className="flex grow min-h-0"
        style={{
          height: 'calc(100dvh - 4rem)',
          minHeight: 'calc(100vh - 4rem)'
        }}
      >
        {/* Left column: hidden on small screens */}
        <div className="hidden md:flex">
          <div className="flex flex-col">
            <div className="flex bg-base-300">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
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
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  activeTab === 'groups'
                    ? 'bg-base-100 text-primary border-b-2 border-primary'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                <Users className="size-4" />
                Groups
              </button>
            </div>

            <ErrorBoundary>
              {activeTab === 'contacts' ? <Sidebar /> : <GroupSidebar />}
            </ErrorBoundary>
          </div>
        </div>

        {/* Chat column: full width on mobile */}
        <ErrorBoundary>
          <div className="flex-1 min-w-0">
            <ChatContainer />
          </div>
        </ErrorBoundary>
      </div>

      {/* Mobile drawer/overlay for Contacts/Groups */}
      <div
        className={`fixed inset-0 z-50 md:hidden pointer-events-none ${mobilePanelOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 ease-out`}
        aria-hidden={!mobilePanelOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out ${mobilePanelOpen ? 'opacity-100' : 'opacity-0'} pointer-events-auto`}
          onClick={() => setMobilePanelOpen(false)}
        />
        {/* Panel */}
        <div
          className={`absolute inset-y-0 left-0 w-[86%] max-w-[360px] bg-base-200 border-r border-base-300 shadow-xl flex flex-col transform transition-transform duration-300 ease-out pointer-events-auto ${mobilePanelOpen ? 'translate-x-0' : '-translate-x-full'}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between p-3 border-b border-base-300 bg-base-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="font-semibold text-sm">Chats</span>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={() => setMobilePanelOpen(false)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-base-300">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 px-3 py-2 text-sm transition-colors duration-200 ${
                activeTab === 'contacts'
                  ? 'bg-base-100 text-primary border-b-2 border-primary'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
              Contacts
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 px-3 py-2 text-sm transition-colors duration-200 ${
                activeTab === 'groups'
                  ? 'bg-base-100 text-primary border-b-2 border-primary'
                  : 'text-base-content/70 hover:text-base-content'
              }`}
            >
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
