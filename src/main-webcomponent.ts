/**
 * Entry point for Web Component build
 * 
 * This file is the entry point when building the widget for 
 * embedding in Webex Contact Center Agent Desktop.
 * 
 * Build command: npm run build:widget
 * Output: dist/bs-agent-desktop.js
 * 
 * Include in Agent Desktop:
 * 1. Host the built JS file
 * 2. Add script tag to layout
 * 3. Use <bs-agent-desktop> element in layout JSON
 */

// Import and register the web component
import './webcomponent';

// Log registration
console.log('[BS Agent Desktop] Web component registered as <bs-agent-desktop>');
console.log('[BS Agent Desktop] SDK Version: 1.0.0');
console.log('[BS Agent Desktop] Build:', import.meta.env.MODE);
