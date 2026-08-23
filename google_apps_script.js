// ==============================================================================
// GOOGLE APPS SCRIPT - TỰ ĐỘNG LƯU PHẢN ÁNH CỬ TRI VÀ TỆP TIN VÀO GOOGLE DRIVE & GOOGLE SHEETS
// Dành cho tài khoản: lehanhkt01@gmail.com
// Cơ quan: Ủy ban Mặt trận Tổ quốc Việt Nam Xã Ea Súp, Tỉnh Đắk Lắk
// ==============================================================================

const FOLDER_NAME = "HỒ SƠ PHẢN ÁNH CỬ TRI - XÃ EA SÚP";

/**
 * ==============================================================================
 * BƯỚC QUAN TRỌNG: HÀM CHẠY THỬ NGHIỆM & CẤP QUYỀN TRUY CẬP GOOGLE DRIVE
 * ==============================================================================
 * Hãy chọn hàm này ở thanh công cụ phía trên và bấm nút "Chạy" (Run) 1 lần:
 * Google sẽ hiện cửa sổ yêu cầu cấp quyền truy cập Google Drive và Google Sheets.
 * Bạn chọn tài khoản lehanhkt01@gmail.com -> Nâng cao -> Đi tới dự án -> Cho phép!
 */
function testDriveAndSheetSetup() {
  Logger.log("=== BẮT ĐẦU KIỂM TRA QUYỀN GOOGLE DRIVE VÀ SHEETS ===");
  
  // 1. Kiểm tra quyền Google Sheets
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  setupSheetHeaders(sheet);
  Logger.log("✓ Đã kết nối thành công Google Sheets: " + sheet.getName());

  // 2. Kiểm tra quyền Google Drive
  const folder = getOrCreateDriveFolder();
  Logger.log("✓ Đã tạo/kết nối thành công Thư mục Google Drive: " + folder.getName() + " (ID: " + folder.getId() + ")");

  // 3. Tạo một tệp thử nghiệm trên Drive
  const testBlob = Utilities.newBlob("Thử nghiệm lưu tệp thành công từ Cổng thông tin MTTQ Xã Ea Súp!", "text/plain", "kiem_tra_ket_noi.txt");
  const testFile = folder.createFile(testBlob);
  try {
    testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch(e) {}
  Logger.log("✓ Đã tạo tệp thử nghiệm trên Drive thành công: " + testFile.getUrl());

  // 4. Thêm dòng ghi nhận vào Sheets
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

  Logger.log("=== THIẾT LẬP THÀNH CÔNG 100%! BẠN CÓ THỂ TRIỂN KHAI (DEPLOY) WEB APP NGAY ===");
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
 * 1. Tự động tạo và định dạng tiêu đề các cột trong Google Sheets
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
    
    // Định dạng tiêu đề màu Đỏ - Vàng trang trọng
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
 * 2. Xử lý khi có dữ liệu POST gửi từ Website
 */
function doPost(e) {
  return handleIncomingData(e);
}

/**
 * 3. Xử lý khi có dữ liệu GET
 */
function doGet(e) {
  if (e && e.parameter && (e.parameter.ticket_code || e.parameter.title)) {
    return handleIncomingData(e);
  }
  
  return ContentService
    .createTextOutput(JSON.stringify({ 
      "status": "active", 
      "agency": "UBMTTQ Việt Nam Xã Ea Súp",
      "drive_folder": FOLDER_NAME,
      "message": "Kết nối Google Drive & Sheets hoạt động bình thường!" 
    }))
    .setMimeType(ContentService.MimeType.JSON);
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

    // Đọc dữ liệu từ postData (JSON string) hoặc parameters
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
    const village = data.village || "";
    const category = data.category || "";
    const title = data.title || "Ý kiến phản ánh cử tri";
    const content = data.content || "";
    
    // ==========================================================
    // XỬ LÝ LƯU TỆP TIN VÀO GOOGLE DRIVE
    // ==========================================================
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

      // Thư mục lưu tệp cho từng hồ sơ
      let targetFolder = mainFolder;
      if (mainFolder) {
        try {
          targetFolder = mainFolder.createFolder(ticketCode + " - " + senderName);
        } catch (subErr) {
          targetFolder = mainFolder;
        }
      }

      data.attachments.forEach(function(att, idx) {
        try {
          const fileName = att.name || ("tep_dinh_kem_" + (idx + 1));
          let base64Data = att.data || "";

          // Tách tiền tố data URI nếu có (VD: "data:image/jpeg;base64,...")
          let mimeType = att.type || "application/octet-stream";
          if (base64Data.indexOf(",") > -1) {
            const prefix = base64Data.substring(0, base64Data.indexOf(","));
            if (prefix.indexOf(":") > -1 && prefix.indexOf(";") > -1) {
              mimeType = prefix.substring(prefix.indexOf(":") + 1, prefix.indexOf(";"));
            }
            base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
          }

          // Loại bỏ khoảng trắng hoặc xuống dòng nếu có
          base64Data = base64Data.replace(/(\r\n|\n|\r|\s)/gm, "");

          if (base64Data && base64Data.length > 10) {
            // Giải mã Base64 sang Bytes và tạo file trên Google Drive
            const decodedBytes = Utilities.base64Decode(base64Data);
            const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
            
            let createdFile;
            if (targetFolder) {
              createdFile = targetFolder.createFile(blob);
            } else {
              createdFile = DriveApp.createFile(blob);
            }
            
            // Mở quyền xem qua link
            try {
              createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            } catch (shareErr) {}

            const fileUrl = createdFile.getUrl();
            driveFileLinks.push(fileName + ": " + fileUrl);
          } else {
            driveFileLinks.push(fileName + " (Không nhận được dữ liệu Base64)");
          }
        } catch (fileErr) {
          driveFileLinks.push((att.name || "Tệp") + " (Lỗi lưu Drive: " + fileErr.message + ")");
        }
      });
    }

    let filesCellContent = "Không đính kèm tệp";
    if (driveFileLinks.length > 0) {
      filesCellContent = driveFileLinks.join("\n");
    }

    const statusLabel = data.status_label || "Mới tiếp nhận";
    const responseContent = data.response_content || "UBMTTQ Xã đã tiếp nhận, đang phân loại giải quyết.";

    // Thêm một dòng mới vào Bảng tính Google Sheets
    sheet.appendRow([
      timestamp,
      ticketCode,
      senderName,
      senderPhone ? "'" + senderPhone : "", // Thêm dấu ' để giữ số 0 đầu điện thoại
      village,
      category,
      title,
      content,
      fileCount,
      filesCellContent,
      statusLabel,
      responseContent
    ]);

    // Định dạng dòng mới
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 12).setVerticalAlignment("top");
    sheet.getRange(lastRow, 1).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 2).setHorizontalAlignment("center").setFontWeight("bold").setFontColor("#C8102E");
    sheet.getRange(lastRow, 4).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 9).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 10).setWrap(true);
    sheet.getRange(lastRow, 11).setHorizontalAlignment("center").setFontWeight("bold");

    return ContentService
      .createTextOutput(JSON.stringify({ 
        "result": "success", 
        "ticket_code": ticketCode,
        "drive_links": driveFileLinks,
        "row": lastRow 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        "result": "error", 
        "message": error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}
