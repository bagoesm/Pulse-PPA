# Fitur Klik Card Dashboard

## Deskripsi
Fitur ini memungkinkan pengguna untuk mengklik card anggota tim di dashboard dan secara otomatis diarahkan ke halaman "Semua Task" dengan filter yang sudah diterapkan untuk menampilkan semua task milik orang tersebut.

## Cara Kerja

### 1. Visual Feedback
- Card anggota tim di dashboard sekarang memiliki efek hover yang menunjukkan bahwa card dapat diklik
- Saat hover, card akan:
  - Berubah warna border menjadi biru (gov-300)
  - Sedikit membesar (scale 1.02)
  - Menampilkan icon mata (Eye) di pojok kanan atas
  - Menampilkan text "Klik untuk lihat task" di bagian bawah card
- Tooltip menampilkan informasi lengkap: nama, jumlah task aktif, dan task selesai

### 2. Fungsi Klik
Ketika card diklik:
1. Aplikasi otomatis beralih ke tab "Semua Task"
2. Filter PIC (Person In Charge) diset ke nama orang yang cardnya diklik
3. Filter lainnya direset ke "All" untuk menampilkan semua task orang tersebut
4. Navigasi langsung tanpa popup atau notifikasi

### 3. Implementasi Teknis

#### Dashboard.tsx
- Menambahkan prop `onUserCardClick?: (userName: string) => void`
- Menambahkan event handler `onClick` pada card container
- Menambahkan styling untuk hover effects dan visual feedback

#### App.tsx
- Menambahkan fungsi `handleUserCardClick(userName: string)`
- Fungsi ini mengubah `activeTab` ke "Semua Task"
- Mengupdate state `filters` untuk menampilkan task orang yang dipilih
- Navigasi langsung tanpa notifikasi

### 4. User Experience
- **Intuitif**: Visual feedback yang jelas menunjukkan card dapat diklik
- **Responsif**: Transisi yang smooth dan navigasi langsung
- **Seamless**: Langsung ke halaman task tanpa popup atau gangguan
- **Fleksibel**: Pengguna dapat mengubah filter lagi setelah klik card

## Contoh Penggunaan
1. Buka halaman Dashboard
2. Lihat card anggota tim
3. Hover mouse ke card untuk melihat efek visual
4. Klik card untuk langsung melihat semua task orang tersebut
5. Aplikasi otomatis pindah ke "Semua Task" dengan filter yang sudah diterapkan

## Manfaat
- **Efisiensi**: Akses cepat ke task spesifik anggota tim
- **Navigasi Intuitif**: Tidak perlu manual mengatur filter
- **Monitoring Tim**: Mudah melihat beban kerja individual
- **User-Friendly**: Interface yang responsif dan navigasi seamless