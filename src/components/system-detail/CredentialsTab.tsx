/**
 * 凭证标签页
 * 显示和管理系统的主凭证和辅助凭证
 */

import { useState, useEffect } from 'react'
import { config } from '@/config'
import { getSystemCredentials, type Credential, type SystemCredentials } from '@/lib/credentialsManager'

interface CredentialsTabProps {
  vhost: string
  systemId: string
}

interface CredentialCardProps {
  title: string
  credential: Credential | null
  loading: boolean
  vhost: string
}

function CredentialCard({ title, credential, loading, vhost }: CredentialCardProps) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // 生成连接字符串
  const generateConnectionString = (): string => {
    if (!credential) return ''
    const host = config.rabbitmq.host
    const encodedVhost = vhost === '/' ? '%2F' : encodeURIComponent(vhost)
    return `amqp://${credential.username}:${credential.password}@${host}/${encodedVhost}`
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!credential) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔒</div>
          <p className="text-gray-600">暂无凭证</p>
          <p className="text-sm text-gray-500 mt-2">请手动创建凭证以使用此系统</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
          ✓ 已配置
        </span>
      </div>

      <div className="space-y-4">
        {/* 用户名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={credential.username}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(credential.username, 'username')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {copiedField === 'username' ? '✓ 已复制' : '复制'}
            </button>
          </div>
        </div>

        {/* 密码 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
          <div className="flex items-center gap-2">
            <input
              type={passwordVisible ? 'text' : 'password'}
              value={credential.password}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={() => setPasswordVisible(!passwordVisible)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {passwordVisible ? '隐藏' : '显示'}
            </button>
            <button
              onClick={() => copyToClipboard(credential.password, 'password')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {copiedField === 'password' ? '✓ 已复制' : '复制'}
            </button>
          </div>
        </div>

        {/* 连接字符串 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">连接字符串</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={generateConnectionString()}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button
              onClick={() => copyToClipboard(generateConnectionString(), 'connectionString')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {copiedField === 'connectionString' ? '✓ 已复制' : '复制'}
            </button>
          </div>
        </div>

        {/* 创建时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">创建时间</label>
          <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600">
            {new Date(credential.createdAt).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>

        {/* 重置按钮（预留，暂时禁用） */}
        <div className="pt-2">
          <button
            disabled
            className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            title="重置功能即将推出"
          >
            重置凭证 (即将推出)
          </button>
        </div>
      </div>
    </div>
  )
}

export function CredentialsTab({ vhost, systemId }: CredentialsTabProps) {
  const [credentials, setCredentials] = useState<SystemCredentials>({
    primary: null,
    secondary: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCredentials() {
      setLoading(true)
      setError(null)

      try {
        const creds = await getSystemCredentials(vhost, systemId)
        if (cancelled) return

        setCredentials(creds)
      } catch (err) {
        if (cancelled) return

        console.error('加载凭证失败:', err)
        setError(err instanceof Error ? err.message : '加载凭证失败')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadCredentials()

    return () => {
      cancelled = true
    }
  }, [vhost, systemId])

  return (
    <div className="space-y-6">
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">关于系统凭证</h3>
            <p className="text-sm text-blue-800">
              每个系统拥有两个独立的凭证：主凭证和辅助凭证。
              两个凭证都可以单独使用，并且可以独立重置。
              在代码生成功能中，将默认使用主凭证。
            </p>
          </div>
        </div>
      </div>

      {/* 凭证卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CredentialCard
          title="主凭证 (Primary)"
          credential={credentials.primary}
          loading={loading}
          vhost={vhost}
        />
        <CredentialCard
          title="辅助凭证 (Secondary)"
          credential={credentials.secondary}
          loading={loading}
          vhost={vhost}
        />
      </div>

      {/* 使用说明 */}
      {!loading && (credentials.primary || credentials.secondary) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">使用说明</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>主凭证和辅助凭证拥有相同的权限范围</li>
            <li>建议在不同的应用程序中使用不同的凭证，便于追踪和管理</li>
            <li>重置凭证时不会影响另一个凭证的正常使用</li>
            <li>凭证权限严格限定在当前系统的资源范围内</li>
          </ul>
        </div>
      )}
    </div>
  )
}
