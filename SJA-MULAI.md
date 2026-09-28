# Mulai implementasi tampilan SJA di Antigravity

Setup menyiapkan alat dan bahan desain. Halaman aplikasi berubah setelah agen
mengimplementasikan tugas di bawah pada proyek Laravel + React + Inertia.

Setelah setup, buka/reload folder proyek di Antigravity. Pastikan rule
`sja-visual` tersedia pada Customizations > Rules dengan mode Always On.
Dokumentasi: https://antigravity.google/docs/rules-workflows

Kirim instruksi ini di chat Antigravity:

```text
Baca dan kerjakan SJA-MULAI.md pada proyek ini.

Periksa AGENTS.md dan instruksi existing, source code, DESIGN.md, inputs.json,
inputs.sja.json, docs/sja/DESIGN.md, serta docs/sja/PROMPT-INDUK.md sampai selesai.
Buka keempat gambar asli pada docs/sja/references/ sesuai pemetaan inputs.sja.json.
Jangan hanya membaca nama file. Laporkan secara spesifik jika gambar tidak tersedia.

Implementasikan seluruh cakupan prompt induk SJA. Untuk UI, gunakan Corporate
Maritime dari referensi Bu Titik untuk desktop dan Pak Prima untuk mobile,
ditambah referensi Menu Kapal serta alur Pengajuan. Pertahankan seluruh modul,
alur SPK sampai invoice/pembayaran, stack, keamanan dan komponen yang diminta.

Jalankan create-design-md, ui-ux-pro-max, frontend-design, baseline-ui,
impeccable, dan web-design-guidelines sesuai skill terpasang. Gemini Flash dan
Claude Sonnet digunakan sesuai pilihan serta ketersediaan model di Antigravity.

Hubungkan resources/css/sja-tokens.css ke entry frontend yang benar-benar
dipakai, map token ke theme/komponen existing, dan terapkan layout pada halaman
Inertia nyata. Gunakan resources/js/components sebagai komponen bersama.
Jangan selesai hanya dengan memasang paket, membuat folder atau dokumen.
Jangan menjadikan screenshot sebagai gambar seluruh antarmuka aplikasi.

Bangun desktop dan mobile seluruh modul dengan data backend dan permission nyata.
Verifikasi warna yang ter-render, navigasi, form, filter, tabel/paginasi, modal,
state komponen dan overflow pada 360, 390, 768, 1024, 1280, 1440 dan 1536 px.
Simpan screenshot hasil desktop/mobile dan ringkasan pemeriksaan yang dijalankan.
```

File DESIGN.md dan inputs.json existing dipertahankan oleh installer. Agen tetap
membaca docs/sja/DESIGN.md dan inputs.sja.json, lalu menggabungkan arahan pengguna
ke design system proyek secara sadar saat implementasi.

Jika setup lama sudah terpasang, gunakan `bash setup-sja.sh --design-only`.
Perintah tersebut memasukkan bahan desain tanpa mengulang instalasi paket.
Folder `sja-references/` di samping skrip berisi empat gambar asli dari paket ZIP.
Alternatif: `bash setup-sja.sh --design-only --references "/lokasi/gambar"`.

Installer tidak menjalankan migrasi, mengganti .env, memilih akun/model,
atau mengubah kode halaman dan entry CSS secara otomatis.
