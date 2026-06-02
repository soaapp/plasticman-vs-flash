#!/usr/bin/env python3
"""Collapse the Plastic Man vs Flash wavefunction with a real quantum circuit.

Builds a single-qubit circuit:  |0> --[ H ]--[ measure ]-->  classical bit

A Hadamard gate puts the qubit into an equal superposition (|0> + |1>)/sqrt(2);
measuring collapses it to 0 or 1 with ~50/50 probability. We run it on the
Qiskit Aer simulator. The first shot is THE collapse that decides the bout; the
full shot histogram is returned so the UI can show the measured distribution.

Emits a single line of JSON on stdout:
  {"bit": 0|1, "counts": {"0": n, "1": m}, "shots": N,
   "backend": "...", "circuit": "..."}

Swap AerSimulator for a real hardware backend (QiskitRuntimeService) to decide
the fight on actual quantum hardware.
"""
import json
import sys

from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator


def collapse(shots: int = 1024) -> dict:
    qc = QuantumCircuit(1, 1, name="showdown")
    qc.h(0)              # superposition: both fighters win at once
    qc.measure(0, 0)     # observe -> collapse to a single winner

    sim = AerSimulator()
    compiled = transpile(qc, sim)
    result = sim.run(compiled, shots=shots, memory=True).result()

    counts = result.get_counts()
    memory = result.get_memory()  # per-shot outcomes, e.g. ["1", "0", "1", ...]
    bit = int(memory[0])          # the single observation that decides the bout

    return {
        "bit": bit,
        "counts": {str(k): int(v) for k, v in counts.items()},
        "shots": shots,
        "backend": "aer_simulator",
        "circuit": "q[0]: H -> measure",
    }


if __name__ == "__main__":
    shots = 1024
    if len(sys.argv) > 1:
        try:
            shots = max(1, int(sys.argv[1]))
        except ValueError:
            pass
    try:
        print(json.dumps(collapse(shots)))
    except Exception as exc:  # surface failures as JSON so the server can relay them
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
