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

  // Prevent white flash and handle viewport changes for Android
  useEffect(() => {
    // Set initial viewport height for Android
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      setViewportHeight(`${window.innerHeight}px`);
    };

    // Initial set
    setVH();

    // Handle orientation and keyboard changes
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setVH();
        
        // Detect keyboard on mobile
        if (window.innerWidth < 768) {
          const heightDiff = window.screen.height - window.innerHeight;
          setIsKeyboardVisible(heightDiff > 150);
        }
        
        // Auto-close sidebar on resize to desktop
        if (window.innerWidth >= 768) {
          setIsSidebarOpen(true);
          setIsMobileMenuOpen(false);
        } else {
          setIsSidebarOpen(false);
        }
      }, 100);
    };

    // Handle orientation change specifically for mobile
    const handleOrientationChange = () => {
      setTimeout(setVH, 300); // Delay for orientation transition
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Prevent zoom on iOS
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (authUser) {
      connectSocket(authUser._id);
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [authUser, connectSocket]);

  // Handle outside clicks for mobile sidebar - SIMPLIFIED
  useEffect(() => {
    const handleClick = (e) => {
      if (isSidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('.sidebar-container');
        const hamburger = e.target.closest('[data-hamburger]');
        
        if (!sidebar?.contains(e.target) && !hamburger) {
          console.log('Closing sidebar - outside click');
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

  // Prevent body scroll when sidebar is open on mobile
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

  // Memoized components for better performance
  const connectionStatus = useMemo(() => (
    <div className={`flex items-center gap-1 text-xs transition-colors duration-300 ${
      isConnected ? 'text-success' : 'text-error'
    }`}>
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

  const currentChatTitle = useMemo(() => {
    if (selectedContact) return selectedContact.fullName;
    if (selectedGroup) return selectedGroup.name;
    return 'Yap! 🤗';
  }, [selectedContact, selectedGroup]);

  // Loading screen
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
      {/* Enhanced Mobile-First Header */}
      <header className="bg-base-100 border-b border-base-300 sticky top-0 z-50 shadow-lg backdrop-blur-sm bg-base-100/95">
        <div className="flex items-center justify-between p-2 sm:p-3 md:p-4 min-h-[56px]">
          {/* Left Section */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* HAMBURGER MENU - FIXED VERSION */}
            <div 
              className="md:hidden p-2 cursor-pointer hover:bg-base-300 rounded-lg active:bg-base-200 transition-colors"
              onClick={() => {
                console.log('HAMBURGER CLICKED! Current state:', isSidebarOpen);
                setIsSidebarOpen(prev => {
                  const newState = !prev;
                  console.log('Setting sidebar to:', newState);
                  return newState;
                });
              }}
              onTouchStart={() => {
                console.log('HAMBURGER TOUCHED!');
              }}
              data-hamburger="true"
              style={{ 
                zIndex: 9999,
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Menu className="w-6 h-6 text-base-content" />
            </div>
            
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="size-8 sm:size-9 md:size-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                {authUser.profilePic ? (
                  <img 
                    src={authUser.profilePic} 
                    alt={authUser.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-primary-content font-bold text-sm md:text-base">
                    {authUser.fullName?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base md:text-lg font-bold truncate">
                  {currentChatTitle}
                </h1>
                {connectionStatus}
              </div>
            </div>
          </div>

          {/* Right Section - Desktop Menu */}
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
            <button 
              className="btn btn-sm gap-2 btn-error hover:scale-105 transition-transform" 
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
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

        {/* Mobile Dropdown Menu with smooth animation */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isMobileMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="border-t border-base-300 bg-base-100/95 backdrop-blur-sm">
            <div className="p-3 space-y-1">
              <Link 
                to="/" 
                className="btn btn-block btn-sm justify-start gap-3 hover:scale-[1.02] transition-transform" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link 
                to="/settings" 
                className="btn btn-block btn-sm justify-start gap-3 hover:scale-[1.02] transition-transform" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
              <Link 
                to="/profile" 
                className="btn btn-block btn-sm justify-start gap-3 hover:scale-[1.02] transition-transform" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <button 
                className="btn btn-block btn-sm justify-start gap-3 text-error hover:bg-error/10 hover:scale-[1.02] transition-all" 
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar - COMPLETELY REWRITTEN FOR MOBILE */}
        <div className={`
          sidebar-container
          fixed md:static
          top-0 left-0
          w-80 max-w-[90vw]
          h-screen
          bg-base-200
          border-r border-base-300
          z-50
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative md:z-auto
        `}>
          {/* Add padding for mobile header */}
          <div className="md:hidden h-16"></div>
          
          {/* Sidebar Content */}
          <div className="h-full overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex bg-base-300 border-b border-base-300">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'contacts' 
                    ? 'bg-base-100 text-primary border-b-2 border-primary' 
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="size-4" />
                  Contacts
                </div>
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'groups' 
                    ? 'bg-base-100 text-primary border-b-2 border-primary' 
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="size-4" />
                  Groups
                </div>
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <ErrorBoundary>
                {activeTab === 'contacts' ? <Sidebar /> : <GroupSidebar />}
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Mobile Overlay - SIMPLIFIED */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => {
              console.log('Overlay clicked - closing sidebar');
              setIsSidebarOpen(false);
            }}
          />
        )}

        {/* Chat Container with keyboard-aware height */}
        <main 
          className="flex-1 min-w-0 bg-base-100 relative overflow-hidden"
          style={{ 
            height: isKeyboardVisible ? 'auto' : `calc(${viewportHeight} - 56px)`,
            minHeight: isKeyboardVisible ? '300px' : 'auto'
          }}
        >
          <ErrorBoundary>
            <ChatContainer />
          </ErrorBoundary>
        </main>
      </div>

      {/* Enhanced Styles for Android Optimization */}
      <style jsx>{`
        /* Smooth animations optimized for mobile */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        input, textarea {
          -webkit-user-select: text;
          -khtml-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }

        /* Prevent zoom on iOS */
        input[type="text"], 
        input[type="email"], 
        input[type="password"],
        textarea,
        select {
          font-size: 16px !important;
          transform: translateZ(0);
        }

        /* Hardware acceleration for smooth animations */
        .sidebar-container,
        .btn {
          -webkit-transform: translateZ(0);
          -moz-transform: translateZ(0);
          -ms-transform: translateZ(0);
          -o-transform: translateZ(0);
          transform: translateZ(0);
        }

        /* Smooth scrolling for Android */
        * {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }

        /* Prevent rubber band effect on iOS */
        body {
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }

        /* Button active states for better mobile feedback */
        .btn:active {
          transform: scale(0.95);
          transition: transform 0.1s;
        }

        /* Enhanced focus states for accessibility */
        .btn:focus-visible {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }

        /* Optimize for dark mode on Android */
        @media (prefers-color-scheme: dark) {
          meta[name="theme-color"] {
            content: hsl(var(--b2));
          }
        }

        /* Handle safe area insets for newer phones */
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
        }
        
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        .safe-area-left {
          padding-left: env(safe-area-inset-left);
        }
        
        .safe-area-right {
          padding-right: env(safe-area-inset-right);
        }

        /* Prevent flash of unstyled content */
        .App {
          visibility: visible;
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }

        /* Custom scrollbar for better mobile experience */
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: hsl(var(--base-content) / 0.2);
          border-radius: 2px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--base-content) / 0.4);
        }

        /* Optimize animations for low-end devices */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .border-base-300 {
            border-width: 2px;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatPage;
