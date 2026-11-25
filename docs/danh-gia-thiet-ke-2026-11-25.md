# Đánh giá thiết kế — House Craft Pros (bản review 25/11/2026)

**Nguồn:** bản review do user chuyển vào ngày 25/11/2026 (điểm nhận định về chất lượng thiết kế, không phải tỷ lệ hoàn thành sản phẩm). File này lưu nguyên nội dung review + phụ lục kiểm chứng của Muse (cuối file).
**Kết quả chung:** **7.3/10 — GO có điều kiện.**

---

## 1. Điểm theo hạng mục

| Hạng mục | Điểm |
|---|---|
| Ý tưởng và giá trị sản phẩm | 9/10 |
| Tiềm năng mở rộng | 9/10 |
| Nguồn dữ liệu | 8/10 |
| Chiến lược SEO | 8/10 |
| Cấu trúc nội dung | 8/10 |
| Kiến trúc kỹ thuật | 7/10 |
| Khả năng kiếm tiền | 6/10 |
| Pháp lý và bảo mật | 6/10 |
| Kế hoạch triển khai và nghiệm thu | 5/10 |

## 2. Điểm mạnh nhất: nguồn dữ liệu từ chính phủ Hoa Kỳ

Giấy phép ước tính còn hiệu lực tại Texas: **40.150** — HVAC 19.087 (47,5%), Electrical 12.320 (30,7%), Plumbing 8.743 (21,8%).

| Dữ liệu | Điện | HVAC | Ống nước |
|---|---|---|---|
| Số giấy phép | Có | Có | Có |
| Tên doanh nghiệp | Có | 98% | Có |
| Thành phố | Có | Không | Có |
| Số điện thoại | 100% | 0% | Khoảng 50% |
| County | Có | 96% | Có |

**Đính chính trong review:** khoảng 21.000 giấy phép điện và ống nước KHÔNG đồng nghĩa với 21.000 hồ sơ có thể gọi điện trực tiếp (khoảng một nửa hồ sơ ống nước thiếu SĐT). Ngoài ra 40.150 giấy phép không nhất thiết tương ứng với 40.150 doanh nghiệp độc lập — một doanh nghiệp có thể liên quan đến nhiều giấy phép. Cần làm sạch và phân loại dữ liệu trước khi xây dựng danh bạ.

## 3. Vấn đề cần sửa trước khi lập trình

### P0 — Next.js 14 đã hết hỗ trợ chính thức
Phiên bản 14 không còn nằm trong danh sách được hỗ trợ, trong khi Next.js 16 đang là Active LTS. Không nên bắt đầu dự án mới bằng phiên bản 14 chỉ vì FarmDirect đang sử dụng nó. Đề xuất: **Next.js 16 + TypeScript, tái sử dụng logic của FarmDirect thay vì sao chép nguyên phiên bản framework.**

### P0 — Kế hoạch hosting $0 có vấn đề
Vercel Hobby chỉ dành cho mục đích cá nhân, phi thương mại. House Craft Pros được xây dựng theo định hướng kinh doanh nên không thể mặc định sử dụng gói Hobby cho production lâu dài. Supabase Free cũng giới hạn dung lượng database 500 MB và có thể tạm dừng dự án ít hoạt động. Cần phân biệt ngân sách thử nghiệm $0 và ngân sách vận hành thương mại.

### P0 — Logic xác minh giấy phép chưa an toàn
Spec hiện dùng ngày hết hạn để suy ra trạng thái giấy phép TDLR. Nhưng giấy phép chưa hết hạn không có nghĩa là không bị đình chỉ hoặc thu hồi. Cần phân biệt trạng thái do cơ quan cấp phép xác nhận, trạng thái suy ra từ dữ liệu và trạng thái chưa xác minh. **Tuyệt đối không gắn nhãn Verified nếu dữ liệu chưa đủ chứng minh.**

### P0 — ETL chưa xử lý đầy đủ vòng đời giấy phép
Thiết kế hiện tại lọc giấy phép hết hạn trước khi upsert, nhưng công cụ Verify lại phải trả được kết quả giấy phép hết hạn. Nếu chỉ upsert các bản ghi còn hiệu lực, giấy phép cũ trong database còn có nguy cơ tiếp tục được hiển thị là active. Cần lưu lịch sử trạng thái, phát hiện bản ghi biến mất khỏi nguồn, kiểm tra dữ liệu bất thường và có cơ chế rollback.

### P1 — Thiếu thiết kế bảo mật và quyền riêng tư
Chưa thấy đặc tả đầy đủ cho Supabase RLS, phân quyền admin, giới hạn truy vấn, chống spam form, bảo vệ dữ liệu cá nhân, quản lý secret và quy trình sao lưu. Repository đang public. Không được đưa CSV chứa thông tin cá nhân, API key hoặc thông tin xác thực vào GitHub.

### P1 — Lợi thế cạnh tranh chưa được chứng minh đầy đủ
Nghiên cứu cho rằng chưa có đối thủ xây dựng công cụ xác minh tương tự. Tuy nhiên review tìm thấy **Contractor Records** đã triển khai hướng khai thác dữ liệu giấy phép TDLR, TSBPE kết hợp với dữ liệu giấy phép xây dựng địa phương. Cần đưa đối thủ này vào nghiên cứu đợt 2 trước khi khẳng định tính độc quyền của sản phẩm.

## 4. Đề xuất nâng cấp định vị sản phẩm

Không nên giới hạn House Craft Pros là một Verified Trades Directory. Nên phát triển theo định hướng **Homeowner Intelligence Platform** — nền tảng thông tin hỗ trợ chủ nhà lựa chọn, kiểm tra và thuê nhà thầu. Bốn trụ cột:

- **License Intelligence** — tra cứu giấy phép, trạng thái, nguồn xác minh
- **Local Directory** — tìm nhà thầu theo nghề và khu vực
- **Cost Intelligence** — công cụ ước tính chi phí sửa chữa
- **Homeowner Academy** — kiến thức, hướng dẫn, kinh nghiệm thuê thợ

Nền tảng dữ liệu: **Government Data Engine** — TDLR · TSBPE · dữ liệu địa phương · các bang khác.

## 5. Nâng cấp cấu trúc SEO & GEO

Cây nội dung giữ cụm giấy phép làm điểm khởi đầu, mở rộng theo hành trình thực tế của chủ nhà:

- **01. License Verification** — How to verify a contractor license; Electrician/HVAC/Plumber license lookup
- **02. Electrical** — Electrical panel upgrade; House rewiring; EV charger installation; Find licensed electricians
- **03. Plumbing** — Water heater replacement; Leak detection; Drain repair; Find licensed plumbers
- **04. HVAC** — AC repair and replacement; HVAC maintenance; Heat pump installation; Find licensed HVAC contractors
- **05. Homeowner Protection** — How to hire a contractor; Contractor scam prevention; Insurance and permits; Report unlicensed contractors
- **06. Location Intelligence** — Texas → County → City → Trade; California (sau MVP); Florida (sau MVP)

**Chiến lược Content đi cùng người khổng lồ (Brand-adjacent Content Intelligence):**

| Thương hiệu / tổ chức | Hướng khai thác nội dung |
|---|---|
| Home Depot | Chi phí vật tư, lắp đặt, sửa chữa |
| Lowe's | Lựa chọn vật liệu và thiết bị |
| Carrier | HVAC, điều hòa, hệ thống sưởi |
| Trane | Bảo trì, thay thế HVAC |
| Rheem | Bình nước nóng, HVAC |
| Angi | Kinh nghiệm tìm và thuê nhà thầu |
| TDLR | Giấy phép điện và HVAC |
| TSBPE | Giấy phép ngành ống nước |

Chủ đề đề xuất (chưa xác minh search volume bằng Keyword Planner): Home Depot Water Heater Installation: What Texas Homeowners Should Know; Carrier vs. Trane: Repair and Replacement Considerations; How to Verify a Contractor Before Hiring Through Angi; Do You Need a Licensed Electrician to Install an EV Charger in Texas?

**Quy tắc SEO cần sửa:**

| Quy tắc hiện tại | Đề xuất |
|---|---|
| Bắt buộc SSR 100% | HTML hoàn chỉnh từ server, chấp nhận SSR, SSG và ISR |
| Một sitemap duy nhất | Sitemap index chia theo loại nội dung và nhóm triển khai |
| Bài viết tối thiểu 800 từ | Viết đủ để giải quyết nhu cầu tìm kiếm |
| Nội dung khác biệt 30–40% | Đánh giá giá trị thực tế, không dựa vào tỷ lệ cứng |
| FAQ và HowTo schema | Chỉ sử dụng phù hợp, không kỳ vọng rich results |
| Index trên 80% là được mở rộng | Kết hợp index, impression, chất lượng dữ liệu và hành vi người dùng |
| Giấy phép hết hạn trả 404 | Có thể giữ trang lịch sử hữu ích, hiển thị rõ trạng thái và cân nhắc noindex |

Google không quy định số từ tối thiểu hay tỷ lệ phần trăm nội dung độc nhất bắt buộc. Chính sách chống scaled content abuse tập trung vào mục đích tạo trang và giá trị mang lại cho người dùng.

## 6. Kiến trúc kỹ thuật nên xây dựng

Đồng ý sử dụng Next.js và PostgreSQL. Nhưng nên tách hệ thống xử lý dữ liệu ra khỏi website để tái sử dụng khi mở rộng nhiều bang: TDLR (Điện + HVAC) + TSBPE (Ống nước) → **Data Ingestion Engine** (Tải dữ liệu → Kiểm tra → Chuẩn hóa → Đối chiếu) → PostgreSQL / Supabase → **API + Business Logic** (Xác minh · Tìm kiếm · Phân quyền · Kiểm soát dữ liệu) → **Next.js 16** (SSR / SSG / ISR · SEO · Website người dùng) → Google / Bing, AI Search, Homeowners.

Database không nên chỉ có một bảng contractors. Các bảng nền tảng đề xuất:

| Bảng | Chức năng |
|---|---|
| businesses | Danh tính doanh nghiệp |
| licenses | Giấy phép hành nghề |
| license_status_history | Lịch sử trạng thái |
| license_holders | Người đứng tên giấy phép |
| locations | Bang, county, thành phố |
| data_sources | Nguồn gốc dữ liệu |
| ingestion_runs | Lịch sử đồng bộ |
| claims | Yêu cầu xác nhận doanh nghiệp |
| correction_requests | Yêu cầu sửa hoặc gỡ dữ liệu |
| publication_batches | Kiểm soát từng đợt xuất bản |
| audit_logs | Bằng chứng các thay đổi |

## 7. Tổ chức đội ngũ AI Agent quản lý dự án

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

Repository và skill có thể tái sử dụng ngay: github/spec-kit (đặc tả, kế hoạch, chia task); obra/superpowers (phát triển theo quy trình kỹ thuật); microsoft/playwright-mcp (kiểm thử trình duyệt); vercel-labs/agent-skills (React và Next.js); AgricIDaniel/claude-seo (audit SEO); blader/humanizer (biên tập nội dung); Intent to Evidence (kiểm chứng và nghiệm thu); Brand-adjacent Content Intelligence (phát triển chiến lược nội dung). Không cần xây dựng lại toàn bộ hệ thống skill cho riêng dự án này. Nên bổ sung skill chuyên ngành về xác minh dữ liệu giấy phép nhà thầu.

## 8. Kế hoạch triển khai đề xuất (Sprint 00–05)

1. **Sprint 00 — Điều chỉnh thiết kế (3–5 ngày):** cập nhật Next.js, kiến trúc database, ngân sách hosting, quy tắc xác minh giấy phép và bổ sung AGENTS.md. Nghiệm thu: Spec mới được Owner duyệt.
2. **Sprint 01 — Data Foundation (7–10 ngày):** xây dựng ETL, migrations, chuẩn hóa dữ liệu, lưu lịch sử giấy phép, kiểm tra dữ liệu thiếu và trùng lặp. Nghiệm thu: có báo cáo dry-run, đối chiếu nguồn chính phủ và kiểm thử tự động.
3. **Sprint 02 — License Verification Tool (7–10 ngày):** xây dựng công cụ tra cứu tên doanh nghiệp, số giấy phép, trạng thái, nguồn xác minh. Nghiệm thu: kiểm thử giấy phép active, expired, suspended nếu có dữ liệu nguồn, không tìm thấy và trùng tên.
4. **Sprint 03 — SEO Foundation (7 ngày):** trang chủ, 12 guide nền tảng, trang Texas, San Antonio, sitemap, schema, canonical, GSC và analytics. Nghiệm thu: kiểm tra HTML, crawl, mobile và nội dung thực tế.
5. **Sprint 04 — Public Directory:** triển khai thử nghiệm 100–500 hồ sơ có dữ liệu chất lượng cao, đo lường kết quả thực tế. Nghiệm thu: có báo cáo index, impression, độ chính xác và lượt sử dụng công cụ.
6. **Sprint 05 — Content & Growth:** phát triển content theo cây chủ đề, công cụ tính chi phí, brand-adjacent content, mở rộng thành phố và số lượng hồ sơ theo kết quả nghiệm thu.

## 9. Định hướng doanh thu

Không phụ thuộc hoàn toàn vào AdSense hoặc bán vị trí Top 3. Mô hình freemium: giữ chức năng xác minh giấy phép và hồ sơ cơ bản miễn phí, thu tiền từ tiện ích bổ sung cho doanh nghiệp (dashboard doanh nghiệp, thông báo giấy phép sắp hết hạn, thống kê lượt xem hồ sơ, website giới thiệu, portfolio công trình, quảng cáo được gắn nhãn riêng).

Giả lập doanh thu thuê bao (mô hình giả định, chưa xác nhận nhu cầu trả tiền của nhà thầu): 100 doanh nghiệp trả phí × $29/tháng = **$2.900/tháng ($34.800/năm)** — doanh thu gộp, chưa trừ chi phí, thuế, tỷ lệ hủy thuê bao và chi phí tìm kiếm khách hàng. Việc trả phí không được làm thay đổi kết quả xác minh giấy phép.

## 10. Kết luận của review

| Quyết định | Đánh giá |
|---|---|
| Tiếp tục dự án | Đồng ý |
| Chọn Texas làm MVP | Đồng ý |
| Tên miền riêng | Đồng ý |
| Tái sử dụng kiến trúc FarmDirect | Đồng ý, có cải tiến |
| Next.js 14 | Không đồng ý |
| Mặc định production $0 | Cần xem xét lại |
| Xuất bản 40.000 hồ sơ ngay | Không đồng ý |
| Xây dựng công cụ xác minh | Ưu tiên cao nhất |
| Giao AI Agent quản lý | Đồng ý |
| Bắt đầu code theo spec hiện tại | Cần sửa spec trước |

**Bước tiếp theo nên là Sprint 00 — Architecture & Data Foundation Review, thay vì giao ngay cho Google AI Studio viết toàn bộ website.**

---

## Phụ lục: Kiểm chứng của Muse (25/11/2026)

Các claim P0 của review đã được kiểm chứng độc lập trước khi đưa vào spec v2:

- **Next.js 14 EOL — ĐÚNG.** Chính sách hỗ trợ chính thức của Next.js (nextjs.org/support-policy, đọc 25/11/2026): 16.x là Active LTS (phát hành 21/10/2025); 15.x là Maintenance LTS (bản vá bảo mật tới 31/01/2027); 14.x nằm trong mục Unsupported Versions (phát hành 26/10/2023, hết hỗ trợ 26/10/2025; bản cuối 14.2.35 tháng 12/2025 là patch ngoài chính sách). Lưu ý: Next.js 16 cần React 19 (FarmDirect đang React 18) — khi port logic phải kiểm tra breaking changes.
- **Vercel Hobby phi thương mại — ĐÚNG.** Vercel Fair Use Guidelines: "Hobby teams are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan." Thương mại bao gồm: thu tiền từ khách, chạy quảng cáo (AdSense), affiliate là mục đích chính, được trả tiền để build/host site. Pro: $20/seat/tháng (kèm $20 usage credit). Hobby còn bị cap (100GB transfer, 1M invocations/tháng) và khi vượt cap tính năng dừng ~30 ngày.
- **Supabase Free 500MB + pause 7 ngày — ĐÚNG.** Tài liệu chính thức Supabase (supabase.com, đọc 25/11/2026): Free project có 500MB database, tối đa 2 project active; pause sau 1 tuần ít hoạt động, phải resume tay từ dashboard; không có backup tự động. Pro $25/tháng: 8GB disk, backup hàng ngày giữ 7 ngày, không pause.
- **Contractor Records — ĐÚNG, đối thủ thật.** contractorrecords.com có bài "Dallas contractor license lookup: TDLR, TSBPE and City" (dữ liệu tới 26/10/2026), kết hợp TDLR + TSBPE + đăng ký của City of Dallas + dữ liệu permit (123.233 permit 10/2024–09/2026, 30% là ống nước). Nghiên cứu đợt 1 đã bỏ sót đối thủ này. Đưa vào nghiên cứu đợt 2 để profile sâu. Hai site cùng ngách phát hiện thêm: contractorverify.org, texasrepaircosts.com (chủ yếu là guide, chưa rõ có tool tra cứu live không).
- **Số hồ sơ gọi được — ĐÚNG, đính chính số liệu cũ.** Gọi được trực tiếp ≈ **16.700** (điện 12.320 × 100% SĐT + ống nước 8.743 × ~50% SĐT ≈ 4.372), không phải ~21.000. HVAC 19.087 có 0% SĐT. Số doanh nghiệp độc lập < số giấy phép — chốt sau dedupe trong ETL dry-run.
- **TDLR CSV không có trường status — KHỚP với phân tích dữ liệu ngày 24/11.** Trạng thái suy ra từ ngày hết hạn là "inferred", không phải "confirmed". Spec v2 dùng mô hình 3 trạng thái (confirmed / inferred / unverified) và không gắn nhãn Verified khi chưa đủ bằng chứng.
