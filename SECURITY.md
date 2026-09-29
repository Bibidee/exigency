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
record. A failed value-transfer child invokes the vault's errored-message
handler, which restores the exact amount and marks the record
`FAILED_RECOVERABLE`; retry uses the same record and amount and is idempotent.
Successful payouts cannot be replayed, and only one payout may be in flight so
refund attribution is deterministic. A holder may mark a finalized payout
`SETTLED` without creating another transfer.
