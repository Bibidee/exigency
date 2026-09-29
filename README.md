# EXIGENT

**Emergency authority that cannot self-certify.**

EXIGENT is a GenLayer-native emergency-control system for protocols. A protocol commits its emergency charter before a crisis. When an incident occurs, the operator freezes one exact requested action and a bounded set of approved evidence URLs. GenLayer validators independently fetch those sources and interpret them against the frozen charter. A privileged execution capability is created **only after the assessment transaction reaches FINALIZED**.

The capability is single-use, expires, and is bound to the exact incident, charter digest, target, action class and duration. The protected demo vault has no administrator pause bypass: its emergency methods accept calls only from `CapabilityGate`.

## Canonical network

EXIGENT is intentionally built for **stable Studionet** only.

| Item | Value |
| --- | --- |
| Network | Studionet |
| Chain ID | **61999** |
| RPC | `https://studio.genlayer.com/api` |
| Explorer | `https://explorer-studio.genlayer.com` |
| Native token | GEN |
| Local GenLayer CLI | **0.39.1** |
| JS SDK | **genlayer-js 1.1.8** |
| Python SDK line | **genlayer-py v0.18** |
| Testing suite | **genlayer-testing-suite v0.29** |
| Python | **3.12+** |
| Stable GenVM runner | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |
| Linter | **genvm-linter 0.11.0** |

Do **not** substitute Studio Dev / chain 61997. The repository-local `genlayer@0.39.1` must be used instead of a globally installed `0.40.0rc2`.

## Contracts

### `CharterRegistry`

Stores immutable charter versions. Each charter freezes:

- protocol identity and protocol-owner lock;
- protected target;
- natural-language trigger policy;
- evidence-quality policy;
- approved evidence hostnames;
- allowed emergency action classes;
- maximum pause duration;
- capability TTL;
- activation delay.

The charter text is never edited. The first publisher claims the protocol key; later charter versions for that protocol must come from the same wallet. Each protocol uses a deterministic monotonic version counter. Activation changes only which immutable version is selected for **future** incidents, and an older version cannot roll back a newer active version. An incident snapshots the active charter digest and remains assessable against that frozen version even after a later charter activates.

### `ExigencyEngine`

Freezes incidents and performs the only nondeterministic decision.

Validators independently:

1. fetch the same charter-approved evidence URLs;
2. interpret that evidence against the same frozen charter;
3. return one bounded outcome;
4. compare per-source semantic state;
5. perform a second substantive equivalence check over trigger clauses and material findings;
6. commit the final assessment to the actual fetched HTTP status and SHA-256 content digest for every frozen source.

Outcomes:

- `TRIGGER_CONFIRMED`
- `TRIGGER_NOT_CONFIRMED`
- `INSUFFICIENT_EVIDENCE`
- `ACTION_DISPROPORTIONATE`
- `CONFLICTING_EVIDENCE`

Only `TRIGGER_CONFIRMED` emits `CapabilityGate.issue_capability(...)`, and the message is explicitly `on="finalized"`.

### `CapabilityGate`

Accepts issuance only from the one-time-bound `ExigencyEngine`. Each capability is:

- holder-bound;
- target-bound;
- action-bound;
- duration-bound;
- charter-digest-bound;
- incident-bound;
- expiring;
- single-use.

Execution recomputes the action digest before consuming the capability. The protected action is then emitted `on="finalized"`.

### `ProtectedVault`

A real test-GEN consequence surface:

- payable deposits;
- credited balances;
- withdrawals;
- deposit pause;
- withdrawal pause;
- full pause.

There is deliberately no owner/admin pause function. Emergency methods only accept the configured `CapabilityGate` as caller.

## Authority lifecycle

```text
Protocol owner
    |
    v
Publish immutable charter
    |
    | activation delay
    v
Activate charter for future incidents
    |
    v
Freeze incident + exact action + approved URLs
    |
    v
GenLayer validators independently fetch + interpret evidence
    |
    +--> no trigger / weak / conflicting / disproportionate -> NO AUTHORITY
    |
    +--> TRIGGER_CONFIRMED
             |
             | emit(on="finalized")
             v
      CapabilityGate issues one-shot capability
             |
             v
      Holder executes exact bound action
             |
             | emit(on="finalized")
             v
       ProtectedVault pauses
```

`ACCEPTED` is never displayed as emergency authority.

## Frontend routes

Routes are product-specific to EXIGENT:

```text
/                         product landing
/command                  on-chain authority overview
/charter/new              publish immutable charter
/charter/[charterKey]     inspect / activate a charter version
/incident/new             freeze an emergency request
/incident/[incidentKey]   inspect / assess an incident
/capability/[key]         inspect / execute a finalized capability
/vault                    deposit, withdraw and observe the protected target
```

The frontend uses an injected EIP-1193 wallet only. It does not use Privy, WalletConnect, a centralized decision backend, Firebase, Supabase or mock contract results.

## Local setup

### Node / frontend / CLI

```bash
npm install
npm run cli:version
# must report 0.39.1
npm run typecheck
npm run build
```

The `deploy` script uses `npx --no-install genlayer`, so the repository-local CLI wins even when another version is installed globally.

### Python / contracts

Use Python 3.12+:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
npm run contracts:compile
pytest tests/unit -q
pytest tests/direct -v
./scripts/check-contracts.sh
```

## Deploy to Studionet 61999

Configure the local GenLayer CLI account normally, then:

```bash
npm install
npm run cli:version
npm run deploy
```

`deploy/deployScript.ts` refuses to run on a chain other than `61999` and deploys in this order:

1. `CharterRegistry`
2. `CapabilityGate`
3. `ExigencyEngine(registry, gate)`
4. one-time `CapabilityGate.bind_engine(engine)`
5. `ProtectedVault(gate)`

It writes:

- `.env.generated`
- `deployment-manifest.public.json` (committed public contract source of truth)

Then:

```bash
cp .env.generated .env.local
npm run build
npm run dev
```

## Review demonstration

The intended review flow is adversarial, not a happy-path-only demo:

1. Publish a charter with a short **demo** activation delay.
2. Prove activation fails before the delay.
3. Activate it after the delay.
4. Deposit test GEN into `ProtectedVault`.
5. Open an incident using only approved evidence hosts.
6. Prove a disallowed host is rejected before consensus.
7. Assess a genuine evidence set.
8. Show `ACCEPTED` is not enough: capability is absent until the parent is `FINALIZED` and its child issuance executes.
9. Execute the exact capability.
10. Show the vault pause takes effect only after the gate execution finalizes and its child runs.
11. Replay the capability and show rejection.
12. Change target/action/duration and show digest or envelope rejection.
13. Attempt to call the vault emergency method directly and show the caller is rejected.
14. Exercise an insufficient/conflicting-evidence case and show that no capability exists.
15. Inspect the stored per-source HTTP status/content digests and the aggregate evidence commitment.
16. Rotate to a newer charter and prove an already-open incident remains bound to its original digest.
17. Prove a different wallet cannot publish another version under the claimed protocol key and an older charter cannot roll back a newer active version.

## Important implementation boundary

EXIGENT does **not** claim GenLayer proves that a protocol is legally entitled to act, nor that web sources are universally true. The bounded question is:

> Given this protocol's pre-committed emergency charter and these frozen approved evidence sources, does the charter authorize this exact emergency action now?

Uncertainty fails closed.

See `ARCHITECTURE.md`, `SECURITY.md`, `DEPLOYMENT_RUNBOOK.md`, `REVIEW_TARGET.md`, and `HANDOFF_TO_AGENT.md` for the full handoff.
