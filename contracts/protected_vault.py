# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from datetime import datetime, timezone
from genlayer import *


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _address_hex(value) -> str:
    if hasattr(value, "as_hex"):
        return value.as_hex.lower()
    return Address(value).as_hex.lower()


class ProtectedVault(gl.Contract):
    """Non-custodial protected action target.

    The previous version accepted GEN and emitted an asynchronous external
    payout before a supported success/failure receipt existed. Current GenVM
    has no errored-message callback and failed child value is not automatically
    returned, so this target deliberately holds no user funds. It still gives
    EXIGENT a real authoritative consequence: a direct protected action can be
    executed while open and is rejected while CapabilityGate has paused it.
    """

    gate_address: str
    protected_action_paused_until: u256
    protected_action_count: u256
    last_protected_action_json: str
    protected_action_records: TreeMap[str, str]
    protected_action_keys: DynArray[str]
    last_emergency_json: str
    emergency_history: DynArray[str]
    applied_capabilities: TreeMap[str, str]
    applied_capability_until: TreeMap[str, u256]

    def __init__(self, gate_address: str):
        self.gate_address = _address_hex(gate_address)
        self.protected_action_paused_until = u256(0)
        self.protected_action_count = u256(0)
        self.last_protected_action_json = ""
        self.last_emergency_json = ""

    def _require_gate(self) -> None:
        if _address_hex(gl.message.sender_address) != self.gate_address:
            raise gl.vm.UserError("emergency authority requires CapabilityGate")

    def _require_direct_user(self) -> str:
        sender = _address_hex(gl.message.sender_address)
        origin = _address_hex(gl.message.origin_address)
        if sender != origin:
            raise gl.vm.UserError("protected actions require a direct EOA caller")
        return sender

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

    @gl.public.write
    def execute_protected_action(self, action_key: str) -> u256:
        """Execute one non-custodial protected operation.

        The action changes authoritative contract state and has no payable
        value-transfer side effect. A unique key makes replay explicit and
        holder/origin enforcement prevents a child contract from impersonating
        a direct user.
        """
        if _now() < int(self.protected_action_paused_until):
            raise gl.vm.UserError("protected action is temporarily paused")
        holder = self._require_direct_user()
        key = str(action_key).strip()
        if not key or len(key) > 128:
            raise gl.vm.UserError("invalid protected action key")
        if self.protected_action_records.get(key, ""):
            raise gl.vm.UserError("protected action already executed")

        next_count = self.protected_action_count + u256(1)
        record = {
            "action_key": key,
            "holder": holder,
            "executed_at": _now(),
            "sequence": str(next_count),
        }
        encoded = json.dumps(record, sort_keys=True)
        self.protected_action_records[key] = encoded
        self.protected_action_keys.append(key)
        self.last_protected_action_json = encoded
        self.protected_action_count = next_count
        return next_count

    @gl.public.write
    def emergency_pause_protected_action(
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
        if until_ts > int(self.protected_action_paused_until):
            self.protected_action_paused_until = u256(until_ts)
        self._record_emergency(
            "PAUSE_PROTECTED_ACTION", duration_minutes, incident_key, capability_key, action_digest, until_ts
        )
        return until_ts

    @gl.public.view
    def get_status_json(self) -> str:
        now = _now()
        return json.dumps(
            {
                "gate_address": self.gate_address,
                "protected_action_count": str(self.protected_action_count),
                "protected_action_paused": now < int(self.protected_action_paused_until),
                "protected_action_paused_until": int(self.protected_action_paused_until),
                "last_protected_action_json": self.last_protected_action_json,
                "last_emergency_json": self.last_emergency_json,
                "applied_capability_count": len(self.emergency_history),
            },
            sort_keys=True,
        )

    @gl.public.view
    def get_protected_action_json(self, action_key: str) -> str:
        return self.protected_action_records.get(action_key, "")

    @gl.public.view
    def list_protected_action_keys(self) -> list:
        return [self.protected_action_keys[i] for i in range(len(self.protected_action_keys))]

    @gl.public.view
    def list_emergency_history(self) -> list:
        return [self.emergency_history[i] for i in range(len(self.emergency_history))]

    @gl.public.view
    def get_applied_capability_digest(self, capability_key: str) -> str:
        return self.applied_capabilities.get(capability_key, "")

    @gl.public.view
    def get_protected_action_count(self) -> u256:
        return self.protected_action_count
