#!/bin/bash

# Script untuk bump version dengan mudah
# Usage: ./scripts/bump-version.sh [patch|minor|major]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"

# Get bump type from argument or ask user
if [ -z "$1" ]; then
    echo ""
    echo "Select version bump type:"
    echo "1) patch (bug fixes)        - ${CURRENT_VERSION} → $(npm version patch --dry-run | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')"
    echo "2) minor (new features)     - ${CURRENT_VERSION} → $(npm version minor --dry-run | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')"
    echo "3) major (breaking changes) - ${CURRENT_VERSION} → $(npm version major --dry-run | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')"
    echo ""
    read -p "Enter choice [1-3]: " choice
    
    case $choice in
        1) BUMP_TYPE="patch" ;;
        2) BUMP_TYPE="minor" ;;
        3) BUMP_TYPE="major" ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
else
    BUMP_TYPE=$1
fi

# Validate bump type
if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${YELLOW}Invalid bump type. Use: patch, minor, or major${NC}"
    exit 1
fi

# Check if there are uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    read -p "Do you want to commit them first? (y/n): " commit_choice
    
    if [ "$commit_choice" = "y" ]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
    fi
fi

# Bump version
echo -e "${BLUE}Bumping version...${NC}"
NEW_VERSION=$(npm version $BUMP_TYPE)

echo -e "${GREEN}✓ Version bumped to ${NEW_VERSION}${NC}"

# Ask to push
read -p "Push to remote with tags? (y/n): " push_choice

if [ "$push_choice" = "y" ]; then
    echo -e "${BLUE}Pushing to remote...${NC}"
    git push && git push --tags
    echo -e "${GREEN}✓ Pushed successfully${NC}"
fi

echo ""
echo -e "${GREEN}Done! New version: ${NEW_VERSION}${NC}"
echo -e "${BLUE}Don't forget to:${NC}"
echo "  1. Update CHANGELOG.md"
echo "  2. Build and deploy: npm run build"
echo "  3. Test the new version"
