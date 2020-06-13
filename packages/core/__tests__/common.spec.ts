import { formatBytes } from '../src/common';

describe('formatBytes', () => {
  it('should handle the case of zero byte', () => {
    expect(formatBytes(0)).toEqual({
      value: 0,
      unit: 'B/s',
    });
  });

  it('should format bytes to correct units', () => {
    expect(formatBytes(10)).toEqual({
      value: 10,
      unit: 'B/s',
    });
    expect(formatBytes(10 * 1024)).toEqual({
      value: 10,
      unit: 'KiB/s',
    });
    expect(formatBytes(10 * Math.pow(1024, 2))).toEqual({
      value: 10,
      unit: 'MiB/s',
    });
  });
});
