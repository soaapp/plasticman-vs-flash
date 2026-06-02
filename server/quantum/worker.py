#!/usr/bin/env python3
"""Persistent Qiskit/Aer worker for the showdown backend.

Importing Qiskit costs ~1s, far too slow to pay per request when the live-odds
meter resamples every ~1.5s. So this process imports once and then serves
requests forever: it reads one JSON request per line on stdin and writes one
JSON response per line on stdout (line-buffered). The Node server owns the
process and matches responses to requests in FIFO order.

Two circuits, both on the Aer simulator. BOTH are a genuine, unbiased
Hadamard superposition — the fight never tilts the qubit. That's the point:
Flash vs Plastic Man is unresolvable, so the universe stays an honest coin.

  op="collapse"  ->  the final coin-flip. One observation decides the bout:
                       |0> --[ H ]--[ measure ]-->  bit (0=flash, 1=plastic)

  op="sample"    ->  the LIVE superposition readout. The same H circuit run
                     over many shots to show the distribution sitting at ~50/50,
                     jittering shot-to-shot from real quantum sampling noise.
                     It does NOT lean toward whoever's winning the brawl.
"""
import json
import sys

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

SIM = AerSimulator()


def collapse(shots: int = 1024) -> dict:
    qc = QuantumCircuit(1, 1, name="collapse")
    qc.h(0)
    qc.measure(0, 0)
    result = SIM.run(transpile(qc, SIM), shots=shots, memory=True).result()
    counts = result.get_counts()
    bit = int(result.get_memory()[0])  # the single observation that decides it
    return {
        "bit": bit,
        "counts": {str(k): int(v) for k, v in counts.items()},
        "shots": shots,
        "backend": "aer_simulator",
        "circuit": "q[0]: H -> measure",
    }


def sample(shots: int = 1024) -> dict:
    qc = QuantumCircuit(1, 1, name="sample")
    qc.h(0)               # honest superposition — no bias from the fight
    qc.measure(0, 0)
    counts = SIM.run(transpile(qc, SIM), shots=shots).result().get_counts()

    n_flash = int(counts.get("0", 0))   # bit 0 -> flash
    n_plastic = int(counts.get("1", 0))  # bit 1 -> plastic
    measured = n_flash / shots if shots else 0.5
    return {
        "pFlash": measured,                 # measured P(flash) this sample (~0.5)
        "counts": {"0": n_flash, "1": n_plastic},
        "shots": shots,
        "backend": "aer_simulator",
        "circuit": "q[0]: H -> measure",
    }


def handle(req: dict) -> dict:
    op = req.get("op")
    shots = int(req.get("shots", 1024))
    if op == "collapse":
        return collapse(shots)
    if op == "sample":
        return sample(shots)
    return {"error": f"unknown op: {op!r}"}


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            out = handle(json.loads(line))
        except Exception as exc:  # never crash the long-lived worker
            out = {"error": str(exc)}
        sys.stdout.write(json.dumps(out) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
