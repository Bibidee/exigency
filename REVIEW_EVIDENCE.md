# EXIGENT Review Evidence

## CURRENT CANONICAL DEPLOYMENT

- Source commit deployed: `d26135cbdd72053dd49d6047457ba84764acbd4b`.
- Network: Studionet 61999; RPC `https://studio.genlayer.com/api`.
- Registry: `0x3d341D3Bc034a895d14aAc92a594999057017566`.
- Engine: `0x1dA0e885887623C27B96a9caa6058982F77dD4e3`.
- Gate: `0x8bccA48A34B2324C33097Ef3e913603e9D1e1649`.
- Vault: `0x7f78AD4BEe7Fb91562e5633e06958CC743c027eE`.

The Gate address above is authoritative from the deployment manifest and the
Vault wiring read; the public manifest contains the exact case-preserving
address and transaction values.

## CURRENT CI

The final exact-head CI run is recorded after the documentation commit below.
It covers contract validation, Python/unit/direct tests, frontend typecheck/build,
and browser regression tests.

## CURRENT SOURCE VERIFICATION

`npm run source:verify` passed after redeployment. Exact SHA-256 values:

| Contract | SHA-256 |
| --- | --- |
| CharterRegistry | `ea59f36b845897a247063e6664e6e5164af6ec53dbf4e7d85c489e2bebc99218` |
| ExigencyEngine | `0ad4fb5fdae59962d69c76eec9befc11b508ac43185ca69c0e0127514f885244` |
| CapabilityGate | `0480c0a730a111ee9a2e7542a92668a5976ee0ce57086a562b15e9a43ba2fdfe` |
| ProtectedVault | `bc8532339eedc367a17f43db4a53fcf1a852a1b5ac6cf5d813fde34c9969b293` |

## CURRENT HEALTH

Local health will be re-run against the production alias after the frontend
deployment. The check verifies all three hosted routes, RPC reachability, chain
61999, Registry/Engine/Gate/Vault reads, Vault → Gate wiring, Gate → Engine
wiring and source verification in the workflow.

Production Vercel deployment `dpl_H7fyxUo48Sp29TFZ2HfF47rfGSYy` reached READY
and is aliased to [exigency.vercel.app](https://exigency.vercel.app).

## CURRENT AUTHORITY LIFECYCLE

The fresh opt-in live fixture completed against the current deployment:

- charter: `CI-LIVE-1790727716`;
- incident: `CI-INC-1790727717`, with `TRIGGER_CONFIRMED` in its assessment;
- assessment parent / issuance child:
  `0x718c2d54752259da4d5acc2032fb79f241858ef2cbb4a7ed3e55b7813e661d74` /
  `0xb1e5c375433b34949084c005c50cccfebedf95bf2d18ac9339047459bf7ed5ef`;
- capability: `EXC-CI-INC-1790727717`, `APPLIED`, `consumed: true`,
  `dispatch_count: 1`;
- protected-vault child:
  `0xdfdc5ebc41fe1e8566ca7fcd00b7489da5d1ae397cf99a2918518660413bb66d`;
- reconcile:
  `0xc7bbdaffb2ef4402e2360443bf89ab84ca1b38cc791a54ca320587fc5c5425f1`;
- Vault: withdrawals paused for the requested duration.

The fixture uses immutable, real evidence files:

- [primary evidence](https://raw.githubusercontent.com/Bibidee/exigency/84de2b15e428497bc6dec64aedf54d1ee1c06761/demo/evidence/active_incident_primary.md)
- [secondary evidence](https://raw.githubusercontent.com/Bibidee/exigency/84de2b15e428497bc6dec64aedf54d1ee1c06761/demo/evidence/active_incident_secondary.md)

Both URLs returned HTTP 200 before this update.

## CURRENT VAULT ACCOUNTING

- Account: `0x865e118a3be4FA0760775565fCd31be156e1e3d7`.
- Deposit `0.01 GEN`: `0x7a4b4beac31cd713a0ebf60ade12f4ceab3fdd4602dc5b4f4f2f1e302e4287b1`.
- First withdrawal parent / child: `0x6c84f97796c992cca3e407acf0658c5cb60d8f561fff7f9603ec530fc282fa97` /
  `0xc7cbb1327e76ee0d03bfedba36194d39b836aeaaeb6fe82b31182255b734e3de`.
- First acknowledgement: `0xf079e8819337bd7c871599634d90240d2aab46730fafe2470628902adc18465a`.
- Second withdrawal parent / child: `0x992fa342d6f3a78753ed812e4e68e979fd9c6f51efdab8539e25ecabc0c58d31` /
  `0xb38ed47e0770afd791dab0835114584d88d89fcaee50aa32ca03e859400a4e19`.
- Second acknowledgement: `0x2c4460bbb58a0a773d0f193c87355ed920408ad352f23bb5ae64e4052f190a81`.
- Both children paid the account exactly `5000000000000000` wei with
  `value_credited: true`; final credit and total were `0` wei.

## CURRENT SECURITY TESTS

- Unit: 14 passed.
- Direct Mode: 25 passed, including acknowledgement-before-resolution recovery,
  duplicate failure delivery, multi-holder isolation and retry conservation.
- Contract lint and validation: PASS for all four contracts.
- Dependency audit: 5 moderate, 0 high, 0 critical.

## CURRENT KNOWN LIMITATIONS

- The private-key live accounting script is intentionally opt-in; the fresh
  unlocked-CLI funded proof is recorded above.
- GenLayer has no documented contract-side successful-child callback or child
  identifier in the error context for an external EOA value transfer. The
  contract retains a deterministic recovery candidate across acknowledgement,
  while the frontend proves the child before sending that acknowledgement.
- The full live authority write fixture remains opt-in because it creates fresh
  consensus records; it was executed successfully for the current deployment
  during this final audit.

## HISTORICAL EVIDENCE

Previous deployments, CI runs and browser captures remain in Git history. They
are retained for audit context but are not current deployment claims.
