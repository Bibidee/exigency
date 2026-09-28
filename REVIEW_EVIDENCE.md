# EXIGENT Review Evidence

This file records checks observed in the current workspace on 2026-09-28. It does not contain deployment or wallet claims.

## Local checks

- Repository path: `C:\Users\ojiku\Downloads\EXIGENT\exigent`
- Git remote: none configured; no commit SHA is available.
- Node: `v22.22.2`
- npm: `10.9.7`
- Local GenLayer CLI: `0.39.1` (`npx --no-install genlayer --version`)
- Toolchain guard: PASS (`npm run toolchain:check`)
- Frontend typecheck: PASS (`npm run typecheck`)
- Production build: PASS (`npm run build`)
- npm install: completed; npm reported 8 audit findings (5 moderate, 2 high, 1 critical).

## Contract and live-network checks

- Python executable: unavailable in this workspace; contract compilation, unit tests, Direct Mode, GenVM lint and GenVM validate are pending.
- Studionet deployment: not attempted; no wallet/account configuration was observed.
- Chain ID, RPC, contract addresses, deployment transactions, finality, runtime chain results, charter/capability/incident evidence and frontend URL: pending.

## Source changes made

- Hardened evidence URL authority validation against userinfo, ports, malformed host labels, control characters and backslashes.
- Rejected duplicate evidence URLs at incident creation.
- Added `npm run toolchain:check` and the `deploy:studionet` alias.
- Updated GenLayer JS calls to the installed 1.1.8 typings and constrained Next/Turbopack to the repository root.
