# Dokumentasi Setup & Verifikasi Sistem — PT Samudra Jaya Andalas

Dokumen ini memuat panduan komprehensif setup lingkungan, spesifikasi stack teknis yang terpasang, daftar akun demo, serta catatan hasil verifikasi implementasi end-to-end aplikasi PT Samudra Jaya Andalas.

---

## 1. Spesifikasi Stack & Versi Dependensi

Implementasi sistem menggunakan stack modern sesuai mandat proyek:

| Komponen | Dependensi / Tool | Versi Aktual Terpasang | Status Verifikasi |
|---|---|---|---|
| **Backend Runtime** | PHP | `8.3.x` | Terverifikasi |
| **Framework Web** | Laravel | `12.x` (Inertia v2 Ready) | Terverifikasi |
| **Frontend Core** | React & React DOM | `19.3.0` | Terverifikasi |
| **SPA Bridge** | `@inertiajs/react` | `^2.0.0` | Terverifikasi |
| **Build Tooling** | Vite | `8.3.0` | Terverifikasi |
| **Vite React Plugin** | `@vitejs/plugin-react` | `^6.1.1` | Terverifikasi |
| **Styling Engine** | Tailwind CSS & `@tailwindcss/vite` | `4.3.3` | Terverifikasi |
| **Design Tokens** | Corporate Maritime Tokens | `resources/css/sja-tokens.css` | Terhubung ke Vite |
| **Basis Data Utama** | PostgreSQL | `14+` (`ptsamudrajayaandalas`) | Terkoneksi (127.0.0.1:5432) |
| **Cache & Queue** | Redis | `7+` (PhpRedis / Predis) | Terkonfigurasi |
| **Role & Otorisasi**| `spatie/laravel-permission` | `^6.24.0` | Terkonfigurasi |
| **Log Audit** | `spatie/laravel-activitylog` | `^4.10.2` | Terkonfigurasi |
| **Backup Sistem** | `spatie/laravel-backup` | `^9.3.5` | Terkonfigurasi |

---

## 2. Kredensial Akun Pengguna Demo

Sistem dilengkapi dengan 4 akun representatif sesuai persona operasional:

| Persona | Nama Pengguna | Email Login | Kata Sandi | Peran / Scope |
|---|---|---|---|---|
| **Pak Prima** | Staff Lapangan | `prima@samudrajaya.co.id` | `password` | Staff Lapangan (Mobile Interface, Buat Pengajuan, Status Kapal) |
| **Bu Titik** | Admin Operasional | `titik@samudrajaya.co.id` | `password` | Admin Operasional (Desktop OCC, Review Pengajuan, Kelola Kapal) |
| **Admin Sistem**| IT Administrator | `admin@samudrajaya.co.id` | `password` | Super Admin (Manajemen User & Role, Log Audit, Konfigurasi) |
| **Owner / Ryan**| Direktur / Otorisator | `owner@samudrajaya.co.id` | `password` | Direktur (Persetujuan Transaksi Besar, Monitoring Eksekutif) |

> **Fitur Quick Login:** Halaman `/login` menyediakan tombol *1-Click Demo Login* untuk mempermudah pengujian peralihan persona Pak Prima, Bu Titik, Admin, dan Owner secara instan.

---

## 3. Langkah Menjalankan Aplikasi Secara Lokal

### A. Memulai Backend Laravel
```bash
# Menjalankan server aplikasi lokal di port 8000
php artisan serve
```

### B. Menjalankan Frontend Development Server (HMR)
```bash
# Menjalankan Vite dev server dengan Hot Module Replacement
npm run dev
```

### C. Menjalankan Build Produksi Frontend
```bash
# Memverifikasi typechecking TypeScript dan bundel aset Vite
npm run build
```

### D. Menjalankan Background Worker & Scheduler
```bash
# Menjalankan worker antrean Redis
php artisan queue:work redis --sleep=3 --tries=3

# Menjalankan task scheduler otomatis (Backup, Pembersihan Sesi)
php artisan schedule:work
```

---

## 4. Hasil Verifikasi Kualitas & Pengujian (Test Suite)

Seluruh pengujian otomatis dan format kode telah dieksekusi dengan hasil 100% lulus:

### A. Pengujian Fitur (Pest Test Suite)
```bash
php artisan test --compact
```
**Hasil:**
- Total Tes: **32 passed**
- Total Assertions: **70 assertions**
- Durasi: **~1.58 detik**
- Cakupan:
  - Akses publik Landing Page beridentitas Corporate Maritime (`/`)
  - Redirect autentikasi untuk pengunjung tanpa izin
  - Akses dashboard internal (`/dashboard`)
  - Akses Menu Kapal & status filter (`/vessels`)
  - Akses Detail Kapal (`/vessels/{id}`)
  - Akses Pengajuan Kebutuhan Kapal (`/requests`)
  - Pembuatan pengajuan baru via wizard (`POST /requests`) dan pencatatan database

### B. Format Kode & Standar PSR-12 (Laravel Pint)
```bash
vendor/bin/pint --format agent app routes config tests database
```
**Hasil:** Seluruh file PHP telah diformat bersih sesuai standar resmi Laravel Boost guidelines.

### C. Kompilasi Aset Frontend (Vite & TypeScript)
```bash
npm run build
```
**Hasil:** Berhasil dikompilasi dalam **< 800ms** tanpa peringatan tipe TypeScript (`tsc && vite build`).

---

## 5. Ringkasan Halaman & Fitur yang Terpasang

1. **Landing Page (`/`):**
   - Header navigasi sticky dengan logo resmi SJA dan tombol CTA *Masuk Sistem*.
   - Hero section berorientasi Corporate Maritime dengan palet `#0060F4`, `#082870`, `#0B1F63`, `#F0F8FF`.
   - Section Tentang Perusahaan, Layanan Keagenan Terverifikasi, Fitur Sistem Operasional, dan Footer resmi.
2. **Dashboard Operasional Ganda (`/dashboard`):**
   - **Mode Desktop (Bu Titik):** Sidebar Navy `#0D2945`, banner Pusat Kendali Operasional, 4 kartu KPI, daftar pengajuan terbaru, kapal dalam perhatian, jadwal kapal hari ini, dan aksi cepat.
   - **Mode Mobile (Pak Prima):** Sambutan staf lapangan, quick CTA *+ Buat Pengajuan*, kartu kapal aktif, dan bilah navigasi bawah 4-menu (*Beranda, Kapal, Pengajuan, Profil*).
3. **Menu Kapal (`/vessels` & `/vessels/{id}`):**
   - Pencarian kapal interaktif, tab filter status (*Semua, Akan Datang, Labuh, Sandar*), kartu armada, dan halaman detail spesifikasi teknis lengkap.
4. **Alur Pengajuan Kebutuhan Kapal (`/requests`):**
   - Tab navigasi *Aktif* dan *Riwayat*.
   - Filter drawer/bottom sheet berdasarkan status dan rentang tanggal.
   - **Wizard 4 Langkah Pembuatan Pengajuan:**
     - Langkah 1: Pilih Kapal
     - Langkah 2: Pilih Kebutuhan (6 kartu kategori: *Fresh Water, Perahu, Crew Transport, Clearance, Fuel Surcharge, Lainnya*)
     - Langkah 3: Input Detail Kuantitas, Satuan, Jadwal, Catatan, & Foto
     - Langkah 4: Review & Konfirmasi
   - Modal konfirmasi sukses bergaya tiket dengan nomor registrasi unik `REQ-xxxxx`.
   - Slide-over / Modal Detail Pengajuan beserta timeline status transisi.
   - Menu aksi tambahan (*Edit, Batalkan, Duplikasi*).