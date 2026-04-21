#!/usr/bin/env bash
# Remove artifacts from a previous E2E run on MACHINE A.
# Does NOT delete the release repo on GitHub; delete that manually for a pristine test.
set -euo pipefail

rm -rf ~/tmp/risotron-e2e ~/tmp/walking-demo
echo "Cleaned. You can re-run Step 1 now."
