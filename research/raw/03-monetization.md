# 03 — Monetization: AdSense vs. Bán listing / Featured placement

**Dự án:** Danh bạ thợ sửa chữa Hoa Kỳ — MVP Texas (thợ điện, HVAC, ống nước; dữ liệu giấy phép công khai của bang)
**Ngày đọc nguồn:** 24/11/2026
**Người ghi:** subagent nghiên cứu (nhiệm vụ kiểm chứng 2 mô hình thu)
**Quy ước nhãn:** VERIFIED = đã đọc trực tiếp nguồn, kèm link + ngày đọc · INFERRED = suy luận, nêu cơ sở · UNVERIFIED = chưa kiểm chứng được

---

## TÓM TẮT KẾT LUẬN (chi tiết + nguồn ở dưới)

1. **AdSense KHÔNG bị cấm đối với site danh bạ theo tên gọi**, nhưng hồ sơ của một site danh bạ template (hàng nghìn trang tạo từ dữ liệu giấy phép, ít nội dung gốc) trùng khớp chính xác với các lý do từ chối phổ biến nhất của AdSense: "low value content", "replicated content", "automatically generated content without manual review or curation". [VERIFIED — chính sách Google, xem §1a]
2. **Ngay cả khi được duyệt, AdSense ở 1.000–5.000 lượt/tháng chỉ mang về $2–$67/tháng** (tùy RPM $2–$13,37), thấp hơn ngưỡng chi trả $100 của AdSense — nghĩa là nhiều tháng mới nhận được khoản thanh toán đầu tiên. [VERIFIED — ngưỡng $100; tính toán từ RPM đã đọc, xem §1b]
3. **Để AdSense một mình đạt $1.000/tháng cần ~75.000–500.000 pageviews/tháng** tùy RPM. Mốc $1.000–2.000/tháng ở tháng 9–12 chỉ khả thi qua bán listing/lead, không qua AdSense. [INFERRED — tính toán từ RPM đã kiểm chứng]
4. **Giá featured placement công khai của các directory nhỏ cùng loại thấp hơn nhiều so với playbook đề xuất ($49–149/tháng):** Best in Hood bán vị trí #1 với $100/NĂM (~$8,33/tháng); TrustAnalytica $16,25–$66,25/tháng nhưng đó là gói SaaS quản lý danh tiếng kèm placement. Các nền tảng lớn (Yelp $150/tháng tối thiểu; Angi/Thumbtack tính theo lead $10–$100/lead) có traffic khổng lồ làm hậu thuẫn — không so sánh ngang được với directory mới. [VERIFIED — trang pricing đọc trực tiếp, xem §2]
5. **Mô hình thu thực tế nhất cho MVP:** freemium listing + featured placement giá thấp ban đầu ($10–$30/tháng hoặc $75–$150/năm/placement) để có khách trả tiền đầu tiên và bằng chứng giá trị, tăng giá khi traffic tăng; AdSense chỉ là thu phụ sau khi site có nội dung gốc đủ mạnh để được duyệt. [INFERRED — tổng hợp từ các mức giá đã kiểm chứng]

---

## 1. AdSense cho site danh bạ

### 1a. Chính sách: AdSense có cấm/từ chối site danh bạ không?

**Kết luận: Không có lệnh cấm danh bạ theo tên gọi. Nhưng 3 chính sách của Google đều đánh trực tiếp vào dạng trang danh bạ template.**

#### (i) Điều kiện tham gia AdSense — "high-quality, original"

[VERIFIED — đọc trực tiếp 24/11/2026]
Nguồn: Google AdSense Help, "Eligibility requirements for AdSense"
https://support.google.com/adsense/answer/9724?hl=en

Trích nguyên văn:
> "Do you have your own unique and interesting content? Your content must be high-quality, original, and attract an audience."

- Không có mức tối thiểu về traffic, số bài hay số từ được công bố trên trang này.
- Nội dung trang danh bạ lấy từ dữ liệu giấy phép công khai (tên, địa chỉ, số giấy phép, trạng thái) là dữ liệu **đã có sẵn ở nguồn .gov** — khó được coi là "original" nếu không có giá trị gia tăng (đánh giá, so sánh, phân tích, xác minh bổ sung). [INFERRED]

#### (ii) Google Publisher Policies — "screens without publisher-content" / low-value content

[VERIFIED — đọc trực tiếp 24/11/2026]
Nguồn: Google Publisher Policies Help, "Google-served ads on screens without publisher-content"
https://support.google.com/publisherpolicies/answer/11112688?hl=en

Trích nguyên văn:
> "We do not allow Google-served ads on screens: without publisher-content or with low-value content, that are under construction, that are used for alerts, navigation or other behavioral purposes"
> "The content you provide should be of value to the user and be the focal point for users visiting your site or app. For this reason, we may limit or disable ad serving on pages with low value content and/or still being constructed until changes are made."
> "Don't place ads on automatically generated content without manual review or curation."

Điểm cuối cùng đặc biệt liên quan: các trang hồ sơ thợ/thành phố của directory MVP đều là **nội dung tạo tự động từ database**. Theo chính sách này, đặt quảng cáo lên đó mà không có review/curation thủ công là vi phạm. [INFERRED — áp dụng trực tiếp câu chữ chính sách vào mô hình trang của MVP]

#### (iii) Chính sách "Replicated content"

[VERIFIED qua nguồn thứ cấp trích chính sách — chưa đọc trực tiếp trang chính sách này vì không lấy được URL chính xác trong phiên làm việc]
- Google Publisher Policies có mục riêng "Replicated content": không cho phép quảng cáo Google trên các màn hình chứa "Embedded/copied content from others without additional commentary, curation, or other added value" (nội dung nhúng/sao chép từ nguồn khác mà không có bình luận, tuyển chọn hay giá trị gia tăng).
- Nguồn trích: CPM Insider, "Google Ad Manager 360 Policy Violations" (https://cpminsider.com/google-ad-manager-360-policy-violations/) — "Publishers should not monetize copied or replicated content that does not add meaningful commentary, curation or other value for users"; và bump.it, "How to fix an AdSense low-value content rejection" (https://www.bump.it.com/blog/fix-adsense-low-value-content-rejection).
- Dữ liệu giấy phép là dữ liệu công khai của bang (không phải nội dung có bản quyền của bên thứ ba), nhưng về mặt "giá trị gia tăng", một trang chỉ liệt kê lại dữ liệu .gov vẫn nằm trong vùng rủi ro của chính sách này. [INFERRED]

#### (iv) Lý do từ chối "Low value content" — thực tế áp dụng

[VERIFIED — nhiều nguồn độc lập mô tả cùng một thực tế; đọc qua kết quả tìm kiếm 24/11/2026]
- "Low value content" là lý do từ chối phổ biến nhất của AdSense. Thông điệp trong tài khoản: "Your site does not yet meet the criteria of use in the Google publisher network."
- SitePostMortem (31/10/2026, kiểm tra 22/11/2026): "Low value is a judgement about whether a page gives a reader something they cannot get elsewhere… Adding twenty more pages of the same material makes the judgement worse, not better." — https://sitepostmortem.com/monetization/adsense-rejected-low-value-content/
- mhadx.com: "Even a site with plenty of words can still be rejected if the content is copied, rewritten from other sources, auto-generated, or mostly affiliate material with nothing added." — https://mhadx.com/blog/adsense-low-value-content-fix
- EarnRoutes: Google không công bố thống kê từ chối nào; mọi con số "% từ chối" trên mạng đều là bịa nếu không link tới trang Google. — https://www.earnroutes.com/guides/adsense-low-value-content-rejection-fix/
- Lưu ý: AdSense Community (diễn đàn tình nguyện viên, KHÔNG phải nhân viên Google) thường khuyên nên có ~50 bài gốc 800+ từ, đăng đều 3–6 tháng trước khi nộp đơn; và cho rằng các site không ở định dạng bài viết dài (ảnh, Q&A, quiz, affiliate…) "won't work with the AdSense program". Đây là **kinh nghiệm cộng đồng, không phải chính sách chính thức** — ghi nhận để tham khảo, không dùng làm căn cứ cứng. Nguồn: https://support.google.com/adsense/thread/121389691 (15/08/2021).

#### (v) Google Search spam policy — Scaled content abuse (rủi ro cho chính traffic, không chỉ AdSense)

[VERIFIED — đọc trực tiếp 24/11/2026]
Nguồn: Google Search Central Blog, "What web creators should know about our March 2024 core update and new spam policies" (05/03/2024)
https://developers.google.com/search/blog/2024/03/core-update-spam-policies

Trích nguyên văn:
> "Scaled content abuse is when many pages are generated for the primary purpose of manipulating Search rankings and not helping users. This abusive practice is typically focused on creating large amounts of unoriginal content that provides little to no value to users, no matter how it's created."
> "Sites that violate our spam policies may rank lower in results or not appear in results at all."

- Chính sách áp dụng "no matter whether content is produced through automation, human efforts, or some combination" — tức tạo trang bằng tay cũng vi phạm nếu mục đích chính là thao túng thứ hạng và nội dung không có giá trị.
- Ngoài ra, trang spam policies của Google còn liệt kê "Doorway abuse" (nhiều trang thành phố/khu vực tương tự nhau dẫn về một trang) và "Low-quality directory or bookmark site links" (mục Link spam) — cả hai đều liên quan trực tiếp tới kiến trúc directory theo thành phố/ZIP. [VERIFIED qua snippet kết quả tìm kiếm từ trang spam policies chính thức; chưa mở trực tiếp trang spam policies trong phiên này vì link mở bị lệch sang trang khác]
- Hệ quả: nếu các trang thành phố/ZIP/thợ quá mỏng và giống nhau, rủi ro không chỉ là AdSense từ chối mà còn là **Google không index hoặc hạ hạng toàn site** — đúng bài học đã thấy ở FarmDirect (crawl sụt về ~0). [INFERRED — áp dụng chính sách + kinh nghiệm nội bộ]

#### (vi) Ngưỡng thanh toán AdSense — $100

[VERIFIED — đọc qua kết quả tìm kiếm từ trang AdSense Help chính thức 24/11/2026]
Nguồn: Google AdSense Help, "Payment thresholds"
https://support.google.com/adsense/answer/1709871

> "You'll be paid out when your outstanding earnings reach the payment threshold…" — Bảng ngưỡng: U.S. Dollar (USD): Payment method $10 · **Payment $100** · Cancellation $10. Số dư dưới $100 được cộng dồn sang tháng sau, không mất đi. Thanh toán phát hành từ ngày 21–26 của tháng sau khi đạt ngưỡng.
- Hệ quả thực tế: ở doanh thu $10–$30/tháng, phải mất 4–10 tháng mới nhận được khoản thanh toán AdSense đầu tiên. [INFERRED — phép tính từ ngưỡng đã kiểm chứng]

---

### 1b. RPM thực tế cho traffic local / directory / home-services

**Lưu ý về đơn vị:** RPM = doanh thu / 1.000 pageviews (lượt xem trang), KHÔNG phải / 1.000 visits. Site directory thường có ~1,5–1,6 pageviews/visit. Bảng tính dưới đây dùng giả định thận trọng pageviews = visits; nếu tính 1,6 pageviews/visit thì nhân kết quả với 1,6. [INFERRED — hệ số 1,6 lấy từ bannertag.com, xem dưới]

#### Nguồn 1 — TurnkeyDirectories (blog chuyên về directory, đọc trực tiếp 24/11/2026)

https://turnkeydirectories.com/directory-website-revenue-streams/
(Bài viết cập nhật ~312 ngày trước thời điểm đọc, tức khoảng tháng 01/2026; tác giả là người làm trong ngành directory — không công bố phương pháp đo, nên các số này là **ước tính ngành, không phải số liệu đo được**.)

> "directory owners can earn anywhere from $0.20 to $15 per click, depending on the niche and audience quality."
> "a general local business directory might average closer to $0.50-$2 per click. Sites with high-quality traffic in specialized niches can generate $5-10 RPM"

Bảng "Average Ad Revenue by Directory Niche":

| Niche | CPC | RPM/tháng | Traffic cần có |
|---|---|---|---|
| Financial Services | $5–15 | $15–25 | 10.000+ |
| Legal Services | $8–20 | $12–20 | 15.000+ |
| **Home Services** | **$2–8** | **$8–12** | **25.000+** |
| **Local Business** | **$0,50–2** | **$5–10** | **50.000+** |
| Restaurant/Food | $1–4 | $6–11 | 40.000+ |

Điểm quan trọng: chính nguồn này cũng ghi traffic cần có để RPM đó có ý nghĩa là **25.000+ visits/tháng cho Home Services, 50.000+ cho Local Business** — gấp 5–50 lần mốc 1.000–5.000 của MVP. Và: "Most directories take 12-18 months to reach significant profitability."

#### Nguồn 2 — Pubsleuth (đọc trực tiếp 24/11/2026; dữ liệu đếm 24/11/2026, facts checked 15/11/2026)

https://pubsleuth.com/adsense-rpm-by-niche

Đây là nguồn cẩn thận nhất tìm được: đối chiếu số liệu **do chính Google công bố trong AdSense calculator** (file dữ liệu Google thay đổi lần cuối 09/12/2024) với ước tính mô hình của họ trên 813.577 site AdSense.

- Số liệu của Google (category "Home & Garden", khu vực Americas): **$13,37 / 1.000 pageviews** — cao hơn gấp đôi mọi category khác trong bảng Google; Pubsleuth lưu ý Google không giải thích vì sao Americas cao bất thường (EMEA $5,16; APAC $4,11) và con số này là "continent blend" (gộp Mỹ + Mỹ Latinh).
- Ước tính mô hình của Pubsleuth cho niche "Home, DIY & Real Estate": **site điển hình $6,18** (nửa giữa $6,18–$10,30); rate cho độc giả Mỹ $20,60.
- Trung vị toàn bộ site AdSense: **$2,38** / 1.000 pageviews; nửa giữa $1,32–$3,96.
- Cảnh báo phương pháp của chính Pubsleuth: "Our figure for each niche is an estimate from a model, not a measurement… A true figure is typically within 0.4 to 2.5 times the estimate."

#### Nguồn 3 — Các blog/calculator khác (đọc qua kết quả tìm kiếm 24/11/2026; đều là ước tính, không công bố phương pháp đo)

| Nguồn | Niche Home/DIY | RPM ghi nhận |
|---|---|---|
| nestoftools.com (cập nhật 23/11/2026) | Home, DIY, parenting | $5–$12 |
| adstork.com (2026 benchmark report) | Home, DIY, real estate | $6–$14 |
| bannertag.com (cập nhật ~16/11/2026) | Home, garden, travel | $6–$14 |
| smart-blog-tips.pages.dev | Home and DIY | $7–$15 |
| getzenquery.com | Home improvement | $4–$11 (+ case study: 60.000 pageviews/ngày, CTR 1,2%, CPC $0,34 → page RPM $7,65) |
| ecomcalctools.com (06/2026) | Home / Real Estate | $8–$20 |
| appadrevenue.com (cập nhật 23/11/2026) | Home / real estate | $6–$18; **"A brand-new site on plain AdSense, in an average niche, with mixed geography, often sits at a $1–$5 RPM"** |

**Khoảng RPM dùng để tính toán (tổng hợp có cơ sở):**
- Thận trọng (site mới, trang mỏng, CTR thấp): **$2–$5**
- Trung bình (site Home/DIY điển hình, traffic Mỹ): **$6,18** (Pubsleuth) — dùng $6 làm tròn
- Lạc quan (số liệu Google công bố cho Home & Garden Americas): **$13,37**

#### Tính thử doanh thu AdSense/tháng (giả định pageviews = visits)

| Lượt/tháng | RPM $2 (thận trọng) | RPM $6 (trung bình) | RPM $13,37 (số Google) |
|---|---|---|---|
| 1.000 | **$2** | **$6** | **$13,37** |
| 3.000 | **$6** | **$18** | **$40,11** |
| 5.000 | **$10** | **$30** | **$66,85** |
| 10.000 | $20 | $60 | $133,70 |
| 50.000 | $100 | $300 | $668,50 |

Nếu tính 1,6 pageviews/visit: ở 5.000 visits/tháng, RPM $6 → **$49,44/tháng**; RPM $13,37 → **$106,96/tháng**.

**Số tháng để đạt ngưỡng thanh toán $100 đầu tiên (ở 5.000 visits/tháng):** RPM $2 → 10 tháng; RPM $6 → ~3,3 tháng; RPM $13,37 → ~1,5 tháng. [Tính toán]

**Traffic cần có để AdSense đạt $1.000/tháng:** RPM $2 → 500.000 pageviews/tháng; RPM $6 → ~167.000; RPM $13,37 → ~75.000. [Tính toán]

**Kết luận phần 1 (AdSense):** Không khả thi làm nguồn thu chính giai đoạn đầu. Hai rào cản độc lập: (1) rủi ro bị từ chối/hạn chế phân phối quảng cáo vì nội dung mỏng + tạo tự động + sao chép dữ liệu công khai; (2) ngay cả khi được duyệt, doanh thu ở quy mô 1.000–5.000 lượt/tháng là $2–$67/tháng — dưới ngưỡng thanh toán và không đáng kể so với công sức. AdSense chỉ nên xem là thu phụ ở giai đoạn site đã có traffic lớn (50.000+ pageviews/tháng) và nội dung gốc đủ mạnh. [INFERRED — tổng hợp từ các điểm VERIFIED trên]

---

## 2. Bán listing / featured placement — giá công khai của các site cùng loại

### 2a. TrustAnalytica (trustanalytica.org) — directory "Top 10" theo thành phố + dịch vụ, mô hình gần nhất với MVP

[VERIFIED — đọc trực tiếp trang pricing 24/11/2026]
https://trustanalytica.org/pricing

Giá hiển thị theo hình thức **thanh toán theo năm (annual billing, save 30%)** — giá tháng khi thanh toán theo tháng (monthly billing) không được ghi lại trong lần đọc này vì trang mặc định hiển thị gói năm:

| Gói | Giá (trả theo năm) | Placement gồm có |
|---|---|---|
| Light | **$16,25/tháng** | Premium Business Profile · 1 x Top 10 List · Verified Search Placement · Request 20 Reviews via SMS · Dispute Reviews · Top 10 Reputation Badge · Website Reviews Widget |
| Essential (Best value) | **$41,25/tháng** | Như Light + 3 x Top 10 List · Calculator Listing #1 Placement · Request 250 Reviews via SMS |
| Professional | **$66,25/tháng** | Như Essential + 4 x Top 10 List · Calculator #1 Placement |

- Dùng thử 7 ngày miễn phí, hủy bất cứ lúc nào. Giá gốc trước giảm 30% suy ra khoảng $23 / $59 / $95/tháng nếu trả theo tháng [INFERRED — tính ngược từ "save 30%", chưa kiểm chứng trực tiếp vì trang không hiển thị giá tháng].
- Lưu ý: đây là gói SaaS quản lý danh tiếng (review via SMS, dispute, widget) **kèm** placement — không phải giá placement thuần túy. So sánh trực tiếp với gói Top 3 của MVP sẽ bị lệch vì TrustAnalytica bán thêm nhiều dịch vụ.
- TrustRadius ghi "TrustAnalytica does not currently have any pricing plans listed" — thông tin này đã lỗi thời so với trang pricing chính thức đọc được hôm nay.

### 2b. Best in Hood (bestinhood.com) — directory "best of" theo thành phố, mô hình placement thuần túy, gần nhất với gói Top 3 của MVP

[VERIFIED — đọc trực tiếp trang pricing + trang điều khoản 24/11/2026]
https://www.bestinhood.com/pricing/
https://www.bestinhood.com/terms-and-conditions/ (cập nhật 24/10/2026)

| Gói | Giá | Nội dung |
|---|---|---|
| Basic Listing | **$50 một lần** (không gia hạn) | Giữ chỗ trên trang list, dofollow link vĩnh viễn tới website doanh nghiệp |
| Priority Listing — vị trí #2 | **$75/năm** | Giữ vị trí #2 trên trang trong 1 năm + certificate (nếu có ≥10 Google reviews) |
| Premium Listing — vị trí #1 | **$100/năm** | Giữ vị trí top trên trang trong 1 năm + certificate |
| Premium + New City Page | **$150 năm đầu**, sau đó $100/năm | Họ xây trang mới cho thành phố/dịch vụ chưa có + vị trí #1 trong 1 năm |

- Thanh toán bằng thẻ (Stripe) hoặc PayPal. Placement xử lý bằng tay sau thanh toán, trong 3 ngày làm việc.
- Quy tắc minh bạch: "Ratings and review counts come from public Google data and are never edited, so a paid placement never changes another business's score." Các listing trả tiền được đánh dấu "Featured Partner" / "Claimed".
- **Quy đổi ra tháng: vị trí #1 = ~$8,33/tháng; vị trí #2 = $6,25/tháng.** Đây là mức giá của một directory nhỏ, mới (dữ liệu Google Maps của họ thu thập 07–11/2026) — bối cảnh tương đồng nhất với MVP Texas ở giai đoạn đầu. [INFERRED — phép chia + nhận xét tương đồng]

### 2c. ConsumerAffairs (consumeraffairs.com) — GIÁ KHÔNG CÔNG KHAI

[VERIFIED — đọc FAQ chính thức + các trang tổng hợp giá 24/11/2026]
- FAQ chính thức: https://www.consumeraffairs.com/about/faq/ — "We make money with our Authorized Partner Program… businesses who in turn pay us to participate." Quyền lợi partner gồm: review collection, featured reviews (1–3 reviews), recommendations qua matching tools và buyers guides. **Không công bố giá.**
- G2 (https://www.g2.com/products/consumeraffairs-com/reviews): "Pricing details for this product isn't currently available." Slashdot/SourceForge: "No price information available."
- Một review trên G2 (người dùng ẩn danh, chưa xác minh độc lập) viết: "They are expensive. $2,000 a month for their reputation service." — đây là **lời kể đơn lẻ, UNVERIFIED**, chỉ ghi nhận để tham khảo, không dùng làm số liệu.
- Mô hình thu của họ: phí partner + thu khi người dùng click link / gọi số điện thoại / điền form (pay-per-engagement), không phải bán placement cố định theo tháng.

### 2d. Yelp — giá công khai một phần (sàn tối thiểu + gói nâng cấp)

[VERIFIED qua 2 nguồn độc lập cùng đưa một bộ số; chưa đọc trực tiếp trang business.yelp.com trong phiên này]
- WebFX, "Yelp Advertising Costs: What to Budget in 2026" (cập nhật 28/10/2026): https://www.webfx.com/blog/ppc/yelp-advertising-costs/
- iCatch Marketing (Yelp Advertising Partner, Partner of the Year 2023): https://www.icatchgroup.com/how-much-do-yelp-ads-cost/

| Sản phẩm | Giá |
|---|---|
| Yelp Business Page (listing cơ bản) | Miễn phí |
| Yelp Ads | **Từ $150/tháng** (~$5/ngày, tối thiểu); đa số doanh nghiệp chi $300–$1.500/tháng |
| Upgrade Package | **$180/tháng** (visual nâng cao, gỡ quảng cáo đối thủ khỏi trang của mình…) |
| Ads + Upgrade bundle | **Từ $270/tháng** |

- Yelp Ads tính theo CPC (trả theo click), không có rate card cố định. CPC home services (plumbing, HVAC, electrical): $2–$8/click (iCatch) hoặc $5–$15/click cho HVAC & plumbing (SkillMammoth, số liệu quan sát 2025–2026). Cost per lead home services: $50–$150 (SkillMammoth: https://skillmammoth.com/blog/yelp-ads-cost).
- Bối cảnh: Yelp có traffic khổng lồ; mức sàn $150/tháng của họ không phải mức tham chiếu cho directory mới chưa có traffic. [INFERRED]

### 2e. Angi (ex-HomeAdvisor) — KHÔNG CÓ BẢNG GIÁ CÔNG KHAI; mô hình pay-per-lead + phí thành viên

[VERIFIED — nhiều nguồn độc lập đồng thuận 24/11/2026]
- "Neither company publishes a standard rate card, so every figure below is a reported range" (StyleStrand Media, https://www.stylestrandmedia.com/angi-thumbtack-leads-worth-it/).
- Giá lead được báo cáo 2026: **$15–$85/lead** (đa số nguồn), một số nguồn ghi $15–$100; lead HVAC/plumbing/roofing giá cao $50–$100+.
- Phí thành viên năm: ~$300/năm (đơn khiếu nại FTC 2022 ghi $287,99/năm; các guide 2026 ghi ~$300).
- Chi tiêu tháng của contractor đang hoạt động: "a few hundred dollars to $2,500 or more" (Housecall Pro, trích qua StyleStrand); PipelineOn ghi "Most contractors pay $300-$2,500/month on 12-month auto-renewing contracts."
- Cost per booked job: ~$500–$583 (Angi) theo benchmark 2026 (handvetted.com, pipelineon.com).
- Lưu ý: Angi đã dần bỏ mảng quảng cáo hiển thị ở Mỹ từ Q4/2025 (Housecall Pro; kodec.net ghi "We found no primary text for that date" — UNVERIFIED về thời điểm chính xác).

### 2f. Thumbtack — KHÔNG CÓ BẢNG GIÁ CÔNG KHAI; miễn phí tham gia, trả theo lead

[VERIFIED — nhiều nguồn độc lập đồng thuận 24/11/2026]
- Tham gia miễn phí; trả phí khi được match hoặc khi phản hồi lead; có ngân sách tuần tự đặt.
- Giá lead được báo cáo 2026: **$10–$80+/lead** (kodec.net, kiểm tra 14/11/2026; StyleStrand: "about $10 to over $100 depending on trade, job size, and market"). Theo trade: HVAC replacement $80–$150; plumbing/electrical service $30–$80; handyman/cleaning $18–$40 (handvetted.com).
- Cost per booked job: ~$250–$278 (thấp hơn Angi). Tỷ lệ lead "ma" cao: ~75% direct leads không trả lời sau lần liên hệ đầu (PipelineOn, theo báo cáo của contractor — chưa xác minh độc lập).

### 2g. BBB (Better Business Bureau) — phí accreditation theo từng văn phòng địa phương, KHÔNG có bảng giá quốc gia

[VERIFIED — nhiều nguồn độc lập, đọc qua kết quả tìm kiếm 24/11/2026]
- BBB không công bố bảng phí quốc gia; mỗi văn phòng địa phương tự đặt giá theo quy mô doanh nghiệp (chủ yếu theo số nhân viên).
- Các mức đã công bố: Eastern MA/ME/RI/VT từ **$30/tháng**; BBB Midwest Plains **$51–$54/tháng** ($612–$649/năm cho 1–14 nhân viên); BBB Wisconsin $545/năm (1–9 nhân viên); BBB Greater Maryland $557/năm (1–6 FTE, lịch 2025).
- Khoảng chung cho small business: **$500–$1.500/năm** (Shopify blog; SBTDC).
- Nguồn: thepricer.org (cập nhật 28/09/2026, đối chiếu 14 nguồn), businessratingfix.com (đọc lịch phí bbb.org tháng 11/2026), shopify.com/blog/what-is-better-business-bureau.
- Bối cảnh: BBB bán "trust badge" + accreditation, không phải placement — chỉ dùng làm tham chiếu về **ngưỡng chi trả của small business cho một tín hiệu uy tín** (~$30–$55/tháng là mức họ đã quen trả). [INFERRED]

### 2h. Benchmark ngành directory (nguồn thứ cấp, không có phương pháp đo — dùng tham khảo)

[VERIFIED là nội dung của nguồn; số liệu trong nguồn là UNVERIFIED vì không công bố phương pháp]
TurnkeyDirectories (https://turnkeydirectories.com/directory-website-revenue-streams/):
- Sponsored listing: **$100–$500/tháng** "depending on the directory's traffic and niche" (banner thường chỉ $2–$5 CPM).
- Tiered pricing gợi ý: Bronze $10–30/tháng · Silver $30–100/tháng · Gold $100–300/tháng.
- Claim: 10–25% doanh nghiệp free nâng cấp lên trả phí; giá listing trung bình $75/tháng; doanh thu từ paid listings 20–40% tổng thu. (Không có nguồn đo lường kèm theo — coi là claim của tác giả, không phải dữ liệu.)

---

## 3. Bảng tổng hợp giá featured placement / listing (đã kiểm chứng 24/11/2026)

| Nền tảng | Mô hình | Giá công khai | Ghi chú |
|---|---|---|---|
| **Best in Hood** | Placement/năm | **#1: $100/năm (~$8,33/th) · #2: $75/năm · Basic: $50 một lần** | Directory nhỏ, mới — tham chiếu gần nhất cho MVP |
| **TrustAnalytica** | SaaS + placement/tháng (trả năm) | **$16,25 / $41,25 / $66,25/tháng** | Gói kèm quản lý review, không phải placement thuần |
| **ConsumerAffairs** | Authorized Partner | **Không công khai** | 1 review G2 kể $2.000/tháng (UNVERIFIED) |
| **Yelp** | CPC ads + gói nâng cấp | **Ads từ $150/th · Upgrade $180/th · Bundle từ $270/th** | Traffic lớn; sàn $150/th không áp dụng cho directory mới |
| **Angi** | Pay-per-lead + phí năm | **Không công khai**; báo cáo $15–$85/lead + ~$300/năm | Hợp đồng 12 tháng, tự gia hạn |
| **Thumbtack** | Pay-per-lead | **Không công khai**; báo cáo $10–$80+/lead; tham gia miễn phí | Trả khi match/phản hồi lead |
| **BBB** | Accreditation/năm | **Không có giá quốc gia**; địa phương $30–$54/th (~$500–$1.500/năm) | Bán trust badge, không phải placement |
| TurnkeyDirectories (benchmark ngành) | Sponsored listing | $100–$500/th (claim, không phương pháp đo) | Chỉ tham khảo |

---

## 4. Ước tính doanh thu thực tế cho MVP Texas (INFERRED — tính toán từ các số VERIFIED trên)

### 4a. AdSense (đã tính ở §1b)

| Lượt/tháng | Doanh thu AdSense/tháng (RPM $2–$13,37) |
|---|---|
| 1.000 | $2–$13 |
| 3.000 | $6–$40 |
| 5.000 | $10–$67 |
| 50.000 | $100–$669 |

→ AdSense không đưa MVP tới $1.000/tháng trước khi đạt ~75.000–500.000 pageviews/tháng.

### 4b. Bán featured placement — kịch bản minh họa (giả định giá + số lượng bán được, CHƯA kiểm chứng nhu cầu thực tế)

Playbook gốc: Top 3 thành phố/ZIP giá $49–$149/tháng.

Đối chiếu với giá thị trường đã kiểm chứng:
- Directory nhỏ cùng loại (Best in Hood) bán #1 với **$100/năm**; TrustAnalytica bán gói kèm placement từ **$16,25/tháng**.
- Mức $49–$149/tháng nằm trong khoảng của **Yelp (từ $150/th)** và **BBB ($30–$54/th)** — tức là mức giá của nền tảng đã có thương hiệu/traffic lớn hoặc tín hiệu uy tín mạnh. Một directory mới chưa có traffic khó bán được ở mức này nếu không chứng minh được lead/click thực tế. [INFERRED]

Kịch bản doanh thu placement (minh họa, chưa phải dự báo):

| Kịch bản | Giá/placement | Số placement bán được | Doanh thu/tháng |
|---|---|---|---|
| Thận trọng (giá Best-in-Hood) | $8,33/th ($100/năm) | 10 | ~$83 |
| Trung bình (giá TrustAnalytica Light) | ~$16/th | 20 | ~$320 |
| Playbook thấp | $49/th | 10 | $490 |
| Playbook thấp | $49/th | 20 | $980 |
| Playbook cao | $149/th | 10 | $1.490 |

→ Mốc $1.000/tháng cần khoảng **20 placement × $49/th** hoặc **~7 placement × $149/th**. Khả thi về mặt số học, nhưng điều kiện tiên quyết là directory phải chứng minh được traffic/lead cho thợ — điều chưa có ở tháng 1–6. [INFERRED]

### 4c. So sánh với đánh giá trước đó

- Đánh giá trước đó nói "$1.000–2.000/tháng là mốc tháng 9–12 chứ không phải tháng 4–6" — **nghiên cứu này ủng hộ nhận định đó**: AdSense đóng góp gần như bằng 0 ở quy mô tháng 4–6, và bán placement cần thời gian để có traffic + bằng chứng giá trị trước khi thợ chịu trả tiền. TurnkeyDirectories cũng ghi "Most directories take 12-18 months to reach significant profitability."
- Đánh giá trước đó nghi ngờ AdSense (RPM thấp, hay từ chối site mỏng) — **được củng cố**: RPM thực tế cho site mới chỉ $1–$5 (appadrevenue) đến $6,18 (Pubsleuth typical site); rủi ro từ chối "low value content" là có thật và đúng hồ sơ của directory template.

---

## 5. Những điểm CHƯA kiểm chứng được (UNVERIFIED / giới hạn của nghiên cứu này)

1. Giá monthly billing (trả theo tháng, không theo năm) của TrustAnalytica — trang pricing chỉ hiển thị giá annual trong lần đọc.
2. Giá thực tế thợ Texas sẵn sàng trả cho placement trên một directory mới — cần khảo sát/gọi điện trực tiếp (ngoài phạm vi nhiệm vụ này: không liên hệ ai).
3. Tỷ lệ chuyển đổi free → paid listing cho directory thợ (claim 10–25% của TurnkeyDirectories không có phương pháp đo).
4. Trang chính sách "Replicated content" của Google Publisher Policies — chỉ đọc qua nguồn thứ cấp trích dẫn, chưa mở trực tiếp.
5. Trang Spam Policies đầy đủ của Google Search Central — đã đọc blog 05/03/2024 trực tiếp; trang chính sách đầy đủ chưa mở trực tiếp trong phiên này (link mở bị lệch).
6. Số liệu CPC/RPM của các blog (nestoftools, adstork, bannertag…) đều là ước tính không công bố phương pháp — chỉ dùng làm khoảng tham chiếu, không phải dữ liệu đo được. Nguồn cứng nhất là số liệu Google calculator qua Pubsleuth ($13,37 Home & Garden Americas, file Google 09/12/2024) và ước tính mô hình Pubsleuth ($6,18 typical site).
7. Không tìm thấy trang advertise/get-listed công khai nào của Angi/Thumbtack với bảng giá — cả hai đều bán qua sales/quote (đã xác nhận qua nhiều nguồn độc lập rằng họ không công bố rate card).

---

## 6. Danh sách nguồn (tất cả đọc ngày 24/11/2026)

**Chính sách Google (đọc trực tiếp):**
- https://support.google.com/adsense/answer/9724?hl=en — Eligibility requirements for AdSense
- https://support.google.com/publisherpolicies/answer/11112688?hl=en — Google-served ads on screens without publisher-content
- https://developers.google.com/search/blog/2024/03/core-update-spam-policies — March 2024 core update + spam policies (scaled content abuse)
- https://support.google.com/adsense/answer/1709871 — Payment thresholds (đọc qua kết quả tìm kiếm)

**RPM / AdSense:**
- https://pubsleuth.com/adsense-rpm-by-niche — AdSense RPM by niche (đọc trực tiếp; dữ liệu đếm 24/11/2026)
- https://turnkeydirectories.com/directory-website-revenue-streams/ — How Much Do Directory Websites Make? (đọc trực tiếp)
- https://nestoftools.com/blog/how-to-calculate-adsense-revenue-per-1000-views/ · https://adstork.com/index.php/blog/the-rpm-benchmark-report-what-publishers-actually-earn-by-niche-in-2026 · https://www.bannertag.com/ad-revenue-calculator/ · https://www.appadrevenue.com/guides/how-much-do-websites-earn · https://www.getzenquery.com/tools/google-adsense-calculator/ · https://ecomcalctools.com/publisher/adsense-earnings-calculator/ · https://smart-blog-tips.pages.dev/how-to-make-money-with-google-adsense (đọc qua kết quả tìm kiếm)

**Low value content / từ chối AdSense:**
- https://sitepostmortem.com/monetization/adsense-rejected-low-value-content/ · https://mhadx.com/blog/adsense-low-value-content-fix · https://www.earnroutes.com/guides/adsense-low-value-content-rejection-fix/ · https://cpminsider.com/google-ad-manager-360-policy-violations/ · https://www.bump.it.com/blog/fix-adsense-low-value-content-rejection · https://support.google.com/adsense/thread/121389691 (đọc qua kết quả tìm kiếm)

**Giá placement (đọc trực tiếp trang pricing):**
- https://trustanalytica.org/pricing
- https://www.bestinhood.com/pricing/ · https://www.bestinhood.com/terms-and-conditions/
- https://www.consumeraffairs.com/about/faq/ (đọc qua kết quả tìm kiếm)

**Giá Yelp / Angi / Thumbtack / BBB (đọc qua kết quả tìm kiếm):**
- https://www.webfx.com/blog/ppc/yelp-advertising-costs/ (cập nhật 28/10/2026) · https://www.icatchgroup.com/how-much-do-yelp-ads-cost/ · https://skillmammoth.com/blog/yelp-ads-cost
- https://www.stylestrandmedia.com/angi-thumbtack-leads-worth-it/ · https://www.kodec.net/answers/thumbtack-vs-angi (kiểm tra 14/11/2026) · https://handvetted.com/learn/home-service-lead-cost-benchmarks-by-trade · https://pipelineon.com/blog/lead-aggregators-vs-own-pipeline/ · https://caseyresponse.com/blog/best-lead-sources-home-service-businesses (02/02/2026)
- https://www.thepricer.org/how-much-does-bbb-membership-cost/ (cập nhật 28/09/2026) · https://businessratingfix.com/bbb-accreditation/cost · https://www.shopify.com/blog/what-is-better-business-bureau
