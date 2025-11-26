# 百度统计配置指南

## 📊 为什么选择百度统计？

百度统计是中国大陆最常用的网站流量分析工具，具有以下优势：
- ✅ 完全免费
- ✅ 国内访问速度快
- ✅ 详细的访客分析
- ✅ 实时流量监控
- ✅ 支持事件追踪

---

## 🚀 快速配置（5分钟完成）

### 步骤 1：注册百度统计账号

1. 访问 [百度统计官网](https://tongji.baidu.com/)
2. 点击右上角"登录/注册"
3. 使用百度账号登录（没有的话需要先注册）

### 步骤 2：添加网站

1. 登录后，点击 **"管理"** → **"新增网站"**
2. 填写网站信息：
   ```
   网站域名：your-domain.com (你的实际域名)
   网站名称：Viewterbi
   网站首页：https://your-domain.com
   网站类别：教育/科技
   ```
3. 点击 **"确定"**

### 步骤 3：获取统计代码

1. 在网站列表中，点击 **"获取代码"**
2. 你会看到类似这样的代码：
   ```html
   <script>
   var _hmt = _hmt || [];
   (function() {
     var hm = document.createElement("script");
     hm.src = "https://hm.baidu.com/hm.js?xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
     var s = document.getElementsByTagName("script")[0]; 
     s.parentNode.insertBefore(hm, s);
   })();
   </script>
   ```
3. **复制** `hm.js?` 后面的那串字符（你的统计ID）
   - 例如：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 步骤 4：配置项目（使用环境变量）

项目使用环境变量管理统计ID，更安全！

#### 方法一：复制示例文件（推荐）
```bash
# 在项目根目录执行
cp .env.example .env
```

然后编辑 `.env` 文件：
```bash
VITE_BAIDU_ANALYTICS_ID=你的统计ID
```

#### 方法二：手动创建
在项目根目录创建 `.env` 文件，添加以下内容：
```bash
VITE_BAIDU_ANALYTICS_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**注意：**
- `.env` 文件已添加到 `.gitignore`，不会被提交到 Git
- 这样你的统计ID就不会暴露在开源代码中了 ✅

### 步骤 5：验证配置

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 打开浏览器访问 `http://localhost:5173`

3. 打开浏览器控制台（F12），你应该看到：
   ```
   百度统计已加载
   ```

4. 回到百度统计后台，点击 **"代码安装检查"**
   - 20分钟内会显示检测结果
   - 显示"代码安装正确"即表示成功

---

## 📈 查看统计数据

### 实时访客

1. 登录百度统计
2. 选择你的网站
3. 点击 **"实时访客"**
4. 可以看到当前在线用户、访问页面等信息

### 流量趋势

- **概况** - 查看PV、UV、IP、跳出率等关键指标
- **来源分析** - 了解访客从哪里来
- **访客分析** - 地域分布、访问时长、新老访客
- **页面点击图** - 用户点击热力图

---

## 🎯 高级功能（可选）

### 1. 自定义事件追踪

追踪用户点击按钮等行为：

```javascript
// 在任何组件中使用
const handleButtonClick = () => {
  if (window._hmt) {
    window._hmt.push(['_trackEvent', 'button', 'click', 'encode']);
  }
  // 你的原有逻辑
};
```

### 2. 页面访问追踪

在 React Router 中追踪页面切换：

```javascript
useEffect(() => {
  if (window._hmt) {
    window._hmt.push(['_trackPageview', window.location.pathname]);
  }
}, [location.pathname]);
```

### 3. 自定义变量

设置用户属性：

```javascript
if (window._hmt) {
  window._hmt.push(['_setCustomVar', 1, 'language', language, 3]);
  window._hmt.push(['_setCustomVar', 2, 'theme', themeMode, 3]);
}
```

---

## 🔍 常见问题

### Q1: 为什么统计后台没有数据？

**A:** 
- 检查代码是否正确安装（步骤5）
- 确认网站有实际访问流量
- 新网站需要等待20分钟到24小时数据才会显示

### Q2: 本地开发环境会统计吗？

**A:** 
- 会的，`localhost:5173` 的访问也会被统计
- 如果不想统计本地访问，可以添加判断：
  ```javascript
  if (window.location.hostname !== 'localhost') {
    // 加载统计代码
  }
  ```

### Q3: 影响网站加载速度吗？

**A:** 
- 几乎不影响，统计脚本是异步加载的
- 脚本很小（约5KB），加载速度快

### Q4: 如何过滤自己的访问？

**A:**
1. 百度统计后台 → **"管理"** → **"过滤规则"**
2. 添加IP过滤规则
3. 输入你的IP地址

### Q5: 可以同时使用Google Analytics吗？

**A:** 
- 可以！两者不冲突
- 对国内用户用百度统计
- 对国外用户用Google Analytics

---

## 📱 移动端统计

百度统计自动支持移动端访问统计，无需额外配置。可以在后台查看：
- 移动端/PC端访问比例
- 不同设备型号分布
- 不同操作系统分布

---

## 🔐 隐私合规

根据中国《个人信息保护法》，建议在网站添加隐私政策：

1. 在 Footer 或隐私页面说明使用了百度统计
2. 告知用户收集了哪些数据（访问日志、行为数据）
3. 说明数据用途（改善用户体验）

---

## 📞 获取帮助

- [百度统计官方文档](https://tongji.baidu.com/holmes/Zeus/guide)
- [百度统计开发者中心](https://tongji.baidu.com/web/help/article?id=93&type=0)
- 问题反馈：在百度统计后台提交工单

---

## ✅ 完成检查清单

- [ ] 注册百度统计账号
- [ ] 添加网站并获取统计ID
- [ ] 在 `BaiduAnalytics.jsx` 中配置ID
- [ ] 启动项目并验证代码安装
- [ ] 检查统计后台是否有数据
- [ ] （可选）配置自定义事件追踪
- [ ] （可选）添加隐私政策说明

---

**祝你使用愉快！如有问题欢迎提 Issue。** 🎉
