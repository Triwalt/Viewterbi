import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⚠️ 注意：这里的 '/viterbi-viz/' 必须换成您在 GitHub 上的仓库名称
  // 例如您的仓库是 https://github.com/user/my-app，这里就填 '/my-app/'
  base: 'https://github.com/Triwalt/Viewterbi', 
})