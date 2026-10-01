# Review evidence — current architecture

## Scope

This report describes the current non-custodial EXIGENT deployment. It supersedes
older payout-era evidence; historical payout records are retained only as
historical records and are not claims about the current target.

## Production provenance

- Production URL: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_GrWWPHSy4UWJTu7AdH4Vtyx3nrmg`
- State: `READY`
- Preview deployment URL: `https://exigency-en9wl9sl1-bibidees-projects.vercel.app`
- Frontend source reported by `/api/build-info`:
  `920b81271bbcbee1b2512ffcd426a0828505209e`

The runtime endpoint binds the live alias, deployment ID, and frontend source
SHA. Vercel CLI output did not provide an additional native Git binding.

## Contract provenance

| Contract | Address | Source SHA-256 |
| --- | --- | --- |
| CharterRegistry | `0x2ecf811BbFB57cf34Fd55395A5793393Ae431441` | `f2dd93241b0c8b3b7ef27abb1bb38e8aab3ee64dc113f804a97f2f40ac9b9bb0` |
| ExigencyEngine | `0x911Bef23368d88e994301BeA1988e753aB2fC2BA` | `0ad4fb5fdae59962d69c76eec9befc11b508ac43185ca69c0e0127514f885244` |
| CapabilityGate | `0xe77fdD519d4Dba4851701B3f1D498619c5b94b01` | `f6bf0d15da516d77a24fa8dd6cb22ddab6196dc162e2c4f81ead315a5c872db7` |
| ProtectedVault | `0xf7aB890a71D40d053453728bb2bA97e31207E3c8` | `bbc88fa83c776e2d0dfbaa6cdf9328337573db71db2fbd0c12c5cd3a0f155929` |

The deployment script first produces `deployment-manifest.generated.json`.
After finality, provenance, and source-hash confirmation, the clean deployment
transactions, binding transaction, source commit, and these hashes are copied
into the committed public record `deployment-manifest.public.json`.

## Current security boundary

`ProtectedVault` is deliberately non-custodial. It stores no user GEN and has
no deposit, withdrawal, external payout, refund, retry, or failed-payout
callback. The only protected operation is a unique direct-EOA action. A
finalized `PAUSE_PROTECTED_ACTION` capability can pause that action through the
Gate, and the pause expires on-chain.

This removes the unsupported runtime dependency that previously made live
failed-payout recovery unsafe. No live payout failure is claimed.

## Fresh live proof

The latest fresh synthetic authority lifecycle was:

- Charter: `CI-LIVE-1790816856`
- Incident: `CI-INC-1790816856`
- Capability: `EXC-CI-INC-1790816856`
- Protected action before pause: accepted
- Protected action during pause: finalized with contract error
- Protected action after expiry: accepted
- After-expiry transaction:
  `0x5cf605b2996ba7e395a0c89a78b21ab6f4ec65a12d9a61b2a262fe5f6f8c7457`

Uncaptured intermediate hashes are explicitly `NOT RECORDED`.

## Wallet roles

The live CLI lifecycle used the owner account
`0x865e118a3be4fa0760775565fcd31be156e1e3d7`. A second wallet is only
negative authorization evidence: it attempted an owner-only incident and was
rejected. This is not a two-wallet successful lifecycle.

## Verification results

- Unit: 14 passed
- Direct Mode: 28 passed
- Browser: 9 passed
- Contract lint/validation: passed
- Typecheck: passed
- Build: passed
- Source verification: 4/4 exact byte matches

Browser mocks are gated out of production with
`process.env.NODE_ENV !== "production"`.

## Remaining limitations

- Five moderate transitive npm advisories remain; no forced incompatible
  upgrade was applied.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
- Per-validator HTTP status and content digest are fetch/audit provenance, not
  a claim that every validator returns byte-identical content.
