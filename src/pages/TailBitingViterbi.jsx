import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings, Play, Pause, RotateCcw, ChevronRight, Info, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const TailBitingViterbi = () => {
  const { t } = useLanguage();

  // --- Configuration State ---
  const [generators, setGenerators] = useState(["111", "101"]);
  const [inputVector, setInputVector] = useState("1101001"); // Example with odd length to show it works
  const [iterations, setIterations] = useState(2);
  const [receivedVector, setReceivedVector] = useState("");
  const [bitErrors, setBitErrors] = useState([]);

  // Derive K from generators (max length, min 2, max 6)
  const K = useMemo(() => Math.min(6, Math.max(2, ...generators.map(g => g.length))), [generators]);
  const numStates = 1 << (K - 1);

  // --- Logic Helpers ---
  const sanitizeBits = (str) => str.replace(/[^01]/g, '');

  const hammingDistance = (s1, s2) => {
    let d = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] !== s2[i]) d++;
    }
    return d;
  };

  const getTransition = (currentState, inputBit, gens, kLen) => {
    const fullReg = (inputBit << (kLen - 1)) | currentState;
    let symbol = "";
    for (let g of gens) {
      let sum = 0;
      const gVal = parseInt(g, 2);
      for (let b = 0; b < kLen; b++) {
        // Tap the bit corresponding to this position
        // Matches ConvEncoder logic: G[j] is '1' means tap bit (K-1-j)
        if (g[kLen - 1 - b] === '1') {
          sum ^= (fullReg >> b) & 1;
        }
      }
      symbol += sum;
    }
    const nextState = (inputBit << (kLen - 2)) | (currentState >> 1);
    return { output: symbol, nextState };
  };

  // --- Encoding Logic (TBCC) ---
  const encodingResult = useMemo(() => {
    const bits = sanitizeBits(inputVector);
    if (bits.length < K - 1) return { steps: [], encoded: "", initialState: 0, endState: 0, isMatched: false };

    // TBCC Rule: Initial state = last (K-1) bits
    const lastBits = bits.slice(-(K - 1));
    // Bits are processed LSB first in register logic usually, depends on shift direction.
    // In our ConvEncoder: nextState = (bit << (K - 2)) | (state >> 1);
    // This is a right-shifting register. Let's see how the pre-load is formed.
    // If bits are [b0, b1, b2, b3, b4], K-1=2, bits.slice(-2) = [b3, b4]
    // Initial state: D0 = b4, D1 = b3?
    let preLoadState = 0;
    for (let i = 0; i < K - 1; i++) {
      const bit = parseInt(lastBits[i]);
      // Right shift register: bits enter from left.
      // After K-1 shifts of [b3, b4]:
      // 0: [b3, 0]
      // 1: [b4, b3] -> state is (b4 << 0) | (b3 << 1) or similar.
      // Actually, if we just want the state to be exactly what the bits would result in:
      preLoadState = (preLoadState >> 1) | (bit << (K - 2));
    }

    let state = preLoadState;
    const stepsArr = [];
    let output = "";

    for (let i = 0; i < bits.length; i++) {
      const bit = parseInt(bits[i]);
      const prevState = state;
      const { output: symbol, nextState } = getTransition(prevState, bit, generators, K);
      
      output += symbol;
      stepsArr.push({
        t: i,
        input: bit,
        prevState,
        nextState,
        outBits: symbol,
      });
      state = nextState;
    }

    return { 
      steps: stepsArr, 
      encoded: output, 
      initialState: preLoadState, 
      endState: state,
      isMatched: preLoadState === state
    };
  }, [inputVector, generators, K]);

  // Update received vector when encoding changes
  useEffect(() => {
    setReceivedVector(encodingResult.encoded);
  }, [encodingResult.encoded]);

  // --- Decoding Logic (WAVA) ---
  const decodingResult = useMemo(() => {
    if (!receivedVector) return { allLayers: [], decoded: "", finalPath: [], bestEndState: -1 };
    
    const n = receivedVector.length / generators.length;
    let currentPm = Array(numStates).fill(0); // All states equal chance at start
    const allLayers = [];

    // Iterations of WAVA
    for (let iter = 0; iter < iterations; iter++) {
      for (let t = 0; t < n; t++) {
        const receivedSymbol = receivedVector.slice(t * generators.length, (t + 1) * generators.length);
        const nextPm = Array(numStates).fill(Infinity);
        const layer = Array(numStates).fill(null).map((_, i) => ({
          state: i,
          incoming: []
        }));

        for (let s = 0; s < numStates; s++) {
          if (currentPm[s] === Infinity) continue;
          for (let bit = 0; bit <= 1; bit++) {
            const { output, nextState } = getTransition(s, bit, generators, K);
            const bm = hammingDistance(receivedSymbol, output);
            const total = currentPm[s] + bm;
            layer[nextState].incoming.push({
              from: s,
              input: bit,
              output,
              pm: total,
              bm
            });
          }
        }

        // Survivor selection
        for (let s = 0; s < numStates; s++) {
          if (layer[s].incoming.length === 0) continue;
          layer[s].incoming.sort((a, b) => a.pm - b.pm);
          const best = layer[s].incoming[0];
          nextPm[s] = best.pm;
          layer[s].survivor = best;
        }
        
        allLayers.push({ t, iter, nodes: layer, pm: [...nextPm] });
        currentPm = [...nextPm];
      }
    }

    // Best path selection for TBCC: min PM satisfying startState == endState
    // We need to traceback from the last layer. 
    // In WAVA, we typically look at the last N steps.
    const lastLayerIdx = allLayers.length - 1;
    let minPm = Infinity;
    let bestEndState = -1;

    // Check legality: end state must match start state (approximately, by tracing back N steps)
    // For simplicity in visualization, we just find the min PM state at the very end of all iterations.
    for (let s = 0; s < numStates; s++) {
      if (currentPm[s] < minPm) {
        minPm = currentPm[s];
        bestEndState = s;
      }
    }

    // Traceback
    const finalPath = [];
    let currS = bestEndState;
    for (let i = lastLayerIdx; i >= 0; i--) {
      const node = allLayers[i].nodes[currS];
      finalPath.unshift({ t: allLayers[i].t, iter: allLayers[i].iter, state: currS, input: node.survivor?.input });
      currS = node.survivor.from;
    }

    // Decoded bits are from the LAST iteration
    const decodedBits = finalPath
      .filter(p => p.iter === iterations - 1)
      .map(p => p.input)
      .join("");

    // Circularity check: The state at t=0 of the last iteration should match its end state
    const lastIterPath = finalPath.filter(p => p.iter === iterations - 1);
    let isCircular = false;
    if (lastIterPath.length > 0 && n > 0) {
      const firstNodeOfLastIter = lastIterPath[0];
      const layerIdx = (iterations - 1) * n + firstNodeOfLastIter.t;
      if (allLayers[layerIdx] && allLayers[layerIdx].nodes[firstNodeOfLastIter.state]?.survivor) {
        const startStateOfLastIter = allLayers[layerIdx].nodes[firstNodeOfLastIter.state].survivor.from;
        isCircular = startStateOfLastIter === bestEndState;
      }
    }

    return { 
      allLayers, 
      decoded: decodedBits, 
      finalPath,
      bestEndState,
      isCircular
    };
  }, [receivedVector, generators, iterations, numStates, K]);

  // --- Animation State ---
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  const totalSteps = Math.max(encodingResult.steps.length, decodingResult.allLayers.length);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < totalSteps) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, 800);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, totalSteps]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  // --- Components ---
  const Trellis = () => {
    const xSpacing = 50;
    const ySpacing = 40;
    const paddingX = 60;
    const n = inputVector.length || 1;
    
    // We only show one full cycle (N steps) for the trellis, but maybe multiple iterations sidebar-style?
    // Let's show all iterations horizontally but grouped.
    const layersToShow = decodingResult.allLayers;
    const width = layersToShow.length * xSpacing + paddingX * 2;
    const height = numStates * ySpacing + 60;

    return (
      <div className="overflow-x-auto pb-4">
        <svg width={width} height={height} className="mx-auto">
          {/* State Labels (Vertical Axis) */}
          {Array.from({ length: numStates }).map((_, s) => (
            <text
              key={`state-label-${s}`}
              x={paddingX - 10}
              y={40 + s * ySpacing + 4}
              textAnchor="end"
              className="text-[10px] font-mono fill-slate-500"
            >
              {s.toString(2).padStart(K - 1, '0')}
            </text>
          ))}

          {/* Grids and nodes */}
          {Array.from({ length: layersToShow.length + 1 }).map((_, i) => {
            const isBoundVal = i % n === 0;
            return (
              <g key={`col-${i}`}>
                <text x={paddingX + i * xSpacing} y={20} textAnchor="middle" className={`text-[10px] font-mono ${isBoundVal ? 'fill-blue-600 font-bold' : 'fill-slate-400'}`}>
                  {i === 0 ? "Start" : `t=${(i-1)%n}`}
                </text>
                {Array.from({ length: numStates }).map((_, s) => (
                  <circle
                    key={`node-${i}-${s}`}
                    cx={paddingX + i * xSpacing}
                    cy={40 + s * ySpacing}
                    r={3}
                    className={isBoundVal ? "fill-blue-400" : "fill-slate-200"}
                  />
                ))}
              </g>
            );
          })}

          {/* Paths (Simplified for performance, only survivor paths for current iteration) */}
          {layersToShow.map((layer, idx) => {
             if (idx >= currentStep) return null;
             const x1 = paddingX + idx * xSpacing;
             const x2 = paddingX + (idx + 1) * xSpacing;
             
             return layer.nodes.map((node, s) => {
               if (!node.survivor) return null;
               const y1 = 40 + node.survivor.from * ySpacing;
               const y2 = 40 + s * ySpacing;
               
               // Check if this is on the best final path
               const isOnFinal = decodingResult.finalPath[idx] && 
                                decodingResult.finalPath[idx].state === s && 
                                (idx === 0 || decodingResult.finalPath[idx-1].state === node.survivor.from);

               return (
                 <line
                   key={`edge-${idx}-${s}`}
                   x1={x1} y1={y1} x2={x2} y2={y2}
                   stroke={isOnFinal ? "#10B981" : "#3b82f6"}
                   strokeWidth={isOnFinal ? 2 : 1}
                   opacity={isOnFinal ? 1 : 0.2}
                 />
               );
             });
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 font-sans text-slate-800 dark:text-slate-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              {t('tbcc.title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('tbcc.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
             <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button onClick={handleReset} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Theory Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            {t('tbcc.theoryTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm leading-relaxed">
            <div className="space-y-2">
              <p>{t('tbcc.theoryP1')}</p>
              <p dangerouslySetInnerHTML={{ __html: t('tbcc.theoryP2') }} />
            </div>
            <div className="space-y-2">
              <p dangerouslySetInnerHTML={{ __html: t('tbcc.theoryP3') }} />
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded border-l-4 border-indigo-400 italic">
                {t('tbcc.theoryTip')}
              </div>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('hardViterbi.configuration')}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('hardViterbi.generators')}</label>
                  <div className="flex gap-2">
                    {generators.map((g, idx) => (
                      <input 
                        key={idx}
                        className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-2 py-1 font-mono text-sm"
                        value={g}
                        onChange={(e) => {
                          const next = [...generators];
                          next[idx] = sanitizeBits(e.target.value).slice(0, 6);
                          setGenerators(next);
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('hardViterbi.inputVector')}</label>
                  <input 
                    className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-2 py-1 font-mono text-sm break-all"
                    value={inputVector}
                    onChange={(e) => setInputVector(sanitizeBits(e.target.value).slice(0, 20))}
                    placeholder="Enter bits..."
                  />
                  <p className="text-[10px] text-slate-400 mt-1">TBCC needs length ≥ K-1 ({K-1})</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('tbcc.iteration')} (WAVA)</label>
                  <select 
                    className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                    value={iterations}
                    onChange={(e) => setIterations(parseInt(e.target.value))}
                  >
                    <option value={1}>1 Round (Standard)</option>
                    <option value={2}>2 Rounds (Basic WAVA)</option>
                    <option value={3}>3 Rounds (LTE/Standard)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('hardViterbi.receivedVector')}</label>
                  <input 
                    className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded px-2 py-1 font-mono text-sm bg-yellow-50/50"
                    value={receivedVector}
                    onChange={(e) => setReceivedVector(sanitizeBits(e.target.value))}
                  />
                  <p className="text-[10px] text-orange-500 mt-1">{t('hardViterbi.receivedVectorTip')}</p>
                </div>
              </div>
            </div>

            {/* TBCC Status Card */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{t('tbcc.tailBitingMatch')}</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500">{t('tbcc.initialState')}</span>
                   <span className="font-mono font-bold px-2 py-1 bg-slate-100 dark:bg-gray-700 rounded">{encodingResult.initialState.toString(2).padStart(K-1, '0')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500">{t('tbcc.endState')}</span>
                   <span className="font-mono font-bold px-2 py-1 bg-slate-100 dark:bg-gray-700 rounded">{encodingResult.endState.toString(2).padStart(K-1, '0')}</span>
                </div>
                <div className={`mt-2 flex items-center justify-center gap-2 p-2 rounded-lg border ${encodingResult.isMatched ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                   {encodingResult.isMatched ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                   <span className="font-bold text-sm">{encodingResult.isMatched ? t('tbcc.matched') : "Mismatch"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Encoding Steps */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Encoding Trace</h3>
                  <div className="flex items-center gap-4 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-200 rounded border border-slate-300"></div> {t('convEncoder.state')}</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-indigo-600 rounded"></div> {t('convEncoder.inputBit')}</div>
                    <div className="flex items-center gap-1"><div className="font-mono text-slate-500 underline decoration-indigo-400">XY</div> {t('convEncoder.outputBits')}</div>
                  </div>
               </div>
               <div className="flex flex-wrap gap-2">
                  {encodingResult.steps.map((s, idx) => (
                    <div key={idx} className={`flex flex-col items-center p-2 rounded border transition-all ${idx < currentStep ? 'bg-indigo-50 border-indigo-200 border-b-4' : 'opacity-40'}`}>
                      <div className="w-full flex justify-between items-center mb-1 px-1">
                        <span className="text-[9px] text-slate-400 font-mono">t={idx}</span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 dark:bg-gray-700 px-1 rounded">S:{s.prevState.toString(2).padStart(K-1, '0')}</span>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">{s.input}</span>
                      <div className="w-full flex flex-col items-center mt-1 pt-0.5 border-t border-indigo-100">
                        <span className="text-[10px] text-slate-500 font-mono leading-none tracking-tighter">{s.outBits}</span>
                        <span className="text-[8px] text-slate-300 font-sans uppercase transform scale-90">Out</span>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Trellis Diagram */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
               <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('tbcc.circularTrellis')}</h3>
                <div className="text-[10px] text-slate-400">{t('tbcc.iterNote')}</div>
               </div>
               <Trellis />
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-700">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Original & Encoded</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] text-slate-500 mb-1 uppercase">Information Bits (Input)</div>
                      <div className="font-mono text-xl tracking-widest text-white truncate">{inputVector}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 mb-1 uppercase">Code Word (TBCC Encoded)</div>
                      <div className="font-mono text-sm text-indigo-400 break-all">{encodingResult.encoded}</div>
                    </div>
                  </div>
               </div>

               <div className={`p-5 rounded-xl border transition-colors ${decodingResult.decoded === inputVector ? 'bg-green-900/10 border-green-500/50' : 'bg-red-900/10 border-red-500/50'}`}>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Decoding Result</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] text-slate-500 mb-1 uppercase">Decoded Bits (WAVA)</div>
                        <div className={`font-mono text-xl tracking-widest ${decodingResult.decoded === inputVector ? 'text-green-500' : 'text-red-500'}`}>{decodingResult.decoded || "Decoding..."}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${decodingResult.isCircular ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                        {decodingResult.isCircular ? "Circular Matched" : "Non-Circular"}
                      </div>
                    </div>
                    <div className="flex gap-4">
                       <div>
                          <div className="text-[10px] text-slate-500 mb-1 uppercase">Accuracy</div>
                          <div className="text-lg font-bold">{decodingResult.decoded === inputVector ? "100%" : "Error"}</div>
                       </div>
                       <div>
                          <div className="text-[10px] text-slate-500 mb-1 uppercase">Final PM</div>
                          <div className="text-lg font-bold font-mono text-indigo-500">
                            {decodingResult.bestEndState !== -1 && decodingResult.allLayers.length > 0 
                              ? decodingResult.allLayers[decodingResult.allLayers.length - 1].pm[decodingResult.bestEndState] 
                              : "-"}
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TailBitingViterbi;
