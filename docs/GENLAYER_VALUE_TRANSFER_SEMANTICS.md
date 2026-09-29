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

1. The contract correlates failure by preserved origin plus one active record
   per holder, never by a global lock or an untrusted amount-only match.
2. A holder acknowledgement does not clear the recovery pointer. If the child
   later errors, the callback can still restore exactly once.
3. The frontend proves finality, parent, recipient, exact amount and
   `value_credited` before acknowledging a successful payout. This is a
   read/reconciliation boundary, not the source of refund safety.

Primary references:

- [GenLayer Messages](https://docs.genlayer.com/developers/intelligent-contracts/features/messages)
- [GenLayer Transaction Context](https://docs.genlayer.com/developers/intelligent-contracts/features/transaction-context)
- [GenLayer Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers)
- [GenLayer transaction querying](https://docs.genlayer.com/developers/decentralized-applications/querying-a-transaction)
