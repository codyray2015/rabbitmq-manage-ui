/**
 * 系统管理页面
 * 显示和管理所有由 manage 创建的队列系统
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { rabbitMQClient } from '../lib/api'
import type { ManagedSystem } from '../types/system'
import { parseSystemId, formatCreatedAt } from '../types/system'

export default function ManagePage() {
  const navigate = useNavigate()
  const [vhosts, setVhosts] = useState<string[]>([])
  const [selectedVhost, setSelectedVhost] = useState<string>('')
  const [systems, setSystems] = useState<ManagedSystem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // 加载 vhosts 列表（只在初始化时执行一次）
  useEffect(() => {
    let cancelled = false

    async function loadVhosts() {
      try {
        const vhostList = await rabbitMQClient.getVhosts()
        if (cancelled) return

        const names = vhostList.map(v => v.name)
        setVhosts(names)
        if (names.length > 0) {
          setSelectedVhost(names[0])
        }
        setIsInitialized(true)
      } catch (err) {
        if (cancelled) return
        console.error('加载 vhosts 失败:', err)
        setError(err instanceof Error ? err.message : '加载 vhosts 失败')
      }
    }

    loadVhosts()

    return () => {
      cancelled = true
    }
  }, [])

  // 加载系统列表（仅在初始化完成后执行）
  useEffect(() => {
    if (!isInitialized || !selectedVhost) return

    let cancelled = false

    async function loadSystems() {
      setLoading(true)
      setError(null)
      try {
        const systemList = await rabbitMQClient.getManagedSystems(selectedVhost)
        if (cancelled) return

        setSystems(systemList)
      } catch (err) {
        if (cancelled) return
        console.error('加载系统列表失败:', err)
        setError(err instanceof Error ? err.message : '加载系统列表失败')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSystems()

    return () => {
      cancelled = true
    }
  }, [selectedVhost, isInitialized])

  // 跳转到系统详情页
  function navigateToSystemDetail(systemId: string) {
    const encodedVhost = encodeURIComponent(selectedVhost)
    const encodedSystemId = encodeURIComponent(systemId)
    navigate(`/system/${encodedVhost}/${encodedSystemId}`)
  }

  // 删除系统
  async function handleDeleteSystem(systemId: string) {
    const parsed = parseSystemId(systemId)
    const displayName = parsed ? `${parsed.template} (${parsed.queuePrefix})` : systemId

    if (!confirm(`确定要删除系统 "${displayName}" 吗？\n\n此操作将删除所有相关的队列和可安全删除的交换机。`)) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await rabbitMQClient.deleteSystem(selectedVhost, systemId)

      // 检查是否有无法安全删除的交换机
      if (result.remainingExchanges.length > 0) {
        // 分类交换机
        const orphanedExchanges = result.remainingExchanges.filter(ex => ex.reason === 'orphaned_exchange')
        const boundExchanges = result.remainingExchanges.filter(ex => ex.reason === 'has_bindings')

        let message = `已删除:\n` +
          `  - ${result.deletedQueues.length} 个队列\n` +
          `  - ${result.deletedExchanges.length} 个交换机\n\n`

        // 孤儿交换机（建议删除）
        if (orphanedExchanges.length > 0) {
          const orphanList = orphanedExchanges
            .map(ex => `  • ${ex.name} (创建者已删除: ${ex.createdBy})`)
            .join('\n')
          message += `以下交换机是孤儿资源（创建者系统已被删除）:\n${orphanList}\n`
          message += `建议删除这些交换机。\n\n`
        }

        // 有绑定的交换机（谨慎删除）
        if (boundExchanges.length > 0) {
          const boundList = boundExchanges
            .map(ex => {
              const creatorInfo = ex.createdBy ? ` (创建者: ${ex.createdBy})` : ''
              return `  • ${ex.name} - 有 ${ex.bindingCount} 个绑定${creatorInfo}`
            })
            .join('\n')
          message += `以下交换机仍被其他系统使用:\n${boundList}\n`
          message += `⚠️ 强制删除可能会影响其他系统！\n\n`
        }

        message += `是否要删除这些交换机？`

        if (confirm(message)) {
          // 用户选择删除
          setLoading(true)
          await rabbitMQClient.forceDeleteExchanges(
            selectedVhost,
            result.remainingExchanges.map(ex => ex.name)
          )
        }
      }

      // 重新加载系统列表
      const systemList = await rabbitMQClient.getManagedSystems(selectedVhost)
      setSystems(systemList)

      // 显示成功消息
      const summary = `删除完成:\n` +
        `  - ${result.deletedQueues.length} 个队列\n` +
        `  - ${result.deletedExchanges.length + (result.remainingExchanges.length === 0 ? 0 : result.remainingExchanges.length)} 个交换机`
      alert(summary)
    } catch (err) {
      console.error('删除系统失败:', err)
      setError(err instanceof Error ? err.message : '删除系统失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">系统管理</h1>

        {/* VHost 选择 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择 Virtual Host
          </label>
          <select
            value={selectedVhost}
            onChange={(e) => setSelectedVhost(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {vhosts.map((vhost) => (
              <option key={vhost} value={vhost}>
                {vhost}
              </option>
            ))}
          </select>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* 加载状态 */}
        {loading && systems.length === 0 && (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        )}

        {/* 空状态 */}
        {!loading && systems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无托管系统
          </div>
        )}

        {/* 系统列表 */}
        {systems.length > 0 && (
          <div className="space-y-4">
            {systems.map((system) => {
              const parsed = parseSystemId(system.systemId)

              return (
                <div
                  key={system.systemId}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:border-orange-300 transition-colors"
                >
                  {/* 系统摘要 */}
                  <div className="bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigateToSystemDetail(system.systemId)}
                        className="flex-1 text-left hover:bg-gray-100 -m-4 p-4 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">📦</div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {parsed?.queuePrefix || 'unknown'}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>模板: {system.template}</span>
                              <span>版本: {system.version}</span>
                              <span>创建: {formatCreatedAt(system.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-6 ml-4">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{system.queueCount}</span> 队列
                          {' · '}
                          <span className="font-medium">{system.exchangeCount}</span> 交换机
                        </div>
                        <button
                          onClick={() => handleDeleteSystem(system.systemId)}
                          disabled={loading}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
