# House Craft Pros — Verified Trades Directory (Texas MVP)

**Trạng thái:** Nghiên cứu + định hướng xong 24/11/2026. Chưa có code, chưa deploy.
**Quyết định chờ Owner:** GO / NO-GO cho wedge 90 ngày (xem `docs/dinh-huong-2026-11-24.md`).

## Dự án là gì

Danh bạ thợ sửa chữa Hoa Kỳ, bắt đầu từ Texas (điện, HVAC, ống nước), với USP:
**xác minh giấy phép hành nghề thật từ dữ liệu công khai của bang** — homeowner tra cứu
miễn phí, bấm gọi trực tiếp thợ đã xác minh, không điền form trung gian.

- **Nguồn dữ liệu:** TDLR (điện + HVAC) và TSBPE (ống nước) — CSV công khai, cập nhật hàng ngày, miễn phí.
- **Quy mô Texas:** ~40.150 giấy phép doanh nghiệp còn hiệu lực (điện ~12.320, HVAC ~19.087, ống nước RMP 8.743).
- **Wedge:** công cụ Verify License (chưa site nào có tool chạy thật) + guide verify — không phải trang danh bạ thành phố.
- **Stack đề xuất:** Next.js 14 SSR + Supabase + Vercel, tái dùng kiến trúc FarmDirect. $0.

## Cấu trúc repo

| Thư mục / File | Nội dung |
|---|---|
| `docs/dinh-huong-2026-11-24.md` | Báo cáo định hướng: GO có điều kiện, kế hoạch 90 ngày, quyết định cần Owner |
| `docs/danh-gia-seo-2026-11-24.md` | Đánh giá SEO & traffic ban đầu (tỷ lệ leo top theo loại truy vấn) |
| `docs/cau-truc-site.md` | Cấu trúc site: URL, loại trang, data model, ETL, schema, sitemap |
| `docs/cay-bai-viet-lien-ket.md` | Cây bài viết + sơ đồ liên kết nội bộ (pillar/cluster, 40 từ khóa) |
| `research/research-batch-1.md` | Tổng hợp nghiên cứu đợt 1 (5 hướng) |
| `research/data-findings-2026-11-24.md` | Số liệu dữ liệu bang — tải và phân tích trực tiếp từ CSV/API |
| `research/raw/` | Ghi chú thô từng hướng nghiên cứu (từ khóa, đối thủ, monetization, pháp lý, stack) |

## Quy tắc làm việc

- **$0:** không chi tiền cho tool, dữ liệu, hosting trả phí khi chưa có Owner duyệt.
- **Dữ liệu thật:** không bịa số liệu, không cào dữ liệu đối thủ, chỉ dùng nguồn công khai của bang.
- **SSR 100% trang public:** bài học từ FarmDirect — trang render bằng JavaScript thì Googlebot gần như không khám phá được.
- **Code/deploy cần anh Út duyệt** (quy tắc chung của công ty Bee).
- **Không SMS marketing hàng loạt** (TCPA + luật Texas SB 140) — xem `research/raw/04-legal.md`.
- **Không bán thứ hạng:** vị trí trả phí (nếu có sau này) phải gắn nhãn quảng cáo rõ ràng theo FTC.

## Dữ liệu thô (KHÔNG có trong repo)

File CSV gốc của bang (chứa SĐT cá nhân của thợ) được giữ local, không đẩy lên GitHub.
Số liệu tổng hợp xem `research/data-findings-2026-11-24.md`.
Khi build ETL, tải CSV trực tiếp từ nguồn chính thức:
- TDLR: https://www.tdlr.texas.gov/licenseSearch/licfile.asp
- TSBPE: https://tsbpe.texas.gov/free-licensee-list/
- TDLR Socrata API: https://data.texas.gov (dataset `7358-krk7`, chỉ dùng đếm số + xác minh)
