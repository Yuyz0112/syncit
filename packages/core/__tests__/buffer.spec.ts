import { SourceBuffer, BaseBuffer, MirrorBuffer } from '../src/buffer';

describe('BaseBuffer', () => {
  it('can add chunk to buffer', () => {
    const buffer = new BaseBuffer<string>();
    const id = buffer.add('test');
    expect(id).toEqual(1);
    expect(buffer.buffer[id].data).toEqual('test');
  });

  it('can delete chunk from buffer', () => {
    const buffer = new BaseBuffer<string>();
    const id = buffer.add('test');
    buffer.delete(id);
    expect(buffer.cursor).toEqual(id);
    expect(buffer.buffer).not.toHaveProperty(id.toString());
  });
});

describe('SourceBuffer', () => {
  it('will emit when timeout', done => {
    const mockFn = jest.fn();
    const buffer = new SourceBuffer<string>({ onTimeout: mockFn });
    const id_1 = buffer.add('test1');
    const id_2 = buffer.add('test2');
    buffer.delete(id_2);
    setTimeout(() => {
      expect(mockFn.mock.calls.length).toBe(1);
      const { data, id } = mockFn.mock.calls[0][0];
      expect(data).toEqual('test1');
      expect(id).toEqual(id_1);
      done();
    }, 300);
  });
});

describe('MirrorBuffer', () => {
  it('only accept chunk with id', () => {
    const buffer = new MirrorBuffer<string>({ onChunk() {} });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => buffer.addWithCheck('test' as any)).toThrowError(
      'MirrorBuffer only accept chunk with id'
    );
  });

  it('will emit chunk with correct order', () => {
    const mockFn = jest.fn();
    const buffer = new MirrorBuffer<string>({ onChunk: mockFn });
    const record_1 = { id: 1, data: 'test1', t: 1 };
    buffer.addWithCheck(record_1);
    expect(mockFn.mock.calls.length).toBe(1);
    expect(mockFn.mock.calls[0][0]).toEqual(record_1);
    const record_2 = { id: 2, data: 'test2', t: 2 };
    buffer.addWithCheck(record_2);
    expect(mockFn.mock.calls.length).toBe(2);
    expect(mockFn.mock.calls[1][0]).toEqual(record_2);
  });

  it('will keep waiting missing records', () => {
    const mockFn = jest.fn();
    const buffer = new MirrorBuffer<string>({ onChunk: mockFn });
    const record_2 = { id: 2, data: 'test2', t: 2 };
    buffer.addWithCheck(record_2);
    expect(mockFn.mock.calls.length).toBe(0);
    const record_1 = { id: 1, data: 'test1', t: 1 };
    buffer.addWithCheck(record_1);
    expect(mockFn.mock.calls.length).toBe(2);
    expect(mockFn.mock.calls[0][0]).toEqual(record_1);
    expect(mockFn.mock.calls[1][0]).toEqual(record_2);
  });

  it('can be reset', () => {
    const buffer = new BaseBuffer<string>();
    const id = buffer.add('test');
    expect(buffer.cursor).toEqual(1);
    expect(buffer.buffer[id].data).toEqual('test');
    buffer.reset();
    expect(buffer.cursor).toEqual(0);
    expect(buffer.buffer).toEqual({});
  });
});
