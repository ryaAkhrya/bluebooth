# Bluebooth Development Pack

Dokumen ini adalah peta kerja bertahap untuk mengubah mockup Bluebooth menjadi **online couple photobooth** yang benar-benar dapat dipakai dua orang dari perangkat dan jaringan berbeda.

## Temuan paling penting

ZIP saat ini bukan aplikasi jadi. Di dalamnya ada dua lapisan:

1. `index.html` dan `public/index.html` berisi mockup vanilla HTML/CSS/JavaScript yang cukup lengkap.
2. Aplikasi Next.js yang sebenarnya masih menampilkan placeholder melalui `app/page.tsx`.

Karena itu, jangan langsung meminta Cline menambahkan Supabase ke `app/page.tsx`. Tahap pertama wajib memigrasikan mockup ke React/Next.js dengan visual dan perilaku yang tetap sama.

## Cara memakai dokumen ini di Cline

Kerjakan satu phase dalam satu sesi atau satu branch. Jangan menempel semua phase sekaligus.

Prompt pembuka yang disarankan:

```text
Read @docs/05_CLINE_GLOBAL_RULES.md, @docs/01_CURRENT_PROJECT_AUDIT.md, and the requested phase file completely. Execute only that phase. Do not begin the next phase. Preserve the approved Bluebooth visual direction. Run every required check, fix failures, then report changed files, commands run, test results, remaining risks, and the recommended commit message.
```

Lalu tambahkan file phase, misalnya:

```text
Execute @docs/phases/PHASE_01_MIGRATE_MOCKUP_TO_NEXTJS.md.
```

## Urutan wajib

| Phase | Hasil utama |
|---|---|
| 01 | Mockup masuk ke Next.js dan tidak lagi berupa halaman placeholder |
| 02 | Engine grid, frame, kamera, timer, review, dan export lokal stabil |
| 03 | Supabase, anonymous auth, schema, RPC, RLS, dan private storage siap |
| 04 | Create/join room sungguhan, presence, dan shared settings realtime |
| 05 | Dua kamera live menggunakan WebRTC dengan Supabase sebagai signaling |
| 06 | Countdown dan pengambilan foto bersama yang tersinkronisasi |
| 07 | Penyimpanan hasil, history, signed URL, dan cleanup file sementara |
| 08 | Testing dua browser, accessibility, mobile polish, dan hardening |
| 09 | Deploy Supabase + Vercel, HTTPS, TURN, dan production smoke test |

## Dokumen referensi

- `01_CURRENT_PROJECT_AUDIT.md`: keadaan ZIP sekarang dan gap yang ditemukan.
- `02_PRODUCT_SPEC.md`: fitur dan batas produk yang tidak boleh melebar.
- `03_TARGET_ARCHITECTURE.md`: arsitektur aplikasi tujuan.
- `04_DATA_SECURITY_BLUEPRINT.md`: rancangan schema, storage, RPC, dan security.
- `05_CLINE_GLOBAL_RULES.md`: aturan permanen untuk semua phase.
- `06_CLINE_PROMPT_CARDS.md`: prompt siap tempel.
- `15_FINAL_DEFINITION_OF_DONE.md`: checklist akhir sebelum dianggap selesai.

## Prinsip penting

- Grid dan frame adalah fitur utama, bukan dekorasi tambahan.
- Tidak ada emoji, stiker, maskot, copywriting romantis berlebihan, atau tampilan SaaS generik.
- Aplikasi dibuat untuk dua orang, bukan platform sosial.
- Audio call tidak dibangun. Pengguna tetap dapat memakai Discord bersamaan.
- Video live berjalan peer-to-peer melalui WebRTC. Supabase hanya menangani signaling dan state.
- Kamera produksi memerlukan HTTPS.
- Room harus privat dan dibatasi maksimal dua anggota.
- Jangan pernah menaruh secret key Supabase atau TURN shared secret di browser.
