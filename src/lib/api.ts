/**
 * RabbitMQ Management API Client
 * 凭证仅存储在内存中，不持久化
 */

import { config } from '@/config'

export interface RabbitMQCredentials {
  username: string
  password: string
}

export interface VHost {
  name: string
  description?: string
  tracing?: boolean
  tags?: string[]
}

export interface Queue {
  name: string
  vhost: string
  durable: boolean
  auto_delete: boolean
  arguments?: Record<string, any>
  state?: string
  messages?: number
  messages_ready?: number
  messages_unacknowledged?: number
  consumers?: number
  message_stats?: {
    publish?: number
    publish_details?: { rate: number }
    deliver?: number
    deliver_details?: { rate: number }
    ack?: number
    ack_details?: { rate: number }
  }
}

export interface QueueCreateParams {
  name: string
  vhost: string
  durable?: boolean
  auto_delete?: boolean
  arguments?: Record<string, any>
}

export interface Exchange {
  name: string
  vhost: string
  type: string
  durable: boolean
  auto_delete: boolean
  internal?: boolean
  arguments?: Record<string, any>
}

export interface ExchangeCreateParams {
  name: string
  vhost: string
  type: 'direct' | 'topic' | 'fanout' | 'headers'
  durable?: boolean
  auto_delete?: boolean
  internal?: boolean
  arguments?: Record<string, any>
}

export interface BindingCreateParams {
  source: string
  vhost: string
  destination: string
  destination_type: 'queue' | 'exchange'
  routing_key: string
  arguments?: Record<string, any>
}

export interface Binding {
  source: string
  vhost: string
  destination: string
  destination_type: 'queue' | 'exchange'
  routing_key: string
  properties_key: string
  arguments?: Record<string, any>
}

// Manage 元数据
export interface ManageMetadata {
  'x-manage-system-id': string
  'x-manage-template': string
  'x-manage-version': string
  'x-manage-created-at': string
}

// 生成系统 ID 的参数
export interface SystemIdParams {
  templateName: string
  vhost: string
  queue_prefix?: string
  [key: string]: any
}

export class RabbitMQClient {
  // 凭证仅存储在内存中 - 私有属性
  private username: string = ''
  private password: string = ''
  private baseURL: string = config.rabbitmq.apiUrl

  // 缓存机制（防止重复请求）
  private vhostsCache: VHost[] | null = null
  private vhostsCachePromise: Promise<VHost[]> | null = null

  /**
   * 设置登录凭证（仅存储在内存中）
   */
  setCredentials(username: string, password: string): void {
    this.username = username
    this.password = password
    // 清除缓存
    this.clearCache()
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.vhostsCache = null
    this.vhostsCachePromise = null
  }

  /**
   * 清除凭证
   */
  clearCredentials(): void {
    this.username = ''
    this.password = ''
  }

  /**
   * 检查是否已设置凭证
   */
  hasCredentials(): boolean {
    return !!this.username && !!this.password
  }

  /**
   * 获取当前用户名（不暴露密码）
   */
  getUsername(): string {
    return this.username
  }

  /**
   * 获取当前凭证（用于代码生成）
   */
  getCredentials(): RabbitMQCredentials | null {
    if (!this.hasCredentials()) {
      return null
    }
    return {
      username: this.username,
      password: this.password
    }
  }

  /**
   * 通用 API 请求方法
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    if (!this.hasCredentials()) {
      throw new Error('未设置凭证，请先调用 setCredentials()')
    }

    const headers = new Headers(options?.headers)

    // 添加 Basic Auth
    const auth = btoa(`${this.username}:${this.password}`)
    headers.set('Authorization', `Basic ${auth}`)
    headers.set('Content-Type', 'application/json')

    const url = `${this.baseURL}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('认证失败：用户名或密码错误')
        }
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
      }

      // 如果是 DELETE、PUT 或 204/201 响应，不解析 JSON
      if (
        response.status === 204 ||
        response.status === 201 ||
        options?.method === 'DELETE' ||
        options?.method === 'PUT'
      ) {
        return undefined as T
      }

      // 检查响应是否有内容
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text()
        if (text) {
          try {
            return JSON.parse(text)
          } catch (e) {
            console.error('JSON 解析失败:', text)
            throw new Error('服务器返回的数据格式错误')
          }
        }
      }

      return undefined as T
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('网络请求失败')
    }
  }

  /**
   * 获取概览信息（用于验证连接）
   */
  async getOverview() {
    return this.request<any>('/overview')
  }

  /**
   * 获取所有 vhosts（带缓存）
   */
  async getVhosts(): Promise<VHost[]> {
    // 如果有缓存，直接返回
    if (this.vhostsCache) {
      return this.vhostsCache
    }

    // 如果正在请求中，返回同一个 Promise（防止并发重复请求）
    if (this.vhostsCachePromise) {
      return this.vhostsCachePromise
    }

    // 创建新的请求
    this.vhostsCachePromise = this.request<VHost[]>('/vhosts')
      .then((result) => {
        this.vhostsCache = result
        this.vhostsCachePromise = null
        return result
      })
      .catch((error) => {
        this.vhostsCachePromise = null
        throw error
      })

    return this.vhostsCachePromise
  }

  /**
   * 获取指定 vhost 的所有队列
   */
  async getQueues(vhost: string): Promise<Queue[]> {
    const encodedVhost = encodeURIComponent(vhost)
    return this.request<Queue[]>(`/queues/${encodedVhost}`)
  }

  /**
   * 获取队列详细信息
   */
  async getQueue(vhost: string, queueName: string): Promise<Queue> {
    const encodedVhost = encodeURIComponent(vhost)
    const encodedQueue = encodeURIComponent(queueName)
    return this.request<Queue>(`/queues/${encodedVhost}/${encodedQueue}`)
  }

  /**
   * 创建队列
   */
  async createQueue(params: QueueCreateParams): Promise<void> {
    const encodedVhost = encodeURIComponent(params.vhost)
    const encodedQueue = encodeURIComponent(params.name)

    const body = {
      durable: params.durable ?? true,
      auto_delete: params.auto_delete ?? false,
      arguments: params.arguments ?? {},
    }

    return this.request<void>(`/queues/${encodedVhost}/${encodedQueue}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  /**
   * 从队列配置创建队列（用于模板渲染后的配置）
   */
  async createQueueFromConfig(config: {
    name: string
    vhost: string
    durable: boolean
    auto_delete: boolean
    arguments?: Record<string, any>
  }): Promise<void> {
    return this.createQueue({
      name: config.name,
      vhost: config.vhost,
      durable: config.durable,
      auto_delete: config.auto_delete,
      arguments: config.arguments,
    })
  }

  /**
   * 删除队列
   */
  async deleteQueue(vhost: string, queueName: string): Promise<void> {
    const encodedVhost = encodeURIComponent(vhost)
    const encodedQueue = encodeURIComponent(queueName)
    return this.request<void>(`/queues/${encodedVhost}/${encodedQueue}`, {
      method: 'DELETE',
    })
  }

  /**
   * 清空队列（删除所有消息）
   */
  async purgeQueue(vhost: string, queueName: string): Promise<void> {
    const encodedVhost = encodeURIComponent(vhost)
    const encodedQueue = encodeURIComponent(queueName)
    return this.request<void>(
      `/queues/${encodedVhost}/${encodedQueue}/contents`,
      {
        method: 'DELETE',
      }
    )
  }

  /**
   * 获取所有交换机
   */
  async getExchanges(vhost: string): Promise<Exchange[]> {
    const encodedVhost = encodeURIComponent(vhost)
    return this.request<Exchange[]>(`/exchanges/${encodedVhost}`)
  }

  /**
   * 获取单个交换机详情
   */
  async getExchange(vhost: string, exchangeName: string): Promise<Exchange | null> {
    try {
      const encodedVhost = encodeURIComponent(vhost)
      const encodedExchange = encodeURIComponent(exchangeName)
      return await this.request<Exchange>(`/exchanges/${encodedVhost}/${encodedExchange}`)
    } catch (error) {
      // 如果交换机不存在，返回 null
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * 创建交换机
   */
  async createExchange(params: ExchangeCreateParams): Promise<void> {
    const encodedVhost = encodeURIComponent(params.vhost)
    const encodedExchange = encodeURIComponent(params.name)

    const body = {
      type: params.type,
      durable: params.durable ?? true,
      auto_delete: params.auto_delete ?? false,
      internal: params.internal ?? false,
      arguments: params.arguments ?? {},
    }

    return this.request<void>(
      `/exchanges/${encodedVhost}/${encodedExchange}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    )
  }

  /**
   * 删除交换机
   */
  async deleteExchange(vhost: string, exchangeName: string): Promise<void> {
    const encodedVhost = encodeURIComponent(vhost)
    const encodedExchange = encodeURIComponent(exchangeName)
    return this.request<void>(
      `/exchanges/${encodedVhost}/${encodedExchange}`,
      {
        method: 'DELETE',
      }
    )
  }

  /**
   * 获取所有绑定关系
   */
  async getBindings(vhost: string): Promise<Binding[]> {
    const encodedVhost = encodeURIComponent(vhost)
    return this.request<Binding[]>(`/bindings/${encodedVhost}`)
  }

  /**
   * 创建绑定关系
   */
  async createBinding(params: BindingCreateParams): Promise<void> {
    const encodedVhost = encodeURIComponent(params.vhost)
    const encodedSource = encodeURIComponent(params.source)
    const encodedDestination = encodeURIComponent(params.destination)
    const destType = params.destination_type === 'exchange' ? 'e' : 'q'

    const body = {
      routing_key: params.routing_key,
      arguments: params.arguments ?? {},
    }

    return this.request<void>(
      `/bindings/${encodedVhost}/e/${encodedSource}/${destType}/${encodedDestination}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    )
  }

  /**
   * 生成系统 ID
   * 格式: {template}@{vhost}:{queue_prefix}
   */
  private generateSystemId(params: SystemIdParams): string {
    const { templateName, vhost, queue_prefix } = params
    const prefix = queue_prefix || 'unnamed'
    return `${templateName}@${vhost}:${prefix}`
  }

  /**
   * 生成 manage 元数据
   */
  private generateManageMetadata(
    systemId: string,
    templateName: string,
    templateVersion: string
  ): ManageMetadata {
    return {
      'x-manage-system-id': systemId,
      'x-manage-template': templateName,
      'x-manage-version': templateVersion,
      'x-manage-created-at': new Date().toISOString(),
    }
  }

  /**
   * 验证资源属性是否匹配
   */
  private validateResource(
    actual: any,
    expected: any,
    resourceType: string,
    resourceName: string
  ): void {
    const errors: string[] = []

    for (const [key, expectedValue] of Object.entries(expected)) {
      const actualValue = actual[key]

      // 特殊处理 arguments
      if (key === 'arguments' && typeof expectedValue === 'object') {
        for (const [argKey, argValue] of Object.entries(expectedValue as Record<string, any>)) {
          if (actual.arguments?.[argKey] !== argValue) {
            errors.push(
              `${argKey}: 期望 ${JSON.stringify(argValue)}, 实际 ${JSON.stringify(actual.arguments?.[argKey])}`
            )
          }
        }
      } else if (actualValue !== expectedValue) {
        errors.push(`${key}: 期望 ${expectedValue}, 实际 ${actualValue}`)
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `${resourceType} "${resourceName}" 已存在但不符合要求:\n${errors.join('\n')}`
      )
    }
  }

  /**
   * 从渲染后的系统配置批量创建资源（支持智能复用和元数据注入）
   */
  async createSystem(
    config: {
      vhost: string
      exchanges: Array<{
        name: string
        type: 'direct' | 'topic' | 'fanout' | 'headers'
        durable: boolean
        auto_delete: boolean
        internal?: boolean
        arguments?: Record<string, any>
        reuseIfExists?: boolean
        validateIfExists?: Record<string, any>
      }>
      queues: Array<{
        name: string
        vhost: string
        durable: boolean
        auto_delete: boolean
        arguments?: Record<string, any>
        reuseIfExists?: boolean
        validateIfExists?: Record<string, any>
      }>
      bindings: Array<{
        source: string
        destination: string
        destination_type?: 'queue' | 'exchange'
        routing_key: string
        arguments?: Record<string, any>
      }>
    },
    templateName: string,
    templateVersion: string,
    userParams: Record<string, any>
  ): Promise<void> {
    // 生成系统 ID 和元数据
    const systemId = this.generateSystemId({
      templateName,
      vhost: config.vhost,
      ...userParams,
    })
    const metadata = this.generateManageMetadata(systemId, templateName, templateVersion)
    // 1. 创建所有交换机（支持复用）
    for (const exchange of config.exchanges) {
      // 检查交换机是否已存在
      const existing = await this.getExchange(config.vhost, exchange.name)

      if (existing) {
        if (exchange.reuseIfExists && exchange.validateIfExists) {
          // 复用模式：验证属性是否匹配
          this.validateResource(
            existing,
            exchange.validateIfExists,
            '交换机',
            exchange.name
          )
          console.log(`复用现有交换机: ${exchange.name}`)
          continue  // 跳过创建
        } else if (exchange.reuseIfExists) {
          // 复用但不验证
          console.log(`复用现有交换机: ${exchange.name}`)
          continue
        } else {
          // 不允许复用，报错
          throw new Error(`交换机 "${exchange.name}" 已存在，无法创建`)
        }
      }

      // 不存在，创建新交换机（注入 manage 元数据）
      await this.createExchange({
        name: exchange.name,
        vhost: config.vhost,
        type: exchange.type,
        durable: exchange.durable,
        auto_delete: exchange.auto_delete,
        internal: exchange.internal,
        arguments: {
          ...exchange.arguments,
          ...metadata, // 注入 manage 元数据
        },
      })
    }

    // 2. 创建所有队列（支持复用）
    for (const queue of config.queues) {
      // 检查队列是否已存在
      try {
        const existing = await this.getQueue(queue.vhost, queue.name)

        if (existing) {
          if (queue.reuseIfExists && queue.validateIfExists) {
            // 复用模式：验证属性是否匹配
            this.validateResource(
              existing,
              queue.validateIfExists,
              '队列',
              queue.name
            )
            console.log(`复用现有队列: ${queue.name}`)
            continue  // 跳过创建
          } else if (queue.reuseIfExists) {
            // 复用但不验证
            console.log(`复用现有队列: ${queue.name}`)
            continue
          } else {
            // 不允许复用，报错
            throw new Error(`队列 "${queue.name}" 已存在，无法创建`)
          }
        }
      } catch (error) {
        // 队列不存在，继续创建
        if (!(error instanceof Error && error.message.includes('404'))) {
          throw error
        }
      }

      // 不存在，创建新队列（注入 manage 元数据）
      await this.createQueue({
        name: queue.name,
        vhost: queue.vhost,
        durable: queue.durable,
        auto_delete: queue.auto_delete,
        arguments: {
          ...queue.arguments,
          ...metadata, // 注入 manage 元数据
        },
      })
    }

    // 3. 创建所有绑定关系
    for (const binding of config.bindings) {
      await this.createBinding({
        source: binding.source,
        vhost: config.vhost,
        destination: binding.destination,
        destination_type: binding.destination_type || 'queue',
        routing_key: binding.routing_key,
        arguments: {
          ...binding.arguments,
          ...metadata, // 注入 manage 元数据
        },
      })
    }
  }

  /**
   * 获取所有由 manage 管理的系统
   * 返回按 system-id 分组的系统列表
   * 注意：只基于队列来识别系统，忽略孤儿交换机
   */
  async getManagedSystems(vhost: string): Promise<Array<{
    systemId: string
    template: string
    version: string
    createdAt: string
    queueCount: number
    exchangeCount: number
  }>> {
    // 1. 获取所有队列
    const queues = await this.getQueues(vhost)

    // 2. 获取所有交换机
    const exchanges = await this.getExchanges(vhost)

    // 3. 提取所有带有 x-manage-system-id 的资源
    const systemMap = new Map<string, {
      template: string
      version: string
      createdAt: string
      queueCount: number
      exchangeCount: number
    }>()

    // 统计队列（只基于队列来识别系统）
    for (const queue of queues) {
      const systemId = queue.arguments?.['x-manage-system-id']
      const template = queue.arguments?.['x-manage-template']
      const version = queue.arguments?.['x-manage-version']
      const createdAt = queue.arguments?.['x-manage-created-at']

      if (systemId && template) {
        if (!systemMap.has(systemId)) {
          systemMap.set(systemId, {
            template,
            version: version || 'unknown',
            createdAt: createdAt || '',
            queueCount: 0,
            exchangeCount: 0,
          })
        }
        systemMap.get(systemId)!.queueCount++
      }
    }

    // 统计交换机（只统计属于已识别系统的交换机）
    for (const exchange of exchanges) {
      const systemId = exchange.arguments?.['x-manage-system-id']

      if (systemId && systemMap.has(systemId)) {
        systemMap.get(systemId)!.exchangeCount++
      }
    }

    // 转换为数组并排序（按创建时间倒序）
    return Array.from(systemMap.entries())
      .map(([systemId, info]) => ({
        systemId,
        ...info,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /**
   * 获取指定系统的所有资源
   */
  async getSystemResources(vhost: string, systemId: string): Promise<{
    queues: Queue[]
    exchanges: Exchange[]
  }> {
    // 1. 获取所有队列
    const allQueues = await this.getQueues(vhost)

    // 2. 获取所有交换机
    const allExchanges = await this.getExchanges(vhost)

    // 3. 过滤出属于该系统的资源
    const queues = allQueues.filter(
      q => q.arguments?.['x-manage-system-id'] === systemId
    )

    const exchanges = allExchanges.filter(
      e => e.arguments?.['x-manage-system-id'] === systemId
    )

    return { queues, exchanges }
  }

  /**
   * 删除整个系统（包括所有队列和可安全删除的交换机）
   * 返回删除结果和无法安全删除的交换机列表
   */
  async deleteSystem(vhost: string, systemId: string): Promise<{
    deletedQueues: string[]
    deletedExchanges: string[]
    remainingExchanges: Array<{
      name: string
      reason: 'has_bindings' | 'orphaned_exchange'
      bindingCount: number
      isManaged: boolean
      createdBy?: string
    }>
  }> {
    const deletedQueues: string[] = []
    const deletedExchanges: string[] = []

    // 1. 获取系统的所有资源
    const { queues } = await this.getSystemResources(vhost, systemId)

    // 2. 获取所有绑定（删除前）
    const allBindingsBefore = await this.getBindings(vhost)

    // 找出被当前系统使用的所有交换机（包括复用的）
    const usedExchangeNames = new Set<string>()
    for (const binding of allBindingsBefore) {
      // 找出绑定到当前系统队列的交换机
      if (queues.some(q => q.name === binding.destination)) {
        usedExchangeNames.add(binding.source)
      }
    }

    // 3. 删除所有队列
    for (const queue of queues) {
      await this.deleteQueue(vhost, queue.name)
      deletedQueues.push(queue.name)
    }

    // 4. 获取所有队列（用于检查哪些系统还存在）
    const allQueues = await this.getQueues(vhost)
    const existingSystems = new Set(
      allQueues
        .map(q => q.arguments?.['x-manage-system-id'])
        .filter(id => id)
    )

    // 5. 获取所有交换机
    const allExchanges = await this.getExchanges(vhost)

    // 6. 找出所有需要检查的交换机（属于当前系统的 + 被当前系统使用的）
    const exchangesToCheck: Exchange[] = []
    for (const exchangeName of usedExchangeNames) {
      const exchange = allExchanges.find(e => e.name === exchangeName)
      if (exchange) {
        exchangesToCheck.push(exchange)
      }
    }

    // 7. 循环删除没有绑定的交换机
    let currentExchanges = [...exchangesToCheck]
    let hasChanges = true

    while (hasChanges && currentExchanges.length > 0) {
      hasChanges = false
      const remaining: Exchange[] = []

      // 每轮循环都重新获取绑定列表（因为删除交换机会影响绑定）
      const currentBindings = await this.getBindings(vhost)

      for (const exchange of currentExchanges) {
        // 跳过无法删除的系统交换机
        const isSystemExchange = exchange.name === '' || exchange.name.startsWith('amq.')
        if (isSystemExchange) {
          // 系统交换机不能删除，跳过（不加入 remaining，相当于忽略）
          continue
        }

        // 检查这个交换机是否有任何绑定
        const bindings = currentBindings.filter(b => b.source === exchange.name)

        if (bindings.length === 0) {
          // 没有绑定，安全删除
          try {
            await this.deleteExchange(vhost, exchange.name)
            deletedExchanges.push(exchange.name)
            hasChanges = true
          } catch (error) {
            console.warn(`删除交换机 ${exchange.name} 失败:`, error)
            remaining.push(exchange)
          }
        } else {
          // 有绑定，先保留
          remaining.push(exchange)
        }
      }

      currentExchanges = remaining
    }

    // 8. 最后再获取一次绑定列表（用于统计剩余交换机的绑定数）
    const finalBindings = await this.getBindings(vhost)

    // 9. 对于剩余的交换机，分析原因
    const remainingExchangeDetails: Array<{
      name: string
      reason: 'has_bindings' | 'orphaned_exchange'
      bindingCount: number
      isManaged: boolean
      createdBy?: string
    }> = []

    for (const exchange of currentExchanges) {
      const bindings = finalBindings.filter(b => b.source === exchange.name)
      const isManaged = !!exchange.arguments?.['x-manage-system-id']
      const createdBy = exchange.arguments?.['x-manage-system-id']

      if (isManaged && createdBy && createdBy !== systemId) {
        // 检查创建者系统是否还存在
        const creatorExists = existingSystems.has(createdBy)

        if (!creatorExists) {
          // 孤儿交换机：创建者系统已被删除
          remainingExchangeDetails.push({
            name: exchange.name,
            reason: 'orphaned_exchange',
            bindingCount: bindings.length,
            isManaged: true,
            createdBy,
          })
        } else {
          // 被其他活跃系统使用的交换机
          remainingExchangeDetails.push({
            name: exchange.name,
            reason: 'has_bindings',
            bindingCount: bindings.length,
            isManaged: true,
            createdBy,
          })
        }
      } else {
        // 当前系统创建的交换机，但有其他绑定
        remainingExchangeDetails.push({
          name: exchange.name,
          reason: 'has_bindings',
          bindingCount: bindings.length,
          isManaged,
          createdBy,
        })
      }
    }

    return {
      deletedQueues,
      deletedExchanges,
      remainingExchanges: remainingExchangeDetails,
    }
  }

  /**
   * 强制删除交换机（不管绑定）
   */
  async forceDeleteExchanges(vhost: string, exchangeNames: string[]): Promise<void> {
    for (const name of exchangeNames) {
      try {
        await this.deleteExchange(vhost, name)
      } catch (error) {
        console.warn(`强制删除交换机 ${name} 失败:`, error)
        // 继续删除其他交换机
      }
    }
  }

  /**
   * 获取队列详细统计信息
   */
  async getQueueDetails(vhost: string, queueName: string): Promise<Queue> {
    const encodedVhost = encodeURIComponent(vhost)
    const encodedName = encodeURIComponent(queueName)
    return this.request<Queue>(`/queues/${encodedVhost}/${encodedName}`)
  }

  /**
   * 获取系统所有队列的统计快照
   */
  async getSystemSnapshot(vhost: string, systemId: string): Promise<{
    timestamp: number
    queues: Queue[]
  }> {
    const { queues } = await this.getSystemResources(vhost, systemId)

    // 获取每个队列的详细统计
    const queueDetails = await Promise.all(
      queues.map(q => this.getQueueDetails(vhost, q.name))
    )

    return {
      timestamp: Date.now(),
      queues: queueDetails,
    }
  }
}

// 导出单例实例
export const rabbitMQClient = new RabbitMQClient()
