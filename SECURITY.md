# Kebijakan & Arsitektur Keamanan — PT Samudra Jaya Andalas

Dokumen ini memuat panduan implementasi keamanan aplikasi, matriks otorisasi (RBAC), perlindungan IDOR, pencegahan CSRF, audit log, serta manajemen kredensial dan rahasia aplikasi.

---

## 1. Arsitektur Autentikasi

1. **Mekanisme Autentikasi:**
   - Menggunakan session-based authentication berbasis cookie aman (`HttpOnly`, `SameSite=Lax`, dan `Secure` pada HTTPS).
   - Penyimpanan sesi internal pada Redis dengan prefix terisolasi.
2. **Pencegahan Brute-Force (Login Throttling):**
   - Dilengkapi rate limiting bawaan Laravel (`5 percobaan gagal per menit`) berdasarkan kombinasi email dan IP address pemohon.
   - Pesan error generik untuk mencegah user enumeration (*"Kredensial yang diberikan tidak cocok dengan catatan kami"*).
3. **Session Invalidation & Regenerasi:**
   - ID sesi di-regenerasi secara otomatis saat proses login berhasil untuk mencegah serangan *Session Fixation*.
   - Logout menginvalidasi sesi saat ini dan menghapus token CSRF terkait.

---

## 2. Matriks Role & Hak Akses (RBAC — Spatie Permission)

Hak akses dikontrol secara granular melalui paket `spatie/laravel-permission`. Kewenangan didasarkan pada penugasan peran (*role*), bukan pencocokan string nama staf.

| Peran (*Role*) | Persona Pengguna | Cakupan Modul & Kewenangan |
|---|---|---|
| `Staff Lapangan` | Pak Prima | - Membuat pengajuan kebutuhan kapal (`requests.create`)<br>- Melihat daftar kapal & jadwal kunjungan<br>- Submit laporan kegiatan operasional harian<br>- Akses antarmuka mobile diutamakan |
| `Admin Operasional` | Bu Titik | - Verifikasi dan persetujuan pengajuan kebutuhan kapal (`requests.approve`)<br>- Kelola data kapal dan port call (`vessels.manage`)<br>- Monitor timeline jadwal operasional dan SPK<br>- Akses OCC (Operational Control Center) Desktop |
| `Keuangan / Otorisator` | Pak Ryan | - Otorisasi pencairan dana Kopra<br>- Verifikasi bukti transfer dan pelunasan Pelindo<br>- Rekonsiliasi nota rampung dan penerbitan invoice |
| `Direktur` | Direktur | - Approval akhir pengajuan berskala besar<br>- Pemantauan laporan performa keuangan dan operasional |
| `Super Admin` | IT / Administrator | - Manajemen akun pengguna, penetapan peran & izin<br>- Pemantauan log aktivitas sistem dan backup rutin<br>- *Catatan: Tidak memiliki hak approval bisnis atau transfer dana secara otomatis* |

---

## 3. Perlindungan IDOR (Insecure Direct Object Reference)

1. **Penggunaan UUIDv4:**
   - Seluruh entitas transaksi (`Ship`, `ShipRequest`, `PortCall`) menggunakan identifier UUID 128-bit acak.
   - Penyerang tidak dapat menebak nomor ID melalui serangan sekuensial (*enumeration attack*).
2. **Otorisasi di Tingkat Controller & Policy:**
   - Akses detail atau mutasi data tidak hanya memvalidasi keberadaan record, melainkan memeriksa kepemilikan dan hak peran melalui Laravel Policy (`$this->authorize(...)`).

---

## 4. Perlindungan CSRF & Mutasi Inertia

1. **CSRF Token Handling:**
   - Setiap permintaan mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) dilindungi oleh middleware `ValidateCsrfToken`.
   - Inertia.js dan Axios secara otomatis membaca cookie terenkripsi `XSRF-TOKEN` dan menyertakannya dalam header HTTP `X-XSRF-TOKEN`.
2. **Escaping Output:**
   - React 19 secara default melakukan HTML escaping pada seluruh nilai yang dirender dalam JSX untuk mencegah serangan *Cross-Site Scripting (XSS)*.

---

## 5. Audit Log & Pelacakan Aktivitas (Spatie Activitylog)

Sistem mengintegrasikan `spatie/laravel-activitylog` untuk mencatat seluruh peristiwa operasional krusial:
1. **Peristiwa yang Dicatat:**
   - Pembuatan pengajuan kebutuhan baru (`Membuat pengajuan kebutuhan baru REQ-xxxxx`).
   - Persetujuan / penolakan pengajuan kebutuhan oleh Bu Titik.
   - Modifikasi jadwal kunjungan kapal.
   - Login pengguna dan perubahan hak akses/role.
2. **Penyaringan Data Sensitif:**
   - Password, token sesi, dan data otorisasi privat tidak pernah disimpan dalam kolom `properties` activity log.
   - Log audit bersifat *append-only* dan *read-only* bagi auditor berwenang; tidak dapat diubah atau dihapus melalui CRUD antarmuka aplikasi.

---

## 6. Manajemen Kredensial & Secrets

1. **Kunci Enkripsi (`APP_KEY`):**
   - Menggunakan AES-256-CBC untuk mengenkripsi cookie sesi, payload queue, dan data terenkripsi lainnya.
2. **Isolasi Environment:**
   - File `.env` dikecualikan dari Git repository melalui `.gitignore`.
   - Templating konfigurasi didistribusikan secara aman melalui `.env.example` tanpa menyertakan password produksi atau credential PostgreSQL/Redis riil.
