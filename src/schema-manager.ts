import { ApiSchema, ValidationResult, ValidationError, ApiEndpoint } from './types.js';

export class SchemaManager {
  private schemaCache = new Map<string, any>();

  async loadSchema(schema: ApiSchema): Promise<any> {
    const cacheKey = `${schema.type}:${schema.source}`;
    
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey);
    }

    let parsedSchema: any;

    try {
      switch (schema.type) {
        case 'openapi':
          parsedSchema = await this.loadOpenApiSchema(schema.source);
          break;
        case 'json-schema':
          parsedSchema = await this.loadJsonSchema(schema.source);
          break;
        default:
          throw new Error(`Unsupported schema type: ${schema.type}`);
      }

      this.schemaCache.set(cacheKey, parsedSchema);
      return parsedSchema;
    } catch (error) {
      throw new Error(`Failed to load schema from ${schema.source}: ${error.message}`);
    }
  }

  async validateRequest(requestBody: any, schema: ApiSchema): Promise<ValidationResult> {
    if (!schema.requestValidation) {
      return { isValid: true, errors: [], warnings: [] };
    }

    try {
      const parsedSchema = await this.loadSchema(schema);
      return this.performValidation(requestBody, parsedSchema, 'request', schema);
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          path: 'root',
          message: `Schema validation failed: ${error.message}`,
          severity: 'error' as const
        }],
        warnings: []
      };
    }
  }

  async validateResponse(responseData: any, statusCode: number, schema: ApiSchema): Promise<ValidationResult> {
    if (!schema.responseValidation) {
      return { isValid: true, errors: [], warnings: [] };
    }

    try {
      const parsedSchema = await this.loadSchema(schema);
      return this.performValidation(responseData, parsedSchema, 'response', schema, statusCode);
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          path: 'root',
          message: `Schema validation failed: ${error.message}`,
          severity: 'error' as const
        }],
        warnings: []
      };
    }
  }

  async generateEndpointsFromOpenApi(openApiPath: string, baseUrl?: string): Promise<ApiEndpoint[]> {
    const schema = await this.loadOpenApiSchema(openApiPath);
    const endpoints: ApiEndpoint[] = [];

    const servers = schema.servers || [{ url: baseUrl || 'http://localhost' }];
    const baseServerUrl = servers[0].url;

    for (const [path, pathItem] of Object.entries(schema.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          const endpoint: ApiEndpoint = {
            name: operation.operationId || `${method.toUpperCase()}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            url: `${baseServerUrl}${path}`,
            method: method.toUpperCase() as any,
            schema: {
              type: 'openapi',
              source: openApiPath,
              operationId: operation.operationId,
              requestValidation: true,
              responseValidation: true
            }
          };

          endpoints.push(endpoint);
        }
      }
    }

    return endpoints;
  }

  private async loadOpenApiSchema(source: string): Promise<any> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const content = await fs.readFile(source, 'utf-8');
    
    if (path.extname(source).toLowerCase() === '.yaml' || path.extname(source).toLowerCase() === '.yml') {
      const yaml = await import('yaml');
      return yaml.parse(content);
    } else {
      return JSON.parse(content);
    }
  }

  private async loadJsonSchema(source: string): Promise<any> {
    const fs = await import('fs/promises');
    const content = await fs.readFile(source, 'utf-8');
    return JSON.parse(content);
  }

  private performValidation(
    data: any,
    schema: any,
    type: 'request' | 'response',
    apiSchema: ApiSchema,
    statusCode?: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (apiSchema.type === 'openapi') {
      const validationResult = this.validateAgainstOpenApi(data, schema, type, apiSchema.operationId, statusCode);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);
    } else if (apiSchema.type === 'json-schema') {
      const validationResult = this.validateAgainstJsonSchema(data, schema);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateAgainstOpenApi(
    data: any,
    openApiSchema: any,
    type: 'request' | 'response',
    operationId?: string,
    statusCode?: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      if (!operationId) {
        warnings.push({
          path: 'root',
          message: 'No operationId specified, skipping OpenAPI validation',
          severity: 'warning'
        });
        return { isValid: true, errors, warnings };
      }

      const operation = this.findOperationById(openApiSchema, operationId);
      if (!operation) {
        errors.push({
          path: 'root',
          message: `Operation ${operationId} not found in OpenAPI schema`,
          severity: 'error'
        });
        return { isValid: false, errors, warnings };
      }

      if (type === 'response' && statusCode) {
        const responseSchema = operation.responses?.[statusCode.toString()] || operation.responses?.default;
        if (responseSchema?.content?.['application/json']?.schema) {
          const schemaValidation = this.validateAgainstJsonSchema(data, responseSchema.content['application/json'].schema);
          errors.push(...schemaValidation.errors);
          warnings.push(...schemaValidation.warnings);
        }
      } else if (type === 'request' && operation.requestBody?.content?.['application/json']?.schema) {
        const schemaValidation = this.validateAgainstJsonSchema(data, operation.requestBody.content['application/json'].schema);
        errors.push(...schemaValidation.errors);
        warnings.push(...schemaValidation.warnings);
      }

    } catch (error) {
      errors.push({
        path: 'root',
        message: `OpenAPI validation error: ${error.message}`,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateAgainstJsonSchema(data: any, schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      const result = this.basicSchemaValidation(data, schema, '');
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    } catch (error) {
      errors.push({
        path: 'root',
        message: `JSON Schema validation error: ${error.message}`,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private basicSchemaValidation(data: any, schema: any, path: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (schema.type !== actualType && !(data === null && schema.nullable)) {
        errors.push({
          path: path || 'root',
          message: `Expected type ${schema.type}, got ${actualType}`,
          expected: schema.type,
          actual: actualType,
          severity: 'error'
        });
      }
    }

    if (schema.required && typeof data === 'object' && data !== null) {
      for (const requiredField of schema.required) {
        if (!(requiredField in data)) {
          errors.push({
            path: `${path}.${requiredField}`,
            message: `Required property '${requiredField}' is missing`,
            expected: 'required property',
            actual: 'undefined',
            severity: 'error'
          });
        }
      }
    }

    if (schema.properties && typeof data === 'object' && data !== null) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in data) {
          const nestedResult = this.basicSchemaValidation(
            data[propName], 
            propSchema, 
            path ? `${path}.${propName}` : propName
          );
          errors.push(...nestedResult.errors);
          warnings.push(...nestedResult.warnings);
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private findOperationById(openApiSchema: any, operationId: string): any {
    for (const pathItem of Object.values(openApiSchema.paths || {})) {
      for (const operation of Object.values(pathItem as any)) {
        if (typeof operation === 'object' && operation.operationId === operationId) {
          return operation;
        }
      }
    }
    return null;
  }
}