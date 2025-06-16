/**
 * HTTP Method constants and configurations
 */

export enum HTTP_METHOD {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

export const HTTP_METHODS = Object.values(HTTP_METHOD);

export const METHOD_COLORS: Record<HTTP_METHOD, { bg: string; text: string }> = {
  [HTTP_METHOD.GET]: { bg: 'bg-green-100 dark:bg-transparent dark:border dark:border-green-400', text: 'text-green-800 dark:text-green-400' },
  [HTTP_METHOD.POST]: { bg: 'bg-blue-100 dark:bg-transparent dark:border dark:border-blue-400', text: 'text-blue-800 dark:text-blue-400' },
  [HTTP_METHOD.PUT]: { bg: 'bg-yellow-100 dark:bg-transparent dark:border dark:border-yellow-400', text: 'text-yellow-800 dark:text-yellow-400' },
  [HTTP_METHOD.DELETE]: { bg: 'bg-red-100 dark:bg-transparent dark:border dark:border-red-400', text: 'text-red-800 dark:text-red-400' },
  [HTTP_METHOD.PATCH]: { bg: 'bg-purple-100 dark:bg-transparent dark:border dark:border-purple-400', text: 'text-purple-800 dark:text-purple-400' },
  [HTTP_METHOD.HEAD]: { bg: 'bg-gray-100 dark:bg-transparent dark:border dark:border-gray-400', text: 'text-gray-800 dark:text-gray-400' },
  [HTTP_METHOD.OPTIONS]: { bg: 'bg-orange-100 dark:bg-transparent dark:border dark:border-orange-400', text: 'text-orange-800 dark:text-orange-400' },
} as const;

export const BODY_SUPPORTING_METHODS: readonly HTTP_METHOD[] = [
  HTTP_METHOD.POST,
  HTTP_METHOD.PUT,
  HTTP_METHOD.PATCH,
  HTTP_METHOD.OPTIONS
] as const;

export function getMethodColor(method: string): { bg: string; text: string } {
  const normalizedMethod = method.toUpperCase() as HTTP_METHOD;
  return METHOD_COLORS[normalizedMethod] || { bg: 'bg-gray-100 dark:bg-transparent dark:border dark:border-gray-400', text: 'text-gray-800 dark:text-gray-400' };
}

export function supportsBody(method: string): boolean {
  return BODY_SUPPORTING_METHODS.includes(method.toUpperCase() as HTTP_METHOD);
}