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

    it('should handle numbers', () => {
      const text = '12345';
      expect(formatForTerminal(text)).toBe('12345');
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
