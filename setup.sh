#!/bin/bash

# Agent Tools Setup Script
# =========================
# One-time setup script for team members to configure their environment
# for the AI Agent Tools (Jira & Azure DevOps CLI tools)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "\n${BOLD}${BLUE}$1${NC}"
    echo "============================================"
}

# Get the proper home directory path (works in Git Bash, WSL, and Unix)
get_home_dir() {
    # Use USERPROFILE on Windows (Git Bash), HOME elsewhere
    echo "${USERPROFILE:-$HOME}" | sed 's|\\|/|g' | sed 's|^\([A-Za-z]\):|/\L\1|'
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_PATH="$SCRIPT_DIR/scripts"

show_help() {
    cat << 'EOF'
Agent Tools Setup Script
========================

This script sets up the AI Agent Tools environment for team members.
It configures PATH, installs dependencies, and updates CLAUDE.md documentation.

USAGE:
    ./setup.sh [OPTIONS]

OPTIONS:
    --help, -h          Show this help message
    --dry-run           Show what would be done without making changes
    --skip-path         Skip PATH configuration
    --skip-claude       Skip CLAUDE.md documentation update
    --force             Force overwrite existing configurations

WHAT THIS SCRIPT DOES:
    1. Install Bun dependencies (bun install)
    2. Add scripts/ directory to PATH via ~/.bashrc
    3. Update global CLAUDE.md with latest tool documentation
    4. Create sample .vars file for credentials (optional)
    5. Verify installation

REQUIREMENTS:
    - Bash environment (Git Bash, WSL, Linux, macOS)
    - Bun runtime (will be checked/prompted for installation)
    - Write access to ~/.bashrc and ~/.claude/ directory

EXAMPLES:
    # Normal setup
    ./setup.sh

    # Preview changes without applying them
    ./setup.sh --dry-run

    # Setup without modifying PATH
    ./setup.sh --skip-path

POST-SETUP:
    1. Restart your terminal or run: source ~/.bashrc
    2. Configure credentials in ~/.vars file
    3. Test with: jira-search.sh --help

For more information, see the README.md file.
EOF
}

# Parse command line arguments
DRY_RUN=false
SKIP_PATH=false
SKIP_CLAUDE=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-path)
            SKIP_PATH=true
            shift
            ;;
        --skip-claude)
            SKIP_CLAUDE=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

main() {
    log_header "AI Agent Tools Setup"

    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN MODE - No changes will be made"
        echo
    fi

    # Get home directory
    HOME_DIR=$(get_home_dir)
    log_info "Home directory: $HOME_DIR"
    echo

    # Check prerequisites
    log_header "Checking Prerequisites"

    # Check for bun
    if ! command -v bun &> /dev/null; then
        log_error "Bun is required but not installed."
        log_info "Install it with: curl -fsSL https://bun.sh/install | bash"
        log_info "Then restart your terminal and run this script again."
        exit 1
    else
        local bun_version=$(bun --version)
        log_success "Bun found: v$bun_version"
    fi

    # Verify project structure
    if [[ ! -d "$SCRIPTS_PATH" ]]; then
        log_error "Scripts directory not found: $SCRIPTS_PATH"
        exit 1
    fi
    log_success "Scripts directory found: $SCRIPTS_PATH"

    if [[ ! -f "$SCRIPT_DIR/STUB_CLAUDE.md" ]]; then
        log_error "STUB_CLAUDE.md not found in project root"
        exit 1
    fi
    log_success "STUB_CLAUDE.md found"
    echo

    # Install dependencies
    log_header "Installing Dependencies"
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Would run: bun install"
    else
        log_info "Running: bun install"
        cd "$SCRIPT_DIR"
        if bun install; then
            log_success "Dependencies installed successfully"
        else
            log_error "Failed to install dependencies"
            exit 1
        fi
    fi
    echo

    # Configure PATH
    if [[ "$SKIP_PATH" == true ]]; then
        log_header "Skipping PATH Configuration"
    else
        log_header "Configuring PATH"
        configure_path
    fi
    echo

    # Update CLAUDE.md
    if [[ "$SKIP_CLAUDE" == true ]]; then
        log_header "Skipping CLAUDE.md Update"
    else
        log_header "Updating CLAUDE.md Documentation"
        update_claude_docs
    fi
    echo

    # Create sample .vars file
    log_header "Creating Sample Credentials File"
    create_sample_vars
    echo

    # Verify installation
    log_header "Verifying Installation"
    verify_installation
    echo

    # Final instructions
    log_header "Setup Complete!"
    show_final_instructions
}

configure_path() {
    local bashrc_path="$HOME_DIR/.bashrc"
    local path_export="export PATH=\"$SCRIPTS_PATH:\$PATH\""

    log_info "Configuring PATH in: $bashrc_path"

    # Check if already configured
    if [[ -f "$bashrc_path" ]] && grep -q "<agent-tools>" "$bashrc_path" 2>/dev/null; then
        if [[ "$FORCE" == true ]]; then
            log_warning "PATH already configured, but --force specified"
        else
            log_warning "PATH already appears to be configured"
            log_info "Use --force to overwrite existing configuration"
            return 0
        fi
    fi

    if [[ "$DRY_RUN" == true ]]; then
        log_info "Would add to $bashrc_path:"
        echo "  # <agent-tools>"
        echo "  $path_export"
        echo "  # </agent-tools>"
        return 0
    fi

    # Create .bashrc if it doesn't exist
    if [[ ! -f "$bashrc_path" ]]; then
        log_info "Creating new .bashrc file"
        touch "$bashrc_path"
    fi

    # Remove existing agent-tools block if force is specified
    if [[ "$FORCE" == true ]]; then
        log_info "Removing existing AI Agent Tools configuration"
        # Remove everything between <agent-tools> and </agent-tools> tags
        sed -i '/<agent-tools>/,/<\/agent-tools>/d' "$bashrc_path" 2>/dev/null || true
    fi

    # Add new configuration with tags
    echo "" >> "$bashrc_path"
    echo "# <agent-tools>" >> "$bashrc_path"
    echo "$path_export" >> "$bashrc_path"
    echo "# </agent-tools>" >> "$bashrc_path"

    log_success "PATH configured successfully"
    log_info "Added: $SCRIPTS_PATH"
}

update_claude_docs() {
    local claude_dir="$HOME_DIR/.claude"
    local claude_file="$claude_dir/CLAUDE.md"

    # Create .claude directory if it doesn't exist
    if [[ ! -d "$claude_dir" ]]; then
        if [[ "$DRY_RUN" == true ]]; then
            log_info "Would create directory: $claude_dir"
        else
            log_info "Creating directory: $claude_dir"
            mkdir -p "$claude_dir"
        fi
    fi

    # Create CLAUDE.md if it doesn't exist
    if [[ ! -f "$claude_file" ]]; then
        if [[ "$DRY_RUN" == true ]]; then
            log_info "Would create: $claude_file"
            log_info "Would copy STUB_CLAUDE.md content wrapped in <agent-tools> tags"
        else
            log_info "Creating new CLAUDE.md file"
            cat > "$claude_file" << 'EOF'
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this environment.

<agent-tools>
</agent-tools>
EOF
            log_success "Created: $claude_file"
        fi
    fi

    # Update using the existing update-claude-docs script
    if [[ "$DRY_RUN" == true ]]; then
        log_info "Would run: bun run src/update-claude-docs.ts"
        log_info "This would update CLAUDE.md with latest tool documentation"
    else
        log_info "Updating CLAUDE.md with latest documentation..."
        cd "$SCRIPT_DIR"
        if bun run src/update-claude-docs.ts "$claude_file"; then
            log_success "CLAUDE.md updated successfully"
        else
            log_error "Failed to update CLAUDE.md"
            return 1
        fi
    fi
}

create_sample_vars() {
    local vars_file="$HOME_DIR/.vars"

    if [[ -f "$vars_file" ]] && [[ "$FORCE" != true ]]; then
        log_info "~/.vars file already exists"
        log_info "Use --force to overwrite existing file"
        return 0
    fi

    if [[ "$DRY_RUN" == true ]]; then
        log_info "Would create sample .vars file at: $vars_file"
        return 0
    fi

    log_info "Creating sample .vars file: $vars_file"

    cat > "$vars_file" << 'EOF'
# AI Agent Tools Configuration
# ============================
# Copy this file and configure with your actual credentials
# Then run: source ~/.vars

# Jira Configuration
export JIRA_URL="https://your-company.atlassian.net"
export JIRA_EMAIL="your-email@company.com"
export JIRA_API_TOKEN="your-jira-api-token-here"

# Azure DevOps Configuration
export AZURE_DEVOPS_ORG_URL="https://dev.azure.com/yourorg"
export AZURE_DEVOPS_PAT="your-azure-devops-pat-here"
export AZURE_DEVOPS_AUTH_METHOD="pat"
export AZURE_DEVOPS_DEFAULT_PROJECT="YourProject"

# Load credentials
# Uncomment the following lines and configure with your actual values:
# source ~/.vars
EOF

    log_success "Sample .vars file created"
    log_warning "Remember to configure actual credentials before using the tools"
}

verify_installation() {
    local failed=false

    # Check if scripts are accessible
    log_info "Checking script accessibility..."

    # We need to source bashrc to get the new PATH in this session
    if [[ -f "$HOME_DIR/.bashrc" ]]; then
        # shellcheck source=/dev/null
        set +u  # Temporarily allow undefined variables
        source "$HOME_DIR/.bashrc" 2>/dev/null || true
        set -u
    fi

    # Test if we can find the scripts
    local test_script="$SCRIPTS_PATH/jira-search.sh"
    if [[ -f "$test_script" ]] && [[ -x "$test_script" ]]; then
        log_success "Scripts found and executable"

        # Try to run help command
        if [[ "$DRY_RUN" == false ]]; then
            log_info "Testing script execution..."
            if "$test_script" --help >/dev/null 2>&1; then
                log_success "Scripts execute successfully"
            else
                log_warning "Scripts found but may have runtime issues"
                log_info "This is normal if credentials are not configured yet"
            fi
        fi
    else
        log_error "Scripts not found or not executable"
        failed=true
    fi

    # Check CLAUDE.md
    local claude_file="$HOME_DIR/.claude/CLAUDE.md"
    if [[ -f "$claude_file" ]]; then
        log_success "CLAUDE.md exists and should be updated"
    else
        log_warning "CLAUDE.md not found (this may be expected in dry-run mode)"
    fi

    if [[ "$failed" == true ]]; then
        log_error "Installation verification failed"
        return 1
    else
        log_success "Installation verification passed"
        return 0
    fi
}

show_final_instructions() {
    cat << EOF
${GREEN}Setup completed successfully!${NC}

${BOLD}Next Steps:${NC}
1. Restart your terminal or run: ${BLUE}source ~/.bashrc${NC}
2. Configure your credentials in: ${BLUE}~/.vars${NC}
3. Load credentials: ${BLUE}source ~/.vars${NC}
4. Test the installation: ${BLUE}jira-search.sh --help${NC}

${BOLD}Available Commands:${NC}
  ${BLUE}jira-search.sh${NC}           - Search Jira tickets
  ${BLUE}jira-get-ticket.sh${NC}       - Get ticket details
  ${BLUE}jira-comment.sh${NC}          - Add comments to tickets
  ${BLUE}jira-get-comments.sh${NC}     - Get ticket comments
  ${BLUE}ado-list-prs.sh${NC}          - List Azure DevOps PRs
  ${BLUE}ado-get-pr-comments.sh${NC}   - Get PR comments
  ${BLUE}update-claude-docs.sh${NC}    - Update CLAUDE.md documentation

${BOLD}Documentation:${NC}
- Each script supports ${BLUE}--help${NC} for detailed usage information
- See README.md for comprehensive documentation
- Your global CLAUDE.md has been updated with tool documentation

${BOLD}Credential Setup:${NC}
- Jira API Token: https://id.atlassian.com/manage-profile/security/api-tokens
- Azure DevOps PAT: https://dev.azure.com/yourorg/_usersSettings/tokens

${YELLOW}Note: These tools are designed specifically for AI coding agents like Claude Code${NC}
EOF
}

# Run main function
main "$@"