# LWC Case Triage Console (Lightning Web Components + Apex, Jest-tested)

![CI](https://github.com/maryamaliusa90-hue/lwc-case-triage-console/actions/workflows/ci.yml/badge.svg)

## Business problem

Service teams triaging a shared queue often switch between list views, open each case, and reassign by hand. This component puts open cases in one table with priority filtering and age in days, and lets an agent claim several cases in one click. Errors are surfaced in plain language instead of failing silently.

## Tech stack

Lightning Web Components, Apex (`@AuraEnabled`, `WITH USER_MODE`), lightning-datatable, Jest (`@salesforce/sfdx-lwc-jest`), Salesforce DX, GitHub Actions

## Architecture

```mermaid
flowchart LR
  U[Agent] --> C[caseTriageConsole LWC]
  C -->|@wire cacheable| G[CaseTriageController.getOpenCases]
  C -->|imperative| A[CaseTriageController.assignToMe]
  A -->|update as user| DB[(Case)]
  C -->|refreshApex + toast| U
```

## What it demonstrates

- `@wire` with a reactive `$priority` parameter. Changing the filter re-queries automatically.
- Imperative Apex for the write, then `refreshApex` so the table reflects the change.
- Server-side input validation (allow-listed priorities, 1–200 row cap) and user-mode SOQL/DML.
- `reduceError()` normalizes the three common Salesforce error shapes into readable messages.
- **8 Jest tests**: rendering, empty state, wire error, filter re-query, button enable/disable, success toast, error toast, and helper functions. **6 Apex tests.**

## Project layout

| Path | Purpose |
| --- | --- |
| `lwc/caseTriageConsole/` | Component (HTML, JS, metadata) |
| `lwc/caseTriageConsole/__tests__/` | Jest tests + synthetic JSON fixtures |
| `classes/CaseTriageController.cls` | Apex controller |
| `classes/CaseTriageControllerTest.cls` | Apex tests |

## Run it yourself

Prerequisites: [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli), a Dev Hub org (a free Developer Edition org with Dev Hub enabled works), Node.js 20+.

```bash
sf org login web --set-default-dev-hub --alias devhub
sf org create scratch --definition-file config/project-scratch-def.json --alias demo --set-default --duration-days 7
sf project deploy start
sf apex run test --test-level RunLocalTests --code-coverage --result-format human --wait 20

# LWC unit tests (no org needed)
npm install
npm run test:unit
```

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

1. **Static checks**: Prettier with the Apex parser (this fails on any Apex syntax error) and Jest unit tests for the LWC.
2. **Apex tests in a scratch org**: runs only if the repository owner adds a `SFDX_AUTH_URL` secret (Settings > Secrets and variables > Actions). Get the value with `sf org display --verbose --target-org devhub` (the "Sfdx Auth Url" line). **Never commit it.**

## Security notes

- No credentials, endpoints, org IDs or tokens are stored in this repository. `.gitignore` blocks common secret files.
- Apex runs `with sharing`, and queries and DML use `USER_MODE` so object-, field- and record-level security is enforced.

## Limitations and next steps

- Add the component to a Lightning App or Home page with App Builder after deploying.
- No pagination beyond 200 rows. A production version would add infinite loading or server-side paging.

## About this project

This is an independent portfolio project. It demonstrates patterns I have used on enterprise Salesforce engagements, rebuilt from scratch on the standard data model with synthetic data. It contains no client or employer code, data, object names or configuration. It was developed with AI-assisted tooling and reviewed by me.

## License

MIT. See [LICENSE](LICENSE).

