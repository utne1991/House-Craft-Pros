# House Craft Pros — Verified Trades Directory (Texas MVP)

**Trạng thái:** GO đã chốt (có điều kiện) 24/11/2026 · Sprint 00 xong 25/11 (spec v2, chờ Owner duyệt). Chưa có code, chưa deploy.
**Stack đã chốt:** Next.js 16 + TypeScript + Supabase/PostgreSQL + GitHub + Vercel + Cloudflare + GoDaddy (tái dùng logic FarmDirect — KHÔNG dùng Astro + VPS/Coolify, xem `docs/spec-mvp-texas-v2.md` §2).
**Ngân sách:** $0 chỉ là ngân sách thử nghiệm/validation; ngân sách vận hành thương mại quyết **trước public production, không đợi đến khi monetize** (Vercel Pro $20/tháng hoặc Cloudflare Workers Paid $5/tháng qua OpenNext — xem `docs/spec-mvp-texas-v2.md` §2.2).
**Còn chờ Owner:** tên miền (đề xuất không dùng subdomain hubercenter) + duyệt spec v2.

## Dự án là gì

Danh bạ thợ sửa chữa Hoa Kỳ, bắt đầu từ Texas (điện, HVAC, ống nước), với USP:
**xác minh giấy phép hành nghề thật từ dữ liệu công khai của bang** — homeowner tra cứu
miễn phí, bấm gọi trực tiếp thợ có giấy phép tra cứu được từ dữ liệu bang, không điền form trung gian.

- **Nguồn dữ liệu:** TDLR (điện + HVAC) và TSBPE (ống nước) — CSV công khai, cập nhật hàng ngày, miễn phí.
- **Quy mô Texas:** ~40.150 giấy phép doanh nghiệp còn hiệu lực (điện ~12.320, HVAC ~19.087, ống nước RMP 8.743).
- **Wedge:** công cụ Verify License (chưa site nào có tool chạy thật) + guide verify — không phải trang danh bạ thành phố.
- **Stack đã chốt:** Next.js 16 (HTML hoàn chỉnh từ server — SSR/SSG/ISR đều được) + Supabase + Vercel + Cloudflare + GoDaddy, tái dùng logic FarmDirect. $0 chỉ là ngân sách thử nghiệm/validation; ngân sách thương mại quyết trước public production (xem `docs/spec-mvp-texas-v2.md` §2). KHÔNG dùng Astro + VPS/Coolify.

## Cấu trúc repo

| Thư mục / File | Nội dung |
|---|---|
| `docs/spec-mvp-texas-v2.md` | **Spec v2 (Sprint 00, hiện hành):** Next.js 16, DB 11 bảng, verify 3 trạng thái, ETL lifecycle, hosting $0 thử nghiệm (thương mại quyết trước public production), sitemap index, SEO rules sửa |
| `docs/spec-mvp-texas.md` | Spec v1 (24/11, SUPERSEDED — giữ để đối chiếu) |
| `docs/danh-gia-thiet-ke-2026-11-25.md` | Bản review thiết kế 7.3/10 + phụ lục kiểm chứng (Next.js 14 EOL, Vercel Hobby, Supabase Free, Contractor Records) |
| `docs/dinh-huong-2026-11-24.md` | Báo cáo định hướng: GO có điều kiện, kế hoạch 90 ngày, quyết định cần Owner |
| `docs/danh-gia-seo-2026-11-24.md` | Đánh giá SEO & traffic ban đầu (tỷ lệ leo top theo loại truy vấn) |
| `docs/cau-truc-site.md` | Cấu trúc site: URL, loại trang, data model, ETL, schema, sitemap |
| `docs/cay-bai-viet-lien-ket.md` | Cây bài viết + sơ đồ liên kết nội bộ (pillar/cluster, 40 từ khóa) |
| `research/research-batch-1.md` | Tổng hợp nghiên cứu đợt 1 (5 hướng) |
| `research/data-findings-2026-11-24.md` | Số liệu dữ liệu bang — tải và phân tích trực tiếp từ CSV/API |
| `research/raw/` | Ghi chú thô từng hướng nghiên cứu (từ khóa, đối thủ, monetization, pháp lý, stack) |

## Quy tắc làm việc

- **$0 chỉ là ngân sách thử nghiệm/validation:** không chi tiền cho tool, dữ liệu, hosting trả phí khi chưa có Owner duyệt; ngân sách vận hành thương mại phải quyết trước public production (không đợi đến khi monetize).
- **Dữ liệu thật:** không bịa số liệu, không cào dữ liệu đối thủ, chỉ dùng nguồn công khai của bang.
- **HTML hoàn chỉnh từ server cho mọi trang public** (SSR/SSG/ISR đều được, miễn là HTML đầy đủ link/nội dung — kiểm chứng bằng `curl` không JS): bài học từ FarmDirect — trang render bằng JavaScript thì Googlebot gần như không khám phá được.
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
