/**
 * Utility functions for the MCP Google Tasks server
 */

/**
 * Format text for terminal display by reversing right-to-left (RTL) text when present.
 *
 * This is intended only for console output; stored or transmitted data must remain unchanged.
 *
 * Uses grapheme-aware reversal to preserve emojis, combining marks, and multi-codepoint sequences.
 *
 * **Limitations:**
 * - Only handles pure RTL text (Hebrew, Arabic, etc.)
 * - Mixed LTR/RTL text (e.g., "Hello שלום") is not supported and will be fully reversed
 * - For proper bidirectional text rendering, use a terminal or UI with native bidi support
 *
 * @param text - The text to format
 * @returns The original `text`, reversed if it contains RTL characters (Hebrew, Arabic, etc.), or an empty string for `null`, `undefined`, or other falsy input
 */
export function formatForTerminal(text: string | null | undefined): string {
  if (!text) return '';

  // Check if text contains RTL characters (Hebrew, Arabic, etc.)
  const hasRTL = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

  if (hasRTL) {
    // Use grapheme-aware reversal to preserve emojis and combining marks
    // Intl.Segmenter is available in Node.js 16+ and modern browsers
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      const graphemes = Array.from(segmenter.segment(text), segment => segment.segment);
      return graphemes.reverse().join('');
    }

    // Fallback for older Node.js versions (naive reversal)
    // This will break emojis and combining marks but is better than nothing
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