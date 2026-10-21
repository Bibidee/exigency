# EXIGENT — V2 authorization and evidence notes

## Purpose

This note records the Steward-requested authorization correction and the
current V2 evidence boundary.

## Correction

A fresh protocol key and charter cannot grant authority over an existing
protected target. The target stores its governance address at deployment.

1. `ExigencyEngine` checks target governance before issuing a capability.
2. `CapabilityGate` forwards the capability holder to the target.
3. `ProtectedVault` and `ProtectedRoute` independently require that holder to
   equal target governance before applying their bounded actions.
4. An evidence-positive but unauthorized target is recorded without authority
   and cannot issue an applicable capability.

The original correction is preserved in the historical security-fix commit:

- [Security-fix commit](https://github.com/Bibidee/exigency/commit/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2)
- [Engine authorization check](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/exigency_engine.py)
- [Gate holder forwarding](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/capability_gate.py)
- [Vault target-side check](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/contracts/protected_vault.py)
- [Negative regression test](https://github.com/Bibidee/exigency/blob/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2/tests/direct/test_protected_vault.py)

Required test: `test_unrelated_wallet_cannot_pause_target_through_configured_gate` — `PASS`.

## Current deployed V2 stack

Studionet chain `61999`:

| Contract | Address |
| --- | --- |
| CharterRegistry | `0xA4dba5B0572B3D721955Ce3A9E3dc46F791e4C92` |
| ExigencyEngine | `0x903f895E256817aBFE97f101292B94F85d0b59BA` |
| CapabilityGate | `0xE383404e8C00868A86BD412F4e72Cb13328Ed2EF` |
| ProtectedVault | `0xF3dC371E50c296c6Ef1067eAe95104F864F391B3` |
| ProtectedRoute | `0x7217760864796a1CaeDAaFB418b7d168a91331a4` |

Deployed contract source commit: `5c7664b59f6ac4ea6839dbf85e2ad3174fec96ef`.
All five deployed sources are verified exact byte matches.

## Fresh V2 lifecycle evidence

- Charter: `V2-LIVE-1792526492`
- Incident: `V2-INC-1792526492`
- Capability: `EXC-V2-INC-1792526492`
- [Challenge](https://explorer-studio.genlayer.com/tx/0xb25a0ce07f9d5f069a5bb5fe18a63e13eac132ac8cef66982d119464e0cd4869)
- [Finalization](https://explorer-studio.genlayer.com/tx/0xc661114921fb8cff2f00adce43224965dec0526beff2d32c81a785eb25fdad42)
- [Capability child](https://explorer-studio.genlayer.com/tx/0xc16668d0aa0cc576d1e0886761573b74eefcbb3a67b779ace92a6c51f1b2bd6c)
- [Capability execution](https://explorer-studio.genlayer.com/tx/0x200c874858c8878490b38495fc3e51048360a880f9acb7e3db50675865626da7)
- [Protected-route child](https://explorer-studio.genlayer.com/tx/0x42029d1932ce62d788c690d646237498bcbfc356e624a57477c7f9f47bcd7d3c)
- [Reconciliation](https://explorer-studio.genlayer.com/tx/0x8a81bd528935d49f5bd73b89e5c4bfdabc9e8cfb2ab29db0480e09bef921a769)

The final state was `TRIGGER_CONFIRMED`, capability `APPLIED`,
`consumed=true`, and `route_disabled=true`. Missing parent transaction hashes
are intentionally `NOT RECORDED`.

## Current validation

- Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_2Y5jYRPLyhNfh8VXmUfKAgt6VfCH` (`READY`)
- Frontend runtime source: `d598887af943d3db9b9d982d7e2bf53a2054164c`
- Exact-head CI: [39558290471](https://github.com/Bibidee/exigency/actions/runs/39558290471)
- Unit: 16; Direct Mode: 43; Browser: 9

The new Direct Mode coverage includes V2 challenge bounds, provisional/final
assessment behavior, final-only capability issuance, overturned results,
source drift, and target-governance rejection. Browser mocks are unavailable in
production code paths.

## Limitations

- The targets are non-custodial, so live payout failure cannot be fabricated or
  demonstrated; failure recovery is not part of this architecture.
- Three moderate transitive tooling advisories remain; the Vite high finding and
  all critical findings are cleared without a forced incompatible downgrade.
- Some historical lifecycle hashes remain `NOT RECORDED`.
- Local Windows Direct Mode execution is limited; GitHub CI runs the complete
  suite.
