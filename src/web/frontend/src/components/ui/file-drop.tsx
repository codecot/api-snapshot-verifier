import { useRef, useState, DragEvent } from 'react'

interface FileDropProps {
  onDrop: (files: File[]) => void
  accept?: Record<string, string[]>
  maxFiles?: number
  disabled?: boolean
  children: (props: {
    getRootProps: () => any
    getInputProps: () => any
    isDragActive: boolean
  }) => React.ReactNode
}

export function useFileDrop({
  onDrop,
  accept,
  maxFiles = 1,
  disabled = false
}: Omit<FileDropProps, 'children'>) {
  const [isDragActive, setIsDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isValidFile = (file: File): boolean => {
    if (!accept) return true
    
    for (const [mimeType, extensions] of Object.entries(accept)) {
      // Check MIME type
      if (file.type === mimeType) return true
      
      // Check extensions
      const fileName = file.name.toLowerCase()
      for (const ext of extensions) {
        if (fileName.endsWith(ext)) return true
      }
    }
    
    return false
  }

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true)
    }
  }

  const handleDragOut = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return
    
    const files = Array.from(fileList)
    const validFiles = files.filter(isValidFile).slice(0, maxFiles)
    
    if (validFiles.length > 0) {
      onDrop(validFiles)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    
    processFiles(e.dataTransfer?.files || null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)
  }

  const getRootProps = () => ({
    onDrag: handleDrag,
    onDragEnter: handleDragIn,
    onDragLeave: handleDragOut,
    onDragOver: handleDrag,
    onDrop: handleDrop,
    onClick: () => !disabled && inputRef.current?.click()
  })

  const getInputProps = () => ({
    ref: inputRef,
    type: 'file',
    style: { display: 'none' },
    onChange: handleChange,
    disabled,
    accept: accept ? Object.entries(accept).flatMap(([mime, exts]) => 
      [mime, ...exts]
    ).join(',') : undefined,
    multiple: maxFiles > 1
  })

  return {
    getRootProps,
    getInputProps,
    isDragActive
  }
}

// Wrapper component for compatibility
export function FileDrop({ children, ...props }: FileDropProps) {
  const dropzone = useFileDrop(props)
  return <>{children(dropzone)}</>
}