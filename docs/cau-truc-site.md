# Cấu trúc site — House Craft Pros (Texas MVP)

**Ngày:** 24/11/2026 · **Trạng thái:** thiết kế trên giấy, chưa có code.
**Nguyên tắc nền:** HTML hoàn chỉnh từ server cho mọi trang public (SSR/SSG/ISR đều được), dữ liệu thật từ CSV bang, index theo từng đợt có gate (cổng data và cổng SEO riêng — xem spec v2 §4). Đồng bộ với spec v2 (25/11/2026).

---

## 1. Stack (ĐÃ CHỐT 24/11/2026 — code/deploy vẫn cần anh Út duyệt)

| Lớp | Lựa chọn | Vì sao |
|---|---|---|
| Framework | Next.js 16 (App Router, SSR/SSG/ISR) | Tái dùng pattern FarmDirect (đã SSR live 17.087 profiles); SEO cần HTML hoàn chỉnh từ server, không client-rendered. Next.js 14 đã EOL 26/10/2025 — xem spec v2 §2 |
| Database | Supabase (PostgreSQL, free tier cho thử nghiệm; Pro trước production) | FarmDirect đang dùng; đủ cho ~40k hồ sơ TX (cần dry-run ETL xác nhận) |
| Hosting | Vercel Hobby (thử nghiệm, phi thương mại) | Deploy tự động từ GitHub; cùng stack FarmDirect. Hosting thương mại (Vercel Pro $20/tháng hoặc Cloudflare Workers Paid $5/tháng qua OpenNext) do Owner quyết **trước public production** — xem spec v2 §2.2 |
| ETL | Script tải CSV TDLR/TSBPE hàng ngày → parse → chuẩn hóa → nạp TẤT CẢ (kể cả hết hạn) → upsert + lịch sử + anomaly check + rollback | Nguồn CSV cập nhật hàng ngày; chạy định kỳ, không cào. Không lọc giấy phép hết hạn trước khi upsert (lỗi của v1) — xem spec v2 §4 |
| Analytics | GA4 + Google Search Console | Đo index + traffic theo đúng KPI đã chốt |

**Không dùng:** Google AI Studio làm production (không có SSR/SSG, custom domain bắt buộc paid GCP
~$14,40/năm → vi phạm $0). Chỉ dùng để prototype/demo rồi port UI sang Next.js.
Cũng **không dùng Astro + VPS/Coolify** (đã chốt 24/11 — xem `docs/spec-mvp-texas.md` §2):
Astro mặc định prerender tĩnh, SSR cần adapter + Node server; VPS tốn phí hàng tháng, vi phạm $0.
$0 ở đây là ngân sách thử nghiệm/validation — ngân sách vận hành thương mại quyết trước public production (xem spec v2 §2).
Chi tiết xem `research/raw/05-stack.md`.

---

## 2. Cấu trúc URL

```
/                                   Trang chủ: tool verify + tìm theo nghề/thành phố
/verify/                            Công cụ Verify License (tra cứu tên/số giấy phép, cả 3 nghề)
/guides/                            Hub bài hướng dẫn
/guides/how-to-verify-contractor-license-texas/
                                    TRỤ CỘT: guide verify 3 nghề + tool (từ khóa #31)
/guides/verify-electrician-license-texas/
/guides/verify-hvac-contractor-license-texas/
/guides/verify-plumber-license-texas/
/guides/what-is-tacl-license/       TACL là gì + TACLA vs TACLB
/guides/texas-master-plumber-rmp-lookup/
/guides/texas-general-contractor-license/   Texas không cấp phép GC/roofer
/guides/report-unlicensed-contractor-texas/
/guides/how-to-check-electrician-licensed-texas/   (Q&A)
/guides/how-to-check-plumber-licensed-texas/       (Q&A)
/texas/                             Hub Texas (3 nghề + thành phố lớn)
/texas/san-antonio/                 Trang thành phố đa nghề (mở màn)
/texas/dallas/  /texas/houston/  /texas/austin/
/texas/[city]/electricians/         Trang danh sách nghề × thành phố (chỉ khi ≥5 nhà thầu
/texas/[city]/plumbers/             còn hiệu lực CÓ dữ liệu đầy đủ; HVAC không có trang
/texas/[city]/hvac-contractors/     này vì CSV không có thành phố — xem §4)
/texas/counties/[county]/hvac-contractors/   Trang HVAC cấp county (dữ liệu HVAC chỉ có county)
/contractors/[slug]/                Hồ sơ thợ (VD: tumlinson-electric-llc-round-rock-tecl31651)
/claim/                             Claim listing (noindex) + /claim/[slug]/
/about/  /sources/  /contact/
/privacy/  /terms/  /disclaimer/   Trang pháp lý (disclaimer bắt buộc: nguồn + ngày cập nhật)
/remove-listing/                    Yêu cầu cập nhật/gỡ hồ sơ (noindex form)
```

**Quy tắc URL:**
- Chữ thường, gạch nối, không query param cho nội dung chính (bộ lọc/sort dùng param + canonical về URL gốc).
- Mọi URL indexable đều có self-canonical. URL rỗng (0 thợ) trả **404 thật** — không trả 200 với trang trống (bài học FarmDirect §7.2).
- Không tạo trang thành phố × nghề khi dưới 5 nhà thầu còn hiệu lực (tránh trang mỏng).

---

## 3. Các loại trang

| Loại trang | Nguồn dữ liệu | Index? | Schema JSON-LD | Thanh nội dung tối thiểu |
|---|---|---|---|---|
| Trang chủ | Tổng hợp | Có | Organization + WebSite + SearchAction | Tool verify + 3 nghề + thành phố lớn |
| Tool /verify/ | Supabase (CSV bang) | Có | WebApplication + FAQPage | Tra cứu thật theo tên/số; kết quả server-rendered; trả được cả giấy phép hết hạn |
| Guide | Viết tay (có nguồn TDLR/TSBPE) | Có | Article + FAQPage (+ HowTo cho guide verify) | Đủ để giải quyết nhu cầu tìm kiếm (không floor cứng 800 từ), có References, ngày cập nhật, CTA → tool |
| Trang thành phố | Supabase | Có (khi ≥5 thợ) | CollectionPage + BreadcrumbList + ItemList | Danh sách thợ có link + thống kê + chi phí tham khảo + FAQ địa phương |
| Trang nghề × thành phố | Supabase | Có (khi ≥5 thợ) | CollectionPage + BreadcrumbList + ItemList | Như trên, lọc theo nghề |
| Trang county (HVAC) | Supabase | Có (khi ≥5 thợ) | CollectionPage + BreadcrumbList | Danh sách HVAC theo county + giải thích "chỉ có dữ liệu county" |
| Hồ sơ thợ | Supabase | Có nếu đủ tín hiệu (xem §4) | LocalBusiness subtype (Electrician / Plumber / HVACBusiness) + BreadcrumbList | Tên + số giấy phép + trạng thái + ngày hết hạn + địa chỉ/county + link verify .gov + nút Claim |
| Trang claim / legal / remove | Tĩnh | Không (noindex) | — | Rõ quy trình, không hứa hẹn |

**KHÔNG dùng:** AggregateRating / Review schema (chưa có review thật); Product/Offer (không có giá/inventory).
**Ảnh:** hồ sơ thợ không dùng ảnh stock giả làm ảnh thợ (bài học FarmDirect §8.6) — chỉ dùng ảnh do thợ claim tải lên, hoặc không có ảnh.

---

## 4. Data model (Supabase — DB v2, 11 bảng, theo spec v2 §4)

**Một bảng `contractors` duy nhất đã bị thay thế.** Spec v2 dùng 11 bảng:
`businesses`, `licenses`, `license_status_history`, `license_holders`, `locations`,
`data_sources`, `ingestion_runs`, `claims`, `correction_requests`,
`publication_batches`, `audit_logs`. Chi tiết cột + ERD xem
`docs/architecture/data-model.md` và `docs/architecture/data-dictionary.md` (Sprint 01).
Bản nháp một bảng dưới đây chỉ còn giá trị tham khảo cho các trường của một giấy phép:

```sql
licenses (
  license_number text,          -- số giấy phép (không prefix khi tra cứu)
  license_type text,            -- Electrical Contractor / A/C Contractor / RMP...
  trade text,                   -- electrician | hvac | plumber
  license_status text,          -- active / expired / suspended / revoked / unknown
                                 -- TDLR CSV không có trường status: suy ra từ ngày hết hạn
  verification_level text,      -- authority-confirmed / inferred / unverified
                                 -- RIÊNG với license_status; CSV TDLR chỉ cho ra "inferred"
  expiration_date date,
  endorsements text[],          -- HVAC: Class A/B; RMP: MedGas/MRF/WS
  insurance_expiry date,        -- RMP
  source text,                  -- tdlr_csv / tsbpe_csv
  source_updated_at date,       -- ngày file CSV (hiện ở footer trang: "Last synced")
  data_published_at timestamptz,     -- cổng data: hiển thị trong tool Verify / danh bạ
  seo_index_published_at timestamptz -- cổng SEO: vào sitemap index (riêng với cổng data)
)
-- businesses (tên, địa chỉ, SĐT, slug, claimed), locations, license_holders...
-- xem docs/architecture/data-model.md
```

**Thin-page rule (quyết định index hồ sơ):** hồ sơ chỉ được index khi có đủ tín hiệu:
điện/ống nước cần tên + số giấy phép + trạng thái + (SĐT hoặc địa chỉ); HVAC cần tên +
số giấy phép + trạng thái + county. Hồ sơ không đủ tín hiệu vẫn tồn tại trong DB
(để tool tra cứu được) nhưng **noindex** — không vào sitemap.

**ETL:** tải CSV TDLR (Lteecele.csv, ltairref.csv) + TSBPE (RMP) hàng ngày → parse →
**nạp TẤT CẢ giấy phép, kể cả hết hạn** (không lọc trước khi upsert — lọc trước là lỗi
của v1: hồ sơ cũ có nguy cơ hiển thị sai là active, và tool Verify không trả được giấy
phép hết hạn) → chuẩn hóa (TDLR không có trường status — trạng thái suy ra từ ngày hết
hạn, ghi `verification_level = inferred`) → đối chiếu với hôm trước (mới / đổi trạng
thái / biến mất khỏi nguồn) → anomaly check → publish theo `publication_batches` với
hai cổng riêng (data và SEO) → cập nhật `source_updated_at` → rebuild sitemap index.
Dry-run trước khi nạp live lần đầu (FarmDirect đã có pattern này).

---

## 5. SEO kỹ thuật (bài học FarmDirect — áp dụng từ ngày đầu)

1. **HTML hoàn chỉnh từ server cho mọi trang public** — chấp nhận SSR, SSG và ISR
   (miễn là HTML server-rendered đầy đủ link/nội dung). Mọi link (danh sách thợ, phân
   trang, nearby) phải có trong HTML server-rendered. Kiểm chứng bằng `curl` (không JS)
   trước mỗi deploy — không tin báo cáo "đã xong".
2. **Sitemap index từ ngày đầu** — chia theo loại nội dung + đợt xuất bản (khớp
   `publication_batches`), không phải single-file. Không restructure giữa chừng
   (FarmDirect sụp index đúng ngày restructure sitemap 17/11). `lastmod` = ngày dữ liệu thật, không phải "now".
3. **Index theo từng đợt có gate (kết hợp nhiều tín hiệu):** đợt 1 = guide + tool + hub (10–15 URL) → đo index rate;
   đợt 2 = trang thành phố (20–30 URL) → gate kết hợp index rate + impressions + chất lượng dữ liệu + hành vi người dùng mới mở đợt 3 (không chỉ index >80%); đợt 3 = hồ sơ thợ theo lô
   500–1.000/tuần, dừng lại nếu index rate rớt. Không mở 40k URL cùng lúc. Chỉ URL đã qua cổng SEO mới vào sitemap index — cổng data và cổng SEO là hai cổng riêng (spec v2 §4).
4. **Internal linking 3 tầng, không cap:** trang thành phố link TẤT CẢ thợ của nó (phân trang SSR),
   không cap 9 link như FarmDirect. Mọi trang indexable có ≥1 link SSR inbound từ hub/guide.
   Chi tiết xem `docs/cay-bai-viet-lien-ket.md`.
5. **404 thật** cho URL rỗng / thành phố không có thợ. Hồ sơ hết hạn: **giữ trang lịch sử hữu ích** — hiển thị rõ trạng thái Expired + ngày hết hạn, cân nhắc noindex — thay cho 404 (spec v2 §6.4.5).
6. **Tốc độ + mobile-first:** trang danh sách nhẹ, ảnh lazy-load, không JS chặn render.
7. **llms.txt + robots.txt cho phép AI crawler** (như FarmDirect).

---

## 6. Trang pháp lý bắt buộc (trước launch)

- **Disclaimer** (footer + trang hồ sơ): nguồn dữ liệu (TDLR/TSBPE + URL + ngày copy),
  tuyên bố "không được bang chứng thực" (điều kiện §D của TDLR), dữ liệu có thể lỗi thời,
  luôn kiểm tra lại trên trang .gov.
- **Sources:** liệt kê nguồn dữ liệu + ngày cập nhật gần nhất.
- **Remove/Update Listing:** form + email để chủ doanh nghiệp yêu cầu chỉnh sửa/gỡ hồ sơ.
- **Privacy + Terms:** không thu thập email (không có trong dữ liệu bang); claim qua SĐT.
- **Không dùng logo TDLR/TSBPE** khi chưa có phép.

---

## 7. Giai đoạn sau MVP (chưa làm, chỉ ghi hướng)

- California (CSLB master list) — sau khi Texas chứng minh được traffic; cần nghiên cứu CCPA.
- Cost guide theo nghề × thành phố (đợt 61–90 ngày đã có 10–15 bài đầu).
- Claim flow đầy đủ (Supabase Auth magic link, dashboard thợ) — sau khi có traffic.
- Featured placement (có nhãn quảng cáo FTC) — chỉ sau khi có bằng chứng giá trị (tháng 9+).
