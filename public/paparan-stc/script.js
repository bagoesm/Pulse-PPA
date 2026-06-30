/* ==========================================================================
   SAFE STORAGE HELPER (Prevents crashes when opened via file://)
   ========================================================================== */
const safeStorage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            // Fallback: do nothing
        }
    }
};

/* ==========================================================================
   SLIDE NAVIGATION ENGINE
   ========================================================================== */
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const navDots = document.querySelectorAll('.nav-dot');
const progressBar = document.getElementById('progressBar');
const currentSlideNum = document.getElementById('currentSlideNum');
const totalSlidesNum = document.getElementById('totalSlidesNum');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const totalSlides = slides.length;

// Initialize
function initSlides() {
    totalSlidesNum.textContent = String(totalSlides).padStart(2, '0');
    goToSlide(0);
}

function goToSlide(index) {
    if (index < 0 || index >= totalSlides) return;
    
    // Set classes for transitions
    slides.forEach((slide, i) => {
        slide.classList.remove('active', 'prev-slide', 'next-slide');
        if (i === index) {
            slide.classList.add('active');
        } else if (i < index) {
            slide.classList.add('prev-slide');
        } else {
            slide.classList.add('next-slide');
        }
    });

    // Update dots
    navDots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // Update progress bar
    const progress = (index / (totalSlides - 1)) * 100;
    progressBar.style.width = `${progress}%`;

    // Update slide numbers & buttons
    currentSlide = index;
    currentSlideNum.textContent = String(currentSlide + 1).padStart(2, '0');
    
    prevBtn.disabled = currentSlide === 0;
    nextBtn.disabled = currentSlide === totalSlides - 1;

    // Trigger animations based on active slide
    if (currentSlide === 0) {
        animateCounters();
    }
}

function nextSlide() {
    if (currentSlide < totalSlides - 1) {
        goToSlide(currentSlide + 1);
    }
}

function prevSlide() {
    if (currentSlide > 0) {
        goToSlide(currentSlide - 1);
    }
}

// Event Listeners for Nav Dots
navDots.forEach((dot) => {
    dot.addEventListener('click', () => {
        const slideIndex = parseInt(dot.getAttribute('data-slide'));
        goToSlide(slideIndex);
    });
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
        // Prevent default spacebar scrolling
        if (e.key === ' ') e.preventDefault();
        nextSlide();
    } else if (e.key === 'ArrowLeft') {
        prevSlide();
    }
});

// Touch Swipe Navigation for Mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        nextSlide(); // Swipe Left -> Next
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        prevSlide(); // Swipe Right -> Prev
    }
}

/* ==========================================================================
   THEME TOGGLE SYSTEM
   ========================================================================== */
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check local storage or system preference
const savedTheme = safeStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
} else {
    body.classList.add('dark-theme');
    body.classList.remove('light-theme');
}

themeToggle.addEventListener('click', () => {
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        safeStorage.setItem('theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        safeStorage.setItem('theme', 'dark');
    }
});

/* ==========================================================================
   COUNTER ANIMATION (SLIDE 1)
   ========================================================================== */
function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    const speed = 200; // The lower the slower

    counters.forEach(counter => {
        const updateCount = () => {
            const target = parseFloat(counter.getAttribute('data-target'));
            const count = parseFloat(counter.innerText);
            
            // For decimal targets (like 87.5)
            const isDecimal = target % 1 !== 0;
            const increment = target / speed;

            if (count < target) {
                const nextVal = count + increment;
                if (isDecimal) {
                    counter.innerText = (nextVal > target ? target : nextVal).toFixed(1);
                } else {
                    counter.innerText = Math.ceil(nextVal > target ? target : nextVal);
                }
                setTimeout(updateCount, 1);
            } else {
                counter.innerText = isDecimal ? target.toFixed(1) : target;
            }
        };
        
        counter.innerText = '0';
        updateCount();
    });
}

/* ==========================================================================
   INTERACTIVE SURVEY TABLE DATA & DETAIL DRAWER
   ========================================================================== */
const surveyData = {
    row1: {
        instansi: "ECPAT Indonesia",
        unitKerja: "Lembaga Non-Pemerintah",
        judul: "Layanan Pengaduan Eksploitasi Seksual pada Anak",
        responden: "Alfi Fadhillah",
        format: "Excel",
        cakupan: "Tingkat pusat",
        periode: "Data diupdate per bulan",
        catatan: "Tidak ada kendala yang dilaporkan. Data disampaikan menggunakan template Excel standar.",
        fStatus: "Sesuai (Ya)",
        lStatus: "Sesuai (Ya)",
        analisis: "Data sesuai dan relatif siap integrasi. Pola pemutakhiran bulanan yang cukup rutin mendukung keterkinian data dalam direktori secara konsisten."
    },
    row2: {
        instansi: "Kementerian Pendidikan Dasar dan Pendidikan Menengah",
        unitKerja: "Inspektorat Jenderal",
        judul: "Unit Layanan Terpadu",
        responden: "Fany Budiman",
        format: "Excel",
        cakupan: "Tingkat pusat",
        periode: "Data di update per bulan dari pusat, proses validasi memakan waktu lebih lama",
        catatan: "Proses verifikasi internal dan validasi berjenjang di tingkat kementerian membutuhkan waktu tambahan sebelum data siap diunggah.",
        fStatus: "Sesuai (Ya)",
        lStatus: "Sesuai (Ya)",
        analisis: "Data secara struktural sesuai. Namun, catatan mengenai lamanya proses validasi di pusat mengindikasikan perlunya koordinasi untuk menyederhanakan alur birokrasi update data."
    },
    row3: {
        instansi: "Kementerian Kependudukan dan Pembangunan Keluarga / BKKBN",
        unitKerja: "Direktorat Bina Ketahanan Keluarga Balita dan Anak",
        judul: "Pusat Pelayanan Keluarga Sejahtera (Satyagatra)",
        responden: "Intan Amanda",
        format: "Excel",
        cakupan: "Tingkat pusat, provinsi, kecamatan",
        periode: "Data diupdate setiap bulan di Aplikasi SIGA",
        catatan: "Data ditarik secara terpusat dari database Aplikasi SIGA (Sistem Informasi Keluarga) BKKBN.",
        fStatus: "Sesuai (Ya)",
        lStatus: "Sesuai (Ya)",
        analisis: "Sangat baik. Integrasi data memiliki cakupan wilayah yang lengkap (hingga tingkat kecamatan) dan didukung oleh sistem SIGA yang memutakhirkan data setiap bulan secara rutin."
    },
    row4: {
        instansi: "Kementerian Kependudukan dan Pembangunan Keluarga / BKKBN",
        unitKerja: "Direktorat Bina Ketahanan Keluarga Balita dan Anak",
        judul: "Aplikasi Taman Asuh Sayang Anak (TAMASYA)",
        responden: "Intan Amanda",
        format: "Lainnya (Aplikasi)",
        cakupan: "Tingkat pusat, provinsi, kecamatan",
        periode: "Data diupdate setiap bulan",
        catatan: "Data lokasi TPA (Tempat Penitipan Anak) yang tertera pada aplikasi.",
        fStatus: "Sesuai (Ya)",
        lStatus: "Sesuai (Ya)",
        analisis: "Data sesuai secara jenis layanan. Namun karena bersumber dari aplikasi (bukan file Excel murni), diperlukan modul penyeragaman format (parsing) agar data lokasi TPA dapat diekstrak dan disinkronkan secara otomatis ke Direktori PPA."
    },
    row5: {
        instansi: "Kementerian Kependudukan dan Pembangunan Keluarga / BKKBN",
        unitKerja: "Direktorat Bina Ketahanan Keluarga Balita dan Anak",
        judul: "Website Siap Nikah",
        responden: "Intan Amanda",
        format: "Excel",
        cakupan: "Tingkat pusat",
        periode: "Data diperbarui berkala (oleh Pihak Ketiga)",
        catatan: "Kendala operasional: Proses pembaruan konten dan data pada website dilakukan oleh pihak ketiga (vendor pengembang).",
        fStatus: "Sesuai (Ya)",
        lStatus: "Sesuai (Ya)",
        analisis: "Data sesuai secara format. Namun, ketergantungan pemeliharaan data pada pihak ketiga berisiko menimbulkan kelambatan (lag) informasi. Perlu didorong klausul SLA pembaruan data yang lebih ketat dengan vendor."
    },
    row6: {
        instansi: "Kementerian Kependudukan dan Pembangunan Keluarga / BKKBN",
        unitKerja: "Direktorat Bina Ketahanan Keluarga Balita dan Anak",
        judul: "Aplikasi Elsimil",
        responden: "Intan Amanda",
        format: "Excel",
        cakupan: "Tingkat pusat",
        periode: "Data diupdate per bulan",
        catatan: "Keterbatasan akses, sarana perangkat keras, dan kestabilan jaringan internet di beberapa daerah menghambat input data dari lapangan.",
        fStatus: "Sesuai (Ya)",
        lStatus: "Sesuai (Ya)",
        analisis: "Data tergolong sesuai. Namun, kendala infrastruktur internet di daerah berpotensi menurunkan akurasi data real-time. Perlu dipertimbangkan fitur input offline pada aplikasi lokal sebelum sinkronisasi ke pusat."
    },
    row7: {
        instansi: "Kementerian Kependudukan dan Pembangunan Keluarga / BKKBN",
        unitKerja: "Direktorat Bina Ketahanan Keluarga Balita dan Anak",
        judul: "Layanan Konsultasi Gratis - Halo GATI dan Halo Remaja",
        responden: "Intan Amanda",
        format: "Excel",
        cakupan: "Tingkat pusat",
        periode: "Data diakses maksimal 30 hari (memerlukan rekap manual)",
        catatan: "Data laporan transaksi hanya tersimpan aktif selama 30 hari di sistem; jika memerlukan data periode triwulan atau semester, petugas harus melakukan rekap manual.",
        fStatus: "Sesuai (Ya)",
        lStatus: "Sesuai (Ya)",
        analisis: "Data sesuai. Keterbatasan retensi data 30 hari dan keharusan rekap manual merupakan hambatan operasional serius. Sistem Direktori PPA sebaiknya menyediakan database historis untuk menampung data bulanan secara kumulatif."
    },
    row8: {
        instansi: "KemenPPPA",
        unitKerja: "Sekretariat KPAI (Komisi Perlindungan Anak Indonesia)",
        judul: "KPAD (Komisi Perlindungan Anak Daerah)",
        responden: "Afni Fahtima",
        format: "Excel",
        cakupan: "Tingkat provinsi",
        periode: "Data diperbarui secara berkala (tahunan)",
        catatan: "KPAD belum tercantum dalam daftar pilihan jenis layanan resmi yang tersedia pada formulir identifikasi.",
        fStatus: "Tidak Sesuai (Tidak)",
        lStatus: "Tidak Sesuai (Tidak)",
        analisis: "Ini adalah satu-satunya item yang dinilai tidak sesuai. Ketidaksesuaian bukan karena kesalahan pengisian, melainkan keterbatasan sistem acuan kita. Master referensi jenis layanan Direktori PPA wajib diperbarui agar mengakomodasi KPAD."
    }
};

/* ==========================================================================
   RECOMMENDATIONS CHECKLIST SYSTEM (SLIDE 8)
   ========================================================================== */
const recoCards = document.querySelectorAll('.reco-bento-card.clickable-card');
const checkedCountSpan = document.getElementById('checkedCount');
const recoProgressFill = document.getElementById('recoProgressFill');
const selectAllRecBtn = document.getElementById('selectAllRecBtn');
const resetRecBtn = document.getElementById('resetRecBtn');

function updateRecommendationProgress() {
    const total = recoCards.length;
    let checkedCount = 0;
    
    recoCards.forEach(card => {
        const statusBadge = card.querySelector('.reco-status-badge');
        if (card.classList.contains('approved')) {
            checkedCount++;
            if (statusBadge) {
                statusBadge.textContent = "Disetujui";
            }
        } else {
            if (statusBadge) {
                statusBadge.textContent = "Belum Disetujui";
            }
        }
    });

    checkedCountSpan.textContent = checkedCount;
    const progressPercent = (checkedCount / total) * 100;
    recoProgressFill.style.width = `${progressPercent}%`;

    // Toggle Buttons
    if (checkedCount === total) {
        selectAllRecBtn.classList.add('hidden');
        resetRecBtn.classList.remove('hidden');
    } else {
        selectAllRecBtn.classList.remove('hidden');
        resetRecBtn.classList.add('hidden');
    }

    // Save State
    const state = Array.from(recoCards).map(card => card.classList.contains('approved'));
    safeStorage.setItem('reco_state', JSON.stringify(state));
}

// Click Event Listeners for Cards
recoCards.forEach(card => {
    card.addEventListener('click', () => {
        card.classList.toggle('approved');
        updateRecommendationProgress();
    });
});

// Select All Button
selectAllRecBtn.addEventListener('click', () => {
    recoCards.forEach(card => card.classList.add('approved'));
    updateRecommendationProgress();
});

// Reset Button
resetRecBtn.addEventListener('click', () => {
    recoCards.forEach(card => card.classList.remove('approved'));
    updateRecommendationProgress();
});

// Load Recommendation State
function loadRecommendationState() {
    const savedState = safeStorage.getItem('reco_state');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            recoCards.forEach((card, idx) => {
                if (state[idx] !== undefined) {
                    if (state[idx]) {
                        card.classList.add('approved');
                    } else {
                        card.classList.remove('approved');
                    }
                }
            });
        } catch (e) {
            console.error("Error loading checklist state", e);
        }
    }
    updateRecommendationProgress();
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initSlides();
    loadRecommendationState();
});
