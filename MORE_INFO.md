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
| CharterRegistry | `0xBBf3A67273c0AB100ef1DD7EFD0Eb8B4dB73Fb95` |
| ExigencyEngine | `0xD9F68dCD02eE4297be263Db08735bF571F20feda` |
| CapabilityGate | `0xAAfc06B7a2fc25aC2ce721a0A371717dEb2488Bd` |
| ProtectedVault | `0x1e6e9699dD76fc1d3825914e9B8ff5AeF3d140C0` |
| ProtectedRoute | `0xf6E180AB7ECddCa8A9fF5265B57cc8C7F77eD33c` |

Deployed contract source commit: `132c1832cd113db8d38b77335539851846e7ea7e`.
All five deployed sources are verified exact byte matches.

## Fresh V2 lifecycle evidence

- Charter: `V2-BOUNDARY-1792583486906`
- Incident: `V2-BOUNDARY-INC-1792583486906`
- Capability: `EXC-V2-BOUNDARY-INC-1792583486906`
- [Publish](https://explorer-studio.genlayer.com/tx/0xede28c92952fb357b879d57b537921ba4a3a7f65a1b678f1c5430a0cc0803d53)
- [Activate](https://explorer-studio.genlayer.com/tx/0xfc8140d21d7c96f8fa4b54f061ef81a05412e896d68ce8eb410ea2e14c5b599c)
- [Open incident](https://explorer-studio.genlayer.com/tx/0x960f686481a095ce84b07b354ba1576f89dc0ea998f9eb47a2959282b3db2dde)
- [Assessment](https://explorer-studio.genlayer.com/tx/0xa0336b7761b583eeaad7cc592f2589fc77023098d52b89f8a9a75fec984c3233)
- [Late challenge rejected](https://explorer-studio.genlayer.com/tx/0x6f1d57b37f2999cd479a5d86d0c7bc02c02f48617c32350ad3203383643878a7)
- [Finalization](https://explorer-studio.genlayer.com/tx/0x0f0748822e1c51714bde630fa31d115c723a5035948b67b9a699b2329a792d0e)
- [Capability child](https://explorer-studio.genlayer.com/tx/0x2b5eb9e956ca6f425ff0e0017ba69a1f1992f6f23705890df7be2603a2013f5d)
- [Capability execution](https://explorer-studio.genlayer.com/tx/0x45833f3dcf2c066ad3ee544cb61e8fa5c2ed5b13df7724b44f79871db5f1f266)
- [Protected-route child](https://explorer-studio.genlayer.com/tx/0x0b7c29529dd5ed03c2dd887a5219c75a084a4cd24769ed4edfe80838f4069c4e)
- [Reconciliation](https://explorer-studio.genlayer.com/tx/0x0ad1401a784c8ff939326d4a9190864f0b88b002222243009d56fcefb2e8b361)

The challenge transaction finalized with an execution error because the
challenge window had closed; the incident remained `ASSESSMENT_PROVISIONAL` and
was not challenged twice. Finalization then produced `AUTHORITY_PENDING_FINALITY`,
and the capability completed `APPLIED`, `consumed=true`, `dispatch_count=1`.
The route pause later expired normally. This is the corrected lifecycle proof,
including the bounded-deadline rejection.

## Current validation

- Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_5qFzmoK9c99KYcJzqAPN7uqcM9AT` (`READY`)
- Frontend deployment URL: `exigency-lcccxhx98-bibidees-projects.vercel.app`
- Frontend runtime source: `f6a1600ccf542db4cb7e5ed33b1f7e83ddaba523`
- Deployment timestamp: `2026-10-21T18:25:48.191Z`
- Exact-head CI and deployment health are recorded for the final repository
  commit in `REVIEW_EVIDENCE.md` and `VALIDATION_REPORT.md`.
- Unit: 16; Direct Mode: 47; Browser: 19

The new Direct Mode coverage includes V2 challenge bounds, provisional/final
assessment behavior, final-only capability issuance, overturned results,
source drift, and target-governance rejection. Browser mocks are unavailable in
production code paths.

The incident frontend now exposes the assessment budget, challenge/expiry
deadlines and evidence-source capacity. It conservatively blocks a challenge-
enabled retry that would leave no reassessment attempt, blocks finalization
when its expiry window is not viable, and validates challenge groups,
duplicates and the ten-source combined limit. These checks are frontend-only;
the deployed contract behavior and its direct-call limitations are unchanged.
The browser separately labels session-local evidence provenance changes and
does not turn missing evidence into an on-chain drift verdict.

## Limitations

- The targets are non-custodial, so live payout failure cannot be fabricated or
  demonstrated; failure recovery is not part of this architecture.
- Three moderate transitive/tooling npm advisories remain; `npm audit fix
  --force` would replace the pinned GenLayer CLI with a breaking version, so no
  unsafe forced upgrade was applied.
- Some historical lifecycle hashes remain `NOT RECORDED`.
- Local Windows Direct Mode execution is limited; GitHub CI runs the complete
  suite.
