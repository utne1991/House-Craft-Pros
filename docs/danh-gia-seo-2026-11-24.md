# Đánh giá SEO & Traffic — Dự án Danh bạ thợ sửa chữa Hoa Kỳ (MVP 1 bang)

**Ngày:** 24/11/2026 · **Người đánh giá:** Muse (Quản lý cấp cao SEO-GEO)
**Kết luận ngắn:** Ý tưởng khả thi, dữ liệu bang là thật và miễn phí, nhưng **lịch trình trong playbook lạc quan hơn thực tế khoảng 3 lần**. Cửa thắng không nằm ở trang danh bạ thành phố mà ở **công cụ xác minh giấy phép (license verification tool)**.

---

## 1. Tỷ lệ leo top theo loại truy vấn

| Loại truy vấn | Ví dụ | Khả năng vào top 10 (12 tháng) | Ghi chú |
|---|---|---|---|
| Thợ + thành phố lớn | "plumbers Austin TX" | **Thấp (~10–20%)** | Top hiện tại là best-of list có dữ liệu review thật + local pack + quảng cáo LSA chiếm trên organic |
| Thợ + thành phố nhỏ (<50k dân) | "plumbers Marble Falls TX" | **Trung bình (~40–50%)** | Ít đối thủ, thắng được trong 6–9 tháng |
| Xác minh giấy phép | "verify electrician license Texas" | **Cao (~60–70%)** | Đối thủ chỉ là trang .gov khó dùng + vài blog nhỏ; thắng được trong 2–4 tháng |
| Tên công ty + license | "[Tên công ty] license check" | **Trung bình–cao** | Long-tail, mỗi từ khóa ít lượt tìm nhưng 36k+ hồ sơ cộng dồn trong 6–12 tháng |
| Hướng dẫn chi phí | "cost to rewire a house Texas" | **Trung bình** | Chơi theo mô hình content như hubercenter.com |

**Điểm mấu chốt:** trang danh sách thợ theo thành phố (định dạng chính của playbook) là loại trang **khó rank nhất**, vì Google ưu tiên (1) local pack, (2) best-of list có review thật, (3) web thợ địa phương. Trang danh bạ thô (list 500 thợ, không review) không có định dạng nào trong 3 thứ đó.

---

## 2. Dự báo traffic thực tế (Texas MVP, làm tốt)

| Giai đoạn | Playbook hứa | Thực tế (ước tính của Muse) |
|---|---|---|
| Tháng 1–3 | 3.000–5.000/tháng | **0–300/tháng** — index chậm, domain mới chưa có trust |
| Tháng 4–6 | Claim 100–300 hồ sơ | **500–1.500/tháng** — long-tail + tool verify bắt đầu có impression |
| Tháng 9–12 | $1.000–2.000/tháng | **2.000–5.000/tháng** — nếu có link, có content chi phí, index ổn |

**Cơ sở dự báo:**
- Programmatic SEO trên domain mới: index đầu tiên 7–14 ngày, chuyển động xếp hạng ~30 ngày, click có ý nghĩa 60–90 ngày, thẩm quyền 6 tháng, phủ hết danh mục 9–12 tháng (Rule27, dữ liệu GSC khách hàng thật). Domain mới phải cộng thêm 3–6 tháng vào mọi mốc (aamax).
- Nghiên cứu Ahrefs: chỉ 1,74% trang mới vào top 10 trong vòng 1 năm; tuổi trung bình của trang #1 là 5 năm.
- **Bằng chứng nội bộ — FarmDirect:** 17.098 hồ sơ USDA thật, 17.209 URL, sau nhiều tháng chỉ đạt **142 clicks / 6.542 impressions / 28 ngày**, vị trí trung bình 16,8. Googlebot sụt từ 32.415 request/ngày (9/11) xuống ~0. 3/4 URL mẫu "unknown to Google". Đây là dự án danh bạ programmatic của chính mình — con số thật, không phải lý thuyết.
- **hubercenter.com:** 136 bài live, 28 ngày chỉ 3 clicks / 988 impressions. Content cũng chậm, huống chi danh bạ.

**Kết luận:** mốc 3.000–5.000 lượt/tháng là **đạt được, nhưng ở tháng 9–12 chứ không phải tháng 1–3**.

---

## 3. Nguồn dữ liệu — đã xác minh (24/11/2026)

| Nguồn | Trạng thái | Chi tiết quan trọng |
|---|---|---|
| **TDLR (Texas, điện + HVAC)** | ✅ Có thật, miễn phí | CSV tải hàng ngày + API Socrata trên data.texas.gov. File "All Licenses" 983.494 dòng, nhưng **chỉ 99.720 dòng (10,1%) có số điện thoại** — đó mới là doanh nghiệp; còn lại là cá nhân (thợ học việc...) không có thông tin liên hệ. Giấy phép nhà thầu (contractor) chỉ **36.312** (đo 7/10/2026). |
| **TSBPE (Texas, ống nước)** | ✅ Có thật, miễn phí | 6 file CSV cập nhật hàng ngày. Chỉ danh sách **Responsible Master Plumber** mới có tên công ty — RMP là người duy nhất được phép ký hợp đồng với công chúng. Tổng ~42.000+ giấy phép ống nước đang hoạt động (báo cáo thường niên 2023, qua nguồn thứ ba). |
| **CSLB (California)** | ✅ Có thật, miễn phí | Master list .xls/CSV: tên doanh nghiệp, địa chỉ, SĐT, trạng thái, phân loại, bảo lãnh, bảo hiểm lao động. **KHÔNG có email** (Business & Professions Code §27). |

**3 điểm playbook cần chỉnh:**
1. **"50.000–100.000+ hồ sơ Active"** — chỉ đúng nếu lọc đúng: lấy giấy phép **doanh nghiệp/nhà thầu** (TECL, ACR contractor, RMP), KHÔNG lấy thợ học việc/journeyman (không có SĐT, không phải doanh nghiệp, tạo trang mỏng vô giá trị).
2. **Không có email trong dữ liệu bang** (cả TX lẫn CA) — kế hoạch "gửi email mời thợ Claim" ở Giai đoạn 5 **không làm được từ dữ liệu này**. Chỉ còn SĐT (gọi điện) hoặc SMS (cần chú ý luật TCPA, phải có opt-in). Tốc độ claim sẽ chậm hơn playbook tính.
3. **Texas không có giấy phép nhà thầu tổng hợp cấp bang** — danh bạ TX chỉ phủ được từng nghề (điện, HVAC, ống nước), không có "general contractor".

**Chọn bang MVP: Texas.** Có API (đồng bộ tự động), 2 nguồn CSV hàng ngày, thị trường lớn. California để sau (dữ liệu sạch nhưng phải tải tay, cạnh tranh mạnh hơn).

---

## 4. Đối thủ trên SERP — đã kiểm tra

Truy vấn "plumbers Austin TX" (24/11): top 4 là The Austin Newsletter (best-of list, **tự xác minh giấy phép từng thợ với TSBPE**), trustanalytica.org, ConsumerAffairs, bestinhood.com. Nhận xét:
- Góc "xác minh giấy phép" **đã có đối thủ làm** ở dạng biên tập (Austin Newsletter kiểm tra 17 thợ tay). Lợi thế của mình là làm ở quy mô dữ liệu (36k+ hồ sơ), không phải làm tay từng thợ.
- trustanalytica.org và bestinhood.com là các site programmatic đã chạy trước — ý tưởng "danh bạ + review tổng hợp" không còn trống.
- Truy vấn "verify electrician license Texas": top là chính trang tdlr.texas.gov + vài blog của thợ địa phương (luckyelectricalservice.com, bniprestoncenter.com...) — **đối thủ yếu**, đây là khe hở thật. Trang .gov khó dùng, công cụ verify tốt hơn có cửa thắng bằng UX.

---

## 5. Rủi ro lớn nhất (theo thứ tự)

1. **Google không crawl/index 50–100k trang template trên domain mới.** FarmDirect đã chứng minh: sau đợt crawl khám phá đầu tiên, Google cắt crawl xuống ~0 vì site mới + template + ít tín hiệu ngoài. Lộ trình "5.000–10.000 trang/tuần" của playbook giả định Google chịu crawl ở tốc độ đó — **không có gì đảm bảo**.
2. **Scaled Content Abuse.** Chính sách Google (3/2024, siết mạnh 2025): trang programmatic cần ≥30–40% nội dung thực sự khác biệt giữa các trang, không chỉ đổi tên thành phố. Trang hồ sơ thợ chỉ có tên + số giấy phép + địa chỉ là **rất mỏng** — cần thêm dữ liệu thật (lịch sử kỷ luật, bảo hiểm, năm kinh nghiệm, khu vực phục vụ) mới đủ dày.
3. **AI Studio làm app client-rendered.** Bài học FarmDirect: trang danh sách render bằng JavaScript → 0 link trong HTML server → Googlebot gần như không khám phá được. Danh bạ này **bắt buộc SSR/SSG** (Next.js như FarmDirect). Nếu AI Studio không cho SSR tốt thì phải rebuild — tốn công gấp đôi.
4. **AdSense gần như không có tiền ở traffic này.** Traffic danh bạ địa phương RPM thấp; 3.000–5.000 lượt/tháng ≈ $10–50/tháng. AdSense cũng hay từ chối site danh bạ mỏng. Đừng tính AdSense vào doanh thu giai đoạn đầu.
5. **Top 3 trả phí mâu thuẫn với "danh bạ xác minh trung lập".** Bán vị trí top trong khi quảng cáo "đã xác minh, không thiên vị" là xung đột niềm tin — phải ghi nhãn Sponsored rõ ràng (FTC) và tách khỏi xếp hạng organic.
6. **Chi phí cơ hội.** Đây sẽ là dự án thứ 3 cùng lúc với hubercenter.com (mục tiêu 50.000 sessions) và FarmDirect (Steps 2–4 chưa deploy, recheck ngày 7 là 25/11). Cả 3 dự án cùng tranh 1 bottleneck: anh Út duyệt deploy + thời gian của Owner.

---

## 6. Khuyến nghị: làm theo kiểu wedge-first, 90 ngày chứng minh

**Đừng xây full 100k hồ sơ trước.** Làm nhỏ, đo thật, rồi mới scale:

**30 ngày đầu — Wedge (chứng minh được index + traffic):**
1. Công cụ **Verify License Texas** (điện + HVAC qua API TDLR, ống nước qua CSV TSBPE): nhập tên/số giấy phép → kết quả ngay, UX tốt hơn trang .gov. Đây là "máy tính thuế 1099" của dự án này — mồi hút traffic + link.
2. 10–15 bài guide: "How to verify...", "How much does... cost in Texas" (kèm dữ liệu chi phí thật).
3. 20–30 trang thành phố vừa/nhỏ (≥5 nhà thầu đang hoạt động), nội dung khác biệt thật (thống kê, chi phí địa phương), không phải đổi tên thành phố.

**Gate để scale (ngày 90):** tỷ lệ index batch đầu >80%, impression tăng đều 4 tuần liên tiếp, tool verify có traffic organic. Không đạt → dừng hoặc sửa, không đổ thêm 100k trang.

**Stack:** tái dùng kiến trúc FarmDirect (Next.js SSR + Supabase + Vercel) thay vì AI Studio, vì SEO là mạch sống của dự án này. FarmDirect đã có sẵn mẫu code danh bạ + claim flow đang làm dở — tái dùng được nhiều.

**Doanh thu thực tế:** $1.000–2.000/tháng là mốc tháng 9–12 (khi đã có traffic ở vài thành phố + bán Top 3 qua điện thoại), không phải tháng 4–6.

---

## 7. Quyết định cần Owner

1. **Có làm không?** — Đây là website vệ tinh, chỉ Owner quyết. Lưu ý chi phí cơ hội với hubercenter + FarmDirect.
2. **Texas hay California?** — Muse đề xuất Texas (API + CSV sẵn).
3. **Wedge-first hay full directory?** — Muse đề xuất wedge-first 90 ngày.
4. **Stack:** tái dùng kiến trúc FarmDirect (cần anh Út duyệt deploy) hay thử AI Studio (nhanh nhưng rủi ro SEO)?

---

## Nguồn

- TDLR Licensing Files Download: tdlr.texas.gov/licenseSearch/licfile.asp (CSV hàng ngày; All Electricians 69,84 MB; All Licenses 189,79 MB)
- TDLR Socrata API trên data.texas.gov; đo lường bên thứ ba: 983.494 dòng, 99.720 có SĐT, 36.312 giấy phép nhà thầu (scrapebench.dev, fetchdata.me — 10/2026)
- TSBPE Free Licensee List: tsbpe.texas.gov/free-licensee-list (6 CSV, cập nhật hàng ngày)
- CSLB Public Data Portal: cslb.ca.gov/onlineservices/dataportal (master list miễn phí, không có email)
- Rule27: programmatic SEO timeline (7–14 ngày index, 60–90 ngày click, 9–12 tháng phủ hết)
- aamax.co, aiappsapi.com: domain mới cộng 3–6 tháng; 3–6 tháng mới rank ổn định
- Ahrefs (qua theoryroad.com): 1,74% trang mới vào top 10 trong 1 năm; tuổi trung bình trang #1 là 5 năm
- FarmDirect Content Audit 23/11/2026: ~/workspace/farmdirect/content-audit-2026-11-23.md
- Skill seo_programmatic (ngưỡng unique content 30–40%), seo_local (local pack, proximity)
