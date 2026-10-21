# Review evidence — current V2 architecture

## Scope

This report describes the current five-contract, non-custodial EXIGENT V2
deployment. It does not claim GEN custody, deposits, withdrawals, external
payouts, refunds, or live failed-payout recovery. Historical payout-era
material is retained only as historical evidence.

## Production provenance

- Production URL: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_4kwhGRBGLj9VvKR3eprcm3CsyKdi`
- Deployment state: `READY`
- Deployment URL: [https://exigency-issss2uj3-bibidees-projects.vercel.app](https://exigency-issss2uj3-bibidees-projects.vercel.app)
- Frontend source reported by `/api/build-info`:
  `1545bc7c981c7380e35d7f9fdf4d71783d43c318`
- Network: GenLayer Studionet, chain `61999`

The production alias, READY deployment, and exact deployed frontend SHA are
verified. The Vercel runtime reports the frontend source through
`/api/build-info`; the final manifest/evidence commit after that deployment is
documentation-only.

## Contract provenance

| Contract | Address | Source SHA-256 |
| --- | --- | --- |
| CharterRegistry | `0xBBf3A67273c0AB100ef1DD7EFD0Eb8B4dB73Fb95` | `8466a290331fb1ddf51afdbb18ca92fa2d7e239e5759d9169cd0b8f4831895ec` |
| ExigencyEngine | `0xD9F68dCD02eE4297be263Db08735bF571F20feda` | `6619a4c88018ccab6b20c6a3bab32899f806dae21e338db6cf4a472249dfabd7` |
| CapabilityGate | `0xAAfc06B7a2fc25aC2ce721a0A371717dEb2488Bd` | `0d8c240e5c0168f5dc8049163ad521fe620caca6a4c8589d2d7ec3c6a8e77447` |
| ProtectedVault | `0x1e6e9699dD76fc1d3825914e9B8ff5AeF3d140C0` | `8c3a51660efc0428d7c6efbf2edd1c5e601e5c005c852c9564ec4bd9a16c60d9` |
| ProtectedRoute | `0xf6E180AB7ECddCa8A9fF5265B57cc8C7F77eD33c` | `7f6e3ddaec3146d2c04bfb9375b54b8e9c5ece6d7b4909fff3d34cd26c3e2b6c` |

Deployed contract source commit: `132c1832cd113db8d38b77335539851846e7ea7e`.
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

The local health check after the fresh deployment verified `/`, `/command`,
`/vault`, Studionet RPC, all five contract reads, both target bindings,
protected-route state, and 5/5 source matches. Exact-head CI and deployment
health are run for the final repository SHA and reported with the final
evidence record.

## Current V2 live lifecycle

The unlocked CLI completed a fresh lifecycle against the current five-contract
deployment. The one-minute challenge was submitted after its deadline and was
rejected; no duplicate challenge was submitted. The incident was then finalized
once and the capability was executed and reconciled once:

- Charter: `V2-BOUNDARY-1792583486906`
- Incident: `V2-BOUNDARY-INC-1792583486906`
- Capability: `EXC-V2-BOUNDARY-INC-1792583486906`
- Publish: [transaction](https://explorer-studio.genlayer.com/tx/0xede28c92952fb357b879d57b537921ba4a3a7f65a1b678f1c5430a0cc0803d53)
- Activate: [transaction](https://explorer-studio.genlayer.com/tx/0xfc8140d21d7c96f8fa4b54f061ef81a05412e896d68ce8eb410ea2e14c5b599c)
- Open incident: [transaction](https://explorer-studio.genlayer.com/tx/0x960f686481a095ce84b07b354ba1576f89dc0ea998f9eb47a2959282b3db2dde)
- Assessment: [transaction](https://explorer-studio.genlayer.com/tx/0xa0336b7761b583eeaad7cc592f2589fc77023098d52b89f8a9a75fec984c3233)
- Late challenge rejected: [transaction](https://explorer-studio.genlayer.com/tx/0x6f1d57b37f2999cd479a5d86d0c7bc02c02f48617c32350ad3203383643878a7)
- Finalization: [transaction](https://explorer-studio.genlayer.com/tx/0x0f0748822e1c51714bde630fa31d115c723a5035948b67b9a699b2329a792d0e)
- Capability issuance child: [transaction](https://explorer-studio.genlayer.com/tx/0x2b5eb9e956ca6f425ff0e0017ba69a1f1992f6f23705890df7be2603a2013f5d)
- Capability execution: [transaction](https://explorer-studio.genlayer.com/tx/0x45833f3dcf2c066ad3ee544cb61e8fa5c2ed5b13df7724b44f79871db5f1f266)
- Protected-route child: [transaction](https://explorer-studio.genlayer.com/tx/0x0b7c29529dd5ed03c2dd887a5219c75a084a4cd24769ed4edfe80838f4069c4e)
- Reconciliation: [transaction](https://explorer-studio.genlayer.com/tx/0x0ad1401a784c8ff939326d4a9190864f0b88b002222243009d56fcefb2e8b361)

The final lifecycle read showed incident `AUTHORITY_PENDING_FINALITY`, assessment
`FINAL`, capability `APPLIED`, `consumed=true`, `dispatch_count=1`, and
`route_disabled=true` until `1792584354`. The later health read confirms the
bounded route pause expired and the current route is open again.

## Verification results

Exact-head CI is required for the final repository commit. The workflow is
[CI](https://github.com/Bibidee/exigency/actions/workflows/ci.yml).

- Unit: 16 passed
- Direct Mode: 47 passed in CI
- Browser: 19 passed
- Contract lint/validation: passed
- Typecheck: passed
- Build: passed
- Source verification: 5/5 exact byte matches

Browser mocks are gated out of production with
`process.env.NODE_ENV !== "production"`.

## Frontend hardening status

The frontend now displays the remaining assessment budget, challenge deadline,
incident expiry, charter challenge count and combined source count. It blocks
known-invalid assessment/finalization paths and rejects wrong source groups,
duplicates and over-capacity challenge submissions before a write. These are
conservative frontend mitigations; they do not change or conceal the immutable
Engine boundaries, and direct contract callers are not bound by them.

Assessment provenance observed by the current browser is compared across
rounds. Previously available evidence becoming unavailable, changed digests,
unchanged digests and source-fetch failures are labeled as frontend audit
warnings. They are not presented as on-chain drift unless the contract itself
sets `drift_detected`.

## Remaining limitations

- Three moderate transitive/tooling npm advisories remain; `npm audit fix
  --force` would replace the pinned GenLayer CLI with a breaking version, so no
  unsafe forced upgrade was applied.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
- Direct Mode cannot be run reliably by the local Windows runner; the complete
  suite passes in GitHub CI.
- Per-validator HTTP status and content digest are fetch/audit provenance, not a
  claim that every validator returns byte-identical content.
