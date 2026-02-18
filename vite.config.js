import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reactClickToComponent } from 'vite-plugin-react-click-to-component';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' ? reactClickToComponent() : null,
  ].filter(Boolean),
}));
