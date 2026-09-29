# Validation Report

Current validated state: final security-hardening source commit `6177778`
deployed to Studionet 61999. The public source-of-truth manifest is
`deployment-manifest.public.json`; all four deployed contract byte hashes
match the repository exactly.

## Local validation

- `python -m py_compile contracts/*.py` — PASS, all four contracts.
- `pytest tests/unit -q` — **14 passed**.
- `pytest tests/direct -q` — **21 passed**.
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
- Settlement retains the recovery pointer, so a direct premature settlement
  cannot destroy late-failure recovery.
- Duplicate failure delivery is idempotent; retry reuses one exact record.
- Direct Mode covers settlement-before-resolution, multi-user isolation,
  retry conservation and duplicate failure delivery.

## Current deployment

- Network: Studionet, chain **61999**.
- RPC: `https://studio.genlayer.com/api`.
- Registry: `0xc7101303e80a5E51902A434348f1a65651839674`.
- Engine: `0x55CFEc4329E067368BFA9CdbDec003326dF50148`.
- Gate: `0xa98D7B5C8bdEF8089d685A9311A8DC697095171f`.
- Vault: `0xFaCeF3154913C0b7e40E4D2A9233d770c399dD5C`.
- Engine binding transaction:
  `0x14c17b3ca1e6ba5ac8d429d2174be0ca5e59ca7ba534d245a2a81c2165365361`.
- Source commit for the deployed contract bytes: `6177778`.
- Exact source verification: PASS for Registry, Engine, Gate and Vault.

Deployment transaction hashes and SHA-256 values are recorded in
`deployment-manifest.public.json`.

## Hosted application and health

- Production: [https://exigency.vercel.app](https://exigency.vercel.app).
- Vercel deployment `dpl_3kvkDckNyNYp8GnMAcCYXapivHLA` reached READY and was
  aliased to production.
- The browser walkthrough verified `/`, `/command` and `/vault`.
- The health check reads the Registry, Engine, Gate and Vault, verifies vault
  gate wiring and gate engine wiring, checks all three hosted routes, confirms
  Studionet RPC reachability and runs exact source verification in the
  workflow.
- The final exact-head [CI run](https://github.com/Bibidee/exigency/actions/runs/36642197118)
  passed, including 8 browser tests. The final [deployment-health run](https://github.com/Bibidee/exigency/actions/runs/36642215629)
  also passed. Deployment-health is manually dispatched after each final deployment and is
  also scheduled every six hours.

## Live accounting proof

The browser-authorized Studionet proof completed successfully:

- deposit: `0.01 GEN`, tx
  `0x4930be0da7a66602cfb5e82192f92bc18f155589bc2bdd0783de8a2dbdb6760a`;
- withdrawal: `0.005 GEN`, parent tx
  `0x002f6e453d267f1df5fda2f7714336cce03efee0d92356549a12df76268b2513`;
- payout child:
  `0x1677b90448a449f7cdfe75d07ff7e9aeecc500ef205ab3a36f77e2e5e700aaff`;
- child recipient: `0x4A7D76b8C4668a3426d6d54eC24b41Fa87b532f5`;
- child amount: `5000000000000000` wei;
- `value_credited: true`;
- settlement tx:
  `0x40fe6717dcd51a4fcb144167769befc36469ed85ce5a85e7ad3c73a575ba85c9`;
- final holder credit and total credited: `5000000000000000` wei.

The private-key live accounting script remains opt-in. No private key is
required for the browser-authorized proof, and no secret was committed.

## Immutable lifecycle evidence

The opt-in live lifecycle fixture uses immutable URLs pinned to pushed commit
`84de2b15e428497bc6dec64aedf54d1ee1c06761`; both evidence files were verified
with HTTP 200 before this update. The full positive lifecycle remains an
opt-in write test because it creates fresh consensus records.
