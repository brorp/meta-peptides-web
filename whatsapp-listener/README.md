# WhatsApp listener (lead otomatis dari chat WA)

Proses kecil di VPS yang terhubung ke nomor WhatsApp CS sebagai **linked device** (sama seperti WhatsApp Web). Setiap chat baru dari nomor yang belum jadi lead otomatis dibuat jadi lead, lalu kartunya muncul di channel Discord.

- **Tidak pernah mengirim apa pun ke customer.** Listener tidak pernah mengirim pesan, tanda dibaca (centang biru), atau status online/mengetik. Satu-satunya yang ia tulis ke WhatsApp adalah **kontak lead** di akun WhatsApp CS (nama lead muncul di WhatsApp, bukan nomor), sama seperti "Kontak baru" di WhatsApp Web. Tes `readonly.test.mjs` memastikan kodenya tidak punya jalur lain. HP CS tetap dipakai seperti biasa, dan notifikasi tetap masuk.
- **Tanpa Puppeteer/Chrome.** Memakai library [Baileys](https://github.com/WhiskeySockets/Baileys) yang langsung bicara protokol WhatsApp Web (±100–150 MB RAM).
- **Risiko:** Baileys bukan aplikasi resmi WhatsApp. Karena hanya membaca dan menyimpan kontak pelan-pelan, risikonya kecil, tapi tidak nol. Tes dulu dengan nomor cadangan sebelum memakai nomor CS utama.

## Apa yang terjadi saat chat masuk

| Chat dari | Hasil |
| --- | --- |
| Nomor baru | Lead dibuat: nama = nama profil WA (atau `WA 1234`), status `warm` sementara, chat_date hari ini, PIC `wa-bot`. Origin selalu `ads` (sebagian besar chat datang dari iklan; yang bukan diganti CS lewat `!updateleads`). Kalau chat terdeteksi dari iklan Click-to-WhatsApp (atau teks pertamanya cocok dengan `WA_AD_TEXT_PATTERNS`), judul iklannya ditulis di notes; kalau dari tombol WA di Instagram, sumbernya ditulis di notes. Kartu "🆕 Lead baru dari WhatsApp" dikirim ke Discord. |
| Customer lama (pernah order lewat panel/website) | Lead dibuat dari data order lama, sama seperti `!invoice`. Kartu "🔁 Customer lama chat lagi". |
| Nomor yang sudah jadi lead | Pesan disimpan untuk analisa chat nanti. Tidak ada kartu. |
| Nomor di daftar abaikan (`!ignorewa`) | Tidak disimpan sama sekali. |
| Grup, status, broadcast, channel | Diabaikan. |
| Chat lama (sebelum listener jalan) | Diabaikan: hanya pesan yang umurnya kurang dari 15 menit yang diproses. |
| CS yang memulai chat ke nomor baru | Tidak membuat lead. Hanya chat masuk yang membuat lead. |

Balasan CS dari HP juga disimpan (arah `out`) untuk lead, supaya analisa chat nanti punya konteks lengkap. Teks chat hanya bisa dibaca server dan dihapus otomatis setelah 90 hari.

Jam 12.00 dan 23.00 WIB listener menjalankan analisa chat AI dan aturan ghosting, lalu mengirim ringkasannya ke Discord (bagian 9 di [README bot](../discord-bot/README.md)).

Setiap malam sekitar jam 03.00 WIB listener menjalankan tugas harian: menghapus chat yang lebih dari 90 hari.

**Kontak WhatsApp:** setiap 2 menit listener menyimpan lead baru (14 hari terakhir) dan lead yang namanya berubah sebagai kontak di akun WhatsApp CS, misalnya `Budi • Lead Ads 06/11`. Jedanya sekitar 3 detik per kontak. Kontak tersimpan di akun WhatsApp saja, tidak masuk kontak iPhone. Lead lama: `!synccontacts`. Matikan dengan `WA_SAVE_CONTACTS=0`. Detail: bagian 8 di [README bot](../discord-bot/README.md).

Kalau WhatsApp hanya memberi ID samaran (`@lid`) tanpa nomor HP, lead tidak bisa dibuat. Listener mengirim peringatan ke Discord (maksimal sekali per jam), jadi CS bisa membuat lead-nya manual dengan `!newleads`.

## Setup

### 1. Supabase dan Vercel

1. Jalankan `supabase/migrations/20261111090000_add_whatsapp_listener.sql` di Supabase SQL Editor, lalu `20261111100000_add_whatsapp_contact_to_leads.sql` (kontak WhatsApp).
2. Buat secret baru (berbeda dari `DISCORD_BOT_API_SECRET`): `openssl rand -hex 32`.
3. Vercel → Settings → Environment Variables: tambah `WHATSAPP_LISTENER_SECRET` dengan nilai itu, lalu redeploy.

### 2. Discord

1. **Channel leads** → Edit Channel → Integrations → Webhooks → New Webhook → Copy Webhook URL → `DISCORD_WA_WEBHOOK_URL`. Kartu lead baru dan ringkasan analisa chat masuk ke sini.
2. **Channel `#whatsapp-settings`** (buat privat, hanya admin): buat webhook juga → `DISCORD_WA_SETTINGS_WEBHOOK_URL`. Peringatan koneksi (ter-logout, terputus, belum login) masuk ke sini. Tanpa webhook ini, peringatan masuk ke channel leads.
3. Klik kanan `#whatsapp-settings` → Copy Channel ID → isi `DISCORD_WA_SETTINGS_CHANNEL_IDS` di `discord-bot/.env`, lalu restart bot. Command `!walogin`, `!wastatus`, dan lainnya hanya jalan di channel ini.

URL webhook rahasia: siapa pun yang memilikinya bisa mengirim pesan ke channel itu.

### 3. Jalankan di VPS

Listener harus di VPS yang sama dengan bot Discord, dengan user yang sama (`ubuntu`), karena bot mengaturnya lewat file socket lokal `whatsapp-listener/control.sock`. Tidak ada port yang dibuka.

```bash
cd ~/meta-peptides-web && git pull
cd whatsapp-listener
npm ci --omit=dev --ignore-scripts
cp env.example .env   # isi METAWELLNESS_API_BASE_URL, WHATSAPP_LISTENER_SECRET, kedua webhook, WA_EXPECTED_PHONE
chmod 600 .env
```

Isi `WA_EXPECTED_PHONE` dengan nomor WhatsApp CS (misalnya `6281234567890`). Kalau ada yang login dengan nomor lain, listener langsung melepasnya dan tidak membaca chat nomor itu.

Dengan systemd (sama seperti bot Discord):

```bash
sudo install -m 0644 metawellness-wa-listener.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now metawellness-wa-listener
journalctl -u metawellness-wa-listener -f
```

Atau pm2 saja: `pm2 start ecosystem.config.cjs && pm2 save`, lalu `pm2 logs metawellness-wa-listener`.

### 4. Login WhatsApp (sekali)

**Dari Discord (disarankan).** Di `#whatsapp-settings` ketik `!walogin`. Bot mengirim gambar QR. Di HP CS: WhatsApp Business → **Settings** → **Linked Devices** → **Link a Device** → scan QR di layar laptop. QR berganti tiap ±20 detik dan pesannya ikut diperbarui. Begitu berhasil, QR dihapus dan bot menulis "✅ tersambung sebagai +62…". Di HP muncul perangkat "MetaWellness Leads".

**Discord dibuka di HP CS itu sendiri** (tidak bisa scan layar sendiri): ketik `!walogin 0812…` (nomor CS). Bot menampilkan kode pairing 8 huruf. Di HP: ketuk notifikasi WhatsApp, atau Linked Devices → Link a Device → **Link with phone number instead** → masukkan kodenya.

**Dari terminal.** Saat listener dinyalakan tanpa sesi, QR juga muncul di log (`journalctl` / `pm2 logs`) selama ±3 menit. Setelah itu listener menunggu `!walogin`, atau restart service untuk QR baru.

Keamanan:

- QR dan kode pairing **tidak** memberi akses ke chat CS. Yang men-scan QR (atau memasukkan kode) menautkan WhatsApp **miliknya sendiri** ke listener. Risikonya kebalikannya: kalau orang lain men-scan, chat nomor dia yang masuk jadi lead. Karena itu `#whatsapp-settings` dibuat privat dan `WA_EXPECTED_PHONE` diisi, supaya nomor lain langsung dilepas.
- Yang rahasia adalah **sesi** di `whatsapp-listener/auth/` (diabaikan git, hanya bisa dibaca user VPS). Siapa pun yang punya folder ini bisa membaca chat nomor CS. Jangan disalin ke mana-mana.
- HP CS harus membuka WhatsApp minimal sekali tiap 14 hari, supaya linked device tidak dilepas otomatis oleh WhatsApp.

### 5. Tes

1. `!wastatus` di `#whatsapp-settings` → "✅ Tersambung" dengan nomor CS.
2. Kirim chat dari HP lain ke nomor CS → dalam beberapa detik kartu muncul di channel leads, dan lead terlihat di `!lead <nomor>` atau di panel Leads.

## Command Discord (`#whatsapp-settings`)

| Command | Fungsi |
| --- | --- |
| `!wastatus` | Tersambung atau tidak, nomor, jumlah chat & lead sejak listener jalan, chat/lead terakhir, hasil analisa & tugas harian terakhir, kontak WhatsApp yang disimpan, uptime, RAM |
| `!walogin` | Tampilkan QR login. `!walogin <wa>`: kode pairing untuk nomor itu |
| `!walogout ya` | Lepas linked device (misalnya untuk ganti nomor CS). Lead dan chat tersimpan tidak dihapus |
| `!warestart` | Sambungkan ulang tanpa scan ulang (kalau lama terputus) |
| `!warun analisa` | Jalankan analisa chat AI + aturan ghosting sekarang (biasanya 12.00 / 23.00). Rinciannya ke channel leads |
| `!warun harian` | Jalankan tugas harian sekarang (biasanya 03.00): hapus chat > 90 hari |

`!ignorewa`, `!unignorewa`, `!waignored` (daftar nomor yang diabaikan), dan `!synccontacts` (simpan lead lama ke kontak WhatsApp, 30 per sekali jalan; satu lead: `!synccontacts <wa>`) bisa dipakai di channel bot mana pun.

## Perawatan

| Kejadian | Yang dilakukan |
| --- | --- |
| Discord: "ter-logout" | Linked device dihapus dari HP, atau dilepas WhatsApp. `!walogin` di `#whatsapp-settings`. Sesi lama dipindah ke `auth-loggedout-…`; boleh dihapus. |
| Discord: "belum login" | Listener jalan tanpa sesi (pertama kali, atau QR tidak di-scan). `!walogin`. |
| Discord: "ada listener lain" | Ada dua proses yang memakai sesi yang sama. Pastikan hanya satu yang jalan (`pm2 list`, `systemctl status`), lalu `!warestart`. |
| Discord: "terputus, sedang mencoba tersambung lagi" | Internet VPS atau server WhatsApp bermasalah. Listener mencoba lagi sendiri; kalau lama, `!warestart`. Pesan saat terputus tidak diproses kalau umurnya sudah lebih dari 15 menit; cek chat di HP dan pakai `!newleads` kalau perlu. |
| Ganti nomor CS | `!walogout ya`, ganti `WA_EXPECTED_PHONE` di `.env`, restart service, lalu `!walogin` dari HP nomor baru. |
| Teman / keluarga / supplier jadi lead | `!ignorewa <nomor>` supaya tidak terulang, lalu `!updateleads <nomor>` + `status: skip`. Kontak WhatsApp-nya (kalau sudah tersimpan) hapus sendiri di HP. |
| Nama lead belum muncul di WhatsApp | `!wastatus` → baris "Kontak WhatsApp" (error terakhir). Lead yang gagal dicoba lagi setelah 1 jam; paksa sekarang dengan `!synccontacts <wa>`. |
| Update kode | `cd ~/meta-peptides-web && git pull && cd whatsapp-listener && npm ci --omit=dev --ignore-scripts && sudo systemctl restart metawellness-wa-listener` |
| Berhenti memakai listener | `!walogout ya`, lalu `sudo systemctl disable --now metawellness-wa-listener` dan `rm -rf whatsapp-listener/auth`. |

Log hanya mencatat 4 digit terakhir nomor dan alasan error, tanpa isi chat. Jangan set `WA_LOG_LEVEL` ke `debug` di production.

## Developer

`npm test` di folder ini: tes pemetaan pesan Baileys, tanda tangan request, kartu Discord, socket kontrol, kontak WhatsApp (`contacts.mjs`), dan tes read-only. Endpoint API ada di `app/api/bot/whatsapp/` (auth: `lib/whatsapp-listener-auth.ts`). Socket kontrol untuk bot: `control.mjs` (server) dan `../discord-bot/wa-control.mjs` (client); command-nya di `../discord-bot/wa-settings.mjs`.

## Supervisi CS untuk direksi

Listener memanggil `/api/bot/whatsapp/supervise` dengan HMAC setiap dua menit.
Temuan dan poin hanya tersedia di panel root; hasilnya tidak dikirim ke channel
staff atau WhatsApp. Terapkan kedua migration KPI, deploy web, lalu restart
`metawellness-wa-listener` setelah update kode. Panduan aktivasi, jadwal,
Daily Report, review manual, dan keterbatasan observasi ada di
[`docs/cs-supervision.md`](../docs/cs-supervision.md).
