# Meta Wellness Discord Bot

Bot Discord berbasis command `!` (konsepnya sama seperti `worthy-bot`) untuk tim sales Meta Wellness. Setiap command memanggil API `/api/bot/*` di website Meta Wellness, jadi datanya langsung masuk ke database yang sama dengan panel admin.

```text
Discord (tim sales)
   │  ketik !command
   ▼
Bot worker (folder discord-bot/, jalan terus di server/VPS)
   │  HTTPS + signature HMAC (DISCORD_BOT_API_SECRET)
   ▼
Next.js API /api/bot/* (Vercel, meta-peptides.com / metawellness.id)
   │  service role
   ▼
Supabase (leads, orders, payments, products, expenses)
```

Kenapa bot dipisah dari Vercel: bot harus tersambung terus ke Discord (gateway), sedangkan Vercel hanya menjalankan function sebentar. Jadi bot jalan di server yang selalu hidup (misalnya EC2 yang sama dengan worthy-bot), lalu memanggil API di Vercel.

Keamanan:
- Token Discord hanya ada di server bot, tidak pernah masuk Vercel atau git.
- Setiap request bot ditandatangani (HMAC-SHA256), kedaluwarsa 5 menit, dan terikat ke ID server, channel, user, dan pesan Discord. API menolak channel di luar daftar.
- Command direksi dicek dua kali: di bot dan di API.
- Pesan yang sama tidak bisa membuat data dobel (invoice, payment, lead, expense), walaupun bot retry.
- Bukti bayar disalin dari Discord ke bucket Supabase privat `payment-proofs`.

---

## Setup (ikuti urutannya)

### 1. Jalankan migration Supabase dulu

Jalankan file ini **berurutan** di Supabase (SQL Editor, atau `supabase db push`), **sebelum** deploy kode baru ke Vercel:

1. `supabase/migrations/20261031100000_add_discord_sales_crm_schema.sql`
2. `supabase/migrations/20261031100500_backfill_discord_sales_crm_data.sql`
3. `supabase/migrations/20261031101000_add_discord_sales_crm_functions.sql`
4. `supabase/migrations/20261101090000_add_order_type_to_discord_invoice.sql` (order Shopee/Tokopedia + marketplace fee di `!invoice`)
5. `supabase/migrations/20261103090000_allow_marketplace_invoice_without_lead.sql` (order Shopee/Tokopedia tanpa lead / tanpa nomor WA)

> ⚠️ Kalau kode di-deploy sebelum migration, halaman order di panel ikut error karena kolom baru (`invoice_number`, `is_paid`, dll.) belum ada. Khusus file nomor 4 dan 5: tanpa file ini `!invoice` WhatsApp tetap jalan, tapi `!invoice` Shopee/Tokopedia (nomor 4) atau Shopee/Tokopedia tanpa lead (nomor 5) ditolak dengan pesan untuk menjalankan migration.

Yang dibuat migration:
- Tabel `leads` (RLS aktif, tanpa akses publik) dan log request bot.
- Kolom baru: `orders.invoice_number / lead_id / is_paid / paid_at / tracking_number`, `order_items.usage_days_at_purchase`, `payments.is_paid / payment_amount / payment_date / proof_storage_path`, `expenses.is_reimburse / paid_by`, `products.product_type`.
- `products.product_type`: `mainproduct` (peptides, punya usage_life) atau `misc` (perintilan). Produk seperti bac water, syringe, swab, needle, pen set, vial case, acetic acid, dan service otomatis jadi `misc`; sisanya `mainproduct`. Ini **terpisah** dari `category` (tag kategori di website), yang tidak diubah.
- Function `create_discord_invoice`, `mark_discord_order_paid`, `record_discord_bot_request` (hanya bisa dipanggil server).
- Bucket privat `payment-proofs`.

**Setelah migration, isi usage_life produk peptide.** Reorder reminder hanya muncul untuk produk yang punya usage_life. Isi lewat panel (Products → Edit → Masa Pakai) atau lewat bot:

```text
!updateproduct reta 10 mg
usage_life: 8 minggu
```

Cek juga hasil pembagian misc/mainproduct dengan `!product <nama>`, dan koreksi kalau perlu dengan `type: misc` / `type: mainproduct`.

### 2. Buat bot dan ambil token (ini "API key" Discord)

1. Buka <https://discord.com/developers/applications> → **New Application** → beri nama (misalnya `Meta Wellness Bot`).
2. Menu **Bot** → klik **Reset Token** → copy token. Ini nilai `DISCORD_BOT_TOKEN`.
   Simpan baik-baik; kalau bocor, langsung Reset Token lagi.
3. Masih di menu **Bot**, bagian *Privileged Gateway Intents*: nyalakan **Message Content Intent** → Save. Tanpa ini bot tidak bisa membaca isi command.
4. Menu **OAuth2 → URL Generator**: centang scope `bot`, lalu permission:
   `View Channels`, `Send Messages`, `Read Message History`, `Attach Files`.
5. Buka URL yang dihasilkan → pilih server Discord Meta Wellness → Authorize.

Token **hanya** ditaruh di `discord-bot/.env` di server bot. Jangan dimasukkan ke Vercel, ke kode, atau ke variabel `NEXT_PUBLIC_*`.

### 3. Ambil ID server (guild) dan ID channel

1. Discord → **User Settings → Advanced** → nyalakan **Developer Mode**.
2. Klik kanan ikon server → **Copy Server ID** → ini `DISCORD_GUILD_ID`.
3. Klik kanan setiap channel bot → **Copy Channel ID**.
   - Semua channel tempat bot boleh dipakai → `DISCORD_ALLOWED_CHANNEL_IDS` (pisahkan dengan koma, tanpa spasi juga boleh).
   - Channel privat direksi → `DISCORD_DIRECTORS_CHANNEL_IDS`. Channel direksi otomatis ikut diizinkan.

Contoh susunan channel: `#sales-leads`, `#order-invoice`, `#gudang`, dan `#direksi` (privat). Bot diam saja di channel yang tidak terdaftar.

### 4. Isi environment variable di 2 tempat

| Variable | Vercel (website) | `discord-bot/.env` (server bot) |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | ❌ jangan | ✅ |
| `DISCORD_BOT_API_SECRET` | ✅ | ✅ **harus sama persis** |
| `DISCORD_GUILD_ID` | ✅ | ✅ |
| `DISCORD_ALLOWED_CHANNEL_IDS` | ✅ | ✅ |
| `DISCORD_DIRECTORS_CHANNEL_IDS` | ✅ | ✅ |
| `METAWELLNESS_API_BASE_URL` | - | ✅ `https://meta-peptides.com` (atau `https://metawellness.id`) |
| `INVOICE_BRAND_NAME` | - | opsional, default `MetaPeptides` |
| `INVOICE_PAYMENT_INFO` | - | opsional, info rekening di teks invoice (pakai `\n` untuk baris baru) |

Buat secret bersama sekali saja:

```bash
openssl rand -hex 32
```

**Vercel:** Project → Settings → Environment Variables → tambahkan 4 variable di atas (Production + Preview) → **Redeploy**. Perubahan env baru berlaku setelah redeploy.

**Lokal (untuk development website):** tambahkan 4 variable yang sama ke `.env.local` di root project.

**Server bot:** salin `discord-bot/env.example` menjadi `discord-bot/.env` lalu isi.

### 5. Jalankan bot

Lokal:

```bash
cd discord-bot
npm install
cp env.example .env
npm start
```

Atau dari root project: `pnpm bot:install` lalu `pnpm bot:start` (`pnpm bot:dev` untuk auto-restart saat file berubah).

Server (misalnya EC2 yang sama dengan worthy-bot), pakai pm2 supaya bot hidup terus:

```bash
git clone <repo> && cd meta-peptides-web/discord-bot
npm ci
cp env.example .env   # lalu isi
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup           # ikuti perintah yang muncul supaya bot nyala lagi setelah reboot
```

Update bot: `git pull && cd discord-bot && npm ci && pm2 restart metawellness-discord-bot`. Lihat log: `pm2 logs metawellness-discord-bot`.

Atau dengan Docker (dari root repo):

```bash
docker build -t meta-wellness-bot discord-bot
docker run -d --restart unless-stopped --env-file discord-bot/.env meta-wellness-bot
```

Butuh Node.js 22.9 atau lebih baru. Kalau berhasil, log menampilkan `[bot] Online sebagai ...`. Coba ketik `!help` di channel yang terdaftar.

### 6. Kalau ada masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| Bot diam saja | Channel belum ada di `DISCORD_ALLOWED_CHANNEL_IDS`, Message Content Intent belum nyala, atau bot tidak punya izin melihat channel. |
| `Request bot tidak valid (unauthorized)` | `DISCORD_BOT_API_SECRET` di Vercel dan di bot berbeda, atau jam server bot meleset lebih dari 5 menit. |
| `Channel ini tidak diizinkan memakai bot` | Channel ada di env bot tapi belum di env Vercel (jangan lupa redeploy). |
| `Bot API belum dikonfigurasi di server` | Env Discord belum diisi di Vercel atau belum redeploy. |
| `Bot API sedang tidak tersedia` | Migration Supabase belum dijalankan. |
| `Gagal menyimpan bukti pembayaran` | Bucket `payment-proofs` belum ada (migration 1 belum jalan). |
| Login Discord gagal saat start | `DISCORD_BOT_TOKEN` salah/di-reset, atau Message Content Intent mati. |

---

## Onboarding tim: cara pakai command

### Aturan umum (berlaku untuk semua command)

1. Baris pertama: nama command, lalu (kalau ada) nomor WA / nomor invoice / nama produk / tanggal.
2. Data lain ditulis di baris baru dengan format `field: isi`, satu field per baris. Urutan bebas.
3. Field **wajib** harus diisi; field opsional boleh tidak ditulis sama sekali. Field yang salah ketik (misal `stat:`) ditolak supaya tidak diam-diam terlewat.
4. Tanggal selalu `YYYY-MM-DD` (contoh `2026-10-31`). Untuk command dengan rentang tanggal: tanpa tanggal = hari ini (WIB), satu tanggal = hari itu saja, dua tanggal = rentang. Rentang boleh ditulis `2026-10-01 2026-10-31`, `2026-10-01 - 2026-10-31`, atau `2026-10-01 sampai 2026-10-31`.
5. Nominal boleh `1750000`, `1.750.000`, `1,75jt`, `350rb`, atau `25k`.
6. Nomor WA boleh `0812...`, `62812...`, atau `+62 812...` (disimpan sebagai `62812...`).
7. Nama produk boleh singkat: `reta 10 mg` → Retatrutide 10mg, `nad 1000` → NAD+ 1000mg. Kalau ambigu (misal `reta` saja), bot menampilkan pilihan dan tidak menebak. Cek dulu dengan `!product <nama>` kalau ragu.
8. `!help` menampilkan daftar command, `!help <command>` menampilkan format yang bisa langsung di-copy.

### Alur kerja harian

| Kapan | Command |
| --- | --- |
| Ada chat WA baru | `!newleads` |
| Tambah notes/domicile/goal, atau status/alasan berubah | `!updateleads <wa>` |
| Tiap pagi | `!followup` (H+1/H+3/H+7), `!aftersales` (H+1/H+7/H+14), `!reorder`, `!reorderlast` |
| Customer setuju beli (closing) | `!invoice` → forward PDF + teks invoice ke customer |
| Ada order masuk di Shopee/Tokopedia | `!invoice` dengan `order_type: shopee` / `tokopedia`. Pembeli bukan lead: ganti baris `lead` dengan `name: <nama pembeli>` |
| Customer kirim bukti bayar | `!payment <invoice>` + upload foto bukti → packing slip untuk gudang |
| Gudang sudah kirim | `!updateshipping <invoice>` → forward teks resi ke customer |
| Sore / akhir hari | `!dailyreport` |
| Harga, usage_life, atau tipe produk berubah | `!updateproduct <produk>` |
| Direksi | `!addexpense`, `!reimbursement` |
| Bantuan | `!lead <wa>`, `!product <nama>`, `!getinvoice <invoice>`, `!help` |
| Lihat semua lead, filter, atau koreksi data | Panel admin → menu **Leads** (`/panel-xyz123/leads`) |

Teks untuk customer (invoice dan info resi) dikirim sebagai pesan terpisah tanpa format Discord, jadi bisa langsung **Copy Text** lalu paste ke WhatsApp (`*tebal*` mengikuti format WhatsApp).

### Detail tiap command

Bagian ini sama dengan isi `!help <command>` di Discord.

<!-- COMMANDS:START (generated by `npm run docs`, do not edit by hand) -->

### `!newleads`

Tambah lead baru dari chat WhatsApp.

```text
!newleads
wa: 081234567890
name: Budi Santoso
origin: ads
status: hot
interest: reta 10 mg
rejection: -
```

| Field | Wajib | Isi |
| --- | --- | --- |
| `wa` | **ya** | Nomor WhatsApp. Boleh 08xx, 62xx, atau +62 xxx |
| `name` | **ya** | Nama lead |
| `origin` | **ya** | ads / tokopedia / instagram / threads / tiktok / fnf / shopee / website |
| `status` | **ya** | hot / warm / cold / skip |
| `interest` | - | Produk yang diminati, boleh singkat: `reta 10 mg` → Retatrutide 10mg. `-` untuk kosong |
| `rejection` | - | Alasan belum beli: harga / company / cara_penggunaan / perizinan / produk_tidak_ada / ghosting / - (kosong) |
| `chat_date` | - | Tanggal mulai chat (YYYY-MM-DD). Boleh tidak ditulis: otomatis tanggal hari ini (WIB). Dasar hitungan !followup |

- chat_date boleh tidak ditulis: otomatis tanggal hari ini (WIB). Tulis `chat_date: YYYY-MM-DD` kalau lead sebenarnya mulai chat di hari lain.
- is_customer otomatis false (jadi true setelah !invoice).
- domicile, goal, dan notes diisi lewat !updateleads setelah lead dibuat.
- Satu nomor WA = satu lead. Kalau nomor sudah ada, pakai !updateleads.
- Kalau interest cocok ke beberapa produk (misal `reta`), tetap disimpan sebagai teks dan bot menampilkan pilihannya.

### `!updateleads`

Ubah data lead, termasuk domicile, goal, dan notes (tulis hanya field yang berubah).

Setelah nama command: nomor WA lead (atau ID lead).

```text
!updateleads 081234567890
status: warm
rejection: harga
domicile: Tangerang
goal: turun berat badan 10 kg
notes: Tanya dosis, minta dikabari pas gajian
```

| Field | Wajib | Isi |
| --- | --- | --- |
| `name` | - | Nama lead |
| `origin` | - | ads / tokopedia / instagram / threads / tiktok / fnf / shopee / website |
| `status` | - | hot / warm / cold / skip |
| `interest` | - | Produk yang diminati, boleh singkat: `reta 10 mg` → Retatrutide 10mg. `-` untuk kosong |
| `rejection` | - | Alasan belum beli: harga / company / cara_penggunaan / perizinan / produk_tidak_ada / ghosting / - (kosong) |
| `chat_date` | - | Koreksi tanggal mulai chat (YYYY-MM-DD). Mengubah jadwal !followup |
| `domicile` | - | Kota domisili |
| `goal` | - | Tujuan pemakaian / keluhan |
| `notes` | - | Catatan bebas, boleh lebih dari satu baris |
| `is_customer` | - | true / false. Otomatis true setelah !invoice. Isi true kalau customer beli di luar !invoice supaya tidak muncul di !followup |
| `wa` | - | Ganti nomor WhatsApp lead |

- Minimal satu field. Field lain tidak berubah.
- `rejection: -`, `interest: -`, atau `notes: -` untuk mengosongkan.

### `!lead`

Lihat data lead + 5 invoice terakhir.

Setelah nama command: nomor WA lead (atau ID lead).

```text
!lead 081234567890
```

### `!followup`

Lead yang perlu di-follow up H+1, H+3, H+7 dari chat_date.

Setelah nama command: `<dari> <sampai>` format YYYY-MM-DD (boleh pakai `-` atau `sampai` di tengah). Satu tanggal = hari itu saja, kosong = hari ini.

```text
!followup 2026-11-01 2026-11-07
```

- Lead yang sudah is_customer = true (sudah beli) tidak muncul.
- Urutan: hot → warm → cold → skip. Nomor WA bisa diklik langsung.

### `!invoice`

Closing: buat order + invoice PDF, potong stok, lead jadi customer.

```text
!invoice
lead: 081234567890
address: Metland Puri Blok F5 No 21
city: Kota Tangerang, Banten
zip: 15147
item: 2 | reta 10 mg
item: 1 | nad 1000
order_type: whatsapp
discount: 0
payment_type: Bank Transfer
notes: Kirim sebelum jam 3
```

| Field | Wajib | Isi |
| --- | --- | --- |
| `lead` | ya, untuk order whatsapp | Nomor WA lead (harus sudah dibuat dengan !newleads). Order shopee/tokopedia boleh tanpa lead: hapus baris ini dan isi `name` |
| `name` | ya, untuk order shopee/tokopedia tanpa lead | Nama pembeli dari pesanan Shopee/Tokopedia. Hanya dipakai kalau tidak ada lead (nama lead dipakai kalau ada `lead`) |
| `address` | **ya** | Alamat lengkap pengiriman |
| `city` | **ya** | Kota/kabupaten, provinsi |
| `zip` | - | Kode pos |
| `item` | **ya** | `qty \| produk` atau `qty \| produk \| harga custom`. Satu baris per produk, boleh banyak baris. Nama produk boleh singkat |
| `order_type` | - | `whatsapp` / `shopee` / `tokopedia` (sama dengan Order Source di panel). Default whatsapp |
| `marketplace_fee` | - | Khusus shopee/tokopedia: total fee/potongan dari platform (angka). Mengurangi total order, sama seperti di panel. Default 0 |
| `marketplace_order_no` | - | Khusus shopee/tokopedia: nomor pesanan dari Shopee/Tokopedia (opsional). Bisa dipakai untuk cari invoice, dan order dengan nomor yang sama ditolak supaya tidak dobel |
| `discount` | - | Khusus whatsapp: potongan dalam rupiah (angka). Default 0 |
| `payment_type` | - | Khusus whatsapp: Bank Transfer / QRIS. Default Bank Transfer. Order shopee/tokopedia otomatis Shopee/Tokopedia |
| `notes` | - | Catatan internal (tidak tampil di invoice) |

- Harga diambil dari harga produk saat ini, kecuali diisi harga custom. Harga 0 = gratis/bonus.
- Order Shopee/Tokopedia: ganti jadi `order_type: shopee` (atau `tokopedia`), tambah `marketplace_fee` (dan `marketplace_order_no` kalau ada), lalu hapus baris `discount` dan `payment_type`. Total = subtotal - marketplace_fee.
- Pembeli Shopee/Tokopedia yang bukan lead (nomor WA-nya tidak ada): hapus baris `lead`, tulis `name: <nama pembeli>`. Order tetap tercatat dan stok dipotong, tapi tidak membuat customer dan tidak masuk !aftersales / !reorder.
- Order Shopee/Tokopedia tidak dapat teks invoice WhatsApp, karena customer bayar dan dapat invoice dari marketplace. PDF tetap dikirim.
- Usage life tiap produk dicatat per item untuk reorder reminder (bisa beda-beda per produk).
- Output: PDF invoice (sama dengan panel) + teks invoice siap di-forward ke customer.

### `!payment`

Catat pembayaran (wajib upload foto bukti bayar) + kirim packing slip.

Setelah nama command: nomor invoice, contoh MW-20261031-01001.

```text
!payment MW-20261031-01001
amount: 5450000
payment_type: QRIS
payment_date: 2026-10-31
```

| Field | Wajib | Isi |
| --- | --- | --- |
| `amount` | **ya** | Nominal yang dibayar customer |
| `payment_type` | **ya** | Bank Transfer / QRIS / Shopee / Tokopedia |
| `payment_date` | - | Tanggal bayar YYYY-MM-DD. Kosong = hari ini |

- Upload 1 gambar bukti bayar (JPG/PNG/WebP, maks 5 MB) di pesan yang sama dengan command. Tanpa gambar, command ditolak.
- Invoice yang sudah lunas atau dibatalkan tidak bisa dibayar lagi.
- Bot memberi peringatan kalau nominal beda dengan total invoice.

### `!updateshipping`

Isi kurir, ongkir, dan nomor resi setelah barang dikirim.

Setelah nama command: nomor invoice.

```text
!updateshipping MW-20261031-01001
shipment_type: JNE REG
shipping_fee: 25000
tracking_number: JP1234567890
```

| Field | Wajib | Isi |
| --- | --- | --- |
| `shipment_type` | **ya** | Kurir + layanan |
| `shipping_fee` | - | Ongkir yang kita bayar (angka). Wajib untuk order WhatsApp: dicatat sebagai expense, tidak menambah total invoice. Order Shopee/Tokopedia boleh dikosongkan (ongkir diurus marketplace) |
| `tracking_number` | **ya** | Nomor resi |

- Bot juga mengirim teks info resi siap di-forward ke customer, kecuali order tanpa nomor WA (pembeli Shopee/Tokopedia yang bukan lead).

### `!getinvoice`

Kirim ulang PDF + teks invoice.

Setelah nama command: nomor invoice.

```text
!getinvoice MW-20261031-01001
```

### `!aftersales`

Customer yang perlu dicek H+1, H+7, H+14 dari tanggal pembelian.

Setelah nama command: `<dari> <sampai>` format YYYY-MM-DD (boleh pakai `-` atau `sampai` di tengah). Satu tanggal = hari itu saja, kosong = hari ini.

```text
!aftersales 2026-11-01 2026-11-07
```

- Hanya order yang sudah lunas. Order Shopee/Tokopedia tidak ikut.
- Menampilkan sifat lead (status, origin, rejection, notes) dan produk yang dibeli.

### `!reorder`

Reminder reorder: tanggal order + usage_life tiap produk.

Setelah nama command: `<dari> <sampai>` format YYYY-MM-DD (boleh pakai `-` atau `sampai` di tengah). Satu tanggal = hari itu saja, kosong = hari ini.

```text
!reorder 2026-11-01 2026-11-07
```

- Dihitung per produk: beli Reta (8 minggu) + NAD (2 minggu) = dua reminder di tanggal berbeda.
- Produk misc (perintilan) dan produk tanpa usage_life tidak muncul.
- Otomatis dilewati kalau customer sudah beli produk yang sama lagi.

### `!reorderlast`

Reminder reorder kedua: 3 hari setelah !reorder.

Setelah nama command: `<dari> <sampai>` format YYYY-MM-DD (boleh pakai `-` atau `sampai` di tengah). Satu tanggal = hari itu saja, kosong = hari ini.

```text
!reorderlast 2026-11-01 2026-11-07
```

- Aturan sama dengan !reorder, tapi due date = tanggal order + usage_life + 3 hari.

### `!dailyreport`

Jumlah lead baru per hari, per origin, dan per status.

Setelah nama command: tanggal YYYY-MM-DD, kosong = hari ini.

```text
!dailyreport 2026-10-31
```

- Lead dihitung berdasarkan chat_date.

### `!updateproduct`

Ubah harga, usage_life, atau tipe produk.

Setelah nama command: nama produk, boleh singkat (contoh: reta 10 mg).

```text
!updateproduct reta 10 mg
price: 1750000
usage_life: 8 minggu
type: mainproduct
```

| Field | Wajib | Isi |
| --- | --- | --- |
| `price` | - | Harga jual baru (angka) |
| `usage_life` | - | Masa pakai: `56 hari`, `8 minggu`, `8 weeks`, atau `2 bulan` |
| `type` | - | mainproduct (peptides) / misc (perintilan, tanpa usage_life) |

- Isi minimal satu field.
- price langsung mengubah harga jual di website dan harga default di !invoice. Untuk harga khusus satu customer, jangan ubah di sini: tulis harganya di baris item !invoice (contoh `item: 2 | reta 10 mg | 1700000`).
- type: misc otomatis membuat usage_life = 0.
- Kategori storefront (tag di website) tidak berubah.

### `!addexpense` 🔒 direksi

Tambah expense (sama seperti form expense di panel).

```text
!addexpense
title: Beli thermal label
amount: 350000
paid_by: rudi
is_reimburse: true
category: Packaging
expense_date: 2026-10-31
vendor: Toko ABC
payment_method: Transfer
notes: 10 roll
```

| Field | Wajib | Isi |
| --- | --- | --- |
| `title` | **ya** | Nama pengeluaran |
| `amount` | **ya** | Nominal (angka) |
| `paid_by` | **ya** | kas / rudi / rp |
| `is_reimburse` | **ya** | true kalau perlu diganti ke yang bayar (muncul di !reimbursement) |
| `category` | - | Kategori. Default Operations |
| `expense_date` | - | Tanggal YYYY-MM-DD. Kosong = hari ini |
| `vendor` | - | Toko / vendor |
| `payment_method` | - | Cara bayar |
| `notes` | - | Catatan |

- paid_by kas tidak bisa is_reimburse true (uang kas tidak perlu diganti).

### `!reimbursement` 🔒 direksi

Daftar expense yang perlu di-reimburse + total per orang.

Setelah nama command: `<dari> <sampai>` format YYYY-MM-DD (boleh pakai `-` atau `sampai` di tengah). Satu tanggal = hari itu saja, kosong = hari ini.

```text
!reimbursement 2026-10-01 2026-10-31
```

### `!product`

Cek produk: hasil pencocokan nama, harga, stok, usage_life, tipe.

Setelah nama command: nama produk, boleh singkat.

```text
!product reta 10
```

<!-- COMMANDS:END -->

---

## Untuk developer

- Kode bot: `index.mjs` (koneksi Discord), `commands.mjs` (definisi field + handler semua command; juga sumber teks `!help`), `parser.mjs`, `format.mjs`, `api-client.mjs` (signature request).
- API: `app/api/bot/*`, helper di `lib/discord-bot-*.ts`. Signature harus identik antara `discord-bot/api-client.mjs` dan `lib/discord-bot-signature.ts`.
- Test bot: `npm test` di folder `discord-bot` (atau `pnpm bot:test` dari root).
- Menambah command: tambahkan entri di `COMMAND_SPECS` (`commands.mjs`) beserta field dan handler-nya, lalu route API di `app/api/bot/`.
- Setelah mengubah field/teks command, jalankan `npm run docs` untuk memperbarui referensi command di README ini (test akan gagal kalau README tertinggal).
