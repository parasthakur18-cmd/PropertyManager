#!/bin/bash
# Setup script for VPS to enable GitHub Actions deployment
# Run this on your VPS: bash scripts/setup-vps-for-deployment.sh

set -e

echo "🚀 Setting up VPS for GitHub Actions deployment..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (use sudo)"
  exit 1
fi

APP_DIR="/var/www/myapp"
GITHUB_REPO_URL="${1:-}" # Pass GitHub repo URL as first argument

if [ -z "$GITHUB_REPO_URL" ]; then
  echo "⚠️  No GitHub repo URL provided."
  echo "Usage: bash scripts/setup-vps-for-deployment.sh https://github.com/USERNAME/REPO.git"
  echo ""
  read -p "Enter your GitHub repo URL (or press Enter to skip): " GITHUB_REPO_URL
fi

# Navigate to app directory
cd "$APP_DIR" || {
  echo "❌ Directory $APP_DIR does not exist!"
  exit 1
}

# Install git if not present
if ! command -v git &> /dev/null; then
  echo "📥 Installing git..."
  apt-get update
  apt-get install -y git
fi

# Setup git repository
if [ ! -d ".git" ]; then
  echo "📦 Initializing git repository..."
  git init
  git config user.name "VPS Deploy"
  git config user.email "deploy@vps.local"
  
  if [ -n "$GITHUB_REPO_URL" ]; then
    git remote add origin "$GITHUB_REPO_URL" 2>/dev/null || git remote set-url origin "$GITHUB_REPO_URL"
    echo "✅ Git remote configured: $GITHUB_REPO_URL"
  else
    echo "⚠️  Git repo initialized but no remote URL set."
    echo "   Run: git remote add origin YOUR_GITHUB_REPO_URL"
  fi
else
  echo "✅ Git repository already exists"
  if [ -n "$GITHUB_REPO_URL" ]; then
    git remote set-url origin "$GITHUB_REPO_URL" 2>/dev/null || git remote add origin "$GITHUB_REPO_URL"
    echo "✅ Git remote updated: $GITHUB_REPO_URL"
  fi
fi

# Setup SSH for GitHub (if using SSH URLs)
if [[ "$GITHUB_REPO_URL" == git@* ]]; then
  echo "🔑 Setting up SSH key for GitHub..."
  
  if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo "📝 Generating SSH key..."
    ssh-keygen -t ed25519 -C "vps-deploy" -f ~/.ssh/id_rsa -N ""
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 Add this SSH public key to GitHub:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cat ~/.ssh/id_rsa.pub
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Go to: https://github.com/settings/keys"
  echo "2. Click 'New SSH key'"
  echo "3. Paste the key above"
  echo "4. Click 'Add SSH key'"
  echo ""
  read -p "Press Enter after adding the key to GitHub..."
fi

# Test git connection
if [ -n "$GITHUB_REPO_URL" ]; then
  echo "🧪 Testing git connection..."
  git fetch origin || {
    echo "⚠️  Git fetch failed. Make sure:"
    echo "   - Repository URL is correct"
    echo "   - SSH key is added to GitHub (if using SSH)"
    echo "   - Repository is accessible"
  }
fi

# Ensure .gitignore excludes sensitive files
if [ ! -f .gitignore ] || ! grep -q "\.env" .gitignore 2>/dev/null; then
  echo "📝 Updating .gitignore..."
  cat >> .gitignore << 'EOF'

# Environment files (should not be in git)
.env
.env.local
.env.production
*.env

# Logs
logs/
*.log

# PM2
.pm2/
EOF
  echo "✅ .gitignore updated"
fi

# Create logs directory if it doesn't exist
mkdir -p logs
chmod 755 logs

echo ""
echo "✅ VPS setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add GitHub Secrets (see .github/workflows/README.md):"
echo "   - VPS_HOST: $(hostname -I | awk '{print $1}')"
echo "   - VPS_USER: $(whoami)"
echo "   - VPS_SSH_KEY: (your private SSH key)"
echo ""
echo "2. Test deployment by pushing to main branch"
echo "   or trigger manually from GitHub Actions tab"
