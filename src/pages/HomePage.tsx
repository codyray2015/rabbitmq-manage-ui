/**
 * 首页 - Tab 切换容器
 * 在创建系统和管理系统之间切换
 */

import { useState } from 'react'
import { Navbar } from '@/components/Navbar'
import TemplatePage from './TemplatePage'
import ManagePage from './ManagePage'

type TabType = 'create' | 'manage'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>('create')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navbar />

      {/* Tab 导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              创建系统
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-4 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'manage'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              系统管理
            </button>
          </div>
        </div>
      </div>

      {/* Tab 内容 */}
      <div>
        {activeTab === 'create' && <TemplatePage />}
        {activeTab === 'manage' && <ManagePage />}
      </div>
    </div>
  )
}
