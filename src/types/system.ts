/**
 * 系统管理相关类型定义
 */

import type { Queue, Exchange } from '../lib/api'

/**
 * 托管系统摘要信息
 */
export interface ManagedSystem {
  systemId: string
  template: string
  version: string
  createdAt: string
  queueCount: number
  exchangeCount: number
}

/**
 * 系统资源详情
 */
export interface SystemResources {
  queues: Queue[]
  exchanges: Exchange[]
}

/**
 * 系统 ID 的解析结果
 */
export interface ParsedSystemId {
  template: string
  vhost: string
  queuePrefix: string
}

/**
 * 解析 system-id
 * 格式: {template}@{vhost}:{queue_prefix}
 */
export function parseSystemId(systemId: string): ParsedSystemId | null {
  const match = /^([^@]+)@([^:]+):(.+)$/.exec(systemId)
  if (!match) {
    return null
  }

  return {
    template: match[1],
    vhost: match[2],
    queuePrefix: match[3],
  }
}

/**
 * 队列统计信息
 */
export interface QueueStats {
  name: string
  messages: number
  messages_ready: number
  messages_unacknowledged: number
  consumers: number
  message_stats?: {
    publish?: number
    publish_details?: { rate: number }
    deliver?: number
    deliver_details?: { rate: number }
    ack?: number
    ack_details?: { rate: number }
  }
}

/**
 * 系统统计快照
 */
export interface SystemSnapshot {
  timestamp: number
  queues: QueueStats[]
}

/**
 * 消息速率数据
 */
export interface MessageRate {
  publishRate: number // 发布速率 (msg/s)
  deliverRate: number // 投递速率 (msg/s)
  ackRate: number // 确认速率 (msg/s)
}

/**
 * 格式化系统创建时间
 */
export function formatCreatedAt(isoString: string): string {
  if (!isoString) return '未知'

  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`

    // 超过 7 天，显示具体日期
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '未知'
  }
}
