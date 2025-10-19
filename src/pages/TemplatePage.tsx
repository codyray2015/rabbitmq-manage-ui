import { useNavigate } from 'react-router-dom'
import { templateManager } from '@/lib/templates'

export default function TemplatePage() {
  const navigate = useNavigate()
  const templates = templateManager.getAllTemplates()

  return (
    <div className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            选择队列模板
          </h1>
          <p className="text-gray-600">
            选择一个模板快速创建 RabbitMQ 队列系统
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无可用模板</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.template.name}
                onClick={() => navigate(`/create/${template.template.name}`)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 overflow-hidden"
              >
                {/* 图标区域 */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 flex items-center justify-center">
                  <div className="text-6xl">
                    {template.template.icon || '📦'}
                  </div>
                </div>

                {/* 内容区域 */}
                <div className="p-6">
                  <div className="mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {template.template.name}
                    </h3>
                    <div className="text-xs text-gray-500">
                      v{template.template.version}
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {template.template.description}
                  </p>

                  {/* 标签 */}
                  {template.template.tags && template.template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
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

                  {/* 统计信息 */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <span>
                        {template.exchanges?.length || 0} 交换机
                      </span>
                      <span>
                        {template.queues?.length || 0} 队列
                      </span>
                      <span>
                        {template.bindings?.length || 0} 绑定
                      </span>
                    </div>
                  </div>

                  {/* 作者 */}
                  {template.template.author && (
                    <div className="mt-3 text-xs text-gray-400">
                      by {template.template.author}
                    </div>
                  )}
                </div>

                {/* 底部操作提示 */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                  <div className="text-sm text-orange-600 font-medium">
                    点击使用此模板 →
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
