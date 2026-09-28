# Security Model

## Core invariants

1. **No capability before finality.** A semantic assessment may store an accepted result, but authority issuance is an `on="finalized"` child message.
2. **No direct emergency admin.** `ProtectedVault` emergency methods accept only `CapabilityGate`.
3. **No arbitrary target.** The protected target comes from the active charter and is included in the action digest.
4. **No arbitrary action.** Only three explicit action classes exist in v1 and the charter narrows that set further.
5. **No duration expansion.** Incident creation enforces the charter maximum; execution must exactly match the issued capability.
6. **No replay.** Capability is marked consumed before the protected child action is emitted.
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

`ProtectedVault.withdraw` uses the current GenLayer external-message value-transfer pattern. Studio simulates balances. Before any non-Studio deployment, re-run integration tests for value transfers on the target network.
