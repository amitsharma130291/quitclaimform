# QuitclaimForm.com

State-compliant quitclaim deed generator. Free PDF download.

## Tech Stack

- **Framework:** Astro 4 (SSR, Vercel adapter)
- **Styling:** Tailwind CSS
- **PDF Generation:** PDFKit
- **Hosting:** Vercel

## Local Development

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:4321
```

## Environment Variables

| Variable | Description |
|---|---|
| `PUBLIC_SITE_URL` | Production URL (https://quitclaimform.com) |

## Deployment

Deploy to Vercel. Set environment variables in the Vercel dashboard.

## Build Plan

452-page programmatic SEO site. See `docs/build-order.md` for the full rollout plan.

- Week 1: 30 pages — core + top 4 states
- Week 2: 47 pages — situation hubs + 9 more states
- Week 3: 119 pages — state × situation matrix
- Week 4–5: 200+ pages — county pages + remaining states
- Weeks 9–12: 54 pages — informational cluster
