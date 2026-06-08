# SheSafe — Claude Code Instructions

## Project Overview

SheSafe is a public-interest safety tool for accountability and civic trust. Built with Next.js + Firebase + Google Maps.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Backend:** Firebase (Auth, Firestore)
- **Maps:** Google Maps Platform
- **Deployment:** Vercel

## Commands

\`\`\`bash
npm run dev       # Development server
npm run build     # Production build
npm run lint      # ESLint
npm run typecheck # TypeScript type check
\`\`\`

## Architecture Constraints

1. **Guest-first.** Anonymous access is the default. Auth is optional.
2. **Safety-first.** Do not expose reporter identities.
3. **Public interest.** This is civic infrastructure, not a commercial product.

## Branch Naming

- \`feat/*\`, \`fix/*\`, \`docs/*\`, \`refactor/*\`, \`chore/*\`

## Workflow

1. Branch from \`main\`.
2. Run validation before every PR.
3. Open a PR for every merge. No direct pushes to \`main\`.
