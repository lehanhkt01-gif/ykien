"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles, RefreshCw, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Tra cứu hồ sơ: EASUP-PA-892415",
  "Thủ tục làm sổ đỏ đất đai tại xã",
  "Cách gửi ý kiến phản ánh mới",
  "Danh sách 20 thôn buôn Xã Ea Súp",
  "Số điện thoại đường dây nóng",
];

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Xin chào bà con cử tri! Tôi là **Trợ lý Công Vụ AI Xã Ea Súp** 🤖.\n\nTôi có thể giúp bạn tra cứu tiến độ giải quyết hồ sơ ý kiến cử tri, hướng dẫn thủ tục hành chính hoặc thông tin liên hệ công vụ tại 20 thôn buôn.",
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      const botReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: data.reply || "Xin lỗi, hiện tại tôi chưa tìm thấy câu trả lời phù hợp.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (error) {
      const errorReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "Hệ thống đang tạm thời bận. Vui lòng thử lại sau hoặc liên hệ Hotline UBND xã: **0262.3688.115**.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Nút bấm Chatbot nổi góc dưới phải */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white px-4 py-3 rounded-full shadow-2xl transition duration-200 transform hover:scale-105 cursor-pointer border-2 border-amber-400 group"
          title="Mở Trợ lý Ảo Công Vụ Xã Ea Súp"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-amber-300" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-tight pr-1">
            Hỏi đáp Trợ lý AI
          </span>
        </button>
      )}

      {/* Cửa sổ Chatbot */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[92vw] sm:w-[400px] h-[540px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col animate-fade-in">
          {/* Header Chatbot */}
          <div className="bg-gradient-to-r from-red-800 to-red-700 text-white px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-300 flex items-center justify-center">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm uppercase tracking-tight flex items-center gap-1.5">
                  Trợ lý Công Vụ Xã Ea Súp
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h4>
                <p className="text-[10px] text-red-200">
                  Hỗ trợ tra cứu hồ sơ & giải đáp thủ tục 24/7
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-red-200 hover:text-white p-1 rounded-lg hover:bg-red-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Khung tin nhắn */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-red-700 text-amber-300 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-red-700 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-none"
                  }`}
                >
                  <div className="whitespace-pre-line break-words">{msg.text}</div>
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.sender === "user" ? "text-red-200" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
                {msg.sender === "user" && (
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center flex-shrink-0 text-[10px]">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-slate-500 text-xs italic">
                <div className="w-6 h-6 rounded-full bg-red-700 text-amber-300 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                </div>
                <span>Trợ lý đang tra cứu và soạn câu trả lời...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh */}
          <div className="px-3 py-2 bg-white border-t border-slate-200 overflow-x-auto flex gap-1.5 scrollbar-none">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-700 text-[10px] font-medium text-slate-700 border border-slate-200 transition cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Ô nhập câu hỏi */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi hoặc mã hồ sơ..."
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-red-700 hover:bg-red-800 text-white rounded-xl disabled:opacity-40 transition cursor-pointer shadow-xs"
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
