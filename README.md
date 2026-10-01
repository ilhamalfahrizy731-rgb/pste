# Pastebin Mini

Pastebin sederhana dengan pilihan ekstensi opsional (`.html`, `.css`, `.js`), URL raw, penomoran otomatis, dan preview sebelum upload.

## Menjalankan

Perlu Node.js 18 atau lebih baru. Tidak perlu memasang dependency.

```bash
npm start
```

Buka `http://localhost:3000` di browser. File paste tersimpan di folder `r/`.

## URL raw dan penomoran

Paste pertama mendapat `a1`, lalu `a2` sampai `a9`, dilanjutkan `b1` sampai `b9`, dan seterusnya. Contoh, pilihan `.js` menghasilkan `/r/a1.js`; tanpa ekstensi menghasilkan `/r/a2`.

Penomoran dipakai bersama untuk semua ekstensi agar URL tidak bertabrakan. Setelah `z9`, urutan berlanjut ke `aa1`.

## Preview dan keamanan

HTML, CSS, dan JavaScript dapat dipreview sebelum dikirim. Jika memilih "Tanpa ekstensi", pilih juga jenis kode preview bila ingin memeriksa hasilnya. Kode di dalam preview berada di iframe sandbox dengan kebijakan konten yang membatasi akses jaringan dan halaman induk. Preview bersifat lokal; upload hanya terjadi setelah tombol "Lanjutkan upload" ditekan.

Ukuran satu paste dibatasi 1 MB. Ini cocok untuk demo atau penggunaan internal sederhana. Untuk layanan publik, tambahkan autentikasi/rate limit, batas penyimpanan, kebijakan retensi, dan pertimbangkan penyimpanan metadata di database.
