/**
 * SPMB SMP KP 1 BALEENDAH - Frontend Application Script
 * Features: Dynamic CMS Content Loading, Multi-step Form, PDF Receipt, Status Check, Information Tabs
 */

let lastRegistrationData = null;
let schoolPdfNotes = [
    "Simpan lembar bukti pendaftaran ini sebagai tanda bukti resmi pendaftaran online Anda.",
    "Cek status hasil seleksi secara berkala melalui menu 'Cek Status' di website resmi.",
    "Bawa cetakan bukti ini beserta dokumen asli saat jadwal verifikasi fisik / daftar ulang."
];

document.addEventListener('DOMContentLoaded', function () {
    initNavbar();
    initCmsLoader();
    initInfoTabs();
    initRegistrationForm();
    initStatusCheck();
    initGallery();
    initPublicPhotos();
    initCurrentYear();
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

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }

    if (navbar) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 40) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}

function initCurrentYear() {
    const el = document.getElementById('currentYear');
    if (el) el.textContent = new Date().getFullYear();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ==========================================================================
   2. CMS DYNAMIC CONTENT LOADER
   ========================================================================== */
async function initCmsLoader() {
    try {
        const response = await fetch(CONFIG.API_URL + '?action=getSettings', { redirect: 'follow' });
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            const data = result.data;

            // Update School Name in Config
            if (data.namaSekolah) {
                CONFIG.SCHOOL_NAME = data.namaSekolah;
            }

            // 1. Text elements with [data-cms="key"]
            document.querySelectorAll('[data-cms]').forEach(el => {
                const key = el.getAttribute('data-cms');
                if (data[key] && data[key].trim() !== '') {
                    // Special treatment for misiSekolah (list)
                    if (key === 'misiSekolah') {
                        renderMisiList(el, data[key]);
                    } else {
                        el.textContent = data[key];
                    }
                }
            });

            // 2. Links with [data-cms-href="key"]
            document.querySelectorAll('[data-cms-href]').forEach(el => {
                const key = el.getAttribute('data-cms-href');
                if (data[key]) {
                    if (key === 'telepon') el.href = 'tel:' + data[key].replace(/\D/g, '');
                    else if (key === 'email') el.href = 'mailto:' + data[key];
                    else el.href = data[key];
                }
            });

            // 3. WhatsApp Links with [data-cms-wa]
            document.querySelectorAll('[data-cms-wa]').forEach(el => {
                const key = el.getAttribute('data-cms-wa') || 'whatsapp';
                const rawWa = data[key] || data['whatsapp'];
                if (rawWa) {
                    let clean = String(rawWa).replace(/\D/g, '');
                    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
                    else if (clean.startsWith('8')) clean = '62' + clean;

                    let waUrl = 'https://wa.me/' + clean;
                    const autoMsg = data['whatsappMessage'] || el.getAttribute('data-wa-text');
                    if (autoMsg && autoMsg.trim() !== '') {
                        waUrl += '?text=' + encodeURIComponent(autoMsg.trim());
                    }
                    el.href = waUrl;
                    el.target = '_blank';
                    el.rel = 'noopener noreferrer';
                }
            });

            // 4. Principal Photo with [data-cms-img="kepsekFoto"] or #kepsekImgContainer
            if (data.kepsekFoto && data.kepsekFoto.trim() !== '') {
                const container = document.getElementById('kepsekImgContainer');
                if (container) {
                    container.innerHTML = `<img src="${data.kepsekFoto}" alt="${data.kepsekNama || 'Kepala Sekolah'}" style="width:100%;height:100%;object-fit:cover;">`;
                }
            }

            // 5. Pendaftaran Closed Banner Check
            if (data.statusPendaftaran === 'Tutup') {
                const regForm = document.getElementById('registrationForm');
                const stepIndicator = document.getElementById('stepIndicator');
                if (regForm && stepIndicator) {
                    stepIndicator.style.display = 'none';
                    regForm.innerHTML = `
                        <div style="background:#fee2e2;border:1px solid #f87171;color:#b91c1c;padding:36px;border-radius:16px;text-align:center;max-width:600px;margin:40px auto;">
                            <div style="font-size:3rem;margin-bottom:12px;">🚪</div>
                            <h2 style="color:#991b1b;margin-bottom:8px;">Pendaftaran Sedang Ditutup</h2>
                            <p style="color:#7f1d1d;font-size:1rem;margin-bottom:20px;">
                                Mohon maaf, penerimaan peserta didik baru (SPMB) SMP KP 1 Baleendah saat ini sedang tidak dibuka. Silakan pantau pengumuman resmi di website ini untuk jadwal pendaftaran gelombang berikutnya.
                            </p>
                            <a href="/pengumuman.html" class="btn btn-primary">Lihat Pengumuman Terbaru</a>
                        </div>
                    `;
                }
            }

            // 6. Dynamic Kepsek Tagline
            const taglineContainer = document.getElementById('kepsekTagline');
            if (taglineContainer && data.kepsekTagline) {
                try {
                    const taglines = typeof data.kepsekTagline === 'string' ? JSON.parse(data.kepsekTagline) : data.kepsekTagline;
                    if (Array.isArray(taglines) && taglines.length > 0) {
                        const validPoints = taglines.map(t => String(t).trim()).filter(t => t.length > 0);
                        if (validPoints.length > 0) {
                            const parts = validPoints.map(p => 
                                `<span style="font-weight:700;color:var(--primary);display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-check-circle"></i> ${escapeHtml(p)}</span>`
                            );
                            taglineContainer.innerHTML = parts.join('<span style="color:#cbd5e1;">•</span>');
                        }
                    }
                } catch(e) {
                    console.warn('CMS Loader: error rendering dynamic kepsekTagline:', e);
                }
            }

            // 7. Dynamic Program Unggulan
            const programContainer = document.getElementById('programGridContainer');
            if (programContainer && data.programList) {
                try {
                    const programs = typeof data.programList === 'string' ? JSON.parse(data.programList) : data.programList;
                    if (Array.isArray(programs)) {
                        const activePrograms = programs.filter(p => p.active !== false);
                        if (activePrograms.length > 0) {
                            programContainer.innerHTML = activePrograms.map(p => `
                                <div class="program-card">
                                    <div class="program-icon"><i class="${escapeHtml(p.icon || 'fas fa-star')}"></i></div>
                                    <h3>${escapeHtml(p.judul || '')}</h3>
                                    <p>${escapeHtml(p.desc || '')}</p>
                                </div>
                            `).join('');
                        }
                    }
                } catch(e) {
                    console.warn('CMS Loader: error rendering dynamic programList:', e);
                }
            }

            // 8. PDF Receipt Notes
            if (data.catatanPdf) {
                try {
                    const parsedNotes = typeof data.catatanPdf === 'string' ? JSON.parse(data.catatanPdf) : data.catatanPdf;
                    if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
                        schoolPdfNotes = parsedNotes;
                    }
                } catch (e) {
                    console.warn('CMS Loader: error parsing catatanPdf:', e);
                }
            }
        }
    } catch (e) {
        console.warn('CMS Loader using default content:', e);
    }
}

function renderMisiList(container, text) {
    if (!text) return;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    container.innerHTML = lines.map((line, idx) => {
        // Strip out existing numbering like "1.", "1 -", etc.
        const cleanLine = line.replace(/^\d+[\.\-\)]\s*/, '');
        return `
            <div class="misi-item">
                <div class="misi-num">${idx + 1}</div>
                <p>${cleanLine}</p>
            </div>
        `;
    }).join('');
}

/* ==========================================================================
   3. INFORMATION TABS (PENGUMUMAN / INFO TERBARU / BERITA)
   ========================================================================== */
function initInfoTabs() {
    const tabBtns = document.querySelectorAll('.info-tab-btn');
    if (!tabBtns.length) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');
            const cards = document.querySelectorAll('.news-card[data-category]');

            cards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

/* ==========================================================================
   4. REGISTRATION FORM (pendaftaran.html)
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

    setupFileUpload('uploadFoto', 'foto_siswa', 'previewFoto', 'Foto Siswa');
    setupFileUpload('uploadKK', 'kartu_keluarga', 'previewKK', 'Kartu Keluarga');
    setupFileUpload('uploadAkta', 'akta_kelahiran', 'previewAkta', 'Akta Kelahiran');

    regForm.addEventListener('submit', async function (e) {
        e.preventDefault();

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
            const formData = new FormData(regForm);
            const payload = {};

            payload['Nama Lengkap'] = (formData.get('Nama Lengkap') || '').toString().trim();
            payload['NIK'] = (formData.get('NIK') || '').toString().trim();
            payload['Tempat Lahir'] = (formData.get('Tempat Lahir') || '').toString().trim();
            payload['Tanggal Lahir'] = (formData.get('Tanggal Lahir') || '').toString().trim();
            payload['Jenis Kelamin'] = (formData.get('Jenis Kelamin') || '').toString().trim();
            payload['Alamat'] = (formData.get('Alamat') || '').toString().trim();
            payload['Nama Orang Tua'] = (formData.get('Nama Orang Tua') || '').toString().trim();
            payload['No HP'] = (formData.get('No HP') || '').toString().trim();

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

                // Automatic SPMB Registration Receipt PDF Download
                setTimeout(() => {
                    try {
                        window.cetakBuktiPendaftaran(payload);
                    } catch (pdfErr) {
                        console.warn('Auto-download PDF gagal atau diblokir browser, tombol manual fallback tersedia:', pdfErr);
                    }
                }, 400);
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
                <div style="display:flex;align-items:center;gap:12px;width:100%;background:#eff6ff;padding:10px 14px;border-radius:10px;border:1px solid #bfdbfe;">
                    <i class="${isImage ? 'fas fa-image' : 'fas fa-file-pdf'}" style="font-size:24px;color:var(--primary);"></i>
                    <div style="flex:1;text-align:left;overflow:hidden;">
                        <strong style="display:block;font-size:13px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">${file.name}</strong>
                        <small style="color:#64748b;">${(file.size / 1024).toFixed(1)} KB</small>
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

    const primaryColor = [21, 62, 126];
    const darkColor = [15, 23, 42];

    // Header Background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 32, 'F');

    // School Name & Header Text (Section D.1)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(CONFIG.SCHOOL_NAME || 'SMP KP 1 BALEENDAH', 105, 13, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('BUKTI PENDAFTARAN SPMB ONLINE TAHUN AJARAN 2026/2027', 105, 21, { align: 'center' });

    // Registration Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 38, 180, 24, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Nomor Pendaftaran:', 22, 47);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(data['No Pendaftaran'] || 'SPMB-2026-000', 22, 55);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Tanggal Terbit:', 130, 47);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    const dateStr = data['Timestamp']
        ? new Date(data['Timestamp']).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(dateStr, 130, 55);

    // Section 1: Non-Sensitive Student Data (Section D.2: NO NIK, NO KK, NO Alamat Lengkap)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('DATA CALON SISWA', 15, 71);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(15, 73, 195, 73);

    const fields = [
        ['Nama Lengkap Calon Siswa', data['Nama Lengkap'] || data['namaLengkap'] || '-'],
        ['Jenis Kelamin', data['Jenis Kelamin'] || '-'],
        ['Nama Orang Tua / Wali', data['Nama Orang Tua'] || '-'],
        ['No. WhatsApp / Kontak', data['No HP'] || data['noHp'] || '-'],
        ['Status Pendaftaran', data['Status'] || data['status'] || 'Tercatat dalam Sistem']
    ];

    let currentY = 80;
    doc.setFontSize(9.5);

    fields.forEach(([label, val], idx) => {
        if (idx % 2 === 0) {
            doc.setFillColor(241, 245, 249);
            doc.rect(15, currentY - 4.5, 180, 7.5, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(label, 20, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkColor);
        doc.text(String(val), 82, currentY);

        currentY += 7.5;
    });

    // Section 2: Legal Disclaimer Box (Section D.3)
    currentY += 4;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(15, currentY, 180, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 64, 175);
    doc.text('STATUS DOKUMEN:', 20, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    const disclaimerText = 'Bukti pendaftaran ini menyatakan bahwa formulir telah berhasil dikirim dan tercatat dalam sistem. Dokumen ini bukan bukti kelulusan atau penerimaan akhir.';
    const splitDisclaimer = doc.splitTextToSize(disclaimerText, 170);
    doc.text(splitDisclaimer, 20, currentY + 10.5);

    // Section 3: Panitia Notes (Section D.4 - Dynamic from schoolPdfNotes)
    currentY += 21;
    const notesToRender = Array.isArray(schoolPdfNotes) && schoolPdfNotes.length > 0
        ? schoolPdfNotes.map(n => n.trim()).filter(n => n.length > 0)
        : [
            "Simpan lembar bukti pendaftaran ini sebagai tanda bukti resmi pendaftaran online Anda.",
            "Cek status hasil seleksi secara berkala melalui menu 'Cek Status' di website resmi.",
            "Bawa cetakan bukti ini beserta dokumen asli saat jadwal verifikasi fisik / daftar ulang."
        ];

    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);

    // Estimate box height based on notes
    let noteLinesTotal = 0;
    notesToRender.forEach((note, idx) => {
        const lines = doc.splitTextToSize(`${idx + 1}. ${note}`, 168);
        noteLinesTotal += lines.length;
    });
    const boxHeight = Math.max(22, 10 + noteLinesTotal * 4.5);

    doc.roundedRect(15, currentY, 180, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text('PETUNJUK & CATATAN PANITIA SPMB:', 20, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);

    let noteY = currentY + 11;
    notesToRender.forEach((note, idx) => {
        const lines = doc.splitTextToSize(`${idx + 1}. ${note}`, 168);
        doc.text(lines, 20, noteY);
        noteY += lines.length * 4.5;
    });

    // Footer (Section D.5)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Dokumen ini diterbitkan secara elektronik oleh Sistem SPMB ${CONFIG.SCHOOL_NAME || 'SMP KP 1 BALEENDAH'} dan sah tanpa tanda tangan basah.`, 105, 283, { align: 'center' });

    // Safe Non-Sensitive Filename (Section G.12)
    const safeRegNo = (data['No Pendaftaran'] || 'SPMB').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Bukti_Pendaftaran_${safeRegNo}.pdf`;
    doc.save(filename);
};

/* ==========================================================================
   5. STATUS CHECK (cek-status.html)
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
                displayStatusResult(result.data);
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
                <i class="fas fa-file-pdf"></i> Unduh / Cetak Bukti PDF
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
   6. GALLERY FILTER & LIGHTBOX (galeri.html)
   ========================================================================== */
function initGallery() {
    const filterBtns = document.querySelectorAll('.gallery-filter .filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-grid .gallery-item');
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');

    if (!galleryItems.length) return;

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

    galleryItems.forEach(item => {
        item.addEventListener('click', function () {
            if (!lightbox) return;

            const imgDiv = item.querySelector('.gallery-image');
            const caption = item.querySelector('.gallery-caption')?.textContent || '';
            const category = item.querySelector('.gallery-category')?.textContent || '';

            if (lightboxImage && imgDiv) {
                const fullImg = imgDiv.getAttribute('data-full-img');
                const innerImg = imgDiv.querySelector('img');
                if (fullImg || innerImg) {
                    const src = fullImg || innerImg.src;
                    lightboxImage.innerHTML = `<img src="${src}" alt="${escapeHtml(caption)}" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:12px;">`;
                    lightboxImage.style.background = 'transparent';
                } else {
                    lightboxImage.innerHTML = imgDiv.innerHTML;
                    lightboxImage.style.background = imgDiv.style.background;
                }
            }
            if (lightboxCaption) {
                lightboxCaption.innerHTML = `<h4>${caption}</h4><small>${category}</small>`;
            }

            lightbox.classList.add('active');
        });
    });

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

/* ==========================================================================
   7. GOOGLE DRIVE PUBLIC PHOTOS (SLIDER & DYNAMIC GALLERY)
   ========================================================================== */
async function initPublicPhotos() {
    const hasSlider = document.getElementById('heroSliderContainer');
    const hasGallery = document.getElementById('galleryGridContainer');
    const hasKepsek = document.getElementById('kepsekImgContainer');

    // Only run if relevant elements exist on this page
    if (!hasSlider && !hasGallery && !hasKepsek) return;

    try {
        const response = await fetch(CONFIG.API_URL + '?action=getPhotos&public=true', { redirect: 'follow' });
        const result = await response.json();

        if (result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
            const photos = result.data.filter(p => p.aktif === true || p.aktif === 'true');

            // 1. Render Hero Slider (index.html)
            if (hasSlider) {
                const slidePhotos = photos.filter(p => p.kategori === 'slide');
                if (slidePhotos.length > 0) {
                    renderHomeSlider(slidePhotos);
                }
            }

            // 2. Render Gallery (galeri.html)
            if (hasGallery) {
                const galleryPhotos = photos.filter(p => p.kategori !== 'slide' && p.kategori !== 'kepsek');
                if (galleryPhotos.length > 0) {
                    renderPublicGallery(galleryPhotos);
                }
            }

            // 3. Render Kepala Sekolah (index.html)
            if (hasKepsek) {
                const kepsekPhoto = photos.find(p => p.kategori === 'kepsek');
                if (kepsekPhoto && (kepsekPhoto.fileUrl || kepsekPhoto.thumbnailUrl)) {
                    hasKepsek.innerHTML = `
                        <img src="${escapeHtml(kepsekPhoto.thumbnailUrl || kepsekPhoto.fileUrl)}" 
                             alt="${escapeHtml(kepsekPhoto.judul || 'Kepala Sekolah')}" 
                             style="width:100%;height:100%;object-fit:cover;border-radius:14px;box-shadow:0 4px 15px rgba(0,0,0,0.15);"
                             onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                        <div class="kepsek-placeholder" style="display:none;">
                            <i class="fas fa-user-tie"></i>
                        </div>
                    `;
                }
            }
        }
    } catch (err) {
        console.warn('Gagal memuat foto publik Google Drive:', err);
    }
}

let homeSliderInterval = null;
let currentSlideIndex = 0;

function renderHomeSlider(slidePhotos) {
    const section = document.getElementById('homeSliderSection');
    const container = document.getElementById('heroSliderContainer');
    const dotsContainer = document.getElementById('sliderDotsContainer');
    const prevBtn = document.getElementById('sliderPrevBtn');
    const nextBtn = document.getElementById('sliderNextBtn');

    if (!section || !container || !slidePhotos || slidePhotos.length === 0) return;

    // Show slider section
    section.style.display = 'block';

    // Sort by urutan
    slidePhotos.sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0));

    // Render slides
    let slidesHtml = '';
    let dotsHtml = '';

    slidePhotos.forEach((slide, idx) => {
        const isActive = idx === 0 ? 'active' : '';
        const imgUrl = slide.fileUrl || slide.thumbnailUrl;
        slidesHtml += `
            <div class="home-slide-item ${isActive}" data-slide-index="${idx}">
                <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(slide.judul || 'Slide SMP KP 1')}" class="home-slide-img" loading="${idx === 0 ? 'eager' : 'lazy'}">
                ${(slide.judul || slide.deskripsi) ? `
                <div class="home-slide-caption">
                    ${slide.judul ? `<h3>${escapeHtml(slide.judul)}</h3>` : ''}
                    ${slide.deskripsi ? `<p>${escapeHtml(slide.deskripsi)}</p>` : ''}
                </div>` : ''}
            </div>
        `;
        dotsHtml += `<div class="slider-dot ${isActive}" data-dot-index="${idx}"></div>`;
    });

    container.innerHTML = slidesHtml;
    if (dotsContainer) dotsContainer.innerHTML = dotsHtml;

    // Slide Controls
    const slideItems = container.querySelectorAll('.home-slide-item');
    const dots = dotsContainer ? dotsContainer.querySelectorAll('.slider-dot') : [];
    const totalSlides = slideItems.length;

    if (totalSlides <= 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        return;
    }

    function goToSlide(index) {
        slideItems[currentSlideIndex]?.classList.remove('active');
        dots[currentSlideIndex]?.classList.remove('active');

        currentSlideIndex = (index + totalSlides) % totalSlides;

        slideItems[currentSlideIndex]?.classList.add('active');
        dots[currentSlideIndex]?.classList.add('active');
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            goToSlide(currentSlideIndex + 1);
            resetSliderTimer();
        };
    }

    if (prevBtn) {
        prevBtn.onclick = () => {
            goToSlide(currentSlideIndex - 1);
            resetSliderTimer();
        };
    }

    dots.forEach((dot, idx) => {
        dot.onclick = () => {
            goToSlide(idx);
            resetSliderTimer();
        };
    });

    function startSliderTimer() {
        if (homeSliderInterval) clearInterval(homeSliderInterval);
        homeSliderInterval = setInterval(() => {
            goToSlide(currentSlideIndex + 1);
        }, 5000);
    }

    function resetSliderTimer() {
        clearInterval(homeSliderInterval);
        startSliderTimer();
    }

    const wrapper = section.querySelector('.home-slider-wrapper');
    if (wrapper) {
        wrapper.addEventListener('mouseenter', () => clearInterval(homeSliderInterval));
        wrapper.addEventListener('mouseleave', () => startSliderTimer());
    }

    startSliderTimer();
}

function renderPublicGallery(galleryPhotos) {
    const container = document.getElementById('galleryGridContainer');
    if (!container || !galleryPhotos.length) return;

    // Sort by urutan
    galleryPhotos.sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0));

    let html = '';
    galleryPhotos.forEach((photo, idx) => {
        const cat = (photo.kategori || 'fasilitas').toLowerCase();
        const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1);
        const imgUrl = photo.thumbnailUrl || photo.fileUrl;
        const fullImgUrl = photo.fileUrl || photo.thumbnailUrl;

        html += `
            <div class="gallery-item" data-category="${escapeHtml(cat)}" data-aos="fade-up" data-aos-delay="${(idx % 4) * 100}">
                <div class="gallery-image" style="background:#0f172a;" data-full-img="${escapeHtml(fullImgUrl)}">
                    <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(photo.judul || 'Galeri Foto')}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                    <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:linear-gradient(135deg,#153e7e,#1e40af);color:#fff;font-size:3rem;">
                        <i class="fas fa-image"></i>
                    </div>
                </div>
                <div class="gallery-overlay">
                    <span class="gallery-caption">${escapeHtml(photo.judul || 'Foto Dokumentasi')}</span>
                    <span class="gallery-category">${escapeHtml(displayCat)}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Re-bind gallery filters & lightbox
    initGallery();
}
