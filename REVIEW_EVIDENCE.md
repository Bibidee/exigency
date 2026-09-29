# EXIGENT Review Evidence

## Authoritative current update — 2026-09-29

- Final source commit: `5ed405608ce9270e0ca8afedf3f7672048462751`.
- GitHub Actions run `36624668894` passed for that exact commit: Python/unit/direct tests, contract validation, frontend typecheck/build, and Playwright browser regression.
- Current finalized Studionet 61999 manifest: CharterRegistry `0x2e15E71e7bE2a94Df6763E4813a6561d26279a6F`; CapabilityGate `0xB1507D80C042F1741e2374819A26b3C4278d17E9`; ExigencyEngine `0x862146D4F97b3c8B7b7a2498E71F8f098252EcC8`; ProtectedVault `0x340910f52eaB0c3eB8a861C0C4feAA460AaFeBAA`.
- Current deployment transactions and exact deployed-source SHA-256 values are recorded in `deployment-manifest.public.json`; `npm run source:verify` passed with exact byte matches.
- Public Vercel deployment `dpl_FCXr28DkQPgpuzX8dtQ6tigvDXuG` is READY and unauthenticated. Brave verified `/`, `/command`, and `/vault`; `/command` reads the current four addresses and Studionet 61999, and `/vault` reports open deposits/withdrawals with zero credits on the fresh vault.
- Deployment health monitoring is configured in `.github/workflows/health.yml` on a six-hour schedule and checks all public routes, RPC wiring, and deployed sources.
- The live funded deposit/withdrawal proof remains the previously observed account-authorized run; no new financial write was initiated during this remediation pass.

This file records checks observed in the current workspace on 2026-09-28. Missing live evidence is explicitly marked pending. The manually observed positive lifecycle is recorded separately from the opt-in automated lifecycle test; the latter requires a funded, unlocked account and can be delayed by Studionet finality.

## Current verification update (2026-09-28)

- Vault crash root cause found by Brave console trace: `get_credit` was returned by the RPC as a serialized numeric value, while `app/vault/page.tsx` formatted it as a native `bigint`; the mixed arithmetic threw `Cannot mix BigInt and other types`. The fix normalizes the contract result with `BigInt(...)` in `lib/contracts.ts`.
- Wallet restore was also hardened: the restore effect now has stable listener lifetime, verifies active `eth_accounts`, handles account/network changes, and no longer depends on an inline callback identity. Vault reads now use explicit `LOADING`, `READY`, and `UNKNOWN / READ FAILED` state and disable writes until authoritative state is loaded.
- Hardened evidence assessment to reject model-labelled support without a successful non-empty 2xx source response and to expose both head and tail excerpts when source bodies exceed 6,000 characters.
- Source verification now fails closed with `UNVERIFIED` when any deployed source cannot be retrieved; it no longer reports success for partial checks.

- Final source commits: `65afdf8` added the repository preflight gate; `bc39a9b` made generated deployment manifests optional for source-only CI checkouts.
- GitHub Actions run `36468578851` passed all three jobs: Python/preflight/unit/direct, contract lint/validate, and frontend typecheck/build.
- The preflight gate passed locally and in CI. It enforces Studionet 61999, the stable CLI/SDK pins, and rejects forbidden preview-network or committed-key markers.
- A fresh four-contract Studionet deployment completed with all deployment and binding transactions finalized: CharterRegistry `0xBAeB7D6B7dC560A3b7AeaCdBA96c29c46BE6dB21`; CapabilityGate `0xa7181624F1cbFaedDeefb8Ff5811AF4Ee660357e`; ExigencyEngine `0xD312EbD571fD3353870098F902b1bdafA7457cA1`; ProtectedVault `0x3778A8b18B0DF4288464DF6A745F5569668bdE1D`; bind-engine transaction `0x690d58cbb13272bf9de545b4ef0fbe02554446bac0f669508a6ba394be87f1f4`.
- `npm run source:verify` now passes for all four current addresses with exact byte matches. SHA-256 values: Registry `a8a8619b5882c7b82611bbbb9bb4c2c60d68670348a21ecfde4d6d18fcf3e638`; Engine `937c25d5345a8890c23ccc968d49d7425d3506a933f72e27f35ccd4750a0bcef`; Gate `028325b29f6eebfb2fe31fd863514f355370167ed33a3af55b7db213d3d68c6a`; Vault `ed91a37f70d0f341ef1af367476fd3869316b165fa7ab389631250dadc208025`.
- Vercel production deployment `dpl_98ABkummouzyatSdWPqebGc4gCy8` reached READY, the public alias was updated, and `/`, `/command`, and `/vault` each returned HTTP 200. Brave browser walkthrough loaded all three routes without the Vercel login or generic page-load screen.
- The scheduled deployment-health workflow remains configured to check all three public routes and the Studionet RPC every six hours.
- Latest audited Vercel deployment `dpl_6QJP6ufNjnh66NnVUFn52bN4HbET` is READY and aliased to `exigency.vercel.app`; Brave loaded `/vault` after the fix without a crash and showed the connected account plus authoritative `OPEN` state.
- Automated live write lifecycle and live payable deposit/withdrawal coverage remain opt-in/account-specific; no new financial transaction was initiated from the browser during this verification.

## Local checks

- Repository path: `C:\Users\ojiku\Downloads\EXIGENT\exigent`
- Git remote: `https://github.com/Bibidee/exigency.git`
- Final source commit: `17654be` (`avoid unsupported wallet snaps handshake`)
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
- Newest deployment after CapabilityGate compatibility fix: CharterRegistry `0x39A43D2D5794b8D045b2a10ddd81De238DD65A46`; CapabilityGate `0xf7c424a46Aa63F33Ca1b7F852566b318b548c619`; ExigencyEngine `0xb872aFf0A3E769A0EAfD6DD61fBA8D717d2b4319`; ProtectedVault `0x0D328549612835CbdC7e5CE3EC2267b13Ce86996`; binding tx `0xecd51d5e76d1e96255b446478f0ec874918579eb5e60656494df70b99e1cbb7a`. Deployment txs were observed finalized by the deploy script.
- Recorded finalized transactions: ExigencyEngine deployment `0x372bbc74e56d38b888cfd030074e87ba17f85bb77c7694a738ac1f58ae624587`; engine binding `0x428297cea1798ced79edb97ebe6d003c571ff0d40d14f097bd46bf958a0b2aab`; ProtectedVault deployment `0x21cb294527b4e7fc0f1ac5e59dfbe5dfac5b41294bbf774ced8db559b128c151`.
- `npm run source:verify`: RPC did not expose contract bytes during this run; no mismatch was observed, but exact-source provenance remains pending for all four contracts.
- Automated live write lifecycle: implemented in `tests/integration/test_exigent_studionet.py`, opt-in with `EXIGENT_RUN_LIVE_LIFECYCLE=1`; a completed run is not claimed here because the latest attempt stalled while waiting for an external Studionet receipt to finalize.
- Negative live lifecycle observed on the preceding corrected stack: charter `LIVE-20260928020032` published in finalized tx `0xd5c1205fa19079792adbd83d7e018512fde1e7261c9f19d165041d3f2dc22b85`, early activation rejected in finalized tx `0xf8e5a62c9c606f190335d9c37f01bebfe879ea38fa3284a05dab70c7f53a4a66`, activation succeeded in `0x9a28e49a37f4f1fec9f818a436a8cabcd5f423c9c648ea4e0e5e4abd9f4d1643`, incident `INC-LIVE-2026092801` opened in `0xd66358cf05d7b522211a72595c1854137723ad1236f0c02aa47c0474ec4d4af6`, and assessment finalized in `0x592973680b86146231ab2225df1b062b23ac49493e46e3308a81870142db148d` as `INSUFFICIENT_EVIDENCE`. The stored source state was `UNAVAILABLE` with HTTP status `0`; capability list remained empty and vault pause state remained false. This is genuine no-authority evidence, not a positive emergency authorization.
- Latest-stack direct ProtectedVault bypass attempt finalized in rejection tx `0x14244c4c8594413d43caf266393848cbce61b445d268f7169bcfe2ae4056f4c7`; the ordinary active wallet was not authorized to pause withdrawals.
- Positive-demo attempt on the latest stack: charter `POS-20260928021117` publication finalized in `0xed0fad0192e564177e9ad6ac1f11377a18fc4a613afc45a7c7711466797f22ab`; early activation was rejected in `0xf47a85f15b12c6fca17f54fdd73ec58ee7f0aa4c36d9ffbc00942b55190e3f2d`; activation succeeded in `0x1874500946d6ccd8a063d6249037b700b94d0058db91c955f9b5ef5a926c041e`; incident `POS-INC-2026092801` opened in `0x791a8e590ae48be1a882d55fdda469bda4a568b3e03027080333030a12ddd369`. Assessment `0x25112619d59110c864ec7a8f7eb908d81276f758c884a2acacbedbfdd02e3f29` finalized `UNDETERMINED` after validator disagreement; incident remained `OPEN` and capability list stayed empty. This is failure-closed evidence, not positive authority.
- Full positive lifecycle on the newest stack: charter `RAWFINAL-20260928022808` published in `0x2b3de3a15f087cea0d9ab8b393a75b3bac1d1af846af9de1792f2433482b1095`; activation finalized in `0x1e60197251775b48d80da2171e738c16d4f34196be0d9b34aab635fa225150e4`; incident `RAWFINAL-INC-2026092801` opened in `0x8bca09ad663a53656602ad7d1a064872ceaee3094859feed2a9d8fcbad64881c`; assessment `0x931542d5d6eef5505ba4867bbd43ded9e22f0bd2946aee3286b4843e2fe9ab1b` finalized `TRIGGER_CONFIRMED` with HTTP 200, `SUPPORTS_TRIGGER`, content digest `229d9a64f91cd2db3cd30410c9dede0bf007125099f676311f1e4ed0edc18f34`, and evidence commitment `5476913f4cf88200b3b9cbedb3fff4f9653cd8c8a276a5eda7f1913c7088eff5`. Capability child `0x94a71687f7dd8fe7b125c1dc76dc2cd8088a206810275f7b4d5de69d8fa0e457` finalized and issued `EXC-RAWFINAL-INC-2026092801`; execution tx `0x8ef23eacf2a3bc416d43741ffdb7be4ed84b069d9af5d95bccac1e2c69100ab3` finalized; ProtectedVault child `0xff0bcaa3ed8d8ad773921de0538ed9f1da3206bc01b27ac15c9241f488b44c80` finalized; vault state showed `withdrawals_paused: true` with `effective_until: 1790559435`; capability record showed `consumed: true`; replay tx `0x975a56eeced563ede1d8e519717029faa6300d9d53e112cb325abd2551af4f0d` finalized with `capability already consumed`.
- Live defect fixed after that run: stable Studionet web responses required status/body compatibility handling; the corrected engine is the latest deployment above. The manually observed positive lifecycle above demonstrates the corrected authority path; the automated opt-in run remains separately pending finality completion.
- Historical pre-test run: `gltest tests/integration -v -s --network studionet` selected Studionet `61999` but collected **0 tests** because the integration directory was not yet present; it was not counted as a pass.
- Latest exact `gltest tests/integration -v -s --network studionet`: **1 passed**; the live test verified the manifest chain/RPC and read the deployed CharterRegistry and ProtectedVault state.
- Production frontend: [https://exigency.vercel.app](https://exigency.vercel.app), HTTP 200 observed.
- Production frontend redeployment: latest linked Vercel deployment `dpl_BttnN7MmKF6TRhKM46thGV2LaJRo` reached READY; `https://exigency.vercel.app`, `/command`, and `/vault` each returned HTTP 200 after the alias update.
- Latest wallet-compatible Vercel deployment: `dpl_CYtPEaeSy18PLduDimysamc3qSjj` reached READY and `https://exigency.vercel.app` was aliased to it. Browser verification confirmed the wallet controls retain the connected address instead of displaying `[object Object]`; the provider no longer invokes unsupported `wallet_getSnaps` during connection or writes.
- GitHub Actions for commits `2429783`, `7a98a5a`, and `17654be`: all completed successfully across Python, contract-validation, and frontend jobs.
- Latest `npm run source:verify`: **PASS**. All four deployed SHA-256 values exactly matched repository source bytes: CharterRegistry `a8a8619b5882c7b82611bbbb9bb4c2c60d68670348a21ecfde4d6d18fcf3e638`; ExigencyEngine `937c25d5345a8890c23ccc968d49d7425d3506a933f72e27f35ccd4750a0bcef`; CapabilityGate `028325b29f6eebfb2fe31fd863514f355370167ed33a3af55b7db213d3d68c6a`; ProtectedVault `76953de7cc9b6cca9af8e6902d700a97ed68a14c60d6465e32eff0509a912a49`.

## Source changes made

- Hardened evidence URL authority validation against userinfo, ports, malformed host labels, control characters and backslashes.
- Rejected duplicate evidence URLs at incident creation.
- Added `npm run toolchain:check` and the `deploy:studionet` alias.
- Updated GenLayer JS calls to the installed 1.1.8 typings and constrained Next/Turbopack to the repository root.
