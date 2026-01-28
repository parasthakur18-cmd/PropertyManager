# GitHub Actions Deployment Setup

This repository includes **two deployment workflows**:

1. **`deploy.yml`** - Full deployment with file transfer (recommended for first-time setup)
2. **`deploy-simple.yml`** - Simple git pull deployment (faster, requires git setup on VPS)

Both workflows automatically deploy your application to your VPS when you push to the `main` branch.

## Setup Instructions

### 1. Generate SSH Key Pair (if you don't have one)

On your **local machine**:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```

This creates:
- `~/.ssh/github_actions_deploy` (private key - keep secret!)
- `~/.ssh/github_actions_deploy.pub` (public key - add to VPS)

### 2. Add Public Key to VPS

Copy the public key to your VPS:

```bash
# On your local machine
cat ~/.ssh/github_actions_deploy.pub | ssh root@72.62.199.34 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
```

Or manually:
1. Copy the content of `~/.ssh/github_actions_deploy.pub`
2. SSH into your VPS: `ssh root@72.62.199.34`
3. Run: `nano ~/.ssh/authorized_keys`
4. Paste the public key at the end
5. Save and exit
6. Run: `chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh`

### 3. Add GitHub Secrets

Go to your GitHub repository:
1. Click **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `VPS_HOST` | `72.62.199.34` | Your VPS IP address |
| `VPS_USER` | `root` | SSH username |
| `VPS_SSH_KEY` | Contents of `~/.ssh/github_actions_deploy` (private key) | Your private SSH key |
| `VPS_PORT` | `22` | SSH port (optional, defaults to 22) |

**To get the private key content:**
```bash
cat ~/.ssh/github_actions_deploy
```
Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

### 4. Setup Git on VPS (for Simple Workflow)

If using `deploy-simple.yml`, ensure git is configured on your VPS:

```bash
# SSH into VPS
ssh root@72.62.199.34

# Navigate to app directory
cd /var/www/myapp

# If repo is not a git repo, initialize it:
git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
# OR if using SSH:
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git

# Pull code
git pull origin main
```

**For private repos**, you'll need to set up SSH keys or use a personal access token:
- SSH: Add VPS public key to GitHub (Settings → SSH and GPG keys)
- HTTPS: Use a personal access token as password

### 5. Test the Workflow

1. Push to `main` branch:
   ```bash
   git add .
   git commit -m "Add GitHub Actions deployment"
   git push origin main
   ```

2. Or trigger manually:
   - Go to **Actions** tab in GitHub
   - Click **Deploy to VPS** workflow
   - Click **Run workflow** → **Run workflow**

## What Each Workflow Does

### `deploy.yml` (Full Deployment)
1. ✅ Checks out your code
2. ✅ Installs Node.js dependencies
3. ✅ Builds the application (`npm run build`)
4. ✅ Creates a deployment archive
5. ✅ Uploads to VPS via SCP
6. ✅ Extracts files on VPS
7. ✅ Installs production dependencies
8. ✅ Restarts PM2
9. ✅ Runs health checks
10. ✅ Shows deployment status

### `deploy-simple.yml` (Simple Git Pull)
1. ✅ Connects to VPS via SSH
2. ✅ Pulls latest code from GitHub
3. ✅ Cleans and rebuilds (`npm run build`)
4. ✅ Restarts PM2
5. ✅ Shows deployment status

**Recommendation:** Use `deploy-simple.yml` if your VPS already has git configured. It's faster and simpler.

## Troubleshooting

### SSH Connection Fails
- Verify SSH key is added to VPS: `ssh -i ~/.ssh/github_actions_deploy root@72.62.199.34`
- Check VPS firewall allows SSH (port 22)
- Verify `VPS_HOST`, `VPS_USER`, and `VPS_SSH_KEY` secrets are correct

### Deployment Fails
- Check PM2 logs: `pm2 logs propertymanager`
- Verify app directory exists: `/var/www/myapp`
- Check file permissions: `ls -la /var/www/myapp`

### Build Fails
- Check Node.js version matches (workflow uses Node 20)
- Verify all dependencies are in `package.json`
- Check build logs in GitHub Actions

## Manual Deployment (Alternative)

If you prefer to deploy manually, you can still use the same commands:

```bash
cd /var/www/myapp
git pull origin main
rm -rf dist
npm ci
npm run build
pm2 restart propertymanager --update-env
```
