import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle, X, Settings, Download, Eye, Globe, Loader2, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import type { ApiEndpoint } from '@/types'

interface OpenAPIImportProps {
  onImport: (schema: any, options: ImportOptions) => void
  onClose: () => void
  existingEndpoints: ApiEndpoint[]
  currentSpace: string
}

interface ImportOptions {
  baseUrl?: string
  merge: boolean
  overwriteExisting: boolean
}

interface ParsedEndpoint extends ApiEndpoint {
  originalPath: string
  httpMethod: string
  operationId?: string
  summary?: string
  description?: string
}

export default function OpenAPIImport({ onImport, onClose, existingEndpoints, currentSpace }: OpenAPIImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [parsedEndpoints, setParsedEndpoints] = useState<ParsedEndpoint[]>([])
  const [parsedSchema, setParsedSchema] = useState<any>(null)
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    baseUrl: '',
    merge: true,
    overwriteExisting: false
  })
  const [showPreview, setShowPreview] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [importMethod, setImportMethod] = useState<'file' | 'url'>('file')
  const [schemaUrl, setSchemaUrl] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [fileType, setFileType] = useState<'openapi' | 'postman'>('openapi')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setUploadError(null)
    setIsUploading(true)

    try {
      const content = await uploadedFile.text()
      let parsedSchema: any

      // Parse JSON or YAML
      if (uploadedFile.name.endsWith('.yaml') || uploadedFile.name.endsWith('.yml')) {
        // We'll need to add yaml parsing support
        throw new Error('YAML support coming soon - please convert to JSON format')
      } else {
        parsedSchema = JSON.parse(content)
      }

      let endpoints: ParsedEndpoint[] = []

      // Try to detect file type
      if (parsedSchema.info && parsedSchema.info.schema && parsedSchema.info.schema.includes('collection')) {
        // It's a Postman collection
        setFileType('postman')
        
        // Validate Postman collection
        const validation = validatePostmanCollection(parsedSchema)
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid Postman collection')
        }

        endpoints = await parsePostmanCollection(parsedSchema, importOptions.baseUrl)
      } else if (parsedSchema.openapi || parsedSchema.swagger) {
        // It's OpenAPI/Swagger
        setFileType('openapi')
        
        if (!parsedSchema.paths) {
          throw new Error('Invalid OpenAPI file - no paths defined')
        }

        endpoints = parseOpenAPISchema(parsedSchema, importOptions.baseUrl)
      } else {
        throw new Error('Unrecognized file format - expected OpenAPI/Swagger or Postman Collection')
      }

      // Store the parsed schema and generate endpoints preview
      setParsedSchema(parsedSchema)
      setParsedEndpoints(endpoints)
      setShowPreview(true)

      toast.success(`Parsed ${endpoints.length} endpoints from ${uploadedFile.name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse file'
      setUploadError(message)
      toast.error(`Import failed: ${message}`)
    } finally {
      setIsUploading(false)
    }
  }, [importOptions.baseUrl])

  const fetchSchemaFromUrl = async () => {
    if (!schemaUrl.trim()) {
      toast.error('Please enter a URL')
      return
    }

    setIsLoadingUrl(true)
    setUploadError(null)

    try {
      // Validate URL
      new URL(schemaUrl)

      // Use proxy endpoint to avoid CORS issues
      const response = await fetch(`/api/config/fetch-openapi?url=${encodeURIComponent(schemaUrl)}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to fetch: ${response.status}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch schema')
      }

      let parsedSchema = result.data

      // Check if it's YAML (returned as text)
      if (result.isText) {
        if (result.contentType?.includes('yaml') || schemaUrl.endsWith('.yaml') || schemaUrl.endsWith('.yml')) {
          throw new Error('YAML support coming soon - please use a JSON endpoint')
        }
        throw new Error('Invalid response format - expected JSON')
      }

      // Validate OpenAPI structure
      if (!parsedSchema.openapi && !parsedSchema.swagger) {
        throw new Error('Invalid OpenAPI/Swagger schema - missing version field')
      }

      if (!parsedSchema.paths) {
        throw new Error('Invalid OpenAPI schema - no paths defined')
      }

      // Store the parsed schema and generate endpoints preview
      setParsedSchema(parsedSchema)
      const endpoints = parseOpenAPISchema(parsedSchema, importOptions.baseUrl)
      setParsedEndpoints(endpoints)
      setShowPreview(true)

      toast.success(`Parsed ${endpoints.length} endpoints from URL`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch schema'
      setUploadError(message)
      toast.error(`Import failed: ${message}`)
    } finally {
      setIsLoadingUrl(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/yaml': ['.yaml', '.yml'],
      'application/x-yaml': ['.yaml', '.yml']
    },
    maxFiles: 1,
    disabled: isUploading
  })

  const parseOpenAPISchema = (schema: any, baseUrl?: string): ParsedEndpoint[] => {
    const endpoints: ParsedEndpoint[] = []
    const servers = schema.servers || []
    const defaultBaseUrl = baseUrl || (servers.length > 0 ? servers[0].url : 'https://api.example.com')

    for (const [path, pathItem] of Object.entries(schema.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase()) && 
            operation && typeof operation === 'object') {
          
          const operationObj = operation as any
          const endpoint: ParsedEndpoint = {
            name: operationObj.operationId || `${method.toUpperCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            url: `${defaultBaseUrl}${path}`,
            method: method.toUpperCase() as any,
            originalPath: path,
            httpMethod: method.toUpperCase(),
            operationId: operationObj.operationId,
            summary: operationObj.summary,
            description: operationObj.description,
            headers: {}
          }

          // Add Content-Type header for operations with request body
          if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && operationObj.requestBody) {
            const contentTypes = Object.keys(operationObj.requestBody.content || {})
            if (contentTypes.length > 0) {
              endpoint.headers!['Content-Type'] = contentTypes[0]
            }
          }

          // Add Accept header based on response content types
          const responses = operationObj.responses || {}
          const responseContentTypes = new Set<string>()
          Object.values(responses).forEach((response: any) => {
            if (response.content) {
              Object.keys(response.content).forEach(contentType => {
                responseContentTypes.add(contentType)
              })
            }
          })
          if (responseContentTypes.size > 0) {
            endpoint.headers!['Accept'] = Array.from(responseContentTypes).join(', ')
          }

          endpoints.push(endpoint)
        }
      }
    }

    return endpoints.sort((a, b) => a.name.localeCompare(b.name))
  }


  const validatePostmanCollection = (data: any): { isValid: boolean; error?: string } => {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Invalid JSON structure' }
    }

    if (!data.info || !data.info.schema) {
      return { isValid: false, error: 'Missing Postman collection info' }
    }

    if (!data.info.schema.includes('collection')) {
      return { isValid: false, error: 'Not a valid Postman collection' }
    }

    if (!Array.isArray(data.item)) {
      return { isValid: false, error: 'Missing collection items' }
    }

    return { isValid: true }
  }

  const parsePostmanCollection = async (collection: any, baseUrl?: string): Promise<ParsedEndpoint[]> => {
    const endpoints: ParsedEndpoint[] = []
    const globalVariables = new Map<string, string>()

    // Process collection variables
    if (collection.variable) {
      collection.variable.forEach((v: any) => {
        globalVariables.set(v.key, v.value)
      })
    }

    const processItems = (items: any[], folderPath: string = '') => {
      items.forEach(item => {
        if (item.request) {
          // It's a request
          const request = item.request
          const method = request.method?.toUpperCase() || 'GET'
          
          // Parse URL
          let url = ''
          if (typeof request.url === 'string') {
            url = request.url
          } else if (request.url?.raw) {
            url = request.url.raw
          }

          // Replace Postman variables {{variable}} with our format {variable}
          url = url.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
            // If we have a value for this variable, use it
            if (globalVariables.has(varName)) {
              return globalVariables.get(varName)!
            }
            // Otherwise, convert to our parameter format
            return `{${varName}}`
          })
          
          // Use baseUrl if provided and URL is relative
          if (baseUrl && !url.startsWith('http')) {
            url = `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
          }

          // Create endpoint name
          const name = folderPath ? `${folderPath}/${item.name}` : item.name
          const safeName = name.replace(/[^a-zA-Z0-9-_\/]/g, '-').toLowerCase()

          const endpoint: ParsedEndpoint = {
            name: safeName,
            url,
            method,
            originalPath: url,
            httpMethod: method,
            operationId: safeName,
            summary: item.name,
            description: request.description || '',
            headers: {}
          }

          // Convert headers
          if (request.header && Array.isArray(request.header)) {
            request.header.forEach((h: any) => {
              if (!h.disabled && h.key && h.value) {
                endpoint.headers![h.key] = h.value.replace(/\{\{([^}]+)\}\}/g, '{$1}')
              }
            })
          }

          // Handle body
          if (request.body) {
            if (request.body.mode === 'raw' && request.body.raw) {
              endpoint.body = request.body.raw.replace(/\{\{([^}]+)\}\}/g, '{$1}')
              
              // Set Content-Type if not already set
              if (!endpoint.headers!['Content-Type']) {
                const trimmed = endpoint.body.trim()
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                  endpoint.headers!['Content-Type'] = 'application/json'
                } else if (trimmed.startsWith('<')) {
                  endpoint.headers!['Content-Type'] = 'application/xml'
                }
              }
            }
          }

          // Handle auth
          if (request.auth) {
            if (request.auth.type === 'bearer') {
              const token = request.auth.bearer?.find((b: any) => b.key === 'token')?.value || ''
              endpoint.auth = {
                type: 'bearer',
                token: token.replace(/\{\{([^}]+)\}\}/g, '{$1}')
              }
            } else if (request.auth.type === 'basic') {
              endpoint.auth = { type: 'basic' }
            } else if (request.auth.type === 'apikey') {
              endpoint.auth = { type: 'api-key' }
            }
          }

          endpoints.push(endpoint)
        } else if (item.item && Array.isArray(item.item)) {
          // It's a folder
          const newPath = folderPath ? `${folderPath}/${item.name}` : item.name
          processItems(item.item, newPath)
        }
      })
    }

    if (collection.item) {
      processItems(collection.item)
    }

    return endpoints.sort((a, b) => a.name.localeCompare(b.name))
  }

  const handleImport = () => {
    if (parsedEndpoints.length === 0 || !parsedSchema) return

    // For Postman collections, we need to convert to a format the backend can handle
    if (fileType === 'postman') {
      // Create a fake OpenAPI schema with the converted endpoints
      const fakeOpenAPISchema: any = {
        openapi: '3.0.0',
        info: {
          title: parsedSchema.info?.name || 'Imported from Postman',
          version: '1.0.0'
        },
        servers: [{ url: importOptions.baseUrl || 'https://api.example.com' }],
        paths: {}
      }

      // Convert our parsed endpoints back to OpenAPI paths format
      parsedEndpoints.forEach(endpoint => {
        // Extract just the path portion from the URL
        let pathKey = endpoint.originalPath || endpoint.url
        try {
          const urlObj = new URL(pathKey)
          pathKey = urlObj.pathname + urlObj.search // Include query string if present
        } catch {
          // If it's not a valid URL, assume it's already a path
          if (!pathKey.startsWith('/')) {
            pathKey = '/' + pathKey
          }
        }
        
        if (!fakeOpenAPISchema.paths[pathKey]) {
          fakeOpenAPISchema.paths[pathKey] = {}
        }
        
        const operation: any = {
          operationId: endpoint.operationId || endpoint.name,
          summary: endpoint.summary || endpoint.name,
          description: endpoint.description,
          parameters: [],
          responses: {
            '200': { description: 'Success' }
          }
        }

        // Add security if auth is present
        if (endpoint.auth) {
          if (endpoint.auth.type === 'bearer') {
            operation.security = [{ bearerAuth: [] }]
            if (!fakeOpenAPISchema.components) {
              fakeOpenAPISchema.components = { securitySchemes: {} }
            }
            fakeOpenAPISchema.components.securitySchemes.bearerAuth = {
              type: 'http',
              scheme: 'bearer'
            }
          } else if (endpoint.auth.type === 'api-key') {
            operation.security = [{ apiKey: [] }]
            if (!fakeOpenAPISchema.components) {
              fakeOpenAPISchema.components = { securitySchemes: {} }
            }
            fakeOpenAPISchema.components.securitySchemes.apiKey = {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            }
          }
        }

        // Add request body if present
        if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
          operation.requestBody = {
            content: {
              [endpoint.headers?.['Content-Type'] || 'application/json']: {
                schema: { type: 'object' },
                example: endpoint.body
              }
            }
          }
        }

        fakeOpenAPISchema.paths[pathKey][endpoint.method.toLowerCase()] = operation
      })

      onImport(fakeOpenAPISchema, importOptions)
    } else {
      // Pass the original OpenAPI schema to the backend
      onImport(parsedSchema, importOptions)
    }
  }

  const getConflictingEndpoints = () => {
    return parsedEndpoints.filter(ep => 
      existingEndpoints.some(existing => existing.name === ep.name)
    )
  }

  const conflictingEndpoints = getConflictingEndpoints()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Import API Schema</h2>
            <p className="text-sm text-gray-600 mt-1">
              Import from OpenAPI/Swagger or Postman Collection to automatically generate endpoint configurations
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Import Method Selection */}
          {!showPreview && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setImportMethod('file')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  importMethod === 'file'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Upload File
              </button>
              <button
                onClick={() => setImportMethod('url')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  importMethod === 'url'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Globe className="h-4 w-4 inline mr-2" />
                Import from URL
              </button>
            </div>
          )}

          {/* File Upload */}
          {!showPreview && importMethod === 'file' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload API Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragActive
                      ? 'border-blue-400 bg-blue-50'
                      : uploadError
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        <p className="text-gray-600 mt-2">Parsing schema...</p>
                      </div>
                    ) : uploadError ? (
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-12 w-12 text-red-500" />
                        <p className="text-red-600 font-medium">Upload Failed</p>
                        <p className="text-red-500 text-sm">{uploadError}</p>
                        <p className="text-gray-500 text-sm mt-2">Click or drag to try again</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <FileText className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-600 font-medium">
                          {isDragActive ? 'Drop your API schema file here' : 'Drag & drop your API schema file here'}
                        </p>
                        <p className="text-gray-500 text-sm">or click to select a file</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Supports: OpenAPI 3.x, Swagger 2.x, Postman Collection v2.1 (.json)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* URL Import */}
          {!showPreview && importMethod === 'url' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Import from URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      OpenAPI Schema URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={schemaUrl}
                        onChange={(e) => setSchemaUrl(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && fetchSchemaFromUrl()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://api.example.com/openapi.json"
                        disabled={isLoadingUrl}
                      />
                      <Button
                        onClick={fetchSchemaFromUrl}
                        disabled={isLoadingUrl || !schemaUrl.trim()}
                        className="gap-2"
                      >
                        {isLoadingUrl ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Fetch
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the URL of an OpenAPI/Swagger JSON schema
                    </p>
                  </div>

                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-700 font-medium">Import Failed</p>
                          <p className="text-xs text-red-600">{uploadError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-700">
                      <strong>Common OpenAPI URLs:</strong>
                    </p>
                    <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
                      <li>• /openapi.json or /swagger.json</li>
                      <li>• /api-docs or /v3/api-docs</li>
                      <li>• /api/swagger.json or /api/openapi.json</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Options */}
          {!showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Import Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Base URL Override (optional)
                  </label>
                  <input
                    type="url"
                    value={importOptions.baseUrl}
                    onChange={(e) => setImportOptions({ ...importOptions, baseUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://api.example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Override the base URL from the schema. Leave empty to use schema default.
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={importOptions.merge}
                      onChange={(e) => setImportOptions({ ...importOptions, merge: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Merge with existing endpoints</span>
                  </label>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={importOptions.overwriteExisting}
                      onChange={(e) => setImportOptions({ ...importOptions, overwriteExisting: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={!importOptions.merge}
                    />
                    <span className="text-sm">Overwrite conflicting endpoints</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {showPreview && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Import Preview
                    <Badge variant="secondary">{parsedEndpoints.length} endpoints</Badge>
                    {fileType === 'postman' && (
                      <Badge variant="outline" className="ml-2">
                        <Package className="h-3 w-3 mr-1" />
                        Postman
                      </Badge>
                    )}
                    {fileType === 'openapi' && (
                      <Badge variant="outline" className="ml-2">
                        <FileText className="h-3 w-3 mr-1" />
                        OpenAPI
                      </Badge>
                    )}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Change File
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Conflict Warning */}
                {conflictingEndpoints.length > 0 && !importOptions.overwriteExisting && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        {conflictingEndpoints.length} endpoint(s) already exist
                      </span>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">
                      Enable "Overwrite conflicting endpoints" to replace them, or they will be skipped.
                    </p>
                  </div>
                )}

                {/* Endpoints Table */}
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">Endpoint Name</th>
                          <th className="text-left p-3 font-medium">Method</th>
                          <th className="text-left p-3 font-medium">Path</th>
                          <th className="text-left p-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedEndpoints.map((endpoint, index) => {
                          const isConflicting = existingEndpoints.some(e => e.name === endpoint.name)
                          const willBeSkipped = isConflicting && !importOptions.overwriteExisting

                          return (
                            <tr key={index} className={`border-b ${willBeSkipped ? 'bg-gray-50 text-gray-500' : ''}`}>
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">{endpoint.name}</div>
                                  {endpoint.summary && (
                                    <div className="text-xs text-gray-500 mt-1">{endpoint.summary}</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge 
                                  variant={endpoint.method === 'GET' ? 'default' : 
                                          endpoint.method === 'POST' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {endpoint.method}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                  {endpoint.originalPath}
                                </code>
                              </td>
                              <td className="p-3">
                                {willBeSkipped ? (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    Will Skip
                                  </Badge>
                                ) : isConflicting ? (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                    Will Overwrite
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 border-green-300">
                                    Will Import
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {showPreview && (
              <>
                Space: <span className="font-medium">{currentSpace}</span>
                {conflictingEndpoints.length > 0 && (
                  <span className="ml-4 text-yellow-600">
                    {conflictingEndpoints.length} conflicts detected
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {showPreview && (
              <Button 
                onClick={handleImport}
                disabled={parsedEndpoints.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Import {parsedEndpoints.length} Endpoint(s)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}