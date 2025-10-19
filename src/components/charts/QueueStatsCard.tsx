import type { Queue } from '@/lib/api'

interface QueueStatsCardProps {
  queue: Queue
}

export function QueueStatsCard({ queue }: QueueStatsCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3 truncate" title={queue.name}>
        {queue.name}
      </h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">消息总数</span>
          <span className="font-medium text-gray-900">
            {queue.messages?.toLocaleString() || 0}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">待处理</span>
          <span className="font-medium text-blue-600">
            {queue.messages_ready?.toLocaleString() || 0}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">待确认</span>
          <span className="font-medium text-yellow-600">
            {queue.messages_unacknowledged?.toLocaleString() || 0}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-sm text-gray-600">消费者</span>
          <span className="font-medium text-green-600">
            {queue.consumers || 0}
          </span>
        </div>
      </div>
    </div>
  )
}
