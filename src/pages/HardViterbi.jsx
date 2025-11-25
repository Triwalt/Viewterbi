import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, RotateCcw, Play, Info, Settings, Github } from 'lucide-react';
import hardFlow from '../assets/hard.png';

const ViterbiDecoder = () => {
  // --- 配置状态 ---
  // 生成多项式 (二进制数组), 默认为 (2,1,3) 码 -> (7, 5)8
  const [generators, setGenerators] = useState(["111", "101"]);
  const [inputVector, setInputVector] = useState("110100"); // 包含归零位
  const [receivedVector, setReceivedVector] = useState("");

  // --- 仿真状态 ---
  const [currentStep, setCurrentStep] = useState(0); // 当前处理的时间步 t
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // --- 常量 ---
  const K = 3; // 约束长度
  const numStates = Math.pow(2, K - 1); // 状态数 4

  // 辅助函数：计算汉明距离
  const hammingDistance = (s1, s2) => {
    let d = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] !== s2[i]) d++;
    }
    return d;
  };

  // 辅助函数：卷积编码 (计算理想输出)
  const encode = (input, gens) => {
    let state = 0; // 初始状态全是0
    let output = "";

    for (let i = 0; i < input.length; i++) {
      const bit = parseInt(input[i]);
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

      // 状态更新逻辑: 00 -(1)-> 10
      state = (bit << (K - 2)) | (state >> 1);
    }
    return output;
  };

  // 计算任意状态转移的输出和下一状态
  const getTransition = (currentState, inputBit) => {
    const gens = generators;
    const fullReg = (inputBit << (K - 1)) | currentState;

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

    const nextState = (inputBit << (K - 2)) | (currentState >> 1);

    return { output: symbol, nextState };
  };

  // 当输入或生成器改变时，重置并重新计算理想输出
  useEffect(() => {
    try {
      const ideal = encode(inputVector, generators);
      setReceivedVector(ideal);
      setCurrentStep(0);
    } catch (e) {
      console.error("Encoding error", e);
    }
  }, [inputVector, generators]);

  // --- 核心：维特比算法逻辑 (计算整个网格) ---
  const trellisData = useMemo(() => {
    if (!receivedVector) return [];

    const n = receivedVector.length / 2; // 总时间步数
    const layers = [];

    // 初始化 t=0
    let currentLayer = Array(numStates).fill(null).map((_, i) => ({
      state: i,
      pm: i === 0 ? 0 : Infinity,
      path: [],
      survivorBranch: null
    }));

    layers.push(currentLayer);

    // 逐步计算 t=1 到 n
    for (let t = 0; t < n; t++) {
      const receivedSymbol = receivedVector.slice(t * 2, t * 2 + 2);
      const prevLayer = layers[layers.length - 1];
      const nextLayer = Array(numStates).fill(null).map((_, i) => ({
        state: i,
        pm: Infinity,
        path: [],
        incomingBranches: []
      }));

      // 遍历前一时刻的所有状态
      for (let prevState = 0; prevState < numStates; prevState++) {
        if (prevLayer[prevState].pm === Infinity) continue;

        for (let input = 0; input <= 1; input++) {
          const { output, nextState } = getTransition(prevState, input);
          const bm = hammingDistance(receivedSymbol, output);
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

      // ACS 操作
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
  }, [receivedVector, generators, numStates]);

  // --- 自动播放 ---
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

  // --- 回溯：获取最终路径 ---
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


  // --- 渲染辅助 ---
  const nodeRadius = 16;
  const xSpacing = 100;
  const ySpacing = 80;
  const svgWidth = Math.max(600, trellisData.length * xSpacing + 50);
  const svgHeight = numStates * ySpacing + 50;

  return (
    <div className="flex flex-col p-4 max-w-6xl mx-auto bg-gray-50 min-h-screen font-sans">
      <h1 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
        <Settings className="w-6 h-6" /> 硬判决维特比译码可视化 (Hard Decision Viterbi)
      </h1>

      {/* 控制面板 */}
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
        </div>

        <div className="space-y-4 border-l pl-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">接收向量 (可编辑以模拟误码)</label>
            <input
              className="border p-2 rounded w-full mt-1 tracking-widest font-mono bg-yellow-50"
              value={receivedVector}
              onChange={(e) => {
                const val = e.target.value.replace(/[^01]/g, '');
                setReceivedVector(val);
              }}
            />
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-500">长度: {receivedVector.length} (需为偶数)</span>
              <span className="text-red-500">提示：尝试修改其中1-2位以观察纠错</span>
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

      {/* 可视化区域 */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* SVG 网格图 */}
        <div className="flex-1 bg-white p-4 rounded-lg shadow overflow-x-auto border border-gray-200">
          <h3 className="text-lg font-bold mb-2 text-gray-700 border-b pb-2">Viterbi Trellis Diagram</h3>
          <div className="relative" style={{ width: svgWidth, height: svgHeight }}>
            <svg width={svgWidth} height={svgHeight}>
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="15" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#999" />
                </marker>
              </defs>

              {/* 绘制状态标签 */}
              {Array(numStates).fill(0).map((_, i) => (
                <text key={`label-${i}`} x="10" y={i * ySpacing + 40 + 5} className="text-xs font-mono fill-gray-500">
                  State {i.toString(2).padStart(2, '0')}
                </text>
              ))}

              {/* 绘制时间步标签 */}
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

              {/* 绘制连接线 (Edges) */}
              {trellisData.map((layer, t) => {
                if (t >= currentStep) return null;
                if (t >= trellisData.length - 1) return null;

                const nextLayer = trellisData[t + 1];
                return nextLayer.map(targetNode => {
                  // 关键修改：对分支进行排序渲染
                  // 将非幸存者（Deleted）放在数组前面，幸存者（Survivor）放在后面
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

              {/* 绘制节点 (Nodes) */}
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
                          {node.pm}
                        </text>
                      )}
                    </g>
                  );
                });
              })}
            </svg>
          </div>

          {/* 图例 */}
          <div className="flex gap-4 mt-2 text-sm justify-center border-t pt-2">
            <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-blue-500"></div> 幸存路径 (Survivor)</div>
            <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-red-400 border-dashed border-t border-red-400 opacity-30"></div> 剪除路径 (Pruned)</div>
            <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-green-500"></div> 最终回溯结果</div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[8px]">PM</div> 累积路径度量</div>
          </div>
        </div>

        {/* 右侧信息面板 */}
        <div className="w-full lg:w-80 bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2">
            <Info size={20} /> 步骤详情 (t={currentStep})
          </h3>

          {currentStep > 0 && currentStep <= trellisData.length - 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <div className="text-sm text-gray-500">当前接收符号</div>
                <div className="text-2xl font-mono font-bold text-blue-700 tracking-widest">
                  {receivedVector.slice((currentStep - 1) * 2, currentStep * 2)}
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
                          <span>PM:{br.totalPm - br.bm} + BM:{br.bm} = {br.totalPm}</span>
                        </div>
                      ))}
                      {node.incomingBranches.length > 0 && (
                        <div className="text-right text-blue-600 mt-1 font-bold">Selected PM: {node.pm}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {currentStep === trellisData.length - 1 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <div className="font-bold text-green-800 mb-2">译码完成!</div>
              <div className="text-xs text-gray-600">解码输出序列:</div>
              <div className="font-mono text-lg break-all text-green-700">
                {finalPath.slice(1).map(p => {
                  return "";
                })}
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
              点击“播放”或“下一步”开始译码过程。
            </div>
          )}
        </div>
      </div>

      <section className="mt-8 bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
        <h3 className="text-lg font-bold text-gray-700">硬判决维特比译码原理概览</h3>
        <p className="text-sm text-gray-600">
          以卷积码为例，发送端将信息序列通过移位寄存器和生成多项式映射到输出比特对，在时间-状态平面上形成 trellis 图上的一条路径。
        </p>
        <p className="text-sm text-gray-600">
          在<b>硬判决</b>场景下，接收端先对信道输出做 0/1 判决，只保留二值符号。维特比算法使用
          <b>汉明距离</b>作为每条分支的度量（接收比特与理想输出比特不同的个数），并在每个时间步对所有可能分支执行“加-比-选”（Add-Compare-Select），
          选择累积汉明距离最小的幸存路径继续向前扩展，最终得到整体汉明距离最小的路径作为译码结果。
        </p>
        <p className="text-sm text-gray-600">
          本页面中的 trellis 图展示了在每个时间步的所有状态、分支以及对应的路径度量（PM），帮助直观理解“加-比-选”过程以及最终回溯得到的最优路径。
          若要了解软判决的实现和性能提升，可以切换到 Soft Viterbi 页面查看对应的可视化与说明。
        </p>
        <div className="mt-4 flex justify-center">
          <img
            src={hardFlow}
            alt="硬判决维特比译码流程示意图"
            className="w-full max-w-5xl h-auto rounded-md shadow border border-gray-200"
          />
        </div>
      </section>

      {/* 页脚 */}
      <footer className="mt-12 pb-6 text-center text-gray-500 text-sm border-t border-gray-200 pt-6">
        <div className="flex flex-col items-center gap-2">
          <p>Interactive Viterbi Algorithm Visualizer made by Triwalt @SYSU</p>
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

export default ViterbiDecoder;