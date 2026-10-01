# Validation report

## Verdict scope

The current deployment is validated as a non-custodial emergency protected
action. It does not claim GEN deposits, payouts, refunds, or live failed-payout
recovery. The previous payout architecture was removed because the current
runtime does not provide a supported errored-message callback for safe value
transfer recovery.

## Deployed stack

- Network: Studionet 61999
- Registry: `0x2ecf811BbFB57cf34Fd55395A5793393Ae431441`
- Engine: `0x911Bef23368d88e994301BeA1988e753aB2fC2BA`
- Gate: `0xe77fdD519d4Dba4851701B3f1D498619c5b94b01`
- Protected target: `0xf7aB890a71D40d053453728bb2bA97e31207E3c8`
- Source commit for this deployed contract stack:
  `5e5ddd484087272560c977570e7bf58ad812262f`
- Source verification: 4/4 exact byte matches

`deploy/deployScript.ts` produces `deployment-manifest.generated.json` for a
fresh deployment. The committed `deployment-manifest.public.json` is the
verified public deployment record copied in after finality, provenance, and
source-hash confirmation. It contains the deployment and binding transactions.

## Current target checks

Direct Mode covers:

- Gate-only emergency pause;
- unique protected-action execution;
- replay rejection;
- direct sender/origin enforcement;
- pause and expiry behavior;
- duplicate capability idempotence;
- conflicting digest rejection;
- holder isolation;
- invalid-key rejection;
- absence of the unsupported payout/dead-callback surface.

The target stores no user value. Protected-action state transitions are
authoritative contract state, not browser state.

## Fresh live lifecycle

The latest clean live lifecycle used synthetic evidence and the owner CLI
account:

- Charter: `CI-LIVE-1790816856`
- Incident: `CI-INC-1790816856`
- Capability: `EXC-CI-INC-1790816856`
- before-pause action: accepted
- during-pause action: finalized with contract error
- after-expiry action: accepted
- after-expiry transaction:
  `0x5cf605b2996ba7e395a0c89a78b21ab6f4ec65a12d9a61b2a262fe5f6f8c7457`

Some intermediate hashes were not captured by the CLI output and remain
`NOT RECORDED`. No fabricated hash is used.

## Frontend

- Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Deployment: `dpl_GrWWPHSy4UWJTu7AdH4Vtyx3nrmg`
- Deployment state: `READY`
- Frontend source from `/api/build-info`:
  `920b81271bbcbee1b2512ffcd426a0828505209e`

The public build-info endpoint is the available deployment provenance source.

## Test results

Recorded current local results:

- Unit: 14 passed
- Direct Mode: 28 passed
- Browser: 9 passed
- Contract lint and validation: passed
- Typecheck: passed
- Build: passed

Browser mocks remain development/test-only and are not available in production.

## Limitations

- No live failed payout is attempted because the current target has no payout
  path; the safety decision is structural, not a fabricated failure proof.
- Five moderate transitive npm advisories remain; no unsafe forced upgrade was
  applied.
- Exact native Vercel Git metadata is not exported by the CLI; runtime
  `/api/build-info` reports the live deployment and source SHA.
- Some historical lifecycle hashes remain `NOT RECORDED`.
