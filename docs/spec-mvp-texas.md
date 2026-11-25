# Spec MVP Texas — House Craft Pros

**Ngày:** 24/11/2026 · **Trạng thái:** GO đã chốt (có điều kiện). Chưa có code, chưa deploy.
**Tài liệu liên quan:** `docs/dinh-huong-2026-11-24.md` (quyết định + số liệu), `docs/cau-truc-site.md` (cấu trúc site), `docs/cay-bai-viet-lien-ket.md` (cây bài viết + 40 từ khóa), `research/` (nghiên cứu đợt 1).

---

## 1. Quyết định đã chốt (24/11/2026)

| Quyết định | Kết quả |
|---|---|
| GO / NO-GO | **GO CÓ ĐIỀU KIỆN** — wedge-first 90 ngày, đo index thật trước khi scale; không SMS marketing hàng loạt; không kỳ vọng doanh thu trước tháng 9; dữ liệu chỉ từ CSV chính thức của bang |
| Bang MVP | **Texas** (CSV + API sẵn). California để sau khi Texas chứng minh được traffic |
| Stack | **Next.js 14 + TypeScript + Supabase/PostgreSQL + GitHub + Vercel + Cloudflare + GoDaddy** — tái dùng FarmDirect |
| KHÔNG dùng | **Astro + VPS/Coolify** (xem §2) · **Google AI Studio làm production** (xem `research/raw/05-stack.md`) |
| Chưa chốt | Tên miền (đề xuất miền riêng, không dùng subdomain hubercenter). Code/deploy vẫn cần anh Út duyệt |

## 2. Vì sao chốt stack FarmDirect, không dùng Astro + VPS/Coolify

Đề xuất Astro + VPS/Coolify (user đưa 24/11 ~19:26) đã so với 2 site hiện có (hubercenter.com = WordPress + theme tự viết; farmdirectus.hubercenter.com = Next.js 14 + React 18 + Supabase). Kết luận:

1. **SSR là yêu cầu bắt buộc, không phải tùy chọn.** Danh bạ ~40.150 giấy phép chỉ có giá trị khi Google đọc được nội dung trang. Bài học FarmDirect: trang `/farms` load bằng JS, Googlebot không thấy link nào trong HTML. Next.js App Router SSR đã chứng minh live trên 17.087 farm profiles. Astro mặc định **prerender tĩnh** — muốn SSR phải thêm adapter + chạy Node server, tức thêm một lớp vận hành mà không thêm lợi ích gì so với Next.js đã có sẵn.
2. **VPS Mỹ = chi phí hàng tháng → vi phạm quy tắc $0.** Coolify tự host thêm gánh vận hành (update, backup, uptime). Trong khi Vercel free tier + Supabase free tier + GoDaddy (đã có) đủ chạy MVP, đúng như FarmDirect đang chạy.
3. **Tái dùng được đồ thật, không làm lại từ đầu.** ETL nạp CSV → Supabase, schema `contractors`/`cities`/`counties`, sitemap single-file, mẫu trang geo (bang → thành phố → hồ sơ), pattern profile SSR + mesh nearby của FarmDirect port trực tiếp sang Next.js. Sang Astro phải viết lại hết.
4. **Nội dung chính là dữ liệu, không phải file Markdown.** Lõi danh bạ là ~40k hồ sơ trong PostgreSQL, tra cứu + lọc + phân trang theo DB. Markdown/MDX + Git-based CMS trong đề xuất Astro chỉ phù hợp cho guide (12 bài) — phần này Next.js cũng làm được (MDX trong repo), không cần đổi framework vì nó.

## 3. Kiến trúc

| Lớp | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | SSR/SSG; cùng major version với FarmDirect để port pattern |
| Database | Supabase (PostgreSQL, free tier) | Bảng `contractors`, `cities`, `counties`, `claims` — xem `docs/cau-truc-site.md` §4 |
| Hosting | Vercel (free tier) | Deploy tự động từ GitHub (branch main); preview deploy cho PR |
| DNS/CDN | Cloudflare | DNS + CDN; tên miền quản lý ở GoDaddy |
| Repo | github.com/utne1991/House-Craft-Pros | Branch main; PR + review trước khi merge (anh Út duyệt deploy) |
| Analytics | GA4 + Google Search Console | KPI: index rate, impressions, clicks, tool usage (xem §7) |
| ETL | Script Node/TS chạy định kỳ | Tải CSV TDLR/TSBPE → parse → lọc → upsert Supabase → rebuild sitemap |

**Cấu trúc repo (dự kiến khi bắt đầu code):**

```
/app
  /(public)  page.tsx, verify/, guides/, texas/, contractors/[slug]/, claim/, legal...
/lib  supabase.ts, etl/, seo.ts (sitemap, JSON-LD helpers)
/scripts  etl-daily.ts (tải CSV → upsert)
/content/guides  *.mdx (12 guide viết tay, có References)
/docs  (đã có)  /research  (đã có)
```

## 4. Dữ liệu + ETL

**Nguồn (chỉ nguồn chính thức của bang, tải trực tiếp — không cào đối thủ):**

| Nguồn | File | Hồ sơ còn hiệu lực | Dữ liệu đầy đủ |
|---|---|---|---|
| TDLR — Electrical Contractor | `Lteecele.csv` (licfile.asp) | ~12.320 | SĐT + địa chỉ + city 100% |
| TDLR — A/C Contractor (HVAC) | `ltairref.csv` (licfile.asp) | ~19.087 | **0% SĐT/địa chỉ/city — chỉ có county** |
| TSBPE — Responsible Master Plumber | RMP download (free-licensee-list) | 8.743 | SĐT 50%, tên công ty 100% |
| TDLR Socrata API (data.texas.gov, `7358-krk7`) | Chỉ đếm số + xác minh | — | Không có SĐT/địa chỉ — KHÔNG dùng làm nguồn danh bạ |

**Pipeline ETL (chạy hàng ngày):**
1. Tải CSV từ licfile.asp + tsbpe.texas.gov (giờ cố định, log số dòng tải về).
2. Parse → chỉ giữ giấy phép **doanh nghiệp còn hiệu lực** (expiration ≥ hôm nay; TSBPE status = Current; TDLR không có trường status — suy ra từ ngày hết hạn).
3. Chuẩn hóa: tên công ty, số giấy phép (bỏ prefix khi tra cứu, giữ nguyên khi hiển thị), county, endorsements (HVAC Class A/B; RMP MedGas/MRF/WS).
4. Upsert vào Supabase theo khóa `(license_number, license_type)`; cập nhật `source_updated_at` = ngày file CSV.
5. Rebuild sitemap (chỉ URL đạt thin-page rule) + ghi log số hồ sơ thêm/mới/hết hạn.

**Gate trước khi nạp live lần đầu:** dry-run trên Supabase staging/dev — báo số hồ sơ sau lọc (kỳ vọng ~40k), số thiếu dữ liệu đầy đủ (~19k HVAC), dung lượng DB vs free tier. Chỉ nạp live khi Owner/anh Út duyệt số dry-run.

**Thin-page rule (quyết định index hồ sơ):** điện/ống nước cần tên + số giấy phép + trạng thái + (SĐT hoặc địa chỉ); HVAC cần tên + số giấy phép + trạng thái + county. Hồ sơ không đủ tín hiệu vẫn có trong DB (tool tra cứu được) nhưng **noindex**, không vào sitemap.

## 5. Tính năng MVP

### 5.1 Tool Verify License (`/verify/`) — tính năng trung tâm
- Ô tra cứu: tên doanh nghiệp **hoặc** số giấy phép + chọn nghề (điện / HVAC / ống nước).
- Kết quả **SSR**: tên doanh nghiệp, số giấy phép, nghề, trạng thái (Current/Expired), ngày hết hạn, địa chỉ/county, SĐT (nếu có), link "Kiểm tra lại trên trang .gov" (TDLR/TSBPE).
- Không tìm thấy: thông báo rõ + hướng dẫn tra cứu trên .gov (không bịa kết quả).
- Mọi kết quả tra cứu đều là URL share được (`/verify/?q=...&trade=...`, canonical về `/verify/` khi không có kết quả).
- Ghi log lượt tra cứu (count only, không lưu PII người tra cứu).

### 5.2 Trang nội dung (theo `docs/cau-truc-site.md` + `docs/cay-bai-viet-lien-ket.md`)
- Trang chủ: tool verify + tìm theo nghề/thành phố.
- Trụ cột verify + 11 guide nghề/chung (điện, nước, HVAC, TACL, RMP, GC, report unlicensed, Q&A).
- Hub Texas + 4 thành phố lớn (San Antonio mở màn → Dallas → Houston → Austin) + 20–30 thành phố nhỏ (≥5 thợ còn hiệu lực mới tạo trang).
- Trang county cho HVAC (`/texas/counties/[county]/hvac-contractors/`).
- Hồ sơ thợ (`/contractors/[slug]/`) — index theo lô có gate (xem §6).
- Trang tĩnh: About, Sources, Contact, Privacy, Terms, Disclaimer (bắt buộc trước launch), Remove Listing (form noindex).

### 5.3 Claim listing (`/claim/`, noindex)
- Form claim: tên người claim, SĐT, quan hệ với doanh nghiệp → xác minh **qua gọi điện tay** (KHÔNG SMS — TCPA + Texas SB 140).
- Sau xác minh: thợ được cập nhật/gỡ thông tin, tải ảnh thật lên (không dùng ảnh stock giả làm ảnh thợ).

## 6. SEO kỹ thuật (bắt buộc từ ngày đầu — bài học FarmDirect)

1. **SSR 100% trang public.** Mọi link (danh sách thợ, phân trang, nearby) phải có trong HTML server-rendered. Kiểm chứng bằng `curl` (không JS) trước mỗi deploy.
2. **Sitemap single-file ổn định từ đầu** (`/sitemap.xml`, 1 urlset). `lastmod` = ngày dữ liệu thật. Không restructure giữa chừng.
3. **Index theo từng đợt có gate:** đợt 1 = guide + tool + hub (10–15 URL) → đo index rate; đợt 2 = trang thành phố (20–30 URL) → index >80% mới mở đợt 3; đợt 3 = hồ sơ thợ theo lô 500–1.000/tuần, dừng nếu index rate rớt. Không mở 40k URL cùng lúc.
4. **Internal linking 3 tầng, không cap 9 link/trang.** Mọi trang indexable có ≥1 link SSR inbound. Xem `docs/cay-bai-viet-lien-ket.md` §2 (quy tắc link + checklist không trang mồ côi).
5. **404 thật** cho URL rỗng / thành phố không có thợ / hồ sơ hết hạn bị gỡ khỏi index.
6. **Schema:** LocalBusiness (Electrician/Plumber/HVACBusiness) cho hồ sơ; Article + FAQPage cho guide; CollectionPage + BreadcrumbList cho trang danh sách. **KHÔNG** AggregateRating/Review khi chưa có review thật.
7. **Tốc độ + mobile-first; llms.txt + robots.txt** cho phép AI crawler.

## 7. Kế hoạch 90 ngày + gate

| Giai đoạn | Việc | Gate để sang giai đoạn sau |
|---|---|---|
| Ngày 1–30 | ETL dry-run → nạp Supabase; tool `/verify/` chạy thật; trụ cột verify + 3 guide nghề + trang "Texas không cấp phép GC" + 5–10 trang San Antonio | Tool trả đúng trạng thái cho 20 giấy phép mẫu (đối chiếu .gov); toàn bộ trang SSR (curl kiểm chứng); sitemap hợp lệ + đã submit GSC |
| Ngày 31–60 | 10 guide còn lại + Dallas/Houston/Austin + 20–30 thành phố nhỏ | Index batch 1 >80% (GSC); impression tăng đều |
| Ngày 61–90 | Claim listing (gọi tay) + 10–15 cost guide + đo lường | Impression tăng 4 tuần liên tiếp + tool có traffic organic → mới quyết scale lên full directory |

**Không làm trong 90 ngày:** AdSense, bán Top 3/featured placement, SMS marketing, mở rộng California, AI Studio production.

**KPI theo dõi (GA4 + GSC, báo cáo tuần):** số URL indexed / discovered, impressions + clicks, top queries, lượt dùng tool verify, lượt bấm gọi (tel:), lượt claim.

## 8. Tiêu chí nghiệm thu (acceptance criteria)

- **Tool verify:** 20/20 giấy phép mẫu (10 điện, 5 HVAC, 5 RMP — gồm cả hết hạn) trả đúng trạng thái + ngày hết hạn khi đối chiếu TDLR/TSBPE.
- **SSR:** `curl` không JS thấy đầy đủ link danh sách thợ + phân trang trong HTML ở trang chủ, trang thành phố, hồ sơ thợ.
- **Sitemap:** 1 file `/sitemap.xml` hợp lệ, chỉ chứa URL đạt thin-page rule, `lastmod` đúng ngày dữ liệu.
- **Guide:** mỗi bài ≥800 từ, có References (TDLR/TSBPE/§ luật), ngày cập nhật, 2 CTA → tool verify.
- **Pháp lý:** footer + trang hồ sơ có disclaimer nguồn + ngày cập nhật + câu "không được bang chứng thực"; không logo TDLR/TSBPE.
- **$0:** không phát sinh chi phí hosting/tool/dữ liệu trong 90 ngày.

## 9. Việc cần duyệt/quyết tiếp theo

1. **Tên miền** (Owner) — đề xuất miền riêng, không dùng subdomain hubercenter.
2. **Code + deploy** — anh Út duyệt trước mỗi lần lên production (quy tắc chung công ty Bee).
3. **Dry-run ETL** — duyệt số hồ sơ sau lọc + Supabase free tier trước khi nạp live.
4. **Luật sư (trước launch):** nhãn "Sponsored" đơn độc có đủ chuẩn FTC không; SB 140 có bắt đăng ký không; tái xuất bản SĐT cá nhân của thợ sole proprietor.
5. **Nghiên cứu đợt 2 (sau GO):** deep profile ContractorsRanked.com; Google Trends 5 từ khóa trụ cột; khảo sát thợ Texas sẵn sàng trả bao nhiêu cho featured placement.
