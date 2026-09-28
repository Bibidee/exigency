# EXIGENT Review Evidence

This file records checks observed in the current workspace on 2026-09-28. Missing live evidence is explicitly marked pending.

## Local checks

- Repository path: `C:\Users\ojiku\Downloads\EXIGENT\exigent`
- Git remote: `https://github.com/Bibidee/exigency.git`
- Final source commit: `fd1ac1c` (`wait for finalized Studionet receipts in frontend`)
- Node: `v22.22.2`
- npm: `10.9.7`
- Local GenLayer CLI: `0.39.1` (`npx --no-install genlayer --version`)
- Toolchain guard: PASS (`npm run toolchain:check`)
- Frontend typecheck: PASS (`npm run typecheck`)
- Production build: PASS (`npm run build`)
- npm install: completed; npm reported 8 audit findings (5 moderate, 2 high, 1 critical).

## Contract and live-network checks

- Python 3.12 workspace runtime: available.
- Unit tests: **10/10 PASS** (`.python312\\python.exe -m pytest tests/unit -q`).
- Direct Mode tests: **8/8 PASS** (`.python312\\python.exe -m pytest tests/direct -q`).
- GenVM lint: **PASS** for all four contracts (`genvm-lint 0.11.0`, stable runner pinned in source).
- GenVM validate: **PASS** for all four contracts.
- Studionet deployment manifest records chain **61999** and RPC `https://studio.genlayer.com/api`.
- Latest recorded contracts: CharterRegistry `0xfaf4C411E5b2A3CC294b451364D4C1E859e84456`; CapabilityGate `0x5499BF2A1f61Fb7697F6A5A26Cb21759aA4F97e7`; ExigencyEngine `0x98707314D124777966288b3895913B3D0211F69C`; ProtectedVault `0xD2624c1606E8E5DFE9a23A32742814e420bd836A`.
- Recorded finalized transactions: ExigencyEngine deployment `0x372bbc74e56d38b888cfd030074e87ba17f85bb77c7694a738ac1f58ae624587`; engine binding `0x428297cea1798ced79edb97ebe6d003c571ff0d40d14f097bd46bf958a0b2aab`; ProtectedVault deployment `0x21cb294527b4e7fc0f1ac5e59dfbe5dfac5b41294bbf774ced8db559b128c151`.
- `npm run source:verify`: RPC did not expose contract bytes during this run; no mismatch was observed, but exact-source provenance remains pending for all four contracts.
- Live charter/incident/capability/vault lifecycle evidence: **pending**.
- Production frontend: [https://exigency.vercel.app](https://exigency.vercel.app), HTTP 200 observed.

## Source changes made

- Hardened evidence URL authority validation against userinfo, ports, malformed host labels, control characters and backslashes.
- Rejected duplicate evidence URLs at incident creation.
- Added `npm run toolchain:check` and the `deploy:studionet` alias.
- Updated GenLayer JS calls to the installed 1.1.8 typings and constrained Next/Turbopack to the repository root.
