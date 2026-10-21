# EXIGENT final handoff

## Current status

EXIGENT is a five-contract, non-custodial protected-action deployment on
Studionet 61999. The targets store no user funds and emit no external payout.

- Branch: `main`
- Current hardening HEAD: see the exact final SHA in the submission report.
- Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_2Y5jYRPLyhNfh8VXmUfKAgt6VfCH` (`READY`)
- Runtime frontend source: `d598887af943d3db9b9d982d7e2bf53a2054164c`

The exact Vercel deployment-to-current-HEAD binding is not independently
exported; production health and GitHub exact-head CI are recorded separately.

## Current contracts

| Contract | Address |
| --- | --- |
| CharterRegistry | `0xA4dba5B0572B3D721955Ce3A9E3dc46F791e4C92` |
| ExigencyEngine | `0x903f895E256817aBFE97f101292B94F85d0b59BA` |
| CapabilityGate | `0xE383404e8C00868A86BD412F4e72Cb13328Ed2EF` |
| ProtectedVault | `0xF3dC371E50c296c6Ef1067eAe95104F864F391B3` |
| ProtectedRoute | `0x7217760864796a1CaeDAaFB418b7d168a91331a4` |

Deployed contract source commit: `5c7664b59f6ac4ea6839dbf85e2ad3174fec96ef`.
All five deployed sources match the public manifest byte-for-byte.

## Steward authorization boundary

A fresh protocol key cannot grant authority over an existing protected target.
The Engine checks target governance before issuing a capability, and both
target contracts independently enforce the same boundary before applying an
emergency action. The unrelated-wallet regression test passes.

## Current V2 live lifecycle

The recorded unlocked-CLI lifecycle is:

- Charter: `V2-LIVE-1792526492`
- Incident: `V2-INC-1792526492`
- Capability: `EXC-V2-INC-1792526492`
- Challenge: [transaction](https://explorer-studio.genlayer.com/tx/0xb25a0ce07f9d5f069a5bb5fe18a63e13eac132ac8cef66982d119464e0cd4869)
- Finalization: [transaction](https://explorer-studio.genlayer.com/tx/0xc661114921fb8cff2f00adce43224965dec0526beff2d32c81a785eb25fdad42)
- Capability child: [transaction](https://explorer-studio.genlayer.com/tx/0xc16668d0aa0cc576d1e0886761573b74eefcbb3a67b779ace92a6c51f1b2bd6c)
- Execution: [transaction](https://explorer-studio.genlayer.com/tx/0x200c874858c8878490b38495fc3e51048360a880f9acb7e3db50675865626da7)
- Protected-route child: [transaction](https://explorer-studio.genlayer.com/tx/0x42029d1932ce62d788c690d646237498bcbfc356e624a57477c7f9f47bcd7d3c)
- Reconciliation: [transaction](https://explorer-studio.genlayer.com/tx/0x8a81bd528935d49f5bd73b89e5c4bfdabc9e8cfb2ab29db0480e09bef921a769)

Final lifecycle state: `TRIGGER_CONFIRMED`, capability `APPLIED`,
`consumed=true`, and `route_disabled=true`. The later health read confirms the
bounded route pause expired normally and the current route is open. Missing
parent hashes remain `NOT RECORDED`.

## Exact-head validation

Exact-head CI and deployment-health run IDs are recorded in the submission
report for the final repository SHA.
The current test tree contains:

- Unit: 16
- Direct Mode: 43
- Browser: 9
- Contract lint/validation: passing
- Typecheck: passing
- Build: passing

The new Direct Mode checks cover V2 challenge bounds, provisional/final
assessment behavior, final-only capability issuance, source drift, overturned
results, and target-governance authorization. Browser mocks remain test-only and
are gated away from production.

## Limitations

- Live failed-payout recovery is not a feature because the targets do not
  transfer or custody GEN.
- Three moderate transitive GenLayer/Vitest tooling advisories remain; the Vite
  high finding and all critical findings are cleared without an unsafe forced
  downgrade.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
- Direct Mode is limited by the local Windows runner; GitHub CI is the complete
  execution environment.
