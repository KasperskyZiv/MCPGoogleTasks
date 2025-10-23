/**
 * Utility functions for the MCP Google Tasks server
 */

/**
 * Format text for terminal display, reversing RTL text (Hebrew, Arabic, etc.)
 * This is a workaround for terminals that don't handle bidirectional text well.
 *
 * Note: This should ONLY be used for console output. The actual data stored
 * and sent via MCP should remain unchanged.
 *
 * @param text - The text to format
 * @returns Reversed text for better terminal display
 */
export function formatForTerminal(text: string | null | undefined): string {
  if (!text) return '';

  // Check if text contains RTL characters (Hebrew, Arabic, etc.)
  const hasRTL = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

  if (hasRTL) {
    // Reverse the string for terminal display
    return text.split('').reverse().join('');
  }

  return text;
}

/**
 * Format JSON output for terminal display, handling RTL text in specific fields
 *
 * @param data - The data object to format
 * @param rtlFields - Array of field names that may contain RTL text (e.g., ['title', 'notes'])
 * @returns Formatted object with RTL fields reversed for terminal display
 */
export function formatJsonForTerminal(data: any, rtlFields: string[] = ['title', 'notes']): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => formatJsonForTerminal(item, rtlFields));
  }

  if (typeof data === 'object') {
    const formatted: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (rtlFields.includes(key) && typeof value === 'string') {
        formatted[key] = formatForTerminal(value);
      } else if (typeof value === 'object') {
        formatted[key] = formatJsonForTerminal(value, rtlFields);
      } else {
        formatted[key] = value;
      }
    }
    return formatted;
  }

  return data;
}
