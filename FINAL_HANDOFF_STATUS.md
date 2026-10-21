# EXIGENT final handoff

## Current status

EXIGENT is a five-contract, non-custodial protected-action deployment on
Studionet 61999. The targets store no user funds and emit no external payout.

- Branch: `main`
- Current hardening HEAD: see the exact SHA reported with the final evidence run.
- Production: [https://exigency.vercel.app/](https://exigency.vercel.app/)
- Vercel deployment: `dpl_5qFzmoK9c99KYcJzqAPN7uqcM9AT` (`READY`)
- Deployment URL: `exigency-lcccxhx98-bibidees-projects.vercel.app`
- Runtime frontend source: `f6a1600ccf542db4cb7e5ed33b1f7e83ddaba523`
- Deployment timestamp: `2026-10-21T18:25:48.191Z`

The production alias, READY deployment, and runtime source are verified through
`/api/build-info`. The frontend deployment was built from the hardening commit
`f6a1600ccf542db4cb7e5ed33b1f7e83ddaba523`; later repository commits are
documentation/provenance-only and do not change the deployed browser bundle.

## Current contracts

| Contract | Address |
| --- | --- |
| CharterRegistry | `0xBBf3A67273c0AB100ef1DD7EFD0Eb8B4dB73Fb95` |
| ExigencyEngine | `0xD9F68dCD02eE4297be263Db08735bF571F20feda` |
| CapabilityGate | `0xAAfc06B7a2fc25aC2ce721a0A371717dEb2488Bd` |
| ProtectedVault | `0x1e6e9699dD76fc1d3825914e9B8ff5AeF3d140C0` |
| ProtectedRoute | `0xf6E180AB7ECddCa8A9fF5265B57cc8C7F77eD33c` |

Deployed contract source commit: `132c1832cd113db8d38b77335539851846e7ea7e`.
All five deployed sources match the public manifest byte-for-byte.

## Steward authorization boundary

A fresh protocol key cannot grant authority over an existing protected target.
The Engine checks target governance before issuing a capability, and both
target contracts independently enforce the same boundary before applying an
emergency action. The unrelated-wallet regression test passes.

## Current V2 live lifecycle

The fresh unlocked-CLI lifecycle used the corrected deployment. The challenge
was intentionally submitted after its one-minute deadline and was rejected;
the on-chain incident remained provisional and was not retried. The existing
incident was then finalized once, executed once, and reconciled once:

- Charter: `V2-BOUNDARY-1792583486906`
- Incident: `V2-BOUNDARY-INC-1792583486906`
- Capability: `EXC-V2-BOUNDARY-INC-1792583486906`
- Publish: [transaction](https://explorer-studio.genlayer.com/tx/0xede28c92952fb357b879d57b537921ba4a3a7f65a1b678f1c5430a0cc0803d53)
- Activate: [transaction](https://explorer-studio.genlayer.com/tx/0xfc8140d21d7c96f8fa4b54f061ef81a05412e896d68ce8eb410ea2e14c5b599c)
- Open incident: [transaction](https://explorer-studio.genlayer.com/tx/0x960f686481a095ce84b07b354ba1576f89dc0ea998f9eb47a2959282b3db2dde)
- Assessment: [transaction](https://explorer-studio.genlayer.com/tx/0xa0336b7761b583eeaad7cc592f2589fc77023098d52b89f8a9a75fec984c3233)
- Late challenge rejected: [transaction](https://explorer-studio.genlayer.com/tx/0x6f1d57b37f2999cd479a5d86d0c7bc02c02f48617c32350ad3203383643878a7)
- Finalization: [transaction](https://explorer-studio.genlayer.com/tx/0x0f0748822e1c51714bde630fa31d115c723a5035948b67b9a699b2329a792d0e)
- Capability issuance child: [transaction](https://explorer-studio.genlayer.com/tx/0x2b5eb9e956ca6f425ff0e0017ba69a1f1992f6f23705890df7be2603a2013f5d)
- Execution: [transaction](https://explorer-studio.genlayer.com/tx/0x45833f3dcf2c066ad3ee544cb61e8fa5c2ed5b13df7724b44f79871db5f1f266)
- Protected-route child: [transaction](https://explorer-studio.genlayer.com/tx/0x0b7c29529dd5ed03c2dd887a5219c75a084a4cd24769ed4edfe80838f4069c4e)
- Reconciliation: [transaction](https://explorer-studio.genlayer.com/tx/0x0ad1401a784c8ff939326d4a9190864f0b88b002222243009d56fcefb2e8b361)

Final lifecycle state: incident `AUTHORITY_PENDING_FINALITY`, assessment
`FINAL`, capability `APPLIED`, `consumed=true`, and `dispatch_count=1`.
The route was disabled until `1792584354`; later health confirms the bounded
pause expired normally and the route is open. The late challenge result was
`FINISHED_WITH_ERROR` with `challenge window has closed`; the incident state was
unchanged before finalization.

## Exact-head validation

Exact-head CI and deployment health are run for the final repository SHA and
reported with the final evidence record.
The current test tree contains:

- Unit: 16
- Direct Mode: 47
- Browser: 19
- Contract lint/validation: passing
- Typecheck: passing
- Build: passing

The new Direct Mode checks cover V2 challenge bounds, provisional/final
assessment behavior, final-only capability issuance, source drift, overturned
results, and target-governance authorization. Browser mocks remain test-only and
are gated away from production.

The frontend hardening pass adds conservative assessment-budget and
deadline/expiry guards, challenge group/duplicate/capacity validation, and
session-local source-provenance warnings. These are mitigations for the user
journey only; they do not modify the deployed Engine or claim to constrain
direct contract callers.

## Limitations

- Live failed-payout recovery is not a feature because the targets do not
  transfer or custody GEN.
- Three moderate transitive/tooling npm advisories remain; `npm audit fix
  --force` would replace the pinned GenLayer CLI with a breaking version, so no
  unsafe forced upgrade was applied.
- Some historical lifecycle transaction hashes remain `NOT RECORDED`.
- Direct Mode is limited by the local Windows runner; GitHub CI is the complete
  execution environment.
