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

Deployment order is deliberate:

1. CharterRegistry
2. CapabilityGate
3. ExigencyEngine(registry, gate)
4. bind gate -> engine
5. ProtectedVault(gate)

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
Allowed actions: PAUSE_PROTECTED_ACTION
Max pause: 90 minutes
Capability TTL: 30 minutes
Activation delay: 1 minute
```

For reproducible mechanics testing, `demo/evidence/` contains clearly-labelled synthetic fixtures. After the repository is public, replace `OWNER/REPO` in the incident form with the actual GitHub path and approve `raw.githubusercontent.com` in the charter. For the strongest review demonstration, also run at least one case using genuinely independent public incident/security sources rather than relying only on project-owned fixtures.

## 7. Archive evidence

Before submission, record:

- all four deployment transaction hashes;
- all four contract addresses;
- gate binding transaction;
- charter publish + activation transactions;
- one positive incident;
- its finalized capability child transaction;
- capability execution transaction;
- protected-vault emergency child transaction;
- one negative/uncertain case that produces no capability;
- replay rejection;
- direct vault emergency-call rejection.

Then run `npm run source:verify` and archive its output. If the current RPC cannot return deployed source bytes, recover source from finalized deployment transaction data and document the fallback explicitly rather than claiming a match you could not verify.
