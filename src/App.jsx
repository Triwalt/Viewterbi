import { useState, useEffect } from 'react'
import './App.css'
import logoUrl from '/logo.svg'
import { Languages, Moon, Sun } from 'lucide-react'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import Footer from './components/Footer'
import BaiduAnalytics from './components/BaiduAnalytics'

// src/App.jsx
import HardViterbi from './pages/HardViterbi'
import SoftViterbi from './SoftViterbi'
import ConvEncoder from './pages/ConvEncoder'
import BCJRDecoder from './pages/BCJRDecoder'

function AppContent() {
  const [mode, setMode] = useState('encoder')
  const { language, toggleLanguage, t } = useLanguage()
  const { themeMode, toggleTheme } = useTheme()

  // Simple page view analytics
  useEffect(() => {
    // Increment view count (you can replace this with Google Analytics)
    const viewCount = parseInt(localStorage.getItem('pageViews') || '0') + 1;
    localStorage.setItem('pageViews', viewCount.toString());
    console.log(`Page views: ${viewCount}`);
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 py-2">
          {/* 顶部行：Logo + 工具按钮 */}
          <div className="flex items-center justify-between mb-2 md:mb-0">
            <div className="flex items-center gap-2">
              <img src={logoUrl} className="w-5 h-5 md:w-6 md:h-6" alt="Viewterbi logo" />
              <span className="font-bold text-sm md:text-base text-blue-600 dark:text-blue-300 hidden sm:inline">
                {t('app.title')}
              </span>
              <span className="font-bold text-xs text-blue-600 dark:text-blue-300 sm:hidden">
                Viewterbi
              </span>
            </div>
            
            {/* 工具按钮组 */}
            <div className="flex gap-1.5 items-center">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                title={`Current: ${themeMode === 'auto' ? 'Auto' : themeMode === 'light' ? 'Light' : 'Dark'}. Click to switch`}
              >
                {themeMode === 'auto' ? (
                  <>
                    <div className="relative w-4 h-4">
                      <Sun className="absolute w-3 h-3 text-yellow-500" style={{ top: 0, left: 0 }} />
                      <Moon className="absolute w-3 h-3 text-slate-500" style={{ bottom: 0, right: 0 }} />
                    </div>
                    <span className="text-xs font-medium dark:text-white hidden md:inline">Auto</span>
                  </>
                ) : themeMode === 'light' ? (
                  <>
                    <Sun className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs font-medium hidden md:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-300" />
                    <span className="text-xs font-medium text-white hidden md:inline">Dark</span>
                  </>
                )}
              </button>
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                title={language === 'zh' ? 'Switch to English' : '切换到中文'}
              >
                <Languages className="w-4 h-4 dark:text-white" />
                <span className="text-xs font-mono dark:text-white hidden md:inline">{language.toUpperCase()}</span>
              </button>
            </div>
          </div>

          {/* 导航按钮组 */}
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border text-xs md:text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                mode === 'encoder' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              onClick={() => setMode('encoder')}
            >
              {t('app.convEncoder')}
            </button>
            <button
              className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border text-xs md:text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                mode === 'hard' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              onClick={() => setMode('hard')}
            >
              {t('app.hardViterbi')}
            </button>
            <button
              className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border text-xs md:text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                mode === 'soft' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              onClick={() => setMode('soft')}
            >
              {t('app.softViterbi')}
            </button>
            <button
              className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border text-xs md:text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                mode === 'bcjr' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
              onClick={() => setMode('bcjr')}
            >
              {t('app.bcjrDecoder')}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {mode === 'encoder' && (
          <ConvEncoder />
        )}
        {mode === 'hard' && (
          <HardViterbi />
        )}
        {mode === 'soft' && (
          <SoftViterbi />
        )}
        {mode === 'bcjr' && (
          <BCJRDecoder />
        )}
      </div>
      
      <Footer />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BaiduAnalytics />
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App