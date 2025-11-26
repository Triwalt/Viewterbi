import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
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
      <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <img src={reactLogo} className="w-6 h-6" alt="React logo" />
            <span className="font-bold text-blue-800 dark:text-blue-400">{t('app.title')}</span>
          </div>
          <div className="flex gap-2 text-sm flex-wrap justify-end items-center">
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm transition-colors ${mode === 'encoder' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
              onClick={() => setMode('encoder')}
            >
              {t('app.convEncoder')}
            </button>
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm transition-colors ${mode === 'hard' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
              onClick={() => setMode('hard')}
            >
              {t('app.hardViterbi')}
            </button>
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm transition-colors ${mode === 'soft' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
              onClick={() => setMode('soft')}
            >
              {t('app.softViterbi')}
            </button>
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm transition-colors ${mode === 'bcjr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
              onClick={() => setMode('bcjr')}
            >
              {t('app.bcjrDecoder')}
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
            <button
              onClick={toggleTheme}
              className="px-3 py-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
              title={`Current: ${themeMode === 'auto' ? 'Auto' : themeMode === 'light' ? 'Light' : 'Dark'}. Click to switch`}
            >
              {themeMode === 'auto' ? (
                <>
                  <div className="relative w-4 h-4">
                    <Sun className="absolute w-3 h-3 text-yellow-500" style={{ top: 0, left: 0 }} />
                    <Moon className="absolute w-3 h-3 text-slate-500" style={{ bottom: 0, right: 0 }} />
                  </div>
                  <span className="text-xs font-medium dark:text-white">Auto</span>
                </>
              ) : themeMode === 'light' ? (
                <>
                  <Sun className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-medium">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-300" />
                  <span className="text-xs font-medium text-white">Dark</span>
                </>
              )}
            </button>
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
              title={language === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              <Languages className="w-4 h-4 dark:text-white" />
              <span className="text-xs font-mono dark:text-white">{language.toUpperCase()}</span>
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