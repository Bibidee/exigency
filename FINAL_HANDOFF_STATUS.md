# EXIGENT Final Handoff Status

## CURRENT CANONICAL STATE — 2026-09-30

- Hardened source commit: `2d69aa122adbb122759db43527266f4fcc5427da` — `Retire successful payout recovery state`.
- Branch: `main`; repository: [Bibidee/exigency](https://github.com/Bibidee/exigency).
- Network: Studionet 61999; RPC: `https://studio.genlayer.com/api`.
- Production frontend: [https://exigency.vercel.app](https://exigency.vercel.app).
- Vercel deployment `dpl_Dv4vuEoYL3Gyo218SsNoqHVhMxto` reached READY and was
  aliased to the production domain; the final production Playwright suite
  passed all 8 browser checks.

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
- A proven successful payout transitions to `SUCCESS_CLOSED` through a
  holder-only close write, removing its recovery candidate without changing
  credit. Unclosed acknowledged candidates remain capped at 32 per holder.
- Retry is limited to the original record, amount and destination. Acknowledged
  records cannot be replayed.
- The platform boundary and assumptions are documented in
  `docs/GENLAYER_VALUE_TRANSFER_SEMANTICS.md`.

## TEST RESULTS

- Unit: **14 passed**.
- Direct Mode: **34 passed**.
- Contract `genvm-lint check`: PASS for all four contracts.
- Contract `genvm-lint validate`: PASS for all four contracts.
- Typecheck: PASS.
- Production build: PASS.
- `npm audit`: 5 moderate, 0 high, 0 critical. The findings are transitive
  CLI/test dependencies; no blind major-version downgrade was applied.

## CURRENT DEPLOYMENT

| Contract | Address | Deployment transaction |
| --- | --- | --- |
| CharterRegistry | `0xa034003895e4b3506a5aE1d5dD02492603fF1B6a` | `0x70c042ea2d427bcd095002552154ce022a47348d992d0aaa81bf280932d31cec` |
| ExigencyEngine | `0x2ff218faad3A858A2e8F5ce89558f7E2E7f72815` | `0xa0b9e378cc7f233b3a6341da44624ec1a8be66430715dbd6be4a0702ca467ba2` |
| CapabilityGate | `0x507eBD4fD0432cB266D7dfCC42c02ffB76667F0A` | `0xd0524735297a0fb34bae75a9c076d94c7a13e3872fcd05f0e7addca5c0a19f56` |
| ProtectedVault | `0x6821fa5fF7a67856BB340ae64a83AFCE5dF299ce` | `0xd6962fc9a164d3994eba18f4ec4da0dee09a864809179b150a32f05d7a2c7041` |

Bind transaction: `0xf0c154b7ef55f1a4664e730077e44c434240e7ae40c4887a4297f547fbb4067a`.

Deployed source commit: `2d69aa122adbb122759db43527266f4fcc5427da`. `npm run source:verify` passed with exact
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
- Deposit: `0.015 GEN`, tx `0x74c69aed38622ab930ad7369a9ddd241ff726861ba25b4f6879878d0478ca548`.
- First withdrawal parent / child: `0xb7dcbf7688307d35514395754da61135e6f8468561a3348e394d9ae84dd1315d` /
  `0xed3c79cf7f9259efb63ed969a909add99d0c546c254eba1221de22f1832f8ab6`.
- First acknowledgement / close: `0xf22cb55443080184cabae0a262915089b8c68aa94ecb5e8b4b2e58c98cf0dc96` /
  `0x1bf1648f13b7b9ae71aa937f3e76664d7dce6c4967fdcf253323a27040331d5a`.
- Second withdrawal parent / child: `0x31aa4cc23714407f8b8c5c6d0fc579fc981650063a95e52e45d199b58bfea378` /
  `0xebbce34e8449af40a9a0e120e70c3664b945cc3c557c50620b08da8c339fbe71`.
- Second acknowledgement / close: `0x0d243b7ea6424a4784f446a82c76c55de5887f50ec3c4450998c30195c2191bc` /
  `0xc5e6b4c1beac63fabc050f9cd772e126b8c4e581c75648198bacc13cfe96707d`.
- Both payout children matched the connected account, paid `0.005 GEN` and
  reported `value_credited: true`. Final holder credit and total:
  `5000000000000000` wei (`0.005 GEN`). Both records finished as
  `SUCCESS_CLOSED` and the recovery list was empty.

The live automation remains opt-in; the temporary CLI export was removed after
the run and no secret was committed.

## IMMUTABLE LIFECYCLE EVIDENCE

The fresh opt-in live authority fixture completed successfully against the new
full-stack deployment. It created charter `CI-LIVE-1790777878`, incident
`CI-INC-1790777878`, and capability `EXC-CI-INC-1790777878`; the finalized
assessment was `TRIGGER_CONFIRMED`, execution dispatched once, the protected
Vault child finalized, and reconciliation reached `APPLIED` with
`consumed: true`. The fixture verified the resulting Vault pause and later
health confirmed both pause windows had expired. This run generated fresh
records on the current addresses above; the harness does not emit a durable
transaction manifest for this lifecycle, so no unrecorded hash is presented.

The fixture uses commit-pinned evidence URLs at
`84de2b15e428497bc6dec64aedf54d1ee1c06761`; both files returned HTTP 200 and
were included in the finalized assessment commitments.

A real live payout failure was not fabricated. This deployment pays the holder
EOA directly, so a failed child cannot be induced safely from the UI;
failure/recovery remains proven by the Direct Mode suite.

## HISTORICAL EVIDENCE

Earlier deployment and CI records remain in Git history and in the prior
review evidence commits. They are not the current deployment.
