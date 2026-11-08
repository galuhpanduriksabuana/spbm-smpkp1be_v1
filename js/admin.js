/**
 * SPMB SMP KP 1 BALEENDAH - Admin Script (Dashboard & CMS)
 */

let allRegistrants = [];
let filteredRegistrants = [];
let currentPage = 1;
const itemsPerPage = 10;
let statusChartInstance = null;
let monthlyChartInstance = null;

document.addEventListener('DOMContentLoaded', function () {
    const isDashboard = window.location.pathname.includes('dashboard');

    if (isDashboard) {
        initAdminDashboard();
    } else {
        initAdminLogin();
    }
});

/* ==========================================================================
   1. AUTH & LOGIN
   ========================================================================== */
function initAdminLogin() {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        window.location.href = '/admin/dashboard.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const loginCard = document.getElementById('loginCard');
        const loginBtn = document.getElementById('loginBtn');
        const loginSpinner = document.getElementById('loginSpinner');
        const loginBtnText = document.getElementById('loginBtnText');
        const loginBtnIcon = document.getElementById('loginBtnIcon');
        const loginError = document.getElementById('loginError');
        const loginErrorText = document.getElementById('loginErrorText');

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) return;

        if (loginError) loginError.classList.remove('show');
        if (loginCard) loginCard.classList.remove('shake');

        loginBtn.disabled = true;
        if (loginSpinner) loginSpinner.style.display = 'inline-block';
        if (loginBtnText) loginBtnText.textContent = 'Memeriksa...';
        if (loginBtnIcon) loginBtnIcon.style.display = 'none';

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'login',
                    username: username,
                    password: password
                }),
                redirect: 'follow'
            });

            const result = await response.json();

            if (result.status === 'success') {
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('adminUsername', username);
                sessionStorage.setItem('adminPass', password);
                window.location.href = '/admin/dashboard.html';
            } else {
                if (loginError && loginErrorText) {
                    loginErrorText.textContent = result.message || 'Username atau password salah!';
                    loginError.classList.add('show');
                }
                if (loginCard) {
                    loginCard.classList.add('shake');
                    setTimeout(() => loginCard.classList.remove('shake'), 600);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            if (loginError && loginErrorText) {
                loginErrorText.textContent = 'Gagal menghubungi server. Periksa koneksi internet Anda.';
                loginError.classList.add('show');
            }
        } finally {
            loginBtn.disabled = false;
            if (loginSpinner) loginSpinner.style.display = 'none';
            if (loginBtnText) loginBtnText.textContent = 'Masuk';
            if (loginBtnIcon) loginBtnIcon.style.display = 'inline-block';
        }
    });
}

/* ==========================================================================
   2. DASHBOARD INITIALIZATION
   ========================================================================== */
function initAdminDashboard() {
    if (localStorage.getItem('adminLoggedIn') !== 'true') {
        window.location.href = '/admin/index.html';
        return;
    }

    initSidebar();
    initTabNavigation();
    initFilterAndSearch();
    initSettingsTab();

    // Load Data
    loadRegistrantsData();
    loadSettingsData();
    loadPhotosAdmin();

    // Auto refresh every 60s
    setInterval(loadRegistrantsData, 60000);
}

function initSidebar() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const logoutBtn = document.getElementById('logoutBtn');

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Apakah Anda yakin ingin keluar dari Admin Panel?')) {
                localStorage.removeItem('adminLoggedIn');
                localStorage.removeItem('adminUsername');
                window.location.href = '/admin/index.html';
            }
        });
    }
}

function initTabNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .sidebar-nav-item[data-tab]');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);

            const sidebar = document.getElementById('adminSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    });
}

window.switchTab = function (tabId) {
    const navItems = document.querySelectorAll('.sidebar-nav .sidebar-nav-item[data-tab]');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    const pageTitle = document.getElementById('adminPageTitle');

    navItems.forEach(n => n.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const targetNav = document.querySelector(`.sidebar-nav .sidebar-nav-item[data-tab="${tabId}"]`);
    const targetContent = document.getElementById(`tab-${tabId}`);

    if (targetNav) targetNav.classList.add('active');
    if (targetContent) targetContent.classList.add('active');

    const titles = {
        'dashboard': 'Dashboard SPMB',
        'pendaftar': 'Data Pendaftar Siswa Baru',
        'cms': 'Edit Konten Website (CMS)',
        'pengaturan': 'Pengaturan Sistem'
    };
    if (pageTitle && titles[tabId]) {
        pageTitle.textContent = titles[tabId];
    }
    if (tabId === 'cms') {
        loadPhotosAdmin();
    }
};

/* ==========================================================================
   3. DATA FETCHING & STATS
   ========================================================================== */
async function loadRegistrantsData() {
    const recentTableBody = document.getElementById('recentTableBody');
    const pendaftarTableBody = document.getElementById('pendaftarTableBody');

    try {
        const response = await fetch(CONFIG.API_URL, { redirect: 'follow' });
        const result = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
            allRegistrants = result.data;
            applyFilters();
            updateStats();
            renderCharts();
            renderRecentTable();
        } else {
            console.warn('API returned non-success:', result);
            if (recentTableBody) {
                recentTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">Belum ada data pendaftar</td></tr>';
            }
            if (pendaftarTableBody) {
                pendaftarTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#888;">Belum ada data pendaftar</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function updateStats() {
    let total = allRegistrants.length;
    let diterima = 0;
    let proses = 0;
    let ditolak = 0;

    allRegistrants.forEach(item => {
        const status = (item.Status || 'Proses').toLowerCase();
        if (status === 'diterima') diterima++;
        else if (status === 'ditolak') ditolak++;
        else proses++;
    });

    animateCount('statTotal', total);
    animateCount('statDiterima', diterima);
    animateCount('statProses', proses);
    animateCount('statDitolak', ditolak);
}

function animateCount(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let start = 0;
    const duration = 500;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = targetValue / steps;

    if (targetValue === 0) {
        el.textContent = '0';
        return;
    }

    const timer = setInterval(() => {
        start += increment;
        if (start >= targetValue) {
            el.textContent = targetValue;
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(start);
        }
    }, stepTime);
}

/* ==========================================================================
   4. CHARTS (CHART.JS)
   ========================================================================== */
function renderCharts() {
    const statusCanvas = document.getElementById('statusChart');
    const monthlyCanvas = document.getElementById('monthlyChart');
    if (!statusCanvas || !monthlyCanvas || !window.Chart) return;

    let diterima = 0, proses = 0, ditolak = 0;
    allRegistrants.forEach(item => {
        const s = (item.Status || 'Proses').toLowerCase();
        if (s === 'diterima') diterima++;
        else if (s === 'ditolak') ditolak++;
        else proses++;
    });

    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(statusCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Diterima', 'Sedang Diproses', 'Ditolak'],
            datasets: [{
                data: [diterima, proses, ditolak],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    const monthCounts = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    allRegistrants.forEach(item => {
        if (!item.Timestamp) return;
        const d = new Date(item.Timestamp);
        if (!isNaN(d.getTime())) {
            const label = monthNames[d.getMonth()] + ' ' + d.getFullYear();
            monthCounts[label] = (monthCounts[label] || 0) + 1;
        }
    });

    const monthlyLabels = Object.keys(monthCounts);
    const monthlyValues = Object.values(monthCounts);

    if (monthlyLabels.length === 0) {
        monthlyLabels.push('Periode Ini');
        monthlyValues.push(allRegistrants.length);
    }

    if (monthlyChartInstance) monthlyChartInstance.destroy();
    monthlyChartInstance = new Chart(monthlyCanvas, {
        type: 'bar',
        data: {
            labels: monthlyLabels,
            datasets: [{
                label: 'Jumlah Pendaftar',
                data: monthlyValues,
                backgroundColor: '#153e7e',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

/* ==========================================================================
   5. TABLES & SEARCH
   ========================================================================== */
function renderRecentTable() {
    const tbody = document.getElementById('recentTableBody');
    if (!tbody) return;

    const recent = allRegistrants.slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">Belum ada data pendaftar</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map(item => {
        const noReg = item['No Pendaftaran'] || '-';
        const nama = item['Nama Lengkap'] || '-';
        const tgl = item['Timestamp'] ? new Date(item['Timestamp']).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
        const status = item['Status'] || 'Proses';
        const badgeClass = getBadgeClass(status);

        return `
            <tr>
                <td><strong>${noReg}</strong></td>
                <td>${nama}</td>
                <td>${tgl}</td>
                <td><span class="status-badge ${badgeClass}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openDetailModal('${noReg}')">
                        <i class="fas fa-eye"></i> Detail
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function initFilterAndSearch() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const refreshBtn = document.getElementById('btnRefreshData');
    const exportBtn = document.getElementById('btnExportCsv');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1;
            applyFilters();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFilters();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refresh...';
            loadRegistrantsData().finally(() => {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            });
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCsv);
    }
}

function applyFilters() {
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('statusFilter')?.value || 'all';

    filteredRegistrants = allRegistrants.filter(item => {
        const noReg = (item['No Pendaftaran'] || '').toLowerCase();
        const nama = (item['Nama Lengkap'] || '').toLowerCase();
        const nik = (item['NIK'] || '').toString();
        const status = item['Status'] || 'Proses';

        const matchSearch = noReg.includes(searchVal) || nama.includes(searchVal) || nik.includes(searchVal);
        const matchStatus = statusVal === 'all' || status.toLowerCase() === statusVal.toLowerCase();

        return matchSearch && matchStatus;
    });

    renderMainTable(currentPage);
}

function renderMainTable(page = 1) {
    const tbody = document.getElementById('pendaftarTableBody');
    const pagination = document.getElementById('pagination');
    if (!tbody) return;

    currentPage = page;
    const totalItems = filteredRegistrants.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredRegistrants.slice(startIndex, startIndex + itemsPerPage);

    if (paginatedItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:#888;">Tidak ada data yang cocok dengan pencarian.</td></tr>';
        if (pagination) pagination.innerHTML = '';
        return;
    }

    tbody.innerHTML = paginatedItems.map((item, index) => {
        const rowNo = startIndex + index + 1;
        const noReg = item['No Pendaftaran'] || '-';
        const nama = item['Nama Lengkap'] || '-';
        const nikRaw = (item['NIK'] || '').toString();
        const nik = nikRaw.length >= 8 ? `${nikRaw.substring(0, 4)}****${nikRaw.substring(nikRaw.length - 4)}` : nikRaw;
        const jk = item['Jenis Kelamin'] === 'Perempuan' ? 'P' : 'L';
        const hp = item['No HP'] || '-';
        const status = item['Status'] || 'Proses';
        const badgeClass = getBadgeClass(status);

        return `
            <tr>
                <td>${rowNo}</td>
                <td><strong>${noReg}</strong></td>
                <td>${nama}</td>
                <td>${nik}</td>
                <td><span style="font-weight:600;color:${jk === 'L' ? '#153e7e' : '#d97706'};">${jk}</span></td>
                <td>
                    <a href="https://wa.me/${formatWaNumber(hp)}" target="_blank" style="color:var(--success);text-decoration:none;">
                        <i class="fab fa-whatsapp"></i> ${hp}
                    </a>
                </td>
                <td><span class="status-badge ${badgeClass}">${status}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon-sm btn-primary" onclick="openDetailModal('${noReg}')" title="Lihat Detail">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon-sm btn-secondary" onclick='generateStudentPDF(${JSON.stringify(item).replace(/'/g, "\\'")})' title="Cetak Bukti PDF">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (pagination) {
        let pagesHtml = '';
        if (totalPages > 1) {
            pagesHtml += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="renderMainTable(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                    pagesHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="renderMainTable(${i})">${i}</button>`;
                } else if (i === currentPage - 2 || i === currentPage + 2) {
                    pagesHtml += `<span style="padding:4px 8px;">...</span>`;
                }
            }
            pagesHtml += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''} onclick="renderMainTable(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
        }
        pagination.innerHTML = pagesHtml;
    }
}

function getBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'diterima') return 'status-diterima';
    if (s === 'ditolak') return 'status-ditolak';
    return 'status-proses';
}

function formatWaNumber(phone) {
    let clean = (phone || '').replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return clean;
}

/* ==========================================================================
   6. DETAIL MODAL & UPDATE STATUS SISWA
   ========================================================================== */
window.openDetailModal = function (noPendaftaran) {
    const item = allRegistrants.find(r => r['No Pendaftaran'] === noPendaftaran);
    if (!item) return;

    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('detailModalBody');
    const closeBtn = document.getElementById('detailModalClose');

    if (!modal || !modalBody) return;

    const currentStatus = item['Status'] || 'Proses';

    modalBody.innerHTML = `
        <div style="background:#eff6ff;padding:16px 20px;border-radius:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border:1px solid #bfdbfe;">
            <div>
                <span style="font-size:0.82rem;color:#64748b;font-weight:600;">Nomor Registrasi:</span>
                <h2 style="margin:2px 0 0 0;font-size:1.35rem;color:var(--primary-dark);">${item['No Pendaftaran'] || '-'}</h2>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <select id="modalStatusSelect" class="form-select" style="padding:8px 12px;font-weight:600;">
                    <option value="Proses" ${currentStatus === 'Proses' ? 'selected' : ''}>Proses</option>
                    <option value="Diterima" ${currentStatus === 'Diterima' ? 'selected' : ''}>Diterima</option>
                    <option value="Ditolak" ${currentStatus === 'Ditolak' ? 'selected' : ''}>Ditolak</option>
                </select>
                <button class="btn btn-sm btn-primary" id="btnUpdateModalStatus" onclick="handleUpdateStatus('${item['No Pendaftaran']}')">
                    <i class="fas fa-save"></i> Ubah Status
                </button>
            </div>
        </div>

        <h4 style="margin-bottom:12px;color:var(--text-dark);font-size:1rem;"><i class="fas fa-user"></i> Data Diri Calon Siswa</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:20px;background:#f8fafc;padding:16px;border-radius:8px;">
            <div><small style="color:#64748b;">Nama Lengkap:</small><br><strong>${item['Nama Lengkap'] || '-'}</strong></div>
            <div><small style="color:#64748b;">NIK:</small><br><strong>${item['NIK'] || '-'}</strong></div>
            <div><small style="color:#64748b;">Tempat, Tgl Lahir:</small><br><strong>${item['Tempat Lahir'] || '-'}, ${item['Tanggal Lahir'] || '-'}</strong></div>
            <div><small style="color:#64748b;">Jenis Kelamin:</small><br><strong>${item['Jenis Kelamin'] || '-'}</strong></div>
            <div style="grid-column:1/-1;"><small style="color:#64748b;">Alamat Lengkap:</small><br><strong>${item['Alamat'] || '-'}</strong></div>
        </div>

        <h4 style="margin-bottom:12px;color:var(--text-dark);font-size:1rem;"><i class="fas fa-users"></i> Kontak & Wali Siswa</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:20px;background:#f8fafc;padding:16px;border-radius:8px;">
            <div><small style="color:#64748b;">Nama Orang Tua / Wali:</small><br><strong>${item['Nama Orang Tua'] || '-'}</strong></div>
            <div><small style="color:#64748b;">WhatsApp Aktif:</small><br><strong>${item['No HP'] || '-'}</strong></div>
            <div><small style="color:#64748b;">Waktu Pendaftaran:</small><br><strong>${item['Timestamp'] ? new Date(item['Timestamp']).toLocaleString('id-ID') : '-'}</strong></div>
        </div>

        <h4 style="margin-bottom:12px;color:var(--text-dark);font-size:1rem;"><i class="fas fa-folder-open"></i> Berkas Persyaratan (Google Drive)</h4>
        <div style="margin-bottom:20px;">
            ${renderDocLink('Pas Foto 3x4', item['Foto Siswa'])}
            ${renderDocLink('Kartu Keluarga (KK)', item['Kartu Keluarga'])}
            ${renderDocLink('Akta Kelahiran', item['Akta Kelahiran'])}
        </div>

        <div style="border-top:1px solid #e2e8f0;padding-top:16px;display:flex;justify-content:flex-end;gap:10px;">
            <button class="btn btn-secondary" onclick="closeDetailModal()">Tutup</button>
            <button class="btn btn-success" onclick='generateStudentPDF(${JSON.stringify(item).replace(/'/g, "\\'")})'>
                <i class="fas fa-print"></i> Cetak Bukti PDF
            </button>
        </div>
    `;

    modal.classList.add('active');

    if (closeBtn) closeBtn.onclick = closeDetailModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeDetailModal();
    };
};

function renderDocLink(label, url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return `
            <div class="doc-preview-item">
                <span><i class="fas fa-file" style="color:#aaa;margin-right:8px;"></i> ${label}</span>
                <span style="color:#aaa;font-size:0.85rem;">Tidak diunggah</span>
            </div>
        `;
    }

    return `
        <div class="doc-preview-item">
            <span><i class="fas fa-file-check" style="color:var(--primary);margin-right:8px;"></i> <strong>${label}</strong></span>
            <a href="${url}" target="_blank" class="btn btn-sm btn-outline">
                <i class="fas fa-external-link-alt"></i> Buka File
            </a>
        </div>
    `;
}

window.closeDetailModal = function () {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
};

window.handleUpdateStatus = async function (noPendaftaran) {
    const select = document.getElementById('modalStatusSelect');
    const btn = document.getElementById('btnUpdateModalStatus');
    if (!select || !btn) return;

    const newStatus = select.value;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'updateStatus',
                noPendaftaran: noPendaftaran,
                newStatus: newStatus
            }),
            redirect: 'follow'
        });

        const result = await response.json();

        if (result.status === 'success') {
            alert(`Status ${noPendaftaran} berhasil diubah menjadi "${newStatus}".`);
            const idx = allRegistrants.findIndex(r => r['No Pendaftaran'] === noPendaftaran);
            if (idx !== -1) allRegistrants[idx]['Status'] = newStatus;

            updateStats();
            renderCharts();
            renderRecentTable();
            applyFilters();
            closeDetailModal();
        } else {
            alert('Gagal mengupdate status: ' + (result.message || 'Kesalahan backend'));
        }
    } catch (error) {
        console.error('Update status error:', error);
        alert('Terjadi kesalahan koneksi saat memperbarui status.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

/* ==========================================================================
   7. CMS (CONTENT MANAGEMENT SYSTEM)
   ========================================================================== */
const CMS_KEYS = [
    // 1. Identitas & Media Sosial
    'namaSekolah', 'taglineSekolah', 'akreditasi', 'topbarAlamat', 'runningText',
    'sosialInstagram', 'sosialFacebook', 'sosialYoutube',

    // 2. Banner Utama & Widget SPMB
    'heroBadge', 'heroTitle', 'heroSubtitle',
    'spmbBadge', 'spmbTitle', 'spmbDesc',
    'spmbItem1Title', 'spmbItem1Desc',
    'spmbItem2Title', 'spmbItem2Desc',
    'spmbItem3Title', 'spmbItem3Desc',

    // 3. Statistik Sekolah
    'stat1Value', 'stat1Label', 'stat2Value', 'stat2Label', 'stat3Value', 'stat3Label', 'stat4Value', 'stat4Label',

    // 4. Sambutan Kepala Sekolah
    'kepsekNama', 'kepsekJabatan', 'kepsekFoto', 'kepsekSambutan', 'kepsekTagline',

    // 5. Visi & Misi Sekolah
    'visiSekolah', 'misiSekolah',

    // 6. Program Unggulan (4 Pilar)
    'programList', 'prog1Judul', 'prog1Desc', 'prog2Judul', 'prog2Desc', 'prog3Judul', 'prog3Desc', 'prog4Judul', 'prog4Desc',

    // 7. Alur Pendaftaran (4 Langkah)
    'alurStep1Title', 'alurStep1Desc',
    'alurStep2Title', 'alurStep2Desc',
    'alurStep3Title', 'alurStep3Desc',
    'alurStep4Title', 'alurStep4Desc',

    // 8. Pengumuman, Info Terbaru & Berita (6 Card)
    'pengumuman1Title', 'pengumuman1Date', 'pengumuman1Author', 'pengumuman1Excerpt',
    'pengumuman2Title', 'pengumuman2Date', 'pengumuman2Author', 'pengumuman2Excerpt',
    'info1Title', 'info1Date', 'info1Author', 'info1Excerpt',
    'info2Title', 'info2Date', 'info2Author', 'info2Excerpt',
    'berita1Title', 'berita1Date', 'berita1Author', 'berita1Excerpt',
    'berita2Title', 'berita2Date', 'berita2Author', 'berita2Excerpt',

    // 9. Jadwal & Timeline Seleksi SPMB (6 Tahapan)
    'jadwalSectionTitle', 'jadwalSectionDesc',
    'jadwal1Title', 'jadwal1Date', 'jadwal1Desc',
    'jadwal2Title', 'jadwal2Date', 'jadwal2Desc',
    'jadwal3Title', 'jadwal3Date', 'jadwal3Desc',
    'jadwal4Title', 'jadwal4Date', 'jadwal4Desc',
    'jadwal5Title', 'jadwal5Date', 'jadwal5Desc',
    'jadwal6Title', 'jadwal6Date', 'jadwal6Desc',

    // 10. Galeri Dokumentasi, Fasilitas & Prestasi (9 Item)
    'galeri1Caption', 'galeri1Category',
    'galeri2Caption', 'galeri2Category',
    'galeri3Caption', 'galeri3Category',
    'galeri4Caption', 'galeri4Category',
    'galeri5Caption', 'galeri5Category',
    'galeri6Caption', 'galeri6Category',
    'galeri7Caption', 'galeri7Category',
    'galeri8Caption', 'galeri8Category',
    'galeri9Caption', 'galeri9Category',

    // 11. CTA & Persyaratan Formulir
    'ctaTitle', 'ctaDesc', 'ctaButtonText',
    'syaratFoto', 'syaratKK', 'syaratAkta', 'catatanPendaftaran',

    // 12. Kontak Resmi & Profil Footer
    'telepon', 'whatsapp', 'whatsappMessage', 'email', 'alamat', 'jamLayanan', 'deskripsi'
];

function normalizeWaNumber(raw) {
    if (!raw) return '';
    let clean = String(raw).trim().replace(/\D/g, '');
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
        clean = '62' + clean;
    }
    return clean;
}

function isValidIndonesianWa(raw) {
    if (!raw) return false;
    const trimmed = String(raw).trim().replace(/[\s-]/g, '');
    return /^(\+62|62|0)8[1-9][0-9]{7,11}$/.test(trimmed);
}

function updateWaPreview() {
    const waInput = document.getElementById('setting_whatsapp');
    const waMsgInput = document.getElementById('setting_whatsappMessage');
    const previewEl = document.getElementById('setting_waPreview');
    if (!previewEl) return;

    const val = waInput ? waInput.value.trim() : '';
    const msg = waMsgInput ? waMsgInput.value.trim() : '';

    if (val && isValidIndonesianWa(val)) {
        const normalized = normalizeWaNumber(val);
        let url = 'https://wa.me/' + normalized;
        if (msg) {
            url += '?text=' + encodeURIComponent(msg);
        }
        previewEl.href = url;
        previewEl.textContent = url;
        previewEl.style.color = '#15803d';
    } else if (val) {
        previewEl.href = '#';
        previewEl.textContent = 'Nomor tidak valid (harus diawali 08... atau +628...)';
        previewEl.style.color = '#dc2626';
    } else {
        previewEl.href = '#';
        previewEl.textContent = 'Masukkan nomor WhatsApp untuk melihat live preview';
        previewEl.style.color = '#64748b';
    }
}

/* ==========================================================================
   DYNAMIC TAGLINE & PROGRAM UNGGULAN STATE & LOGIC
   ========================================================================== */
let currentTaglines = [
    "Berakhlak Mulia",
    "Cerdas & Mandiri",
    "Berprestasi"
];

let currentPrograms = [
    {
        id: "prog-1",
        judul: "Kurikulum Merdeka",
        desc: "Pembelajaran intrakurikuler yang beragam di mana konten dirancang lebih optimal agar peserta didik memiliki cukup waktu mendalami konsep.",
        icon: "fas fa-book-open",
        active: true
    },
    {
        id: "prog-2",
        judul: "Pembiasaan Keagamaan",
        desc: "Sholat dhuha dan dzuhur berjamaah, tahfidz Al-Quran juz 30, serta pembinaan akhlak mulia sebagai fondasi moral peserta didik.",
        icon: "fas fa-mosque",
        active: true
    },
    {
        id: "prog-3",
        judul: "Literasi Digital & IT",
        desc: "Pengenalan komputasi dasar, pemanfaatan laboratorium komputer modern, serta pembelajaran berbasis teknologi ramah siswa.",
        icon: "fas fa-laptop-code",
        active: true
    },
    {
        id: "prog-4",
        judul: "Ekstrakurikuler & Prestasi",
        desc: "Wadah pembinaan minat bakat mulai dari Pramuka, Paskibra, PMR, Futsal, Seni Musik, hingga Club Matematika & Sains.",
        icon: "fas fa-trophy",
        active: true
    }
];

const PROGRAM_ICON_PRESETS = [
    { id: "fas fa-book-open", label: "Buku / Kurikulum" },
    { id: "fas fa-mosque", label: "Masjid / Keagamaan" },
    { id: "fas fa-laptop-code", label: "Komputer / IT" },
    { id: "fas fa-trophy", label: "Piala / Prestasi" },
    { id: "fas fa-award", label: "Medali / Prestasi" },
    { id: "fas fa-graduation-cap", label: "Akademik" },
    { id: "fas fa-globe", label: "Bahasa / Wawasan" },
    { id: "fas fa-seedling", label: "Karakter / Lingkungan" },
    { id: "fas fa-futbol", label: "Olahraga" },
    { id: "fas fa-music", label: "Seni Musik" },
    { id: "fas fa-palette", label: "Kreativitas & Seni" },
    { id: "fas fa-flask", label: "Sains & Riset" },
    { id: "fas fa-star", label: "Bintang / Unggulan" }
];

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* -------------------------------------------------------------
   TAGLINE FUNCTIONS
   ------------------------------------------------------------- */
window.renderTaglineAdmin = function() {
    const listEl = document.getElementById('taglinePointsList');
    if (!listEl) return;

    if (currentTaglines.length === 0) {
        listEl.innerHTML = '<div style="color:#94a3b8;font-style:italic;padding:10px 0;">Belum ada poin tagline. Klik tombol "Tambah Poin Tagline" di atas.</div>';
        updateTaglinePreview();
        return;
    }

    listEl.innerHTML = currentTaglines.map((point, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === currentTaglines.length - 1;
        return `
            <div class="tagline-admin-item" style="display:flex;align-items:center;gap:10px;background:#ffffff;border:1px solid #e2e8f0;padding:8px 12px;border-radius:8px;">
                <span style="font-weight:700;color:var(--primary);width:24px;text-align:center;font-size:0.9rem;">${idx + 1}.</span>
                <input type="text" class="form-input" style="flex:1;padding:8px 12px;font-size:0.92rem;" 
                       value="${escapeHtml(point)}" 
                       maxlength="60"
                       placeholder="Contoh: Berakhlak Mulia"
                       oninput="updateTaglineText(${idx}, this.value)">
                <div style="display:flex;gap:4px;">
                    <button type="button" class="btn btn-outline-secondary btn-sm" 
                            style="padding:6px 10px;font-size:0.8rem;" 
                            title="Pindah ke Atas" 
                            ${isFirst ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : `onclick="moveTagline(${idx}, -1)"`}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" 
                            style="padding:6px 10px;font-size:0.8rem;" 
                            title="Pindah ke Bawah" 
                            ${isLast ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : `onclick="moveTagline(${idx}, 1)"`}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" 
                            style="padding:6px 10px;font-size:0.8rem;" 
                            title="Hapus Poin" 
                            onclick="deleteTaglinePoint(${idx})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    updateTaglinePreview();
};

window.addTaglinePoint = function() {
    currentTaglines.push('');
    renderTaglineAdmin();
    setTimeout(() => {
        const listEl = document.getElementById('taglinePointsList');
        if (listEl) {
            const inputs = listEl.querySelectorAll('input');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
        }
    }, 50);
};

window.updateTaglineText = function(index, value) {
    if (index >= 0 && index < currentTaglines.length) {
        currentTaglines[index] = value;
        updateTaglinePreview();
    }
};

window.moveTagline = function(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= currentTaglines.length) return;
    const temp = currentTaglines[index];
    currentTaglines[index] = currentTaglines[targetIdx];
    currentTaglines[targetIdx] = temp;
    renderTaglineAdmin();
};

window.deleteTaglinePoint = function(index) {
    const pointText = currentTaglines[index] || `Poin ${index + 1}`;
    if (confirm(`Hapus poin tagline "${pointText}"?\n(Perubahan permanen disimpan saat Anda menekan tombol Simpan Konten)`)) {
        currentTaglines.splice(index, 1);
        renderTaglineAdmin();
    }
};

window.updateTaglinePreview = function() {
    const previewEl = document.getElementById('taglineLivePreview');
    if (!previewEl) return;

    const validPoints = currentTaglines.map(p => p.trim()).filter(p => p.length > 0);
    if (validPoints.length === 0) {
        previewEl.innerHTML = '<span style="color:#94a3b8;font-style:italic;">Tidak ada poin tagline yang aktif.</span>';
        return;
    }

    const htmlParts = validPoints.map(p => {
        return `<span style="font-weight:700;color:var(--primary);display:inline-flex;align-items:center;gap:6px;"><i class="fas fa-check-circle"></i> ${escapeHtml(p)}</span>`;
    });

    previewEl.innerHTML = htmlParts.join('<span style="color:#cbd5e1;font-weight:bold;">•</span>');
};

/* -------------------------------------------------------------
   PROGRAM UNGGULAN FUNCTIONS
   ------------------------------------------------------------- */
window.renderProgramsAdmin = function() {
    const listEl = document.getElementById('programCardsList');
    if (!listEl) return;

    if (currentPrograms.length === 0) {
        listEl.innerHTML = '<div style="color:#94a3b8;font-style:italic;padding:12px;background:#fff;border-radius:8px;border:1px dashed #cbd5e1;text-align:center;">Belum ada program unggulan. Klik tombol "+ Tambah Program Unggulan" di atas.</div>';
        updateProgramPreview();
        return;
    }

    listEl.innerHTML = currentPrograms.map((p, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === currentPrograms.length - 1;
        const isActive = p.active !== false;

        let iconOptions = PROGRAM_ICON_PRESETS.map(opt => {
            const selected = opt.id === p.icon ? 'selected' : '';
            return `<option value="${opt.id}" ${selected}>${opt.label} (${opt.id})</option>`;
        }).join('');

        const inPreset = PROGRAM_ICON_PRESETS.some(opt => opt.id === p.icon);
        if (!inPreset && p.icon) {
            iconOptions += `<option value="${escapeHtml(p.icon)}" selected>Custom (${escapeHtml(p.icon)})</option>`;
        }

        return `
            <div class="program-admin-card" style="background:#ffffff;border:1px solid ${isActive ? '#e2e8f0' : '#fecaca'};border-radius:10px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.04);position:relative;transition:all 0.2s ease;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:8px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-weight:700;color:var(--text-dark);font-size:0.95rem;background:#f1f5f9;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:6px;">
                            ${idx + 1}
                        </span>
                        <div style="width:36px;height:36px;background:var(--bg-subtle);color:var(--primary);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;" id="iconPreview_${p.id}">
                            <i class="${escapeHtml(p.icon || 'fas fa-star')}"></i>
                        </div>
                        <div>
                            <strong style="color:var(--primary-dark);font-size:1rem;">${escapeHtml(p.judul || 'Program Tanpa Judul')}</strong>
                            <span style="display:inline-block;margin-left:8px;font-size:0.75rem;padding:2px 8px;border-radius:12px;font-weight:600;background:${isActive ? '#dcfce7;color:#15803d;' : '#fee2e2;color:#b91c1c;'}">
                                ${isActive ? '<i class="fas fa-check"></i> Aktif' : '<i class="fas fa-eye-slash"></i> Nonaktif'}
                            </span>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button type="button" class="btn btn-sm ${isActive ? 'btn-outline-warning' : 'btn-outline-success'}" 
                                style="padding:4px 10px;font-size:0.78rem;" 
                                onclick="toggleProgramActive('${p.id}')">
                            ${isActive ? '<i class="fas fa-eye-slash"></i> Nonaktifkan' : '<i class="fas fa-eye"></i> Aktifkan'}
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" 
                                style="padding:4px 8px;font-size:0.78rem;" 
                                title="Pindah ke Atas" 
                                ${isFirst ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : `onclick="moveProgram(${idx}, -1)"`}>
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary btn-sm" 
                                style="padding:4px 8px;font-size:0.78rem;" 
                                title="Pindah ke Bawah" 
                                ${isLast ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : `onclick="moveProgram(${idx}, 1)"`}>
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger btn-sm" 
                                style="padding:4px 8px;font-size:0.78rem;" 
                                title="Hapus Program" 
                                onclick="deleteProgram('${p.id}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>

                <div class="form-row" style="margin-bottom:10px;">
                    <div class="form-group" style="flex:2;margin-bottom:0;">
                        <label style="font-size:0.82rem;font-weight:600;color:#64748b;margin-bottom:4px;display:block;">Judul Program:</label>
                        <input type="text" class="form-input" style="padding:8px 12px;font-size:0.92rem;" 
                               value="${escapeHtml(p.judul)}" 
                               placeholder="Nama Program Unggulan"
                               oninput="updateProgramField('${p.id}', 'judul', this.value)">
                    </div>
                    <div class="form-group" style="flex:1;margin-bottom:0;">
                        <label style="font-size:0.82rem;font-weight:600;color:#64748b;margin-bottom:4px;display:block;">Pilih Ikon:</label>
                        <select class="form-select" style="padding:8px 12px;font-size:0.9rem;" 
                                onchange="updateProgramField('${p.id}', 'icon', this.value)">
                            ${iconOptions}
                        </select>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.82rem;font-weight:600;color:#64748b;margin-bottom:4px;display:block;">Deskripsi Program:</label>
                    <textarea class="form-textarea" rows="2" style="padding:8px 12px;font-size:0.9rem;" 
                              placeholder="Penjelasan ringkas mengenai keunggulan program..."
                              oninput="updateProgramField('${p.id}', 'desc', this.value)">${escapeHtml(p.desc)}</textarea>
                </div>
            </div>
        `;
    }).join('');

    updateProgramPreview();
};

window.addNewProgram = function() {
    const newProg = {
        id: 'prog-' + Date.now(),
        judul: 'Program Baru',
        desc: 'Deskripsi program pembelajaran atau pembiasaan unggulan di sekolah...',
        icon: 'fas fa-star',
        active: true
    };
    currentPrograms.push(newProg);
    renderProgramsAdmin();
    setTimeout(() => {
        const listEl = document.getElementById('programCardsList');
        if (listEl && listEl.lastElementChild) {
            listEl.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 60);
};

window.updateProgramField = function(id, field, value) {
    const prog = currentPrograms.find(p => p.id === id);
    if (prog) {
        prog[field] = value;
        if (field === 'icon') {
            const previewBox = document.getElementById(`iconPreview_${id}`);
            if (previewBox) previewBox.innerHTML = `<i class="${escapeHtml(value)}"></i>`;
        }
        updateProgramPreview();
    }
};

window.toggleProgramActive = function(id) {
    const prog = currentPrograms.find(p => p.id === id);
    if (prog) {
        prog.active = !prog.active;
        renderProgramsAdmin();
    }
};

window.moveProgram = function(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= currentPrograms.length) return;
    const temp = currentPrograms[index];
    currentPrograms[index] = currentPrograms[targetIdx];
    currentPrograms[targetIdx] = temp;
    renderProgramsAdmin();
};

window.deleteProgram = function(id) {
    const prog = currentPrograms.find(p => p.id === id);
    const progName = prog ? prog.judul : 'program ini';
    if (confirm(`Apakah Anda yakin ingin menghapus program "${progName}"?\n(Perubahan permanen disimpan saat Anda menekan tombol Simpan Konten)`)) {
        currentPrograms = currentPrograms.filter(p => p.id !== id);
        renderProgramsAdmin();
    }
};

window.updateProgramPreview = function() {
    const previewGrid = document.getElementById('programLivePreviewGrid');
    const badgeEl = document.getElementById('activeProgramCountBadge');
    if (!previewGrid) return;

    const activeProgs = currentPrograms.filter(p => p.active !== false);

    if (badgeEl) {
        badgeEl.textContent = `${activeProgs.length} Program Aktif`;
    }

    if (activeProgs.length === 0) {
        previewGrid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:24px;color:#94a3b8;font-style:italic;">
                <i class="fas fa-info-circle" style="font-size:1.5rem;margin-bottom:8px;display:block;"></i>
                Semua program berstatus nonaktif. Halaman publik akan menampilkan pesan default atau menyembunyikan kartu.
            </div>
        `;
        return;
    }

    previewGrid.innerHTML = activeProgs.map(p => {
        return `
            <div class="program-card" style="box-shadow:none;border:1px solid #e2e8f0;">
                <div class="program-icon" style="width:48px;height:48px;font-size:1.3rem;margin-bottom:14px;">
                    <i class="${escapeHtml(p.icon || 'fas fa-star')}"></i>
                </div>
                <h3 style="font-size:1.1rem;margin-bottom:8px;color:var(--primary-dark);">${escapeHtml(p.judul || 'Tanpa Judul')}</h3>
                <p style="font-size:0.86rem;color:#64748b;line-height:1.6;margin:0;">${escapeHtml(p.desc || '-')}</p>
            </div>
        `;
    }).join('');
};

/* -------------------------------------------------------------
   PDF NOTES FUNCTIONS
   ------------------------------------------------------------- */
const DEFAULT_PDF_NOTES = [
    "Simpan lembar bukti pendaftaran ini sebagai tanda bukti resmi pendaftaran online Anda.",
    "Cek status hasil seleksi secara berkala melalui menu 'Cek Status' di website resmi.",
    "Bawa cetakan bukti ini beserta dokumen asli saat jadwal verifikasi fisik / daftar ulang."
];

let currentPdfNotes = [...DEFAULT_PDF_NOTES];

window.renderPdfNotesAdmin = function() {
    const listEl = document.getElementById('pdfNotesList');
    if (!listEl) return;

    if (currentPdfNotes.length === 0) {
        listEl.innerHTML = '<div style="color:#94a3b8;font-style:italic;padding:12px;background:#fff;border-radius:8px;border:1px dashed #cbd5e1;text-align:center;">Belum ada catatan PDF. Klik tombol "+ Tambah Catatan PDF" di atas.</div>';
        updatePdfNotesPreview();
        return;
    }

    listEl.innerHTML = currentPdfNotes.map((note, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === currentPdfNotes.length - 1;
        return `
            <div class="pdf-note-item" style="display:flex;align-items:flex-start;gap:10px;background:#ffffff;border:1px solid #e2e8f0;padding:10px 14px;border-radius:8px;">
                <span style="font-weight:700;color:var(--primary);width:24px;text-align:center;font-size:0.95rem;margin-top:6px;">${idx + 1}.</span>
                <textarea class="form-textarea" style="flex:1;padding:8px 12px;font-size:0.9rem;min-height:48px;resize:vertical;" 
                          rows="2"
                          maxlength="200"
                          placeholder="Tulis instruksi / catatan untuk dicetak pada PDF..."
                          oninput="updatePdfNoteText(${idx}, this.value)">${escapeHtml(note)}</textarea>
                <div style="display:flex;gap:4px;margin-top:4px;">
                    <button type="button" class="btn btn-outline-secondary btn-sm" 
                            style="padding:6px 10px;font-size:0.8rem;" 
                            title="Pindah ke Atas" 
                            ${isFirst ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : `onclick="movePdfNote(${idx}, -1)"`}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" 
                            style="padding:6px 10px;font-size:0.8rem;" 
                            title="Pindah ke Bawah" 
                            ${isLast ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : `onclick="movePdfNote(${idx}, 1)"`}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" 
                            style="padding:6px 10px;font-size:0.8rem;" 
                            title="Hapus Catatan" 
                            onclick="deletePdfNote(${idx})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    updatePdfNotesPreview();
};

window.addPdfNote = function() {
    currentPdfNotes.push('');
    renderPdfNotesAdmin();
    setTimeout(() => {
        const listEl = document.getElementById('pdfNotesList');
        if (listEl) {
            const textareas = listEl.querySelectorAll('textarea');
            if (textareas.length > 0) textareas[textareas.length - 1].focus();
        }
    }, 50);
};

window.updatePdfNoteText = function(index, value) {
    if (index >= 0 && index < currentPdfNotes.length) {
        currentPdfNotes[index] = value;
        updatePdfNotesPreview();
    }
};

window.movePdfNote = function(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= currentPdfNotes.length) return;
    const temp = currentPdfNotes[index];
    currentPdfNotes[index] = currentPdfNotes[targetIdx];
    currentPdfNotes[targetIdx] = temp;
    renderPdfNotesAdmin();
};

window.deletePdfNote = function(index) {
    const noteText = currentPdfNotes[index] || `Catatan ${index + 1}`;
    const preview = noteText.length > 40 ? noteText.substring(0, 40) + '...' : noteText;
    if (confirm(`Apakah Anda yakin ingin menghapus catatan "${preview}"?\n(Perubahan permanen disimpan saat Anda menekan tombol Simpan Catatan PDF)`)) {
        currentPdfNotes.splice(index, 1);
        renderPdfNotesAdmin();
    }
};

window.updatePdfNotesPreview = function() {
    const previewEl = document.getElementById('pdfNotesLivePreview');
    if (!previewEl) return;

    const validNotes = currentPdfNotes.map(n => n.trim()).filter(n => n.length > 0);
    if (validNotes.length === 0) {
        previewEl.innerHTML = '<span style="color:#a16207;font-style:italic;">Tidak ada catatan khusus yang aktif. Bagian catatan pada PDF akan dikosongkan.</span>';
        return;
    }

    previewEl.innerHTML = validNotes.map((n, idx) => `
        <div style="display:flex;gap:8px;margin-bottom:4px;">
            <strong>${idx + 1}.</strong>
            <span>${escapeHtml(n)}</span>
        </div>
    `).join('');
};

window.savePdfNotes = async function() {
    const btn = document.getElementById('savePdfNotesBtn');
    const msg = document.getElementById('pdfNotesMessage');
    const origHtml = btn ? btn.innerHTML : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan Catatan...';
    }
    if (msg) msg.style.display = 'none';

    const cleanedNotes = currentPdfNotes.map(n => n.trim()).filter(n => n.length > 0);

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'updateSettings',
                settings: {
                    catatanPdf: JSON.stringify(cleanedNotes)
                }
            }),
            redirect: 'follow'
        });

        const result = await response.json();
        if (result.status === 'success') {
            currentPdfNotes = cleanedNotes;
            renderPdfNotesAdmin();
            if (msg) {
                msg.style.display = 'block';
                msg.style.background = '#dcfce7';
                msg.style.color = '#15803d';
                msg.style.border = '1px solid #86efac';
                msg.innerHTML = '<i class="fas fa-check-circle"></i> <strong>Berhasil!</strong> Catatan bukti pendaftaran PDF telah diperbarui di Google Sheets dan otomatis tampil saat pembuatan bukti pendaftaran baru.';
                msg.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            if (msg) {
                msg.style.display = 'block';
                msg.style.background = '#fee2e2';
                msg.style.color = '#b91c1c';
                msg.style.border = '1px solid #fca5a5';
                msg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal menyimpan: ' + (result.message || 'Terjadi kesalahan sistem');
            }
        }
    } catch(err) {
        if (msg) {
            msg.style.display = 'block';
            msg.style.background = '#fee2e2';
            msg.style.color = '#b91c1c';
            msg.style.border = '1px solid #fca5a5';
            msg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Kesalahan koneksi saat menyimpan catatan PDF.';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
};

window.previewDummyPdf = function() {
    const dummyData = {
        "No Pendaftaran": "SPMB-2026-000-CONTOH",
        "Nama Lengkap": "CONTOH SISWA SIMULASI",
        "Jenis Kelamin": "Laki-laki",
        "Nama Orang Tua": "Budi Santoso (Orang Tua / Wali)",
        "No HP": "0812-3456-7890",
        "Status": "Tercatat dalam Sistem",
        "Timestamp": new Date().toISOString()
    };
    renderReceiptDocument(dummyData, currentPdfNotes, true);
};

/* ==========================================================================
   GOOGLE DRIVE PHOTO & MEDIA MANAGEMENT
   ========================================================================== */
let currentPhotosList = [];
let currentPhotoFilter = 'all';
let selectedUploadFile = null;
let editPhotoNewFileSelected = null;

function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const compressedDataUrl = canvas.toDataURL(outputMime, quality);
                resolve({
                    base64Data: compressedDataUrl,
                    fileName: file.name
                });
            };
            img.onerror = () => reject(new Error('Gagal memuat gambar untuk kompresi'));
        };
        reader.onerror = () => reject(new Error('Gagal membaca file'));
    });
}

window.onAdminPhotoSelected = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    selectedUploadFile = file;

    const nameEl = document.getElementById('selectedPhotoFileName');
    const judulInput = document.getElementById('adminPhotoJudul');
    if (nameEl) {
        nameEl.style.display = 'block';
        nameEl.innerHTML = `<i class="fas fa-check-circle"></i> File dipilih: <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    }
    if (judulInput && !judulInput.value.trim()) {
        judulInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');
    }
};

window.executePhotoUpload = async function() {
    const fileInput = document.getElementById('adminPhotoFileInput');
    const file = selectedUploadFile || (fileInput && fileInput.files && fileInput.files[0]);
    const msgEl = document.getElementById('photoUploadMsg');
    const btn = document.getElementById('btnUploadPhoto');
    const origBtnHtml = btn ? btn.innerHTML : '';

    if (!file) {
        alert('Silakan pilih file foto terlebih dahulu.');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengompresi & Mengunggah ke Google Drive...';
    }
    if (msgEl) msgEl.style.display = 'none';

    try {
        const compressed = await compressImage(file);
        const judul = document.getElementById('adminPhotoJudul').value.trim() || file.name.replace(/\.[^/.]+$/, '');
        const kategori = document.getElementById('adminPhotoKategori').value;
        const deskripsi = document.getElementById('adminPhotoDeskripsi').value.trim();
        const aktif = document.getElementById('adminPhotoAktif').checked;

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'uploadPhoto',
                adminUsername: localStorage.getItem('adminUsername') || 'admin',
                adminPassword: sessionStorage.getItem('adminPass') || '',
                base64Data: compressed.base64Data,
                fileName: compressed.fileName,
                judul: judul,
                kategori: kategori,
                deskripsi: deskripsi,
                aktif: aktif
            }),
            redirect: 'follow'
        });

        const result = await response.json();
        if (result.status === 'success') {
            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.style.background = '#dcfce7';
                msgEl.style.color = '#15803d';
                msgEl.style.border = '1px solid #86efac';
                msgEl.innerHTML = '<i class="fas fa-check-circle"></i> <strong>Berhasil!</strong> Foto telah diunggah ke Google Drive dan langsung terdaftar di website.';
            }
            selectedUploadFile = null;
            if (fileInput) fileInput.value = '';
            document.getElementById('adminPhotoJudul').value = '';
            document.getElementById('adminPhotoDeskripsi').value = '';
            const nameEl = document.getElementById('selectedPhotoFileName');
            if (nameEl) nameEl.style.display = 'none';

            loadPhotosAdmin(true);
        } else {
            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.style.background = '#fee2e2';
                msgEl.style.color = '#b91c1c';
                msgEl.style.border = '1px solid #fca5a5';
                msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal mengunggah: ' + (result.message || 'Terjadi kesalahan sistem');
            }
        }
    } catch(err) {
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.background = '#fee2e2';
            msgEl.style.color = '#b91c1c';
            msgEl.style.border = '1px solid #fca5a5';
            msgEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Kesalahan: ' + (err.message || 'Gagal memproses file foto.');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origBtnHtml;
        }
    }
};

window.loadPhotosAdmin = async function(forceRefresh = false) {
    const grid = document.getElementById('adminPhotosGrid');
    const countBadge = document.getElementById('photoCountBadge');
    if (!grid) return;

    if (forceRefresh || currentPhotosList.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:36px;color:#94a3b8;font-style:italic;">
                <i class="fas fa-spinner fa-spin" style="font-size:1.8rem;margin-bottom:10px;display:block;"></i>
                Memuat koleksi foto dari Google Drive...
            </div>
        `;
        try {
            const response = await fetch(CONFIG.API_URL + '?action=getPhotos', { redirect: 'follow' });
            const result = await response.json();
            if (result.status === 'success' && Array.isArray(result.data)) {
                currentPhotosList = result.data;
            }
        } catch(e) {
            console.warn('Error loading photos from backend:', e);
        }
    }

    renderAdminPhotosGrid();
};

window.filterAdminPhotos = function(category) {
    currentPhotoFilter = category;
    const tabs = document.querySelectorAll('#photoFilterTabs button');
    tabs.forEach(btn => {
        if (btn.getAttribute('data-photo-filter') === category) {
            btn.className = 'btn btn-sm btn-primary';
        } else {
            btn.className = 'btn btn-sm btn-outline-secondary';
        }
    });
    renderAdminPhotosGrid();
};

window.renderAdminPhotosGrid = function() {
    const grid = document.getElementById('adminPhotosGrid');
    const countBadge = document.getElementById('photoCountBadge');
    if (!grid) return;

    let filtered = currentPhotosList;
    if (currentPhotoFilter !== 'all') {
        filtered = currentPhotosList.filter(p => p.kategori === currentPhotoFilter);
    }

    if (countBadge) {
        countBadge.textContent = `${filtered.length} Foto Ditampilkan (${currentPhotosList.length} Total)`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:36px;color:#94a3b8;background:#fff;border-radius:10px;border:1px dashed #cbd5e1;">
                <i class="fas fa-images" style="font-size:2rem;margin-bottom:8px;display:block;opacity:0.6;"></i>
                Belum ada foto untuk kategori ini. Gunakan form di atas untuk mengunggah foto ke Google Drive.
            </div>
        `;
        return;
    }

    const categoryBadges = {
        slide: { bg: '#fef3c7', text: '#92400e', label: 'Slide Beranda' },
        fasilitas: { bg: '#e0f2fe', text: '#0369a1', label: 'Fasilitas' },
        kegiatan: { bg: '#dcfce7', text: '#15803d', label: 'Kegiatan' },
        prestasi: { bg: '#f3e8ff', text: '#7e22ce', label: 'Prestasi' },
        berita: { bg: '#ccfbf1', text: '#0f766e', label: 'Berita' },
        kepsek: { bg: '#e0e7ff', text: '#3730a3', label: 'Foto Kepsek' },
        lainnya: { bg: '#f1f5f9', text: '#475569', label: 'Lainnya' }
    };

    grid.innerHTML = filtered.map((p, idx) => {
        const cat = categoryBadges[p.kategori] || categoryBadges.lainnya;
        const isAktif = p.aktif !== false;
        const thumbSrc = p.thumbnailUrl || (p.driveFileId ? `https://lh3.googleusercontent.com/d/${p.driveFileId}=w600` : p.fileUrl);

        return `
            <div class="photo-admin-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;">
                <div style="position:relative;width:100%;height:160px;background:#f1f5f9;overflow:hidden;">
                    <img src="${escapeHtml(thumbSrc)}" 
                         alt="${escapeHtml(p.judul)}" 
                         loading="lazy"
                         onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100%25\' height=\'100%25\' fill=\'%23e2e8f0\'><text x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'14\' fill=\'%2364748b\'>Foto Google Drive</text></svg>'"
                         style="width:100%;height:100%;object-fit:cover;">
                    <div style="position:absolute;top:8px;left:8px;display:flex;gap:4px;">
                        <span style="background:${cat.bg};color:${cat.text};padding:3px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">
                            ${cat.label}
                        </span>
                    </div>
                    <div style="position:absolute;top:8px;right:8px;">
                        <span style="background:${isAktif ? '#dcfce7' : '#fee2e2'};color:${isAktif ? '#15803d' : '#b91c1c'};padding:3px 8px;border-radius:4px;font-size:0.72rem;font-weight:700;">
                            ${isAktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                    </div>
                </div>
                <div style="padding:14px;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                        <h5 style="margin:0 0 6px 0;font-size:0.95rem;color:var(--primary-dark);">${escapeHtml(p.judul || 'Tanpa Judul')}</h5>
                        <p style="margin:0 0 10px 0;font-size:0.8rem;color:#64748b;line-height:1.4;">${escapeHtml(p.deskripsi || '-')}</p>
                    </div>
                    <div style="border-top:1px solid #f1f5f9;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
                        <small style="color:#94a3b8;font-size:0.75rem;">Urutan: #${p.urutan || 0}</small>
                        <div style="display:flex;gap:4px;">
                            <button type="button" class="btn btn-outline-secondary btn-sm" 
                                    style="padding:4px 8px;font-size:0.78rem;" 
                                    title="${isAktif ? 'Sembunyikan dari Publik' : 'Tampilkan ke Publik'}" 
                                    onclick="togglePhotoStatus('${p.id}')">
                                <i class="fas ${isAktif ? 'fa-eye-slash' : 'fa-eye'}"></i>
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm" 
                                    style="padding:4px 8px;font-size:0.78rem;" 
                                    title="Edit Metadata" 
                                    onclick="openPhotoEditModal('${p.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger btn-sm" 
                                    style="padding:4px 8px;font-size:0.78rem;" 
                                    title="Hapus Foto" 
                                    onclick="deletePhotoConfirm('${p.id}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.togglePhotoStatus = async function(id) {
    const photo = currentPhotosList.find(p => p.id === id);
    if (!photo) return;
    const newStatus = !photo.aktif;

    photo.aktif = newStatus;
    renderAdminPhotosGrid();

    try {
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'updatePhoto',
                id: id,
                aktif: newStatus,
                adminUsername: localStorage.getItem('adminUsername') || 'admin',
                adminPassword: sessionStorage.getItem('adminPass') || ''
            }),
            redirect: 'follow'
        });
    } catch(e) {
        console.error('Error updating photo status:', e);
    }
};

window.openPhotoEditModal = function(id) {
    const photo = currentPhotosList.find(p => p.id === id);
    if (!photo) return;

    document.getElementById('editPhotoId').value = photo.id;
    document.getElementById('editPhotoJudul').value = photo.judul || '';
    document.getElementById('editPhotoKategori').value = photo.kategori || 'fasilitas';
    document.getElementById('editPhotoDeskripsi').value = photo.deskripsi || '';
    document.getElementById('editPhotoUrutan').value = photo.urutan || 1;
    document.getElementById('editPhotoAktif').checked = photo.aktif !== false;
    document.getElementById('editPhotoPreview').src = photo.thumbnailUrl || (photo.driveFileId ? `https://lh3.googleusercontent.com/d/${photo.driveFileId}=w600` : photo.fileUrl);
    document.getElementById('editPhotoNewFile').value = '';
    editPhotoNewFileSelected = null;

    const msg = document.getElementById('editPhotoMsg');
    if (msg) msg.style.display = 'none';

    const modal = document.getElementById('photoEditModal');
    if (modal) modal.classList.add('active');
};

window.closePhotoEditModal = function() {
    const modal = document.getElementById('photoEditModal');
    if (modal) modal.classList.remove('active');
};

window.onEditPhotoNewFileSelected = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    editPhotoNewFileSelected = file;
    const previewImg = document.getElementById('editPhotoPreview');
    if (previewImg) {
        const reader = new FileReader();
        reader.onload = (ev) => { previewImg.src = ev.target.result; };
        reader.readAsDataURL(file);
    }
};

window.submitPhotoEditMetadata = async function() {
    const id = document.getElementById('editPhotoId').value;
    const judul = document.getElementById('editPhotoJudul').value.trim();
    const kategori = document.getElementById('editPhotoKategori').value;
    const deskripsi = document.getElementById('editPhotoDeskripsi').value.trim();
    const urutan = parseInt(document.getElementById('editPhotoUrutan').value, 10) || 1;
    const aktif = document.getElementById('editPhotoAktif').checked;
    const btn = document.getElementById('btnSaveEditPhoto');
    const msg = document.getElementById('editPhotoMsg');

    if (!judul) {
        alert('Judul foto wajib diisi.');
        return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }
    if (msg) msg.style.display = 'none';

    const payload = {
        action: 'updatePhoto',
        id: id,
        judul: judul,
        kategori: kategori,
        deskripsi: deskripsi,
        urutan: urutan,
        aktif: aktif,
        adminUsername: localStorage.getItem('adminUsername') || 'admin',
        adminPassword: sessionStorage.getItem('adminPass') || ''
    };

    try {
        if (editPhotoNewFileSelected) {
            const compressed = await compressImage(editPhotoNewFileSelected);
            payload.newBase64Data = compressed.base64Data;
            payload.fileName = compressed.fileName;
        }

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });

        const result = await response.json();
        if (result.status === 'success') {
            closePhotoEditModal();
            loadPhotosAdmin(true);
        } else {
            if (msg) {
                msg.style.display = 'block';
                msg.style.background = '#fee2e2';
                msg.style.color = '#b91c1c';
                msg.innerHTML = result.message || 'Gagal menyimpan perubahan.';
            }
        }
    } catch(e) {
        if (msg) {
            msg.style.display = 'block';
            msg.style.background = '#fee2e2';
            msg.style.color = '#b91c1c';
            msg.innerHTML = 'Kesalahan koneksi saat menyimpan metadata foto.';
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan'; }
    }
};

window.deletePhotoConfirm = async function(id) {
    const photo = currentPhotosList.find(p => p.id === id);
    const title = photo ? photo.judul : 'foto ini';
    if (!confirm(`Hapus foto "${title}" secara permanen dari Google Drive dan database website?`)) {
        return;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'deletePhoto',
                id: id,
                adminUsername: localStorage.getItem('adminUsername') || 'admin',
                adminPassword: sessionStorage.getItem('adminPass') || ''
            }),
            redirect: 'follow'
        });

        const result = await response.json();
        if (result.status === 'success') {
            currentPhotosList = currentPhotosList.filter(p => p.id !== id);
            renderAdminPhotosGrid();
        } else {
            alert('Gagal menghapus: ' + (result.message || 'Terjadi kesalahan'));
        }
    } catch(e) {
        alert('Gagal menghubungi server saat menghapus foto.');
    }
};

async function loadSettingsData() {
    try {
        const response = await fetch(CONFIG.API_URL + '?action=getSettings', { redirect: 'follow' });
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            const data = result.data;

            // Pendaftaran status
            if (data.statusPendaftaran === 'Tutup') {
                const tutupRadio = document.getElementById('statusPendaftaranTutup');
                if (tutupRadio) tutupRadio.checked = true;
            } else {
                const bukaRadio = document.getElementById('statusPendaftaranBuka');
                if (bukaRadio) bukaRadio.checked = true;
            }

            // Populate all CMS Inputs
            CMS_KEYS.forEach(key => {
                const el = document.getElementById('cms_' + key);
                if (el && data[key] !== undefined && data[key] !== null) {
                    el.value = data[key];
                }
            });

            // Populate WhatsApp Contact Settings in Tab 4
            const waInput = document.getElementById('setting_whatsapp');
            const waMsgInput = document.getElementById('setting_whatsappMessage');
            if (waInput && data.whatsapp) waInput.value = data.whatsapp;
            if (waMsgInput && data.whatsappMessage) waMsgInput.value = data.whatsappMessage;
            updateWaPreview();

            // Populate Tagline data
            if (data.kepsekTagline) {
                try {
                    const parsed = typeof data.kepsekTagline === 'string' ? JSON.parse(data.kepsekTagline) : data.kepsekTagline;
                    if (Array.isArray(parsed)) currentTaglines = parsed;
                } catch(e) {
                    console.error('Error parsing kepsekTagline:', e);
                }
            }
            renderTaglineAdmin();

            // Populate Program data
            if (data.programList) {
                try {
                    const parsed = typeof data.programList === 'string' ? JSON.parse(data.programList) : data.programList;
                    if (Array.isArray(parsed)) currentPrograms = parsed;
                } catch(e) {
                    console.error('Error parsing programList:', e);
                }
            }
            renderProgramsAdmin();

            // Populate PDF Notes data
            if (data.catatanPdf) {
                try {
                    const parsed = typeof data.catatanPdf === 'string' ? JSON.parse(data.catatanPdf) : data.catatanPdf;
                    if (Array.isArray(parsed)) currentPdfNotes = parsed;
                } catch(e) {
                    console.error('Error parsing catatanPdf:', e);
                }
            }
            renderPdfNotesAdmin();
        } else {
            renderTaglineAdmin();
            renderProgramsAdmin();
            renderPdfNotesAdmin();
        }
    } catch (e) {
        console.error('Error loading settings:', e);
        renderTaglineAdmin();
        renderProgramsAdmin();
        renderPdfNotesAdmin();
    }
}

window.saveCmsContent = async function () {
    const btnTop = document.getElementById('btnSaveCmsTop');
    const btnBtm = document.getElementById('btnSaveCmsBottom');
    const msg = document.getElementById('cmsMessage');

    const originalTopText = btnTop ? btnTop.innerHTML : '';
    const originalBtmText = btnBtm ? btnBtm.innerHTML : '';

    if (btnTop) { btnTop.disabled = true; btnTop.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan ke Database...'; }
    if (btnBtm) { btnBtm.disabled = true; btnBtm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }
    if (msg) msg.style.display = 'none';

    // Collect all CMS field values
    const settingsPayload = {};
    CMS_KEYS.forEach(key => {
        const el = document.getElementById('cms_' + key);
        if (el) {
            settingsPayload[key] = el.value.trim();
        }
    });

    // Inject tagline and program data
    settingsPayload.kepsekTagline = JSON.stringify(currentTaglines.map(t => t.trim()).filter(t => t.length > 0));
    settingsPayload.programList = JSON.stringify(currentPrograms);
    settingsPayload.catatanPdf = JSON.stringify(currentPdfNotes.map(n => n.trim()).filter(n => n.length > 0));

    // Backward compatibility for legacy CMS keys (prog1Judul ... prog4Desc)
    const activeProgs = currentPrograms.filter(p => p.active !== false);
    for (let i = 1; i <= 4; i++) {
        const prog = activeProgs[i - 1];
        if (prog) {
            settingsPayload[`prog${i}Judul`] = prog.judul || '';
            settingsPayload[`prog${i}Desc`] = prog.desc || '';
        }
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'updateSettings',
                settings: settingsPayload
            }),
            redirect: 'follow'
        });

        const result = await response.json();

        if (result.status === 'success') {
            if (msg) {
                msg.style.display = 'block';
                msg.style.background = '#dcfce7';
                msg.style.color = '#15803d';
                msg.style.border = '1px solid #86efac';
                msg.innerHTML = '<i class="fas fa-check-circle"></i> <strong>Berhasil!</strong> Seluruh konten website telah disimpan ke Google Sheets dan otomatis tampil di halaman utama.';
                msg.scrollIntoView({ behavior: 'smooth' });
            }

            // Sync to Tab 4 WhatsApp inputs
            const waInput = document.getElementById('setting_whatsapp');
            const waMsgInput = document.getElementById('setting_whatsappMessage');
            if (waInput && settingsPayload.whatsapp) waInput.value = settingsPayload.whatsapp;
            if (waMsgInput && settingsPayload.whatsappMessage !== undefined) waMsgInput.value = settingsPayload.whatsappMessage;
            updateWaPreview();
        } else {
            if (msg) {
                msg.style.display = 'block';
                msg.style.background = '#fee2e2';
                msg.style.color = '#b91c1c';
                msg.style.border = '1px solid #fca5a5';
                msg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal menyimpan: ' + (result.message || 'Terjadi kesalahan');
            }
        }
    } catch (error) {
        console.error('Save CMS error:', error);
        if (msg) {
            msg.style.display = 'block';
            msg.style.background = '#fee2e2';
            msg.style.color = '#b91c1c';
            msg.style.border = '1px solid #fca5a5';
            msg.innerHTML = '<i class="fas fa-wifi"></i> Gagal terhubung ke server backend.';
        }
    } finally {
        if (btnTop) { btnTop.disabled = false; btnTop.innerHTML = originalTopText; }
        if (btnBtm) { btnBtm.disabled = false; btnBtm.innerHTML = originalBtmText; }
    }
};

/* ==========================================================================
   8. STATUS PENDAFTARAN TAB
   ========================================================================== */
function initSettingsTab() {
    const form = document.getElementById('settingsForm');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const btn = document.getElementById('saveSettingsBtn');
        const msg = document.getElementById('settingsMessage');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan Status...';
        if (msg) msg.style.display = 'none';

        const statusPendaftaran = document.getElementById('statusPendaftaranBuka').checked ? 'Buka' : 'Tutup';

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'updateSettings',
                    settings: { statusPendaftaran }
                }),
                redirect: 'follow'
            });

            const result = await response.json();

            if (result.status === 'success') {
                if (msg) {
                    msg.style.display = 'block';
                    msg.style.background = '#dcfce7';
                    msg.style.color = '#15803d';
                    msg.style.padding = '12px 16px';
                    msg.style.borderRadius = '8px';
                    msg.innerHTML = '<i class="fas fa-check-circle"></i> Status pendaftaran berhasil diperbarui!';
                }
            } else {
                if (msg) {
                    msg.style.display = 'block';
                    msg.style.background = '#fee2e2';
                    msg.style.color = '#b91c1c';
                    msg.style.padding = '12px 16px';
                    msg.style.borderRadius = '8px';
                    msg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal: ' + (result.message || '');
                }
            }
        } catch (error) {
            console.error('Save status error:', error);
            if (msg) {
                msg.style.display = 'block';
                msg.style.background = '#fee2e2';
                msg.style.color = '#b91c1c';
                msg.style.padding = '12px 16px';
                msg.style.borderRadius = '8px';
                msg.innerHTML = '<i class="fas fa-wifi"></i> Gagal terhubung ke backend.';
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Form Pengaturan Kontak WhatsApp Panitia
    const waForm = document.getElementById('waSettingsForm');
    const waInput = document.getElementById('setting_whatsapp');
    const waMsgInput = document.getElementById('setting_whatsappMessage');

    if (waInput) waInput.addEventListener('input', updateWaPreview);
    if (waMsgInput) waMsgInput.addEventListener('input', updateWaPreview);

    if (waForm) {
        waForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Otorisasi: Pastikan sesi admin aktif
            if (localStorage.getItem('adminLoggedIn') !== 'true') {
                alert('Sesi administrator Anda telah berakhir. Silakan login kembali.');
                window.location.href = '/admin/index.html';
                return;
            }

            const btn = document.getElementById('saveWaSettingsBtn');
            const msg = document.getElementById('waSettingsMessage');
            const rawNumber = waInput ? waInput.value.trim() : '';
            const rawMessage = waMsgInput ? waMsgInput.value.trim() : '';

            if (msg) msg.style.display = 'none';

            // Validasi format nomor WhatsApp Indonesia
            if (!isValidIndonesianWa(rawNumber)) {
                if (msg) {
                    msg.style.display = 'block';
                    msg.style.background = '#fee2e2';
                    msg.style.color = '#b91c1c';
                    msg.style.border = '1px solid #fca5a5';
                    msg.style.padding = '12px 16px';
                    msg.style.borderRadius = '8px';
                    msg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <strong>Nomor WhatsApp Tidak Valid:</strong> Masukkan nomor aktif Indonesia dengan format <code>08xxxxxxxxxx</code> atau <code>+62xxxxxxxxxx</code> (10-14 digit).';
                }
                if (waInput) waInput.focus();
                return;
            }

            // Normalisasi nomor ke format internasional tanpa tanda +
            const normalizedNumber = normalizeWaNumber(rawNumber);
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan Kontak WhatsApp...';

            try {
                const response = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({
                        action: 'updateSettings',
                        settings: {
                            whatsapp: normalizedNumber,
                            whatsappMessage: rawMessage
                        }
                    }),
                    redirect: 'follow'
                });

                const result = await response.json();

                if (result.status === 'success') {
                    // Sinkronkan nilai ke Tab 3 (CMS Section 12)
                    const cmsWa = document.getElementById('cms_whatsapp');
                    const cmsWaMsg = document.getElementById('cms_whatsappMessage');
                    if (cmsWa) cmsWa.value = normalizedNumber;
                    if (cmsWaMsg) cmsWaMsg.value = rawMessage;

                    if (msg) {
                        msg.style.display = 'block';
                        msg.style.background = '#dcfce7';
                        msg.style.color = '#15803d';
                        msg.style.border = '1px solid #86efac';
                        msg.style.padding = '12px 16px';
                        msg.style.borderRadius = '8px';
                        msg.innerHTML = '<i class="fas fa-check-circle"></i> <strong>Berhasil!</strong> Kontak WhatsApp Panitia berhasil disimpan ke database dan langsung aktif di seluruh website publik.';
                    }
                    updateWaPreview();
                } else {
                    if (msg) {
                        msg.style.display = 'block';
                        msg.style.background = '#fee2e2';
                        msg.style.color = '#b91c1c';
                        msg.style.border = '1px solid #fca5a5';
                        msg.style.padding = '12px 16px';
                        msg.style.borderRadius = '8px';
                        msg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal menyimpan: ' + (result.message || 'Terjadi kesalahan');
                    }
                }
            } catch (error) {
                console.error('Save WhatsApp settings error:', error);
                if (msg) {
                    msg.style.display = 'block';
                    msg.style.background = '#fee2e2';
                    msg.style.color = '#b91c1c';
                    msg.style.border = '1px solid #fca5a5';
                    msg.style.padding = '12px 16px';
                    msg.style.borderRadius = '8px';
                    msg.innerHTML = '<i class="fas fa-wifi"></i> Gagal terhubung ke backend server.';
                }
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }
}

/* ==========================================================================
   9. EXPORT CSV & PDF
   ========================================================================== */
function exportToCsv() {
    if (allRegistrants.length === 0) {
        alert('Tidak ada data pendaftar untuk diekspor.');
        return;
    }

    const headers = ['No Pendaftaran', 'Nama Lengkap', 'NIK', 'Tempat Lahir', 'Tanggal Lahir', 'Jenis Kelamin', 'Alamat', 'Nama Orang Tua', 'No HP', 'Status', 'Timestamp'];
    const rows = allRegistrants.map(item => {
        return headers.map(h => {
            let val = (item[h] !== undefined && item[h] !== null) ? String(item[h]) : '';
            val = val.replace(/"/g, '""');
            return `"${val}"`;
        }).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Data_Pendaftar_SPMB_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderReceiptDocument(data, notesList, isDummy = false) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('Library PDF belum siap.');
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

    // School Name & Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(CONFIG.SCHOOL_NAME || 'SMP KP 1 BALEENDAH', 105, 13, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('BUKTI PENDAFTARAN SPMB ONLINE TAHUN AJARAN 2026/2027', 105, 21, { align: 'center' });

    // Dummy watermark if preview
    if (isDummy) {
        doc.setFontSize(8);
        doc.setTextColor(254, 240, 138);
        doc.text('*** PRATINJAU DOKUMEN / DATA SIMULASI DUMMY ***', 105, 28, { align: 'center' });
    }

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

    // Section 1: Non-Sensitive Student Data (Section D.2)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('DATA CALON SISWA', 15, 71);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.4);
    doc.line(15, 73, 195, 73);

    const fields = [
        ['Nama Lengkap Calon Siswa', data['Nama Lengkap'] || '-'],
        ['Jenis Kelamin', data['Jenis Kelamin'] || '-'],
        ['Nama Orang Tua / Wali', data['Nama Orang Tua'] || '-'],
        ['No. WhatsApp / Kontak', data['No HP'] || '-'],
        ['Status Pendaftaran', data['Status'] || 'Tercatat dalam Sistem']
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

    // Section 3: Panitia Notes (Section D.4)
    currentY += 21;
    const notesToRender = Array.isArray(notesList) && notesList.length > 0 
        ? notesList.map(n => n.trim()).filter(n => n.length > 0)
        : DEFAULT_PDF_NOTES;

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

    const safeRegNo = (data['No Pendaftaran'] || 'SPMB').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Bukti_Pendaftaran_${safeRegNo}.pdf`;
    doc.save(filename);
}

window.generateStudentPDF = function (data) {
    renderReceiptDocument(data, currentPdfNotes);
};
