import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'PanGraphic',
          short_name: 'PanGraphic',
          description: 'A Graphviz visual editor',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
                return 'monaco';
              }
              if (id.includes('@hpcc-js')) {
                return 'graphviz';
              }
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              if (id.includes('jszip')) {
                return 'jszip';
              }
              if (id.includes('dexie')) {
                return 'db';
              }
              if (id.includes('motion')) {
                return 'animations';
              }
              if (id.includes('react-joyride')) {
                return 'onboarding';
              }
              if (id.includes('@google/genai')) {
                return 'genai';
              }
              if (id.includes('react-zoom-pan-pinch')) {
                return 'zoom-pan';
              }
              if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
                return 'react-core';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
