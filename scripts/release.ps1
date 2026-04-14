# =============================================================================
# Still – One-Click Release Script (PowerShell / Windows)
# =============================================================================
# Usage:
#   .\scripts\release.ps1 [[-Version] <string>] [OPTIONS]
#
# Arguments:
#   -Version       Release version, e.g. v1.2.0 or 1.2.0 (optional)
#                  Defaults to the version in package.json
#
# Options:
#   -SkipBuild     Skip Gradle build, use existing APK in build outputs
#   -Universal     Also build & upload a universal (all-ABI) APK
#   -Draft         Create release as draft (don't publish immediately)
#   -Notes <text>  Custom release notes (overrides auto-generated notes)
#
# Authentication (pick ONE):
#   Option A – GitHub Personal Access Token (recommended, no browser needed):
#       $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxx"
#       .\scripts\release.ps1 v1.2.0
#
#   Option B – gh CLI interactive login:
#       gh auth login
#       .\scripts\release.ps1 v1.2.0
#
#   How to create a PAT (Option A):
#       1. Go to https://github.com/settings/tokens/new
#       2. Select scope: "repo" (full control of private repositories)
#            OR for public repos: "public_repo" is enough
#       3. Copy the token and set: $env:GITHUB_TOKEN = "<token>"
#       4. Optionally persist it in your PowerShell profile
#
# Prerequisites:
#   - curl / Invoke-RestMethod (built into PowerShell 7+)
#   - gh CLI (only required if GITHUB_TOKEN is not set)
#   - java / JDK 17+ (only required without -SkipBuild)
#   - node  (for reading version from package.json)
#
# Examples:
#   $env:GITHUB_TOKEN="ghp_xxx"; .\scripts\release.ps1              # PAT, version from package.json
#   $env:GITHUB_TOKEN="ghp_xxx"; .\scripts\release.ps1 v1.2.0       # PAT, explicit version
#   .\scripts\release.ps1 v1.2.0 -SkipBuild                         # gh CLI, skip build
#   .\scripts\release.ps1 v1.2.0 -Universal                         # arm64 + universal APKs
#   .\scripts\release.ps1 v1.2.0 -Draft                             # create draft release
# =============================================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Version = "",

    [switch]$SkipBuild,
    [switch]$Universal,
    [switch]$Draft,
    [string]$Notes = ""
)

$ErrorActionPreference = "Stop"

# ── Helpers ───────────────────────────────────────────────────────────────────
function Write-Step { param($msg) Write-Host "`n▶ $msg" -ForegroundColor Cyan }
function Write-Info { param($msg) Write-Host "i  $msg" -ForegroundColor Blue }
function Write-Ok   { param($msg) Write-Host "OK $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "!! $msg" -ForegroundColor Yellow }
function Write-Err  { param($msg) Write-Host "ERR $msg" -ForegroundColor Red }

function Invoke-Exe {
    param([string]$Exe, [string[]]$ArgList)
    & $Exe @ArgList
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Command failed (exit $LASTEXITCODE): $Exe $($ArgList -join ' ')"
        exit $LASTEXITCODE
    }
}

# ── Locate project root (parent of scripts\) ──────────────────────────────────
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# ── Resolve version ───────────────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($Version)) {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $pkgVer = (node -p "require('./package.json').version" 2>$null).Trim()
        if ($pkgVer) {
            $Version = "v$pkgVer"
            Write-Info "Version from package.json: $Version"
        }
    }
    if ([string]::IsNullOrWhiteSpace($Version)) {
        Write-Err "Could not determine version. Pass it as an argument: .\scripts\release.ps1 v1.2.0"
        exit 1
    }
}

# Normalise: ensure leading "v"
if ($Version -notmatch '^v') { $Version = "v$Version" }

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  [STILL]  Release $Version" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── Detect auth method ────────────────────────────────────────────────────────
$UseCurl = $false
$UseGh   = $false
$GhToken = $env:GITHUB_TOKEN

if (-not [string]::IsNullOrWhiteSpace($GhToken)) {
    $UseCurl = $true
    Write-Info "Auth method: GITHUB_TOKEN (Invoke-RestMethod / GitHub API)"
}
elseif (Get-Command gh -ErrorAction SilentlyContinue) {
    $authOut = gh auth status 2>&1
    if ($LASTEXITCODE -eq 0) {
        $UseGh = $true
        $ghUser = gh api user -q .login 2>$null
        Write-Info "Auth method: gh CLI ($ghUser)"
    }
    else {
        Write-Warn "gh CLI found but not authenticated. Starting interactive login..."
        Write-Host ""
        gh auth login
        Write-Host ""
        $UseGh = $true
        $ghUser = gh api user -q .login 2>$null
        Write-Ok "gh CLI authenticated ($ghUser)"
    }
}
else {
    Write-Err "No authentication method found."
    Write-Host ""
    Write-Host "  Option A - Personal Access Token (no browser needed):" -ForegroundColor Yellow
    Write-Host "    1. Open: https://github.com/settings/tokens/new" -ForegroundColor Cyan
    Write-Host "    2. Enable scope: repo  (or public_repo for public repos)"
    Write-Host '    3. Run: $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxx"'
    Write-Host ""
    Write-Host "  Option B - gh CLI:" -ForegroundColor Yellow
    Write-Host "    winget install GitHub.cli"
    Write-Host "    gh auth login"
    Write-Host ""
    exit 1
}

# ── Determine repo owner/name ─────────────────────────────────────────────────
$Repo = $null
if ($UseGh) {
    $Repo = (gh repo view --json nameWithOwner -q .nameWithOwner 2>$null).Trim()
}
if ([string]::IsNullOrWhiteSpace($Repo)) {
    $remoteUrl = (git remote get-url origin 2>$null).Trim()
    if ($remoteUrl -match 'github\.com[:/](.+/.+?)(\.git)?$') {
        $Repo = $Matches[1]
    }
}
if ([string]::IsNullOrWhiteSpace($Repo)) {
    Write-Err "Could not determine GitHub repository. Check 'git remote -v'."
    exit 1
}
$RepoParts = $Repo -split '/'
$RepoOwner = $RepoParts[0]
$RepoName  = $RepoParts[1]
Write-Info "Repository: $Repo"

# ── GitHub API helpers ────────────────────────────────────────────────────────
$GhApiBase    = "https://api.github.com"
$GhUploadBase = "https://uploads.github.com"

function Invoke-GhApi {
    param(
        [string]$Path,
        [string]$Method = "GET",
        [object]$Body   = $null
    )
    $headers = @{
        Authorization = "token $GhToken"
        Accept        = "application/vnd.github+json"
    }
    $params = @{
        Uri     = "$GhApiBase$Path"
        Method  = $Method
        Headers = $headers
    }
    if ($null -ne $Body) {
        $params.Body        = ($Body | ConvertTo-Json -Depth 10)
        $params.ContentType = "application/json"
    }
    return Invoke-RestMethod @params
}

function Upload-ReleaseAsset {
    param(
        [string]$UploadUrlBase,
        [string]$FilePath
    )
    $filename = Split-Path -Leaf $FilePath
    $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $headers = @{
        Authorization = "token $GhToken"
        Accept        = "application/vnd.github+json"
    }
    $uploadUri = "${UploadUrlBase}?name=${filename}"
    Invoke-RestMethod -Uri $uploadUri -Method POST -Headers $headers `
        -ContentType "application/vnd.android.package-archive" `
        -Body $fileBytes | Out-Null
}

# ── Check / create GitHub Release ─────────────────────────────────────────────
Write-Step "Checking GitHub release $Version"

$ReleaseExists  = $false
$ReleaseId      = $null
$UploadUrlBase  = $null

if ($UseCurl) {
    try {
        $existing = Invoke-GhApi "/repos/$Repo/releases/tags/$Version"
        if ($existing.id) {
            $ReleaseExists = $true
            $ReleaseId     = $existing.id
            $UploadUrlBase = "$GhUploadBase/repos/$Repo/releases/$ReleaseId/assets"
            Write-Warn "Release $Version already exists (id=$ReleaseId) — will upload assets to it"
        }
    }
    catch {
        Write-Info "Release $Version does not exist — will create it"
    }
}
else {
    $null = gh release view $Version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $ReleaseExists = $true
        Write-Warn "Release $Version already exists — will upload assets to it"
    }
    else {
        Write-Info "Release $Version does not exist — will create it"
    }
}

# ── Build APKs ────────────────────────────────────────────────────────────────
$AndroidDir  = Join-Path $ProjectRoot "android"
$BuildOutput = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"

if (-not $SkipBuild) {
    Write-Step "Building Android APK(s)"

    $gradlew = Join-Path $AndroidDir "gradlew.bat"
    if (-not (Test-Path $gradlew)) {
        Write-Err "android\gradlew.bat not found. Run: npx expo prebuild --platform android --clean"
        exit 1
    }
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
        Write-Err "java not found. Install JDK 17+: winget install EclipseAdoptium.Temurin.17.JDK"
        exit 1
    }

    Push-Location $AndroidDir

    Write-Host ""
    Write-Info "Building arm64-v8a APK..."
    Invoke-Exe ".\gradlew.bat" @(
        "assembleRelease",
        "-PreactNativeArchitectures=arm64-v8a",
        "--no-daemon",
        "--quiet"
    )
    Write-Ok "arm64 APK built"

    if ($Universal) {
        Write-Host ""
        Write-Info "Building universal APK (armeabi-v7a, arm64-v8a, x86, x86_64)..."
        Invoke-Exe ".\gradlew.bat" @(
            "clean", "assembleRelease",
            "-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64",
            "--no-daemon",
            "--quiet"
        )
        Write-Ok "Universal APK built"
    }

    Pop-Location
}
else {
    Write-Warn "Skipping build (-SkipBuild). Using existing APK in build outputs."
}

# ── Verify source APK ─────────────────────────────────────────────────────────
Write-Step "Collecting APK(s)"

if (-not (Test-Path $BuildOutput)) {
    Write-Err "APK not found: $BuildOutput"
    Write-Err "Run without -SkipBuild, or build manually first."
    exit 1
}

# ── Stage APKs with versioned names ──────────────────────────────────────────
$StagingDir = Join-Path $ProjectRoot ".release-staging"
if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

$Arm64Apk = Join-Path $StagingDir "Still-$Version-arm64.apk"
Copy-Item $BuildOutput $Arm64Apk
$arm64Size = "{0:N1} MB" -f ((Get-Item $Arm64Apk).Length / 1MB)
Write-Ok "arm64   ->  Still-$Version-arm64.apk  ($arm64Size)"

$UploadFiles = @($Arm64Apk)

if ($Universal) {
    $UniversalApk = Join-Path $StagingDir "Still-$Version-universal.apk"
    Copy-Item $BuildOutput $UniversalApk
    $uniSize = "{0:N1} MB" -f ((Get-Item $UniversalApk).Length / 1MB)
    Write-Ok "universal ->  Still-$Version-universal.apk  ($uniSize)"
    $UploadFiles += $UniversalApk
}

# ── Build release notes ───────────────────────────────────────────────────────
if (-not [string]::IsNullOrWhiteSpace($Notes)) {
    $ReleaseNotes = $Notes
}
else {
    if ($Universal) {
        $apkRows = @"
| ``Still-$Version-arm64.apk`` | arm64-v8a | Modern Android phones recommended |
| ``Still-$Version-universal.apk`` | all ABIs | All devices & emulators |
"@
    }
    else {
        $apkRows = "| ``Still-$Version-arm64.apk`` | arm64-v8a | Modern Android phones |"
    }

    $ReleaseNotes = @"
## Still $Version

### Downloads

| APK | Architecture | Best for |
|-----|-------------|----------|
$apkRows

### Quick install
``````
adb install Still-$Version-arm64.apk
``````

> Minimum Android version: **7.0 (API 24)**
"@
}

$NotesTmp = Join-Path $StagingDir "release-notes.md"
Set-Content -Path $NotesTmp -Value $ReleaseNotes -Encoding UTF8

# ── Publish to GitHub Releases ────────────────────────────────────────────────
Write-Step "Publishing to GitHub Releases"

if ($UseCurl) {
    # ── Invoke-RestMethod / GitHub API path ───────────────────────────────────
    if (-not $ReleaseExists) {
        Write-Info "Creating release via GitHub API..."
        $body = @{
            tag_name   = $Version
            name       = "Still $Version"
            body       = $ReleaseNotes
            draft      = $Draft.IsPresent
            prerelease = $false
        }
        $created   = Invoke-GhApi "/repos/$Repo/releases" -Method POST -Body $body
        $ReleaseId = $created.id
        $UploadUrlBase = "$GhUploadBase/repos/$Repo/releases/$ReleaseId/assets"
        Write-Ok "Release created (id=$ReleaseId)"
    }

    foreach ($apkPath in $UploadFiles) {
        $apkName = Split-Path -Leaf $apkPath
        Write-Info "Uploading $apkName ..."
        Upload-ReleaseAsset -UploadUrlBase $UploadUrlBase -FilePath $apkPath
        Write-Ok "Uploaded: $apkName"
    }
}
else {
    # ── gh CLI path ───────────────────────────────────────────────────────────
    if ($ReleaseExists) {
        Write-Info "Uploading assets to existing release $Version..."
        $uploadArgs = @("release", "upload", $Version) + $UploadFiles + @("--clobber")
        Invoke-Exe "gh" $uploadArgs
        Write-Ok "Assets uploaded"
    }
    else {
        Write-Info "Creating release $Version..."
        $createArgs = @(
            "release", "create", $Version,
            "--title", "Still $Version",
            "--notes-file", $NotesTmp
        )
        if ($Draft) { $createArgs += "--draft" }
        $createArgs += $UploadFiles
        Invoke-Exe "gh" $createArgs
        Write-Ok "Release created"
    }
}

# ── Cleanup ───────────────────────────────────────────────────────────────────
Write-Step "Cleaning up"
Remove-Item -Recurse -Force $StagingDir
Write-Ok "Staging directory removed"

# ── Done ──────────────────────────────────────────────────────────────────────
$ReleaseUrl = "https://github.com/$Repo/releases/tag/$Version"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Still $Version released successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Release URL: $ReleaseUrl" -ForegroundColor Cyan
Write-Host ""
