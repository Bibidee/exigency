# EXIGENT final handoff

## Current status

The final architecture is a non-custodial protected-action target. The former
GEN deposit, asynchronous payout, refund, retry, and errored-message recovery
surface was removed because the deployed GenVM runtime does not provide a
supported contract callback for failed external value transfers. The target
stores no user funds and emits no external payout.

Current repository branch: `main` (see the exact final HEAD in the release
report and Git history).

Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)

Vercel deployment: `dpl_GrWWPHSy4UWJTu7AdH4Vtyx3nrmg` (`READY`)

The production `/api/build-info` endpoint reports deployment
`dpl_GrWWPHSy4UWJTu7AdH4Vtyx3nrmg` and frontend source
`920b81271bbcbee1b2512ffcd426a0828505209e`. This is the available runtime
provenance binding; the Vercel CLI does not expose a stronger native mapping.

## Current contracts

| Contract | Address |
| --- | --- |
| CharterRegistry | `0x2ecf811BbFB57cf34Fd55395A5793393Ae431441` |
| ExigencyEngine | `0x911Bef23368d88e994301BeA1988e753aB2fC2BA` |
| CapabilityGate | `0xe77fdD519d4Dba4851701B3f1D498619c5b94b01` |
| ProtectedVault | `0xf7aB890a71D40d053453728bb2bA97e31207E3c8` |

Network: Studionet 61999. The clean deployment and engine binding are recorded
in `deployment-manifest.public.json`. `npm run source:verify` reports exact
byte matches for all four contracts.

## Protected target model

- A direct EOA can execute a unique protected action while it is open.
- A finalized capability can pause that action through `CapabilityGate`.
- The pause is bounded and expires according to contract time.
- Replays, wrong callers, conflicting capability digests, and writes during the
  pause are rejected.
- There is no payable deposit, payout, refund, withdrawal, or user-value
  accounting path.

The live lifecycle created fresh synthetic records and proved the full
authority path. The latest recorded lifecycle keys are:

- Charter: `CI-LIVE-1790816856`
- Incident: `CI-INC-1790816856`
- Capability: `EXC-CI-INC-1790816856`
- Protected action before pause: `LIVE-ACTION-1790816856-BEFORE`
- Protected action during pause: submitted and finalized with contract error
- Protected action after expiry: `LIVE-ACTION-1790816856-AFTER`
- After-expiry transaction: `0x5cf605b2996ba7e395a0c89a78b21ab6f4ec65a12d9a61b2a262fe5f6f8c7457`

Some intermediate lifecycle transaction hashes were not retained by the live
CLI output and remain `NOT RECORDED`; no hashes are invented here.

## Test baseline

Current local baseline after the redesign:

- Unit: 14 passed
- Direct Mode: 28 passed
- Browser: 9 passed
- Contract lint and validation: passed
- Typecheck: passed
- Production build: passed

Browser mocks are test-only and unavailable in production code paths; all
`__EXIGENT_E2E_MOCK__` behavior is gated away from production.

## Limitations

- Live failed-payout recovery is not a feature because the target no longer
  transfers or custodies GEN. Its safety property is enforced structurally by
  removing the unsupported value-transfer surface.
- Five moderate transitive npm advisories remain; no unsafe forced upgrade was
  applied. The production dependency tree has no high or critical finding.
- Some historical authority transaction hashes remain `NOT RECORDED`.

These limitations are explicit and do not represent a claim of live payout
recovery.
