# OpenIndex Registry
> We don’t list projects. We surface systems the world quietly depends on.

**OpenIndex** is a living registry of the open-source infrastructure that forms the backbone of modern society. We focus on systems that are critical, verifiable, and evidence-based.

---

## The "Soft Magic" Philosophy
OpenIndex follows a "soft magic" approach to discovery. It isn't just an index; it's a bridge between technical depth and non-technical clarity.

### 🏗️ Our Four Arms of Discovery
1. **Institutional Gold**: Systems used by major global organizations (WHO, NIH, Microsoft) that form the baseline of trust.
2. **Silent Infra**: Essential systems with low marketing but high reliability and deep dependencies.
3. **Academic-to-Open**: Research-grade innovations transitioning from papers into production pipelines.
4. **Community Curators**: Peer-nominated systems verified by our confidence layer.

### 🧠 The Brain: Evaluation Criteria
Every record in OpenIndex must answer three system-critical questions:
1. **Existing Logic**: *Why does this exist?* (The core problem solved)
2. **Reliance Signal**: *When do people rely on it?* (The real-world scenario)
3. **Breakage Impact**: *Without it, what breaks?* (The systemic context)

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
