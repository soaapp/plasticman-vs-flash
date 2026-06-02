import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Owns a single long-lived Python process running quantum/worker.py.
 * Qiskit import (~1s) happens once at start, then each request is sub-ms —
 * fast enough for the live-odds meter to resample on a short interval.
 *
 * stdin/stdout is a strict FIFO: we push a resolver per request and match
 * each response line to the oldest pending request. The worker is single-
 * threaded and answers in order, so this stays aligned.
 */
export class QuantumWorker {
  constructor(python) {
    this.python = python;
    this.proc = null;
    this.queue = [];
  }

  start() {
    if (this.proc) return;
    const script = path.join(__dirname, "quantum", "worker.py");
    this.proc = spawn(this.python, [script]);

    createInterface({ input: this.proc.stdout }).on("line", (line) => {
      const pending = this.queue.shift();
      if (!pending) return;
      try {
        const data = JSON.parse(line);
        if (data.error) pending.reject(new Error(data.error));
        else pending.resolve(data);
      } catch {
        pending.reject(new Error(`bad worker output: ${line}`));
      }
    });

    this.proc.stderr.on("data", (d) => console.error("[quantum]", d.toString().trim()));
    this.proc.on("error", (e) => this._fail(new Error(`cannot launch Qiskit worker (${this.python}): ${e.message}`)));
    this.proc.on("exit", (code) => {
      this._fail(new Error(`quantum worker exited (code ${code})`));
      this.proc = null; // a later request will respawn it
    });
  }

  _fail(err) {
    while (this.queue.length) this.queue.shift().reject(err);
  }

  request(payload, timeoutMs = 10_000) {
    this.start();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("quantum worker timeout")), timeoutMs);
      // Leave the resolver in the queue even on timeout so a late line stays
      // matched to the right request and the FIFO doesn't desync.
      this.queue.push({
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.proc.stdin.write(JSON.stringify(payload) + "\n");
    });
  }

  collapse(shots = 1024) {
    return this.request({ op: "collapse", shots });
  }

  odds(momentum = 0, shots = 1024) {
    return this.request({ op: "odds", momentum, shots });
  }
}
