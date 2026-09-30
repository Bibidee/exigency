# GenLayer value-transfer boundary

This project uses the documented GenLayer external-message pattern:

```python
@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass

_Recipient(Address(recipient)).emit_transfer(value=amount)
```

The current platform guarantees relevant to `ProtectedVault` are:

- external value messages execute only on `finalized`;
- the value is held by the message until the child is activated;
- `gl.message.value` is available to payable methods, and
  `gl.message.origin_address` is preserved through internal child-message
  chains;
- the official value-transfer documentation states that a failed child value
  message is **not automatically returned** to the sender;
- the current GenVM v0.3 Python SDK removed the
  `__on_errored_message__` handler hook. The current bootloader does not
  dispatch it, and the deployed Vault schema does not expose it;
- child transaction ids and full receipts are available to clients through
  `getTriggeredTransactionIds` / `get_transaction_ids` and receipt APIs;
- there is no documented contract-side successful-child callback for an
  external transfer to an EOA.

Consequences for the vault:

1. The Direct Mode state machine correlates a simulated failure by preserved
   origin plus holder-scoped recovery state. It never uses a global lock or
   immutable creation order as the child identifier. This is a tested model,
   not proof that current Studionet can invoke the callback.
2. If a supported runtime failure callback is restored in a future GenLayer
   release, the current `DISPATCHED` record is checked first. If the holder's active
   record is dispatched and its amount equals the refunded value, that exact
   record is recovered. An amount mismatch fails closed.
3. If there is no active dispatched record, the Direct Mode model checks only the
   holder's bounded `ACKNOWLEDGED` recovery candidates. One exact match is
   recoverable; more than one exact match raises an explicit ambiguity error
   and changes no accounting state.
4. A holder acknowledgement releases the active holder lock but retains a
   recovery candidate because the contract has no successful-child callback.
   After the frontend proves the finalized child, the holder calls
   `close_successful_withdrawal`, changing the record to `SUCCESS_CLOSED` and
   removing its candidate without changing credit. Until that close, a failure
   callback can still restore the exact acknowledged record when it is uniquely
   identifiable. `FAILED_RECOVERABLE` records are removed from the candidate
   set and cannot be restored twice.
5. The frontend proves finality, parent, recipient, exact amount and
   `value_credited` before acknowledging a successful payout. This is a
   read/reconciliation boundary, not the source of refund safety.

The live limitation is material: because the current runtime removed the
errored-message hook and does not automatically return failed value, a live
failed external payout cannot currently reach the contract recovery path. A
`DISPATCHED` record can therefore remain debited and unresolved if an external
child fails. The project is **NOT READY** for a claim that live failure
recovery is supported. No live failure was fabricated, and no production
contract was redeployed while this protocol mismatch remains unresolved.

A safe fix requires a protocol-supported failure callback or a redesigned
payout architecture with a documented on-chain completion/retry mechanism.
This repository does not invent either mechanism in this audit.

The success-close boundary is intentional: `SUCCESS_CLOSED` means that the
holder submitted a holder-only retirement after the application proved the
finalized child. It does not mean that `ProtectedVault` inspected the child
receipt. A premature close forfeits late contract-level failure recovery for
that withdrawal. The browser stores only public reconciliation metadata
(withdrawal id, parent hash and child hash), validates the id against the
current holder record after reload, and requires a fresh child proof before
enabling close. If the parent hash is missing, it displays an explicit
recoverability limitation instead of silently selecting a historical record.

The acknowledged candidate list is holder-scoped and capped at 32 entries in
the Direct Mode model.
The contract rejects a new acknowledgement that would exceed that cap rather
than allowing unbounded storage or silently creating ambiguous recovery. The
normal application path closes each candidate after independently proving
finality, parent linkage, recipient, exact amount and `value_credited`, so
successful withdrawals do not accumulate indefinitely. There is no arbitrary
timeout cleanup. In Direct Mode, an unclosed candidate remains recoverable and
counts toward the bound; on current Studionet, no live failure callback is
available to consume it.

Primary references:

- [GenLayer Messages](https://docs.genlayer.com/developers/intelligent-contracts/features/messages)
- [GenLayer Transaction Context](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context)
- [GenLayer Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
- [GenLayer transaction querying](https://docs.genlayer.com/developers/decentralized-applications/querying-a-transaction)
- [GenVM v0.3 changelog](https://github.com/genlayerlabs/genvm/blob/main/doc/website/src/python-sdk/changelog-notes/v0.3.rst)
