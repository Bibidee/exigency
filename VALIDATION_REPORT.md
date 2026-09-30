# Validation Report

Current validated state: source commit `d26135cbdd72053dd49d6047457ba84764acbd4b`
deployed to a fresh Studionet 61999 stack. The public source-of-truth manifest is
`deployment-manifest.public.json`; all four deployed contract byte hashes
match the repository exactly.

## Local validation

- `python -m py_compile contracts/*.py` — PASS, all four contracts.
- `pytest tests/unit -q` — **14 passed**.
- `pytest tests/direct -q` — **25 passed**.
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
- Duplicate failure delivery is idempotent; retry reuses one exact record.
- Direct Mode covers direct-EOA identity, acknowledgement-before-resolution,
  repeated same-holder withdrawals, multi-user isolation, retry conservation
  and duplicate failure delivery.

## Current deployment

- Network: Studionet, chain **61999**.
- RPC: `https://studio.genlayer.com/api`.
- Registry: `0x3d341D3Bc034a895d14aAc92a594999057017566`.
- Engine: `0x1dA0e885887623C27B96a9caa6058982F77dD4e3`.
- Gate: `0x8bccA48A34B2324C33097Ef3e913603e9D1e1649`.
- Vault: `0x7f78AD4BEe7Fb91562e5633e06958CC743c027eE`.
- Engine binding transaction:
  `0x95c5815d6266c9c447fc1de4d823e7bfe5ec9cf5d67292fd98287014c39370f7`.
- Source commit for the deployed contract bytes:
  `d26135cbdd72053dd49d6047457ba84764acbd4b`.
- Exact source verification: PASS for Registry, Engine, Gate and Vault.

Deployment transaction hashes and SHA-256 values are recorded in
`deployment-manifest.public.json`.

## Hosted application and health

- Production: [https://exigency.vercel.app](https://exigency.vercel.app).
- Vercel deployment `dpl_H7fyxUo48Sp29TFZ2HfF47rfGSYy` reached READY and was
  aliased to production.
- The browser walkthrough verified `/`, `/command` and `/vault`.
- The health check reads the Registry, Engine, Gate and Vault, verifies vault
  gate wiring and gate engine wiring, checks all three hosted routes, confirms
  Studionet RPC reachability and runs exact source verification in the
  workflow.
- The exact-head [CI run](https://github.com/Bibidee/exigency/actions/runs/36684359707)
  for commit `775af51bbbeca78f55883ac74154b3c1b962fff2` passed, including 8 browser tests.
  The exact-head [deployment-health run](https://github.com/Bibidee/exigency/actions/runs/36684624430)
  also passed. Deployment-health is manually dispatched after each final deployment and is
  also scheduled every six hours.

## Fresh live accounting proof

The unlocked-CLI Studionet proof completed successfully against the fresh vault.
It used one deposit and two same-holder withdrawals:

- account: `0x865e118a3be4FA0760775565fCd31be156e1e3d7`;
- deposit `0.01 GEN`: `0x7a4b4beac31cd713a0ebf60ade12f4ceab3fdd4602dc5b4f4f2f1e302e4287b1`;
- first withdrawal parent: `0x6c84f97796c992cca3e407acf0658c5cb60d8f561fff7f9603ec530fc282fa97`;
- first payout child: `0xc7cbb1327e76ee0d03bfedba36194d39b836aeaaeb6fe82b31182255b734e3de`;
- first acknowledgement: `0xf079e8819337bd7c871599634d90240d2aab46730fafe2470628902adc18465a`;
- second withdrawal parent: `0x992fa342d6f3a78753ed812e4e68e979fd9c6f51efdab8539e25ecabc0c58d31`;
- second payout child: `0xb38ed47e0770afd791dab0835114584d88d89fcaee50aa32ca03e859400a4e19`;
- second acknowledgement: `0x2c4460bbb58a0a773d0f193c87355ed920408ad352f23bb5ae64e4052f190a81`;
- each payout recipient matched the account, amount was `5000000000000000` wei,
  and `value_credited` was true;
- final holder credit and total credited: `0` wei;
- both withdrawal records were distinct `ACKNOWLEDGED` records and both
  remained in the recovery candidate list.

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
