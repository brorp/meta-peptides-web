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
6. `supabase/migrations/20261103100000_mark_leads_customer_from_paid_orders.sql` (lead otomatis jadi customer begitu ada order lunas dengan nomor WA yang sama, dari `!invoice`, panel, atau website, jadi tidak muncul lagi di `!followup`)
7. `supabase/migrations/20261104090000_auto_paid_marketplace_invoices.sql` (`!invoice` Shopee/Tokopedia langsung lunas, ongkir 0, resi `-`: tidak perlu `!payment` dan `!updateshipping`)
8. `supabase/migrations/20261104100000_add_existing_lead_origin.sql` (origin lead baru `existing` untuk customer lama dari sebelum ada bot, dipakai saat `!invoice` membuat lead otomatis)
9. `supabase/migrations/20261104110000_allow_hidden_products_in_orders.sql` (produk yang di-Hide di panel tetap bisa di-`!invoice`: Hide hanya menyembunyikan dari /shop. Sebelum migration ini dijalankan, `!invoice` dengan produk Hidden ditolak dengan pesan untuk menjalankannya)
10. `supabase/migrations/20261111090000_add_whatsapp_listener.sql` (WhatsApp listener: chat WA dari nomor baru otomatis jadi lead, daftar abaikan untuk `!ignorewa`. Hanya perlu kalau listener dipakai, lihat bagian 7)
11. `supabase/migrations/20261111100000_add_whatsapp_contact_to_leads.sql` (lead otomatis jadi kontak di akun WhatsApp CS. Hanya perlu kalau WhatsApp listener dipakai, lihat bagian 8)
12. `supabase/migrations/20261111110000_add_lead_chat_analysis.sql` (analisa chat AI: usulan status/minat/alasan, `!analyze`, `!applyai`, dan aturan ghosting. Butuh nomor 10, lihat bagian 9)
13. `supabase/migrations/20261114090000_whatsapp_leads_origin_ads.sql` (lead dari chat WA yang dulu dibuat dengan origin `unknown` jadi `ads`, sama seperti lead WA baru. Tidak membuat apa pun error kalau belum dijalankan)

> ⚠️ Kalau kode di-deploy sebelum migration, halaman order di panel ikut error karena kolom baru (`invoice_number`, `is_paid`, dll.) belum ada. Khusus file nomor 4 dan 5: tanpa file ini `!invoice` WhatsApp tetap jalan, tapi `!invoice` Shopee/Tokopedia (nomor 4) atau Shopee/Tokopedia tanpa lead (nomor 5) ditolak dengan pesan untuk menjalankan migration. File nomor 6 tidak membuat apa pun error kalau belum dijalankan: lead yang beli lewat panel/website saja yang masih muncul di `!followup`. Begitu dijalankan, lead lama yang sudah punya order lunas langsung ikut diubah jadi customer. File nomor 7 juga tidak membuat error kalau belum dijalankan: `!invoice` Shopee/Tokopedia masih tercatat belum lunas dan bot menampilkan peringatan untuk menjalankan migration. Order Shopee/Tokopedia lama dari `!invoice` ikut diubah jadi lunas (resi asli yang sudah dicatat tidak diganti). File nomor 8 juga tidak membuat error kalau belum dijalankan: customer lama yang order pertamanya lewat Shopee/Tokopedia/website tetap otomatis dibuatkan lead, tapi yang order pertamanya order WhatsApp di panel ditolak dengan pesan untuk menjalankan migration (atau buat dulu dengan `!newleads`). File nomor 9 juga tidak membuat error kalau belum dijalankan: `!invoice` dengan produk Hidden saja yang ditolak dengan pesan untuk menjalankannya. Order panel dengan produk Hidden sudah bisa tanpa migration ini.

Yang dibuat migration:
- Tabel `leads` (RLS aktif, tanpa akses publik) dan log request bot.
- Kolom baru: `orders.invoice_number / lead_id / is_paid / paid_at / tracking_number`, `order_items.usage_days_at_purchase`, `payments.is_paid / payment_amount / payment_date / proof_storage_path`, `expenses.is_reimburse / paid_by`, `products.product_type`.
- `products.product_type`: `mainproduct` (peptides, punya usage_life) atau `misc` (perintilan). Produk seperti bac water, syringe, swab, needle, pen set, vial case, acetic acid, dan service otomatis jadi `misc`; sisanya `mainproduct`. Ini **terpisah** dari `category` (tag kategori di website), yang tidak diubah.
- Function `create_discord_invoice`, `mark_discord_order_paid`, `record_discord_bot_request` (hanya bisa dipanggil server).
- Trigger yang menandai lead sebagai customer (`is_customer = true`) begitu order dengan nomor WA yang sama lunas: order dari panel, website, atau `!invoice` setelah `!payment`. Lead baru yang nomornya sudah pernah punya order lunas juga langsung jadi customer. Lead tidak pernah dikembalikan ke prospek otomatis (misal order dibatalkan): ubah manual dengan `!updateleads <wa>` + `is_customer: false`.
- Order Shopee/Tokopedia dari `!invoice` disimpan langsung lunas (payment `success` dengan nominal = total bersih setelah fee), tanpa kurir, ongkir 0, dan resi `-`.
- Origin lead `existing` (customer lama dari sebelum ada bot). Tidak ada lead lama yang diubah.
- `create_discord_invoice` menerima produk yang Hidden (tidak tampil di /shop). Baris packaging/supply tetap ditolak.
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
   - (Opsional, kalau pakai WhatsApp listener) channel privat `#whatsapp-settings` → `DISCORD_WA_SETTINGS_CHANNEL_IDS`. Hanya di sini `!walogin`, `!wastatus`, `!walogout`, `!warestart`, dan `!warun` bisa dipakai. Channel ini otomatis ikut diizinkan di bot.

Contoh susunan channel: `#sales-leads`, `#order-invoice`, `#gudang`, dan `#direksi` (privat). Bot diam saja di channel yang tidak terdaftar.

### 4. Isi environment variable di 2 tempat

| Variable | Vercel (website) | `discord-bot/.env` (server bot) |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | ❌ jangan | ✅ |
| `DISCORD_BOT_API_SECRET` | ✅ | ✅ **harus sama persis** |
| `DISCORD_GUILD_ID` | ✅ | ✅ |
| `DISCORD_ALLOWED_CHANNEL_IDS` | ✅ | ✅ |
| `DISCORD_DIRECTORS_CHANNEL_IDS` | ✅ | ✅ |
| `DISCORD_WA_SETTINGS_CHANNEL_IDS` | - (tambahkan ID-nya ke `DISCORD_ALLOWED_CHANNEL_IDS` di Vercel hanya kalau `!ignorewa` / `!waignored` juga mau dipakai di channel itu) | opsional, channel `#whatsapp-settings` |
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

Untuk VPS Ubuntu production, gunakan unit systemd yang ikut di repo supaya
systemd memonitor `pm2-runtime` secara langsung:

```bash
sudo install -m 0644 metawellness-discord-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now metawellness-discord-bot
```

Update VPS systemd: `git pull && cd discord-bot && npm ci && sudo systemctl restart metawellness-discord-bot`. Lihat log: `journalctl -u metawellness-discord-bot -f`.

Kalau memakai PM2 tanpa unit systemd: `pm2 restart metawellness-discord-bot`. Lihat log: `pm2 logs metawellness-discord-bot`.

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
| `!walogin` dll: `WhatsApp listener tidak jalan di VPS ini` | Listener belum jalan, belum di-update, atau tidak ada di `../whatsapp-listener` di VPS yang sama. Cek `sudo systemctl status metawellness-wa-listener`. |
| `!walogin` dll: `hanya bisa dipakai di channel whatsapp-settings` | Isi `DISCORD_WA_SETTINGS_CHANNEL_IDS` di `discord-bot/.env`, lalu restart bot. |
| `!analyze`: `freellmapi tidak bisa dihubungi dari Vercel` | Container router mati (`cd ~/freellmapi && docker compose ps`), Caddy/HTTPS belum jalan, port 443 tertutup, atau `FREELLMAPI_BASE_URL` salah. |
| `!analyze`: `FREELLMAPI_API_KEY ditolak router` | Unified key di Vercel tidak sama dengan yang di dashboard freellmapi (atau sudah di-reset). |
| `Kuota gratis semua provider di freellmapi habis` | Tambahkan key provider lain di dashboard freellmapi, atau tunggu kuotanya pulih. |


### 7. (Opsional) WhatsApp listener: lead otomatis dari chat WA

Proses terpisah di VPS (`whatsapp-listener/`) yang membaca nomor WhatsApp CS sebagai linked device, tanpa pernah mengirim pesan (satu-satunya yang ia tulis ke WhatsApp adalah kontak lead, bagian 8). Chat dari nomor baru langsung jadi lead dan kartunya muncul di Discord, jadi CS tidak perlu `!newleads` untuk chat itu. Setup, scan QR, dan perawatan: [whatsapp-listener/README.md](../whatsapp-listener/README.md).

Listener diatur dari channel privat `#whatsapp-settings` (`DISCORD_WA_SETTINGS_CHANNEL_IDS`): `!walogin` menampilkan QR login (atau `!walogin <wa>` untuk kode pairing), `!wastatus` menampilkan status, `!walogout ya` melepas linked device, `!warestart` menyambung ulang, dan `!warun analisa` / `!warun harian` menjalankan jadwal sekarang. Bot dan listener harus jalan di VPS yang sama dengan user yang sama: keduanya bicara lewat file socket lokal `whatsapp-listener/control.sock`, tanpa port terbuka.

### 8. (Opsional) Kontak WhatsApp: nama lead muncul di WhatsApp CS

WhatsApp listener (bagian 7) menyimpan setiap lead sebagai **kontak di akun WhatsApp CS**, misalnya `Budi • Lead Ads 06/11`, sama seperti "Kontak baru" di WhatsApp Web. Jadi WhatsApp menampilkan nama lead, bukan nomor, di HP dan semua linked device. Kontak tersimpan di akun WhatsApp saja, tidak masuk kontak iPhone (`saveOnPrimaryAddressbook: false`). Tidak perlu Google atau setup di iPhone.

- Lead baru (dari chat WA, `!newleads`, `!invoice` customer lama, atau panel) dalam 14 hari terakhir disimpan otomatis. Listener mengecek tiap 2 menit; lead dari chat WA disimpan beberapa detik setelah chat pertamanya.
- Kalau `!updateleads` atau panel mengubah nama, nomor, origin, atau tanggal chat, kontaknya ikut berubah. Nomor yang berubah: kontak lama dihapus, kontak baru dibuat.
- Lead lama (sebelum fitur ini): `!synccontacts`, 30 lead per sekali jalan. Satu lead: `!synccontacts <wa>`.
- Penyimpanan diberi jeda sekitar 3 detik per kontak supaya tidak terlihat seperti spam.

Setup: jalankan migration nomor 11, lalu update dan restart WhatsApp listener. Sudah aktif tanpa env tambahan. Untuk mematikan: `WA_SAVE_CONTACTS=0` di `whatsapp-listener/.env`, lalu restart listener.

Catatan:

- Ini satu-satunya hal yang ditulis listener ke WhatsApp (tetap tidak pernah mengirim pesan). Seperti semua fitur Baileys, ini tidak resmi: risikonya kecil, tapi coba dulu dengan nomor cadangan.
- Lead berstatus `skip` tidak dibuatkan kontak. Kontak yang Anda hapus di HP tidak dibuat ulang otomatis, kecuali data lead-nya berubah atau Anda jalankan `!synccontacts <wa>`.
- Gagal menyimpan kontak tidak pernah menggagalkan lead. Lead yang gagal dicoba lagi setelah 1 jam. Status dan error terakhir terlihat di `!wastatus`.
- Tepat setelah login pertama, WhatsApp butuh sebentar untuk membagikan kunci sinkronisasi. Kontak yang belum bisa disimpan dicoba lagi otomatis.

### 9. (Opsional) Analisa chat AI: status, minat, dan alasan dari chat WA

Butuh WhatsApp listener (bagian 7): hanya chat yang tersimpan sejak listener jalan yang bisa dibaca. Setiap hari jam **12.00 dan 23.00 WIB** AI (Claude, atau model gratis lewat freellmapi) membaca chat lead yang belum jadi customer dan punya chat baru, lalu mengusulkan:

- **status**: hot (ada sinyal beli: tanya harga final, cara order, minta rekening, kirim alamat, tanya ongkir), warm (tertarik tapi belum ada sinyal beli), cold (menunda/respon pendek), skip (bukan calon pembeli);
- **minat** (produk dari katalog), **alasan belum beli** (harga, company, cara_penggunaan, perizinan, produk_tidak_ada), **goal**, dan **domisili**;
- ringkasan singkat dan kutipan chat sebagai alasan.

Hasilnya muncul sebagai satu ringkasan di channel WhatsApp Leads. **Lead belum berubah** sampai CS menjalankan `!applyai <wa>` (goal dan domisili hanya diisi kalau masih kosong). `!analyze <wa>` menganalisa satu lead sekarang juga.

**Aturan ghosting** (tanpa AI, jalan di jadwal yang sama): customer tidak membalas lebih dari 3 hari setelah pesan terakhir CS → status cold + rejection ghosting, langsung diterapkan dan ikut dilaporkan di ringkasan. Lead yang diubah CS sendiri setelah pesan terakhirnya tidak disentuh. Kalau customer membalas lagi, analisa berikutnya akan mengusulkan status baru dan menghapus ghosting.

Setup:

1. Jalankan migration nomor 12.
2. <https://console.anthropic.com> → API Keys → buat key → Vercel: `ANTHROPIC_API_KEY` → redeploy.
3. Opsional di Vercel:
   - `LEAD_ANALYSIS_MODEL` (default `claude-opus-5-5`). `claude-haiku-5-5` jauh lebih murah; bandingkan hasilnya dulu di beberapa chat dengan `!analyze`.
   - `LEAD_ANALYSIS_EFFORT`: `low` (default), `medium`, atau `high`.
   - `LEAD_ANALYSIS_AUTO_APPLY=status`: setelah masa usulan (misalnya 2 minggu) dan hasilnya cocok dengan penilaian CS, status dan alasan dengan tingkat "yakin" diterapkan otomatis, kecuali lead yang diubah CS sendiri sejak analisa sebelumnya. Minat, goal, dan domisili tetap lewat `!applyai`.

**Opsi gratis: freellmapi** ([github.com/tashfeenahmed/freellmapi](https://github.com/tashfeenahmed/freellmapi)). Router yang Anda jalankan sendiri di VPS. Ia menggabungkan kuota gratis Gemini, Groq, Cerebras, dan lain-lain. Kalau `FREELLMAPI_BASE_URL` diisi, **semua** analisa lewat router ini, walaupun `ANTHROPIC_API_KEY` juga ada. Kalau env router salah, analisa berhenti dengan pesan error; ia tidak pindah diam-diam ke Claude.

1. Di VPS (butuh Docker):
   ```bash
   git clone https://github.com/tashfeenahmed/freellmapi.git ~/freellmapi
   cd ~/freellmapi
   printf "ENCRYPTION_KEY=%s\nPORT=3001\n" "$(openssl rand -hex 32)" > .env
   docker compose up -d
   ```
   Router hanya terbuka di `127.0.0.1:3001`. Simpan `~/freellmapi/.env`: tanpa `ENCRYPTION_KEY` yang sama, key provider yang tersimpan tidak bisa dibuka lagi. Update: `cd ~/freellmapi && git pull && docker compose pull && docker compose up -d`.
2. Dashboard, dari laptop lewat SSH tunnel: `ssh -L 3001:127.0.0.1:3001 ubuntu@<ip-vps>`, lalu buka <http://localhost:3001>.
   - Buat akun admin.
   - Di halaman **Keys**, tambahkan key gratis tiap provider (misalnya Google AI Studio, Groq, Cerebras).
   - Salin **unified key** di bagian atas halaman Keys.
3. HTTPS untuk Vercel. Analisa jalan di Vercel, jadi router harus bisa dipanggil lewat internet, dan wajib HTTPS (URL `http://` ditolak).
   - Buat DNS record `A` `llm.<domain-anda>` → IP VPS.
   - Pasang Caddy (<https://caddyserver.com/docs/install>, bagian Debian/Ubuntu).
   - Isi `/etc/caddy/Caddyfile`:
     ```
     llm.domainanda.com {
         handle /v1/messages {
             reverse_proxy 127.0.0.1:3001
         }
         handle {
             respond 404
         }
     }
     ```
   - Jalankan `sudo systemctl reload caddy`, lalu buka port 80 dan 443 di firewall VPS.

   Hanya `/v1/messages` yang terbuka ke internet; dashboard tetap lewat SSH tunnel.
4. Vercel: isi `FREELLMAPI_BASE_URL=https://llm.domainanda.com` dan `FREELLMAPI_API_KEY=<unified key>`, lalu redeploy.

   Opsional `FREELLMAPI_MODEL`: default `auto:smart`, bisa `auto:fast` atau id model tertentu dari dashboard. `LEAD_ANALYSIS_MODEL` dan `LEAD_ANALYSIS_EFFORT` hanya berlaku untuk Claude.
5. Tes dengan `!analyze <wa>`. Model yang menjawab disimpan di kolom `model` tabel `lead_ai_suggestions`, misalnya `freellmapi:groq/llama-3.3-70b-versatile`.

Bedanya dengan Claude:
- Model gratis tidak dipaksa menjawab dalam format JSON. Jawaban yang meleset sedikit tetap dibaca, tapi sesekali lead gagal ("Jawaban AI bukan JSON") lalu dicoba lagi di jadwal berikutnya.
- Kualitasnya berubah-ubah, tergantung model mana yang kuotanya masih ada.
- Kalau kuota gratis semua provider habis, analisa berhenti sampai jadwal berikutnya. Aturan ghosting tetap jalan.

Catatan:

- **Biaya:** tiap ringkasan mencantumkan jumlah token. Perkiraan untuk Opus 5.5 ($4 per 1 juta token masuk, $20 per 1 juta token keluar): satu analisa sekitar 3–6 ribu token masuk dan beberapa ratus token keluar, kira-kira Rp500–1.000. 100 analisa per hari sekitar Rp1,5–3 juta per bulan. Dengan Haiku 5.5 kira-kira 40x lebih murah. Chat yang tidak ada pesan baru tidak dikirim ulang. Angka pastinya terlihat dari baris "Token" di ringkasan dan di console.anthropic.com.
- **Privasi:** isi chat lead dikirim ke Claude API (Anthropic) untuk dianalisa. Anthropic tidak memakai data API untuk melatih model secara default. Dengan freellmapi, chat dikirim ke provider gratis yang Anda aktifkan; sebagian kuota gratis (misalnya Google AI Studio) boleh memakai data untuk melatih model dan dibaca reviewer. Chat tetap dihapus otomatis dari database setelah 90 hari.
- Chat yang ditolak dianalisa oleh pengaman AI, atau yang isinya belum cukup (misalnya baru salam), dilewati dan baru dicoba lagi saat ada pesan baru.
- Tanpa `FREELLMAPI_BASE_URL` maupun `ANTHROPIC_API_KEY`, analisa AI mati sendiri; aturan ghosting tetap jalan.

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
| Ada chat WA baru | Otomatis jadi lead kalau WhatsApp listener jalan (kartu "🆕 Lead baru dari WhatsApp" di Discord): cukup koreksi origin/nama/status lewat `!updateleads`. Tanpa listener, atau chat yang tidak tertangkap: `!newleads` |
| Ringkasan "🧠 Analisa chat" muncul (12.00 / 23.00) | Cek usulannya, lalu `!applyai <wa>` untuk yang cocok. Yang kurang pas: ubah sendiri dengan `!updateleads` |
| Ingin penilaian AI untuk satu lead sekarang | `!analyze <wa>` |
| Lead lama belum jadi kontak WhatsApp, atau ada lead yang namanya belum muncul di WhatsApp | `!synccontacts` (satu lead: `!synccontacts <wa>`) |
| Chat dari teman/keluarga/supplier ikut jadi lead | `!ignorewa <wa>` (lalu `!updateleads <wa>` + `status: skip` untuk lead yang sudah terlanjur dibuat). Daftarnya: `!waignored` |
| Cek WhatsApp listener jalan, login pertama kali, atau ganti nomor CS | Di `#whatsapp-settings`: `!wastatus`, `!walogin`, `!walogout ya` lalu `!walogin` |
| Peringatan "ter-logout" / "terputus" dari WhatsApp listener | Di `#whatsapp-settings`: `!walogin` (ter-logout) atau `!warestart` (terputus lama) |
| Customer lama (sudah pernah order lewat panel/website sebelum ada bot) order lagi | Langsung `!invoice` dengan `lead: <nomor WA>`, tanpa `!newleads`: lead dibuat otomatis dari data order/customer lama |
| Tambah notes/domicile/goal, atau status/alasan berubah | `!updateleads <wa>` |
| Tiap pagi | `!followup` (H+1/H+3/H+7), `!aftersales` (H+1/H+7/H+14), `!reorder`, `!reorderlast` |
| Customer setuju beli (closing) | `!invoice` → forward PDF + teks invoice ke customer |
| Ada order masuk di Shopee/Tokopedia | `!invoice` dengan `order_type: shopee` / `tokopedia` → langsung lunas, packing slip untuk gudang ikut terkirim. Tidak perlu `!payment` dan `!updateshipping` (ongkir 0, resi `-`). Pembeli bukan lead: ganti baris `lead` dengan `name: <nama pembeli>` |
| Customer WhatsApp kirim bukti bayar | `!payment <invoice>` + upload foto bukti → packing slip untuk gudang |
| Gudang sudah kirim (order WhatsApp) | `!updateshipping <invoice>` → forward teks resi ke customer |
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
| `origin` | **ya** | ads / tokopedia / instagram / threads / tiktok / fnf / shopee / website / existing / unknown. `existing` = customer lama dari sebelum ada bot (dipakai otomatis oleh !invoice). Lead dari chat WA otomatis dibuat dengan origin `ads`: ganti kalau bukan dari iklan. `unknown` = sumber tidak diketahui (data lama) |
| `status` | **ya** | hot / warm / cold / skip |
| `interest` | - | Produk yang diminati, boleh singkat: `reta 10 mg` → Retatrutide 10mg. `-` untuk kosong |
| `rejection` | - | Alasan belum beli: harga / company / cara_penggunaan / perizinan / produk_tidak_ada / ghosting / - (kosong) |
| `chat_date` | - | Tanggal mulai chat (YYYY-MM-DD). Boleh tidak ditulis: otomatis tanggal hari ini (WIB). Dasar hitungan !followup |

- chat_date boleh tidak ditulis: otomatis tanggal hari ini (WIB). Tulis `chat_date: YYYY-MM-DD` kalau lead sebenarnya mulai chat di hari lain.
- is_customer tidak perlu ditulis. Kalau nomor WA ini sudah pernah punya order lunas, lead langsung jadi customer dan tidak masuk !followup.
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
| `origin` | - | ads / tokopedia / instagram / threads / tiktok / fnf / shopee / website / existing / unknown. `existing` = customer lama dari sebelum ada bot (dipakai otomatis oleh !invoice). Lead dari chat WA otomatis dibuat dengan origin `ads`: ganti kalau bukan dari iklan. `unknown` = sumber tidak diketahui (data lama) |
| `status` | - | hot / warm / cold / skip |
| `interest` | - | Produk yang diminati, boleh singkat: `reta 10 mg` → Retatrutide 10mg. `-` untuk kosong |
| `rejection` | - | Alasan belum beli: harga / company / cara_penggunaan / perizinan / produk_tidak_ada / ghosting / - (kosong) |
| `chat_date` | - | Koreksi tanggal mulai chat (YYYY-MM-DD). Mengubah jadwal !followup |
| `domicile` | - | Kota domisili |
| `goal` | - | Tujuan pemakaian / keluhan |
| `notes` | - | Catatan bebas, boleh lebih dari satu baris |
| `is_customer` | - | true / false. Otomatis true begitu ada order lunas dengan nomor WA yang sama, dari !invoice, panel, atau website. Isi true kalau customer beli tanpa nomor WA yang sama (misal lewat Shopee) supaya tidak muncul di !followup |
| `wa` | - | Ganti nomor WhatsApp lead |

- Minimal satu field. Field lain tidak berubah.
- `rejection: -`, `interest: -`, atau `notes: -` untuk mengosongkan.

### `!lead`

Lihat data lead + 5 invoice terakhir.

Setelah nama command: nomor WA lead (atau ID lead).

```text
!lead 081234567890
```

- Invoice terakhir = invoice dari !invoice + order dari panel/website dengan nomor WA yang sama (ditandai `dari panel` / `dari website`).

### `!followup`

Lead yang perlu di-follow up H+1, H+3, H+7 dari chat_date.

Setelah nama command: `<dari> <sampai>` format YYYY-MM-DD (boleh pakai `-` atau `sampai` di tengah). Satu tanggal = hari itu saja, kosong = hari ini.

```text
!followup 2026-11-01 2026-11-07
```

- Lead yang sudah beli (is_customer = true) tidak muncul: mereka masuk !aftersales. Lead otomatis jadi customer begitu ada order lunas dengan nomor WA yang sama, dari !invoice, panel, atau website.
- Urutan: hot → warm → cold → skip. Nomor WA bisa diklik langsung.

### `!ignorewa`

Chat WA dari nomor ini tidak dijadikan lead otomatis (teman, keluarga, supplier).

Setelah nama command: nomor WA.

```text
!ignorewa 081234567890
note: supplier botol
```

| Field | Wajib | Isi |
| --- | --- | --- |
| `note` | - | Catatan kenapa diabaikan (opsional) |

- Hanya untuk chat yang masuk ke nomor WhatsApp CS (dibaca otomatis oleh WhatsApp listener). Lead yang sudah ada tidak diubah: kalau perlu, ubah statusnya dengan `!updateleads <wa>` + `status: skip`.
- Batalkan dengan `!unignorewa <wa>`.

### `!unignorewa`

Chat WA dari nomor ini bisa jadi lead otomatis lagi.

Setelah nama command: nomor WA.

```text
!unignorewa 081234567890
```

### `!wastatus` 🔒 whatsapp-settings

Status WhatsApp listener: tersambung atau tidak, nomor, chat & lead terakhir, hasil analisa terakhir.

```text
!wastatus
```

- Hanya jumlah dan waktu, tanpa isi chat. Hitungan mulai dari 0 setiap listener dinyalakan ulang.
- Butuh WhatsApp listener jalan di VPS yang sama dengan bot (lihat whatsapp-listener/README.md).

### `!walogin` 🔒 whatsapp-settings

Login WhatsApp listener: tampilkan QR di channel ini, atau kode pairing kalau pakai nomor.

Setelah nama command: nomor WA CS (opsional): kalau diisi, keluar kode pairing 8 huruf, bukan QR.

```text
!walogin
```

- QR: di HP CS buka WhatsApp Business → Settings → Linked Devices → Link a Device, lalu scan QR di channel ini (Discord dibuka di laptop/HP lain). QR diperbarui otomatis dan dihapus begitu login berhasil atau kedaluwarsa.
- Kode pairing (`!walogin 0812…`): untuk kalau Discord dibuka di HP CS itu sendiri. Masukkan kode lewat Link a Device → Link with phone number instead.
- Yang scan/memasukkan kode menentukan nomor yang dibaca listener. Kalau `WA_EXPECTED_PHONE` diisi di listener, nomor lain langsung dilepas.
- Butuh WhatsApp listener jalan di VPS yang sama dengan bot (lihat whatsapp-listener/README.md).

### `!walogout` 🔒 whatsapp-settings

Lepas linked device WhatsApp listener (misalnya untuk ganti nomor CS).

Setelah nama command: `ya` untuk konfirmasi.

```text
!walogout ya
```

- Setelah logout, chat baru tidak jadi lead otomatis sampai `!walogin` lagi. Lead dan chat yang sudah tersimpan tidak dihapus.

### `!warestart` 🔒 whatsapp-settings

Sambungkan ulang WhatsApp listener ke WhatsApp (tanpa scan ulang).

```text
!warestart
```

- Untuk kalau `!wastatus` lama menunjukkan terputus. Sesi tetap sama, tidak perlu scan QR.

### `!warun` 🔒 whatsapp-settings

Jalankan sekarang analisa chat AI (biasanya 12.00/23.00) atau tugas harian (03.00).

Setelah nama command: `analisa` atau `harian`.

```text
!warun analisa
```

- `analisa`: semua lead dengan chat baru dinilai AI + aturan ghosting, rinciannya dikirim ke channel WhatsApp Leads seperti jadwal biasa. Memakai kredit Claude API.
- `harian`: hapus chat yang lebih dari 90 hari.

### `!waignored`

Daftar nomor WA yang diabaikan (!ignorewa).

```text
!waignored
```

- Menampilkan 50 terbaru.

### `!synccontacts`

Simpan lead ke kontak WhatsApp CS (nama lead muncul di WhatsApp, bukan nomor).

Setelah nama command: nomor WA lead (opsional).

```text
!synccontacts
```

- Lead baru (14 hari terakhir) dan lead yang namanya diubah otomatis disimpan oleh WhatsApp listener, jadi ini terutama untuk lead lama dan kalau ada yang gagal.
- Tanpa nomor: 30 lead lama yang belum jadi kontak per sekali jalan (sekitar 3 detik per kontak). Jalankan lagi sampai habis.
- Dengan nomor: kontak lead itu disimpan ulang sekarang, termasuk kalau kontaknya pernah dihapus di HP atau statusnya skip.
- Nama kontak: `<nama> • Lead <origin> <tgl chat>`, misalnya `Budi • Lead Ads 06/11`. Customer lama: `<nama> • Customer <tgl>`.
- Kontak tersimpan di akun WhatsApp saja (tidak masuk kontak iPhone). Butuh WhatsApp listener tersambung.

### `!analyze`

AI membaca chat WA lead ini dan mengusulkan status, minat, alasan, goal, domisili.

Setelah nama command: nomor WA lead.

```text
!analyze 081234567890
```

- Chat dibaca otomatis tiap hari jam 12.00 dan 23.00 WIB untuk semua lead yang ada chat baru (hasilnya muncul di channel WhatsApp Leads). Pakai !analyze kalau ingin sekarang juga.
- Hanya chat yang tersimpan sejak WhatsApp listener jalan. Lead yang sudah jadi customer tidak dinilai otomatis.
- Ini usulan: lead belum berubah sampai kamu jalankan !applyai.

### `!applyai`

Terapkan usulan AI terakhir ke lead (status, minat, alasan; goal/domisili kalau masih kosong).

Setelah nama command: nomor WA lead.

```text
!applyai 081234567890
```

- Usulan yang dipakai: yang terbaru dalam 7 hari terakhir dan belum diterapkan. Goal dan domisili hanya diisi kalau masih kosong.
- Kalau ada yang kurang pas, ubah sendiri dengan !updateleads.

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
| `lead` | ya, untuk order whatsapp | Nomor WA lead. Customer lama yang sudah pernah order lewat panel/website tidak perlu !newleads dulu: lead dibuat otomatis dari data lama. Order shopee/tokopedia boleh tanpa lead: hapus baris ini dan isi `name` |
| `name` | ya, untuk order shopee/tokopedia tanpa lead | Nama pembeli dari pesanan Shopee/Tokopedia. Hanya dipakai kalau tidak ada lead (nama lead dipakai kalau ada `lead`) |
| `address` | **ya** | Alamat lengkap pengiriman |
| `city` | **ya** | Kota/kabupaten, provinsi |
| `zip` | - | Kode pos |
| `item` | **ya** | `qty \| produk` atau `qty \| produk \| harga custom`. Satu baris per produk, boleh banyak baris. Nama produk boleh singkat. Produk yang Hidden (tidak tampil di /shop) tetap bisa |
| `order_type` | - | `whatsapp` / `shopee` / `tokopedia` (sama dengan Order Source di panel). Default whatsapp |
| `marketplace_fee` | - | Khusus shopee/tokopedia: total fee/potongan dari platform (angka). Mengurangi total order, sama seperti di panel. Default 0 |
| `marketplace_order_no` | - | Khusus shopee/tokopedia: nomor pesanan dari Shopee/Tokopedia (opsional). Bisa dipakai untuk cari invoice, dan order dengan nomor yang sama ditolak supaya tidak dobel |
| `discount` | - | Khusus whatsapp: potongan dalam rupiah (angka). Default 0 |
| `payment_type` | - | Khusus whatsapp: Bank Transfer / QRIS. Default Bank Transfer. Order shopee/tokopedia otomatis Shopee/Tokopedia |
| `notes` | - | Catatan internal (tidak tampil di invoice) |

- Harga diambil dari harga produk saat ini, kecuali diisi harga custom. Harga 0 = gratis/bonus.
- Produk yang di-Hide di panel (tidak tampil di /shop, misalnya syringe) tetap bisa di-invoice. Kalau nama yang ditulis cocok ke produk yang tampil dan yang Hidden sekaligus, yang tampil dipakai.
- Customer lama (sudah pernah order lewat panel/website sebelum ada bot) tidak perlu !newleads: tulis nomornya di `lead`, bot membuat lead-nya otomatis dari data lama (nama dan domisili dari data customer/order terakhir, status hot, PIC = yang menjalankan !invoice). Origin diambil dari order pertama: shopee / tokopedia / website, atau `existing` kalau order pertamanya order WhatsApp di panel. Bisa diubah lewat !updateleads.
- Order Shopee/Tokopedia: ganti jadi `order_type: shopee` (atau `tokopedia`), tambah `marketplace_fee` (dan `marketplace_order_no` kalau ada), lalu hapus baris `discount` dan `payment_type`. Total = subtotal - marketplace_fee.
- Pembeli Shopee/Tokopedia yang bukan lead (nomor WA-nya tidak ada): hapus baris `lead`, tulis `name: <nama pembeli>`. Order tetap tercatat dan stok dipotong, tapi tidak membuat customer dan tidak masuk !aftersales / !reorder.
- Order Shopee/Tokopedia langsung lunas (dibayar di marketplace) dan pengiriman diurus marketplace (ongkir 0, resi -), jadi tidak perlu !payment dan !updateshipping. Bot langsung kirim PDF invoice + packing slip untuk gudang. Teks invoice WhatsApp tidak dikirim, karena customer dapat invoice dari marketplace.
- Usage life tiap produk dicatat per item untuk reorder reminder (bisa beda-beda per produk).
- Output order WhatsApp: PDF invoice (sama dengan panel) + teks invoice siap di-forward ke customer. Order Shopee/Tokopedia: PDF invoice + packing slip.

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
- Tidak perlu untuk order Shopee/Tokopedia: sudah otomatis lunas saat !invoice, dan packing slip langsung dikirim.

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
- Tidak perlu untuk order Shopee/Tokopedia: pengiriman diurus marketplace (otomatis ongkir 0, resi -). Boleh dipakai kalau mau mencatat resi asli dari marketplace.

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

- Hanya order yang sudah lunas, dari !invoice, panel, atau website. Order Shopee/Tokopedia tanpa nomor WA tidak ikut.
- Menampilkan sifat lead (status, origin, rejection, notes) dan produk yang dibeli. Order dari panel/website memakai data lead dengan nomor WA yang sama.

### `!reorder`

Reminder reorder: tanggal order + usage_life tiap produk.

Setelah nama command: `<dari> <sampai>` format YYYY-MM-DD (boleh pakai `-` atau `sampai` di tengah). Satu tanggal = hari itu saja, kosong = hari ini.

```text
!reorder 2026-11-01 2026-11-07
```

- Dihitung per produk: beli Reta (8 minggu) + NAD (2 minggu) = dua reminder di tanggal berbeda.
- Produk misc (perintilan) dan produk tanpa usage_life tidak muncul.
- Otomatis dilewati kalau customer sudah beli produk yang sama lagi.
- Order dari panel/website ikut, dengan data lead dari nomor WA yang sama (kalau ada).

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
