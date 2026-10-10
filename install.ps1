<#
  install.ps1 - install dsh-client-ui-solarized-grid into a DSH desktop profile.

  The desktop app ships no `dsh` CLI, so this route is the zero-dependency one: it copies the
  built package into the profile's plugins\ directory and inserts ONE mount row into the
  profile's cordis.patch.yml (idempotent). The patch is backed up before it is touched.

  Usage
    powershell -File .\install.ps1
    powershell -File .\install.ps1 -Profile "$env:USERPROFILE\.dsh\profiles\desktop"
    powershell -File .\install.ps1 -List          # show the profiles found on this machine
#>
[CmdletBinding()]
param(
  [string]$Profile = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop'),
  [string]$Source,
  [switch]$List
)

$ErrorActionPreference = 'Stop'
$PKG = 'dsh-client-ui-solarized-grid'
$ROW = 'ui-solarized-grid'

if ($List) {
  $root = Join-Path $env:USERPROFILE '.dsh\profiles'
  Write-Host "profiles under $root"
  Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("  {0,-24} patch={1}" -f $_.Name, (Test-Path (Join-Path $_.FullName 'cordis.patch.yml')))
  }
  return
}

# locate the package: this script sits either at the package root or in src\ beside it
if (-not $Source) {
  if (Test-Path (Join-Path $PSScriptRoot 'lib')) { $Source = $PSScriptRoot }
  elseif (Test-Path (Join-Path $PSScriptRoot "..\$PKG\lib")) { $Source = (Resolve-Path (Join-Path $PSScriptRoot "..\$PKG")).Path }
  else { throw "cannot locate the package: expected lib\ beside this script, or ..\$PKG\lib" }
}
Write-Host "package   $Source"
Write-Host "profile   $Profile"

# 1. mount row (backed up, idempotent)
$patch = Join-Path $Profile 'cordis.patch.yml'
if (-not (Test-Path -LiteralPath $patch)) { throw "no profile patch at $patch - wrong -Profile?" }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item -LiteralPath $patch -Destination "$patch.bak-$stamp" -Force
$text = [System.IO.File]::ReadAllText($patch)
if ($text -match "(?m)^\s*-?\s*id:\s*$([regex]::Escape($ROW))\s*$") {
  Write-Host "PATCH     row '$ROW' already present; left untouched"
} else {
  $block = @(
    '',
    '# Solarized palette + notebook grid background (dsh-client-ui-solarized-grid).',
    '- insert:',
    "    - id: $ROW",
    "      name: './plugins/$PKG/lib/index.js'"
  ) -join "`n"
  if (-not $text.EndsWith("`n")) { $text += "`n" }
  [System.IO.File]::WriteAllText($patch, $text + $block + "`n", (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "PATCH     appended row '$ROW' -> ./plugins/$PKG/lib/index.js"
}
Write-Host "BACKUP    $patch.bak-$stamp"

# 2. files
$target = Join-Path (Join-Path $Profile 'plugins') $PKG
New-Item -ItemType Directory -Force -Path (Join-Path $target 'lib') | Out-Null
foreach ($rel in 'package.json', 'cordis.patch.yml', 'README.md', 'LICENSE', 'CREDITS.md', 'CHANGELOG.md', 'lib\index.js', 'lib\client.js') {
  $from = Join-Path $Source $rel
  if (Test-Path -LiteralPath $from) {
    Copy-Item -LiteralPath $from -Destination (Join-Path $target $rel) -Force
    Write-Host ("INSTALLED {0}" -f $rel)
  }
}

Write-Host ''
Write-Host 'Done. Start (or restart) the DSH desktop app: the mount row is composed at startup.'
Write-Host 'Uninstall with uninstall.ps1 (it removes the row; -Remove also deletes the files).'
