#!/usr/bin/env python3
"""Persistent Qiskit/Aer worker for the showdown backend.

Importing Qiskit costs ~1s, far too slow to pay per request when the live-odds
meter resamples every ~1.5s. So this process imports once and then serves
requests forever: it reads one JSON request per line on stdin and writes one
JSON response per line on stdout (line-buffered). The Node server owns the
process and matches responses to requests in FIFO order.

Two circuits, both on the Aer simulator:

  op="collapse"  ->  the final coin-flip. A genuine 50/50 Hadamard:
                       |0> --[ H ]--[ measure ]-->  bit (0=flash, 1=plastic)

  op="odds"      ->  the LIVE odds meter. A single-qubit Ry(theta) rotation
                     biased by the fight's momentum, sampled over many shots:
                       |0> --[ Ry(theta) ]--[ measure ]
                     P(measure=0) = cos^2(theta/2). We pick theta so the
                     expected P(flash) tracks who's currently in the lead, then
                     report the *measured* shot counts (which jitter shot-to-
                     shot — that's the real quantum sampling noise on display).
"""
import json
import math
import sys

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

SIM = AerSimulator()

# How hard momentum tilts the odds, and the clamp so it never hits 0%/100%.
MOMENTUM_GAIN = 0.05
MAX_TILT = 0.35


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


def odds(momentum: float = 0.0, shots: int = 1024) -> dict:
    tilt = max(-MAX_TILT, min(MAX_TILT, momentum * MOMENTUM_GAIN))
    p_flash_target = 0.5 + tilt  # desired P(flash) == P(measure=0)
    theta = 2 * math.acos(math.sqrt(p_flash_target))  # Ry: P(0)=cos^2(theta/2)

    qc = QuantumCircuit(1, 1, name="odds")
    qc.ry(theta, 0)
    qc.measure(0, 0)
    counts = SIM.run(transpile(qc, SIM), shots=shots).result().get_counts()

    n_flash = int(counts.get("0", 0))   # bit 0 -> flash
    n_plastic = int(counts.get("1", 0))  # bit 1 -> plastic
    measured = n_flash / shots if shots else 0.5
    return {
        "pFlash": measured,                 # measured P(flash) this sample
        "pFlashTarget": round(p_flash_target, 4),
        "counts": {"0": n_flash, "1": n_plastic},
        "shots": shots,
        "theta": round(theta, 4),
        "momentum": momentum,
        "backend": "aer_simulator",
        "circuit": "q[0]: Ry(theta) -> measure",
    }


def handle(req: dict) -> dict:
    op = req.get("op")
    shots = int(req.get("shots", 1024))
    if op == "collapse":
        return collapse(shots)
    if op == "odds":
        return odds(float(req.get("momentum", 0)), shots)
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
