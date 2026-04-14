#!/usr/bin/env bash
# =============================================================================
# Still – One-Click Release Script
# =============================================================================
# Usage:
#   ./scripts/release.sh [VERSION] [OPTIONS]
#
# Arguments:
#   VERSION        Release version, e.g. v1.2.0 or 1.2.0 (optional)
#                  Defaults to the version in package.json
#
# Options:
#   --skip-build   Skip Gradle build, use existing APK in build outputs
#   --universal    Also build & upload a universal (all-ABI) APK
#   --draft        Create release as draft (don't publish immediately)
#   --notes TEXT   Custom release notes (overrides auto-generated notes)
#   --help         Show this help message
#
# Authentication (pick ONE):
#   Option A – GitHub Personal Access Token (recommended, no browser needed):
#       export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
#       ./scripts/release.sh v1.2.0
#
#   Option B – gh CLI interactive login:
#       gh auth login
#       ./scripts/release.sh v1.2.0
#
#   How to create a PAT (Option A):
#       1. Go to https://github.com/settings/tokens/new
#       2. Select scope: "repo" (full control of private repositories)
#            OR for public repos: "public_repo" is enough
#       3. Copy the token and export GITHUB_TOKEN=<token>
#       4. Optionally add it to ~/.bashrc or ~/.zshrc for persistence
#
# Prerequisites:
#   - curl  (always required)
#   - gh CLI (only required if GITHUB_TOKEN is not set)
#   - java / JDK 17+ (only required without --skip-build)
#   - node  (for reading version from package.json)
#
# Examples:
#   GITHUB_TOKEN=ghp_xxx ./scripts/release.sh              # PAT, version from package.json
#   GITHUB_TOKEN=ghp_xxx ./scripts/release.sh v1.2.0       # PAT, explicit version
#   ./scripts/release.sh v1.2.0 --skip-build               # gh CLI, skip build
#   ./scripts/release.sh v1.2.0 --universal                # arm64 + universal APKs
#   ./scripts/release.sh v1.2.0 --draft                    # create draft release
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
log_success() { echo -e "${GREEN}✅${NC} $*"; }
log_warn()    { echo -e "${YELLOW}⚠️${NC}  $*"; }
log_error()   { echo -e "${RED}❌${NC} $*" >&2; }
log_step()    { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }

# ── Script / project root ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Defaults ──────────────────────────────────────────────────────────────────
VERSION=""
SKIP_BUILD=false
BUILD_UNIVERSAL=false
DRAFT=false
CUSTOM_NOTES=""
ANDROID_BUILD_APK="android/app/build/outputs/apk/release/app-release.apk"
STAGING_DIR=".release-staging"

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      sed -n '/^# Usage:/,/^# ====/p' "$0" | sed 's/^# \?//'
      exit 0 ;;
    --skip-build)  SKIP_BUILD=true;        shift ;;
    --universal)   BUILD_UNIVERSAL=true;   shift ;;
    --draft)       DRAFT=true;             shift ;;
    --notes)       CUSTOM_NOTES="$2";      shift 2 ;;
    v[0-9]*)       VERSION="$1";           shift ;;
    [0-9]*)        VERSION="v$1";          shift ;;
    *)
      log_error "Unknown argument: $1"
      echo "Run '$0 --help' for usage."
      exit 1 ;;
  esac
done

# ── Resolve version ───────────────────────────────────────────────────────────
if [[ -z "$VERSION" ]]; then
  if command -v node &>/dev/null; then
    PKG_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || true)
  fi
  if [[ -n "${PKG_VERSION:-}" ]]; then
    VERSION="v${PKG_VERSION}"
    log_info "Version from package.json: ${BOLD}${VERSION}${NC}"
  else
    log_error "Could not determine version. Pass it as an argument: $0 v1.2.0"
    exit 1
  fi
fi

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════╗"
printf   "║     🎵  Still – Release %-18s║\n" "${VERSION}"
echo -e  "╚══════════════════════════════════════════╝${NC}\n"

# ── Detect auth method ────────────────────────────────────────────────────────
# Priority: GITHUB_TOKEN env var  >  gh CLI
USE_CURL=false
USE_GH=false

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  USE_CURL=true
  log_info "Auth method: ${BOLD}GITHUB_TOKEN${NC} (curl / GitHub API)"
elif command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  USE_GH=true
  log_info "Auth method: ${BOLD}gh CLI${NC} ($(gh api user -q .login 2>/dev/null))"
elif command -v gh &>/dev/null; then
  log_warn "gh CLI found but not authenticated."
  log_warn "Starting interactive login (or set GITHUB_TOKEN to skip)..."
  echo ""
  gh auth login
  echo ""
  USE_GH=true
  log_success "gh CLI authenticated ($(gh api user -q .login))"
else
  log_error "No authentication method found."
  echo ""
  echo -e "  ${YELLOW}Option A${NC} – Personal Access Token (no browser needed):"
  echo -e "    1. Open: ${CYAN}https://github.com/settings/tokens/new${NC}"
  echo -e "    2. Enable scope: ${BOLD}repo${NC} (or public_repo for public repos)"
  echo -e "    3. Run: ${BOLD}export GITHUB_TOKEN=ghp_xxxxxxxxxxxx${NC}"
  echo ""
  echo -e "  ${YELLOW}Option B${NC} – gh CLI:"
  echo -e "    ${BOLD}sudo pacman -S github-cli && gh auth login${NC}"
  echo ""
  exit 1
fi

# ── Determine repo owner/name ─────────────────────────────────────────────────
if [[ "$USE_GH" = true ]]; then
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
fi
if [[ -z "${REPO:-}" ]]; then
  # Parse from git remote URL (supports both https and ssh remotes)
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
  if [[ "$REMOTE_URL" =~ github\.com[:/](.+/.+)(\.git)?$ ]]; then
    REPO="${BASH_REMATCH[1]%.git}"
  fi
fi
if [[ -z "${REPO:-}" ]]; then
  log_error "Could not determine GitHub repository. Check 'git remote -v'."
  exit 1
fi
REPO_OWNER="${REPO%%/*}"
REPO_NAME="${REPO##*/}"
log_info "Repository: ${BOLD}${REPO}${NC}"

# ── GitHub API helpers (curl) ─────────────────────────────────────────────────
GH_API="https://api.github.com"
GH_UPLOAD="https://uploads.github.com"

api_get() {
  # api_get <path>  → stdout JSON, returns curl exit code
  curl -fsSL \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "${GH_API}$1"
}

api_post_json() {
  # api_post_json <path> <json-body>  → stdout JSON
  curl -fsSL -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "Content-Type: application/json" \
    -d "$2" \
    "${GH_API}$1"
}

api_upload_asset() {
  # api_upload_asset <upload_url_base> <filename> <filepath>
  local upload_url="$1"
  local filename="$2"
  local filepath="$3"
  local filesize
  filesize=$(stat -c%s "$filepath" 2>/dev/null || stat -f%z "$filepath")

  curl -fsSL -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "Content-Type: application/vnd.android.package-archive" \
    -H "Content-Length: ${filesize}" \
    --data-binary "@${filepath}" \
    "${upload_url}?name=${filename}"
}

# ── Check / create GitHub Release ─────────────────────────────────────────────
log_step "Checking GitHub release ${VERSION}"

RELEASE_EXISTS=false
RELEASE_ID=""
UPLOAD_URL_BASE=""

if [[ "$USE_CURL" = true ]]; then
  RELEASE_JSON=$(api_get "/repos/${REPO}/releases/tags/${VERSION}" 2>/dev/null || true)
  if [[ -n "$RELEASE_JSON" ]] && echo "$RELEASE_JSON" | grep -q '"id"'; then
    RELEASE_EXISTS=true
    RELEASE_ID=$(echo "$RELEASE_JSON" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
    UPLOAD_URL_BASE="${GH_UPLOAD}/repos/${REPO}/releases/${RELEASE_ID}/assets"
    log_warn "Release ${VERSION} already exists (id=${RELEASE_ID}) — will upload assets to it"
  else
    log_info "Release ${VERSION} does not exist — will create it"
  fi
else
  if gh release view "$VERSION" &>/dev/null 2>&1; then
    RELEASE_EXISTS=true
    log_warn "Release ${VERSION} already exists — will upload assets to it"
  else
    log_info "Release ${VERSION} does not exist — will create it"
  fi
fi

# ── Build APKs ────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" = false ]]; then
  log_step "Building Android APK(s)"

  if [[ ! -f "android/gradlew" ]]; then
    log_error "android/gradlew not found. Run: npx expo prebuild --platform android --clean"
    exit 1
  fi
  if ! command -v java &>/dev/null; then
    log_error "java not found. Install JDK 17+: sudo pacman -S jdk17-openjdk"
    exit 1
  fi

  cd android
  chmod +x gradlew

  echo ""
  log_info "Building arm64-v8a APK..."
  ./gradlew assembleRelease \
    -PreactNativeArchitectures=arm64-v8a \
    --no-daemon \
    --quiet
  log_success "arm64 APK built"

  if [[ "$BUILD_UNIVERSAL" = true ]]; then
    echo ""
    log_info "Building universal APK (armeabi-v7a, arm64-v8a, x86, x86_64)..."
    ./gradlew clean assembleRelease \
      -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64 \
      --no-daemon \
      --quiet
    log_success "Universal APK built"
  fi

  cd "$PROJECT_ROOT"
else
  log_warn "Skipping build (--skip-build). Using existing APK(s) in build outputs."
fi

# ── Verify source APK ─────────────────────────────────────────────────────────
log_step "Collecting APK(s)"

if [[ ! -f "$ANDROID_BUILD_APK" ]]; then
  log_error "APK not found: ${ANDROID_BUILD_APK}"
  log_error "Run without --skip-build, or build manually first."
  exit 1
fi

# ── Stage APKs with versioned names ──────────────────────────────────────────
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

ARM64_APK="${STAGING_DIR}/Still-${VERSION}-arm64.apk"
cp "$ANDROID_BUILD_APK" "$ARM64_APK"
ARM64_SIZE=$(du -sh "$ARM64_APK" | cut -f1)
log_success "arm64   →  Still-${VERSION}-arm64.apk  (${ARM64_SIZE})"

UPLOAD_FILES=("$ARM64_APK")

if [[ "$BUILD_UNIVERSAL" = true ]]; then
  UNIVERSAL_APK="${STAGING_DIR}/Still-${VERSION}-universal.apk"
  cp "$ANDROID_BUILD_APK" "$UNIVERSAL_APK"
  UNIVERSAL_SIZE=$(du -sh "$UNIVERSAL_APK" | cut -f1)
  log_success "universal →  Still-${VERSION}-universal.apk  (${UNIVERSAL_SIZE})"
  UPLOAD_FILES+=("$UNIVERSAL_APK")
fi

# ── Build release notes ───────────────────────────────────────────────────────
if [[ -n "$CUSTOM_NOTES" ]]; then
  RELEASE_NOTES="$CUSTOM_NOTES"
else
  if [[ "$BUILD_UNIVERSAL" = true ]]; then
    APK_ROWS="| \`Still-${VERSION}-arm64.apk\` | arm64-v8a | Modern Android phones ✅ recommended |
| \`Still-${VERSION}-universal.apk\` | all ABIs | All devices & emulators |"
  else
    APK_ROWS="| \`Still-${VERSION}-arm64.apk\` | arm64-v8a | Modern Android phones ✅ |"
  fi

  RELEASE_NOTES="## 📦 Still ${VERSION}

### Downloads

| APK | Architecture | Best for |
|-----|-------------|----------|
${APK_ROWS}

### Quick install
\`\`\`bash
adb install Still-${VERSION}-arm64.apk
\`\`\`

> Minimum Android version: **7.0 (API 24)**"
fi

NOTES_FILE="${STAGING_DIR}/release-notes.md"
printf '%s' "$RELEASE_NOTES" > "$NOTES_FILE"

# ── Publish ───────────────────────────────────────────────────────────────────
log_step "Publishing to GitHub Releases"

DRAFT_JSON="false"
[[ "$DRAFT" = true ]] && DRAFT_JSON="true"

if [[ "$USE_CURL" = true ]]; then
  # ── curl / GitHub API path ─────────────────────────────────────────────────
  if [[ "$RELEASE_EXISTS" = false ]]; then
    log_info "Creating release via GitHub API..."

    # Escape notes for JSON (replace backslash, double-quote, newline, tab)
    ESCAPED_NOTES=$(printf '%s' "$RELEASE_NOTES" \
      | sed 's/\\/\\\\/g' \
      | sed 's/"/\\"/g' \
      | awk '{printf "%s\\n", $0}' \
      | sed 's/\\n$//')

    CREATE_JSON="{
      \"tag_name\": \"${VERSION}\",
      \"name\": \"Still ${VERSION}\",
      \"body\": \"${ESCAPED_NOTES}\",
      \"draft\": ${DRAFT_JSON},
      \"prerelease\": false
    }"

    CREATED=$(api_post_json "/repos/${REPO}/releases" "$CREATE_JSON")
    RELEASE_ID=$(echo "$CREATED" | grep -o '"id": *[0-9]*' | head -1 | grep -o '[0-9]*')
    UPLOAD_URL_BASE="${GH_UPLOAD}/repos/${REPO}/releases/${RELEASE_ID}/assets"
    log_success "Release created (id=${RELEASE_ID})"
  fi

  # Upload each APK
  for APK_PATH in "${UPLOAD_FILES[@]}"; do
    APK_NAME=$(basename "$APK_PATH")
    log_info "Uploading ${APK_NAME}..."
    api_upload_asset "$UPLOAD_URL_BASE" "$APK_NAME" "$APK_PATH" > /dev/null
    log_success "Uploaded: ${APK_NAME}"
  done

else
  # ── gh CLI path ───────────────────────────────────────────────────────────
  if [[ "$RELEASE_EXISTS" = true ]]; then
    log_info "Uploading assets to existing release ${VERSION}..."
    gh release upload "$VERSION" "${UPLOAD_FILES[@]}" --clobber
    log_success "Assets uploaded"
  else
    log_info "Creating release ${VERSION}..."
    DRAFT_FLAG=()
    [[ "$DRAFT" = true ]] && DRAFT_FLAG=(--draft)
    gh release create "$VERSION" \
      --title "Still ${VERSION}" \
      --notes-file "$NOTES_FILE" \
      "${DRAFT_FLAG[@]}" \
      "${UPLOAD_FILES[@]}"
    log_success "Release created"
  fi
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
log_step "Cleaning up"
rm -rf "$STAGING_DIR"
log_success "Staging directory removed"

# ── Done ──────────────────────────────────────────────────────────────────────
RELEASE_URL="https://github.com/${REPO}/releases/tag/${VERSION}"

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗"
printf   "║  🎉  Still %-43s║\n" "${VERSION} released successfully!"
echo -e  "╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📎 Release URL: ${CYAN}${RELEASE_URL}${NC}"
echo ""
