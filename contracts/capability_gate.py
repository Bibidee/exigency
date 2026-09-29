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


def _address_hex(value) -> str:
    # The unlocked CLI decodes address calldata before contract execution.
    if hasattr(value, "as_hex"):
        return value.as_hex
    return Address(value).as_hex


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
            "dispatch_status": "ISSUED",
            "dispatch_count": 0,
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
        if str(record.get("dispatch_status", "ISSUED")) == "APPLIED":
            raise gl.vm.UserError("capability already applied")
        if str(record.get("dispatch_status", "ISSUED")) == "DISPATCHED":
            try:
                protected = gl.get_contract_at(Address(str(record["target"])))
                if str(protected.view().get_applied_capability_digest(capability_key)) == str(record.get("action_digest", "")):
                    raise gl.vm.UserError("capability already applied")
            except gl.vm.UserError:
                raise
            except Exception:
                pass
        # Expiry gates only the first dispatch. Once a capability was dispatched
        # with a valid envelope, exact recovery remains possible until the child
        # is reconciled; recovery can never change the bound action.
        if str(record.get("dispatch_status", "ISSUED")) == "ISSUED" and _now() > int(record.get("expires_at", 0)):
            raise gl.vm.UserError("capability expired")

        target_hex = _address_hex(target)
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

        record["dispatch_status"] = "DISPATCHED"
        record["dispatch_count"] = int(record.get("dispatch_count", 0)) + 1
        record["dispatched_at"] = record.get("dispatched_at") or _now()
        # `consumed` is retained only as a compatibility field. It means APPLIED,
        # never merely dispatched.
        record["consumed"] = False
        record["consumed_at"] = 0
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

    @gl.public.write
    def reconcile_capability(self, capability_key: str) -> str:
        raw = self.capabilities.get(capability_key, "")
        if not raw:
            raise gl.vm.UserError("capability not found")
        record = json.loads(raw)
        if gl.message.sender_address.as_hex != str(record.get("holder", "")):
            raise gl.vm.UserError("only capability holder may reconcile")
        if str(record.get("dispatch_status", "ISSUED")) != "DISPATCHED":
            return str(record.get("dispatch_status", "ISSUED"))
        protected = gl.get_contract_at(Address(str(record["target"])))
        applied = protected.view().get_applied_capability_digest(capability_key)
        if str(applied) == str(record.get("action_digest", "")):
            record["dispatch_status"] = "APPLIED"
            record["consumed"] = True
            record["consumed_at"] = _now()
            self.capabilities[capability_key] = json.dumps(record, sort_keys=True)
            return "APPLIED"
        return "DISPATCHED"

    @gl.public.view
    def get_capability_json(self, capability_key: str) -> str:
        raw = self.capabilities.get(capability_key, "")
        if not raw:
            return ""
        record = json.loads(raw)
        if record.get("dispatch_status") == "DISPATCHED":
            try:
                protected = gl.get_contract_at(Address(str(record["target"])))
                applied = protected.view().get_applied_capability_digest(capability_key)
                if str(applied) == str(record.get("action_digest", "")):
                    record["dispatch_status"] = "APPLIED"
                    record["consumed"] = True
                    record["consumed_at"] = _now()
            except Exception:
                pass
        return json.dumps(record, sort_keys=True)

    @gl.public.view
    def list_capability_keys(self) -> list:
        return [self.capability_keys[i] for i in range(len(self.capability_keys))]

    @gl.public.view
    def get_engine_address(self) -> str:
        return self.engine_address
