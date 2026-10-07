#!/usr/bin/env bash
set -euo pipefail

npx kill-port 8000 || true
npx kill-port 5174 || true
