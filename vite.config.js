import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用 defineConfig 函数定义 Vite 配置
export default defineConfig({
    // 启用 React 插件，支持 React 开发
    plugins: [react()],
    // 配置开发服务器
    server: {
        // 允许所有设备访问开发服务器
        host: '0.0.0.0',
        // 设置开发服务器端口为 3000
        port: 3000,
        // 开发服务器启动时不自动打开浏览器
        //open: true, 
        // 配置代理规则
        proxy: {
            // 匹配以 /api 开头的请求
            '/api': {
                // 目标服务器地址
                target: 'http://115.29.179.159:9090',
                // 修改请求头中的 Origin 为目标地址，解决跨域问题
                changeOrigin: true,
                // 重写请求路径，去掉 /api 前缀
                rewrite: (path) => path.replace(/^\/api/, ''),
                // 以下配置可选，根据实际需求添加
                // secure: false, // 允许代理到 HTTPS 地址（如果目标是 HTTPS）
                // ws: true, // 代理 WebSocket 请求（如果需要）
            },
        },
    },
});