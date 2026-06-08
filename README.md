# SheSafe?

SheSafe? is an early-stage safety mapping concept built with Next.js. The project explores how a lightweight, community-oriented web app could help people record, browse, and reason about public safety signals without turning personal safety into surveillance theatre.

The current repository is still in MVP territory. This README defines the intended product direction, contribution boundaries, and longer-term roadmap so the project can grow with a clear philosophy instead of drifting into a generic map app.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Status: Early MVP](https://img.shields.io/badge/status-early%20MVP-yellow)](#current-direction)
[![Security Policy](https://img.shields.io/badge/security-policy-24292f)](SECURITY.md)
[![Contributions](https://img.shields.io/badge/contributions-careful%20PRs-2ea44f)](CONTRIBUTING.md)

## Quick Links

- [Development](#development)
- [Roadmap](#roadmap)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Support](SUPPORT.md)
- [License](LICENSE)

## Core Idea

SheSafe? should feel simple, humane, and careful:

- open a map
- understand nearby safety context
- drop a pin when something matters
- read community signals without panic language
- preserve user dignity and privacy

The goal is not to rank neighbourhoods, shame communities, or create fear loops. The goal is to create a calm public-interest tool for situational awareness.

## Product Principles

- **Safety without surveillance**: avoid invasive tracking, background location harvesting, or unnecessary identity collection.
- **Community signals over authority theatre**: prioritize transparent user-submitted context, moderation, and clear uncertainty.
- **Privacy by default**: collect the least possible data and avoid making exact personal movement histories visible.
- **Careful language**: avoid fear-based wording, sensational alerts, or hostile category labels.
- **Useful even when quiet**: empty states should educate and guide, not make the app feel broken.

## Current Direction

The MVP should focus on:

- map-first interface
- pin submission flow
- safety category selection
- contextual notes
- basic moderation boundaries
- mobile-first interaction
- clear empty states
- accessible layout and touch targets

## Roadmap

### Near-Term

- **Guest-first map experience** — let visitors explore the core map before account creation.
- **Drop-pin interaction polish** — clear crosshair/drop mode, confirmation states, and mobile bottom-sheet behaviour.
- **Safety category system** — structured categories for safe, mixed, and unsafe signals without inflammatory wording.
- **Pin detail panel** — readable card with category, time, context, and community notes.
- **Empty-state education** — explain what the app is for when there are no nearby pins yet.
- **Mobile-first layout** — thumb-friendly controls, safe-area handling, and uncluttered map surfaces.
- **Basic abuse prevention** — rate limits, duplicate prevention, and reporting hooks.

### Mid-Term

- **Moderation dashboard** — review flagged pins, remove harmful content, and document moderation actions.
- **Trust-weighted signals** — distinguish fresh, repeated, and disputed reports without pretending the app has perfect truth.
- **Privacy-preserving location handling** — fuzz exact coordinates where appropriate and avoid storing unnecessary user movement data.
- **Neighbourhood context layers** — optional public context such as lighting, transit access, open businesses, and safe public spaces.
- **Incident lifecycle states** — active, stale, resolved, disputed, and archived pins.
- **Accessibility pass** — keyboard navigation, screen-reader labels, reduced-motion support, and high-contrast map controls.
- **Open data export** — anonymized, privacy-reviewed exports for community analysis and transparency.

### Long-Term Vision

- **Community safety commons** — a public-interest safety layer that cities, campuses, neighbourhood groups, and individuals can inspect and self-host.
- **Offline-first emergency mode** — cache nearby safety context, trusted places, and basic guidance for poor connectivity situations.
- **Verified community stewards** — optional steward roles for local volunteers or organizations, without making identity mandatory for basic use.
- **Transparent governance logs** — publish moderation and policy changes in a way the community can audit.
- **Interoperable safety signals** — import/export standards so SheSafe? can cooperate with other civic tools instead of trapping data.

## Optional Web3 / Base Direction

Any Web3 direction should support proof, integrity, and portability. It should not turn SheSafe? into a token product.

Possible Base-powered features:

- **Public integrity snapshots** — periodically anchor a hash of the public pin dataset or moderation log on Base so the community can verify that historical records were not silently rewritten.
- **Steward attestations** — allow trusted community stewards to sign public safety updates with a wallet, proving who made a statement without requiring every user to connect a wallet.
- **Portable reputation receipts** — optional, privacy-preserving credentials for moderators or civic partners.
- **Open governance records** — anchor policy updates, data schema changes, and major moderation rule changes as verifiable public records.

What should never happen:

- no token speculation
- no wallet required to view safety information
- no public doxxing of users
- no storing personal reports directly onchain
- no permanent publication of sensitive personal details

Base, if used, should be invisible infrastructure for integrity and public accountability.

## Future Philosophy

SheSafe? belongs to a broader family of calm, privacy-minded tools:

- local-first and privacy-preserving where possible
- public proof without public exposure
- user ownership over platform lock-in
- careful software for real human situations
- optional decentralized infrastructure, never forced speculation

The app should become useful before it becomes ambitious. The map, language, privacy model, and moderation design matter more than any chain integration.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Tech Stack

- Next.js
- TypeScript
- React
- Vercel-ready deployment

## Contributing

Contributions should preserve the project’s safety and privacy boundaries. For UI changes, include screenshots. For data, map, moderation, or identity changes, explain the privacy and abuse implications clearly.

---

*Last updated: June 2026*
