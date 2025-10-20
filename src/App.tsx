import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { rabbitMQClient } from '@/lib/api'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import CreatePage from '@/pages/CreatePage'
import SystemDetailPage from '@/pages/SystemDetailPage'

// 路由保护组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  if (!rabbitMQClient.hasCredentials()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* 登录页 - 公开访问 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 受保护的路由 */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create/:templateName"
          element={
            <ProtectedRoute>
              <CreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/system/:vhost/:systemId"
          element={
            <ProtectedRoute>
              <SystemDetailPage />
            </ProtectedRoute>
          }
        />

        {/* 其他路径重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
