/**
 * Utility functions for the MCP Google Tasks server
 */

/**
 * Format text for terminal display by reversing right-to-left (RTL) text when present.
 *
 * This is intended only for console output; stored or transmitted data must remain unchanged.
 *
 * @param text - The text to format
 * @returns The original `text`, reversed if it contains RTL characters (Hebrew, Arabic, etc.), or an empty string for `null`, `undefined`, or other falsy input
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
 * Recursively prepare data for terminal display by reversing RTL text in specified fields.
 *
 * Applies RTL formatting to string values whose keys match `rtlFields`, recursing into objects and arrays.
 *
 * @param data - The value to format; primitives are returned unchanged, arrays/objects are traversed.
 * @param rtlFields - Field names whose string values should be RTL-formatted (default: `['title', 'notes']`).
 * @returns A new value structurally equivalent to `data` with specified string fields RTL-formatted for terminal output.
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