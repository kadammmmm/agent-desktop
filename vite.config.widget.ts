import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Vite config for building the web component bundle
 * 
 * This creates a single JS file that can be included in 
 * Webex Contact Center Agent Desktop layouts.
 * 
 * Build: npm run build:widget
 * Output: dist/bs-agent-desktop.js
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main-webcomponent.ts'),
      name: 'BSAgentDesktop',
      fileName: () => 'bs-agent-desktop.js',
      formats: ['iife'], // Immediately Invoked Function Expression for direct script inclusion
    },
    rollupOptions: {
      output: {
        // Ensure all styles are inlined
        assetFileNames: 'bs-agent-desktop.[ext]',
        // Don't externalize anything - bundle everything
        inlineDynamicImports: true,
      },
    },
    // Output to dist folder
    outDir: 'dist-widget',
    emptyOutDir: true,
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Minify for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
      },
    },
  },
});
