# CS Supervision

Menu **CS Supervision** hanya tersedia untuk role `root` (direksi). Role `admin`
(staff) hanya memperoleh menu **Daily Report**. Pemeriksaan role dilakukan di proxy
serta handler API; tabel KPI tidak dapat diakses memakai key Supabase anon atau
session authenticated. Listener hanya menerima status pekerjaan, tanpa temuan,
cuplikan chat, poin, atau keputusan direksi. Tidak ada kiriman KPI ke Discord/WA.

## Aktivasi

1. Terapkan migration, berurutan:
   - `supabase/migrations/20261113090000_add_cs_kpi_supervision.sql`
   - `supabase/migrations/20261113091000_configure_cs_kpi_schedule.sql`
2. Deploy aplikasi web yang memuat `/api/bot/whatsapp/supervise`.
3. Update kode VPS dan restart service `metawellness-wa-listener`. Tidak ada
   secret baru; endpoint memakai HMAC `WHATSAPP_LISTENER_SECRET` yang sudah ada.
4. Buka panel root → CS Supervision → Pengaturan. Ubah nama `CS Utama` menjadi
   nama admin yang bertugas dan periksa jadwal. Gunakan **Periksa Sekarang**
   untuk memeriksa koneksi, hasil scan, dan error terakhir.

Seed mengaktifkan observasi sejak waktu migration, setiap hari 10.00–22.00 WIB,
satu PIC, batas konsultasi 180 menit kerja, dan Daily Report paling lambat 22.00
WIB. Batas laporan menggunakan akhir shift sebagai default karena belum ada jam
terpisah yang ditentukan. Direksi dapat mengubahnya dan menambahkan tanggal libur.
Data sebelum aktivasi tidak diberi poin otomatis. Perubahan jadwal digunakan pada
scan berikutnya; bukti dan keputusan yang sudah direview tidak ditimpa.

Listener menjadwalkan heartbeat dan scan setiap dua menit, terpisah dari analisa
lead AI. Lease database mencegah scan bersamaan. Jika listener terputus, atau
heartbeat berselisih lebih dari lima menit, observasi chat dimulai ulang saat
tersambung. Episode sebelum cakupan baru dilewati agar balasan yang tidak tertangkap
tidak dianggap terlambat. Temuan yang sudah ada tetap dapat ditinjau. Scan order
dan laporan tetap bisa berjalan saat WA tidak terhubung; bila proses listener
mati seluruhnya, gunakan pemeriksaan manual dan pulihkan servicenya.

## Aturan dan review

| Pemicu | Poin | Bukti / batasan |
| --- | --- | --- |
| Balasan melewati 30 menit kerja | 1 | Pesan customer pertama dalam episode, cuplikan konteks, waktu balasan atau belum terlihat |
| Konsultasi / trial closing ditinggal >3 jam kerja | 2 | Indikasi kata konsultasi/closing dalam konteks; wajib dicek manusia |
| Customer / transaksi tidak diinput hari yang sama | 2 | Lead/order backdate dibanding waktu input aktual, atau indikasi pembayaran chat tanpa order hari kerja yang sama |
| Daily Report tidak terkirim sebelum batas | 2 | Tanggal kerja dan deadline; laporan susulan tetap terlihat |
| Order lunas belum diproses >60 menit WA / >120 menit marketplace | 5 | Mulai dari waktu input aktual atau pembayaran, yang lebih akhir; berhenti saat status processing/completed atau resi asli tercatat |

Waktu tunggu berhenti di luar shift, hari nonkerja, dan tanggal libur. Pesan
pembayaran setelah tutup dihitung untuk input pada shift berikutnya. Pesan pendek
seperti "terima kasih" tidak membuka episode baru. Burst pesan customer tidak
mengulang timer. Episode konsultasi yang memanjang menaikkan satu temuan pending
dari 1 ke 2 poin, tanpa menghitung dua kali. Kontak ignored / lead skip dilewati.

Semua temuan otomatis dan manual dimulai sebagai **Menunggu tinjauan**. Direksi
membuka **Bukti & Review**, memeriksa konteks/izin/gangguan, mengoreksi PIC bila
perlu, lalu mengesahkan atau membatalkan dengan nama pemeriksa dan alasan. Nama
pemeriksa adalah isian audit; autentikasinya tetap akun root bersama. Konflik dua
review bersamaan ditolak agar keputusan lama tidak menimpa keputusan baru.

**Rekap Bulanan** mengikuti bulan kejadian dalam WIB, menjumlahkan poin temuan
yang disahkan per CS dan jenis pelanggaran. Pending/dibatalkan tidak menambah
poin. Ini akumulasi pelanggaran, tanpa nilai awal, peringkat, potongan gaji,
atau kesimpulan kinerja otomatis. Keputusan dapat dibuka kembali dan riwayatnya
tersimpan. Tidak ada tombol hapus log/audit.

## Daily Report

Staff mengisi tanggal, ringkasan pekerjaan, tindak lanjut terbuka, dan kendala.
Server menentukan PIC serta timestamp kirim; staff tidak bisa mengirim poin,
mengganti PIC, atau memalsukan waktu kirim. Satu laporan panel per PIC/tanggal,
tidak dapat ditimpa. Laporan terlambat untuk maksimal 90 hari sebelumnya masih
dapat dikirim, tetapi waktu kirim aktual tetap digunakan saat review. Direksi
membaca laporan di tab Daily Reports pada CS Supervision.

## Cakupan data

- Nomor WA digunakan bersama dan belum mendeteksi identitas pengetik. Semua
  temuan menggunakan PIC utama yang dikonfigurasi; direksi dapat mengoreksi.
- Deteksi konteks konsultasi/pembayaran menggunakan aturan kata, bukan keputusan
  AI. Bukti pembayaran, permintaan customer, balasan melalui telepon, dan izin
  memerlukan pemeriksaan manual. Temuan manual disediakan untuk kejadian lain.
- Belum ada ingest order langsung dari aplikasi marketplace. Waktu sebelum order
  masuk database belum terukur. Order yang belum dibayar/cancelled tidak memicu
  keterlambatan proses. Website tidak termasuk aturan WA/marketplace ini.
- Timestamp `cs_recorded_at` / `cs_processed_at` dicatat trigger database dan
  terpisah dari tanggal bisnis yang dapat dibackdate. Baris lama tidak dibackfill
  dengan waktu proses historis yang tidak diketahui.
- Cuplikan bukti disimpan bersama temuan dan tetap ada setelah retensi chat WA
  90 hari. Batasi akses root untuk menjaga kerahasiaan chat dan evaluasi staff.

## Verifikasi dan rollback

```sh
npm run test:cs-kpi
npm run test:cs-kpi-db  # Docker; cluster sementara tanpa network/port publik
npm --prefix whatsapp-listener test
npm run build
```

Test database memakai image `postgres:16-alpine` (dapat diganti lewat
`CS_KPI_TEST_PG_IMAGE`), tanpa URL atau kredensial database produksi. Container
dan data tmpfs selalu dihapus setelah pengujian.

Untuk menghentikan observasi, nonaktifkan pengaturan supervisi. Pertahankan tabel
untuk bukti/audit; jangan rollback dengan menghapus log. Pengaktifan ulang memulai
periode observasi baru dan mempertahankan riwayat lama.
