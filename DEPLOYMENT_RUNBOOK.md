# Studionet 61999 Deployment Runbook

## 1. Refuse the wrong toolchain

This repository targets stable Studionet, not the 61997 preview.

```bash
node --version
python --version
npm install
npx --no-install genlayer --version
```

Required local CLI: **0.39.1**.

If the machine has global `genlayer 0.40.0rc2`, do not invoke it directly. Use repository scripts or `npx --no-install genlayer`.

## 2. Validate before deployment

```bash
python -m py_compile contracts/*.py
pytest tests/unit -q
pytest tests/direct -v
./scripts/check-contracts.sh
npm run typecheck
npm run build
```

Do not deploy if any source-level validation is failing.

## 3. Confirm network identity

Canonical values:

```text
Network: Studionet
Chain ID: 61999
RPC: https://studio.genlayer.com/api
Explorer: https://explorer-studio.genlayer.com
```

The deployment script performs its own `chain.id === 61999` check.

## 4. Deploy

Use the wallet/account already configured for the stable CLI:

```bash
npm run deploy
```

If the GenLayer CLI wrapper hangs while discovering deploy scripts on Windows,
use the repository's explicit unlocked path instead:

```bash
npm run deploy:unlocked
```

It asks for the selected local keystore password without writing the private
key to disk, deploys the same five-contract stack, waits for finality and
successful execution, binds Gate → Engine, and writes the generated manifest.
For the complete V2 proof against that deployment, use
`npm run lifecycle:v2:unlocked`; `npm run lifecycle:v2:continue` is only for
continuing an already-created incident after a bounded challenge deadline.

Deployment order is deliberate:

1. CharterRegistry
2. CapabilityGate
3. ExigencyEngine(registry, gate)
4. bind gate -> engine
5. ProtectedVault(gate)
6. ProtectedRoute(gate)

`deploy/deployScript.ts` produces local `.env.generated` and
`deployment-manifest.generated.json` for a fresh deployment. The verified
public deployment record used for review is committed separately as
`deployment-manifest.public.json` after deployment finality, provenance, and
source hashes are confirmed.

## 5. Frontend

```bash
cp .env.generated .env.local
npm run build
npm run dev
```

The app uses only injected EIP-1193 wallets and calls `client.connect("studionet")` before writes.

## 6. Create a demo charter

The vault address is not known until deployment, so a charter is intentionally not auto-created in the deploy script.

For reviewer demonstration only, a one-minute activation delay is acceptable because the point is to prove the state transition. Production policy should use a materially longer delay.

Recommended demo charter:

```text
Protocol key: EXIGENT-DEMO
Allowed actions: PAUSE_PROTECTED_ACTION or DISABLE_PROTECTED_ROUTE
Max pause: 90 minutes
Capability TTL: 30 minutes
Activation delay: 1 minute
```

For reproducible mechanics testing, `demo/evidence/` contains clearly-labelled synthetic fixtures. The public repository paths are already filled into the incident form; approve `raw.githubusercontent.com` and `github.com` in the charter's named source groups. For the strongest review demonstration, also run at least one case using genuinely independent public incident/security sources rather than relying only on project-owned fixtures.

For V2, publish through `publish_charter_v2` with at least two named source
groups and a minimum distinct-group count. Freeze incident evidence as
`{"group":"name","url":"https://..."}` objects. A confirmed assessment is
provisional while its challenge window is open; call `challenge_incident` at
most the charter-defined number of times, then `finalize_incident` after the
window closes. A source digest change across rounds is recorded as drift and
cannot issue authority.

The deploy script also deploys `ProtectedRoute`. It uses the same Gate and
holder envelope as `ProtectedVault`; its V2 action is
`DISABLE_PROTECTED_ROUTE`.

## 7. Archive evidence

Before submission, record:

- all five deployment transaction hashes;
- all five contract addresses;
- gate binding transaction;
- charter publish + activation transactions;
- one positive incident;
- its finalized capability child transaction;
- capability execution transaction;
- protected-vault emergency child transaction;
- one negative/uncertain case that produces no capability;
- replay rejection;
- direct vault emergency-call rejection.

The current V2 target set is non-custodial: `ProtectedVault` accepts no user
GEN and has no deposit, withdrawal, payout or refund flow. Review evidence
must use the protected action and the second `ProtectedRoute` target rather
than stale payout-era instructions.

Then run `npm run source:verify` and archive its output. If the current RPC cannot return deployed source bytes, recover source from finalized deployment transaction data and document the fallback explicitly rather than claiming a match you could not verify.
