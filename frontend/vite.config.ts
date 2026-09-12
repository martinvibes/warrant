import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Mirror the Vercel rewrite for prod — `/skill.md` should work on localhost too
      '/skill.md': {
        target: 'https://api.0gent.xyz',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
