/**
 * Web Component wrapper for the BS Agent Desktop
 * 
 * This file creates a custom element <bs-agent-desktop> that can be 
 * embedded in the Webex Contact Center Agent Desktop layout.
 * 
 * CSS is inlined into the Shadow DOM for complete style isolation.
 * 
 * Usage in Agent Desktop Layout JSON:
 * {
 *   "comp": "agentx-wc-iframe",
 *   "script": "https://your-domain.com/bs-agent-desktop.js",
 *   "properties": {
 *     "webComponent": "bs-agent-desktop"
 *   }
 * }
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { CommandCenter } from './components/command-center';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from 'next-themes';

// Import CSS as inline string for Shadow DOM injection
import styles from './index.css?inline';

// Main App component with all providers
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

// Custom Web Component class that injects CSS into Shadow DOM
class BSAgentDesktopElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private mountPoint: HTMLDivElement | null = null;

  connectedCallback() {
    // Create Shadow DOM for style isolation
    const shadow = this.attachShadow({ mode: 'open' });

    // Inject all styles into the Shadow DOM
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    shadow.appendChild(styleSheet);

    // Create a container div for the React app
    this.mountPoint = document.createElement('div');
    this.mountPoint.id = 'bs-agent-desktop-root';
    this.mountPoint.style.width = '100%';
    this.mountPoint.style.height = '100%';
    shadow.appendChild(this.mountPoint);

    // Mount the React application
    this.root = ReactDOM.createRoot(this.mountPoint);
    this.root.render(<BSAgentDesktopApp />);

    console.log('[BS Agent Desktop] Web component mounted with inline styles');
  }

  disconnectedCallback() {
    // Cleanup React when element is removed
    if (this.root) {
      this.root.unmount();
      this.root = null;
      console.log('[BS Agent Desktop] Web component unmounted');
    }
  }
}

// Register the custom element
if (!customElements.get('bs-agent-desktop')) {
  customElements.define('bs-agent-desktop', BSAgentDesktopElement);
}

// Export for manual use
export { BSAgentDesktopElement, BSAgentDesktopApp };
