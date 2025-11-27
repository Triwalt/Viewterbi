import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings, Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Info, ArrowRight, ArrowLeft, Calculator } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import bcjrGenImg from '../assets/bcjk_gen.png';
import forwImg from '../assets/forw.png';
import backwImg from '../assets/backw.png';
import llrImg from '../assets/llr.png';

const LOG_ZERO = -1e9;

const logAdd = (a, b) => {
  if (a <= LOG_ZERO) return b;
  if (b <= LOG_ZERO) return a;
  const m = Math.max(a, b);
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
};

const BCJRDecoder = () => {
  const { t } = useLanguage();

  // --- Configuration ---
  const [generators, setGenerators] = useState(["111", "101"]);
  const [inputVector, setInputVector] = useState("110100");
  const [receivedVector, setReceivedVector] = useState("");

  // Adaptive K (matching Viterbi pages)
  const K = useMemo(() => Math.min(6, Math.max(2, ...generators.map(g => g.length))), [generators]);
  const numStates = Math.pow(2, K - 1);

  // --- Animation State ---
  const [phase, setPhase] = useState('forward'); // 'forward', 'backward', 'llr'
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  // --- Logic ---
  const sanitizeBits = (str) => str.replace(/[^01]/g, '');

  const result = useMemo(() => {
    if (!receivedVector || receivedVector.length === 0) {
      return { n: 0, alpha: [], beta: [], llrs: [], decisions: [] };
    }

    const symbolsPerBit = generators.length;
    // Ensure receivedVector length is a multiple of symbolsPerBit
    if (receivedVector.length % symbolsPerBit !== 0) {
      console.warn(`Received vector length (${receivedVector.length}) is not a multiple of symbols per bit (${symbolsPerBit})`);
      return { n: 0, alpha: [], beta: [], llrs: [], decisions: [] };
    }

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

    const n = Math.floor(receivedVector.length / symbolsPerBit);

    if (n === 0) {
      return { n: 0, alpha: [], beta: [], llrs: [], decisions: [] };
    }

    // BPSK: 0->+1, 1->-1
    const r = [];
    for (let i = 0; i < receivedVector.length; i++) {
      r.push(receivedVector[i] === '0' ? 1 : -1);
    }

    // Gamma
    const gamma = Array.from({ length: n }, () =>
      Array.from({ length: numStates }, () => [LOG_ZERO, LOG_ZERO])
    );

    for (let t = 0; t < n; t++) {
      for (let prevState = 0; prevState < numStates; prevState++) {
        for (let input = 0; input <= 1; input++) {
          const { output } = getTransition(prevState, input);
          let dist = 0;
          for (let i = 0; i < symbolsPerBit; i++) {
            const idx = t * symbolsPerBit + i;
            if (idx >= r.length) {
              console.error(`Index ${idx} out of bounds for r.length ${r.length}`);
              continue;
            }
            const rSym = r[idx];
            const sSym = output[i] === '0' ? 1 : -1;
            dist += (rSym - sSym) * (rSym - sSym);
          }
          // Scale gamma to avoid numerical issues (optional: divide by 2*sigma^2, here sigma=1)
          gamma[t][prevState][input] = -dist / 2;
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
    // Initialize all terminal states equally (unknown termination state)
    for (let s = 0; s < numStates; s++) {
      beta[n][s] = 0; // Log(1/numStates) normalized to 0
    }

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
      decisions.push(llr >= 0 ? 1 : 0);
    }

    return { n, alpha, beta, llrs, decisions };
  }, [receivedVector, generators, K, numStates]);

  // Auto-update receivedVector when input or generators change
  useEffect(() => {
    const info = sanitizeBits(inputVector || "");
    let output = '';
    let s = 0;
    for (let i = 0; i < info.length; i++) {
      const bit = parseInt(info[i]);
      if (Number.isNaN(bit)) continue;
      const fullReg = (bit << (K - 1)) | s;
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
      output += symbol;
      s = (bit << (K - 2)) | (s >> 1);
    }
    setReceivedVector(output);
  }, [inputVector, generators, K]);

  const { n, alpha, beta, llrs, decisions } = result;

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

    // Safety check: don't render if arrays are not ready
    if (!alpha || alpha.length === 0 || !beta || beta.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          {t('hardViterbi.inputVector')} {t('hardViterbi.receivedVector')}
        </div>
      );
    }

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

                if (phase === 'forward' && t <= currentStep && alpha[t] && alpha[t][s] !== undefined) {
                  val = alpha[t][s];
                  isActive = val > LOG_ZERO;
                  color = '#3B82F6'; // Blue for forward
                  showValue = isActive;
                } else if (phase === 'backward' && t >= currentStep && beta[t] && beta[t][s] !== undefined) {
                  val = beta[t][s];
                  isActive = val > LOG_ZERO;
                  color = '#EF4444'; // Red for backward
                  showValue = isActive;
                } else if (phase === 'llr' && alpha[t] && beta[t]) {
                  // In LLR phase, show both alpha and beta if available
                  const alphaVal = alpha[t]?.[s];
                  const betaVal = beta[t]?.[s];

                  // Show combined value (alpha + beta in log domain)
                  if (alphaVal !== undefined && betaVal !== undefined && alphaVal > LOG_ZERO && betaVal > LOG_ZERO) {
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
            {phase === 'forward' ? t('bcjr.forward') : phase === 'backward' ? t('bcjr.backward') : t('bcjr.llrCalc')}
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
              {t('bcjr.title')}
            </h1>
            <p className="text-slate-500 mt-1">{t('bcjr.subtitle')}</p>
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

        {/* Theory Overview */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-purple-600" />
            {t('bcjr.theoryTitle')}
          </h2>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>{t('bcjr.theoryP1')}</p>
            <p>{t('bcjr.theoryP2')}</p>
            <p>{t('bcjr.theoryP3')}</p>
            <p className="bg-white/70 border-l-4 border-purple-400 pl-3 py-2 italic">
              {t('bcjr.theoryTip')}
            </p>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="flex justify-center gap-4">
          <div className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${phase === 'forward' ? 'bg-blue-100 text-blue-700' : 'text-slate-400'}`}>
            {t('bcjr.phase1')}
          </div>
          <ArrowRight className="text-slate-300" />
          <div className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${phase === 'backward' ? 'bg-red-100 text-red-700' : 'text-slate-400'}`}>
            {t('bcjr.phase2')}
          </div>
          <ArrowRight className="text-slate-300" />
          <div className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${phase === 'llr' ? 'bg-purple-100 text-purple-700' : 'text-slate-400'}`}>
            {t('bcjr.phase3')}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Settings */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('hardViterbi.configuration')}</h2>
              <div className="space-y-4">
                {/* K Display */}
                <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">{t('hardViterbi.constraintLength')}</span>
                    <span className="font-mono font-bold text-purple-600 text-lg">{K}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t('hardViterbi.autoDerived')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('hardViterbi.generators')}</label>
                  <div className="flex gap-2">
                    <input
                      className="w-24 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      value={generators[0]}
                      maxLength={6}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^01]/g, '').slice(0, 6);
                        setGenerators([val, generators[1]]);
                        handleReset();
                      }}
                    />
                    <input
                      className="w-24 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                      value={generators[1]}
                      maxLength={6}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^01]/g, '').slice(0, 6);
                        setGenerators([generators[0], val]);
                        handleReset();
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{t('hardViterbi.generatorsDefault')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('hardViterbi.inputVector')}</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm tracking-widest focus:ring-2 focus:ring-purple-500 outline-none"
                    value={inputVector}
                    onChange={(e) => {
                      setInputVector(sanitizeBits(e.target.value));
                      handleReset();
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-1">{t('hardViterbi.inputVectorTip')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('hardViterbi.receivedVector')}</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm tracking-widest focus:ring-2 focus:ring-purple-500 outline-none bg-yellow-50"
                    value={receivedVector}
                    onChange={(e) => {
                      setReceivedVector(sanitizeBits(e.target.value));
                      handleReset();
                    }}
                  />
                  <p className="text-xs text-red-500 mt-1">{t('hardViterbi.receivedVectorTip')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('bcjr.currentStepData')}</h2>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('bcjr.time')}</span>
                  <span>{currentStep}</span>
                </div>
                {phase === 'llr' && currentStep < n && (
                  <>
                    <div className="flex justify-between text-purple-600 font-bold">
                      <span>{t('bcjr.llr')}</span>
                      <span>{llrs[currentStep]?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('bcjr.decision')}</span>
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
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('bcjr.trellisView')}</h2>
              <Trellis />
            </div>

            {/* LLR Chart (Only in LLR phase) */}
            {phase === 'llr' && (
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('bcjr.llrResults')}</h2>
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
                            {t('bcjr.llr')}: {val.toFixed(2)}<br />
                            {t('bcjr.decision')}: {decisions[i]}
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
                    <span>{t('bcjr.llrPositive')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>{t('bcjr.llrNegative')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* BCJR Algorithm Flowcharts */}
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-purple-600" />
            {t('bcjr.flowcharts')}
          </h2>

          {/* Overall Process */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">{t('bcjr.overallProcess')}</h3>
            <div className="flex justify-center">
              <img
                src={bcjrGenImg}
                alt="BCJR Overall Process"
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          </div>

          {/* Forward (Alpha) Process */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">{t('bcjr.forwardProcess')}</h3>
            <div className="flex justify-center">
              <img
                src={forwImg}
                alt="Forward Alpha Process"
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          </div>

          {/* Backward (Beta) Process */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">{t('bcjr.backwardProcess')}</h3>
            <div className="flex justify-center">
              <img
                src={backwImg}
                alt="Backward Beta Process"
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          </div>

          {/* LLR Calculation Process */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">{t('bcjr.llrProcess')}</h3>
            <div className="flex justify-center">
              <img
                src={llrImg}
                alt="LLR Calculation Process"
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BCJRDecoder;
