# Prompt Antigravity — PT Samudra Jaya Andalas | Sistem Lengkap, Desktop & Mobile

## 1. Mandat dan cakupan pekerjaan

Kerjakan proyek ini secara end-to-end di Antigravity menggunakan Gemini Flash dan Claude Sonnet sesuai ketersediaan lingkungan. Gunakan Gemini Flash untuk eksplorasi dan pekerjaan rutin; gunakan Claude Sonnet untuk keputusan arsitektur, implementasi utama, serta review akhir.
Bangun **Sistem Keagenan Kapal PT Samudra Jaya Andalas** dengan **Laravel + React + Inertia + PostgreSQL + Redis**, dilengkapi **Security, Spatie Roles & Permissions, Activitylog, dan Backup**.
Cakupan pekerjaan sekarang mencakup **seluruh alur sistem**, mulai dari penerimaan SPK, biaya kedatangan Pelindo, kebutuhan dan order vendor, approval, pendanaan melalui Kopra, pembayaran, laporan kegiatan harian, Clearance Out, nota final Pelindo/APBS, penerbitan invoice ke klien, sampai pembayaran klien terkonfirmasi dan penutupan pekerjaan.
Bangun **dua susunan tampilan lengkap: desktop dan mobile untuk semua modul serta semua peran yang berwenang**. Keduanya merupakan satu aplikasi, memakai database, aturan bisnis, role/permission, dan sumber data yang sama. Mobile mencakup keuangan, approval, invoice, master, serta administrasi; jangan membatasinya pada halaman staf lapangan saja.
Pertahankan landing page, dashboard desktop referensi Bu Titik, pengalaman staf lapangan referensi Pak Prima, palet Corporate Maritime, seluruh fondasi teknis, dan empat referensi visual yang telah diberikan. Perluasan alur pada dokumen ini menjadi cakupan implementasi wajib, bukan sekadar menu atau rencana pengembangan berikutnya.
Hasil pekerjaan harus berupa fitur terhubung, migration dan relasi yang benar, konfigurasi, komponen reusable, dokumentasi setup, serta pengujian yang benar-benar dijalankan. Gunakan route dan handler nyata. Jika modul dalam cakupan belum ada, implementasikan; jika belum ada transaksi, tampilkan empty state yang jujur. Ketiadaan kredensial layanan eksternal harus dilaporkan tanpa mengarang keberhasilan integrasinya.
**INAPORTNET tidak termasuk cakupan.** Penerimaan email SPK, pengajuan Kopra, transfer bank, dan pengiriman invoice fisik dicatat melalui dokumen serta konfirmasi pengguna. Jangan mengasumsikan integrasi email, bank/Kopra, Pelindo, atau portal pihak ketiga telah tersedia. Tombol pencatatan transfer merekam transaksi dan bukti; tidak otomatis memindahkan dana.

## 2. Alur bisnis lengkap dan pembagian pekerjaan

### A. Aktor, tugas, dan batas kewenangan

Nama berikut berasal dari alur pengguna dan mewakili tugas operasional. Implementasikan melalui role, permission, serta assignment akun; jangan memeriksa string nama orang untuk menentukan akses.

| AktorTanggung jawab sistem            |                                                                                                                                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Perusahaan / klien                    | Mengirim SPK, menerima dua jenis invoice, dan melakukan pembayaran                                                                                                                                                                                            |
| Pihak kapal                           | Menyampaikan form kebutuhan serta informasi kegiatan kepada staf SJA                                                                                                                                                                                          |
| Pak Prima — staf lapangan             | Input awal SPK, kunjungan kapal, kebutuhan, order vendor, laporan harian, dokumen operasional, dan serah terima setelah Clearance Out                                                                                                                         |
| Bu Titik — admin operasional/keuangan | Membuka/mencatat SPK bila menerima email, review administrasi, koordinasi kebutuhan, invoice vendor, pengajuan biaya, penerimaan dana, pembayaran vendor, rekonsiliasi nota, penerbitan invoice klien, dan konfirmasi penerimaan pembayaran sesuai assignment |
| Direktur                              | Approval pengajuan biaya setelah review Bu Titik, atau mengembalikan/menolak dengan alasan                                                                                                                                                                    |
| Pak Ryan — otorisasi dana/pembayaran  | ACC pendanaan Kopra, review serah terima/biaya akhir, serta transfer Pelindo pada tahap final sesuai alur                                                                                                                                                     |
| Vendor                                | Memberikan penawaran/list harga, menjalankan order, menerbitkan invoice, dan menerima pembayaran                                                                                                                                                              |
| Pelindo                               | Menyediakan tagihan/nota terkait layanan pelabuhan dan menerima pembayaran                                                                                                                                                                                    |
| Kopra                                 | Kanal pengajuan/pencatatan proses pendanaan eksternal; simpan nomor referensi, tanggal, dan bukti                                                                                                                                                             |
| Admin Sistem / Auditor                | Administrasi akses dan audit sesuai izin; tidak otomatis memperoleh kewenangan approval atau transfer                                                                                                                                                         |

Aktor eksternal tidak otomatis menjadi akun login. Form kapal, penawaran vendor, dokumen Pelindo, dan komunikasi klien dapat dimasukkan staf berwenang ke sistem. Jangan membuat portal eksternal tambahan tanpa kebutuhan yang ditetapkan.

### B. Penerimaan SPK dan pembukaan kunjungan kapal

1. Perusahaan mengirim SPK kepada SJA. Email dapat dibuka Pak Prima atau Bu Titik.
2. Penerima mencatat sumber email/tanggal terima dan mengunggah SPK; jika diterima Bu Titik, teruskan/assign input awal kepada Pak Prima.
3. Pak Prima membuat atau melengkapi draft SPK, memeriksa perusahaan, kapal, pelabuhan, tanggal kedatangan, dan kebutuhan kegiatan.
4. Pak Prima mengirim SPK lengkap kepada Bu Titik untuk review dan proses berikutnya. Revisi dikembalikan ke Prima dengan alasan yang tersimpan.
5. SPK yang diterima membuka **job keagenan/kunjungan kapal** sebagai penghubung dokumen, biaya, kebutuhan, kegiatan, dan invoice. Nomor job serta nomor dokumen sistem dibuat unik oleh server.

| Field SPKKetentuan               |                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Nomor SPK dari klien             | Simpan sesuai dokumen; aturan duplikasi menggunakan kombinasi identitas klien dan nomor yang dinormalisasi |
| Perusahaan / klien               | Select-search dari master perusahaan; perusahaan penagihan ditentukan jelas                                |
| Kapal                            | Select-search dari master kapal; identitas master tidak diinput ulang pada setiap SPK                      |
| Tanggal SPK dan tanggal diterima | Dipisahkan karena dapat berbeda                                                                            |
| Pelabuhan tujuan                 | Select-search dari master pelabuhan                                                                        |
| ETA / rencana kedatangan         | Tanggal wajib; jam dapat belum diketahui dan tidak boleh ditampilkan sebagai kepastian                     |
| Rencana kegiatan                 | Pilihan kegiatan/produk jasa dan rincian yang diperlukan                                                   |
| Durasi / ETD                     | Opsional pada awal; jangan mewajibkan jumlah hari sebelum diketahui                                        |
| File SPK dan PIC                 | Lampiran utama serta kontak PIC yang relevan; batasi data pribadi seperlunya                               |
| Assignment                       | Staf lapangan/penanggung jawab; tidak ditentukan dari input role bebas pengguna                            |

Satu kapal dapat memiliki banyak kunjungan berbeda. Gunakan `port_call_id`/job untuk menautkan transaksi, bukan hanya `vessel_id`, agar kunjungan kapal yang sama tidak tercampur. Jika satu SPK mencakup beberapa kunjungan, relasikan dengan jelas dan jangan menduplikasi dokumen sumber.

### C. Biaya awal Pelindo dan Clearance In

1. Bu Titik menindaklanjuti SPK dengan pencatatan estimasi/tagihan awal Pelindo untuk kedatangan.
2. Bu Titik menyiapkan pengajuan pembayaran awal dan meneruskannya kepada pihak yang berwenang. Sebagai rancangan awal, Pak Ryan menjadi otorisator pembayaran Pelindo; penugasan pelaksana transfer awal dapat dikonfigurasi karena belum disebutkan secara tegas dalam brief.
3. Pelaksana mencatat transfer, tanggal, nominal, referensi, penerima, dan bukti. Status belum dibayar tidak boleh berubah hanya karena bukti diunggah; lakukan verifikasi sesuai kewenangan.
4. **Biaya Pelindo kedatangan wajib dibayar sebelum kapal datang**, sesuai alur operasional SJA yang diberikan. Sistem menampilkan peringatan tenggat dan menahan status “Siap Clearance In” sampai prasyarat pembayaran terverifikasi.
5. Prima mencatat Clearance In dan kedatangan aktual beserta dokumen yang relevan. Riwayat kunjungan berlanjut ke Labuh/Antri atau langsung Sandar berdasarkan kejadian nyata.

Keterlambatan pembayaran tidak boleh membuat pengguna memalsukan waktu kedatangan atau kehilangan kemampuan mencatat kejadian aktual. Jika kapal sudah datang saat pembayaran belum beres, simpan fakta aktual, tandai pelanggaran prasyarat sebagai exception, dan eskalasikan kepada penanggung jawab.
Catat pembayaran awal sebagai alokasi terhadap tagihan/uang muka Pelindo pada job yang benar. Nilainya akan diperhitungkan kembali saat nota final tiba, sehingga tidak dibayar atau dibebankan dua kali.

### D. Kebutuhan kapal, order vendor, approval, dan pendanaan

| UrutanPelaksanaTindakan dan keluaran |                  |                                                                                                                                |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1                                    | Kapal → Prima    | Form permintaan diterima; Prima mencatat kebutuhan, jumlah, satuan, waktu dibutuhkan, catatan, dan lampiran sumber             |
| 2                                    | Prima → Bu Titik | Bu Titik meninjau informasi kebutuhan dan mengoordinasikan tindak lanjut; hasil review/permintaan revisi dicatat               |
| 3                                    | Bu Titik → Prima | Prima menyiapkan order/permintaan penawaran untuk kebutuhan yang telah ditinjau                                                |
| 4                                    | Prima → Vendor   | Catat vendor yang dihubungi, daftar/penawaran yang diterima, harga, ketersediaan, estimasi layanan, serta lampirannya          |
| 5                                    | Prima / Bu Titik | Hubungkan pilihan vendor dan detail order dengan kebutuhan asal; jangan menetapkan jumlah minimum penawaran yang tidak diminta |
| 6                                    | Bu Titik         | Masukkan invoice/penawaran vendor, biaya, dan rincian pengajuan; lakukan verifikasi administratif sebelum diteruskan           |
| 7                                    | Direktur         | Setujui, minta revisi, atau tolak pengajuan biaya dengan alasan serta rekaman waktu keputusan                                  |
| 8                                    | Bu Titik         | Setelah approval Direktur, catat pengajuan pendanaan melalui Kopra beserta nomor referensi, jumlah, tanggal, dan dokumen       |
| 9                                    | Pak Ryan         | ACC atau kembalikan pengajuan dana; keputusan ditautkan ke versi pengajuan yang disetujui                                      |
| 10                                   | Bu Titik         | Catat dana diterima: nominal aktual, tanggal, rekening/kas tujuan, dan bukti                                                   |
| 11                                   | Bu Titik         | Catat transfer ke vendor dan alokasi pembayaran ke tagihan/order; lampirkan bukti dan lakukan verifikasi                       |
| 12                                   | Prima            | Catat realisasi kebutuhan/jasa di lapangan, jumlah terpenuhi, waktu, hasil, serta kendala                                      |

Satu kebutuhan dapat dilayani beberapa order/vendor jika diperlukan; satu pengajuan dapat memiliki beberapa item. Hubungan item harus dapat ditelusuri dari kebutuhan → order → tagihan → pengajuan biaya → pendanaan → pembayaran. Alur form mengambil data sumber yang telah dicatat, sehingga Prima dan Bu Titik melengkapi tahap masing-masing tanpa mengetik ulang kebutuhan yang sama. Jangan menggandakan item biaya hanya untuk menghubungkan dokumen.
Realisasi layanan dan status pembayaran adalah dua hal berbeda. Vendor dapat melaksanakan layanan pada waktu yang disepakati; jangan menandai kebutuhan “Terpenuhi” hanya karena transfer telah dicatat. Setiap perubahan nilai/vendor/item setelah approval harus menghasilkan revisi dan penilaian ulang tahap approval yang terdampak.

### E. Laporan kegiatan harian Pak Prima

**Prima wajib mengirim laporan setiap hari untuk kunjungan aktif yang menjadi tanggung jawabnya. Foto opsional.** Sediakan draft dan submit, dengan detail kegiatan wajib sebelum submit.

- Header: job, kapal, pelabuhan, tanggal laporan, dan petugas.
- Detail: waktu/urutan kegiatan, deskripsi, hasil/progres, kendala, serta rencana tindak lanjut yang relevan.
- Lampiran: foto opsional, dapat lebih dari satu sesuai batas upload. Tidak adanya foto tidak boleh menggagalkan laporan yang lengkap.
- Jika tidak ada kegiatan, pengguna tetap mengirim laporan “Tidak ada kegiatan” dengan penjelasan; jangan membuat laporan otomatis palsu.
- Tampilkan daftar laporan belum dikirim, draft, terkirim, dan perlu revisi. Revisi setelah submit disimpan sebagai riwayat/perubahan yang dapat diaudit.
- Gunakan tanggal lokal `Asia/Jakarta`. Jam pengingat dan tenggat dapat dikonfigurasi; jangan mengasumsikan jam tertentu telah disetujui.
- Cegah laporan header ganda untuk petugas/job/tanggal yang sama; beberapa kegiatan masuk sebagai item laporan. Bila pergantian petugas diizinkan, aturan assignment tetap jelas.

Pengiriman berarti submit ke sistem dan notifikasi internal kepada pihak terkait. Jangan otomatis mengirim laporan ke email/WhatsApp eksternal tanpa konfigurasi serta instruksi yang relevan.

### F. Clearance Out, serah terima, dan nota final

1. Prima melengkapi kegiatan operasional dan mencatat Clearance Out, tanggal keberangkatan aktual, serta dokumen pendukung.
2. Prima melakukan serah terima kepada Bu Titik atas pekerjaan, realisasi kebutuhan, laporan harian, dan dokumen yang masih ditunggu.
3. Bu Titik memeriksa kelengkapan dan meneruskan rekap kepada Pak Ryan. Pak Ryan melakukan review/ACC sesuai kewenangannya; alasan pengembalian tersimpan.
4. Bu Titik mengumpulkan/mencatat **Nota Rampung Pelindo**, tagihan **APBS**, dan nota biaya di luar kebutuhan awal. Prima dapat melengkapi bukti lapangan pada job yang sama.
5. Seluruh nota diverifikasi, dikaitkan dengan sumber biaya, dan direkonsiliasi dengan pembayaran awal maupun pembayaran vendor yang sudah ada.
6. Bu Titik mengajukan pembayaran Pelindo final atau selisih yang masih perlu dibayar kepada Pak Ryan.
7. Pak Ryan mencatat transfer Pelindo, lalu bukti serta alokasinya diverifikasi. Jika tidak ada saldo terutang, penyelesaian dicatat melalui rekonsiliasi tanpa menciptakan transfer bernilai nol.
8. Setelah biaya lengkap, rekonsiliasi selesai, dan kewajiban Pelindo terselesaikan, Bu Titik dapat melakukan release invoice ke perusahaan.

**Selesai operasional tidak sama dengan selesai keuangan.** Job dapat berada pada kondisi “Clearance Out selesai — menunggu nota final” atau “Operasional selesai — menunggu pembayaran klien”.
Menurut informasi pengguna, Nota Rampung dapat menyusul sekitar **2–3 hari**, dan nota APBS sekitar **1–2 minggu**. Simpan sebagai acuan pemantauan yang dapat dikonfigurasi, bukan SLA resmi atau tanggal terima otomatis. Basis awal perkiraan perlu diatur per jenis dokumen; tanggal dokumen dan tanggal diterima tetap mengikuti fakta. APBS dipertahankan sebagai istilah pengguna tanpa mengarang kepanjangannya.
Gunakan checklist dokumen per job, dengan kondisi Menunggu, Diterima, Diverifikasi, atau Tidak Berlaku disertai alasan dan pemberi keputusan. Catat dokumen yang diketahui masih akan datang. Status Tidak Berlaku tidak boleh menjadi jalan pintas untuk melewati biaya yang sebenarnya masih tertunda.
Clearance In/Out menggunakan modul dan alur dasar yang sama untuk berbagai kapal. Perbedaan kapal, pelabuhan, lama kegiatan, dan jasa tambahan dicatat melalui parameter, tarif yang berlaku pada transaksi, serta nota tambahan; jangan membuat alur terpisah hanya karena nama kapal berbeda.

### G. Rekonsiliasi biaya Pelindo dan biaya tambahan

Sediakan satu daftar biaya per job dengan sumber yang dapat ditelusuri: kebutuhan kapal, invoice vendor, tagihan Pelindo awal, Nota Rampung, APBS, biaya tambahan di luar kebutuhan, jasa keagenan, dan materai sesuai klasifikasi penagihannya.

- Bedakan estimasi, nilai final yang diverifikasi, uang muka, realisasi pembayaran, dan nilai yang akan ditagihkan kepada klien.
- Tentukan apakah nota final menggantikan/merinci tagihan awal atau merupakan biaya tambahan. Jangan menjumlahkan uang muka sebagai biaya baru di atas nota final.
- Hitung sisa kewajiban berdasarkan tagihan final yang valid dikurangi alokasi pembayaran sah. Bayar hanya saldo yang masih terutang.
- Bila terjadi lebih bayar, catat uang muka/saldo lebih/refund dengan bukti; jangan menghilangkannya atau menagihkannya kembali secara otomatis.
- Biaya tambahan memerlukan kategori, alasan, sumber nota, nilai, pihak penerbit, dan review. Jika belum dicakup approval sebelumnya, masuk ke pengajuan biaya tambahan melalui tahapan otorisasi yang sesuai.
- Biaya dan dokumen yang sudah diposting tidak dihapus diam-diam. Koreksi dilakukan melalui versi, pembatalan yang diaudit, atau dokumen penyesuaian sesuai tahap transaksi.

### H. Dua invoice klien, tanda tangan, pengiriman, dan pembayaran

Sistem menerbitkan **dua jenis invoice terpisah** yang tetap terhubung pada perusahaan dan job yang sama:

| Jenis invoiceIsi        |                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Invoice Keagenan / Jasa | Jasa keagenan dan materai sesuai rincian yang disetujui; sediakan pengaturan perlakuan PPh/pajak pada komponen yang relevan |
| Invoice Reimburse       | Rincian biaya pihak ketiga yang dapat ditagihkan kembali beserta bukti; tidak memasukkan jasa keagenan untuk kedua kalinya  |

Simpan nomor, tanggal, jatuh tempo, identitas pihak, referensi SPK/kapal/job, item, mata uang, subtotal, komponen pajak/potongan, dan total. Identitas serta harga pada invoice yang sudah diterbitkan menggunakan snapshot agar tidak berubah saat master diperbarui. Invoice draft boleh disiapkan lebih awal, tetapi **release ditahan sampai gerbang kelengkapan biaya dan penyelesaian Pelindo terpenuhi**.
PPh, materai, dasar perhitungan, pihak pemotong, dan pembulatan harus configurable serta mengikuti dokumen/perlakuan transaksi yang telah ditetapkan perusahaan. Jangan mengarang tarif atau mengasumsikan reimburse selalu bebas pajak. Bedakan komponen yang menambah tagihan dari potongan yang mengurangi kas diterima; catat bukti potong bila relevan. Kolom yang belum memiliki dasar pengaturan tidak boleh menghasilkan nominal pajak rekaan.
Urutan pekerjaan invoice:

1. Bu Titik memeriksa rekap biaya dan menyiapkan masing-masing invoice sesuai klasifikasi item.
2. Sistem memvalidasi kelengkapan serta mencegah satu biaya yang sama ditagihkan penuh di kedua invoice. Jika suatu biaya perlu dibagi, simpan alokasi dan totalnya tidak boleh melampaui nilai yang disetujui.
3. Bu Titik melakukan release/finalisasi. Sistem menetapkan nomor unik secara atomik dan menyimpan versi dokumen.
4. Invoice dicetak. Sediakan template cetak/PDF yang jelas membedakan Keagenan dan Reimburse, memuat logo, nomor, identitas, item, total, serta area tanda tangan; uji layout A4 untuk item yang melebihi satu halaman. Proses tanda tangan dan penempelan materai fisik berlangsung di luar aplikasi sesuai kebutuhan dokumen.
5. **Foto/scan invoice yang sudah ditandatangani wajib diunggah sebelum invoice ditandai siap dikirim/terkirim.** Lampiran ditautkan ke versi invoice yang tepat.
6. Bu Titik mencatat pengiriman fisik ke PT/klien: tanggal, metode, penerima/tujuan, dan bukti/resi atau tanda terima yang relevan. Unggah foto TTD sendiri tidak otomatis berarti dokumen sudah dikirim.
7. Invoice yang dikirim masuk pemantauan piutang dan menunggu pembayaran. Catat jatuh tempo sesuai kesepakatan yang tersedia; jangan membuat termin bawaan tanpa dasar.
8. Setelah pembayaran diterima, pihak keuangan mencatat serta mengonfirmasinya langsung berdasarkan transaksi nyata: tanggal, nominal, rekening tujuan, referensi bank, dan bukti.
9. Alokasikan penerimaan ke invoice terkait. Satu pembayaran dapat melunasi dua invoice; satu invoice dapat dibayar beberapa kali.
10. Invoice menjadi Lunas setelah alokasi pembayaran dan penyesuaian yang sah menyelesaikan saldo. Job baru ditutup secara finansial setelah semua tagihan, biaya, dan saldo terkait direkonsiliasi.

Penerimaan pembayaran merupakan pencatatan dan verifikasi langsung, bukan transfer bank otomatis. Jangan mengharuskan tahap ACC baru yang tidak disebutkan hanya untuk mencatat penerimaan dana. Jika uang datang sebelum dokumen dikirim, catat sebagai penerimaan belum dialokasikan/uang muka sesuai konteks; jangan menolak fakta bank atau menandai invoice terkirim secara palsu.
Tangani pembayaran sebagian, kelebihan bayar, pembayaran duplikat, bukti potong belum lengkap, penolakan bukti, dan koreksi. Formula kontrol saldo menggunakan komponen yang disetujui: total tagihan dikurangi pembayaran teralokasi, kredit sah, serta potongan terverifikasi yang memang diakui. Selisih tidak boleh otomatis dianggap lunas atau dihapus. Aksi konfirmasi harus idempotent dan mencegah alokasi melebihi saldo yang diperbolehkan.

### I. Gerbang penagihan setelah operasional

```
flowchart TD
    A["Clearance Out selesai"] --> B{"Nota dan biaya lengkap?"}
    B -->|Belum| C["Pantau Nota Rampung, APBS, dan nota tambahan"]
    C --> B
    B -->|Sudah| D["Rekonsiliasi biaya dan pembayaran awal"]
    D --> E{"Masih ada kewajiban Pelindo?"}
    E -->|Ada| F["Bu Titik ajukan; Pak Ryan bayar"]
    F --> G["Verifikasi bukti dan alokasi"]
    G --> E
    E -->|Tidak| H["Bu Titik release invoice keagenan dan reimburse"]
```

Diagram ini menjelaskan gerbang penagihan; tahapan TTD, kirim fisik, penerimaan pembayaran, dan penutupan mengikuti alur invoice di atas. Dokumen tidak berlaku hanya dapat dikeluarkan dari checklist melalui alasan serta kewenangan yang tercatat.

### J. Keputusan yang perlu disimpan sebagai konfigurasi

Buat daftar keputusan implementasi untuk pelaksana pembayaran Pelindo awal, penandatangan invoice, termin pembayaran klien, perlakuan pajak/materai, rekening yang dipakai, jam laporan harian, dan dasar tanggal perkiraan nota. Implementasikan struktur, validasi, serta pengaturannya; jangan mengisi identitas, tarif, tanggal, atau approval yang belum diberikan seolah fakta. Role aktor yang sudah disebut tetap menjadi acuan alur.

## 3. Model data, state, dan kontrol transaksi

### A. Entitas dan relasi utama

Semua entitas bisnis baru mengikuti aturan UUID, foreign key, indexing, dan soft delete yang sesuai pada bagian setup database. Gunakan nama tabel/model mengikuti konvensi proyek; tabel berikut adalah rancangan domain, bukan alasan membuat tabel duplikat bila entitas setara sudah ada.

| DomainEntitas / hubungan utama |                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Perusahaan dan referensi       | `companies`, `vessels`, `ports`, `vendors`, `products`, `units`; produk membedakan barang/jasa dan tidak mengunci harga transaksi pada harga master terbaru        |
| SPK                            | `work_orders`, `work_order_items`, lampiran SPK; terkait perusahaan dan informasi kegiatan                                                                         |
| Kunjungan / job                | `port_calls` terkait SPK, kapal, pelabuhan, assignment petugas, ETA/ETD opsional, dan waktu aktual                                                                 |
| Clearance                      | `clearances` untuk tipe In/Out, dokumen dan waktu; tagihan/pembayaran tetap memiliki referensi sendiri                                                             |
| Kebutuhan                      | `vessel_requests`, `vessel_request_items` terkait job, produk/jasa, jumlah, satuan, dan waktu kebutuhan                                                            |
| Vendor / order                 | `vendor_quotes`, `vendor_quote_items`, `purchase_orders`, `purchase_order_items`; item order menautkan item kebutuhan                                              |
| Tagihan sumber                 | `cost_documents`, `cost_document_items` untuk invoice vendor, Pelindo awal/final, APBS, dan nota lain; terkait issuer serta job                                    |
| Pengajuan biaya                | `expense_requests`, `expense_request_items`; mengacu item biaya/kebutuhan/order, menyimpan versi estimasi yang diajukan                                            |
| Approval                       | `approval_steps`, `approval_decisions` terkait dokumen dan versinya; mendukung review Titik, keputusan Direktur, ACC Ryan tanpa menyamakan kewenangannya           |
| Pendanaan                      | `funding_requests`, `funding_receipts` berisi referensi Kopra, ACC Ryan, dan dana diterima Titik; penerimaan dana ini tidak dihitung sebagai pendapatan dari klien |
| Pembayaran keluar              | `outgoing_payments`, `outgoing_payment_allocations` mengalokasikan transfer/uang muka ke biaya sumber yang tepat                                                   |
| Kegiatan harian                | `daily_reports`, `daily_report_items`, foto opsional; terkait job, petugas, dan tanggal                                                                            |
| Serah terima / penutupan       | `handover_reviews`, checklist dokumen akhir, rekonsiliasi job, dan catatan nota yang masih ditunggu                                                                |
| Invoice klien                  | `client_invoices`, `client_invoice_items`; tipe Keagenan atau Reimburse, snapshot versi, nomor unik, serta referensi biaya yang ditagihkan                         |
| Pengiriman                     | `invoice_deliveries`; referensi invoice/versi, scan TTD, tanggal, metode, dan bukti pengiriman                                                                     |
| Penerimaan klien               | `client_receipts`, `receipt_allocations`, bukti potong/penyesuaian yang relevan; alokasi ke satu atau beberapa invoice                                             |
| Dokumen dan riwayat            | Attachment private, status-transition history, notifikasi, serta Activitylog; riwayat bisnis tidak digantikan hanya oleh log teknis                                |

Pisahkan **invoice vendor/tagihan Pelindo yang diterima SJA** dari **invoice keagenan/reimburse yang diterbitkan SJA untuk klien**. Pisahkan **pengajuan biaya** dari **invoice piutang**, serta **dana pendanaan** dari **pembayaran klien**. Satu angka tidak boleh masuk ke beberapa total sebagai biaya atau pendapatan yang sama.
Dokumen sumber perlu identitas/nomor, issuer, tanggal, nominal, mata uang, job, attachment, dan status verifikasi. Deteksi duplikasi berdasarkan kombinasi yang sesuai; nomor invoice dapat sama pada issuer berbeda. Riwayat biaya yang sudah dibayar atau ditagihkan menggunakan pembatalan/koreksi tercatat, bukan soft delete untuk menyembunyikan transaksi.

### B. State dipisah per domain

Gunakan enum/state machine dan transisi eksplisit di server. Sesuaikan nama teknis dengan proyek, tetapi pertahankan makna berikut.

| DomainStatus acuan      |                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| SPK                     | Draft, Diajukan Prima, Review Bu Titik, Perlu Revisi, Diterima, Dibatalkan                                                      |
| Kunjungan kapal         | Rencana Kedatangan, Datang, Labuh/Antri, Sandar, Berangkat, Dibatalkan; transisi mengikuti fakta lapangan                       |
| Clearance               | Draft, Menunggu Prasyarat, Siap Diproses, Selesai; In dan Out adalah jenis proses berbeda                                       |
| Pengajuan biaya         | Draft, Review Bu Titik, Menunggu Direktur, Perlu Revisi, Ditolak, Disetujui Direktur, Dibatalkan                                |
| Pendanaan               | Belum Diajukan, Diajukan Kopra, Menunggu ACC Ryan, Disetujui, Dana Diterima Sebagian, Dana Diterima, Ditolak/Dibatalkan         |
| Order / kebutuhan       | Menunggu Vendor, Penawaran Diterima, Order Dikonfirmasi, Diproses, Terpenuhi Sebagian, Terpenuhi, Dibatalkan                    |
| Pembayaran sumber biaya | Belum Dibayar, Sebagian, Lunas, Lebih Bayar; dihitung dari alokasi yang sah, dengan verifikasi bukti sebagai state terpisah     |
| Laporan harian          | Draft, Dikirim, Perlu Revisi, Direvisi; riwayat submit tetap tersimpan                                                          |
| Rekonsiliasi akhir      | Menunggu Nota, Review Bu Titik, Review Ryan, Perlu Revisi, Menunggu Pembayaran Pelindo, Siap Ditagihkan                         |
| Dokumen invoice klien   | Draft, Review, Released, Dibatalkan/Dikoreksi melalui prosedur terdokumentasi                                                   |
| Pengiriman invoice      | Menunggu TTD, Siap Dikirim, Terkirim; dokumen signed harus cocok dengan versi yang akan dikirim                                 |
| Pelunasan invoice       | Belum Dibayar, Dibayar Sebagian, Lunas, Lebih Bayar; overdue berasal dari jatuh tempo dan saldo, bukan mengganti status dokumen |
| Job                     | Berjalan, Operasional Selesai, Menunggu Dokumen/Biaya Akhir, Dalam Penagihan, Selesai Finansial                                 |

Draft adalah status dokumen, bukan posisi fisik kapal. Status kapal tidak berubah menjadi Lunas, dan status invoice tidak boleh menjadi Sandar. Buat badge berdasarkan domain serta semantic token yang sama pada desktop/mobile.

### C. Aturan integritas dan pekerjaan bersamaan

- Setiap aksi submit/approve/reject/revise/release/pay/confirm memiliki Policy, Form Request, prasyarat status, transaksi database, dan riwayat actor/waktu/alasan.
- Gunakan lock/version check untuk approval, penomoran invoice, alokasi pembayaran, dan rekonsiliasi; idempotency key atau kunci unik mencegah double-submit maupun retry membuat transaksi ganda.
- Approval berlaku untuk versi dokumen tertentu. Perubahan material membatalkan/mengulang persetujuan yang terdampak; jangan mengubah nilai yang telah disetujui secara diam-diam.
- Jangan menganggap biaya nol ketika invoice/nota belum diterima. Bedakan “belum diketahui”, “tidak berlaku”, dan angka nol yang sah.
- Terapkan scope job/penugasan serta permission pada pencarian, select options, export, file download, KPI, dan semua mutasi.
- Sebagai batas awal, pembuat pengajuan tidak menjadi final approver atas pengajuan sendiri. Bu Titik tetap dapat melakukan review administratif dan pencatatan yang memang menjadi tugasnya; hal itu tidak menggantikan approval Direktur atau ACC Ryan.
- Jangan menyimpan keputusan historis hanya di cache. Event, lampiran, alokasi, dan state bisnis ada di PostgreSQL/storage private, dengan notifikasi/job dijalankan setelah commit.
- Tambahkan index terukur untuk job/status/tanggal, approval actor/status, laporan per job-petugas-tanggal, dokumen issuer/nomor, invoice perusahaan/jatuh tempo, dan relasi alokasi.
- Finalisasi job membutuhkan operasi selesai, checklist nota tuntas, biaya direkonsiliasi, kedua jenis invoice yang diperlukan selesai ditangani, dan saldo klien terselesaikan. Tipe invoice tanpa item sah tidak perlu diterbitkan dengan nilai palsu; alasan tidak berlaku harus dapat ditelusuri.

## 4. Dua tampilan lengkap untuk seluruh modul

Desktop dan mobile harus memiliki fungsi setara sesuai role. Gunakan desain responsif dengan komposisi yang memang disusun ulang, bukan screenshot desktop yang diperkecil. Tidak perlu aplikasi native, database terpisah, atau duplikasi route bisnis.

| ModulDesktopMobile           |                                                                             |                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Landing dan autentikasi      | Navigasi perusahaan, hero, login dan pengaturan akun                        | Menu ringkas, form nyaman disentuh, error/focus jelas                               |
| Dashboard per role           | Sidebar, KPI, tabel, antrean kerja, panel jadwal dan notifikasi             | Ringkasan tugas prioritas, kartu, drawer menu, shortcut sesuai izin                 |
| SPK                          | Tabel pencarian/filter, detail dokumen dan form terkelompok                 | Kartu SPK, form bertahap, select-search, upload dokumen                             |
| Kunjungan / kapal            | Tabel status, detail job, tab dokumen/kegiatan/biaya                        | Kartu kapal, timeline, tab yang dapat dipindai, tombol aksi kontekstual             |
| Clearance In/Out             | Checklist prasyarat, tagihan awal, dokumen dan timestamp                    | Checklist vertikal, upload bukti, status kendala yang jelas                         |
| Kebutuhan dan order          | Tabel item, penawaran vendor, rincian kuantitas/harga                       | Item card/repeater, pemilihan vendor, detail penawaran per item                     |
| Review dan approval          | Antrean, perbandingan revisi, nominal dan bukti berdampingan                | Antrean kartu, detail wajib terbaca, tombol setujui/revisi/tolak yang aman disentuh |
| Kopra dan pendanaan          | Referensi pengajuan, keputusan Ryan, penerimaan dana                        | Form ringkas, upload bukti, timeline status; tanpa transfer bank palsu              |
| Pembayaran vendor/Pelindo    | Alokasi pembayaran, tagihan, bukti, dan verifikasi                          | Pilih tagihan, jumlah, bukti transfer, lalu review sebelum konfirmasi               |
| Laporan harian               | Daftar kepatuhan harian, form kegiatan, preview foto                        | Form kegiatan cepat, simpan draft, pilih kamera/galeri opsional, submit             |
| Nota final dan rekonsiliasi  | Checklist Nota Rampung/APBS/nota lain, rekap biaya dan selisih              | Checklist dokumen, kartu biaya, detail selisih serta pengajuan bayar                |
| Invoice keagenan/reimburse   | Editor item, preview cetak/PDF, release, snapshot versi                     | Editor per item, ringkasan total, preview, unggah scan TTD, status kirim            |
| Pengiriman invoice           | Tabel antrian dokumen, bukti/resi, penerima                                 | Form pengiriman, unggah foto/scan dan bukti pengiriman                              |
| Piutang dan pembayaran klien | Aging/jatuh tempo, receipt, alokasi lintas invoice                          | Daftar tagihan, catat penerimaan, pilih invoice, review alokasi dan konfirmasi      |
| Master data                  | Tabel CRUD, filter, restore sesuai izin                                     | Daftar kartu, search, form/drawer yang lengkap                                      |
| User, role dan audit         | Tabel akun, matriks permission, log dengan filter                           | Form akun, permission dikelompokkan, log detail dan filter mobile                   |
| Laporan dan export           | Filter periode/job/perusahaan, rekap biaya, pembayaran dan laporan kegiatan | Filter bottom sheet, ringkasan, akses unduh yang sama sesuai izin                   |

Pada semua layar, sediakan title, subtitle yang menjelaskan konteks, breadcrumb jika membantu, pencarian, filter aktif, pagination, empty/loading/error state, detail, form, konfirmasi aksi sensitif, dan notifikasi hasil sesuai kebutuhan. Jangan menyembunyikan fungsi inti hanya karena ruang mobile sempit.
Mobile staf tetap menggunakan navigasi Beranda, Kapal, Pengajuan, Profil jika sesuai role, dengan akses Laporan Harian yang mudah ditemukan dari Beranda/job. Admin, Direktur, dan Ryan memiliki akses ke seluruh menu tugasnya melalui drawer/shortcut; tidak dibatasi oleh empat menu staf.
Gunakan target sentuh minimal 44 px, form input sekitar 16 px, safe area, sticky action yang tidak menutup konten/keyboard, modal yang menyesuaikan tinggi layar, serta file preview yang dapat digunakan pada mobile. Jelaskan kondisi koneksi gagal dan pertahankan input selama halaman aktif; jangan menjanjikan mode offline tanpa implementasi nyata.

## 5. Pemeriksaan awal dan keputusan versi

Baca `AGENTS.md`, `DESIGN.md`, `inputs.json`, `composer.json`, lockfile Composer dan frontend, `.env.example`, struktur route, migration, model, controller, Policy, komponen, autentikasi, storage, serta seluruh referensi visual. Jangan mencetak isi `.env` atau secret ke output.

- Periksa kondisi Git dan pertahankan perubahan pengguna yang tidak berkaitan.
- Bedakan proyek kosong dan proyek yang sudah berjalan. Jangan menjalankan scaffold di atas proyek existing.
- Tetapkan versi stabil Laravel, PHP, React, Inertia, PostgreSQL, Redis, dan ketiga paket Spatie yang kompatibel. Periksa dokumentasi resmi serta batas versi di Composer; catat versi aktual dalam `SETUP.md` dan lockfile.
- Pada proyek existing, jangan melakukan major upgrade tanpa kebutuhan. Sesuaikan integrasi dengan versi terpasang.
- Periksa ekstensi PHP, khususnya `pdo_pgsql`, Redis client yang dipilih, dan ekstensi yang diwajibkan paket backup. Pastikan PostgreSQL client seperti `pg_dump` tersedia dan kompatibel dengan server.
- Jika ada layanan eksternal tanpa kredensial, selesaikan implementasi serta konfigurasi lokal yang dapat diverifikasi, lalu catat integrasi yang belum diuji. Jangan mengarang koneksi atau hasil pengujian.

## 6. Arsitektur aplikasi

| LapisanTanggung jawab |                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Laravel               | Route, session authentication, controller, Form Request, Policy/Gate, transaksi, queue, storage |
| React + TypeScript    | Halaman, layout, komponen, form, dan state UI                                                   |
| Inertia               | Pengiriman props terpilih, navigasi, form, dan respons validasi antara Laravel dan React        |
| PostgreSQL            | Sumber kebenaran data, relasi, constraint, dan transaksi                                        |
| Redis                 | Cache, session, queue, rate limiting, dan lock sesuai konfigurasi                               |
| Spatie Permission     | Role dan permission yang diperiksa di backend                                                   |
| Spatie Activitylog    | Catatan aktivitas yang relevan dan telah disaring                                               |
| Spatie Backup         | Backup database/file, retention, dan monitoring                                                 |

Gunakan satu aplikasi Laravel + Inertia. Hindari REST API terpisah untuk kebutuhan halaman yang sudah dilayani Inertia. Gunakan `Link`, `router`, dan `useForm` sesuai kebutuhan; jangan menambahkan React Router untuk menggantikan navigasi Laravel/Inertia.
Controller tetap ringkas. Tempatkan transaksi atau proses bisnis kompleks dalam Action/Service yang memang diperlukan. Jangan membuat abstraksi berlapis tanpa kebutuhan. Kirim props secara eksplisit; menyembunyikan elemen React bukan pembatasan akses data.

## 7. Setup proyek dan paket

### Proyek baru

Gunakan starter kit React resmi Laravel, dengan autentikasi Laravel, TypeScript, Vite, dan Tailwind. Starter kit menjadi fondasi teknis; desain akhirnya mengikuti Corporate Maritime. Jalur ini didukung [dokumentasi starter kit Laravel](https://laravel.com/docs/13.x/starter-kits).
Perintah acuan untuk direktori baru, setelah prasyarat diperiksa:

```
composer global require laravel/installer
laravel new sja
cd sja
```

Pilih React, autentikasi Laravel, dan PostgreSQL pada opsi yang tersedia. Jangan menjalankan migrasi awal sebelum desain UUID selesai. Jika installer menjalankan migration otomatis pada database development yang baru, periksa hasilnya dan susun perubahan UUID secara aman; jangan menggunakan reset database secara diam-diam.

### Proyek existing

Gunakan dependency dari lockfile melalui `composer install` dan, bila tersedia `package-lock.json`, `npm ci`. Sesuaikan package manager dengan lockfile aktual. Integrasikan hanya dependency yang belum tersedia.

### Paket Spatie

Uji resolusi kompatibilitas terlebih dahulu, lalu pasang versi stabil yang sesuai:

```
composer require spatie/laravel-permission spatie/laravel-activitylog spatie/laravel-backup --dry-run
composer require spatie/laravel-permission spatie/laravel-activitylog spatie/laravel-backup
```

Jangan memakai `--ignore-platform-reqs` untuk melewati ketidakcocokan PHP atau ekstensi. Jangan mengubah minimum stability menjadi development untuk memaksa instalasi.
Publish config dan migration sekali sesuai versi paket terpilih. Acuan provider/tag:

```
php artisan vendor:publish --provider='Spatie\Permission\PermissionServiceProvider'
php artisan vendor:publish --provider='Spatie\Activitylog\ActivitylogServiceProvider' --tag=activitylog-migrations
php artisan vendor:publish --provider='Spatie\Activitylog\ActivitylogServiceProvider' --tag=activitylog-config
php artisan vendor:publish --provider='Spatie\Backup\BackupServiceProvider' --tag=backup-config
```

Periksa migration hasil publish sebelum `php artisan migrate`. Jangan memakai `--force` untuk menimpa konfigurasi existing. Tag harus diverifikasi terhadap paket terpasang. Acuan pemasangan tersedia pada [Activitylog](https://github.com/spatie/laravel-activitylog/blob/main/docs/installation-and-setup.md) dan [Backup](https://github.com/spatie/laravel-backup/blob/main/docs/installation-and-setup.md).

### Konfigurasi environment

Sediakan `.env.example` yang aman dan petunjuk pengisiannya. Contoh berikut untuk development lokal; nilai secret sengaja kosong dan wajib diisi secara privat sebelum koneksi digunakan:

```
APP_NAME="PT Samudra Jaya Andalas"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=id
APP_FALLBACK_LOCALE=en

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sja
DB_USERNAME=sja_app
DB_PASSWORD=

CACHE_STORE=redis
SESSION_DRIVER=redis
SESSION_CONNECTION=default
SESSION_LIFETIME=120
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=false
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

QUEUE_CONNECTION=redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_DB=0
REDIS_CACHE_DB=1
REDIS_PREFIX=sja_local_
```

Pilih PhpRedis bila ekstensi tersedia. Jika memakai Predis, pasang dependency dan ubah `REDIS_CLIENT` secara konsisten. Cocokkan semua variabel dengan file config Laravel; jangan menganggap variabel tambahan otomatis dibaca. Acuan integrasi: [Laravel Redis](https://laravel.com/docs/13.x/redis).
Buat database dan user PostgreSQL dengan hak yang sesuai melalui administrasi lokal/layanan yang tersedia. User runtime tidak boleh menjadi superuser; pada produksi pisahkan kredensial migration dan runtime bila memungkinkan. Jangan menuliskan password ke argumen shell atau repositori.
Buat `APP_KEY` hanya bila belum ada. Jangan mengganti key aplikasi berjalan karena dapat memutus session dan kemampuan membaca data terenkripsi. Gunakan waktu penyimpanan UTC serta tampilkan waktu operasional `Asia/Jakarta`; terapkan secara eksplisit pada config, formatter, dan scheduler.
Pada produksi gunakan `APP_ENV=production`, `APP_DEBUG=false`, HTTPS, `SESSION_SECURE_COOKIE=true`, prefix tersendiri, dan secret terpisah. Pertahankan kemampuan login serta proteksi cookie pada development HTTP lokal.

## 8. PostgreSQL: UUID, relasi, dan soft delete

### UUID dan kesesuaian tipe

- Gunakan tipe PostgreSQL `uuid` untuk primary key `users` dan seluruh entitas bisnis baru. Gunakan `HasUuids` atau generator server yang sesuai versi Laravel; ID dibuat di server, bukan dipercaya dari form.
- Utamakan UUID berurutan seperti UUIDv7 bila didukung versi terpilih; dokumentasikan strategi aktual. UUID tetap harus melalui authorization.
- Selaraskan seluruh foreign key melalui `foreignUuid` atau deklarasi setara. Relasi UUID tidak boleh tetap memakai `unsignedBigInteger`/`foreignId`.
- Periksa pivot, relasi polymorphic, tabel session bila dipakai, dan migration paket. `user_id`, `created_by`, `updated_by`, serta referensi sejenis harus cocok dengan tipe tabel asal.
- Pada proyek berisi data, perubahan ID integer ke UUID membutuhkan migration bertahap, backfill, pemetaan foreign key, verifikasi, serta jalur pemulihan. Jangan hanya mengubah migration lama atau menjalankan `migrate:fresh`.

Gunakan `HasUuids` dan `SoftDeletes` sesuai dukungan model yang dijelaskan dalam [Eloquent Laravel](https://laravel.com/docs/13.x/eloquent).

### Spatie dan UUID

| BagianAturan                       |                                                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| User                               | UUID; trait `HasRoles` pada model autentikasi yang benar                                                                                      |
| Role dan Permission                | Untuk setup baru, gunakan UUID melalui custom model yang memperluas model Spatie; daftarkan model tersebut pada config                        |
| Pivot permission                   | Samakan `role_id`, `permission_id`, dan `model_id` dengan tipe referensinya; pertahankan primary/unique key serta index yang diwajibkan paket |
| Activitylog                        | Sesuaikan `subject_id` dan `causer_id` untuk model yang dicatat; gunakan morph UUID nullable bila semua subject dan causer memakai UUID       |
| Primary key audit dan tabel teknis | Boleh mengikuti kontrak paket; dokumentasikan pengecualian dan jangan merusak kompatibilitas demi menyeragamkan seluruh tabel                 |

Jika role existing masih integer, pertahankan kompatibilitas atau lakukan konversi terencana. Jika activity mereferensikan model dengan tipe ID campuran, pilih representasi kompatibel dan uji seluruh relasinya; jangan memaksakan kolom UUID pada subject integer.
Migration bawaan paket perlu diperiksa, bukan diasumsikan sudah mengikuti UUID aplikasi. Lihat [migration Spatie Permission](https://github.com/spatie/laravel-permission/blob/main/database/migrations/create_permission_tables.php.stub) dan [catatan tipe ID Activitylog](https://github.com/spatie/laravel-activitylog/blob/main/docs/installation-and-setup.md).

### Relasi dan integritas data

- Definisikan `belongsTo`, `hasMany`, dan `belongsToMany` dengan foreign key yang konsisten. Gunakan constraint database, bukan validasi aplikasi saja.
- Implementasikan relasi seluruh modul dalam cakupan alur bisnis. Kapal, kunjungan/job, kebutuhan, pengajuan biaya, tagihan sumber, dan invoice klien adalah entitas berbeda yang saling terhubung.
- Terapkan `restrict`, `set null`, atau cascade berdasarkan kebutuhan setiap relasi. Hindari penghapusan berantai dokumen keuangan dan riwayat operasional.
- Gunakan `numeric/decimal` untuk nilai uang; hindari floating point. Gunakan timestamp dengan kesadaran zona waktu dan constraint untuk jumlah/rentang yang relevan.
- Simpan transaksi multi-tabel secara atomik. Gunakan pemeriksaan status dan lock/version check untuk approval, release invoice, serta alokasi pembayaran agar aksi bersamaan tidak menggandakan transaksi.

### Soft delete

Terapkan `deleted_at` dan `SoftDeletes` pada master serta entitas bisnis yang perlu dapat dipulihkan. Untuk user, perubahan status nonaktif/deleted juga harus menutup akses akun dan session yang masih aktif.
Jangan menerapkan soft delete secara membabi buta pada tabel pivot, queue, atau audit. Role/permission mengikuti kontrak Spatie; penghapusan harus memperhitungkan assignment yang ada.
Soft delete parent tidak otomatis menonaktifkan child. Definisikan aturan delete/restore, akses anak, dan konflik pemulihan. Gunakan `withTrashed` hanya untuk kebutuhan historis yang diotorisasi. Sediakan permission terpisah untuk restore dan force delete; force delete dinonaktifkan secara default bagi pengguna operasional. Invoice released, pembayaran terverifikasi, serta biaya yang sudah diposting mengikuti prosedur koreksi/pembatalan dan retensi; jangan menghapusnya untuk mengubah saldo historis.

## 9. Indexing dan pencegahan N+1 query

Tentukan index dari query nyata: filter, join, urutan, scope pengguna, dan pagination. PostgreSQL tidak otomatis membuat index di sisi kolom foreign key yang mereferensikan tabel lain; evaluasi kebutuhan index tersebut. Hindari index berulang pada kolom yang sudah dicakup index yang sesuai. Periksa perilaku foreign key dan nilai NULL pada [dokumentasi constraint PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html).

- Gunakan composite index mengikuti pola query, misalnya `(created_by, status, created_at, id)` pada daftar pengajuan milik pengguna, jika memang sesuai query aktual.
- Pertimbangkan partial index `WHERE deleted_at IS NULL` untuk akses data aktif yang dominan.
- Untuk unik hanya pada data aktif, gunakan partial unique index. Jangan memakai `(code, deleted_at)` sebagai pengganti karena nilai NULL bisa membuat data aktif duplikat.
- Jika suatu identitas bisnis harus tetap unik setelah dihapus, gunakan unique penuh. Untuk email akun internal, normalisasi huruf dan pertahankan identitas agar tidak dialihkan tanpa proses yang jelas.
- Untuk pencarian substring besar, evaluasi `pg_trgm` atau full-text search setelah pengukuran; jangan berasumsi B-tree mempercepat semua `ILIKE '%kata%'`.
- Periksa `EXPLAIN (ANALYZE, BUFFERS)` dengan data representatif pada environment uji; ingat `ANALYZE` menjalankan query. Catat alasan dan hasil index penting. Acuan: [partial index PostgreSQL](https://www.postgresql.org/docs/current/indexes-partial.html).

Gunakan eager loading eksplisit melalui `with`, `loadMissing`, `withCount`, atau `withExists` sesuai kebutuhan. Sertakan primary/foreign key yang dibutuhkan ketika membatasi kolom. Jangan memanggil relasi, count query, atau pengecekan izin yang menambah query per baris di loop, accessor, serializer, maupun penyusunan props.
Aktifkan deteksi lazy loading pada local/test, misalnya dalam `AppServiceProvider`:

```
use Illuminate\Database\Eloquent\Model;

Model::preventLazyLoading(! app()->isProduction());
```

Sediakan pagination server-side, whitelist kolom sort, batas `per_page`, debounce pencarian, dan urutan stabil dengan tie-breaker. Pengujian query harus membuktikan jumlah query tidak bertambah linear ketika jumlah baris naik, termasuk pada render props dan relasi audit. Acuan: [eager loading dan pencegahan lazy loading](https://laravel.com/docs/13.x/eloquent-relationships#preventing-lazy-loading).

## 10. Redis, queue, cache, dan scheduler

- Gunakan Redis untuk cache, session, queue, dan lock dengan prefix per aplikasi/environment. PostgreSQL tetap menyimpan status bisnis final.
- Cache hanya data yang diperlukan; gunakan TTL, cache key sesuai scope akses, dan invalidasi setelah transaksi berhasil. Jangan membagikan cache data privat antar pengguna.
- Untuk queue gunakan worker terkelola, retry/backoff, timeout, failed-job storage, monitoring, dan restart worker saat deployment.
- Pastikan timeout worker lebih pendek daripada `retry_after`, dispatch pekerjaan bergantung database setelah commit, serta buat job idempotent. Jangan mengandalkan tombol disabled sebagai satu-satunya pencegah proses ganda. Acuan: [Laravel queues](https://laravel.com/docs/13.x/queues).
- Session/queue harus terhindar dari eviction cache. Pada produksi, pisahkan instance/workload bila kebutuhan eviction berbeda. Database Redis 0 dan 1 pada satu instance tidak mengisolasi memori atau kebijakan eviction.
- Siapkan persistence dan pemulihan Redis sesuai kebutuhan queue; jangan mengasumsikan Redis menyimpan pekerjaan secara permanen tanpa konfigurasi tersebut.
- PostgreSQL dan Redis hanya dapat diakses melalui jaringan privat/localhost. Terapkan Redis ACL/auth dan TLS bila tersedia untuk koneksi jaringan; jangan mengekspos port Redis ke internet. Acuan: [keamanan Redis](https://redis.io/docs/latest/operate/oss_and_stack/management/security/).
- Scheduler harus memiliki satu pemicu yang jelas. Gunakan pencegahan overlap dan mekanisme single-server/shared lock bila deployment memiliki beberapa instance.

## 11. Spatie Roles & Permissions

Gunakan guard `web` untuk autentikasi Inertia berbasis session dan selaraskan `guard_name`. Definisikan role menurut tugas, bukan nama orang; assignment Pak Prima, Bu Titik, Direktur, dan Pak Ryan diberikan melalui administrasi akun.

| RolePermission dan tugas utama |                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `system_admin`                 | User, role/permission, konfigurasi teknis; tidak otomatis mendapat izin approve/release/confirm-payment                                                          |
| `field_staff`                  | SPK create/update/submit, kebutuhan, order, kegiatan harian, clearance dan serah terima pada job yang ditugaskan                                                 |
| `operations_finance`           | Review administrasi, tagihan sumber, pengajuan biaya, Kopra, dana diterima, pembayaran vendor, rekonsiliasi, invoice klien, pengiriman dan penerimaan pembayaran |
| `director`                     | View/review biaya, approve/reject/request-revision pada tahap Direktur dan scope yang ditentukan                                                                 |
| `fund_authorizer`              | ACC pendanaan, review biaya akhir, verifikasi dan pencatatan pembayaran Pelindo sesuai tahap Ryan                                                                |
| `auditor`                      | Baca laporan, dokumen dan audit yang diizinkan tanpa mutasi transaksi                                                                                            |

Pisahkan permission granular per aksi: contoh `work-orders.submit`, `expenses.review`, `expenses.approve-director`, `funding.approve`, `vendor-payments.record`, `pelindo-payments.record`, `daily-reports.submit`, `reconciliation.review`, `client-invoices.release`, `invoice-deliveries.record`, `client-receipts.confirm`, dan `activity-log.view`. Definisikan permission sesuai handler nyata, bukan hanya daftar menu.
Policy harus memeriksa scope per-record, assignment, tahap dokumen, serta konflik kewenangan. Role permission tidak otomatis memberikan akses ke semua job. Untuk mekanisme dasar, gunakan [Laravel authorization](https://laravel.com/docs/13.x/authorization).

- React menerima kemampuan minimum dari backend untuk mengatur menu/tombol; backend tetap memeriksa setiap request.
- Seeder idempotent membuat role dan permission terdokumentasi tanpa mereset assignment pengguna secara membabi buta. Jangan memasukkan password default ke source code.
- Bootstrap admin dilakukan secara privat; lindungi penghapusan admin terakhir dan privilege escalation.
- Gunakan API Spatie untuk assignment serta invalidasi cache. Audit setiap perubahan role/permission.
- Kewenangan review administratif Bu Titik, approval Direktur, ACC Ryan, dan konfirmasi penerimaan pembayaran adalah permission berbeda.
- Hindari bypass super-admin menyeluruh yang melompati state atau aturan transaksi bisnis.

## 12. Spatie Activitylog

Konfigurasikan audit dengan daftar field yang diizinkan, bukan seluruh request atau semua atribut model. Untuk model yang mendukungnya, gunakan opsi setara `logOnly`, `logOnlyDirty`, dan `dontSubmitEmptyLogs` sesuai versi paket.
Catat perubahan data penting, soft delete/restore, aktivasi/nonaktivasi akun, role assignment, serta perubahan status bisnis, approval, release/koreksi invoice, pengiriman, serta konfirmasi/alokasi pembayaran. Simpan actor, subject, event, waktu, deskripsi singkat, dan perubahan sebelum/sesudah yang relevan. Tambahkan correlation/request ID; IP atau user-agent hanya jika ada kebutuhan dan retention yang jelas.
Jangan merekam password, hash password, token, cookie, session ID, secret 2FA, recovery code, `.env`, kredensial layanan, signed URL, atau detail keuangan sensitif secara berlebihan. Audit login gagal harus minimal dan tidak menyimpan kredensial.

- Selaraskan `subject`/`causer` dengan UUID dan kebutuhan menampilkan referensi yang telah soft-deleted.
- Audit bisnis dan perubahan datanya harus konsisten: hindari catatan sukses bila transaksi rollback, dan hindari event ganda dari observer plus pencatatan manual.
- Bulk update/delete melalui query builder bisa melewati model event; gunakan mekanisme eksplisit untuk operasi yang wajib diaudit.
- Halaman audit bersifat read-only dengan filter actor/event/periode, pagination server-side, eager loading, dan permission khusus.
- Tetapkan retention dan cleanup yang terdokumentasi; jangan menghapus audit produksi sebelum kebijakan ditetapkan. Activitylog bukan penyimpanan yang kebal manipulasi administrator database. Jika dibutuhkan bukti immutable, diperlukan storage terpisah dengan kontrol yang sesuai.

## 13. Spatie Backup dan pemulihan

Pasang serta konfigurasi backup PostgreSQL menggunakan `pg_dump`, source file yang dibutuhkan, disk private, retention, dan monitoring. Perintah dasar serta pengaturan dump didokumentasikan dalam [Spatie Backup](https://github.com/spatie/laravel-backup/blob/main/docs/installation-and-setup.md).
Gunakan disk lokal private untuk verifikasi development. Untuk produksi, siapkan tujuan backup off-server yang private, enkripsi, dan hak akses minimum; kredensial serta kunci pemulihan disimpan terpisah. Jangan menganggap salinan di server yang sama cukup menghadapi kehilangan server.

- Tentukan file yang masuk backup secara eksplisit. Kecualikan dependency, cache, log sementara, folder backup itu sendiri, dan `.env`; simpan secret/key melalui jalur pemulihan terpisah yang aman.
- Bila upload ada di S3/object storage, siapkan versioning, replikasi, atau backup objek yang sesuai. Backup file lokal tidak otomatis mencadangkan semua objek remote.
- Jadwalkan backup, monitoring, dan cleanup menggunakan Laravel Scheduler. Sebagai default konfigurasi awal, gunakan backup harian pukul 01.30 `Asia/Jakarta`; sesuaikan dengan beban operasi. Cleanup hanya dijalankan setelah tersedia backup baru yang tervalidasi.
- Dokumentasikan target pemulihan serta retention sebagai keputusan operasional, bukan angka yang diklaim telah disetujui perusahaan. Jangan membuang backup produksi existing saat setup.
- Sediakan alert kegagalan atau backup kedaluwarsa. Gunakan kanal pengujian lokal sampai penerima dan kredensial produksi disediakan; catat bahwa monitoring eksternal memerlukan layanan terpisah agar tetap mendeteksi aplikasi yang mati.
- Verifikasi hasil `backup:run`, daftar arsip, dan uji restore ke database serta direktori terisolasi. Jangan restore ke produksi sebagai bagian tes.
- Uji dekripsi, integritas relasi UUID, data penting, file contoh, dan login pada environment pemulihan. Catat tanggal, durasi, hasil, serta langkah manual yang masih diperlukan.

Sediakan `BACKUP-RESTORE.md` dengan perintah aktual berdasarkan format dump yang dipilih (`psql` atau `pg_restore`), dependensi binary, lokasi private, pengambilan secret secara aman, dan prosedur pemulihan. Jangan mengklaim backup dapat dipulihkan sebelum uji restore berhasil.

## 14. Keamanan aplikasi

Terapkan kontrol yang relevan sejak fondasi, lalu verifikasi melalui pengujian:

- **Autentikasi internal:** session auth Laravel; nonaktifkan registrasi publik secara default. Buat akun melalui admin/invitation yang terkontrol. Terapkan hash password, login throttling, reset password yang kedaluwarsa, regenerasi session setelah login, serta logout yang menginvalidasi session.
- **Akun sensitif:** siapkan 2FA bagi admin dan approver menggunakan kemampuan autentikasi yang tersedia; pastikan enrollment dan recovery bekerja sebelum enforcement produksi. Minta konfirmasi password ulang untuk perubahan akses yang sensitif.
- **Authorization:** Policy/Gate pada daftar, detail, download, perubahan, restore, dan bulk action. Scope query berdasarkan akses. Cegah IDOR walaupun ID berbentuk UUID.
- **Input:** Form Request, whitelist field, mass-assignment protection, dan validasi foreign key sesuai scope akses. `created_by`, role, status approval, dan nilai turunan ditetapkan di server.
- **CSRF dan XSS:** pertahankan middleware CSRF untuk mutasi session-auth; gunakan escaping React/Blade dan sanitasi bila menerima rich text. Jangan menonaktifkan CSRF untuk mempermudah integrasi Inertia.
- **Query:** gunakan parameter binding, whitelist sort/filter, dan batas pagination. Jangan menggabungkan input pengguna menjadi SQL, shell command, atau path file.
- **Upload:** validasi ukuran, MIME, ekstensi, dan konten yang relevan; gunakan nama file buatan server, disk private, dan download melalui authorization. Jangan menyajikan file executable atau SVG tidak tepercaya sebagai konten aktif pada origin aplikasi. Gunakan [panduan upload OWASP](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) sebagai acuan pemeriksaan.
- **Data privat:** jangan memasukkan secret, seluruh model, audit sensitif, atau data internal ke props publik, JavaScript bundle, serta variabel `VITE_*`.
- **Produksi:** debug nonaktif, HTTPS, cookie aman, trusted proxy/host yang tepat, izin filesystem minimum, dan akses database/Redis privat. Gunakan CSP yang diuji terhadap Vite/Inertia, `frame-ancestors`, `nosniff`, dan kebijakan referrer yang sesuai. Aktifkan HSTS hanya setelah HTTPS valid.
- **Dependensi dan observabilitas:** jalankan Composer/npm audit, tangani temuan relevan, dan jangan melakukan force upgrade tanpa review. Gunakan log error yang disaring, rotasi log, serta monitoring worker/backup. Jangan mengekspos Telescope, Horizon, atau debug dashboard ke publik.

Dokumentasikan kontrol yang sudah diuji dan keterbatasan aktual. Jangan memberi klaim “100% aman”.

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

## 24. Milestone implementasi dan verifikasi end-to-end

Kerjakan berurutan dan teruskan sampai seluruh cakupan selesai. Milestone membantu peninjauan hasil, bukan alasan berhenti setelah fondasi atau dashboard.

| TahapHasil yang harus selesai |                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Audit dan setup            | Pemeriksaan proyek, kompatibilitas versi, environment, PostgreSQL, Redis, storage, paket, dan fondasi keamanan                             |
| 2. Model dan komponen dasar   | Migration/UUID/FK/index, state machine, master perusahaan/kapal/pelabuhan/vendor/produk, serta katalog komponen desktop/mobile             |
| 3. Akses dan SPK              | Auth, role/permission, assignment, SPK, job kunjungan, biaya awal Pelindo, Clearance In                                                    |
| 4. Kebutuhan dan pendanaan    | Form kapal, order/penawaran vendor, pengajuan biaya, review Titik, approval Direktur, Kopra, ACC Ryan, dana diterima dan pembayaran vendor |
| 5. Operasional harian         | Pemenuhan kebutuhan, laporan harian wajib, foto opsional, Clearance Out dan serah terima Prima → Titik → Ryan                              |
| 6. Nota dan rekonsiliasi      | Nota Rampung/APBS/nota tambahan, perhitungan biaya akhir, pengajuan pembayaran Pelindo dan pencatatan transfer Ryan                        |
| 7. Invoice dan penerimaan     | Invoice keagenan/reimburse, release, print/preview, scan TTD, pengiriman fisik, piutang, pembayaran sebagian/penuh dan konfirmasi langsung |
| 8. Dashboard dan pelaporan    | Dashboard per role, pencarian, notifikasi, chart, rekap biaya/piutang/kegiatan, export, serta landing page yang konsisten                  |
| 9. Operasional dan QA         | Worker/scheduler, backup/restore, audit, pemeriksaan keamanan/performa, seluruh layar desktop/mobile, dan dokumentasi akhir                |

Ikuti workflow desain sebelum dan selama implementasi UI; jangan menunda konsistensi komponen sampai seluruh halaman selesai. Seluruh milestone menggunakan data backend dan aturan transaksi yang sama.

### Skenario penerimaan minimum

| SkenarioHasil yang harus dibuktikan |                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| SPK diterima Bu Titik               | Intake tercatat dan input awal dapat diassign ke Prima tanpa membuat SPK duplikat                                                      |
| Durasi kunjungan belum diketahui    | SPK dapat diproses tanpa wajib mengisi lama hari atau ETD palsu                                                                        |
| Pelindo awal belum dibayar          | Status siap Clearance In tertahan; kedatangan aktual yang telanjur terjadi tetap dapat dicatat sebagai exception                       |
| Pengajuan melewati otorisasi        | Aksi langsung ke endpoint ditolak jika review/approval sebelumnya belum sah                                                            |
| Nilai berubah setelah approval      | Dokumen direvisi, persetujuan versi sebelumnya tidak dipakai untuk nilai baru                                                          |
| Retry/double click                  | Tidak membuat dua transfer, receipt, nomor invoice, atau alokasi pembayaran                                                            |
| Laporan tanpa foto                  | Submit berhasil bila detail wajib lengkap; laporan kosong tetap ditolak                                                                |
| Kapal Clearance Out                 | Operasional selesai, tetapi nota yang belum diterima dan saldo keuangan tetap terbuka                                                  |
| Nota final setelah pembayaran awal  | Biaya final dan pembayaran awal direkonsiliasi; tidak dihitung atau dibayar dua kali                                                   |
| APBS terlambat                      | Job tetap menunggu dokumen terkait; tidak otomatis diasumsikan nol/tidak berlaku                                                       |
| Invoice dua jenis                   | Jasa/materai dan reimb terpisah, sumber biaya terlacak, dan duplikasi penagihan ditolak                                                |
| Scan TTD belum ada                  | Invoice tidak dapat ditandai siap kirim/terkirim hanya karena sudah released                                                           |
| Scan TTD ada tetapi belum dikirim   | State tetap siap dikirim sampai data/bukti pengiriman dicatat                                                                          |
| Satu transfer membayar dua invoice  | Alokasi tepat dan total tidak melebihi dana sah; saldo kedua invoice berubah sesuai alokasi                                            |
| Pembayaran sebagian / lebih bayar   | Status dan saldo benar; selisih tidak otomatis dianggap lunas atau dihapus                                                             |
| Potongan belum terverifikasi        | Saldo tidak ditutup hanya dari klaim potongan tanpa dasar/bukti yang diperlukan                                                        |
| Akses lintas role/job               | Record, opsi select, invoice, nilai uang, attachment, export dan props di luar izin tidak terkirim                                     |
| UUID dan database                   | Migration/FK/constraint/index/soft delete berjalan pada PostgreSQL nyata; kasus restore diuji                                          |
| N+1 dan dashboard                   | Jumlah query tidak tumbuh linear; agregat konsisten dengan detail dan tidak ganda akibat join                                          |
| Activitylog                         | Actor/subject tepat; keputusan dan pembayaran tercatat; secret tidak masuk log; rollback tidak menghasilkan audit sukses palsu         |
| Redis dan pekerjaan latar           | Queue, retry/idempotensi, session/cache, failed jobs dan scheduler diuji sesuai konfigurasi                                            |
| Backup                              | Arsip dan restore terisolasi berhasil; integrasi remote yang belum tersedia dilaporkan jujur                                           |
| Desktop dan mobile                  | Semua modul pada matriks tampilan dapat diakses/dioperasikan sesuai role, termasuk form, modal, filter, pagination, preview dan upload |
| Penutupan finansial                 | Job tidak ditutup hanya karena kapal berangkat; dokumen/biaya/piutang telah terselesaikan sesuai prasyarat                             |

Gunakan PostgreSQL pada integration test untuk fitur yang spesifik PostgreSQL. Jalankan lint, typecheck, build, serta test yang tersedia; laporkan hasil nyata. Uji dengan fixture terisolasi, termasuk nilai uang dan revisi/konkurensi, tanpa mencampur data contoh ke produksi.
Sediakan konfigurasi worker/scheduler, lockfile, build asset, migration yang ditinjau, cache config, restart worker, serta prosedur pemulihan deployment yang mempertimbangkan kompatibilitas schema. Jangan menganggap rollback kode memulihkan database secara otomatis.

## 25. Deliverable wajib dari pelaksanaan prompt

| DeliverableIsi                |                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source code terintegrasi      | Landing page, seluruh flow SPK sampai pembayaran klien, dashboard per role, seluruh modul desktop/mobile, komponen, serta integrasi paket                        |
| `.env.example`                | Semua variabel yang benar-benar dibaca config, tanpa secret                                                                                                      |
| Migration/model/seeder/Policy | UUID, relasi, index, soft delete, role/permission, audit, dan kontrol akses                                                                                      |
| `DESIGN.md`                   | Token Corporate Maritime termasuk sidebar desktop, penggunaan empat referensi, komponen, responsive behavior, dan state                                          |
| `DASHBOARD.md`                | Struktur panel/menu, sumber data, rumus KPI, pemetaan status, scope akses, periode/filter, state, serta keterbatasan integrasi/data legacy yang nyata            |
| `SETUP.md`                    | Versi aktual, prasyarat, setup baru/existing, instalasi, migrasi, bootstrap admin, serta cara menjalankan aplikasi                                               |
| Script setup lokal            | Script sesuai OS yang diperiksa, menghindari overwrite `.env`, regenerasi `APP_KEY`, dan reset database; gagal dengan pesan jelas bila prasyarat belum terpenuhi |
| `FLOW.md`                     | Alur SPK hingga penutupan, pembagian peran, state/transisi, gerbang pembayaran/invoice, dan keputusan konfigurasi                                                |
| `COMPONENTS.md`               | Struktur `resources/js/components`, kontrak props, pola pemakaian, serta state desktop/mobile                                                                    |
| `SCREEN-MATRIX.md`            | Daftar semua halaman dan aksi desktop/mobile per role, route yang diimplementasikan, dan bukti QA                                                                |
| `DATABASE.md`                 | Skema aktual, alasan index, konvensi UUID, aturan soft delete/restore, dan temuan query                                                                          |
| `SECURITY.md`                 | Kontrol yang diterapkan, matrix akses, pengelolaan secret, serta keterbatasan aktual                                                                             |
| `BACKUP-RESTORE.md`           | Jadwal, destination private, retention, prosedur restore, dan hasil uji pemulihan                                                                                |
| Konfigurasi operasional       | Worker/scheduler sesuai lingkungan; jangan menulis path server atau kredensial rekaan                                                                            |
| Laporan akhir                 | Ringkasan perubahan, pemeriksaan yang dijalankan, hasil, dan konfigurasi/konten yang belum tersedia                                                              |

Pastikan semua panduan menggunakan perintah dan path yang sesuai proyek aktual. Prioritaskan implementasi yang sederhana, terawat, profesional, cepat, accessible, dan konsisten dengan identitas PT Samudra Jaya Andalas.