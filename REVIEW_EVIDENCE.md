# Review evidence — current V2 architecture

## Scope

This report describes the current five-contract, non-custodial EXIGENT V2
deployment. It does not claim GEN custody, deposits, withdrawals, external
payouts, refunds, or live failed-payout recovery. Historical payout-era
material is retained only as historical evidence.

## Production provenance

- Production URL: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_2Y5jYRPLyhNfh8VXmUfKAgt6VfCH`
- Deployment state: `READY`
- Deployment URL: [https://exigency-17wfzgqll-bibidees-projects.vercel.app](https://exigency-17wfzgqll-bibidees-projects.vercel.app)
- Frontend source reported by `/api/build-info`:
  `d598887af943d3db9b9d982d7e2bf53a2054164c`
- Network: GenLayer Studionet, chain `61999`

The production alias and health are verified. The Vercel runtime reports the
frontend source through `/api/build-info`; the final repository HEAD is tracked
by exact-head CI below.

## Contract provenance

| Contract | Address | Source SHA-256 |
| --- | --- | --- |
| CharterRegistry | `0xA4dba5B0572B3D721955Ce3A9E3dc46F791e4C92` | `8466a290331fb1ddf51afdbb18ca92fa2d7e239e5759d9169cd0b8f4831895ec` |
| ExigencyEngine | `0x903f895E256817aBFE97f101292B94F85d0b59BA` | `797005664d556d912e20c8ed13894036c66cc981cd3e48387f1855e57a992ade` |
| CapabilityGate | `0xE383404e8C00868A86BD412F4e72Cb13328Ed2EF` | `379578b05ba959572ac5ba25aa6ddea2a0dae69a868575b7da861ba702615d0c` |
| ProtectedVault | `0xF3dC371E50c296c6Ef1067eAe95104F864F391B3` | `8c3a51660efc0428d7c6efbf2edd1c5e601e5c005c852c9564ec4bd9a16c60d9` |
| ProtectedRoute | `0x7217760864796a1CaeDAaFB418b7d168a91331a4` | `7f6e3ddaec3146d2c04bfb9375b54b8e9c5ece6d7b4909fff3d34cd26c3e2b6c` |

Deployed contract source commit: `5c7664b59f6ac4ea6839dbf85e2ad3174fec96ef`.
The committed `deployment-manifest.public.json` is the authoritative address,
transaction, and source-hash record. `npm run source:verify` reports 5/5 exact
byte matches.

Gate → Engine bind transaction:
`0x4b7f98acfda9ec8b5121fa4e7292d5f1e7ebba55343cabc297f227815007f021`.

## Steward authorization boundary

Creating a fresh protocol key does not grant authority over an existing
protected target. `ExigencyEngine` checks target governance before issuing a
capability, `CapabilityGate` forwards the capability holder, and both
`ProtectedVault` and `ProtectedRoute` enforce their target-side governance
boundary before applying an emergency action.

The negative regression test
`test_unrelated_wallet_cannot_pause_target_through_configured_gate` passes.

## Current security boundary

The Gate exposes only `PAUSE_PROTECTED_ACTION` and
`DISABLE_PROTECTED_ROUTE`. Both actions are bounded by a finalized capability,
target governance, a fixed action key, and on-chain expiry. The targets do not
custody user GEN and do not expose an arbitrary calldata or payout surface.

## Current V2 behavioral coverage

The exact-head Direct Mode suite covers grouped evidence, provisional
assessment, valid and unauthorized challenges, challenge deadlines and maximum
counts, finalization timing, final-only capability issuance, overturned final
results, source drift, identical-source no-drift behavior, target-governance
rejection, Gate/target isolation, replay protection, expiry, and cross-target
authorization boundaries.

## Current health evidence

The final deployment-health run must be recorded after the final evidence commit
and exact-head CI. It verifies `/`, `/command`, `/vault`, Studionet RPC, all five
contract reads, both target bindings, protected-route state, and 5/5 source
matches.

## Current V2 live lifecycle

The unlocked Studionet CLI completed the recorded lifecycle against the current
five-contract deployment:

- Charter: `V2-LIVE-1792526492`
- Incident: `V2-INC-1792526492`
- Capability: `EXC-V2-INC-1792526492`
- Challenge: [transaction](https://explorer-studio.genlayer.com/tx/0xb25a0ce07f9d5f069a5bb5fe18a63e13eac132ac8cef66982d119464e0cd4869)
- Finalization: [transaction](https://explorer-studio.genlayer.com/tx/0xc661114921fb8cff2f00adce43224965dec0526beff2d32c81a785eb25fdad42)
- Capability issuance child: [transaction](https://explorer-studio.genlayer.com/tx/0xc16668d0aa0cc576d1e0886761573b74eefcbb3a67b779ace92a6c51f1b2bd6c)
- Capability execution: [transaction](https://explorer-studio.genlayer.com/tx/0x200c874858c8878490b38495fc3e51048360a880f9acb7e3db50675865626da7)
- Protected-route child: [transaction](https://explorer-studio.genlayer.com/tx/0x42029d1932ce62d788c690d646237498bcbfc356e624a57477c7f9f47bcd7d3c)
- Reconciliation: [transaction](https://explorer-studio.genlayer.com/tx/0x8a81bd528935d49f5bd73b89e5c4bfdabc9e8cfb2ab29db0480e09bef921a769)

The final read showed `TRIGGER_CONFIRMED`, capability `APPLIED`,
`consumed=true`, and `route_disabled=true`. Missing parent hashes are marked
`NOT RECORDED` rather than invented.

## Verification results

Current exact-head CI is tracked at
[39558290471](https://github.com/Bibidee/exigency/actions/runs/39558290471).
The final evidence commit must update this link only if a later documentation
commit creates a newer exact-head run.

- Unit: 16 passed
- Direct Mode: 43 passed in CI
- Browser: 9 passed
- Contract lint/validation: passed
- Typecheck: passed
- Build: passed
- Source verification: 5/5 exact byte matches

Browser mocks are gated out of production with
`process.env.NODE_ENV !== "production"`.

## Remaining limitations

- Three moderate transitive GenLayer/Vitest tooling advisories remain; the Vite
  high finding and all critical findings are cleared without an unsafe forced
  downgrade.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
- Direct Mode cannot be run reliably by the local Windows runner; the complete
  suite passes in GitHub CI.
- Per-validator HTTP status and content digest are fetch/audit provenance, not a
  claim that every validator returns byte-identical content.
