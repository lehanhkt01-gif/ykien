// ==============================================================================
// GOOGLE APPS SCRIPT - TỰ ĐỘNG LƯU & ĐỒNG BỘ HAI CHIỀU GOOGLE DRIVE & GOOGLE SHEETS
// Dành cho tài khoản: lehanhkt01@gmail.com
// Cơ quan: Ủy ban Mặt trận Tổ quốc Việt Nam Xã Ea Súp, Tỉnh Đắk Lắk
// ==============================================================================

const FOLDER_NAME = "HỒ SƠ PHẢN ÁNH CỬ TRI - XÃ EA SÚP";

/**
 * 1. Hàm kiểm tra và cấp quyền truy cập Drive & Sheets
 */
function testDriveAndSheetSetup() {
  Logger.log("=== BẮT ĐẦU KIỂM TRA QUYỀN GOOGLE DRIVE VÀ SHEETS ===");
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  setupSheetHeaders(sheet);
  Logger.log("✓ Đã kết nối thành công Google Sheets: " + sheet.getName());

  const folder = getOrCreateDriveFolder();
  Logger.log("✓ Đã tạo/kết nối thành công Thư mục Google Drive: " + folder.getName() + " (ID: " + folder.getId() + ")");

  const testBlob = Utilities.newBlob("Thử nghiệm lưu tệp thành công từ Cổng thông tin MTTQ Xã Ea Súp!", "text/plain", "kiem_tra_ket_noi.txt");
  const testFile = folder.createFile(testBlob);
  try {
    testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch(e) {}
  Logger.log("✓ Đã tạo tệp thử nghiệm trên Drive thành công: " + testFile.getUrl());

  const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
  sheet.appendRow([
    timestamp,
    "TEST-SETUP-01",
    "Quản trị viên hệ thống",
    "0262.3688.115",
    "Xã Ea Súp",
    "Cấu hình hệ thống",
    "Kiểm tra kết nối Google Drive & Sheets",
    "Đã cấp quyền và khởi tạo thư mục Google Drive thành công.",
    1,
    testFile.getName() + ": " + testFile.getUrl(),
    "Đã hoàn tất xử lý",
    "Hệ thống đã sẵn sàng nhận tệp và phản ánh từ cử tri!"
  ]);

  Logger.log("=== THIẾT LẬP THÀNH CÔNG 100%! ===");
}

/**
 * Lấy hoặc tự động tạo thư mục trên Google Drive của lehanhkt01@gmail.com
 */
function getOrCreateDriveFolder() {
  try {
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    if (folders.hasNext()) {
      return folders.next();
    } else {
      const newFolder = DriveApp.createFolder(FOLDER_NAME);
      try {
        newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch(e) {}
      return newFolder;
    }
  } catch (err) {
    Logger.log("Lỗi truy cập Drive: " + err.toString());
    return DriveApp.getRootFolder();
  }
}

/**
 * Tự động tạo và định dạng tiêu đề các cột trong Google Sheets
 */
function setupSheetHeaders(sheet) {
  const headers = [
    "Thời gian gửi",
    "Mã hồ sơ",
    "Họ và tên cử tri",
    "Số điện thoại",
    "Thôn / Buôn",
    "Lĩnh vực phản ánh",
    "Tiêu đề phản ánh",
    "Nội dung phản ánh chi tiết",
    "Số lượng tệp",
    "Link Tệp trên Google Drive",
    "Trạng thái xử lý",
    "Ý kiến / Văn bản trả lời của MTTQ Xã"
  ];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#C8102E");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setFontSize(11);
    
    sheet.setRowHeight(1, 36);
    sheet.setFrozenRows(1);
  }
}

/**
 * 2. Xử lý khi có dữ liệu POST gửi từ Website (Lưu vào Sheets & Drive)
 */
function doPost(e) {
  return handleIncomingData(e);
}

/**
 * 3. Xử lý khi Website gọi GET -> Trả về danh sách tất cả các dòng để Đồng Bộ về Website!
 */
function doGet(e) {
  if (e && e.parameter && (e.parameter.ticket_code || e.parameter.title)) {
    return handleIncomingData(e);
  }
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ 
          status: "success", 
          count: 0, 
          data: [] 
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const range = sheet.getRange(2, 1, lastRow - 1, 12);
    const values = range.getValues();
    const records = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const code = String(row[1] || '').trim();
      if (!code) continue;

      let fileCount = parseInt(row[8]) || 0;
      let driveLinks = [];
      const driveStr = String(row[9] || '').trim();
      
      if (driveStr) {
        const lines = driveStr.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.includes('http')) {
            const idx = trimmed.indexOf('http');
            const namePart = trimmed.substring(0, idx).replace(/[:\-\s]+$/, '').trim();
            const urlPart = trimmed.substring(idx).trim();
            driveLinks.push({
              name: namePart || 'Tệp đính kèm trên Drive',
              url: urlPart
            });
          }
        });
        if (driveLinks.length > 0 && fileCount === 0) {
          fileCount = driveLinks.length;
        }
      }

      const statusText = String(row[10] || 'Mới tiếp nhận').trim();
      let statusCode = 'RECEIVED';
      if (statusText === 'Đã hoàn tất xử lý' || statusText.toLowerCase().includes('hoàn tất')) {
        statusCode = 'COMPLETED';
      } else if (statusText === 'Đang thẩm tra, xử lý' || statusText.toLowerCase().includes('thẩm tra') || statusText.toLowerCase().includes('xử lý')) {
        statusCode = 'PROCESSING';
      }

      records.push({
        ticket_code: code,
        sender_name: String(row[2] || 'Cử tri ẩn danh'),
        sender_phone: String(row[3] || ''),
        village: String(row[4] || 'Xã Ea Súp'),
        village_name: String(row[4] || 'Xã Ea Súp'),
        category: String(row[5] || 'Lĩnh vực khác'),
        category_name: String(row[5] || 'Lĩnh vực khác'),
        title: String(row[6] || '(Không có tiêu đề)'),
        content: String(row[7] || ''),
        file_count: fileCount,
        drive_links: driveLinks,
        status_label: statusText,
        status_code: statusCode,
        response_content: String(row[11] || ''),
        created_at: String(row[0] || new Date().toISOString())
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success", 
        count: records.length, 
        data: records 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "error", 
        message: err.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 4. Hàm xử lý lưu tệp vào Google Drive và ghi thông tin vào Google Sheets
 */
function handleIncomingData(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (lockErr) {}

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    if (sheet.getLastRow() === 0) {
      setupSheetHeaders(sheet);
    }

    let data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err1) {
        try {
          const parts = e.postData.contents.split("&");
          for (let i = 0; i < parts.length; i++) {
            const item = parts[i].split("=");
            data[decodeURIComponent(item[0])] = decodeURIComponent(item[1] || "");
          }
        } catch (err2) {
          data = e.parameter || {};
        }
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    const ticketCode = data.ticket_code || "EASUP-PA-" + Math.floor(100000 + Math.random() * 900000);
    const senderName = data.sender_name || "Cử tri ẩn danh";
    const senderPhone = data.sender_phone || "";
    const village = data.village || data.village_name || "";
    const category = data.category || data.category_name || "";
    const title = data.title || "Ý kiến phản ánh cử tri";
    const content = data.content || "";
    
    // Lưu tệp vào Google Drive
    let fileCount = 0;
    const driveFileLinks = [];
    let mainFolder;
    
    try {
      mainFolder = getOrCreateDriveFolder();
    } catch (fErr) {
      Logger.log("Lỗi lấy folder: " + fErr);
    }

    if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
      fileCount = data.attachments.length;

      data.attachments.forEach(function(att, idx) {
        try {
          if (att.data && typeof att.data === "string" && att.data.indexOf("base64,") !== -1) {
            const base64Data = att.data.split("base64,")[1];
            const decodedBytes = Utilities.base64Decode(base64Data);
            const contentType = att.type || "application/octet-stream";
            const originalFileName = att.name || ("Dinh_kem_" + (idx + 1));
            const safeFileName = ticketCode + "_" + (idx + 1) + "_" + originalFileName;

            const blob = Utilities.newBlob(decodedBytes, contentType, safeFileName);
            
            if (mainFolder) {
              const driveFile = mainFolder.createFile(blob);
              try {
                driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
              } catch (shareErr) {}

              driveFileLinks.push(originalFileName + ": " + driveFile.getUrl());
            }
          }
        } catch (fileErr) {
          Logger.log("Lỗi xử lý file " + idx + ": " + fileErr.toString());
        }
      });
    }

    const driveLinksText = driveFileLinks.length > 0 ? driveFileLinks.join("\n") : "Không có tệp đính kèm";
    const statusLabel = data.status_label || "Mới tiếp nhận";
    const responseContent = data.response_content || "Ủy ban MTTQ Việt Nam Xã Ea Súp đã tiếp nhận và đang xử lý.";

    // Ghi vào Google Sheets
    sheet.appendRow([
      timestamp,
      ticketCode,
      senderName,
      senderPhone,
      village,
      category,
      title,
      content,
      fileCount,
      driveLinksText,
      statusLabel,
      responseContent
    ]);

    // Định dạng dòng vừa thêm
    const lastRowIndex = sheet.getLastRow();
    const rowRange = sheet.getRange(lastRowIndex, 1, 1, 12);
    rowRange.setVerticalAlignment("middle");
    rowRange.setFontSize(10);
    sheet.setRowHeight(lastRowIndex, 28);

    // TỰ ĐỘNG ĐỒNG BỘ ĐỒNG THỜI SANG SUPABASE POSTGRESQL CLOUD
    try {
      sendToSupabaseDatabase({
        ticket_code: ticketCode,
        sender_name: senderName,
        sender_phone: senderPhone,
        village: village,
        village_name: village,
        category: category,
        category_name: category,
        title: title,
        content: content,
        drive_links: driveLinksText,
        status_label: statusLabel,
        response_content: responseContent
      });
    } catch (supErr) {
      Logger.log("Lỗi đồng bộ Supabase từ GAS: " + supErr.toString());
    }

    return ContentService
      .createTextOutput(JSON.stringify({ 
        "status": "success", 
        "ticket_code": ticketCode, 
        "drive_files_saved": driveFileLinks.length,
        "message": "Đã lưu thông tin và tệp đính kèm vào Google Drive & Google Sheets & Supabase thành công!" 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Lỗi xử lý handleIncomingData: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

// CẤU HÌNH SUPABASE POSTGRESQL TỰ ĐỘNG SERVER-SIDE
const SUPABASE_REST_URL = "https://qgbjiwrjhmfuaqnngrcf.supabase.co/rest/v1/citizen_feedbacks?on_conflict=ticket_code";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYmppd3JqaG1mdWFxbm5ncmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NDIzMzksImV4cCI6MjEwMzExODMzOX0.JJON9OFpawvOWE6kG22iNhmrIQc7rSxrGHih2Hc5zMM";

function sendToSupabaseDatabase(record) {
  const payload = {
    ticket_code: record.ticket_code,
    sender_name: record.sender_name || "Cử tri ẩn danh",
    sender_phone: record.sender_phone || "",
    village: record.village || "Xã Ea Súp",
    village_name: record.village_name || record.village || "Xã Ea Súp",
    category: record.category || "Lĩnh vực khác",
    category_name: record.category_name || record.category || "Lĩnh vực khác",
    title: record.title || "(Không có tiêu đề)",
    content: record.content || "",
    attachments: record.drive_links ? [{ name: "Google Drive", url: record.drive_links }] : [],
    status_code: "RECEIVED",
    status_label: record.status_label || "Mới tiếp nhận",
    response_content: record.response_content || ""
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Prefer": "resolution=merge-duplicates"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  UrlFetchApp.fetch(SUPABASE_REST_URL, options);
}
