import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 根据环境变量设置 base 路径
  // Vercel 使用 '/'，GitHub Pages 使用仓库路径
  base: process.env.VERCEL_ENV ? '/' : 'https://triwalt.github.io/Viewterbi/',
})