import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, RotateCcw, Play, Info, Settings, Github } from 'lucide-react';
import softFlow from './assets/soft.png';

const SoftViterbi = () => {
  const [generators, setGenerators] = useState(["111", "101"]);
  const [inputVector, setInputVector] = useState("110100");
  const [noiseStd, setNoiseStd] = useState(0.7);
  const [receivedSamples, setReceivedSamples] = useState([]);
  const [receivedSamplesStr, setReceivedSamplesStr] = useState("");

  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const K = 3;
  const numStates = Math.pow(2, K - 1);

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
  }, [inputVector, generators, noiseStd]);

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
  }, [receivedSamples, generators, numStates]);

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

  const nodeRadius = 16;
  const xSpacing = 100;
  const ySpacing = 80;
  const svgWidth = Math.max(600, trellisData.length * xSpacing + 50);
  const svgHeight = numStates * ySpacing + 50;

  return (
    <div className="flex flex-col p-4 max-w-6xl mx-auto bg-gray-50 min-h-screen font-sans">
      <h1 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
        <Settings className="w-6 h-6" /> 软判决维特比译码可视化 (Soft Decision Viterbi)
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">生成多项式 (G1, G2 - 二进制)</label>
            <div className="flex gap-2 mt-1">
              <input className="border p-1 rounded w-20" value={generators[0]} onChange={(e) => setGenerators([e.target.value, generators[1]])} />
              <input className="border p-1 rounded w-20" value={generators[1]} onChange={(e) => setGenerators([generators[0], e.target.value])} />
              <span className="text-xs text-gray-500 self-center">(默认 (7,5)8 码)</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">原始输入向量 (信息位)</label>
            <input
              className="border p-2 rounded w-full mt-1 tracking-widest font-mono"
              value={inputVector}
              onChange={(e) => {
                const val = e.target.value.replace(/[^01]/g, '');
                setInputVector(val);
              }}
            />
            <div className="text-xs text-gray-500 mt-1">建议在末尾添加00以归零状态</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">噪声标准差 (AWGN)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              className="border p-2 rounded w-32 mt-1"
              value={noiseStd}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) setNoiseStd(v);
              }}
            />
          </div>
        </div>

        <div className="space-y-4 border-l pl-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">接收软信息向量 (实数, 空格分隔)</label>
            <input
              className="border p-2 rounded w-full mt-1 font-mono bg-yellow-50"
              value={receivedSamplesStr}
              onChange={(e) => {
                const text = e.target.value;
                setReceivedSamplesStr(text);
                const tokens = text.trim().split(/\s+/).filter(Boolean);
                const nums = tokens.map(t => parseFloat(t)).filter(x => !Number.isNaN(x));
                setReceivedSamples(nums);
              }}
            />
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-500">长度: {receivedSamples.length}</span>
              <span className="text-red-500">提示：可手动修改某些样本，观察解码路径变化</span>
            </div>
          </div>
          <div className="flex gap-2 items-center pt-2">
            <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><ChevronLeft /></button>
            <button onClick={() => setIsAutoPlaying(!isAutoPlaying)} className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex gap-1 items-center font-bold w-24 justify-center">
              {isAutoPlaying ? '暂停' : <><Play size={16} /> 播放</>}
            </button>
            <button onClick={() => setCurrentStep(Math.min(trellisData.length - 1, currentStep + 1))} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><ChevronRight /></button>
            <button onClick={() => { setCurrentStep(0); setIsAutoPlaying(false); }} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"><RotateCcw size={18} /></button>
            <div className="ml-auto font-mono font-bold text-lg">Step: {currentStep} / {trellisData.length - 1}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-white p-4 rounded-lg shadow overflow-x-auto border border-gray-200">
          <h3 className="text-lg font-bold mb-2 text-gray-700 border-b pb-2">Soft-Decision Viterbi Trellis Diagram</h3>
          <div className="relative" style={{ width: svgWidth, height: svgHeight }}>
            <svg width={svgWidth} height={svgHeight}>
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="15" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#999" />
                </marker>
              </defs>

              {Array(numStates).fill(0).map((_, i) => (
                <text key={`label-${i}`} x="10" y={i * ySpacing + 40 + 5} className="text-xs font-mono fill-gray-500">
                  State {i.toString(2).padStart(2, '0')}
                </text>
              ))}

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

          <div className="flex gap-4 mt-2 text-sm justify-center border-t pt-2">
            <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-blue-500"></div> 幸存路径 (Survivor)</div>
            <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-red-400 border-dashed border-t border-red-400 opacity-30"></div> 剪除路径 (Pruned)</div>
            <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-green-500"></div> 最终回溯结果</div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[8px]">PM</div> 累积路径度量</div>
          </div>
        </div>

        <div className="w-full lg:w-80 bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2">
            <Info size={20} /> 步骤详情 (t={currentStep})
          </h3>

          {currentStep > 0 && currentStep <= trellisData.length - 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <div className="text-sm text-gray-500">当前接收样本</div>
                <div className="text-2xl font-mono font-bold text-blue-700 tracking-widest">
                  {(() => {
                    const idx = (currentStep - 1) * 2;
                    const r0 = receivedSamples[idx];
                    const r1 = receivedSamples[idx + 1];
                    if (r0 === undefined || r1 === undefined) return '';
                    return `${r0.toFixed(2)} ${r1.toFixed(2)}`;
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-gray-600">ACS (加-比-选) 详情:</div>
                {trellisData[currentStep].map((node) => {
                  if (node.incomingBranches.length === 0) return null;
                  return (
                    <div key={node.state} className="border rounded p-2 text-xs bg-gray-50">
                      <div className="font-bold mb-1">Target State {node.state.toString(2).padStart(2, '0')}</div>
                      {node.incomingBranches.map((br, idx) => (
                        <div key={idx} className={`flex justify-between mb-1 p-1 rounded ${br.isSurvivor ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-400 line-through'}`}>
                          <span>Src:{br.fromState.toString(2).padStart(2, '0')} → Out:{br.output}</span>
                          <span>PM:{(br.totalPm - br.bm).toFixed(2)} + BM:{br.bm.toFixed(2)} = {br.totalPm.toFixed(2)}</span>
                        </div>
                      ))}
                      {node.incomingBranches.length > 0 && (
                        <div className="text-right text-blue-600 mt-1 font-bold">Selected PM: {Number.isFinite(node.pm) ? node.pm.toFixed(2) : ''}</div>
                      )}
                    </div>
                  );
                })}
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

          {currentStep === 0 && (
            <div className="text-sm text-gray-500 italic">
              点击“播放”或“下一步”开始软判决维特比译码过程。
            </div>
          )}
        </div>
      </div>

      <section className="mt-8 bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
        <h3 className="text-lg font-bold text-gray-700">软判决维特比译码原理概览</h3>
        <p className="text-sm text-gray-600">
          对卷积码而言，发送端通过生成多项式在 trellis 图上选择一条路径，对应一串编码比特。信道传输（如 BPSK+AWGN）后，接收端得到的是带噪声的实值样本。
        </p>
        <p className="text-sm text-gray-600">
          相比<b>硬判决</b>维特比（先将样本判决成 0/1，并以<b>汉明距离</b>作为分支度量），本页面展示的<b>软判决</b>维特比尽量保留样本的幅度信息：
          每条 trellis 分支对应一个理论发送符号（如 +1/-1），分支度量使用<b>欧氏距离</b>或其等价的对数似然度量，例如 (r − s)^2 的累加，
          这样高置信度的样本在路径选择中权重更大，通常能比硬判决提升约 2 dB 左右的译码性能。
        </p>
        <p className="text-sm text-gray-600">
          页面中的 trellis 图与右侧 ACS 详情共同展示了：每个时间步下，各个状态的进入分支、对应的分支度量 BM 和累积路径度量 PM，
          以及最终回溯得到的最优信息比特序列，帮助理解软判决如何在算法层面利用“更丰富的信道信息”。
        </p>
        <div className="mt-4 flex justify-center">
          <img
            src={softFlow}
            alt="软判决维特比译码流程示意图"
            className="w-full max-w-5xl h-auto rounded-md shadow border border-gray-200"
          />
        </div>
      </section>

      <footer className="mt-12 pb-6 text-center text-gray-500 text-sm border-t border-gray-200 pt-6">
        <div className="flex flex-col items-center gap-2">
          <p>Interactive Soft-Decision Viterbi Visualizer - Viewterbi</p>
          <a
            href="https://github.com/Triwalt/Viewterbi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-600 transition-colors"
          >
            <Github size={16} />
            <span>View Source on GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default SoftViterbi;
