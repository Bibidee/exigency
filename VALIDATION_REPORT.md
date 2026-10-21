# Validation report

## Verdict scope

The current deployment is a non-custodial emergency protected-action system.
It does not claim GEN deposits, payouts, refunds, or live failed-payout
recovery. The targets store no user value and expose no external payout path.

## Deployed V2 stack

- Network: Studionet 61999
- Registry: `0xA4dba5B0572B3D721955Ce3A9E3dc46F791e4C92`
- Engine: `0x903f895E256817aBFE97f101292B94F85d0b59BA`
- Gate: `0xE383404e8C00868A86BD412F4e72Cb13328Ed2EF`
- Protected vault: `0xF3dC371E50c296c6Ef1067eAe95104F864F391B3`
- Protected route: `0x7217760864796a1CaeDAaFB418b7d168a91331a4`
- Deployed contract source commit: `5c7664b59f6ac4ea6839dbf85e2ad3174fec96ef`
- Source verification: 5/5 exact byte matches

The committed `deployment-manifest.public.json` is the authoritative deployment
record. No contract redeployment was required for this test/documentation pass.

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

- Charter: `V2-LIVE-1792526492`
- Incident: `V2-INC-1792526492`
- Capability: `EXC-V2-INC-1792526492`
- Challenge: [0xb25a0ce0…4869](https://explorer-studio.genlayer.com/tx/0xb25a0ce07f9d5f069a5bb5fe18a63e13eac132ac8cef66982d119464e0cd4869)
- Finalization: [0xc6611149…ad42](https://explorer-studio.genlayer.com/tx/0xc661114921fb8cff2f00adce43224965dec0526beff2d32c81a785eb25fdad42)
- Capability issuance child: [0xc16668d0…2bd6c](https://explorer-studio.genlayer.com/tx/0xc16668d0aa0cc576d1e0886761573b74eefcbb3a67b779ace92a6c51f1b2bd6c)
- Capability execution: [0x200c8748…6da7](https://explorer-studio.genlayer.com/tx/0x200c874858c8878490b38495fc3e51048360a880f9acb7e3db50675865626da7)
- Protected-route child: [0x42029d19…7d3c](https://explorer-studio.genlayer.com/tx/0x42029d1932ce62d788c690d646237498bcbfc356e624a57477c7f9f47bcd7d3c)
- Reconciliation: [0x8a81bd52…a769](https://explorer-studio.genlayer.com/tx/0x8a81bd528935d49f5bd73b89e5c4bfdabc9e8cfb2ab29db0480e09bef921a769)

The final read showed `TRIGGER_CONFIRMED`, capability `APPLIED`,
`consumed=true`, and `route_disabled=true`. Missing parent transaction hashes
remain `NOT RECORDED`.

## Test results

- Unit: 16 passed
- Direct Mode: 43 passed in CI
- Browser: 9 passed
- Contract lint and validation: passed
- Typecheck: passed
- Build: passed
- Source verification: 5/5 exact byte matches

Exact-head CI for the current test tree:
[39559395702](https://github.com/Bibidee/exigency/actions/runs/39559395702).

Browser mocks are development/test-only and unavailable in production.

## Limitations

- No live failed payout is attempted because the current targets have no payout
  path; the safety decision is structural rather than fabricated proof.
- Three moderate transitive GenLayer/Vitest tooling advisories remain. The Vite
  high finding and all critical findings are cleared; no unsafe forced GenLayer
  downgrade was used.
- Some historical lifecycle hashes remain `NOT RECORDED`.
- Direct Mode is limited locally on Windows but passes in GitHub CI.
