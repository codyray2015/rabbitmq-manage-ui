import { useState, useEffect } from 'react'
import { rabbitMQClient } from '@/lib/api'
import type { SystemResources } from '@/types/system'
import {
  generateProducerCode,
  generateConsumerCode,
  generateRetryConsumerCode,
} from '@/utils/codeTemplates'
import {
  getSystemCredentials,
  type SystemCredentials,
} from '@/lib/credentialsManager'

interface CodeGeneratorTabProps {
  vhost: string
  systemId: string
  template: string
}

type CodeType = 'producer' | 'consumer' | 'retry-consumer'

interface Binding {
  source: string
  vhost: string
  destination: string
  destination_type: string
  routing_key: string
  arguments?: Record<string, any>
  properties_key: string
}

export function CodeGeneratorTab({ vhost, systemId, template }: CodeGeneratorTabProps) {
  const [resources, setResources] = useState<SystemResources | null>(null)
  const [bindings, setBindings] = useState<Binding[]>([])
  const [loading, setLoading] = useState(false)

  const [codeType, setCodeType] = useState<CodeType>('consumer')
  const [selectedQueue, setSelectedQueue] = useState('')
  const [selectedExchange, setSelectedExchange] = useState('')
  const [selectedTargetQueue, setSelectedTargetQueue] = useState('') // 生产者的目标队列
  const [copied, setCopied] = useState(false)

  // 凭证相关 state
  const [credentials, setCredentials] = useState<SystemCredentials>({
    primary: null,
    secondary: null,
  })
  const [selectedCredentialType, setSelectedCredentialType] = useState<'primary' | 'secondary'>('primary')
  const [loadingCredentials, setLoadingCredentials] = useState(false)

  useEffect(() => {
    async function loadResources() {
      setLoading(true)
      try {
        const [resourcesData, bindingsData] = await Promise.all([
          rabbitMQClient.getSystemResources(vhost, systemId),
          rabbitMQClient.getBindings(vhost)
        ])

        setResources(resourcesData)
        setBindings(bindingsData)

        if (resourcesData.queues.length > 0) {
          setSelectedQueue(resourcesData.queues[0].name)
          setSelectedTargetQueue(resourcesData.queues[0].name)
        }
        if (resourcesData.exchanges.length > 0) {
          setSelectedExchange(resourcesData.exchanges[0].name)
        }
      } catch (err) {
        console.error('加载资源失败:', err)
      } finally {
        setLoading(false)
      }
    }

    loadResources()
  }, [vhost, systemId])

  // 加载凭证
  useEffect(() => {
    let cancelled = false

    async function loadCredentials() {
      setLoadingCredentials(true)
      try {
        const creds = await getSystemCredentials(vhost, systemId)
        if (cancelled) return

        setCredentials(creds)

        // 默认选择主凭证，如果主凭证不存在则选择辅助凭证
        if (creds.primary) {
          setSelectedCredentialType('primary')
        } else if (creds.secondary) {
          setSelectedCredentialType('secondary')
        }
      } catch (err) {
        if (cancelled) return
        console.error('加载凭证失败:', err)
      } finally {
        if (!cancelled) {
          setLoadingCredentials(false)
        }
      }
    }

    loadCredentials()

    return () => {
      cancelled = true
    }
  }, [vhost, systemId])

  const handleCopy = async () => {
    const code = getGeneratedCode()
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const code = getGeneratedCode()
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Program.cs`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 获取生产者的路由键
  const getProducerRoutingKey = (): string => {
    // 查找从选中的交换机到选中的目标队列的绑定
    const binding = bindings.find(
      b => b.source === selectedExchange &&
           b.destination === selectedTargetQueue &&
           b.destination_type === 'queue'
    )
    return binding?.routing_key || '#'
  }

  const getGeneratedCode = (): string => {
    // 获取选中的凭证
    let selectedCredential = selectedCredentialType === 'primary'
      ? credentials.primary
      : credentials.secondary

    // 如果主辅凭证都不存在，使用当前登录账户
    if (!selectedCredential) {
      const currentCredentials = rabbitMQClient.getCredentials()
      if (currentCredentials) {
        selectedCredential = {
          username: currentCredentials.username,
          password: currentCredentials.password,
          createdAt: new Date().toISOString(),
          type: 'primary'
        }
      }
    }

    const params = {
      namespace: '', // 不再使用
      className: '', // 不再使用
      host: 'localhost',
      port: 5672,
      username: selectedCredential?.username || 'guest',
      password: selectedCredential?.password || 'your-password',
      vhost,
      queueName: selectedQueue,
      exchangeName: selectedExchange,
      routingKey: codeType === 'producer' ? getProducerRoutingKey() : '#',
    }

    switch (codeType) {
      case 'producer':
        return generateProducerCode(params)
      case 'consumer':
        return generateConsumerCode(params)
      case 'retry-consumer':
        return generateRetryConsumerCode({ ...params, maxRetries: 3 })
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* 配置面板 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">代码配置</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 凭证选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              使用凭证
            </label>
            {credentials.primary || credentials.secondary ? (
              <select
                value={selectedCredentialType}
                onChange={(e) => setSelectedCredentialType(e.target.value as 'primary' | 'secondary')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={loadingCredentials}
              >
                <option value="primary" disabled={!credentials.primary}>
                  主凭证 {credentials.primary ? `(${credentials.primary.username})` : '(未配置)'}
                </option>
                <option value="secondary" disabled={!credentials.secondary}>
                  辅助凭证 {credentials.secondary ? `(${credentials.secondary.username})` : '(未配置)'}
                </option>
              </select>
            ) : (
              <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600">
                当前登录账户 ({rabbitMQClient.getUsername()})
              </div>
            )}
            {!credentials.primary && !credentials.secondary && (
              <p className="text-xs text-amber-600 mt-1">
                未配置系统凭证，将使用当前登录账户生成代码
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              代码类型
            </label>
            <select
              value={codeType}
              onChange={(e) => setCodeType(e.target.value as CodeType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="producer">生产者</option>
              <option value="consumer">消费者</option>
              {template === 'retry-system' && (
                <option value="retry-consumer">带重试逻辑的消费者</option>
              )}
            </select>
          </div>

          {codeType === 'producer' ? (
            <>
              {/* 生产者：同时显示交换机和目标队列 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目标交换机
                </label>
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {resources?.exchanges.map((ex) => (
                    <option key={ex.name} value={ex.name}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目标队列 (用于读取路由键)
                </label>
                <select
                  value={selectedTargetQueue}
                  onChange={(e) => setSelectedTargetQueue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {resources?.queues.map((q) => (
                    <option key={q.name} value={q.name}>
                      {q.name} {(() => {
                        const binding = bindings.find(
                          b => b.source === selectedExchange &&
                               b.destination === q.name &&
                               b.destination_type === 'queue'
                        )
                        return binding ? `(routing key: ${binding.routing_key})` : ''
                      })()}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标队列
              </label>
              <select
                value={selectedQueue}
                onChange={(e) => setSelectedQueue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {resources?.queues.map((q) => (
                  <option key={q.name} value={q.name}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 生成的代码 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">生成的代码</h3>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {copied ? '✓ 已复制' : '📋 复制'}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              💾 下载 .cs 文件
            </button>
          </div>
        </div>

        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
          <code className="text-sm text-gray-800">{getGeneratedCode()}</code>
        </pre>
      </div>

      {/* 提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 使用说明</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 代码已包含凭证信息，可直接使用</li>
          <li>• 需要安装 NuGet 包: <code className="bg-blue-100 px-1 rounded">RabbitMQ.Client</code></li>
          <li>• 使用 .NET 6.0 或更高版本</li>
          <li>• 生成的代码为简化示例，生产环境请添加适当的错误处理</li>
        </ul>
      </div>
    </div>
  )
}
