# 🎯 Viewterbi - 维特比译码可视化教学平台

<div align="center">

<img src="./public/logo.svg" alt="Viewterbi logo" width="96" />

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**一个交互式的卷积码编码与维特比译码算法可视化教学工具**

[English](#english) | [中文](#中文)

</div>

---

## 中文

### 📖 项目简介

Viewterbi 是一个专为信道编码理论教学设计的交互式可视化平台。通过直观的图形界面和实时动画演示，帮助学生和工程师深入理解卷积码编码、维特比译码（Viterbi Algorithm）和 BCJR 译码算法的工作原理。

### ✨ 核心功能

#### 🔧 编码与译码器
- **卷积码编码器** - 可视化移位寄存器和网格图编码过程
- **硬判决维特比译码** - 基于汉明距离的最优路径译码
- **软判决维特比译码** - 基于欧氏距离的概率译码
- **BCJR 译码器** - MAP/Log-MAP 算法的前向-后向递归可视化

#### 🎨 用户体验
- **🌓 黑暗模式** - 护眼深色主题，自动保存用户偏好
- **🌍 双语支持** - 完整的中英文界面切换
- **📱 响应式设计** - 适配桌面、平板和移动设备
- **⚡ 实时动画** - 逐步可视化译码过程

#### 🔬 教学特性
- **自适应约束长度 (K)** - 支持 K=2 到 K=6，自动推导
- **可编辑误码注入** - 手动修改接收向量测试纠错能力
- **详细理论说明** - 每个算法都配有完整的原理解释
- **ACS 详情展示** - 实时显示加-比-选操作细节
- **网格图可视化** - 清晰展示状态转移和路径度量

### 🚀 快速开始

#### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0 或 pnpm >= 7.0.0

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/Triwalt/Viewterbi.git
cd Viewterbi

# 安装依赖
npm install
# 或使用 pnpm
pnpm install

# 配置环境变量（可选）
cp .env.example .env
# 编辑 .env 文件，填入你的百度统计ID（如需流量统计）

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

访问 `http://localhost:5173` 即可开始使用。

### 📁 项目结构

```
viterbi-app/
├── src/
│   ├── components/          # 可复用组件
│   │   └── Footer.jsx       # 页脚组件
│   ├── contexts/            # React Context
│   │   ├── LanguageContext.jsx  # 国际化
│   │   └── ThemeContext.jsx     # 主题管理
│   ├── pages/               # 页面组件
│   │   ├── ConvEncoder.jsx      # 卷积编码器
│   │   ├── HardViterbi.jsx      # 硬判决维特比
│   │   ├── BCJRDecoder.jsx      # BCJR 译码器
│   │   └── ...
│   ├── SoftViterbi.jsx      # 软判决维特比
│   ├── App.jsx              # 主应用
│   └── main.jsx             # 入口文件
├── public/                  # 静态资源
└── package.json
```

### 🎓 使用指南

#### 卷积码编码器
1. 配置生成多项式（二进制，如 `111`, `101`）
2. 输入信息序列
3. 点击播放按钮观察编码过程
4. 查看移位寄存器状态变化和网格图路径

#### 维特比译码器
1. 选择硬判决或软判决模式
2. 自动生成编码序列或手动输入接收向量
3. 注入误码测试纠错能力
4. 逐步播放观察网格搜索过程
5. 查看 ACS 操作详情和最终译码结果

#### BCJR 译码器
1. 配置生成多项式和输入序列
2. 观察三个阶段：前向 (Alpha) → 后向 (Beta) → LLR 计算
3. 查看 LLR 柱状图和译码判决
4. 理解 MAP 准则的工作原理

### 🛠️ 技术栈

- **前端框架**: React 18.3
- **构建工具**: Vite 5.4
- **样式方案**: TailwindCSS 3.4
- **图标库**: Lucide React
- **语言**: JavaScript (ES2022+)

### 🎯 核心算法

#### 维特比算法
```
1. 初始化: 设置起始状态度量
2. 递归: 对每个时刻 t
   - 计算分支度量 (BM)
   - 计算路径度量 (PM = 前一PM + BM)
   - 选择幸存路径 (ACS 操作)
3. 回溯: 从终止状态回溯最优路径
```

#### BCJR 算法
```
1. 计算 Gamma: 分支转移概率
2. 前向递归: 计算 Alpha (前向概率)
3. 后向递归: 计算 Beta (后向概率)
4. LLR 计算: log[P(uk=1|r) / P(uk=0|r)]
5. 判决: LLR >= 0 → 1, LLR < 0 → 0
```

### 🌟 特色亮点

1. **教学优化**
   - 清晰的视觉反馈
   - 分步动画演示
   - 详细的中文理论说明

2. **交互式学习**
   - 可调节参数实时更新
   - 误码注入功能
   - 多种配置对比

3. **专业级实现**
   - 数值稳定性优化
   - 边界条件处理
   - 支持非常规配置

### 📊 性能优化

- ⚡ Vite 快速热更新 (HMR)
- 🎯 React useMemo 避免重复计算
- 🎨 CSS Transitions 平滑动画
- 📦 代码分割和懒加载（可扩展）

### 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

```bash
# Fork 项目
# 创建功能分支
git checkout -b feature/amazing-feature

# 提交更改
git commit -m 'Add some amazing feature'

# 推送到分支
git push origin feature/amazing-feature

# 创建 Pull Request
```

### 📝 开发规范

- 遵循 ESLint 规则
- 使用语义化的变量和函数命名
- 添加必要的注释
- 保持代码简洁可读

### 🐛 问题反馈

如遇到问题或有功能建议，请[提交 Issue](https://github.com/Triwalt/Viewterbi/issues)。

### 📜 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

### 👥 作者

**Triwalt** - [GitHub](https://github.com/Triwalt)

### 🙏 致谢

- 感谢所有贡献者
- 维特比算法由 Andrew Viterbi 于 1967 年提出
- BCJR 算法由 Bahl, Cocke, Jelinek, Raviv 于 1974 年提出
- 参考资料：《数字通信》- John G. Proakis

---

## English

### 📖 Introduction

Viewterbi is an interactive visualization platform designed for teaching channel coding theory. Through intuitive graphical interfaces and real-time animations, it helps students and engineers deeply understand the principles of convolutional encoding, Viterbi decoding, and BCJR decoding algorithms.

### ✨ Key Features

#### 🔧 Encoders & Decoders
- **Convolutional Encoder** - Visualize shift registers and trellis encoding
- **Hard-Decision Viterbi** - Optimal path decoding based on Hamming distance
- **Soft-Decision Viterbi** - Probabilistic decoding based on Euclidean distance
- **BCJR Decoder** - Forward-backward recursion visualization for MAP/Log-MAP

#### 🎨 User Experience
- **🌓 Dark Mode** - Eye-friendly dark theme with automatic preference saving
- **🌍 Bilingual Support** - Complete Chinese/English interface switching
- **📱 Responsive Design** - Optimized for desktop, tablet, and mobile
- **⚡ Real-time Animation** - Step-by-step decoding visualization

#### 🔬 Educational Features
- **Adaptive Constraint Length (K)** - Support K=2 to K=6, auto-derived
- **Editable Error Injection** - Manual modification of received vectors to test error correction
- **Detailed Theory** - Complete theoretical explanations for each algorithm
- **ACS Details** - Real-time display of Add-Compare-Select operations
- **Trellis Visualization** - Clear display of state transitions and path metrics

### 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/Triwalt/Viewterbi.git
cd Viewterbi

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Visit `http://localhost:5173` to start using.

### 🛠️ Tech Stack

- React 18.3 + Vite 5.4
- TailwindCSS 3.4
- Lucide React Icons

### 🤝 Contributing

Contributions, issues, and feature requests are welcome!

### 📜 License

MIT © 2025 Viewterbi - Presented by Triwalt

---

<div align="center">

Made with ❤️ for educational purposes

**[⭐ Star this repo](https://github.com/Triwalt/Viewterbi)** if you find it helpful!

</div>
