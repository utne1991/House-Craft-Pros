# Báo cáo định hướng — Danh bạ thợ sửa chữa Hoa Kỳ (MVP Texas)

**Ngày:** 24/11/2026 · **Nguồn:** số liệu tải trực tiếp từ TDLR/TSBPE + nghiên cứu đợt 1 (5 hướng, 30 SERP đọc trực tiếp)
**File nghiên cứu đầy đủ:** `~/workspace/trades-directory/research/research-batch-1.md` + `data-findings-2026-11-24.md`

---

## Đề xuất: GO CÓ ĐIỀU KIỆN — wedge-first 90 ngày, Texas, stack FarmDirect

**Không GO** cho full directory 100k hồ sơ ngay từ đầu. Điều kiện GO:
1. Bắt đầu bằng tool verify license + guide, đo index thật 90 ngày rồi mới scale.
2. Không SMS marketing hàng loạt (rủi ro pháp lý).
3. Không kỳ vọng doanh thu trước tháng 9.
4. Dữ liệu lấy từ CSV chính thức của bang (đã tải + phân tích xong), không phải API Socrata.

---

## 1. Số liệu dữ liệu Texas — đã tải và phân tích trực tiếp

| Nghề | Giấy phép doanh nghiệp còn hiệu lực | SĐT | Địa chỉ + thành phố |
|---|---|---|---|
| Electrical Contractor (TDLR) | ~12.320 | 100% | 100% |
| A/C Contractor — HVAC (TDLR) | ~19.087 | **0%** | **0% (chỉ có county)** |
| Responsible Master Plumber (TSBPE) | 8.743 | 50% | Có (100% tên công ty) |
| **Tổng** | **~40.150** | — | **~21.000 đủ dữ liệu đầy đủ** |

- File CSV nào cũng lẫn giấy phép hết hạn (7–12%) → phải lọc theo ngày hết hạn / trạng thái.
- API Socrata (data.texas.gov) chỉ có 9 trường, không có SĐT/địa chỉ/thành phố → chỉ dùng đếm số + xác minh, không làm được danh bạ.
- **Hệ quả:** HVAC là nghề lớn nhất nhưng chỉ làm được trang cấp county từ dữ liệu bang. Trang thành phố + nút gọi trực tiếp chỉ khả thi cho điện + ống nước (~21k hồ sơ). Đây là giới hạn dữ liệu thật, không phải do mình làm thiếu.

**Đính chính 1 điểm trong nghiên cứu đợt 1:** nhóm nghiên cứu báo "licfile.asp không có file thợ điện/HVAC, phải lấy qua API Socrata" — **sai**. Muse đã tải trực tiếp 2 file đó từ licfile.asp (Lteecele.csv 14.067 dòng, ltairref.csv 20.497 dòng). Kênh CSV là chính, điều khoản của nó chính là TDLR Website Policies §D (đã đọc). Socrata chỉ là kênh phụ.

---

## 2. Khe hở thị trường — verify-license là thật, cửa sổ hẹp

- **30 SERP quanh "verify/check license Texas": top 5 không có ông lớn nào** (không Angi/Yelp/HomeAdvisor/BBB). Chỉ có trang .gov khó dùng + blog thợ nhỏ + vài site niche mỏng.
- **Chưa site nào có tool verify chạy thật trên dữ liệu TDLR/TSBPE cho homeowner.** Site gần nhất (HomeClip) viết sai về TACLA/TACLB, chưa làm ống nước, có paywall.
- **Cảnh báo:** ContractorsRanked.com đã xếp hạng 647 thợ điện Houston + 766 Dallas theo "CR Score", cam kết "0 paid placements", và công khai ý định thu thập credentials (chưa làm). Cửa sổ chiếm vị trí "danh bạ đã xác minh" vẫn mở nhưng không lâu.
- **San Antonio là thành phố mở màn tốt nhất:** metro lớn thứ 2 Texas nhưng SERP loãng nhất (top 5 truy vấn HVAC không có guide nào).
- Đối thủ hiện tại đều bán được vị trí (Best in Hood bán #1 chỉ $100/năm; ConsumerAffairs thừa nhận tiền ảnh hưởng thứ hạng) → cam kết "không bán thứ hạng + phương pháp minh bạch" là thông điệp chiếm lòng tin. Yelp đã khóa tính năng xác minh giấy phép sau paywall $270/tháng — chứng minh tính năng này có giá trị thương mại.
- Không tấn công sớm các từ khóa navigational về tool .gov (TDLR license search, TECL lookup) — không thắng được #1.

---

## 3. Mô hình thu — playbook không đứng vững, phải chỉnh

- **AdSense không khả thi làm nguồn thu chính:** ở 5.000 lượt/tháng chỉ **$10–67/tháng**; ngưỡng thanh toán $100 phải chờ 1,5–10 tháng; muốn $1.000/tháng riêng AdSense cần 75.000–500.000 pageviews/tháng. Chính sách AdSense cấm quảng cáo trên nội dung tạo tự động không qua review — đúng dạng trang profile template.
- **Giá featured placement thực tế thấp hơn nhiều:** Best in Hood bán #1 với $100/năm (~$8/tháng); TrustAnalytica $16–66/tháng. Mức $49–149/tháng của playbook ngang Yelp/BBB — nền tảng đã có thương hiệu + traffic. Mốc $1.000/tháng cần ~20 placement × $49 — khả thi về số học nhưng chỉ sau khi có traffic + bằng chứng giá trị (tháng 9–12).
- **Đề xuất:** freemium listing + featured placement giá thấp ban đầu ($10–30/tháng hoặc $75–150/năm), tăng giá khi traffic tăng; AdSense chỉ là thu phụ sau này. Thợ Texas sẵn sàng trả bao nhiêu: chưa kiểm chứng — cần khảo sát/gọi điện.

---

## 4. Pháp lý — được phép tái xuất bản, nhưng 2 việc phải bỏ/đổi

- **Tái xuất bản dữ liệu TDLR được phép với 4 điều kiện** (TDLR Website Policies §D): trình bày không gây hiểu lầm; không ngụ ý được bang chứng thực; ghi rõ cơ quan nguồn + URL + ngày copy + câu tuyên bố không được bang chứng thực; **cấm dùng logo TDLR khi chưa có phép**.
- **BỎ kế hoạch SMS mời claim hàng loạt:** TCPA không có miễn trừ B2B, số công khai không phải consent, phạt **$500–1.500/tin**; thêm luật Texas SB 140 (từ 1/9/2025) có thể bắt đăng ký với TX Secretary of State. Claim phải làm qua gọi điện tay hoặc kênh khác.
- **Top 3 trả phí phải gắn nhãn riêng từng listing** (FTC Native Advertising Guide): đặt trước/trên headline, kèm dấu hiệu trực quan, lặp lại disclosure trên trang profile. Từ "Sponsored" đứng một mình chưa chắc đủ chuẩn — cần luật sư xác nhận.
- Lưu ý: TDLR đã chủ động ẩn SĐT/địa chỉ cá nhân khỏi giao diện tra cứu — tái xuất bản SĐT di động của thợ sole proprietor có rủi ro khiếu nại (cần luật sư đánh giá trước launch).
- *Đây là tổng hợp thông tin công khai, không phải tư vấn pháp lý.*

---

## 5. Stack — tái dùng FarmDirect, không dùng AI Studio làm production

- **FarmDirect (Next.js 14 SSR + Supabase):** đã SSR live 17.087 farm profiles + JSON-LD, sitemap single-file 17.209 URL, ETL đã nạp 17.097 bản ghi thật. Pattern tái dùng được: profile SSR, mesh nearby, thin-page rule, pagination SSR.
- **Google AI Studio không dùng làm production:** docs chính thức không nhắc tới SSR/SSG/sitemap/SEO (tìm "SSR" = 0 kết quả), mặc định là React client-rendered — đúng lỗi đã giết khả năng khám phá của FarmDirect. Custom domain bắt buộc paid GCP project (~$14,40/năm) → vi phạm quy tắc $0. Chỉ dùng AI Studio để prototype/demo rồi port UI sang Next.js.
- **Bài học FarmDirect áp dụng từ ngày đầu:** SSR 100% trang public, kiểm chứng bằng curl (không JS) trước mỗi deploy; sitemap single-file ổn định từ đầu (không restructure giữa chừng); internal linking sâu 3 tầng, không cap 9 link/trang; 404 thật cho URL rỗng; thin-page rule từ đầu.

---

## 6. Kế hoạch 90 ngày (wedge-first)

| Giai đoạn | Việc | Gate |
|---|---|---|
| Ngày 1–30 | Tool Verify License TX (điện + HVAC + nước, dữ liệu CSV bang nạp vào Supabase) + trang trụ cột "how to verify contractor license Texas" + 3 guide nghề + trang "Texas không cấp phép nhà thầu tổng hợp" + 5–10 trang San Antonio | Tool chạy thật trên dữ liệu thật; toàn bộ trang SSR, kiểm chứng bằng curl |
| Ngày 31–60 | 10 guide còn lại (TACL, RMP, Q&A, report unlicensed) + trang Dallas/Houston/Austin + 20–30 trang thành phố nhỏ (≥5 nhà thầu còn hiệu lực) | Index batch đầu >80% (kiểm tra GSC); impression tăng đều |
| Ngày 61–90 | Claim listing (xác minh qua SĐT — gọi tay, KHÔNG SMS) + 10–15 bài cost guide + đo lường, quyết định scale hay dừng | Impression tăng 4 tuần liên tiếp + tool có traffic organic → mới scale lên full directory |

**Không làm trong 90 ngày:** AdSense, bán Top 3, SMS marketing hàng loạt, mở rộng sang California.

---

## 7. Quyết định cần Owner

1. **GO / NO-GO** cho wedge 90 ngày (đề xuất: GO có điều kiện như trên).
2. **Texas** (đề xuất) hay California? Texas có CSV + API sẵn; CA dữ liệu sạch nhưng phải tải tay, chưa nghiên cứu CCPA.
3. **Stack FarmDirect** (đề xuất) hay thử AI Studio? Tái dùng kiến trúc + deploy cần anh Út duyệt.
4. **Tên miền + repo:** repo anh đang tạo — chốt tên miền riêng cho dự án (đề xuất không dùng subdomain hubercenter để tránh trộn thương hiệu thuế).

## 8. Việc chưa rõ — đợt 2 (sau khi Owner quyết GO)

- Deep profile ContractorsRanked.com (pricing/monetization chưa kiểm tra).
- Google Trends cho 5 từ khóa trụ cột (cần live browser).
- Dry-run ETL: số hồ sơ TX thực tế sau lọc business-only; Supabase free tier có đủ không.
- Luật sư: nhãn "Sponsored" đơn độc; SB 140 có phải đăng ký không; tái xuất bản SĐT cá nhân.
- Thợ Texas sẵn sàng trả bao nhiêu cho featured placement (cần khảo sát/gọi điện).
