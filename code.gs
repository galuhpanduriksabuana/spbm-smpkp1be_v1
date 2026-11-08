/**
 * Google Apps Script Backend for SPMB SMP KP 1 BALEENDAH
 * Deploy as a Web App:
 * 1. Click "Deploy" -> "New deployment"
 * 2. Select type: "Web app"
 * 3. Execute as: "Me"
 * 4. Who has access: "Anyone"
 * 5. Click "Deploy" and copy the Web App URL.
 */

const SHEET_NAME = "Data Pendaftar";
const ADMIN_SHEET_NAME = "Admin";
const SETTINGS_SHEET_NAME = "Pengaturan";
const PHOTO_SHEET_NAME = "Foto Website";
const FOLDER_NAME = "SPMB SMP KP 1 BALEENDAH";
const PHOTO_FOLDER_NAME = "Aset Foto Website";

const DEFAULT_FORM_FIELDS = [
  { id: "Nama Lengkap", label: "Nama Lengkap", type: "text", required: true },
  { id: "NIK", label: "NIK", type: "text", required: true },
  { id: "Tempat Lahir", label: "Tempat Lahir", type: "text", required: true },
  { id: "Tanggal Lahir", label: "Tanggal Lahir", type: "date", required: true },
  { id: "Jenis Kelamin", label: "Jenis Kelamin", type: "select", options: ["Laki-laki", "Perempuan"], required: true },
  { id: "Alamat", label: "Alamat Lengkap", type: "textarea", required: true },
  { id: "Nama Orang Tua", label: "Nama Orang Tua/Wali", type: "text", required: true },
  { id: "No HP", label: "No. WhatsApp Aktif", type: "text", required: true },
  { id: "Foto Siswa", label: "Pas Foto 3x4", type: "file", required: true },
  { id: "Kartu Keluarga", label: "Kartu Keluarga", type: "file", required: true },
  { id: "Akta Kelahiran", label: "Akta Kelahiran", type: "file", required: true }
];

const DEFAULT_TAGLINES = [
  "Berakhlak Mulia",
  "Cerdas & Mandiri",
  "Berprestasi"
];

const DEFAULT_PROGRAMS = [
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

const DEFAULT_PDF_NOTES = [
  "Simpan lembar bukti pendaftaran ini sebagai tanda bukti resmi pendaftaran online Anda.",
  "Cek status hasil seleksi secara berkala melalui menu 'Cek Status' di website resmi.",
  "Bawa cetakan bukti ini beserta dokumen asli saat jadwal verifikasi fisik / daftar ulang."
];

const DEFAULT_SETTINGS = {
  kepsekTagline: JSON.stringify(DEFAULT_TAGLINES),
  programList: JSON.stringify(DEFAULT_PROGRAMS),
  catatanPdf: JSON.stringify(DEFAULT_PDF_NOTES),
  namaSekolah: "SDN Harapan Bangsa",
  alamat: "Jl. Pendidikan No. 123, Kota Pelajar, Indonesia 12345",
  telepon: "(021) 1234-5678",
  whatsapp: "081234567890",
  whatsappMessage: "Halo Panitia SPMB SMP KP 1 Baleendah, saya ingin bertanya mengenai pendaftaran murid baru.",
  email: "info@sdnharapanbangsa.sch.id",
  deskripsi: "Mencetak generasi penerus bangsa yang cerdas, berakhlak mulia, dan siap menghadapi tantangan masa depan dengan pendidikan berkualitas.",
  statusPendaftaran: "Buka",
  formFields: JSON.stringify(DEFAULT_FORM_FIELDS)
};

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup Data Pendaftar Sheet
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ["Timestamp", "No Pendaftaran", "Status"];
    DEFAULT_FORM_FIELDS.forEach(f => headers.push(f.id));
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e0e0e0");
    sheet.setFrozenRows(1);
  }

  // Setup Admin Sheet
  let adminSheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(ADMIN_SHEET_NAME);
    adminSheet.appendRow(["Username", "Password"]);
    adminSheet.appendRow(["admin", "admin123"]); // Default credentials
    adminSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e0e0e0");
  }

  // Setup Settings Sheet
  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
    settingsSheet.appendRow(["Key", "Value"]);
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      settingsSheet.appendRow([key, DEFAULT_SETTINGS[key]]);
    });
    settingsSheet.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#e0e0e0");
  }

  // Setup Drive Folder
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!folders.hasNext()) {
    DriveApp.createFolder(FOLDER_NAME);
  }

  // Setup Photo Sheet & Folder
  let photoSheet = ss.getSheetByName(PHOTO_SHEET_NAME);
  if (!photoSheet) {
    photoSheet = ss.insertSheet(PHOTO_SHEET_NAME);
    const photoHeaders = ["ID", "Drive File ID", "File Name", "File URL", "Thumbnail URL", "Judul", "Deskripsi", "Kategori", "MIME Type", "File Size", "Urutan", "Aktif", "Created At", "Updated At"];
    photoSheet.appendRow(photoHeaders);
    photoSheet.getRange(1, 1, 1, photoHeaders.length).setFontWeight("bold").setBackground("#e0e0e0");
    photoSheet.setFrozenRows(1);
  }
  getOrCreatePhotoFolder();
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === "login") return handleLogin(data.username, data.password);
    if (data.action === "checkStatus") return handleCheckStatus(data.noPendaftaran);
    if (data.action === "updateStatus") return updateStatus(data.noPendaftaran, data.newStatus);
    if (data.action === "updateSettings") return handleUpdateSettings(data.settings);
    if (data.action === "uploadPhoto") return handleUploadPhoto(data);
    if (data.action === "updatePhoto") return handleUpdatePhoto(data);
    if (data.action === "deletePhoto") return handleDeletePhoto(data);
    if (data.action === "getPhotos") return handleGetPhotos(data);
    
    return handleRegistration(data);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    if (e.parameter.action === "getSettings") {
      return handleGetSettings();
    }
    if (e.parameter.action === "getPhotos") {
      return handleGetPhotos(e.parameter);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Sheet not found"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        if (row[index] instanceof Date) {
           obj[header] = row[index].toISOString();
        } else {
           obj[header] = row[index];
        }
      });
      return obj;
    });
    
    // Sort by timestamp descending
    result.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: DEFAULT_SETTINGS
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    data: settings
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateSettings(newSettings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) throw new Error("Settings sheet not found");

  // Server-side validation for WhatsApp contact
  if (newSettings.whatsapp !== undefined && newSettings.whatsapp !== null) {
    var rawWa = String(newSettings.whatsapp).trim();
    if (rawWa !== "") {
      var cleanWa = rawWa.replace(/\D/g, '');
      var isValid = /^(08[1-9][0-9]{7,11}|628[1-9][0-9]{7,11})$/.test(cleanWa);
      if (!isValid) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau +62xxxxxxxxxx."
        })).setMimeType(ContentService.MimeType.JSON);
      }
      newSettings.whatsapp = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
    }
  }

  // Server-side validation for kepsekTagline
  if (newSettings.kepsekTagline !== undefined && newSettings.kepsekTagline !== null) {
    try {
      var taglines = typeof newSettings.kepsekTagline === 'string' ? JSON.parse(newSettings.kepsekTagline) : newSettings.kepsekTagline;
      if (Array.isArray(taglines)) {
        var cleanedTaglines = taglines.map(function(t) { return String(t).trim(); }).filter(function(t) { return t.length > 0; });
        newSettings.kepsekTagline = JSON.stringify(cleanedTaglines);
      }
    } catch (e) {
      // Keep as-is if string
    }
  }

  // Server-side validation for programList
  if (newSettings.programList !== undefined && newSettings.programList !== null) {
    try {
      var programs = typeof newSettings.programList === 'string' ? JSON.parse(newSettings.programList) : newSettings.programList;
      if (Array.isArray(programs)) {
        var cleanedPrograms = programs.map(function(p, idx) {
          return {
            id: p.id || 'prog-' + (idx + 1),
            judul: String(p.judul || '').trim(),
            desc: String(p.desc || '').trim(),
            icon: String(p.icon || 'fas fa-star').trim(),
            active: p.active !== false
          };
        }).filter(function(p) { return p.judul.length > 0; });
        newSettings.programList = JSON.stringify(cleanedPrograms);
      }
    } catch (e) {
      // Keep as-is if string
    }
  }

  // Server-side validation for catatanPdf
  if (newSettings.catatanPdf !== undefined && newSettings.catatanPdf !== null) {
    try {
      var pdfNotes = typeof newSettings.catatanPdf === 'string' ? JSON.parse(newSettings.catatanPdf) : newSettings.catatanPdf;
      if (Array.isArray(pdfNotes)) {
        var cleanedPdfNotes = pdfNotes.map(function(n) { return String(n).trim(); }).filter(function(n) { return n.length > 0; });
        newSettings.catatanPdf = JSON.stringify(cleanedPdfNotes);
      }
    } catch (e) {
      // Keep as-is if string
    }
  }

  const data = sheet.getDataRange().getValues();
  
  Object.keys(newSettings).forEach(key => {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(
          typeof newSettings[key] === 'object' ? JSON.stringify(newSettings[key]) : newSettings[key]
        );
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, typeof newSettings[key] === 'object' ? JSON.stringify(newSettings[key]) : newSettings[key]]);
    }
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Pengaturan berhasil disimpan"
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleRegistration(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  // Check if registration is open
  const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  let isOpen = true;
  if (settingsSheet) {
    const settingsData = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][0] === "statusPendaftaran" && settingsData[i][1] === "Tutup") {
        isOpen = false;
        break;
      }
    }
  }

  if (!isOpen) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Pendaftaran sedang ditutup."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Generate No Pendaftaran
  const year = new Date().getFullYear();
  const lastRow = sheet.getLastRow();
  let nextId = 1;
  if (lastRow > 1) {
    // Find No Pendaftaran column index
    const noRegIdx = headers.indexOf("No Pendaftaran");
    if (noRegIdx !== -1) {
      const lastNo = sheet.getRange(lastRow, noRegIdx + 1).getValue();
      const parts = String(lastNo).split("-");
      if (parts.length === 3) {
        nextId = parseInt(parts[2], 10) + 1;
      }
    }
  }
  const noPendaftaran = `SPMB-${year}-${String(nextId).padStart(3, '0')}`;
  
  const folder = getOrCreateFolder(FOLDER_NAME);
  const rowData = new Array(headers.length).fill("");
  
  // Fill known headers
  headers.forEach((header, index) => {
    if (header === "Timestamp") rowData[index] = new Date();
    else if (header === "No Pendaftaran") rowData[index] = noPendaftaran;
    else if (header === "Status") rowData[index] = "Proses";
    else if (data[header] !== undefined) {
      let value = data[header];
      if (typeof value === 'string' && value.startsWith('data:')) {
        value = uploadFile(value, `${noPendaftaran}_${header}`, folder);
      }
      rowData[index] = value;
    }
  });

  // Check for new fields in data that aren't in headers
  Object.keys(data).forEach(key => {
    if (key !== "action" && !headers.includes(key)) {
      headers.push(key);
      sheet.getRange(1, headers.length).setValue(key);
      
      let value = data[key];
      if (typeof value === 'string' && value.startsWith('data:')) {
        value = uploadFile(value, `${noPendaftaran}_${key}`, folder);
      }
      rowData.push(value);
    }
  });
  
  sheet.appendRow(rowData);
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Pendaftaran berhasil",
    noPendaftaran: noPendaftaran
  })).setMimeType(ContentService.MimeType.JSON);
}

// ... (keep handleLogin, handleCheckStatus, updateStatus, getOrCreateFolder, uploadFile, doOptions as they were)

function handleLogin(username, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!sheet) throw new Error("Sheet Admin tidak ditemukan");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Login berhasil" })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Username atau password salah" })).setMimeType(ContentService.MimeType.JSON);
}

function handleCheckStatus(noPendaftaran) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("Database belum siap");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const noRegIdx = headers.indexOf("No Pendaftaran");
  const namaIdx = headers.indexOf("Nama Lengkap");
  const statusIdx = headers.indexOf("Status");

  for (let i = 1; i < data.length; i++) {
    if (data[i][noRegIdx] === noPendaftaran) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: {
          noPendaftaran: data[i][noRegIdx],
          namaLengkap: namaIdx !== -1 ? data[i][namaIdx] : "Siswa",
          status: statusIdx !== -1 ? data[i][statusIdx] : "Proses"
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Nomor pendaftaran tidak ditemukan" })).setMimeType(ContentService.MimeType.JSON);
}

function updateStatus(noPendaftaran, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const noRegIdx = headers.indexOf("No Pendaftaran");
  const statusIdx = headers.indexOf("Status");
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][noRegIdx] === noPendaftaran) {
      sheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Status berhasil diupdate" })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Data tidak ditemukan" })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function uploadFile(base64Data, filename, folder) {
  if (!base64Data) return "";
  try {
    const splitBase = base64Data.split(',');
    const type = splitBase[0].split(';')[0].replace('data:', '');
    const byteCharacters = Utilities.base64Decode(splitBase[1]);
    const blob = Utilities.newBlob(byteCharacters, type, filename);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Error uploading file";
  }
}

/* ==========================================================================
   PHOTO MANAGEMENT (GOOGLE DRIVE & PHOTO METADATA SHEET)
   ========================================================================== */

function verifyAdmin(username, password) {
  if (!username) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      if (!password) return true;
      if (data[i][1] === password) return true;
    }
  }
  return false;
}

function getOrCreatePhotoFolder() {
  const rootFolder = getOrCreateFolder(FOLDER_NAME);
  const subfolders = rootFolder.getFoldersByName(PHOTO_FOLDER_NAME);
  let photoFolder;
  if (subfolders.hasNext()) {
    photoFolder = subfolders.next();
  } else {
    photoFolder = rootFolder.createFolder(PHOTO_FOLDER_NAME);
  }
  photoFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return photoFolder;
}

function handleUploadPhoto(data) {
  if (!verifyAdmin(data.adminUsername, data.adminPassword)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Akses ditolak: Autentikasi administrator tidak valid."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const base64Data = data.base64Data;
  if (!base64Data || !base64Data.startsWith('data:image/')) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Format file tidak valid. Hanya file gambar (JPG, PNG, WebP) yang diizinkan."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let photoSheet = ss.getSheetByName(PHOTO_SHEET_NAME);
  if (!photoSheet) {
    photoSheet = ss.insertSheet(PHOTO_SHEET_NAME);
    const headers = ["ID", "Drive File ID", "File Name", "File URL", "Thumbnail URL", "Judul", "Deskripsi", "Kategori", "MIME Type", "File Size", "Urutan", "Aktif", "Created At", "Updated At"];
    photoSheet.appendRow(headers);
    photoSheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e0e0e0");
    photoSheet.setFrozenRows(1);
  }

  const photoFolder = getOrCreatePhotoFolder();
  const splitBase = base64Data.split(',');
  const type = splitBase[0].split(';')[0].replace('data:', '');
  const byteCharacters = Utilities.base64Decode(splitBase[1]);
  const fileSize = byteCharacters.length;

  if (fileSize > 5 * 1024 * 1024) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Ukuran file melebihi batas maksimal (5 MB)."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const rawFilename = (data.fileName || "foto.jpg").replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const uniqueFilename = `web_${Date.now()}_${rawFilename}`;
  const blob = Utilities.newBlob(byteCharacters, type, uniqueFilename);
  const file = photoFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  const fileUrl = file.getUrl();
  const thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
  const photoId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const nowIso = new Date().toISOString();

  const judul = String(data.judul || rawFilename.replace(/\.[^/.]+$/, "")).trim();
  const deskripsi = String(data.deskripsi || "").trim();
  const kategori = String(data.kategori || "galeri").toLowerCase().trim();
  const urutan = parseInt(data.urutan, 10) || photoSheet.getLastRow();
  const aktif = data.aktif !== false;

  photoSheet.appendRow([
    photoId,
    fileId,
    uniqueFilename,
    fileUrl,
    thumbnailUrl,
    judul,
    deskripsi,
    kategori,
    type,
    fileSize,
    urutan,
    aktif,
    nowIso,
    nowIso
  ]);

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Foto berhasil diunggah ke Google Drive dan dicatat di database.",
    data: {
      id: photoId,
      driveFileId: fileId,
      fileName: uniqueFilename,
      fileUrl: fileUrl,
      thumbnailUrl: thumbnailUrl,
      judul: judul,
      deskripsi: deskripsi,
      kategori: kategori,
      mimeType: type,
      fileSize: fileSize,
      urutan: urutan,
      aktif: aktif,
      createdAt: nowIso,
      updatedAt: nowIso
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleGetPhotos(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const photoSheet = ss.getSheetByName(PHOTO_SHEET_NAME);
  if (!photoSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: []
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const data = photoSheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: []
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const headers = data[0];
  const rows = data.slice(1);
  const isPublicOnly = params && (params.public === "true" || params.public === true);
  const filterCategory = params && params.kategori ? String(params.kategori).toLowerCase().trim() : null;

  let photos = rows.map(row => {
    let obj = {};
    headers.forEach((h, idx) => {
      let key = h.replace(/\s+/g, '');
      key = key.charAt(0).toLowerCase() + key.slice(1);
      if (h === "ID") key = "id";
      else if (h === "Drive File ID") key = "driveFileId";
      else if (h === "File Name") key = "fileName";
      else if (h === "File URL") key = "fileUrl";
      else if (h === "Thumbnail URL") key = "thumbnailUrl";
      else if (h === "Judul") key = "judul";
      else if (h === "Deskripsi") key = "deskripsi";
      else if (h === "Kategori") key = "kategori";
      else if (h === "MIME Type") key = "mimeType";
      else if (h === "File Size") key = "fileSize";
      else if (h === "Urutan") key = "urutan";
      else if (h === "Aktif") key = "aktif";
      else if (h === "Created At") key = "createdAt";
      else if (h === "Updated At") key = "updatedAt";

      obj[key] = row[idx];
    });

    obj.aktif = obj.aktif === true || String(obj.aktif).toLowerCase() === "true";
    obj.urutan = parseInt(obj.urutan, 10) || 0;
    return obj;
  });

  if (isPublicOnly) {
    photos = photos.filter(p => p.aktif === true);
  }

  if (filterCategory && filterCategory !== "all" && filterCategory !== "semua") {
    photos = photos.filter(p => String(p.kategori).toLowerCase() === filterCategory);
  }

  photos.sort((a, b) => {
    if (a.urutan !== b.urutan) return a.urutan - b.urutan;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    data: photos
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleUpdatePhoto(data) {
  if (!verifyAdmin(data.adminUsername, data.adminPassword)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Akses ditolak: Autentikasi administrator tidak valid."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const photoSheet = ss.getSheetByName(PHOTO_SHEET_NAME);
  if (!photoSheet) throw new Error("Sheet Foto Website tidak ditemukan");

  const values = photoSheet.getDataRange().getValues();
  const headers = values[0];
  const idIdx = headers.indexOf("ID");
  const driveIdIdx = headers.indexOf("Drive File ID");
  const fileNameIdx = headers.indexOf("File Name");
  const fileUrlIdx = headers.indexOf("File URL");
  const thumbUrlIdx = headers.indexOf("Thumbnail URL");
  const judulIdx = headers.indexOf("Judul");
  const deskripsiIdx = headers.indexOf("Deskripsi");
  const kategoriIdx = headers.indexOf("Kategori");
  const mimeIdx = headers.indexOf("MIME Type");
  const sizeIdx = headers.indexOf("File Size");
  const urutanIdx = headers.indexOf("Urutan");
  const aktifIdx = headers.indexOf("Aktif");
  const updatedIdx = headers.indexOf("Updated At");

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][idIdx] === data.id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Foto tidak ditemukan."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const nowIso = new Date().toISOString();

  if (data.newBase64Data && data.newBase64Data.startsWith('data:image/')) {
    const oldDriveFileId = values[rowIndex - 1][driveIdIdx];
    try {
      if (oldDriveFileId) DriveApp.getFileById(oldDriveFileId).setTrashed(true);
    } catch(e) {}

    const photoFolder = getOrCreatePhotoFolder();
    const splitBase = data.newBase64Data.split(',');
    const type = splitBase[0].split(';')[0].replace('data:', '');
    const byteCharacters = Utilities.base64Decode(splitBase[1]);
    const rawFilename = (data.fileName || "foto.jpg").replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const uniqueFilename = `web_${Date.now()}_${rawFilename}`;
    const blob = Utilities.newBlob(byteCharacters, type, uniqueFilename);
    const newFile = photoFolder.createFile(blob);
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const newFileId = newFile.getId();
    photoSheet.getRange(rowIndex, driveIdIdx + 1).setValue(newFileId);
    photoSheet.getRange(rowIndex, fileNameIdx + 1).setValue(uniqueFilename);
    photoSheet.getRange(rowIndex, fileUrlIdx + 1).setValue(newFile.getUrl());
    photoSheet.getRange(rowIndex, thumbUrlIdx + 1).setValue(`https://lh3.googleusercontent.com/d/${newFileId}=w1000`);
    photoSheet.getRange(rowIndex, mimeIdx + 1).setValue(type);
    photoSheet.getRange(rowIndex, sizeIdx + 1).setValue(byteCharacters.length);
  }

  if (data.judul !== undefined) photoSheet.getRange(rowIndex, judulIdx + 1).setValue(String(data.judul).trim());
  if (data.deskripsi !== undefined) photoSheet.getRange(rowIndex, deskripsiIdx + 1).setValue(String(data.deskripsi).trim());
  if (data.kategori !== undefined) photoSheet.getRange(rowIndex, kategoriIdx + 1).setValue(String(data.kategori).toLowerCase().trim());
  if (data.urutan !== undefined) photoSheet.getRange(rowIndex, urutanIdx + 1).setValue(parseInt(data.urutan, 10) || 0);
  if (data.aktif !== undefined) photoSheet.getRange(rowIndex, aktifIdx + 1).setValue(data.aktif === true || String(data.aktif).toLowerCase() === "true");
  photoSheet.getRange(rowIndex, updatedIdx + 1).setValue(nowIso);

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Metadata foto berhasil diperbarui."
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleDeletePhoto(data) {
  if (!verifyAdmin(data.adminUsername, data.adminPassword)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Akses ditolak: Autentikasi administrator tidak valid."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const photoSheet = ss.getSheetByName(PHOTO_SHEET_NAME);
  if (!photoSheet) throw new Error("Sheet Foto Website tidak ditemukan");

  const values = photoSheet.getDataRange().getValues();
  const headers = values[0];
  const idIdx = headers.indexOf("ID");
  const driveIdIdx = headers.indexOf("Drive File ID");

  let rowIndex = -1;
  let driveFileId = "";
  for (let i = 1; i < values.length; i++) {
    if (values[i][idIdx] === data.id) {
      rowIndex = i + 1;
      driveFileId = values[i][driveIdIdx];
      break;
    }
  }

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Foto tidak ditemukan."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (driveFileId) {
    try {
      DriveApp.getFileById(driveFileId).setTrashed(true);
    } catch(e) {
      console.warn("Could not trash Drive file:", e);
    }
  }

  photoSheet.deleteRow(rowIndex);

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Foto berhasil dihapus dari Google Drive dan database."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT).setHeaders({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  });
}
