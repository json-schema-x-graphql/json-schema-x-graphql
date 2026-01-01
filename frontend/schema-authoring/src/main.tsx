/**
 * Main Entry Point
 *
 * Initializes React application and renders the root component.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize React root
const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found. Make sure index.html has a div with id="root"');
}

// Render application
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hot module replacement for development
if (import.meta.hot) {
  import.meta.hot.accept();
}
