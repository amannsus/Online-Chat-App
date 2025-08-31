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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (authUser) {
      connectSocket(authUser._id);
    }
  }, [authUser, connectSocket]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isSidebarOpen && !e.target.closest('.sidebar-container') && !e.target.closest('.sidebar-toggle')) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSidebarOpen]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
        setIsMobileMenuOpen(false);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!authUser) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-base-200">
        <div className="text-center p-4">
          <h2 className="text-xl font-semibold">Please log in to access chat</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-base-200 flex flex-col">
      {/* Enhanced Mobile-Friendly Header */}
      <header className="bg-base-100 border-b border-base-300 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between p-3 md:p-4">
          {/* Left Section */}
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              className="sidebar-toggle md:hidden btn btn-ghost btn-sm btn-square"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="size-8 md:size-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold text-sm md:text-base">
                  {authUser.fullName?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-base md:text-lg font-semibold">Yap!🤗</h1>
                <div className={`text-xs ${isConnected ? 'text-success' : 'text-error'}`}>
                  {isConnected ? '● Connected' : '○ Disconnected'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Desktop Menu */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/" className="btn btn-sm gap-2">
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link to="/settings" className="btn btn-sm gap-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
            <Link to="/profile" className="btn btn-sm gap-2">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>
            <button className="btn btn-sm gap-2" onClick={logout}>
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden btn btn-ghost btn-sm btn-square"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-base-300 bg-base-100 animate-slide-down">
            <div className="p-3 space-y-2">
              <Link to="/" className="btn btn-block btn-sm justify-start gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link to="/settings" className="btn btn-block btn-sm justify-start gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <Link to="/profile" className="btn btn-block btn-sm justify-start gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <User className="w-4 h-4" />
                Profile
              </Link>
              <button className="btn btn-block btn-sm justify-start gap-2 text-error" onClick={logout}>
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar with Mobile Overlay */}
        <aside className={`
          sidebar-container
          fixed md:relative
          top-[57px] md:top-0
          left-0
          h-[calc(100dvh-57px)] md:h-full
          w-72 md:w-80
          bg-base-200
          border-r border-base-300
          z-40
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Tab Navigation */}
          <div className="flex bg-base-300 sticky top-0 z-10">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'contacts'
                  ? 'bg-base-100 text-primary border-b-2 border-primary'
                  : 'text-base-content/70 hover:text-base-content hover:bg-base-100/50'
              }`}
            >
              <MessageSquare className="size-4" />
              <span>Contacts</span>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === 'groups'
                  ? 'bg-base-100 text-primary border-b-2 border-primary'
                  : 'text-base-content/70 hover:text-base-content hover:bg-base-100/50'
              }`}
            >
              <Users className="size-4" />
              <span>Groups</span>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="h-[calc(100%-41px)] overflow-hidden">
            {activeTab === 'contacts' ? (
              <ErrorBoundary>
                <div className="h-full" onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
                  <Sidebar />
                </div>
              </ErrorBoundary>
            ) : (
              <ErrorBoundary>
                <div className="h-full" onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}>
                  <GroupSidebar />
                </div>
              </ErrorBoundary>
            )}
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-30 top-[57px]"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Chat Container */}
        <main className="flex-1 min-w-0 bg-base-100">
          <ErrorBoundary>
            <ChatContainer />
          </ErrorBoundary>
        </main>
      </div>

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }

        /* Prevent body scroll on mobile when sidebar is open */
        ${isSidebarOpen && `
          @media (max-width: 767px) {
            body {
              overflow: hidden;
            }
          }
        `}
      `}</style>
    </div>
  );
};

export default ChatPage;
