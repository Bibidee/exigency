# Validation Report

Current validated application source: `7ab85526e3562f10679fe7f9637ce2ed98486aae`;
contract source commit `2d69aa122adbb122759db43527266f4fcc5427da` remains
deployed to Studionet 61999. The public source-of-truth manifest is
`deployment-manifest.public.json`; all four deployed contract byte hashes
match the repository exactly.

## Local validation

- `python -m py_compile contracts/*.py` — PASS, all four contracts.
- `pytest tests/unit -q` — **14 passed**.
- `pytest tests/direct -q` — **43 passed** (including adversarial Engine/Gate
  envelope coverage and the premature success-close trust-boundary test).
- `genvm-lint check` — PASS for all four contracts.
- `genvm-lint validate` — PASS for all four contracts.
- `npm run toolchain:check` — PASS.
- `npm run typecheck` — PASS.
- `npm run build` — PASS.
- `npm audit` — 5 moderate findings, 0 high, 0 critical. Findings are in
  transitive CLI/test dependencies (`vitest`, `@vitest/mocker`, `dockerode`,
  `uuid`); the suggested `genlayer@0.0.35` fix would replace the pinned
  `0.39.1` CLI and was not applied blindly.

## Security coverage added in this pass

- Withdrawal in-flight tracking is per holder; one unresolved payout cannot
  freeze unrelated holders.
- `origin_address` and exact refunded value correlate failure recovery.
- Acknowledgement releases the holder lock while retaining a keyed recovery
  candidate for a possible late child failure.
- Recovery first selects the current exact-value `DISPATCHED` record; historical
  acknowledged matches are considered only when there is no active dispatch,
  and ambiguous acknowledged matches fail closed.
- Acknowledged recovery candidates are holder-scoped and capped at 32 entries;
  proven successful payouts transition to `SUCCESS_CLOSED` and retire their
  candidates, so 33rd and 40th successful same-holder withdrawals remain
  reusable. Unclosed acknowledgements still fail closed at the bound.
- Duplicate failure delivery is idempotent; retry reuses one exact record.
- Direct Mode covers direct-EOA identity, acknowledgement-before-resolution,
  repeated same-holder withdrawals, multi-user isolation, retry conservation
  and duplicate failure delivery.

## Current deployment

- Network: Studionet, chain **61999**.
- RPC: `https://studio.genlayer.com/api`.
- Registry: `0xa034003895e4b3506a5aE1d5dD02492603fF1B6a`.
- Engine: `0x2ff218faad3A858A2e8F5ce89558f7E2E7f72815`.
- Gate: `0x507eBD4fD0432cB266D7dfCC42c02ffB76667F0A`.
- Vault: `0x6821fa5fF7a67856BB340ae64a83AFCE5dF299ce`.
- Engine binding transaction:
  `0xf0c154b7ef55f1a4664e730077e44c434240e7ae40c4887a4297f547fbb4067a`.
- Source commit for the deployed contract bytes:
  `2d69aa122adbb122759db43527266f4fcc5427da`.
- Exact source verification: PASS for Registry, Engine, Gate and Vault.

Deployment transaction hashes and SHA-256 values are recorded in
`deployment-manifest.public.json`.

## Hosted application and health

- Production: [https://exigency.vercel.app](https://exigency.vercel.app).
- Vercel deployment `dpl_7KHhNwBPSs4CdSxPt8Ko77AoY6cJ` reached READY on
  `2026-09-30T21:56:01Z` and was aliased to production. Vercel did not expose
  an independent Git SHA binding; the deployment was created from a clean
  tracked-files snapshot of the frontend source commit above. Evidence-only
  documentation commits may follow without changing the deployed frontend.
- Production Playwright completed **10** passing browser tests.
- Browser E2E mocks are test-only and unavailable in production code paths. Every
  runtime mock hook is gated by `process.env.NODE_ENV !== "production"`; the
  mock object is installed only by the browser test fixtures.
- The browser walkthrough verified `/`, `/command` and `/vault`.
- The health check reads the Registry, Engine, Gate and Vault, verifies vault
  gate wiring and gate engine wiring, checks all three hosted routes, confirms
  Studionet RPC reachability and runs exact source verification in the
  workflow.
- The final exact-head CI is [run
  36782459920](https://github.com/Bibidee/exigency/actions/runs/36782459920),
  and deployment-health is [run
  36783529434](https://github.com/Bibidee/exigency/actions/runs/36783529434),
  both on frontend source commit `7ab85526e3562f10679fe7f9637ce2ed98486aae`. The workflow
  covers contract validation, Python/unit/direct tests, frontend typecheck/build,
  10 browser tests, hosted routes, Studionet RPC, contract wiring and source
  verification. Deployment-health is also scheduled every six hours.

## Fresh live accounting proof

### Latest Brave session (current observed state)

The latest manual Brave proof used owner wallet `0x4a7d…32f5` for the valid
lifecycle. A second wallet `0xff20…9b54` was used only for the negative
owner-authorization check; its incident attempt correctly rolled back with
`only charter owner may request emergency authority`.

- charter: `CU-CHARTER-20260930-01`;
- charter publish tx: `0x88bae13d97d958de33666e47664f1fb3ad3447f690fc5ffc1ab8b37f1341eb6a`;
- charter activation tx: **NOT RECORDED**; active-charter read returned the new key;
- incident: `CU-INCIDENT-20260930-01`;
- rejected non-owner incident tx: `0x3826bd77ea585bef296e8629afb77f211acdeefc72f74d7694fa35761a4fbb0d`;
- owner incident tx: `0xc642057c7acfa2922b42d156f464346fcf5a46f0869cd821011d42dd3298042f`;
- assessment tx: `0x5962a28b9939074178741d5883a42549c305594fb8929dcb7aea09db0f7de7a4`;
- capability: `EXC-CU-INCIDENT-20260930-01`; issuance child: **NOT RECORDED**;
- capability execute tx: `0x8f06019efebc7b6d15d114748d789e10e9ce67085486d46493b5e39ab911fb00`;
- protected-Vault child / reconcile tx: **NOT RECORDED**;
- latest deposit `0.010 GEN`: `0x0c2268e8fbc43dcd73c40616cc9daac109b7d57d06dc16c8b6e406fcdab0d523`;
- latest withdrawal parent / payout child: `0xd4df78b62aa572029b4da8c516551c5b6f3e07670f35beb1031f113716fe27c` /
  `0xe76369bacac9ed3ece9dbda86865010540330645681a3d4c442888b370d72ab8`;
- acknowledgement tx: `0xd242a03df3742318437208985c6b3f2c32375e9a6fdcf7a750fc7a6638172f27`;
- success-close tx: `0xfcb6366f3fbdec9faadd5cd3e3a52c7880b39999974b62a509c2e40627f689a1`;
- current observed holder credit: `0.005 GEN`; total credited: `0.010 GEN`;
- pause state: withdrawals OPEN, deposits OPEN; active withdrawal empty; latest
  record `SUCCESS_CLOSED`; recovery metadata retired.

This manual proof is separate from the older CLI run below and supersedes its
`0.005 GEN` current-state wording.

The unlocked-CLI Studionet proof completed successfully against the fresh vault.
It used one deposit and two same-holder withdrawals:

- account: `0x865e118a3be4FA0760775565fCd31be156e1e3d7`;
- deposit `0.015 GEN`: `0x74c69aed38622ab930ad7369a9ddd241ff726861ba25b4f6879878d0478ca548`;
- first withdrawal parent / payout child: `0xb7dcbf7688307d35514395754da61135e6f8468561a3348e394d9ae84dd1315d` /
  `0xed3c79cf7f9259efb63ed969a909add99d0c546c254eba1221de22f1832f8ab6`;
- first acknowledgement / close: `0xf22cb55443080184cabae0a262915089b8c68aa94ecb5e8b4b2e58c98cf0dc96` /
  `0x1bf1648f13b7b9ae71aa937f3e76664d7dce6c4967fdcf253323a27040331d5a`;
- second withdrawal parent / payout child: `0x31aa4cc23714407f8b8c5c6d0fc579fc981650063a95e52e45d199b58bfea378` /
  `0xebbce34e8449af40a9a0e120e70c3664b945cc3c557c50620b08da8c339fbe71`;
- second acknowledgement / close: `0x0d243b7ea6424a4784f446a82c76c55de5887f50ec3c4450998c30195c2191bc` /
  `0xc5e6b4c1beac63fabc050f9cd772e126b8c4e581c75648198bacc13cfe96707d`;
- each payout recipient matched the account, amount was `5000000000000000` wei,
  and `value_credited` was true;
- final holder credit and total credited: `5000000000000000` wei (`0.005 GEN`);
- both withdrawal records were distinct `SUCCESS_CLOSED` records and neither
  remained in the recovery candidate list. This is the expected result for
  `0.015 - 0.005 - 0.005 GEN` with successful-closure retirement.

The live accounting script remains opt-in. The temporary CLI export was removed
after the run; no private key was committed.

## Fresh immutable lifecycle evidence

The opt-in live lifecycle completed against the current fresh Studionet stack.
It created and activated `CI-LIVE-1790777878`, opened
`CI-INC-1790777878`, reached `TRIGGER_CONFIRMED`, issued
`EXC-CI-INC-1790777878`, dispatched the capability once through the new Gate,
finalized the protected-Vault child, and reconciled to `APPLIED` with
`consumed: true`. The final Vault pause was observed and later expired. The
test harness does not emit a durable transaction manifest for this run, so the
fresh record keys and final states are recorded without inventing hashes.

The fixture used immutable URLs pinned to pushed commit
`84de2b15e428497bc6dec64aedf54d1ee1c06761`; both evidence files returned HTTP
200 and were committed as source commitments by the live assessment. The test
remains opt-in because it creates fresh consensus records.

A real live payout failure was not fabricated: this deployment pays the
holder EOA directly, so a failed child cannot be induced safely from the UI.
The failure/recovery matrix remains covered by the Direct Mode suite.
