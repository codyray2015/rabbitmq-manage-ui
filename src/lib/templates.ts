/**
 * Built-in Template Manager
 * 管理内置的队列模板
 */

import { parseTemplate, type QueueTemplate } from './template'

// 导入内置模板（作为原始文本）
import retrySystemYaml from '../templates/retry-system.yaml?raw'

/**
 * 内置模板的 YAML 内容
 */
const BUILTIN_TEMPLATES: Record<string, string> = {
  'retry-system': retrySystemYaml,
}

/**
 * 模板管理器
 */
export class TemplateManager {
  private templates: Map<string, QueueTemplate> = new Map()

  constructor() {
    this.loadBuiltinTemplates()
  }

  /**
   * 加载内置模板
   */
  private loadBuiltinTemplates(): void {
    for (const [name, yamlContent] of Object.entries(BUILTIN_TEMPLATES)) {
      try {
        const template = parseTemplate(yamlContent)
        this.templates.set(name, template)
      } catch (error) {
        console.error(`加载内置模板 ${name} 失败:`, error)
      }
    }
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): QueueTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * 根据名称获取模板
   */
  getTemplate(name: string): QueueTemplate | undefined {
    return this.templates.get(name)
  }

  /**
   * 根据标签筛选模板
   */
  getTemplatesByTag(tag: string): QueueTemplate[] {
    return this.getAllTemplates().filter(
      (template) => template.template.tags?.includes(tag)
    )
  }

  /**
   * 搜索模板（按名称或描述）
   */
  searchTemplates(query: string): QueueTemplate[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllTemplates().filter(
      (template) =>
        template.template.name.toLowerCase().includes(lowerQuery) ||
        template.template.description.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 添加自定义模板
   */
  addCustomTemplate(yamlContent: string): void {
    const template = parseTemplate(yamlContent)
    this.templates.set(template.template.name, template)
  }

  /**
   * 删除自定义模板（不能删除内置模板）
   */
  removeCustomTemplate(name: string): boolean {
    if (BUILTIN_TEMPLATES[name]) {
      throw new Error('不能删除内置模板')
    }
    return this.templates.delete(name)
  }

  /**
   * 获取所有标签
   */
  getAllTags(): string[] {
    const tags = new Set<string>()
    for (const template of this.getAllTemplates()) {
      if (template.template.tags) {
        for (const tag of template.template.tags) {
          tags.add(tag)
        }
      }
    }
    return Array.from(tags).sort()
  }
}

// 导出单例实例
export const templateManager = new TemplateManager()
