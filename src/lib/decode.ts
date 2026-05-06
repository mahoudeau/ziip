import DecodeWorker from '../workers/decode.worker?worker';

type DecodeSource =
  | { kind: 'file'; file: File }
  | { kind: 'jxl'; bytes: ArrayBuffer };

interface DecodeJob {
  id: number;
  source: DecodeSource;
}

type DecodeResult =
  | { id: number; ok: true; bytes: ArrayBuffer; width: number; height: number }
  | { id: number; ok: false; error: string };

interface PendingJob {
  job: DecodeJob;
  transfer: Transferable[];
  resolve: (data: ImageData) => void;
  reject: (err: Error) => void;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
}

const POOL_SIZE = Math.min(4, Math.max(2, (navigator.hardwareConcurrency ?? 2) - 1));

const slots: WorkerSlot[] = [];
const queue: PendingJob[] = [];
const inflight = new Map<number, PendingJob>();
let nextJobId = 1;

function ensurePool(): void {
  if (slots.length > 0) return;
  for (let i = 0; i < POOL_SIZE; i++) {
    const worker = new DecodeWorker();
    worker.onmessage = (e: MessageEvent<DecodeResult>) => handleResult(worker, e.data);
    slots.push({ worker, busy: false });
  }
}

function handleResult(worker: Worker, result: DecodeResult): void {
  const slot = slots.find((s) => s.worker === worker);
  if (slot) slot.busy = false;
  const pending = inflight.get(result.id);
  if (!pending) return;
  inflight.delete(result.id);
  if (result.ok) {
    pending.resolve(
      new ImageData(new Uint8ClampedArray(result.bytes), result.width, result.height),
    );
  } else {
    pending.reject(new Error(result.error));
  }
  dispatch();
}

function dispatch(): void {
  while (queue.length > 0) {
    const slot = slots.find((s) => !s.busy);
    if (!slot) return;
    const pending = queue.shift()!;
    slot.busy = true;
    inflight.set(pending.job.id, pending);
    slot.worker.postMessage(pending.job, pending.transfer);
  }
}

function enqueueJob(source: DecodeSource, transfer: Transferable[]): Promise<ImageData> {
  ensurePool();
  return new Promise((resolve, reject) => {
    const id = nextJobId++;
    const job: DecodeJob = { id, source };
    queue.push({ job, transfer, resolve, reject });
    dispatch();
  });
}

export function decodeImageFile(file: File): Promise<ImageData> {
  return enqueueJob({ kind: 'file', file }, []);
}

/** Decode JXL bytes (anywhere the browser can't do it natively — Chrome,
 * Firefox). Caller transfers ownership of `bytes`. */
export function decodeJxlBytes(bytes: ArrayBuffer): Promise<ImageData> {
  return enqueueJob({ kind: 'jxl', bytes }, [bytes]);
}
