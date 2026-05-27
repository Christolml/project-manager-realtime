import { useRef, useState, useCallback } from 'react'

export function useDrag(taskId: string) {
  const [isDragging, setIsDragging] = useState(false)
  const taskIdRef = useRef(taskId)
  taskIdRef.current = taskId

  const dragRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    el.addEventListener('dragstart', (e: DragEvent) => {
      e.dataTransfer?.setData('text/plain', taskIdRef.current)
      e.dataTransfer!.effectAllowed = 'move'
      setIsDragging(true)
    })
    el.addEventListener('dragend', () => {
      setIsDragging(false)
    })
  }, [])

  return { dragRef, isDragging }
}

export function useDrop<T extends HTMLElement>(statusId: string, onDrop: (taskId: string) => void) {
  const [isOver, setIsOver] = useState(false)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

  const dropRef = useCallback((el: T | null) => {
    if (!el) return
    el.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'move'
    })
    el.addEventListener('dragenter', (e: DragEvent) => {
      e.preventDefault()
      setIsOver(true)
    })
    el.addEventListener('dragleave', () => {
      setIsOver(false)
    })
    el.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault()
      setIsOver(false)
      const taskId = e.dataTransfer?.getData('text/plain')
      if (taskId) {
        onDropRef.current(taskId)
      }
    })
  }, [])

  return { dropRef, isOver }
}
