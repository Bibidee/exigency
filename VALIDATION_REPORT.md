# Validation report

## Verdict scope

The current deployment is validated as a non-custodial emergency protected
action. It does not claim GEN deposits, payouts, refunds, or live failed-payout
recovery. The target stores no user value and has no external payout path.

## Deployed stack

- Network: Studionet 61999
- Registry: `0xcb07C70A9f27b885031ab09693eC9AB49FE29ad5`
- Engine: `0x87Db5c9eBfe51c790572E77bEbe4e77A382f5234`
- Gate: `0x3e3002E2955510171CC9e6373616a5e1A5439CA8`
- Protected target: `0xA4b7b2B65CcC436c2CaE6e2d0fE66f45e9bBAbBb`
- Source commit for this deployed contract stack:
  `34f97bee971fd4c0c750ab0dd8cf05ab48f191f2`
- Source verification: 4/4 exact byte matches

The committed `deployment-manifest.public.json` is the authoritative current
deployment record.

## Steward authorization fix

Creating a fresh protocol key does not grant authority over an existing
protected target. `ProtectedVault` stores its deployment wallet as governance.
`ExigencyEngine` requires the charter owner to match target governance before
capability issuance. `ProtectedVault` independently verifies the capability
holder against governance before applying the emergency pause.

Negative test:
`test_unrelated_wallet_cannot_pause_target_through_configured_gate`

Result: `PASS`.

Corrected source: [security-fix commit](https://github.com/Bibidee/exigency/commit/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2).

## Current target checks

Direct Mode covers Gate-only emergency pause, unique protected-action
execution, replay rejection, direct sender/origin enforcement, pause and
expiry behavior, duplicate capability idempotence, conflicting digest
rejection, holder isolation, invalid-key rejection, and the unrelated-wallet
governance rejection.

## Current health evidence

Deployment health run: [37054512946](https://github.com/Bibidee/exigency/actions/runs/37054512946) — `SUCCESS`.

It verified `/`, `/command`, and `/vault`, Studionet RPC, chain ID `61999`, all
four contract reads, protected-target readability, an unpaused target, and
`4/4` deployed source byte matches.

Current counts on this fresh deployment are:

- charters: `0`
- incidents: `0`
- capabilities: `0`
- protectedActionCount: `0`

## Historical pre-governance-fix lifecycle

The lifecycle records `CI-LIVE-1790816856`, `CI-INC-1790816856`, and
`EXC-CI-INC-1790816856` belong to the previous deployment. They are retained
only as historical evidence and are not claimed as live proof of the current
target-governance deployment. Missing intermediate hashes remain
`NOT RECORDED`.

## Frontend

- Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Deployment: `dpl_DDgwTdaGbVuR159gAWHHEMgjdp63`
- Deployment state: `READY`
- Frontend source from `/api/build-info`:
  `de43a81c11ff37141680dcea1113a094338fb943`

## Test results

- Unit: 14 passed
- Direct Mode: 29 passed
- Browser: 9 passed
- Contract lint and validation: passed
- Typecheck: passed
- Build: passed

Exact-head CI: [37053963817](https://github.com/Bibidee/exigency/actions/runs/37053963817) — `SUCCESS`.

Browser mocks remain development/test-only and are not available in production.

## Limitations

- No live failed payout is attempted because the current target has no payout
  path; the safety decision is structural, not a fabricated failure proof.
- Five moderate transitive npm advisories remain; no unsafe forced upgrade was
  applied.
- Some historical lifecycle hashes remain `NOT RECORDED`.
