---
trigger: always_on
---

# Panduan visual proyek SJA

Untuk implementasi atau perubahan UI PT Samudra Jaya Andalas, baca
`SJA-MULAI.md`, `docs/sja/DESIGN.md`, `inputs.sja.json` dan bagian relevan
`docs/sja/PROMPT-INDUK.md` dari root proyek. Baca juga AGENTS.md, DESIGN.md,
inputs.json, komponen existing dan instruksi pengguna yang berlaku.

Buka gambar asli yang dipetakan di inputs.sja.json. Gambar yang belum ada
harus dilaporkan; jangan mengklaim sudah memeriksanya. Desktop mengacu pada
Bu Titik, mobile mengacu pada Pak Prima, Menu Kapal dan alur Pengajuan.

Gunakan token Corporate Maritime di resources/css/sja-tokens.css. Saat membangun
UI, sambungkan ke entry frontend dan theme existing setelah memeriksa struktur
proyek. Terapkan seluruh layout/komponen desktop dan mobile dengan backend nyata.
Verifikasi hasil render, bukan hanya keberadaan CSS/dokumen. Jangan mengganti UI
dengan screenshot, menyalin statistik mockup, atau mengarang route/permission.

Arahan ini melengkapi aturan proyek. Jangan menghapus aturan keamanan atau
melampaui akses serta instruksi pengguna. Setup tidak memulai pekerjaan agen;
kerjakan cakupan yang diminta ketika pengguna menjalankan prompt implementasi.
