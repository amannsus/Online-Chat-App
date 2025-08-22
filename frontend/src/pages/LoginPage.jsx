import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader2, Settings } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoggingIn, authUser } = useAuthStore();


  if (authUser) {
    return <Navigate to="/home" replace />;
  }

  const validateForm = () => {
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) login(formData);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden">
        {/* Settings Button - Top Right */}
        <Link 
          to="/settings" 
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
        >
          <Settings className="size-4" />
          Settings
        </Link>

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Logo section */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-16 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-2xl">
                <MessageSquare className="size-8 text-white drop-shadow-lg" />
              </div>
              <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-gray-400">
                Sign in to your account
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="form-control group">
              <label className="label">
                <span className="label-text font-medium text-gray-300">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="size-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-12 pr-4 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-white/10"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-control group">
              <label className="label">
                <span className="label-text font-medium text-gray-300">Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="size-5 text-gray-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-12 pr-12 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-white/10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-gray-500 hover:text-purple-400" />
                  ) : (
                    <Eye className="size-5 text-gray-500 hover:text-purple-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white font-semibold py-3 rounded-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-purple-400 hover:text-purple-300 font-medium hover:underline"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm">
        <div className="text-center z-10 px-8">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
              <MessageSquare className="size-16 text-white/80" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-md">
            Sign in to continue your conversations and stay connected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
