import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext'; // <-- IMPORT

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* <-- WRAP HERE */}
      <App />
      <Toaster position="bottom-right" richColors />
    </AuthProvider> {/* <-- AND HERE */}
  </React.StrictMode>
);