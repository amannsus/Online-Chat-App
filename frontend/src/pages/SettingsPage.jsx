import { useState, useEffect } from "react";
import { Palette, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SettingsPage = () => {
  const [currentTheme, setCurrentTheme] = useState('light');

  const themes = [
    { name: 'light', label: 'Light', colors: ['#3b82f6', '#ec4899', '#14b8a6', '#f3f4f6'] },
    { name: 'dark', label: 'Dark', colors: ['#661ae6', '#d946ef', '#36d399', '#1f2937'] },
    { name: 'cupcake', label: 'Cupcake', colors: ['#65c3c8', '#ef9fbc', '#eeaf3a', '#291334'] },
    { name: 'bumblebee', label: 'Bumblebee', colors: ['#e0a82e', '#f9d72f', '#18eaef', '#181830'] },
    { name: 'emerald', label: 'Emerald', colors: ['#66cc8a', '#377cfb', '#ea5234', '#333c4d'] },
    { name: 'corporate', label: 'Corporate', colors: ['#4b6bfb', '#7b92b2', '#67cba0', '#181a2a'] },
    { name: 'synthwave', label: 'Synthwave', colors: ['#e779c1', '#58c7f3', '#f3cc30', '#1a103d'] },
    { name: 'retro', label: 'Retro', colors: ['#ef9995', '#a4cbb4', '#dc8850', '#2e282a'] },
    { name: 'cyberpunk', label: 'Cyberpunk', colors: ['#ff7598', '#75d1f0', '#c7f59b', '#423306'] },
    { name: 'valentine', label: 'Valentine', colors: ['#e96d7b', '#a991f7', '#66b2b5', '#af4670'] },
    { name: 'halloween', label: 'Halloween', colors: ['#f28c18', '#6d3a9c', '#51a800', '#212529'] },
    { name: 'garden', label: 'Garden', colors: ['#5c7f67', '#ecf4e7', '#9ca3af', '#1f2937'] },
    { name: 'forest', label: 'Forest', colors: ['#1eb854', '#1fd65f', '#1bc973', '#171212'] },
    { name: 'aqua', label: 'Aqua', colors: ['#09ecf3', '#966fb3', '#ffe999', '#3c4142'] },
    { name: 'lofi', label: 'Lofi', colors: ['#0d0d0d', '#1a1a1a', '#262626', '#0a0a0a'] },
    { name: 'pastel', label: 'Pastel', colors: ['#d1c1d7', '#f6cbd1', '#b4e7ce', '#6d28d9'] },
    { name: 'fantasy', label: 'Fantasy', colors: ['#6e0b75', '#009ffd', '#fcee21', '#1f2937'] },
    { name: 'wireframe', label: 'Wireframe', colors: ['#b8b8b8', '#b8b8b8', '#b8b8b8', '#b8b8b8'] },
    { name: 'black', label: 'Black', colors: ['#373737', '#373737', '#373737', '#000000'] },
    { name: 'luxury', label: 'Luxury', colors: ['#ffffff', '#152747', '#513448', '#09090b'] },
    { name: 'dracula', label: 'Dracula', colors: ['#ff6bcb', '#8be9fd', '#ffb86c', '#282a36'] },
    { name: 'cmyk', label: 'Cmyk', colors: ['#179299', '#e11d74', '#f9d71c', '#27272a'] },
    { name: 'autumn', label: 'Autumn', colors: ['#8c0327', '#d85251', '#7cc7d0', '#1f2937'] },
    { name: 'business', label: 'Business', colors: ['#1c4ed8', '#dc2626', '#059669', '#1f2937'] },
    { name: 'acid', label: 'Acid', colors: ['#ff00ff', '#ffff00', '#00ffff', '#000000'] },
    { name: 'lemonade', label: 'Lemonade', colors: ['#519903', '#e9e92f', '#af4670', '#1f2937'] },
    { name: 'night', label: 'Night', colors: ['#38bdf8', '#818cf8', '#f471b5', '#0f172a'] },
    { name: 'coffee', label: 'Coffee', colors: ['#db924b', '#263e3f', '#617a55', '#20161f'] },
    { name: 'winter', label: 'Winter', colors: ['#047aed', '#463aa2', '#c148ac', '#ffffff'] },
    { name: 'dim', label: 'Dim', colors: ['#9ca3af', '#fbbf24', '#34d399', '#1f2937'] },
    { name: 'nord', label: 'Nord', colors: ['#5e81ac', '#bf616a', '#a3be8c', '#2e3440'] },
    { name: 'sunset', label: 'Sunset', colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#2c2c54'] }
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
  }, []);

  const handleThemeChange = (themeName) => {
    // Apply theme instantly
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Save to localStorage for persistence
    localStorage.setItem('theme', themeName);
    
    // Update state
    setCurrentTheme(themeName);
    
    // Show feedback
    toast.success(`${themes.find(t => t.name === themeName)?.label} theme applied!`);
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content transition-colors duration-300">
      {/* Header */}
      <div className="navbar bg-base-200 shadow-sm">
        <div className="navbar-start">
          <Link to="/" className="btn btn-ghost btn-sm gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
        <div className="navbar-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Settings
          </h1>
        </div>
        <div className="navbar-end"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Theme Section Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Theme</h2>
          <p className="text-base-content/70 text-lg">Choose a theme for your chat interface</p>
        </div>
        
        {/* Theme Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
          {themes.map((theme) => (
            <div
              key={theme.name}
              className={`relative cursor-pointer transition-all duration-300 hover:scale-105 group ${
                currentTheme === theme.name ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''
              }`}
              onClick={() => handleThemeChange(theme.name)}
            >
              {/* Theme Preview Card */}
              <div className="bg-base-200 rounded-lg p-3 border border-base-300 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                {/* Color Swatches */}
                <div className="flex rounded-md overflow-hidden mb-3 h-8 shadow-sm">
                  {theme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 transition-all duration-300"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                {/* Theme Name & Check */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-base-content group-hover:text-primary transition-colors">
                    {theme.label}
                  </span>
                  {currentTheme === theme.name && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-pulse">
                      <Check className="w-3 h-3 text-primary-content" />
                    </div>
                  )}
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Current Theme Info */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary-content" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Current Theme</h3>
              <p className="text-base-content/70">
                You have selected <span className="font-semibold text-primary capitalize">
                  {themes.find(t => t.name === currentTheme)?.label}
                </span> theme
              </p>
            </div>
          </div>
          
          <div className="text-sm text-base-content/60">
            <p className="mb-2">✅ Theme applied across all pages</p>
            <p className="mb-2">✅ Automatically saved to your browser</p>
            <p>✅ Persists after refresh and restart</p>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <div className="badge badge-primary">Auto-saved</div>
            <div className="badge badge-secondary">Real-time</div>
            <div className="badge badge-accent">Persistent</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
