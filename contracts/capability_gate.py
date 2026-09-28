# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
from datetime import datetime, timezone
from genlayer import *


ALLOWED_ACTIONS = (
    "PAUSE_WITHDRAWALS",
    "PAUSE_DEPOSITS",
    "PAUSE_ALL",
)


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


class CapabilityGate(gl.Contract):
    deployer: str
    engine_address: str
    capabilities: TreeMap[str, str]
    capability_keys: DynArray[str]

    def __init__(self):
        self.deployer = gl.message.sender_address.as_hex
        self.engine_address = ""

    def _digest(self, payload: dict) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

    @gl.public.write
    def bind_engine(self, engine_address: str) -> str:
        if gl.message.sender_address.as_hex != self.deployer:
            raise gl.vm.UserError("only deployer may bind engine")
        if self.engine_address:
            raise gl.vm.UserError("engine already bound")
        self.engine_address = Address(engine_address).as_hex
        return self.engine_address

    @gl.public.write
    def issue_capability(
        self,
        capability_key: str,
        incident_key: str,
        holder: str,
        target: str,
        action_class: str,
        duration_minutes: int,
        action_digest: str,
        charter_digest: str,
        assessment_digest: str,
        ttl_seconds: int,
    ) -> str:
        if not self.engine_address or gl.message.sender_address.as_hex != self.engine_address:
            raise gl.vm.UserError("only bound ExigencyEngine may issue capabilities")
        if capability_key in self.capabilities:
            raise gl.vm.UserError("capability already exists")
        if action_class not in ALLOWED_ACTIONS:
            raise gl.vm.UserError("unsupported action class")
        if duration_minutes < 1 or duration_minutes > 1440:
            raise gl.vm.UserError("invalid duration")
        if ttl_seconds < 60 or ttl_seconds > 7200:
            raise gl.vm.UserError("invalid capability TTL")

        issued_at = _now()
        record = {
            "capability_key": capability_key,
            "incident_key": incident_key,
            "holder": Address(holder).as_hex,
            "target": Address(target).as_hex,
            "action_class": action_class,
            "duration_minutes": int(duration_minutes),
            "action_digest": action_digest,
            "charter_digest": charter_digest,
            "assessment_digest": assessment_digest,
            "issued_at": issued_at,
            "expires_at": issued_at + int(ttl_seconds),
            "consumed": False,
            "consumed_at": 0,
        }
        self.capabilities[capability_key] = json.dumps(record, sort_keys=True)
        self.capability_keys.append(capability_key)
        return capability_key

    @gl.public.write
    def execute_capability(
        self,
        capability_key: str,
        target: str,
        action_class: str,
        duration_minutes: int,
    ) -> str:
        raw = self.capabilities.get(capability_key, "")
        if not raw:
            raise gl.vm.UserError("capability not found")
        record = json.loads(raw)

        if gl.message.sender_address.as_hex != str(record.get("holder", "")):
            raise gl.vm.UserError("only capability holder may execute")
        if bool(record.get("consumed")):
            raise gl.vm.UserError("capability already consumed")
        if _now() > int(record.get("expires_at", 0)):
            raise gl.vm.UserError("capability expired")

        target_hex = Address(target).as_hex
        if target_hex != str(record.get("target", "")):
            raise gl.vm.UserError("target does not match capability")
        if action_class != str(record.get("action_class", "")):
            raise gl.vm.UserError("action does not match capability")
        if int(duration_minutes) != int(record.get("duration_minutes", 0)):
            raise gl.vm.UserError("duration does not match capability")

        reconstructed = {
            "incident_key": str(record["incident_key"]),
            "charter_digest": str(record["charter_digest"]),
            "target": target_hex,
            "action_class": action_class,
            "duration_minutes": int(duration_minutes),
        }
        if self._digest(reconstructed) != str(record.get("action_digest", "")):
            raise gl.vm.UserError("action digest mismatch")

        record["consumed"] = True
        record["consumed_at"] = _now()
        self.capabilities[capability_key] = json.dumps(record, sort_keys=True)

        protected = gl.get_contract_at(Address(target_hex))
        if action_class == "PAUSE_WITHDRAWALS":
            protected.emit(on="finalized").emergency_pause_withdrawals(
                int(duration_minutes),
                str(record["incident_key"]),
                capability_key,
                str(record["action_digest"]),
            )
        elif action_class == "PAUSE_DEPOSITS":
            protected.emit(on="finalized").emergency_pause_deposits(
                int(duration_minutes),
                str(record["incident_key"]),
                capability_key,
                str(record["action_digest"]),
            )
        elif action_class == "PAUSE_ALL":
            protected.emit(on="finalized").emergency_pause_all(
                int(duration_minutes),
                str(record["incident_key"]),
                capability_key,
                str(record["action_digest"]),
            )
        else:
            raise gl.vm.UserError("unsupported action class")

        return action_class

    @gl.public.view
    def get_capability_json(self, capability_key: str) -> str:
        return self.capabilities.get(capability_key, "")

    @gl.public.view
    def list_capability_keys(self) -> list:
        return [self.capability_keys[i] for i in range(len(self.capability_keys))]
