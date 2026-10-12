import { defineConfig, loadEnv } from 'vite'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return { server: { port: 5174, proxy: { '/api': {
    target: env.VITE_API_BASE_URL || 'https://localhost:7051', changeOrigin: true, secure: false,
  } } } }
})
