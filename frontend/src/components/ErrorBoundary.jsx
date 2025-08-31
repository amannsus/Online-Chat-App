import React from 'react';
import toast from 'react-hot-toast';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorCount: 0,
      lastError: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Prevent infinite loops
    const now = Date.now();
    if (this.state.lastError && (now - this.state.lastError) < 5000) {
      return;
    }
    
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1,
      lastError: now
    }));

    // Show user-friendly error messages
    if (this.state.errorCount < 3) {
      if (error.message.includes('filter') || error.message.includes('map')) {
        toast.error('Loading data... Please wait');
      } else if (error.message.includes('socket') || error.message.includes('connection')) {
        toast.error('Connecting to server...');
      } else {
        toast.error('Something went wrong. Retrying...');
      }
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorCount: 0,
      lastError: null 
    });
  }

  handleRefresh = () => {
    // Clear localStorage except theme
    try {
      const theme = localStorage.getItem('theme');
      localStorage.clear();
      if (theme) localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('Could not clear localStorage:', e);
    }
    
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4 bg-base-100">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🔄</div>
            <h2 className="text-lg font-semibold text-primary mb-2">
              Starting up...
            </h2>
            <p className="text-base-content/70 mb-4 text-sm">
              The app is loading. This may take a moment.
            </p>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={this.handleRetry}
                className="btn btn-primary btn-sm"
              >
                Try Again
              </button>
              
              {this.state.errorCount > 2 && (
                <button 
                  onClick={this.handleRefresh}
                  className="btn btn-outline btn-sm"
                >
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
