#!/bin/bash
set -e

# iOS xcodebuild wrapper — orchestrates content generation, validation, and builds
# Usage:
#   xcodebuild-wrapper.sh <app|all|info> [debug|release] [scheme-override]
#   xcodebuild-wrapper.sh ppl debug      # Debug build for PPL
#   xcodebuild-wrapper.sh all release    # Release builds for all three apps
#   xcodebuild-wrapper.sh info           # Print environment info

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
APP="${1:-info}"
CONFIGURATION="${2:-debug}"
SCHEME_OVERRIDE="${3:-}"

# Supported apps
APPS=("ppl" "elpt" "aip")

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check Xcode
  if ! xcode-select -p &> /dev/null; then
    log_error "Xcode Command Line Tools not installed"
    echo "  Run: xcode-select --install"
    exit 1
  fi

  # Check xcodebuild
  if ! command -v xcodebuild &> /dev/null; then
    log_error "xcodebuild not found"
    exit 1
  fi

  # Check swift
  if ! command -v swift &> /dev/null; then
    log_error "swift not found"
    exit 1
  fi

  # Check Node.js for content generation
  if ! command -v node &> /dev/null; then
    log_error "Node.js not found"
    exit 1
  fi

  log_success "All prerequisites met"
}

# Print system info
print_info() {
  log_info "iOS Build Environment"
  echo "  Xcode: $(xcodebuild -version | head -n 1)"
  echo "  Swift: $(swift --version | head -n 1)"
  echo "  iOS Support: $(xcode-select -p)/Platforms/iPhoneOS.platform/Developer/SDKs"
  echo "  FlyGACA Apps: ppl, elpt, aip"
  echo ""
  echo "Available commands:"
  echo "  npm run ios:build:ppl              # Debug build PPL app"
  echo "  npm run ios:build:elpt             # Debug build ELPT app"
  echo "  npm run ios:build:aip              # Debug build AIP app"
  echo "  npm run ios:build:all              # Debug builds all apps"
  echo "  npm run ios:build:release:ppl      # Release build PPL"
  echo "  npm run ios:test                   # Run Swift Package tests"
  echo "  npm run ios:test:watch             # Watch mode for tests"
  echo "  npm run ios:clean                  # Clean build artifacts"
}

# Generate content for an app
generate_content() {
  local app=$1
  log_info "Generating content for $app..."

  if [ ! -f "$PROJECT_ROOT/scripts/build-ios-content.mjs" ]; then
    log_error "Content generation script not found: $PROJECT_ROOT/scripts/build-ios-content.mjs"
    exit 1
  fi

  if ! node "$PROJECT_ROOT/scripts/build-ios-content.mjs" --app "$app"; then
    log_error "Content generation failed for $app"
    exit 1
  fi

  log_success "Content generated for $app"
}

# Build an app via xcodebuild
build_app() {
  local app=$1
  local config=$2

  # Map app name to scheme and bundle ID
  case "$app" in
    ppl)
      SCHEME="PPL"
      BUNDLE_ID="com.flygaca.ppl"
      MODULE_ID="ppl-exam"
      ;;
    elpt)
      SCHEME="ELPT"
      BUNDLE_ID="com.flygaca.elpt"
      MODULE_ID="elpt-exam"
      ;;
    aip)
      SCHEME="AIP"
      BUNDLE_ID="com.flygaca.aip"
      MODULE_ID="aip-exam"
      ;;
    *)
      log_error "Unknown app: $app"
      return 1
      ;;
  esac

  # Use override scheme if provided
  if [ -n "$SCHEME_OVERRIDE" ]; then
    SCHEME="$SCHEME_OVERRIDE"
  fi

  # Normalize configuration
  if [ "$config" = "release" ] || [ "$config" = "Release" ]; then
    CONFIG_NAME="Release"
  else
    CONFIG_NAME="Debug"
  fi

  log_info "Building $app ($CONFIG_NAME)..."
  echo "  Scheme: $SCHEME"
  echo "  Config: $CONFIG_NAME"
  echo "  Bundle ID: $BUNDLE_ID"

  # Check if Xcode project exists
  XCODE_PROJECT="$PROJECT_ROOT/apple/FlyGACA.xcodeproj"
  if [ ! -d "$XCODE_PROJECT" ]; then
    log_error "Xcode project not found at $XCODE_PROJECT"
    echo ""
    echo "To create the project locally:"
    echo "  1. cd apple/"
    echo "  2. Follow setup steps in apple/README.md"
    echo "  3. Create Xcode project: File → New → Project"
    echo "  4. Configure build settings per docs"
    exit 1
  fi

  # Run xcodebuild
  local build_start=$(date +%s)

  if [ "$CONFIG_NAME" = "Release" ]; then
    # Archive for Release builds (enables dSYM extraction)
    local archive_path="$PROJECT_ROOT/apple/.build/${SCHEME}-${CONFIG_NAME}.xcarchive"

    if ! xcodebuild \
      -project "$XCODE_PROJECT" \
      -scheme "$SCHEME" \
      -configuration "$CONFIG_NAME" \
      -archivePath "$archive_path" \
      -arch arm64 \
      -sdk iphoneos \
      archive; then
      log_error "Archive failed for $app"
      return 1
    fi

    # Extract dSYMs from archive for crash reporting
    local dsyms_dir="$PROJECT_ROOT/apple/.build/dSYMs"
    mkdir -p "$dsyms_dir"

    if [ -d "$archive_path/dSYMs" ]; then
      cp -r "$archive_path/dSYMs"/* "$dsyms_dir/" 2>/dev/null || true
      log_success "dSYMs extracted to $dsyms_dir"
    fi
  else
    # Build for Debug configuration
    if ! xcodebuild \
      -project "$XCODE_PROJECT" \
      -scheme "$SCHEME" \
      -configuration "$CONFIG_NAME" \
      -derivedDataPath "$PROJECT_ROOT/apple/.build" \
      -arch arm64 \
      -sdk iphoneos \
      build; then
      log_error "Build failed for $app"
      return 1
    fi
  fi

  local build_end=$(date +%s)
  local build_time=$((build_end - build_start))

  log_success "Build succeeded for $app (${build_time}s)"
}

# Main logic
main() {
  case "$APP" in
    info)
      print_info
      ;;
    all)
      check_prerequisites
      for app in "${APPS[@]}"; do
        generate_content "$app"
        build_app "$app" "$CONFIGURATION" || exit 1
      done
      log_success "All builds completed successfully"
      ;;
    ppl|elpt|aip)
      check_prerequisites
      generate_content "$APP"
      build_app "$APP" "$CONFIGURATION" || exit 1
      ;;
    *)
      log_error "Unknown app: $APP"
      echo ""
      echo "Usage: $0 <app|all|info> [debug|release]"
      echo ""
      echo "Apps: ppl, elpt, aip, all"
      echo "Config: debug (default), release"
      exit 1
      ;;
  esac
}

# Run main
main
