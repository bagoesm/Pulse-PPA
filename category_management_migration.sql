-- Migration untuk sistem manajemen kategori dan subkategori dinamis
-- Jalankan query ini di Supabase SQL Editor

-- Tabel untuk kategori utama
CREATE TABLE IF NOT EXISTS master_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT, -- Icon name untuk UI
    color TEXT, -- Color theme untuk kategori
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update tabel master_sub_categories untuk menambahkan relasi ke kategori
ALTER TABLE master_sub_categories 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES master_categories(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Jika belum ada primary key, tambahkan
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'master_sub_categories' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE master_sub_categories ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Insert kategori default (sesuai enum yang ada)
INSERT INTO master_categories (name, icon, color, display_order) VALUES
('Pengembangan Aplikasi', 'Code', '#3B82F6', 1),
('Surat & Dokumen', 'FileText', '#10B981', 2),
('Audiensi/Rapat', 'Users', '#8B5CF6', 3),
('Asistensi', 'HelpingHand', '#F59E0B', 4),
('Bimtek', 'GraduationCap', '#EF4444', 5),
('Permintaan Satker', 'Inbox', '#06B6D4', 6),
('Tindak Lanjut', 'Forward', '#84CC16', 7),
('Administrasi', 'FolderOpen', '#6B7280', 8),
('Monitoring', 'Activity', '#EC4899', 9),
('Lainnya', 'MoreHorizontal', '#64748B', 10)
ON CONFLICT (name) DO NOTHING;

-- Insert subkategori default untuk Pengembangan Aplikasi
DO $$
DECLARE
    dev_category_id UUID;
BEGIN
    SELECT id INTO dev_category_id FROM master_categories WHERE name = 'Pengembangan Aplikasi';
    
    IF dev_category_id IS NOT NULL THEN
        INSERT INTO master_sub_categories (name, category_id, display_order) VALUES
        ('UI/UX Design', dev_category_id, 1),
        ('Fitur Baru', dev_category_id, 2),
        ('Backend', dev_category_id, 3),
        ('Frontend', dev_category_id, 4),
        ('QA & Pengujian', dev_category_id, 5),
        ('Dokumentasi', dev_category_id, 6)
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;

-- Tabel junction untuk many-to-many relationship kategori dan sub kategori
CREATE TABLE IF NOT EXISTS category_subcategory_relations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES master_categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES master_sub_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, subcategory_id)
);

-- Update existing tasks untuk menggunakan kategori ID (opsional, bisa dijalankan nanti)
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES master_categories(id);
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sub_category_id UUID REFERENCES master_sub_categories(id);