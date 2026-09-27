# 在任何目录调用都能定位到本项目；剩余参数原样传给 Node，不拼接 shell 命令。
param(
  [string]$Repo = "",
  [string]$Message = "Update personal academic website",
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
$taskRoot = $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "请先安装 Node.js 24 或更新版本。" }
$publishArgs = @((Join-Path $taskRoot "scripts/publish.mjs"), "--message", $Message)
if ($Repo) { $publishArgs += @("--repo", $Repo) }
if ($DryRun) { $publishArgs += "--dry-run" }
& node @publishArgs
exit $LASTEXITCODE
