import { NextResponse } from "next/server";
import { getSystemSetting, getFeedbackById } from "@/lib/data-store";
import { VILLAGES, CATEGORIES } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập câu hỏi" },
        { status: 400 }
      );
    }

    const query = message.trim();

    // 1. TỰ ĐỘNG TRA CỨU MÃ HỒ SƠ NẾU CÓ TRONG CÂU HỎI
    const ticketMatch = query.match(/EASUP[-_A-Z0-9]+/i);
    if (ticketMatch) {
      const ticketCode = ticketMatch[0].toUpperCase();
      const feedback = await getFeedbackById(ticketCode);

      if (feedback) {
        let reply = `🔍 **KẾT QUẢ TRA CỨU HỒ SƠ: ${feedback.ticketCode}**\n\n`;
        reply += `• **Người phản ánh**: ${feedback.voterName} (${feedback.village})\n`;
        reply += `• **Lĩnh vực**: ${feedback.category}\n`;
        reply += `• **Ngày gửi**: ${new Date(feedback.createdAt).toLocaleDateString("vi-VN")}\n`;
        reply += `• **Nội dung tóm tắt**: "${feedback.content}"\n`;
        reply += `• **Trạng thái hiện tại**: **${feedback.status.toUpperCase()}**\n\n`;

        if (feedback.status === "Đã trả lời" && feedback.officialResponse) {
          reply += `🏛️ **VĂN BẢN TRẢ LỜI CHÍNH THỨC**:\n`;
          reply += `• **Cơ quan giải quyết**: ${feedback.officialResponse.answeringOrg}\n`;
          reply += `• **Người ký / Thụ lý**: ${feedback.officialResponse.answeredBy}\n`;
          reply += `• **Ngày ban hành**: ${new Date(feedback.officialResponse.answeredAt).toLocaleDateString("vi-VN")}\n`;
          reply += `• **Nội dung trả lời**: *"${feedback.officialResponse.responseContent}"*\n`;
          if (feedback.officialResponse.documentUrl) {
            reply += `• **Văn bản đính kèm**: [Bấm xem văn bản có dấu đỏ](${feedback.officialResponse.documentUrl})\n`;
          }
        } else if (feedback.status === "Đang xử lý") {
          reply += `⏳ Hồ sơ đang được Ban chuyên môn và UBND xã Ea Súp xác minh thực địa để ban hành kết quả trong thời gian sớm nhất.`;
        } else {
          reply += `📥 Hồ sơ đã được Ủy ban MTTQ và HĐND xã tiếp nhận, đang phân công cơ quan có thẩm quyền thụ lý.`;
        }

        return NextResponse.json({
          success: true,
          reply,
          source: "database_lookup",
        });
      }
    }

    // 2. KIỂM TRA CẤU HÌNH API KEY (GEMINI) TỪ ADMIN
    const apiKey = (await getSystemSetting("CHATBOT_API_KEY")) || process.env.GEMINI_API_KEY;
    const model = (await getSystemSetting("CHATBOT_MODEL")) || "gemini-2.5-flash";
    const customPrompt = await getSystemSetting("SYSTEM_PROMPT");

    if (apiKey && apiKey.trim().length > 10) {
      try {
        const systemInstruction =
          customPrompt ||
          `Bạn là Trợ lý Ảo Công Vụ Xã Ea Súp, Tỉnh Đắk Lắk. Hãy hỗ trợ bà con nhân dân và cử tri giải đáp về các quy trình, thủ tục hành chính một cửa, an sinh xã hội, đất đai, chính sách nông nghiệp và hướng dẫn tra cứu tiến độ hồ sơ ý kiến cử tri một cách tận tâm, chu đáo, chuẩn xác và lịch sự theo phong cách hành chính công vụ Việt Nam. Danh sách 20 thôn buôn: ${VILLAGES.join(", ")}. Các lĩnh vực: ${CATEGORIES.join(", ")}. Đường dây nóng xã: 0888.023.023.`;

        // Gọi Google Gemini API trực tiếp
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

        const payload = {
          contents: [
            {
              role: "user",
              parts: [{ text: `Chỉ dẫn hệ thống: ${systemInstruction}\n\nCâu hỏi của cử tri: ${query}` }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        };

        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const replyText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Xin lỗi, trợ lý AI chưa tạo được câu trả lời phù hợp.";

          return NextResponse.json({
            success: true,
            reply: replyText,
            source: "gemini_ai",
          });
        }
      } catch (aiError) {
        console.error("Lỗi gọi Gemini AI:", aiError);
      }
    }

    // 3. BỘ TRI THỨC ĐỊA PHƯƠNG TÍCH HỢP (OFFLINE LOCAL KNOWLEDGE BASE FALLBACK)
    const lower = query.toLowerCase();
    let reply = "";

    if (lower.includes("đất") || lower.includes("sổ đỏ") || lower.includes("sổ hồng") || lower.includes("tách thửa")) {
      reply = `📋 **HƯỚNG DẪN THỦ TỤC ĐẤT ĐAI TẠI XÃ EA SÚP**:\n\n` +
        `1. **Địa điểm tiếp nhận**: Bộ phận Tiếp nhận & Trả kết quả Xã Ea Súp.\n` +
        `2. **Thành phần hồ sơ cấp đổi/cấp mới**: Đơn đăng ký theo Mẫu 04a/ĐK, Giấy tờ nguồn gốc đất (giấy giao khoán/khai hoang), Bản trích đo địa chính và CCCD gắn chip.\n` +
        `3. **Thời gian giải quyết**: Từ 15 - 30 ngày làm việc theo quy định.\n` +
        `• Bạn có thể gửi phản ánh trực tuyến trên cổng này hoặc liên hệ đường dây nóng: **0888.023.023**.`;
    } else if (lower.includes("thôn") || lower.includes("buôn") || lower.includes("địa bàn")) {
      reply = `📍 **DANH SÁCH 20 THÔN, BUÔN THUỘC XÃ EA SÚP**:\n\n` +
        `• **Các Buôn**: Buôn A, Buôn B, Buôn C.\n` +
        `• **Các Thôn**: Thôn 1, Thôn 2, Thôn 3, Thôn 4, Thôn 5, Thôn 6, Thôn 7, Thôn 8, Thôn 9, Thôn 10, Thôn 11, Thôn 12, Thôn 13, Thôn 14, Thôn Thành Công, Thôn Đoàn Kết.\n\n` +
        `Ủy ban MTTQ Việt Nam Xã Ea Súp luôn đồng hành, lắng nghe ý kiến của bà con tại mọi thôn buôn.`;
    } else if (lower.includes("gửi ý kiến") || lower.includes("phản ánh") || lower.includes("kiến nghị") || lower.includes("hướng dẫn")) {
      reply = `📝 **CÁCH GỬI Ý KIẾN PHẢN ÁNH CỦA CỬ TRI**:\n\n` +
        `1. Bấm nút màu vàng **"Gửi ý kiến mới"** ở góc trên trang chủ.\n` +
        `2. Điền thông tin: Chọn Thôn/buôn của bạn, lĩnh vực và nội dung cụ thể.\n` +
        `3. Có thể chọn *Cử tri ẩn danh* nếu không muốn công khai họ tên.\n` +
        `4. Bấm gửi để nhận ngay **Mã hồ sơ tra cứu** (dạng \`EASUP-PA-XXXXXX\`).`;
    } else if (lower.includes("liên hệ") || lower.includes("hotline") || lower.includes("số điện thoại") || lower.includes("địa chỉ")) {
      reply = `📞 **THÔNG TIN LIÊN HỆ CÔNG VỤ XÃ EA SÚP**:\n\n` +
        `• **Cơ quan**: Ban Thường trực Ủy ban MTTQ Việt Nam Xã Ea Súp.\n` +
        `• **Địa chỉ**: Trụ sở UB MTTQ Việt Nam xã Ea Súp\n` +
        `• **Điện thoại đường dây nóng**: **0888.023.023**\n` +
        `• **Hòm thư điện tử**: \`Easupsohoa@gmail.com\`\n` +
        `• **Thời gian làm việc**: Thứ Hai đến Thứ Sáu (Sáng 7h00 - 11h30; Chiều 13h30 - 17h00).`;
    } else {
      reply = `Chào Cử tri Xã Ea Súp! Tôi là **Trợ lý Công Vụ AI Xã Ea Súp**.\n\n` +
        `Tôi có thể hỗ trợ bạn:\n` +
        `• **Tra cứu hồ sơ**: Gõ trực tiếp mã hồ sơ (Ví dụ: \`EASUP-PA-892415\`).\n` +
        `• **Hướng dẫn thủ tục**: Đất đai, cấp giấy khai sinh, đăng ký kết hôn, chứng thực, hộ khẩu, chế độ người nghèo...\n` +
        `• **Thông tin chính quyền**: 20 thôn buôn, đường dây nóng hỗ trợ: **0888.023.023**.\n\n` +
        `*(Gợi ý: Quản trị viên có thể nhập Google Gemini API Key trong trang Admin để kích hoạt trí tuệ nhân tạo thế hệ mới).*`;
    }

    return NextResponse.json({
      success: true,
      reply,
      source: "local_knowledge_base",
    });
  } catch (error: any) {
    console.error("Lỗi chatbot:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi hệ thống trợ lý chatbot" },
      { status: 500 }
    );
  }
}
