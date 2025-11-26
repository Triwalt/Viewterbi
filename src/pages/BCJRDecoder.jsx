import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings, Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Info, ArrowRight, ArrowLeft, Calculator } from 'lucide-react';

const LOG_ZERO = -1e9;

const logAdd = (a, b) => {
  if (a <= LOG_ZERO) return b;
  if (b <= LOG_ZERO) return a;
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
};

const BCJRDecoder = () => {
  // --- Configuration ---
  const [generators, setGenerators] = useState(["111", "101"]);
  const [inputVector, setInputVector] = useState("110100");
  const K = 3;
  const numStates = Math.pow(2, K - 1);

  // --- Animation State ---
  const [phase, setPhase] = useState('forward'); // 'forward', 'backward', 'llr'
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  // --- Logic ---
  const sanitizeBits = (str) => str.replace(/[^01]/g, '');

  const result = useMemo(() => {
    const info = sanitizeBits(inputVector || "");
    const bits = info.split('').filter((ch) => ch === '0' || ch === '1');

    // Encode first to get "received" data (assuming ideal channel for demo)
    const encode = (input, gens) => {
      let state = 0;
      let output = '';
      for (let i = 0; i < input.length; i++) {
        const bit = parseInt(input[i]);
        if (Number.isNaN(bit)) continue;
        const fullReg = (bit << (K - 1)) | state;
        let symbol = '';
        for (let g of gens) {
          const gVal = parseInt(g || '0', 2);
          let sum = 0;
          for (let b = 0; b < K; b++) {
            if ((gVal >> b) & 1) {
              sum ^= (fullReg >> b) & 1;
            }
          }
          symbol += sum;
        }
        output += symbol;
        state = (bit << (K - 2)) | (state >> 1);
      }
      return output;
    };

    const getTransition = (currentState, inputBit) => {
      const fullReg = (inputBit << (K - 1)) | currentState;
      let symbol = '';
      for (let g of generators) {
        const gVal = parseInt(g || '0', 2);
        let sum = 0;
        for (let b = 0; b < K; b++) {
          if ((gVal >> b) & 1) {
            sum ^= (fullReg >> b) & 1;
          }
        }
        symbol += sum;
      }
      const nextState = (inputBit << (K - 2)) | (currentState >> 1);
      return { output: symbol, nextState };
    };

    const encoded = encode(info, generators);
    const n = encoded.length / 2;

    // BPSK: 0->+1, 1->-1
    const r = [];
    for (let i = 0; i < encoded.length; i++) {
      r.push(encoded[i] === '0' ? 1 : -1);
    }

    // Gamma
    const gamma = Array.from({ length: n }, () =>
      Array.from({ length: numStates }, () => [LOG_ZERO, LOG_ZERO])
    );

    for (let t = 0; t < n; t++) {
      const r0 = r[2 * t];
      const r1 = r[2 * t + 1];
      for (let prevState = 0; prevState < numStates; prevState++) {
        for (let input = 0; input <= 1; input++) {
          const { output } = getTransition(prevState, input);
          const s0 = output[0] === '0' ? 1 : -1;
          const s1 = output[1] === '0' ? 1 : -1;
          const dist = (r0 - s0) * (r0 - s0) + (r1 - s1) * (r1 - s1);
          gamma[t][prevState][input] = -dist;
        }
      }
    }

    // Alpha (Forward)
    const alpha = Array.from({ length: n + 1 }, () => Array(numStates).fill(LOG_ZERO));
    alpha[0][0] = 0;

    for (let t = 0; t < n; t++) {
      for (let prevState = 0; prevState < numStates; prevState++) {
        const aPrev = alpha[t][prevState];
        if (aPrev <= LOG_ZERO / 2) continue;
        for (let input = 0; input <= 1; input++) {
          const { nextState } = getTransition(prevState, input);
          const val = aPrev + gamma[t][prevState][input];
          alpha[t + 1][nextState] = logAdd(alpha[t + 1][nextState], val);
        }
      }
    }

    // Beta (Backward)
    const beta = Array.from({ length: n + 1 }, () => Array(numStates).fill(LOG_ZERO));
    beta[n][0] = 0; // Terminated

    for (let t = n - 1; t >= 0; t--) {
      for (let prevState = 0; prevState < numStates; prevState++) {
        let acc = LOG_ZERO;
        for (let input = 0; input <= 1; input++) {
          const { nextState } = getTransition(prevState, input);
          const val = gamma[t][prevState][input] + beta[t + 1][nextState];
          acc = logAdd(acc, val);
        }
        beta[t][prevState] = acc;
      }
    }

    // LLR
    const llrs = [];
    const decisions = [];
    for (let t = 0; t < n; t++) {
      let num1 = LOG_ZERO;
      let num0 = LOG_ZERO;
      for (let prevState = 0; prevState < numStates; prevState++) {
        for (let input = 0; input <= 1; input++) {
          const { nextState } = getTransition(prevState, input);
          const val = alpha[t][prevState] + gamma[t][prevState][input] + beta[t + 1][nextState];
          if (input === 1) {
            num1 = logAdd(num1, val);
          } else {
            num0 = logAdd(num0, val);
          }
        }
      }
      const llr = num1 - num0;
      llrs.push(llr);
      decisions.push(llr >= 0 ? 0 : 1);
    }

    return { n, encoded, alpha, beta, llrs, decisions };
  }, [inputVector, generators, K, numStates]);

  const { n, encoded, alpha, beta, llrs, decisions } = result;

  // --- Animation Loop ---
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (phase === 'forward') {
            if (prev < n) return prev + 1;
            setPhase('backward');
            return n;
          } else if (phase === 'backward') {
            if (prev > 0) return prev - 1;
            setPhase('llr');
            return 0;
          } else { // llr
            if (prev < n) return prev + 1;
            setIsPlaying(false);
            return prev;
          }
        });
      }, 800);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, phase, n]);

  // --- Handlers ---
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setIsPlaying(false);
    setPhase('forward');
    setCurrentStep(0);
  };
  const handleStepForward = () => {
    setIsPlaying(false);
    if (phase === 'forward') {
      if (currentStep < n) setCurrentStep(currentStep + 1);
      else { setPhase('backward'); setCurrentStep(n); }
    } else if (phase === 'backward') {
      if (currentStep > 0) setCurrentStep(currentStep - 1);
      else { setPhase('llr'); setCurrentStep(0); }
    } else {
      if (currentStep < n) setCurrentStep(currentStep + 1);
    }
  };
  const handleStepBack = () => {
    setIsPlaying(false);
    if (phase === 'llr') {
      if (currentStep > 0) setCurrentStep(currentStep - 1);
      else { setPhase('backward'); setCurrentStep(0); }
    } else if (phase === 'backward') {
      if (currentStep < n) setCurrentStep(currentStep + 1);
      else { setPhase('forward'); setCurrentStep(n); }
    } else {
      if (currentStep > 0) setCurrentStep(currentStep - 1);
    }
  };

  // --- Trellis Component ---
  const Trellis = () => {
    const xSpacing = 60;
    const ySpacing = 50;
    const width = Math.max(600, (n + 1) * xSpacing + 100);
    const height = numStates * ySpacing + 60;

    return (
      <div className="overflow-x-auto pb-4">
        <svg width={width} height={height} className="mx-auto">
          {/* Grid */}
          {Array.from({ length: n + 1 }).map((_, t) => (
            <g key={`col-${t}`}>
              <text x={50 + t * xSpacing} y={30} textAnchor="middle" className="text-xs fill-slate-400 font-mono">t={t}</text>
              {Array.from({ length: numStates }).map((_, s) => {
                // Determine node color/opacity based on phase and value
                let val = LOG_ZERO;
                let isActive = false;
                let color = '#3B82F6'; // Default blue
                let showValue = false;

                if (phase === 'forward' && t <= currentStep) {
                  val = alpha[t][s];
                  isActive = val > LOG_ZERO;
                  color = '#3B82F6'; // Blue for forward
                  showValue = isActive;
                } else if (phase === 'backward' && t >= currentStep) {
                  val = beta[t][s];
                  isActive = val > LOG_ZERO;
                  color = '#EF4444'; // Red for backward
                  showValue = isActive;
                } else if (phase === 'llr') {
                  // In LLR phase, show both alpha and beta if available
                  const alphaVal = alpha[t][s];
                  const betaVal = beta[t][s];

                  // Show combined value (alpha + beta in log domain)
                  if (alphaVal > LOG_ZERO && betaVal > LOG_ZERO) {
                    val = alphaVal + betaVal;
                    isActive = true;
                    // Use purple to indicate combined alpha+beta
                    color = '#8B5CF6';
                    showValue = t === currentStep;
                  }
                }

                // Normalize for visualization (rough)
                const opacity = isActive && val > LOG_ZERO ? Math.min(1, Math.exp(val / 10) + 0.3) : 0.1;

                return (
                  <g key={`node-${t}-${s}`}>
                    <circle
                      cx={50 + t * xSpacing}
                      cy={50 + s * ySpacing}
                      r={6}
                      fill={color}
                      fillOpacity={opacity}
                      stroke={isActive ? color : '#cbd5e1'}
                      strokeWidth={t === currentStep && phase === 'llr' ? 2 : 1}
                    />
                    {/* Value Tooltip/Label */}
                    {showValue && val > LOG_ZERO && (
                      <text x={50 + t * xSpacing} y={50 + s * ySpacing - 10} textAnchor="middle" className="text-[8px] fill-slate-600 font-mono">
                        {val.toFixed(1)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}

          {/* State Labels */}
          {Array.from({ length: numStates }).map((_, s) => (
            <text key={`label-${s}`} x={10} y={55 + s * ySpacing} className="text-[10px] fill-slate-500 font-mono">
              {s.toString(2).padStart(K - 1, '0')}
            </text>
          ))}

          {/* Phase indicator */}
          <text x={width / 2} y={height - 10} textAnchor="middle" className="text-xs fill-slate-400 font-semibold">
            {phase === 'forward' ? '→ Forward (Alpha)' : phase === 'backward' ? '← Backward (Beta)' : '⊕ LLR Calculation (Alpha + Beta)'}
          </text>

        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              BCJR Decoder
            </h1>
            <p className="text-slate-500 mt-1">MAP / Log-MAP Decoding Visualization</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <button onClick={handleStepBack} className="p-2 hover:bg-gray-100 rounded-md">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handlePlayPause} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={handleStepForward} className="p-2 hover:bg-gray-100 rounded-md">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded-md text-slate-600">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="flex justify-center gap-4">
          <div className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${phase === 'forward' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>
            1. Forward (Alpha)
          </div>
          <ArrowRight className="text-slate-300" />
          <div className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${phase === 'backward' ? 'bg-red-100 text-red-700' : 'text-slate-400'}`}>
            2. Backward (Beta)
          </div>
          <ArrowRight className="text-slate-300" />
          <div className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${phase === 'llr' ? 'bg-purple-100 text-purple-700' : 'text-slate-400'}`}>
            3. LLR Calculation
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Settings */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Input Sequence</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                    value={inputVector}
                    onChange={(e) => {
                      setInputVector(sanitizeBits(e.target.value));
                      handleReset();
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Current Step Data</h2>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Time (t)</span>
                  <span>{currentStep}</span>
                </div>
                {phase === 'llr' && currentStep < n && (
                  <>
                    <div className="flex justify-between text-purple-600 font-bold">
                      <span>LLR</span>
                      <span>{llrs[currentStep]?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Decision</span>
                      <span>{decisions[currentStep]}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Trellis View</h2>
              <Trellis />
            </div>

            {/* LLR Chart (Only in LLR phase) */}
            {phase === 'llr' && (
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">LLR Results</h2>
                <div className="relative h-48 border-b border-gray-200">
                  <div className="absolute inset-0 flex items-end justify-around gap-1 px-2">
                    {llrs.map((val, i) => {
                      const barHeight = Math.min(180, Math.abs(val) * 20);
                      const isPositive = val >= 0;
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 max-w-[60px] group relative">
                          <div
                            className={`w-full rounded-t transition-all ${isPositive ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'}`}
                            style={{ height: `${barHeight}px` }}
                          />
                          <div className="text-xs text-slate-500 mt-1 font-mono">t{i}</div>
                          {/* Tooltip */}
                          <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none">
                            LLR: {val.toFixed(2)}<br />
                            Decision: {decisions[i]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Legend */}
                <div className="flex gap-4 mt-4 text-xs justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>LLR ≥ 0 (决策为1)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>LLR &lt; 0 (决策为0)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default BCJRDecoder;
