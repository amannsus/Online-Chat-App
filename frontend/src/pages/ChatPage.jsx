import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import Sidebar from '../components/Sidebar';
import GroupSidebar from '../components/GroupSidebar';
import ChatContainer from '../components/ChatContainer';
import ErrorBoundary from '../components/ErrorBoundary';
import { Settings, User, LogOut, MessageSquare, Users, Home, Menu, X, Wifi, WifiOff } from "lucide-react";

const ChatPage = () => {
  const { authUser, logout } = useAuthStore();
  const { connectSocket, isConnected, selectedContact, selectedGroup } = useChatStore();
  const [activeTab, setActiveTab] = useState('contacts');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState('100vh');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Active chat info (show friend/group in header)
  const activeChat = selectedContact || selectedGroup;
  const activeAvatar = selectedGroup?.avatar || selectedContact?.profilePic || authUser?.profilePic || '';
  const activeTitle = useMemo(() => {
    if (selectedContact) return selectedContact.fullName || 'Chat';
    if (selectedGroup) return selectedGroup.name || 'Group';
    return 'Yap! 🤗';
  }, [selectedContact, selectedGroup]);
  // End active chat info

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setViewportHeight(`${window.innerHeight}px`);
    };
    setVH();

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setVH();
        if (window.innerWidth < 768) {
          const heightDiff = window.screen.height - window.innerHeight;
          setIsKeyboardVisible(heightDiff > 150);
        }
        if (window.innerWidth >= 768) {
          setIsSidebarOpen(true);
          setIsMobileMenuOpen(false);
        } else {
          setIsSidebarOpen(false);
        }
      }, 100);
    };

    const handleOrientationChange = () => setTimeout(setVH, 300);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    if (authUser) {
      connectSocket(authUser._id);
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [authUser, connectSocket]);

  useEffect(() => {
    const handleClick = (e) => {
      if (isSidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('.sidebar-container');
        const hamburger = e.target.closest('[data-hamburger]');
        if (!sidebar?.contains(e.target) && !hamburger) {
          setIsSidebarOpen(false);
        }
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isSidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isSidebarOpen]);

  const connectionStatus = useMemo(() => (
    <div className={`flex items-center gap-1 text-xs transition-colors duration-300 ${isConnected ? 'text-success' : 'text-error'}`}>
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  ), [isConnected]);

  if (isLoading || !authUser) {
    return (
      <div
        className="flex items-center justify-center bg-base-200 transition-all duration-300"
        style={{ height: viewportHeight }}
      >
        <div className="text-center p-4 animate-pulse">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-primary animate-bounce" />
          </div>
          <h2 className="text-xl font-semibold text-base-content">Loading Yap!</h2>
          <p className="text-base-content/60 mt-2">Getting things ready...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-base-200 flex flex-col relative overflow-hidden"
      style={{ height: viewportHeight }}
    >
      {/* Header shows active chat (friend/group) */}
      <header className="bg-base-100 border-b border-base-300 sticky top-0 z-50 shadow-lg backdrop-blur-sm bg-base-100/95">
        <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 min-h-[56px]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="md:hidden p-2 cursor-pointer hover:bg-base-300 rounded-lg active:bg-base-200 transition-colors"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              data-hamburger="true"
              style={{ zIndex: 9999, minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Menu className="w-6 h-6 text-base-content" />
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="size-8 sm:size-9 md:size-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg overflow-hidden">
                {activeAvatar ? (
                  <img src={activeAvatar} alt="chat avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-content font-bold text-sm md:text-base">
                    {(selectedGroup ? selectedGroup.name?.charAt(0) : selectedContact?.fullName?.charAt(0)) || (authUser.fullName?.charAt(0) || 'U')}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base md:text-lg font-bold truncate">
                  {activeTitle}
                </h1>
                {connectionStatus}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <Link to="/" className="btn btn-sm gap-2 hover:scale-105 transition-transform">
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <Link to="/settings" className="btn btn-sm gap-2 hover:scale-105 transition-transform">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
            <Link to="/profile" className="btn btn-sm gap-2 hover:scale-105 transition-transform">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>
            <button className="btn btn-sm gap-2 btn-error hover:scale-105 transition-transform" onClick={logout}>
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          <button
            className="lg:hidden btn btn-ghost btn-sm btn-square hover:scale-105 active:scale-95 transition-transform"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="border-t border-base-300 bg-base-100/95 backdrop-blur-sm">
            <div className="p-3 space-y-1">
              <Link to="/" className="btn btn-block btn-sm justify-start gap-3 hover:scale-[1.02] transition-transform" onClick={() => setIsMobileMenuOpen(false)}>
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link to="/settings" className="btn btn-block btn-sm justify-start gap-3 hover:scale-[1.02] transition-transform" onClick={() => setIsMobileMenuOpen(false)}>
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <Link to="/profile" className="btn btn-block btn-sm justify-start gap-3 hover:scale-[1.02] transition-transform" onClick={() => setIsMobileMenuOpen(false)}>
                <User className="w-4 h-4" />
                Profile
              </Link>
              <button className="btn btn-block btn-sm justify-start gap-3 text-error hover:bg-error/10 hover:scale-[1.02] transition-all" onClick={logout}>
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar with pointer-events guard when hidden */}
        <div
          className={`
            sidebar-container
            fixed md:static
            top-0 left-0
            w-80 max-w-[90vw]
            h-screen
            bg-base-200
            border-r border-base-300
            z-50
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'}
            md:translate-x-0 md:relative md:z-auto md:pointer-events-auto
          `}
          aria-hidden={window.innerWidth < 768 ? !isSidebarOpen : false}
        >
          <div className="md:hidden h-16" />
          <div className="h-full overflow-hidden flex flex-col">
            <div className="flex bg-base-300 border-b border-base-300">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'contacts' ? 'bg-base-100 text-primary border-b-2 border-primary' : 'text-base-content/70 hover:text-base-content'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="size-4" />
                  Contacts
                </div>
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeTab === 'groups' ? 'bg-base-100 text-primary border-b-2 border-primary' : 'text-base-content/70 hover:text-base-content'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="size-4" />
                  Groups
                </div>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary>
                {activeTab === 'contacts' ? <Sidebar /> : <GroupSidebar />}
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main
          className="flex-1 min-w-0 bg-base-100 relative overflow-hidden"
          style={{ height: isKeyboardVisible ? 'auto' : `calc(${viewportHeight} - 56px)`, minHeight: isKeyboardVisible ? '300px' : 'auto' }}
        >
          <ErrorBoundary>
            <ChatContainer />
          </ErrorBoundary>
        </main>
      </div>

      <style jsx>{`
        * { -webkit-tap-highlight-color: transparent; }
        input, textarea { user-select: text; }
        .sidebar-container, .btn { transform: translateZ(0); }
        * { -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
        body { overscroll-behavior: none; -webkit-overflow-scrolling: touch; }
        .btn:active { transform: scale(0.95); transition: transform 0.1s; }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default ChatPage;
