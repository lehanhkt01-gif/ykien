import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFeedbacksList } from "@/lib/data-store";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { searchParams } = new URL(req.url);
    const isTemplate = searchParams.get("template") === "true" || filename.includes("Mau_Nhap");
    const exportType = searchParams.get("type") || "all";
    const search = searchParams.get("search") || undefined;
    const village = searchParams.get("village") || undefined;
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const session = await getSession();
    if (!isTemplate && !session) {
      return NextResponse.json(
        { success: false, message: "Yêu cầu đăng nhập tài khoản quản trị" },
        { status: 401 }
      );
    }

    let rowsData: any[] = [];
    const actualFileName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;

    const formatExcelDate = (d: any) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date.getTime())) return "";
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    if (isTemplate) {
      rowsData = [
        {
          "STT": 1,
          "Mã hồ sơ": "EASUP-PA-892415",
          "Họ và tên": "Trần Văn Nam",
          "Số điện thoại": "0912345678",
          "Thôn/Buôn": "Buôn A",
          "Lĩnh vực": "Đường giao thông nông thôn, kênh mương thủy lợi",
          "Nội dung ý kiến": "Đoạn đường liên thôn qua Buôn A xuất hiện nhiều ổ gà nguy hiểm sau đợt mưa lớn.",
          "Trạng thái": "Đã tiếp nhận",
          "Ngày tiếp nhận": "20/08/2026",
          "Cơ quan trả lời": "Ủy ban Nhân dân xã Ea Súp",
          "Nội dung trả lời": "",
          "Ngày trả lời": "",
          "Người ký": "",
          "Văn bản đính kèm": "",
          "Rất hài lòng": 0,
          "Hài lòng": 0,
          "Chưa hài lòng": 0,
        },
        {
          "STT": 2,
          "Mã hồ sơ": "",
          "Họ và tên": "Nguyễn Thị Hoa",
          "Số điện thoại": "0987654321",
          "Thôn/Buôn": "Thôn Thành Công",
          "Lĩnh vực": "Vệ sinh môi trường, nguồn nước & rác thải sinh hoạt",
          "Nội dung ý kiến": "Kiến nghị tăng cường xe thu gom rác thải sinh hoạt tại khu vực ngã ba Thôn Thành Công.",
          "Trạng thái": "Đã trả lời",
          "Ngày tiếp nhận": "22/08/2026",
          "Cơ quan trả lời": "Ban Địa chính - Nông nghiệp - Xây dựng & Môi trường",
          "Nội dung trả lời": "Đã yêu cầu đơn vị thu gom điều chỉnh lịch thu gom rác lên 3 chuyến/tuần.",
          "Ngày trả lời": "24/08/2026",
          "Người ký": "Trưởng Ban Địa chính - Môi trường",
          "Văn bản đính kèm": "",
          "Rất hài lòng": 4,
          "Hài lòng": 1,
          "Chưa hài lòng": 0,
        },
      ];
    } else {
      const queryParams: any = {
        page: 1,
        limit: 10000,
      };

      if (exportType === "filtered") {
        if (search) queryParams.search = search;
        if (village && village !== "Tất cả") queryParams.village = village;
        if (category && category !== "Tất cả") queryParams.category = category;
        if (status && status !== "Tất cả") queryParams.status = status;
        if (fromDate) queryParams.fromDate = fromDate;
        if (toDate) queryParams.toDate = toDate;
      }

      const result = await getFeedbacksList(queryParams);
      const items = result.items || [];

      rowsData = items.map((item: any, idx: number) => ({
        "STT": idx + 1,
        "Mã hồ sơ": item.ticketCode || "",
        "Họ và tên": item.voterName || "Cử tri Ea Súp",
        "Số điện thoại": item.phone || "",
        "Thôn/Buôn": item.village || "",
        "Lĩnh vực": item.category || "",
        "Nội dung ý kiến": item.content || "",
        "Trạng thái": item.status || "Đã tiếp nhận",
        "Ngày tiếp nhận": formatExcelDate(item.createdAt),
        "Cơ quan trả lời": item.officialResponse?.answeringOrg || "",
        "Nội dung trả lời": item.officialResponse?.responseContent || "",
        "Ngày trả lời": formatExcelDate(item.officialResponse?.answeredAt),
        "Người ký": item.officialResponse?.answeredBy || "",
        "Văn bản đính kèm": item.officialResponse?.documentUrl || "",
        "Rất hài lòng": Number(item.ratingVerySatisfied) || 0,
        "Hài lòng": Number(item.ratingSatisfied) || 0,
        "Chưa hài lòng": Number(item.ratingUnsatisfied) || 0,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rowsData);
    ws["!cols"] = [
      { wch: 6 },  // STT
      { wch: 18 }, // Mã hồ sơ
      { wch: 22 }, // Họ và tên
      { wch: 15 }, // Số điện thoại
      { wch: 18 }, // Thôn/Buôn
      { wch: 35 }, // Lĩnh vực
      { wch: 50 }, // Nội dung ý kiến
      { wch: 16 }, // Trạng thái
      { wch: 16 }, // Ngày tiếp nhận
      { wch: 32 }, // Cơ quan trả lời
      { wch: 50 }, // Nội dung trả lời
      { wch: 16 }, // Ngày trả lời
      { wch: 22 }, // Người ký
      { wch: 25 }, // Văn bản đính kèm
      { wch: 14 }, // Rất hài lòng
      { wch: 14 }, // Hài lòng
      { wch: 14 }, // Chưa hài lòng
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Y_Kien");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${actualFileName}"; filename*=UTF-8''${encodeURIComponent(actualFileName)}`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Lỗi xuất file Excel:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi tạo file Excel" },
      { status: 500 }
    );
  }
}
