<#
  apply-theme.ps1 - rebuild this theme from source and (unless -BuildOnly) install it.

  Steps: regenerate src/tokens.js from token-sheets/ -> rebuild lib/ -> install.ps1
  (install.ps1 copies the package into the profile and inserts the mount row idempotently).

  Usage
    pwsh -File .\tools\apply-theme.ps1
    pwsh -File .\tools\apply-theme.ps1 -BuildOnly
    pwsh -File .\tools\apply-theme.ps1 -Profile "$env:USERPROFILE\.dsh\profiles\desktop"
#>
[CmdletBinding()]
param(
  [string]$Profile = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop'),
  [string]$Node,
  [switch]$BuildOnly
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$tools = $PSScriptRoot

# node: prefer the DSH runtime's own node, then PATH
if (-not $Node) {
  $runtimeRoot = Join-Path $env:USERPROFILE '.dsh\dsh-runtimes'
  if (Test-Path $runtimeRoot) {
    $Node = Get-ChildItem -Path $runtimeRoot -Directory -ErrorAction SilentlyContinue |
      ForEach-Object { Join-Path $_.FullName 'dependencies\node\bin\node.exe' } |
      Where-Object { Test-Path $_ } | Select-Object -First 1
  }
  if (-not $Node) { $Node = (Get-Command node -ErrorAction SilentlyContinue).Source }
  if (-not $Node) { throw 'node.exe not found - pass -Node <path>' }
}

Write-Host '== 1/3 regenerate src/tokens.js from token-sheets/'
& $Node (Join-Path $tools 'build-solarized-tokens.mjs')
if ($LASTEXITCODE -ne 0) { throw 'build-solarized-tokens.mjs failed' }

Write-Host '== 2/3 rebuild lib/'
& $Node (Join-Path $tools 'build-plugin.mjs')
if ($LASTEXITCODE -ne 0) { throw 'build-plugin.mjs failed' }
& $Node --check (Join-Path $repo 'lib\client.js')
if ($LASTEXITCODE -ne 0) { throw 'lib/client.js has a syntax error' }
Write-Host ("    client.js {0} bytes" -f (Get-Item (Join-Path $repo 'lib\client.js')).Length)

if ($BuildOnly) { Write-Host '== 3/3 install skipped (-BuildOnly)'; exit 0 }

Write-Host "== 3/3 install into $Profile"
& (Join-Path $repo 'install.ps1') -Profile $Profile

Write-Host ''
Write-Host 'Done. The mount row is composed at DSH startup, so restart the app if you just added it.'
