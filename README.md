# WiFi Voucher Management System

Aplikasi manajemen penjualan voucher WiFi berbasis Next.js + Supabase.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment
```bash
cp .env.local.example .env.local
# Edit .env.local dengan credentials Supabase Anda
```

### 3. Setup Database
- Buka Supabase Dashboard
- Masuk ke SQL Editor
- Jalankan isi file `database/schema.sql`

### 4. Jalankan development server
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 🔑 Login Default

| Field | Value |
|-------|-------|
| Username | `superadmin` |
| Password | `admin123` |

> ⚠️ **PENTING**: Ganti password default setelah login pertama!

---

## 📁 Struktur Project

```
/pages
  index.js          → Redirect otomatis
  login.js          → Halaman login
  dashboard.js      → Dashboard statistik
  sell.js           → Jual voucher
  sales.js          → Riwayat penjualan
  debts.js          → Manajemen hutang
  admins.js         → Manajemen admin (superadmin only)
  api/              → Next.js API routes

/components
  /layout           → AppLayout, withAuth HOC
  /ui               → Button, Input, Modal, Badge, Toast, dsb
  /cards            → StatCard
  /tables           → (reusable table components)

/services
  supabaseClient.js → Supabase instance
  voucherService.js → CRUD voucher
  salesService.js   → CRUD transaksi
  debtService.js    → CRUD hutang
  adminService.js   → CRUD admin

/hooks
  useAuth.js
  useDebts.js
  useSales.js

/context
  AuthContext.js        → Auth state + login/logout
  NotificationContext.js → Toast + realtime notifikasi

/utils
  formatCurrency.js     → Format IDR
  formatDate.js         → Format tanggal (date-fns)
  generateVoucherImage.js → html2canvas PNG
  pdfGenerator.js       → Export PDF (jsPDF)

/constants
  config.js             → APP_CONFIG, ROUTES, NAV_ITEMS
  colors.js             → Color constants
```

---

## 🗄️ Database Tables

| Tabel | Fungsi |
|-------|--------|
| `admins` | Data admin & superadmin |
| `vouchers` | Data voucher WiFi |
| `sales` | Header transaksi penjualan |
| `sale_items` | Detail item per transaksi |
| `debts` | Data hutang pelanggan |
| `debt_payments` | Riwayat pembayaran hutang |

---

## ✨ Fitur

- ✅ Login admin (session localStorage, 8 jam)
- ✅ Dashboard statistik realtime dengan filter periode
- ✅ Jual voucher (single/multiple) + auto download kartu PNG
- ✅ Riwayat penjualan + filter + export PDF
- ✅ Manajemen hutang (bayar full/sebagian, progress bar, overdue detection)
- ✅ Manajemen admin (tambah/hapus, superadmin only)
- ✅ Notifikasi realtime (Supabase channel)
- ✅ Toast notification
- ✅ Skeleton loading
- ✅ Pagination
- ✅ Mobile-first responsive

---

## 🛠️ Stack

- **Framework**: Next.js 14 (Pages Router)
- **Frontend**: React 18 + TailwindCSS 3
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Auth**: Custom session (bcryptjs + localStorage)
- **PDF**: jsPDF
- **Image**: html2canvas
- **Icons**: lucide-react
- **Date**: date-fns

---

## 📦 Build Production

```bash
npm run build
npm start
```

---

## 🔒 Keamanan

- Password di-hash dengan bcrypt (10 rounds)
- Session expire otomatis setelah 8 jam
- API routes menggunakan service role key (tidak terekspos ke client)
- RLS (Row Level Security) aktif di Supabase
- Superadmin-only routes dilindungi di frontend dan backend
# voucher-wifi-app-v2
