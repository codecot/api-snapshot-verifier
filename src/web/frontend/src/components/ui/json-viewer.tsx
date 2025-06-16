import React, { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Copy, Check, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/utils/cn'

interface JsonViewerProps {
  data: any
  className?: string
  defaultExpanded?: boolean
  maxHeight?: string
  searchTerm?: string
  theme?: 'light' | 'dark' | 'auto'
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  className,
  defaultExpanded = false,
  maxHeight = '600px',
  searchTerm = '',
  theme = 'auto',
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree')
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  const expandAll = () => {
    const paths = new Set<string>()
    const traverse = (obj: any, path: string) => {
      if (typeof obj === 'object' && obj !== null) {
        paths.add(path)
        Object.keys(obj).forEach(key => {
          traverse(obj[key], `${path}.${key}`)
        })
      }
    }
    traverse(data, 'root')
    setExpandedPaths(paths)
  }

  const collapseAll = () => {
    setExpandedPaths(new Set())
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark> : part
    )
  }

  const renderValue = (value: any, path: string): React.ReactNode => {
    if (value === null) return <span className="text-gray-500">null</span>
    if (value === undefined) return <span className="text-gray-500">undefined</span>
    if (typeof value === 'boolean') return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
    if (typeof value === 'number') return <span className="text-green-600 dark:text-green-400">{value}</span>
    if (typeof value === 'string') {
      return <span className="text-red-600 dark:text-red-400">"{highlightSearchTerm(value)}"</span>
    }
    
    if (Array.isArray(value)) {
      const isExpanded = expandedPaths.has(path)
      return (
        <span>
          <button
            onClick={() => toggleExpand(path)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3 inline" /> : <ChevronRight className="h-3 w-3 inline" />}
          </button>
          <span className="text-gray-500 ml-1">Array[{value.length}]</span>
          {isExpanded && (
            <div className="ml-4 mt-1">
              {value.map((item, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-gray-500 mr-2">{index}:</span>
                  {renderValue(item, `${path}[${index}]`)}
                </div>
              ))}
            </div>
          )}
        </span>
      )
    }
    
    if (typeof value === 'object') {
      const isExpanded = expandedPaths.has(path)
      const keys = Object.keys(value)
      return (
        <span>
          <button
            onClick={() => toggleExpand(path)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3 inline" /> : <ChevronRight className="h-3 w-3 inline" />}
          </button>
          <span className="text-gray-500 ml-1">{`{${keys.length} ${keys.length === 1 ? 'key' : 'keys'}}`}</span>
          {isExpanded && (
            <div className="ml-4 mt-1">
              {keys.map(key => (
                <div key={key} className="flex items-start">
                  <span className="text-purple-600 dark:text-purple-400 mr-2">{highlightSearchTerm(key)}:</span>
                  {renderValue(value[key], `${path}.${key}`)}
                </div>
              ))}
            </div>
          )}
        </span>
      )
    }
    
    return <span className="text-gray-700 dark:text-gray-300">{String(value)}</span>
  }

  const syntaxHighlight = (json: string) => {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = 'text-gray-700 dark:text-gray-300'
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'text-purple-600 dark:text-purple-400'
            } else {
              cls = 'text-red-600 dark:text-red-400'
            }
          } else if (/true|false/.test(match)) {
            cls = 'text-blue-600 dark:text-blue-400'
          } else if (/null/.test(match)) {
            cls = 'text-gray-500'
          } else {
            cls = 'text-green-600 dark:text-green-400'
          }
          
          if (searchTerm && match.includes(searchTerm)) {
            return `<span class="${cls}"><mark class="bg-yellow-200 dark:bg-yellow-800">${match}</mark></span>`
          }
          return `<span class="${cls}">${match}</span>`
        }
      )
  }

  const formattedJson = useMemo(() => {
    return JSON.stringify(data, null, 2)
  }, [data])

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-card',
        isFullscreen && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'tree' ? 'default' : 'ghost'}
            onClick={() => setViewMode('tree')}
          >
            Tree
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'raw' ? 'default' : 'ghost'}
            onClick={() => setViewMode('raw')}
          >
            Raw
          </Button>
          {viewMode === 'tree' && (
            <>
              <Button size="sm" variant="ghost" onClick={expandAll}>
                Expand All
              </Button>
              <Button size="sm" variant="ghost" onClick={collapseAll}>
                Collapse All
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'overflow-auto p-4 font-mono text-sm',
          !isFullscreen && maxHeight && `max-h-[${maxHeight}]`
        )}
        style={{ maxHeight: !isFullscreen ? maxHeight : 'calc(100vh - 8rem)' }}
      >
        {viewMode === 'tree' ? (
          <div>{renderValue(data, 'root')}</div>
        ) : (
          <pre
            className="whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(formattedJson) }}
          />
        )}
      </div>
    </div>
  )
}

// Compact JSON viewer for inline use
export const CompactJsonViewer: React.FC<{ data: any; maxLines?: number }> = ({ 
  data, 
  maxLines = 3 
}) => {
  const [expanded, setExpanded] = useState(false)
  const jsonString = JSON.stringify(data, null, 2)
  const lines = jsonString.split('\n')
  const shouldTruncate = lines.length > maxLines

  return (
    <div className="relative">
      <pre className="text-xs bg-muted rounded p-2 overflow-hidden">
        {expanded || !shouldTruncate
          ? jsonString
          : lines.slice(0, maxLines).join('\n') + '\n...'}
      </pre>
      {shouldTruncate && (
        <Button
          size="sm"
          variant="ghost"
          className="absolute bottom-1 right-1 h-6 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </div>
  )
}