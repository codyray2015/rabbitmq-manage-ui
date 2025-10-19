import { useState, useRef, useEffect } from 'react'

export interface ComboboxOption {
  value: string
  label: string
}

export interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = '请选择或输入...',
  disabled = false,
  loading = false,
  className = '',
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 同步外部 value 变化
  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  // 过滤选项（支持搜索 value 和 label 的任意位置）
  const filteredOptions = options.filter((option) => {
    const search = searchTerm.toLowerCase()
    return (
      option.value.toLowerCase().includes(search) ||
      option.label.toLowerCase().includes(search)
    )
  })

  // 点击外部关闭下拉框（已由 onBlur 处理，这里移除）

  // 高亮匹配文本
  const highlightMatch = (text: string, search: string) => {
    if (!search) return text

    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200">{part}</mark>
      ) : (
        part
      )
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    // 不立即调用 onChange，避免频繁重新渲染
    setIsOpen(true)
  }

  const handleOptionClick = (option: ComboboxOption) => {
    setSearchTerm(option.value)
    onChange(option.value)
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleInputFocus = () => {
    if (!disabled && !loading) {
      setIsOpen(true)
    }
  }

  const handleInputBlur = () => {
    // 延迟执行，让 click 事件先触发
    setTimeout(() => {
      if (searchTerm !== value) {
        onChange(searchTerm)
      }
      setIsOpen(false)
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'Enter') {
      // 回车时立即同步值并关闭下拉框
      if (searchTerm !== value) {
        onChange(searchTerm)
      }
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        placeholder={loading ? '加载中...' : placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((option) => (
            <div
              key={option.value}
              onMouseDown={(e) => {
                e.preventDefault() // 防止触发 blur
                handleOptionClick(option)
              }}
              className={`px-3 py-2 cursor-pointer hover:bg-orange-50 ${
                option.value === value ? 'bg-orange-100' : ''
              }`}
            >
              <div className="font-medium text-gray-900">
                {highlightMatch(option.value, searchTerm)}
              </div>
              {option.label !== option.value && (
                <div className="text-sm text-gray-500">
                  {highlightMatch(option.label, searchTerm)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && searchTerm && filteredOptions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="text-sm text-gray-500">
            未找到匹配项，将创建新的: <span className="font-medium text-gray-900">{searchTerm}</span>
          </div>
        </div>
      )}
    </div>
  )
}
