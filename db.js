// ============================================================
// EaSupDB - Hệ Thống Cơ Sở Dữ Liệu Cổng Ý Kiến Cử Tri Xã Ea Súp
// Lưu trữ đồng bộ kép: LocalStorage (ngay lập tức) & IndexedDB (nền)
// Đảm bảo 100% không bao giờ bị rỗng hay mất dữ liệu mẫu
// ============================================================

const EaSupDB = (() => {
  const DB_NAME = 'EaSupCitizenDB';
  const DB_VERSION = 3;
  const STORE_NAME = 'citizen_feedbacks';
  const LOCAL_STORAGE_KEY = 'easup_citizen_feedbacks_v3';
  const LEGACY_STORAGE_KEY = 'easup_citizen_feedbacks_v2';
  const OLD_STORAGE_KEY = 'easup_citizen_feedbacks_backup';

  let dbPromise = null;

  // 6 Bản ghi mẫu chuẩn thực tế cho xã Ea Súp
  const initialSeedData = [
    {
      ticket_code: 'EASUP-PA-892415',
      sender_name: 'Trần Văn Mạnh',
      sender_phone: '0913.845.210',
      village: 'Buôn A',
      village_name: 'Buôn A',
      category: 'Đường giao thông nông thôn, kênh mương thủy lợi',
      category_name: 'Đường giao thông nông thôn, kênh mương thủy lợi',
      title: 'Kiến nghị sửa chữa dặm vá tuyến đường liên thôn qua Buôn A',
      content: 'Tuyến đường nội bộ qua Buôn A xuất hiện nhiều ổ gà sau các trận mưa lớn, gây khó khăn cho việc đi lại của bà con và học sinh.',
      attachments: [],
      status_code: 'COMPLETED',
      status_label: 'Đã hoàn tất xử lý',
      response_content: 'UBND xã Ea Súp đã tiến hành khảo sát thực địa và phân bổ nguồn kinh phí duy tu đường giao thông nông thôn, dự kiến hoàn tất dặm vá trong tháng 9/2026.',
      created_at: '2026-08-20T08:15:00.000Z',
      updated_at: '2026-08-21T09:30:00.000Z'
    },
    {
      ticket_code: 'EASUP-PA-671239',
      sender_name: 'Nguyễn Thị Lành',
      sender_phone: '0988.123.456',
      village: 'Thôn Thành Công',
      village_name: 'Thôn Thành Công',
      category: 'Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt',
      category_name: 'Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt',
      title: 'Phản ánh điểm tập kết rác thải tự phát gần khu dân cư Thôn Thành Công',
      content: 'Thời gian gần đây có một số hộ tập kết rác sai quy định bốc mùi hôi thối, đề nghị Ban MTTQ và chính quyền có biện pháp tuyên truyền, xử lý.',
      attachments: [],
      status_code: 'PROCESSING',
      status_label: 'Đang thẩm tra, xử lý',
      response_content: 'Ủy ban MTTQ xã đã gửi văn bản đề nghị Tổ quản lý trật tự & môi trường xã phối hợp cùng Ban Tự quản Thôn Thành Công kiểm tra, thu gom rác trong 48 giờ tới.',
      created_at: '2026-08-22T14:20:00.000Z',
      updated_at: '2026-08-22T16:00:00.000Z'
    },
    {
      ticket_code: 'EASUP-PA-452108',
      sender_name: 'Y Krông Niê',
      sender_phone: '0977.654.321',
      village: 'Buôn B',
      village_name: 'Buôn B',
      category: 'Đất đai, bồi thường & giải tỏa mặt bằng',
      category_name: 'Đất đai, bồi thường & giải tỏa mặt bằng',
      title: 'Đề nghị hướng dẫn thủ tục cấp đổi Giấy chứng nhận quyền sử dụng đất',
      content: 'Gia đình tôi có mảnh đất khai hoang từ năm 1998 nay muốn đo đạc cấp đổi sang sổ hồng mới, xin hỏi cần chuẩn bị hồ sơ gì và nộp tại đâu?',
      attachments: [],
      status_code: 'RECEIVED',
      status_label: 'Mới tiếp nhận',
      response_content: 'Ban Thường trực UBMTTQ Xã đã chuyển phiếu hướng dẫn đến Bộ phận Tiếp nhận và Trả kết quả (Một cửa) xã Ea Súp để liên hệ hướng dẫn trực tiếp cho cử tri.',
      created_at: '2026-08-23T09:10:00.000Z',
      updated_at: '2026-08-23T09:10:00.000Z'
    },
    {
      ticket_code: 'EASUP-PA-319874',
      sender_name: 'Lê Văn Hùng',
      sender_phone: '0905.897.123',
      village: 'Thôn 1',
      village_name: 'Thôn 1',
      category: 'Đường giao thông nông thôn, kênh mương thủy lợi',
      category_name: 'Đường giao thông nông thôn, kênh mương thủy lợi',
      title: 'Đề nghị nạo vét kênh mương nội đồng phục vụ tưới tiêu vụ sản xuất mới',
      content: 'Đoạn mương dẫn nước từ đập thủy lợi vào cánh đồng Thôn 1 bị bồi lắng phù sa và cỏ dại phủ kín, ảnh hưởng nguồn nước tưới cho hơn 20ha lúa.',
      attachments: [],
      status_code: 'PROCESSING',
      status_label: 'Đang thẩm tra, xử lý',
      response_content: 'UBND xã đã đưa tuyến kênh nội đồng Thôn 1 vào kế hoạch nạo vét khơi thông dòng chảy trước mùa vụ 2026.',
      created_at: '2026-08-23T11:45:00.000Z',
      updated_at: '2026-08-23T15:30:00.000Z'
    },
    {
      ticket_code: 'EASUP-PA-208915',
      sender_name: 'H\'Hen Mlô',
      sender_phone: '0934.112.233',
      village: 'Buôn C',
      village_name: 'Buôn C',
      category: 'An ninh trật tự thôn xóm, phòng chống tệ nạn',
      category_name: 'An ninh trật tự thôn xóm, phòng chống tệ nạn',
      title: 'Kiến nghị lắp đặt thêm đèn chiếu sáng ban đêm tại ngã ba Buôn C',
      content: 'Khu vực ngã ba đường nhánh rẽ vào Buôn C buổi tối rất tối, tiềm ẩn nguy cơ mất an toàn giao thông và an ninh trật tự.',
      attachments: [],
      status_code: 'COMPLETED',
      status_label: 'Đã hoàn tất xử lý',
      response_content: 'Đã hoàn thành lắp đặt hệ thống 04 bóng đèn năng lượng mặt trời công cộng tại ngã ba Buôn C từ nguồn kinh phí xã hội hóa nông thôn mới.',
      created_at: '2026-08-21T16:00:00.000Z',
      updated_at: '2026-08-22T10:00:00.000Z'
    },
    {
      ticket_code: 'EASUP-PA-110293',
      sender_name: 'Phạm Văn Đức',
      sender_phone: '0945.334.455',
      village: 'Thôn Đoàn Kết',
      village_name: 'Thôn Đoàn Kết',
      category: 'Chế độ chính sách, hỗ trợ hộ nghèo, đại đoàn kết',
      category_name: 'Chế độ chính sách, hỗ trợ hộ nghèo, đại đoàn kết',
      title: 'Hỏi về điều kiện và thủ tục xét hỗ trợ nhà ở Đại Đoàn Kết năm 2026',
      content: 'Gia đình thuộc diện cận nghèo có nhà ở đã xuống cấp nặng, mong muốn Mặt trận xã hướng dẫn cách thức đăng ký chương trình xóa nhà tạm, nhà dột nát.',
      attachments: [],
      status_code: 'RECEIVED',
      status_label: 'Mới tiếp nhận',
      response_content: 'Ban vận động Quỹ Vì người nghèo xã Ea Súp đã tiếp nhận và sẽ cử cán bộ phối hợp Ban tự quản thôn thẩm định thực tế hoàn cảnh trong tháng.',
      created_at: '2026-08-24T07:30:00.000Z',
      updated_at: '2026-08-24T07:30:00.000Z'
    }
  ];

  // Đọc dữ liệu từ LocalStorage (luôn có sẵn 6 bản ghi)
  function getLocalStorageData() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || 
                  localStorage.getItem(LEGACY_STORAGE_KEY) || 
                  localStorage.getItem(OLD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc LocalStorage:', e);
    }
    
    // Nếu chưa có hoặc rỗng, lưu và trả về dữ liệu mẫu
    saveLocalStorageData(initialSeedData);
    return JSON.parse(JSON.stringify(initialSeedData));
  }

  function saveLocalStorageData(data) {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(LOCAL_STORAGE_KEY, json);
      localStorage.setItem(LEGACY_STORAGE_KEY, json);
      localStorage.setItem(OLD_STORAGE_KEY, json);
    } catch (e) {
      console.warn('Lỗi ghi LocalStorage:', e);
    }
  }

  // Mở IndexedDB với Singleton Promise an toàn
  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }

      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onblocked = () => {
          console.warn('IndexedDB blocked');
          resolve(null);
        };

        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          let store;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            store = db.createObjectStore(STORE_NAME, { keyPath: 'ticket_code' });
            store.createIndex('created_at', 'created_at', { unique: false });
            store.createIndex('village', 'village', { unique: false });
            store.createIndex('status_code', 'status_code', { unique: false });
          } else {
            store = e.target.transaction.objectStore(STORE_NAME);
          }

          const seed = getLocalStorageData();
          seed.forEach(item => {
            try { store.put(item); } catch (err) {}
          });
        };

        req.onsuccess = (e) => {
          const db = e.target.result;
          resolve(db);
        };

        req.onerror = (e) => {
          console.warn('Lỗi IndexedDB:', e.target.error);
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });

    return dbPromise;
  }

  // 1. Lấy tất cả phản ánh (luôn có dữ liệu)
  async function getAllFeedbacks() {
    let list = [];
    try {
      const db = await openDB();
      if (db) {
        list = await new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = (e) => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
          } catch (err) {
            resolve([]);
          }
        });
      }
    } catch(e) {
      list = [];
    }

    // Nếu IndexedDB chưa có hoặc rỗng, lấy từ LocalStorage
    if (!list || list.length === 0) {
      list = getLocalStorageData();
      // Đồng bộ nền vào IndexedDB
      openDB().then(db => {
        if (db && list.length > 0) {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            list.forEach(item => store.put(item));
          } catch(e) {}
        }
      }).catch(() => {});
    } else {
      saveLocalStorageData(list);
    }

    // Chuẩn hóa tên trường
    list.forEach(item => {
      if (!item.village) item.village = item.village_name || 'Xã Ea Súp';
      if (!item.category) item.category = item.category_name || 'Lĩnh vực khác';
      if (!item.status_label) {
        if (item.status_code === 'COMPLETED') item.status_label = 'Đã hoàn tất xử lý';
        else if (item.status_code === 'PROCESSING') item.status_label = 'Đang thẩm tra, xử lý';
        else item.status_label = 'Mới tiếp nhận';
      }
    });

    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return list;
  }

  // 2. Tra cứu phản ánh theo Mã hồ sơ
  async function getFeedbackByCode(code) {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();

    const all = await getAllFeedbacks();

    // 1. Tìm chính xác
    let found = all.find(item => item.ticket_code && item.ticket_code.toUpperCase() === cleanCode);
    if (found) return found;

    // 2. Tìm theo số đuôi (ví dụ gõ "892415" hoặc "PA-892415")
    found = all.find(item => item.ticket_code && item.ticket_code.toUpperCase().includes(cleanCode));
    if (found) return found;

    return null;
  }

  // 3. Thêm phản ánh mới
  async function insertFeedback(feedback) {
    const newRecord = {
      ticket_code: feedback.ticket_code,
      sender_name: feedback.sender_name || 'Cử tri ẩn danh',
      sender_phone: feedback.sender_phone || '',
      village: feedback.village || feedback.village_name || 'Xã Ea Súp',
      village_name: feedback.village || feedback.village_name || 'Xã Ea Súp',
      category: feedback.category || feedback.category_name || 'Lĩnh vực khác',
      category_name: feedback.category || feedback.category_name || 'Lĩnh vực khác',
      title: feedback.title,
      content: feedback.content,
      attachments: feedback.attachments || [],
      status_code: feedback.status_code || 'RECEIVED',
      status_label: feedback.status_label || 'Mới tiếp nhận',
      response_content: feedback.response_content || 'Ban Thường trực UBMTTQ Việt Nam xã Ea Súp đã tiếp nhận, đang phân loại và chuyển cơ quan chuyên môn giải quyết.',
      created_at: feedback.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const currentList = getLocalStorageData();
    const filtered = currentList.filter(item => item.ticket_code !== newRecord.ticket_code);
    filtered.unshift(newRecord);
    saveLocalStorageData(filtered);

    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(newRecord);
      }
    } catch(e) {}

    return newRecord;
  }

  // 4. Cập nhật trạng thái và phản hồi cử tri
  async function updateStatus(ticketCode, statusCode, statusLabel, responseContent) {
    const all = await getAllFeedbacks();
    const idx = all.findIndex(i => i.ticket_code === ticketCode);
    if (idx === -1) return false;

    const record = all[idx];
    record.status_code = statusCode;
    record.status_label = statusLabel;
    if (responseContent !== undefined) {
      record.response_content = responseContent;
    }
    record.updated_at = new Date().toISOString();

    all[idx] = record;
    saveLocalStorageData(all);

    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(record);
      }
    } catch(e) {}

    return true;
  }

  // 5. Xóa phản ánh
  async function deleteFeedback(ticketCode) {
    let list = getLocalStorageData();
    list = list.filter(i => i.ticket_code !== ticketCode);
    saveLocalStorageData(list);

    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(ticketCode);
      }
    } catch (e) {}

    return true;
  }

  // 6. Khôi phục dữ liệu mẫu
  async function resetToDefault() {
    saveLocalStorageData(initialSeedData);
    try {
      const db = await openDB();
      if (db) {
        await new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();
            initialSeedData.forEach(item => store.put(item));
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch(e) {
            resolve();
          }
        });
      }
    } catch(e) {}
    return JSON.parse(JSON.stringify(initialSeedData));
  }

  // 7. Xuất cơ sở dữ liệu sang JSON hoặc CSV
  async function exportData(format = 'json') {
    const data = await getAllFeedbacks();
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `easup_y_kien_cu_tri_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else if (format === 'csv') {
      let csvContent = "\uFEFF"; // UTF-8 BOM
      csvContent += "Mã hồ sơ,Họ tên,Điện thoại,Thôn/Buôn,Lĩnh vực,Tiêu đề,Trạng thái,Ngày gửi,Nội dung trả lời\n";

      data.forEach(row => {
        const line = [
          `"${row.ticket_code}"`,
          `"${row.sender_name || ''}"`,
          `"${row.sender_phone || ''}"`,
          `"${row.village || row.village_name || ''}"`,
          `"${row.category || row.category_name || ''}"`,
          `"${(row.title || '').replace(/"/g, '""')}"`,
          `"${row.status_label || ''}"`,
          `"${new Date(row.created_at).toLocaleDateString('vi-VN')}"`,
          `"${(row.response_content || '').replace(/"/g, '""')}"`
        ].join(",");
        csvContent += line + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", `easup_danh_sach_y_kien_${Date.now()}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  }

  // 8. Đồng bộ dữ liệu từ Google Sheets & Google Drive về hệ thống
  async function syncFromGoogleSheets(customUrl = null) {
    const url = customUrl || localStorage.getItem('easup_google_sheets_url');
    if (!url) return { success: false, message: 'Chưa có cấu hình URL Google Sheets' };

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      if (result && result.status === 'success' && Array.isArray(result.data)) {
        const sheetRecords = result.data;
        if (sheetRecords.length === 0) {
          return { success: true, count: 0, message: 'Google Sheets hiện đang rỗng' };
        }

        const localList = getLocalStorageData();
        const map = new Map();

        // Nạp dữ liệu cũ vào map
        localList.forEach(item => {
          if (item.ticket_code) map.set(item.ticket_code, item);
        });

        // Hợp nhất dữ liệu mới từ Google Sheets
        sheetRecords.forEach(sheetItem => {
          if (sheetItem.ticket_code) {
            const existing = map.get(sheetItem.ticket_code) || {};
            map.set(sheetItem.ticket_code, {
              ...existing,
              ...sheetItem,
              village: sheetItem.village || existing.village || 'Xã Ea Súp',
              village_name: sheetItem.village || existing.village || 'Xã Ea Súp',
              category: sheetItem.category || existing.category || 'Lĩnh vực khác',
              category_name: sheetItem.category || existing.category || 'Lĩnh vực khác',
              drive_links: sheetItem.drive_links || existing.drive_links || []
            });
          }
        });

        const mergedList = Array.from(map.values());
        mergedList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        saveLocalStorageData(mergedList);

        // Đồng bộ ngầm vào IndexedDB
        try {
          const db = await openDB();
          if (db) {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            mergedList.forEach(item => store.put(item));
          }
        } catch(e) {}

        return { success: true, count: sheetRecords.length, data: mergedList };
      } else {
        return { success: false, message: result.message || 'Không đọc được cấu trúc dữ liệu từ Google Sheets' };
      }
    } catch (err) {
      console.warn('Lỗi khi syncFromGoogleSheets:', err);
      return { success: false, message: err.message };
    }
  }

  // Khởi tạo ngay lập tức khi file script được load
  getLocalStorageData();

  return {
    init: openDB,
    insert: insertFeedback,
    getByCode: getFeedbackByCode,
    getAll: getAllFeedbacks,
    updateStatus: updateStatus,
    delete: deleteFeedback,
    resetToDefault: resetToDefault,
    syncFromGoogleSheets: syncFromGoogleSheets,
    exportData: exportData
  };
})();

// Đảm bảo gắn biến vào window để các file script khác luôn truy cập được
if (typeof window !== 'undefined') {
  window.EaSupDB = EaSupDB;
}

