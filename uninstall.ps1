<#
  uninstall.ps1 - remove dsh-client-ui-solarized-grid from a DSH desktop profile.

  The profile patch is backed up first, then the mount row (and the '- insert:' /
  comment lines that belong to it) is removed. Pass -Remove to delete the plugin files too.

  Usage
    powershell -File .\uninstall.ps1
    powershell -File .\uninstall.ps1 -Remove
    powershell -File .\uninstall.ps1 -Profile "$env:USERPROFILE\.dsh\profiles\desktop"
#>
[CmdletBinding()]
param(
  [string]$Profile = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop'),
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$PKG = 'dsh-client-ui-solarized-grid'
$ROW = 'ui-solarized-grid'

$patch = Join-Path $Profile 'cordis.patch.yml'
if (-not (Test-Path -LiteralPath $patch)) { throw "no profile patch at $patch - wrong -Profile?" }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item -LiteralPath $patch -Destination "$patch.bak-$stamp" -Force
Write-Host "BACKUP    $patch.bak-$stamp"

$lines = [System.IO.File]::ReadAllText($patch) -split "`n"
$kept = New-Object System.Collections.Generic.List[string]
$removed = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  if ($line -match "^\s*-?\s*id:\s*$([regex]::Escape($ROW))\s*$") {
    $removed++
    if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -match '^\s*name:\s*') { $i++ }        # its name: line
    if ($kept.Count -ge 1 -and $kept[$kept.Count - 1] -match '^\s*-?\s*insert:\s*$') {     # childless insert:
      $kept.RemoveAt($kept.Count - 1)
      if ($kept.Count -ge 1 -and $kept[$kept.Count - 1] -match '^\s*#.*(olarized|solarized-grid|notebook)') {
        $kept.RemoveAt($kept.Count - 1)
      }
    }
    continue
  }
  $kept.Add($line)
}

if ($removed -eq 0) {
  Write-Host "PATCH     no '$ROW' row found; patch left unchanged next to its backup"
} else {
  [System.IO.File]::WriteAllText($patch, ($kept -join "`n"), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "PATCH     removed $removed row(s)"
}

if ($Remove) {
  $target = Join-Path (Join-Path $Profile 'plugins') $PKG
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
    Write-Host "REMOVED   $target"
  } else {
    Write-Host "REMOVED   (nothing at $target)"
  }
} else {
  Write-Host "FILES     left in place - pass -Remove to delete them"
}

Write-Host ''
Write-Host 'Restart the DSH desktop app to apply the change.'
