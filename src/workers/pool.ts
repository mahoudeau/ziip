import CompressWorker from './compress.worker?worker';
import type { CodecId, EncodeJob, EncodeResult } from '../codecs/types';

interface PendingJob {
  job: EncodeJob;
  resolve: (result: { buffer: ArrayBuffer; msElapsed: number }) => void;
  reject: (err: Error) => void;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
}

const POOL_SIZE = Math.max(1, (navigator.hardwareConcurrency ?? 2) - 1);

class CompressPool {
  private workers: WorkerSlot[] = [];
  private queue: PendingJob[] = [];
  private inflight = new Map<number, PendingJob>();
  private nextId = 1;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      const worker = new CompressWorker();
      worker.onmessage = (e: MessageEvent<EncodeResult>) => this.handleResult(worker, e.data);
      this.workers.push({ worker, busy: false });
    }
  }

  enqueue(
    codec: CodecId,
    options: Record<string, unknown>,
    imageData: ImageData,
  ): Promise<{ buffer: ArrayBuffer; msElapsed: number }> {
    return new Promise((resolve, reject) => {
      const job: EncodeJob = { id: this.nextId++, codec, options, imageData };
      this.queue.push({ job, resolve, reject });
      this.dispatch();
    });
  }

  private dispatch() {
    while (this.queue.length > 0) {
      const slot = this.workers.find((s) => !s.busy);
      if (!slot) return;
      const pending = this.queue.shift()!;
      slot.busy = true;
      this.inflight.set(pending.job.id, pending);
      // Structured-clone the ImageData (default postMessage behavior). We
      // intentionally do NOT transfer the buffer — the original ImageData
      // stays usable on the main thread for re-encodes at different settings.
      slot.worker.postMessage(pending.job);
    }
  }

  private handleResult(worker: Worker, result: EncodeResult) {
    const slot = this.workers.find((s) => s.worker === worker);
    if (slot) slot.busy = false;
    const pending = this.inflight.get(result.id);
    if (!pending) return;
    this.inflight.delete(result.id);
    if (result.ok) {
      pending.resolve({ buffer: result.buffer, msElapsed: result.msElapsed });
    } else {
      pending.reject(new Error(result.error));
    }
    this.dispatch();
  }
}

let poolInstance: CompressPool | null = null;

export function getCompressPool(): CompressPool {
  if (!poolInstance) poolInstance = new CompressPool();
  return poolInstance;
}
