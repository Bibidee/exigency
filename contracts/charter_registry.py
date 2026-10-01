# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import hashlib
import json
import re
from datetime import datetime, timezone
from genlayer import *


ALLOWED_ACTIONS = (
    "PAUSE_PROTECTED_ACTION",
)


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _address_hex(value) -> str:
    # The CLI decodes address calldata to Address objects, while Direct Mode
    # commonly supplies strings. Accept both without wrapping Address twice.
    if hasattr(value, "as_hex"):
        return value.as_hex
    return Address(value).as_hex


class CharterRegistry(gl.Contract):
    charters: TreeMap[str, str]
    charter_keys: DynArray[str]
    active_by_protocol: TreeMap[str, str]
    protocol_owners: TreeMap[str, str]
    protocol_versions: TreeMap[str, u256]

    def __init__(self):
        pass

    def _require_key(self, value: str, label: str) -> None:
        if not re.fullmatch(r"[A-Za-z0-9._:-]{4,96}", value):
            raise gl.vm.UserError(f"invalid {label}")

    def _digest(self, payload: dict) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

    def _normalise_host(self, host: str) -> str:
        value = host.strip().lower()
        if (
            not value
            or len(value) > 180
            or "/" in value
            or "://" in value
            or "@" in value
            or " " in value
            or value.startswith(".")
            or value.endswith(".")
            or ".." in value
            or not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", value)
        ):
            raise gl.vm.UserError("invalid evidence host")
        return value

    def _normalise_scope(self, raw: str) -> tuple:
        token = raw.strip()
        parts = token.split("|", 1)
        host = self._normalise_host(parts[0])
        prefix = "/"
        if len(parts) == 2:
            prefix = parts[1].strip()
            if not prefix.startswith("/") or "\\" in prefix or "%" in prefix or "." in prefix or any(ord(c) < 0x21 or ord(c) == 0x7f for c in prefix) or len(prefix) > 240:
                raise gl.vm.UserError("invalid evidence path prefix")
            if "?" in prefix or "#" in prefix:
                raise gl.vm.UserError("evidence path prefix must not contain query or fragment")
            prefix = "/" + "/".join(part for part in prefix.split("/") if part)
            if prefix != "/":
                prefix += "/"
        return host, prefix

    @gl.public.write
    def publish_charter(
        self,
        charter_key: str,
        protocol_key: str,
        protocol_name: str,
        protected_target: str,
        trigger_policy: str,
        evidence_policy: str,
        evidence_hosts_csv: str,
        allowed_actions_csv: str,
        max_pause_minutes: int,
        capability_ttl_minutes: int,
        activation_delay_minutes: int,
    ) -> str:
        self._require_key(charter_key, "charter key")
        self._require_key(protocol_key, "protocol key")
        if charter_key in self.charters:
            raise gl.vm.UserError("charter key already exists")

        sender = gl.message.sender_address.as_hex
        existing_owner = self.protocol_owners.get(protocol_key, "")
        if existing_owner and existing_owner != sender:
            raise gl.vm.UserError("only protocol owner may publish a charter version")
        if not existing_owner:
            self.protocol_owners[protocol_key] = sender

        protocol_name = protocol_name.strip()
        trigger_policy = trigger_policy.strip()
        evidence_policy = evidence_policy.strip()
        if len(protocol_name) < 2 or len(protocol_name) > 120:
            raise gl.vm.UserError("invalid protocol name")
        if len(trigger_policy) < 80 or len(trigger_policy) > 5000:
            raise gl.vm.UserError("trigger policy must be between 80 and 5000 characters")
        if len(evidence_policy) < 40 or len(evidence_policy) > 3000:
            raise gl.vm.UserError("evidence policy must be between 40 and 3000 characters")
        if max_pause_minutes < 5 or max_pause_minutes > 1440:
            raise gl.vm.UserError("max pause must be between 5 and 1440 minutes")
        if capability_ttl_minutes < 5 or capability_ttl_minutes > 120:
            raise gl.vm.UserError("capability TTL must be between 5 and 120 minutes")
        if activation_delay_minutes < 1 or activation_delay_minutes > 10080:
            raise gl.vm.UserError("activation delay must be between 1 minute and 7 days")

        protected_target_hex = _address_hex(protected_target)

        hosts = []
        scopes = []
        for raw in evidence_hosts_csv.split(","):
            raw = raw.strip()
            if raw:
                host, prefix = self._normalise_scope(raw)
                if host not in hosts:
                    hosts.append(host)
                scope = {"host": host, "path_prefix": prefix}
                if scope not in scopes:
                    scopes.append(scope)
        if len(hosts) < 1 or len(hosts) > 8:
            raise gl.vm.UserError("provide between 1 and 8 evidence hosts")

        actions = []
        for raw in allowed_actions_csv.split(","):
            action = raw.strip().upper()
            if action:
                if action not in ALLOWED_ACTIONS:
                    raise gl.vm.UserError("unsupported emergency action")
                if action not in actions:
                    actions.append(action)
        if len(actions) < 1:
            raise gl.vm.UserError("at least one emergency action is required")

        published_at = _now()
        version = int(self.protocol_versions.get(protocol_key, u256(0))) + 1
        self.protocol_versions[protocol_key] = u256(version)
        frozen = {
            "charter_key": charter_key,
            "protocol_key": protocol_key,
            "protocol_name": protocol_name,
            "owner": sender,
            "protected_target": protected_target_hex,
            "trigger_policy": trigger_policy,
            "evidence_policy": evidence_policy,
            "evidence_hosts": hosts,
            "evidence_scopes": scopes,
            "allowed_actions": actions,
            "max_pause_minutes": int(max_pause_minutes),
            "capability_ttl_minutes": int(capability_ttl_minutes),
            "published_at": published_at,
            "version": version,
            "eligible_at": published_at + int(activation_delay_minutes) * 60,
            "activation_delay_minutes": int(activation_delay_minutes),
        }
        record = dict(frozen)
        record["charter_digest"] = self._digest(frozen)

        self.charters[charter_key] = json.dumps(record, sort_keys=True)
        self.charter_keys.append(charter_key)
        return charter_key

    @gl.public.write
    def activate_charter(self, charter_key: str) -> str:
        raw = self.charters.get(charter_key, "")
        if not raw:
            raise gl.vm.UserError("charter not found")
        charter = json.loads(raw)
        if gl.message.sender_address.as_hex != str(charter.get("owner", "")):
            raise gl.vm.UserError("only charter owner may activate")
        if _now() < int(charter.get("eligible_at", 0)):
            raise gl.vm.UserError("charter activation delay has not elapsed")

        protocol_key = str(charter["protocol_key"])
        active_key = self.active_by_protocol.get(protocol_key, "")
        if active_key and active_key != charter_key:
            active_raw = self.charters.get(active_key, "")
            if not active_raw:
                raise gl.vm.UserError("active charter record is missing")
            active = json.loads(active_raw)
            if int(charter.get("version", 0)) <= int(active.get("version", 0)):
                raise gl.vm.UserError("cannot roll back to an older charter version")

        self.active_by_protocol[protocol_key] = charter_key
        return charter_key

    @gl.public.view
    def get_charter_json(self, charter_key: str) -> str:
        return self.charters.get(charter_key, "")

    @gl.public.view
    def get_active_charter_key(self, protocol_key: str) -> str:
        return self.active_by_protocol.get(protocol_key, "")

    @gl.public.view
    def is_charter_active(self, charter_key: str) -> bool:
        raw = self.charters.get(charter_key, "")
        if not raw:
            return False
        charter = json.loads(raw)
        return self.active_by_protocol.get(str(charter["protocol_key"]), "") == charter_key


    @gl.public.view
    def get_protocol_owner(self, protocol_key: str) -> str:
        return self.protocol_owners.get(protocol_key, "")

    @gl.public.view
    def list_charter_keys(self) -> list:
        return [self.charter_keys[i] for i in range(len(self.charter_keys))]
