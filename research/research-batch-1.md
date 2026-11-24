# Nghiên cứu đợt 1 — Danh bạ thợ sửa chữa Hoa Kỳ (MVP Texas)

**Ngày:** 24/11/2026 · **Mục đích:** định hướng go/no-go, wedge, bang, stack, kế hoạch 90 ngày
**Ghi chú thô:** `research/raw/01-keywords-wedge.md` · `02-competitors.md` · `03-monetization.md` · `04-legal.md` · `05-stack.md`
**Nhãn:** VERIFIED = đã đọc trực tiếp, có nguồn + ngày · INFERRED = suy luận, nêu cơ sở · UNVERIFIED = chưa kiểm chứng

---

## KẾT LUẬN ĐỊNH HƯỚNG

**GO có điều kiện — wedge-first, Texas, stack FarmDirect.** Khe hở verify-license là thật và đang mở, nhưng cửa sổ thời gian hẹp (đã có site cùng mô hình xuất hiện trong 2026, một đối thủ công khai ý định thu thập credentials). Không GO cho full directory 100k hồ sơ ngay từ đầu. Điều kiện GO: (1) bắt đầu bằng tool verify + guide, đo index thật 90 ngày; (2) không dùng SMS marketing hàng loạt; (3) không kỳ vọng doanh thu trước tháng 9.

---

## 1. Từ khóa wedge verify-license (40 từ khóa, 30 SERP đọc trực tiếp)

- **Không có "ông lớn" nào trong top 5 của bất kỳ truy vấn verify nào** (VERIFIED, 24/11): không Angi/Yelp/HomeAdvisor/BBB. Top 5 chỉ gồm trang .gov thô (PDF cũ, trang search), blog thợ nhỏ địa phương, vài site niche mới mỏng.
- **Không site nào có tool verify chạy thật trên dữ liệu TDLR/TSBPE cho homeowner** (VERIFIED): ContractorVerify.org chỉ là waitlist API, bài Texas cũ từ ~3/2026 và có lỗi thực tế; HomeClip (gần ta nhất: verify + Trust Score) viết sai về TACLA/TACLB, chưa làm nước, có paywall.
- **Top 10 tấn công đầu tiên:** (1) how to verify contractor license Texas — trang trụ cột 3 nghề, không có .gov trong top 5; (2) verify electrician license Texas; (3) verify HVAC contractor license Texas + Texas HVAC license lookup (gộp 1 trang); (4) verify plumber license Texas + Texas plumbing license lookup (gộp 1 trang, TSBPE search khó dùng nên tool thân thiện là khác biệt thật); (5) verify HVAC contractor license San Antonio — khoảng trống rõ nhất, top 5 không có guide nào, #1 là trang sai ngành (RRC propane); (6) what does TACL mean + TACLA vs TACLB (dễ lên featured snippet); (7) Texas master plumber / RMP lookup — chưa ai làm sâu, TSBPE có file RMP CSV kèm tên công ty; (8) Dallas contractor license lookup; (9) how do I check if an electrician/a plumber is licensed in Texas (PAA); (10) does Texas require a contractor license (mồi traffic, Texas không cấp phép GC từ 2009).
- **Không tấn công sớm:** TDLR license search, TSBPE license search, TECL lookup (intent navigational về tool .gov, không thắng được #1).
- **San Antonio là thành phố mở màn tốt nhất** (INFERRED): metro lớn thứ 2 TX nhưng SERP loãng nhất; Houston/Austin đã có 1–2 directory nhỏ cùng mô hình.
- Search volume: **không có số liệu miễn phí** cho bất kỳ từ khóa nào (không bịa số). Google Trends: UNVERIFIED — cần live browser.

## 2. Đối thủ (quick scan 7 site + 1 phát hiện thêm)

| Đối thủ | Quy mô công khai | Giá get-listed | Xác minh giấy phép? |
|---|---|---|---|
| Best in Hood | 6.758 lists; 27.174 businesses; 69 cities; đang tăng nhanh (~22k→27k business trong ~1 tháng) | $50 một lần; $75–100/năm; $150 trang mới | KHÔNG |
| TrustAnalytica | ~10–31 business/list mẫu | $16,25–$66,25/tháng (gói SaaS kèm placement, trả năm) | KHÔNG ("Verified" = claim profile) |
| texas-directory.net | 763 businesses; 102 cities; lệch về Rio Grande Valley | Miễn phí | KHÔNG |
| ConsumerAffairs | 2019: ~$50M doanh thu | Không công khai | KHÔNG |
| Angi | $1,03B doanh thu 2025; ~111k active pros (giảm 23%) | Profile free; ~$300/năm + $15–85/lead | Đã thử "Certified Pro" — bị Vermont AG buộc dừng 10/2025 |
| Thumbtack | Công ty tư nhân (UNVERIFIED) | Free join; median lead $27; plumbing ~$45–48, HVAC ~$96 | KHÔNG thấy |
| Yelp | $1,46B doanh thu 2025; 496k paying locations | Ads từ $150/th; bundle từ $270/th | CÓ nhưng sau paywall $270/th — chỉ là huy hiệu |

**3 gap:** (1) **Verify giấy phép có hệ thống, công khai, miễn phí — chưa ai làm**; Yelp đã chứng minh nó có giá trị thương mại (khóa sau $270/th). (2) Mọi bảng xếp hạng hiện tại đều bán được vị trí (ConsumerAffairs tự thừa nhận tiền ảnh hưởng thứ hạng; Best in Hood bán #1 với $100/năm) → cam kết không bán thứ hạng + phương pháp minh bạch là thông điệp chiếm lòng tin. (3) Đối thủ chỉ phủ "top few" và thành phố lớn — seed từ toàn bộ dữ liệu TDLR/TSBPE phủ được thợ nhỏ + thành phố nhỏ (long-tail mà không ai có).
**Cảnh báo:** ContractorsRanked.com — đối thủ mới nổi nguy hiểm nhất: đã xếp hạng 647 thợ điện Houston + 766 Dallas theo "CR Score", "0 paid placements", và công khai rằng điểm hiện tại "based on 8 of 10 factors; credentials and recency not yet collected" — **họ đã có ý định thu thập credentials nhưng chưa làm**. Cửa sổ chiếm vị trí "verified" vẫn mở nhưng không lâu. Cần deep profile riêng đợt sau.

## 3. Mô hình thu — kiểm chứng

**AdSense: KHÔNG khả thi làm nguồn thu chính giai đoạn đầu** (VERIFIED):
- Chính sách AdSense cấm quảng cáo trên nội dung "low-value" và "automatically generated content without manual review or curation" — đúng hồ sơ trang profile/thành phố tạo tự động. Chính sách "Replicated content" cấm nội dung sao chép từ nguồn khác không có giá trị gia tăng.
- RPM: Home & Garden Americas $13,37 (Google công bố); site Home/DIY điển hình $6,18 (Pubsleuth); site mới thường $1–$5; trung vị toàn bộ AdSense $2,38.
- Ở 5.000 lượt/tháng: **$10–$67/tháng**. Ngưỡng thanh toán $100 → mất 1,5–10 tháng mới nhận khoản đầu tiên. Để AdSense một mình đạt $1.000/tháng cần **~75.000–500.000 pageviews/tháng**.
**Featured placement:** mức $49–149/tháng của playbook **cao hơn nhiều** so với directory nhỏ cùng loại (Best in Hood bán #1 với $100/năm ≈ $8/tháng). Mức đó ngang Yelp/BBB — nền tảng đã có thương hiệu + traffic. Mốc $1.000/tháng cần ~20 placement × $49/th hoặc ~7 × $149/th — khả thi về số học nhưng điều kiện tiên quyết là traffic + bằng chứng giá trị, chưa có ở tháng 1–6. TurnkeyDirectories: directory thường mất 12–18 tháng mới có lãi đáng kể.
**Đề xuất (INFERRED):** freemium listing + featured placement giá thấp ban đầu ($10–$30/th hoặc $75–$150/năm/placement), tăng giá khi traffic tăng; AdSense chỉ là thu phụ sau khi có nội dung gốc đủ mạnh để được duyệt. Thợ Texas thực sự sẵn sàng trả bao nhiêu: UNVERIFIED — cần khảo sát/gọi điện.

## 4. Pháp lý (đọc trực tiếp 8 nguồn, 24/11/2026)

- **Tái xuất bản dữ liệu TDLR được phép với 4 điều kiện** (VERIFIED — TDLR Website Policies §D): trình bày không gây hiểu lầm; không ngụ ý được bang chứng thực; phải ghi rõ cơ quan nguồn + URL + ngày copy + câu tuyên bố không được bang chứng thực. **Cấm dùng logo TDLR khi chưa có phép.** TSBPE và CSLB: chỉ có disclaimer về độ chính xác, không có điều kiện tái sử dụng nào trên các trang đã đọc; ca.gov coi thông tin là public domain.
- **⚠️ licfile.asp KHÔNG có file thợ điện/HVAC** (VERIFIED) — hai nghề trọng tâm phải lấy qua API Socrata trên data.texas.gov, mà điều khoản của kênh đó **chưa đọc** (UNVERIFIED — việc đầu tiên của đợt 2).
- **SMS marketing là rủi ro pháp lý lớn nhất** (VERIFIED — TCPA §227(b) + trang luật sư): không có miễn trừ B2B tổng quát; số công khai không phải là consent; marketing text tự động cần prior express written consent; phạt **$500–$1.500/tin**. Thợ đa số là sole proprietor dùng số di động cá nhân. Thêm Texas **SB 140 (hiệu lực 1/9/2025)**: marketing text vào luật telephone solicitation TX, có thể phải đăng ký với TX Secretary of State. Chỉ tin nhắn gõ tay từng tin, không autodialer, mới nằm ngoài §227(b). → **Kế hoạch "SMS mời claim hàng loạt" phải bỏ hoặc làm lại hoàn toàn.**
- **Top 3 trả phí phải gắn nhãn riêng từng listing** (VERIFIED — FTC Native Advertising Guide): đặt trước/trên headline, kèm dấu hiệu trực quan (shading/border), lặp lại disclosure trên trang profile thợ. Một dòng giải thích chung là không đủ. Từ được FTC nêu: "Ad", "Advertisement", "Paid Advertisement", "Sponsored Advertising Content"; cấm "Promoted". **"Sponsored" đứng một mình không nằm trong danh sách** — cần luật sư xác nhận.
- Lưu ý thêm: TDLR đã chủ động ẩn SĐT/địa chỉ cá nhân khỏi giao diện tra cứu — tái xuất bản SĐT di động của thợ sole proprietor có rủi ro khiếu nại riêng (INFERRED, cần luật sư đánh giá).
- *Đây là tổng hợp thông tin công khai, không phải tư vấn pháp lý; cần luật sư review trước khi launch.*

## 5. Stack — kết luận: tái dùng kiến trúc FarmDirect

- **FarmDirect (Next.js 14 SSR + Supabase + GoDaddy):** đã SSR live 17.087 farm profiles kèm JSON-LD; sitemap single-file 17.209 URLs; ETL dry-run → live đã nạp 17.097 bản ghi thật; pattern tái dùng được: profile SSR, mesh nearby, thin-page rule, pagination SSR (VERIFIED — audit 23/11).
- **Google AI Studio: KHÔNG dùng làm production** (VERIFIED — đọc 4 trang docs chính thức: **không trang nào nhắc tới SSR, SSG, prerendering, sitemap hay SEO**; tìm "SSR" = 0 kết quả; mặc định suy luận là React client-rendered qua Vite). Custom domain chỉ có trên paid GCP project (~$14,40/năm tối thiểu: domain $12 + DNS $2,40) và hiện không chuyển domain ngoài vào được → **vi phạm quy tắc $0**. Starter Tier giới hạn 2 app, 1 region, loại trừ tài khoản Workspace. Firestore NoSQL mặc định; Supabase chỉ qua kết nối mạng tự cấu hình, chưa có direct storage support. Điểm cộng duy nhất: export code tốt (GitHub two-way sync + ZIP) → dùng làm prototyping/demo rồi port UI sang Next.js.
- **Bài học FarmDirect phải áp dụng từ ngày đầu:** SSR 100% trang public, kiểm chứng bằng `curl` (không JS) trước mỗi deploy; sitemap single-file ổn định từ đầu (không restructure giữa chừng — trùng với đợt sụp đổ index 17/11); internal linking sâu 3 tầng, không cap 9 link/trang; 404 thật cho URL rỗng; thin-page rule từ đầu (chỉ ~10% dòng TDLR có SĐT).
- UNVERIFIED: Supabase free tier hiện tại có đủ cho thêm 30k–100k hồ sơ không; số hồ sơ TX thực tế sau lọc (cần dry-run ETL).

---

## KẾ HOẠCH 90 NGÀY (wedge-first)

| Giai đoạn | Việc | Gate |
|---|---|---|
| Ngày 1–30 | Tool Verify License TX (điện + HVAC qua API Socrata TDLR, nước qua CSV TSBPE) + trang trụ cột "how to verify contractor license Texas" + 3 guide nghề (điện/nước/HVAC) + trang "Texas không cấp phép GC" + 5–10 trang San Antonio | Tool chạy thật trên dữ liệu thật; toàn bộ trang SSR, kiểm chứng bằng curl |
| Ngày 31–60 | 10 guide còn lại (TACL, RMP, Q&A, report unlicensed) + trang Dallas/Houston/Austin + 20–30 trang thành phố nhỏ (≥5 nhà thầu active) | Index batch đầu >80% (kiểm tra GSC); impression tăng đều |
| Ngày 61–90 | Claim listing (xác minh qua SĐT — gọi tay, KHÔNG SMS hàng loạt) + 10–15 bài cost guide + đo lường, quyết định scale hay dừng | Impression tăng 4 tuần liên tiếp + tool có traffic organic → mới scale lên full directory |

**Không làm trong 90 ngày:** AdSense (chưa đủ traffic + rủi ro policy), bán Top 3 (chưa có bằng chứng giá trị), SMS marketing hàng loạt, mở rộng sang California.

## QUYẾT ĐỊNH CẦN OWNER (1–2 ngày tới)

1. **GO / NO-GO** cho wedge 90 ngày (đề xuất: GO có điều kiện như trên).
2. **Texas** (đề xuất) hay California? Texas có API + CSV sẵn; CA dữ liệu sạch nhưng phải tải tay, chưa nghiên cứu CCPA.
3. **Stack FarmDirect** (đề xuất) hay thử AI Studio? Cần anh Út duyệt vì tái dùng kiến trúc + deploy.
4. **Tên miền + repo:** user đang tạo repo GitHub — chốt tên miền riêng cho dự án (không dùng subdomain hubercenter để tránh trộn thương hiệu thuế? — đề xuất, cần Owner quyết).

## VIỆC CHƯA RÕ — đợt 2

- Điều khoản data.texas.gov / Socrata API (kênh lấy dữ liệu điện/HVAC) — ưu tiên cao nhất.
- Google Trends cho 5 từ khóa trụ cột + 4 từ khóa INFERRED cần truy vấn trực tiếp (cần live browser).
- Deep profile ContractorsRanked.com (pricing/monetization chưa kiểm tra).
- Dry-run ETL: số hồ sơ TX thực tế sau lọc business-only; Supabase free tier có đủ không.
- Luật sư: nhãn "Sponsored" đơn độc; SB 140 có phải đăng ký không; tái xuất bản SĐT cá nhân; CCPA nếu mở rộng CA.
- Thợ Texas sẵn sàng trả bao nhiêu cho featured placement (cần khảo sát/gọi điện — ngoài phạm vi nghiên cứu $0).
