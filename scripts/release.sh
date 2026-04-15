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
#   --skip-build   Skip Gradle build; look for pre-built APKs in staging/
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
#       2. Select scope: "repo"  (or "public_repo" for public repos)
#       3. Copy the token and: export GITHUB_TOKEN=<token>
#       4. Optionally persist it in ~/.bashrc or ~/.zshrc
#
# Prerequisites:
#   - curl  (always required)
#   - gh CLI (only required if GITHUB_TOKEN is not set)
#   - java / JDK 17+  (skipped with --skip-build)
#   - node  (for reading version from package.json)
#
# How builds work:
#   A single `./gradlew assembleRelease` with ABI splits enabled produces
#   5 APKs in one pass — no multiple builds, no gradlew clean between passes:
#
#   Still-<ver>-arm64-v8a.apk     64-bit ARM   modern phones (recommended)
#   Still-<ver>-armeabi-v7a.apk   32-bit ARM   older phones
#   Still-<ver>-x86_64.apk        64-bit x86   modern emulators / Chromebooks
#   Still-<ver>-x86.apk           32-bit x86   older emulators
#   Still-<ver>-universal.apk     all 4 ABIs   maximum compatibility
#
# Examples:
#   GITHUB_TOKEN=ghp_xxx ./scripts/release.sh              # version from package.json
#   GITHUB_TOKEN=ghp_xxx ./scripts/release.sh v1.2.0       # explicit version
#   ./scripts/release.sh v1.2.0 --skip-build               # skip build, upload staged APKs
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
DRAFT=false
CUSTOM_NOTES=""
STAGING_DIR=".release-staging"

# Gradle ABI split output names  →  our release file suffix
# Format: "gradle-suffix:our-suffix"
declare -a ABI_MAP=(
  "arm64-v8a:arm64-v8a"
  "armeabi-v7a:armeabi-v7a"
  "x86_64:x86_64"
  "x86:x86"
)

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      sed -n '/^# Usage:/,/^# ====/p' "$0" | sed 's/^# \?//'
      exit 0 ;;
    --skip-build)  SKIP_BUILD=true;   shift ;;
    --draft)       DRAFT=true;        shift ;;
    --notes)       CUSTOM_NOTES="$2"; shift 2 ;;
    v[0-9]*)       VERSION="$1";      shift ;;
    [0-9]*)        VERSION="v$1";     shift ;;
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
USE_CURL=false
USE_GH=false

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  USE_CURL=true
  log_info "Auth method: ${BOLD}GITHUB_TOKEN${NC} (curl / GitHub API)"
elif command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  USE_GH=true
  log_info "Auth method: ${BOLD}gh CLI${NC} ($(gh api user -q .login 2>/dev/null))"
elif command -v gh &>/dev/null; then
  log_warn "gh CLI found but not authenticated. Starting interactive login..."
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
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
  if [[ "$REMOTE_URL" =~ github\.com[:/](.+/.+)(\.git)?$ ]]; then
    REPO="${BASH_REMATCH[1]%.git}"
  fi
fi
if [[ -z "${REPO:-}" ]]; then
  log_error "Could not determine GitHub repository. Check 'git remote -v'."
  exit 1
fi
log_info "Repository: ${BOLD}${REPO}${NC}"

# ── GitHub API helpers ────────────────────────────────────────────────────────
GH_API="https://api.github.com"
GH_UPLOAD="https://uploads.github.com"

api_get() {
  curl -fsSL \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "${GH_API}$1"
}

api_post_json() {
  curl -fsSL -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "Content-Type: application/json" \
    -d "$2" \
    "${GH_API}$1"
}

api_upload_asset() {
  local upload_url="$1" filename="$2" filepath="$3"
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

# ── Prepare staging directory ─────────────────────────────────────────────────
if [[ "$SKIP_BUILD" = false ]]; then
  rm -rf "$STAGING_DIR"
fi
mkdir -p "$STAGING_DIR"

# ── Build APKs ────────────────────────────────────────────────────────────────
# ABI splits are injected into build.gradle automatically (see patch_abi_splits
# below), so a single assembleRelease with all ABIs produces 5 APKs in one pass:
#   app-arm64-v8a-release.apk
#   app-armeabi-v7a-release.apk
#   app-x86_64-release.apk
#   app-x86-release.apk
#   app-universal-release.apk
# No gradlew clean is needed between builds — that would break CMake codegen.
GRADLE_APK_DIR="android/app/build/outputs/apk/release"
GRADLE_FILE="android/app/build.gradle"

# Inject ABI splits into build.gradle if not already present.
# This is idempotent and survives `expo prebuild --clean` regeneration.
patch_abi_splits() {
  if grep -q "splits" "$GRADLE_FILE" 2>/dev/null; then
    log_info "ABI splits already configured in build.gradle"
    return
  fi

  log_info "Injecting ABI splits into build.gradle..."

  # Use python3 for reliable multi-line insertion.
  # Inserts the splits block right after the androidResources { } closing brace,
  # which is the last block inside android { } in an Expo-generated build.gradle.
  python3 - "$GRADLE_FILE" <<'PYEOF'
import sys, re

path = sys.argv[1]
content = open(path).read()

splits_block = """
    // Generate one APK per ABI plus a universal APK in a single build run.
    // Injected by scripts/release.sh — safe to re-inject after expo prebuild.
    splits {
        abi {
            reset()
            enable true
            universalApk true
            include "armeabi-v7a", "arm64-v8a", "x86_64", "x86"
        }
    }
"""

# Anchor: the closing brace of the androidResources { } block.
# In Expo's generated build.gradle this block always ends with a line that is
# exactly four spaces + "}" followed by a blank line before the next section.
anchor = re.compile(
    r'(    androidResources \{[^\}]*\}\n)',
    re.DOTALL
)

new_content, n = anchor.subn(r'\1' + splits_block, content, count=1)
if n == 0:
    print("ERROR: could not locate androidResources block", file=sys.stderr)
    sys.exit(1)

open(path, 'w').write(new_content)
print("Patched successfully.")
PYEOF

  if grep -q "splits" "$GRADLE_FILE"; then
    log_success "ABI splits injected into build.gradle"
  else
    log_error "Failed to inject ABI splits into build.gradle."
    log_error "Please add the following block manually inside the android { } section of ${GRADLE_FILE}:"
    cat <<'EOF'
    splits {
        abi {
            reset()
            enable true
            universalApk true
            include "armeabi-v7a", "arm64-v8a", "x86_64", "x86"
        }
    }
EOF
    exit 1
  fi
}

if [[ "$SKIP_BUILD" = false ]]; then
  log_step "Building all APKs (single pass with ABI splits)"

  if [[ ! -f "android/gradlew" ]]; then
    log_error "android/gradlew not found. Run: npx expo prebuild --platform android --clean"
    exit 1
  fi
  if [[ ! -f "$GRADLE_FILE" ]]; then
    log_error "${GRADLE_FILE} not found. Run: npx expo prebuild --platform android --clean"
    exit 1
  fi
  if ! command -v java &>/dev/null; then
    log_error "java not found. Install JDK 17+: sudo pacman -S jdk17-openjdk"
    exit 1
  fi

  patch_abi_splits

  cd android
  chmod +x gradlew

  log_info "Running assembleRelease for all ABIs..."
  ./gradlew assembleRelease \
    -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86_64,x86 \
    --no-daemon \
    --quiet

  cd "$PROJECT_ROOT"
  log_success "Build complete"
else
  log_warn "--skip-build: expecting pre-built APKs in ${GRADLE_APK_DIR}/ or ${STAGING_DIR}/"
fi

# ── Collect and stage APKs ────────────────────────────────────────────────────
log_step "Collecting APK(s)"

UPLOAD_FILES=()
MISSING_APKS=()

# Individual ABI APKs
for entry in "${ABI_MAP[@]}"; do
  GRADLE_SUFFIX="${entry%%:*}"
  OUR_SUFFIX="${entry##*:}"

  DEST="${STAGING_DIR}/Still-${VERSION}-${OUR_SUFFIX}.apk"

  # If we just built, copy from Gradle output; otherwise expect it in staging already
  GRADLE_SRC="${GRADLE_APK_DIR}/app-${GRADLE_SUFFIX}-release.apk"
  if [[ "$SKIP_BUILD" = false ]]; then
    if [[ -f "$GRADLE_SRC" ]]; then
      cp "$GRADLE_SRC" "$DEST"
    fi
  fi

  if [[ -f "$DEST" ]]; then
    SIZE=$(du -sh "$DEST" | cut -f1)
    log_success "  Still-${VERSION}-${OUR_SUFFIX}.apk  (${SIZE})"
    UPLOAD_FILES+=("$DEST")
  else
    MISSING_APKS+=("Still-${VERSION}-${OUR_SUFFIX}.apk")
  fi
done

# Universal APK
UNIVERSAL_DEST="${STAGING_DIR}/Still-${VERSION}-universal.apk"
UNIVERSAL_SRC="${GRADLE_APK_DIR}/app-universal-release.apk"
if [[ "$SKIP_BUILD" = false ]]; then
  if [[ -f "$UNIVERSAL_SRC" ]]; then
    cp "$UNIVERSAL_SRC" "$UNIVERSAL_DEST"
  fi
fi

if [[ -f "$UNIVERSAL_DEST" ]]; then
  SIZE=$(du -sh "$UNIVERSAL_DEST" | cut -f1)
  log_success "  Still-${VERSION}-universal.apk  (${SIZE})"
  UPLOAD_FILES+=("$UNIVERSAL_DEST")
else
  MISSING_APKS+=("Still-${VERSION}-universal.apk")
fi

# Abort if nothing to upload
if [[ ${#UPLOAD_FILES[@]} -eq 0 ]]; then
  log_error "No APK files found. Run without --skip-build, or check the Gradle output."
  if [[ ${#MISSING_APKS[@]} -gt 0 ]]; then
    log_error "Expected files:"
    for f in "${MISSING_APKS[@]}"; do
      echo -e "    ${RED}•${NC} $f"
    done
  fi
  exit 1
fi

if [[ ${#MISSING_APKS[@]} -gt 0 ]]; then
  log_warn "The following APKs were not found and will be skipped:"
  for f in "${MISSING_APKS[@]}"; do
    echo -e "    ${YELLOW}•${NC} $f"
  done
fi

log_info "${#UPLOAD_FILES[@]} APK(s) ready for upload"

# ── Build release notes ───────────────────────────────────────────────────────
if [[ -n "$CUSTOM_NOTES" ]]; then
  RELEASE_NOTES="$CUSTOM_NOTES"
else
  APK_ROWS=""
  for entry in "${ABI_MAP[@]}"; do
    OUR_SUFFIX="${entry##*:}"
    case "$OUR_SUFFIX" in
      arm64-v8a)   DESC="Modern 64-bit phones ✅ recommended" ;;
      armeabi-v7a) DESC="Older 32-bit phones" ;;
      x86_64)      DESC="Modern emulators / Chromebooks" ;;
      x86)         DESC="Older 32-bit emulators" ;;
      *)           DESC="" ;;
    esac
    APK_ROWS="${APK_ROWS}| \`Still-${VERSION}-${OUR_SUFFIX}.apk\` | \`${OUR_SUFFIX}\` | ${DESC} |
"
  done
  APK_ROWS="${APK_ROWS}| \`Still-${VERSION}-universal.apk\` | all 4 ABIs | Maximum compatibility |"

  RELEASE_NOTES="## 📦 Still ${VERSION}

### Downloads

| APK | Architecture | Best for |
|-----|-------------|----------|
${APK_ROWS}

### Quick install (recommended)
\`\`\`bash
adb install Still-${VERSION}-arm64-v8a.apk
\`\`\`

> Minimum Android version: **7.0 (API 24)**"
fi

NOTES_FILE="${STAGING_DIR}/release-notes.md"
printf '%s' "$RELEASE_NOTES" > "$NOTES_FILE"

# ── Publish to GitHub Releases ────────────────────────────────────────────────
log_step "Publishing to GitHub Releases"

DRAFT_JSON="false"
[[ "$DRAFT" = true ]] && DRAFT_JSON="true"

if [[ "$USE_CURL" = true ]]; then
  # ── curl / GitHub REST API ─────────────────────────────────────────────────
  if [[ "$RELEASE_EXISTS" = false ]]; then
    log_info "Creating release via GitHub API..."

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

  for APK_PATH in "${UPLOAD_FILES[@]}"; do
    APK_NAME=$(basename "$APK_PATH")
    log_info "Uploading ${APK_NAME} ..."
    api_upload_asset "$UPLOAD_URL_BASE" "$APK_NAME" "$APK_PATH" > /dev/null
    log_success "Uploaded: ${APK_NAME}"
  done

else
  # ── gh CLI ────────────────────────────────────────────────────────────────
  if [[ "$RELEASE_EXISTS" = true ]]; then
    log_info "Uploading ${#UPLOAD_FILES[@]} APK(s) to existing release ${VERSION}..."
    gh release upload "$VERSION" "${UPLOAD_FILES[@]}" --clobber
    log_success "All assets uploaded"
  else
    log_info "Creating release ${VERSION} with ${#UPLOAD_FILES[@]} APK(s)..."
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
