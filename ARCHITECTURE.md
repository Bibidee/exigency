# EXIGENT Architecture

## Trust problem

Emergency controls normally collapse a protocol's trust model exactly when pressure is highest: a guardian, admin or security multisig both requests extraordinary power and effectively decides whether the emergency threshold has been met.

EXIGENT separates those roles. The operator may request authority, but cannot mint it. The charter is frozen before the incident, the evidence set is frozen at incident creation, GenLayer decides the semantic trigger, and deterministic contracts bound the resulting power.

## Why four contracts

The separation is functional, not cosmetic.

- **CharterRegistry** owns immutable ex-ante policy.
- **ExigencyEngine** owns incident state and nondeterministic evidence interpretation.
- **CapabilityGate** owns finality-derived, single-use execution authority.
- **ProtectedVault** is the consequence surface and deliberately has no emergency-admin bypass.

Putting these responsibilities in one contract would blur lifecycle and caller boundaries. In particular, finality of the semantic decision and finality of capability execution are separate transitions.

## Deterministic vs semantic responsibilities

Deterministic:

- charter key uniqueness;
- protocol-key ownership lock;
- activation delay and no rollback to older versions;
- approved host filtering;
- allowed action class;
- max duration;
- action digest;
- one-time engine binding;
- capability holder/target/action/duration/expiry checks;
- capability replay protection;
- protected-vault caller check;
- pause expiry arithmetic.

Nondeterministic:

- fetching current approved public evidence;
- deciding whether the charter trigger is materially established;
- recognizing materially conflicting or insufficient evidence;
- judging semantic proportionality within the already-enforced hard envelope.

## Validator design

The validator does not approve leader JSON merely because it parses.

For each validator:

1. independently fetch every frozen evidence URL;
2. independently produce a bounded assessment;
3. require the same bounded decision;
4. require the same semantic state for every source URL;
5. require at least one `SUPPORTS_TRIGGER` source for `TRIGGER_CONFIRMED`;
6. run a strict comparison over material trigger clauses, evidence findings and proportionality.

A missing contradiction or omitted material source is disagreement, not harmless wording drift. After the model returns, code overwrites provenance fields with the HTTP status and SHA-256 digest computed from the bytes actually fetched by that validator. The finalized leader assessment therefore carries evidence commitments that the LLM cannot invent.

The consensus equality check binds the bounded decision, source states and
material findings. It does not require every validator to return identical
`http_status` or `content_digest` metadata, so those fields are audit
provenance for the validator's fetch rather than an independent claim that
all validators observed byte-identical responses.

## Finality design

Two irreversible transitions use `on="finalized"`:

1. `ExigencyEngine` -> `CapabilityGate.issue_capability`
2. `CapabilityGate` -> `ProtectedVault.emergency_pause_*`

Therefore an appealed or merely accepted parent cannot create emergency power or execute it early.

## Capability lifetime

The TTL starts inside `CapabilityGate.issue_capability`, i.e. when the finality-triggered child transaction executes. It does not start at the earlier assessment timestamp. This avoids a capability expiring while waiting for the parent appeal window to close.

## Versioning

Charter policy is immutable. New policy requires a new `charter_key`. The first publisher claims a protocol key and only that wallet can publish subsequent versions. `active_by_protocol` selects which immutable version may open **new** incidents. Each protocol has a deterministic monotonic version counter; activation rejects any version that is not newer than the currently active version, so an older version cannot replace a newer active charter. Every incident snapshots the charter digest; assessment retrieves that frozen version directly rather than requiring it to remain active, so later activation changes do not rewrite or brick an existing case.

## Withdrawal architecture

`ProtectedVault` debits a holder and records a unique `DISPATCHED` withdrawal
before emitting the native-value child. In-flight correlation is stored in
`active_withdrawal_by_holder`, and GenLayer's preserved `origin_address`
identifies the holder through the child-message context. Deposit, withdrawal,
acknowledgement and retry are restricted to direct EOA calls where
`sender_address == origin_address`; an internal contract cannot impersonate a
holder. An unfinished payout therefore blocks only its own holder.

The current official GenVM v0.3 runtime removed the
`__on_errored_message__` hook, does not dispatch it, and does not automatically
return failed value to the sender. The holder acknowledgement is consequently
non-destructive only in the Direct Mode model: it is accepted after the
application proves the child externally, changes the record to `ACKNOWLEDGED`,
releases the holder lock, and retains a bounded recovery candidate. A real
failed external payout currently has no supported contract-side callback that
can move it to `FAILED_RECOVERABLE`. This is a live **NOT READY** limitation;
the Direct Mode failure tests do not prove live Studionet recovery.

If GenLayer restores a supported failure callback, the existing selection rule
remains: first resolve the holder's current `DISPATCHED` record when the
refunded value matches; only when there is no active dispatch inspect
acknowledged candidates; one exact match is recoverable, while multiple exact
matches fail closed. The callback then moves the selected record to
`FAILED_RECOVERABLE`, restores the exact amount, removes its candidate, and
cannot restore it twice.

After the application has proven the finalized payout child, the holder calls
`close_successful_withdrawal`. This changes the record to `SUCCESS_CLOSED` and
removes only its recovery metadata; it does not change credit accounting. The
frontend performs this close only after checking the parent finality, child
linkage, destination, amount and `value_credited`. This is a holder-attested
trust boundary, not a contract-native receipt proof. The frontend persists the
public withdrawal id, parent hash and child hash in session storage; after a
reload it validates the id against the current holder record and offers
`Re-prove successful payout` before enabling close. A rejected close leaves the
record `ACKNOWLEDGED` and retryable. If the holder never closes the
acknowledgement, the candidate remains subject to the explicit 32-entry
per-holder ambiguity bound. That is a fail-closed liveness limit for
unresolved acknowledgements, not a limit on successfully closed withdrawals.
