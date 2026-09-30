# Validation Report

Current validated state: source commit `2d69aa122adbb122759db43527266f4fcc5427da`
deployed to a fresh Studionet 61999 stack. The public source-of-truth manifest is
`deployment-manifest.public.json`; all four deployed contract byte hashes
match the repository exactly.

## Local validation

- `python -m py_compile contracts/*.py` — PASS, all four contracts.
- `pytest tests/unit -q` — **14 passed**.
- `pytest tests/direct -q` — **34 passed**.
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
- The production alias served the rebuilt frontend; production Playwright
  completed 8 passing browser tests.
- The browser walkthrough verified `/`, `/command` and `/vault`.
- The health check reads the Registry, Engine, Gate and Vault, verifies vault
  gate wiring and gate engine wiring, checks all three hosted routes, confirms
  Studionet RPC reachability and runs exact source verification in the
  workflow.
- The final CI and deployment-health runs for the handoff commit are dispatched
  after this evidence update and recorded in the final report. The workflow
  covers contract validation, Python/unit/direct tests, frontend typecheck/build,
  8 browser tests, hosted routes, Studionet RPC, contract wiring and source
  verification. Deployment-health is also scheduled every six hours.

## Fresh live accounting proof

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
It created and activated `CI-LIVE-1790774289`, opened
`CI-INC-1790774289`, finalized the assessment parent
`0xdee27572e2815362d67233c431d1f160978fdaba8485ee232a75fee4aea9225d` and
issuance child
`0x585a924b779c554a8c3074cd1cbc34c5a92aadbbb4865c03d9d3b589ccb52554`,
confirmed `TRIGGER_CONFIRMED`, issued `EXC-CI-INC-1790774289`, dispatched the
capability once through
`0x543350552ba18298bd9394bebca4a772a9bba57277537c00adf9eb796feda27d`,
finalized protected-vault child
`0x75428d6d7f4df5efb77bbabed42e21858bd9178322da3d6a28d1ec1be8858afb`, and
reconciled it with
`0x598b74005c8b0808e0571d8806a3da881d41eb4bdc06044ae14c7d1aeabeeaca`.
The charter publication transaction was
`0xbe4390cafc6e1c628fd1c0fc7d4fa302e832c815f671860c691cb7549fd77628`;
activation was
`0x5754bdce1f915d9b35a207b5a62e60f18a3be47da7d0f0bc16f55941077ace93`;
incident creation was
`0x91eb575bacdf4cf9b2f17dcecffa7d7d2f281de440dfdd7088e3822de25b09ae`.
The final capability state was `APPLIED`, `consumed: true`, `dispatch_count: 1`;
the final Vault state had `withdrawals_paused: true` for the requested duration.

The fixture used immutable URLs pinned to pushed commit
`84de2b15e428497bc6dec64aedf54d1ee1c06761`; both evidence files returned HTTP
200 and were committed as source commitments by the live assessment. The test
remains opt-in because it creates fresh consensus records.

A real live payout failure was not fabricated: this deployment pays the
holder EOA directly, so a failed child cannot be induced safely from the UI.
The failure/recovery matrix remains covered by the Direct Mode suite.
