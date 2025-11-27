import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings, Play, Pause, RotateCcw, ChevronRight, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ConvEncoder = () => {
  const { t } = useLanguage();

  // --- Configuration State ---
  const [generators, setGenerators] = useState(["111", "101"]);
  const [inputVector, setInputVector] = useState("110100");

  // Derive K from generators (max length, min 2, max 6)
  const K = useMemo(() => Math.min(6, Math.max(2, ...generators.map(g => g.length))), [generators]);

  // --- Animation State ---
  const [currentStep, setCurrentStep] = useState(0); // 0 to steps.length
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  // --- Logic ---
  const sanitizeBits = (str) => str.replace(/[^01]/g, '');

  const { steps, encoded, trellisData } = useMemo(() => {
    const bits = sanitizeBits(inputVector || "");
    let state = 0;
    const stepsArr = [];
    let output = "";

    // For trellis visualization
    const numStates = 1 << (K - 1);
    const path = [{ state: 0, t: 0 }];

    for (let i = 0; i < bits.length; i++) {
      const bit = parseInt(bits[i]);
      if (Number.isNaN(bit)) continue;

      const prevState = state;
      const fullReg = (bit << (K - 1)) | state;

      let symbol = "";
      for (let g of generators) {
        let sum = 0;
        // Iterate string directly. '1' at index j taps bit (K - 1 - j)
        for (let j = 0; j < g.length; j++) {
          if (g[j] === '1') {
            // Tap the bit corresponding to this position
            // Position 0 is MSB (Input).
            // fullReg bit (K-1) is MSB.
            sum ^= (fullReg >> (K - 1 - j)) & 1;
          }
        }
        symbol += sum;
      }

      output += symbol;
      const nextState = (bit << (K - 2)) | (state >> 1);

      stepsArr.push({
        t: i,
        input: bit,
        prevState,
        nextState,
        regBits: fullReg.toString(2).padStart(K, '0'),
        outBits: symbol,
      });

      path.push({ state: nextState, t: i + 1 });
      state = nextState;
    }

    return { steps: stepsArr, encoded: output, trellisData: { numStates, path } };
  }, [inputVector, generators, K]);

  // --- Animation Loop ---
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < steps.length) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 1000); // 1 second per step
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, steps.length]);

  // --- Handlers ---
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };
  const handleStepForward = () => {
    setIsPlaying(false);
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };
  const handleStepBack = () => {
    setIsPlaying(false);
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // --- Derived Render Data ---
  const currentStepData = steps[currentStep < steps.length ? currentStep : steps.length - 1];
  const activeStepIndex = currentStep < steps.length ? currentStep : steps.length - 1;
  const activeStep = steps[activeStepIndex];
  const regBits = activeStep ? activeStep.regBits : "0".repeat(K);

  const generatorColors = [
    "#ef4444", // red-500
    "#f97316", // orange-500
    "#eab308", // yellow-500
    "#22c55e", // green-500
    "#06b6d4", // cyan-500
    "#3b82f6", // blue-500
    "#a855f7", // purple-500
    "#ec4899", // pink-500
  ];

  const ShiftRegister = () => {
    const bitNodes = regBits.split('').map(b => parseInt(b));
    const cellWidth = 50;
    const cellHeight = 50;
    const gap = 40;
    const startX = 100;
    const startY = 60;

    const laneHeight = 30;
    const busHeight = generators.length * laneHeight + 40;
    const svgHeight = startY + cellHeight + busHeight + 60;
    const svgWidth = Math.max(700, startX + K * (cellWidth + gap) + 150);

    return (
      <div className="relative bg-slate-900 rounded-xl p-6 shadow-inner border border-slate-700 overflow-hidden">
        <div className="absolute top-2 left-4 text-slate-400 text-xs font-mono">SHIFT REGISTER (K={K})</div>

        <div className="overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="mx-auto">
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#64748b" />
              </marker>
            </defs>

            {/* Input Node */}
            <g transform={`translate(20, ${startY})`}>
              <rect x="0" y="0" width={cellWidth} height={cellHeight} rx="8"
                className={`stroke-2 ${currentStep < steps.length ? 'fill-blue-900 stroke-blue-500' : 'fill-slate-800 stroke-slate-600'}`} />
              <text x={cellWidth / 2} y={cellHeight / 2 + 5} textAnchor="middle" className="fill-white font-mono font-bold text-xl">
                {currentStep < steps.length ? steps[currentStep].input : '-'}
              </text>
              <text x={cellWidth / 2} y={-10} textAnchor="middle" className="fill-slate-400 text-xs">{t('convEncoder.inputBit')}</text>
            </g>

            {/* Connection Input -> First Cell */}
            <line x1={20 + cellWidth} y1={startY + cellHeight / 2} x2={startX} y2={startY + cellHeight / 2}
              stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* Register Cells and Vertical Bus Lines */}
            {bitNodes.map((bit, idx) => {
              const x = startX + idx * (cellWidth + gap);
              const busX = x + cellWidth / 2;
              const busEndY = startY + cellHeight + generators.length * laneHeight + 20;

              return (
                <g key={idx}>
                  <g transform={`translate(${x}, ${startY})`}>
                    <rect x="0" y="0" width={cellWidth} height={cellHeight} rx="8"
                      className={`stroke-2 transition-all duration-300 ${currentStep > 0 || (currentStep === 0 && idx === 0 && isPlaying) ? 'fill-slate-800 stroke-emerald-500' : 'fill-slate-800 stroke-slate-600'}`} />
                    <text x={cellWidth / 2} y={cellHeight / 2 + 5} textAnchor="middle" className="fill-white font-mono font-bold text-xl">
                      {bit}
                    </text>
                    <text x={cellWidth / 2} y={cellHeight + 20} textAnchor="middle" className="fill-slate-500 text-xs font-mono">D{idx}</text>
                  </g>

                  {/* Vertical Bus Line from Cell */}
                  <line x1={busX} y1={startY + cellHeight} x2={busX} y2={busEndY}
                    stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Connection to next cell */}
                  {idx < K - 1 && (
                    <line x1={x + cellWidth} y1={startY + cellHeight / 2} x2={x + cellWidth + gap} y2={startY + cellHeight / 2}
                      stroke="#64748b" strokeWidth="2" markerEnd="url(#arrow)" />
                  )}
                </g>
              );
            })}

            {/* Generator Horizontal Lines and Taps */}
            {generators.map((gen, gIdx) => {
              const color = generatorColors[gIdx % generatorColors.length];
              const y = startY + cellHeight + 30 + gIdx * laneHeight;
              const adderX = startX + K * (cellWidth + gap) + 40;

              // Draw horizontal line for this generator
              const railStartX = startX - 20;

              return (
                <g key={`gen-${gIdx}`}>
                  {/* Horizontal Rail */}
                  <line x1={railStartX} y1={y} x2={adderX} y2={y} stroke={color} strokeWidth="2" opacity="0.3" />

                  {/* Active Taps */}
                  {Array.from({ length: gen.length }).map((_, i) => {
                    if (gen[i] !== '1') return null;
                    const visualIndex = i;
                    const busX = startX + visualIndex * (cellWidth + gap) + cellWidth / 2;

                    return (
                      <g key={`tap-${gIdx}-${i}`}>
                        {/* Connection Dot */}
                        <circle cx={busX} cy={y} r="4" fill={color} stroke="#1e293b" strokeWidth="1" />
                        {/* Highlight segment to adder */}
                        <line x1={busX} y1={y} x2={adderX} y2={y} stroke={color} strokeWidth="2" />
                      </g>
                    );
                  })}

                  {/* Adder Node */}
                  <circle cx={adderX} cy={y} r="12" fill="#1e293b" stroke={color} strokeWidth="2" />
                  <text x={adderX} y={y + 4} textAnchor="middle" className="fill-white font-bold text-lg" style={{ fontSize: '16px' }}>+</text>

                  {/* Output Line */}
                  <line x1={adderX + 12} y1={y} x2={svgWidth - 50} y2={y} stroke={color} strokeWidth="2" markerEnd="url(#arrow)" />

                  {/* Output Label */}
                  <text x={svgWidth - 40} y={y + 5} fill={color} className="font-mono text-sm font-bold">G{gIdx + 1}</text>
                </g>
              );
            })}

          </svg>
        </div>

        {/* Generator Info Overlay */}
        <div className="absolute top-4 right-4 text-right">
          <div className="text-xs text-slate-500">{t('convEncoder.generatorsBinary')}: {generators.join(', ')}</div>
        </div>
      </div>
    );
  };

  const Trellis = () => {
    const xSpacing = 60;
    const ySpacing = 50;
    const width = Math.max(600, (steps.length + 1) * xSpacing + 100);
    const height = trellisData.numStates * ySpacing + 60;

    return (
      <div className="overflow-x-auto pb-4">
        <svg width={width} height={height} className="mx-auto">
          {/* Grid Lines & States */}
          {Array.from({ length: steps.length + 1 }).map((_, t) => (
            <g key={`col-${t}`}>
              <text x={50 + t * xSpacing} y={30} textAnchor="middle" className="text-xs fill-slate-400 font-mono">t={t}</text>
              {Array.from({ length: trellisData.numStates }).map((_, s) => (
                <circle
                  key={`node-${t}-${s}`}
                  cx={50 + t * xSpacing}
                  cy={50 + s * ySpacing}
                  r={4}
                  className="fill-slate-300"
                />
              ))}
            </g>
          ))}

          {/* State Labels */}
          {Array.from({ length: trellisData.numStates }).map((_, s) => (
            <text key={`label-${s}`} x={10} y={55 + s * ySpacing} className="text-[10px] fill-slate-500 font-mono">
              {s.toString(2).padStart(K - 1, '0')}
            </text>
          ))}

          {/* Active Path */}
          {trellisData.path.slice(0, currentStep + 1).map((node, i) => {
            if (i === 0) return null;
            const prevNode = trellisData.path[i - 1];
            const x1 = 50 + (prevNode.t) * xSpacing;
            const y1 = 50 + prevNode.state * ySpacing;
            const x2 = 50 + node.t * xSpacing;
            const y2 = 50 + node.state * ySpacing;

            return (
              <g key={`path-${i}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#2563EB"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <circle cx={x1} cy={y1} r={5} fill="#2563EB" />
                <circle cx={x2} cy={y2} r={5} fill="#2563EB" />
              </g>
            );
          })}

          {/* Current Head Indicator */}
          {currentStep <= steps.length && (
            <circle
              cx={50 + currentStep * xSpacing}
              cy={50 + trellisData.path[currentStep].state * ySpacing}
              r={8}
              fill="none"
              stroke="#EF4444"
              strokeWidth={2}
              className="animate-pulse"
            />
          )}

        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 font-sans text-slate-800 dark:text-slate-200">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              {t('convEncoder.title')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('convEncoder.subtitle')}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <button onClick={handleStepBack} disabled={currentStep === 0} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 dark:text-white">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button onClick={handlePlayPause} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={handleStepForward} disabled={currentStep === steps.length} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 dark:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
            <button onClick={handleReset} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-slate-600 dark:text-slate-300">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Theory Overview */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {t('convEncoder.theoryTitle')}
          </h2>
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>{t('convEncoder.theoryP1')}</p>
            <p>{t('convEncoder.theoryP2')}</p>
            <p className="bg-white/70 dark:bg-gray-800/70 border-l-4 border-blue-400 dark:border-blue-600 pl-3 py-2 italic" dangerouslySetInnerHTML={{ __html: t('convEncoder.theoryExample') }} />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Settings & Info */}
          {/* Left Column: Settings & Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">{t('hardViterbi.configuration')}</h2>

              <div className="space-y-4">
                {/* K is now auto-derived, display it */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">{t('hardViterbi.constraintLength')}</span>
                    <span className="font-mono font-bold text-blue-600 text-lg">{K}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t('hardViterbi.autoDerived')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('hardViterbi.generators')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {generators.map((g, i) => (
                      <input
                        key={i}
                        className="w-24 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={g}
                        maxLength={6}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^01]/g, '').slice(0, 6);
                          const newG = [...generators];
                          newG[i] = val;
                          setGenerators(newG);
                          handleReset();
                        }}
                      />
                    ))}
                    <button
                      onClick={() => setGenerators([...generators, "1".padEnd(Math.min(K, 6), '0')])}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-slate-600"
                    >
                      +
                    </button>
                    {generators.length > 1 && (
                      <button
                        onClick={() => {
                          const newG = [...generators];
                          newG.pop();
                          setGenerators(newG);
                          handleReset();
                        }}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-slate-600"
                      >
                        -
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('convEncoder.inputSequence')}</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                    value={inputVector}
                    onChange={(e) => {
                      setInputVector(sanitizeBits(e.target.value));
                      handleReset();
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-1">{t('convEncoder.inputSequenceTip')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('hardViterbi.currentState')}</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-slate-600">{t('hardViterbi.timeStep')}</span>
                  <span className="font-mono font-bold text-slate-900">{currentStep}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-slate-600">{t('convEncoder.inputBit')}</span>
                  <span className="font-mono font-bold text-blue-600">{currentStep < steps.length ? steps[currentStep].input : t('common.done')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-slate-600">{t('convEncoder.outputBits')}</span>
                  <span className="font-mono font-bold text-purple-600">{currentStep > 0 ? steps[currentStep - 1].outBits : '-'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-600">{t('convEncoder.encodedSequence')}</span>
                </div>
                <div className="bg-slate-50 dark:bg-gray-900 p-2 rounded border border-slate-200 dark:border-gray-600 font-mono text-xs break-all text-slate-700 dark:text-slate-300">
                  {encoded.substring(0, currentStep * generators.length)}
                  <span className="text-slate-300 dark:text-slate-600">{encoded.substring(currentStep * generators.length)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-2 space-y-6">

            {/* Shift Register Animation */}
            <ShiftRegister />

            {/* Trellis Diagram */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('convEncoder.trellisPath')}</h2>
              <Trellis />
            </div>

            {/* Step Table */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('convEncoder.encodingSteps')}</h2>
              <div className="overflow-x-auto max-h-60">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-4 py-2">t</th>
                      <th className="px-4 py-2">{t('convEncoder.inputBit')}</th>
                      <th className="px-4 py-2">{t('convEncoder.state')}</th>
                      <th className="px-4 py-2">{t('convEncoder.outputBits')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {steps.map((s, i) => (
                      <tr key={i} className={`transition-colors ${i === currentStep - 1 ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-2 font-mono text-slate-500">{s.t}</td>
                        <td className="px-4 py-2 font-mono">{s.input}</td>
                        <td className="px-4 py-2 font-mono text-slate-500">{s.prevState.toString(2).padStart(K - 1, '0')} → {s.nextState.toString(2).padStart(K - 1, '0')}</td>
                        <td className="px-4 py-2 font-mono font-bold text-purple-600">{s.outBits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* Optimal Generators Reference */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" />
            {t('convEncoder.optimalGenerators')}
          </h2>

          <div className="overflow-x-auto mb-6">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('hardViterbi.constraintLength')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('convEncoder.codeRate')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('convEncoder.generatorsBinary')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('convEncoder.generatorsOctal')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('convEncoder.freeDistance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold">3</td>
                  <td className="px-4 py-3">1/2</td>
                  <td className="px-4 py-3 font-mono text-blue-600">111, 101</td>
                  <td className="px-4 py-3 font-mono text-slate-500">7, 5</td>
                  <td className="px-4 py-3 font-bold">5</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold">4</td>
                  <td className="px-4 py-3">1/2</td>
                  <td className="px-4 py-3 font-mono text-blue-600">1111, 1101</td>
                  <td className="px-4 py-3 font-mono text-slate-500">17, 15</td>
                  <td className="px-4 py-3 font-bold">6</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold">5</td>
                  <td className="px-4 py-3">1/2</td>
                  <td className="px-4 py-3 font-mono text-blue-600">11111, 10111</td>
                  <td className="px-4 py-3 font-mono text-slate-500">37, 27</td>
                  <td className="px-4 py-3 font-bold">7</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold">6</td>
                  <td className="px-4 py-3">1/2</td>
                  <td className="px-4 py-3 font-mono text-blue-600">111111, 101101</td>
                  <td className="px-4 py-3 font-mono text-slate-500">77, 55</td>
                  <td className="px-4 py-3 font-bold">8</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold">3</td>
                  <td className="px-4 py-3">1/3</td>
                  <td className="px-4 py-3 font-mono text-blue-600">111, 101, 011</td>
                  <td className="px-4 py-3 font-mono text-slate-500">7, 5, 3</td>
                  <td className="px-4 py-3 font-bold">8</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold">4</td>
                  <td className="px-4 py-3">1/3</td>
                  <td className="px-4 py-3 font-mono text-blue-600">1111, 1101, 1011</td>
                  <td className="px-4 py-3 font-mono text-slate-500">17, 15, 13</td>
                  <td className="px-4 py-3 font-bold">10</td>
                </tr>
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold">5</td>
                  <td className="px-4 py-3">1/3</td>
                  <td className="px-4 py-3 font-mono text-blue-600">11111, 11011, 10101</td>
                  <td className="px-4 py-3 font-mono text-slate-500">37, 33, 25</td>
                  <td className="px-4 py-3 font-bold">12</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 mb-2">{t('convEncoder.tapSelectionTitle')}</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 pl-2">
                <li>
                  <strong>{t('convEncoder.tapP1Title')}</strong>{t('convEncoder.tapP1')}
                </li>
                <li>
                  <strong>{t('convEncoder.tapP2Title')}</strong>{t('convEncoder.tapP2')}
                </li>
                <li>
                  <strong>{t('convEncoder.tapP3Title')}</strong>{t('convEncoder.tapP3')}
                </li>
                <li>
                  <strong>{t('convEncoder.tapP4Title')}</strong>{t('convEncoder.tapP4')}
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <span className="text-amber-600">💡</span>
                {t('convEncoder.impactTitle')}
              </h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 pl-2">
                <li>
                  <strong>{t('convEncoder.impactP1Title')}</strong>{t('convEncoder.impactP1')}
                </li>
                <li>
                  <strong>{t('convEncoder.impactP2Title')}</strong>{t('convEncoder.impactP2')}
                </li>
                <li>
                  <strong>{t('convEncoder.impactP3Title')}</strong>{t('convEncoder.impactP3')}
                </li>
                <li>
                  <strong>{t('convEncoder.impactP4Title')}</strong>{t('convEncoder.impactP4')}
                </li>
              </ul>
            </div>

            <div className="text-xs text-slate-500 italic mt-4 pt-4 border-t border-slate-200">
              {t('convEncoder.reference')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvEncoder;
