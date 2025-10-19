/**
 * Queue Template Parser and Validator
 * 解析和验证 YAML 格式的队列系统模板
 */

import yaml from 'js-yaml'

// 参数验证规则
export interface ParameterValidation {
  min?: number
  max?: number
  pattern?: string
  enum?: any[]
}

// 资源过滤条件
export interface ResourceFilter {
  type?: string  // 交换机类型 (direct/topic/fanout/headers)
  durable?: boolean  // 是否持久化
  auto_delete?: boolean  // 是否自动删除
  arguments?: Record<string, any>  // 自定义参数匹配
}

// 动态数据源配置
export interface DynamicDataSource {
  type: 'vhosts' | 'exchanges' | 'queues'
  dependsOn?: string  // 依赖的参数名，例如交换机列表依赖 vhost 参数
  filter?: ResourceFilter  // 资源过滤条件（只显示符合条件的资源）
}

// 参数定义
export interface TemplateParameter {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select' | 'combobox'  // 新增 combobox 类型
  required: boolean
  default?: any
  description?: string
  validation?: ParameterValidation
  dataSource?: DynamicDataSource  // 动态数据源（用于从 API 加载选项）
}

// 模板元信息
export interface TemplateMetadata {
  name: string
  version: string
  description: string
  author?: string
  tags?: string[]
  icon?: string  // 图标名称（用于提高辨识度）
}

// 资源验证配置（用于复用时验证）
export interface ResourceValidation {
  type?: string
  durable?: boolean
  auto_delete?: boolean
  internal?: boolean
  arguments?: Record<string, any>
}

// 交换机配置
export interface ExchangeConfig {
  name: string
  type: 'direct' | 'topic' | 'fanout' | 'headers'
  durable: boolean
  auto_delete: boolean
  internal?: boolean
  arguments?: Record<string, any>
  reuseIfExists?: boolean  // 如果资源已存在，是否复用（默认 false）
  validateIfExists?: ResourceValidation  // 复用时需要验证的属性
}

// 队列配置
export interface QueueConfig {
  name: string
  vhost: string
  durable: boolean
  auto_delete: boolean
  arguments?: Record<string, any>
  reuseIfExists?: boolean  // 如果资源已存在，是否复用（默认 false）
  validateIfExists?: ResourceValidation  // 复用时需要验证的属性
}

// 绑定关系配置
export interface BindingConfig {
  source: string
  destination: string
  destination_type?: 'queue' | 'exchange'
  routing_key: string
  arguments?: Record<string, any>
}

// 完整的模板定义
export interface QueueTemplate {
  template: TemplateMetadata
  parameters: TemplateParameter[]
  exchanges?: ExchangeConfig[]
  queues: QueueConfig[]
  bindings?: BindingConfig[]
}

// 渲染后的系统配置
export interface RenderedSystemConfig {
  exchanges: ExchangeConfig[]
  queues: QueueConfig[]
  bindings: BindingConfig[]
}

// 参数值
export type ParameterValues = Record<string, any>

// 验证错误
export interface ValidationError {
  field: string
  message: string
}

/**
 * 解析 YAML 模板
 */
export function parseTemplate(yamlContent: string): QueueTemplate {
  try {
    const template = yaml.load(yamlContent) as QueueTemplate

    // 基本结构验证
    if (!template.template?.name) {
      throw new Error('模板缺少必填字段: template.name')
    }
    if (!template.template?.version) {
      throw new Error('模板缺少必填字段: template.version')
    }
    if (!template.template?.description) {
      throw new Error('模板缺少必填字段: template.description')
    }
    if (!template.parameters || !Array.isArray(template.parameters)) {
      throw new Error('模板缺少 parameters 数组')
    }
    if (!template.queues || !Array.isArray(template.queues)) {
      throw new Error('模板缺少 queues 数组')
    }

    // 验证参数定义
    for (const param of template.parameters) {
      if (!param.name) {
        throw new Error('参数缺少 name 字段')
      }
      if (!param.label) {
        throw new Error(`参数 ${param.name} 缺少 label 字段`)
      }
      if (!param.type) {
        throw new Error(`参数 ${param.name} 缺少 type 字段`)
      }
      if (param.required === undefined) {
        throw new Error(`参数 ${param.name} 缺少 required 字段`)
      }
    }

    return template
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`解析模板失败: ${error.message}`)
    }
    throw new Error('解析模板失败: 未知错误')
  }
}

/**
 * 验证参数值
 */
export function validateParameters(
  template: QueueTemplate,
  values: ParameterValues
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const param of template.parameters) {
    const value = values[param.name]

    // 检查必填项
    if (param.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: param.name,
        message: `${param.label} 是必填项`,
      })
      continue
    }

    // 如果值为空且非必填，跳过后续验证
    if (value === undefined || value === null || value === '') {
      continue
    }

    // 类型验证
    if (param.type === 'number') {
      const numValue = Number(value)
      if (isNaN(numValue)) {
        errors.push({
          field: param.name,
          message: `${param.label} 必须是数字`,
        })
        continue
      }

      // 数值范围验证
      if (param.validation?.min !== undefined && numValue < param.validation.min) {
        errors.push({
          field: param.name,
          message: `${param.label} 不能小于 ${param.validation.min}`,
        })
      }
      if (param.validation?.max !== undefined && numValue > param.validation.max) {
        errors.push({
          field: param.name,
          message: `${param.label} 不能大于 ${param.validation.max}`,
        })
      }
    }

    if (param.type === 'string') {
      const strValue = String(value)

      // 正则验证
      if (param.validation?.pattern) {
        const regex = new RegExp(param.validation.pattern)
        if (!regex.test(strValue)) {
          errors.push({
            field: param.name,
            message: `${param.label} 格式不正确`,
          })
        }
      }
    }

    if (param.type === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push({
          field: param.name,
          message: `${param.label} 必须是布尔值`,
        })
      }
    }

    // 枚举值验证
    if (param.validation?.enum) {
      if (!param.validation.enum.includes(value)) {
        errors.push({
          field: param.name,
          message: `${param.label} 必须是以下值之一: ${param.validation.enum.join(', ')}`,
        })
      }
    }
  }

  return errors
}

/**
 * 填充模板参数，生成最终的系统配置
 */
export function renderTemplate(
  template: QueueTemplate,
  values: ParameterValues
): RenderedSystemConfig {
  // 合并默认值
  const finalValues: ParameterValues = {}
  for (const param of template.parameters) {
    if (values[param.name] !== undefined) {
      finalValues[param.name] = values[param.name]
    } else if (param.default !== undefined) {
      finalValues[param.name] = param.default
    }
  }

  // 替换字符串中的参数引用 ${param_name}
  function replaceParams(obj: any): any {
    if (typeof obj === 'string') {
      // 检查是否整个字符串就是一个参数引用（如 "${param_name}"）
      const singleParamMatch = /^\$\{(\w+)\}$/.exec(obj)
      if (singleParamMatch) {
        const paramName = singleParamMatch[1]
        const value = finalValues[paramName]
        // 返回原始值，保持类型（数字、布尔值等）
        return value !== undefined ? value : ''
      }

      // 替换字符串中的多个参数引用
      return obj.replace(/\$\{(\w+)\}/g, (_, paramName) => {
        const value = finalValues[paramName]
        return value !== undefined ? String(value) : ''
      })
    }

    if (typeof obj === 'number') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(replaceParams)
    }

    if (obj !== null && typeof obj === 'object') {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceParams(value)
      }
      return result
    }

    return obj
  }

  // 深拷贝并替换参数
  const config = JSON.parse(JSON.stringify({
    exchanges: template.exchanges || [],
    queues: template.queues || [],
    bindings: template.bindings || [],
  }))

  const rendered = replaceParams(config)

  return rendered
}

/**
 * 获取参数的默认值映射
 */
export function getDefaultValues(template: QueueTemplate): ParameterValues {
  const defaults: ParameterValues = {}
  for (const param of template.parameters) {
    if (param.default !== undefined) {
      defaults[param.name] = param.default
    }
  }
  return defaults
}

/**
 * 验证并渲染模板（组合方法）
 */
export function validateAndRender(
  template: QueueTemplate,
  values: ParameterValues
): { config?: RenderedSystemConfig; errors: ValidationError[] } {
  const errors = validateParameters(template, values)

  if (errors.length > 0) {
    return { errors }
  }

  const config = renderTemplate(template, values)
  return { config, errors: [] }
}
