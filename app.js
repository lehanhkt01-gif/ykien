// ============================================================
// Antigravity Web App - Mặt trận Tổ quốc xã Ea Súp & Trả lời cử tri
// Tích hợp Cơ Sở Dữ Liệu EaSupDB (IndexedDB / LocalStorage)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Khởi tạo cơ sở dữ liệu
  if (window.EaSupDB) {
    await EaSupDB.init();
  }

  initRealtimeClock();
  initFileUpload();
  initFeedbackForm();
  initLookupSystem();
  initFaqAccordion();
  initSamplePrompts();
  initAdminDashboard();
});

// 1. Đồng hồ thời gian thực tiếng Việt
function initRealtimeClock() {
  const clockEl = document.getElementById('live-clock');
  if (!clockEl) return;

  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  
  function updateTime() {
    const now = new Date();
    const dayName = days[now.getDay()];
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    clockEl.textContent = `${dayName}, ${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
  }

  updateTime();
  setInterval(updateTime, 1000);
}

// 2. Xử lý Upload Tệp Đính Kèm (Không bắt buộc / Optional)
let selectedFiles = [];

function initFileUpload() {
  const uploadWrapper = document.getElementById('upload-wrapper');
  const fileInput = document.getElementById('file-input');
  const attachedFilesContainer = document.getElementById('attached-files-container');
  const uploadBtnTrigger = document.getElementById('upload-btn-trigger');

  if (!uploadWrapper || !fileInput || !attachedFilesContainer) return;

  // Click vào nút hoặc vùng kéo thả
  uploadBtnTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  uploadWrapper.addEventListener('click', () => {
    fileInput.click();
  });

  // Chọn file từ file input
  fileInput.addEventListener('change', (e) => {
    handleFiles(Array.from(e.target.files));
    fileInput.value = ''; // Reset input
  });

  // Xử lý Kéo & Thả (Drag & Drop)
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadWrapper.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadWrapper.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadWrapper.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadWrapper.classList.remove('dragover');
    });
  });

  uploadWrapper.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      handleFiles(Array.from(dt.files));
    }
  });

  function handleFiles(files) {
    const maxFiles = 5;
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB

    for (const file of files) {
      if (selectedFiles.length >= maxFiles) {
        alert(`Bạn chỉ được đính kèm tối đa ${maxFiles} tệp tin.`);
        break;
      }

      if (file.size > maxSizeBytes) {
        alert(`Tệp "${file.name}" vượt quá dung lượng cho phép (15MB).`);
        continue;
      }

      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        continue;
      }

      selectedFiles.push(file);
    }

    renderAttachedFiles();
  }

  function renderAttachedFiles() {
    attachedFilesContainer.innerHTML = '';

    if (selectedFiles.length === 0) {
      return;
    }

    selectedFiles.forEach((file, index) => {
      const card = document.createElement('div');
      card.className = 'file-item-card';

      const isImage = file.type.startsWith('image/');
      let thumbHtml = '';

      if (isImage) {
        const previewUrl = URL.createObjectURL(file);
        thumbHtml = `<img src="${previewUrl}" class="file-thumb-preview" alt="Preview">`;
      } else if (file.name.endsWith('.pdf')) {
        thumbHtml = `<div class="file-icon-placeholder" style="background:#FEE2E2; color:#DC2626;">📄</div>`;
      } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        thumbHtml = `<div class="file-icon-placeholder" style="background:#DBEAFE; color:#2563EB;">📝</div>`;
      } else {
        thumbHtml = `<div class="file-icon-placeholder">📎</div>`;
      }

      const formattedSize = formatFileSize(file.size);

      card.innerHTML = `
        <div class="file-item-left">
          ${thumbHtml}
          <div class="file-info-details">
            <span class="file-name-text" title="${file.name}">${file.name}</span>
            <span class="file-meta-tag">${formattedSize} • Đã sẵn sàng gửi</span>
          </div>
        </div>
        <button type="button" class="btn-remove-file" title="Xóa tệp này" data-index="${index}">
          ✕
        </button>
      `;

      // Nút xóa tệp
      const removeBtn = card.querySelector('.btn-remove-file');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles.splice(index, 1);
        renderAttachedFiles();
      });

      attachedFilesContainer.appendChild(card);
    });
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }
}

// Chuyển File sang Base64 để lưu vào Database
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// 3. Xử lý Form Gửi Ý kiến / Phản ánh Cử tri -> Lưu vào Database
function initFeedbackForm() {
  const form = document.getElementById('feedback-form');
  const modal = document.getElementById('success-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const copyTicketBtn = document.getElementById('btn-copy-ticket');

  if (!form || !modal) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('sender-name').value.trim() || 'Cử tri ẩn danh';
    const phone = document.getElementById('sender-phone').value.trim();
    const village = document.getElementById('sender-village').value;
    const category = document.getElementById('feedback-category').value;
    const title = document.getElementById('feedback-title').value.trim();
    const content = document.getElementById('feedback-content').value.trim();

    if (!village) {
      alert('Vui lòng chọn Thôn / Buôn tại xã Ea Súp.');
      return;
    }

    if (!title || !content) {
      alert('Vui lòng nhập đầy đủ Tiêu đề và Nội dung phản ánh.');
      return;
    }

    // Hiệu ứng gửi
    const submitBtn = form.querySelector('.btn-submit-feedback');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>⏳ Đang lưu vào cơ sở dữ liệu...</span>`;

    try {
      // Đọc tệp đính kèm sang mảng Base64
      const attachmentsData = [];
      for (const file of selectedFiles) {
        const base64Content = await fileToBase64(file);
        attachmentsData.push({
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Content
        });
      }

      // Tạo mã hồ sơ chuẩn
      const randomCode = 'EASUP-PA-' + Math.floor(100000 + Math.random() * 900000);

      // Lưu vào Database
      const feedbackRecord = {
        ticket_code: randomCode,
        sender_name: name,
        sender_phone: phone,
        village: village,
        category: category,
        title: title,
        content: content,
        attachments: attachmentsData,
        status_code: 'RECEIVED',
        status_label: 'Mới tiếp nhận',
        response_content: 'Ban Thường trực UBMTTQ Việt Nam xã Ea Súp đã tiếp nhận hồ sơ phản ánh, đang tiến hành phân loại và chuyển cơ quan chuyên môn xác minh giải quyết.'
      };

      if (window.EaSupDB) {
        await EaSupDB.insert(feedbackRecord);
      }

      // TỰ ĐỘNG GỬI SANG GOOGLE SHEETS (lehanhkt01@gmail.com)
      sendToGoogleSheets(feedbackRecord);

      // Cập nhật thông tin trong Modal
      document.getElementById('modal-ticket-code').textContent = randomCode;
      
      let fileSummary = 'Không đính kèm tệp';
      if (attachmentsData.length > 0) {
        fileSummary = `Đã đính kèm ${attachmentsData.length} tệp tài liệu/hình ảnh (Đã lưu CSDL)`;
      }
      
      document.getElementById('modal-ticket-details').innerHTML = `
        <strong>Người gửi:</strong> ${name} ${phone ? '(' + phone + ')' : ''}<br>
        <strong>Khu vực:</strong> ${village}<br>
        <strong>Lĩnh vực:</strong> ${category}<br>
        <strong>Tài liệu:</strong> <span style="color:#059669; font-weight:600;">${fileSummary}</span>
      `;

      // Mở modal
      modal.classList.add('active');

      // Reset form & file list
      form.reset();
      selectedFiles = [];
      const attachedFilesContainer = document.getElementById('attached-files-container');
      if (attachedFilesContainer) attachedFilesContainer.innerHTML = '';

    } catch (err) {
      console.error('Lỗi lưu CSDL:', err);
      alert('Có lỗi xảy ra khi lưu phản ánh. Vui lòng thử lại!');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  if (copyTicketBtn) {
    copyTicketBtn.addEventListener('click', () => {
      const code = document.getElementById('modal-ticket-code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        copyTicketBtn.textContent = '✓ Đã sao chép!';
        setTimeout(() => {
          copyTicketBtn.textContent = '📋 Sao chép mã tra cứu';
        }, 2000);
      });
    });
  }

  // Đóng modal khi click ra ngoài
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}

// 4. Tra cứu tiến độ phản ánh từ Cơ Sở Dữ Liệu
function initLookupSystem() {
  const lookupBtn = document.getElementById('btn-lookup');
  const lookupInput = document.getElementById('lookup-code-input');
  const resultBox = document.getElementById('lookup-result-box');

  if (!lookupBtn || !lookupInput || !resultBox) return;

  async function performLookup() {
    const code = lookupInput.value.trim().toUpperCase();
    if (!code) {
      alert('Vui lòng nhập mã hồ sơ cần tra cứu.');
      return;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = '<div style="text-align:center; padding:10px; color:#6B7280;">⏳ Đang truy vấn cơ sở dữ liệu...</div>';

    let record = null;
    if (window.EaSupDB) {
      record = await EaSupDB.getByCode(code);
    }

    if (record) {
      const formattedDate = new Date(record.created_at).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      let statusBadgeColor = '#059669';
      let statusBgColor = '#ECFDF5';
      if (record.status_code === 'RECEIVED') {
        statusBadgeColor = '#D97706';
        statusBgColor = '#FFFBEB';
      } else if (record.status_code === 'PROCESSING') {
        statusBadgeColor = '#2563EB';
        statusBgColor = '#EFF6FF';
      }

      let attachHtml = '';
      if (record.attachments && record.attachments.length > 0) {
        attachHtml = `<div style="margin-top:6px; font-size:0.85rem; color:#4B5563;">📎 <strong>Tệp đính kèm:</strong> ${record.attachments.map(a => a.name).join(', ')}</div>`;
      }

      resultBox.innerHTML = `
        <div style="border-left: 4px solid ${statusBadgeColor}; padding-left: 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:8px; gap:8px;">
            <strong style="color:#C8102E; font-size:1.05rem;">Mã hồ sơ: ${record.ticket_code}</strong>
            <span style="background:${statusBgColor}; color:${statusBadgeColor}; padding:4px 12px; border-radius:999px; font-weight:700; font-size:0.85rem;">
              ${record.status_label}
            </span>
          </div>
          <h4 style="margin-bottom:6px; color:#1F2937; font-size:1rem;">${record.title}</h4>
          <p style="font-size:0.88rem; color:#6B7280; margin-bottom:4px;">
            <strong>Địa bàn:</strong> ${record.village} • <strong>Lĩnh vực:</strong> ${record.category} • <strong>Thời gian:</strong> ${formattedDate}
          </p>
          ${attachHtml}
          <div style="background:#F9FAFB; padding:12px 14px; border-radius:6px; font-size:0.9rem; color:#374151; margin-top:10px; border:1px solid #E5E7EB;">
            <strong style="color:var(--primary-red);">Nội dung phản hồi từ UBMTTQ Xã Ea Súp:</strong><br>
            ${record.response_content || 'Đang cập nhật tiến độ giải quyết.'}
          </div>
        </div>
      `;
    } else {
      resultBox.innerHTML = `
        <div style="border-left: 4px solid #EF4444; padding-left: 14px;">
          <strong style="color:#DC2626; font-size:1rem;">Không tìm thấy hồ sơ mã: ${code}</strong>
          <p style="font-size:0.88rem; color:#4B5563; margin-top:4px;">Vui lòng kiểm tra lại mã hồ sơ hoặc liên hệ đường dây nóng <strong>0262.3688.115</strong> để được hỗ trợ tra cứu trực tiếp.</p>
        </div>
      `;
    }
  }

  lookupBtn.addEventListener('click', performLookup);
  lookupInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performLookup();
  });

  // Gắn sự kiện click vào các mã mẫu
  document.querySelectorAll('.sample-code-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      lookupInput.value = tag.getAttribute('data-code');
      performLookup();
    });
  });
}

// 5. Bảng Điều Khiển Quản Lý Cán Bộ Tiếp Nhận (Admin Dashboard)
function initAdminDashboard() {
  const adminModal = document.getElementById('admin-modal');
  const btnOpenAdmin = document.getElementById('btn-open-admin');
  const footerBtnAdmin = document.getElementById('footer-btn-admin');
  const btnCloseAdmin = document.getElementById('btn-close-admin');
  const adminTableBody = document.getElementById('admin-table-body');
  
  const searchInput = document.getElementById('admin-search-text');
  const filterVillage = document.getElementById('admin-filter-village');
  const filterStatus = document.getElementById('admin-filter-status');
  
  const btnExportExcel = document.getElementById('btn-export-excel');
  const btnExportJson = document.getElementById('btn-export-json');

  // Detail Modal Elements
  const detailModal = document.getElementById('admin-detail-modal');
  const btnCloseDetail = document.getElementById('btn-close-detail');
  const btnCancelDetail = document.getElementById('btn-cancel-detail');
  const btnSaveStatus = document.getElementById('btn-save-feedback-status');
  const editStatusSelect = document.getElementById('edit-status-select');
  const editResponseText = document.getElementById('edit-response-text');
  const adminDetailContent = document.getElementById('admin-detail-content');

  let currentDetailTicketCode = null;

  async function openAdminModal() {
    if (adminModal) {
      adminModal.classList.add('active');
      await renderAdminTable();
    }
  }

  function closeAdminModal() {
    if (adminModal) {
      adminModal.classList.remove('active');
    }
  }

  if (btnOpenAdmin) btnOpenAdmin.addEventListener('click', openAdminModal);
  if (footerBtnAdmin) footerBtnAdmin.addEventListener('click', openAdminModal);
  if (btnCloseAdmin) btnCloseAdmin.addEventListener('click', closeAdminModal);

  const btnResetDb = document.getElementById('btn-reset-db');

  // Render bảng danh sách từ Database
  async function renderAdminTable() {
    if (!adminTableBody) return;

    try {
      let allFeedbacks = [];
      if (window.EaSupDB) {
        allFeedbacks = await EaSupDB.getAll();
      }

      // Lọc theo từ khóa
      const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
      if (keyword) {
        allFeedbacks = allFeedbacks.filter(f => {
          const code = (f.ticket_code || '').toLowerCase();
          const name = (f.sender_name || '').toLowerCase();
          const phone = (f.sender_phone || '').toLowerCase();
          const village = (f.village || f.village_name || '').toLowerCase();
          const category = (f.category || f.category_name || '').toLowerCase();
          const title = (f.title || '').toLowerCase();
          const content = (f.content || '').toLowerCase();
          const status = (f.status_label || '').toLowerCase();
          return code.includes(keyword) || name.includes(keyword) || phone.includes(keyword) ||
                 village.includes(keyword) || category.includes(keyword) || title.includes(keyword) ||
                 content.includes(keyword) || status.includes(keyword);
        });
      }

      // Lọc theo Thôn/Buôn
      const villageVal = filterVillage ? filterVillage.value.trim() : '';
      if (villageVal) {
        allFeedbacks = allFeedbacks.filter(f => (f.village || f.village_name || '') === villageVal);
      }

      // Lọc theo Trạng thái
      const statusVal = filterStatus ? filterStatus.value.trim() : '';
      if (statusVal) {
        allFeedbacks = allFeedbacks.filter(f => f.status_code === statusVal);
      }

      if (!allFeedbacks || allFeedbacks.length === 0) {
        adminTableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:30px 20px; color:#6B7280;">
              <div style="font-size:1.1rem; margin-bottom:6px;">📭 Không tìm thấy hồ sơ nào phù hợp bộ lọc.</div>
              <button type="button" id="btn-empty-reset" style="background:#0284C7; color:#FFFFFF; border:none; padding:6px 14px; border-radius:4px; font-size:0.85rem; cursor:pointer; margin-top:8px;">
                🔄 Khôi phục danh sách mẫu ban đầu
              </button>
            </td>
          </tr>
        `;
        const btnEmptyReset = document.getElementById('btn-empty-reset');
        if (btnEmptyReset && window.EaSupDB) {
          btnEmptyReset.addEventListener('click', async () => {
            await EaSupDB.resetToDefault();
            if (searchInput) searchInput.value = '';
            if (filterVillage) filterVillage.value = '';
            if (filterStatus) filterStatus.value = '';
            await renderAdminTable();
          });
        }
        return;
      }

      adminTableBody.innerHTML = '';
      allFeedbacks.forEach(item => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'received';
        if (item.status_code === 'COMPLETED') badgeClass = 'completed';
        else if (item.status_code === 'PROCESSING') badgeClass = 'processing';

        const fileCount = (item.attachments && item.attachments.length) || 0;
        const fileTag = fileCount > 0 
          ? `<span style="background:#E0E7FF; color:#3730A3; font-weight:700; padding:2px 8px; border-radius:999px; font-size:0.75rem;">📎 ${fileCount}</span>`
          : `<span style="color:#9CA3AF; font-size:0.8rem;">-</span>`;

        let dateStr = 'Mới gửi';
        if (item.created_at) {
          try {
            dateStr = new Date(item.created_at).toLocaleDateString('vi-VN');
          } catch(e) {}
        }

        const senderVillage = item.village || item.village_name || 'Xã Ea Súp';
        const itemCategory = item.category || item.category_name || 'Lĩnh vực khác';

        tr.innerHTML = `
          <td><strong style="color:var(--primary-red); font-family:monospace; font-size:0.92rem;">${item.ticket_code}</strong></td>
          <td>
            <div style="font-weight:600; color:#1F2937;">${item.sender_name || 'Cử tri ẩn danh'}</div>
            <div style="font-size:0.78rem; color:#6B7280;">${senderVillage} ${item.sender_phone ? '• ' + item.sender_phone : ''}</div>
          </td>
          <td>
            <div style="font-weight:600; max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.title || ''}">${item.title || '(Không có tiêu đề)'}</div>
            <div style="font-size:0.78rem; color:#6B7280;">${itemCategory}</div>
          </td>
          <td style="text-align:center;">${fileTag}</td>
          <td><span class="status-badge ${badgeClass}">${item.status_label || 'Mới tiếp nhận'}</span></td>
          <td style="color:#6B7280; font-size:0.85rem;">${dateStr}</td>
          <td style="text-align:center;">
            <button type="button" class="btn-action-view" data-code="${item.ticket_code}">
              Xem & Xử lý
            </button>
          </td>
        `;

        // Gắn sự kiện xem chi tiết
        tr.querySelector('.btn-action-view').addEventListener('click', () => {
          openDetailModal(item);
        });

        adminTableBody.appendChild(tr);
      });
    } catch (err) {
      console.error('Lỗi khi renderAdminTable:', err);
      adminTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#EF4444;">⚠️ Có lỗi khi tải dữ liệu: ${err.message}</td></tr>`;
    }
  }

  // Nút Nạp Lại Mẫu Dữ Liệu
  if (btnResetDb && window.EaSupDB) {
    btnResetDb.addEventListener('click', async () => {
      if (confirm('Bạn có chắc chắn muốn nạp lại danh sách dữ liệu mẫu ban đầu không?')) {
        await EaSupDB.resetToDefault();
        if (searchInput) searchInput.value = '';
        if (filterVillage) filterVillage.value = '';
        if (filterStatus) filterStatus.value = '';
        await renderAdminTable();
        alert('✓ Đã khôi phục thành công danh sách hồ sơ mẫu!');
      }
    });
  }

  // Mở modal chi tiết & xử lý hồ sơ
  function openDetailModal(item) {
    currentDetailTicketCode = item.ticket_code;

    let attachListHtml = '<em>Không có tệp đính kèm</em>';
    if (item.attachments && item.attachments.length > 0) {
      attachListHtml = item.attachments.map(att => {
        if (att.data && att.type && att.type.startsWith('image/')) {
          return `
            <div style="display:inline-block; margin-right:10px; margin-top:8px; text-align:center;">
              <img src="${att.data}" style="width:70px; height:70px; object-fit:cover; border-radius:6px; border:1px solid #E2E8F0; display:block;" alt="Ảnh đính kèm">
              <span style="font-size:0.75rem; color:#6B7280; display:block; max-width:70px; overflow:hidden; text-overflow:ellipsis;">${att.name}</span>
            </div>
          `;
        } else {
          return `<div style="font-size:0.85rem; margin-top:4px;">📄 <strong>${att.name}</strong> (${(att.size / 1024).toFixed(1)} KB)</div>`;
        }
      }).join('');
    }

    adminDetailContent.innerHTML = `
      <div style="background:#FFFDF0; border:1px solid #FDE68A; padding:12px; border-radius:6px; margin-bottom:12px;">
        <strong style="color:var(--primary-red); font-size:1.05rem;">Mã hồ sơ: ${item.ticket_code}</strong> | 
        <span>Khu vực: <strong>${item.village}</strong></span> | 
        <span>Lĩnh vực: <strong>${item.category}</strong></span>
      </div>
      <p style="margin-bottom:6px;"><strong>Người phản ánh:</strong> ${item.sender_name} ${item.sender_phone ? ' - SĐT: ' + item.sender_phone : ''}</p>
      <p style="margin-bottom:6px;"><strong>Tiêu đề:</strong> ${item.title}</p>
      <div style="background:#F1F5F9; padding:10px 12px; border-radius:6px; margin-bottom:10px;">
        <strong>Nội dung phản ánh:</strong><br>
        ${item.content}
      </div>
      <div style="margin-bottom:12px;">
        <strong>Tài liệu/Hình ảnh đính kèm:</strong><br>
        ${attachListHtml}
      </div>
    `;

    editStatusSelect.value = item.status_code || 'RECEIVED';
    editResponseText.value = item.response_content || '';

    detailModal.classList.add('active');
  }

  function closeDetailModal() {
    detailModal.classList.remove('active');
    currentDetailTicketCode = null;
  }

  if (btnCloseDetail) btnCloseDetail.addEventListener('click', closeDetailModal);
  if (btnCancelDetail) btnCancelDetail.addEventListener('click', closeDetailModal);

  // Lưu trạng thái và nội dung trả lời
  if (btnSaveStatus) {
    btnSaveStatus.addEventListener('click', async () => {
      if (!currentDetailTicketCode || !window.EaSupDB) return;

      const newStatusCode = editStatusSelect.value;
      let newStatusLabel = 'Mới tiếp nhận';
      if (newStatusCode === 'PROCESSING') newStatusLabel = 'Đang thẩm tra, xử lý';
      else if (newStatusCode === 'COMPLETED') newStatusLabel = 'Đã hoàn tất xử lý';

      const responseText = editResponseText.value.trim();

      await EaSupDB.updateStatus(currentDetailTicketCode, newStatusCode, newStatusLabel, responseText);
      alert(`Đã cập nhật thành công hồ sơ ${currentDetailTicketCode}!`);

      closeDetailModal();
      await renderAdminTable();
    });
  }

  // Sự kiện lọc
  if (searchInput) searchInput.addEventListener('input', renderAdminTable);
  if (filterVillage) filterVillage.addEventListener('change', renderAdminTable);
  if (filterStatus) filterStatus.addEventListener('change', renderAdminTable);

  // Xuất file
  if (btnExportExcel && window.EaSupDB) {
    btnExportExcel.addEventListener('click', () => EaSupDB.exportData('csv'));
  }
  if (btnExportJson && window.EaSupDB) {
    btnExportJson.addEventListener('click', () => EaSupDB.exportData('json'));
  }

  // Cấu hình kết nối Google Sheets (lehanhkt01@gmail.com)
  const inputGsheetUrl = document.getElementById('input-gsheet-url');
  const btnSaveGsheetUrl = document.getElementById('btn-save-gsheet-url');
  const btnTestGsheet = document.getElementById('btn-test-gsheet');
  const savedUrl = localStorage.getItem('easup_google_sheets_url') || '';

  if (inputGsheetUrl) {
    inputGsheetUrl.value = savedUrl;
  }

  if (btnSaveGsheetUrl && inputGsheetUrl) {
    btnSaveGsheetUrl.addEventListener('click', () => {
      const url = inputGsheetUrl.value.trim();
      if (!url) {
        alert('Vui lòng dán URL Google Apps Script Web App.');
        return;
      }
      if (url.includes('/edit')) {
        alert('⚠️ CẢNH BÁO: Đường link bạn vừa nhập có chứa "/edit" (Đây là trang chỉnh sửa mã nguồn, KHÔNG PHẢI URL Web App).\n\n👉 Cách lấy URL Web App đúng:\n1. Mở trang Google Apps Script.\n2. Bấm nút "Triển khai" (Deploy) màu xanh ở góc phải trên > Chọn "Tùy chọn triển khai mới" (New deployment).\n3. Chọn loại: "Ứng dụng web" (Web App).\n4. Quyền truy cập (Who has access): Chọn "Bất kỳ ai" (Anyone).\n5. Bấm "Triển khai" và sao chép đường link kết thúc bằng "/exec".');
        return;
      }
      if (!url.startsWith('https://script.google.com/macros/s/') || !url.endsWith('/exec')) {
        if (!confirm('⚠️ Cảnh báo: URL Web App hợp lệ thường bắt đầu bằng https://script.google.com/macros/s/ và kết thúc bằng /exec\n\nBạn có muốn tiếp tục lưu URL này không?')) {
          return;
        }
      }
      localStorage.setItem('easup_google_sheets_url', url);
      alert('✓ Đã lưu thành công cấu hình Google Sheets! Dữ liệu phản ánh sẽ tự động gửi sang tài khoản lehanhkt01@gmail.com.');
    });
  }

  // Nút gửi thử nghiệm sang Google Sheets
  if (btnTestGsheet && inputGsheetUrl) {
    btnTestGsheet.addEventListener('click', async () => {
      const url = inputGsheetUrl.value.trim() || localStorage.getItem('easup_google_sheets_url');
      if (!url) {
        alert('⚠️ Vui lòng dán URL Web App vào ô bên cạnh trước khi bấm gửi thử.');
        return;
      }

      if (url.includes('/edit')) {
        alert('⚠️ CẢNH BÁO: Link bạn dán là link chỉnh sửa Code Apps Script (có chữ /edit).\n\n👉 Vui lòng nhấn nút "Triển khai" (Deploy) > "Tùy chọn triển khai mới" > "Ứng dụng web" (Web App) > Chọn quyền "Bất kỳ ai" (Anyone) > Copy link kết thúc bằng /exec.');
        return;
      }

      localStorage.setItem('easup_google_sheets_url', url);

      btnTestGsheet.disabled = true;
      btnTestGsheet.textContent = '⏳ Đang gửi...';

      const testRecord = {
        ticket_code: 'TEST-PA-' + Math.floor(100000 + Math.random() * 900000),
        sender_name: 'Cán bộ kiểm tra MTTQ',
        sender_phone: '0912345678',
        village: 'Buôn A',
        category: 'Kiểm tra kết nối hệ thống',
        title: 'Thử nghiệm lưu Google Sheets & Google Drive',
        content: 'Đây là dòng thử nghiệm kiểm tra tính năng tự động lưu thông tin và tệp đính kèm vào tài khoản lehanhkt01@gmail.com.',
        attachments: [
          {
            name: 'thong_tin_thu_nghiem.txt',
            type: 'text/plain',
            size: 120,
            data: 'data:text/plain;base64,' + btoa('Thử nghiệm tải tệp lên Google Drive thành công từ Cổng thông tin MTTQ Xã Ea Súp!')
          }
        ],
        status_label: 'Mới tiếp nhận',
        response_content: 'Đã lưu tệp vào Google Drive thành công!'
      };

      try {
        await sendToGoogleSheets(testRecord, url);
        alert(`✓ ĐÃ PHÁT LỆNH GỬI THÀNH CÔNG SANG GOOGLE APPS SCRIPT!\n\nMã hồ sơ: ${testRecord.ticket_code}\n\n👉 Bạn hãy mở:\n1. Bảng tính Google Sheets trên tài khoản lehanhkt01@gmail.com\n2. Thư mục "HỒ SƠ PHẢN ÁNH CỬ TRI - XÃ EA SÚP" trên Google Drive\nđể kiểm tra kết quả nhé!`);
      } catch (err) {
        alert(`Lỗi khi gửi: ${err.message}`);
      } finally {
        btnTestGsheet.disabled = false;
        btnTestGsheet.textContent = '🧪 Gửi Dòng Thử Nghiệm';
      }
    });
  }
}

// ============================================================
// HÀM TỰ ĐỘNG GỬI DỮ LIỆU SANG GOOGLE SHEETS & GOOGLE DRIVE
// ============================================================
async function sendToGoogleSheets(feedbackRecord, overrideUrl = null) {
  const gsheetUrl = overrideUrl || localStorage.getItem('easup_google_sheets_url');
  
  if (!gsheetUrl) {
    console.log('Chưa thiết lập URL Google Apps Script. Dữ liệu đã lưu an toàn trong CSDL nội bộ.');
    return;
  }

  try {
    const payload = {
      ticket_code: feedbackRecord.ticket_code,
      sender_name: feedbackRecord.sender_name || 'Cử tri ẩn danh',
      sender_phone: feedbackRecord.sender_phone || '',
      village: feedbackRecord.village || feedbackRecord.village_name || '',
      category: feedbackRecord.category || feedbackRecord.category_name || '',
      title: feedbackRecord.title || '',
      content: feedbackRecord.content || '',
      attachments: (feedbackRecord.attachments || []).map(a => ({
        name: a.name || 'Tệp_dinh_kem',
        type: a.type || 'application/octet-stream',
        size: a.size || 0,
        data: a.data || ''
      })),
      status_label: feedbackRecord.status_label || 'Mới tiếp nhận',
      response_content: feedbackRecord.response_content || ''
    };

    // Tạo timeout 8 giây qua AbortController để không bị treo nút gửi
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      await fetch(gsheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (fetchErr) {
      if (fetchErr.name !== 'AbortError') {
        console.warn('Lỗi fetch gửi Sheets:', fetchErr);
      }
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('✓ Đã phát lệnh gửi dữ liệu sang Google Drive / Sheets (lehanhkt01@gmail.com)');
  } catch (err) {
    console.warn('Lỗi kết nối Google Sheets/Drive:', err);
  }
}

// 6. Accordion câu hỏi thường gặp
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// 7. Click vào câu hỏi gợi ý trong card AI
function initSamplePrompts() {
  document.querySelectorAll('.ai-prompt-item').forEach(item => {
    item.addEventListener('click', () => {
      const promptText = item.querySelector('span').textContent;
      const chatgptUrl = `https://chatgpt.com/?q=${encodeURIComponent('Hỏi về xã Ea Súp, Đắk Lắk: ' + promptText)}`;
      window.open(chatgptUrl, '_blank');
    });
  });
}

