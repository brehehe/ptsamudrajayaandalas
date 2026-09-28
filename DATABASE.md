# Dokumentasi Basis Data — PT Samudra Jaya Andalas (SJA)

Dokumen ini memuat spesifikasi arsitektur basis data, konvensi UUID, integritas referensial (Foreign Key), strategi pengindeksan, aturan Soft Deletes, dan pencegahan masalah N+1 pada sistem keagenan kapal PT Samudra Jaya Andalas.

---

## 1. Konvensi Kunci Primer & UUID

Sistem menggunakan **PostgreSQL UUIDv4** sebagai primary key pada seluruh model domain operasional.
- **Tipe kolom:** `uuid` di PostgreSQL.
- **Trait Model Laravel:** `Illuminate\Database\Eloquent\Concerns\HasUuids`.
- **Integritas:** Dibuat secara otomatis di level model saat record di-instansiasi sebelum disimpan ke basis data.
- **Tabel Pengguna (Legacy/Existing):** Tabel `users` mempertahankan integer primary key (`bigIncrements`) untuk menjaga integritas akun bawaan, dengan Spatie Permission pivot table yang diselaraskan secara polymorphic. Seluruh entitas bisnis baru (`ships`, `requests`, `request_items`, `port_calls`) menggunakan tipe UUID murni.

---

## 2. Struktur Skema Tabel Utama

### A. Tabel `ships` (Data Kapal)
Tabel master kapal yang dilayani oleh keagenan SJA.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | `uuid` | NO | Primary Key (UUIDv4) |
| `ship_company_id` | `uuid` | YES | Relasi ke pemilik kapal / klien |
| `imo_number` | `varchar` | YES | Nomor IMO resmi (Indexed) |
| `name` | `varchar` | NO | Nama kapal (Indexed) |
| `call_sign` | `varchar` | YES | Tanda panggilan radio kapal |
| `flag` | `varchar` | YES | Bendera kebangsaan kapal |
| `ship_type` | `varchar` | YES | Tipe armada (Container, Tanker, Bulk Carrier, dll) |
| `gross_tonnage` | `integer` | YES | Tonase kotor (GRT) |
| `status` | `varchar` | NO | Status operasional (`Akan Datang`, `Labuh`, `Sandar`) |
| `eta` | `timestamp` | YES | Estimasi kedatangan di pelabuhan |
| `agent_name` | `varchar` | YES | Nama agen pengurus |
| `image` | `varchar` | YES | Path foto/dokumentasi kapal |
| `is_active` | `boolean` | NO | Penanda aktif (Default: `true`) |
| `created_at` | `timestamp` | YES | Waktu pembuatan record |
| `updated_at` | `timestamp` | YES | Waktu pembaruan record |
| `deleted_at` | `timestamp` | YES | Soft delete timestamp |

### B. Tabel `requests` (Pengajuan Kebutuhan Kapal)
Tabel transaksi pengajuan kebutuhan operasional dan perbekalan kapal.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | `uuid` | NO | Primary Key (UUIDv4) |
| `request_number` | `varchar` | NO | Nomor unik pengajuan (`REQ-xxxxx`, Unique) |
| `ship_id` | `uuid` | NO | Foreign key ke `ships.id` (Indexed) |
| `created_by` | `bigint` | YES | Foreign key ke `users.id` pembuat (Staff Lapangan) |
| `status` | `varchar` | NO | Status approval (`Menunggu Approval`, `Disetujui`, `Dalam Proses`, `Pending`, `Selesai`, `Dibatalkan`) |
| `request_date` | `date` | YES | Tanggal pengajuan dibuat |
| `notes` | `text` | YES | Rincian jenis kebutuhan, jumlah, dan jadwal |
| `completed_at` | `timestamp` | YES | Waktu penyelesaian pengajuan |
| `cancelled_at` | `timestamp` | YES | Waktu pembatalan pengajuan |
| `port_call_id` | `uuid` | YES | Relasi ke kunjungan kapal terkait |
| `created_at` | `timestamp` | YES | Waktu pembuatan record |
| `updated_at` | `timestamp` | YES | Waktu pembaruan record |
| `deleted_at` | `timestamp` | YES | Soft delete timestamp |

### C. Tabel `request_items` (Rincian Item Kebutuhan)
Rincian per item komoditas atau jasa dalam satu berkas pengajuan.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | `uuid` | NO | Primary Key (UUIDv4) |
| `request_id` | `uuid` | NO | Foreign key ke `requests.id` (Cascade On Delete) |
| `product_id` | `uuid` | YES | Relasi katalog produk/satuan |
| `service_id` | `uuid` | YES | Relasi katalog jasa |
| `item_type` | `varchar` | YES | Kategori barang/jasa |
| `item_name` | `varchar` | NO | Nama komoditas/layanan |
| `unit` | `varchar` | YES | Satuan ukuran (`Ton`, `Unit`, `Orang`, `Paket`, `Liter`) |
| `quantity` | `decimal(10,2)`| NO | Jumlah kebutuhan (Default: 1) |
| `required_date`| `date` | YES | Tanggal pemenuhan yang diharapkan |
| `required_time`| `varchar` | YES | Jam pemenuhan yang diharapkan |
| `hpp_price` | `decimal(15,2)`| YES | Harga pokok perolehan (Vendor) |
| `selling_price`| `decimal(15,2)`| YES | Harga penawaran/tagihan klien |
| `status` | `varchar` | NO | Status pemenuhan item |
| `is_urgent` | `boolean` | NO | Penanda prioritas mendesak |
| `notes` | `text` | YES | Instruksi khusus |

### D. Tabel `port_calls` (Kunjungan Kapal)
Tabel pemisahan entitas fisik kapal dari kunjungan/job operasional di pelabuhan.

| Kolom | Tipe | Nullable | Keterangan |
|---|---|---|---|
| `id` | `uuid` | NO | Primary Key (UUIDv4) |
| `job_number` | `varchar` | YES | Nomor registrasi pekerjaan keagenan |
| `ship_id` | `uuid` | YES | Relasi ke kapal |
| `port_id` | `uuid` | YES | Pelabuhan singgah (Tanjung Perak, Gresik, dll) |
| `status` | `varchar` | NO | Status kunjungan (`scheduled`, `berthed`, `departed`) |
| `eta_at` | `timestamp` | YES | Estimasi waktu tiba |
| `etd_at` | `timestamp` | YES | Estimasi waktu berangkat |
| `arrived_at` | `timestamp` | YES | Waktu riil tiba |
| `berthed_at` | `timestamp` | YES | Waktu riil sandar |
| `departed_at` | `timestamp` | YES | Waktu riil berangkat |
| `financial_status`| `varchar` | YES | Status penyelesaian finansial |

---

## 3. Strategi Indexing & Optimasi Query

Seluruh indeks disusun berdasarkan profil query operasional:
1. **Pencarian Nama & IMO:**
   - Index pada `ships(name)` dan `ships(imo_number)`.
2. **Filter Status & Aktif:**
   - Index pada `ships(status)`, `ships(is_active)`.
   - Index pada `requests(status)`.
3. **Penyortiran Kronologis:**
   - Index komposit pada `requests(created_at, status)` untuk tab navigasi *Aktif* dan *Riwayat*.
4. **Foreign Key Index:**
   - Seluruh foreign key (`ship_id`, `request_id`, `created_by`) diindeks untuk mempercepat join dan relasi Eloquent.

---

## 4. Kebijakan Soft Deletes & Integritas Riwayat

1. **Model yang Dilindungi:** `Ship`, `ShipRequest`, `PortCall` menerapkan trait `Illuminate\Database\Eloquent\SoftDeletes`.
2. **Perlindungan Audit:** Data yang dihapus tidak dihapus permanen dari storage fisik PostgreSQL, melainkan diisi nilai `deleted_at`.
3. **Dokumen Resmi:** Pengajuan berstatus `Selesai` atau dokumen keuangan yang telah disetujui (`Disetujui`) dilarang dihapus melalui CRUD biasa untuk mencegah rusaknya audit trail historis. Pembatalan dilakukan dengan mengubah status menjadi `Dibatalkan` disertai alasan.

---

## 5. Pencegahan Masalah N+1

Untuk menjamin performa tinggi:
1. **Eager Loading Terpilih:**
   - `RequestController`: Memanggil `with(['ship', 'creator'])` saat menyajikan daftar pengajuan.
   - `VesselController`: Memanggil `with(['requests'])` saat menyajikan detail kapal.
   - `DashboardController`: Menggunakan eager loading pada attention ships dan agregat database (`count()`, `sum()`) langsung pada SQL level alih-alih me-load seluruh record ke memory PHP.
2. **Pendeteksian Otomatis:**
   - Di lingkungan `local` dan `testing`, `Model::preventLazyLoading(! app()->isProduction())` dapat diaktifkan pada `AppServiceProvider` untuk menangkap potensi N+1 sejak tahap development.
