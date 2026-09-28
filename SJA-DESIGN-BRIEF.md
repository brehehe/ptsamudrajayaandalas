# PT Samudra Jaya Andalas — Brief Implementasi

Mulai dari SJA-MULAI.md. Gunakan docs/sja/PROMPT-INDUK.md,
docs/sja/DESIGN.md, inputs.sja.json, dan docs/sja/references/. Brief ini tidak menggantikan AGENTS.md, DESIGN.md,
inputs.json, pemeriksaan source code, atau prompt induk.

## Stack dan fondasi

Laravel + React + Inertia + TypeScript + Tailwind + PostgreSQL + Redis.
PostgreSQL memakai UUID, foreign key, soft delete sesuai domain, index terukur,
eager loading, dan pengujian N+1. Spatie menangani role/permission, Activitylog,
dan Backup. Semua endpoint, file privat, pencarian, props, dan aksi tetap
diperiksa melalui Policy/Gate serta scope akses backend.

Jangan menjalankan migration sebelum menyesuaikan UUID pada user, foreign key,
pivot Spatie, dan subject_id/causer_id Activitylog. Backup harus diuji restore.
Konfigurasi database/Redis, seeder, permission, audit, serta komponen berikut
masih harus diimplementasikan dan diverifikasi oleh agen pada proyek aktual.

## Workflow desain

1. create-design-md: pahami/update DESIGN.md dari bukti dan arahan pengguna.
2. ui-ux-pro-max: perkuat typography, layout, accessibility, dan responsif.
3. frontend-design: implementasikan identitas visual yang konsisten.
4. baseline-ui: rapikan hierarchy, spacing, typography, dan state komponen.
5. impeccable: critique dan polish sesuai kemampuan skill terpasang.
6. web-design-guidelines: audit navigasi, form, interaksi, gambar, dan performa.
7. Framer Motion: hanya transisi yang membantu memahami perubahan state;
   hormati reduced motion. Jangan memakai animasi dekoratif berlebihan.

Gunakan Gemini Flash dan Claude Sonnet melalui Antigravity sesuai ketersediaan.
Skrip installer tidak memilih model atau mengubah akun/provider Antigravity.

## Arah visual: Corporate Maritime

Profesional, bersih, operasional, dominan navy/biru/putih. Dashboard desktop
mengikuti referensi Bu Titik; mobile staf mengikuti referensi Pak Prima.
Semua role dan modul wajib memiliki tampilan desktop serta mobile lengkap.

| Token | Warna |
| --- | --- |
| Primary | #0060F4 |
| Primary dark | #082870 |
| Heading | #0B1F63 |
| Secondary text | #52658E |
| Background | #F0F8FF |
| Surface | #FFFFFF |
| Border | #DCEAF8 |
| Primary soft | #E0F0FF |
| Accent | #19B5F7 |
| Sidebar background | #0D2945 |
| Sidebar hover | #173B5C |
| Sidebar active | #285585 |
| Sidebar text | #E7F0FA |
| Sidebar muted | #B5C8DC |

Palet diadaptasi dari referensi dan ditetapkan sebagai arahan pengguna.
Kartu radius 14–16 px; input/tombol 10–12 px, tinggi 44–48 px. Gunakan Inter
bila belum ada font identitas. Gradasi cyan–biru terbatas pada hero/aksen.
Hindari glassmorphism, ikon dekoratif tanpa fungsi, dan bento berulang.
Gunakan semantic status yang konsisten dan selalu sertakan label teks.

## Alur bisnis

- SPK diterima Prima/Bu Titik; Prima melengkapi lalu Bu Titik memeriksa.
- Biaya Pelindo kedatangan harus dibayar sebelum kapal datang.
- Kebutuhan kapal → Prima → review Titik → order/penawaran vendor → Titik
  menyiapkan biaya → Direktur approve → Kopra → Ryan ACC → dana diterima
  Titik → pembayaran vendor dan pencatatan realisasi kebutuhan.
- Prima wajib mengirim laporan kegiatan harian dengan detail; foto opsional.
- Clearance Out → serah terima Prima → Titik → Ryan → Nota Rampung Pelindo,
  APBS, serta nota tambahan → rekonsiliasi → Titik ajukan bayar Pelindo →
  Ryan mencatat transfer → Titik release invoice klien.
- Pisahkan selesai operasional dari selesai keuangan. Pembayaran Pelindo awal
  direkonsiliasi dengan nota final agar tidak dihitung dua kali.
- Pisahkan Invoice Keagenan/Jasa dan Invoice Reimburse. PPh serta materai
  mengikuti konfigurasi yang telah ditetapkan; jangan mengarang tarif.
- Scan/foto invoice bertanda tangan wajib sebelum status siap kirim/terkirim;
  catat pengiriman fisik, bukti kirim, penerimaan dan alokasi pembayaran.
- INAPORTNET tidak termasuk cakupan. Pencatatan Kopra/transfer tidak berarti
  integrasi bank atau pemindahan dana otomatis telah tersedia.

## Komponen dan semua tampilan

Gunakan resources/js/components/; direktori telah disiapkan, tetapi komponen
harus benar-benar dibangun dan dihubungkan dengan halaman nyata:

- Input, textarea, money/date input, checkbox, toggle, select, search select.
- DataTable, sort, pagination, page size, row actions, versi kartu mobile.
- Search, filter bar, filter drawer, chips, date range, dan reset filter.
- Modal, confirmation dialog, drawer/bottom sheet, alert, toast, skeleton.
- PageHeader: title, subtitle, breadcrumb, dan aksi halaman.
- Sidebar, topbar, navigasi mobile, tabs, stepper, timeline approval/status.
- Upload foto/dokumen, preview, invoice items, alokasi pembayaran, rekonsiliasi.

Desktop: sidebar navy, topbar, banner, KPI, tabel pengajuan/kebutuhan, kapal
perhatian, notifikasi, jadwal, grafik, quick action sesuai permission.
Mobile: susun ulang seluruh modul, jangan mengecilkan dashboard desktop.
Semua data, route, permission, handler, serta hasil pengujian harus nyata.
