#!/usr/bin/env sh
# macOS / Linux：直接转发参数，不执行字符串拼接后的 shell 命令。
set -eu
task_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$task_root/scripts/publish.mjs" "$@"
