import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, RotateCcw, Play, Pause, Info, Settings } from 'lucide-react';
import softFlow from './assets/soft.png';

const SoftViterbi = () => {
  // --- Configuration State ---
  const [generators, setGenerators] = useState(["111", "101"]);
  const [inputVector, setInputVector] = useState("110100");
  const [noiseStd, setNoiseStd] = useState(0.7);
  const [receivedSamples, setReceivedSamples] = useState([]);
  const [receivedSamplesStr, setReceivedSamplesStr] = useState("");

  // --- Animation State ---
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // --- Constants (K auto-derived from generators, max 6) ---
  const K = useMemo(() => Math.min(6, Math.max(2, ...generators.map(g => g.length))), [generators]);
  const numStates = Math.pow(2, K - 1);

  // --- Helper Functions ---
  const encode = (input, gens) => {
    let state = 0;
    let output = "";
    for (let i = 0; i < input.length; i++) {
      const bit = parseInt(input[i]);
      if (Number.isNaN(bit)) continue;
      const fullReg = (bit << (K - 1)) | state;
      let symbol = "";
      for (let g of gens) {
        let sum = 0;
        const gVal = parseInt(g, 2);
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
    let symbol = "";
    for (let g of generators) {
      let sum = 0;
      const gVal = parseInt(g, 2);
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

  const randn = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  // Auto-encode with noise
  useEffect(() => {
    try {
      const ideal = encode(inputVector, generators);
      const samples = [];
      for (let i = 0; i < ideal.length; i++) {
        const bit = ideal[i];
        const s = bit === '0' ? 1 : -1;
        const r = s + noiseStd * randn();
        samples.push(r);
      }
      setReceivedSamples(samples);
      setReceivedSamplesStr(samples.map(x => x.toFixed(2)).join(' '));
      setCurrentStep(0);
    } catch (e) {
      console.error("Encoding error", e);
    }
  }, [inputVector, generators, noiseStd, K]);

  // --- Soft Viterbi Algorithm ---
  const trellisData = useMemo(() => {
    if (!receivedSamples || receivedSamples.length < 2) return [];
    const n = Math.floor(receivedSamples.length / 2);
    const layers = [];
    let currentLayer = Array(numStates).fill(null).map((_, i) => ({
      state: i,
      pm: i === 0 ? 0 : Infinity,
      path: [],
      survivorBranch: null
    }));
    layers.push(currentLayer);

    for (let t = 0; t < n; t++) {
      const r0 = receivedSamples[2 * t];
      const r1 = receivedSamples[2 * t + 1];
      const prevLayer = layers[layers.length - 1];
      const nextLayer = Array(numStates).fill(null).map((_, i) => ({
        state: i,
        pm: Infinity,
        path: [],
        incomingBranches: []
      }));

      for (let prevState = 0; prevState < numStates; prevState++) {
        if (prevLayer[prevState].pm === Infinity) continue;
        for (let input = 0; input <= 1; input++) {
          const { output, nextState } = getTransition(prevState, input);
          const s0 = output[0] === '0' ? 1 : -1;
          const s1 = output[1] === '0' ? 1 : -1;
          const bm = (r0 - s0) * (r0 - s0) + (r1 - s1) * (r1 - s1);
          const newPm = prevLayer[prevState].pm + bm;
          const branchInfo = {
            fromState: prevState,
            input: input,
            output: output,
            bm: bm,
            totalPm: newPm,
            isSurvivor: false
          };
          nextLayer[nextState].incomingBranches.push(branchInfo);
        }
      }

      for (let s = 0; s < numStates; s++) {
        const node = nextLayer[s];
        if (node.incomingBranches.length === 0) continue;
        node.incomingBranches.sort((a, b) => a.totalPm - b.totalPm);
        const bestBranch = node.incomingBranches[0];
        bestBranch.isSurvivor = true;
        node.pm = bestBranch.totalPm;
        node.survivorBranch = bestBranch;
        node.path = [...prevLayer[bestBranch.fromState].path, {
          state: s,
          input: bestBranch.input,
          output: bestBranch.output
        }];
      }

      layers.push(nextLayer);
    }

    return layers;
  }, [receivedSamples, generators, numStates, K]);

  // --- Auto-play ---
  useEffect(() => {
    let interval;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < trellisData.length - 1) return prev + 1;
          setIsAutoPlaying(false);
          return prev;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, trellisData]);

  // --- Final Path ---
  const finalPath = useMemo(() => {
    if (!trellisData || trellisData.length === 0) return [];
    const lastLayer = trellisData[trellisData.length - 1];
    let minPm = Infinity;
    let endState = 0;
    lastLayer.forEach(node => {
      if (node.pm < minPm) {
        minPm = node.pm;
        endState = node.state;
      }
    });
    const pathHistory = lastLayer[endState].path;
    return [{ state: 0, time: 0 }, ...pathHistory.map((p, i) => ({ state: p.state, time: i + 1 }))];
  }, [trellisData]);

  // --- Handlers ---
  const handlePlayPause = () => setIsAutoPlaying(!isAutoPlaying);
  const handleReset = () => {
    setIsAutoPlaying(false);
    setCurrentStep(0);
  };
  const handleStepForward = () => {
    setIsAutoPlaying(false);
    if (currentStep < trellisData.length - 1) setCurrentStep(currentStep + 1);
  };
  const handleStepBack = () => {
    setIsAutoPlaying(false);
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // --- Rendering ---
  const nodeRadius = 16;
  const xSpacing = 100;
  const ySpacing = 80;
  const svgWidth = Math.max(600, trellisData.length * xSpacing + 50);
  const svgHeight = numStates * ySpacing + 50;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              软判决维特比译码 (Soft Decision Viterbi)
            </h1>
            <p className="text-slate-500 mt-1">使用欧氏距离进行最优路径译码的可视化演示</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <button onClick={handleStepBack} disabled={currentStep === 0} className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button onClick={handlePlayPause} className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
              {isAutoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={handleStepForward} disabled={currentStep === trellisData.length - 1} className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button onClick={handleReset} className="p-2 hover:bg-gray-100 rounded-md text-slate-600">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Theory Overview */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-600" />
            软判决维特比译码原理
          </h2>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>
              <strong>软判决维特比算法</strong>保留信道输出的幅度信息，使用<strong>欧氏距离</strong>或对数似然作为分支度量。相比硬判决，软判决能利用接收样本的置信度信息，通常可提升约2 dB的译码性能。
            </p>
            <p>
              每条分支的度量计算为 <code className="bg-blue-100 px-1 rounded">(r - s)²</code>，其中r是接收样本，s是理想发送符号（如+1/-1）。高置信度的样本在路径选择中权重更大，从而实现更优的译码效果。
            </p>
            <p className="bg-white/70 border-l-4 border-blue-400 pl-3 py-2 italic">
              💡 提示：调整噪声标准差观察译码性能变化，较小的噪声会产生更清晰的路径度量。
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Configuration */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Configuration</h2>

              <div className="space-y-4">
                {/* K Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">约束长度 (K)</span>
                    <span className="font-mono font-bold text-blue-600 text-lg">{K}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">自动从生成多项式推导 (最大6)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">生成多项式 (二进制, 最大6位)</label>
                  <div className="flex gap-2">
                    <input
                      className="w-24 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={generators[0]}
                      maxLength={6}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^01]/g, '').slice(0, 6);
                        setGenerators([val, generators[1]]);
                      }}
                    />
                    <input
                      className="w-24 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={generators[1]}
                      maxLength={6}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^01]/g, '').slice(0, 6);
                        setGenerators([generators[0], val]);
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">默认 (7,5)₈ = (111,101)₂</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">原始输入向量 (信息位)</label>
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm tracking-widest focus:ring-2 focus:ring-blue-500 outline-none"
                    value={inputVector}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^01]/g, '');
                      setInputVector(val);
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-1">建议末尾添加00以归零状态</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">噪声标准差 (AWGN)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={noiseStd}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) setNoiseStd(v);
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-1">调整噪声水平观察性能</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">接收软信息 (可编辑)</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-yellow-50 h-24 resize-none"
                    value={receivedSamplesStr}
                    onChange={(e) => {
                      const text = e.target.value;
                      setReceivedSamplesStr(text);
                      const tokens = text.trim().split(/\s+/).filter(Boolean);
                      const nums = tokens.map(t => parseFloat(t)).filter(x => !Number.isNaN(x));
                      setReceivedSamples(nums);
                    }}
                  />
                  <p className="text-xs text-red-500 mt-1">提示：修改样本观察路径变化</p>
                </div>
              </div>
            </div>

            {/* Current State */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Current State</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-slate-600">时间步 (t)</span>
                  <span className="font-mono font-bold text-slate-900">{currentStep}</span>
                </div>
                {currentStep > 0 && currentStep <= trellisData.length - 1 && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-100">
                    <div className="text-sm text-gray-500">当前接收样本</div>
                    <div className="text-xl font-mono font-bold text-blue-700">
                      {(() => {
                        const idx = (currentStep - 1) * 2;
                        const r0 = receivedSamples[idx];
                        const r1 = receivedSamples[idx + 1];
                        if (r0 === undefined || r1 === undefined) return '';
                        return `${r0.toFixed(2)} ${r1.toFixed(2)}`;
                      })()}
                    </div>
                  </div>
                )}
                {currentStep === trellisData.length - 1 && trellisData.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="font-bold text-green-800 mb-2">译码完成!</div>
                    <div className="text-xs text-gray-600">解码输出序列:</div>
                    <div className="font-mono text-lg break-all text-green-700">
                      {(() => {
                        let minPm = Infinity;
                        let endState = 0;
                        trellisData[currentStep].forEach(n => { if (n.pm < minPm) { minPm = n.pm; endState = n.state; } });
                        const path = trellisData[currentStep][endState].path;
                        return path.map(p => p.input).join("");
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-2 space-y-6">

            {/* Trellis Diagram */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Soft-Decision Viterbi Trellis</h2>
              <div className="overflow-x-auto pb-4">
                <svg width={svgWidth} height={svgHeight} className="mx-auto">
                  <defs>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="15" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#999" />
                    </marker>
                  </defs>

                  {/* State Labels */}
                  {Array(numStates).fill(0).map((_, i) => (
                    <text key={`label-${i}`} x="10" y={i * ySpacing + 40 + 5} className="text-xs font-mono fill-gray-500">
                      {i.toString(2).padStart(K - 1, '0')}
                    </text>
                  ))}

                  {/* Time Labels */}
                  {trellisData.map((_, t) => (
                    <text
                      key={`time-${t}`}
                      x={t * xSpacing + 60}
                      y="20"
                      textAnchor="middle"
                      className={`text-xs font-mono font-bold ${t === currentStep ? 'fill-blue-600' : 'fill-gray-400'}`}
                    >
                      t={t}
                    </text>
                  ))}

                  {/* Edges */}
                  {trellisData.map((layer, t) => {
                    if (t >= currentStep) return null;
                    if (t >= trellisData.length - 1) return null;
                    const nextLayer = trellisData[t + 1];
                    return nextLayer.map(targetNode => {
                      const branchesToRender = [...targetNode.incomingBranches].sort((a, b) => {
                        if (a.isSurvivor && !b.isSurvivor) return 1;
                        if (!a.isSurvivor && b.isSurvivor) return -1;
                        return 0;
                      });
                      return branchesToRender.map((branch) => {
                        const x1 = t * xSpacing + 60;
                        const y1 = branch.fromState * ySpacing + 40;
                        const x2 = (t + 1) * xSpacing + 60;
                        const y2 = targetNode.state * ySpacing + 40;
                        const isSurvivor = branch.isSurvivor;
                        const isFinalPath = (t + 1 === currentStep || currentStep === trellisData.length - 1) &&
                          finalPath[t + 1] && finalPath[t + 1].state === targetNode.state &&
                          finalPath[t] && finalPath[t].state === branch.fromState;
                        if (layer[branch.fromState].pm === Infinity) return null;
                        return (
                          <g key={`edge-${t}-${branch.fromState}-${targetNode.state}`}>
                            <line
                              x1={x1} y1={y1} x2={x2} y2={y2}
                              stroke={isFinalPath && currentStep === trellisData.length - 1 ? "#10B981" : (isSurvivor ? "#3B82F6" : "#EF4444")}
                              strokeWidth={isSurvivor ? 2 : 1}
                              strokeDasharray={isSurvivor ? "0" : "4 2"}
                              opacity={isSurvivor ? 1 : 0.3}
                            />
                            <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} fontSize="10" fill={isSurvivor ? "#333" : "#ccc"} textAnchor="middle">
                              {branch.output}
                            </text>
                          </g>
                        );
                      });
                    });
                  })}

                  {/* Nodes */}
                  {trellisData.map((layer, t) => {
                    if (t > currentStep) return null;
                    return layer.map((node, s) => {
                      const cx = t * xSpacing + 60;
                      const cy = s * ySpacing + 40;
                      const isReachable = node.pm !== Infinity;
                      const isCurrentHead = t === currentStep;
                      const isOnFinalPath = isCurrentHead && currentStep === trellisData.length - 1 && finalPath[t] && finalPath[t].state === node.state;
                      return (
                        <g key={`node-${t}-${s}`}>
                          <circle
                            cx={cx} cy={cy} r={nodeRadius}
                            fill={isOnFinalPath ? "#10B981" : (isReachable ? "#fff" : "#f3f4f6")}
                            stroke={isOnFinalPath ? "#059669" : (isReachable ? "#3B82F6" : "#d1d5db")}
                            strokeWidth={isCurrentHead ? 3 : 1}
                          />
                          {isReachable && (
                            <text x={cx} y={cy} dy="4" fontSize="10" textAnchor="middle" fill={isOnFinalPath ? "#fff" : "#000"}>
                              {Number.isFinite(node.pm) ? node.pm.toFixed(2) : ''}
                            </text>
                          )}
                        </g>
                      );
                    });
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-4 text-sm justify-center border-t pt-4">
                <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-blue-500"></div> 幸存路径</div>
                <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-red-400 border-dashed border-t border-red-400 opacity-30"></div> 剪除路径</div>
                <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-green-500"></div> 最终结果</div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[8px]">PM</div> 路径度量</div>
              </div>
            </div>

            {/* ACS Details */}
            {currentStep > 0 && currentStep <= trellisData.length - 1 && (
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">ACS (加-比-选) 详情</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {trellisData[currentStep].map((node) => {
                    if (node.incomingBranches.length === 0) return null;
                    return (
                      <div key={node.state} className="border rounded-lg p-3 text-xs bg-gray-50">
                        <div className="font-bold mb-2 text-slate-700">目标状态 {node.state.toString(2).padStart(K - 1, '0')}</div>
                        {node.incomingBranches.map((br, idx) => (
                          <div key={idx} className={`flex justify-between mb-1 p-2 rounded ${br.isSurvivor ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-400 line-through'}`}>
                            <span>源:{br.fromState.toString(2).padStart(K - 1, '0')} → 输出:{br.output}</span>
                            <span>PM:{(br.totalPm - br.bm).toFixed(2)} + BM:{br.bm.toFixed(2)} = {br.totalPm.toFixed(2)}</span>
                          </div>
                        ))}
                        {node.incomingBranches.length > 0 && (
                          <div className="text-right text-blue-600 mt-1 font-bold">选择 PM: {Number.isFinite(node.pm) ? node.pm.toFixed(2) : ''}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Flow Diagram */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-600" />
            软判决维特比译码流程
          </h2>
          <div className="flex justify-center">
            <img
              src={softFlow}
              alt="软判决维特比译码流程示意图"
              className="w-full max-w-5xl h-auto rounded-md shadow border border-gray-200"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default SoftViterbi;
