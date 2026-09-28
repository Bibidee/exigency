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
- Latest unit tests after CLI/web compatibility fixes: **13/13 PASS**.
- Direct Mode tests: **8/8 PASS** (`.python312\\python.exe -m pytest tests/direct -q`).
- GenVM lint: **PASS** for all four contracts (`genvm-lint 0.11.0`, stable runner pinned in source).
- GenVM validate: **PASS** for all four contracts.
- Studionet deployment manifest records chain **61999** and RPC `https://studio.genlayer.com/api`.
- Latest finalized contracts: CharterRegistry `0xbC3df1EE4f14E4299C6268fAC378C3428Fb9108C`; CapabilityGate `0xFBd92c2Ff5a20C542Ca816e022Cd9D4Fd3aC6d16`; ExigencyEngine `0xfB3EDA439F6C6317eA5e67e293dBE65FAeC38F00`; ProtectedVault `0x7358b12f497Cb6CFA72B77ab9DB4F28B4f406338`.
- Latest deployment transaction hashes: CharterRegistry `0x04798736df438cba4a44eddba18d5e9495767abc4cb7ce800454f3315223d22d`; CapabilityGate `0x483fc059a87531a2859db1c4bf13b1181d96c6eaba9973e10c0d251bc529d076`; ExigencyEngine `0x1310fd69a272cf5294719e841fb0a73126229963f11b9da912c54b537c394627`; ProtectedVault `0x81886516882c70b27139e1665409c911f892c2024577aba61d46b4c3bcc5b020`; engine binding `0xa4f140a6965494748333cb14ad86073c43b45ec34beb668738420f1d9fd75a54`. All were observed finalized by the deploy script.
- Recorded finalized transactions: ExigencyEngine deployment `0x372bbc74e56d38b888cfd030074e87ba17f85bb77c7694a738ac1f58ae624587`; engine binding `0x428297cea1798ced79edb97ebe6d003c571ff0d40d14f097bd46bf958a0b2aab`; ProtectedVault deployment `0x21cb294527b4e7fc0f1ac5e59dfbe5dfac5b41294bbf774ced8db559b128c151`.
- `npm run source:verify`: RPC did not expose contract bytes during this run; no mismatch was observed, but exact-source provenance remains pending for all four contracts.
- Live charter/incident/capability/vault lifecycle evidence: **pending**.
- Negative live lifecycle observed on the preceding corrected stack: charter `LIVE-20260928020032` published in finalized tx `0xd5c1205fa19079792adbd83d7e018512fde1e7261c9f19d165041d3f2dc22b85`, early activation rejected in finalized tx `0xf8e5a62c9c606f190335d9c37f01bebfe879ea38fa3284a05dab70c7f53a4a66`, activation succeeded in `0x9a28e49a37f4f1fec9f818a436a8cabcd5f423c9c648ea4e0e5e4abd9f4d1643`, incident `INC-LIVE-2026092801` opened in `0xd66358cf05d7b522211a72595c1854137723ad1236f0c02aa47c0474ec4d4af6`, and assessment finalized in `0x592973680b86146231ab2225df1b062b23ac49493e46e3308a81870142db148d` as `INSUFFICIENT_EVIDENCE`. The stored source state was `UNAVAILABLE` with HTTP status `0`; capability list remained empty and vault pause state remained false. This is genuine no-authority evidence, not a positive emergency authorization.
- Live defect fixed after that run: stable Studionet web responses required status/body compatibility handling; the corrected engine is the latest deployment above. A positive lifecycle must be rerun against this latest stack.
- `gltest tests/integration -v -s --network studionet`: harness selected Studionet `61999` correctly, but collected **0 tests** because `tests/integration` is not yet present; this is not counted as a pass.
- Production frontend: [https://exigency.vercel.app](https://exigency.vercel.app), HTTP 200 observed.

## Source changes made

- Hardened evidence URL authority validation against userinfo, ports, malformed host labels, control characters and backslashes.
- Rejected duplicate evidence URLs at incident creation.
- Added `npm run toolchain:check` and the `deploy:studionet` alias.
- Updated GenLayer JS calls to the installed 1.1.8 typings and constrained Next/Turbopack to the repository root.
