# SOURCE OF TRUTH – IMMUTABLE (v1)

- **Project**: OpenIndex
- **Nature**: Evidence-first Living Registry
- **Status**: Locked – v1
- **Mutation policy**: Append-only via versioning (no in-place edits)

## 1. System Goal
OpenIndex là một living registry có judgement, tập hợp các hệ thống / infrastructure open-source quan trọng (Health, Finance, AI Infrastructure…). 

**Mục tiêu**:
- Giải thích repo là gì – dùng để làm gì – vì sao quan trọng, không chỉ dẫn link.
- Phục vụ cả technical & non-technical users qua curated index cards.
- Mỗi record phải có evidence rõ ràng, timestamp, judgement minh bạch.
- Trải nghiệm khi quay lại phải fresh & intelligent (context-aware curation, không personalization).

## 2. Explicit Non-Goals
OpenIndex không:
- Là GitHub clone hay search engine.
- Xếp hạng theo sao, trending, popularity thuần tuý.
- Có user account, social feed, infinite scroll.
- Marketing performance, growth hack, dopamine optimization.
- Cho frontend suy diễn, biến đổi, hoặc chỉnh sửa dữ liệu gốc.
- Cho phép mutation realtime từ client.

## 3. Index Record Lifecycle
*(Index record = “tín hiệu”)*

1. **Discovery**: Autonomous agents quét GitHub (topics, orgs, institutional repos, infra signals). Output thô → Google Sheet (staging layer).
2. **Validation**: Check duplication, domain fit, relevance. Auto-approve nếu đạt confidence threshold. Manual approval cho các case còn lại.
3. **Promotion**: Record hợp lệ → YAML chuẩn (schema v1). Lưu vào Google Drive theo domain. YAML là immutable snapshot.
4. **Indexing**: Drive YAML → parse → cache JSON. Frontend chỉ đọc cache (read-only).

## 4. Proof of “Signal Exists Before Outcome”
Mỗi record bắt buộc có:
- `generated_at`, `last_verified`.
- Evidence cụ thể (GitHub metadata, institutional usage, infra role).
- YAML Drive = source bất biến tại thời điểm index.
- Cache JSON có timestamp sinh ra, không chỉnh sửa hậu nghiệm.
- Không có UI hay API cho phép sửa nội dung record.

## 5. System Architecture

### Backend / Logic (Google Apps Script)
- **Discovery agent**: GitHub API integration.
- **Validation & Promotion**: Moving data from Sheets to Drive YAMLs.
- **Indexing & Caching**: Parsing YAML files into a high-performance JSON cache.
- **Data Layers**:
    - **Google Sheet**: Staging + approval (human + auto).
    - **Google Drive**: Immutable YAML source (per domain).

### Frontend (GitHub Pages)
- **Static UI**: Vanilla HTML/CSS.
- **Rendering**: Directly from cache JSON.
- **Main Interaction**: Inline expand (Index Cards).
- **Strategy**: Zero-maintenance frontend.

### Execution
- **Triggers**: Time-based triggers (4-12h).
- **Pipeline**: Discovery → Promotion → Indexing.
- **Integrity**: No client-side mutation.

## 6. Decisions Locked
- Registry có judgement, không trung lập tuyệt đối.
- Evidence-first > popularity-first.
- Curated scarcity: ít record, chất lượng cao.
- Inline expand, không auto redirect.
- Context-aware curation ≠ personalization.
- Mỗi domain mở chậm, có anchor records.
- **AI Infrastructure** là domain chiến lược đầu tiên.

## 7. Versioning Rule
Mọi thay đổi về goal, lifecycle, architecture, judgement → v2. 
v1 được dùng làm:
- Prompt nền cho AI agents.
- PRD gốc.
- Anchor cho mọi schema & pipeline sau này.

---
*Locked at: 2026-02-03 10:59:52 (v1)*
