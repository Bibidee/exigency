# GenLayer value-transfer boundary

This project uses the documented GenLayer external-message pattern:

```python
@gl.evm.contract_interface
class _Recipient:
    class View: pass
    class Write: pass

_Recipient(Address(recipient)).emit_transfer(value=amount)
```

The current platform guarantees used by `ProtectedVault` are:

- external value messages execute only on `finalized`;
- the value is held by the message until the child is activated;
- a failed value message invokes the sender contract's payable
  `__on_errored_message__` hook with the refunded `gl.message.value`;
- `gl.message.origin_address` is the original transaction initiator and is
  preserved through internal child-message chains;
- child transaction ids and full receipts are available to clients through
  `getTriggeredTransactionIds` / `get_transaction_ids` and receipt APIs;
- there is no documented contract-side successful-child callback for an
  external transfer to an EOA.

Consequences for the vault:

1. The contract correlates failure by preserved origin plus the holder-scoped
   recovery state. It never uses a global lock or immutable creation order as
   the child identifier.
2. The current `DISPATCHED` record is checked first. If the holder's active
   record is dispatched and its amount equals the refunded value, that exact
   record is recovered. An amount mismatch fails closed.
3. If there is no active dispatched record, the contract checks only the
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

The acknowledged candidate list is holder-scoped and capped at 32 entries.
The contract rejects a new acknowledgement that would exceed that cap rather
than allowing unbounded storage or silently creating ambiguous recovery. The
normal application path closes each candidate after independently proving
finality, parent linkage, recipient, exact amount and `value_credited`, so
successful withdrawals do not accumulate indefinitely. There is no arbitrary
timeout cleanup: if the holder does not perform the explicit close, the
candidate remains recoverable and counts toward the bound. A finalized external
child is not expected to invoke the error hook later, but that client-side
observation is not a contract-side proof.

Primary references:

- [GenLayer Messages](https://docs.genlayer.com/developers/intelligent-contracts/features/messages)
- [GenLayer Transaction Context](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context)
- [GenLayer Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
- [GenLayer transaction querying](https://docs.genlayer.com/developers/decentralized-applications/querying-a-transaction)
