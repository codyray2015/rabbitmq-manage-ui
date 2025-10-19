import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { parseSystemId } from '@/types/system'
import { Navbar } from '@/components/Navbar'
import { OverviewTab } from '@/components/system-detail/OverviewTab'
import { CodeGeneratorTab } from '@/components/system-detail/CodeGeneratorTab'
import { ResourcesTab } from '@/components/system-detail/ResourcesTab'
import { CredentialsTab } from '@/components/system-detail/CredentialsTab'

type TabType = 'overview' | 'code' | 'credentials' | 'resources'

export default function SystemDetailPage() {
  const { vhost, systemId } = useParams<{ vhost: string; systemId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  if (!vhost || !systemId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">无效的系统参数</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const decodedVhost = decodeURIComponent(vhost)
  const decodedSystemId = decodeURIComponent(systemId)
  const parsed = parseSystemId(decodedSystemId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navbar />

      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-600 hover:text-gray-900 mb-2"
              >
                ← 返回系统管理
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {parsed?.queuePrefix || '系统详情'}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>模板: {parsed?.template || 'unknown'}</span>
                <span>·</span>
                <span>VHost: {decodedVhost}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 概览
            </button>
            <button
              onClick={() => setActiveTab('credentials')}
              className={`py-3 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'credentials'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              🔑 凭证
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`py-3 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'code'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              💻 代码生成
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`py-3 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'resources'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 资源管理
            </button>
          </div>
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewTab vhost={decodedVhost} systemId={decodedSystemId} />
        )}
        {activeTab === 'credentials' && (
          <CredentialsTab vhost={decodedVhost} systemId={decodedSystemId} />
        )}
        {activeTab === 'code' && (
          <CodeGeneratorTab
            vhost={decodedVhost}
            systemId={decodedSystemId}
            template={parsed?.template || ''}
          />
        )}
        {activeTab === 'resources' && (
          <ResourcesTab vhost={decodedVhost} systemId={decodedSystemId} />
        )}
      </div>
    </div>
  )
}
