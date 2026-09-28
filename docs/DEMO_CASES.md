# Demo Cases

Use evidence URLs from hosts actually frozen in the active demo charter.

## Case A: trigger confirmed

- Evidence shows an active exploit or critical dependency compromise.
- Requested action: `PAUSE_WITHDRAWALS`.
- Duration: inside the hard maximum.
- Expected: `TRIGGER_CONFIRMED` -> parent finalizes -> capability child appears -> exact execution -> gate finalizes -> vault pause child executes.

## Case B: weak evidence

- One approved source is unavailable or vague.
- Expected: `INSUFFICIENT_EVIDENCE` and no capability.

## Case C: conflicting evidence

- Approved sources materially disagree about whether the incident is active.
- Expected: `CONFLICTING_EVIDENCE` and no capability.

## Case D: hard-envelope failure

- Request duration exceeds charter maximum or asks for an action absent from `allowed_actions`.
- Expected: incident creation reverts before consensus. No LLM call is required.

## Case E: source boundary failure

- Add a URL from a host absent from `evidence_hosts`.
- Expected: incident creation reverts before consensus.

## Case F: execution tamper

- Take a valid capability and modify target, action or duration in `execute_capability`.
- Expected: deterministic rejection.

## Case G: replay

- Execute a valid capability once, then call it again.
- Expected: `capability already consumed`.

## Case H: bypass attempt

- Call `ProtectedVault.emergency_pause_withdrawals` directly from an EOA.
- Expected: `emergency authority requires CapabilityGate`.


## Reproducible fixture set

`demo/evidence/` contains synthetic public-file fixtures for mechanics testing once the repository is pushed:

- `active_incident_primary.md`
- `active_incident_secondary.md`
- `no_incident.md`
- `conflicting_notice.md`

These files are explicitly fictional and should not be presented as real-world incident evidence. Use them to prove deterministic source boundaries and validator behaviour, then use independent public sources for the strongest reviewer demonstration.

## Case I: charter rotation after incident freeze

- Open an incident under charter v1.
- Publish and activate a newer v2.
- Assess the already-open v1 incident.
- Expected: assessment remains possible because the incident is bound to the frozen v1 digest; v2 controls only new incidents.

## Case J: protocol identity takeover / rollback

- From another wallet, attempt to publish a new charter under the already-claimed protocol key.
- Expected: deterministic rejection.
- After activating v2, attempt to activate older v1 again.
- Expected: deterministic rollback rejection.
