import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Calendar, Shield } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      
      // Send base64 directly to backend (matches your controller)
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white">
      <div className="relative z-10 flex items-center justify-center min-h-screen py-12 px-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-black/20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-indigo-200 bg-clip-text text-transparent mb-2">
                Your Profile
              </h1>
              <p className="text-indigo-300 text-lg">Manage your account and personal settings</p>
            </div>

            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center mb-12">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <img
                  src={selectedImg || authUser?.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="relative w-40 h-40 rounded-full object-cover border-4 border-white/20"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-2 right-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 p-3 rounded-full cursor-pointer transition-all duration-300 transform hover:scale-110 shadow-xl ${
                    isUpdatingProfile ? "animate-pulse pointer-events-none opacity-70" : ""
                  }`}
                >
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>
              <p className="mt-4 text-sm text-indigo-300">
                {isUpdatingProfile ? "Uploading your photo..." : "Click the camera icon to update your photo"}
              </p>
            </div>

            {/* User Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
                  <User className="w-5 h-5" />
                  Full Name
                </label>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-white text-lg font-medium">
                    {authUser?.fullName || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-indigo-300 text-sm font-semibold">
                  <Mail className="w-5 h-5" />
                  Email Address
                </label>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-white text-lg font-medium">
                    {authUser?.email || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Information Panel */}
            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h2 className="flex items-center gap-2 text-xl font-bold text-indigo-200 mb-6">
                <Shield className="w-6 h-6" />
                Account Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-300" />
                    <span className="text-gray-300">Member Since</span>
                  </div>
                  <span className="text-white font-semibold">
                    {authUser?.createdAt ? new Date(authUser.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : "Unknown"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-300">Account Status</span>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
