# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- 🐛 Filter Umur Aset BMN tidak berfungsi
  - Perbaikan parsing Excel untuk menyimpan umur aset langsung dari kolom "Umur Aset"
  - Menambahkan variasi nama kolom: umur aset, umur_aset, umuraset, umur, age, asset age
  - Menghapus duplikasi logika filtering di InventoriBMNPage
  - Menggunakan fungsi applyFilters dari hook untuk konsistensi
  - Filter sekarang bekerja dengan benar untuk range umur aset min/max
- 🐛 Upload BMN menghasilkan data duplikat
  - Perbaikan logika penghapusan data lama saat upload
  - Normalisasi nama satker untuk perbandingan (case-insensitive, tanpa quotes)
  - Menghapus quotes dari nama satker sebelum disimpan ke database
  - Upload sekarang akan mengganti data lama dengan benar tanpa duplikasi
- 🐛 Trend Perolehan Tahun dan Umur Aset di Dashboard salah
  - **Umur aset**: HANYA diambil dari kolom "Umur Aset" di Excel, TIDAK PERNAH dihitung
  - **Tahun perolehan**: Di-extract otomatis dari kolom "Tanggal Perolehan" di Excel
  - Chart distribusi umur aset menggunakan data umur_aset dari Excel
  - Chart trend perolehan menggunakan tahun yang di-extract dari tanggal_perolehan
  - Detail modal menampilkan umur aset dari Excel (jika tidak ada tampilkan "-")
  - Menambahkan kolom umur_aset di database untuk menyimpan nilai dari Excel
  - Memastikan tahunPerolehan dan umurAset di-parse sebagai integer
  - Parser otomatis extract tahun dari tanggal perolehan untuk chart trend
  - Menambahkan console log untuk debugging data parsing dan chart
  - **PENTING**: Umur aset tidak pernah dihitung otomatis, selalu dari Excel

## [1.5.5] - 2025-02-12

### Added
- ✨ Filter Bidang Tugas di Export Modal
  - Multi-select dropdown untuk filter bidang tugas saat export
  - Menggunakan data dari master_bidang_tugas
  - Dropdown dengan search functionality
  - Dapat memilih lebih dari satu bidang tugas

### Fixed
- 🐛 Export PDF terpotong karena kolom terlalu lebar
  - Optimasi lebar kolom agar pas di halaman landscape
  - Total lebar kolom disesuaikan dari 329 unit menjadi 280 unit
  - Margin dikurangi untuk memberikan ruang lebih
- 📄 Penyederhanaan kolom PDF export
  - Hapus kolom: Sifat Surat, Dibuat Oleh, Tgl Dibuat
  - Hapus kolom duplikat: Disposisi (teks), Ada Disposisi, Jumlah Disposisi
  - Fokus ke kolom Detail Disposisi yang lebih informatif
  - Total kolom dikurangi dari 21 menjadi 15 kolom

### Changed
- 🔄 Improved PDF export layout
  - Font size tetap 6 untuk readability
  - Text wrapping otomatis untuk konten panjang
  - Kolom Detail Disposisi diperlebar (42 unit)
  - Kolom Hal/Perihal diperlebar (28 unit)

---

## [1.5.3] - 2024-02-03

### Added
- ✨ Fitur update password di User Management
  - Admin dapat mengubah password user langsung dari aplikasi
  - Menggunakan database function untuk keamanan
  - Validasi password minimal 6 karakter
- 📌 Nomor versi ditampilkan di halaman login
  - Otomatis diambil dari package.json
  - Memudahkan tracking versi yang sedang digunakan
- 📝 Dokumentasi lengkap untuk versioning system
- 🔧 Script helper untuk bump version (`npm run version:patch/minor/major`)

### Fixed
- 🐛 Bug login error "Invalid login credentials" untuk user baru
  - Password sekarang tersimpan dengan benar di Supabase auth
  - Tambahan database function untuk update password
- 🔒 RLS policy untuk tabel profiles
  - User dapat membaca dan update profile mereka sendiri

### Changed
- 🔄 Improved user management workflow
  - Password field sekarang optional saat edit user
  - Notifikasi lebih informatif saat update password

### Documentation
- 📚 CARA_RESET_PASSWORD.md - Panduan lengkap reset password
- 📚 VERSIONING.md - Panduan versioning dan release management
- 📚 database_setup_password_update.sql - SQL setup untuk password update

---

## [1.5.2] - 2024-02-01

### Added
- ✨ Fitur Disposisi Surat
  - Create, read, update, delete disposisi
  - Linking disposisi dengan kegiatan/task
  - Audit trail untuk tracking perubahan
- 🔗 Linking System
  - Link surat dengan task/meeting
  - Link disposisi dengan kegiatan
  - Visual indicator untuk linked items

### Fixed
- 🐛 Bug duplicate notifications
- 🐛 Performance issue pada large dataset

---

## [1.5.1] - 2024-01-28

### Fixed
- 🐛 Various bug fixes and improvements
- 🎨 UI/UX improvements
- ⚡ Performance optimizations

---

## [1.5.0] - 2024-01-25

### Added
- 🎨 Major UI redesign
  - Modern and clean interface
  - Improved mobile responsiveness
  - Better color scheme and typography

### Changed
- 🔄 Refactored codebase structure
- 📦 Updated dependencies

---

## [1.4.0] - 2024-01-20

### Added
- ✨ Meeting management features
- 📅 Calendar view for meetings
- 🔔 Meeting notifications

---

## [1.3.0] - 2024-01-15

### Added
- ✨ Project management features
- 📊 Dashboard with statistics
- 👥 User management

---

## [1.2.0] - 2024-01-10

### Added
- ✨ Task management features
- 🏷️ Categories and priorities
- 💬 Comments system

---

## [1.1.0] - 2024-01-05

### Added
- 🔐 Authentication system
- 👤 User profiles
- 🎭 Role-based access control

---

## [1.0.0] - 2024-01-01

### Added
- 🎉 Initial release
- ✨ Basic task management
- 📝 Simple UI

---

## Version Format

- **[MAJOR.MINOR.PATCH]** - Release date

### Types of Changes
- `Added` ✨ - New features
- `Changed` 🔄 - Changes in existing functionality
- `Deprecated` ⚠️ - Soon-to-be removed features
- `Removed` 🗑️ - Removed features
- `Fixed` 🐛 - Bug fixes
- `Security` 🔒 - Security fixes

---

**Note:** Dates are in YYYY-MM-DD format. Versions follow [Semantic Versioning](https://semver.org/).
