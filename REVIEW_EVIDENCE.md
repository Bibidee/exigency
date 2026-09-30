# EXIGENT Review Evidence

## CURRENT CANONICAL DEPLOYMENT

- Source commit deployed: `ff0fa440dd4fdc6171918a0498d60efc69334573`.
- Network: Studionet 61999; RPC `https://studio.genlayer.com/api`.
- Registry: `0xF90B40Ee10CD75c8EEed86c02DA1Baf0CeA53ac3`.
- Engine: `0x2e0051F7Dcad06c6715c8E995e5afe095B5d8c23`.
- Gate: `0x4834294DE7C8CBEa2ad0A25F7C8B5e93f233E263`.
- Vault: `0x78C968f8409694575F828d015ce210a282de6530`.

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
| ProtectedVault | `99b4a7bb174c0f81e31b0b011b8dcdaeaa0228f678d4387be6017f09abcb504b` |

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
- Deposit `0.015 GEN`: `0xe66c0b4f04ba02ad3c4a6891e100a74204daa8377429d4d2da5c3db888d7ab2b`.
- First withdrawal parent / child: `0x6bda4b9cd6b2b2db3715ec8959cc726f9b78379fe85f458b0f5f0d6669fac14a` /
  `0xbd059c0fa38e7b26cb07dbb6a6da383413a7327cb3bc764ae74321044e1d51b2`.
- First acknowledgement: `0xb13538c328c670eb01e94eea7185d5e08a7fcedc92d49e3946a1b7aec0ec9c64`.
- Second withdrawal parent / child: `0xc994be8a4e4535cc6f9d85d91f80e01256774c32d9661883a1f66cf5af98d937` /
  `0xf92655c8b2cb8d85e6c6f72b73040d23af2ffdc4636904df6cefc998bd31a239`.
- Second acknowledgement: `0x633d1d2d9372cceece6d446285b2ded7eaef75987f6b5dafe12c70d191609396`.
- Both children paid the account exactly `5000000000000000` wei with
  `value_credited: true`; final credit and total were `5000000000000000` wei.

## CURRENT SECURITY TESTS

- Unit: 14 passed.
- Direct Mode: 30 passed, including active-dispatch priority,
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
  at 32 per holder.
- The full live authority write fixture remains opt-in because it creates fresh
  consensus records; it was executed successfully for the current deployment
  during this final audit.
- A real live payout failure was not fabricated: this deployment pays the
  holder EOA directly, so a failed child cannot be induced safely from the UI.
  The failure/recovery matrix remains covered in Direct Mode.

## HISTORICAL EVIDENCE

Previous deployments, CI runs and browser captures remain in Git history. They
are retained for audit context but are not current deployment claims.
