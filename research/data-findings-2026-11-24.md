# Số liệu dữ liệu bang Texas — VERIFIED 24/11/2026

Nguồn: API Socrata data.texas.gov (dataset 7358-krk7, data cập nhật 13/11/2026) +
CSV tải trực tiếp từ tdlr.texas.gov và tsbpe.texas.gov (24/11/2026).
File gốc lưu tại ~/workspace/trades-directory/research/ (tdlr_counts.py, Lteecele.csv, ltairref.csv, rmp_download).

## TDLR — Socrata API (chỉ 9 trường, KHÔNG có phone/address/city/status)

- Tổng số dòng: 976.150
- Electrical Contractor: 14.071 · A/C Contractor: 20.480 · Appliance Installation Contractor: 831
- Electrical Sign Contractor: 655 · Elevator Contractor: 372
- Tổng giấy phép nhà thầu (5 loại): ~36.409
- Cá nhân (KHÔNG dùng cho danh bạ): Apprentice Electrician 291.910, Journeyman 45.468,
  Master Electrician 19.931, A/C Technician 61.316
- Lưu ý chất lượng: dataset lẫn vài dòng rác (footer text Salesforce/PIA) — cần lọc.

Kết luận: API Socrata chỉ dùng được cho đếm số + xác minh, KHÔNG đủ trường làm danh bạ.
Dữ liệu danh bạ phải lấy từ CSV.

## TDLR CSV — Electrical Contractors (Lteecele.csv, 14.067 dòng)

- 100% có BUSINESS PHONE, BUSINESS NAME, ADDRESS, CITY, ZIP, COUNTY — đầy đủ nhất.
- 1.747 dòng (12%) đã hết hạn (expiration < 24/11/2026) → phải lọc theo ngày hết hạn.
- 2.224 dòng hết hạn trong 90 ngày tới.
- Ước tính còn hiệu lực: ~12.320.

## TDLR CSV — A/C Contractors (ltairref.csv, 20.497 dòng) — PHÁT HIỆN QUAN TRỌNG

- BUSINESS NAME 98%, BUSINESS COUNTY 96%, NAME 100%.
- **BUSINESS PHONE 0%, BUSINESS ADDRESS 0%, BUSINESS CITY 0%, BUSINESS ZIP 0%.**
- File công khai của TDLR KHÔNG chứa SĐT/địa chỉ/thành phố cho nhà thầu HVAC.
  → HVAC (nghề lớn nhất, ~19.087 còn hiệu lực sau khi trừ 1.410 hết hạn) chỉ làm được
  trang cấp COUNTY, không làm được trang thành phố hay nút gọi trực tiếp từ dữ liệu này.
- Chưa kiểm chứng: trang web tra cứu TDLR có hiện SĐT cho A/C contractor không (UNVERIFIED).

## TSBPE CSV — Responsible Master Plumber (RMP, 9.416 dòng)

- Trường đầy đủ: tên, công ty (PLUMB_COMPANY 100%), địa chỉ, CITY, ZIP, PHONE, COUNTY,
  bảo hiểm (INS_EXPIRY_DTE, INSURANCE_COMPANY), chứng chỉ thêm (MEDGAS/MRF/WS).
- LIC_STATUS dùng từ "Current" (8.743) / "Expired" (673) — KHÔNG dùng từ "Active".
- PHONE chỉ 50% (4.723/9.416).
- Ước tính còn hiệu lực: 8.743.

## Tổng hợp quy mô danh bạ Texas (giấy phép doanh nghiệp còn hiệu lực)

| Nghề | Còn hiệu lực (ước tính) | Có SĐT + địa chỉ + thành phố? |
|---|---|---|
| Electrical Contractor | ~12.320 | Có, 100% |
| A/C Contractor (HVAC) | ~19.087 | KHÔNG — chỉ có county |
| Responsible Master Plumber | 8.743 | Có địa chỉ; SĐT 50% |
| **Tổng** | **~40.150** | **~21.000 đủ dữ liệu làm trang thành phố + gọi trực tiếp** |

Hệ quả cho playbook: "50.000–100.000+ hồ sơ" phải chỉnh thành ~40k giấy phép doanh nghiệp
còn hiệu lực, trong đó chỉ ~21k đủ dữ liệu đầy đủ. HVAC cần phương án bổ sung dữ liệu
(hoặc chấp nhận chỉ làm cấp county) — đây là quyết định cần đưa vào báo cáo định hướng.
