# EXIGENT final handoff

## Current status

The current architecture is a non-custodial protected-action target. The
target stores no user funds and emits no external payout.

Current repository branch: `main`.

The final repository SHA is the exact-head commit reported by the final CI run below.

Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)

Vercel deployment: `dpl_HueMeEeFWbUweDZVEsbWKoSfTVVQ` (`READY`)

The production `/api/build-info` endpoint reports frontend source
`b52d44a586d3e98dc2dedfffe8efa52067266e70`.

## Current contracts

| Contract | Address |
| --- | --- |
| CharterRegistry | `0xA4dba5B0572B3D721955Ce3A9E3dc46F791e4C92` |
| ExigencyEngine | `0x903f895E256817aBFE97f101292B94F85d0b59BA` |
| CapabilityGate | `0xE383404e8C00868A86BD412F4e72Cb13328Ed2EF` |
| ProtectedVault | `0xF3dC371E50c296c6Ef1067eAe95104F864F391B3` |
| ProtectedRoute | `0x7217760864796a1CaeDAaFB418b7d168a91331a4` |

Network: Studionet 61999. The verified public deployment record is
`deployment-manifest.public.json`; all four deployed sources match it exactly.

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

Deployment health: [39467650675](https://github.com/Bibidee/exigency/actions/runs/39467650675) — `SUCCESS`.

It verified production routes `/`, `/command`, and `/vault`, Studionet RPC,
chain ID `61999`, all five contract reads, both target bindings, unpaused
targets, and `5/5` deployed source byte matches.

Current live counts on this fresh deployment:

- charters: `0`
- incidents: `0`
- capabilities: `0`
- protectedActionCount: `0`

## Historical pre-governance-fix lifecycle

The lifecycle records `CI-LIVE-1790816856`, `CI-INC-1790816856`, and
`EXC-CI-INC-1790816856` were executed against the previous deployment and are
retained only as historical evidence. They are not claimed as live proof of
the current target-governance deployment. Missing intermediate hashes remain
`NOT RECORDED`.

## Test baseline

Exact-head CI: to be refreshed for this documentation commit.

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
- Five moderate transitive npm advisories remain; no unsafe forced upgrade was
  applied.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
