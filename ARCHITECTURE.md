# EXIGENT Architecture

## Trust problem

EXIGENT separates emergency authority from emergency judgment. A protocol
commits its charter before an incident, the operator freezes the evidence and
requested action, GenLayer validators independently assess the evidence, and
deterministic contracts bind the resulting capability.

## Five-contract separation

- **CharterRegistry** owns immutable ex-ante policy and activation.
- **ExigencyEngine** owns incident state and nondeterministic evidence analysis.
- **CapabilityGate** owns finality-gated, holder-bound execution authority.
- **ProtectedVault** is the non-custodial protected consequence target and has
  no emergency-admin bypass.
- **ProtectedRoute** is a second protected consequence target with a bounded
  route-disable action under the same Gate interface and governance boundary.

Finality of assessment, capability issuance and protected-target execution are
separate transitions. No accepted-but-unfinalized parent creates authority.

## Validator design

Each validator independently fetches the frozen evidence, produces a bounded
assessment, compares the bounded decision and source semantic states, requires
support for a confirmed trigger, and checks material findings and
proportionality. HTTP status and content digests are fetch/audit provenance;
they are not claimed to be byte-equality consensus across every validator.

## Capability lifetime

Capabilities are holder-, target-, action-, duration-, incident- and
charter-digest-bound. The TTL begins when the finality-triggered issuance child
executes. The Gate recomputes the action digest before dispatch and the target
reconciles the finalized child before the capability becomes `APPLIED`. The
Engine requires the charter owner to equal the target governance address before
issuance; the target repeats the holder check when the child arrives.

## Protected consequence architecture

The previous Vault accepted GEN deposits and emitted asynchronous external EOA
payouts. Current GenVM does not support the required errored-message callback,
and failed child value is not automatically returned. That design could debit
internal credit without a contract-verifiable successful consequence, so it is
not the final architecture.

The final `ProtectedVault` is deliberately non-custodial:

1. `execute_protected_action(action_key)` requires a direct EOA and records one
   unique authoritative operation.
2. `CapabilityGate` can finalize `emergency_pause_protected_action`.
3. While the pause is active, the protected action rejects on-chain.
4. After transaction-time expiry, the action works again.

There is no payable deposit, external payout, refund callback, withdrawal
record, retry path, or user entitlement to strand. The target remains
meaningful because the protected action changes authoritative state and the
EXIGENT capability changes whether that action is accepted.

## State invariants

- Direct EOA execution is enforced with `sender_address == origin_address`.
- Each action key can execute once only.
- A paused target rejects before mutating action state.
- A finalized capability is the only caller that can pause the target.
- The target's deployment wallet is governance; unrelated charter owners are
  rejected before issuance and again before application.
- Duplicate capability delivery is idempotent; a conflicting digest fails
  closed.
- No browser state is authority; the frontend reads the target state from the
  contract after finalization.

## Versioning

Charters are immutable and protocol-owner-bound. Activation selects only the
version used for future incidents, and each incident stores the frozen charter
digest it was assessed against.

## V2 policy extensions

V2 preserves the Registry → Engine → Gate chain and adds bounded policy state:

- `source_groups` and `minimum_source_groups` require distinct approved host
  groups before an incident can be assessed;
- each assessment commits the actual HTTP status and content digest, and a
  changed digest across assessment rounds is marked as drift and fails closed;
- a confirmed result can remain `ASSESSMENT_PROVISIONAL` during a charter-
  defined challenge window. Only bounded post-window reassessment can issue a
  capability;
- combined base and challenge evidence is rejected above the bounded source
  maximum instead of being silently truncated;
- challenge deadlines are capped at incident expiry, and challenge/finalization
  writes fail after their applicable deadline or after assessment retries are
  exhausted;
- a capability in `DISPATCHED` state cannot be redispatched until it is
  reconciled, preventing unbounded duplicate child actions.

The Gate forwards one fixed `apply_emergency_action` envelope. It never accepts
arbitrary calldata. `ProtectedVault` implements the pause action and
`ProtectedRoute` implements `DISABLE_PROTECTED_ROUTE` under the same Gate and
target-governance checks. This is a multi-target constrained emergency-action
framework, not an arbitrary target-execution gateway.
