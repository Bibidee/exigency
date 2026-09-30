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


MAX_ACKNOWLEDGED_RECOVERY_CANDIDATES = 32


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
    recovery_withdrawals_by_holder: TreeMap[str, str]

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

    def _require_direct_user(self) -> str:
        sender = _address_hex(gl.message.sender_address)
        origin = _address_hex(gl.message.origin_address)
        if sender != origin:
            raise gl.vm.UserError("vault credit flows require a direct EOA caller")
        return sender

    def _recovery_ids(self, holder: str) -> list:
        raw = self.recovery_withdrawals_by_holder.get(holder, "[]")
        return list(json.loads(raw)) if raw else []

    def _save_recovery_ids(self, holder: str, ids: list) -> None:
        self.recovery_withdrawals_by_holder[holder] = json.dumps(ids, sort_keys=True)

    def _add_recovery_candidate(self, holder: str, withdrawal_id: str) -> None:
        ids = self._recovery_ids(holder)
        if withdrawal_id not in ids:
            if len(ids) >= MAX_ACKNOWLEDGED_RECOVERY_CANDIDATES:
                raise gl.vm.UserError(
                    "too many unresolved acknowledged payouts for holder; recovery would be ambiguous"
                )
            ids.append(withdrawal_id)
        self._save_recovery_ids(holder, ids)

    def _remove_recovery_candidate(self, holder: str, withdrawal_id: str) -> None:
        ids = [item for item in self._recovery_ids(holder) if item != withdrawal_id]
        self._save_recovery_ids(holder, ids)

    def _find_active_recovery_candidate(self, holder: str, amount: u256) -> str:
        withdrawal_id = self.active_withdrawal_by_holder.get(holder, "")
        if not withdrawal_id:
            return ""
        raw = self.withdrawal_records.get(withdrawal_id, "")
        if not raw:
            raise gl.vm.UserError("active payout record is missing")
        record = json.loads(raw)
        if str(record.get("holder", "")) != holder:
            raise gl.vm.UserError("active payout holder does not match origin")
        if str(record.get("status", "")) != "DISPATCHED":
            return ""
        if u256(int(record.get("amount", "0"))) != amount:
            raise gl.vm.UserError("errored payout value does not match active withdrawal")
        return withdrawal_id

    def _find_acknowledged_recovery_candidate(self, holder: str, amount: u256) -> str:
        matches = []
        for withdrawal_id in self._recovery_ids(holder):
            raw = self.withdrawal_records.get(withdrawal_id, "")
            if not raw:
                continue
            record = json.loads(raw)
            if str(record.get("holder", "")) != holder:
                continue
            if str(record.get("status", "")) != "ACKNOWLEDGED":
                continue
            if u256(int(record.get("amount", "0"))) == amount:
                matches.append(withdrawal_id)
        if len(matches) > 1:
            raise gl.vm.UserError("ambiguous acknowledged payout recovery")
        return matches[0] if matches else ""

    def _find_recovery_candidate(self, holder: str, amount: u256) -> str:
        # The errored-message context exposes the preserved origin and refunded
        # value, but no child/message identifier. Prefer the holder's current
        # DISPATCHED record because it is the only deterministic in-flight
        # correlation. Only when there is no active dispatch do we inspect the
        # bounded acknowledged recovery set. Multiple acknowledged matches fail
        # closed rather than attributing the refund to an arbitrary record.
        active_id = self._find_active_recovery_candidate(holder, amount)
        if active_id:
            return active_id
        return self._find_acknowledged_recovery_candidate(holder, amount)

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
        holder = self._require_direct_user()
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
        holder = self._require_direct_user()
        current = self.credits.get(holder, u256(0))
        if current < amount:
            raise gl.vm.UserError("insufficient vault credit")

        # A value-transfer child has its own outcome. GenLayer preserves the
        # original transaction origin through child messages, so recovery is
        # correlated per holder rather than through one global vault lock.
        # One unfinished payout can therefore block only that holder; unrelated
        # holders remain free to withdraw.
        active_id = self.active_withdrawal_by_holder.get(holder, "")
        if active_id:
            active_raw = self.withdrawal_records.get(active_id, "")
            if active_raw and str(json.loads(active_raw).get("status", "")) == "DISPATCHED":
                raise gl.vm.UserError("this holder has another withdrawal awaiting payout settlement")
            self.active_withdrawal_by_holder[holder] = ""

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
        holder = self._require_direct_user()
        if holder != str(record.get("holder", "")):
            raise gl.vm.UserError("only withdrawal holder may settle")
        status = str(record.get("status", ""))
        if status == "ACKNOWLEDGED":
            return status
        if status != "DISPATCHED":
            raise gl.vm.UserError("withdrawal is not awaiting settlement")
        # This method is deliberately an acknowledgement, not an on-chain proof
        # of child success. Retain a keyed recovery candidate for a possible
        # early-acknowledgement failure, but release the active holder lock so a
        # genuinely successful payout can be followed by another withdrawal.
        record["status"] = "ACKNOWLEDGED"
        record["acknowledged_at"] = _now()
        record["recovery_pending"] = True
        self.withdrawal_records[withdrawal_id] = json.dumps(record, sort_keys=True)
        self._add_recovery_candidate(holder, withdrawal_id)
        self.active_withdrawal_by_holder[holder] = ""
        return "ACKNOWLEDGED"

    @gl.public.write
    def retry_withdrawal(self, withdrawal_id: str) -> str:
        raw = self.withdrawal_records.get(withdrawal_id, "")
        if not raw:
            raise gl.vm.UserError("withdrawal not found")
        record = json.loads(raw)
        holder = self._require_direct_user()
        if holder != str(record.get("holder", "")):
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
        self._remove_recovery_candidate(holder, withdrawal_id)
        _Recipient(gl.message.sender_address).emit_transfer(value=amount)
        return "DISPATCHED"

    @gl.public.write.payable
    def __on_errored_message__(self):
        # GenLayer invokes this handler with the refunded value when an emitted
        # value-transfer child fails. `origin_address` is preserved through the
        # child message chain, so the refund is deterministically attributable
        # to the holder's withdrawal records without a global lock. No retry is
        # emitted from this handler.
        holder = _address_hex(gl.message.origin_address)
        withdrawal_id = self._find_recovery_candidate(holder, gl.message.value)
        if not withdrawal_id:
            raise gl.vm.UserError("errored payout has no active holder withdrawal")
        raw = self.withdrawal_records.get(withdrawal_id, "")
        if not raw:
            raise gl.vm.UserError("errored payout record is missing")
        record = json.loads(raw)
        if str(record.get("status", "")) not in {"DISPATCHED", "ACKNOWLEDGED"}:
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
        record["recovery_pending"] = False
        self.withdrawal_records[withdrawal_id] = json.dumps(record, sort_keys=True)
        self._remove_recovery_candidate(holder, withdrawal_id)
        if self.active_withdrawal_by_holder.get(holder, "") == withdrawal_id:
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
    def get_recovery_withdrawal_keys(self, holder: str) -> list:
        ids = self._recovery_ids(_address_hex(holder))
        return [ids[i] for i in range(len(ids))]

    @gl.public.view
    def get_holder_withdrawal_keys(self, holder: str) -> list:
        normalized = _address_hex(holder)
        keys = []
        for index in range(len(self.withdrawal_keys)):
            withdrawal_id = self.withdrawal_keys[index]
            raw = self.withdrawal_records.get(withdrawal_id, "")
            if raw and str(json.loads(raw).get("holder", "")) == normalized:
                keys.append(withdrawal_id)
        return keys

    @gl.public.view
    def list_withdrawal_keys(self) -> list:
        return [self.withdrawal_keys[i] for i in range(len(self.withdrawal_keys))]
