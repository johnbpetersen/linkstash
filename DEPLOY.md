# LinkStash Deployment Guide

This guide documents how to deploy LinkStash to GitHub Pages.

## Prerequisites

- Git installed locally
- GitHub account
- Repository with push access

## Current Repository Structure

LinkStash is currently a subdirectory within the clawd workspace. For GitHub Pages deployment, you have two options:

1. **Create a separate repository** (Recommended) — Copy the project to a new standalone repo
2. **Deploy from subdirectory** — Use GitHub Actions with custom config (more complex)

## Static Files for Deployment

LinkStash is a static site. Only these files are needed for the live site:

| File | Purpose |
|------|---------|
| `index.html` | Main application (HTML + embedded CSS + JS) |
| `links.json` | Data store (your bookmarks) |

All other files (`process.js`, `src/`, `tests/`, etc.) are for local development only.

## Deployment Options

### Option 1: GitHub Pages (Recommended)

GitHub Pages hosts static sites for free directly from your repository.

#### Initial Setup

1. **Create a GitHub repository**
   - Go to https://github.com/new
   - Name it `linkstash` (or your preferred name)
   - Keep it public (required for free GitHub Pages on free accounts)
   - Don't initialize with README (you already have files)

2. **Create a standalone project and push**
   
   Since LinkStash is currently inside the clawd workspace, create a fresh repo:
   
   ```bash
   # Create a new directory for the standalone repo
   mkdir ~/linkstash-deploy
   cd ~/linkstash-deploy
   
   # Initialize git
   git init
   
   # Copy the project files
   cp /home/node/clawd/projects/linkstash/index.html .
   cp /home/node/clawd/projects/linkstash/links.json .
   cp /home/node/clawd/projects/linkstash/process.js .
   cp -r /home/node/clawd/projects/linkstash/src .
   cp /home/node/clawd/projects/linkstash/package.json .
   cp /home/node/clawd/projects/linkstash/.gitignore .
   cp /home/node/clawd/projects/linkstash/README.md .
   touch input.txt
   
   # Commit
   git add .
   git commit -m "Initial commit: LinkStash v1.0.0"
   
   # Add remote and push
   git remote add origin https://github.com/YOUR_USERNAME/linkstash.git
   git branch -M main
   git push -u origin main
   ```
   
   **Or for a minimal static-only deploy** (just the site, no processing tools):
   ```bash
   mkdir ~/linkstash-deploy
   cd ~/linkstash-deploy
   git init
   cp /home/node/clawd/projects/linkstash/index.html .
   cp /home/node/clawd/projects/linkstash/links.json .
   git add .
   git commit -m "Initial commit: LinkStash static site"
   git remote add origin https://github.com/YOUR_USERNAME/linkstash.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages** (in the left sidebar)
   - Under "Source", select **Deploy from a branch**
   - Under "Branch", select **main** and **/ (root)**
   - Click **Save**

4. **Wait for deployment**
   - GitHub will build and deploy your site (usually 1-2 minutes)
   - Your site will be available at: `https://YOUR_USERNAME.github.io/linkstash/`

#### Subsequent Updates

After adding new links:

```bash
# 1. Add links to input.txt
echo "https://example.com/new-article" >> input.txt

# 2. Process them
node process.js

# 3. Commit and push
git add links.json
git commit -m "Add new links"
git push
```

GitHub Pages will automatically redeploy when you push to main.

### Option 2: Vercel (Alternative)

1. Go to https://vercel.com
2. Import your GitHub repository
3. Vercel auto-detects static sites — no configuration needed
4. Deploy

### Option 3: Netlify (Alternative)

1. Go to https://netlify.com
2. Drag and drop your project folder
3. Or connect to GitHub for automatic deploys

## Custom Domain (Optional)

To use a custom domain with GitHub Pages:

1. In your repo, create a file called `CNAME` with your domain:
   ```
   links.yourdomain.com
   ```

2. Configure your DNS:
   - Add a CNAME record pointing to `YOUR_USERNAME.github.io`
   - Or for apex domain, add A records pointing to GitHub's IPs

3. In GitHub Pages settings, enter your custom domain

## Troubleshooting

### Site shows 404
- Ensure `index.html` is in the root of your repository
- Check that GitHub Pages is enabled in Settings → Pages
- Wait a few minutes for initial deployment

### Links not updating
- Ensure you committed `links.json`
- Ensure you pushed to the correct branch
- Check GitHub Actions for deployment status

### CORS errors when loading links.json
- This shouldn't happen with same-origin requests
- If testing locally, use a local server: `npx serve .`

## Security Notes

- `links.json` is public — don't store private URLs
- `input.txt` should not be committed (already in .gitignore)
- Consider making the repo private if links are sensitive (requires GitHub Pro for Pages)

## Rollback

To rollback to a previous version:

```bash
# Find the commit to rollback to
git log --oneline

# Revert to that commit
git revert HEAD  # or specific commit hash

# Push the revert
git push
```

GitHub Pages will automatically deploy the reverted version.

---

## Quick Reference

| Action | Command |
|--------|---------|
| Add links | `echo "URL" >> input.txt && node process.js` |
| Deploy | `git add . && git commit -m "msg" && git push` |
| View site | `https://YOUR_USERNAME.github.io/linkstash/` |
| Local preview | `npx serve .` then open http://localhost:3000 |
