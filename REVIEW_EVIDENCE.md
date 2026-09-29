# EXIGENT Review Evidence

## CURRENT CANONICAL DEPLOYMENT

- Source commit deployed: `6177778`.
- Network: Studionet 61999; RPC `https://studio.genlayer.com/api`.
- Registry: `0xc7101303e80a5E51902A434348f1a65651839674`.
- Engine: `0x55CFEc4329E067368BFA9CdbDec003326dF50148`.
- Gate: `0xa98D7B5C8bdEF8089d685A9311A8DC697095171f`.
- Vault: `0xFaCeF3154913C0b7e40E4D2A9233d770c399dD5C`.

The Gate address above is authoritative from the deployment manifest and the
Vault wiring read; the public manifest contains the exact case-preserving
address and transaction values.

## CURRENT CI

The final hardening commit is [0f5228f](https://github.com/Bibidee/exigency/commit/0f5228f1d280a8ba8d4081331834f03ea0fe806a).
Its exact-head [CI run](https://github.com/Bibidee/exigency/actions/runs/36642197118)
passed: contract validation, Python/unit/direct tests, frontend typecheck/build,
and 8 browser tests.

## CURRENT SOURCE VERIFICATION

`npm run source:verify` passed after redeployment. Exact SHA-256 values:

| Contract | SHA-256 |
| --- | --- |
| CharterRegistry | `ea59f36b845897a247063e6664e6e5164af6ec53dbf4e7d85c489e2bebc99218` |
| ExigencyEngine | `0ad4fb5fdae59962d69c76eec9befc11b508ac43185ca69c0e0127514f885244` |
| CapabilityGate | `0480c0a730a111ee9a2e7542a92668a5976ee0ce57086a562b15e9a43ba2fdfe` |
| ProtectedVault | `8b1f606d7a052d4c0680cb7b57e72dd8e125c6cb869e0e5ce3a8c2c6d942dcb7` |

## CURRENT HEALTH

Local health passed after redeployment. The final [deployment-health run](https://github.com/Bibidee/exigency/actions/runs/36642215629)
also passed. The check verifies all three hosted
routes, RPC reachability, chain 61999, Registry/Engine/Gate/Vault reads, Vault
→ Gate wiring, Gate → Engine wiring and source verification in the workflow.

Production Vercel deployment `dpl_3kvkDckNyNYp8GnMAcCYXapivHLA` reached READY
and is aliased to [exigency.vercel.app](https://exigency.vercel.app).

## CURRENT AUTHORITY LIFECYCLE

The earlier finalized positive authority lifecycle remains historical proof in
Git history. The opt-in live fixture now uses immutable, real evidence files:

- [primary evidence](https://raw.githubusercontent.com/Bibidee/exigency/84de2b15e428497bc6dec64aedf54d1ee1c06761/demo/evidence/active_incident_primary.md)
- [secondary evidence](https://raw.githubusercontent.com/Bibidee/exigency/84de2b15e428497bc6dec64aedf54d1ee1c06761/demo/evidence/active_incident_secondary.md)

Both URLs returned HTTP 200 before this update.

## CURRENT VAULT ACCOUNTING

- Account: `0x4A7D76b8C4668a3426d6d54eC24b41Fa87b532f5`.
- Deposit `0.01 GEN`: `0x4930be0da7a66602cfb5e82192f92bc18f155589bc2bdd0783de8a2dbdb6760a`.
- Withdrawal parent `0.005 GEN`: `0x002f6e453d267f1df5fda2f7714336cce03efee0d92356549a12df76268b2513`.
- Payout child: `0x1677b90448a449f7cdfe75d07ff7e9aeecc500ef205ab3a36f77e2e5e700aaff`.
- Child recipient matched the account, amount was `5000000000000000` wei and
  `value_credited` was true.
- Settlement: `0x40fe6717dcd51a4fcb144167769befc36469ed85ce5a85e7ad3c73a575ba85c9`.
- Final credit and total: `5000000000000000` wei.

## CURRENT SECURITY TESTS

- Unit: 14 passed.
- Direct Mode: 21 passed, including settlement-before-resolution recovery,
  duplicate failure delivery, multi-holder isolation and retry conservation.
- Contract lint and validation: PASS for all four contracts.
- Dependency audit: 5 moderate, 0 high, 0 critical.

## CURRENT KNOWN LIMITATIONS

- The private-key live accounting script is intentionally opt-in; the live
  browser-approved flow is the recorded funded proof.
- GenLayer has no documented contract-side successful-child callback for an
  external EOA value transfer. The contract retains recovery state across the
  holder acknowledgement, while the frontend proves the child before sending
  that acknowledgement.
- The full live authority write fixture is opt-in because it creates fresh
  consensus records.

## HISTORICAL EVIDENCE

Previous deployments, CI runs and browser captures remain in Git history. They
are retained for audit context but are not current deployment claims.
