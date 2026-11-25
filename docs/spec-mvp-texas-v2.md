# Spec MVP Texas v2 — House Craft Pros (Sprint 00)

**Ngày:** 25/11/2026 · **Trạng thái:** Sprint 00 — spec v2, chờ Owner duyệt. Chưa có code, chưa deploy.
**Thay thế:** `spec-mvp-texas.md` (v1, 24/11/2026) — xem §11 changelog. V1 giữ lại để đối chiếu lịch sử, không dùng để build.
**Nguồn:** bản review thiết kế 7.3/10 ngày 25/11 (`docs/danh-gia-thiet-ke-2026-11-25.md`, các claim P0 đã kiểm chứng) + `docs/dinh-huong-2026-11-24.md` + `docs/cau-truc-site.md` + `docs/cay-bai-viet-lien-ket.md`.

---

## 1. Quyết định đã chốt

| Quyết định | Kết quả |
|---|---|
| GO / NO-GO | **GO CÓ ĐIỀU KIỆN** (24/11) — wedge-first 90 ngày, đo index thật trước khi scale; không SMS marketing hàng loạt; không kỳ vọng doanh thu trước tháng 9 |
| Bang MVP | **Texas** (CSV + API sẵn). California/Florida sau khi Texas chứng minh được traffic |
| Stack | **Next.js 16 + TypeScript + PostgreSQL/Supabase + GitHub + Vercel (thử nghiệm) + Cloudflare + GoDaddy** — tái dùng logic FarmDirect, không copy phiên bản framework |
| KHÔNG dùng | **Astro + VPS/Coolify** · **Google AI Studio làm production** |
| Chưa chốt | Tên miền (đề xuất miền riêng, không dùng subdomain hubercenter) · Ngân sách vận hành thương mại — **quyết TRƯỚC public production, không đợi đến khi monetize** (xem §2 và ADR-0003) · Code/deploy vẫn cần anh Út duyệt |

## 2. Thay đổi chính của v2 (Sprint 00)

1. **Next.js 14 → 16.** 14 đã hết hỗ trợ (EOL 26/10/2025; 16 là Active LTS, 15 là Maintenance LTS tới 31/01/2027 — nguồn: nextjs.org/support-policy). Lưu ý: Next.js 16 cần React 19, FarmDirect đang React 18 — khi port logic phải kiểm tra breaking changes React 19, không copy nguyên code.
2. **Ngân sách: $0 chỉ là ngân sách thử nghiệm/validation** (chưa có ads, chưa thu tiền). Ngân sách vận hành thương mại phải quyết **TRƯỚC public production — không đợi đến khi monetize** (xem ADR-0003 `docs/architecture/decisions/ADR-0003-hosting-decision-timing.md`):
   - **Vercel Pro $20/tháng/seat** (kèm $20 usage credit) — vì Vercel Hobby bị cấm dùng thương mại theo Fair Use Guidelines (thu tiền, chạy AdSense, affiliate, được trả tiền để build/host đều tính là thương mại). Hobby còn bị cap (100GB transfer, 1M invocations/tháng) và khi vượt cap tính năng dừng ~30 ngày.
   - **Hoặc Cloudflare Workers Paid $5/tháng (qua adapter OpenNext `@opennextjs/cloudflare`)** — phương án thay thế, cho phép dùng thương mại; KHÔNG còn là Cloudflare Pages (xem §2.2 — đánh giá chi tiết, khuyến nghị có điều kiện).
   - **Supabase Free:** 500MB database, tối đa 2 project active, **pause sau 7 ngày ít hoạt động** (resume tay), **không backup tự động**. ETL phải export/backup dữ liệu định kỳ. Pro $25/tháng (8GB disk, backup hàng ngày giữ 7 ngày, không pause) — quyết trước public production.

### 2.2 Đánh giá: Cloudflare Workers (OpenNext) cho full-stack Next.js — thay thế Cloudflare Pages

Cloudflare Pages **không còn là phương án** cho full-stack Next.js: adapter Pages
`@cloudflare/next-on-pages` đã bị Cloudflare archive ngày 29/09/2025; README của nó
nói rõ dùng OpenNext Cloudflare adapter thay thế. Cloudflare hiện hướng Pages sang
Workers (Static Assets) và adapter OpenNext là đường đi được hỗ trợ cho Next.js
server-rendered. Nguồn: Cloudflare blog "Deploy your Next.js app to Cloudflare
Workers with the Cloudflare adapter for OpenNext" (cập nhật 15/07/2026),
https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/ ;
OpenNext docs, https://opennext.js.org//cloudflare (truy cập 25/11/2026).

**Kết quả đánh giá (25/11/2026, nghiên cứu tài liệu — chưa deploy thử):**

| Tiêu chí | Cloudflare Workers + OpenNext | Vercel Pro |
|---|---|---|
| Hỗ trợ Next.js 16 | Có — mọi minor/patch của Next.js 16 + minor mới nhất của 15 được hỗ trợ (OpenNext docs); Next.js 14 đã hết hỗ trợ | Có — native, day-one (Vercel duy trì framework) |
| Runtime | Node.js runtime qua `nodejs_compat` (không phải Edge Runtime hẹp); cần bỏ `export const runtime = 'edge'`; lưu ý Next.js 16 đổi `middleware.ts` → `proxy.ts` mà adapter OpenNext chưa nhận diện (tính đến 08/2026) — giữ `middleware.ts` nếu dùng Workers | Node.js đầy đủ, không cần adapter |
| Tính năng Next.js | SSR, SSG, ISR, App Router, Route Handlers, Server Actions được hỗ trợ; Node middleware hỗ trợ thử nghiệm từ `@opennextjs/cloudflare` 1.20.3 | Đầy đủ, không có khoảng trống đã ghi nhận |
| Giới hạn Worker | Free: 3 MiB (nén); Paid: 10 MiB (nén) — giới hạn cứng cho bundle; 128 MB bộ nhớ/isolate | Không có giới hạn bundle tương đương |
| CPU/request | Free: 10 ms CPU/invocation (quá hẹp cho SSR — một trang SSR thường tốn 10–60 ms CPU); Paid: mặc định 30 giây, tối đa 5 phút | Metered theo CPU-hours (Pro kèm $20 usage credit) |
| Giá | **Paid: tối thiểu $5/tháng/tài khoản**, gồm 10 triệu requests + 30 triệu CPU-ms/tháng; vượt: $0,30/triệu requests, $0,02/triệu CPU-ms; **không tính phí egress**. Free: 100.000 requests/ngày. Nguồn: Cloudflare Workers Pricing, https://developers.cloudflare.com/workers/platform/pricing/ (truy cập 25/11/2026) | **Pro: $20/tháng/seat**, kèm $20 usage credit + 1 TB transfer/1 triệu CDN requests (Flat Rate CDN tier); vượt credit tính theo usage |
| Dùng thương mại | Cho phép (không có giới hạn phi thương mại như Vercel Hobby) | Cho phép (Pro) |
| Rủi ro chính | Bundle >10 MiB thì không deploy được; chi phí CPU có thể tăng nhanh nếu nhiều request động (VD: 50 triệu request động × 40 ms CPU ≈ $40.000 CPU overage theo một phân tích độc lập — con số minh họa, không phải dự báo cho dự án này); adapter là bên thứ ba so với framework (Vercel duy trì Next.js) | Đắt hơn ở mức tối thiểu ($20 so với $5) |

**Khuyến nghị có điều kiện:** Cloudflare Workers Paid là phương án thay thế **khả thi về
mặt kỹ thuật và rẻ hơn ở mức tối thiểu** ($5 so với $20/tháng), nhưng **chưa được chứng
minh bằng deploy thử** cho dự án này. Trước khi chọn Workers thay Vercel Pro, phải
deploy thử một bản Next.js 16 tối thiểu qua `@opennextjs/cloudflare` và kiểm chứng:
bundle ≤10 MiB, SSR/ISR chạy được, và chi phí CPU thực tế ở lưu lượng dự kiến. Nếu
bản thử thất bại hoặc bundle vượt giới hạn, mặc định chọn Vercel Pro. Chi tiết đầy đủ:
ADR-0004 `docs/architecture/decisions/ADR-0004-cloudflare-workers-vs-vercel-pro.md`.
Quyết định cuối cùng do Owner chốt **trước public production** (xem ADR-0003).
3. **Verify 3 trạng thái** (xem §5) — không gắn nhãn Verified khi chưa đủ bằng chứng.
4. **ETL lifecycle đầy đủ** (xem §4) — nạp cả giấy phép hết hạn, lưu lịch sử, phát hiện bản ghi biến mất, anomaly check, rollback.
5. **DB 11 bảng** thay cho 1 bảng `contractors` (xem §4).
6. **Sitemap index từ ngày đầu** (theo loại nội dung + đợt xuất bản) thay cho single-file (xem §6).
7. **SEO rules sửa** theo review (xem §6).
8. **Định vị dài hạn: Homeowner Intelligence Platform** — MVP giữ wedge License Intelligence (xem §8).
9. **Số liệu đính chính:** gọi được trực tiếp ≈ 16.700 (không phải 21.000); số doanh nghiệp độc lập < số giấy phép (xem §4).

## 3. Kiến trúc

| Lớp | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | SSR/SSG/ISR; React 19 — kiểm tra breaking changes khi port logic FarmDirect |
| Database | Supabase (PostgreSQL) | 11 bảng — xem §4. Free tier cho thử nghiệm; Pro trước production |
| Data Ingestion Engine | Script ETL riêng, tách khỏi website | Tải → kiểm tra → chuẩn hóa → đối chiếu; tái dùng khi mở rộng sang bang khác |
| API + Business Logic | Route handlers / server actions | Xác minh · tìm kiếm · phân quyền · kiểm soát dữ liệu (RLS) |
| Hosting (thử nghiệm) | Vercel Hobby | Chỉ cho giai đoạn validation phi thương mại |
| Hosting (thương mại) | Vercel Pro $20/tháng HOẶC Cloudflare Workers Paid $5/tháng (OpenNext) | Owner quyết **trước public production** — xem §2.2 và ADR-0003 |
| DNS/CDN | Cloudflare | DNS + CDN; tên miền quản lý ở GoDaddy |
| Repo | github.com/utne1991/House-Craft-Pros | Branch main; PR + review trước khi merge; anh Út duyệt deploy |
| Analytics | GA4 + Google Search Console | KPI: index rate, impressions, clicks, lượt dùng tool verify, lượt bấm gọi |

**Cấu trúc repo (dự kiến khi bắt đầu code):**

```
/app
  /(public)  page.tsx, verify/, guides/, texas/, contractors/[slug]/, claim/, legal...
/lib  supabase.ts, verify.ts (logic 3 trạng thái), seo.ts (sitemap index, JSON-LD)
/scripts/etl  download.ts, parse.ts, normalize.ts, upsert.ts, anomaly-check.ts, rollback.ts
/content/guides  *.mdx (12 guide viết tay, có References)
/docs  (đã có)  /research  (đã có)
```

## 4. Dữ liệu + ETL + DB v2

**Nguồn (chỉ nguồn chính thức của bang, tải trực tiếp — không cào đối thủ):**

| Nguồn | File | Giấy phép còn hiệu lực | Dữ liệu |
|---|---|---|---|
| TDLR — Electrical Contractor | `Lteecele.csv` (licfile.asp) | ~12.320 | SĐT + địa chỉ + city 100% |
| TDLR — A/C Contractor (HVAC) | `ltairref.csv` (licfile.asp) | ~19.087 | **0% SĐT/địa chỉ/city — chỉ có county** |
| TSBPE — Responsible Master Plumber | RMP download (free-licensee-list) | 8.743 | SĐT ~50%, tên công ty 100% |
| TDLR Socrata API (data.texas.gov, `7358-krk7`) | Chỉ đếm số + xác minh | — | Không có SĐT/địa chỉ — KHÔNG dùng làm nguồn danh bạ |

**Đính chính số liệu (25/11):** gọi được trực tiếp ≈ **16.700** hồ sơ (điện 12.320 + ống nước ~4.372 có SĐT), không phải ~21.000. Số doanh nghiệp độc lập **nhỏ hơn** số giấy phép (1 doanh nghiệp có thể giữ nhiều giấy phép) — chốt con số sau dedupe theo tên + địa chỉ trong ETL dry-run. HVAC 19.087 có 0% SĐT → chỉ làm trang cấp county, không có nút gọi trực tiếp.

**Pipeline ETL (chạy hàng ngày, có lịch sử + rollback):**
1. Tải CSV từ licfile.asp + tsbpe.texas.gov; ghi `ingestion_runs` (nguồn, ngày file, số dòng tải về, checksum).
2. Parse → chuẩn hóa (tên công ty, số giấy phép, county, endorsements).
3. **Nạp TẤT CẢ giấy phép, kể cả hết hạn** — không lọc trước khi upsert (v1 sai ở đây: lọc hết hạn trước upsert khiến hồ sơ cũ có nguy cơ hiển thị sai là active, và tool Verify không trả được giấy phép hết hạn).
4. Đối chiếu với dữ liệu hôm trước: bản ghi mới / thay đổi trạng thái / **biến mất khỏi nguồn** → ghi `license_status_history`; bản ghi biến mất được đánh dấu `disappeared_from_source`, không tự xóa.
5. **Anomaly check trước khi publish:** số giấy phép thay đổi đột biến (>10% so với ngày trước), ngày hết hạn bất thường, trùng lặp số giấy phép → dừng publish, báo cáo để kiểm tra tay.
6. Publish theo `publication_batches` với **hai cổng riêng** (xem ghi chú trên): chỉ bản ghi đã qua cổng data mới xuất hiện trong tool Verify / dữ liệu danh bạ; chỉ bản ghi đã qua cổng SEO mới vào sitemap index. **Rollback:** mỗi lần chạy giữ snapshot; lỗi thì revert về batch trước.
7. Export/backup dữ liệu định kỳ (Supabase Free không backup tự động).

**Tách `license_status` khỏi `verification_level` (bắt buộc — xem §5):** hai cột độc lập
trên cùng một bản ghi giấy phép (`licenses`). `license_status` = trạng thái của chính
giấy phép (active / expired / suspended / revoked / unknown), suy ra từ ngày hết hạn
hoặc lấy từ trường status của nguồn (nếu nguồn có). `verification_level` = mức độ tin
cậy CỦA CHÚNG TA rằng bản ghi đúng như nó tuyên bố (authority-confirmed / inferred /
unverified). CSV TDLR **không có trường status** — trạng thái suy ra từ ngày hết hạn
chỉ là `inferred`, không bao giờ là `authority-confirmed`. Không gắn nhãn "Verified"
khi `verification_level` ≠ authority-confirmed (có bằng chứng ghi lại).

**Tách data publication khỏi SEO index publication (hai cổng riêng):** `publication_batches`
có hai mốc riêng — `data_published_at` (bản ghi hiển thị trong tool Verify / dữ liệu
danh bạ) và `seo_index_published_at` (URL của bản ghi vào sitemap index và được phép
index). Một bản ghi có thể data-published nhưng chưa SEO-published (VD: hồ sơ đủ dữ
liệu để tra cứu nhưng chưa đủ tín hiệu để index — xem thin-page rule dưới đây). Chỉ
bản ghi đã qua cổng SEO mới vào sitemap index; cổng SEO dùng gate kết hợp ở §6.4.3.

**Schema v2 (11 bảng — thay cho 1 bảng `contractors` của v1):**

| Bảng | Chức năng |
|---|---|
| businesses | Danh tính doanh nghiệp (dedupe theo tên + địa chỉ) |
| licenses | Giấy phép hành nghề (1 doanh nghiệp ↔ nhiều giấy phép) |
| license_status_history | Lịch sử trạng thái mỗi giấy phép |
| license_holders | Người đứng tên giấy phép |
| locations | Bang, county, thành phố |
| data_sources | Nguồn gốc dữ liệu (TDLR/TSBPE + URL + ngày copy) |
| ingestion_runs | Lịch sử đồng bộ |
| claims | Yêu cầu xác nhận doanh nghiệp |
| correction_requests | Yêu cầu sửa hoặc gỡ dữ liệu |
| publication_batches | Kiểm soát từng đợt xuất bản |
| audit_logs | Bằng chứng các thay đổi |

**Gate trước khi nạp live lần đầu (dry-run):** báo số giấy phép sau lọc, số doanh nghiệp sau dedupe, số thiếu dữ liệu đầy đủ, dung lượng DB thực tế so với 500MB Free tier. Chỉ nạp live khi Owner/anh Út duyệt số dry-run.

**Thin-page rule (quyết định index hồ sơ):** điện/ống nước cần tên + số giấy phép + trạng thái + (SĐT hoặc địa chỉ); HVAC cần tên + số giấy phép + trạng thái + county. Hồ sơ không đủ tín hiệu vẫn có trong DB (tool tra cứu được) nhưng **noindex**, không vào sitemap.

## 5. Verify — mô hình 3 trạng thái (sửa P0 của review)

CSV TDLR không có trường status — trạng thái suy ra từ ngày hết hạn chỉ là **suy luận**, không phải xác nhận của cơ quan cấp phép (giấy phép chưa hết hạn vẫn có thể bị đình chỉ/thu hồi; TDLR dùng các trạng thái Active, Expired, Suspended, Revoked, Cancelled, Pending, Inactive).

**Hai trường riêng biệt — không gộp:**
- `license_status` — trạng thái của chính giấy phép: `active` / `expired` / `suspended` / `revoked` / `unknown`. Với CSV TDLR, giá trị này được suy ra từ ngày hết hạn (chưa hết hạn → `active`, đã qua ngày hết hạn → `expired`); với nguồn có trường status (VD: TSBPE RMP có Current/Expired), lấy đúng giá trị nguồn.
- `verification_level` — mức độ tin cậy của chúng ta: `authority-confirmed` / `inferred` / `unverified`. Một giấy phép `license_status = active` suy ra từ CSV TDLR vẫn chỉ là `verification_level = inferred` — **không bao giờ hiển thị là đã được cơ quan xác nhận**.

| Mức verification_level | Nghĩa | Khi nào dùng |
|---|---|---|
| **authority-confirmed** | Cơ quan cấp phép xác nhận | Nguồn có trường status, hoặc đối chiếu trực tiếp với tra cứu .gov |
| **inferred** | Suy ra từ ngày hết hạn trong CSV | CSV TDLR (không có trường status): hiển thị "chưa hết hạn theo dữ liệu CSV ngày X — chưa xác minh đình chỉ/thu hồi" + link "Kiểm tra lại trên TDLR" |
| **unverified** | Không đủ dữ liệu để kết luận | Thiếu ngày hết hạn hoặc nguồn mâu thuẫn |

**Quy tắc hiển thị (bắt buộc):**
- **KHÔNG gắn nhãn "Verified"** khi chưa đủ bằng chứng. Nhãn đúng: "License status as reported in [nguồn] on [ngày]" + link tới trang tra cứu .gov.
- Tool Verify **phải trả được giấy phép hết hạn** (hiển thị rõ "Expired — hết hạn ngày X"), không trả "không tìm thấy" cho giấy phép từng tồn tại.
- Kết quả tra cứu là URL share được (`/verify/?q=...&trade=...`); không tìm thấy → hướng dẫn tra cứu trên .gov, không bịa kết quả.
- Ghi log lượt tra cứu (count only, không lưu PII người tra cứu).

## 6. Tính năng MVP + SEO kỹ thuật (rules sửa theo review)

### 6.1 Tool Verify License (`/verify/`) — tính năng trung tâm, ưu tiên cao nhất
- Ô tra cứu: tên doanh nghiệp **hoặc** số giấy phép + chọn nghề (điện / HVAC / ống nước).
- Kết quả **SSR**: tên doanh nghiệp, số giấy phép, nghề, trạng thái 3 mức (§5), ngày hết hạn, địa chỉ/county, SĐT (nếu có), link "Kiểm tra lại trên trang .gov" (TDLR/TSBPE).

### 6.2 Trang nội dung (theo `docs/cau-truc-site.md` + `docs/cay-bai-viet-lien-ket.md`)
- Trang chủ: tool verify + tìm theo nghề/thành phố.
- Trụ cột verify + 11 guide nghề/chung (điện, nước, HVAC, TACL, RMP, GC, report unlicensed, Q&A).
- Hub Texas + 4 thành phố lớn (San Antonio mở màn → Dallas → Houston → Austin) + 20–30 thành phố nhỏ (≥5 thợ còn hiệu lực mới tạo trang).
- Trang county cho HVAC (`/texas/counties/[county]/hvac-contractors/`).
- Hồ sơ thợ (`/contractors/[slug]/`) — index theo lô có gate.
- Trang tĩnh: About, Sources, Contact, Privacy, Terms, Disclaimer (bắt buộc trước launch), Remove Listing (form noindex).

### 6.3 Claim listing (`/claim/`, noindex)
- Form claim: tên người claim, SĐT, quan hệ với doanh nghiệp → xác minh **qua gọi điện tay** (KHÔNG SMS — TCPA + Texas SB 140).
- Sau xác minh: thợ được cập nhật/gỡ thông tin, tải ảnh thật lên (không dùng ảnh stock giả làm ảnh thợ).

### 6.4 SEO kỹ thuật (v2 — sửa theo review)
1. **HTML hoàn chỉnh từ server** — chấp nhận SSR, SSG và ISR (miễn là HTML server-rendered đầy đủ link/nội dung, kiểm chứng bằng `curl` không JS trước mỗi deploy). Không bắt buộc "SSR 100%" theo nghĩa hẹp.
2. **Sitemap index từ ngày đầu** — chia theo loại nội dung + đợt xuất bản (khớp `publication_batches`), thiết kế ngay từ đầu để không phải restructure giữa chừng (bài học FarmDirect 17/11). `lastmod` = ngày dữ liệu thật.
3. **Index theo từng đợt có gate (cổng SEO — riêng với cổng data, xem §4):** đợt 1 = guide + tool + hub (10–15 URL) → đo index rate; đợt 2 = trang thành phố (20–30 URL); đợt 3 = hồ sơ thợ theo lô 500–1.000/tuần. Gate mở rộng = **kết hợp index rate + impressions + chất lượng dữ liệu + hành vi người dùng** (không chỉ index >80%). Chỉ URL đã qua cổng SEO mới vào sitemap index.
4. **Internal linking 3 tầng, không cap 9 link/trang.** Mọi trang indexable có ≥1 link SSR inbound. Xem `docs/cay-bai-viet-lien-ket.md` §2.
5. **Hồ sơ hết hạn: giữ trang lịch sử hữu ích** — hiển thị rõ trạng thái Expired + ngày hết hạn, cân nhắc noindex — thay cho 404 (v1). URL rỗng (0 thợ) vẫn trả 404 thật.
6. **Viết đủ để giải quyết nhu cầu tìm kiếm** — bỏ floor cứng 800 từ; bỏ tỉ lệ khác biệt 30–40% cứng (đánh giá giá trị thực tế thay vì tỉ lệ).
7. **FAQ/HowTo schema chỉ khi phù hợp**, không kỳ vọng rich results.
8. **Schema:** LocalBusiness (Electrician/Plumber/HVACBusiness) cho hồ sơ; Article + FAQPage cho guide; CollectionPage + BreadcrumbList cho trang danh sách. **KHÔNG** AggregateRating/Review khi chưa có review thật.
9. **Tốc độ + mobile-first; llms.txt + robots.txt** cho phép AI crawler.

### 6.5 Bảo mật và quyền riêng tư (bổ sung theo review — P1)
- Supabase RLS: chỉ role admin mới ghi; public chỉ đọc dữ liệu đã publish.
- Phân quyền admin, giới hạn truy vấn (rate limit tool verify + form), chống spam form (honeypot + rate limit).
- Bảo vệ dữ liệu cá nhân: không expose SĐT cá nhân của thợ sole proprietor khi chưa có đánh giá luật sư; form claim không thu thập email thừa.
- Secrets qua biến môi trường, **không commit CSV chứa PII, API key, thông tin xác thực lên GitHub** (repo đang public).
- Backup: export dữ liệu định kỳ (Supabase Free không backup tự động).

## 7. Kế hoạch triển khai (Sprint 00–05)

| Sprint | Việc | Thời gian | Nghiệm thu |
|---|---|---|---|
| **00 — Điều chỉnh thiết kế** | Spec v2 này (Next.js 16, DB 11 bảng, hosting, verify 3 trạng thái, AGENTS.md) | 3–5 ngày | **Owner duyệt spec v2** |
| 01 — Data Foundation | ETL, migrations, chuẩn hóa, lưu lịch sử giấy phép, kiểm tra thiếu/trùng | 7–10 ngày | Báo cáo dry-run, đối chiếu nguồn chính phủ, kiểm thử tự động |
| 02 — License Verification Tool | Tool tra cứu tên/số giấy phép, trạng thái 3 mức, nguồn xác minh | 7–10 ngày | Test active / expired / suspended (nếu có dữ liệu) / not found / trùng tên |
| 03 — SEO Foundation | Trang chủ, 12 guide, Texas, San Antonio, sitemap index, schema, canonical, GSC + analytics | 7 ngày | Kiểm tra HTML, crawl, mobile, nội dung thật |
| 04 — Public Directory | Pilot 100–500 hồ sơ chất lượng cao, đo lường thực tế | — | Báo cáo index, impression, độ chính xác, lượt dùng tool |
| 05 — Content & Growth | Cây chủ đề mở rộng, cost tool, brand-adjacent content, mở rộng thành phố + hồ sơ theo kết quả nghiệm thu | — | Theo gate mở rộng (§6.4.3) |

**Không làm trong 90 ngày đầu:** AdSense, bán Top 3/featured placement, SMS marketing, mở rộng California/Florida, AI Studio production.
**KPI theo dõi (GA4 + GSC, báo cáo tuần):** số URL indexed / discovered, impressions + clicks, top queries, lượt dùng tool verify, lượt bấm gọi (tel:), lượt claim.

## 8. Định vị dài hạn + nội dung mở rộng (sau MVP)

**North star: Homeowner Intelligence Platform** (không chỉ "Verified Trades Directory") — 4 trụ cột trên Government Data Engine (TDLR · TSBPE · dữ liệu địa phương · các bang khác):
- **License Intelligence** — tra cứu giấy phép, trạng thái, nguồn xác minh (MVP)
- **Local Directory** — tìm nhà thầu theo nghề và khu vực (MVP)
- **Cost Intelligence** — công cụ ước tính chi phí sửa chữa (Sprint 05)
- **Homeowner Academy** — kiến thức, hướng dẫn, kinh nghiệm thuê thợ (Sprint 05)

**Cây SEO 6 cụm (sau MVP):** 01 License Verification · 02 Electrical · 03 Plumbing · 04 HVAC · 05 Homeowner Protection (how to hire, scam prevention, insurance/permits, report unlicensed) · 06 Location Intelligence (Texas → County → City → Trade; CA/FL sau MVP).

**Brand-adjacent content** (Home Depot, Lowe's, Carrier, Trane, Rheem, Angi, TDLR, TSBPE) — chủ đề đề xuất **chưa xác minh search volume bằng Keyword Planner**, phải verify trước khi viết. Skill Brand-adjacent Content Intelligence: dự kiến xây dựng (chưa có).

## 9. Mô hình doanh thu (đề xuất, chưa xác nhận)

- **Freemium:** verify + hồ sơ cơ bản miễn phí; thu từ tiện ích (dashboard doanh nghiệp, thông báo giấy phép sắp hết hạn, thống kê lượt xem hồ sơ, website giới thiệu, portfolio, quảng cáo gắn nhãn riêng).
- Giả lập (chưa xác nhận nhu cầu trả tiền): 100 doanh nghiệp × $29/tháng = **$2.900/tháng ($34.800/năm)** gộp, chưa trừ thuế/hủy/CAC.
- **Trả phí KHÔNG làm thay đổi kết quả xác minh.** AdSense/Top 3 chỉ là thu phụ sau này.

## 10. Đội ngũ AI Agent

```
OWNER
└── Manager Agent (Lập kế hoạch · Giao việc · Kiểm soát tiến độ)
    ├── Data Agent — ETL và xác minh dữ liệu
    ├── Developer Agent — Code, API, database
    ├── SEO & GEO Agent — Index, crawl, technical SEO
    ├── Content Agent — Nghiên cứu và sản xuất nội dung
    ├── Compliance Agent — Kiểm tra nguồn và quyền riêng tư
    └── QA Agent — Kiểm thử và nghiệm thu độc lập
```

Quy trình: **Intent to Evidence** — Kiểm chứng kết quả → Pull Request → Owner duyệt → Deploy.
Skills tái dùng: github/spec-kit, obra/superpowers, microsoft/playwright-mcp, vercel-labs/agent-skills, claude-seo, humanizer, Intent to Evidence, Brand-adjacent Content Intelligence (dự kiến). Bổ sung skill chuyên ngành xác minh giấy phép nhà thầu.
Lưu ý: cài skill từ repo bên thứ ba phải quét an toàn trước (quy tắc scan-then-use); chưa cài trong Sprint 00.

## 11. Changelog v1 → v2 + việc cần duyệt

**Changelog:**
- Next.js 14 → 16 (14 EOL 26/10/2025); React 19 lưu ý khi port.
- $0 → ngân sách thử nghiệm; quyết ngân sách vận hành thương mại **trước public production** (Vercel Pro $20/tháng hoặc Cloudflare Workers Paid $5/tháng qua OpenNext — Pages đã bỏ, xem §2.2 và ADR-0003/ADR-0004).
- Verify: suy ra từ ngày hết hạn → mô hình 3 trạng thái + tách `license_status` khỏi `verification_level`, không nhãn Verified khi chưa đủ bằng chứng.
- ETL: lọc hết hạn trước upsert → nạp tất cả + lịch sử + phát hiện biến mất + anomaly check + rollback + publication_batches (hai cổng riêng: data publication và SEO index publication).
- DB: 1 bảng `contractors` → 11 bảng.
- Sitemap: single-file → sitemap index từ ngày đầu.
- SEO rules: bỏ floor 800 từ cứng, bỏ tỉ lệ khác biệt cứng, gate mở rộng kết hợp nhiều tín hiệu, hồ sơ hết hạn giữ trang lịch sử (noindex) thay vì 404.
- Số liệu: gọi được ~16.700 (không phải 21.000); doanh nghiệp < giấy phép, dedupe trong dry-run.
- Định vị: thêm north star Homeowner Intelligence Platform + cây SEO 6 cụm + brand-adjacent (sau MVP).
- Đối thủ mới: Contractor Records → nghiên cứu đợt 2 (cùng contractorverify.org, texasrepaircosts.com).
- Bảo mật: thêm §6.5 (RLS, phân quyền, rate limit, anti-spam, PII, secrets, backup).
- Doanh thu: thêm mô hình freemium (§9).

**Việc cần duyệt/quyết tiếp theo:**
1. **Owner duyệt spec v2** (nghiệm thu Sprint 00) — rồi mới sang Sprint 01.
2. **Tên miền** (Owner) — đề xuất miền riêng, không dùng subdomain hubercenter.
3. **Ngân sách vận hành thương mại** (Owner, **trước public production — không đợi đến khi monetize**): Vercel Pro $20/tháng hoặc Cloudflare Workers Paid $5/tháng (OpenNext) — xem §2.2, ADR-0003, ADR-0004.
4. **Code + deploy** — anh Út duyệt trước mỗi lần lên production.
5. **Dry-run ETL** — duyệt số hồ sơ sau lọc + dedupe + dung lượng DB trước khi nạp live.
6. **Luật sư (trước launch):** nhãn "Sponsored" đơn độc; SB 140; tái xuất bản SĐT cá nhân.
7. **Nghiên cứu đợt 2:** deep profile Contractor Records; Google Trends 5 từ khóa trụ cột; khảo sát thợ Texas.
