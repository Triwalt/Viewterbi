import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'

// src/App.jsx
import HardViterbi from './pages/HardViterbi'
import SoftViterbi from './SoftViterbi'

function App() {
  const [mode, setMode] = useState('hard')

  return (
    <div className="w-full min-h-screen bg-gray-100">
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <img src={reactLogo} className="w-6 h-6" alt="React logo" />
            <span className="font-bold text-blue-800">Viewterbi</span>
          </div>
          <div className="flex gap-2 text-sm">
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm ${mode === 'hard' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setMode('hard')}
            >
              Hard Viterbi
            </button>
            <button
              className={`px-3 py-1 rounded-full border text-xs md:text-sm ${mode === 'soft' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setMode('soft')}
            >
              Soft Viterbi
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
      </div>
    </div>
  )
}

export default App