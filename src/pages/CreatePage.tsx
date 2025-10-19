import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { templateManager } from '@/lib/templates'
import { validateAndRender, getDefaultValues } from '@/lib/template'
import type { ParameterValues, ValidationError, TemplateParameter } from '@/lib/template'
import { rabbitMQClient } from '@/lib/api'
import { Combobox } from '@/components/ui/combobox'
import { Navbar } from '@/components/Navbar'

export default function CreatePage() {
  const { templateName } = useParams<{ templateName: string }>()
  const navigate = useNavigate()
  const template = templateManager.getTemplate(templateName || '')

  const [values, setValues] = useState<ParameterValues>(() =>
    template ? getDefaultValues(template) : {}
  )
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  // 动态选项数据
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<{ value: string; label: string }>>>({})
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({})

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">模板未找到</h2>
          <p className="text-gray-600 mb-4">请返回选择其他模板</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            返回模板列表
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setCreateError(null)

    // 验证并渲染
    const { config, errors: validationErrors } = validateAndRender(template, values)

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    if (!config) {
      setCreateError('渲染模板配置失败')
      return
    }

    // 创建系统
    setIsCreating(true)
    try {
      // 获取 vhost 参数
      const vhost = values.vhost
      if (!vhost) {
        setCreateError('缺少 vhost 参数')
        setIsCreating(false)
        return
      }

      await rabbitMQClient.createSystem(
        {
          vhost,
          exchanges: config.exchanges,
          queues: config.queues,
          bindings: config.bindings,
        },
        template.template.name,
        template.template.version,
        values
      )

      setCreateSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    // 清除该字段的错误
    setErrors((prev) => prev.filter((e) => e.field !== name))
  }

  const getFieldError = (fieldName: string) => {
    return errors.find((e) => e.field === fieldName)?.message
  }

  // 加载动态选项
  const loadDynamicOptions = async (param: TemplateParameter) => {
    if (!param.dataSource) return

    const { type, dependsOn, filter } = param.dataSource

    // 如果依赖其他参数，检查依赖值是否存在
    if (dependsOn && !values[dependsOn]) {
      return
    }

    setLoadingOptions((prev) => ({ ...prev, [param.name]: true }))

    try {
      let options: Array<{ value: string; label: string }> = []

      if (type === 'vhosts') {
        const vhosts = await rabbitMQClient.getVhosts()
        options = vhosts.map((vhost) => ({
          value: vhost.name,
          label: vhost.name + (vhost.description ? ` (${vhost.description})` : ''),
        }))
      } else if (type === 'exchanges') {
        const vhost = dependsOn ? values[dependsOn] : ''
        if (!vhost) {
          setDynamicOptions((prev) => ({ ...prev, [param.name]: [] }))
          setLoadingOptions((prev) => ({ ...prev, [param.name]: false }))
          return
        }
        let exchanges = await rabbitMQClient.getExchanges(vhost)

        // 过滤掉默认交换机
        exchanges = exchanges.filter((ex) => ex.name !== '')

        // 应用过滤条件
        if (filter) {
          exchanges = exchanges.filter((ex) => {
            if (filter.type && ex.type !== filter.type) return false
            if (filter.durable !== undefined && ex.durable !== filter.durable) return false
            if (filter.auto_delete !== undefined && ex.auto_delete !== filter.auto_delete) return false
            if (filter.arguments) {
              for (const [key, value] of Object.entries(filter.arguments)) {
                if (ex.arguments?.[key] !== value) return false
              }
            }
            return true
          })
        }

        options = exchanges.map((ex) => ({
          value: ex.name,
          label: `${ex.name} (${ex.type})`,
        }))
      } else if (type === 'queues') {
        const vhost = dependsOn ? values[dependsOn] : ''
        if (!vhost) {
          setDynamicOptions((prev) => ({ ...prev, [param.name]: [] }))
          setLoadingOptions((prev) => ({ ...prev, [param.name]: false }))
          return
        }
        let queues = await rabbitMQClient.getQueues(vhost)

        // 应用过滤条件
        if (filter) {
          queues = queues.filter((queue) => {
            if (filter.durable !== undefined && queue.durable !== filter.durable) return false
            if (filter.auto_delete !== undefined && queue.auto_delete !== filter.auto_delete) return false
            if (filter.arguments) {
              for (const [key, value] of Object.entries(filter.arguments)) {
                if (queue.arguments?.[key] !== value) return false
              }
            }
            return true
          })
        }

        options = queues.map((queue) => ({
          value: queue.name,
          label: queue.name,
        }))
      }

      setDynamicOptions((prev) => ({ ...prev, [param.name]: options }))
    } catch (error) {
      console.error(`加载动态选项失败 (${param.name}):`, error)
      setDynamicOptions((prev) => ({ ...prev, [param.name]: [] }))
    } finally {
      setLoadingOptions((prev) => ({ ...prev, [param.name]: false }))
    }
  }

  // 加载所有动态选项（只在初始化时）
  useEffect(() => {
    if (!template) return

    let cancelled = false
    const currentTemplate = template

    async function loadInitialOptions() {
      for (const param of currentTemplate.parameters) {
        if (param.dataSource && !param.dataSource.dependsOn) {
          // 只加载不依赖其他参数的选项
          if (!cancelled) {
            await loadDynamicOptions(param)
          }
        }
      }
    }

    loadInitialOptions()

    return () => {
      cancelled = true
    }
  }, [template])

  // 当依赖参数变化时，重新加载动态选项
  useEffect(() => {
    if (!template) return

    let cancelled = false
    const currentTemplate = template

    async function loadDependentOptions() {
      for (const param of currentTemplate.parameters) {
        if (param.dataSource?.dependsOn) {
          const dependsOnValue = values[param.dataSource.dependsOn]
          if (dependsOnValue && !cancelled) {
            await loadDynamicOptions(param)
          }
        }
      }
    }

    loadDependentOptions()

    return () => {
      cancelled = true
    }
    // 只追踪 vhost 参数的变化（因为大部分依赖都是 vhost）
  }, [values.vhost, template])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <span>←</span>
          <span>返回模板列表</span>
        </button>

        {/* 模板信息 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{template.template.icon || '📦'}</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {template.template.name}
              </h1>
              <p className="text-gray-600 mb-3">
                {template.template.description}
              </p>
              {template.template.tags && template.template.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {template.template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 成功提示 */}
        {createSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-xl">✓</span>
              <p className="text-green-700 font-semibold">创建成功！</p>
            </div>
            <p className="text-green-600 text-sm mt-1">正在返回模板列表...</p>
          </div>
        )}

        {/* 错误提示 */}
        {createError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-semibold">创建失败</p>
            <p className="text-red-600 text-sm mt-1">{createError}</p>
          </div>
        )}

        {/* 参数表单 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">配置参数</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {template.parameters.map((param) => (
              <div key={param.name}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {param.label}
                  {param.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {param.type === 'string' && (
                  <input
                    type="text"
                    value={values[param.name] || ''}
                    onChange={(e) => handleChange(param.name, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      getFieldError(param.name)
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                    placeholder={param.default || ''}
                  />
                )}

                {param.type === 'number' && (
                  <input
                    type="number"
                    value={values[param.name] ?? param.default ?? ''}
                    onChange={(e) =>
                      handleChange(param.name, Number(e.target.value))
                    }
                    min={param.validation?.min}
                    max={param.validation?.max}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                      getFieldError(param.name)
                        ? 'border-red-500'
                        : 'border-gray-300'
                    }`}
                  />
                )}

                {param.type === 'boolean' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={values[param.name] ?? param.default ?? false}
                      onChange={(e) =>
                        handleChange(param.name, e.target.checked)
                      }
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      {param.description || '启用'}
                    </span>
                  </div>
                )}

                {param.type === 'select' && (
                  <div>
                    <select
                      value={values[param.name] ?? param.default ?? ''}
                      onChange={(e) => handleChange(param.name, e.target.value)}
                      disabled={loadingOptions[param.name]}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        getFieldError(param.name)
                          ? 'border-red-500'
                          : 'border-gray-300'
                      } ${loadingOptions[param.name] ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">
                        {loadingOptions[param.name] ? '加载中...' : '请选择...'}
                      </option>

                      {/* 动态选项 */}
                      {param.dataSource &&
                        dynamicOptions[param.name]?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}

                      {/* 静态选项 */}
                      {!param.dataSource &&
                        param.validation?.enum?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                    </select>
                    {loadingOptions[param.name] && (
                      <p className="mt-1 text-sm text-gray-500">正在加载选项...</p>
                    )}
                  </div>
                )}

                {param.type === 'combobox' && (
                  <div>
                    <Combobox
                      value={values[param.name] ?? param.default ?? ''}
                      onChange={(value) => handleChange(param.name, value)}
                      options={param.dataSource ? (dynamicOptions[param.name] || []) : []}
                      disabled={loadingOptions[param.name]}
                      loading={loadingOptions[param.name]}
                      placeholder={param.default || '请选择或输入...'}
                      className={getFieldError(param.name) ? 'border-red-500' : ''}
                    />
                    {loadingOptions[param.name] && (
                      <p className="mt-1 text-sm text-gray-500">正在加载选项...</p>
                    )}
                  </div>
                )}

                {param.description && param.type !== 'boolean' && param.type !== 'select' && param.type !== 'combobox' && (
                  <p className="mt-1 text-sm text-gray-500">
                    {param.description}
                  </p>
                )}

                {param.description && (param.type === 'select' || param.type === 'combobox') && !loadingOptions[param.name] && (
                  <p className="mt-1 text-sm text-gray-500">
                    {param.description}
                  </p>
                )}

                {getFieldError(param.name) && (
                  <p className="mt-1 text-sm text-red-600">
                    {getFieldError(param.name)}
                  </p>
                )}
              </div>
            ))}

            {/* 提交按钮 */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isCreating}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isCreating || createSuccess}
                className="flex-1 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? '创建中...' : '创建队列系统'}
              </button>
            </div>
          </form>
        </div>

        {/* 预览信息 */}
        <div className="mt-6 bg-gray-100 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            将创建的资源：
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded p-3">
              <div className="text-gray-500 mb-1">交换机</div>
              <div className="text-2xl font-bold text-gray-900">
                {template.exchanges?.length || 0}
              </div>
            </div>
            <div className="bg-white rounded p-3">
              <div className="text-gray-500 mb-1">队列</div>
              <div className="text-2xl font-bold text-gray-900">
                {template.queues?.length || 0}
              </div>
            </div>
            <div className="bg-white rounded p-3">
              <div className="text-gray-500 mb-1">绑定关系</div>
              <div className="text-2xl font-bold text-gray-900">
                {template.bindings?.length || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
