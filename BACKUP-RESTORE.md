# Prosedur Backup & Restore — PT Samudra Jaya Andalas

Dokumen ini memuat konfigurasi pencadangan data otomatis menggunakan paket `spatie/laravel-backup`, kebijakan retensi, serta langkah-langkah pemulihan data (restore) ke lingkungan terisolasi untuk menguji integritas basis data.

---

## 1. Konfigurasi Backup (`config/backup.php`)

Pencadangan mencakup dua komponen vital:
1. **Basis Data PostgreSQL:**
   - Dicadangkan menggunakan utilitas `pg_dump`.
   - Mengambil seluruh skema dan data tabel operasional (`ships`, `requests`, `request_items`, `port_calls`, `users`, `activity_log`, `roles`, `permissions`).
2. **File Penyimpanan Dokumen:**
   - Berkas private pada `storage/app/private` (bukti SPK, scan invoice resmi, permohonan kapten).
   - **Pengecualian Direktori:** `node_modules/`, `vendor/`, `storage/framework/cache/`, `.git/`, dan direktori output backup itu sendiri secara ketat dikecualikan dari arsip zip untuk menjaga ukuran file tetap efisien.

---

## 2. Kebijakan Retensi Arsip (Cleanup Policy)

Konfigurasi retensi memastikan server tidak kehabisan disk space dengan strategi rotasi:
- **Penyimpanan Harian:** Arsip harian dipertahankan selama **7 hari** terakhir.
- **Penyimpanan Mingguan:** Satu arsip per minggu dipertahankan selama **4 minggu**.
- **Penyimpanan Bulanan:** Satu arsip per bulan dipertahankan selama **6 bulan**.
- **Pembersihan Otomatis:** Perintah `php artisan backup:clean` dijalankan setiap malam sebelum proses pencadangan baru dieksekusi.

---

## 3. Menjalankan Pencadangan Manual & Terjadwal

### A. Perintah Pencadangan Manual
```bash
# Melakukan backup database dan file sekaligus
php artisan backup:run

# Melakukan backup database saja (lebih cepat)
php artisan backup:run --only-db

# Memeriksa status kesehatan arsip backup yang ada
php artisan backup:monitor
```

### B. Otomasi Melalui Laravel Scheduler
Pada `routes/console.php`, scheduler dikonfigurasi untuk berjalan otomatis:
```php
use Illuminate\Support\Facades\Schedule;

// Bersihkan arsip kadaluarsa setiap hari pukul 01:00 WIB
Schedule::command('backup:clean')->dailyAt('01:00');

// Jalankan backup lengkap setiap hari pukul 02:00 WIB
Schedule::command('backup:run')->dailyAt('02:00');
```

---

## 4. Prosedur Uji Pemulihan (Restore Drill) ke Database Terisolasi

Untuk memastikan file backup valid dan dapat dipulihkan kapan saja saat terjadi bencana (*disaster recovery*), lakukan simulasi restore secara berkala ke basis data uji terpisah:

### Langkah 1: Siapkan Database Terisolasi
Buat database penampung sementara di PostgreSQL:
```bash
createdb -U postgres ptsamudrajayaandalas_restore_test
```

### Langkah 2: Ekstrak Arsip Backup Terakhir
Temukan file backup zip di `storage/app/backup-sja/` atau disk private terkait, lalu ekstrak:
```bash
unzip -q storage/app/backup-sja/PT-Samudra-Jaya-Andalas-2026-*.zip -d /tmp/sja_restore_drill
```

### Langkah 3: Eksekusi Restore Menggunakan `pg_restore` / `psql`
Restore dump SQL ke database terisolasi:
```bash
psql -U postgres -d ptsamudrajayaandalas_restore_test -f /tmp/sja_restore_drill/db-dumps/postgresql-ptsamudrajayaandalas.sql
```

### Langkah 4: Validasi Integritas Data
Periksa jumlah record dan foreign key pada database uji:
```bash
psql -U postgres -d ptsamudrajayaandalas_restore_test -c "
  SELECT 
    (SELECT count(*) FROM ships) AS total_ships,
    (SELECT count(*) FROM requests) AS total_requests,
    (SELECT count(*) FROM users) AS total_users;
"
```

### Langkah 5: Bersihkan Lingkungan Uji
Setelah verifikasi sukses dicatat, hapus database sementara dan file ekstraksi:
```bash
dropdb -U postgres ptsamudrajayaandalas_restore_test
rm -rf /tmp/sja_restore_drill
```
