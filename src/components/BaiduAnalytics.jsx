import { useEffect } from 'react';

const BaiduAnalytics = () => {
  useEffect(() => {
    // 百度统计代码 - 从环境变量读取
    const BAIDU_ANALYTICS_ID = import.meta.env.VITE_BAIDU_ANALYTICS_ID;
    
    // 如果没有配置统计ID，跳过加载
    if (!BAIDU_ANALYTICS_ID) {
      console.info('百度统计未配置（需要设置 VITE_BAIDU_ANALYTICS_ID 环境变量）');
      return;
    }

    // 检查是否已加载
    if (window._hmt) {
      return;
    }

    // 创建百度统计脚本
    window._hmt = window._hmt || [];
    
    const hm = document.createElement('script');
    hm.src = `https://hm.baidu.com/hm.js?${BAIDU_ANALYTICS_ID}`;
    hm.async = true;
    
    const s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(hm, s);

    console.log('百度统计已加载');
  }, []);

  return null; // 这个组件不渲染任何内容
};

export default BaiduAnalytics;
