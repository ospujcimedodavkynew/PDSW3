import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './services/supabaseClient'; // Ensure Supabase is initialized
// FIX: Removed .tsx from import path for DataContext.
import './contexts/DataContext'; // Ensure the context file is part of the bundle

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);