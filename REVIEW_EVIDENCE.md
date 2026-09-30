# EXIGENT Review Evidence

## CURRENT CANONICAL DEPLOYMENT

- Source commit deployed: `2d69aa122adbb122759db43527266f4fcc5427da`.
- Network: Studionet 61999; RPC `https://studio.genlayer.com/api`.
- Registry: `0xa034003895e4b3506a5aE1d5dD02492603fF1B6a`.
- Engine: `0x2ff218faad3A858A2e8F5ce89558f7E2E7f72815`.
- Gate: `0x507eBD4fD0432cB266D7dfCC42c02ffB76667F0A`.
- Vault: `0x6821fa5fF7a67856BB340ae64a83AFCE5dF299ce`.

The Gate address above is authoritative from the deployment manifest and the
Vault wiring read; the public manifest contains the exact case-preserving
address and transaction values.

## CURRENT CI

The final exact-head CI and deployment-health runs are dispatched after this
evidence update and recorded in the final report. CI covers contract
validation, Python/unit/direct tests, frontend typecheck/build, and 8 browser
regression tests.

## CURRENT SOURCE VERIFICATION

`npm run source:verify` passed after redeployment. Exact SHA-256 values:

| Contract | SHA-256 |
| --- | --- |
| CharterRegistry | `ea59f36b845897a247063e6664e6e5164af6ec53dbf4e7d85c489e2bebc99218` |
| ExigencyEngine | `0ad4fb5fdae59962d69c76eec9befc11b508ac43185ca69c0e0127514f885244` |
| CapabilityGate | `0480c0a730a111ee9a2e7542a92668a5976ee0ce57086a562b15e9a43ba2fdfe` |
| ProtectedVault | `83d25a3f8303ff99213b9b23f40480c969c71ab2076b81b9b1d6e17ffcb8c940` |

## CURRENT HEALTH

The deployment-health workflow verifies all three hosted routes, RPC
reachability, chain 61999, Registry/Engine/Gate/Vault reads, Vault → Gate
wiring, Gate → Engine wiring and source verification.

Production Vercel deployment `dpl_4W1ZgoqduQuDN4yEBjSjg2p6dcvU` reached READY
and is aliased to [exigency.vercel.app](https://exigency.vercel.app).

## CURRENT AUTHORITY LIFECYCLE

The fresh opt-in live fixture completed against the current deployment:

- charter: `CI-LIVE-1790774289`;
- incident: `CI-INC-1790774289`, with `TRIGGER_CONFIRMED` in its assessment;
- publish / activate / open incident:
  `0xbe4390cafc6e1c628fd1c0fc7d4fa302e832c815f671860c691cb7549fd77628` /
  `0x5754bdce1f915d9b35a207b5a62e60f18a3be47da7d0f0bc16f55941077ace93` /
  `0x91eb575bacdf4cf9b2f17dcecffa7d7d2f281de440dfdd7088e3822de25b09ae`;
- assessment parent / issuance child:
  `0xdee27572e2815362d67233c431d1f160978fdaba8485ee232a75fee4aea9225d` /
  `0x585a924b779c554a8c3074cd1cbc34c5a92aadbbb4865c03d9d3b589ccb52554`;
- capability: `EXC-CI-INC-1790774289`, `APPLIED`, `consumed: true`,
  `dispatch_count: 1`;
- execution parent / protected-vault child:
  `0x543350552ba18298bd9394bebca4a772a9bba57277537c00adf9eb796feda27d` /
  `0x75428d6d7f4df5efb77bbabed42e21858bd9178322da3d6a28d1ec1be8858afb`;
- reconcile:
  `0x598b74005c8b0808e0571d8806a3da881d41eb4bdc06044ae14c7d1aeabeeaca`;
- Vault: withdrawals paused for the requested duration.

The fixture uses immutable, real evidence files:

- [primary evidence](https://raw.githubusercontent.com/Bibidee/exigency/84de2b15e428497bc6dec64aedf54d1ee1c06761/demo/evidence/active_incident_primary.md)
- [secondary evidence](https://raw.githubusercontent.com/Bibidee/exigency/84de2b15e428497bc6dec64aedf54d1ee1c06761/demo/evidence/active_incident_secondary.md)

Both URLs returned HTTP 200 before this update.

## CURRENT VAULT ACCOUNTING

- Account: `0x865e118a3be4FA0760775565fCd31be156e1e3d7`.
- Deposit `0.015 GEN`: `0x74c69aed38622ab930ad7369a9ddd241ff726861ba25b4f6879878d0478ca548`.
- First withdrawal parent / child: `0xb7dcbf7688307d35514395754da61135e6f8468561a3348e394d9ae84dd1315d` /
  `0xed3c79cf7f9259efb63ed969a909add99d0c546c254eba1221de22f1832f8ab6`.
- First acknowledgement / close: `0xf22cb55443080184cabae0a262915089b8c68aa94ecb5e8b4b2e58c98cf0dc96` /
  `0x1bf1648f13b7b9ae71aa937f3e76664d7dce6c4967fdcf253323a27040331d5a`.
- Second withdrawal parent / child: `0x31aa4cc23714407f8b8c5c6d0fc579fc981650063a95e52e45d199b58bfea378` /
  `0xebbce34e8449af40a9a0e120e70c3664b945cc3c557c50620b08da8c339fbe71`.
- Second acknowledgement / close: `0x0d243b7ea6424a4784f446a82c76c55de5887f50ec3c4450998c30195c2191bc` /
  `0xc5e6b4c1beac63fabc050f9cd772e126b8c4e581c75648198bacc13cfe96707d`.
- Both children paid the account exactly `5000000000000000` wei with
  `value_credited: true`; final credit and total were `5000000000000000` wei.

## CURRENT SECURITY TESTS

- Unit: 14 passed.
- Direct Mode: 34 passed, including active-dispatch priority,
  acknowledgement-before-resolution recovery,
  duplicate failure delivery, multi-holder isolation and retry conservation.
- Contract lint and validation: PASS for all four contracts.
- Dependency audit: 5 moderate, 0 high, 0 critical.

## CURRENT KNOWN LIMITATIONS

- The private-key live accounting script is intentionally opt-in; the fresh
  unlocked-CLI funded proof is recorded above.
- GenLayer has no documented contract-side successful-child callback or child
  identifier in the error context for an external EOA value transfer. The
  contract prioritizes the current exact-value `DISPATCHED` record, fails closed
  on ambiguous acknowledged matches, and caps acknowledged recovery candidates
  at 32 per holder. The application closes candidates only after independently
  proving the successful child.
- The full live authority write fixture remains opt-in because it creates fresh
  consensus records; it was executed successfully for the current deployment
  during this final audit.
- A real live payout failure was not fabricated: this deployment pays the
  holder EOA directly, so a failed child cannot be induced safely from the UI.
  The failure/recovery matrix remains covered in Direct Mode.

## HISTORICAL EVIDENCE

Previous deployments, CI runs and browser captures remain in Git history. They
are retained for audit context but are not current deployment claims.
