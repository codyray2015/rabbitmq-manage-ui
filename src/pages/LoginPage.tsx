import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rabbitMQClient } from '@/lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // 设置凭证
      rabbitMQClient.setCredentials(username, password)

      // 测试连接
      await rabbitMQClient.getOverview()

      // 登录成功，跳转到首页
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查用户名和密码')
      // 清除凭证
      rabbitMQClient.clearCredentials()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐰</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RabbitMQ 管理平台
          </h1>
          <p className="text-gray-600">请登录以继续</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* 用户名 */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                placeholder="请输入用户名"
                disabled={isLoading}
              />
            </div>

            {/* 密码 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                placeholder="请输入密码"
                disabled={isLoading}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>使用 RabbitMQ Management API 凭证登录</p>
        </div>
      </div>
    </div>
  )
}
