import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";

const HomePage = () => {
  const { logout, authUser } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <MessageSquare className="size-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">ChatApp</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Profile Section with Avatar */}
            <div className="flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2 hover:bg-white/10 p-2 rounded-lg transition-colors">
                <div className="size-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  {authUser?.profilePic ? (
                    <img 
                      src={authUser.profilePic} 
                      alt="Profile" 
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <User className="size-6 text-white" />
                  )}
                </div>
                <span className="text-gray-300 font-medium">{authUser?.fullName}</span>
              </Link>
              
              {/* Settings Button */}
              <Link 
                to="/settings" 
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="size-5 text-gray-400 hover:text-white" />
              </Link>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="size-4" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Welcome to your Dashboard!</h2>
          <p className="text-gray-300 text-lg mb-8">
            You have successfully signed up and logged in.
          </p>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {/* Profile Card */}
            <Link to="/profile" className="group">
              <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                <div className="size-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <User className="size-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Profile</h3>
                <p className="text-gray-400">View and edit your profile</p>
              </div>
            </Link>

            {/* Settings Card */}
            <Link to="/settings" className="group">
              <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                <div className="size-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                  <Settings className="size-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Settings</h3>
                <p className="text-gray-400">Customize your preferences</p>
              </div>
            </Link>

            {/* Chat Card - UPDATED TO LINK TO /chat */}
            <Link to="/chat" className="group">
              <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 group-hover:scale-105">
                <div className="size-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                  <MessageSquare className="size-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Start Chatting</h3>
                <p className="text-gray-400">Connect with your friends</p>
              </div>
            </Link>
          </div>

          {/* User Info Card */}
          <div className="mt-8 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4">Your Information</h3>
            <div className="space-y-2">
              <p className="text-gray-300"><span className="font-medium">Name:</span> {authUser?.fullName}</p>
              <p className="text-gray-300"><span className="font-medium">Email:</span> {authUser?.email}</p>
              <p className="text-gray-300"><span className="font-medium">Joined:</span> {new Date(authUser?.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
