// Every user-facing string in the app. Bahasa Indonesia, informal, short.
// Not "Transaksi berhasil diproses" but "Selesai".

export const t = {
  app: 'Kasir',

  tab: {
    kasir: 'Kasir',
    barang: 'Barang',
    utang: 'Utang',
    laporan: 'Laporan',
    pengaturan: 'Atur',
  },

  aksi: {
    simpan: 'Simpan',
    batal: 'Batal',
    hapus: 'Hapus',
    tambah: 'Tambah',
    kurangi: 'Kurangi',
    ubah: 'Ubah',
    selesai: 'Selesai',
    kembali: 'Kembali',
    lanjut: 'Lanjut',
    tutup: 'Tutup',
    coba: 'Coba dulu dengan contoh',
  },

  kasir: {
    kosong: 'Belum ada yang dipilih',
    kosongPetunjuk: 'Tap barang di atas untuk mulai.',
    cari: 'Cari barang',
    scan: 'Scan barcode',
    arahkan: 'Arahkan ke barcode',
    mintaKamera: 'Membuka kamera...',
    senterNyala: 'Nyalakan senter',
    senterMati: 'Matikan senter',
    ketikBarcode: 'Ketik barcode',
    ditambahkan: 'Masuk keranjang',
    sering: 'Sering dibeli',
    bayar: (total) => `Bayar ${total}`,
    total: 'Total',
    hariIni: 'Hari ini',
    hapusItem: 'Hapus dari daftar',
    semuaKategori: 'Semua',
  },

  bayar: {
    judul: 'Pembayaran',
    total: 'Total',
    uangDiterima: 'Uang diterima',
    uangPas: 'Uang pas',
    kembalian: 'Kembalian',
    kurang: 'Kurang',
    tunai: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
    utang: 'Utang',
    // Said plainly, because the whole point of separating this from tunai is
    // that the drawer will not balance if the two get mixed up.
    nonTunaiPetunjuk: 'Uang masuk ke rekening, bukan ke laci.',
    tunjukkanQris: 'Tunjukkan QRIS',
    qrisJudul: 'Scan buat bayar',
    sudahDibayar: 'Sudah dibayar',
    catatUtang: 'Catat sebagai utang',
    pilihPelanggan: 'Pilih pelanggan',
    selesai: 'Selesai',
    cetak: 'Cetak struk',
    diskon: 'Diskon',
  },

  barang: {
    judul: 'Barang',
    kosong: 'Belum ada barang.',
    kosongPetunjuk: 'Tambah barang pertama kamu.',
    tambah: 'Tambah barang',
    nama: 'Nama barang',
    namaPetunjuk: 'Contoh: Nasi goreng',
    harga: 'Harga jual',
    modal: 'Harga modal',
    modalPetunjuk: 'Untuk hitung untung. Boleh dikosongkan.',
    kategori: 'Kategori',
    barcode: 'Barcode',
    satuan: 'Satuan',
    stok: 'Stok',
    catatStok: 'Catat stok barang ini',
    stokAwal: 'Stok awal',
    stokMinimal: 'Ingatkan kalau sisa',
    modifier: 'Tambahan',
    habis: 'Habis',
    menipis: 'Menipis',
    kurang: 'Melebihi stok',
    sisaStok: (n) => `Sisa ${n}`,
    contoh: 'Contoh',
    hapusContoh: 'Hapus semua barang contoh',
  },

  stok: {
    judul: 'Stok',
    buka: 'Stok',
    aman: 'Semua stok aman',
    ringkas: (habis, menipis) =>
      [habis && `${habis} habis`, menipis && `${menipis} menipis`]
        .filter(Boolean)
        .join(' · '),
    kosong: 'Belum ada barang yang dicatat stoknya.',
    kosongPetunjuk: 'Nyalakan "Catat stok barang ini" waktu menambah barang.',
    sekarang: 'Stok sekarang',
    masuk: 'Barang masuk',
    masukPetunjuk: 'Jumlah yang baru datang.',
    opname: 'Stok opname',
    opnamePetunjuk: 'Jumlah hasil hitung di rak sekarang.',
    rusak: 'Barang rusak',
    rusakPetunjuk: 'Jumlah yang rusak atau kadaluarsa.',
    jumlah: 'Jumlah',
    jadi: (n) => `Stok jadi ${n}`,
    selisih: 'Selisih',
    catatan: 'Catatan',
    catatanPetunjuk: 'Boleh dikosongkan.',
    riwayat: 'Riwayat',
    belumAdaRiwayat: 'Belum ada perubahan stok.',
    tipe: {
      sale: 'Terjual',
      reversal: 'Penjualan dibatalkan',
      purchase: 'Barang masuk',
      adjustment: 'Stok opname',
      waste: 'Barang rusak',
    },
  },

  utang: {
    judul: 'Utang',
    kosong: 'Belum ada utang.',
    kosongPetunjuk: 'Utang tercatat otomatis saat pembayaran kurang.',
    lunas: 'Sudah lunas',
    belumLunas: 'Belum lunas',
    bayar: 'Bayar utang',
    jumlahBayar: 'Jumlah bayar',
    totalUtang: 'Total utang',
    pelanggan: 'Pelanggan',
    tambahPelanggan: 'Tambah pelanggan',
    namaPelanggan: 'Nama pelanggan',
    sejak: (hari) => `Sudah ${hari} hari`,
  },

  pengeluaran: {
    judul: 'Pengeluaran',
    catat: 'Catat pengeluaran',
    jumlah: 'Jumlah',
    untukApa: 'Untuk apa',
    catatan: 'Catatan',
    catatanPetunjuk: 'Boleh dikosongkan. Contoh: beli plastik di Pasar Baru.',
    dariLaci: 'Uang diambil dari laci',
    dariLuar: 'Dibayar dari luar laci',
    kosong: 'Belum ada pengeluaran hari ini.',
    kosongPetunjuk: 'Catat belanja plastik, bensin, atau uang yang diambil dari laci.',
    batalkan: 'Batalkan pengeluaran ini?',
    dibatalkan: 'Dibatalkan',
    total: 'Total keluar',
    // Shown only when the shop tracks cost prices, because that is exactly
    // when writing a shopping run down here counts it twice.
    modalPeringatan:
      'Belanja stok sudah ikut terhitung lewat harga modal. Kalau dicatat di sini juga, untungnya kepotong dua kali.',
    kategori: {
      belanja: 'Belanja stok',
      transport: 'Transport',
      listrik: 'Listrik & air',
      gas: 'Gas',
      sewa: 'Sewa',
      gaji: 'Gaji',
      pribadi: 'Ambil pribadi',
      lain: 'Lain-lain',
    },
  },

  struk: {
    judul: 'Struk',
    lihat: 'Struk',
    cetak: 'Cetak',
    cetakUlang: 'Cetak struk',
    bagikan: 'Bagikan',
    bagikanPetunjuk: 'Kirim ke WhatsApp pembeli.',
    tersalin: 'Struk disalin. Tinggal paste di WhatsApp.',
    lewatBrowser: 'Cetak lewat browser',
    sambung: 'Sambungkan printer',
    putus: 'Putuskan',
    tersambung: (nama) => `Printer tersambung: ${nama}`,
    belumTersambung: 'Printer belum tersambung',
    mencetak: 'Mengirim ke printer...',
    sudahDicetak: 'Struk terkirim ke printer.',
    laci: 'Buka laci uang saat cetak',
    takAdaBluetooth:
      'HP ini tidak bisa sambung printer Bluetooth lewat browser. Struk masih bisa dibagikan atau dicetak lewat browser.',
  },

  kas: {
    judul: 'Kas',
    tutup: 'Tutup kasir',
    buka: 'Buka kasir',
    bukaPetunjuk: 'Hitung uang di laci sebelum mulai jualan.',
    tutupPetunjuk: 'Hitung uang di laci sekarang.',
    belumBuka: 'Kasir belum dibuka hari ini.',
    sedangBuka: (jam) => `Kasir buka sejak ${jam}`,
    kasAwal: 'Kas awal',
    kasAkhir: 'Uang di laci sekarang',
    seharusnya: 'Seharusnya',
    tunaiMasuk: 'Tunai masuk',
    utangMasuk: 'Utang dibayar',
    keluar: 'Uang keluar',
    selisih: 'Selisih',
    pas: 'Pas',
    lebih: 'Lebih',
    kurang: 'Kurang',
    sudahTutup: (jam) => `Ditutup ${jam}`,
    riwayat: 'Kasir sebelumnya',
  },

  laporan: {
    judul: 'Laporan',
    hariIni: 'Hari ini',
    transaksi: 'Transaksi',
    penjualan: 'Penjualan',
    tunai: 'Tunai',
    nonTunai: 'Non tunai',
    laba: 'Untung kotor',
    labaKosong: 'Belum bisa dihitung, ada barang tanpa harga modal',
    pengeluaran: 'Pengeluaran',
    sisa: 'Sisa bersih',
    utangBaru: 'Utang baru',
    pembayaranUtang: 'Utang dibayar',
    terlaris: 'Paling laku',
    kosong: 'Belum ada transaksi hari ini.',
    batal: 'Dibatalkan',
  },

  pengaturan: {
    judul: 'Pengaturan',
    namaUsaha: 'Nama usaha',
    alamat: 'Alamat',
    alamatPetunjuk: 'Dicetak di struk. Boleh dikosongkan.',
    telepon: 'Nomor HP',
    jenisUsaha: 'Jenis usaha',
    fitur: 'Fitur',
    fiturPetunjuk: 'Matikan yang tidak kamu pakai supaya layar lebih ringkas.',
    cadangan: 'Cadangkan data',
    cadangkan: 'Simpan cadangan',
    pulihkan: 'Pulihkan dari file',
    pulihkanPeringatan: 'Ini akan mengganti semua data yang ada sekarang.',
    terakhirCadang: (tanggal) => `Terakhir dicadangkan ${tanggal}`,
    belumPernahCadang: 'Belum pernah dicadangkan',
    ingatCadang: 'Sudah lama tidak dicadangkan. Simpan cadangan sekarang?',
    pembayaran: 'Pembayaran',
    qris: 'Gambar QRIS',
    qrisPetunjuk: 'Foto QRIS kamu, biar tinggal ditunjukkan ke pembeli. Disimpan di HP ini saja.',
    qrisUnggah: 'Pilih gambar QRIS',
    qrisGanti: 'Ganti gambar',
    qrisHapus: 'Hapus gambar',
    printer: 'Printer struk',
    versi: 'Versi',
    hitungUlang: 'Hitung ulang',
    hitungUlangPetunjuk: 'Pakai kalau ada angka yang terlihat salah.',
  },

  fitur: {
    stok: 'Catat stok',
    barcode: 'Barcode',
    satuan: 'Satuan (pcs, dus)',
    modifier: 'Tambahan menu',
    utang: 'Utang pelanggan',
    modal: 'Harga modal & untung',
    shift: 'Buka & tutup kasir',
    input: 'Tampilan kasir',
    inputGrid: 'Papan barang',
    inputCari: 'Cari & scan',
  },

  onboarding: {
    jenisJudul: 'Usaha kamu jenis apa?',
    jenisPetunjuk: 'Bisa diubah nanti.',
    namaJudul: 'Nama usaha kamu?',
    namaPetunjuk: 'Dipakai di struk.',
    namaContoh: 'Contoh: Warung Bu Ani',
    itemJudul: 'Tambah satu barang dulu',
    itemPetunjuk: 'Supaya bisa langsung jualan.',
    mulai: 'Mulai jualan',
  },

  update: {
    tersedia: 'Ada versi baru.',
    muat: 'Muat ulang',
    nanti: 'Nanti',
    siapOffline: 'Siap dipakai tanpa internet.',
  },

  error: {
    namaKosong: 'Nama barang belum diisi',
    hargaKosong: 'Harga belum diisi',
    namaUsahaKosong: 'Nama usaha belum diisi',
    namaPelangganKosong: 'Nama pelanggan belum diisi',
    pelangganKosong: 'Pilih pelanggan dulu',
    jumlahKosong: 'Jumlah belum diisi',
    kameraDitolak: 'Izin kamera belum diberikan. Aktifkan lewat pengaturan browser, atau ketik barcode-nya.',
    kameraGagal: 'Kamera tidak bisa dipakai di HP ini. Ketik barcode-nya saja.',
    takAman: 'Scan kamera butuh alamat https. Sekarang halaman ini dibuka lewat http, jadi browser mengunci kameranya.',
    takDidukung: 'Browser ini belum bisa scan barcode lewat kamera. Yang sudah bisa: Chrome di Android.',
    takAdaKamera: 'Perangkat ini tidak punya kamera.',
    barcodeTidakAda: (kode) => `Barcode ${kode} belum terdaftar. Tambah dulu di Barang.`,
    barcodeDipakai: (nama) => `Barcode ini sudah dipakai ${nama}.`,
    gambarGagal: 'Gambar tidak bisa dibaca. Coba foto lain.',
    fileSalah: 'File cadangan tidak bisa dibaca',
    versiSalah: 'File cadangan ini dari versi lain dan tidak bisa dipakai',
    printerTakDidukung:
      'Browser ini belum bisa sambung printer Bluetooth. Yang sudah bisa: Chrome di Android.',
    printerTakDikenali: 'Printer ini belum dikenali. Coba matikan lalu nyalakan lagi.',
    printerGagal: 'Struk gagal dikirim. Cek printer masih nyala dan dekat.',
    bagikanGagal: 'Struk belum bisa dibagikan dari HP ini.',
  },
};

/**
 * A warung makan sells "menu", a kelontong sells "barang", a jasa sells
 * "layanan". Keyed by profile rather than hardcoded, because using the wrong
 * word makes the app feel like it was built for someone else.
 */
const NOUNS = {
  kelontong: { satu: 'barang', tambah: 'Tambah barang', cari: 'Cari barang' },
  warungMakan: { satu: 'menu', tambah: 'Tambah menu', cari: 'Cari menu' },
  kakiLima: { satu: 'barang', tambah: 'Tambah barang', cari: 'Cari barang' },
  jasa: { satu: 'layanan', tambah: 'Tambah layanan', cari: 'Cari layanan' },
};

export const noun = (profile) => NOUNS[profile] ?? NOUNS.kelontong;

/** "3 Agu 2026" */
export const tanggal = (ts) =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts));

/** "14:05" */
export const jam = (ts) =>
  new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(ts),
  );
