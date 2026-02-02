# OpenIndex System Architecture v1

This document outlines the data-driven architecture for the OpenIndex project.

## 1. Project Structure
```text
OpenIndex/
├── data/
│   └── records/            # Source of truth (YAML files)
│       ├── project-a.yaml
│       └── project-b.yaml
├── scripts/
│   └── generate_html.py    # Build script to sync YAML -> HTML
├── index.html              # The public interface
├── style.css               # Visual identity (Arknights Endfield Style)
└── build.bat               # One-click update script
```

## 2. Core Workflow
1. **Edit Data**: Modify or add new `.yaml` files in `data/records/` following the [Index Record Schema v1].
2. **Build**: Run `build.bat` (or `python scripts/generate_html.py`).
3. **Deploy**: The `index.html` is updated with fresh data while preserving the UI/UX.

## 3. Technology Stack
- **Data Storage**: YAML (for auditability and Git-friendliness).
- **Processing**: Python 3.x + PyYAML.
- **Frontend**: Vanilla HTML5/CSS3 + Lucide Icons.

## 4. Schema Implementation
The system strictly follows the **Evidence-first** principle. UI elements like "Status" and "Signal" (Green/Yellow/Red) are derived directly from the `status` field in the records.

---
*Powered by Quantix AI Core - Finance & Medical Analystic @2026*
