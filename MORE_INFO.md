# EXIGENT — Steward Authorization Correction

## Purpose

This note documents the correction requested by the Steward: a wallet must not
gain authority over an existing protected target merely by creating a new
protocol key and charter that points at that target.

## The defect

Before the correction, a fresh protocol key and charter could be created by an
unrelated wallet for an already deployed `ProtectedVault`. That made charter
ownership look sufficient even though the protected target had not authorized
the wallet or charter.

## The correction

The target now stores its own governance address at deployment time.

1. `ExigencyEngine` reads the target governance address before issuing a
   capability and requires the charter owner to match it.
2. `CapabilityGate` forwards the capability holder to the target.
3. `ProtectedVault` independently requires that holder to equal its governance
   address before applying `PAUSE_PROTECTED_ACTION`.
4. An incident may still reach a conclusive evidence assessment, but an
   unauthorized target is recorded as `ASSESSED_NO_AUTHORITY` and cannot issue
   a capability.

This creates defense in depth: registry/charter ownership is not treated as a
substitute for target-side authorization.

## Corrected source

- [Security-fix commit](https://github.com/Bibidee/exigency/commit/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2)
- [ExigencyEngine authorization check](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/exigency_engine.py)
- [CapabilityGate holder forwarding](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/capability_gate.py)
- [ProtectedVault target-side check](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/protected_vault.py)
- [Negative Direct Mode regression test](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/tests/direct/test_protected_vault.py)

Required negative test:

```text
test_unrelated_wallet_cannot_pause_target_through_configured_gate
```

Result: `PASS`.

## Current deployed target

The corrected source is deployed on Studionet (chain ID `61999`):

| Contract | Address |
| --- | --- |
| CharterRegistry | `0xcb07C70A9f27b885031ab09693eC9AB49FE29ad5` |
| ExigencyEngine | `0x87Db5c9eBfe51c790572E77bEbe4e77A382f5234` |
| CapabilityGate | `0x3e3002E2955510171CC9e6373616a5e1A5439CA8` |
| ProtectedVault | `0xA4b7b2B65CcC436c2CaE6e2d0fE66f45e9bBAbBb` |

Deployed source commit: `34f97bee971fd4c0c750ab0dd8cf05ab48f191f2`.

## Fresh live proof

A new owner-wallet run was performed against the current deployment:

- [Charter publish transaction](https://explorer-studio.genlayer.com/tx/0xd526a8dcb664edbb1c2fe2a155cb6a12f5a2aefb8357f72fe07a60693be8c383)
- [Finalized charter](https://exigency.vercel.app/charter/CHARTER-2026-01)
- [Charter activation transaction](https://explorer-studio.genlayer.com/tx/0xff177b82f8b6503e779553d5a9f3f3a9cdd04dccad7ff44cc201605e5ebb191a)
- [Incident freeze transaction](https://explorer-studio.genlayer.com/tx/0xdb51e435c62b345a9663562a4601b916dfa5fbb824a0615f2ab34a775a636492)
- [Finalized incident record](https://exigency.vercel.app/incident/INC-MURE6N85)

The live incident used two public repository evidence sources. GenLayer
returned `TRIGGER CONFIRMED` for the evidence, while the final incident state
was `ASSESSED NO AUTHORITY`. No capability was issued. This is the expected
security result when the requester has not satisfied the protected target's
independent governance boundary.

The assessment transaction hash was not exposed by the final incident view and
is intentionally not fabricated here.

## Interpretation

The evidence trigger and target authorization are separate checks:

```text
evidence supports an emergency
        +
target governance authorizes the requester
        =
capability may be issued
```

The fresh run proves that satisfying only the first condition cannot pause an
unrelated protected target.

## CI and health evidence

- [Exact-head CI](https://github.com/Bibidee/exigency/actions/runs/37056359979)
- [Deployment health](https://github.com/Bibidee/exigency/actions/runs/37054512946)
- [Production frontend](https://exigency.vercel.app/)

