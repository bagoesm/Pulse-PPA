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

    // Update feedback form if open
    if (typeof updateFormSlideDisplay === 'function') {
        updateFormSlideDisplay();
    }

    // Send message to parent window if inside iframe
    if (window.parent && window.parent !== window) {
        const activeDot = document.querySelector(`.nav-dot[data-slide="${index}"]`);
        const slideTitle = activeDot ? activeDot.getAttribute('title') : `Slide ${index + 1}`;
        window.parent.postMessage({
            type: 'SLIDE_CHANGED',
            slideIndex: index,
            slideTitle: slideTitle
        }, '*');
    }

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
    const isPdfMode = document.body.classList.contains('pdf-export-mode');

    counters.forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-target'));
        const isDecimal = target % 1 !== 0;

        if (isPdfMode) {
            // Set directly to target value without animation during PDF export
            counter.innerText = isDecimal ? target.toFixed(1) : target;
            return;
        }

        const updateCount = () => {
            const count = parseFloat(counter.innerText);
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
    initFeedbackSystem();
    
    // Download PDF Button Click Listener
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', generatePdfFromSlides);
    }
});

/* ==========================================================================
   SCREEN-CAPTURE PDF GENERATOR (PIXEL-PERFECT 16:9)
   ========================================================================== */
async function generatePdfFromSlides() {
    const overlay = document.getElementById('pdfLoadingOverlay');
    if (overlay) overlay.style.display = 'flex';

    // Disable all animations during export to force immediate visibility
    document.body.classList.add('pdf-export-mode');

    // Hide UI Controls temporarily
    const topBar = document.querySelector('.top-bar');
    const sidebarNav = document.querySelector('.sidebar-nav');
    const bottomControls = document.querySelector('.bottom-controls');
    const feedbackTriggerBtn = document.getElementById('feedbackTriggerBtn');

    if (topBar) topBar.style.display = 'none';
    if (sidebarNav) sidebarNav.style.display = 'none';
    if (bottomControls) bottomControls.style.display = 'none';
    if (feedbackTriggerBtn) feedbackTriggerBtn.style.display = 'none';

    const originalSlide = currentSlide;
    const { jsPDF } = window.jspdf;
    
    // Lock PDF page size to standard 16:9 widescreen dimensions (Full HD)
    const pdfWidth = 1920;
    const pdfHeight = 1080;

    // Initialize landscape PDF with standard 16:9 size
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
    });

    try {
        for (let i = 0; i < totalSlides; i++) {
            goToSlide(i);
            // Wait a tiny moment for the slide swap to settle (no animation wait needed!)
            await new Promise(resolve => setTimeout(resolve, 250));

            // Capture the entire screen
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                scale: 2, // Double resolution for crystal clear text (prevents blurriness)
                logging: false,
                backgroundColor: '#0f172a' // Match dark theme background
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.85); // High quality (85%) for sharp text and optimized size

            if (i > 0) {
                pdf.addPage([pdfWidth, pdfHeight], 'landscape');
            }

            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        // Save PDF file
        pdf.save('Analisis_Hasil_Survey_PPA.pdf');
    } catch (err) {
        console.error("Gagal membuat PDF:", err);
        alert("Gagal membuat PDF: " + err.message);
    } finally {
        // Restore original slide, remove export class, and show UI controls again
        goToSlide(originalSlide);
        document.body.classList.remove('pdf-export-mode');
        if (topBar) topBar.style.display = '';
        if (sidebarNav) sidebarNav.style.display = '';
        if (bottomControls) bottomControls.style.display = '';
        if (feedbackTriggerBtn) feedbackTriggerBtn.style.display = '';
        if (overlay) overlay.style.display = 'none';
    }
}

/* ==========================================================================
   FEEDBACK & COMMENTS ENGINE (SUPABASE)
   ========================================================================== */
const slideTitles = [
    "Halaman Utama",
    "Ringkasan Eksekutif",
    "Gambaran Umum",
    "Hasil Survey (1)",
    "Hasil Survey (2)",
    "Analisis Tematik",
    "Masukan Tambahan",
    "Rekomendasi",
    "Terima Kasih"
];

let supabaseClient = null;
let updateFormSlideDisplay = null;

function initFeedbackSystem() {
    // 1. Initialize Supabase Client
    const supabaseUrl = 'https://klesjialuuacvzijzgbt.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsZXNqaWFsdXVhY3Z6aWp6Z2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTAxNzUsImV4cCI6MjA4MTEyNjE3NX0.CATbY68wKsepTxU96Q8oX3lGDV-c1VqA5WxJHmEVZhE';
    
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    } else {
        console.error("Supabase CDN failed to load!");
    }

    // 2. DOM Elements
    const feedbackTriggerBtn = document.getElementById('feedbackTriggerBtn');
    const feedbackDrawer = document.getElementById('feedbackDrawer');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerOverlay = document.getElementById('drawerOverlay');
    
    const tabLogBtn = document.getElementById('tabLogBtn');
    const tabListBtn = document.getElementById('tabListBtn');
    const tabLogContent = document.getElementById('tabLogContent');
    const tabListContent = document.getElementById('tabListContent');
    
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackAuthor = document.getElementById('feedbackAuthor');
    const feedbackText = document.getElementById('feedbackText');
    const formSlideVal = document.getElementById('formSlideVal');
    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    
    const filterAllBtn = document.getElementById('filterAllBtn');
    const filterCurrentBtn = document.getElementById('filterCurrentBtn');
    const notesListContainer = document.getElementById('notesListContainer');
    const notesCountText = document.getElementById('notesCountText');
    const feedbackBadgeCount = document.getElementById('feedbackBadgeCount');

    let currentFilter = 'all'; // 'all' or 'current'
    let allNotes = [];

    // 3. Toggle Drawer
    feedbackTriggerBtn.addEventListener('click', () => {
        feedbackDrawer.classList.add('open');
        updateFormSlideDisplay();
        fetchNotes();
    });

    const closeDrawer = () => {
        feedbackDrawer.classList.remove('open');
    };

    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    // 4. Tab Switching
    tabLogBtn.addEventListener('click', () => {
        tabLogBtn.classList.add('active');
        tabListBtn.classList.remove('active');
        tabLogContent.classList.add('active');
        tabListContent.classList.remove('active');
    });

    tabListBtn.addEventListener('click', () => {
        tabListBtn.classList.add('active');
        tabLogBtn.classList.remove('active');
        tabListContent.classList.add('active');
        tabLogContent.classList.remove('active');
        fetchNotes();
    });

    // 5. Update Slide Display
    updateFormSlideDisplay = function() {
        if (formSlideVal) {
            const numStr = String(currentSlide + 1).padStart(2, '0');
            const title = slideTitles[currentSlide] || `Slide ${currentSlide + 1}`;
            formSlideVal.textContent = `${numStr} - ${title}`;
        }
    };

    // 6. Submit Comment
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const author = feedbackAuthor.value.trim() || 'Anonim';
        const content = feedbackText.value.trim();
        if (!content) return;

        submitFeedbackBtn.disabled = true;
        submitFeedbackBtn.textContent = "Menyimpan...";

        const slideIndex = currentSlide;
        const slideTitle = slideTitles[slideIndex] || `Slide ${slideIndex + 1}`;

        if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('presentation_notes')
                    .insert([
                        {
                            slide_index: slideIndex,
                            slide_title: slideTitle,
                            content: content,
                            author: author,
                            is_resolved: false,
                            project_id: 'STC'
                        }
                    ]);

                if (error) throw error;

                // Success
                feedbackText.value = '';
                // Switch to list tab
                tabListBtn.click();
            } catch (err) {
                console.error("Gagal menyimpan ke Supabase, simpan ke LocalStorage:", err);
                saveToLocalStorage(slideIndex, slideTitle, content, author);
            }
        } else {
            saveToLocalStorage(slideIndex, slideTitle, content, author);
        }

        submitFeedbackBtn.disabled = false;
        submitFeedbackBtn.textContent = "Simpan Catatan";
    });

    // Helper: LocalStorage Fallback
    function saveToLocalStorage(slideIndex, slideTitle, content, author) {
        const localNote = {
            id: 'local_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
            created_at: new Date().toISOString(),
            slide_index: slideIndex,
            slide_title: slideTitle,
            content: content,
            author: author,
            is_resolved: false,
            project_id: 'STC'
        };

        let localNotes = [];
        const saved = localStorage.getItem('pulse_presentation_notes_stc');
        if (saved) {
            try { localNotes = JSON.parse(saved); } catch (e) {}
        }
        localNotes.push(localNote);
        localStorage.setItem('pulse_presentation_notes_stc', JSON.stringify(localNotes));

        feedbackText.value = '';
        tabListBtn.click();
    }

    // 7. Fetch Comments
    async function fetchNotes() {
        notesListContainer.innerHTML = '<div class="loading-notes">Memuat catatan...</div>';
        let notes = [];

        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('presentation_notes')
                    .select('*')
                    .eq('project_id', 'STC')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                notes = data || [];
            } catch (err) {
                console.warn("Gagal fetch dari Supabase, baca dari LocalStorage:", err);
                notes = getLocalStorageNotes();
            }
        } else {
            notes = getLocalStorageNotes();
        }

        allNotes = notes;
        renderNotes();
    }

    function getLocalStorageNotes() {
        const saved = localStorage.getItem('pulse_presentation_notes_stc');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    // 8. Render Comments
    function renderNotes() {
        let filtered = allNotes;
        if (currentFilter === 'current') {
            filtered = allNotes.filter(n => n.slide_index === currentSlide);
        }

        // Update counts
        const unresolvedCount = allNotes.filter(n => !n.is_resolved).length;
        notesCountText.textContent = allNotes.length;
        
        if (unresolvedCount > 0) {
            feedbackBadgeCount.textContent = unresolvedCount;
            feedbackBadgeCount.style.display = 'flex';
        } else {
            feedbackBadgeCount.style.display = 'none';
        }

        if (filtered.length === 0) {
            notesListContainer.innerHTML = `
                <div class="empty-notes">
                    <p>Tidak ada catatan.</p>
                    <p style="font-size:0.75rem; color:#475569; margin-top:0.25rem;">
                        ${currentFilter === 'current' ? 'Tulis catatan pertama untuk slide ini!' : 'Tulis catatan masukan di tab sebelah.'}
                    </p>
                </div>
            `;
            return;
        }

        notesListContainer.innerHTML = '';
        filtered.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-card ${note.is_resolved ? 'resolved' : ''}`;
            
            const formattedDate = new Date(note.created_at).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });

            card.innerHTML = `
                <div class="note-card-header">
                    <div>
                        <span class="note-card-slide-badge">Slide ${note.slide_index + 1}</span>
                        <div class="note-card-meta">
                            <span class="note-card-author">${note.author}</span>
                            <span>•</span>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                    <button class="note-delete-btn" data-id="${note.id}" title="Hapus Catatan">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
                <div class="note-card-body">${escapeHTML(note.content)}</div>
            `;

            // Delete event listener
            card.querySelector('.note-delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const noteId = e.currentTarget.getAttribute('data-id');
                if (confirm("Hapus catatan ini?")) {
                    await deleteNote(noteId);
                }
            });

            notesListContainer.appendChild(card);
        });
    }

    // 9. Delete Comment
    async function deleteNote(noteId) {
        if (noteId.startsWith('local_')) {
            let localNotes = getLocalStorageNotes();
            localNotes = localNotes.filter(n => n.id !== noteId);
            localStorage.setItem('pulse_presentation_notes_stc', JSON.stringify(localNotes));
            allNotes = localNotes;
            renderNotes();
        } else if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('presentation_notes')
                    .delete()
                    .eq('id', noteId);

                if (error) throw error;
                allNotes = allNotes.filter(n => n.id !== noteId);
                renderNotes();
            } catch (err) {
                alert("Gagal menghapus dari server: " + err.message);
            }
        }
    }

    // 10. Filters Event Listeners
    filterAllBtn.addEventListener('click', () => {
        filterAllBtn.classList.add('active');
        filterCurrentBtn.classList.remove('active');
        currentFilter = 'all';
        renderNotes();
    });

    filterCurrentBtn.addEventListener('click', () => {
        filterCurrentBtn.classList.add('active');
        filterAllBtn.classList.remove('active');
        currentFilter = 'current';
        renderNotes();
    });

    // Initial Badge Count Load
    fetchBadgeCountOnly();
    async function fetchBadgeCountOnly() {
        let notes = [];
        if (supabaseClient) {
            try {
                const { data } = await supabaseClient
                    .from('presentation_notes')
                    .select('id, is_resolved')
                    .eq('project_id', 'STC');
                notes = data || [];
            } catch (e) {
                notes = getLocalStorageNotes();
            }
        } else {
            notes = getLocalStorageNotes();
        }
        const unresolvedCount = notes.filter(n => !n.is_resolved).length;
        if (unresolvedCount > 0) {
            feedbackBadgeCount.textContent = unresolvedCount;
            feedbackBadgeCount.style.display = 'flex';
        }
    }
}

// Utility to escape HTML
function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
