import { useState, useEffect } from 'react'
import { useSpace } from '@/contexts/SpaceContext'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, RefreshCw, Save, Trash2, Home, Copy, Download, Upload, Edit3, X, Check, AlertTriangle, Plus, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/toast'
import { parametersApi } from '@/api/parameters/parameters.api'
import { endpointsApi } from '@/api/endpoints/endpoints.api'

interface ParameterWithMetadata {
  name: string
  value: string
  pattern: string
  usedIn: string[]
  isEditing?: boolean
  editValue?: string
}

export default function Parameters() {
  const { currentSpace } = useSpace()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [parameters, setParameters] = useState<ParameterWithMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newParamName, setNewParamName] = useState('')
  const [newParamValue, setNewParamValue] = useState('')

  // Load parameters on mount or space change
  useEffect(() => {
    loadParameters()
  }, [currentSpace])

  const loadParameters = async () => {
    setIsLoading(true)
    try {
      // Load parameters
      const [params, usage] = await Promise.all([
        parametersApi.getAll(currentSpace),
        parametersApi.getUsage(currentSpace).catch(() => ({} as ParameterUsage))
      ])
      
      console.log('Parameters loaded:', params)
      console.log('Usage data:', usage)
      
      // Convert to array with metadata
      const paramArray: ParameterWithMetadata[] = Object.entries(params).map(([name, value]) => ({
        name,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        pattern: detectPattern(name),
        usedIn: Array.isArray(usage[name]) ? usage[name] : []
      }))
      
      setParameters(paramArray)
    } catch (error) {
      console.error('Failed to load parameters:', error)
      toast.error('Failed to load parameters')
    } finally {
      setIsLoading(false)
    }
  }

  // Simple pattern detection for display
  const detectPattern = (name: string): string => {
    if (/.*[Ii]d$/.test(name)) return 'ID'
    if (/.*([Uu]id|[Uu]uid)$/.test(name)) return 'UUID'
    if (/.*([Tt]m|[Tt]imestamp)$/.test(name)) return 'Timestamp'
    if (/.*[Dd]ate$/.test(name)) return 'Date'
    if (/.*[Tt]ime$/.test(name)) return 'Time'
    if (/.*([Tt]oken|[Kk]ey)$/.test(name)) return 'Token'
    if (/.*[Uu]rl$/.test(name)) return 'URL'
    if (/.*[Ee]mail$/.test(name)) return 'Email'
    return 'String'
  }

  const saveAllParameters = async () => {
    setIsSaving(true)
    try {
      const paramsObject: Record<string, string> = {}
      parameters.forEach(p => {
        paramsObject[p.name] = p.value
      })
      
      // Save all parameters
      await Promise.all(
        parameters.map(param => 
          parametersApi.update(currentSpace, param.name, param.value)
        )
      )
      toast.success('All parameters saved successfully')
      
      // Invalidate spaces query to update statistics
      queryClient.invalidateQueries({ queryKey: ['spaces-management'] })
    } catch (error) {
      console.error('Failed to save parameters:', error)
      toast.error('Failed to save parameters')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (param: ParameterWithMetadata) => {
    setParameters(prev => prev.map(p => 
      p.name === param.name 
        ? { ...p, isEditing: true, editValue: p.value }
        : p
    ))
  }

  const handleCancelEdit = (paramName: string) => {
    setParameters(prev => prev.map(p => 
      p.name === paramName 
        ? { ...p, isEditing: false, editValue: undefined }
        : p
    ))
  }

  const handleSaveEdit = async (paramName: string) => {
    const param = parameters.find(p => p.name === paramName)
    if (!param || !param.editValue) return
    
    try {
      await parametersApi.update(currentSpace, paramName, param.editValue)
      
      // Update local state
      setParameters(prev => prev.map(p => 
        p.name === paramName 
          ? { ...p, value: param.editValue!, isEditing: false, editValue: undefined }
          : p
      ))
      
      toast.success(`Parameter "${paramName}" updated successfully`)
      
      // Invalidate spaces query to update statistics
      queryClient.invalidateQueries({ queryKey: ['spaces-management'] })
    } catch (error) {
      console.error('Failed to update parameter:', error)
      toast.error(`Failed to update parameter "${paramName}"`)
    }
  }

  const handleDelete = async (paramName: string) => {
    if (!confirm(`Delete parameter "${paramName}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      await parametersApi.delete(currentSpace, paramName)
      setParameters(prev => prev.filter(p => p.name !== paramName))
      toast.success(`Parameter "${paramName}" deleted`)
      
      // Invalidate spaces query to update statistics
      queryClient.invalidateQueries({ queryKey: ['spaces-management'] })
    } catch (error) {
      console.error('Failed to delete parameter:', error)
      toast.error(`Failed to delete parameter "${paramName}"`)
    }
  }

  const handleAddParameter = async () => {
    if (!newParamName || !newParamValue) {
      toast.error('Parameter name and value are required')
      return
    }
    
    if (parameters.some(p => p.name === newParamName)) {
      toast.error(`Parameter "${newParamName}" already exists`)
      return
    }
    
    try {
      await parametersApi.create(currentSpace, newParamName, newParamValue)
      
      // Update local state
      const newParam: ParameterWithMetadata = {
        name: newParamName,
        value: newParamValue,
        pattern: detectPattern(newParamName),
        usedIn: []
      }
      
      setParameters(prev => [...prev, newParam])
      setNewParamName('')
      setNewParamValue('')
      setShowAddForm(false)
      
      toast.success(`Parameter "${newParamName}" added successfully`)
      
      // Invalidate spaces query to update statistics
      queryClient.invalidateQueries({ queryKey: ['spaces-management'] })
    } catch (error) {
      console.error('Failed to add parameter:', error)
      toast.error('Failed to add parameter')
    }
  }

  const handleInitializeFromEndpoints = async () => {
    if (!confirm('Initialize parameters from endpoint URLs? This will scan all endpoints and create parameters for any {placeholder} values found.')) {
      return
    }
    
    try {
      // TODO: Implement initialize endpoint in parametersApi
      const response = { newCount: 0, totalCount: 0 }
      const { newCount, totalCount } = response
      
      if (newCount > 0) {
        toast.success(`Initialized ${newCount} new parameters (${totalCount} total)`)
        await loadParameters()
        
        // Invalidate spaces query to update statistics
        queryClient.invalidateQueries({ queryKey: ['spaces-management'] })
      } else {
        toast.success('No new parameters found in endpoints')
      }
    } catch (error) {
      console.error('Failed to initialize parameters:', error)
      toast.error('Failed to initialize parameters from endpoints')
    }
  }

  const handleExport = () => {
    const exportData = {
      space: currentSpace,
      timestamp: new Date().toISOString(),
      parameters: parameters.reduce((acc, p) => {
        acc[p.name] = p.value
        return acc
      }, {} as Record<string, string>)
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentSpace}-parameters-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Parameters exported successfully')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        if (!data.parameters || typeof data.parameters !== 'object') {
          throw new Error('Invalid parameter file format')
        }
        
        // Save all parameters at once
        await apiClient.put(`/parameters/${currentSpace}`, data.parameters)
        
        await loadParameters()
        toast.success(`Imported ${Object.keys(data.parameters).length} parameters`)
        
        // Invalidate spaces query to update statistics
        queryClient.invalidateQueries({ queryKey: ['spaces-management'] })
      } catch (error) {
        console.error('Failed to import parameters:', error)
        toast.error('Failed to import parameters: Invalid file format')
      }
    }
    input.click()
  }

  const filteredParameters = parameters.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.value.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Suggested values for common parameter types
  const getSuggestedValue = (paramName: string): string => {
    const name = paramName.toLowerCase()
    
    // Common test IDs for various APIs
    if (name === 'petid') return '6952' // Valid Petstore pet ID
    if (name === 'orderid') return '1'
    if (name === 'userid') return '1'
    if (name === 'productid') return '1'
    if (name.includes('uuid')) return crypto.randomUUID()
    if (name.includes('timestamp')) return Date.now().toString()
    if (name.includes('date')) return new Date().toISOString().split('T')[0]
    if (name.includes('time')) return new Date().toISOString()
    if (name.includes('token')) return 'test-token-' + Math.random().toString(36).substring(7)
    if (name.includes('key')) return 'test-key-' + Math.random().toString(36).substring(7)
    if (name.includes('email')) return 'test@example.com'
    if (name.includes('phone')) return '+1234567890'
    if (name.includes('url')) return 'https://example.com'
    
    // Default to a test value
    return 'test-' + paramName.toLowerCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight dark:text-muted-foreground">Space Parameters</h1>
          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {currentSpace}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInitializeFromEndpoints}
            className="gap-2"
            title="Scan endpoints for {placeholder} parameters"
          >
            <Wand2 className="h-4 w-4" />
            Auto-detect
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={parameters.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">
                Manage parameter values for the <strong>{currentSpace}</strong> space. 
                These values are automatically substituted when endpoints contain parameter placeholders like {'{petId}'} or {'{authToken}'}.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Parameters are <strong>consistent across all endpoints</strong> in this space, ensuring reliable API testing and meaningful snapshot comparisons.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Add */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search parameters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          onClick={() => setShowAddForm(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Parameter
        </Button>
      </div>

      {/* Add Parameter Form */}
      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Add Parameter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Parameter Name</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={newParamName}
                    onChange={(e) => setNewParamName(e.target.value)}
                    placeholder="e.g., petId, apiKey, userId"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Parameter Value</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={newParamValue}
                    onChange={(e) => setNewParamValue(e.target.value)}
                    placeholder="e.g., 6952, abc123, test-user-id"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {newParamName && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewParamValue(getSuggestedValue(newParamName))}
                      title="Use suggested value"
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {newParamName && (
                  <p className="text-xs text-gray-500 mt-1">
                    Suggested: {getSuggestedValue(newParamName)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddParameter} className="gap-2">
                  <Save className="h-4 w-4" />
                  Add Parameter
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false)
                    setNewParamName('')
                    setNewParamValue('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parameters List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Loading parameters...
          </CardContent>
        </Card>
      ) : filteredParameters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No parameters match your search.' : 'No parameters defined yet.'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Click "Auto-detect" to scan endpoints for parameters, or add them manually.
            </p>
            <Button
              onClick={handleInitializeFromEndpoints}
              className="mt-4 gap-2"
              variant="outline"
            >
              <Wand2 className="h-4 w-4" />
              Auto-detect from Endpoints
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredParameters.map((param) => (
            <Card key={param.name} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-mono text-lg font-semibold">{param.name}</h3>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 px-2 py-1 rounded">
                        {param.pattern}
                      </span>
                    </div>
                    
                    {param.isEditing ? (
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={param.editValue}
                          onChange={(e) => {
                            setParameters(prev => prev.map(p => 
                              p.name === param.name 
                                ? { ...p, editValue: e.target.value }
                                : p
                            ))
                          }}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(param.name)}
                          disabled={!param.editValue || param.editValue === param.value}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelEdit(param.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mb-3">
                        <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-sm">
                          {String(param.value)}
                        </code>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(String(param.value))
                              toast.success('Value copied to clipboard')
                            } catch {
                              toast.error('Failed to copy value')
                            }
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy value"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    
                    {param.usedIn && param.usedIn.length > 0 && (
                      <div className="text-sm text-gray-500">
                        Used in: {param.usedIn.map((endpoint, index) => (
                          <span key={endpoint}>
                            <button
                              onClick={() => navigate(`/endpoints?space=${currentSpace}&highlight=${encodeURIComponent(endpoint)}`)}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                              title={`Go to ${endpoint} endpoint`}
                            >
                              {endpoint}
                            </button>
                            {index < param.usedIn.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(param)}
                      disabled={param.isEditing}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(param.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="space-y-2 text-sm text-yellow-800">
              <p>
                <strong>Important:</strong> Parameter values must match your API's requirements:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>For <code>petId</code> - Use valid IDs like: 6952, 7432, 9691, 3012, 4603 (Petstore API)</li>
                <li>For <code>orderId</code> - Use values 1-10 for the Petstore API</li>
                <li>For <code>authToken</code> - Use a valid authentication token from your auth provider</li>
                <li>For dates/times - Use the format expected by your API (ISO 8601, Unix timestamp, etc.)</li>
                <li>For UUIDs - Ensure they follow the correct UUID format if validation is strict</li>
              </ul>
              <p className="mt-2">
                Changes take effect immediately and will be used in all future snapshot captures.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}