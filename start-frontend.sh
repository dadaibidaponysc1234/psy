#!/bin/bash

# =============================================================================
# PsycheGen Africa - Start Script
# Starts the development server
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FOLDER_NAME="psy"

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PsycheGen Africa - Starting Development Server        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we need to cd into psy folder
CURRENT_DIR=$(pwd)

if [ "$(basename "$CURRENT_DIR")" = "$FOLDER_NAME" ]; then
    print_success "Already in '$FOLDER_NAME' directory"
elif [ -d "$FOLDER_NAME" ]; then
    print_step "Entering '$FOLDER_NAME' directory..."
    cd "$FOLDER_NAME"
    print_success "Now in: $(pwd)"
else
    # Check if package.json exists in current directory (we might be in the right place with different folder name)
    if [ -f "package.json" ]; then
        print_success "Found package.json in current directory"
    else
        print_error "'$FOLDER_NAME' directory not found and no package.json in current directory"
        print_error "Please run setup-frontend.sh first or navigate to the project directory"
        exit 1
    fi
fi

# Verify npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js first."
    exit 1
fi

# Verify package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the right directory?"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_step "node_modules not found. Installing dependencies first..."
    npm install
    print_success "Dependencies installed"
fi

echo ""
print_step "Starting development server..."
echo ""
echo "The app will be available at: http://localhost:7600"
echo "Press Ctrl+C to stop the server"
echo ""

# Start the dev server
npm run dev
