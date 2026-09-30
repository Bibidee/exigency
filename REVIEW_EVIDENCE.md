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

## HISTORICAL EVIDENCE

Previous deployments, CI runs and browser captures remain in Git history. They
are retained for audit context but are not current deployment claims.
