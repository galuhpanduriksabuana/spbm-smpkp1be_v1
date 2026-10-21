/**
 * SPMB SMP KP 1 BALEENDAH - Frontend Application Script
 */

// Store registration data in memory for PDF printing
let lastRegistrationData = null;

document.addEventListener('DOMContentLoaded', function () {
    initNavbar();
    initRegistrationForm();
    initStatusCheck();
    initGallery();
});

/* ==========================================================================
   1. NAVBAR & NAVIGATION
   ========================================================================== */
function initNavbar() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navbar = document.querySelector('.navbar');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close mobile menu on link click
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }

    // Scroll effect
    if (navbar) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        }
    }
}

/* ==========================================================================
   2. REGISTRATION FORM (pendaftaran.html)
   ========================================================================== */
let currentStep = 1;
const uploadedFiles = {
    'Foto Siswa': null,
    'Kartu Keluarga': null,
    'Akta Kelahiran': null
};

function initRegistrationForm() {
    const regForm = document.getElementById('registrationForm');
    if (!regForm) return;

    // File upload triggers & drag-and-drop
    setupFileUpload('uploadFoto', 'foto_siswa', 'previewFoto', 'Foto Siswa');
    setupFileUpload('uploadKK', 'kartu_keluarga', 'previewKK', 'Kartu Keluarga');
    setupFileUpload('uploadAkta', 'akta_kelahiran', 'previewAkta', 'Akta Kelahiran');

    // Form submit
    regForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate final step files
        if (!uploadedFiles['Foto Siswa']) {
            alert('Silakan upload Pas Foto 3x4.');
            return;
        }
        if (!uploadedFiles['Kartu Keluarga']) {
            alert('Silakan upload Kartu Keluarga.');
            return;
        }
        if (!uploadedFiles['Akta Kelahiran']) {
            alert('Silakan upload Akta Kelahiran.');
            return;
        }

        const btnSubmit = document.getElementById('btnSubmit');
        const originalBtnHtml = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim Data...';

        try {
            // Collect all form values
            const formData = new FormData(regForm);
            const payload = {};

            // Backend expected keys
            payload['Nama Lengkap'] = (formData.get('Nama Lengkap') || '').toString().trim();
            payload['NIK'] = (formData.get('NIK') || '').toString().trim();
            payload['Tempat Lahir'] = (formData.get('Tempat Lahir') || '').toString().trim();
            payload['Tanggal Lahir'] = (formData.get('Tanggal Lahir') || '').toString().trim();
            payload['Jenis Kelamin'] = (formData.get('Jenis Kelamin') || '').toString().trim();
            payload['Alamat'] = (formData.get('Alamat') || '').toString().trim();
            payload['Nama Orang Tua'] = (formData.get('Nama Orang Tua') || '').toString().trim();
            payload['No HP'] = (formData.get('No HP') || '').toString().trim();

            // Include base64 files
            payload['Foto Siswa'] = uploadedFiles['Foto Siswa'];
            payload['Kartu Keluarga'] = uploadedFiles['Kartu Keluarga'];
            payload['Akta Kelahiran'] = uploadedFiles['Akta Kelahiran'];

            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload),
                redirect: 'follow'
            });

            const result = await response.json();

            if (result.status === 'success') {
                payload['No Pendaftaran'] = result.noPendaftaran;
                payload['Timestamp'] = new Date().toISOString();
                lastRegistrationData = payload;

                // Show success screen
                regForm.style.display = 'none';
                const stepIndicator = document.getElementById('stepIndicator');
                if (stepIndicator) stepIndicator.style.display = 'none';

                const successSec = document.getElementById('successSection');
                const noPendDisp = document.getElementById('noPendaftaranDisplay');
                if (noPendDisp) noPendDisp.textContent = result.noPendaftaran;
                if (successSec) {
                    successSec.style.display = 'block';
                    successSec.scrollIntoView({ behavior: 'smooth' });
                }
            } else {
                alert('Gagal mengirim pendaftaran: ' + (result.message || 'Terjadi kesalahan sistem'));
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Terjadi kesalahan koneksi saat mengirim formulir. Pastikan internet stabil dan coba lagi.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnHtml;
        }
    });
}

// Global step navigation functions
window.nextStep = function (current) {
    if (!validateStep(current)) return;

    const currentStepEl = document.getElementById('step' + current);
    const nextStepEl = document.getElementById('step' + (current + 1));

    if (currentStepEl && nextStepEl) {
        currentStepEl.classList.remove('active');
        nextStepEl.classList.add('active');
        updateStepIndicator(current + 1);
        window.scrollTo({ top: 150, behavior: 'smooth' });
    }
};

window.prevStep = function (current) {
    const currentStepEl = document.getElementById('step' + current);
    const prevStepEl = document.getElementById('step' + (current - 1));

    if (currentStepEl && prevStepEl) {
        currentStepEl.classList.remove('active');
        prevStepEl.classList.add('active');
        updateStepIndicator(current - 1);
        window.scrollTo({ top: 150, behavior: 'smooth' });
    }
};

function validateStep(step) {
    if (step === 1) {
        const nama = document.getElementById('nama_lengkap');
        const nik = document.getElementById('nik');
        const tempat = document.getElementById('tempat_lahir');
        const tanggal = document.getElementById('tanggal_lahir');
        const jk = document.getElementById('jenis_kelamin');
        const alamat = document.getElementById('alamat');

        if (!nama.value.trim()) { alert('Silakan isi Nama Lengkap.'); nama.focus(); return false; }
        if (!nik.value.trim() || !/^\d{16}$/.test(nik.value.trim())) {
            alert('NIK harus berupa 16 digit angka.'); nik.focus(); return false;
        }
        if (!tempat.value.trim()) { alert('Silakan isi Tempat Lahir.'); tempat.focus(); return false; }
        if (!tanggal.value.trim()) { alert('Silakan pilih Tanggal Lahir.'); tanggal.focus(); return false; }
        if (!jk.value) { alert('Silakan pilih Jenis Kelamin.'); jk.focus(); return false; }
        if (!alamat.value.trim()) { alert('Silakan isi Alamat Lengkap.'); alamat.focus(); return false; }
    } else if (step === 2) {
        const ortu = document.getElementById('nama_ortu');
        const hp = document.getElementById('no_hp');

        if (!ortu.value.trim()) { alert('Silakan isi Nama Orang Tua/Wali.'); ortu.focus(); return false; }
        if (!hp.value.trim()) { alert('Silakan isi Nomor WhatsApp.'); hp.focus(); return false; }
    }
    return true;
}

function updateStepIndicator(targetStep) {
    currentStep = targetStep;
    const steps = document.querySelectorAll('.step-indicator .step');
    steps.forEach(stepEl => {
        const s = parseInt(stepEl.getAttribute('data-step'), 10);
        stepEl.classList.remove('active', 'completed');
        if (s === targetStep) {
            stepEl.classList.add('active');
        } else if (s < targetStep) {
            stepEl.classList.add('completed');
        }
    });
}

function setupFileUpload(areaId, inputId, previewId, fieldKey) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    if (!area || !input) return;

    area.addEventListener('click', () => input.click());

    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });

    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });

    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0], input, preview, fieldKey);
        }
    });

    input.addEventListener('change', () => {
        if (input.files && input.files[0]) {
            handleFile(input.files[0], input, preview, fieldKey);
        }
    });
}

function handleFile(file, input, preview, fieldKey) {
    if (file.size > 2 * 1024 * 1024) {
        alert(`Ukuran file "${file.name}" melebihi batas 2MB.`);
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Data = e.target.result;
        uploadedFiles[fieldKey] = base64Data;

        if (preview) {
            const isImage = file.type.startsWith('image/');
            preview.style.display = 'flex';
            preview.innerHTML = `
                <div style="display:flex;align-items:center;gap:12px;width:100%;background:#f0f4ff;padding:10px 14px;border-radius:10px;">
                    <i class="${isImage ? 'fas fa-image' : 'fas fa-file-pdf'}" style="font-size:24px;color:var(--primary);"></i>
                    <div style="flex:1;text-align:left;overflow:hidden;">
                        <strong style="display:block;font-size:13px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">${file.name}</strong>
                        <small style="color:#666;">${(file.size / 1024).toFixed(1)} KB</small>
                    </div>
                    <span style="color:var(--success);font-size:18px;"><i class="fas fa-check-circle"></i></span>
                </div>
            `;
        }
    };
    reader.readAsDataURL(file);
}

// Generate PDF Bukti Pendaftaran
window.cetakBuktiPendaftaran = function (dataOverride) {
    const data = dataOverride || lastRegistrationData;
    if (!data) {
        alert('Data pendaftaran tidak tersedia untuk dicetak.');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('Library PDF belum siap. Silakan muat ulang halaman.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const primaryColor = [67, 97, 238];
    const darkColor = [26, 26, 46];

    // Header Band
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 32, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(CONFIG.SCHOOL_NAME || 'SMP KP 1 BALEENDAH', 105, 14, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('BUKTI PENDAFTARAN SPMB ONLINE TAHUN AJARAN 2025/2026', 105, 22, { align: 'center' });

    // Card Box
    doc.setDrawColor(220, 225, 240);
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(15, 40, 180, 26, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 120);
    doc.text('Nomor Pendaftaran:', 22, 50);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(data['No Pendaftaran'] || '-', 22, 59);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 120);
    doc.setFont('helvetica', 'normal');
    doc.text('Tanggal Cetak:', 130, 50);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), 130, 58);

    // Section Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('DATA CALON SISWA', 15, 76);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, 78, 195, 78);

    // Fields Table
    const fields = [
        ['Nama Lengkap', data['Nama Lengkap'] || '-'],
        ['NIK', data['NIK'] || '-'],
        ['Tempat, Tanggal Lahir', `${data['Tempat Lahir'] || '-'}, ${data['Tanggal Lahir'] || '-'}`],
        ['Jenis Kelamin', data['Jenis Kelamin'] || '-'],
        ['Alamat Lengkap', data['Alamat'] || '-'],
        ['Nama Orang Tua / Wali', data['Nama Orang Tua'] || '-'],
        ['No. WhatsApp / HP', data['No HP'] || '-'],
        ['Status Pendaftaran', data['Status'] || 'Proses']
    ];

    let currentY = 86;
    doc.setFontSize(10);

    fields.forEach(([label, val], idx) => {
        // Alternating row background
        if (idx % 2 === 0) {
            doc.setFillColor(245, 247, 252);
            doc.rect(15, currentY - 5, 180, 8, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(70, 70, 90);
        doc.text(label, 20, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkColor);

        // Wrap long text if address
        if (label === 'Alamat Lengkap' && val.length > 50) {
            const splitVal = doc.splitTextToSize(val, 110);
            doc.text(splitVal, 80, currentY);
            currentY += (splitVal.length - 1) * 5;
        } else {
            doc.text(val, 80, currentY);
        }

        currentY += 8;
    });

    // Important Notice Box
    currentY += 8;
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(15, currentY, 180, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text('PENTING / PERHATIAN:', 20, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('1. Simpan lembar bukti pendaftaran ini sebagai tanda bukti resmi pendaftaran online Anda.', 20, currentY + 13);
    doc.text('2. Cek status hasil seleksi secara berkala melalui menu "Cek Status" di website resmi.', 20, currentY + 18);
    doc.text('3. Bawa cetakan bukti ini beserta dokumen asli saat jadwal verifikasi fisik / daftar ulang.', 20, currentY + 23);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 160);
    doc.text(`Dicetak secara otomatis oleh Sistem SPMB ${CONFIG.SCHOOL_NAME || 'SMP KP 1 BALEENDAH'}`, 105, 285, { align: 'center' });

    // Download PDF
    const filename = `Bukti_Pendaftaran_${data['No Pendaftaran'] || 'SPMB'}.pdf`;
    doc.save(filename);
};

/* ==========================================================================
   3. STATUS CHECK (cek-status.html)
   ========================================================================== */
function initStatusCheck() {
    const statusForm = document.getElementById('statusForm');
    if (!statusForm) return;

    statusForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const input = document.getElementById('noPendaftaranInput');
        const noPendaftaran = input.value.trim();
        if (!noPendaftaran) return;

        const loading = document.getElementById('statusLoading');
        const resultSec = document.getElementById('statusResult');
        const errorSec = document.getElementById('statusError');
        const btnCek = document.getElementById('btnCekStatus');

        // Hide old results
        if (resultSec) resultSec.style.display = 'none';
        if (errorSec) errorSec.style.display = 'none';
        if (loading) loading.style.display = 'flex';
        if (btnCek) btnCek.disabled = true;

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'checkStatus',
                    noPendaftaran: noPendaftaran
                }),
                redirect: 'follow'
            });

            const result = await response.json();

            if (result.status === 'success' && result.data) {
                const data = result.data;
                displayStatusResult(data);
            } else {
                displayStatusError(result.message || 'Nomor pendaftaran tidak ditemukan.');
            }
        } catch (error) {
            console.error('Check status error:', error);
            displayStatusError('Gagal menghubungi server backend. Cek koneksi internet Anda.');
        } finally {
            if (loading) loading.style.display = 'none';
            if (btnCek) btnCek.disabled = false;
        }
    });
}

function displayStatusResult(data) {
    const resultSec = document.getElementById('statusResult');
    const iconEl = document.getElementById('statusIcon');
    const badgeEl = document.getElementById('statusBadge');
    const namaEl = document.getElementById('resultNama');
    const noPendEl = document.getElementById('resultNoPendaftaran');
    const statusValEl = document.getElementById('resultStatus');
    const actionsEl = document.getElementById('statusActions');

    if (!resultSec) return;

    const status = data.status || 'Proses';
    let icon = '⏳';
    let badgeClass = 'status-proses';
    let statusText = 'Sedang Dalam Proses Seleksi';

    if (status.toLowerCase() === 'diterima') {
        icon = '🎉';
        badgeClass = 'status-diterima';
        statusText = 'Selamat! Anda Dinyatakan DITERIMA';
    } else if (status.toLowerCase() === 'ditolak') {
        icon = '❌';
        badgeClass = 'status-ditolak';
        statusText = 'Mohon Maaf, Anda Belum Lolos Seleksi';
    }

    if (iconEl) iconEl.innerHTML = `<span style="font-size:56px;">${icon}</span>`;
    if (badgeEl) {
        badgeEl.className = 'status-badge ' + badgeClass;
        badgeEl.textContent = status;
    }
    if (namaEl) namaEl.textContent = data.namaLengkap || '-';
    if (noPendEl) noPendEl.textContent = data.noPendaftaran || '-';
    if (statusValEl) statusValEl.textContent = statusText;

    if (actionsEl) {
        actionsEl.innerHTML = `
            <button class="btn btn-primary" onclick='cetakBuktiPendaftaran(${JSON.stringify({
                "No Pendaftaran": data.noPendaftaran,
                "Nama Lengkap": data.namaLengkap,
                "Status": status
            })})'>
                <i class="fas fa-print"></i> Cetak Bukti Pendaftaran
            </button>
        `;
    }

    resultSec.style.display = 'block';
    resultSec.scrollIntoView({ behavior: 'smooth' });
}

function displayStatusError(message) {
    const errorSec = document.getElementById('statusError');
    const errMsg = document.getElementById('statusErrorMessage');
    if (errMsg) errMsg.textContent = message;
    if (errorSec) {
        errorSec.style.display = 'block';
        errorSec.scrollIntoView({ behavior: 'smooth' });
    }
}

window.resetStatusCheck = function () {
    const input = document.getElementById('noPendaftaranInput');
    const errorSec = document.getElementById('statusError');
    if (errorSec) errorSec.style.display = 'none';
    if (input) {
        input.value = '';
        input.focus();
    }
};

/* ==========================================================================
   4. GALLERY FILTER & LIGHTBOX (galeri.html)
   ========================================================================== */
function initGallery() {
    const filterBtns = document.querySelectorAll('.gallery-filter .filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-grid .gallery-item');
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');

    if (!galleryItems.length) return;

    // Filter Buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filterValue = this.getAttribute('data-filter');

            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filterValue === 'all' || category === filterValue) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Lightbox open
    galleryItems.forEach(item => {
        item.addEventListener('click', function () {
            if (!lightbox) return;

            const imgDiv = item.querySelector('.gallery-image');
            const caption = item.querySelector('.gallery-caption')?.textContent || '';
            const category = item.querySelector('.gallery-category')?.textContent || '';

            if (lightboxImage && imgDiv) {
                lightboxImage.innerHTML = imgDiv.innerHTML;
                lightboxImage.style.background = imgDiv.style.background;
            }
            if (lightboxCaption) {
                lightboxCaption.innerHTML = `<h4>${caption}</h4><small>${category}</small>`;
            }

            lightbox.classList.add('active');
        });
    });

    // Lightbox close
    if (lightboxClose && lightbox) {
        lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) lightbox.classList.remove('active');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                lightbox.classList.remove('active');
            }
        });
    }
}
