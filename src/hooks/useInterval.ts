import { useEffect, useRef } from 'react'

/**
 * 通用定时器 Hook
 * @param callback 定时执行的回调函数
 * @param delay 延迟时间（毫秒），null 表示暂停
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  // 记住最新的回调函数
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // 设置定时器
  useEffect(() => {
    if (delay === null) {
      return
    }

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
