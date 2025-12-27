import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify('290138074368-14j6m3qbb6h2nv6rp317jo0qasag5u3u.apps.googleusercontent.com'),
  },
  build: {
    // Use esbuild for minification (faster than terser)
    minify: 'esbuild',
    // Disable source maps in production for faster builds
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Target modern browsers only
    target: 'esnext',
    // Rollup optimizations
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router', 'react-router-dom'],
        },
      },
    },
  },
  // Faster dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
});
