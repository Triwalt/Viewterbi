import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

// Translation dictionary
const translations = {
  // App navigation
  app: {
    title: {
      zh: 'Viewterbi',
      en: 'Viewterbi'
    },
    hardViterbi: {
      zh: 'Hard Viterbi',
      en: 'Hard Viterbi'
    },
    softViterbi: {
      zh: 'Soft Viterbi',
      en: 'Soft Viterbi'
    },
    convEncoder: {
      zh: 'Conv Encoder',
      en: 'Conv Encoder'
    },
    bcjrDecoder: {
      zh: 'BCJR Decoder',
      en: 'BCJR Decoder'
    },
    tbcc: {
      zh: 'TBCC (咬尾码)',
      en: 'TBCC'
    }
  },

  // Hard Viterbi
  hardViterbi: {
    title: {
      zh: '硬判决维特比译码',
      en: 'Hard Decision Viterbi'
    },
    subtitle: {
      zh: '使用汉明距离进行最优路径译码的可视化演示',
      en: 'Optimal path decoding visualization using Hamming distance'
    },
    theoryTitle: {
      zh: '硬判决维特比译码原理',
      en: 'Hard Decision Viterbi Decoding Theory'
    },
    theoryP1: {
      zh: '硬判决维特比算法是一种基于动态规划的最优译码算法。接收端先将信道输出进行0/1硬判决，然后使用汉明距离作为分支度量（接收比特与理想输出比特不同的个数）。',
      en: 'Hard decision Viterbi algorithm is an optimal decoding algorithm based on dynamic programming. The receiver first performs hard 0/1 decisions on channel outputs, then uses Hamming distance as the branch metric (number of bits differing between received and ideal output bits).'
    },
    theoryP2: {
      zh: '算法在每个时间步对所有可能的分支执行"加-比-选"(ACS, Add-Compare-Select)操作：累加路径度量、比较不同路径、选择累积汉明距离最小的幸存路径。最终通过回溯得到整体汉明距离最小的路径作为译码结果。',
      en: 'At each time step, the algorithm performs Add-Compare-Select (ACS) operations on all possible branches: accumulate path metrics, compare different paths, and select the survivor path with minimum cumulative Hamming distance. Finally, backtracking yields the path with minimum overall Hamming distance as the decoding result.'
    },
    theoryTip: {
      zh: '💡 提示：尝试修改接收向量中的1-2个比特，观察维特比算法如何通过最优路径选择实现纠错。',
      en: '💡 Tip: Try modifying 1-2 bits in the received vector to observe how the Viterbi algorithm achieves error correction through optimal path selection.'
    },
    configuration: {
      zh: 'Configuration',
      en: 'Configuration'
    },
    constraintLength: {
      zh: '约束长度 (K)',
      en: 'Constraint Length (K)'
    },
    autoDerived: {
      zh: '自动从生成多项式推导 (最大6)',
      en: 'Auto-derived from generators (max 6)'
    },
    generators: {
      zh: '生成多项式 (二进制, 最大6位)',
      en: 'Generators (Binary, Max 6 bits)'
    },
    generatorsDefault: {
      zh: '默认 (7,5)₈ = (111,101)₂',
      en: 'Default (7,5)₈ = (111,101)₂'
    },
    inputVector: {
      zh: '原始输入向量',
      en: 'Input Vector'
    },
    inputVectorTip: {
      zh: '建议末尾添加00以归零状态',
      en: 'Append 00 at end to terminate'
    },
    receivedVector: {
      zh: '接收向量 (可编辑模拟误码)',
      en: 'Received Vector (Editable to simulate errors)'
    },
    receivedVectorTip: {
      zh: '提示：修改1-2位观察纠错',
      en: 'Tip: Modify 1-2 bits to observe error correction'
    },
    currentState: {
      zh: 'Current State',
      en: 'Current State'
    },
    timeStep: {
      zh: '时间步 (t)',
      en: 'Time Step (t)'
    },
    receivedSymbol: {
      zh: '当前接收符号',
      en: 'Current Received Symbol'
    },
    decodingComplete: {
      zh: '译码完成!',
      en: 'Decoding Complete!'
    },
    decodedOutput: {
      zh: '解码输出序列:',
      en: 'Decoded Output Sequence:'
    },
    trellisDiagram: {
      zh: 'Viterbi Trellis Diagram',
      en: 'Viterbi Trellis Diagram'
    },
    survivorPath: {
      zh: '幸存路径',
      en: 'Survivor Path'
    },
    prunedPath: {
      zh: '剪除路径',
      en: 'Pruned Path'
    },
    finalResult: {
      zh: '最终结果',
      en: 'Final Result'
    },
    pathMetric: {
      zh: '路径度量',
      en: 'Path Metric'
    },
    acsDetails: {
      zh: 'ACS (加-比-选) 详情',
      en: 'ACS (Add-Compare-Select) Details'
    },
    targetState: {
      zh: '目标状态',
      en: 'Target State'
    },
    source: {
      zh: '源',
      en: 'Source'
    },
    output: {
      zh: '输出',
      en: 'Output'
    },
    selected: {
      zh: '选择 PM',
      en: 'Selected PM'
    },
    flowTitle: {
      zh: '硬判决维特比译码流程',
      en: 'Hard Decision Viterbi Decoding Flow'
    }
  },

  // Soft Viterbi
  softViterbi: {
    title: {
      zh: '软判决维特比译码',
      en: 'Soft Decision Viterbi'
    },
    subtitle: {
      zh: '使用欧氏距离进行最优路径译码的可视化演示',
      en: 'Optimal path decoding visualization using Euclidean distance'
    },
    theoryTitle: {
      zh: '软判决维特比译码原理',
      en: 'Soft Decision Viterbi Decoding Theory'
    },
    theoryP1: {
      zh: '软判决维特比算法保留信道输出的幅度信息，使用欧氏距离或对数似然作为分支度量。相比硬判决，软判决能利用接收样本的置信度信息，通常可提升约2 dB的译码性能。',
      en: 'Soft decision Viterbi algorithm preserves amplitude information of channel outputs, using Euclidean distance or log-likelihood as branch metrics. Compared to hard decision, soft decision leverages confidence information of received samples, typically achieving about 2 dB performance improvement.'
    },
    theoryP2: {
      zh: '每条分支的度量计算为 (r - s)²，其中r是接收样本，s是理想发送符号（如+1/-1）。高置信度的样本在路径选择中权重更大，从而实现更优的译码效果。',
      en: 'Each branch metric is calculated as (r - s)², where r is the received sample and s is the ideal transmitted symbol (e.g., +1/-1). High-confidence samples have greater weight in path selection, achieving better decoding performance.'
    },
    theoryTip: {
      zh: '💡 提示：调整噪声标准差观察译码性能变化，较小的噪声会产生更清晰的路径度量。',
      en: '💡 Tip: Adjust noise standard deviation to observe decoding performance changes; lower noise produces clearer path metrics.'
    },
    inputVectorInfo: {
      zh: '原始输入向量 (信息位)',
      en: 'Input Vector (Information Bits)'
    },
    noiseStd: {
      zh: '噪声标准差 (AWGN)',
      en: 'Noise Std Dev (AWGN)'
    },
    noiseStdTip: {
      zh: '调整噪声水平观察性能',
      en: 'Adjust noise level to observe performance'
    },
    receivedSoft: {
      zh: '接收软信息 (可编辑)',
      en: 'Received Soft Information (Editable)'
    },
    receivedSoftTip: {
      zh: '提示：修改样本观察路径变化',
      en: 'Tip: Modify samples to observe path changes'
    },
    receivedSamples: {
      zh: '当前接收样本',
      en: 'Current Received Samples'
    },
    trellisDiagram: {
      zh: 'Soft-Decision Viterbi Trellis',
      en: 'Soft-Decision Viterbi Trellis'
    },
    flowTitle: {
      zh: '软判决维特比译码流程',
      en: 'Soft Decision Viterbi Decoding Flow'
    }
  },

  // Conv Encoder
  convEncoder: {
    title: {
      zh: '卷积码编码器',
      en: 'Convolutional Encoder'
    },
    subtitle: {
      zh: '通过移位寄存器和网格图可视化编码过程',
      en: 'Visualize the encoding process with shift registers and trellis diagrams.'
    },
    theoryTitle: {
      zh: '卷积码生成原理',
      en: 'Convolutional Code Generation Theory'
    },
    theoryP1: {
      zh: '卷积码是一种前向纠错码，通过将输入比特流与生成多项式进行卷积运算来生成编码输出。与分组码不同，卷积码的编码输出不仅依赖于当前输入比特，还依赖于之前的 K-1 个输入比特（存储在移位寄存器中），其中 K 称为约束长度。',
      en: 'Convolutional codes are forward error correction codes that generate encoded output by convolving input bit streams with generator polynomials. Unlike block codes, convolutional code output depends not only on the current input bit but also on the previous K-1 input bits (stored in shift registers), where K is the constraint length.'
    },
    theoryP2: {
      zh: '编码过程：每个输入比特进入移位寄存器后，根据生成多项式（Generator Polynomials）选择的抽头位置进行模2加法（XOR）运算。每个生成多项式对应一个输出比特，多个生成多项式产生多个输出，形成码率 1/n 的卷积码（1个输入比特生成n个输出比特）。',
      en: 'Encoding process: After each input bit enters the shift register, modulo-2 addition (XOR) is performed at tap positions selected by generator polynomials. Each generator polynomial corresponds to one output bit, and multiple generator polynomials produce multiple outputs, forming a rate 1/n convolutional code (1 input bit generates n output bits).'
    },
    theoryExample: {
      zh: '💡 示例：对于生成多项式 G1=111 和 G2=101（K=3），当输入比特为1时，移位寄存器状态为[1,0,0]。G1在位置0,1,2都有抽头，输出为 1⊕0⊕0=1；G2在位置0,2有抽头，输出为 1⊕0=1。因此该时刻的编码输出为11。',
      en: '💡 Example: For generator polynomials G1=111 and G2=101 (K=3), when input bit is 1, the shift register state is [1,0,0]. G1 has taps at positions 0,1,2, outputting 1⊕0⊕0=1; G2 has taps at positions 0,2, outputting 1⊕0=1. Thus the encoded output at this moment is 11.'
    },
    inputSequence: {
      zh: 'Input Sequence',
      en: 'Input Sequence'
    },
    inputSequenceTip: {
      zh: "Append '0'.repeat(K-1) to flush.",
      en: "Append '0'.repeat(K-1) to flush."
    },
    inputBit: {
      zh: 'Input Bit',
      en: 'Input Bit'
    },
    outputBits: {
      zh: 'Output Bits',
      en: 'Output Bits'
    },
    encodedSequence: {
      zh: 'Encoded Sequence',
      en: 'Encoded Sequence'
    },
    trellisPath: {
      zh: 'Trellis Path',
      en: 'Trellis Path'
    },
    encodingSteps: {
      zh: 'Encoding Steps',
      en: 'Encoding Steps'
    },
    state: {
      zh: 'State',
      en: 'State'
    },
    optimalGenerators: {
      zh: '最佳生成多项式参考表',
      en: 'Optimal Generator Polynomials Reference'
    },
    codeRate: {
      zh: '码率',
      en: 'Code Rate'
    },
    generatorsBinary: {
      zh: '生成多项式（二进制）',
      en: 'Generator Polynomials (Binary)'
    },
    generatorsOctal: {
      zh: '生成多项式（八进制）',
      en: 'Generator Polynomials (Octal)'
    },
    freeDistance: {
      zh: '自由距离 dfree',
      en: 'Free Distance dfree'
    },
    tapSelectionTitle: {
      zh: '生成多项式抽头选取原则',
      en: 'Generator Polynomial Tap Selection Principles'
    },
    tapP1Title: {
      zh: '最大化自由距离（dfree）：',
      en: 'Maximize Free Distance (dfree):'
    },
    tapP1: {
      zh: '选择能够产生最大自由距离的生成多项式组合。自由距离是任意两条不同编码路径之间的最小汉明距离，更大的自由距离意味着更强的纠错能力。',
      en: 'Select generator polynomial combinations that produce maximum free distance. Free distance is the minimum Hamming distance between any two different encoded paths; larger free distance means stronger error correction capability.'
    },
    tapP2Title: {
      zh: '确保首尾抽头：',
      en: 'Ensure First and Last Taps:'
    },
    tapP2: {
      zh: '生成多项式的最高位（MSB）和最低位（LSB）通常都应为1，即形如 1xxx...x1。这确保了编码器的记忆长度完全利用。',
      en: 'The most significant bit (MSB) and least significant bit (LSB) of generator polynomials should typically be 1, in the form 1xxx...x1. This ensures full utilization of the encoder memory length.'
    },
    tapP3Title: {
      zh: '避免公因子：',
      en: 'Avoid Common Factors:'
    },
    tapP3: {
      zh: '多个生成多项式不应有公共因子，否则会降低码的有效约束长度，削弱纠错性能。',
      en: 'Multiple generator polynomials should not have common factors, otherwise the effective constraint length of the code is reduced, weakening error correction performance.'
    },
    tapP4Title: {
      zh: '平衡汉明重量：',
      en: 'Balance Hamming Weight:'
    },
    tapP4: {
      zh: '生成多项式中1的个数（汉明重量）应适中。过少的抽头会降低编码复杂度但可能减弱纠错能力；过多的抽头会增加硬件复杂度。',
      en: 'The number of 1s in generator polynomials (Hamming weight) should be moderate. Too few taps reduce encoding complexity but may weaken error correction capability; too many taps increase hardware complexity.'
    },
    impactTitle: {
      zh: '抽头选择对性能的影响',
      en: 'Impact of Tap Selection on Performance'
    },
    impactP1Title: {
      zh: '纠错能力：',
      en: 'Error Correction Capability:'
    },
    impactP1: {
      zh: '生成多项式的选择直接影响自由距离dfree，进而决定了卷积码的纠错能力。在相同约束长度下，最佳生成多项式可使纠错能力提升显著。',
      en: 'Generator polynomial selection directly affects free distance dfree, which determines the error correction capability of convolutional codes. Under the same constraint length, optimal generator polynomials can significantly improve error correction capability.'
    },
    impactP2Title: {
      zh: '译码复杂度：',
      en: 'Decoding Complexity:'
    },
    impactP2: {
      zh: '约束长度K越大，Viterbi译码的状态数（2^(K-1)）指数增长，硬件复杂度和功耗也随之增加。实际应用需权衡性能与复杂度。',
      en: 'Larger constraint length K leads to exponential growth in Viterbi decoding states (2^(K-1)), increasing hardware complexity and power consumption. Practical applications must balance performance and complexity.'
    },
    impactP3Title: {
      zh: '延迟：',
      en: 'Latency:'
    },
    impactP3: {
      zh: '更大的K意味着更长的译码延迟，因为译码器需要等待更多比特才能做出可靠判决。实时通信系统需要考虑这一因素。',
      en: 'Larger K means longer decoding latency, as the decoder needs to wait for more bits to make reliable decisions. Real-time communication systems must consider this factor.'
    },
    impactP4Title: {
      zh: '误码平层：',
      en: 'Error Floor:'
    },
    impactP4: {
      zh: '不合理的生成多项式选择可能导致在高信噪比下误码率无法进一步下降（误码平层现象），因此工程中通常采用经过理论验证的最佳生成多项式。',
      en: 'Unreasonable generator polynomial selection may cause error rates to stop decreasing at high SNR (error floor phenomenon), so engineering typically uses theoretically verified optimal generator polynomials.'
    },
    reference: {
      zh: '参考标准：上表中的最佳生成多项式来源于学术研究和工程实践，被广泛应用于NASA深空通信、卫星通信、移动通信（如GSM）等领域。',
      en: 'Reference: The optimal generator polynomials in the table are derived from academic research and engineering practice, widely used in NASA deep space communications, satellite communications, mobile communications (e.g., GSM), and other fields.'
    }
  },

  // BCJR Decoder
  bcjr: {
    title: {
      zh: 'BCJR 译码器',
      en: 'BCJR Decoder'
    },
    subtitle: {
      zh: 'MAP / Log-MAP 译码可视化',
      en: 'MAP / Log-MAP Decoding Visualization'
    },
    theoryTitle: {
      zh: 'BCJR (MAP) 算法原理',
      en: 'BCJR (MAP) Algorithm Theory'
    },
    theoryP1: {
      zh: 'BCJR算法（以提出者Bahl, Cocke, Jelinek, Raviv命名）是一种最大后验概率（MAP）译码算法，又称为前向-后向算法（Forward-Backward Algorithm）。与维特比算法输出最大似然序列不同，BCJR为每个比特计算对数似然比（LLR），提供软输出信息，适用于Turbo码和LDPC码的迭代译码。',
      en: 'The BCJR algorithm (named after its proposers Bahl, Cocke, Jelinek, Raviv) is a maximum a posteriori (MAP) decoding algorithm, also known as the Forward-Backward Algorithm. Unlike the Viterbi algorithm which outputs the maximum likelihood sequence, BCJR calculates log-likelihood ratios (LLR) for each bit, providing soft output information suitable for iterative decoding of Turbo codes and LDPC codes.'
    },
    theoryP2: {
      zh: '算法分三个阶段：(1) 前向递归：从初始时刻向前计算每个状态的前向概率 α(s,t)；(2) 后向递归：从终止时刻向后计算每个状态的后向概率 β(s,t)；(3) LLR计算：结合 α、β 和分支转移概率 γ，计算每个信息位的对数似然比。',
      en: 'The algorithm has three phases: (1) Forward recursion: calculate forward probabilities α(s,t) for each state from the initial time; (2) Backward recursion: calculate backward probabilities β(s,t) for each state from the terminal time; (3) LLR calculation: combine α, β, and branch transition probabilities γ to compute log-likelihood ratios for each information bit.'
    },
    theoryP3: {
      zh: 'LLR 定义为 LLR(uk) = log[P(uk=1|r) / P(uk=0|r)]，其中 r 是接收序列。正值表示比特更可能为1，负值表示更可能为0，绝对值越大表示置信度越高。Log-MAP采用对数域运算避免数值下溢，提高计算稳定性。',
      en: 'LLR is defined as LLR(uk) = log[P(uk=1|r) / P(uk=0|r)], where r is the received sequence. Positive values indicate the bit is more likely 1, negative values indicate more likely 0, and larger absolute values indicate higher confidence. Log-MAP uses log-domain arithmetic to avoid numerical underflow and improve computational stability.'
    },
    theoryTip: {
      zh: '💡 提示：观察前向-后向递归过程中概率的传播，理解BCJR如何综合全局信息进行软判决。',
      en: '💡 Tip: Observe probability propagation during forward-backward recursion to understand how BCJR integrates global information for soft decisions.'
    },
    phase1: {
      zh: '1. Forward (Alpha)',
      en: '1. Forward (Alpha)'
    },
    phase2: {
      zh: '2. Backward (Beta)',
      en: '2. Backward (Beta)'
    },
    phase3: {
      zh: '3. LLR Calculation',
      en: '3. LLR Calculation'
    },
    currentStepData: {
      zh: 'Current Step Data',
      en: 'Current Step Data'
    },
    time: {
      zh: 'Time (t)',
      en: 'Time (t)'
    },
    llr: {
      zh: 'LLR',
      en: 'LLR'
    },
    decision: {
      zh: 'Decision',
      en: 'Decision'
    },
    trellisView: {
      zh: 'Trellis View',
      en: 'Trellis View'
    },
    forward: {
      zh: '→ Forward (Alpha)',
      en: '→ Forward (Alpha)'
    },
    backward: {
      zh: '← Backward (Beta)',
      en: '← Backward (Beta)'
    },
    llrCalc: {
      zh: '⊕ LLR Calculation (Alpha + Beta)',
      en: '⊕ LLR Calculation (Alpha + Beta)'
    },
    llrResults: {
      zh: 'LLR Results',
      en: 'LLR Results'
    },
    llrPositive: {
      zh: 'LLR ≥ 0 (决策为1)',
      en: 'LLR ≥ 0 (Decision: 1)'
    },
    llrNegative: {
      zh: 'LLR < 0 (决策为0)',
      en: 'LLR < 0 (Decision: 0)'
    },
    flowcharts: {
      zh: 'BCJR 算法流程图',
      en: 'BCJR Algorithm Flowcharts'
    },
    overallProcess: {
      zh: '总体流程',
      en: 'Overall Process'
    },
    forwardProcess: {
      zh: '前向递归 (α过程)',
      en: 'Forward Recursion (α Process)'
    },
    backwardProcess: {
      zh: '后向递归 (β过程)',
      en: 'Backward Recursion (β Process)'
    },
    llrProcess: {
      zh: 'LLR 计算过程',
      en: 'LLR Calculation Process'
    }
  },

  // TBCC
  tbcc: {
    title: {
      zh: '咬尾卷积码 (TBCC)',
      en: 'Tail-biting Convolutional Codes'
    },
    subtitle: {
      zh: '克服速率损失的圆环卷积码编码与 WAVA 译码可视化',
      en: 'Circular convolutional encoding and WAVA decoding visualization'
    },
    theoryTitle: {
      zh: '咬尾卷积码 (TBCC) 原理',
      en: 'Tail-biting Convolutional Code (TBCC) Theory'
    },
    theoryP1: {
      zh: '咬尾卷积码（Tail-biting CC）通过使编码器的起始状态与结束状态相同，克服了传统零尾（Zero-Termination）卷积码需要插入尾比特导致的速率损失。它在保持码率的同时，实现了对分组数据的块编码。',
      en: 'Tail-biting convolutional codes overcome the rate loss of traditional zero-terminated codes by forcing the starting and ending states of the encoder to be identical. This achieves block coding while maintaining the original code rate.'
    },
    theoryP2: {
      zh: '编码过程：将编码器的初始状态初始化为信息序列的最后 K-1 个比特。这样，当整个序列输入完成后，寄存器的状态自然回到初始设定，满足咬尾特性。',
      en: 'Encoding: The initial state of the encoder is pre-loaded with the last K-1 bits of the information sequence. Thus, after the entire sequence is processed, the encoder state naturally returns to the initial state.'
    },
    theoryP3: {
      zh: '译码过程 (WAVA)：环绕维特比算法（Wrap-Around Viterbi）常用于译码。由于起始状态未知且与结束状态相同，算法会将一帧末尾的路径度量作为下一轮迭代的起始度量，进行多次迭代（通常2-3次）以收敛。',
      en: 'Decoding (WAVA): The Wrap-Around Viterbi Algorithm is used for decoding. Since the starting state is unknown but identical to the ending state, the path metrics from the end of a frame are used as initial metrics for the next iteration of the same frame.'
    },
    theoryTip: {
      zh: '💡 提示：观察编码结束后的寄存器状态，它必须与初始状态（由信息末尾比特决定）完全一致。',
      en: '💡 Tip: Observe the final register state after encoding; it must match the initial state (determined by the last bits).'
    },
    initialState: {
      zh: '初始状态 (Pre-load)',
      en: 'Initial State (Pre-load)'
    },
    endState: {
      zh: '结束状态',
      en: 'End State'
    },
    tailBitingMatch: {
      zh: '咬尾匹配性',
      en: 'Tail-biting Match'
    },
    matched: {
      zh: '已匹配',
      en: 'Matched'
    },
    iteration: {
      zh: '迭代轮次',
      en: 'Iteration'
    },
    wavaIteration: {
      zh: 'WAVA 迭代',
      en: 'WAVA Iteration'
    },
    iterNote: {
      zh: '注：WAVA通过多次遍历同一帧数据使状态度量收敛',
      en: 'Note: WAVA iterates over the same frame to converge metrics'
    },
    circularTrellis: {
      zh: 'Circular Trellis (WAVA)',
      en: 'Circular Trellis (WAVA)'
    }
  },

  // Common
  common: {
    done: {
      zh: '完成',
      en: 'Done'
    }
  },

  // Footer
  footer: {
    about: {
      zh: '关于项目',
      en: 'About'
    },
    description: {
      zh: '这是一个用于可视化卷积码编码和维特比译码过程的交互式教学工具，帮助理解信道编码理论。',
      en: 'An interactive educational tool for visualizing convolutional encoding and Viterbi decoding processes to understand channel coding theory.'
    },
    links: {
      zh: '相关链接',
      en: 'Links'
    },
    github: {
      zh: 'GitHub 仓库',
      en: 'GitHub Repository'
    },
    docs: {
      zh: '维特比算法文档',
      en: 'Viterbi Algorithm Docs'
    },
    tech: {
      zh: '技术栈',
      en: 'Tech Stack'
    },
    madeWith: {
      zh: '使用',
      en: 'Made with'
    },
    forEducation: {
      zh: '开发，用于教学目的',
      en: 'for educational purposes'
    },
    rights: {
      zh: '保留所有权利。',
      en: 'All rights reserved.'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('zh'); // Default to Chinese

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const t = (path) => {
    const keys = path.split('.');
    let value = translations;
    
    for (const key of keys) {
      value = value?.[key];
      if (!value) return path; // Fallback to path if translation not found
    }
    
    return value[language] || value['en'] || path;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
