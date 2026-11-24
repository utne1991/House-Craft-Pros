# 05 — So sánh stack: Tái dùng kiến trúc FarmDirect vs Google AI Studio

**Dự án:** Danh bạ thợ sửa chữa Hoa Kỳ — MVP Texas (thợ điện, HVAC, ống nước; dữ liệu giấy phép công khai TDLR + TSBPE; dự kiến 30k–100k hồ sơ)
**Ngày nghiên cứu:** 24/11/2026
**Người nghiên cứu:** subagent kỹ thuật/stack
**Quy tắc:** $0, nguồn miễn phí/công khai, không đăng ký tài khoản, không liên hệ ai, không publish, không cài đặt/chạy code.

## Nhãn bằng chứng (áp dụng cho mọi khẳng định trong file này)

- **VERIFIED** = đã đọc trực tiếp nguồn (file nội bộ hoặc trang công khai), kèm nguồn + ngày đọc 24/11/2026.
- **INFERRED** = suy luận từ bằng chứng đã đọc, nêu rõ cơ sở suy luận.
- **UNVERIFIED** = chưa kiểm chứng được bằng nguồn đã đọc; cần xác minh thêm trước khi quyết.

---

## 1. Stack FarmDirect hiện có (đọc từ file nội bộ)

### 1.1 Nguồn đã đọc

- `~/workspace/farmdirect/content-audit-2026-11-23.md` — audit 23/11/2026 (đọc toàn bộ, 24/11/2026).
- `~/workspace/farmdirect/farmdirect-daily-ops-skill.md` — skill vận hành v1.0 + kế hoạch tuần 1–4 (đọc toàn bộ, 24/11/2026).

### 1.2 Stack — VERIFIED (từ 2 file trên)

| Thành phần | FarmDirect hiện tại |
|---|---|
| Framework | **Next.js 14** (App Router; audit nhắc `src/app/...`, `permanentRedirect`, RSC payload) |
| Rendering | Hỗn hợp: farm profile + state page **SSR**; `/farms` và homepage là `"use client"` + fetch API (client-side) |
| Database | **Supabase** (Postgres). Bảng: farms, farm_products, us_zipcodes; cột `offers_csa`, `additional_info`, `price_cents` (NULL) |
| Hosting | **GoDaddy** (domain `farmdirectus.hubercenter.com`; host cũ `*.godaddysites.com` đã 404; env var `NEXT_PUBLIC_SITE_URL` cấu hình trên GoDaddy; secrets lưu GoDaddy Secrets). Audit §12.11 nhắc thêm **Cloudflare** phía trước |
| Sitemap | `sitemap.ts` single-file (đã revert về bản pre-17/11 ngày 23/11, PR #63); trước đó là index + 52 child sitemaps (17.209 URLs). Code: `src/lib/sitemapData.ts`, `src/lib/statePaging.ts` |
| robots / GEO | `robots.ts`; robots.txt cho phép AI crawlers (GPTBot, ClaudeBot, PerplexityBot…); `llms.txt` live |
| Analytics | GA4 + GTM (`GTM-MBH4PK8T`) |
| Claim flow | `/claim-farm` (noindex) + claim API + email OTP **chỉ ở mức test**; Twilio chưa cấu hình; `RESEND_API_KEY` chưa có trên GoDaddy; **chưa có** login/signup, auth middleware, dashboard thật. Kế hoạch: Supabase Auth magic link ($0) |
| ETL | Script quét USDA registry: dry-run lần 3 quét 79.450 dòng → base 17.095 + 3 ngoại lệ = 17.098; loại County Line → **17.097** nạp thật. Cơ chế upsert theo mã NOP; cờ `--apply-live` cần anh Út duyệt; dry-run bắt buộc trước nạp thật |
| Repo | `github.com/utne1991/Farm-Direct-US`, branch v5 live; deploy cần anh Út duyệt |

### 1.3 Bài học index/crawl từ FarmDirect — VERIFIED (audit 23/11, số liệu GSC 22–23/11)

1. **Sụp đổ crawl budget (10/11):** Googlebot từ 32.415 requests (9/11) → 1.426 (10/11) → 116 (11/11) → ~0 sau đó. Xảy ra **trước** thay đổi sitemap 1 tuần. Chẩn đoán (INFERRED trong audit): Google đánh giá site mới, templated, tín hiệu ngoài yếu → cắt crawl.
2. **Sụp đổ visibility (17/11):** impressions 1.392/ngày (16/11) → 204 (17/11) → 43 (21/11); known URLs 17.187 → 4.232; 3/4 URL farm mẫu "unknown to Google" dù 200 + canonical đúng + có trong sitemap. Trùng ngày restructure sitemap (single → index + 52 child). Tương quan mạnh, **nhân quả chưa chứng minh** (audit ghi rõ). Revert về single-file đã deploy 23/11.
3. **JS-only discovery là điểm chết:** `/farms` và homepage showcase render bằng JS → **0 farm link trong SSR HTML**. Khi crawl budget ~0, discovery phụ thuộc render gần như đình trệ.
4. **State hub chỉ link 9 farm/trang** (~2–3% mỗi bang: CA 63/2.748; TX 9/370) dù fetch tới 400 farms/trang (`STATE_PAGE_SIZE = 400`). ~97% farm profile chỉ còn đường vào qua mesh "5 nearby farms" + sitemap.
5. **City pages mồ côi:** `/farms/[st]/[city]` live nhưng 0 inbound link, không có trong sitemap.
6. **URL giả trả 200 indexable:** `/farms/ca/nonexistentville` → 200, `index, follow`, self-canonical — rủi ro thin URL vô hạn, đốt crawl budget.
7. **Lỗi đã gặp khác:** `/about` 308 không có `Location` (do `permanentRedirect("/#how")`); Alaska dead-end (state page link tới farm 404, không có trong sitemap); `/california` vs `/states/california` near-duplicate; title mặc định trùng nhau trên `/`, `/farms`, `/dashboard`; `/farms` không có H1; JSON-LD dùng ảnh stock làm ảnh doanh nghiệp + tọa độ ZIP-centroid ghi như tọa độ chính xác; `lastmod` giả ("now") cho trang tĩnh/travel.

### 1.4 Tái dùng được gì cho Danh bạ thợ — INFERRED (cơ sở: code/file đã liệt kê trong audit §1.2–1.3)

| Tái dùng được | Chi tiết |
|---|---|
| Mẫu Next.js 14 App Router + Supabase | Toàn bộ khung repo FarmDirect (route, lib, ETL pattern) có thể fork/adapt; team đã quen (Agron + anh Út) |
| Sitemap generator | `sitemap.ts` single-file + `sitemapData.ts` (DB → sitemap, 17k URLs đã chạy live; rule loại trang mỏng ≥3 data signal) |
| ETL discipline | Quy trình dry-run → đối chiếu số lượng → `--apply-live` có cổng duyệt; upsert theo mã định danh (NOP ↔ số giấy phép TDLR/TSBPE); loại trừ/hide thay vì xóa bản ghi (surrendered/revoked ẩn, không xóa) |
| Mẫu trang profile SSR | Farm profile SSR giàu dữ liệu + JSON-LD (LocalBusiness, BreadcrumbList) + link "verify" tới registry gốc (USDA OID ↔ tra cứu TDLR/TSBPE) + mesh "nearby" 5 link/trang |
| Pagination server-side | `statePaging.ts` (400/trang, self-canonical từng trang, 404 sau trang cuối) — pattern đúng, chỉ cần render đủ link |
| robots.txt + llms.txt | Mẫu cho phép AI crawler + llms.txt đã live; FAQPage schema đã spec sẵn trong prompt v3 (Step 2) |
| Claim flow (bản nháp) | Claim API + email OTP (test-only) + kế hoạch Supabase Auth magic link $0 — làm nền cho claim thợ (verify qua email/SĐT trên hồ sơ giấy phép) |
| Ops skill | Checklist daily/weekly GSC + nhật ký vận hành + cổng tuần tự (dữ liệu → sitemap → nội dung) |

### 1.5 Cần sửa ngay từ ngày đầu (không copy lỗi FarmDirect) — INFERRED từ §1.3

1. **SSR toàn bộ listing** (danh sách thợ theo bang/thành phố/nghề): không một trang danh sách nào được `"use client"` + fetch API.
2. **Hub link đủ sâu:** trang bang/thành phố phải link tới toàn bộ (hoặc đủ nhiều, có phân trang SSR + A–Z index) hồ sơ, không cap 9 link.
3. **404 cho URL rỗng:** thành phố/nghề không có thợ → 404 + exact-match lookup, không substring `.ilike("%city%")`.
4. **Sitemap: 1 file, ổn định từ đầu; không restructure giữa chừng.** Mọi URL trong sitemap phải có ít nhất 1 inbound link SSR.
5. **City/county layer có link 2 chiều** (hub → city → profile → city) trước khi đưa vào sitemap.
6. **Schema trung thực:** không ảnh stock làm ảnh doanh nghiệp; tọa độ chỉ ghi khi là tọa độ thật (không ZIP-centroid giả chính xác); không Review/AggregateRating khi chưa có review thật.
7. **Title/meta/H1 duy nhất** cho mọi template; không dùng default title.
8. **Không redirect tới fragment** (`/#...`); mọi redirect phải có Location thật.

### 1.6 Rủi ro đã biết từ FarmDirect (sẽ lặp lại nếu không phòng) — VERIFIED (audit) / INFERRED

- **Crawl budget collapse trên domain/directory mới là rủi ro số 1** (VERIFIED: 32k → ~0 request/ngày trong 2 ngày). Sitemap không cứu được; chỉ internal link SSR sâu + nội dung thật + tín hiệu ngoài mới cứu được (INFERRED theo chẩn đoán của audit).
- **Sitemap restructure trùng với sụp đổ index** (VERIFIED tương quan; nhân quả UNVERIFIED). → Đừng đổi cấu trúc sitemap khi site đang yếu.
- **Dữ liệu nguồn thưa:** CSA null 23/24 mẫu; `additional_info` null toàn bộ mẫu (VERIFIED). Tương tự, dữ liệu TDLR/TSBPE sẽ có trường trống (theo đánh giá dự án trước đó: chỉ ~10% dòng TDLR có SĐT) → cần rule thin-page/noindex ngay từ đầu, không tạo trang từ bản ghi quá nghèo dữ liệu.
- **Seed/fallback data gây mâu thuẫn** (Alaska: state page và farm page dùng 2 nguồn khác nhau → link 404) → 1 nguồn dữ liệu duy nhất cho mọi trang.
- **Claim backend chưa hoàn thiện** (VERIFIED: OTP test-only, không Twilio, không RESEND key) → đừng hứa tính năng claim trước khi backend chạy thật.
- **Không có server-log access** (GoDaddy) → GSC Crawl Stats là proxy duy nhất; khó debug hành vi Googlebot.

---

## 2. Google AI Studio (Build mode) — tìm hiểu từ nguồn công khai

### 2.1 Nguồn đã đọc trực tiếp (24/11/2026)

| Nguồn | Ngày đọc | Ghi chú |
|---|---|---|
| https://aistudio.google.com/docs/aistudio-build-mode | 24/11/2026 | Trang chính thức "Build apps in Google AI Studio" — đọc toàn bộ 710 dòng |
| https://aistudio.google.com/docs/aistudio-deploying | 24/11/2026 | "Publish your app in Google AI Studio" — đọc toàn bộ 312 dòng |
| https://aistudio.google.com/docs/aistudio-fullstack | 24/11/2026 | "Develop full-stack apps" — đọc toàn bộ 386 dòng |
| https://aistudio.google.com/docs/aistudio-custom-domains | 24/11/2026 | "Custom domains in Google AI Studio" — đọc 437/469 dòng |
| https://dev.to/alifar/google-gemini-turns-prompts-into-web-apps-with-canvas-and-ai-studio-build-mode-2kkb | 24/11/2026 | Bài bên thứ ba (dev.to), đối chiếu |
| https://advantailabs.com/blog/how-to-deploy-a-google-ai-studio-app | 24/11/2026 | Bài bên thứ ba, cập nhật 17/11/2026, đối chiếu với docs chính thức |
| https://www.therundown.ai/tools/google-ai-studio-build | 24/11/2026 | Bài bên thứ ba, đối chiếu |
| https://statpio.com/blog/guides/deploy-google-ai-studio-website | 24/11/2026 | Bài bên thứ ba, đối chiếu (có tiết lộ là Statpio tự so sánh) |
| https://www.weweb.io/blog/google-ai-studio-alternatives | 24/11/2026 | Bài bên thứ ba (WeWeb — đối thủ, đọc với thận trọng) |

### 2.2 App AI Studio build ra là loại app gì — VERIFIED (docs chính thức)

- **Web app full-stack gồm 2 phần** (build-mode docs): "Client-side: A web frontend (React is the default)" + "Server-side: A Node.js runtime that allows for secure API calls, database connections, and npm package usage."
- **Node.js runtime phục vụ logic server** (API calls, secrets, DB connections, npm) — docs mô tả nó cho "server-side logic", **không hề mô tả nó render HTML trang** (xem §2.5).
- **Có thể build native Android app** (Kotlin + Jetpack Compose) — không liên quan dự án này.
- **Agent:** Antigravity Agent quản lý multi-file, context toàn project.
- **Tích hợp:** Firebase Firestore + Firebase Authentication tự động provision khi yêu cầu ("add a database to my app"); Google Workspace APIs; multiplayer realtime.
- **Kết nối DB ngoài:** docs full-stack nêu rõ có thể "Connect to external databases (e.g., via Supabase, Firebase, or MongoDB Atlas)"; FAQ build-mode: "AI Studio apps are standard apps running in a Cloud Run container. You can use any storage solution that you can connect to over a network" — và "We are working on adding direct support for storage in the future" (tức **chưa có** cấu hình storage trực tiếp trong AI Studio).
- **INFERRED (cơ sở: các guide bên thứ ba statpio/advantailabs):** app build ra là project Vite + React, `npm run build` cho ra file tĩnh (HTML/CSS/JS) có thể host tĩnh nếu không cần server. Điều này khớp với mô hình SPA client-rendered, nhưng **Google không xác nhận công khai kiến trúc build (Vite/SPA) trong 4 trang docs đã đọc** → phần "SPA thuần" là INFERRED, không VERIFIED.

### 2.3 Deploy lên đâu — VERIFIED (docs chính thức)

- **Publish trực tiếp từ AI Studio → Cloud Run** (managed, scalable service, public URL).
- **Starter Tier (miễn phí):** tài khoản đủ điều kiện publish tối đa **2 app**, **1 Cloud Run region**, không cần Google Cloud project hay billing account. **Không đủ điều kiện nếu:** đăng nhập bằng Google Workspace account (kể cả Education/Nonprofits); có billing account trả phí đang hoạt động hoặc đã từng có; Google chưa đủ bằng chứng hoạt động tài khoản. Support team **không thể override** eligibility.
- **Paid Google Cloud project:** cần project + Cloud Billing enabled; nâng cấp từ Starter Tier giữ nguyên app đã publish, nhưng sau nâng cấp **không còn đủ điều kiện Starter Tier**.
- **Custom domain CHỈ có trên paid project** (VERIFIED, cả deploying + custom-domains docs). Miễn phí chỉ có subdomain `*.ai.studio` (first-come-first-served, unpublish là mất tên). Domain mua qua AI Studio: đăng ký từ **$12/năm** + Cloud DNS managed zone từ **$2.40/năm** + phí query. **Chỉ attach được domain mua trong AI Studio** (cùng GCP project); "We plan to support transferring existing domains in the future" — tức hiện tại **không** chuyển domain từ registrar ngoài vào được.

### 2.4 Export code về GitHub được không — VERIFIED (docs chính thức)

- **Có, 2 cách:** (1) **Two-way sync với GitHub** — tạo/link repo, push thay đổi từ AI Studio (commit message do AI tạo), pull thay đổi từ IDE/teammate về; có dialog resolve merge conflict với side-by-side diff. (2) **Download ZIP** và phát triển local.
- **Import:** import repo GitHub có sẵn vào Build mode.
- **Lưu ý:** code export ra là code của app AI Studio đã build (React + Node.js); export không tự biến nó thành Next.js/SSR — muốn SSR phải tự viết lại/phát triển thêm ngoài AI Studio (INFERRED).

### 2.5 SSR / SSG / SEO cho 30k–100k trang programmatic — VERIFIED (bằng chứng âm tính) + INFERRED

- **VERIFIED (đã đọc toàn bộ 4 trang docs chính thức):** không trang nào nhắc tới **SSR, SSG, prerendering, sitemap, robots.txt, meta tags, SEO, hay indexation**. Tìm "SSR" trong trang build-mode: **0 kết quả**. Docs mô tả Node.js runtime chỉ cho API/secrets/DB/npm — không cho render trang.
- **VERIFIED:** AI Studio định vị là công cụ "quickly build (or 'vibe code') and deploy apps that test out the latest capabilities of Gemini" — tức công cụ thử nghiệm/prototype xoay quanh Gemini, không phải nền tảng làm website nội dung/SEO.
- **INFERRED (cơ sở: Vite + React build tĩnh theo guide bên thứ ba + vắng mặt hoàn toàn của SSR trong docs chính thức):** app AI Studio mặc định là client-rendered; với 30k–100k trang programmatic, sẽ gặp đúng bài học FarmDirect (§1.3.3): nội dung + link chỉ xuất hiện sau JS → Googlebot phải render (deferred queue), AI crawler/social preview bot (phần lớn không chạy JS) chỉ thấy shell rỗng. Đây là suy luận có cơ sở mạnh nhưng **chưa VERIFIED bằng test thực tế** (không tạo app thử theo quy tắc nhiệm vụ).
- **UNVERIFIED:** (a) liệu có thể prompt agent trong AI Studio build app Next.js SSR rồi deploy Cloud Run không — docs không cấm framework khác (best-practices còn nhắc "React/Angular"), nhưng cũng không hứa hỗ trợ; (b) giới hạn số route/trang, quota build, hay hiệu năng với 30k–100k trang — không tài liệu nào nêu; (c) Firestore free-tier quota có đủ cho 30k–100k hồ sơ + ETL hàng loạt không — docs chỉ nói "Firebase lets you start for free, and optionally scale with a paid account".
- **Chi phí $0 — VERIFIED mâu thuẫn:** custom domain (bắt buộc cho website thương hiệu/SEO nghiêm túc) yêu cầu paid GCP project + domain $12+/năm + DNS $2.40+/năm → **vi phạm quy tắc $0** nếu deploy theo đường chính thức của AI Studio. Đường $0 duy nhất là subdomain `*.ai.studio` (không dùng được cho thương hiệu + SEO dài hạn) hoặc export code rồi tự host nơi khác (lúc đó AI Studio chỉ còn là công cụ sinh code, không còn là stack).

### 2.6 Giới hạn khác — VERIFIED (docs chính thức)

- Starter Tier: tối đa 2 app/project, 1 region; Workspace account có thể không đủ điều kiện.
- Không hỗ trợ real-time collaborative editing trực tiếp (collab qua GitHub).
- Bảo mật: Google quản lý hạ tầng Cloud Run; **developer chịu trách nhiệm code + dependencies do AI Studio sinh ra** (phải tự update npm packages, republish sau update).
- App có thể bị gỡ nếu vi phạm policy (hệ thống review tự động); appeal được.
- API key Gemini: khi share app, mọi user dùng chung key của builder, tính vào usage limit của builder; model trả phí có thể phát sinh phí.

### 2.7 ⚠️ CẢNH BÁO NHẦM LẪN NGUỒN — VERIFIED (đọc trực tiếp kết quả tìm kiếm)

Khi tìm kiếm "AI Studio SEO / server rendering", kết quả hàng đầu thuộc về **GoHighLevel (GHL) AI Studio** — một sản phẩm KHÁC, không phải Google AI Studio:

- `help.aesthetixcrm.com` ("AI Studio SEO and Server Rendering", nhắc TanStack Start, "New projects (server-rendered)" từ 8/9/2026, toggle "Advanced SEO Support") — đây là docs của Aesthetix CRM / GoHighLevel.
- `zeon.studio` ("Why GHL AI Studio Websites Fail at SEO") — nói rõ GHL AI Studio là React SPA, support GHL xác nhận tháng 5/2026 là fully client-side rendered, không SSR/prerendering.

**Không được dùng 2 nguồn này làm bằng chứng về Google AI Studio.** Mọi khẳng định về Google AI Studio trong file này chỉ lấy từ docs `aistudio.google.com` + guide bên thứ ba nói rõ về Google AI Studio.

---

## 3. So sánh trực tiếp

| Tiêu chí (cho danh bạ 30k–100k trang, SEO là mạch sống, $0) | FarmDirect (Next.js 14 + Supabase + GoDaddy) | Google AI Studio Build mode |
|---|---|---|
| SSR/SSG cho trang programmatic | **Có sẵn, đã chạy live** cho 17k farm profiles (VERIFIED) | **Không được docs chính thức nhắc tới**; mặc định suy luận là client-rendered (INFERRED) |
| Sitemap 17k–100k URL | Đã chạy live (17.209 URLs, single-file) (VERIFIED) | Không có tài liệu/hỗ trợ nào được nêu (UNVERIFIED) |
| Internal linking SSR sâu | Pattern có sẵn (state page, nearby mesh); cần sửa cap 9 link (VERIFIED) | Không có pattern/tài liệu nào (UNVERIFIED) |
| Database quan hệ cho 30k–100k hồ sơ | Supabase Postgres đã chạy + ETL dry-run discipline (VERIFIED) | Firestore NoSQL auto-provision; Supabase chỉ qua kết nối mạng tự cấu hình, chưa có storage support trực tiếp (VERIFIED) |
| Custom domain | Đã chạy (subdomain hubercenter.com, GoDaddy) (VERIFIED) | Chỉ trên paid GCP project; $12+/năm domain + DNS (VERIFIED) → vi phạm $0 |
| Chi phí $0 | Đã vận hành $0 (GoDaddy + Supabase free tier hiện hữu) (VERIFIED theo hồ sơ dự án) | Starter Tier free nhưng giới hạn 2 app + 1 region + loại trừ Workspace account; domain riêng tốn phí (VERIFIED) |
| Export/không khóa nhà cung cấp | Repo GitHub riêng, code tự kiểm soát hoàn toàn (VERIFIED) | GitHub two-way sync + ZIP export có (VERIFIED) — nhưng code export vẫn là React/Node app, không tự có SSR |
| Kinh nghiệm đội | Agron + anh Út đã làm, đã biết lỗi (VERIFIED) | Chưa ai trong đội dùng cho production directory (theo hồ sơ dự án) |
| Tốc độ khởi động | Chậm hơn (fork repo + adapt ETL cho TDLR/TSBPE) | Nhanh tạo prototype/demo (VERIFIED định vị sản phẩm) |
| Rủi ro lớn nhất | Lặp lại lỗi crawl/index nếu copy y nguyên (đã biết, phòng được) | Client-rendered + không SSR được chứng minh + custom domain tốn phí + giới hạn Starter Tier |

---

## 4. Kết luận

### 4.1 Nên dùng stack nào: **Tái dùng kiến trúc FarmDirect (Next.js 14 SSR + Supabase), KHÔNG dùng Google AI Studio làm stack production**

### 4.2 5 lý do cụ thể

1. **SSR là yêu cầu sống còn và chỉ FarmDirect mới có sẵn, đã chứng minh live.** FarmDirect đã SSR 17.087 farm profiles với JSON-LD + link verify registry (VERIFIED). Google AI Studio không hề nhắc SSR/SSG/prerendering trong toàn bộ docs chính thức đã đọc; app mặc định suy luận là React client-rendered (INFERRED) — tức lặp đúng lỗi khiến `/farms` + homepage FarmDirect có 0 link trong SSR HTML.
2. **Sitemap + internal linking cho 30k–100k trang đã có mẫu chạy được.** `sitemap.ts` single-file 17.209 URLs, pagination SSR, mesh nearby-farms, rule thin-page (VERIFIED). AI Studio không có tài liệu nào về sitemap, robots, hay linking ở quy mô này (UNVERIFIED — và vắng mặt hoàn toàn trong docs là tín hiệu mạnh rằng đó không phải use case của nó).
3. **AI Studio vi phạm quy tắc $0 ở đúng chỗ không thể tránh: custom domain.** Domain riêng chỉ có trên paid GCP project, tối thiểu ~$14.40/năm (domain $12 + DNS $2.40) chưa kể Cloud Run vượt free tier (VERIFIED). Đường free duy nhất là subdomain `*.ai.studio` — không chấp nhận được cho website thương hiệu/SEO dài hạn.
4. **Database quan hệ + ETL hàng loạt đã có quy trình.** Supabase Postgres + ETL dry-run → đối chiếu số lượng → `--apply-live` có cổng duyệt đã nạp 17.097 bản ghi thật (VERIFIED). AI Studio mặc định Firestore NoSQL, chưa có direct storage support ("working on adding", VERIFIED); Supabase chỉ là kết nối mạng tự cấu hình — mất đúng lợi thế quan hệ (join license ↔ trade ↔ city/county, dedupe theo số giấy phép).
5. **Rủi ro đã biết và phòng được vẫn tốt hơn rủi ro chưa biết.** Mọi lỗi FarmDirect (JS-only listing, cap 9 link, fake-city 200, sitemap restructure) đều đã có fix cụ thể (§1.5). Với AI Studio, các câu hỏi quyết định (SSR có làm được không? 30k route có build/deploy được không? quota Starter Tier chịu nổi crawl + ETL không?) đều UNVERIFIED — chọn nó là đánh cược dự án vào những câu hỏi chưa có đáp án.

### 4.3 Vai trò duy nhất nên dành cho AI Studio (nếu dùng)

- **Prototyping/demo nhanh** (mockup UI, demo flow claim/search cho user/anh Út xem) rồi **export ZIP/GitHub** và port phần UI sang Next.js — không deploy production từ AI Studio, không đặt dữ liệu thật lên Firestore của nó. (INFERRED — đề xuất, chưa phải quyết định.)

### 4.4 Lưu ý kỹ thuật quan trọng nhất cho SEO (từ bài học FarmDirect)

1. **SSR 100% trang public, không ngoại lệ:** mọi trang danh sách (bang, thành phố, nghề, tổ hợp bang×nghề) và mọi profile thợ phải render đầy đủ HTML + link `<a href>` thật từ server. **Kiểm chứng bằng `curl` (không JS)** trước mỗi lần deploy: nếu `curl` không thấy nội dung + link thì Googlebot ở chế độ crawl budget thấp cũng không thấy. Đây là bài học đắt nhất của FarmDirect (§1.3.3).
2. **Sitemap single-file, ổn định từ ngày đầu; không restructure giữa chừng** (§1.3.2). Mọi URL trong sitemap phải có ≥1 inbound link SSR; URL nào chưa có link thì chưa đưa vào sitemap.
3. **Internal linking sâu 3 tầng ngay từ đầu:** Hub bang → hub thành phố/nghề → profile, và profile → city/nghề/bang + "thợ gần đó". Không cap số link kiểu 9 farm/trang; dùng phân trang SSR + A–Z index nếu danh sách dài. Mục tiêu: mọi profile ≤3 hop từ homepage qua link SSR.
4. **404 thật cho URL rỗng + exact-match lookup** (§1.3.6): thành phố/nghề không có thợ → 404, không 200 với nội dung generic.
5. **Thin-page rule từ ngày đầu:** bản ghi nghèo dữ liệu (thiếu SĐT/địa chỉ/nghề) → noindex hoặc không tạo trang, cho tới khi đủ dữ liệu — dữ liệu TDLR thưa (chỉ ~10% dòng có SĐT theo đánh giá trước đó của dự án) nên rule này sẽ ảnh hưởng lớn tới tổng số trang indexable.
6. **Đừng đợi traffic mới sửa kỹ thuật:** thứ tự FarmDirect đã chốt — dữ liệu → sitemap → index → nội dung; GSC theo dõi impressions/crawl từ tuần đầu.

---

## 5. Điểm còn UNVERIFIED (cần xác minh trước khi chốt kiến trúc chi tiết)

1. Liệu AI Studio Build mode có thể (qua prompt) sinh app Next.js SSR và deploy Cloud Run thành công không — docs không cấm cũng không hứa.
2. Quota thực tế của Cloud Run Starter Tier / Firestore free tier với 30k–100k hồ sơ + ETL hàng loạt.
3. Supabase free tier hiện tại của FarmDirect còn đủ quota cho thêm 30k–100k hồ sơ thợ không, hay cần project Supabase riêng.
4. GoDaddy hosting hiện tại có giới hạn gì với Next.js SSR ở quy mô 100k URL (build time, sitemap generation) — FarmDirect mới chạy 17k URL.
5. Số lượng hồ sơ Texas thực tế sau khi lọc trùng + loại bản ghi hết hạn/surrendered (cần chạy ETL dry-run tương tự FarmDirect mới biết).

---

*Ghi chú thô — chưa phải quyết định cuối cùng. Quyết định stack thuộc về Owner + anh Út.*
