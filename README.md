# OpenIndex Registry

**OpenIndex** is an evidence-first AI index for high-stakes domains.

This repository contains the **canonical Index Records** used by OpenIndex. Each record represents a verifiable snapshot of an AI system, model, or research artifact.

> OpenIndex does not evaluate performance.  
> It indexes verifiable, domain-specific evidence.

---

## What This Repository Is

- A public, auditable registry of AI systems
- A Git-based source of truth
- An evidence and context preservation layer

## What This Repository Is Not

- ❌ A leaderboard or ranking system
- ❌ A benchmark or performance evaluator
- ❌ A marketplace or promotion channel

---

## Domains

- `/health`   — medical and healthcare-related systems
- `/finance`  — financial and risk-related systems
- `/hybrid`   — systems spanning multiple regulated domains

Each folder contains **Index Record YAML files** following the canonical schema.

---

## Index Records

- Format: **YAML** (human-readable)
- Schema: `schemas/index-record.v1.schema.yaml`
- One file = one indexed entity

All changes are versioned via Git. Records are never overwritten; updates occur via new commits.

---

## Governance

- Submissions occur via Pull Requests
- All records require human review
- Decisions are based on evidence, not opinion

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License

The registry content is released under **CC BY 4.0**, unless otherwise stated in individual records.
