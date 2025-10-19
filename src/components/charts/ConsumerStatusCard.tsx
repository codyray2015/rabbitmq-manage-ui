import type { Queue } from '@/lib/api'

interface ConsumerStatusCardProps {
  queues: Queue[]
}

export function ConsumerStatusCard({ queues }: ConsumerStatusCardProps) {
  const totalConsumers = queues.reduce((sum, q) => sum + (q.consumers || 0), 0)
  const queuesWithConsumers = queues.filter(q => (q.consumers || 0) > 0).length
  const queuesWithoutConsumers = queues.length - queuesWithConsumers

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-4">消费者状态</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalConsumers}</div>
          <div className="text-sm text-gray-600 mt-1">总消费者数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{queuesWithConsumers}</div>
          <div className="text-sm text-gray-600 mt-1">活跃队列</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{queuesWithoutConsumers}</div>
          <div className="text-sm text-gray-600 mt-1">空闲队列</div>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {queues.map(queue => (
          <div
            key={queue.name}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <span className="text-sm text-gray-700 truncate flex-1" title={queue.name}>
              {queue.name}
            </span>
            <span
              className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                (queue.consumers || 0) > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {queue.consumers || 0} 个消费者
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
