# GenLayer value-transfer boundary

The final EXIGENT protected target does not use external GEN value transfers.
This is intentional, not an omitted feature.

Current GenLayer evidence establishes that messages are asynchronous, failed
child value is not automatically returned, and the current GenVM v0.3 runtime
removed the `__on_errored_message__` hook. There is no supported contract-side
EOA-payout receipt callback that could safely turn an external failure into an
exact internal refund.

The former payout model therefore violated the required invariant:

```text
credit debited
+ external child fails
+ no supported recovery callback
= permanently stranded entitlement
```

The final design removes that risk instead of pretending Direct Mode simulates
current Studionet behavior. `ProtectedVault` is non-custodial:

1. A direct EOA calls `execute_protected_action(action_key)`.
2. The contract records one unique operation and increments its authoritative
   action count.
3. A finalized `PAUSE_PROTECTED_ACTION` capability sets the target pause.
4. The same operation rejects while paused and works again after transaction-
   time expiry.

No GEN is accepted, debited, emitted, refunded, or retried. Consequently there
 is no failed-payout state, recovery candidate, receipt attestation, duplicate
 refund, or value-accounting ambiguity in the final submission surface.

The Direct Mode suite now tests the actual target: direct-EOA enforcement,
unique action replay protection, holder isolation, pause enforcement, expiry,
duplicate capability delivery and conflicting-digest fail-closed behavior.

Primary references:

- [GenLayer Messages](https://docs.genlayer.com/developers/intelligent-contracts/features/messages)
- [GenLayer Transaction Context](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context)
- [GenLayer Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
- [GenLayer transaction querying](https://docs.genlayer.com/developers/decentralized-applications/querying-a-transaction)
- [GenVM v0.3 changelog](https://github.com/genlayerlabs/genvm/blob/main/doc/website/src/python-sdk/changelog-notes/v0.3.rst)
