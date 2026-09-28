# Review Target

This is not a score prediction. It is the evidence EXIGENT should present under the GenLayer project rubric.

## Validity gate

- Real GenLayer contract source is in `contracts/`.
- The semantic decision runs inside GenLayer, not a server/API backend.
- The frontend calls the deployed contracts directly.
- No mocked verdict is substituted when deployment configuration is missing.

## GenLayer fit evidence

The reviewer should be able to observe that removing GenLayer changes the trust model, not merely answer quality:

- the party requesting emergency power cannot mint the capability;
- a deterministic smart contract cannot interpret evolving incident evidence against natural-language trigger policy;
- a centralized operator would reintroduce self-certification;
- the consensus result determines whether privileged protocol state can change;
- ambiguous/insufficient/conflicting evidence produces no authority.

## Contract quality evidence

- four contracts with distinct lifecycle responsibilities;
- validators independently fetch all frozen evidence URLs;
- validators independently reconstruct the assessment;
- per-source semantic states must match;
- stored source records include code-derived HTTP status and SHA-256 content commitments;
- material trigger/evidence equivalence is checked, not JSON shape alone;
- source host restrictions, hard action set and duration ceilings are deterministic;
- protocol-key ownership prevents cross-wallet charter takeover and charter activation cannot roll back to an older version;
- incidents remain bound to the charter digest they froze even after a newer version activates;
- capability issuance and execution are finality gated;
- replay, expiry, caller and parameter tampering are rejected.

## Engineering evidence

- local CLI pinned to `0.39.1` in `package.json`;
- `genlayer-js` pinned to `1.1.8`;
- stable GenVM dependency hash in every contract;
- Python 3.12 CI;
- source compile, unit tests, direct mode, GenVM lint/validate, TypeScript and production build;
- deployment script refuses non-61999 chains;
- generated manifest and source-provenance verification after deployment;
- explicit failure UX when addresses or wallet are missing or on the wrong network.

## Frontend evidence

The deployed app should allow the reviewer to:

- publish a charter;
- inspect the activation delay and activate the charter;
- deposit test GEN;
- freeze an incident;
- request the real GenLayer assessment;
- see source-level semantic findings;
- understand that accepted is provisional and finality is required;
- open the issued capability;
- execute it;
- observe the protected vault become paused;
- see meaningful wallet/network/contract errors.
