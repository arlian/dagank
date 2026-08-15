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
    utang: 'Utang',
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
    laba: 'Untung',
    labaKosong: 'Belum bisa dihitung, ada barang tanpa harga modal',
    utangBaru: 'Utang baru',
    pembayaranUtang: 'Utang dibayar',
    terlaris: 'Paling laku',
    kosong: 'Belum ada transaksi hari ini.',
    batal: 'Dibatalkan',
  },

  pengaturan: {
    judul: 'Pengaturan',
    namaUsaha: 'Nama usaha',
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
    fileSalah: 'File cadangan tidak bisa dibaca',
    versiSalah: 'File cadangan ini dari versi lain dan tidak bisa dipakai',
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
