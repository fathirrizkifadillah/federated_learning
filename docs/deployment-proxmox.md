# Panduan Deploy FedSocial ke Proxmox VM + Cloudflare Tunnel (PM2)

Arsitektur production ini memakai **1 subdomain HTTPS** via Cloudflare Tunnel (wajib HTTPS agar Web Crypto API `AES-256-GCM` E2EE berjalan penuh di semua browser/HP) + **PM2** untuk Node.js (`api` & `web`) + **PostgreSQL 17** di Docker.

---

## 1. Persiapan di VM Ubuntu Proxmox

Install Node.js 20 LTS, Docker + Docker Compose, dan PM2:

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git postgresql-client

# PM2
sudo npm install -g pm2
```

Clone repo dan install dependencies:

```bash
git clone <URL_REPO_KAMU> fedsocial
cd fedsocial
npm install
```

---

## 2. Jalankan PostgreSQL 17 & Transfer Data (5.474 Artikel + Model Global Bilingual)

Start container PostgreSQL:

```bash
docker compose up -d
```

### Opsi A (Paling Cepat & Identik dengan Lokal): Dump dari Laptop -> Restore di VM
Di **laptop Windows kamu**:
```powershell
pg_dump -U fedsocial -h localhost -d fedsocial_db --no-owner --no-acl -f fedsocial_dump.sql
```
Copy `fedsocial_dump.sql` ke VM (`scp fedsocial_dump.sql user@ip-vm:~/fedsocial/`), lalu di **VM Proxmox**:
```bash
docker exec -i fedsocial-postgres psql -U fedsocial -d fedsocial_db < fedsocial_dump.sql
```
*(Seluruh 5.474 artikel, akun demo, dan model global `MaskedFedProx-Bilingual` langsung terpasang utuh.)*

### Opsi B (Fresh Schema di VM)
```bash
cd apps/api
npx prisma generate
npx prisma db push
```

---

## 3. Konfigurasi Environment Production

### A. Backend (`apps/api/.env`)
```env
PORT=4000
NODE_ENV=production
DATABASE_URL="postgresql://fedsocial:fedsocial_secret@localhost:5432/fedsocial_db?schema=public"
JWT_SECRET="ganti_dengan_random_string_panjang_minimal_32_karakter"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="https://fedsocial.domaintemen.com,http://localhost:3000"
```

### B. Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://fedsocial.domaintemen.com/api/v1
```

---

## 4. Build & Jalankan via PM2

```bash
cd ~/fedsocial
npm run db:generate --workspace=apps/api
npm run build:api
npm run build:web

mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Cek status:
```bash
pm2 status
curl http://localhost:4000/health
```

---

## 5. Routing Cloudflare Tunnel (1 Subdomain, Bebas Ribet CORS)

Di **Cloudflare Zero Trust → Networks → Tunnels → Public Hostname**, buat **3 aturan** untuk subdomain yang sama (urutan path lebih spesifik di atas):

| Subdomain | Domain | Path | Service |
| :--- | :--- | :--- | :--- |
| `fedsocial` | `domaintemen.com` | `api/*` | `http://localhost:4000` |
| `fedsocial` | `domaintemen.com` | `health` | `http://localhost:4000` |
| `fedsocial` | `domaintemen.com` | *(kosong)* | `http://localhost:3000` |

> **Penting:** Cloudflare Tunnel otomatis menyediakan SSL/HTTPS di `https://fedsocial.domaintemen.com`, sehingga Web Worker FL + enkripsi AES-256-GCM E2EE langsung aktif di laptop maupun HP.

---

## 6. Live Demo Monitoring Saat Presentasi

SSH ke VM Proxmox dan jalankan:

```bash
cd ~/fedsocial
npm run fl:logs -- --usernames
```

Saat dosen atau teman-teman membuka `https://fedsocial.domaintemen.com` dan membaca beberapa artikel, log `[ROUND-AGGREGATED]` (`delta_bytes=340B`, `raw_logs_received=0B`) dan `[E2EE-ACCOUNT-SYNC]` akan muncul **real-time** di terminal VM.

---

## 7. Update Kode Cepat di Masa Depan

```bash
cd ~/fedsocial
git pull
npm install
npm run build:api
npm run build:web
pm2 restart all
```
