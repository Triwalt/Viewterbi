import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, RotateCcw, Play, Info, Settings } from 'lucide-react';

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
      // 临时构建完整的移位寄存器值: bit + state
      // 注意：这里假设 bit 进入 MSB，state 是低位 (或者反之，需保持一致性)
      // 这里采用常见模型: state = (u_n-1, ... u_n-K+1). 新bit u_n
      // 寄存器全貌 (u_n, u_n-1, u_n-2)
      
      // 为了计算输出，我们需要把当前输入和寄存器状态结合
      // 假设 poly "111" 对应 (u_n, u_n-1, u_n-2)
      // 将 state 左移1位，加上 input bit 放在最低位，构成 K 位的窗口
      // 但为了和状态转移匹配，我们通常定义 state 为旧的记忆
      
      // 让我们构建一个临时值来做模2加法
      const fullReg = (bit << (K - 1)) | state;
      
      let symbol = "";
      for (let g of gens) {
        let sum = 0;
        const gVal = parseInt(g, 2);
        // 遍历生成多项式的每一位
        for (let b = 0; b < K; b++) {
          if ((gVal >> b) & 1) {
            sum ^= (fullReg >> b) & 1;
          }
        }
        symbol += sum;
      }
      output += symbol;
      
      // 更新状态: 丢弃最高位 (最旧的位), 左移, 补入新位
      // 状态定义为存储前 K-1 位
      // 比如 K=3, 状态是 2位. 
      // 新状态 = (原状态 << 1) & mask | input
      // 但通常 trellis 定义是 input 把旧值挤出去
      // 让我们使用文档中的风格: State = (u_{n-1}, u_{n-2}). Next State = (u_n, u_{n-1})
      // 即：input 变成新状态的高位 (或低位，取决于约定)。
      // 这里采用：NextState = (input * 2) + (CurrentState >> 1) ? 不对
      // 采用标准移位寄存器：NextState = ((CurrentState << 1) & mask) | input 
      // 且此时 state 存的是 (u_{n-1}, u_{n-2}) 这种形式
      // 等等，如果 State=00, in=1 -> Next=10 (文档 Example 5.1)
      // 这意味着 Input 进入了高位。
      // Current 00 (u_n-1=0, u_n-2=0). Input u_n=1.
      // Next 10 (u_n=1, u_n-1=0). 
      // 所以 update rule: nextState = (input << (K-2)) | (state >> 1)
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
    
    // 状态更新逻辑需与 Example 5.1 一致: 00 -(1)-> 10
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
    
    const n = receivedVector.length / 2; // 总时间步数 (假设码率1/2)
    const layers = []; // 每一层存储所有状态的信息
    
    // 初始化 t=0
    let currentLayer = Array(numStates).fill(null).map((_, i) => ({
      state: i,
      pm: i === 0 ? 0 : Infinity, // 起始状态必须是0
      path: [], // 存历史路径
      survivorBranch: null // 存当前最优的前驱分支信息
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
        incomingBranches: [] // 记录所有进入该节点的线，用于可视化剪枝
      }));

      // 遍历前一时刻的所有状态
      for (let prevState = 0; prevState < numStates; prevState++) {
        if (prevLayer[prevState].pm === Infinity) continue;

        // 尝试输入 0 和 1
        for (let input = 0; input <= 1; input++) {
          const { output, nextState } = getTransition(prevState, input);
          const bm = hammingDistance(receivedSymbol, output);
          const newPm = prevLayer[prevState].pm + bm;

          // 记录这条分支信息
          const branchInfo = {
            fromState: prevState,
            input: input,
            output: output,
            bm: bm,
            totalPm: newPm,
            isSurvivor: false // 稍后标记
          };
          
          nextLayer[nextState].incomingBranches.push(branchInfo);
        }
      }

      // ACS (Add-Compare-Select) 操作
      for (let s = 0; s < numStates; s++) {
        const node = nextLayer[s];
        if (node.incomingBranches.length === 0) continue;

        // 找到最小PM
        node.incomingBranches.sort((a, b) => a.totalPm - b.totalPm);
        const bestBranch = node.incomingBranches[0];
        
        // 标记幸存路径
        bestBranch.isSurvivor = true;
        // 如果有PM相等的情况，通常随机选或选索引小的，这里sort默认稳定或取第一个即可
        
        node.pm = bestBranch.totalPm;
        node.survivorBranch = bestBranch;
        // 继承路径历史
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
    // 假设最后回到状态0 (归零位)，或者取最后一层PM最小的
    const lastLayer = trellisData[trellisData.length - 1];
    // 寻找PM最小的状态作为终点
    let minPm = Infinity;
    let endState = 0;
    lastLayer.forEach(node => {
      if (node.pm < minPm) {
        minPm = node.pm;
        endState = node.state;
      }
    });
    
    // 获取该节点记录的完整路径
    // 路径格式: [{state: 2, input: 1, output: "11"}, ...]
    // 为了方便画图，我们需要把它转换成坐标序列
    const pathHistory = lastLayer[endState].path;
    // 加上起始点
    return [{state: 0, time: 0}, ...pathHistory.map((p, i) => ({state: p.state, time: i + 1}))];
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
        <Settings className="w-6 h-6"/> 硬判决维特比译码可视化 (Hard Decision Viterbi)
      </h1>

      {/* 控制面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">生成多项式 (G1, G2 - 二进制)</label>
            <div className="flex gap-2 mt-1">
              <input className="border p-1 rounded w-20" value={generators[0]} onChange={(e)=>setGenerators([e.target.value, generators[1]])} />
              <input className="border p-1 rounded w-20" value={generators[1]} onChange={(e)=>setGenerators([generators[0], e.target.value])} />
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
              {isAutoPlaying ? '暂停' : <><Play size={16}/> 播放</>}
            </button>
            <button onClick={() => setCurrentStep(Math.min(trellisData.length - 1, currentStep + 1))} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><ChevronRight /></button>
            <button onClick={() => {setCurrentStep(0); setIsAutoPlaying(false);}} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"><RotateCcw size={18} /></button>
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
                <text key={`time-${t}`} x={t * xSpacing + 60} y="20" className={`text-xs font-mono font-bold ${t === currentStep ? 'fill-blue-600' : 'fill-gray-400'}`}>
                  t={t}
                </text>
              ))}

              {/* 绘制连接线 (Edges) */}
              {trellisData.map((layer, t) => {
                // 只绘制到当前步
                if (t >= currentStep) return null;
                if (t >= trellisData.length - 1) return null; // 最后一层没有出边

                const nextLayer = trellisData[t+1];
                return nextLayer.map(targetNode => {
                  return targetNode.incomingBranches.map((branch, bIdx) => {
                    const x1 = t * xSpacing + 60;
                    const y1 = branch.fromState * ySpacing + 40;
                    const x2 = (t + 1) * xSpacing + 60;
                    const y2 = targetNode.state * ySpacing + 40;

                    const isSurvivor = branch.isSurvivor;
                    // 检查是否是最终回溯路径的一部分
                    const isFinalPath = (t + 1 === currentStep || currentStep === trellisData.length - 1) && 
                                        finalPath[t+1] && finalPath[t+1].state === targetNode.state && 
                                        finalPath[t] && finalPath[t].state === branch.fromState;

                    // 如果该节点在当前步骤是存活的，但不是本轮ACS的胜者，它就是被剪枝的
                    // 注意：如果 targetNode.pm 是 Infinity，说明这个节点根本不可达，不画线
                    if (layer[branch.fromState].pm === Infinity) return null;

                    return (
                      <g key={`edge-${t}-${targetNode.state}-${bIdx}`}>
                        <line 
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke={isFinalPath && currentStep === trellisData.length - 1 ? "#10B981" : (isSurvivor ? "#3B82F6" : "#EF4444")}
                          strokeWidth={isSurvivor ? 2 : 1}
                          strokeDasharray={isSurvivor ? "0" : "4 2"}
                          opacity={isSurvivor ? 1 : 0.3}
                        />
                        {/* 在线中间显示输出 bits */}
                        <text x={(x1+x2)/2} y={(y1+y2)/2 - 5} fontSize="10" fill={isSurvivor ? "#333" : "#ccc"} textAnchor="middle">
                          {branch.output}
                        </text>
                      </g>
                    );
                  });
                });
              })}

              {/* 绘制节点 (Nodes) */}
              {trellisData.map((layer, t) => {
                // 只渲染到当前步
                if (t > currentStep) return null;

                return layer.map((node, s) => {
                  const cx = t * xSpacing + 60;
                  const cy = s * ySpacing + 40;
                  const isReachable = node.pm !== Infinity;
                  const isCurrentHead = t === currentStep;
                  
                  // 检查是否是回溯路径上的点
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
            <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-red-400 border-dashed border-t border-red-400"></div> 剪除路径 (Pruned)</div>
            <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-green-500"></div> 最终回溯结果</div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[8px]">PM</div> 累积路径度量</div>
          </div>
        </div>

        {/* 右侧信息面板 */}
        <div className="w-full lg:w-80 bg-white p-4 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2">
            <Info size={20}/> 步骤详情 (t={currentStep})
          </h3>
          
          {currentStep > 0 && currentStep <= trellisData.length - 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <div className="text-sm text-gray-500">当前接收符号</div>
                <div className="text-2xl font-mono font-bold text-blue-700 tracking-widest">
                  {receivedVector.slice((currentStep-1)*2, currentStep*2)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-gray-600">ACS (加-比-选) 详情:</div>
                {trellisData[currentStep].map((node) => {
                  if (node.incomingBranches.length === 0) return null;
                  return (
                    <div key={node.state} className="border rounded p-2 text-xs bg-gray-50">
                      <div className="font-bold mb-1">Target State {node.state.toString(2).padStart(2,'0')}</div>
                      {node.incomingBranches.map((br, idx) => (
                        <div key={idx} className={`flex justify-between mb-1 p-1 rounded ${br.isSurvivor ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-400 line-through'}`}>
                          <span>Src:{br.fromState.toString(2).padStart(2,'0')} → Out:{br.output}</span>
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
                  // 通过回溯路径重建输入bit
                  // 实际上我们在trellisData里存了input历史，直接拿最后一个节点的path即可
                  return ""; 
                })}
                {(() => {
                   // 找到终点
                   let minPm = Infinity;
                   let endState = 0;
                   trellisData[currentStep].forEach(n => { if(n.pm < minPm) { minPm = n.pm; endState = n.state; }});
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
    </div>
  );
};

export default ViterbiDecoder;