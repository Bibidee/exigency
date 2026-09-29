# EXIGENT Final Handoff Status

## CURRENT CANONICAL STATE — 2026-09-29

- Hardened source commit: `6177778` — `Scope payout recovery per holder`.
- Branch: `main`; repository: [Bibidee/exigency](https://github.com/Bibidee/exigency).
- Network: Studionet 61999; RPC: `https://studio.genlayer.com/api`.
- Production frontend: [https://exigency.vercel.app](https://exigency.vercel.app).
- Vercel deployment `dpl_3kvkDckNyNYp8GnMAcCYXapivHLA` reached READY and is
  aliased to the production domain.

## SECURITY FIXES

- Replaced the global `active_withdrawal_key` with
  `active_withdrawal_by_holder`. One user's unresolved payout cannot deny
  service to unrelated holders.
- Failure recovery uses the preserved GenLayer `origin_address` and exact
  refunded value. It restores exactly one holder record and is idempotent.
- Settlement retains the recovery pointer. A direct settlement before child
  resolution cannot destroy late-failure recovery; a late failure invalidates
  the provisional settlement and restores the exact amount.
- Retry is limited to the original record, amount and destination. Settled
  records cannot be replayed.
- The platform boundary and assumptions are documented in
  `docs/GENLAYER_VALUE_TRANSFER_SEMANTICS.md`.

## TEST RESULTS

- Unit: **14 passed**.
- Direct Mode: **21 passed**.
- Contract `genvm-lint check`: PASS for all four contracts.
- Contract `genvm-lint validate`: PASS for all four contracts.
- Typecheck: PASS.
- Production build: PASS.
- `npm audit`: 5 moderate, 0 high, 0 critical. The findings are transitive
  CLI/test dependencies; no blind major-version downgrade was applied.

## CURRENT DEPLOYMENT

| Contract | Address | Deployment transaction |
| --- | --- | --- |
| CharterRegistry | `0xc7101303e80a5E51902A434348f1a65651839674` | `0x6668104103248fcdfae5de943c4319761f0577bed1deccad9429ad34bc81eb57` |
| ExigencyEngine | `0x55CFEc4329E067368BFA9CdbDec003326dF50148` | `0xc355cbc5ef4d38220175cf1358259df32e9cdae7979368c64710c070dd82e17b` |
| CapabilityGate | `0xa98D7B5C8bdEF8089d685A9311A8DC697095171f` | `0xd136fd04e7c6b5144aed4105f4469f482015e3fea48485c037357aeb67bd14a0` |
| ProtectedVault | `0xFaCeF3154913C0b7e40E4D2A9233d770c399dD5C` | `0x11c08b84085fd4b211259db2bd94774c0ef180f2be4bed3dcf66aef6e87af71c` |

Bind transaction: `0x14c17b3ca1e6ba5ac8d429d2174be0ca5e59ca7ba534d245a2a81c2165365361`.

Deployed source commit: `6177778`. `npm run source:verify` passed with exact
byte matches for all four contracts.

## HEALTH

`npm run health:check` passed locally after deployment, and the final [deployment-health workflow](https://github.com/Bibidee/exigency/actions/runs/36642215629)
passed. It checks `/`,
`/command`, `/vault`, Studionet RPC reachability, the manifest chain and all
four contract reads, plus Vault → Gate and Gate → Engine wiring. The
deployment-health workflow is scheduled every six hours and is manually
dispatched for the final deployment.

## LIVE VAULT ACCOUNTING PROOF

- Account: `0x4A7D76b8C4668a3426d6d54eC24b41Fa87b532f5`.
- Deposit: `0.01 GEN`, tx
  `0x4930be0da7a66602cfb5e82192f92bc18f155589bc2bdd0783de8a2dbdb6760a`.
- Withdrawal: `0.005 GEN`, parent
  `0x002f6e453d267f1df5fda2f7714336cce03efee0d92356549a12df76268b2513`.
- Payout child: `0x1677b90448a449f7cdfe75d07ff7e9aeecc500ef205ab3a36f77e2e5e700aaff`.
- Payout recipient: the connected account above.
- Payout amount: `5000000000000000` wei; `value_credited: true`.
- Settlement: `0x40fe6717dcd51a4fcb144167769befc36469ed85ce5a85e7ad3c73a575ba85c9`.
- Final holder credit and total credited: `5000000000000000` wei.

The private-key automation remains opt-in; the browser-authorized proof is the
recorded live proof and no secret was committed.

## IMMUTABLE LIFECYCLE EVIDENCE

The opt-in live fixture uses commit-pinned evidence URLs at
`84de2b15e428497bc6dec64aedf54d1ee1c06761`; both files returned HTTP 200.

## HISTORICAL EVIDENCE

Earlier deployment and CI records remain in Git history and in the prior
review evidence commits. They are not the current deployment.
