/**
 * 应用配置
 * 从环境变量读取配置
 */

export const config = {
  // RabbitMQ 服务器配置
  rabbitmq: {
    // RabbitMQ 主机名（用于代码生成和连接字符串）
    host: import.meta.env.VITE_RABBITMQ_HOST || 'localhost',

    // RabbitMQ Management API URL
    // 支持两种模式：
    // 1. 相对路径模式（需要代理）: '/api'
    // 2. 完整 URL 模式（直连）: 'https://rmq.example.com/api'
    // 如果未配置，默认使用相对路径 '/api'
    apiUrl: import.meta.env.VITE_RABBITMQ_API_URL || '/api',
  },
} as const
