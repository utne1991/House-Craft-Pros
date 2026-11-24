# Nghiên cứu — House Craft Pros (Texas MVP)

Tất cả nghiên cứu đợt 1 (24/11/2026), nguồn miễn phí, $0.

## Tổng hợp

| File | Nội dung |
|---|---|
| `research-batch-1.md` | Tổng hợp 5 hướng nghiên cứu: từ khóa, đối thủ, monetization, pháp lý, stack — kèm kết luận định hướng GO có điều kiện |
| `data-findings-2026-11-24.md` | Số liệu dữ liệu bang tải và phân tích trực tiếp: ~40.150 giấy phép doanh nghiệp còn hiệu lực; HVAC 0% SĐT/địa chỉ/thành phố; API Socrata chỉ 9 trường |

## Ghi chú thô (raw)

| File | Hướng | Điểm chính |
|---|---|---|
| `raw/01-keywords-wedge.md` | Từ khóa wedge verify-license | 40 từ khóa, 30 SERP đọc trực tiếp; top 5 không có ông lớn; San Antonio là khoảng trống rõ nhất |
| `raw/02-competitors.md` | Đối thủ | 7 site + ContractorsRanked.com (đối thủ mới đáng ngại nhất); chưa ai có tool verify thật |
| `raw/03-monetization.md` | Mô hình thu | AdSense không khả thi ($10–67/tháng ở 5k lượt); featured placement thực tế $8–30/tháng |
| `raw/04-legal.md` | Pháp lý | TDLR cho tái xuất bản với 4 điều kiện; SMS marketing phải bỏ (TCPA + TX SB 140); FTC bắt nhãn quảng cáo từng listing |
| `raw/05-stack.md` | Stack | Tái dùng FarmDirect (Next.js SSR + Supabase); AI Studio không dùng làm production (không SSR, custom domain trả phí) |

## Nhãn độ tin cậy

- **VERIFIED** — đã đọc trực tiếp nguồn, có ngày đọc.
- **INFERRED** — suy luận từ bằng chứng kề cận, nêu cơ sở.
- **UNVERIFIED** — chưa kiểm chứng được, cần đợt 2 (Google Trends, deep profile ContractorsRanked, dry-run ETL, luật sư review).

## Đính chính

Nghiên cứu đợt 1 ban đầu báo "licfile.asp không có file thợ điện/HVAC" — **sai**.
Muse đã tải trực tiếp 2 file đó từ licfile.asp (Lteecele.csv 14.067 dòng, ltairref.csv 20.497 dòng).
CSV là nguồn dữ liệu chính; API Socrata chỉ là kênh phụ (đếm số + xác minh).
