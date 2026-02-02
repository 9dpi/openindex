# OpenIndex Registry: Locked Schema v1.0
**Status: FROZEN** | **Effective Date: 2026-02-03**

Tài liệu này định nghĩa cấu trúc dữ liệu bắt buộc cho mọi bản ghi được liệt kê trong OpenIndex. Mọi thay đổi trong tương lai chỉ được phép mở rộng (extend), không được phép xóa bỏ hoặc sửa đổi các trường hiện có để đảm bảo tính tương thích ngược.

## 1. Core Metadata (Bắt buộc)
| Field | Type | Description |
| :--- | :--- | :--- |
| `openindex_id` | `string` | Định danh duy nhất (vd: `finance/quantcore-v1`) |
| `project_name` | `string` | Tên hiển thị của dự án |
| `owner` | `string` | Tên tổ chức hoặc cá nhân sở hữu |
| `repo_url` | `url` | Link tới repository công khai |
| `domain` | `enum` | Một trong: `health`, `finance`, `hybrid` |
| `category` | `enum` | Một trong: `infrastructure`, `app`, `analytics` |

## 2. Evidence & Metrics
| Field | Type | Description |
| :--- | :--- | :--- |
| `metrics.stars` | `number` | Tổng số stars tại thời điểm verify |
| `metrics.forks` | `number` | Tổng số forks tại thời điểm verify |
| `metrics.stars_24h` | `number` | Mức tăng trưởng trong 24h qua |

## 3. Audit Timestamps
| Field | Type | Description |
| :--- | :--- | :--- |
| `timestamps.last_verified` | `iso8601` | Ngày cuối cùng hệ thống xác thực dữ liệu này |

## 4. Derived Rules (Logic tự động)
Hệ thống xử lý (Apps Script) sẽ tự động gán nhãn dựa trên các quy tắc sau:
- **Status: healthy**: `last_verified` < 90 ngày.
- **Status: stale**: `last_verified` >= 90 ngày.
- **Status: inactive**: `last_verified` >= 180 ngày.
- **Signal: unknown**: Mặc định cho v1.0.

---
*Lưu ý: Mọi bản ghi không tuân thủ schema này sẽ bị gán nhãn `Status: invalid` và không được hiển thị trên bảng chính.*
