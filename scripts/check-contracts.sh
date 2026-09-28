#!/usr/bin/env bash
set -euo pipefail

python -m py_compile contracts/*.py
for contract in contracts/*.py; do
  echo "===== ${contract}: genvm-lint check ====="
  genvm-lint check "${contract}"
  echo "===== ${contract}: genvm-lint validate ====="
  genvm-lint validate "${contract}"
done
