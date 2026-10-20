# EXIGENT final handoff

## Current status

The current architecture is a non-custodial protected-action target. The
target stores no user funds and emits no external payout.

Current repository branch: `main`.

The final repository SHA is the exact-head commit reported by the final CI run below.

Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)

Vercel deployment: `dpl_wz8QTEpaRBqRJUUUk9xYB8VNAFYM` (`READY`)

The production `/api/build-info` endpoint reports frontend source
`e6a7a9f8b920dafcaad57304c1d763072c580217`.
The final `2c5e111` commit is documentation/evidence-only; exact Vercel
Git-integration metadata for that documentation commit is not independently
available.

## Current contracts

| Contract | Address |
| --- | --- |
| CharterRegistry | `0xA4dba5B0572B3D721955Ce3A9E3dc46F791e4C92` |
| ExigencyEngine | `0x903f895E256817aBFE97f101292B94F85d0b59BA` |
| CapabilityGate | `0xE383404e8C00868A86BD412F4e72Cb13328Ed2EF` |
| ProtectedVault | `0xF3dC371E50c296c6Ef1067eAe95104F864F391B3` |
| ProtectedRoute | `0x7217760864796a1CaeDAaFB418b7d168a91331a4` |

Network: Studionet 61999. The verified public deployment record is
`deployment-manifest.public.json`; all five deployed sources match it exactly.

## Steward authorization boundary

Creating a fresh protocol key does not grant authority over an existing
protected target. `ProtectedVault` stores its deployment wallet as the target
governance address. `ExigencyEngine` requires the charter owner to match target
governance before capability issuance. `ProtectedVault` independently checks
the capability holder against governance before applying the emergency pause.

The unrelated-wallet test
`test_unrelated_wallet_cannot_pause_target_through_configured_gate` passes.

Corrected source: [security-fix commit](https://github.com/Bibidee/exigency/commit/34f97bee971fd4c0c750ab0dd8cf05ab48f191f2).

## Current health evidence

Deployment health: [39492576480](https://github.com/Bibidee/exigency/actions/runs/39492576480) — `SUCCESS` on the final evidence commit.

It verified production routes `/`, `/command`, and `/vault`, Studionet RPC,
chain ID `61999`, all five contract reads, both target bindings, the current
protected-route state, and `5/5` deployed source byte matches.

Current live counts after the fresh V2 lifecycle:

- charters: `5`
- incidents: `4`
- capabilities: `1`
- protected route: `route_disabled=true`, `route_execution_count=0`

## Current V2 live lifecycle

The unlocked Studionet CLI completed a fresh grouped-evidence lifecycle against
the current five-contract deployment:

- Charter: `V2-LIVE-1792526492`
- Incident: `V2-INC-1792526492`
- Capability: `EXC-V2-INC-1792526492`
- Challenge: [0xb25a0ce0…4869](https://explorer-studio.genlayer.com/tx/0xb25a0ce07f9d5f069a5bb5fe18a63e13eac132ac8cef66982d119464e0cd4869)
- Finalization: [0xc6611149…ad42](https://explorer-studio.genlayer.com/tx/0xc661114921fb8cff2f00adce43224965dec0526beff2d32c81a785eb25fdad42)
- Capability issuance child: [0xc16668d0…2bd6c](https://explorer-studio.genlayer.com/tx/0xc16668d0aa0cc576d1e0886761573b74eefcbb3a67b779ace92a6c51f1b2bd6c)
- Capability execution: [0x200c8748…6da7](https://explorer-studio.genlayer.com/tx/0x200c874858c8878490b38495fc3e51048360a880f9acb7e3db50675865626da7)
- Protected-route child: [0x42029d19…7d3c](https://explorer-studio.genlayer.com/tx/0x42029d1932ce62d788c690d646237498bcbfc356e624a57477c7f9f47bcd7d3c)
- Reconciliation: [0x8a81bd52…a769](https://explorer-studio.genlayer.com/tx/0x8a81bd528935d49f5bd73b89e5c4bfdabc9e8cfb2ab29db0480e09bef921a769)

The final read showed `TRIGGER_CONFIRMED`, `APPLIED`, `consumed=true`, and
`route_disabled=true`. Charter publication, activation, incident opening, and
the two assessment parent hashes were not recorded separately.

## Historical pre-governance-fix lifecycle

The lifecycle records `CI-LIVE-1790816856`, `CI-INC-1790816856`, and
`EXC-CI-INC-1790816856` were executed against the previous deployment and are
retained only as historical evidence. They are not claimed as live proof of
the current target-governance deployment. Missing intermediate hashes remain
`NOT RECORDED`.

## Test baseline

The dependency/security patch is committed and pushed. The latest functional
tree passed exact-head CI, and production health passed immediately afterward.
The later evidence-only deployment-record update does not change application
or contract behavior.

- Exact-head CI: [39492212566](https://github.com/Bibidee/exigency/actions/runs/39492212566) — `SUCCESS`
- Deployment health: [39492576480](https://github.com/Bibidee/exigency/actions/runs/39492576480) — `SUCCESS`

- Unit: 16 passed
- Direct Mode: 32 passed in CI
- Browser: 9 passed
- Contract lint and validation: passed
- Typecheck: passed
- Production build: passed

Browser mocks are test-only and unavailable in production code paths; all
`__EXIGENT_E2E_MOCK__` behavior is gated away from production.

## Limitations

- Live failed-payout recovery is not a feature because the target does not
  transfer or custody GEN.
- Four moderate transitive GenLayer/Vitest tooling advisories remain; high and
  critical findings are cleared. No unsafe forced GenLayer downgrade was
  applied.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
