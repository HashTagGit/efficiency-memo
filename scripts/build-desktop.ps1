[CmdletBinding()]
param(
    [string]$SigningKeyPath = (Join-Path $env:LOCALAPPDATA 'EfficiencyMemo\release-signing\updater.key')
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Invoke-Checked([string]$Label, [scriptblock]$Command) {
    Write-Host "`n==> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE."
    }
}

if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vswhere) {
        $vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
        if ($vsPath) {
            $devShell = Join-Path $vsPath "Common7\Tools\Microsoft.VisualStudio.DevShell.dll"
            if (Test-Path $devShell) {
                Import-Module $devShell
                Enter-VsDevShell -VsInstallPath $vsPath -SkipAutomaticLocation -DevCmdArguments "-arch=x64 -host_arch=x64"
            }
        }
    }
}

"node", "pnpm", "rustc", "cargo", "cl.exe" | ForEach-Object { Require-Command $_ }

if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
    if (-not (Test-Path -LiteralPath $SigningKeyPath -PathType Leaf)) {
        throw "Update signing key missing. Set TAURI_SIGNING_PRIVATE_KEY or pass -SigningKeyPath. See docs/Installation.md."
    }
    $env:TAURI_SIGNING_PRIVATE_KEY = (Resolve-Path -LiteralPath $SigningKeyPath).Path
}

Invoke-Checked "Install dependencies" { pnpm install --frozen-lockfile }
Invoke-Checked "Run tests" { pnpm test }
Invoke-Checked "Typecheck" { pnpm typecheck }
Invoke-Checked "Lint" { pnpm lint }
Invoke-Checked "Build Windows installers" { pnpm --filter desktop tauri:build -- --bundles msi nsis --ci }

$release = Join-Path $repoRoot "apps\desktop\src-tauri\target\release"
$artifacts = @(
    Get-ChildItem (Join-Path $release "bundle\msi") -Filter "*.msi" -File -ErrorAction SilentlyContinue
    Get-ChildItem (Join-Path $release "bundle\nsis") -Filter "*.exe" -File -ErrorAction SilentlyContinue
    Get-ChildItem (Join-Path $release "bundle\msi") -Filter "*.sig" -File -ErrorAction SilentlyContinue
    Get-ChildItem (Join-Path $release "bundle\nsis") -Filter "*.sig" -File -ErrorAction SilentlyContinue
    Get-Item (Join-Path $release "EfficiencyMemo.exe") -ErrorAction SilentlyContinue
) | Sort-Object FullName -Unique

if (-not $artifacts) {
    throw "Build completed but no Windows installer artifacts were found under '$release'."
}

Write-Host "`nBuild artifacts:" -ForegroundColor Green
$artifacts | ForEach-Object { Write-Host $_.FullName }
