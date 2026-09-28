# Final Agent Handoff

Continue **EXIGENT** from this repository in place. Do not restart it, scaffold a replacement, replace the architecture with a generic policy engine, copy USEBOND, copy ODDLOCKK, or collapse the product into a single LLM-call contract.

EXIGENT is a GenLayer-native emergency authority system. A protocol pre-commits an immutable emergency charter. An operator freezes an exact incident and requested action. Validators independently fetch charter-approved public evidence and decide whether the trigger exists. Only a `TRIGGER_CONFIRMED` assessment may emit a one-time execution capability, and that issuance must occur `on="finalized"`. The protected demo vault has no direct admin pause bypass.

## Network requirements are absolute

- **Studionet only**
- **Chain ID 61999**
- RPC `https://studio.genlayer.com/api`
- Explorer `https://explorer-studio.genlayer.com`
- GEN native token
- repository-local GenLayer CLI **0.39.1**
- `genlayer-js` **1.1.8**
- Python SDK line **genlayer-py v0.18**
- testing suite **v0.29**
- Python **3.12+**
- stable GenVM runner `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`
- stable linter **0.11.0**

There may be a globally installed `genlayer 0.40.0rc2` on the machine. **Do not use it for EXIGENT.** Use `npm install` and the repository-local binary via `npx --no-install genlayer` or the npm scripts.

Do not use Studio Dev. Do not use 61997. Do not silently change the GenVM dependency to a v0.3/preview artefact.

## Start here

1. Read `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `REVIEW_TARGET.md`, `DEPLOYMENT_RUNBOOK.md` and this file.
2. Inspect all four contracts and the direct/unit tests.
3. Run the current validation suite before changing source.
4. Fix actual failures in place; preserve the product architecture unless a genuine runtime incompatibility requires a documented correction.

## Required finish work

Take the repository as far as credentials and Studionet availability allow:

1. `npm install` and confirm local CLI is exactly 0.39.1.
2. Install Python 3.12 dependencies.
3. Run `python -m py_compile contracts/*.py`.
4. Run all unit tests.
5. Run all Direct Mode tests. Expand them to cover:
   - charter delay and version activation;
   - protocol-key ownership / foreign publisher rejection;
   - no rollback to an older active charter;
   - an already-open incident remaining assessable after a newer charter activates;
   - non-owner activation rejection;
   - disallowed evidence host rejection;
   - duration/action hard limits;
   - positive semantic assessment with mocked web + LLM responses;
   - insufficient evidence;
   - conflicting evidence;
   - source-state disagreement in validator logic;
   - per-source HTTP/content-digest provenance and aggregate evidence commitment;
   - one-time engine binding;
   - foreign issuer rejection;
   - capability expiry;
   - capability replay;
   - target/action/duration tampering;
   - direct protected-vault emergency-call rejection;
   - pause expiry.
6. Run `genvm-lint check` and `genvm-lint validate` for every contract.
7. Run TypeScript typecheck and Next production build.
8. Inspect current stable GenLayer docs only where runtime/API uncertainty exists. Do not migrate to preview/61997 syntax.
9. Deploy all four contracts to **61999** using `deploy/deployScript.ts` if the configured wallet permits it.
10. Verify each deployment reaches FINALIZED and archive addresses + tx hashes.
11. Copy `.env.generated` to `.env.local` and run the real frontend against the deployed contracts.
12. Publish and activate a demo charter using the actual ProtectedVault address.
13. Exercise the complete positive lifecycle with real public evidence.
14. Verify the assessment parent finalizes before the capability child is accepted as authority.
15. Execute the capability and verify the protected-vault child transaction and actual pause state.
16. Exercise negative and adversarial cases: disallowed source, weak evidence, conflicting evidence, over-limit duration, replay and parameter tampering.
17. Verify a direct call to a vault emergency method fails from an ordinary wallet.
18. Run and, if necessary, harden the included `npm run source:verify` deployed-source provenance check for all four contracts.
19. Update README and a final validation report with only evidence actually observed. Do not claim green checks that were not run.
20. Keep the frontend visually distinctive. Improve responsiveness/accessibility where needed, but do not copy ODDLOCKK routes/layouts and do not convert the product to all-lowercase styling.

## Architecture that must remain true

- `CharterRegistry`: immutable ex-ante policy and delayed activation.
- `ExigencyEngine`: the only semantic/nondeterministic decision owner.
- `CapabilityGate`: one-time finality-derived authority and replay protection.
- `ProtectedVault`: consequential target with no admin emergency bypass.
- Capability issuance only `on="finalized"`.
- Protected action only `on="finalized"`.
- No centralized backend or browser-computed final verdict.
- No mock fallback pretending to be contract state.
- Ambiguity fails closed.

When finished, leave the repository on a reproducible, reviewer-ready state and report exactly what remains manual or account-specific.
