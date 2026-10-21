# EXIGENT — V2 final milestone hardening review

## Review scope

This package is an independent-review aid for the final V2 milestone. The
baseline is the last V1 audit head:

- Baseline: `f15da235433e91ae27ac3604db397b03966fd629`
- Frontend hardening implementation: `f6a1600ccf542db4cb7e5ed33b1f7e83ddaba523`
- Immutable comparison: [V1 baseline → frontend hardening](https://github.com/Bibidee/exigency/compare/f15da235433e91ae27ac3604db397b03966fd629...f6a1600ccf542db4cb7e5ed33b1f7e83ddaba523)

The final evidence/documentation commits after the frontend deployment are
separate from the browser bundle. No Intelligent Contract source was changed
or redeployed during this final hardening pass.

## Milestone progress

V2 adds grouped evidence policies, provisional assessment, bounded challenge
windows and counts, final-only capability issuance, reassessment behavior,
target-governance enforcement, a second protected target, shared Gate dispatch,
and bounded redispatch/reconciliation. The exact-head Direct Mode suite covers
these paths and the browser suite covers the public operator journey.

## Boundary review

| Boundary | Reviewer status | Evidence and limitation |
| --- | --- | --- |
| Assessment retry exhaustion | Frontend-mitigated; on-chain limit disclosed | The page shows remaining attempts and blocks a known challenge-enabled path that would consume the final attempt. Direct callers still face the immutable Engine rule. |
| Challenge deadline versus incident expiry | Frontend-mitigated; on-chain limit disclosed | The page blocks equality/expired/too-close windows and explains finality margin. The contract remains authoritative and cannot guarantee a viable window for every external caller. |
| Combined evidence source bound | Frontend-mitigated; on-chain limit disclosed | The page rejects wrong groups, duplicates and more than ten combined sources. Direct callers remain subject to the unchanged contract validation. |
| Source disappearance between rounds | Browser provenance warning | The page labels a previously available source becoming unavailable as a session-local warning. It does not mislabel this as on-chain drift; the contract's own `drift_detected` field remains authoritative. |
| Capability redispatch | On-chain bounded | A dispatched capability must reconcile before another child can be dispatched. Existing Direct Mode coverage preserves this invariant. |

The recommended reviewer disposition is **accept with disclosed on-chain
limitations** for this no-redeployment hardening pass. A reviewer requiring
all four boundaries to be enforced against arbitrary direct callers should
request a future contract/runtime change rather than treating browser guards
as protocol enforcement.

## Current deployment

- Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_5qFzmoK9c99KYcJzqAPN7uqcM9AT`
- Deployment URL: [https://exigency-lcccxhx98-bibidees-projects.vercel.app](https://exigency-lcccxhx98-bibidees-projects.vercel.app)
- State: `READY`
- Deployment timestamp: `2026-10-21T18:25:48.191Z`
- Frontend source reported by `/api/build-info`: `f6a1600ccf542db4cb7e5ed33b1f7e83ddaba523`
- Network: Studionet `61999`

## Contract provenance

The current five addresses and exact source hashes are listed in
[`deployment-manifest.public.json`](deployment-manifest.public.json). The
deployed contract source commit remains
`132c1832cd113db8d38b77335539851846e7ea7e`; source verification requires all
five contracts to be exact byte matches. This pass performed no contract
redeployment.

## Lifecycle evidence

The fresh V2 lifecycle is recorded in
[`REVIEW_EVIDENCE.md`](REVIEW_EVIDENCE.md) and
[`VALIDATION_REPORT.md`](VALIDATION_REPORT.md), including the charter,
incident, assessment, late-challenge rejection, finalization, capability
issuance, execution, protected-route child and reconciliation links. Missing
historical hashes remain explicitly marked `NOT RECORDED` rather than being
reconstructed.

## Verification target

The final evidence run must record exact-head CI and deployment-health results
for the repository commit that contains this document. Current expected counts
are 16 unit, 47 Direct Mode and 19 browser tests; the complete Direct Mode
suite runs in GitHub CI because the local Windows runner has a known runtime
limitation. Browser E2E mocks are development/test-only and are unavailable in
production code paths.

## Remaining limitations

- Live failed-payout behavior is not applicable: the deployed targets are
  non-custodial and expose no payout path.
- Moderate transitive/tooling npm advisories remain; no unsafe forced upgrade
  was applied to the pinned GenLayer toolchain.
- Some historical lifecycle transaction hashes were never recorded.
- Exact-head CI and health links are appended to the final handoff after the
  final documentation commit completes.
