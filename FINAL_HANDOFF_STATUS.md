# EXIGENT Final Handoff Status

## CURRENT CANONICAL STATE — 2026-09-30

- Hardened source commit: `d26135cbdd72053dd49d6047457ba84764acbd4b` — `Make acknowledged withdrawals reusable`.
- Branch: `main`; repository: [Bibidee/exigency](https://github.com/Bibidee/exigency).
- Network: Studionet 61999; RPC: `https://studio.genlayer.com/api`.
- Production frontend: [https://exigency.vercel.app](https://exigency.vercel.app).
- Vercel deployment `dpl_H7fyxUo48Sp29TFZ2HfF47rfGSYy` reached READY and is
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
- Retry is limited to the original record, amount and destination. Acknowledged
  records cannot be replayed.
- The platform boundary and assumptions are documented in
  `docs/GENLAYER_VALUE_TRANSFER_SEMANTICS.md`.

## TEST RESULTS

- Unit: **14 passed**.
- Direct Mode: **25 passed**.
- Contract `genvm-lint check`: PASS for all four contracts.
- Contract `genvm-lint validate`: PASS for all four contracts.
- Typecheck: PASS.
- Production build: PASS.
- `npm audit`: 5 moderate, 0 high, 0 critical. The findings are transitive
  CLI/test dependencies; no blind major-version downgrade was applied.

## CURRENT DEPLOYMENT

| Contract | Address | Deployment transaction |
| --- | --- | --- |
| CharterRegistry | `0x3d341D3Bc034a895d14aAc92a594999057017566` | `0xa5499405b258b043630af994fa3bf433e2a51890fc97562d62f62992ee0fa36e` |
| ExigencyEngine | `0x1dA0e885887623C27B96a9caa6058982F77dD4e3` | `0x7e68dc0d35d31f9b589baf0a7018b89c15ead78ba6ad35e364172a6388744d6f` |
| CapabilityGate | `0x8bccA48A34B2324C33097Ef3e913603e9D1e1649` | `0xf21e43e9ba47e525f2a38f44588897b13d4e4ea4929ad3bb37bcd70e94fcc3c4` |
| ProtectedVault | `0x7f78AD4BEe7Fb91562e5633e06958CC743c027eE` | `0x3e6da8f33d3a0e3e9472e164344c006e901f1c0555fc655345066ae5f2a71d0a` |

Bind transaction: `0x95c5815d6266c9c447fc1de4d823e7bfe5ec9cf5d67292fd98287014c39370f7`.

Deployed source commit: `d26135cbdd72053dd49d6047457ba84764acbd4b`. `npm run source:verify` passed with exact
byte matches for all four contracts.

## HEALTH

`npm run health:check` and the final deployment-health workflow will be recorded
after the fresh frontend alias is ready. It checks `/`,
`/command`, `/vault`, Studionet RPC reachability, the manifest chain and all
four contract reads, plus Vault → Gate and Gate → Engine wiring. The
deployment-health workflow is scheduled every six hours and is manually
dispatched for the final deployment.

## LIVE VAULT ACCOUNTING PROOF

- Account: `0x865e118a3be4FA0760775565fCd31be156e1e3d7`.
- Deposit: `0.01 GEN`, tx `0x7a4b4beac31cd713a0ebf60ade12f4ceab3fdd4602dc5b4f4f2f1e302e4287b1`.
- First withdrawal parent / child: `0x6c84f97796c992cca3e407acf0658c5cb60d8f561fff7f9603ec530fc282fa97` /
  `0xc7cbb1327e76ee0d03bfedba36194d39b836aeaaeb6fe82b31182255b734e3de`.
- First acknowledgement: `0xf079e8819337bd7c871599634d90240d2aab46730fafe2470628902adc18465a`.
- Second withdrawal parent / child: `0x992fa342d6f3a78753ed812e4e68e979fd9c6f51efdab8539e25ecabc0c58d31` /
  `0xb38ed47e0770afd791dab0835114584d88d89fcaee50aa32ca03e859400a4e19`.
- Second acknowledgement: `0x2c4460bbb58a0a773d0f193c87355ed920408ad352f23bb5ae64e4052f190a81`.
- Both payout children matched the connected account, paid `0.005 GEN` and
  reported `value_credited: true`. Final holder credit and total: `0` wei.

The live automation remains opt-in; the temporary CLI export was removed after
the run and no secret was committed.

## IMMUTABLE LIFECYCLE EVIDENCE

The fresh opt-in live fixture completed against the current deployment:

- charter: `CI-LIVE-1790727716`;
- incident: `CI-INC-1790727717`, assessment decision `TRIGGER_CONFIRMED`;
- assessment parent: `0x718c2d54752259da4d5acc2032fb79f241858ef2cbb4a7ed3e55b7813e661d74`;
- finalized issuance child: `0xb1e5c375433b34949084c005c50cccfebedf95bf2d18ac9339047459bf7ed5ef`;
- capability: `EXC-CI-INC-1790727717`, `dispatch_status: APPLIED`,
  `dispatch_count: 1`;
- protected-vault child: `0xdfdc5ebc41fe1e8566ca7fcd00b7489da5d1ae397cf99a2918518660413bb66d`;
- reconcile: `0xc7bbdaffb2ef4402e2360443bf89ab84ca1b38cc791a54ca320587fc5c5425f1`;
- target: `0x7f78AD4BEe7Fb91562e5633e06958CC743c027eE`, with withdrawals paused for
  the requested duration.

The fixture uses commit-pinned evidence URLs at
`84de2b15e428497bc6dec64aedf54d1ee1c06761`; both files returned HTTP 200 and
were included in the finalized assessment commitments.

## HISTORICAL EVIDENCE

Earlier deployment and CI records remain in Git history and in the prior
review evidence commits. They are not the current deployment.
