# Validation report

## Verdict scope

The current deployment is a non-custodial emergency protected-action system.
It does not claim GEN deposits, payouts, refunds, or live failed-payout
recovery. The targets store no user value and expose no external payout path.

## Deployed V2 stack

- Network: Studionet 61999
- Registry: `0xBBf3A67273c0AB100ef1DD7EFD0Eb8B4dB73Fb95`
- Engine: `0xD9F68dCD02eE4297be263Db08735bF571F20feda`
- Gate: `0xAAfc06B7a2fc25aC2ce721a0A371717dEb2488Bd`
- Protected vault: `0x1e6e9699dD76fc1d3825914e9B8ff5AeF3d140C0`
- Protected route: `0xf6E180AB7ECddCa8A9fF5265B57cc8C7F77eD33c`
- Deployed contract source commit: `132c1832cd113db8d38b77335539851846e7ea7e`
- Source verification: 5/5 exact byte matches

The committed `deployment-manifest.public.json` is the authoritative deployment
record. This pass used a fresh five-contract deployment because the V2 boundary
fix changed Intelligent Contract source.

## Steward authorization fix

Creating a fresh protocol key does not grant authority over an existing target.
The Engine requires the charter owner to match target governance before issuing
a capability. The Gate forwards the holder, and both targets independently
enforce the governance boundary before applying the bounded action.

Negative test:
`test_unrelated_wallet_cannot_pause_target_through_configured_gate` — `PASS`.

## V2 behavioral checks

The new Direct Mode coverage verifies provisional assessment, valid and
unauthorized challenges, challenge deadline and maximum-count enforcement,
finalization timing, final-only capability issuance, overturned final results,
source drift, identical-source no-drift behavior, and target-governance
rejection. Existing coverage preserves replay, expiry, direct EOA, isolation,
and target-side enforcement.

## Production

- URL: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Deployment: `dpl_2Y5jYRPLyhNfh8VXmUfKAgt6VfCH`
- State: `READY`
- Deployment URL: [https://exigency-17wfzgqll-bibidees-projects.vercel.app](https://exigency-17wfzgqll-bibidees-projects.vercel.app)
- Frontend source from `/api/build-info`:
  `d598887af943d3db9b9d982d7e2bf53a2054164c`

Exact Vercel deployment-to-current-repository-HEAD binding is not independently
exported by the runtime; production health and the runtime build-info endpoint
are recorded separately from GitHub exact-head CI.

## Current live V2 lifecycle

- Charter: `V2-BOUNDARY-1792583486906`
- Incident: `V2-BOUNDARY-INC-1792583486906`
- Capability: `EXC-V2-BOUNDARY-INC-1792583486906`
- Publish: [0xede28c92…03d53](https://explorer-studio.genlayer.com/tx/0xede28c92952fb357b879d57b537921ba4a3a7f65a1b678f1c5430a0cc0803d53)
- Activate: [0xfc8140d2…b599c](https://explorer-studio.genlayer.com/tx/0xfc8140d21d7c96f8fa4b54f061ef81a05412e896d68ce8eb410ea2e14c5b599c)
- Open incident: [0x960f6864…b2dde](https://explorer-studio.genlayer.com/tx/0x960f686481a095ce84b07b354ba1576f89dc0ea998f9eb47a2959282b3db2dde)
- Assessment: [0xa0336b77…c3233](https://explorer-studio.genlayer.com/tx/0xa0336b7761b583eeaad7cc592f2589fc77023098d52b89f8a9a75fec984c3233)
- Late challenge rejected: [0x6f1d57b3…878a7](https://explorer-studio.genlayer.com/tx/0x6f1d57b37f2999cd479a5d86d0c7bc02c02f48617c32350ad3203383643878a7)
- Finalization: [0x0f074882…92d0e](https://explorer-studio.genlayer.com/tx/0x0f0748822e1c51714bde630fa31d115c723a5035948b67b9a699b2329a792d0e)
- Capability issuance child: [0x2b5eb9e9…13f5d](https://explorer-studio.genlayer.com/tx/0x2b5eb9e956ca6f425ff0e0017ba69a1f1992f6f23705890df7be2603a2013f5d)
- Capability execution: [0x45833f3d…1f266](https://explorer-studio.genlayer.com/tx/0x45833f3dcf2c066ad3ee544cb61e8fa5c2ed5b13df7724b44f79871db5f1f266)
- Protected-route child: [0x0b7c2952…69c4e](https://explorer-studio.genlayer.com/tx/0x0b7c29529dd5ed03c2dd887a5219c75a084a4cd24769ed4edfe80838f4069c4e)
- Reconciliation: [0x0ad1401a…8b361](https://explorer-studio.genlayer.com/tx/0x0ad1401a784c8ff939326d4a9190864f0b88b002222243009d56fcefb2e8b361)

The late challenge finalized with `FINISHED_WITH_ERROR` because its challenge
window had closed; the incident remained provisional and was not retried. The
continuation finalized the unchanged incident once, then produced capability
state `APPLIED`, `consumed=true`, `dispatch_count=1`, and route pause state
`route_disabled=true` until `1792584354`. The subsequent health read confirms
that the bounded route pause expired normally and the current route is open.

## Test results

- Unit: 16 passed
- Direct Mode: 47 passed in CI
- Browser: 9 passed
- Contract lint and validation: passed
- Typecheck: passed
- Build: passed
- Source verification: 5/5 exact byte matches

Exact-head CI and deployment-health run IDs for the final repository commit are
recorded in the submission report. Workflows:
[CI](https://github.com/Bibidee/exigency/actions/workflows/ci.yml) and
[deployment health](https://github.com/Bibidee/exigency/actions/workflows/health.yml).

Browser mocks are development/test-only and unavailable in production.

## Limitations

- No live failed payout is attempted because the current targets have no payout
  path; the safety decision is structural rather than fabricated proof.
- Three moderate transitive/tooling npm advisories remain; `npm audit fix
  --force` would replace the pinned GenLayer CLI with a breaking version, so no
  unsafe forced upgrade was applied.
- Some historical lifecycle hashes remain `NOT RECORDED`.
- Direct Mode is limited locally on Windows but passes in GitHub CI.
