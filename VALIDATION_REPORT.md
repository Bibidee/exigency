# Validation Report

Current validated state: source commit `ff0fa440dd4fdc6171918a0498d60efc69334573`
deployed to a fresh Studionet 61999 stack. The public source-of-truth manifest is
`deployment-manifest.public.json`; all four deployed contract byte hashes
match the repository exactly.

## Local validation

- `python -m py_compile contracts/*.py` — PASS, all four contracts.
- `pytest tests/unit -q` — **14 passed**.
- `pytest tests/direct -q` — **30 passed**.
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
  the contract rejects further acknowledgements rather than growing state
  without bound.
- Duplicate failure delivery is idempotent; retry reuses one exact record.
- Direct Mode covers direct-EOA identity, acknowledgement-before-resolution,
  repeated same-holder withdrawals, multi-user isolation, retry conservation
  and duplicate failure delivery.

## Current deployment

- Network: Studionet, chain **61999**.
- RPC: `https://studio.genlayer.com/api`.
- Registry: `0xF90B40Ee10CD75c8EEed86c02DA1Baf0CeA53ac3`.
- Engine: `0x2e0051F7Dcad06c6715c8E995e5afe095B5d8c23`.
- Gate: `0x4834294DE7C8CBEa2ad0A25F7C8B5e93f233E263`.
- Vault: `0x78C968f8409694575F828d015ce210a282de6530`.
- Engine binding transaction:
  `0xd3b1c458da0767c201e3e46fb37c6df5fe4765fc7d51bb8fb0a86d6d83d0c5d3`.
- Source commit for the deployed contract bytes:
  `ff0fa440dd4fdc6171918a0498d60efc69334573`.
- Exact source verification: PASS for Registry, Engine, Gate and Vault.

Deployment transaction hashes and SHA-256 values are recorded in
`deployment-manifest.public.json`.

## Hosted application and health

- Production: [https://exigency.vercel.app](https://exigency.vercel.app).
- Vercel deployment `dpl_4W1ZgoqduQuDN4yEBjSjg2p6dcvU` reached READY and was
  aliased to production.
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
- deposit `0.015 GEN`: `0xe66c0b4f04ba02ad3c4a6891e100a74204daa8377429d4d2da5c3db888d7ab2b`;
- first withdrawal parent: `0x6bda4b9cd6b2b2db3715ec8959cc726f9b78379fe85f458b0f5f0d6669fac14a`;
- first payout child: `0xbd059c0fa38e7b26cb07dbb6a6da383413a7327cb3bc764ae74321044e1d51b2`;
- first acknowledgement: `0xb13538c328c670eb01e94eea7185d5e08a7fcedc92d49e3946a1b7aec0ec9c64`;
- second withdrawal parent: `0xc994be8a4e4535cc6f9d85d91f80e01256774c32d9661883a1f66cf5af98d937`;
- second payout child: `0xf92655c8b2cb8d85e6c6f72b73040d23af2ffdc4636904df6cefc998bd31a239`;
- second acknowledgement: `0x633d1d2d9372cceece6d446285b2ded7eaef75987f6b5dafe12c70d191609396`;
- each payout recipient matched the account, amount was `5000000000000000` wei,
  and `value_credited` was true;
- final holder credit and total credited: `5000000000000000` wei (`0.005 GEN`);
- both withdrawal records were distinct `ACKNOWLEDGED` records and both
  remained in the recovery candidate list. This is the expected result for
  `0.015 - 0.005 - 0.005 GEN`.

The live accounting script remains opt-in. The temporary CLI export was removed
after the run; no private key was committed.

## Fresh immutable lifecycle evidence

The opt-in live lifecycle completed against the fresh Studionet stack. It
created and activated `CI-LIVE-1790727716`, opened
`CI-INC-1790727717`, finalized the assessment parent
`0x718c2d54752259da4d5acc2032fb79f241858ef2cbb4a7ed3e55b7813e661d74` and
issuance child
`0xb1e5c375433b34949084c005c50cccfebedf95bf2d18ac9339047459bf7ed5ef`,
confirmed `TRIGGER_CONFIRMED`, issued `EXC-CI-INC-1790727717`, dispatched the
capability once, finalized protected-vault child
`0xdfdc5ebc41fe1e8566ca7fcd00b7489da5d1ae397cf99a2918518660413bb66d`, and
reconciled it with `0xc7bbdaffb2ef4402e2360443bf89ab84ca1b38cc791a54ca320587fc5c5425f1`.
The final capability state was `APPLIED`, `consumed: true`, `dispatch_count: 1`;
the final Vault state had `withdrawals_paused: true` for the requested duration.

The fixture used immutable URLs pinned to pushed commit
`84de2b15e428497bc6dec64aedf54d1ee1c06761`; both evidence files returned HTTP
200 and were committed as source commitments by the live assessment. The test
remains opt-in because it creates fresh consensus records.
