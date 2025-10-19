/**
 * 应用配置
 * 从环境变量读取配置
 */

export const config = {
  // RabbitMQ 服务器主机名（用于代码生成和连接字符串）
  rabbitmq: {
    host: import.meta.env.VITE_RABBITMQ_HOST || 'localhost',
    apiUrl: import.meta.env.VITE_RABBITMQ_API_URL || 'http://localhost:15672',
  },
} as const
