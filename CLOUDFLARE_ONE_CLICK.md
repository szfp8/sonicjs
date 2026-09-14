# Cloudflare one-click deployment

This repository contains a production-oriented SonicJS application plus a small SEO layer for a tax/invoice information website.

## What was changed

- Removed the old hard-coded Cloudflare account, D1, KV and R2 identifiers from the app config.
- Added a Windows `START_HERE.bat` launcher.
- Added an interactive Wrangler setup script that uses the user's own Cloudflare login.
- Uses an existing D1 database and applies pending migrations remotely.
- Keeps the admin password out of GitHub and out of deployment scripts.
- Adds 314 crawlable city landing pages under `/city/<city-name>`.
- Adds `/robots.txt` and `/sitemap.xml`.
- Adds `/news` with the content workflow: `来源 + 原创解读 + 企业实际价值`.
- Adds `/contact` and D1-backed lead capture at `POST /api/lead`.
- Adds admin collections for SEO articles and city pages.
- Adds optional IndexNow notification support.
- Adds a GitHub Actions production deployment workflow.
- Adds a six-hour Cron Trigger for maintenance/IndexNow notifications.

## Windows: easiest path

1. Download/clone this repository to the Windows computer.
2. Make sure Node.js 20 LTS or newer is installed.
3. Double-click `START_HERE.bat`.
4. The first run opens Cloudflare login in a browser if Wrangler is not already logged in.
5. Enter your Worker name, domain, and existing D1 database name.
6. The script discovers the D1 ID, applies migrations, deploys the Worker and configures the custom domain.
7. Finish the SonicJS admin first-run setup and choose your own admin credentials.

The script never asks for or stores your admin password.

## Important Cloudflare behavior

The deployment uses a Worker Custom Domain. Cloudflare creates the DNS record and certificate for the custom domain when the Worker is attached to it. If the hostname already has an incompatible CNAME record, remove/adjust that record before deploying the Custom Domain.

## GitHub Actions

The workflow `.github/workflows/deploy-cloudflare-production.yml` supports `workflow_dispatch` and pushes to `main`.

For GitHub Actions, add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `D1_DATABASE_ID`
- `D1_DATABASE_NAME`
- `SITE_URL`
- `SITE_NAME`
- `CONTACT_PHONE` (optional)
- `INDEXNOW_KEY` (optional)

Local Windows deployment does not require GitHub Actions secrets; it uses Wrangler OAuth login.

## Production content rules

The public SEO layer is intentionally written for lawful tax and invoice workflows. It does not provide fake transaction, false invoice, invoice trading, or other illegal tax-evasion functionality.

For policy/news content, use the structure:

> 来源 + 原创解读 + 企业实际价值

Do not mass-publish copied or fabricated policy text. Verify important policy claims against the latest official source before publishing.
