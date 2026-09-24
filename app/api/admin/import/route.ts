import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { batchImportFeedbacks } from "@/lib/data-store";
import { VILLAGES, CATEGORIES } from "@/lib/constants";
import * as XLSX from "xlsx";

function normalizeKey(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function parseDateVal(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;
  // Excel serial number (ví dụ: 45524)
  if (typeof val === "number" || (!isNaN(Number(val)) && Number(val) > 25000 && Number(val) < 80000)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Number(val) * 86400000);
    if (!isNaN(date.getTime())) return date;
  }
  const str = String(val).trim();
  if (!str) return undefined;
  // Định dạng dd/mm/yyyy hoặc dd-mm-yyyy kèm giờ phút nếu có
  const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const minutes = match[5] ? parseInt(match[5], 10) : 0;
    const seconds = match[6] ? parseInt(match[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Yêu cầu đăng nhập tài khoản quản trị" },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn file Excel (.xlsx, .xls, .csv)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Đọc workbook bằng thư viện xlsx với định dạng ngày chuẩn
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json(
        { success: false, message: "File Excel không chứa bất kỳ sheet nào" },
        { status: 400 }
      );
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Đọc dữ liệu thô dạng ma trận 2 chiều [hàng][cột]
    const raw2D: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (!raw2D || raw2D.length === 0) {
      return NextResponse.json(
        { success: false, message: "File Excel không có dữ liệu" },
        { status: 400 }
      );
    }

    // 1. Tự động nhận diện dòng tiêu đề cột (Header Row)
    // Quét tối đa 20 dòng đầu tiên để tìm dòng chứa nhiều từ khóa cột nhất
    const headerKeywords = [
      "noidung", "ykien", "kiennghi", "phananh", "content",
      "hovaten", "hoten", "cutri", "nguoigui", "voter",
      "thon", "buon", "diaban", "diachi", "village",
      "linhvuc", "phanloai", "chuyende", "category",
      "sodienthoai", "dienthoai", "sdt", "phone",
      "trangthai", "tiendo", "status",
      "coquan", "donvi", "traloi", "response",
      "mahoso", "ticket", "stt"
    ];

    let bestHeaderRowIdx = 0;
    let maxKeywordMatches = 0;
    const maxScanRows = Math.min(raw2D.length, 20);

    for (let r = 0; r < maxScanRows; r++) {
      const row = raw2D[r];
      if (!Array.isArray(row)) continue;
      let matches = 0;
      for (const cell of row) {
        const norm = normalizeKey(cell);
        if (!norm) continue;
        for (const kw of headerKeywords) {
          if (norm.includes(kw)) {
            matches++;
            break;
          }
        }
      }
      if (matches > maxKeywordMatches) {
        maxKeywordMatches = matches;
        bestHeaderRowIdx = r;
      }
    }

    const headerRow = raw2D[bestHeaderRowIdx] || [];
    const normalizedHeaders = headerRow.map((cell: any) => normalizeKey(cell));

    // Hàm lấy giá trị ô dựa theo các từ khóa cột
    const getValueByKeywords = (dataRow: any[], ...keywords: string[]) => {
      for (const kw of keywords) {
        const idx = normalizedHeaders.findIndex((h) => h.includes(kw));
        if (idx !== -1 && dataRow[idx] !== undefined && dataRow[idx] !== null) {
          const val = String(dataRow[idx]).trim();
          if (val) return val;
        }
      }
      return "";
    };

    const getRawByKeywords = (dataRow: any[], ...keywords: string[]) => {
      for (const kw of keywords) {
        const idx = normalizedHeaders.findIndex((h) => h.includes(kw));
        if (idx !== -1 && dataRow[idx] !== undefined && dataRow[idx] !== null) {
          return dataRow[idx];
        }
      }
      return undefined;
    };

    const parsedItems: any[] = [];

    // Duyệt qua từng dòng dữ liệu từ sau dòng tiêu đề
    for (let r = bestHeaderRowIdx + 1; r < raw2D.length; r++) {
      const row = raw2D[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const hasAnyValue = row.some((c) => c !== undefined && c !== null && String(c).trim() !== "");
      if (!hasAnyValue) continue;

      // 1. Nội dung ý kiến (Bắt buộc)
      let content = getValueByKeywords(
        row,
        "noidungykien", "noidungphananh", "noidungkiennghi", "ykienkiennghi", "ykien",
        "noidung", "phananh", "kiennghi", "trichyeu", "vande", "content"
      );

      // Nếu không tìm được qua header, tìm ô văn bản dài nhất trong dòng (> 12 ký tự)
      if (!content) {
        for (let col = 0; col < row.length; col++) {
          const cellStr = String(row[col] || "").trim();
          if (cellStr.length > 12 && !/^\d+$/.test(cellStr) && !parseDateVal(cellStr)) {
            content = cellStr;
            break;
          }
        }
      }

      // Bỏ qua dòng nếu không có nội dung ý kiến
      if (!content || content.trim().length === 0) {
        continue;
      }

      // 2. Họ và tên cử tri
      const voterName = getValueByKeywords(
        row,
        "hovaten", "hoten", "tencutri", "cutri", "nguoigui", "nguoiphananh", "nguoikiennghi", "votername", "sender"
      ) || "Cử tri Ea Súp";

      // 3. Số điện thoại
      const phone = getValueByKeywords(row, "sodienthoai", "dienthoai", "sdt", "phone", "lienhe") || null;

      // 4. Địa bàn Thôn / Buôn
      const villageRaw = getValueByKeywords(row, "thonbuon", "diabanthonbuon", "diaban", "thon", "buon", "diachi", "village");
      let village = "Buôn A";
      if (villageRaw) {
        const normVillage = normalizeKey(villageRaw);
        const found = VILLAGES.find((v) => {
          const nv = normalizeKey(v);
          return nv === normVillage || normVillage.includes(nv) || nv.includes(normVillage);
        });
        village = found || villageRaw;
      }

      // 5. Lĩnh vực
      const categoryRaw = getValueByKeywords(row, "linhvuc", "phanloai", "chuyende", "nganh", "category");
      let category = "Đường giao thông nông thôn, kênh mương thủy lợi";
      if (categoryRaw) {
        const normCat = normalizeKey(categoryRaw);
        const found = CATEGORIES.find((c) => {
          const nc = normalizeKey(c);
          return nc === normCat || normCat.includes(nc) || nc.includes(normCat);
        });
        category = found || categoryRaw;
      }

      // 6. Mã hồ sơ tra cứu
      let ticketCodeRaw = getValueByKeywords(row, "mahoso", "matracuu", "ticketcode", "ticket", "sohoso");
      // Nếu mã chỉ là số thứ tự thuần túy 1, 2, 3... thì để trống để tự sinh EASUP-PA-XXXXXX
      if (/^\d{1,4}$/.test(ticketCodeRaw)) {
        ticketCodeRaw = "";
      }

      // 7. Nội dung trả lời và trạng thái
      const responseContent = getValueByKeywords(
        row,
        "noidungtraloi", "noidunggiaiquyet", "ketquagiaiquyet", "ykientraloi", "traloi", "ketquaxuly", "response"
      );

      let status = getValueByKeywords(row, "trangthai", "tiendo", "tinhtrang", "status");
      if (!status) {
        status = responseContent ? "Đã trả lời" : "Đã tiếp nhận";
      }

      // 8. Cơ quan trả lời
      const answeringOrg = getValueByKeywords(
        row,
        "coquantraloi", "donvigiaiquyet", "coquanthuly", "donvitraloi", "coquan", "donvi", "answeringorg"
      ) || (responseContent ? "Ủy ban Nhân dân xã Ea Súp" : "");

      // 9. Cán bộ trả lời / Người ký
      const answeredBy = getValueByKeywords(row, "nguoiky", "canbothuly", "canbo", "nguoitraloi", "answeredby") || "Lãnh đạo UBND xã";

      // 10. Văn bản đính kèm
      const documentUrl = getValueByKeywords(row, "vanbandinhkem", "sohieuvanban", "linkvanban", "vanban", "tailieu", "documenturl") || null;

      // 11. Ngày tiếp nhận & Ngày trả lời
      const createdAtRaw = getRawByKeywords(row, "ngaytiepnhan", "ngaygui", "ngaytao", "ngayphananh", "createdat");
      const createdAt = parseDateVal(createdAtRaw) || new Date();

      const answeredAtRaw = getRawByKeywords(row, "ngaytraloi", "ngaybanhanh", "ngaygiaiquyet", "answeredat");
      const answeredAt = parseDateVal(answeredAtRaw);

      // 12. Thống kê đánh giá
      const ratingVerySatisfied = parseInt(getValueByKeywords(row, "rathailong", "verysatisfied"), 10) || 0;
      const ratingSatisfied = parseInt(getValueByKeywords(row, "hailong", "satisfied"), 10) || 0;
      const ratingUnsatisfied = parseInt(getValueByKeywords(row, "chuahailong", "khonghailong", "unsatisfied"), 10) || 0;

      parsedItems.push({
        ticketCode: ticketCodeRaw || undefined,
        voterName,
        phone,
        village,
        category,
        content,
        status,
        createdAt,
        answeringOrg,
        responseContent,
        documentUrl,
        answeredBy,
        answeredAt,
        ratingVerySatisfied,
        ratingSatisfied,
        ratingUnsatisfied,
      });
    }

    if (parsedItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Không tìm thấy dòng dữ liệu hợp lệ trong file. Vui lòng kiểm tra lại file Excel (cần có cột 'Nội dung ý kiến' hoặc 'Ý kiến cử tri').",
        },
        { status: 400 }
      );
    }

    const imported = await batchImportFeedbacks(parsedItems);

    return NextResponse.json({
      success: true,
      message: `Đã nạp và lưu thành công ${imported.length} hồ sơ ý kiến cử tri vào cơ sở dữ liệu!`,
      count: imported.length,
    });
  } catch (error: any) {
    console.error("Lỗi import Excel:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xử lý file Excel" },
      { status: 500 }
    );
  }
}
