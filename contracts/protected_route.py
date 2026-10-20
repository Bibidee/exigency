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


class ProtectedRoute(gl.Contract):
    """Second protected target using the same narrow Gate envelope as Vault.

    The route target has a different consequence: it disables a named route for
    a bounded period. It never accepts arbitrary calldata and has no direct
    governance bypass.
    """

    gate_address: str
    governance_address: str
    route_disabled_until: u256
    route_execution_count: u256
    last_emergency_json: str
    applied_capabilities: TreeMap[str, str]
    applied_capability_until: TreeMap[str, u256]
    route_records: TreeMap[str, str]
    route_keys: DynArray[str]

    def __init__(self, gate_address: str):
        self.gate_address = _address_hex(gate_address)
        self.governance_address = _address_hex(gl.message.sender_address)
        self.route_disabled_until = u256(0)
        self.route_execution_count = u256(0)
        self.last_emergency_json = ""

    def _require_gate(self) -> None:
        if _address_hex(gl.message.sender_address) != self.gate_address:
            raise gl.vm.UserError("emergency authority requires CapabilityGate")

    def _require_governance_holder(self, holder: str) -> None:
        if _address_hex(holder) != self.governance_address:
            raise gl.vm.UserError("target governance rejected capability holder")

    def _already_applied(self, capability_key: str, action_digest: str) -> bool:
        existing = self.applied_capabilities.get(capability_key, "")
        if not existing:
            return False
        if existing != action_digest:
            raise gl.vm.UserError("capability key is already bound to a different action")
        return True

    @gl.public.write
    def apply_emergency_action(
        self,
        action_class: str,
        duration_minutes: int,
        incident_key: str,
        capability_key: str,
        action_digest: str,
        holder: str,
    ) -> int:
        self._require_gate()
        self._require_governance_holder(holder)
        if action_class != "DISABLE_PROTECTED_ROUTE":
            raise gl.vm.UserError("unsupported protected-route action")
        if duration_minutes < 1 or duration_minutes > 1440:
            raise gl.vm.UserError("invalid route disable duration")
        if self._already_applied(capability_key, action_digest):
            return int(self.applied_capability_until.get(capability_key, u256(0)))
        until_ts = _now() + int(duration_minutes) * 60
        if until_ts > int(self.route_disabled_until):
            self.route_disabled_until = u256(until_ts)
        record = {
            "action_class": action_class,
            "duration_minutes": int(duration_minutes),
            "incident_key": incident_key,
            "capability_key": capability_key,
            "action_digest": action_digest,
            "executed_at": _now(),
            "effective_until": until_ts,
        }
        self.last_emergency_json = json.dumps(record, sort_keys=True)
        self.applied_capabilities[capability_key] = action_digest
        self.applied_capability_until[capability_key] = u256(until_ts)
        return until_ts

    @gl.public.write
    def execute_route(self, route_key: str) -> u256:
        if _now() < int(self.route_disabled_until):
            raise gl.vm.UserError("protected route is temporarily disabled")
        key = str(route_key).strip()
        if not key or len(key) > 128:
            raise gl.vm.UserError("invalid route key")
        if self.route_records.get(key, ""):
            raise gl.vm.UserError("route action already executed")
        next_count = self.route_execution_count + u256(1)
        self.route_records[key] = json.dumps(
            {"route_key": key, "executed_at": _now(), "sequence": str(next_count)},
            sort_keys=True,
        )
        self.route_keys.append(key)
        self.route_execution_count = next_count
        return next_count

    @gl.public.view
    def get_status_json(self) -> str:
        return json.dumps(
            {
                "gate_address": self.gate_address,
                "governance_address": self.governance_address,
                "route_disabled": _now() < int(self.route_disabled_until),
                "route_disabled_until": int(self.route_disabled_until),
                "route_execution_count": str(self.route_execution_count),
                "last_emergency_json": self.last_emergency_json,
            },
            sort_keys=True,
        )

    @gl.public.view
    def get_governance_address(self) -> str:
        return self.governance_address

    @gl.public.view
    def is_authorized_capability_holder(self, holder: str) -> bool:
        return _address_hex(holder) == self.governance_address

    @gl.public.view
    def get_applied_capability_digest(self, capability_key: str) -> str:
        return self.applied_capabilities.get(capability_key, "")

    @gl.public.view
    def get_route_json(self, route_key: str) -> str:
        return self.route_records.get(route_key, "")

    @gl.public.view
    def list_route_keys(self) -> list:
        return [self.route_keys[i] for i in range(len(self.route_keys))]
