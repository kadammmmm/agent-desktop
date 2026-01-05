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

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DemoProvider } from './contexts/DemoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CommandCenter } from './components/command-center';
import { Toaster } from './components/ui/sonner';

// Import CSS as inline string for Shadow DOM injection
import styles from './index.css?inline';

// Create a QueryClient instance for the widget
const queryClient = new QueryClient();

// Get saved theme from localStorage
function getSavedTheme(): 'light' | 'dark' | 'system' {
  try {
    const saved = localStorage.getItem('agent-preferences');
    if (saved) {
      const prefs = JSON.parse(saved);
      if (prefs.theme && ['light', 'dark', 'system'].includes(prefs.theme)) {
        return prefs.theme;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return 'system';
}

// Resolve theme to light or dark
function resolveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

// Error Boundary to catch and display React errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[BS Agent Desktop] React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          color: '#ff6b6b', 
          fontFamily: 'monospace',
          backgroundColor: '#1a1a2e',
          height: '100%',
          overflow: 'auto'
        }}>
          <h2 style={{ marginBottom: '10px' }}>⚠️ Widget Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ fontSize: '12px', opacity: 0.7, marginTop: '10px' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Main App component with ALL required providers
interface BSAgentDesktopAppProps {
  targetElement?: HTMLElement | null;
}

function BSAgentDesktopApp({ targetElement }: BSAgentDesktopAppProps) {
  return (
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ThemeProvider targetElement={targetElement}>
              <DemoProvider>
                <CommandCenter />
                <Toaster />
              </DemoProvider>
            </ThemeProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Custom Web Component class that injects CSS into Shadow DOM
class BSAgentDesktopElement extends HTMLElement {
  private root: ReactDOM.Root | null = null;
  private mountPoint: HTMLDivElement | null = null;

  connectedCallback() {
    // Set host element sizing to fill container
    this.style.display = 'block';
    this.style.width = '100%';
    this.style.height = '100%';

    // Create Shadow DOM for style isolation
    const shadow = this.attachShadow({ mode: 'open' });

    // Inject all styles into the Shadow DOM
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    shadow.appendChild(styleSheet);

    // Get initial theme from localStorage
    const savedTheme = getSavedTheme();
    const initialTheme = resolveTheme(savedTheme);

    // Create a container div for the React app with theme class
    this.mountPoint = document.createElement('div');
    this.mountPoint.id = 'bs-agent-desktop-root';
    this.mountPoint.className = initialTheme; // Apply resolved theme
    this.mountPoint.style.width = '100%';
    this.mountPoint.style.height = '100%';
    this.mountPoint.style.minHeight = '100vh';
    // Dynamic background based on theme
    this.mountPoint.style.backgroundColor = initialTheme === 'dark' 
      ? 'hsl(222.2 84% 4.9%)' 
      : 'hsl(0 0% 100%)';
    shadow.appendChild(this.mountPoint);

    // Mount the React application with reference to mountPoint for theme updates
    this.root = ReactDOM.createRoot(this.mountPoint);
    this.root.render(<BSAgentDesktopApp targetElement={this.mountPoint} />);

    console.log(`[BS Agent Desktop] Web component mounted with ${initialTheme} theme`);
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
