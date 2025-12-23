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
 * Output: dist-widget/bs-agent-desktop.js
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
  css: {
    // Ensure CSS is processed for inline imports
    modules: {
      localsConvention: 'camelCase',
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main-webcomponent.ts'),
      name: 'BSAgentDesktop',
      fileName: () => 'bs-agent-desktop.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        // Don't output separate CSS file - it will be inlined via ?inline import
        assetFileNames: 'bs-agent-desktop.[ext]',
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
    outDir: 'dist-widget',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
});
