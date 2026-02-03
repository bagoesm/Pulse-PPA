# Pulse PPA

**Version 1.5.3**

Aplikasi Manajemen Kerja KemenPPPA - Sistem manajemen task, project, dan surat untuk meningkatkan produktivitas tim.

## 🚀 Features

- ✅ Task Management dengan Kanban Board
- 📊 Project & Epic Management
- 📅 Meeting & Calendar
- 📝 Surat & Disposisi
- 👥 User Management dengan Role-based Access
- 🔔 Real-time Notifications
- 📱 Mobile Responsive
- 🎨 Modern UI/UX

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Icons:** Lucide React
- **State Management:** React Context API

## 📦 Installation

```bash
# Clone repository
git clone <repository-url>

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env dengan Supabase credentials Anda

# Run development server
npm run dev
```

## 🔧 Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📝 Version Management

### Update Version

```bash
# Bug fix (1.5.3 → 1.5.4)
npm run version:patch

# New feature (1.5.3 → 1.6.0)
npm run version:minor

# Breaking change (1.5.3 → 2.0.0)
npm run version:major
```

### Check Version

```bash
npm run version:check
```

📚 **More info:** [VERSION_QUICK_GUIDE.md](./VERSION_QUICK_GUIDE.md)

## 📖 Documentation

- [Versioning Guide](./VERSIONING.md) - Panduan lengkap version management
- [Changelog](./CHANGELOG.md) - History perubahan aplikasi
- [Password Reset Guide](./CARA_RESET_PASSWORD.md) - Cara reset password user

## 🔐 Setup Database

Untuk mengaktifkan fitur update password:

```bash
# Jalankan SQL di Supabase SQL Editor
# File: database_setup_password_update.sql
```

## 🚢 Deployment

```bash
# Build production
npm run build

# Deploy folder 'dist' ke hosting pilihan Anda
# (Vercel, Netlify, atau manual upload)
```

## 📄 License

Private - KemenPPPA Internal Use Only

## 👥 Team

Biro Data & Informasi KemenPPPA

---

**Current Version:** 1.5.3 | **Last Updated:** 2024-02-03