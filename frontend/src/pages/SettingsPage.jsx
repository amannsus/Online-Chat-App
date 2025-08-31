import { useState, useEffect } from "react";
import { Palette, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const SettingsPage = () => {
  const [currentTheme, setCurrentTheme] = useState('light');

  const themes = [
    { name: 'light', label: 'Light', colors: ['#3b82f6', '#ec4899', '#14b8a6', '#f3f4f6'] },
    { name: 'dark', label: 'Dark', colors: ['#661ae6', '#d946ef', '#36d399', '#1f2937'] },
    
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (themeName) => {
    try {
      const html = document.documentElement;
      
      html.removeAttribute('data-theme');
      html.setAttribute('data-theme', themeName);
      
      localStorage.setItem('theme', themeName);
      setCurrentTheme(themeName);
      
      toast.success(`${themes.find(t => t.name === themeName)?.label} theme applied!`);
      
      window.dispatchEvent(new Event('themechange'));
    } catch (error) {
      console.error('Error applying theme:', error);
      toast.error('Failed to apply theme');
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content transition-colors duration-300">
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

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Theme</h2>
          <p className="text-base-content/70 text-lg">Choose a theme for your chat interface</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
          {themes.map((theme) => (
            <div
              key={theme.name}
              className={`relative cursor-pointer transition-all duration-300 hover:scale-105 group ${
                currentTheme === theme.name ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100' : ''
              }`}
              onClick={() => handleThemeChange(theme.name)}
            >
              <div className="bg-base-200 rounded-lg p-3 border border-base-300 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                <div className="flex rounded-md overflow-hidden mb-3 h-8 shadow-sm">
                  {theme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 transition-all duration-300"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
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

              <div className="absolute inset-0 bg-primary/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>

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
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
