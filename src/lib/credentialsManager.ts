/**
 * 凭证管理模块
 * 负责从 RabbitMQ bindings 中读取系统凭证
 */

import { rabbitMQClient } from './api'

export interface Credential {
  username: string
  password: string
  createdAt: string
  type: 'primary' | 'secondary'
}

export interface SystemCredentials {
  primary: Credential | null
  secondary: Credential | null
}

/**
 * 从 RabbitMQ Management API 获取系统凭证
 * 凭证存储在 .manage.credentials 交换机的 bindings arguments 中
 * 通过 binding 的 destination 来判断凭证归属（destination 是系统的资源）
 */
export async function getSystemCredentials(
  vhost: string,
  systemId: string
): Promise<SystemCredentials> {
  try {
    // 1. 获取系统的所有资源
    const systemResources = await rabbitMQClient.getSystemResources(vhost, systemId)
    const resourceNames = new Set([
      ...systemResources.queues.map(q => q.name),
      ...systemResources.exchanges.map(e => e.name)
    ])

    // 2. 获取该 vhost 的所有 bindings
    const allBindings = await rabbitMQClient.getBindings(vhost)

    const credentials: SystemCredentials = {
      primary: null,
      secondary: null,
    }

    // 3. 过滤出 .manage.credentials 交换机的 bindings
    const credentialBindings = allBindings.filter(
      binding => binding.source === '.manage.credentials'
    )

    // 4. 检查 destination 是否属于当前系统
    for (const binding of credentialBindings) {
      // 检查 destination 是否是系统的资源
      if (!resourceNames.has(binding.destination)) {
        continue
      }

      const args = binding.arguments || {}

      // 提取凭证信息
      const username = args['x-manage-username']
      const password = args['x-manage-password']
      const createdAt = args['x-manage-created-at']
      const credentialType = args['x-manage-credential-type'] as 'primary' | 'secondary'

      if (!username || !password || !credentialType) {
        console.warn('Invalid credential binding:', binding)
        continue
      }

      const credential: Credential = {
        username,
        password,
        createdAt: createdAt || new Date().toISOString(),
        type: credentialType,
      }

      // 根据类型存储到对应位置
      if (credentialType === 'primary') {
        credentials.primary = credential
      } else if (credentialType === 'secondary') {
        credentials.secondary = credential
      }
    }

    return credentials
  } catch (error) {
    console.error('Failed to get system credentials:', error)
    throw error
  }
}

/**
 * 检查凭证是否存在
 */
export function hasCredentials(credentials: SystemCredentials): boolean {
  return credentials.primary !== null || credentials.secondary !== null
}

/**
 * 获取默认凭证（优先使用主凭证）
 */
export function getDefaultCredential(credentials: SystemCredentials): Credential | null {
  return credentials.primary || credentials.secondary
}
