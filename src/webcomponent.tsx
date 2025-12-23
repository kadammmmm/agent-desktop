/**
 * Web Component wrapper for the BS Agent Desktop
 * 
 * This file creates a custom element <bs-agent-desktop> that can be 
 * embedded in the Webex Contact Center Agent Desktop layout.
 * 
 * Usage in Agent Desktop Layout JSON:
 * {
 *   "comp": "md-tab-panel",
 *   "children": [
 *     {
 *       "comp": "bs-agent-desktop"
 *     }
 *   ]
 * }
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import r2wc from '@r2wc/react-to-web-component';
import { CommandCenter } from './components/command-center';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import './index.css';

// Wrapper component that includes all providers
function BSAgentDesktopApp() {
  return (
    <React.StrictMode>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <CommandCenter />
        <Toaster />
      </ThemeProvider>
    </React.StrictMode>
  );
}

// Convert React component to Web Component
const BSAgentDesktop = r2wc(BSAgentDesktopApp, {
  props: {},
  shadow: 'open', // Use shadow DOM for style isolation
});

// Register the custom element
if (!customElements.get('bs-agent-desktop')) {
  customElements.define('bs-agent-desktop', BSAgentDesktop);
}

// Export for manual use
export { BSAgentDesktop, BSAgentDesktopApp };
