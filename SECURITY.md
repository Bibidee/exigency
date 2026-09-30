# Security Model

## Core invariants

1. **No capability before finality.** A semantic assessment may store an accepted result, but authority issuance is an `on="finalized"` child message.
2. **No direct emergency admin.** `ProtectedVault` emergency methods accept only `CapabilityGate`.
3. **No arbitrary target.** The protected target comes from the active charter and is included in the action digest.
4. **No arbitrary action.** Only three explicit action classes exist in v1 and the charter narrows that set further.
5. **No duration expansion.** Incident creation enforces the charter maximum; execution must exactly match the issued capability.
6. **No replay.** Capability remains `DISPATCHED` until the protected child is reconciled as applied; exact retries cannot alter its authority envelope.
7. **No issuer substitution.** `CapabilityGate` binds one engine exactly once.
8. **No source-host substitution.** Incident URLs outside the charter allow-list are rejected before web access.
9. **No operator claim as evidence.** Prompt language marks the reason and fetched content as data and explicitly disallows self-attestation.
10. **No silent uncertainty.** Weak, unavailable or conflicting evidence has explicit no-authority outcomes.
11. **No protocol-key takeover after claim.** Once a protocol key is claimed, another wallet cannot publish a replacement charter under that identity.
12. **No charter rollback.** A newly active charter cannot be replaced by an older published version.
13. **No mutable-source hand-wave.** Final assessment records include code-derived HTTP status and SHA-256 content digests for every fetched source plus an aggregate evidence commitment.
14. **No internal holder impersonation.** Vault credit flows require the immediate sender and original transaction origin to be the same EOA.
15. **No stale holder lock.** A proven payout acknowledgement releases only that holder's lock. The application then calls the holder-only success-closure write, which retires the exact recovery candidate after the finalized child has been proven.

## Prompt injection

Charter, incident and web contents are untrusted data. The assessment prompt explicitly instructs validators not to obey commands inside those blocks. This does not make prompt injection impossible; it reduces the attack surface and must be combined with independent validator reconstruction and bounded outputs.

## Source risks

A charter owner controls which evidence hosts are approved before an incident. This is intentional governance input, not a truth oracle. A bad charter can still choose bad sources. Review should therefore inspect the charter itself and demonstrate cases with conflicting/unavailable evidence. The source commitment proves what bytes the leader actually evaluated; it does not prove that those bytes were objectively true.

## Capability risks

The v1 capability gate routes only the three supported pause actions. It does not implement generic method selectors, arbitrary calldata or value transfer. That narrowness is intentional: a generic executor would dramatically increase privilege and review complexity.

## GEN transfer note

`ProtectedVault.withdraw` uses the current GenLayer external-message value-transfer pattern. Accounting is debited at dispatch, and GenLayer's errored-message refund handler restores the exact amount when the payout child fails. Studio simulates balances; live proof must still verify the recipient wallet balance before and after the finalized payout.
# Evidence transport and payout settlement boundaries

Evidence URL paths are canonicalized before they are frozen in an incident. Dot
segments, percent-encoding, backslashes, queries, fragments and control
characters are rejected so validators cannot disagree about the effective path
or scope boundary. Repeated slashes are collapsed.

The GenLayer web API used by this project exposes a complete response body, not
a streaming byte-limited reader. `ExigencyEngine` therefore applies strict
post-fetch per-source and aggregate byte limits before content enters the
assessment prompt, bounds excerpts and error text, and fails closed when a
response is too large. These are processing limits, not a claim that the
upstream network transfer was interrupted early.

Vault withdrawals debit accounting at dispatch and create a unique withdrawal
record. In-flight correlation is stored per holder, not in one global lock, so
one unresolved payout cannot freeze unrelated users. A holder can perform
another withdrawal after an `ACKNOWLEDGED` payout; each record remains distinct.

Deposit, withdrawal, acknowledgement and retry require a direct EOA call
(`sender_address == origin_address`). This prevents an internal contract call
from writing credit under the original transaction origin's identity.

GenLayer preserves `origin_address` through child message chains. A failed
value-transfer child invokes the vault's errored-message handler, which uses
that origin and the exact refunded value to restore credit and total credit
exactly once, then marks the record `FAILED_RECOVERABLE`. A duplicate callback
cannot double-credit. Retry reuses the same withdrawal id, amount and
destination.

GenLayer currently exposes no contract-side successful-child callback or child
identifier in the errored-message context for an external EOA value transfer.
The frontend therefore proves the finalized child, parent, recipient, amount
and `value_credited` before submitting the holder acknowledgement. The
acknowledgement marks the record `ACKNOWLEDGED`, releases the holder lock and
retains a holder recovery candidate; a late failure callback can still move
that exact record to `FAILED_RECOVERABLE` and restore the amount. Once that
proof is complete, the same holder submits `close_successful_withdrawal`,
which changes the record to `SUCCESS_CLOSED` and removes its recovery
candidate without changing credit. A closed record cannot be retried or
recovered.

Recovery matching is deterministic without pretending that an amount is a
child identifier: the callback first requires the current holder-scoped
`DISPATCHED` record and exact value, then considers holder-scoped
`ACKNOWLEDGED` candidates only when there is no active dispatch. Multiple
acknowledged candidates with the same amount fail closed as ambiguous rather
than selecting an older or newer record. Acknowledged recovery candidates are
capped at 32 per holder; the frontend's success-closure step removes proven
successful candidates so normal successful withdrawals do not accumulate
forever. An acknowledgement that is not closed remains intentionally bounded
and recoverable.

Accounting states:

| State | Holder credit | Total credit | Retry | Restore |
| --- | --- | --- | --- | --- |
| `DISPATCHED` | debited | debited | no | exact origin/value callback |
| `ACKNOWLEDGED` | debited | debited | no | yes, if a failure callback arrives |
| `SUCCESS_CLOSED` | debited | debited | no | no; recovery metadata retired |
| `FAILED_RECOVERABLE` | restored | restored | exact record only | no second restore |

Studio simulates balances; live proof must still verify the recipient wallet
balance before and after the finalized payout. The platform boundary and
message-context assumptions are recorded in
`docs/GENLAYER_VALUE_TRANSFER_SEMANTICS.md`.
