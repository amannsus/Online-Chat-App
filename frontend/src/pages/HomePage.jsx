import React from "react";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";

const HomePage = () => {
  const { logout, authUser } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 pt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mt-4">Welcome to Yap! 🤗</h1>
            <p className="mt-4 text-base-content/60">
              You have successfully signed up and logged in.
            </p>
          </div>

          <div className="mt-12">
            <h2 className="text-xl font-semibold text-center mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Link
                to="/profile"
                className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="card-body items-center text-center">
                  <User className="w-8 h-8 text-primary" />
                  <h2 className="card-title">Profile</h2>
                  <p>View and edit your profile</p>
                </div>
              </Link>

              <Link
                to="/settings"
                className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="card-body items-center text-center">
                  <Settings className="w-8 h-8 text-primary" />
                  <h2 className="card-title">Settings</h2>
                  <p>Customize your preferences</p>
                </div>
              </Link>

              <Link
                to="/chat"
                className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="card-body items-center text-center">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  <h2 className="card-title">Chat</h2>
                  <p>Connect with your friends</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button onClick={handleLogout} className="btn btn-outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
