import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { initAnalytics } from './utils/analytics.js';
import './index.css';

initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
