import { useState, useCallback, useEffect } from 'react'
import { rabbitMQClient } from '@/lib/api'
import type { Queue } from '@/lib/api'
import { useInterval } from './useInterval'

interface SystemStatsData {
  queues: Queue[]
  timestamp: number
}

interface UseSystemStatsOptions {
  vhost: string
  systemId: string
  refreshInterval: number | null // milliseconds, null to pause
  maxDataPoints?: number // maximum number of historical data points to keep
}

interface UseSystemStatsReturn {
  currentData: SystemStatsData | null
  history: SystemStatsData[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook for managing system statistics with auto-refresh
 */
export function useSystemStats({
  vhost,
  systemId,
  refreshInterval,
  maxDataPoints = 20,
}: UseSystemStatsOptions): UseSystemStatsReturn {
  const [currentData, setCurrentData] = useState<SystemStatsData | null>(null)
  const [history, setHistory] = useState<SystemStatsData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!vhost || !systemId) return

    setLoading(true)
    setError(null)

    try {
      const snapshot = await rabbitMQClient.getSystemSnapshot(vhost, systemId)
      const newData: SystemStatsData = {
        queues: snapshot.queues,
        timestamp: snapshot.timestamp,
      }

      setCurrentData(newData)

      // Add to history and keep only the last N data points
      setHistory(prev => {
        const updated = [...prev, newData]
        if (updated.length > maxDataPoints) {
          return updated.slice(updated.length - maxDataPoints)
        }
        return updated
      })
    } catch (err) {
      console.error('获取系统统计失败:', err)
      setError(err instanceof Error ? err.message : '获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }, [vhost, systemId, maxDataPoints])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh with interval
  useInterval(refresh, refreshInterval)

  return {
    currentData,
    history,
    loading,
    error,
    refresh,
  }
}
