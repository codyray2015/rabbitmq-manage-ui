import { useState, useEffect } from 'react'
import { rabbitMQClient } from '@/lib/api'
import type { SystemResources } from '@/types/system'

interface ResourcesTabProps {
  vhost: string
  systemId: string
}

export function ResourcesTab({ vhost, systemId }: ResourcesTabProps) {
  const [resources, setResources] = useState<SystemResources | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadResources() {
      setLoading(true)
      setError(null)
      try {
        const data = await rabbitMQClient.getSystemResources(vhost, systemId)
        setResources(data)
      } catch (err) {
        console.error('加载资源失败:', err)
        setError(err instanceof Error ? err.message : '加载资源失败')
      } finally {
        setLoading(false)
      }
    }

    loadResources()
  }, [vhost, systemId])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    )
  }

  if (!resources) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 队列列表 */}
      {resources.queues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            队列 ({resources.queues.length})
          </h3>
          <div className="space-y-3">
            {resources.queues.map((queue) => (
              <div
                key={queue.name}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{queue.name}</h4>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      queue.durable
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {queue.durable ? '持久化' : '非持久化'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">消息总数:</span>
                    <span className="ml-2 font-medium">{queue.messages || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">待处理:</span>
                    <span className="ml-2 font-medium">{queue.messages_ready || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">待确认:</span>
                    <span className="ml-2 font-medium">
                      {queue.messages_unacknowledged || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">消费者:</span>
                    <span className="ml-2 font-medium">{queue.consumers || 0}</span>
                  </div>
                </div>

                {queue.arguments && Object.keys(queue.arguments).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                      查看队列参数
                    </summary>
                    <pre className="mt-2 bg-gray-50 rounded p-2 text-xs overflow-x-auto">
                      {JSON.stringify(queue.arguments, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 交换机列表 */}
      {resources.exchanges.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            交换机 ({resources.exchanges.length})
          </h3>
          <div className="space-y-3">
            {resources.exchanges.map((exchange) => (
              <div
                key={exchange.name}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{exchange.name}</h4>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {exchange.type}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        exchange.durable
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {exchange.durable ? '持久化' : '非持久化'}
                    </span>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <span>自动删除:</span>
                  <span className="ml-2">{exchange.auto_delete ? '是' : '否'}</span>
                </div>

                {exchange.arguments && Object.keys(exchange.arguments).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                      查看交换机参数
                    </summary>
                    <pre className="mt-2 bg-gray-50 rounded p-2 text-xs overflow-x-auto">
                      {JSON.stringify(exchange.arguments, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {resources.queues.length === 0 && resources.exchanges.length === 0 && (
        <div className="text-center py-12 text-gray-500">该系统暂无资源</div>
      )}
    </div>
  )
}
