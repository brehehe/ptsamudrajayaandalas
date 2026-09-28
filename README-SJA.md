# Setup tampilan PT Samudra Jaya Andalas

Isi paket: setup-sja.sh dan empat screenshot referensi asli dalam sja-references/.
Prompt lengkap dari lampiran pengguna sudah disertakan di dalam skrip.

1. Ekstrak ZIP dan salin setup-sja.sh beserta folder sja-references/ ke root
   proyek Laravel + React + Inertia (tempat artisan dan package.json berada).
2. Jalankan salah satu perintah:

   bash setup-sja.sh --dry-run
   bash setup-sja.sh

   Jika installer lama sudah dijalankan:

   bash setup-sja.sh --design-only

   Untuk sekaligus memasang dependency tiga paket Spatie pada setup baru:

   bash setup-sja.sh --with-spatie

3. Setelah selesai, buka/reload proyek di Antigravity. Di Customizations > Rules,
   pastikan rule sja-visual tersedia dengan mode Always On.
4. Kirim di chat Antigravity: Baca dan kerjakan SJA-MULAI.md.

Setup menghasilkan prompt lengkap docs/sja/PROMPT-INDUK.md, panduan
DESIGN.md dan docs/sja/DESIGN.md, inputs.json/inputs.sja.json, token warna
resources/css/sja-tokens.css, rule proyek, instruksi SJA-MULAI.md dan salinan
empat gambar di docs/sja/references/. File yang sudah ada dipertahankan.

Setup tidak langsung mengubah tampilan halaman. Agen harus membaca gambar,
memasang import token pada entry yang digunakan, menghubungkan theme/komponen,
dan mengimplementasikan UI desktop/mobile sesuai prompt. Seluruh alur sistem
serta stack dan keamanan tetap mengacu pada prompt lengkap yang disertakan.

Screenshot adalah bahan acuan desain; jangan memakainya sebagai satu gambar UI
aplikasi atau menjadikan angka, cuaca dan nama mockup sebagai data produksi.

Prasyarat: proyek Laravel React Inertia existing, Node.js >=22.20, npm/npx,
Git, Python 3; PHP dan Composer untuk --with-spatie. Gunakan npm sesuai skrip.
Tidak ada migrasi otomatis, perubahan .env/APP_KEY, atau konfigurasi bank.

Pemeriksaan: sintaks Bash dan simulasi installer, mode design-only, salinan
empat PNG, kesesuaian prompt/token, dry-run serta preservasi file sudah lolos.
Instalasi online paket dan render aplikasi aktual belum dijalankan.

Dokumentasi rule Antigravity:
https://antigravity.google/docs/rules-workflows
