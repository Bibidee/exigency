# Security Model

## Core invariants

1. **No capability before finality.** Issuance and protected-target execution
   are `on="finalized"` child messages.
2. **No direct emergency admin.** The protected target accepts pause calls only
   from `CapabilityGate`.
3. **No arbitrary target or action.** The charter freezes the target and the
   action digest binds the exact execution envelope.
4. **No unauthorized target governance.** The target's deployment wallet is
   its governance address. The Engine rejects a charter owned by another
   wallet, and the target repeats the holder check before applying the child.
5. **No duration expansion.** The incident and capability enforce the charter
   maximum and exact duration.
6. **No replay.** Applied capabilities and protected action keys cannot be
   replayed successfully.
7. **No issuer substitution.** The Gate binds one Engine exactly once.
8. **No source-host substitution.** Incident URLs outside the charter scope
   are rejected before web access.
9. **No silent uncertainty.** Weak, unavailable or conflicting evidence fails
   closed.
10. **No protocol-key takeover or charter rollback.** Protocol ownership and
   monotonic activation are enforced on-chain.
11. **No internal user impersonation.** Protected actions require
    `sender_address == origin_address`.
12. **No stranded user value.** The final target is non-custodial: it accepts
    no GEN and emits no external payout, so no failed child can permanently
    debit user entitlement.
13. **No fake receipt trust.** The protected consequence is its own finalized
    contract state transition; it does not claim to verify an external payout.

## Protected consequence boundary

The previous payout design depended on `__on_errored_message__`, which the
current GenVM runtime removed. Failed child value is not automatically returned
and the contract has no supported EOA-payout receipt callback. That design is
not shipped.

The current `ProtectedVault` instead records a unique direct-EOA protected
action. The action succeeds while open, rejects while a finalized
`PAUSE_PROTECTED_ACTION` capability is active, and succeeds again after expiry.
The contract stores no user funds and has no deposit, withdrawal, refund,
acknowledgement, retry or administrator restoration method.

## Capability risks

The Gate exposes only `PAUSE_PROTECTED_ACTION`. It does not implement generic
method selectors, arbitrary calldata, value transfer, or an admin bypass. The
protected target verifies the Gate address, binds governance to the deployment
wallet, and rejects a capability whose holder is not that governance wallet.
The Engine performs the same charter-owner/governance check before issuance,
and the target repeats it at application time.

## Prompt injection and source risks

Charter, incident and web contents are untrusted data. Validators are instructed
not to follow commands inside those blocks. The evidence commitment proves what
bytes were fetched by a validator; it does not prove that those bytes are
objectively true.

## Wallet roles

The successful authority lifecycle uses the charter-owner wallet. A second
wallet is used only to verify that unauthorized incident creation is rejected.
This is not a two-wallet successful separation-of-duties lifecycle.

## References

- [GenLayer Messages](https://docs.genlayer.com/developers/intelligent-contracts/features/messages)
- [GenLayer Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
- [GenVM v0.3 changelog](https://github.com/genlayerlabs/genvm/blob/main/doc/website/src/python-sdk/changelog-notes/v0.3.rst)
