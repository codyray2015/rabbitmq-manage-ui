# RabbitMQ 管理平台

基于模板的 RabbitMQ 系统管理工具，提供可视化界面来管理 RabbitMQ 队列、交换机和凭证。

## ✨ 主要功能

- **模板化系统创建**: 使用预定义模板快速创建复杂的 RabbitMQ 系统
- **系统管理**: 可视化管理和监控已创建的系统
- **凭证管理**: 为系统创建和管理主/辅双凭证
- **代码生成**: 自动生成 .NET 生产者/消费者代码
- **资源管理**: 管理系统中的队列、交换机和绑定关系
- **实时监控**: 查看消息速率、队列状态等指标
- **用户认证**: 使用 RabbitMQ Management API 凭证登录

## 🛠 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **UI 框架**: Tailwind CSS 4
- **路由**: React Router 7
- **图表**: Chart.js + react-chartjs-2
- **表单**: React Hook Form + Zod
- **状态管理**: React Hooks
- **PWA**: Vite PWA Plugin

## 📦 安装

### 前置要求

- Node.js >= 18
- npm 或 yarn 或 pnpm
- RabbitMQ 服务器（启用 Management Plugin）

### 安装步骤

1. **克隆仓库**
```bash
git clone <repository-url>
cd rabbitmq-manage/app
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# RabbitMQ 服务器配置
VITE_RABBITMQ_HOST=your-rabbitmq-server.com
VITE_RABBITMQ_API_URL=https://your-rabbitmq-server.com/rabbitmq
```

4. **启动开发服务器**
```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

## 🚀 使用指南

### 登录

1. 打开应用
2. 使用 RabbitMQ Management API 的用户名和密码登录
3. 系统会验证凭证并连接到 RabbitMQ 服务器

### 创建系统

1. 在"创建系统"标签页选择模板
2. 填写系统参数（vhost、队列前缀等）
3. 点击"创建系统"
4. 系统会自动创建所需的队列、交换机和绑定

### 管理系统

1. 在"系统管理"标签页查看所有系统
2. 点击系统卡片进入详情页
3. 可以查看：
   - **概览**: 系统基本信息和指标
   - **凭证**: 管理主/辅凭证
   - **代码生成**: 生成 .NET 代码
   - **资源**: 查看队列和交换机详情

### 凭证管理

1. 进入系统详情页 > 凭证标签
2. 创建主凭证或辅助凭证
3. 可以复制用户名、密码和连接字符串
4. 凭证会自动绑定到系统资源

### 代码生成

1. 进入系统详情页 > 代码生成标签
2. 选择凭证类型（主/辅）
3. 选择代码类型（生产者/消费者/重试消费者）
4. 选择目标队列或交换机
5. 复制或下载生成的 C# 代码

## 🏗 项目结构

```
src/
├── components/          # React 组件
│   ├── charts/         # 图表组件
│   ├── system-detail/  # 系统详情页组件
│   └── ui/            # UI 基础组件
├── config/            # 配置文件
├── lib/              # 核心库
│   ├── api.ts        # RabbitMQ API 客户端
│   ├── credentialsManager.ts  # 凭证管理
│   ├── template.ts   # 模板引擎
│   └── templates/    # 系统模板
├── pages/            # 页面组件
├── types/            # TypeScript 类型定义
└── utils/            # 工具函数
```

## 📝 开发说明

### 添加新模板

1. 在 `src/lib/templates/` 创建 YAML 模板文件
2. 模板需要包含：
   - 元数据（名称、描述、版本）
   - 参数定义
   - 队列、交换机和绑定配置
3. 重启开发服务器，模板会自动加载

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录

### 代码检查

```bash
npm run lint
```

## 🔒 安全说明

- 凭证仅存储在内存中，不会持久化到本地存储
- 刷新页面会丢失登录状态
- 所有 API 请求使用 Basic Auth
- 环境变量文件 (`.env`) 已加入 `.gitignore`

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
