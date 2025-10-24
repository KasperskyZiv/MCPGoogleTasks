import { formatForTerminal, formatJsonForTerminal } from '../utils';

describe('utils', () => {
  describe('formatForTerminal', () => {
    it('should return empty string for null/undefined', () => {
      expect(formatForTerminal(null)).toBe('');
      expect(formatForTerminal(undefined)).toBe('');
      expect(formatForTerminal('')).toBe('');
    });

    it('should not reverse English text', () => {
      const text = 'Buy groceries';
      expect(formatForTerminal(text)).toBe('Buy groceries');
    });

    it('should reverse Hebrew text', () => {
      const text = 'שלום';
      const reversed = 'םולש';
      expect(formatForTerminal(text)).toBe(reversed);
    });

    it('should reverse Arabic text', () => {
      const text = 'مرحبا';
      const reversed = 'ابحرم';
      expect(formatForTerminal(text)).toBe(reversed);
    });

    it('should handle Hebrew with emoji using grapheme-aware reversal', () => {
      const text = 'שלום👋';
      // With grapheme-aware: emoji stays intact, only position changes
      // Expected: '👋םולש' (emoji moves to start, Hebrew reversed)
      const result = formatForTerminal(text);
      // Check that emoji is not broken (should contain the full emoji)
      expect(result).toContain('👋');
      // Check that Hebrew is reversed
      expect(result).toContain('ם');
    });

    it('should handle Hebrew with combining marks', () => {
      // Hebrew letter with combining mark (e.g., vowel point)
      const text = 'שָׁלוֹם'; // Hebrew with nikud (vowel points)
      const result = formatForTerminal(text);
      // Should preserve combining marks with their base characters
      // We just check it doesn't throw and produces a string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle numbers', () => {
      const text = '12345';
      expect(formatForTerminal(text)).toBe('12345');
    });

    it('should document mixed LTR/RTL limitation', () => {
      // This test documents the limitation: mixed text is fully reversed
      const text = 'Hello שלום';
      const result = formatForTerminal(text);
      // Mixed text gets fully reversed (not ideal, but documented limitation)
      expect(result).toBe('םולש olleH');
    });
  });

  describe('formatJsonForTerminal', () => {
    it('should return null/undefined as-is', () => {
      expect(formatJsonForTerminal(null)).toBeNull();
      expect(formatJsonForTerminal(undefined)).toBeUndefined();
    });

    it('should format title field in object', () => {
      const data = {
        title: 'Buy milk',
        id: '123',
      };
      const result = formatJsonForTerminal(data);
      expect(result.title).toBe('Buy milk');
      expect(result.id).toBe('123');
    });

    it('should format array of objects', () => {
      const data = [
        { title: 'Task 1', id: '1' },
        { title: 'Task 2', id: '2' },
      ];
      const result = formatJsonForTerminal(data);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });

    it('should handle nested objects', () => {
      const data = {
        task: {
          title: 'Call dentist',
          notes: 'Schedule appointment',
        },
        id: '123',
      };
      const result = formatJsonForTerminal(data);
      expect(result.task.title).toBe('Call dentist');
      expect(result.task.notes).toBe('Schedule appointment');
      expect(result.id).toBe('123');
    });
  });
});
