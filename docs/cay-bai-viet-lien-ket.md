# Cây bài viết + Sơ đồ liên kết nội bộ — House Craft Pros (Texas MVP)

**Ngày:** 24/11/2026 · **Nguồn từ khóa:** `research/raw/01-keywords-wedge.md` (40 từ khóa, 30 SERP đọc trực tiếp 24/11/2026).
**Nguyên tắc:** cây hub-and-spoke — 1 trụ cột verify chung → 3 cụm nghề → thành phố → hồ sơ thợ.
Mọi trang indexable đều có ≥1 link SSR inbound. Không trang mồ côi.

---

## 1. Cây bài viết (tổng quan)

```
/  (Trang chủ — tool verify + tìm theo nghề/thành phố)
│
├── /verify/  (Công cụ Verify License — trung tâm chuyển đổi của toàn site)
│
├── /guides/how-to-verify-contractor-license-texas/   ★ TRỤ CỘT (#31, #32, #36)
│   │
│   ├── CỤM A — ĐIỆN (TDLR)
│   │   ├── /guides/verify-electrician-license-texas/            (#1, #2, #3)
│   │   ├── /guides/how-to-check-electrician-licensed-texas/     (#4 — Q&A/PAA)
│   │   ├── /guides/texas-master-vs-journeyman-electrician/      (#9, #10)
│   │   └── /guides/what-is-tecl-license/                        (#5 — giải thích, không nhắm lookup)
│   │
│   ├── CỤM B — ỐNG NƯỚC (TSBPE)
│   │   ├── /guides/verify-plumber-license-texas/                (#11, #12, #13)
│   │   ├── /guides/how-to-check-plumber-licensed-texas/         (#14 — Q&A/PAA)
│   │   ├── /guides/texas-master-plumber-rmp-lookup/             (#16 — góc RMP độc quyền)
│   │   └── /guides/texas-plumber-license-lookup-by-name/        (#20 — mục trong trang nước, tách trang sau nếu cần)
│   │
│   ├── CỤM C — HVAC (TDLR)
│   │   ├── /guides/verify-hvac-contractor-license-texas/        (#21, #22, #23, #25)
│   │   ├── /guides/what-is-tacl-license/                        (#24 + #30 TACLA vs TACLB)
│   │   └── /guides/texas-ac-technician-vs-contractor/           (#29 — technician ≠ contractor)
│   │
│   └── CỤM D — CHUNG
│       ├── /guides/texas-general-contractor-license/            (#34 — TX không cấp phép GC/roofer)
│       └── /guides/report-unlicensed-contractor-texas/          (#35 — report TDLR + TSBPE + AG)
│
├── /texas/  (Hub Texas)
│   │
│   ├── /texas/san-antonio/          ★ MỞ MÀN (#40, #28, #18 — SERP loãng nhất)
│   │   ├── /texas/san-antonio/electricians/
│   │   ├── /texas/san-antonio/plumbers/
│   │   └── /texas/san-antonio/hvac-contractors/   (trang county nếu không đủ dữ liệu city — xem §3)
│   ├── /texas/dallas/               (#37, #8, #19)
│   ├── /texas/houston/              (#38, #6, #17)
│   ├── /texas/austin/               (#39, #7, #26)
│   └── 20–30 trang thành phố nhỏ (ngày 31–60, mỗi trang ≥5 nhà thầu còn hiệu lực)
│
├── /texas/counties/[county]/hvac-contractors/   (HVAC cấp county — dữ liệu HVAC chỉ có county)
│
├── /contractors/[slug]/   (Hồ sơ thợ — ~40k tiềm năng, index theo lô có gate)
│
└── CỤM G — COST GUIDE (ngày 61–90, 10–15 bài; từ khóa chốt ở nghiên cứu đợt 2)
    ├── VD: chi phí thay panel điện 200-amp ở Texas, thay water heater, sửa HVAC...
    └── Mỗi bài cost guide link → trang thành phố + nghề liên quan + tool verify
```

**Tổng đợt 90 ngày:** 1 trụ cột + 11 guide nghề/chung + 4 trang thành phố lớn + 20–30 trang
thành phố nhỏ + 10–15 cost guide + tool verify + hồ sơ thợ theo lô.
**Không làm trang riêng cho:** TDLR license search (#33), TSBPE license search (#15),
TECL lookup (#5) — intent navigational về tool .gov, không thắng được #1; chỉ nhắc như
link/hướng dẫn trong các bài khác.

---

## 2. Sơ đồ liên kết nội bộ (link graph)

### 2.1 Quy tắc chung

| Từ → Tới | Quy tắc |
|---|---|
| Trụ cột → guide nghề | Link tới cả 11 guide (mục lục + link ngữ cảnh trong bài) |
| Guide nghề → trụ cột | Link về trụ cột ở đầu + cuối bài ("Xem hướng dẫn tổng quát") |
| Guide → guide anh em | Mỗi guide link 2–3 guide cùng cụm + 1 guide cụm khác có liên quan |
| Mọi guide → tool /verify/ | CTA "Verify ngay" giữa bài + cuối bài (2 CTA/bài) |
| Guide → trang thành phố | Link tới thành phố lớn nhất liên quan (VD guide điện → Dallas/Houston) |
| Trang chủ → trụ cột + tool + 4 thành phố lớn | Link trực tiếp, SSR |
| Trang thành phố → trang nghề × thành phố | Link đủ 3 nghề |
| Trang nghề × thành phố → hồ sơ thợ | Link TẤT CẢ thợ trên trang (phân trang SSR, không cap số link) |
| Hồ sơ thợ → trang thành phố + guide nghề | Breadcrumb + link ngữ cảnh ("Xem thợ điện ở Dallas", "Cách verify giấy phép điện") |
| Hồ sơ thợ → hồ sơ thợ | 5 thợ cùng nghề + cùng thành phố/county ("Thợ gần đây") |
| Trang county (HVAC) → hồ sơ HVAC | Link tất cả HVAC trong county (phân trang SSR) |
| Cost guide → trang thành phố + nghề + tool | Link ngữ cảnh theo nghề/thành phố của bài |
| Footer (mọi trang) | Trụ cột, 3 guide nghề chính, 4 thành phố lớn, Sources, Disclaimer |

### 2.2 Breadcrumb (mọi trang, kèm BreadcrumbList schema)

- Guide: Home > Guides > [Tên guide]
- Thành phố: Home > Texas > [Thành phố]
- Nghề × thành phố: Home > Texas > [Thành phố] > [Nghề]
- Hồ sơ: Home > Texas > [Thành phố] > [Nghề] > [Tên thợ] (HVAC: Home > Texas > Counties > [County] > HVAC > [Tên thợ])

### 2.3 Anchor text

- Mô tả đúng nội dung trang đích, đa dạng, không lặp exact-match keyword.
- VD tốt: "cách verify giấy phép thợ điện ở Texas", "thợ điện đã xác minh ở Dallas",
  "tra cứu số giấy phép TACL".
- VD xấu (tránh): mọi link đều là "verify electrician license Texas".

### 2.4 Không trang mồ côi — checklist trước khi index 1 URL

- [ ] Có ≥1 link SSR inbound từ hub (trang chủ / /texas/ / trang thành phố) hoặc guide
- [ ] Có trong sitemap (chỉ khi đạt gate đợt index)
- [ ] Có breadcrumb + canonical tự tham chiếu
- [ ] Có ≥3 link outbound tới trang liên quan (trừ trang hồ sơ mỏng nhất: ≥2)

---

## 3. Lưu ý dữ liệu ảnh hưởng tới cây bài viết

- **HVAC không có trang nghề × thành phố** (CSV TDLR không có thành phố/SĐT/địa chỉ cho A/C
  Contractor). Thay bằng trang **county** (`/texas/counties/[county]/hvac-contractors/`).
  Trang thành phố đa nghề vẫn nhắc HVAC nhưng link sang trang county tương ứng.
- **Trang nghề × thành phố chỉ tạo khi ≥5 nhà thầu còn hiệu lực CÓ dữ liệu đầy đủ.**
  Thành phố nhỏ không đủ 5 thợ điện/ống nước → không tạo trang, thợ vẫn xuất hiện qua
  trang thành phố đa nghề (nếu đủ 5 thợ tổng) hoặc chỉ qua tool + hồ sơ.
- **Hồ sơ thợ index theo lô:** lô 1 = thợ ở 4 thành phố lớn + San Antonio (đủ dữ liệu);
  các lô sau theo thành phố nhỏ dần. Hồ sơ không đủ tín hiệu (noindex) vẫn tra cứu được qua tool.

---

## 4. Thứ tự xuất bản (gắn với kế hoạch 90 ngày)

| Đợt | Trang | Từ khóa mục tiêu |
|---|---|---|
| Ngày 1–30 | Tool /verify/ + trụ cột + 3 guide nghề (điện, nước, HVAC) + trang GC (#34) + 5–10 trang San Antonio | #31, #1, #11, #21, #34, #28, #40 |
| Ngày 31–60 | 10 guide còn lại (TACL, RMP, Q&A, report...) + Dallas/Houston/Austin + 20–30 thành phố nhỏ | #24, #30, #16, #4, #14, #35, #37, #38, #39... |
| Ngày 61–90 | 10–15 cost guide + hồ sơ thợ lô 2–3 + claim listing | Cost keywords (đợt 2) |

**Gate giữa các đợt:** index batch trước >80% (kiểm tra GSC) + impression tăng đều mới mở đợt sau.
Nếu index rớt → dừng mở trang mới, sửa chất lượng/link trước.

---

## 5. Bảng theo dõi trạng thái (cập nhật khi làm)

| URL | Từ khóa chính | Trạng thái | Link nội bộ xong? | Ngày live |
|---|---|---|---|---|
| /guides/how-to-verify-contractor-license-texas/ | #31 how to verify contractor license Texas | Chưa viết | ☐ | |
| /guides/verify-electrician-license-texas/ | #1 verify electrician license Texas | Chưa viết | ☐ | |
| /guides/verify-hvac-contractor-license-texas/ | #21 verify HVAC contractor license Texas | Chưa viết | ☐ | |
| /guides/verify-plumber-license-texas/ | #11 verify plumber license Texas | Chưa viết | ☐ | |
| /guides/what-is-tacl-license/ | #24 what does TACL mean | Chưa viết | ☐ | |
| /guides/texas-master-plumber-rmp-lookup/ | #16 RMP license lookup Texas | Chưa viết | ☐ | |
| /guides/texas-general-contractor-license/ | #34 does Texas require a contractor license | Chưa viết | ☐ | |
| /guides/report-unlicensed-contractor-texas/ | #35 report unlicensed contractor Texas | Chưa viết | ☐ | |
| /guides/how-to-check-electrician-licensed-texas/ | #4 how do I check if an electrician is licensed | Chưa viết | ☐ | |
| /guides/how-to-check-plumber-licensed-texas/ | #14 how to check if a plumber is licensed | Chưa viết | ☐ | |
| /guides/texas-master-vs-journeyman-electrician/ | #9/#10 master/journeyman lookup | Chưa viết | ☐ | |
| /guides/texas-ac-technician-vs-contractor/ | #29 AC technician vs contractor | Chưa viết | ☐ | |
| /texas/san-antonio/ | #40 San Antonio contractor license lookup | Chưa viết | ☐ | |
| /texas/dallas/ | #37 Dallas contractor license lookup | Chưa viết | ☐ | |
| /texas/houston/ | #38 Houston contractor license lookup | Chưa viết | ☐ | |
| /texas/austin/ | #39 Austin contractor license lookup | Chưa viết | ☐ | |

*(Thêm dòng khi tạo trang thành phố nhỏ / cost guide / hồ sơ theo lô.)*
