# Sistem Manajemen Kategori & Sub Kategori

## Overview
Sistem ini memungkinkan Super Admin untuk mengelola kategori dan sub kategori secara dinamis melalui interface web, dengan data tersimpan di database Supabase. Sistem terintegrasi dengan UserManagement dan AddTaskModal untuk pengalaman yang seamless.

## Fitur

### 1. Manajemen Kategori Utama
- **View Kategori**: Melihat semua kategori dengan icon dan warna
- **Hapus Kategori**: Menghapus kategori dan semua sub kategori terkait
- **Urutan Display**: Otomatis berdasarkan urutan pembuatan

### 2. Manajemen Sub Kategori  
- **View Sub Kategori**: Melihat semua sub kategori dengan kategori induknya
- **Hapus Sub Kategori**: Menghapus sub kategori
- **Relasi**: Setiap sub kategori terhubung ke satu kategori induk

### 3. Integrasi AddTaskModal
- **Dropdown Dinamis**: Kategori dan sub kategori otomatis tersedia dari database
- **Filter Sub Kategori**: Sub kategori difilter berdasarkan kategori yang dipilih
- **Fallback System**: Tetap support sistem lama jika data dinamis belum tersedia

## Struktur Database

### Tabel `master_categories`
```sql
- id (UUID, Primary Key)
- name (TEXT, Unique)
- icon (TEXT) - Nama icon Lucide React
- color (TEXT) - Hex color code
- display_order (INTEGER)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabel `master_sub_categories` (Updated)
```sql
- id (UUID, Primary Key)
- name (TEXT)
- category_id (UUID, Foreign Key ke master_categories)
- display_order (INTEGER)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Cara Penggunaan

### 1. Setup Database
1. Jalankan script `category_management_migration.sql` di Supabase SQL Editor
2. Script akan membuat tabel dan mengisi data default

### 2. Akses Interface
1. Login sebagai Super Admin
2. Klik menu "Master Data User" di sidebar
3. Pilih tab "Master Kategori"

### 3. Mengelola Kategori
- **View**: Lihat semua kategori dengan icon dan warna
- **Hapus**: Klik icon Trash, konfirmasi penghapusan

### 4. Mengelola Sub Kategori  
- **View**: Lihat semua sub kategori dengan kategori induknya
- **Hapus**: Klik icon Trash, konfirmasi penghapusan

### 5. Menambah Data Baru
- Untuk menambah kategori/sub kategori baru, gunakan SQL Editor di Supabase
- Atau hubungi developer untuk menambahkan interface CRUD lengkap

## Icon Options
Icon yang tersedia (Lucide React):
- Code, FileText, Users, HelpingHand, GraduationCap
- Inbox, Forward, FolderOpen, Activity, MoreHorizontal
- Folder, Tag, Settings, Database, Globe

## Color Options
Warna yang tersedia:
- #3B82F6 (Blue), #10B981 (Green), #8B5CF6 (Purple)
- #F59E0B (Orange), #EF4444 (Red), #06B6D4 (Cyan)
- #84CC16 (Lime), #6B7280 (Gray), #EC4899 (Pink), #64748B (Slate)

## Integrasi dengan Task Management

### Penggunaan di AddTaskModal
- **Dropdown Dinamis**: Kategori dari database `master_categories` 
- **Filter Sub Kategori**: Sub kategori difilter berdasarkan `category_id`
- **Fallback System**: Jika data dinamis kosong, gunakan enum Category lama
- **Real-time**: Perubahan di Master Data langsung terlihat di form task

### Migrasi Data Existing
- Task existing tetap menggunakan enum Category lama
- Sistem baru berjalan paralel dengan sistem lama  
- AddTaskModal support kedua sistem secara bersamaan
- Migrasi bertahap bisa dilakukan kemudian

### Struktur Data
```javascript
// Kategori dinamis dari database
masterCategories = [
  { id: 'uuid', name: 'Pengembangan Aplikasi', icon: 'Code', color: '#3B82F6' }
]

// Sub kategori dinamis dari database  
masterSubCategories = [
  { id: 'uuid', name: 'UI/UX Design', category_id: 'parent-uuid' }
]
```

## Keamanan
- Hanya Super Admin yang bisa mengakses interface
- Validasi input di frontend dan backend
- Cascade delete untuk menjaga integritas data

## Troubleshooting

### Error "Bucket not found"
- Pastikan bucket 'document-templates' sudah dibuat di Supabase Storage

### Error "Row-level security policy"
- Set RLS policy untuk tabel master_categories dan master_sub_categories
- Atau disable RLS untuk development

### Sub kategori tidak muncul
- Pastikan category_id terisi dengan benar
- Cek relasi foreign key di database