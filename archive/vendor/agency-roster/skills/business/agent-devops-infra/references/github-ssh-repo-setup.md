# GitHub SSH Key + Repo Setup from VPS

## SSH Key Setup
```bash
# Generate ed25519 key (no passphrase for automation)
ssh-keygen -t ed25519 -C "ziri@github" -f ~/.ssh/id_ed25519 -N ""

# Display public key (copy ENTIRE line, one single line)
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: https://github.com/settings/ssh/new
# Title: "VPS Odin", Key type: Authentication Key

# Test connection
ssh -T git@github.com -o StrictHostKeyChecking=accept-new
# Expected: "Hi ziri22! You've successfully authenticated"
```

## ⚠️ Telegram copy-paste corruption
Telegram can corrupt SSH keys:
- `l` (lowercase L) → `1` (digit one)
- Single line → split into multiple lines
- Always verify: after pasting in GitHub, test with `ssh -T git@github.com`

## PAT Token for API Push
```bash
# Create token: https://github.com/settings/tokens/new
# Permissions: repo (full control)
# Use in remote URL:
git remote add origin https://<TOKEN>@github.com/ziri22/<repo>.git

# IMPORTANT: Clean bash history after token use
history -c; rm -f ~/.bash_history
```

## Repo Creation + Push
```bash
# Create repo via API
curl -X POST https://api.github.com/user/repos \
  -H "Authorization: token <PAT>" \
  -d '{"name":"agency-roster","description":"...","public":true}'

# Init and push
cd /tmp/<repo>
git init && git add -A && git commit -m "Initial commit"
git remote add origin https://<PAT>@github.com/ziri22/<repo>.git
git branch -M main && git push -u origin main
```

## Accounts
- GitHub: ziri22 (SSH ed25519 configured)
- Repos: https://github.com/ziri22/agency-roster