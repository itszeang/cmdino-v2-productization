$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$installerDir = Join-Path $scriptDir "installers"

if (-not (Test-Path $installerDir)) {
  New-Item -ItemType Directory -Path $installerDir | Out-Null
}

$installers = @(
  @{
    Name = "NSIS setup"
    Source = Join-Path $repoRoot "src-tauri\target\release\bundle\nsis\CMDino_0.1.0_x64-setup.exe"
  },
  @{
    Name = "MSI installer"
    Source = Join-Path $repoRoot "src-tauri\target\release\bundle\msi\CMDino_0.1.0_x64_en-US.msi"
  }
)

Write-Host "CMDino QA kit installer copy"
Write-Host "Kit folder: $scriptDir"

foreach ($installer in $installers) {
  $source = $installer.Source
  if (Test-Path $source) {
    $destination = Join-Path $installerDir (Split-Path -Leaf $source)
    Copy-Item -LiteralPath $source -Destination $destination -Force
    Write-Host "Copied $($installer.Name): $destination"
  } else {
    Write-Warning "Missing $($installer.Name): $source"
  }
}

Write-Host "Done. If installers were missing, run npm.cmd run tauri:build from the repo root, then run this script again."
