# Review evidence — current architecture

## Scope

This report describes the current non-custodial EXIGENT deployment. Historical
payout-era evidence is retained only as historical evidence and is not a claim
about the current target-governance deployment.

## Production provenance

- Production URL: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_DDgwTdaGbVuR159gAWHHEMgjdp63`
- State: `READY`
- Frontend source reported by `/api/build-info`:
  `de43a81c11ff37141680dcea1113a094338fb943`
- Network: GenLayer Studionet, chain `61999`

The runtime endpoint binds the live alias, deployment ID, and frontend source
SHA. The final repository evidence commit is `b010917ffac4bea1518fac28d523986c01c4e61a`.

## Contract provenance

| Contract | Address | Source SHA-256 |
| --- | --- | --- |
| CharterRegistry | `0xcb07C70A9f27b885031ab09693eC9AB49FE29ad5` | `f2dd93241b0c8b3b7ef27abb1bb38e8aab3ee64dc113f804a97f2f40ac9b9bb0` |
| ExigencyEngine | `0x87Db5c9eBfe51c790572E77bEbe4e77A382f5234` | `54e13522bcc37d95e846356451aaaf688b778e2b0735fe088799afa23039cf72` |
| CapabilityGate | `0x3e3002E2955510171CC9e6373616a5e1A5439CA8` | `11eddb616884680a69d686940d5d3240f4fdc3d2c6f5399ff48f7b0a7e8bb5f2` |
| ProtectedVault | `0xA4b7b2B65CcC436c2CaE6e2d0fE66f45e9bBAbBb` | `3f70bb0a9ab3b71b7e49faef70a212108c424fc3f7ad3f550c9bcad28793d0d7` |

Security-fix source commit: [`34f97bee971fd4c0c750ab0dd8cf05ab48f191f2`](https://github.com/Bibidee/exigency/commit/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2)

The Gate → Engine bind transaction is
`0x96f44e3b856ef11d8a06248fa3a04c8ccdf50873bbffbe2726acf7f9d8fe3c25`.

Deployment transactions:

- CharterRegistry: `0xe52638d7b8fe19ea840cb9a629b6d9e7d313ca0c63cad222f09d64a43c5eb9dd`
- CapabilityGate: `0xa29fbfa7914c06a171c86b925cdd174455bce1725a91bc2cee1c32b4baba3f36`
- ExigencyEngine: `0x6ad9b583b8221280afdf1da97df95f47202382d7444897d202aa2b2c0a5bb90e`
- ProtectedVault: `0xee9c3856235cafc21359fbbeaeaf5d3386c19c5e1dc351e8b2c606ad95265d54`

## Steward authorization fix

Issue:
A wallet could previously create a fresh protocol key and charter pointing to
an existing protected target.

Resolution:
The target now binds governance independently. `ExigencyEngine` validates
target governance before issuing a capability, and `ProtectedVault` repeats
the authorization check before applying the capability.

The corrected source is available here:

- [Security-fix commit](https://github.com/Bibidee/exigency/commit/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2)
- [ExigencyEngine](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/exigency_engine.py)
- [CapabilityGate](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/capability_gate.py)
- [ProtectedVault](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/protected_vault.py)
- [Negative test](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/tests/direct/test_protected_vault.py)

Negative test:
`test_unrelated_wallet_cannot_pause_target_through_configured_gate`

Result: `PASS`

Creating a fresh protocol key does not grant authority over an existing
protected target. The target has its own governance address. The Engine
requires the charter owner to match target governance before capability
issuance, and the target independently checks the capability holder before
applying `PAUSE_PROTECTED_ACTION`.

## Current security boundary

`ProtectedVault` is deliberately non-custodial. It stores no user GEN and has
no deposit, withdrawal, external payout, refund, retry, or failed-payout
callback. The only protected operation is a unique direct-EOA action. A
finalized `PAUSE_PROTECTED_ACTION` capability can pause that action through the
Gate, and the pause expires on-chain.

## Current health evidence

Deployment health run: [37054512946](https://github.com/Bibidee/exigency/actions/runs/37054512946) — `SUCCESS`.

It verified production reachability for `/`, `/command`, and `/vault`,
Studionet RPC reachability, all four contract reads, target readability,
unpaused protected-target state, and `4/4` deployed-source byte matches.

Current live counts are intentionally empty on this fresh deployment:

- charters: `0`
- incidents: `0`
- capabilities: `0`
- protectedActionCount: `0`

## Historical pre-governance-fix lifecycle

The lifecycle records `CI-LIVE-1790816856`, `CI-INC-1790816856`, and
`EXC-CI-INC-1790816856` were executed against the previous deployment and are
retained only as historical evidence. They are not claimed as live proof of
the current target-governance deployment.

## Verification results

- Unit: 14 passed
- Direct Mode: 29 passed
- Browser: 9 passed
- Contract lint/validation: passed
- Typecheck: passed
- Build: passed
- Source verification: 4/4 exact byte matches

Exact-head CI: [37053963817](https://github.com/Bibidee/exigency/actions/runs/37053963817) — `SUCCESS`.

Browser mocks are gated out of production with
`process.env.NODE_ENV !== "production"`.

## Remaining limitations

- Five moderate transitive npm advisories remain; no forced incompatible
  upgrade was applied.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
- Per-validator HTTP status and content digest are fetch/audit provenance, not
  a claim that every validator returns byte-identical content.
