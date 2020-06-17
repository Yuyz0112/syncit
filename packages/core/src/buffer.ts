export const DEFAULT_BUFFER_MS = 1000;

export type Chunk<T> = {
  id: number;
  t: number;
  data: T;
};

export type BaseBufferOptions = {
  bufferMs?: number;
};

export class BaseBuffer<T> {
  public cursor = 0;
  public buffer: Record<string, Chunk<T>> = {};
  public bufferMs = DEFAULT_BUFFER_MS;

  constructor(options?: BaseBufferOptions) {
    if (options?.bufferMs) {
      this.bufferMs = options.bufferMs;
    }
  }

  public add(data: T): number {
    this.cursor++;
    this.buffer[this.cursor] = {
      id: this.cursor,
      t: Date.now(),
      data,
    };
    return this.cursor;
  }

  public delete(id: number): void {
    delete this.buffer[id];
  }

  public reset(): void {
    this.buffer = {};
    this.cursor = 0;
  }
}

export type SourceBufferOptions<T> = BaseBufferOptions & {
  onTimeout(chunk: Chunk<T>): void;
};

export class SourceBuffer<T> extends BaseBuffer<T> {
  private onTimeout: SourceBufferOptions<T>['onTimeout'];

  constructor(options: SourceBufferOptions<T>) {
    super(options);

    const { onTimeout } = options;
    this.onTimeout = onTimeout;
    this.checkTimeToRetry();
  }

  private get timeToRetry() {
    return this.bufferMs / 4;
  }

  private checkTimeToRetry(): void {
    window.requestAnimationFrame(() => {
      for (const key in this.buffer) {
        const record = this.buffer[key];
        const now = Date.now();
        if (now - record.t > this.timeToRetry) {
          this.onTimeout(record);
          // reset timestamp
          record.t = now;
        }
      }
      this.checkTimeToRetry();
    });
  }
}

export type MirrorBufferOptions<T> = BaseBufferOptions & {
  onChunk(chunk: Chunk<T>): void;
};

export class MirrorBuffer<T> extends BaseBuffer<T> {
  private onChunk: MirrorBufferOptions<T>['onChunk'];

  constructor(options: MirrorBufferOptions<T>) {
    super(options);

    const { onChunk } = options;
    this.onChunk = onChunk;
  }

  public addWithCheck(chunk: Chunk<T>): number | null {
    if (!chunk.id) {
      throw new Error('MirrorBuffer only accept chunk with id');
    }
    if (chunk.id <= this.cursor) {
      /**
       * Since the source buffer will retry when the buffer was not acked,
       * the mirror buffer may receive some expired buffer in the
       * certain time order.
       * So if a buffer was already received, we can ignore the buffer
       * happens earlier than it.
       */
      return null;
    }
    this.buffer[chunk.id] = chunk;
    this.tryToEmit();
    return chunk.id;
  }

  private tryToEmit(): void {
    const records = Object.values(this.buffer).sort((a, b) => a.id - b.id);
    let idx = 0;
    while (idx < records.length && this.cursor === records[idx].id - 1) {
      const record = records[idx];
      this.onChunk(record);
      idx++;
      this.cursor++;
      this.delete(record.id);
    }
  }
}
