/**
 * EchoFootPrint Dashboard - Main Entry Point
 * React 18 application with D3.js visualization
 * Per PRD: <1s load for ≤1k records
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// Initialize database connection
import { initDatabase } from './utils/db.js';

// Performance monitoring
const startTime = performance.now();

// Initialize app
async function init() {
  try {
    // Initialize IndexedDB
    await initDatabase();

    const loadTime = performance.now() - startTime;
    console.log(`Database initialized in ${Math.round(loadTime)}ms`);

    // Render React app
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    const totalLoadTime = performance.now() - startTime;
    console.log(`Dashboard loaded in ${Math.round(totalLoadTime)}ms`);

    // Warn if load time exceeds 1s (per PRD)
    if (totalLoadTime > 1000) {
      console.warn(
        `Dashboard load time exceeded 1s target: ${Math.round(totalLoadTime)}ms`
      );
    }
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);

    // Show error message to user
    document.getElementById('root').innerHTML = `
      <div style="text-align: center; padding: 50px; color: #ff6b6b;">
        <h1>Failed to Load Dashboard</h1>
        <p>${error.message}</p>
        <p style="font-size: 14px; color: #999;">
          Try refreshing the page. If the problem persists, please report it on GitHub.
        </p>
      </div>
    `;
  }
}

init();
