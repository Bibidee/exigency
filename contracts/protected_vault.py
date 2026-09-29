# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from datetime import datetime, timezone
from genlayer import *


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _address_hex(value: str) -> str:
    raw = str(value).strip()
    if raw.lower().startswith("0x"):
        return raw.lower()
    return Address(raw).as_hex.lower()


class ProtectedVault(gl.Contract):
    gate_address: str
    credits: TreeMap[str, u256]
    total_credits: u256
    withdrawals_paused_until: u256
    deposits_paused_until: u256
    last_emergency_json: str
    emergency_history: DynArray[str]
    applied_capabilities: TreeMap[str, str]
    applied_capability_until: TreeMap[str, u256]
    withdrawal_records: TreeMap[str, str]
    withdrawal_keys: DynArray[str]
    withdrawal_nonce: u256
    active_withdrawal_by_holder: TreeMap[str, str]

    def __init__(self, gate_address: str):
        self.gate_address = _address_hex(gate_address)
        self.total_credits = u256(0)
        self.withdrawals_paused_until = u256(0)
        self.deposits_paused_until = u256(0)
        self.last_emergency_json = ""
        self.withdrawal_nonce = u256(0)

    def _require_gate(self) -> None:
        if gl.message.sender_address.as_hex.lower() != self.gate_address:
            raise gl.vm.UserError("emergency authority requires CapabilityGate")

    def _record_emergency(
        self,
        action_class: str,
        duration_minutes: int,
        incident_key: str,
        capability_key: str,
        action_digest: str,
        until_ts: int,
    ) -> bool:
        if self.applied_capabilities.get(capability_key, ""):
            return False
        record = {
            "action_class": action_class,
            "duration_minutes": int(duration_minutes),
            "incident_key": incident_key,
            "capability_key": capability_key,
            "action_digest": action_digest,
            "executed_at": _now(),
            "effective_until": int(until_ts),
        }
        encoded = json.dumps(record, sort_keys=True)
        self.last_emergency_json = encoded
        self.emergency_history.append(encoded)
        self.applied_capabilities[capability_key] = action_digest
        self.applied_capability_until[capability_key] = u256(until_ts)
        return True

    def _already_applied(self, capability_key: str, action_digest: str) -> bool:
        existing = self.applied_capabilities.get(capability_key, "")
        if not existing:
            return False
        if existing != action_digest:
            raise gl.vm.UserError("capability key is already bound to a different action")
        return True

    @gl.public.write.payable
    def deposit(self) -> u256:
        if _now() < int(self.deposits_paused_until):
            raise gl.vm.UserError("deposits are temporarily paused")
        amount = gl.message.value
        if amount == u256(0):
            raise gl.vm.UserError("deposit value must be greater than zero")
        holder = _address_hex(gl.message.sender_address)
        current = self.credits.get(holder, u256(0))
        self.credits[holder] = current + amount
        self.total_credits = self.total_credits + amount
        return self.credits[holder]

    @gl.public.write
    def withdraw(self, amount: u256) -> u256:
        if _now() < int(self.withdrawals_paused_until):
            raise gl.vm.UserError("withdrawals are temporarily paused")
        if amount == u256(0):
            raise gl.vm.UserError("withdraw amount must be greater than zero")
        holder = _address_hex(gl.message.sender_address)
        current = self.credits.get(holder, u256(0))
        if current < amount:
            raise gl.vm.UserError("insufficient vault credit")

        # A value-transfer child has its own outcome. GenLayer preserves the
        # original transaction origin through child messages, so recovery is
        # correlated per holder rather than through one global vault lock.
        # One unfinished payout can therefore block only that holder; unrelated
        # holders remain free to withdraw.
        if self.active_withdrawal_by_holder.get(holder, ""):
            raise gl.vm.UserError("this holder has another withdrawal awaiting payout settlement")

        withdrawal_id = f"W-{holder}-{int(self.withdrawal_nonce)}"
        self.withdrawal_nonce = self.withdrawal_nonce + u256(1)
        self.withdrawal_records[withdrawal_id] = json.dumps(
            {
                "withdrawal_id": withdrawal_id,
                "holder": holder,
                "destination": holder,
                "amount": str(amount),
                "status": "DISPATCHED",
                "requested_at": _now(),
                "retry_count": 0,
            },
            sort_keys=True,
        )
        self.withdrawal_keys.append(withdrawal_id)
        self.active_withdrawal_by_holder[holder] = withdrawal_id

        self.credits[holder] = current - amount
        self.total_credits = self.total_credits - amount
        _Recipient(gl.message.sender_address).emit_transfer(value=amount)
        return self.credits[holder]

    @gl.public.write
    def settle_withdrawal(self, withdrawal_id: str) -> str:
        raw = self.withdrawal_records.get(withdrawal_id, "")
        if not raw:
            raise gl.vm.UserError("withdrawal not found")
        record = json.loads(raw)
        if _address_hex(gl.message.sender_address) != str(record.get("holder", "")):
            raise gl.vm.UserError("only withdrawal holder may settle")
        status = str(record.get("status", ""))
        if status == "SETTLED":
            return status
        if status != "DISPATCHED":
            raise gl.vm.UserError("withdrawal is not awaiting settlement")
        # GenLayer has no contract-side successful-child callback for an
        # external EOA value transfer. Do not destroy the recovery pointer when
        # a holder acknowledges an externally proven payout: if the child later
        # errors, __on_errored_message__ must still be able to restore credit.
        # The callback can invalidate this provisional settlement exactly once.
        record["status"] = "SETTLED"
        record["settled_at"] = _now()
        record["recovery_reserved"] = True
        self.withdrawal_records[withdrawal_id] = json.dumps(record, sort_keys=True)
        return "SETTLED"

    @gl.public.write
    def retry_withdrawal(self, withdrawal_id: str) -> str:
        raw = self.withdrawal_records.get(withdrawal_id, "")
        if not raw:
            raise gl.vm.UserError("withdrawal not found")
        record = json.loads(raw)
        if _address_hex(gl.message.sender_address) != str(record.get("holder", "")):
            raise gl.vm.UserError("only withdrawal holder may retry")
        if str(record.get("status", "")) != "FAILED_RECOVERABLE":
            raise gl.vm.UserError("withdrawal is not recoverable")
        holder = str(record["holder"])
        if self.active_withdrawal_by_holder.get(holder, ""):
            raise gl.vm.UserError("this holder has another withdrawal awaiting payout settlement")
        amount = u256(int(record["amount"]))
        current = self.credits.get(holder, u256(0))
        if current < amount:
            raise gl.vm.UserError("insufficient vault credit for retry")
        self.credits[holder] = current - amount
        self.total_credits = self.total_credits - amount
        record["status"] = "DISPATCHED"
        record["retry_count"] = int(record.get("retry_count", 0)) + 1
        record["redispatched_at"] = _now()
        self.withdrawal_records[withdrawal_id] = json.dumps(record, sort_keys=True)
        self.active_withdrawal_by_holder[holder] = withdrawal_id
        _Recipient(gl.message.sender_address).emit_transfer(value=amount)
        return "DISPATCHED"

    @gl.public.write.payable
    def __on_errored_message__(self):
        # GenLayer invokes this handler with the refunded value when an emitted
        # value-transfer child fails. `origin_address` is preserved through the
        # child message chain, so the refund is deterministically attributable
        # to the holder's one active withdrawal without a global lock. No retry
        # is emitted from this handler.
        holder = _address_hex(gl.message.origin_address)
        withdrawal_id = self.active_withdrawal_by_holder.get(holder, "")
        if not withdrawal_id:
            raise gl.vm.UserError("errored payout has no active holder withdrawal")
        raw = self.withdrawal_records.get(withdrawal_id, "")
        if not raw:
            raise gl.vm.UserError("errored payout record is missing")
        record = json.loads(raw)
        if str(record.get("status", "")) == "FAILED_RECOVERABLE":
            return
        if str(record.get("status", "")) not in {"DISPATCHED", "SETTLED"}:
            raise gl.vm.UserError("errored payout is not recoverable")
        amount = u256(int(record.get("amount", "0")))
        if amount != gl.message.value:
            raise gl.vm.UserError("errored payout value does not match active withdrawal")
        record_holder = str(record["holder"])
        if record_holder != holder:
            raise gl.vm.UserError("errored payout holder does not match origin")
        self.credits[record_holder] = self.credits.get(record_holder, u256(0)) + amount
        self.total_credits = self.total_credits + amount
        record["status"] = "FAILED_RECOVERABLE"
        record["failed_at"] = _now()
        record["recovery_reserved"] = False
        self.withdrawal_records[withdrawal_id] = json.dumps(record, sort_keys=True)
        self.active_withdrawal_by_holder[holder] = ""

    @gl.public.write
    def emergency_pause_withdrawals(
        self,
        duration_minutes: int,
        incident_key: str,
        capability_key: str,
        action_digest: str,
    ) -> int:
        self._require_gate()
        if duration_minutes < 1 or duration_minutes > 1440:
            raise gl.vm.UserError("invalid pause duration")
        if self._already_applied(capability_key, action_digest):
            return int(self.applied_capability_until.get(capability_key, u256(0)))
        until_ts = _now() + int(duration_minutes) * 60
        if until_ts > int(self.withdrawals_paused_until):
            self.withdrawals_paused_until = u256(until_ts)
        self._record_emergency(
            "PAUSE_WITHDRAWALS", duration_minutes, incident_key, capability_key, action_digest, until_ts
        )
        return until_ts

    @gl.public.write
    def emergency_pause_deposits(
        self,
        duration_minutes: int,
        incident_key: str,
        capability_key: str,
        action_digest: str,
    ) -> int:
        self._require_gate()
        if duration_minutes < 1 or duration_minutes > 1440:
            raise gl.vm.UserError("invalid pause duration")
        if self._already_applied(capability_key, action_digest):
            return int(self.applied_capability_until.get(capability_key, u256(0)))
        until_ts = _now() + int(duration_minutes) * 60
        if until_ts > int(self.deposits_paused_until):
            self.deposits_paused_until = u256(until_ts)
        self._record_emergency(
            "PAUSE_DEPOSITS", duration_minutes, incident_key, capability_key, action_digest, until_ts
        )
        return until_ts

    @gl.public.write
    def emergency_pause_all(
        self,
        duration_minutes: int,
        incident_key: str,
        capability_key: str,
        action_digest: str,
    ) -> int:
        self._require_gate()
        if duration_minutes < 1 or duration_minutes > 1440:
            raise gl.vm.UserError("invalid pause duration")
        if self._already_applied(capability_key, action_digest):
            return int(self.applied_capability_until.get(capability_key, u256(0)))
        until_ts = _now() + int(duration_minutes) * 60
        if until_ts > int(self.withdrawals_paused_until):
            self.withdrawals_paused_until = u256(until_ts)
        if until_ts > int(self.deposits_paused_until):
            self.deposits_paused_until = u256(until_ts)
        self._record_emergency(
            "PAUSE_ALL", duration_minutes, incident_key, capability_key, action_digest, until_ts
        )
        return until_ts

    @gl.public.view
    def get_credit(self, holder: str) -> u256:
        return self.credits.get(_address_hex(holder), u256(0))

    @gl.public.view
    def get_status_json(self) -> str:
        now = _now()
        return json.dumps(
            {
                "gate_address": self.gate_address,
                "total_credits": str(self.total_credits),
                "withdrawals_paused": now < int(self.withdrawals_paused_until),
                "withdrawals_paused_until": int(self.withdrawals_paused_until),
                "deposits_paused": now < int(self.deposits_paused_until),
                "deposits_paused_until": int(self.deposits_paused_until),
                "last_emergency_json": self.last_emergency_json,
                "applied_capability_count": len(self.emergency_history),
                # Kept as an empty compatibility field; use
                # get_active_withdrawal_key(holder) for holder-scoped state.
                "active_withdrawal_key": "",
            },
            sort_keys=True,
        )

    @gl.public.view
    def list_emergency_history(self) -> list:
        return [self.emergency_history[i] for i in range(len(self.emergency_history))]

    @gl.public.view
    def get_applied_capability_digest(self, capability_key: str) -> str:
        return self.applied_capabilities.get(capability_key, "")

    @gl.public.view
    def get_withdrawal_json(self, withdrawal_id: str) -> str:
        return self.withdrawal_records.get(withdrawal_id, "")

    @gl.public.view
    def get_active_withdrawal_key(self, holder: str) -> str:
        return self.active_withdrawal_by_holder.get(_address_hex(holder), "")

    @gl.public.view
    def list_withdrawal_keys(self) -> list:
        return [self.withdrawal_keys[i] for i in range(len(self.withdrawal_keys))]
