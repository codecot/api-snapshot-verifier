/**
 * Common HTTP header constants and configurations
 */

export type HeaderValue = string | string[];

export interface HeaderSuggestions {
  [key: string]: string[];
}

export const COMMON_HEADERS: HeaderSuggestions = {
  Authorization: [
    'Bearer YOUR_TOKEN_HERE',
    'Basic YOUR_CREDENTIALS_HERE',
    'API-Key YOUR_KEY_HERE',
  ],
  'Content-Type': [
    'application/json',
    'application/xml',
    'text/plain',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
  ],
  Accept: [
    'application/json',
    'application/xml',
    'text/html',
    'text/plain',
    '*/*',
  ],
  'Accept-Language': ['en-US', 'en', 'es', 'fr', 'de'],
  'Accept-Encoding': ['gzip, deflate, br', 'gzip, deflate', 'identity'],
  'Cache-Control': [
    'no-cache',
    'no-store',
    'max-age=3600',
    'public',
    'private',
  ],
  'User-Agent': [
    'MyApp/1.0',
    'Mozilla/5.0 (compatible)',
    'Custom-Client/1.0',
  ],
  'X-API-Key': ['YOUR_API_KEY_HERE'],
  'X-Requested-With': ['XMLHttpRequest'],
  Origin: ['https://example.com'],
  Referer: ['https://example.com/page'],
  'If-Modified-Since': ['Wed, 21 Oct 2015 07:28:00 GMT'],
  Custom: [],
};

export const PLACEHOLDER_VALUES = [
  'YOUR_TOKEN_HERE',
  'YOUR_CREDENTIALS_HERE',
  'YOUR_KEY_HERE',
  'YOUR_API_KEY_HERE',
];

export function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_VALUES.some(placeholder => value.includes(placeholder));
}

export const CONTENT_TYPE_SUGGESTIONS: Record<string, string> = {
  json: 'application/json',
  xml: 'application/xml',
  form: 'application/x-www-form-urlencoded',
  multipart: 'multipart/form-data',
  text: 'text/plain',
  html: 'text/html',
  csv: 'text/csv',
};

export function detectContentType(body: string): string | null {
  const trimmed = body.trim();
  
  // Detect JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return CONTENT_TYPE_SUGGESTIONS.json;
  }
  
  // Detect XML
  if (trimmed.startsWith('<')) {
    return CONTENT_TYPE_SUGGESTIONS.xml;
  }
  
  // Detect form data
  if (trimmed.includes('=') && trimmed.includes('&')) {
    return CONTENT_TYPE_SUGGESTIONS.form;
  }
  
  // Detect HTML
  if (trimmed.toLowerCase().includes('<html') || trimmed.toLowerCase().includes('<!doctype html')) {
    return CONTENT_TYPE_SUGGESTIONS.html;
  }
  
  // Detect CSV
  if (trimmed.includes(',') && trimmed.split('\n').length > 1) {
    return CONTENT_TYPE_SUGGESTIONS.csv;
  }
  
  // Default to plain text for any other content
  return trimmed.length > 0 ? CONTENT_TYPE_SUGGESTIONS.text : null;
}