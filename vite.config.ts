import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), 
    tailwindcss(),
    nodePolyfills({
      include: ['buffer'], // or ['buffer'] if you only need Buffer
    }),
  ],
   resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Points to project root
      buffer: 'buffer/',
    },
    
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      external: ['buffer'],
    },
  },
})
