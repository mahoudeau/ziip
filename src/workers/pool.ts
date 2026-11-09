import CompressWorker from './compress.worker?worker';
import type { CodecId, EncodeJob, EncodeResult } from '../codecs/types';

export type JobPriority = 'high' | 'normal';

interface PendingJob {
  job: EncodeJob;
  resolve: (result: { buffer: ArrayBuffer; msElapsed: number }) => void;
  reject: (err: Error) => void;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
  jobId: number | null;
}

const POOL_SIZE = Math.max(1, (navigator.hardwareConcurrency ?? 2) - 1);

class CompressPool {
  private workers: WorkerSlot[] = [];
  private highQueue: PendingJob[] = [];
  private normalQueue: PendingJob[] = [];
  private inflight = new Map<number, PendingJob>();
  private nextId = 1;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) this.workers.push(this.spawn());
  }

  private spawn(): WorkerSlot {
    const worker = new CompressWorker();
    const slot: WorkerSlot = { worker, busy: false, jobId: null };
    worker.onmessage = (e: MessageEvent<EncodeResult>) => this.handleResult(worker, e.data);
    worker.onerror = (e) => {
      e.preventDefault();
      this.replaceSlot(slot, new Error(e.message || 'The encoder stopped unexpectedly.'));
    };
    worker.onmessageerror = () => {
      this.replaceSlot(slot, new Error('The encoder returned data that could not be read.'));
    };
    return slot;
  }

  /** Swap a dead worker for a fresh one and fail the job it was running, so the
   * image shows an error instead of waiting forever. */
  private replaceSlot(slot: WorkerSlot, reason: Error) {
    const index = this.workers.indexOf(slot);
    if (index === -1) return;
    slot.worker.terminate();
    this.workers[index] = this.spawn();
    if (slot.jobId !== null) {
      const pending = this.inflight.get(slot.jobId);
      this.inflight.delete(slot.jobId);
      pending?.reject(reason);
    }
    this.dispatch();
  }

  enqueue(
    codec: CodecId,
    options: Record<string, unknown>,
    imageData: ImageData,
    priority: JobPriority = 'normal',
  ): Promise<{ buffer: ArrayBuffer; msElapsed: number }> {
    return new Promise((resolve, reject) => {
      const job: EncodeJob = { id: this.nextId++, codec, options, imageData };
      const pending: PendingJob = { job, resolve, reject };
      if (priority === 'high') this.highQueue.push(pending);
      else this.normalQueue.push(pending);
      this.dispatch();
    });
  }

  private dispatch() {
    while (true) {
      const slot = this.workers.find((s) => !s.busy);
      if (!slot) return;
      const pending = this.highQueue.shift() ?? this.normalQueue.shift();
      if (!pending) return;
      slot.busy = true;
      slot.jobId = pending.job.id;
      this.inflight.set(pending.job.id, pending);
      // Structured-clone the ImageData (default postMessage behavior). We
      // intentionally do NOT transfer the buffer — the original ImageData
      // stays usable on the main thread for re-encodes at different settings.
      try {
        slot.worker.postMessage(pending.job);
      } catch (err) {
        // Cloning a large ImageData can fail when memory is short.
        slot.busy = false;
        slot.jobId = null;
        this.inflight.delete(pending.job.id);
        pending.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  private handleResult(worker: Worker, result: EncodeResult) {
    const slot = this.workers.find((s) => s.worker === worker);
    if (slot) {
      slot.busy = false;
      slot.jobId = null;
    }
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
