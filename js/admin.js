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
    'namaSekolah', 'taglineSekolah', 'akreditasi', 'topbarAlamat', 'runningText',
    'heroBadge', 'heroTitle', 'heroSubtitle',
    'stat1Value', 'stat1Label', 'stat2Value', 'stat2Label', 'stat3Value', 'stat3Label', 'stat4Value', 'stat4Label',
    'kepsekNama', 'kepsekJabatan', 'kepsekFoto', 'kepsekSambutan',
    'visiSekolah', 'misiSekolah',
    'prog1Judul', 'prog1Desc', 'prog2Judul', 'prog2Desc', 'prog3Judul', 'prog3Desc', 'prog4Judul', 'prog4Desc',
    'telepon', 'email', 'alamat', 'jamLayanan', 'deskripsi'
];

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
        }
    } catch (e) {
        console.error('Error loading settings:', e);
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

window.generateStudentPDF = function (data) {
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

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(CONFIG.SCHOOL_NAME || 'SMP KP 1 BALEENDAH', 105, 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('BUKTI PENDAFTARAN SPMB ONLINE TAHUN AJARAN 2025/2026', 105, 22, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 40, 180, 26, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Nomor Registrasi:', 22, 50);

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(data['No Pendaftaran'] || '-', 22, 59);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Status:', 130, 50);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text(data['Status'] || 'Proses', 130, 58);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('DATA CALON SISWA', 15, 76);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, 78, 195, 78);

    const fields = [
        ['Nama Lengkap', data['Nama Lengkap'] || '-'],
        ['NIK', data['NIK'] || '-'],
        ['Tempat, Tanggal Lahir', `${data['Tempat Lahir'] || '-'}, ${data['Tanggal Lahir'] || '-'}`],
        ['Jenis Kelamin', data['Jenis Kelamin'] || '-'],
        ['Alamat Lengkap', data['Alamat'] || '-'],
        ['Nama Orang Tua / Wali', data['Nama Orang Tua'] || '-'],
        ['No. WhatsApp', data['No HP'] || '-'],
        ['Waktu Registrasi', data['Timestamp'] ? new Date(data['Timestamp']).toLocaleString('id-ID') : '-']
    ];

    let currentY = 86;
    doc.setFontSize(10);

    fields.forEach(([label, val], idx) => {
        if (idx % 2 === 0) {
            doc.setFillColor(241, 245, 249);
            doc.rect(15, currentY - 5, 180, 8, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(label, 20, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkColor);

        if (label === 'Alamat Lengkap' && val.length > 50) {
            const splitVal = doc.splitTextToSize(val, 110);
            doc.text(splitVal, 80, currentY);
            currentY += (splitVal.length - 1) * 5;
        } else {
            doc.text(val, 80, currentY);
        }

        currentY += 8;
    });

    const filename = `Bukti_${data['No Pendaftaran'] || 'SPMB'}.pdf`;
    doc.save(filename);
};
