#!/bin/bash

# =============================================================================
# PsycheGen Africa - Cross-Platform Setup Script
# Repository: https://github.com/dadaibidaponysc1234/psy
# Branch: prs-dev
# =============================================================================

set -e

# Colors for output (cross-platform compatible)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

REPO_URL="https://github.com/dadaibidaponysc1234/psy.git"
BRANCH="prs-dev"
FOLDER_NAME="psy"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 is installed ($(command -v $1))"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PsycheGen Africa - Setup Script                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Verify prerequisites
print_step "Checking prerequisites..."

MISSING_DEPS=0

if ! check_command "git"; then
    print_error "Git is required but not installed."
    print_warning "Please install Git: https://git-scm.com/downloads"
    MISSING_DEPS=1
fi

if ! check_command "node"; then
    print_error "Node.js is required but not installed."
    print_warning "Please install Node.js: https://nodejs.org/"
    MISSING_DEPS=1
else
    NODE_VERSION=$(node -v)
    print_success "Node.js version: $NODE_VERSION"
fi

if ! check_command "npm"; then
    print_error "npm is required but not installed."
    print_warning "npm usually comes with Node.js. Please reinstall Node.js."
    MISSING_DEPS=1
else
    NPM_VERSION=$(npm -v)
    print_success "npm version: $NPM_VERSION"
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    print_error "Missing dependencies. Please install them and run this script again."
    exit 1
fi

echo ""
print_success "All prerequisites are installed!"
echo ""

# Step 2: Check if we need to clone the repo
print_step "Checking project directory..."

CURRENT_DIR=$(pwd)
IN_PSY_FOLDER=false

# Check if we're already in the psy folder
if [ "$(basename "$CURRENT_DIR")" = "$FOLDER_NAME" ]; then
    IN_PSY_FOLDER=true
    print_success "Already in the '$FOLDER_NAME' folder"
fi

if [ "$IN_PSY_FOLDER" = false ]; then
    # Check if psy folder exists in current directory
    if [ -d "$FOLDER_NAME" ]; then
        print_success "'$FOLDER_NAME' folder already exists"
    else
        # Clone the repository
        print_step "Cloning repository from $REPO_URL..."
        git clone "$REPO_URL" "$FOLDER_NAME"
        print_success "Repository cloned successfully"
    fi
    
    # Change into the folder
    print_step "Entering '$FOLDER_NAME' directory..."
    cd "$FOLDER_NAME"
    print_success "Now in: $(pwd)"
fi

echo ""

# Step 3: Switch to the correct branch
print_step "Switching to branch '$BRANCH'..."

# Fetch all branches first
git fetch --all

# Check if branch exists locally
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git checkout "$BRANCH"
else
    # Branch doesn't exist locally, checkout from remote
    git checkout -b "$BRANCH" "origin/$BRANCH" 2>/dev/null || git checkout "$BRANCH"
fi

print_success "Switched to branch: $(git branch --show-current)"

# Step 4: Pull latest changes
print_step "Pulling latest changes from '$BRANCH'..."
git pull origin "$BRANCH"
print_success "Latest changes pulled"

echo ""

# Step 5: Install dependencies
print_step "Installing npm dependencies..."
npm install
print_success "Dependencies installed successfully"

echo ""

# Step 6: Setup complete
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Setup Complete! 🎉                         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "You can now start the development server with:"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
echo "Or use the start script:"
echo -e "  ${BLUE}./start-frontend.sh${NC}"
echo ""
echo "The app will be available at: http://localhost:7600"
echo ""
