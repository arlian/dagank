# Kasir UMKM

Aplikasi kasir gratis untuk usaha kecil Indonesia: toko kelontong, warung
makan, pedagang kaki lima, dan penjual jasa sederhana.

Jalan sepenuhnya tanpa internet. Tidak ada server, tidak ada akun, tidak ada
biaya langganan. Semua data tersimpan di HP pemiliknya sendiri.

**Coba:** https://arlian.github.io/dagank/

## Satu aplikasi, empat profil usaha

Profil dipilih sekali saat pertama buka, dan isinya cuma preset dari beberapa
tanda fitur. Sesudah itu tanda fitur jadi milik toko dan bisa diubah kapan saja
lewat Pengaturan.

| | kelontong | warung makan | kaki lima | jasa |
|---|---|---|---|---|
| Catat stok | ✓ | ✓ | | |
| Barcode | ✓ | | | |
| Satuan | ✓ | | | |
| Tambahan menu | | ✓ | | |
| Utang | ✓ | ✓ | | ✓ |
| Harga modal | ✓ | | ✓ | |
| Tampilan kasir | cari | papan | papan | papan |

Yang paling terasa bedanya dua: **tampilan kasir** (papan barang untuk menu
kecil yang tetap, cari & scan untuk ratusan barang) dan **tambahan menu**.

Kalau sebuah fitur dimatikan, kolomnya **hilang**, bukan dinonaktifkan. Penjual
gorengan yang melihat kolom barcode berarti aplikasinya gagal tepat di saat dia
seharusnya mulai percaya.

## Perintah

```bash
npm run dev        # pengembangan
npm run dev:https  # sama, tapi https, untuk menguji kamera dari HP
npm run build      # build produksi ke dist/
npm run preview    # sajikan hasil build; service worker cuma hidup di sini
npm run test       # unit test
npm run lint
npm run icons      # bikin ulang ikon PWA
```

Perilaku service worker hanya muncul di `preview` dan produksi, tidak pernah di
`dev`. Uji perubahan apa pun soal offline atau pembaruan lewat `preview`.

## Susunan

```
src/
  data/        skema Dexie, migrasi, repositori. Tidak pernah menyentuh jaringan.
  domain/      perhitungan murni: total, margin, pergerakan stok
  profiles/    preset profil usaha dan nilai bawaan tanda fitur
  printer/     (belum ada) struk ESC/POS lewat Web Bluetooth
  ui/          kerangka aplikasi: App.jsx, rute hash, konteks pengaturan, gaya
    screens/     satu berkas per layar, termasuk layar penuh yang dibuka dari layar lain
    components/  komponen yang dipakai ulang lintas layar
    tests/       uji integrasi yang memuat <App /> lalu menelusurinya
  strings/     semua teks Bahasa Indonesia
```

## Aturan yang selalu berlaku

- Uang adalah bilangan bulat rupiah. Bukan pecahan, bukan sen.
- Aplikasi harus jalan penuh tanpa jaringan. Tidak ada satu pun fungsi di
  `src/data/` yang boleh menunggu jaringan.
- Penjualan, catatan utang, dan pergerakan stok bersifat tambah-saja. Koreksi
  ditulis sebagai catatan pembalik, bukan dengan mengubah yang lama.
- Stok boleh minus. Peringatkan, jangan blokir. Toko menjual apa yang ada di
  rak, terlepas dari apa yang diyakini aplikasi.
- `trackStock` dibaca per barang, tidak pernah per toko.
- ID dibuat di perangkat (ULID), tidak pernah oleh server.
- `src/domain/` tetap murni dan diuji. Tanpa DOM, tanpa Dexie, tanpa Bluetooth.

## Barcode

Dua decoder, dipilih saat jalan. Kalau browser punya `BarcodeDetector` (Chrome
di Android, ChromeOS, macOS) itu yang dipakai: bawaan, instan, gratis. Kalau
tidak ada, decoder JS diunduh saat dibutuhkan — dan sengaja **tidak** ikut
precache, supaya HP Android tidak membayar 443KB untuk berkas yang tidak pernah
dimuatnya.

Kamera butuh secure context. `localhost` sudah termasuk; alamat LAN lewat http
tidak, dan itu penyebab paling sering scan tidak jalan saat pengujian.

## Yang belum ada

- `src/printer/` — struk ESC/POS 58mm lewat Web Bluetooth
- Impor CSV untuk pendataan awal ratusan barang
- Stok opname
