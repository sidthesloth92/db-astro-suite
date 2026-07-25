#requires -version 5
<#
.SYNOPSIS
    Installs the latest Sortronomy CLI for Windows from GitHub Releases.

.DESCRIPTION
    Downloads the latest sortronomy_windows_<arch>.zip from the
    sidthesloth92/db-astro-suite releases, verifies its SHA-256 against the
    published checksums, extracts sortronomy.exe into
    %LOCALAPPDATA%\Programs\Sortronomy, and adds that folder to the user PATH.

    No other tool required (PowerShell ships with Windows). Run in PowerShell:

        irm https://raw.githubusercontent.com/sidthesloth92/db-astro-suite/main/tools/sortronomy/scripts/install.ps1 | iex

    Re-run the same command to upgrade in place. Uninstall with 'sortronomy --uninstall'.
#>

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo       = 'sidthesloth92/db-astro-suite'
$Component  = 'sortronomy'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\Sortronomy'
$Headers    = @{ 'User-Agent' = 'sortronomy-installer' }

# Map the host architecture to the goreleaser asset suffix.
$arch = switch ($env:PROCESSOR_ARCHITECTURE) {
    'AMD64' { 'amd64' }
    'ARM64' { 'arm64' }
    default { throw "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE" }
}

Write-Host "Finding the latest $Component release..."

# The repo is a monorepo with several products, so releases/latest isn't
# sortronomy-specific. List releases and pick the newest whose tag is prefixed
# with the component name (release-please tags as 'sortronomy-vX.Y.Z').
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases?per_page=50" -Headers $Headers
$release  = $releases |
    Where-Object { $_.tag_name -like "$Component-*" -and -not $_.draft -and -not $_.prerelease } |
    Select-Object -First 1
if (-not $release) { throw "No published $Component release found yet." }

$assetName = "${Component}_windows_${arch}.zip"
$asset = $release.assets | Where-Object { $_.name -eq $assetName } | Select-Object -First 1
if (-not $asset) { throw "Release $($release.tag_name) has no asset named $assetName." }

$tmp = Join-Path $env:TEMP ("sortronomy-" + [guid]::NewGuid().ToString() + ".zip")
Write-Host "Downloading $($release.tag_name) ($assetName)..."
Invoke-WebRequest -UseBasicParsing -Uri $asset.browser_download_url -OutFile $tmp -Headers $Headers

# Verify the SHA-256 against the published checksums.txt before extracting.
$sumsAsset = $release.assets | Where-Object { $_.name -eq 'checksums.txt' } | Select-Object -First 1
if ($sumsAsset) {
    $sums = (Invoke-WebRequest -UseBasicParsing -Uri $sumsAsset.browser_download_url -Headers $Headers).Content
    $line = $sums -split "`n" | Where-Object { $_ -match [regex]::Escape($assetName) } | Select-Object -First 1
    $expected = (($line -split '\s+') | Where-Object { $_ })[0]
    $actual = (Get-FileHash -Algorithm SHA256 -Path $tmp).Hash
    if ($expected -and ($actual -ne $expected.Trim())) {
        Remove-Item $tmp -Force
        throw "Checksum mismatch for $assetName (expected $expected, got $actual)."
    }
    Write-Host "Checksum verified."
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Expand-Archive -Path $tmp -DestinationPath $InstallDir -Force
Remove-Item $tmp -Force

# Clear Mark-of-the-Web on the extracted binary so SmartScreen doesn't block it.
Get-ChildItem -Path $InstallDir -Filter '*.exe' |
    ForEach-Object { Unblock-File -Path $_.FullName -ErrorAction SilentlyContinue }

# Add the install dir to the user PATH if it isn't already there.
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $InstallDir) {
    $newPath = if ([string]::IsNullOrEmpty($userPath)) { $InstallDir } else { "$userPath;$InstallDir" }
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    $env:Path = "$env:Path;$InstallDir"
    Write-Host "Added $InstallDir to your PATH (open a new terminal to pick it up)."
}

Write-Host ""
Write-Host "Installed sortronomy $($release.tag_name) to $InstallDir"
Write-Host "Run 'sortronomy' to get started."
