# EXIGENT Final Handoff Status

## CURRENT CANONICAL STATE — 2026-09-30

- Hardened source commit: `ff0fa440dd4fdc6171918a0498d60efc69334573` — `Prioritize active payout recovery`.
- Branch: `main`; repository: [Bibidee/exigency](https://github.com/Bibidee/exigency).
- Network: Studionet 61999; RPC: `https://studio.genlayer.com/api`.
- Production frontend: [https://exigency.vercel.app](https://exigency.vercel.app).
- Vercel deployment `dpl_4W1ZgoqduQuDN4yEBjSjg2p6dcvU` reached READY and is
  aliased to the production domain.

## SECURITY FIXES

- Replaced the global `active_withdrawal_key` with
  `active_withdrawal_by_holder`. One user's unresolved payout cannot deny
  service to unrelated holders.
- Failure recovery uses the preserved GenLayer `origin_address` and exact
  refunded value. It restores exactly one holder record and is idempotent.
- Acknowledgement releases the holder lock while retaining a keyed recovery
  candidate. A late failure can still move the record to
  `FAILED_RECOVERABLE` and restore the exact amount.
- Deposits, withdrawals, acknowledgements and retries require a direct EOA
  caller (`sender_address == origin_address`).
- Acknowledged withdrawals are reusable: repeated same-holder payouts create
  distinct records and do not leave a stale active pointer.
- Failure recovery first selects the current exact-value `DISPATCHED` record;
  historical acknowledged matches are considered only without an active
  dispatch, and ambiguous matches fail closed.
- Acknowledged recovery candidates are capped at 32 per holder to prevent
  unbounded state growth.
- Retry is limited to the original record, amount and destination. Acknowledged
  records cannot be replayed.
- The platform boundary and assumptions are documented in
  `docs/GENLAYER_VALUE_TRANSFER_SEMANTICS.md`.

## TEST RESULTS

- Unit: **14 passed**.
- Direct Mode: **30 passed**.
- Contract `genvm-lint check`: PASS for all four contracts.
- Contract `genvm-lint validate`: PASS for all four contracts.
- Typecheck: PASS.
- Production build: PASS.
- `npm audit`: 5 moderate, 0 high, 0 critical. The findings are transitive
  CLI/test dependencies; no blind major-version downgrade was applied.

## CURRENT DEPLOYMENT

| Contract | Address | Deployment transaction |
| --- | --- | --- |
| CharterRegistry | `0xF90B40Ee10CD75c8EEed86c02DA1Baf0CeA53ac3` | `0x2c534eeb65ea140e80e8ebfdb64b69f542a42f03ab17aacf5b538587d3df4f69` |
| ExigencyEngine | `0x2e0051F7Dcad06c6715c8E995e5afe095B5d8c23` | `0x10c6b7e86b0ac8827b5f13335d94f954ee7fe2668221478d95b1293f65fee750` |
| CapabilityGate | `0x4834294DE7C8CBEa2ad0A25F7C8B5e93f233E263` | `0xba594ab946703860bba65c3d5bb6e05f896ea40f999ab1e0c6bb149023cbbd99` |
| ProtectedVault | `0x78C968f8409694575F828d015ce210a282de6530` | `0x7a61135e9e892769047e077e98146252f5c54372bee734d568831cc9b7e99312` |

Bind transaction: `0xd3b1c458da0767c201e3e46fb37c6df5fe4765fc7d51bb8fb0a86d6d83d0c5d3`.

Deployed source commit: `ff0fa440dd4fdc6171918a0498d60efc69334573`. `npm run source:verify` passed with exact
byte matches for all four contracts.

## HEALTH

`npm run health:check` passed locally. The final exact-head deployment-health
workflow is dispatched after this evidence update and recorded in the final
report. It checks `/`,
`/command`, `/vault`, Studionet RPC reachability, the manifest chain and all
four contract reads, plus Vault → Gate and Gate → Engine wiring. The
deployment-health workflow is scheduled every six hours and is manually
dispatched for the final deployment.

## LIVE VAULT ACCOUNTING PROOF

- Account: `0x865e118a3be4FA0760775565fCd31be156e1e3d7`.
- Deposit: `0.015 GEN`, tx `0xe66c0b4f04ba02ad3c4a6891e100a74204daa8377429d4d2da5c3db888d7ab2b`.
- First withdrawal parent / child: `0x6bda4b9cd6b2b2db3715ec8959cc726f9b78379fe85f458b0f5f0d6669fac14a` /
  `0xbd059c0fa38e7b26cb07dbb6a6da383413a7327cb3bc764ae74321044e1d51b2`.
- First acknowledgement: `0xb13538c328c670eb01e94eea7185d5e08a7fcedc92d49e3946a1b7aec0ec9c64`.
- Second withdrawal parent / child: `0xc994be8a4e4535cc6f9d85d91f80e01256774c32d9661883a1f66cf5af98d937` /
  `0xf92655c8b2cb8d85e6c6f72b73040d23af2ffdc4636904df6cefc998bd31a239`.
- Second acknowledgement: `0x633d1d2d9372cceece6d446285b2ded7eaef75987f6b5dafe12c70d191609396`.
- Both payout children matched the connected account, paid `0.005 GEN` and
  reported `value_credited: true`. Final holder credit and total:
  `5000000000000000` wei (`0.005 GEN`).

The live automation remains opt-in; the temporary CLI export was removed after
the run and no secret was committed.

## IMMUTABLE LIFECYCLE EVIDENCE

The earlier opt-in live authority fixture completed successfully against the
previous full-stack deployment. This targeted recovery redeployment was
followed by fresh accounting and health verification; no new authority writes
were needed for this recovery-only pass:

- charter: `CI-LIVE-1790727716`;
- incident: `CI-INC-1790727717`, assessment decision `TRIGGER_CONFIRMED`;
- assessment parent: `0x718c2d54752259da4d5acc2032fb79f241858ef2cbb4a7ed3e55b7813e661d74`;
- finalized issuance child: `0xb1e5c375433b34949084c005c50cccfebedf95bf2d18ac9339047459bf7ed5ef`;
- capability: `EXC-CI-INC-1790727717`, `dispatch_status: APPLIED`,
  `dispatch_count: 1`;
- protected-vault child: `0xdfdc5ebc41fe1e8566ca7fcd00b7489da5d1ae397cf99a2918518660413bb66d`;
- reconcile: `0xc7bbdaffb2ef4402e2360443bf89ab84ca1b38cc791a54ca320587fc5c5425f1`;
- target: the previous deployment's protected vault, with withdrawals paused
  for the requested duration.

The fixture uses commit-pinned evidence URLs at
`84de2b15e428497bc6dec64aedf54d1ee1c06761`; both files returned HTTP 200 and
were included in the finalized assessment commitments.

## HISTORICAL EVIDENCE

Earlier deployment and CI records remain in Git history and in the prior
review evidence commits. They are not the current deployment.
