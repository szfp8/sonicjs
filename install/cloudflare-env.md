# Cloudflare Production Environment

## Required bindings

- D1 Database: `DB`
- R2 Bucket: `MEDIA_BUCKET`

## Required secrets

Set in Cloudflare Worker:

- `JWT_SECRET`
- `BETTER_AUTH_SECRET`

## Public variables

Example:

```text
ENVIRONMENT=production
SITE_NAME=全国财税发票服务
SITE_URL=https://your-domain.com
```

## First install flow

1. Connect GitHub repository to Cloudflare Workers
2. Deploy main branch
3. Create D1 migrations
4. Open `/auth/register`
5. Create first administrator
6. Login `/admin`

Domain is intentionally not fixed in repository. Add your own domain in Cloudflare after deployment.
