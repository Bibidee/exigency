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

    def __init__(self, gate_address: str):
        self.gate_address = _address_hex(gate_address)
        self.total_credits = u256(0)
        self.withdrawals_paused_until = u256(0)
        self.deposits_paused_until = u256(0)
        self.last_emergency_json = ""

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
    ) -> None:
        if self.applied_capabilities.get(capability_key, ""):
            return
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

        self.credits[holder] = current - amount
        self.total_credits = self.total_credits - amount
        _Recipient(gl.message.sender_address).emit_transfer(value=amount)
        return self.credits[holder]

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
            },
            sort_keys=True,
        )

    @gl.public.view
    def list_emergency_history(self) -> list:
        return [self.emergency_history[i] for i in range(len(self.emergency_history))]

    @gl.public.view
    def get_applied_capability_digest(self, capability_key: str) -> str:
        return self.applied_capabilities.get(capability_key, "")
