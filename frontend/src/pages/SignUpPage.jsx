import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { MessageSquare, User, Mail, Lock, Eye, EyeOff, Loader2, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const { signup, isSigningUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Full name is required");
    if (!formData.email.trim()) return toast.error("Email is required");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Invalid email format");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) signup(formData);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Left side - Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-hidden">
        {/* Settings Button - Top Right Corner */}
        <Link 
          to="/settings" 
          className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20"
        >
          <Settings className="size-4" />
          Settings
        </Link>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/3 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl animate-pulse delay-300"></div>
          <div className="absolute bottom-1/4 left-1/4 w-16 h-16 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-700"></div>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Logo section with enhanced animations */}
          <div className="text-center mb-8 animate-fade-in-down">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-16 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ease-out border border-white/10 shadow-2xl">
                <MessageSquare className="size-8 text-white drop-shadow-lg animate-bounce-subtle" />
              </div>
              <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent animate-gradient">
                Create Account
              </h1>
              <p className="text-gray-400 animate-fade-in-up delay-300">
                Get started with your free account
              </p>
            </div>
          </div>

          {/* Form with staggered animations */}
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up delay-500">
            {/* Full Name Field */}
            <div className="form-control group">
              <label className="label">
                <span className="label-text font-medium text-gray-300 group-focus-within:text-purple-400 transition-colors">
                  Full Name
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="size-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-12 pr-4 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:bg-white/10"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-control group animate-fade-in-up delay-700">
              <label className="label">
                <span className="label-text font-medium text-gray-300 group-focus-within:text-purple-400 transition-colors">
                  Email
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="size-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" />
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
            <div className="form-control group animate-fade-in-up delay-900">
              <label className="label">
                <span className="label-text font-medium text-gray-300 group-focus-within:text-purple-400 transition-colors">
                  Password
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="size-5 text-gray-500 group-focus-within:text-purple-400 transition-colors duration-300" />
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
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-110 transition-transform duration-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-gray-500 hover:text-purple-400 transition-colors" />
                  ) : (
                    <Eye className="size-5 text-gray-500 hover:text-purple-400 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSigningUp}
              className="btn w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white font-semibold py-3 rounded-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed animate-fade-in-up delay-1100"
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <div className="ml-2 transform group-hover:translate-x-1 transition-transform duration-200">→</div>
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div className="text-center animate-fade-in-up delay-1300">
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-purple-400 hover:text-purple-300 font-medium hover:underline transition-all duration-200 transform hover:scale-105 inline-block"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Enhanced visual */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm">
        {/* Animated background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
          <div className="absolute top-1/4 right-20 w-1 h-1 bg-purple-400/40 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-white/10 rounded-full animate-ping delay-700"></div>
        </div>

        <div className="text-center z-10 animate-fade-in-right delay-1000 px-8">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 animate-float">
              <MessageSquare className="size-16 text-white/80" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Join our community
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-md">
            Connect with friends, share moments, and stay in touch with your loved ones.
          </p>
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-fade-in-down {
          animation: fade-in-down 0.6s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        
        .animate-fade-in-right {
          animation: fade-in-right 0.6s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .delay-300 {
          animation-delay: 300ms;
        }
        
        .delay-500 {
          animation-delay: 500ms;
        }
        
        .delay-700 {
          animation-delay: 700ms;
        }
        
        .delay-900 {
          animation-delay: 900ms;
        }
        
        .delay-1100 {
          animation-delay: 1100ms;
        }
        
        .delay-1300 {
          animation-delay: 1300ms;
        }
      `}</style>
    </div>
  );
};

export default SignUpPage;
