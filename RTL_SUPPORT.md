# RTL (Right-to-Left) Text Support

This document explains how the MCP Google Tasks server handles RTL languages like Hebrew and Arabic for terminal display.

## Problem

Many terminals don't properly render RTL text. Hebrew text like "שלום" (shalom) appears reversed as "םולש" when displayed in terminals.

## Solution

The `formatForTerminal()` function in `src/utils.ts` automatically reverses RTL text to display correctly in terminals that don't support bidirectional text rendering.

### Grapheme-Aware Reversal

The implementation uses **grapheme-aware reversal** to properly handle:

- ✅ **Emojis** (multi-byte characters like 👋, 🎉)
- ✅ **Combining marks** (Hebrew nikud/vowel points like שָׁ)
- ✅ **ZWJ sequences** (zero-width joiners used in complex emojis)
- ✅ **Multi-codepoint characters** (characters composed of multiple Unicode codepoints)

### Implementation

Uses native `Intl.Segmenter` API (available in Node.js 16+):

```typescript
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
const graphemes = Array.from(segmenter.segment(text), segment => segment.segment);
return graphemes.reverse().join('');
```

**Why this matters:**

```typescript
// ❌ Naive reversal (breaks emojis)
'שלום👋'.split('').reverse().join('')  // Result: '��םולש' (broken emoji)

// ✅ Grapheme-aware reversal (preserves emojis)
formatForTerminal('שלום👋')  // Result: '👋םולש' (intact emoji)
```

## Limitations

### Mixed LTR/RTL Text

The function **does not handle mixed bidirectional text** properly. Text containing both LTR (English) and RTL (Hebrew/Arabic) will be fully reversed:

```typescript
formatForTerminal('Hello שלום')  // Result: 'םולש olleH'
// Both English and Hebrew are reversed (not ideal)
```

**Why this is hard to solve:**
- Proper bidi rendering requires Unicode Bidirectional Algorithm (UAX #9)
- Complex rules for directional runs, embedding levels, and reordering
- Would require a full bidi implementation or external library

**Recommended solution:**
- Use terminals with native bidi support (modern macOS Terminal.app, iTerm2)
- Or keep task titles in a single language (either all Hebrew or all English)

## Usage

### Automatic Formatting

The server automatically formats RTL text in task titles and notes:

```typescript
// When fetching tasks from Google Tasks API
const tasks = await client.listTasks(taskListId);
const formatted = formatJsonForTerminal(tasks);
console.log(formatted); // RTL text is reversed for display
```

### Manual Formatting

You can also format text manually:

```typescript
import { formatForTerminal } from './utils';

const hebrewText = 'קנה חלב';
console.log(formatForTerminal(hebrewText));  // Displays correctly in terminal
```

## Technical Details

### RTL Character Detection

The function detects RTL text using Unicode ranges:

```typescript
const hasRTL = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
```

**Ranges covered:**
- `\u0590-\u05FF` - Hebrew
- `\u0600-\u06FF` - Arabic
- `\u0750-\u077F` - Arabic Supplement
- `\uFB50-\uFDFF` - Arabic Presentation Forms-A
- `\uFE70-\uFEFF` - Arabic Presentation Forms-B

### Fallback for Older Node.js

For Node.js versions < 16 (where `Intl.Segmenter` is not available), the function falls back to naive reversal:

```typescript
if (typeof Intl !== 'undefined' && Intl.Segmenter) {
  // Modern grapheme-aware reversal
  // ...
} else {
  // Fallback: naive reversal (may break emojis)
  return text.split('').reverse().join('');
}
```

## Testing

Run tests to verify RTL handling:

```bash
npm test -- src/__tests__/utils.test.ts
```

Tests cover:
- ✅ Hebrew text reversal
- ✅ Arabic text reversal
- ✅ Emoji preservation
- ✅ Combining marks handling
- ✅ Mixed text limitation documentation

## Examples

### Hebrew with Emojis

```typescript
formatForTerminal('שלום 👋')  // '👋 םולש'
```

### Hebrew with Vowel Points (Nikud)

```typescript
formatForTerminal('שָׁלוֹם')  // Vowel points preserved with base letters
```

### Arabic

```typescript
formatForTerminal('مرحبا')  // 'ابحرم'
```

### English (No Change)

```typescript
formatForTerminal('Hello World')  // 'Hello World' (unchanged)
```

## When to Use

**Use `formatForTerminal()` for:**
- Console/terminal output
- Logging and debugging
- CLI tools and scripts

**Don't use `formatForTerminal()` for:**
- Storing data in database
- API responses
- Any data that will be rendered in a UI with proper bidi support

## Alternative Solutions

If you need proper bidirectional text rendering:

1. **Use a modern terminal** - iTerm2, Windows Terminal, or terminals with bidi support
2. **Use a UI library** - React, Vue, etc. have native bidi support
3. **Use a bidi library** - For complex mixed LTR/RTL text:
   - [bidiweb](https://github.com/ykla/bidiweb)
   - [bidi-js](https://github.com/TrySound/bidi-js)

## Node.js Version Support

- **Node.js 16+**: Full grapheme-aware reversal with `Intl.Segmenter`
- **Node.js < 16**: Fallback to naive reversal (emojis may break)

Current project requires Node.js 22+, so full support is guaranteed.

## References

- [Unicode Bidirectional Algorithm (UAX #9)](https://unicode.org/reports/tr9/)
- [Intl.Segmenter API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
- [Unicode Grapheme Clusters](https://unicode.org/reports/tr29/#Grapheme_Cluster_Boundaries)
- [Hebrew Unicode Range](https://unicode.org/charts/PDF/U0590.pdf)
- [Arabic Unicode Range](https://unicode.org/charts/PDF/U0600.pdf)
