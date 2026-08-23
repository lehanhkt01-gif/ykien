// ============================================================
// EaSupDB - Hệ Thống Cơ Sở Dữ Liệu Cổng Phản Ánh Cử Tri Xã Ea Súp
// Lưu trữ trực tiếp trên trình duyệt (IndexedDB / LocalStorage)
// ============================================================

const EaSupDB = (() => {
  const DB_NAME = 'EaSupCitizenDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'citizen_feedbacks';
  const LOCAL_STORAGE_KEY = 'easup_citizen_feedbacks_backup';

  let dbInstance = null;

  // Dữ liệu mẫu ban đầu
  const initialSeedData = [
    {
      ticket_code: 'EASUP-PA-892415',
      sender_name: 'Trần Văn Mạnh',
      sender_phone: '0913845***',
      village: 'Buôn A',
      category: 'Đường giao thông nông thôn, kênh mương thủy lợi',
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
      sender_phone: '0988123***',
      village: 'Thôn Thành Công',
      category: 'Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt',
      title: 'Phản ánh điểm tập kết rác thải tự phát gần khu dân cư Thôn Thành Công',
      content: 'Thời gian gần đây có một số hộ tập kết rác sai quy định bốc mùi hôi thối, đề nghị Ban MTTQ và chính quyền có biện pháp tuyên truyền, xử lý.',
      attachments: [],
      status_code: 'PROCESSING',
      status_label: 'Đang thẩm tra, xử lý',
      response_content: 'Ủy ban MTTQ xã đã gửi văn bản đề nghị Tổ quản lý trật tự & môi trường xã phối hợp cùng Ban Tự quản Thôn Thành Công kiểm tra, thu gom rác trong 48 giờ tới.',
      created_at: '2026-08-22T14:20:00.000Z',
      updated_at: '2026-08-22T16:00:00.000Z'
    }
  ];

  // Mở hoặc khởi tạo IndexedDB
  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }

      if (!window.indexedDB) {
        console.warn('Trình duyệt không hỗ trợ IndexedDB, sử dụng LocalStorage fallback.');
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'ticket_code' });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('village', 'village', { unique: false });
          store.createIndex('status_code', 'status_code', { unique: false });

          // Chèn seed data
          initialSeedData.forEach(item => store.add(item));
        }
      };

      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        console.error('Lỗi khởi tạo IndexedDB:', e.target.error);
        resolve(null); // fallback
      };
    });
  }

  // Khởi tạo và kiểm tra LocalStorage nếu cần
  function initLocalStorage() {
    const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialSeedData));
    }
  }

  // 1. Thêm phản ánh mới vào cơ sở dữ liệu
  async function insertFeedback(feedback) {
    const db = await openDB();
    const newRecord = {
      ticket_code: feedback.ticket_code,
      sender_name: feedback.sender_name || 'Cử tri ẩn danh',
      sender_phone: feedback.sender_phone || '',
      village: feedback.village,
      category: feedback.category,
      title: feedback.title,
      content: feedback.content,
      attachments: feedback.attachments || [], // Mảng metadata và base64 file
      status_code: feedback.status_code || 'RECEIVED',
      status_label: feedback.status_label || 'Mới tiếp nhận',
      response_content: feedback.response_content || 'Ban Thường trực UBMTTQ Việt Nam xã Ea Súp đã tiếp nhận, đang phân loại và chuyển cơ quan chuyên môn giải quyết.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (db) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(newRecord);

        req.onsuccess = () => {
          syncToLocalStorage();
          resolve(newRecord);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    } else {
      // LocalStorage fallback
      initLocalStorage();
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const filtered = list.filter(item => item.ticket_code !== newRecord.ticket_code);
      filtered.unshift(newRecord);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      return newRecord;
    }
  }

  // 2. Tra cứu phản ánh theo Mã hồ sơ
  async function getFeedbackByCode(code) {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();
    const db = await openDB();

    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(cleanCode);

        req.onsuccess = (e) => {
          if (e.target.result) {
            resolve(e.target.result);
          } else {
            // Thử tìm trong fallback
            const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
            const found = list.find(item => item.ticket_code.toUpperCase() === cleanCode);
            resolve(found || null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } else {
      initLocalStorage();
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      return list.find(item => item.ticket_code.toUpperCase() === cleanCode) || null;
    }
  }

  // 3. Lấy tất cả phản ánh (dành cho bảng điều khiển quản trị)
  async function getAllFeedbacks() {
    const db = await openDB();

    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = (e) => {
          let list = e.target.result || [];
          // Sắp xếp mới nhất lên đầu
          list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          resolve(list);
        };
        req.onerror = () => {
          initLocalStorage();
          resolve(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]'));
        };
      });
    } else {
      initLocalStorage();
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return list;
    }
  }

  // 4. Cập nhật trạng thái và phản hồi cử tri (Dành cho cán bộ)
  async function updateStatus(ticketCode, statusCode, statusLabel, responseContent) {
    const record = await getFeedbackByCode(ticketCode);
    if (!record) return false;

    record.status_code = statusCode;
    record.status_label = statusLabel;
    if (responseContent !== undefined) {
      record.response_content = responseContent;
    }
    record.updated_at = new Date().toISOString();

    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => {
          syncToLocalStorage();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      });
    } else {
      initLocalStorage();
      const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const idx = list.findIndex(i => i.ticket_code === ticketCode);
      if (idx !== -1) {
        list[idx] = record;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      }
      return true;
    }
  }

  // 5. Xóa phản ánh
  async function deleteFeedback(ticketCode) {
    const db = await openDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(ticketCode);
        req.onsuccess = () => {
          syncToLocalStorage();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      });
    } else {
      initLocalStorage();
      let list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      list = list.filter(i => i.ticket_code !== ticketCode);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      return true;
    }
  }

  // Đồng bộ sang LocalStorage
  async function syncToLocalStorage() {
    const all = await getAllFeedbacks();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
  }

  // 6. Xuất cơ sở dữ liệu sang JSON hoặc CSV
  async function exportData(format = 'json') {
    const data = await getAllFeedbacks();
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `easup_phan_anh_cu_tri_${Date.now()}.json`);
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
          `"${row.village || ''}"`,
          `"${row.category || ''}"`,
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
      downloadAnchor.setAttribute("download", `easup_danh_sach_phan_anh_${Date.now()}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  }

  return {
    init: openDB,
    insert: insertFeedback,
    getByCode: getFeedbackByCode,
    getAll: getAllFeedbacks,
    updateStatus: updateStatus,
    delete: deleteFeedback,
    exportData: exportData
  };
})();
