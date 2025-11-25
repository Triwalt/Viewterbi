import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

// src/App.jsx
import ViterbiDecoder from './ViterbiDecoder'

function App() {
  return (
    <div className="w-full min-h-screen">
      <ViterbiDecoder />
    </div>
  )
}

export default App