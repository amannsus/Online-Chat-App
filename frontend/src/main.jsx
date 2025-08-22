import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";

const initializeTheme = () => {
  try {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const html = document.documentElement;
    
    html.removeAttribute('data-theme');
    html.setAttribute('data-theme', savedTheme);
  } catch (error) {
    console.error('Error initializing theme:', error);
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

initializeTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
