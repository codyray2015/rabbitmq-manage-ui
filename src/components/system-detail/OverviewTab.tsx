import { useState } from 'react'
import { useSystemStats } from '@/hooks/useSystemStats'
import { QueueStatsCard } from '@/components/charts/QueueStatsCard'
import { MessageTrendChart } from '@/components/charts/MessageTrendChart'
import { MessageRateChart } from '@/components/charts/MessageRateChart'
import { ConsumerStatusCard } from '@/components/charts/ConsumerStatusCard'

interface OverviewTabProps {
  vhost: string
  systemId: string
}

export function OverviewTab({ vhost, systemId }: OverviewTabProps) {
  const [refreshInterval, setRefreshInterval] = useState<number>(10000) // 默认 10 秒
  const [isPaused, setIsPaused] = useState(false)

  const { currentData, history, loading, error, refresh } = useSystemStats({
    vhost,
    systemId,
    refreshInterval: isPaused ? null : refreshInterval,
    maxDataPoints: 20,
  })

  // 计算消息趋势数据（所有队列的总消息数）
  const trendData = history.map(snapshot => ({
    timestamp: snapshot.timestamp,
    messages: snapshot.queues.reduce((sum, q) => sum + (q.messages || 0), 0),
  }))

  // 计算消息速率数据
  const rateData = currentData?.queues.map(queue => ({
    name: queue.name,
    publishRate: queue.message_stats?.publish_details?.rate || 0,
    deliverRate: queue.message_stats?.deliver_details?.rate || 0,
    ackRate: queue.message_stats?.ack_details?.rate || 0,
  })) || []

  const lastUpdate = currentData
    ? new Date(currentData.timestamp).toLocaleTimeString('zh-CN')
    : '未更新'

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">刷新频率:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value={5000}>5 秒</option>
              <option value={10000}>10 秒</option>
              <option value={30000}>30 秒</option>
              <option value={60000}>60 秒</option>
            </select>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isPaused
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {isPaused ? '▶ 继续' : '⏸ 暂停'}
            </button>

            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '刷新中...' : '🔄 手动刷新'}
            </button>
          </div>

          <div className="text-sm text-gray-600">
            最后更新: <span className="font-medium">{lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* 队列状态卡片 */}
      {currentData && currentData.queues.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">队列概览</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentData.queues.map((queue) => (
              <QueueStatsCard key={queue.name} queue={queue} />
            ))}
          </div>
        </div>
      )}

      {/* 消息数量趋势图 */}
      {trendData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">消息数量趋势</h3>
          <MessageTrendChart data={trendData} />
        </div>
      )}

      {/* 消息速率图 */}
      {rateData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">消息速率</h3>
          <MessageRateChart queues={rateData} />
        </div>
      )}

      {/* 消费者状态 */}
      {currentData && currentData.queues.length > 0 && (
        <div>
          <ConsumerStatusCard queues={currentData.queues} />
        </div>
      )}

      {/* 空状态 */}
      {!loading && currentData && currentData.queues.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          该系统暂无队列数据
        </div>
      )}
    </div>
  )
}
