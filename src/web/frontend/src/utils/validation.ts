// URL validation
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// API endpoint validation
export function isValidEndpointName(name: string): boolean {
  // Must be alphanumeric with hyphens/underscores, no spaces
  return /^[a-zA-Z0-9-_]+$/.test(name)
}

export function hasUnresolvedParams(template: string): boolean {
  // Check for {param} patterns
  return /{[^}]+}/.test(template)
}

export function extractParams(template: string): string[] {
  const matches = template.match(/{([^}]+)}/g) || []
  return matches.map(match => match.slice(1, -1))
}

// Form validation
export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function validateRequired(value: any, fieldName: string): string | null {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`
  }
  return null
}

export function validateMinLength(value: string, minLength: number, fieldName: string): string | null {
  if (value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`
  }
  return null
}

export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | null {
  if (value.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`
  }
  return null
}

export function validateEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Invalid email address'
  }
  return null
}

// Number validation
export function isPositiveInteger(value: any): boolean {
  const num = Number(value)
  return Number.isInteger(num) && num > 0
}

export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

// String sanitization
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}