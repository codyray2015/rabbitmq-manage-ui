import { useNavigate } from 'react-router-dom'
import { rabbitMQClient } from '@/lib/api'

export function Navbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      rabbitMQClient.clearCredentials()
      navigate('/login')
    }
  }

  const username = rabbitMQClient.getUsername()

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo 和标题 */}
          <div className="flex items-center gap-3">
            <div className="text-2xl">🐰</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">RabbitMQ 管理平台</h1>
              <p className="text-xs text-gray-500">System Management</p>
            </div>
          </div>

          {/* 用户信息和登出 */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{username}</p>
              <p className="text-xs text-gray-500">当前用户</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
