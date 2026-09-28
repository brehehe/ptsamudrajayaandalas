# Design System — PT Samudra Jaya Andalas

Dokumen ini memuat bagian visual dari prompt pengguna yang disertakan dalam setup.
Prompt lengkap: `docs/sja/PROMPT-INDUK.md` (path relatif terhadap root proyek).
Empat gambar: `docs/sja/references/`. Pemetaan: `inputs.sja.json`.
Token CSS: `resources/css/sja-tokens.css`.

Saat implementasi, import CSS token melalui entry stylesheet/React yang benar-benar
dipakai Vite. Hubungkan token ke theme dan komponen existing setelah memeriksa
versi Tailwind serta pola styling proyek. CSS variables saja belum mengubah halaman.
Jangan berhenti setelah membuat dokumentasi: implementasikan layout desktop dan
mobile, gunakan komponen bersama, lalu verifikasi hasil render di browser.

## 15. Workflow desain wajib

1. Gunakan `create-design-md` untuk menetapkan atau memperbarui design system di `DESIGN.md`, termasuk warna, typography, spacing, layout, dan state komponen.
2. Gunakan `ui-ux-pro-max` untuk memperkuat keputusan typography, layout, responsive behavior, dan UX dengan tetap mengikuti palet Corporate Maritime yang ditetapkan.
3. Gunakan `frontend-design` untuk menentukan komposisi halaman serta mengimplementasikan arah visual.
4. Gunakan `baseline-ui` untuk menyempurnakan spacing, hierarchy, typography, responsive layout, dan state komponen yang relevan.
5. Gunakan `impeccable` untuk melakukan critique dan polish hingga hasil akhir konsisten serta presisi.
6. Gunakan `web-design-guidelines` untuk mengaudit accessibility, navigation, form, interaction, image, motion, dan performance.
7. Gunakan Framer Motion hanya jika animasi membantu menjelaskan perubahan state atau hierarchy. Hormati preferensi reduced motion dan hindari animasi dekoratif berlebihan.

Jika suatu skill tidak tersedia, nyatakan keterbatasannya dan terapkan pemeriksaan yang setara menggunakan kemampuan yang tersedia. Jangan mengklaim telah menjalankan skill atau pengujian yang belum dilakukan.

## 16. Arah visual: Corporate Maritime

Gunakan identitas **Corporate Maritime — bersih, profesional, ramah, dan berorientasi pada kebutuhan operasional**.

- **Warna dominan:** biru laut, biru cerah, putih, dan biru sangat muda.
- **Komposisi:** grid teratur, ruang kosong cukup, judul tegas, dan urutan informasi yang mudah dipindai.
- **Permukaan:** kartu putih di atas latar biru muda, border tipis, serta bayangan ringan.
- **Bentuk:** sudut membulat yang terkontrol; radius kartu 14–16 px dan input/tombol 10–12 px. Badge status berbentuk kapsul.
- **Fotografi:** kapal dan pelabuhan yang relevan. Prioritaskan aset resmi perusahaan atau aset yang tersedia dengan izin penggunaan yang sesuai.
- **Aksen:** gradasi cyan ke biru secara terbatas pada visual hero atau aksi utama. Gunakan permukaan yang tenang pada bagian informasi dan formulir.
- **Ikon:** sederhana, bermakna, dan konsisten dalam gaya maupun ketebalan. Gunakan satu keluarga ikon yang sudah tersedia.
- **Bahasa:** Bahasa Indonesia yang ringkas dan jelas. Nama perusahaan ditulis konsisten sebagai PT Samudra Jaya Andalas.

Hindari gradasi ungu-biru dominan, glassmorphism, kartu bento berulang tanpa kebutuhan, sudut terlalu membulat, ikon dekoratif tanpa fungsi, headline klise, efek glow berlebihan, dan visual yang terlalu ramai.

### Peran setiap referensi visual

| ReferensiDipakai untuk                                |                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `1. Tampilan Mobile Staff Lapangan - Pak Prima.png`   | Beranda staf mobile, sambutan, aksi Buat Pengajuan, daftar kapal, ringkasan pribadi, dan navigasi bawah            |
| `2. Menu Kapal.png`                                   | Pencarian/filter kapal, daftar kartu kapal, metadata, status, dan prioritas informasi                              |
| `392eab1d-e854-4fe7-91fe-ee93e31d3bc1.png`            | Daftar pengajuan, tab aktif/riwayat, filter, form bertahap, review, sukses, dan detail                             |
| `Tampilan Desktop Bu Titik - Admin - Operasional.png` | Struktur dashboard desktop, sidebar navy, KPI, tabel, panel pendukung, notifikasi, jadwal, dan aktivitas pengajuan |

Baca gambar asli bersama prompt ini. Gunakan struktur dan identitas visualnya sebagai acuan, lalu sesuaikan kepadatan dengan ukuran layar dan data nyata. Nama Bu Titik dan Pak Prima menjelaskan persona referensi; nama pengguna di UI berasal dari akun login, dan kewenangan ditentukan oleh role/permission serta scope penugasan.
Landing page, dashboard desktop, dan mobile memakai token yang sama. Perbedaan layout mengikuti pekerjaan pengguna dan ruang layar; jangan membuat aplikasi atau salinan data terpisah hanya untuk membedakan desktop dengan mobile.

## 17. Palet warna utama

Gunakan palet berikut sebagai token implementasi yang diadaptasi dari referensi visual. Nilai HEX ini merupakan pendekatan yang telah dirapikan, bukan hasil pembacaan token asli dari file desain.

| Token / peranWarnaHEXPenggunaan |                  |           |                                                               |
| ------------------------------- | ---------------- | --------- | ------------------------------------------------------------- |
| Primary                         | Biru cerah       | `#0060F4` | CTA utama, link penting, tab dan navigasi aktif               |
| Primary dark                    | Biru laut gelap  | `#082870` | Aksi berpenekanan tinggi, ikon utama, permukaan gelap         |
| Heading                         | Navy pekat       | `#0B1F63` | Judul, nama kapal, angka penting                              |
| Secondary text                  | Biru keabu-abuan | `#52658E` | Deskripsi, metadata, informasi pendukung                      |
| Background                      | Biru sangat muda | `#F0F8FF` | Latar halaman dan bagian alternatif                           |
| Surface                         | Putih            | `#FFFFFF` | Kartu, form, panel, navigasi                                  |
| Border                          | Biru pucat       | `#DCEAF8` | Pembatas dan tepi kartu; perkuat pada kontrol bila diperlukan |
| Primary soft                    | Biru pastel      | `#E0F0FF` | Tombol sekunder dan latar ikon                                |
| Accent                          | Cyan             | `#19B5F7` | Aksen identitas dan gradasi terbatas                          |

Gradasi acuan: `#19B5F7 → #0060F4`. Pastikan teks di atasnya tetap memiliki kontras yang cukup; untuk CTA berteks putih, utamakan bidang biru yang lebih gelap di belakang label.
Implementasikan warna melalui token terpusat atau CSS variables dan konfigurasi styling proyek. Hindari nilai warna yang tersebar tanpa pola. Turunkan state hover, pressed, focus, dan disabled secara konsisten dari token yang sama.

### Tambahan token sidebar desktop

Nilai berikut adalah adaptasi visual yang dinormalisasi dari referensi desktop; token primary, heading, dan status tetap memakai palet utama.

| TokenHEXPenggunaan |           |                                         |
| ------------------ | --------- | --------------------------------------- |
| Sidebar background | `#0D2945` | Latar navigasi desktop                  |
| Sidebar hover      | `#173B5C` | Hover item navigasi pada navy           |
| Sidebar active     | `#285585` | Permukaan menu aktif                    |
| Sidebar text       | `#E7F0FA` | Label dan ikon di atas navy             |
| Sidebar muted      | `#B5C8DC` | Nama kelompok serta informasi pendukung |

Gunakan aksen cyan `#19B5F7` untuk indikator menu aktif dan token merah status untuk badge perhatian. Badge harus memiliki makna yang jelas; jangan mewarnai semua jumlah data merah. Pertahankan kontras label, focus ring, dan state aktif di atas sidebar gelap.

## 18. Warna status untuk modul operasional

Gunakan pemetaan ini pada modul internal yang relevan. Status kapal dan status pengajuan adalah domain berbeda; jangan menggabungkan enum atau aturan bisnisnya hanya karena memakai warna yang sama.

| Makna warna / contoh statusTeks dan ikonLatar badge |           |           |
| --------------------------------------------------- | --------- | --------- |
| Informasi / Akan Datang                             | `#0057D9` | `#E0F0FF` |
| Menunggu / Labuh                                    | `#A65300` | `#FFF0CC` |
| Aktif / Sandar / Selesai                            | `#087443` | `#DCF7E8` |
| Dalam Proses                                        | `#6840BB` | `#EFE7FF` |
| Perlu Tindakan / Ditolak                            | `#C62840` | `#FFE7EC` |
| Nonaktif / Dibatalkan                               | `#526580` | `#EDF2F7` |

Pertahankan satu makna warna di seluruh halaman. Referensi mobile dan desktop memuat variasi warna Akan Datang, Labuh, Sandar, dan Dalam Proses; gunakan tabel token pada bagian ini sebagai acuan final. Sesuaikan label dengan status backend yang nyata, dan selalu sertakan teks; warna tidak boleh menjadi satu-satunya penanda kondisi.

## 19. Struktur landing page

### Header dan navigasi

Tampilkan logo resmi, nama PT Samudra Jaya Andalas, navigasi ringkas, dan CTA **Masuk Sistem**. Gunakan header sticky jika tidak mengganggu ruang baca pada mobile.

| NavigasiTujuan     |                                    |
| ------------------ | ---------------------------------- |
| Beranda            | `#beranda`                         |
| Tentang            | `#tentang`                         |
| Layanan            | `#layanan`                         |
| Sistem Operasional | `#sistem`                          |
| Kontak             | `#kontak`                          |
| Masuk Sistem       | Route login yang benar dari proyek |

Tampilkan item navigasi hanya jika section atau route tujuannya benar-benar tersedia. Menu mobile harus mudah dibuka, ditutup, dan dioperasikan dengan keyboard.

### Hero — `#beranda`

Gunakan foto pelabuhan atau kapal dengan komposisi yang menjaga teks tetap terbaca. Tampilkan nama perusahaan, headline yang konkret, deskripsi singkat, dan maksimal dua aksi utama.
Acuan copy:

- **Penanda:** PT SAMUDRA JAYA ANDALAS
- **Headline:** Operasional Kapal dalam Satu Alur yang Terhubung
- **Deskripsi:** Kelola informasi kapal, pengajuan kebutuhan, dan pemantauan status operasional melalui sistem PT Samudra Jaya Andalas.
- **CTA utama:** Masuk Sistem.
- **CTA sekunder:** Lihat Layanan, menuju `#layanan`.

Sesuaikan copy dengan kemampuan yang benar-benar tersedia pada sistem. Hindari statistik atau janji layanan yang tidak memiliki sumber.

### Tentang perusahaan — `#tentang`

Sajikan profil singkat perusahaan, konteks keagenan kapal, dan pendekatan pelayanannya berdasarkan informasi resmi yang tersedia. Gunakan paragraf ringkas dan fotografi pendukung; hindari tumpukan kartu untuk setiap kalimat.

### Layanan — `#layanan`

Tampilkan layanan perusahaan yang sudah terverifikasi dari konten proyek. Jika tersedia, layanan seperti koordinasi kebutuhan kapal dan dukungan operasional pelabuhan dapat dijelaskan secara ringkas.
Setiap layanan memiliki nama, penjelasan praktis, dan ikon hanya jika membantu pemahaman. Jangan menyamakan daftar fitur perangkat lunak dengan daftar layanan komersial perusahaan.

### Sistem operasional — `#sistem`

Jelaskan kemampuan sistem yang tersedia, dengan fokus pada:

- Informasi kapal dan jadwal operasional.
- Pencatatan pengajuan kebutuhan kapal.
- Pemantauan status pengajuan.
- Detail serta riwayat aktivitas sesuai hak akses.

Gunakan preview antarmuka yang disetujui, telah disamarkan bila diperlukan, atau ilustrasi produk yang jelas diberi konteks sebagai contoh. Jangan menampilkan data internal langsung pada halaman publik. Referensi mobile dapat menjadi dasar presentasi bagian ini, tanpa memenuhi seluruh halaman dengan bingkai ponsel.

### Manfaat dan CTA lanjutan

Jelaskan manfaat yang berkaitan langsung dengan kemampuan sistem: informasi lebih mudah ditelusuri, kebutuhan tercatat lebih terstruktur, dan status proses lebih jelas. Hindari klaim efisiensi dalam persentase tanpa data.
Tutup bagian ini dengan CTA menuju route login yang sudah tersedia.

### Kontak dan footer — `#kontak`

Gunakan alamat, email, telepon, jam operasional, dan tautan resmi yang tersedia. Jangan membuat nomor WhatsApp, alamat kantor, atau akun media sosial.
Footer memuat identitas perusahaan, navigasi ringkas, informasi kontak yang valid, serta copyright. Tambahkan tautan kebijakan hanya jika halamannya tersedia.

## 20. Dashboard desktop Admin / Operasional — referensi Bu Titik

Bangun dashboard sebagai pusat pemantauan operasional setelah login, mengikuti komposisi gambar desktop yang dilampirkan. Fokus pengguna adalah mengetahui pekerjaan yang perlu ditinjau, kondisi kapal, kebutuhan harian, dan tindak lanjut yang dapat dilakukan sesuai kewenangannya.

### A. Kerangka layout desktop

- Gunakan sidebar navy di kiri, topbar di atas area kerja, dan konten berlatar biru sangat muda.
- Lebar awal sidebar sekitar 220–240 px, dengan mode ringkas bila diperlukan; topbar sekitar 64 px. Angka ini adalah acuan implementasi, bukan ukuran wajib dari gambar.
- Area konten memakai padding 20–24 px dan gap 16–20 px. Sidebar boleh memiliki scroll sendiri untuk menu panjang, sedangkan halaman tetap memiliki urutan baca yang jelas.
- Letakkan banner sambutan lebar penuh, kemudian empat kartu KPI dalam satu baris pada layar yang cukup lebar.
- Di bawah KPI, gunakan grid yang memberi area terbesar kepada Pengajuan Terbaru dan Kebutuhan Hari Ini, lalu panel Kapal dalam Perhatian/Aktivitas Pengajuan, serta panel Notifikasi/Jadwal/Quick Action.
- Pada desktop lebar, rasio kolom sekitar 6:3:3 dapat menjadi titik awal. Bila tabel terlalu sempit, ubah menjadi dua kolom atau perluas panel tabel; jangan mengecilkan teks demi menyalin seluruh isi gambar dalam satu layar.
- Gunakan tinggi konten alami. Batasi daftar ringkasan melalui jumlah item dan tautan Lihat Semua, bukan tumpukan scroll kecil pada setiap kartu.
- Foto kapal di bagian bawah sidebar bersifat opsional. Jangan membuat dekorasi tersebut menghalangi navigasi, footer, atau keyboard focus.

### B. Sidebar dan pemisahan menu

Sidebar menampilkan logo resmi, nama perusahaan, label sistem, item aktif yang jelas, serta kelompok navigasi berikut sesuai modul dalam cakupan dan hak akses.

| KelompokMenu acuanMakna / batas data |                     |                                                                            |
| ------------------------------------ | ------------------- | -------------------------------------------------------------------------- |
| Utama                                | Beranda             | Dashboard operasional pengguna                                             |
| Operasional                          | SPK & Job           | Penerimaan SPK dan daftar pekerjaan per kunjungan                          |
| Operasional                          | Kapal               | Kunjungan kapal, status operasional, dan jadwal                            |
| Operasional                          | Kebutuhan           | Rincian barang/jasa yang dibutuhkan kapal                                  |
| Operasional                          | Pengajuan           | Dokumen pengajuan beserta proses dan statusnya                             |
| Operasional                          | Approval            | Antrean keputusan yang menjadi kewenangan pengguna                         |
| Operasional                          | Operasional         | Clearance In/Out, laporan harian, serta serah terima                       |
| Keuangan                             | Pendanaan           | Pengajuan Kopra, ACC Ryan, dan dana diterima                               |
| Keuangan                             | Rekonsiliasi & Nota | Nota Rampung, APBS, nota tambahan, dan saldo Pelindo                       |
| Keuangan                             | Pengeluaran         | Realisasi pengeluaran yang telah tercatat                                  |
| Keuangan                             | Invoice & Tagihan   | Pisahkan tab tagihan vendor/Pelindo diterima dan invoice klien diterbitkan |
| Keuangan                             | Piutang             | Saldo invoice klien, jatuh tempo, receipt, dan alokasi pembayaran          |
| Pelaporan                            | Laporan             | Laporan sesuai permission dan scope pengguna                               |
| Master Data                          | Perusahaan / Klien  | Identitas pemberi SPK dan pihak penagihan                                  |
| Master Data                          | Produk & Satuan     | Barang, jasa, unit, dan kategori biaya                                     |
| Master Data                          | Data Kapal          | Identitas kapal yang menjadi sumber tunggal data master                    |
| Master Data                          | Data Pelabuhan      | Referensi pelabuhan                                                        |
| Master Data                          | Data Vendor         | Referensi vendor                                                           |
| Administrasi                         | Manajemen User      | Akun, role, dan permission                                                 |
| Administrasi                         | Log Aktivitas       | Audit read-only untuk pihak berwenang                                      |

Menu **Kapal** dan **Data Kapal** memiliki tujuan berbeda tetapi mengakses identitas kapal yang sama. Begitu juga **Kebutuhan** dan **Pengajuan**: hubungkan item kebutuhan ke pengajuan, tanpa memasukkan ulang data yang sama secara terpisah.
Implementasikan menu dalam cakupan bersama route, handler, dan pemeriksaan izin nyata. Menu yang tidak diizinkan bagi suatu pengguna disembunyikan tanpa menghilangkan implementasi modulnya. Gunakan submenu hanya bila ada beberapa tujuan yang benar-benar berbeda. Pisahkan badge jumlah antrean tugas dari jumlah seluruh record; badge Approval harus menghitung pekerjaan yang dapat ditindaklanjuti pengguna saat ini.

### C. Topbar dan banner sambutan

Topbar berisi pencarian, notifikasi, avatar/inisial, nama pengguna, peran, dan menu profil/logout.

- Pencarian meliputi SPK/job, kapal, pengajuan, kebutuhan, serta invoice sesuai izin. Hasil dikelompokkan berdasarkan jenis dan dibatasi scope akses sebelum dikirim ke frontend.
- Implementasikan shortcut `Ctrl+K` / `Cmd+K` hanya jika pencarian atau command dialog benar-benar bekerja. Gunakan debounce, batas hasil, loading, empty state, dan keyboard navigation.
- Notifikasi menampilkan jumlah belum dibaca milik pengguna; jangan menyalin badge angka pada gambar.
- Banner memakai foto pelabuhan/kapal, overlay navy secukupnya, sapaan **Selamat Datang, [Nama Pengguna]**, serta label **Pusat Kendali Operasional**.
- Tanggal, nama hari, dan waktu dihasilkan dari tanggal aktual dalam `Asia/Jakarta`. Lokasi menggunakan penugasan/konteks yang benar.
- Cuaca hanya ditampilkan jika ada integrasi nyata, lokasi yang tepat, dan waktu pembaruan. Jika tidak tersedia, hilangkan area cuaca; jangan menampilkan 28°C sebagai nilai bawaan.
- Kutipan motivasi bersifat opsional dan tidak mendominasi informasi operasional. Gunakan foto yang sesuai serta sumber daya gambar yang teroptimasi.

### D. Empat kartu ringkasan

Setiap KPI wajib memiliki label, periode/konteks, sumber query, scope akses, dan tujuan detail yang konsisten. Jangan memakai nilai pada mockup sebagai data produksi.

| KartuDefinisi implementasi |                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kapal Aktif                | Jumlah kapal unik dengan kunjungan yang masih aktif dalam scope pengguna; jangan menghitung kapal berangkat/kunjungan selesai sebagai aktif                         |
| Total Pengajuan            | Jumlah pengajuan pada periode/filter aktif; breakdown status mengikuti enum backend dan tidak menghitung record yang sama dua kali dalam status saat ini            |
| Total Nilai Pengajuan      | Total estimasi pengajuan pada periode tertera, dihitung sekali per pengajuan; jelaskan basisnya dan jangan mencampurkannya dengan pembayaran, invoice, atau piutang |
| Kapal Sandar Hari Ini      | Jumlah kapal unik yang tercatat mulai sandar pada hari lokal tersebut; bila datanya hanya rencana, ubah label menjadi Rencana Sandar Hari Ini                       |

Gunakan batas hari lokal yang dikonversi ke waktu penyimpanan backend. Nilai uang diformat dengan locale Indonesia, memakai tipe decimal, dan hanya dijumlahkan pada mata uang yang sama. Pengguna tanpa izin keuangan tidak menerima nilai uang pada props, cache, atau hasil pencarian; susun ulang kartu sesuai hak aksesnya.
Untuk query agregat, hindari penggandaan jumlah akibat join ke banyak item. `0` berarti hasil perhitungan benar-benar nol; sumber data yang belum tersedia harus memiliki state berbeda. Kebijakan filter, termasuk data arsip/soft-deleted, wajib terdokumentasi dan konsisten dengan halaman detail.

### E. Panel operasional utama

| PanelIsi dan perilaku |                                                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pengajuan Terbaru     | Ringkasan sekitar 5 record; tab Semua, Menunggu Approval, Dalam Proses, Selesai mengikuti status nyata; tautan Lihat Semua menuju daftar dengan filter yang sama |
| Kebutuhan Hari Ini    | Pemilih tanggal, filter kapal, dan daftar item kebutuhan pada tanggal terpilih; perubahan tanggal/filter mengubah query backend                                  |
| Kapal dalam Perhatian | Kapal dengan alasan perhatian yang nyata, misalnya kebutuhan melewati jadwal atau dokumen belum lengkap; tampilkan alasan dan urutan prioritas                   |
| Notifikasi            | Aktivitas yang relevan bagi akun, waktu, status dibaca, dan tautan detail yang diotorisasi                                                                       |
| Jadwal Kapal Hari Ini | Timeline waktu, kapal, jenis kegiatan, dan status pada hari lokal; urutkan berdasarkan timestamp aktual                                                          |
| Aktivitas Pengajuan   | Grafik periode yang dipilih dan angka ringkasan dari data agregat backend                                                                                        |
| Quick Action          | Input Kebutuhan, Buat Pengajuan, Input Invoice, dan Lihat Laporan, sebatas fitur serta izin pengguna                                                             |

**Pengajuan Terbaru:** tampilkan nomor, tanggal/jam, kapal, jenis kebutuhan, jumlah/satuan, nilai estimasi bila diizinkan, status, serta menu aksi. Nama kapal boleh membungkus baris; jangan mengulang kuantitas di beberapa kolom. Jika satu pengajuan memiliki beberapa item, tampilkan ringkasan yang jujur seperti “3 kebutuhan”, dengan detail lengkap pada halaman pengajuan. Menu aksi tidak boleh memberi approval atau perubahan status tanpa Policy dan validasi proses yang berlaku.
**Kebutuhan Hari Ini:** kolom acuan adalah kapal, kebutuhan, jumlah/satuan, jadwal, status pemenuhan, dan pengajuan terkait. Bedakan status pemenuhan kebutuhan dari status approval dokumennya. Filter kapal menampilkan count dari dataset yang sama; item tanpa pengajuan terkait memiliki state yang jelas.
**Kapal dalam Perhatian:** tampilkan thumbnail, nama, status, pelabuhan, rentang jadwal, alasan perhatian, serta link detail. Jangan memasukkan semua kapal ke panel ini hanya untuk memenuhi ruang. Jika tidak ada masalah, tampilkan state bahwa tidak ada kapal yang memerlukan perhatian khusus.
**Notifikasi:** implementasikan notifikasi aplikasi yang persisten, termasuk aksi tandai dibaca dan count belum dibaca. Pemeriksaan hak akses juga dilakukan saat target notifikasi dibuka. Audit log dan notifikasi adalah kebutuhan berbeda; jangan mengirim seluruh audit sebagai notifikasi.
**Grafik:** pilih makna data secara eksplisit. Untuk seri Dibuat, Disetujui, Diproses, dan Selesai per hari, hitung event/transisi dari riwayat yang nyata; jangan merekonstruksi histori hanya dari status terakhir. Satu pengajuan dapat muncul pada seri berbeda pada hari berbeda, sehingga angka seri bukan pembagian status yang harus dijumlahkan. Rekam histori transisi sejak implementasi. Untuk data legacy tanpa histori, tampilkan keterbatasan periode atau chart distribusi status saat ini dengan judul yang sesuai; jangan mengarang histori masa lalu. Sertakan legend, angka yang dapat dibaca, ringkasan aksesibel, dan empty state. Persentase perubahan hanya ditampilkan jika periode pembanding setara dan hasilnya dapat dihitung; saat pembanding nol, gunakan keterangan yang jelas.
**Quick Action:** gunakan tombol dengan label dan ikon fungsional; hubungkan ke form atau halaman nyata. Aksi keuangan mengikuti permission, dan semua mutation tetap melalui backend. Jangan membuat widget backup/restore atau pengaturan keamanan sensitif sebagai quick action dashboard operasional.

### F. Data dashboard, performa, dan akses

Tambahkan antrean laporan harian belum dikirim, biaya kedatangan belum dibayar, nota final/APBS yang ditunggu, invoice menunggu TTD/kirim, dan piutang jatuh tempo sesuai role. Pisahkan KPI operasional dari penyelesaian keuangan.
Bangun controller/query service dashboard yang mengambil ringkasan terotorisasi, daftar terbatas, serta data grafik. Pisahkan struktur props per panel supaya state loading/error dan pembaruan dapat dikelola tanpa memuat semua data perusahaan.

- KPI, tab count, tabel, dan detail harus memakai definisi status, scope, serta filter yang sama.
- Eager load relasi yang dipakai baris tabel, thumbnail kapal, dan notifikasi. Hitung agregat di database; jangan memuat semua record hanya untuk menghitung KPI.
- Cache ringkasan hanya bila diperlukan, dengan key yang memuat scope akses dan periode. Perubahan permission atau data terkait tidak boleh membiarkan akses/nilai lama terus ditampilkan.
- Kegagalan satu panel harus memiliki pesan dan aksi coba lagi yang sesuai. Jangan mengganti respons error dengan angka nol palsu.
- Berikan informasi pembaruan terakhir bila data di-cache atau diperbarui berkala. Realtime/polling hanya digunakan jika dibutuhkan; jangan mengasumsikan WebSocket sudah tersedia.
- Masking UI tidak cukup: nilai uang, invoice, hasil pencarian, dan badge approval yang tidak berhak diakses harus disaring di backend.

## 21. Typography dan komponen

| ElemenArahan implementasi |                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Font                      | Gunakan Inter jika belum ada font identitas yang ditetapkan; prioritaskan aset font yang tersedia |
| Judul hero                | Sekitar 32–40 px pada mobile dan 48–64 px pada desktop, menyesuaikan panjang copy                 |
| Judul halaman internal    | 24–28 px pada mobile                                                                              |
| Judul kartu               | 16–18 px, semibold atau bold                                                                      |
| Isi                       | 14–16 px; utamakan 16 px untuk paragraf dan isian form mobile                                     |
| Metadata                  | 12–13 px dengan kontras yang tetap jelas                                                          |
| Input dan tombol          | Tinggi 44–48 px, label jelas, focus terlihat                                                      |
| Spacing mobile            | Padding halaman 16–20 px; jarak antarkomponen 12–16 px                                            |
| Kartu                     | Radius 14–16 px, border ringan, shadow lembut                                                     |
| Ikon                      | Satu keluarga ikon, ukuran konsisten, accessible name untuk tombol ikon                           |

Gunakan hierarchy heading yang benar, satu `h1` untuk halaman, dan komponen reusable sesuai kebutuhan nyata. Semua tombol, tautan, serta kontrol yang ditampilkan harus berfungsi.

## 22. Responsif dan pola mobile

- Rancang mulai dari layar mobile, lalu sesuaikan grid untuk tablet dan desktop.
- Uji setidaknya lebar 360, 390, 768, 1024, 1280, 1440, dan 1536 px tanpa horizontal overflow pada halaman.
- Pada landing page, gunakan navigasi perusahaan yang ringkas dan CTA login yang mudah ditemukan.
- Untuk staf lapangan, gunakan empat menu bawah sesuai referensi: **Beranda, Kapal, Pengajuan, Profil**, dengan route dan permission yang diimplementasikan sesuai role.
- Pada tablet, dashboard admin berubah menjadi dua kolom bila ruang mencukupi. Pada mobile, sidebar menjadi drawer dan panel menjadi satu kolom; jangan mengecilkan seluruh dashboard desktop seperti gambar.
- Pada mobile admin, prioritaskan pekerjaan yang memerlukan tindakan, pengajuan, kapal/jadwal, lalu ringkasan pendukung. Akses Approval dan modul berizin tetap tersedia melalui drawer atau shortcut; jangan menghilangkannya hanya karena layout staf memakai empat tab.
- Ringkas banner mobile, susun KPI menjadi dua kolom atau satu kolom sesuai ruang, dan ubah baris tabel menjadi kartu dengan aksi detail. Jika tabel tertentu memerlukan horizontal scroll, batasi scroll pada kontainer tabel, bukan seluruh halaman.
- Perbedaan layout desktop/mobile tidak menentukan kewenangan: staf yang membuka desktop tetap mendapat scope staf, dan admin yang membuka mobile tetap mendapat akses admin yang sah.
- Pada daftar kapal, letakkan foto di kiri, prioritaskan nama dan status, lalu pindahkan jadwal serta metadata ke baris berikutnya pada layar kecil.
- Pada form pengajuan, SPK, invoice, dan pembayaran, gunakan stepper ringkas bila kompleksitas memerlukannya, satu kelompok informasi per langkah, dan aksi lanjut yang mudah dijangkau.
- Gunakan bottom sheet untuk filter atau aksi mobile bila relevan; pastikan focus, scroll, tombol tutup, dan backdrop bekerja dengan benar.
- Navigasi bawah dan tombol sticky harus memperhitungkan safe area serta tidak menutupi konten, pesan validasi, atau keyboard.
- Pertahankan fotografi yang lebih ekspresif pada hero atau sambutan. Gunakan latar tenang pada daftar dan formulir.

## 23. Komponen reusable lengkap dan struktur frontend

Gunakan direktori kanonis **`resources/js/components/`** untuk proyek Laravel + React + Inertia, dengan alias import `@/components` sesuai konfigurasi proyek. Permintaan `/recources/component` diwujudkan dalam direktori tersebut dengan ejaan `resources` yang benar. Jangan membuat folder kedua yang menduplikasi komponen.

| Folder relatifKomponen yang wajib disiapkan dan dipakai sesuai kebutuhan |                                                                                                                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/`                                                                    | Button/LoadingButton, IconButton, Badge/StatusBadge, Avatar, Card, Separator, Tooltip, Tabs, DropdownMenu                                                   |
| `forms/`                                                                 | FormField, Label, Input, PasswordInput, Textarea, NumberInput, MoneyInput, Checkbox, RadioGroup, Switch/Toggle, DatePicker, DateTimePicker, DateRangePicker |
| `selects/`                                                               | Select, SearchSelect/Combobox, AsyncSearchSelect, MultiSelect, field penghubung opsi yang saling bergantung                                                 |
| `tables/`                                                                | DataTable, TableHeader/Cell, SortableHeader, RowActions, RowSelection, ExpandableRow, MobileRecordCard                                                      |
| `pagination/`                                                            | Pagination, PageSizeSelect, ResultCount, navigasi halaman mobile                                                                                            |
| `filters/`                                                               | SearchInput, FilterBar, FilterDrawer/BottomSheet, FilterChips, DateRangeFilter, ResetFilters                                                                |
| `overlays/`                                                              | Modal/Dialog, ConfirmDialog, DestructiveConfirmDialog, Drawer/Sheet; alasan revisi/penolakan dapat diwajibkan                                               |
| `navigation/`                                                            | Breadcrumb, Sidebar/NavGroup, Topbar, MobileBottomNavigation, CommandSearch                                                                                 |
| `layout/`                                                                | PageHeader dengan title/subtitle/actions, PageContainer, SectionHeader, FormSection, DetailSection, StickyActionBar, ResponsiveGrid                         |
| `feedback/`                                                              | Alert, Toast, Skeleton, LoadingState, EmptyState, ErrorState, ValidationSummary, Progress                                                                   |
| `workflow/`                                                              | Stepper, StatusTimeline, ApprovalTimeline, ApprovalActions, DocumentChecklist, ActivityFeed, RevisionSummary                                                |
| `uploads/`                                                               | FileUpload, PhotoUpload/CameraInput, AttachmentList, FilePreview, UploadProgress, SignedInvoiceUpload                                                       |
| `finance/`                                                               | InvoiceItemsEditor, CostSummary, PaymentAllocationEditor, ReceiptSummary, TaxDeductionFields, ReconciliationSummary                                         |
| `dashboard/`                                                             | StatCard, PendingTaskList, VesselAttentionList, ScheduleTimeline, NotificationList, ActivityChart, QuickActions                                             |

Tempatkan halaman di `resources/js/pages/`, layout halaman di `resources/js/layouts/`, hook reusable di `resources/js/hooks/`, types di `resources/js/types/`, dan helper format di `resources/js/lib/`. Ikuti struktur existing bila sudah konsisten, lalu dokumentasikan pemetaannya.

### Kontrak dan perilaku komponen

- Input memiliki `id`, label, value, handler, error, description, required, disabled/readOnly, dan hubungan aksesibilitas yang jelas. Placeholder tidak menggantikan label.
- SearchSelect mendukung loading, empty, pencarian, keyboard, clear, selected option, dan pagination opsi bila dataset besar. Opsi diambil dari backend sesuai izin; jangan mengunduh seluruh master untuk tiap form.
- Table mendukung sorting/filter/pagination server-side, row key UUID, aksi sesuai permission, dan tampilan kartu mobile. Jangan menjalankan sorting hanya pada halaman yang sudah diambil jika label UI menyiratkan seluruh dataset.
- Filter tercermin di URL, dapat di-reset, menampilkan chip aktif, dan tetap terjaga saat kembali dari detail. Scope berbeda tidak boleh saling membocorkan cache atau state data privat.
- Pagination menampilkan range/total yang benar jika tersedia, page size yang dibatasi server, serta state navigasi disabled. Pada cursor pagination, jangan mengarang total/nomor halaman yang tidak diketahui.
- Modal/Drawer memiliki fokus awal, focus trap, pengembalian fokus, Escape/tutup, label aksesibel, scroll internal, dan peringatan perubahan belum disimpan jika diperlukan.
- MoneyInput menyimpan nilai decimal yang dapat diproses tepat; format Rupiah hanya tampilan. Komponen pajak menampilkan dasar konfigurasi yang nyata, bukan tarif bawaan rekaan.
- FileUpload mendukung validasi ukuran/tipe, progress, preview, kegagalan dan retry. Foto laporan harian opsional, tetapi scan TTD merupakan prasyarat pengiriman invoice; gunakan komponen yang sama dengan aturan validasi berbeda.
- `PageHeader` menyatukan title, subtitle, breadcrumb dan aksi halaman. Gunakan hierarchy heading yang benar dan jangan membuat heading duplikat hanya untuk mengubah ukuran font.
- `useForm` menangani processing, error per-field dan submit. Form order/invoice memakai item repeater yang mempertahankan ID item saat diedit agar relasi tidak rusak.
- Confirmation dialog harus menampilkan dokumen, nominal bila relevan, dan akibat aksi. Tombol loading/disabled membantu UX; integritas tetap dijaga server melalui validasi dan idempotensi.

Gunakan satu keluarga ikon dan satu fondasi UI yang konsisten. Sediakan katalog komponen internal untuk development/QA beserta contoh state desktop/mobile; data contoh harus terisolasi dari produksi. Jangan meninggalkan komponen palsu atau halaman demo sebagai fitur operasional.

