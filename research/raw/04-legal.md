# 04 — Ghi chú pháp lý thô — Danh bạ thợ sửa chữa Hoa Kỳ (MVP Texas)

**Ngày đọc tất cả nguồn: 24/11/2026.** Phương pháp: đọc trực tiếp qua browser.open / browser.search, nguồn miễn phí, không đăng ký, không liên hệ ai.
Nhãn: **VERIFIED** = đã đọc trực tiếp, kèm nguồn + ngày · **INFERRED** = suy luận, nêu cơ sở · **UNVERIFIED** = chưa kiểm chứng được.

---

## 1. TDLR — tái sử dụng dữ liệu giấy phép Texas

### 1a. Trang tải file — https://www.tdlr.texas.gov/licenseSearch/licfile.asp
- **VERIFIED (đọc 24/11/2026):** Trang chỉ là danh sách link tải file theo nghề (Tow Truck, Massage Therapists, Podiatrists, Solar…), **không có bất kỳ điều khoản, disclaimer hay điều kiện tái sử dụng nào trên chính trang này.**
- **VERIFIED (đọc 24/11/2026):** Danh sách file trên trang này **KHÔNG thấy mục Electricians (thợ điện) hay Air Conditioning/HVAC** — hai nghề trọng tâm của MVP. Chỉ có các chương trình dạng "Versa" và "Certificate".
- **INFERRED:** File thợ điện/HVAC có thể nằm ở kênh khác (API Socrata trên data.texas.gov — đã được ghi nhận trong nghiên cứu dữ liệu trước đó). **UNVERIFIED:** điều khoản sử dụng của data.texas.gov / Socrata API — chưa đọc trong đợt này, cần kiểm tra riêng trước khi dùng API làm nguồn chính.

### 1b. Trang Website Policies — https://www.tdlr.texas.gov/disclaimer.htm (đọc 24/11/2026)
Đây là nơi chứa điều kiện tái sử dụng thật sự của TDLR.

**Mục "Requirements Applicable to Those Linking to State Agency Web Sites", phần (D) "Copying and Use of Information by Web Site Owners Linking to State Agency Sites" — VERIFIED, trích nguyên văn ý chính:**
> "The information posted on a state agency web site may be copied so long as it is presented in a non-misleading way and does not imply that either the site owner or the information, as it is presented on the site owner's web site, is endorsed by the State. Use of the information must identify the state agency that is the source of the information, its web address, the date the information was copied from the state agency's web site by the site owner and must be accompanied by a statement that neither the site owner nor the information, as it is presented on the site owner's web site, is endorsed by the State or any state agency."

Điều kiện tái sử dụng (VERIFIED):
1. Trình bày **không gây hiểu lầm** (non-misleading).
2. **Không ngụ ý** rằng website hay dữ liệu được bang Texas/TDLR chứng thực (endorsed).
3. **Phải ghi rõ:** cơ quan nguồn (TDLR), địa chỉ web của cơ quan, **ngày copy dữ liệu**, và **câu tuyên bố rằng không được bang chứng thực**.
4. Không được thu phí truy cập/sử dụng/tái xuất bản thông tin trên web cơ quan bang (trừ khi cơ quan lập pháp Texas cho phép) — áp cho phía cơ quan, không phải cho mình, nhưng cho thấy dữ liệu là công khai miễn phí.

**Phần (B) — những điều chủ web KHÔNG được làm khi link tới web cơ quan bang (VERIFIED):**
- Không được "capture" trang của cơ quan bang trong frame của mình; không được trình bày nội dung của cơ quan bang như là của mình; không xuyên tạc nội dung hay nguồn gốc.
- "all agency content is protected by federal copyright laws" — nội dung được bảo vệ bởi luật bản quyền liên bang; việc dùng tài sản trí tuệ được bảo vệ phải tuân theo luật liên bang/bang và phải phản ánh quyền sở hữu của cơ quan.
- Không nên link trực tiếp tới từng graphic/table trong trang cơ quan bang (gánh tải server); muốn dùng graphic của cơ quan thì liên hệ xin phép.

**Mục Copyright Statement (VERIFIED):** Bản hiện tại **chỉ hạn chế logo**: "No one may use any TDLR logo without permission from the agency." TDLR không cấp phép dùng logo cho licensee hay tổ chức chịu sự quản lý của TDLR (nguy cơ gây nhầm lẫn là được cơ quan chứng thực).
- **Lưu ý về bản cũ:** Một PDF lưu trữ năm 2011 (agriculturedefensecoalition.org) của cùng trang chính sách này có câu "contents of all material… are copyrighted… TDLR grants permission to copy and distribute… provided that they are copied and distributed without alteration and in the format provided." **Bản hiện tại đọc ngày 24/11/2026 KHÔNG còn câu này.** Không dùng bản 2011 làm căn cứ; bản hiện tại là chuẩn.

**Mục Disclaimer (VERIFIED):** TDLR "makes no representations, guarantees, or warranties as to the accuracy, completeness, currency, or suitability of the information" và từ chối mọi trách nhiệm về thiệt hại phát sinh từ thông tin trên web TDLR.

**Mục Operation Safeguard Policy (VERIFIED):**
- Thông tin licensee **là công khai theo Texas Public Information Act**: Name, Address, Phone Number.
- Thông tin **KHÔNG công khai**: Social Security Number, Driver License Number, **Email addresses**, Fingerprints.
- TDLR **không bán** thông tin cá nhân cho bên thứ ba, nhưng phải cung cấp khi có Public Information Request.
- TDLR đã ẩn địa chỉ/SĐT của hầu hết licensee cá nhân khỏi công cụ tìm kiếm online (chỉ hiện loại giấy phép, số giấy phép, ngày hết hạn, county) — nhưng dữ liệu vẫn có trong database/file tải về và phải tiết lộ khi được yêu cầu theo Public Information Act.
- **INFERRED:** Việc TDLR chủ động ẩn địa chỉ/SĐT cá nhân khỏi giao diện tra cứu cho thấy cơ quan nhạy cảm với dữ liệu liên hệ cá nhân, dù dữ liệu đó vẫn là public record. Dự án tái xuất bản SĐT/địa chỉ (đặc biệt của thợ cá nhân, sole proprietor) nên cân nhắc rủi ro khiếu nại/takedown ngay cả khi dữ liệu là công khai — cần luật sư đánh giá, không tự kết luận.

**Kết luận mục 1:** Không có lệnh cấm tái xuất bản dữ liệu TDLR; được copy với 4 điều kiện ở phần (D) (không gây hiểu lầm, không ngụ ý chứng thực, ghi nguồn + URL + ngày copy + tuyên bố không chứng thực). Cấm dùng logo TDLR khi chưa có phép. Không có yêu cầu "không dùng thương mại" hay "phải cập nhật định kỳ" trong chính sách đã đọc — **UNVERIFIED** liệu có điều kiện nào khác nằm ngoài trang này (vd. điều khoản riêng của API Socrata).

---

## 2. TSBPE — Free Licensee List (thợ ống nước Texas)

### Trang https://tsbpe.texas.gov/free-licensee-list/ (đọc 24/11/2026)
- **VERIFIED:** Trang cung cấp 6 file CSV tải miễn phí, cập nhật hàng ngày (Responsible Master Plumber, Master Plumber, Journeyman, Tradesman-Limited, Apprentice, Plumbing Inspectors). Ghi rõ RMP list chứa "last known company name associated with the Licensee".
- **VERIFIED — toàn bộ mục "Terms of Use" trên trang (chỉ có disclaimer, không có điều kiện tái sử dụng):**
> "All files downloaded are subject to the terms of this disclaimer below: The Texas State Board of Plumbing Examiners maintains this web site to enhance public access to the Board's information. This is a service that is continually under development. While we try to keep the information timely and accurate, we make no guarantees. We will make an effort to correct errors brought to our attention. The data are current as of the previous work day."
- **VERIFIED:** Trên trang này **không có** lệnh cấm tái xuất bản, không yêu cầu ghi nguồn, không cấm dùng thương mại, không yêu cầu cập nhật định kỳ.
- **UNVERIFIED:** TSBPE có thể có trang chính sách website toàn cục khác (privacy/terms) ngoài trang này — chưa kiểm tra trong đợt này. Ngoài ra, với tư cách cơ quan bang Texas, chính sách "Linking to State Agency Web Sites" kiểu TDLR có thể cũng áp dụng cho TSBPE nhưng **chưa đọc được văn bản tương đương của TSBPE** — không suy đoán.

---

## 3. CSLB — California (mở rộng sau MVP)

### 3a. CSLB Public Data Portal — https://www.cslb.ca.gov/onlineservices/dataportal/Default (đọc 24/11/2026)
- **VERIFIED:** Trang chỉ liệt kê 5 lựa chọn truy cập dữ liệu (theo classification/county, theo classification, master list, theo city/ZIP, instant license check). **Không có điều khoản hay disclaimer tái sử dụng nào trên trang này.**

### 3b. Master List — https://www.cslb.ca.gov/onlineservices/dataportal/ContractorList.aspx (đọc 24/11/2026)
- **VERIFIED:** Master list gồm 3 file (license master, workers' comp, personnel); chỉ bao gồm license đang còn hiệu lực hoặc hết hạn nhưng còn gia hạn được (trong 5 năm); **không bao gồm** license đã bị cancelled, revoked, hoặc hết hạn không gia hạn được.
- **VERIFIED:** Thông tin gồm license number, business name, address, telephone number, license status, issue/expiration dates, classification(s), bond, workers' comp.
- **VERIFIED:** "**NOTE: Email addresses are not provided** (Business & Professions Code Section 27)."
- **VERIFIED — Disclaimer duy nhất trên trang:** "The information provided is current as of the date reflected below the download file link. Changes to license status can occur at any time. To verify the most current status of a license, please visit our Instant License Check feature."
- **VERIFIED:** "There is no charge for this service." Không có điều khoản cấm tái xuất bản hay yêu cầu ghi nguồn trên trang master list.

### 3c. Điều kiện sử dụng toàn bang California — https://www.ca.gov/use/ (đọc 24/11/2026)
- **VERIFIED — mục Ownership, trích nguyên văn:**
> "In general, information presented on this website, unless otherwise indicated, is considered in the public domain. It may be distributed or copied as permitted by law. However, the State does make use of copyrighted data (e.g., photographs) which may require additional permissions prior to your use. In order to use any information on this website not owned or created by the State, you must seek permission directly from the owning (or holding) sources."
- **VERIFIED:** Trang này **không nêu điều kiện ghi nguồn (attribution)**.
- **VERIFIED:** Trang này cũng ghi: "Each department within the State may have additional privacy and use policies specific to the mission and needs of their work."
- **INFERRED (cơ sở: trang data-credits của doineedaplumber.org, đọc qua kết quả tìm kiếm 24/11/2026):** Link "Conditions of Use" ở footer cslb.ca.gov trỏ thẳng tới https://www.ca.gov/use/ — tức CSLB dùng chung chính sách toàn bang, không có trang điều kiện riêng. **UNVERIFIED:** tôi chưa tự mở footer cslb.ca.gov để xác nhận link này; đây là khẳng định của bên thứ ba.
- **UNVERIFIED:** CSLB có chính sách bổ sung riêng về dữ liệu license hay không — chưa tìm thấy trang điều kiện riêng của CSLB qua tìm kiếm ngày 24/11/2026.
- **Lưu ý bối cảnh (từ kết quả tìm kiếm, chưa đọc trực tiếp văn bản):** Một số cơ quan California khác (vd. State Parks) có điều khoản cấm copy/republish ngoài fair use và giữ toàn bộ quyền thương mại — nhưng đó là chính sách riêng của từng cơ quan, **không áp dụng suy diễn sang CSLB**.

---

## 4. TCPA — SMS marketing tới doanh nghiệp/thợ

### Nguồn chính đã đọc trực tiếp
- **Luật sư Jonathan Francis (Illinois), trang "SMS Marketing Compliance Lawyer"** — https://www.jfrancislaw.com/sms-marketing-compliance (đọc 24/11/2026; trang tự ghi "general information, not legal advice").
- **Kết quả tìm kiếm (chưa mở full trang):** LeadCompliant, fransis.ai, Plura AI về TCPA B2B; Consumer Action "A Small Business's Guide to the TCPA" (PDF, consumer-action.org). Các điểm dưới đây lấy từ trang luật sư đã đọc trực tiếp, trừ khi ghi chú khác.

### Quy tắc liên bang (VERIFIED từ trang luật sư, đọc 24/11/2026)
- TCPA, 47 U.S.C. § 227: hai phần liên quan tới text — § 227(b) hạn chế cuộc gọi/text dùng autodialer (ATDS) hoặc giọng ghi sẵn/nhân tạo; § 227(c) là cơ sở cho National Do Not Call Registry và quy tắc giờ gọi. Quy định FCC tại 47 C.F.R. § 64.1200.
- **"Prior express written consent" (đồng ý trước bằng văn bản) là bắt buộc đối với marketing text gửi bằng công nghệ tự động**: thỏa thuận viết có chữ ký (checkbox online hoặc reply keyword có thể đủ chuẩn), nêu tên doanh nghiệp gửi, cho phép gửi marketing tới một số cụ thể, và nói rõ đồng ý không phải điều kiện mua hàng. Định nghĩa tại 47 C.F.R. § 64.1200(f)(9); chữ ký điện tử được tính.
- **Mức phạt: $500/tin nhắn, tới $1,500/tin nếu vi phạm cố ý (willful/knowing)** — 47 U.S.C. § 227(b)(3), (c)(5). Có quyền kiện tư (private right of action); không có trần tổng thiệt hại.
- **Facebook, Inc. v. Duguid, 592 U.S. 395 (2021):** thiết bị chỉ là autodialer nếu có thể lưu trữ/tạo số bằng bộ sinh số ngẫu nhiên hoặc tuần tự. Gửi tới danh sách số do khách tự cung cấp thì khó bị kiện theo diện autodialer hơn — nhưng **không làm chương trình an toàn**: Do Not Call, quiet-hours và nhiều luật bang không phụ thuộc vào định nghĩa autodialer.
- **Quy tắc "one-to-one" consent của FCC (2023) đã bị Tòa 11th Circuit hủy ngày 24/1/2025** (Insurance Marketing Coalition Ltd. v. FCC) trước khi có hiệu lực; chuẩn written-consent cũ vẫn là luật liên bang hiện hành.
- **Opt-out (từ 11/4/2025):** phải tôn trọng yêu cầu dừng gửi bằng **bất kỳ phương thức hợp lý nào** (reply "stop", "quit", "end", "revoke", "opt out", "cancel", "unsubscribe"…), trong vòng **10 ngày làm việc**. Không được ép chỉ dùng một keyword duy nhất. Quy tắc mới của FCC (có hiệu lực 25/11/2026) cho phép chỉ định một phương thức opt-out độc quyền nếu công bố rõ trong mỗi tin nhắn; quy tắc "revoke-all" bị hoãn tới 31/1/2027 và đang được thay thế.
- **Quiet hours liên bang:** cấm marketing call/text trước 8h sáng hoặc sau 9h tối theo giờ địa phương của người nhận (47 C.F.R. § 64.1200(c)(1)).
- **10DLC registration:** nhà mạng yêu cầu doanh nghiệp đăng ký brand + campaign khi nhắn từ số 10 chữ số; tin không đăng ký bị lọc/chặn. Đây không phải luật mà là yêu cầu của nhà mạng/CTIA.

### TCPA có áp dụng cho SMS tới doanh nghiệp/thợ không? (VERIFIED từ kết quả tìm kiếm đã đọc snippet + trang luật sư)
- **Không có miễn trừ B2B tổng quát cho § 227(b):** Điều cấm dùng ATDS/giọng ghi sẵn gọi tới số di động áp dụng theo **loại số (wireless number)**, không theo người nhận là consumer hay business. "Business cell phones are cell phones" (LeadCompliant, đọc qua snippet 24/11/2026). Một số điện thoại di động đăng ký dưới tên cá nhân — dù chỉ dùng cho công việc — gần như chắc chắn được coi là số residential/personal theo TCPA.
- **Miễn trừ B2B hẹp chỉ tồn tại cho Do Not Call:** Quy tắc DNC của FCC nhắm tới residential subscribers; số đăng ký cho doanh nghiệp về nguyên tắc nằm ngoài DNC. Nhưng FCC có giả định (presumption) rằng số wireless được coi là residential cho mục đích DNC; và miễn trừ B2B theo FCC 1992 chỉ áp cho cuộc gọi tới đường dây của business subscriber, tới nhân viên đang làm nhiệm vụ, khi đã có quan hệ kinh doanh trước đó (prior business relationship).
- **Số điện thoại công khai trên website/danh bạ KHÔNG phải là consent** để nhận autodialed text (Plura AI / fransis.ai, snippet 24/11/2026).
- **Tin nhắn gõ tay, từng tin một, không dùng autodialer và không có nội dung ghi sẵn** nằm ngoài hạn chế cốt lõi của § 227(b) — nhưng DNC và luật bang vẫn có thể áp dụng (Consumer Action guide; fransis.ai, snippet 24/11/2026).
- **INFERRED (cơ sở các điểm trên):** Thợ sửa chữa đa số là sole proprietor / doanh nghiệp nhỏ, SĐT trong dữ liệu TDLR/TSBPE/CSLB rất thường là số di động cá nhân. Gửi SMS marketing hàng loạt (qua nền tảng) tới các số này mà không có prior express written consent là vùng rủi ro cao nhất của dự án. Việc số này "là dữ liệu công khai" không tạo ra consent.

### Luật bang Texas (VERIFIED từ trang luật sư, đọc 24/11/2026)
- **Texas SB 140 — từ 1/9/2025, luật telephone solicitation của Texas bao gồm cả marketing text.** Trừ khi thuộc diện miễn trừ (một số miễn trừ cho doanh nghiệp nhắn cho khách hàng hiện tại/cũ của mình, hoặc doanh nghiệp chủ yếu bán qua cửa hàng vật lý), doanh nghiệp nhắn marketing text cho cư dân Texas **có thể phải đăng ký với Texas Secretary of State**, và người tiêu dùng có thể kiện theo Texas Deceptive Trade Practices Act.
- **Giờ được phép ở Texas:** thứ Hai–thứ Bảy 9h sáng–9h tối, Chủ nhật trưa–9h tối (Tex. Bus. & Com. Code § 301.051). Điều luật này nói về "consumer telephone calls"; SB 140 không sửa nó; không áp cho tin nhắn người tiêu dùng đã yêu cầu hoặc khách hàng hiện tại — nhưng trang luật sư khuyên nên coi như nó bao gồm marketing text.
- **UNVERIFIED:** Liệu dự án (website danh bạ, chưa có quan hệ khách hàng với thợ) có thuộc diện phải đăng ký theo SB 140 hay không; và "khách hàng hiện tại/cũ" có bao gồm thợ đã claim listing hay không — cần luật sư Texas xác nhận.

---

## 5. FTC — nhãn Sponsored/disclosure cho vị trí trả phí (Top 3)

### Nguồn chính đã đọc trực tiếp
- **FTC, "Native Advertising: A Guide for Businesses"** — https://www.ftc.gov/tips-advice/business-center/guidance/native-advertising-guide-businesses (đọc toàn bộ 24/11/2026; hướng dẫn không chính thức của FTC staff, bổ sung cho Enforcement Policy Statement on Deceptively Formatted Advertisements, tháng 12/2015; trang tự ghi "Nor does it provide a safe harbor from potential liability under Section 5 of the FTC Act").

### Nguyên tắc (VERIFIED, đọc 24/11/2026)
- Theo FTC Act, hành vi là **deceptive** nếu có xuyên tạc hoặc bỏ sót thông tin quan trọng có khả năng gây hiểu lầm cho người tiêu dùng hợp lý. FTC xét **ấn tượng tổng thể (net impression)** của quảng cáo, không xét từng yếu tố riêng lẻ.
- **"A basic truth-in-advertising principle is that it's deceptive to mislead consumers about the commercial nature of content."** Quảng cáo/promotional message là deceptive nếu khiến người tiêu dùng hiểu (trực tiếp hay ngụ ý) rằng nó là độc lập, khách quan, hoặc từ nguồn khác ngoài nhà quảng cáo tài trợ — **bất kể các claim về sản phẩm trong đó có đúng sự thật hay không**.
- Ba điểm cốt lõi: (1) minh bạch — quảng cáo không được gợi ý nó là thứ gì khác ngoài quảng cáo; (2) một số native ad rõ ràng là thương mại thì có thể không cần disclosure; (3) nếu cần disclosure để tránh gây hiểu lầm thì disclosure **phải rõ ràng và nổi bật (clear and prominent)**.
- FTC xét: ngoại hình tổng thể của ad; mức độ giống format/phong cách/chủ đề của nội dung không phải quảng cáo xung quanh; mức độ phân biệt được với nội dung khác.
- **Ví dụ 8 trong Guide (gần nhất với danh bạ trả phí):** nếu cách trình bày headline/link khiến người tiêu dùng tin rằng nội dung được đưa vào/được ưu tiên dựa trên đánh giá độc lập của biên tập viên, chứ không phải vì nhà quảng cáo đã trả tiền, thì **không công bố bản chất trả phí một cách hiệu quả là deceptive**.
- **Trách nhiệm không chỉ thuộc về nhà quảng cáo:** FTC đã xử lý cả các bên khác tham gia tạo nội dung quảng cáo gây hiểu lầm (vd. ad agencies, operators of affiliate advertising networks). "Everyone who participates directly or indirectly in creating or presenting native ads should make sure that ads don't mislead consumers about their commercial nature."

### Cách disclosure phải làm (VERIFIED, Phần III của Guide, đọc 24/11/2026)
- Disclosure phải: dùng **ngôn ngữ rõ ràng, không mơ hồ**; **càng gần native ad càng tốt**; font và màu **dễ đọc**, độ tương phản mạnh với nền; rõ ràng trên **mọi thiết bị/nền tảng**.
- **Vị trí: đặt ngay trước hoặc ngay trên headline** của native ad ("immediately in front of or above a native ad's headline"). Đặt bên phải hoặc bên dưới làm tăng nguy cơ người dùng click mà không thấy disclosure.
- **Danh sách trộn quảng cáo + nội dung thường:** một disclosure chung cho cả nhóm là **không đủ** — "native ads should be individually labeled to make clear which content items are ads." Nếu dùng một disclosure cho nhiều ad thì cần thêm dấu hiệu trực quan (shading có viền rõ / border riêng) để thấy rõ disclosure áp cho từng ad.
- **Disclosure cũng cần trên trang click-into** (trang đích khi bấm vào ad), đặt càng gần nơi người dùng nhìn đầu tiên càng tốt (thường là headline).
- **Từ ngữ được FTC nêu là "likely to be understood": "Ad," "Advertisement," "Paid Advertisement," "Sponsored Advertising Content,"** hoặc biến thể.
- **FTC khuyên KHÔNG dùng "Promoted" hay "Promoted Stories"** — "at best ambiguous and potentially could mislead consumers that advertising content is endorsed by a publisher site."
- **"Presented by [X]," "Brought to You by [X]," "Promoted by [X]," "Sponsored by [X]"** — tùy ngữ cảnh, người tiêu dùng có thể hiểu là nhà tài trợ chỉ "funded/underwrote" mà không tạo ra hay ảnh hưởng nội dung.
- Logo/tên công ty đứng một mình **không đủ** để báo hiệu nội dung là quảng cáo thương mại. Phải dùng thuật ngữ nhất quán trên toàn site.
- **Lưu ý:** từ "Sponsored" đứng một mình **không nằm trong danh sách từ FTC nêu là "likely to be understood"** trong Guide này (danh sách có "Sponsored Advertising Content"). **UNVERIFIED** liệu nhãn "Sponsored" đơn độc có đủ chuẩn FTC hay không — cần luật sư xác nhận; lựa chọn an toàn hơn theo văn bản đã đọc là "Ad" / "Paid Advertisement" / "Sponsored Advertising Content".

### Nguồn bổ sung (đọc qua kết quả tìm kiếm, chưa mở full trang)
- **FTC Endorsement Guides (16 C.F.R. Part 255, sửa đổi 2023):** "material connection" (vd. quan hệ tiền bạc) giữa endorser và marketer phải được disclose rõ ràng và nổi bật, trừ khi đã rõ từ ngữ cảnh. (FTC warning letter vụ Teami LLC, 5/3/2020, ftc.gov.)
- **FTC Rule on the Use of Consumer Reviews and Testimonials (16 C.F.R. Part 465), có hiệu lực 21/10/2024:** cấm review/testimonial giả và cấm trả tiền cho review với điều kiện phải tích cực hoặc tiêu cực; vi phạm cố ý có thể bị phạt dân sự (civil penalties). (Revision Legal summary, đọc qua snippet 24/11/2026.) — **Liên quan nếu danh bạ hiển thị review/đánh giá thợ.**
- **Google (không phải FTC):** link trả phí phải gắn rel="sponsored" để không truyền ranking credit; link trả phí không đánh dấu bị coi là link spam. (medialist.com, snippet 24/11/2026 — nguồn thứ cấp, chưa đọc trực tiếp hướng dẫn của Google.)

### Áp dụng vào Top 3 trả phí (INFERRED từ Guide đã đọc)
- Vị trí Top 3 trả phí hiển thị lẫn trong danh sách kết quả trông giống listing thường → rất giống trường hợp Example 8: người dùng có thể hiểu Top 3 là do đánh giá độc lập mà được xếp hạng cao. Theo Guide, cần **nhãn riêng cho từng listing trả phí**, đặt trước/trên tên listing, dùng từ rõ ràng ("Ad" / "Paid Advertisement" / "Sponsored Advertising Content"), kèm dấu hiệu trực quan phân biệt (shading/border), và **lặp lại disclosure trên trang profile của thợ đó** (click-into page).
- Một dòng giải thích chung ở cuối trang hoặc trong FAQ là **không đủ** theo tiêu chuẩn của Guide.

---

## 6. Điểm còn chưa rõ / cần luật sư xác nhận (UNVERIFIED)

1. **Điều khoản của data.texas.gov / Socrata API** (kênh lấy dữ liệu thợ điện/HVAC của TDLR) — chưa đọc; licfile.asp không có file hai nghề này.
2. **TSBPE có chính sách website toàn cục nào khác** ngoài disclaimer trên trang free-licensee-list hay không.
3. **CSLB có chính sách bổ sung riêng** ngoài chính sách toàn bang ca.gov/use/ hay không; và việc footer CSLB trỏ tới ca.gov/use/ mới chỉ được khẳng định bởi bên thứ ba, chưa tự xác minh.
4. **Texas SB 140:** dự án có phải đăng ký với Texas Secretary of State trước khi gửi marketing text cho thợ ở Texas không; thợ đã claim listing có tính là "khách hàng hiện tại" được miễn trừ không.
5. **Nhãn "Sponsored" đứng một mình** có đủ chuẩn FTC hay không (Guide chỉ liệt kê "Sponsored Advertising Content" trong nhóm từ được hiểu rõ).
6. **Claim listing + dữ liệu liên hệ cá nhân:** TDLR đã chủ động ẩn SĐT/địa chỉ cá nhân khỏi giao diện tra cứu; việc tái xuất bản SĐT di động cá nhân của thợ sole proprietor và dùng số đó để liên hệ mời claim có rủi ro khiếu nại/TCPA riêng — chưa có văn bản nào đọc được trả lời trực tiếp.
7. **CCPA/CPRA (California):** chưa nghiên cứu trong đợt này; có thể liên quan khi mở rộng sang CA và thu thập dữ liệu người dùng/thợ.
8. **FTC Reviews Rule (16 CFR Part 465):** chỉ đọc qua tóm tắt của hãng luật; chưa đọc trực tiếp văn bản rule — cần đọc trước khi thiết kế tính năng review/đánh giá thợ.

---

## Nguồn đã đọc trực tiếp (24/11/2026)
1. https://www.tdlr.texas.gov/licenseSearch/licfile.asp
2. https://www.tdlr.texas.gov/disclaimer.htm (Website Policies — toàn bộ 514 dòng)
3. https://tsbpe.texas.gov/free-licensee-list/
4. https://www.cslb.ca.gov/onlineservices/dataportal/Default
5. https://www.cslb.ca.gov/onlineservices/dataportal/ContractorList.aspx (Master List)
6. https://www.ca.gov/use/ (Conditions of use — toàn bộ)
7. https://www.ftc.gov/tips-advice/business-center/guidance/native-advertising-guide-businesses (toàn bộ 400 dòng)
8. https://www.jfrancislaw.com/sms-marketing-compliance (luật sư Jonathan Francis — TCPA/SMS)

## Nguồn chỉ đọc qua snippet kết quả tìm kiếm (chưa mở full trang)
- LeadCompliant (TCPA B2B exemption; DNC B2B); fransis.ai (TCPA B2B texts); plura.ai (TCPA myths); consumer-action.org (Small Business Guide to TCPA, PDF); revisionlegal.com (FTC native ad/endorsement/review rules); medialist.com (sponsored disclosure + Google rel=sponsored); doineedaplumber.org/data-credits (CSLB Conditions of Use → ca.gov/use/); datadory.com (CSLB dataset — "no open-data license posted"); agriculturedefensecoalition.org (PDF TDLR policies 2011 — bản cũ, chỉ để đối chiếu).

---

**Đây là tổng hợp thông tin công khai, không phải tư vấn pháp lý; cần luật sư review trước khi launch.**
