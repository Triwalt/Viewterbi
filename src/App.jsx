import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { Languages } from 'lucide-react'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'

// src/App.jsx
import HardViterbi from './pages/HardViterbi'
import SoftViterbi from './SoftViterbi'
import ConvEncoder from './pages/ConvEncoder'
import BCJRDecoder from './pages/BCJRDecoder'

function AppContent() {
  const [mode, setMode] = useState('hard')
  const { language, toggleLanguage, t } = useLanguage()

  return (
    <div className="w-full min-h-screen bg-gray-100">
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <img src={reactLogo} className="w-6 h-6" alt="React logo" />
            <span className="font-bold text-blue-800">{t('app.title')}</span>
          </div>
          <div className="flex gap-2 text-sm flex-wrap justify-end items-center">
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm ${mode === 'hard' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setMode('hard')}
            >
              {t('app.hardViterbi')}
            </button>
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm ${mode === 'soft' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setMode('soft')}
            >
              {t('app.softViterbi')}
            </button>
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm ${mode === 'encoder' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setMode('encoder')}
            >
              {t('app.convEncoder')}
            </button>
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm ${mode === 'bcjr' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setMode('bcjr')}
            >
              {t('app.bcjrDecoder')}
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors flex items-center gap-1"
              title={language === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              <Languages className="w-4 h-4" />
              <span className="text-xs font-mono">{language.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {mode === 'hard' && (
          <HardViterbi />
        )}
        {mode === 'soft' && (
          <SoftViterbi />
        )}
        {mode === 'encoder' && (
          <ConvEncoder />
        )}
        {mode === 'bcjr' && (
          <BCJRDecoder />
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App