SJA SETUP — Prompt Induk PT Samudra Jaya Andalas

Kerjakan halaman atau modul ini di dalam Sistem Keagenan Kapal PT Samudra Jaya Andalas menggunakan Laravel + React + TypeScript + Inertia + Tailwind/Vite + PostgreSQL + Redis.

Sebelum mengubah kode, baca AGENTS.md, DESIGN.md, inputs.json, serta dokumen SJA yang tersedia: inputs.sja.json, docs/sja/DESIGN.md, docs/sja/PROMPT-INDUK.md, dan referensi visual. Periksa route, model, migration, controller, Policy, halaman Inertia, komponen, autentikasi, dan aset. Bila perlu setup awal, periksa setup-sja.sh sebelum menjalankannya.

Gunakan pola dan komponen existing. Pertahankan perubahan pengguna. Jangan membuat route, statistik, permission, data produksi, atau interaksi palsu.

Aturan teknis

Laravel menangani database, validasi, authorization, storage, dan proses bisnis; React + Inertia menangani halaman dan interaksi.

Gunakan Link, router, useForm, Form Request, dan Policy/Gate. Jangan membuat REST API atau router frontend terpisah tanpa kebutuhan.

Gunakan data backend terotorisasi; search, filter, sort, dan pagination dilakukan server-side, dengan filter tersimpan di URL.

Gunakan UUID, foreign key, index sesuai query, eager loading untuk mencegah N+1, serta soft delete sesuai kebutuhan. Jangan reset database existing.

Gunakan decimal untuk uang, transaksi database, serta perlindungan terhadap approval atau pembayaran ganda.

Gunakan Spatie Roles & Permissions, Activitylog, dan Backup sesuai konfigurasi proyek. Hak akses berdasarkan role/permission, bukan nama orang.

Simpan SPK, invoice, dan bukti transfer di storage private; otorisasi download. Jangan mengekspos secret atau data keuangan tanpa izin.

Redis menangani cache, session, dan queue sesuai konfigurasi proyek. Jangan mengklaim layanan aktif tanpa verifikasi.

Workflow desain

Gunakan skill yang tersedia secara berurutan:

create-design-md bila design system perlu diperbarui.

ui-ux-pro-max untuk UX, typography, hierarchy, dan responsivitas.

frontend-design untuk implementasi React + Inertia.

baseline-ui untuk spacing, komponen, dan state.

impeccable untuk critique dan polish.

web-design-guidelines untuk audit aksesibilitas, interaksi, dan performa.

Gunakan Framer Motion hanya untuk perubahan state yang membantu pengguna; hormati prefers-reduced-motion. Laporkan skill yang tidak tersedia tanpa mengklaim telah menggunakannya.

Design system SJA

Gunakan gaya Corporate Maritime: profesional, bersih, mudah dipindai, dengan sidebar navy, biru cerah, permukaan putih, dan fotografi kapal/pelabuhan yang relevan.

Elemen

Warna

Primary / CTA / focus

#0060F4

Primary dark / heading

#082870 / #0B1F63

Secondary text

#52658E

Background / surface

#F0F8FF / #FFFFFF

Border / primary soft

#DCEAF8 / #E0F0FF

Accent

#19B5F7

Sidebar / hover / active

#0D2945 / #173B5C / #285585

Sidebar text / muted

#E7F0FA / #B5C8DC

Status memakai biru untuk informasi, oranye untuk menunggu, hijau untuk aktif/selesai, ungu untuk proses, merah untuk perlu tindakan/ditolak, dan abu-abu untuk nonaktif. Ikuti token status SJA dan selalu tampilkan label teks.

Gunakan Inter bila belum ada font identitas. Body/form sekitar 16 px, radius kartu 14–16 px, input/tombol 10–12 px, dan tinggi kontrol 44–48 px. Hubungkan token SJA ke theme yang dimuat Vite.

Hindari glassmorphism, gradient dominan, bento berulang, ikon dekoratif, sudut berlebihan, dan dashboard generik. Referensi gambar menjadi acuan layout dan UX; angka, nama, serta tanggal mockup bukan data produksi.

Komponen dari hasil setup

Wajib gunakan komponen yang sudah tersedia dari hasil setup proyek. Sebelum membuat UI, periksa setup-sja.sh, package.json, resources/js/components/, layout, hooks, utilities, dan katalog komponen bila tersedia. Pastikan implementasinya benar-benar ada; daftar nama dalam dokumen setup bukan bukti komponen sudah dibuat.

Ambil input, textarea, money input, select/combobox, date picker, checkbox, toggle, upload, table, pagination, filter, badge, modal, drawer, toast, stepper, dan approval timeline dari komponen existing sesuai kebutuhan halaman.

Baca implementasi dan contoh pemakaiannya. Gunakan nama export, props, variant, event handler, serta path import yang benar. Gunakan alias @/components hanya bila sesuai konfigurasi proyek.

Pertahankan theme, token SJA, validasi, loading state, aksesibilitas, dan integrasi Inertia yang sudah disiapkan. Gunakan kembali layout, hooks, serta formatter tanggal dan mata uang yang tersedia.

Bila perlu penyesuaian, perluas komponen melalui props, variant, atau komposisi dengan tetap menjaga halaman lain. Hindari duplikasi komponen, salinan khusus mobile, dan pemasangan library UI lain untuk fungsi yang sudah tersedia.

Buat komponen reusable baru hanya setelah memastikan kebutuhan belum didukung komponen existing. Ikuti struktur dan design system proyek, lalu catat komponen yang dipakai ulang, diperluas, atau ditambahkan.

Responsivitas dan aksesibilitas

Desktop: sidebar navy, topbar, ringkasan berizin, tabel operasional, dan panel pendukung. Tablet menyesuaikan grid.

Mobile: susun ulang menjadi kartu, drawer, filter bottom sheet, dan aksi terjangkau. Navigasi staf: Beranda, Kapal, Pengajuan, Profil; peran lain mengikuti tugas berizinnya.

Desktop dan mobile memakai backend, aturan bisnis, dan sumber data yang sama.

Sediakan loading, empty, error, validation, hover, focus, active, dan disabled state. Pastikan keyboard navigation, label form, aria-label tombol ikon, serta pengelolaan fokus dialog berfungsi.

Aturan bisnis SJA

Ikuti detail docs/sja/PROMPT-INDUK.md; terapkan bagian yang terkait halaman:

SPK → input Prima → review Titik → pembayaran Pelindo kedatangan terverifikasi sebelum kesiapan Clearance In.

Permintaan kapal → Prima input → Titik review → Prima order/penawaran vendor → Titik verifikasi biaya → Direktur approval → Kopra → Ryan ACC → dana diterima Titik → pembayaran vendor.

Catat realisasi layanan dan laporan harian Prima; detail wajib, foto opsional. Semua transaksi terhubung ke kunjungan/job yang tepat.

Clearance Out → serah terima Prima → Titik → Ryan → Nota Rampung/APBS/nota tambahan → rekonsiliasi → penyelesaian saldo Pelindo.

Setelah prasyarat terpenuhi, release Invoice Keagenan/Jasa dan Invoice Reimburse secara terpisah → unggah invoice bertanda tangan → catat pengiriman → piutang dan pembayaran klien.

Pisahkan selesai operasional dan selesai keuangan. Jangan menggandakan biaya Pelindo awal saat nota final diterima. Perubahan nilai setelah approval harus ditinjau ulang. Tarif pajak mengikuti konfigurasi. Jangan mengasumsikan integrasi bank/Kopra/Pelindo; pencatatan transfer tidak memindahkan dana. INAPORTNET di luar cakupan.

Verifikasi akhir

Uji route, data backend, form, permission, transisi status, dan komponen yang terkait. Pastikan import komponen hasil setup valid dan perubahan komponen bersama tetap kompatibel dengan pemakaiannya. Periksa desktop, tablet, mobile, keyboard, dan overflow. Jalankan test relevan, typecheck/lint, serta production build sesuai script proyek. Laporkan hasil aktual, file yang berubah, dan kendala yang belum teratasi.

Selesaikan halaman beserta proses backend yang diperlukan sampai berfungsi; jangan berhenti pada mockup atau rencana.

Detail kebutuhan halaman
