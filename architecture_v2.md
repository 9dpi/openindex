# OPENINDEX V2 – HIGH-LEVEL ARCHITECTURE

- **Project**: OpenIndex
- **Nature**: Opportunity Explorer
- **Status**: Active – v2
- **Objective**: Transform technical complexity into business clarity.

## 1. System Topology
```text
                ┌──────────────┐
                │   User       │
                │ (Non-tech)   │
                └──────┬───────┘
                       │
              Click / Explore / Test
                       │
        ┌──────────────▼──────────────┐
        │        OpenIndex UI          │
        │  (Opportunity Explorer)     │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │      Opportunity Layer      │
        │  (MPV Registry – Evidence)  │
        └──────────────┬──────────────┘
           ┌───────────┴───────────┐
           │                       │
┌──────────▼──────────┐   ┌────────▼─────────┐
│   GitHub Goldmine   │   │    n8n Goldmine   │
│  (Code → Product)  │   │ (Logic → Outcome) │
└──────────┬──────────┘   └────────┬─────────┘
           │                       │
   Repo ingestion           Workflow ingestion
           │                       │
┌──────────▼──────────┐   ┌────────▼─────────┐
│ Repo Analyzer       │   │ Workflow Analyzer│
│ - README            │   │ - Nodes           │
│ - Stars / forks     │   │ - Data sources    │
│ - Domain keywords   │   │ - Triggers        │
└──────────┬──────────┘   └────────┬─────────┘
           │                       │
           └───────────┬───────────┘
                       │
        ┌──────────────▼──────────────┐
        │     MPV Generator Engine    │
        │  (Mock data + Sandbox)      │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   Self-Test Sandbox (UI)    │
        │  Input → Run → See Outcome  │
        └─────────────────────────────┘
```

## 2. Core Workflow (User POV)
1. **Entry**: User chooses between **GitHub Goldmine** or **n8n Goldmine**.
2. **Discovery**:
    - **GitHub**: High-level intent extraction ("What it does for me?"). No technical README reading.
    - **n8n**: Logic value extraction ("What value does this logic create?"). No JSON inspection.
3. **MPV Generation (Autonomous)**: System generates an **MPV Card**:
    - **What it does**
    - **Who should care**
    - **Why it matters**
    - **Evidence** (Stars/Nodes/Sources)
    - **Sandbox** (Mock data environment)
4. **Self-Test (Critical)**: User interacts with a mock sandbox (Input → Run → Outcome) to visualize the value of the technical asset without setup.
5. **Decision**: User decides to ignore, bookmark, fork, or delegate to a team.

## 3. The Two Goldmines
| Feature | GitHub Goldmine | n8n Goldmine |
| :--- | :--- | :--- |
| **Focus** | Potential Value (Needs build) | Executable Value (Ready to run) |
| **Persona** | Builder / Founder | Trader / Operator / Investor |
| **Insight** | "What can I build?" | "What can I use NOW?" |

## 4. Design Aesthetics (V2)
- **Rich Aesthetics**: Vibrant colors, dark mode, glassmorphism.
- **Micro-animations**: Smooth transitions between the two Goldmines.
- **Sandbox Feedback**: Real-time terminal-style output simulation.

---
*Initialized at: 2026-02-04 (v2)*
*Derived from User Request: OPENINDEX V2 – HIGH-LEVEL ARCHITECTURE*
