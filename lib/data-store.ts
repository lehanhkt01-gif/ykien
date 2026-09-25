import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { initialFeedbacks } from "../prisma/seed-data";
import fs from "fs";
import path from "path";

export interface OfficialResponseType {
  id: number;
  feedbackId: number;
  answeringOrg: string;
  responseContent: string;
  documentUrl?: string | null;
  answeredAt: Date | string;
  answeredBy: string;
}

export interface AttachmentType {
  name: string;
  url: string;
  size: number;
  type: string;
  ext?: string;
}

export interface VoterFeedbackType {
  id: number;
  ticketCode: string;
  voterName: string;
  phone?: string | null;
  village: string;
  category: string;
  content: string;
  status: string;
  isApproved?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  ratingVerySatisfied?: number;
  ratingSatisfied?: number;
  ratingUnsatisfied?: number;
  attachments?: AttachmentType[] | null;
  officialResponse?: OfficialResponseType | null;
}

export interface FeedbackRatingType {
  id: number;
  feedbackId: number;
  voterPhone: string;
  voterName: string;
  rating: string;
  createdAt: Date | string;
}

export interface UserType {
  id: number | string;
  username?: string;
  passwordHash?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  village?: string | null;
  image?: string | null;
  role: string;
  org?: string | null;
  active?: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// ============================================================
// HỆ THỐNG LƯU TRỮ FILE JSON BỀN VỮNG KHI CHẠY LOCAL
// ============================================================
const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACKS_FILE = path.join(DATA_DIR, "feedbacks.json");
const RATINGS_FILE = path.join(DATA_DIR, "ratings.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.error("Không thể tạo thư mục data:", e);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __easupFeedbacks: VoterFeedbackType[] | undefined;
  // eslint-disable-next-line no-var
  var __easupRatings: FeedbackRatingType[] | undefined;
  // eslint-disable-next-line no-var
  var __easupSettings: Record<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __easupUsers: UserType[] | undefined;
}

const TEST_TICKET_CODES = [
  "EASUP-PA-892415",
  "EASUP-PA-671239",
  "EASUP-PA-452108",
  "EASUP-PA-319874",
  "EASUP-PA-208915",
  "EASUP-PA-110293",
];

export function loadFeedbacksFromDisk(): VoterFeedbackType[] {
  ensureDataDir();
  try {
    if (fs.existsSync(FEEDBACKS_FILE)) {
      const raw = fs.readFileSync(FEEDBACKS_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        // Tự động loại bỏ 6 ý kiến mẫu test nếu còn sót lại
        const cleaned = list.filter(
          (f) => !TEST_TICKET_CODES.includes(f.ticketCode) && ![1, 2, 3, 4, 5, 6].includes(f.id)
        );
        if (cleaned.length !== list.length) {
          try {
            fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(cleaned, null, 2), "utf-8");
          } catch (e) {}
        }
        return cleaned;
      }
    }
  } catch (err) {
    console.error("Lỗi đọc file feedbacks.json:", err);
  }

  // Khởi tạo từ danh sách mẫu ban đầu
  const seeded: VoterFeedbackType[] = initialFeedbacks.map((f, index) => ({
    id: index + 1,
    ticketCode: f.ticketCode,
    voterName: f.voterName,
    phone: f.phone,
    village: f.village,
    category: f.category,
    content: f.content,
    status: f.status,
    isApproved: true,
    createdAt: f.createdAt,
    updatedAt: f.createdAt,
    ratingVerySatisfied: f.ratingVerySatisfied || 0,
    ratingSatisfied: f.ratingSatisfied || 0,
    ratingUnsatisfied: f.ratingUnsatisfied || 0,
    officialResponse: f.response
      ? {
          id: index + 1,
          feedbackId: index + 1,
          answeringOrg: f.response.answeringOrg,
          responseContent: f.response.responseContent,
          documentUrl: f.response.documentUrl,
          answeredAt: f.response.answeredAt,
          answeredBy: f.response.answeredBy,
        }
      : null,
    attachments: (f as any).attachments || null,
  }));
  saveFeedbacksToDisk(seeded);
  return seeded;
}

export function saveFeedbacksToDisk(feedbacks: VoterFeedbackType[]) {
  ensureDataDir();
  try {
    globalThis.__easupFeedbacks = feedbacks;
    fs.writeFileSync(FEEDBACKS_FILE, JSON.stringify(feedbacks, null, 2), "utf-8");
  } catch (err) {
    console.error("Lỗi ghi file feedbacks.json:", err);
  }
}

export function getMemoryFeedbacks(): VoterFeedbackType[] {
  // Luôn đọc từ file để đảm bảo dữ liệu mới nhất đồng bộ tức thì
  try {
    if (fs.existsSync(FEEDBACKS_FILE)) {
      const raw = fs.readFileSync(FEEDBACKS_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        // Chuẩn hóa: Chỉ có ý kiến cử tri tự gửi (status === 'Chờ duyệt' hoặc isApproved === false) mới cần duyệt.
        // Hồ sơ do cán bộ nhập (Excel, thêm trực tiếp) hoặc dữ liệu cũ thì isApproved = true (không cần duyệt).
        const normalized: VoterFeedbackType[] = list.map((item: any) => {
          const isPending = item.status === "Chờ duyệt" || item.isApproved === false;
          return {
            ...item,
            status: item.status || "Đã tiếp nhận",
            isApproved: isPending ? false : true,
          };
        });
        globalThis.__easupFeedbacks = normalized;
        return globalThis.__easupFeedbacks;
      }
    }
  } catch (err) {}
  if (!globalThis.__easupFeedbacks || !Array.isArray(globalThis.__easupFeedbacks)) {
    globalThis.__easupFeedbacks = loadFeedbacksFromDisk();
  }
  return globalThis.__easupFeedbacks;
}

function loadRatingsFromDisk(): FeedbackRatingType[] {
  ensureDataDir();
  try {
    if (fs.existsSync(RATINGS_FILE)) {
      const raw = fs.readFileSync(RATINGS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {}
  return [];
}

function saveRatingsToDisk(ratings: FeedbackRatingType[]) {
  ensureDataDir();
  try {
    globalThis.__easupRatings = ratings;
    fs.writeFileSync(RATINGS_FILE, JSON.stringify(ratings, null, 2), "utf-8");
  } catch (err) {}
}

function getMemoryRatings(): FeedbackRatingType[] {
  if (!globalThis.__easupRatings) {
    globalThis.__easupRatings = loadRatingsFromDisk();
  }
  return globalThis.__easupRatings;
}

function loadSettingsFromDisk(): Record<string, string> {
  ensureDataDir();
  const defaultSettings: Record<string, string> = {
    CHATBOT_MODEL: "gemini-2.5-flash",
    SYSTEM_PROMPT: "Bạn là Trợ lý Ảo Công Vụ Xã Ea Súp, Tỉnh Đắk Lắk. Hãy hỗ trợ bà con nhân dân và cử tri giải đáp về các quy trình, thủ tục hành chính một cửa, an sinh xã hội, đất đai, chính sách nông nghiệp và hướng dẫn tra cứu tiến độ hồ sơ ý kiến cử tri một cách tận tâm, chu đáo, chuẩn xác và lịch sự theo phong cách hành chính công vụ Việt Nam.",
  };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (err) {}
  return defaultSettings;
}

function saveSettingsToDisk(settings: Record<string, string>) {
  ensureDataDir();
  try {
    globalThis.__easupSettings = settings;
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {}
}

function getMemorySettings(): Record<string, string> {
  if (!globalThis.__easupSettings) {
    globalThis.__easupSettings = loadSettingsFromDisk();
  }
  return globalThis.__easupSettings;
}

export const DEFAULT_OFFICER_ACCOUNTS = [
  {
    id: 101,
    username: "mttq",
    fullName: "Cán bộ Ban Thường trực MTTQ Xã Ea Súp",
    org: "Ban Thường trực Ủy ban MTTQ Việt Nam Xã Ea Súp",
  },
  {
    id: 102,
    username: "ubnd",
    fullName: "Cán bộ Ủy ban Nhân dân Xã Ea Súp",
    org: "Ủy ban Nhân dân xã Ea Súp",
  },
  {
    id: 103,
    username: "hdnd",
    fullName: "Cán bộ Thường trực Hội đồng Nhân dân Xã Ea Súp",
    org: "Thường trực Hội đồng Nhân dân xã Ea Súp",
  },
  {
    id: 104,
    username: "danguy",
    fullName: "Cán bộ Đảng ủy Xã Ea Súp",
    org: "Đảng ủy xã Ea Súp",
  },
  {
    id: 105,
    username: "congan",
    fullName: "Cán bộ Ban Chỉ huy Công an Xã Ea Súp",
    org: "Ban Chỉ huy Công an xã Ea Súp",
  },
  {
    id: 106,
    username: "yte",
    fullName: "Cán bộ Trạm Y tế Xã Ea Súp",
    org: "Trạm Y tế xã Ea Súp",
  },
  {
    id: 107,
    username: "quansu",
    fullName: "Cán bộ Ban Chỉ huy Quân sự Xã Ea Súp",
    org: "Ban Chỉ huy Quân sự xã Ea Súp",
  },
];

function loadUsersFromDisk(): UserType[] {
  ensureDataDir();
  const officerDefaultPass = process.env.OFFICER_DEFAULT_PASSWORD || "12345678@";
  const adminUsername = process.env.ADMIN_USERNAME || "lehanhkt01";
  let adminPass = process.env.ADMIN_PASSWORD || "Hh@$123456";
  if (adminPass === "Hh@") adminPass = "Hh@$123456";

  let list: UserType[] = [];
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    }
  } catch (err) {}

  // 1. Dọn dẹp tài khoản admin cũ (admin, lehanh) nếu có, đảm bảo duy nhất 1 tài khoản ADMIN lehanhkt01
  list = list.filter((u) => {
    if (u.username === "admin" || u.username === "lehanh") return false;
    return true;
  });

  // 2. Đảm bảo duy nhất 1 tài khoản ADMIN toàn quyền lehanhkt01
  const adminHash = bcrypt.hashSync(adminPass, 10);
  const adminIdx = list.findIndex(
    (u) => u.username?.toLowerCase() === adminUsername.toLowerCase() || u.role === "ADMIN"
  );
  if (adminIdx >= 0) {
    list[adminIdx].username = adminUsername;
    list[adminIdx].passwordHash = adminHash;
    list[adminIdx].fullName = "Quản Trị Viên Toàn Quyền Xã Ea Súp";
    list[adminIdx].role = "ADMIN";
    list[adminIdx].active = true;
  } else {
    list.unshift({
      id: 1,
      username: adminUsername,
      passwordHash: adminHash,
      fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
      role: "ADMIN",
      active: true,
      createdAt: new Date(),
    });
  }

  // 3. Khởi tạo 7 tài khoản cán bộ công vụ mặc định nếu chưa tồn tại
  const officerHash = bcrypt.hashSync(officerDefaultPass, 10);
  for (const officer of DEFAULT_OFFICER_ACCOUNTS) {
    const existing = list.find(
      (u) => u.id === officer.id || u.username?.toLowerCase() === officer.username.toLowerCase()
    );
    if (!existing) {
      list.push({
        id: officer.id,
        username: officer.username,
        passwordHash: officerHash,
        fullName: officer.fullName,
        org: officer.org,
        role: "OFFICER",
        active: true,
        createdAt: new Date(),
      });
    } else {
      if (!existing.org) existing.org = officer.org;
      if (!existing.fullName) existing.fullName = officer.fullName;
      existing.role = "OFFICER";
      existing.active = existing.active ?? true;
    }
  }

  saveUsersToDisk(list);
  return list;
}

function saveUsersToDisk(users: UserType[]) {
  ensureDataDir();
  try {
    globalThis.__easupUsers = users;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {}
}

function getMemoryUsers(): UserType[] {
  if (!globalThis.__easupUsers) {
    globalThis.__easupUsers = loadUsersFromDisk();
  }
  return globalThis.__easupUsers;
}

// Khởi tạo trạng thái DB cache
let isDbAvailable: boolean | null = null;
let lastDbCheckTime = 0;
const DB_CHECK_INTERVAL = 45000;

export async function isDatabaseOnline(): Promise<boolean> {
  const now = Date.now();
  if (isDbAvailable !== null && now - lastDbCheckTime < DB_CHECK_INTERVAL) {
    return isDbAvailable;
  }
  try {
    const testPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB Timeout")), 800)
    );
    await Promise.race([testPromise, timeoutPromise]);
    isDbAvailable = true;
  } catch (e) {
    isDbAvailable = false;
  }
  lastDbCheckTime = Date.now();
  return isDbAvailable;
}

export async function getFeedbacksList(params: {
  page?: number;
  limit?: number;
  search?: string;
  village?: string;
  category?: string;
  status?: string;
  fromDate?: string | Date;
  toDate?: string | Date;
  isAdmin?: boolean;
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Number(params.limit) || 10);
  const skip = (page - 1) * limit;

  // Fallback sang persistent file store
  const feedbacks = getMemoryFeedbacks();
  let filtered = [...feedbacks];

  // Nếu KHÔNG phải Admin: Lọc chỉ lấy các hồ sơ đã duyệt (isApproved !== false && status !== "Chờ duyệt")
  if (!params.isAdmin) {
    filtered = filtered.filter((f) => f.isApproved !== false && f.status !== "Chờ duyệt");
  }

  if (params.search) {
    const s = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (f) =>
        f.ticketCode.toLowerCase().includes(s) ||
        f.voterName.toLowerCase().includes(s) ||
        f.content.toLowerCase().includes(s) ||
        (f.phone && f.phone.includes(s))
    );
  }

  if (params.village && params.village !== "Tất cả") {
    filtered = filtered.filter((f) => f.village === params.village);
  }

  if (params.category && params.category !== "Tất cả") {
    filtered = filtered.filter((f) => f.category === params.category);
  }

  if (params.status && params.status !== "Tất cả") {
    if (
      params.status === "Chờ duyệt" ||
      params.status === "Chưa duyệt" ||
      params.status === "Đợi duyệt"
    ) {
      filtered = filtered.filter(
        (f) => f.status === "Chờ duyệt" || f.status === "Chưa duyệt" || f.isApproved === false
      );
    } else if (
      params.status === "Đang xử lý" ||
      params.status === "Đang xác minh, xử lý"
    ) {
      // Toàn bộ ý kiến đang xác minh, xử lý (đã duyệt và chưa có văn bản trả lời)
      filtered = filtered.filter(
        (f) =>
          f.isApproved !== false &&
          f.status !== "Chờ duyệt" &&
          f.status !== "Đã trả lời" &&
          !f.officialResponse
      );
    } else if (params.status === "Đã trả lời") {
      filtered = filtered.filter((f) => f.status === "Đã trả lời" || Boolean(f.officialResponse));
    } else {
      filtered = filtered.filter((f) => f.status === params.status && f.isApproved !== false);
    }
  }

  if (params.fromDate) {
    const fromTime = new Date(params.fromDate).getTime();
    filtered = filtered.filter((f) => new Date(f.createdAt).getTime() >= fromTime);
  }
  if (params.toDate) {
    const to = new Date(params.toDate);
    to.setHours(23, 59, 59, 999);
    const toTime = to.getTime();
    filtered = filtered.filter((f) => new Date(f.createdAt).getTime() <= toTime);
  }

  // Sắp xếp:
  // Nếu là Admin: ưu tiên hồ sơ CHƯA DUYỆT (isApproved === false hoặc status === "Chờ duyệt") lên ĐẦU TIÊN
  if (params.isAdmin) {
    filtered.sort((a, b) => {
      const aPending = a.isApproved === false || a.status === "Chờ duyệt";
      const bPending = b.isApproved === false || b.status === "Chờ duyệt";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = filtered.length;
  const items = filtered.slice(skip, skip + limit);

  return { total, page, limit, totalPages: Math.ceil(total / limit), items };
}

export async function createFeedback(data: {
  voterName?: string;
  phone?: string | null;
  village: string;
  category: string;
  content: string;
  isAnonymous?: boolean;
  ticketCode?: string;
  status?: string;
  isApproved?: boolean;
  createdAt?: Date | string;
  ratingVerySatisfied?: number;
  ratingSatisfied?: number;
  ratingUnsatisfied?: number;
  attachments?: AttachmentType[] | null;
}) {
  const randomCode = Math.floor(100000 + Math.random() * 900000);
  const ticketCode = data.ticketCode?.trim() || `EASUP-PA-${randomCode}`;
  const voterName = data.isAnonymous
    ? "Cử tri ẩn danh"
    : data.voterName?.trim() || "Cử tri ẩn danh";
  const status = data.status?.trim() || "Đã tiếp nhận";
  const isApproved = data.isApproved !== undefined ? data.isApproved : (status !== "Chờ duyệt");
  const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();

  // Fallback in-memory & file JSON store
  const feedbacks = getMemoryFeedbacks();
  const existingIdx = feedbacks.findIndex((f) => f.ticketCode === ticketCode);
  if (existingIdx >= 0) {
    feedbacks[existingIdx] = {
      ...feedbacks[existingIdx],
      voterName,
      phone: data.phone?.trim() || null,
      village: data.village,
      category: data.category,
      content: data.content.trim(),
      status,
      isApproved,
      ratingVerySatisfied: data.ratingVerySatisfied !== undefined ? data.ratingVerySatisfied : feedbacks[existingIdx].ratingVerySatisfied,
      ratingSatisfied: data.ratingSatisfied !== undefined ? data.ratingSatisfied : feedbacks[existingIdx].ratingSatisfied,
      ratingUnsatisfied: data.ratingUnsatisfied !== undefined ? data.ratingUnsatisfied : feedbacks[existingIdx].ratingUnsatisfied,
      attachments: data.attachments !== undefined ? data.attachments : feedbacks[existingIdx].attachments,
      updatedAt: new Date(),
    };
    saveFeedbacksToDisk(feedbacks);
    return feedbacks[existingIdx];
  }

  const maxId = feedbacks.reduce((max, f) => Math.max(max, Number(f.id) || 0), 0);
  const newItem: VoterFeedbackType = {
    id: maxId + 1,
    ticketCode,
    voterName,
    phone: data.phone?.trim() || null,
    village: data.village,
    category: data.category,
    content: data.content.trim(),
    status,
    isApproved,
    createdAt,
    updatedAt: createdAt,
    ratingVerySatisfied: data.ratingVerySatisfied || 0,
    ratingSatisfied: data.ratingSatisfied || 0,
    ratingUnsatisfied: data.ratingUnsatisfied || 0,
    attachments: data.attachments || null,
    officialResponse: null,
  };
  feedbacks.unshift(newItem);
  saveFeedbacksToDisk(feedbacks);
  return newItem;
}

export async function approveFeedback(id: number) {
  const feedbacks = getMemoryFeedbacks();
  const item = feedbacks.find((f) => f.id === id);
  if (!item) throw new Error("Không tìm thấy hồ sơ ý kiến");

  item.isApproved = true;
  if (item.status === "Chờ duyệt" || !item.status) {
    item.status = "Đã tiếp nhận";
  }
  item.updatedAt = new Date();

  saveFeedbacksToDisk(feedbacks);

  if (await isDatabaseOnline()) {
    try {
      await prisma.voterFeedback.update({
        where: { id },
        data: { status: item.status },
      });
    } catch (e) {}
  }

  return item;
}

export async function getFeedbackById(idOrCode: string | number) {
  const numId = typeof idOrCode === "number" ? idOrCode : Number(idOrCode);
  const code = String(idOrCode);

  if (await isDatabaseOnline()) {
    try {
      const item = await prisma.voterFeedback.findFirst({
        where: isNaN(numId)
          ? { ticketCode: code }
          : { OR: [{ id: numId }, { ticketCode: code }] },
        include: { officialResponse: true },
      });
      if (item) return item;
    } catch (error) {
      // Fallback
    }
  }

  const feedbacks = getMemoryFeedbacks();
  return (
    feedbacks.find(
      (f) => (!isNaN(numId) && f.id === numId) || f.ticketCode === code
    ) || null
  );
}

export async function respondFeedback(data: {
  feedbackId: number;
  answeringOrg: string;
  responseContent: string;
  documentUrl?: string | null;
  answeredBy: string;
  answeredAt?: Date | string;
}) {
  const answeredAt = data.answeredAt ? new Date(data.answeredAt) : new Date();

  if (await isDatabaseOnline()) {
    try {
      const response = await prisma.officialResponse.upsert({
        where: { feedbackId: data.feedbackId },
        create: {
          feedbackId: data.feedbackId,
          answeringOrg: data.answeringOrg,
          responseContent: data.responseContent,
          documentUrl: data.documentUrl || null,
          answeredBy: data.answeredBy,
          answeredAt,
        },
        update: {
          answeringOrg: data.answeringOrg,
          responseContent: data.responseContent,
          documentUrl: data.documentUrl || null,
          answeredBy: data.answeredBy,
          answeredAt,
        },
      });

      await prisma.voterFeedback.update({
        where: { id: data.feedbackId },
        data: { status: "Đã trả lời" },
      });

      return response;
    } catch (error) {
      // Fallback
    }
  }

  // Fallback in-memory & file JSON store
  const feedbacks = getMemoryFeedbacks();
  const feedback = feedbacks.find((f) => f.id === data.feedbackId);
  if (!feedback) throw new Error("Không tìm thấy ý kiến cử tri");

  const resp: OfficialResponseType = {
    id: Math.floor(Math.random() * 10000) + 1,
    feedbackId: data.feedbackId,
    answeringOrg: data.answeringOrg,
    responseContent: data.responseContent,
    documentUrl: data.documentUrl || null,
    answeredAt,
    answeredBy: data.answeredBy,
  };

  feedback.status = "Đã trả lời";
  feedback.isApproved = true;
  feedback.officialResponse = resp;
  saveFeedbacksToDisk(feedbacks);
  return resp;
}

export async function getFeedbackStats(isAdmin: boolean = false) {
  const feedbacks = getMemoryFeedbacks();

  // 1. Tổng ý kiến tiếp nhận: số tổng bao gồm cả ý kiến đợi duyệt
  const total = feedbacks.length;
  // 2. Số ý kiến đợi duyệt (chưa duyệt)
  const pendingApproval = feedbacks.filter(
    (f) => f.isApproved === false || f.status === "Chờ duyệt"
  ).length;
  // 3. Đã có nội dung trả lời công khai
  const answered = feedbacks.filter(
    (f) => f.status === "Đã trả lời" || Boolean(f.officialResponse)
  ).length;
  // 4. Toàn bộ ý kiến đang xác minh, xử lý (đã duyệt và chưa có văn bản trả lời)
  const processing = feedbacks.filter(
    (f) =>
      f.isApproved !== false &&
      f.status !== "Chờ duyệt" &&
      f.status !== "Đã trả lời" &&
      !f.officialResponse
  ).length;
  // Ô thứ 2 biểu thị số ý kiến đợi duyệt
  const received = pendingApproval;
  const resolutionRate =
    total - pendingApproval > 0
      ? Math.round((answered / (total - pendingApproval)) * 100)
      : 0;

  return {
    total,
    pendingApproval,
    received,
    processing,
    answered,
    resolutionRate,
  };
}

export async function findUserByUsername(username: string) {
  const cleanUsername = username.trim().toLowerCase();
  const adminUsername = (process.env.ADMIN_USERNAME || "lehanhkt01").trim().toLowerCase().replace(/^["']|["']$/g, "");
  let adminPass = process.env.ADMIN_PASSWORD || "Hh@$123456";
  adminPass = adminPass.replace(/^["']|["']$/g, "").replace(/\\(?=\$)/g, "");
  if (!adminPass || adminPass === "Hh@") adminPass = "Hh@$123456";

  // 1. Nếu là tài khoản Admin toàn quyền duy nhất
  if (cleanUsername === adminUsername || cleanUsername === "lehanhkt01") {
    const passwordHash = bcrypt.hashSync(adminPass, 10);
    try {
      if (await isDatabaseOnline()) {
        const dbAdmin = await prisma.user.upsert({
          where: { username: "lehanhkt01" },
          update: {
            passwordHash,
            fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
            role: "ADMIN",
            active: true,
          },
          create: {
            username: "lehanhkt01",
            passwordHash,
            fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
            role: "ADMIN",
            active: true,
          },
        });
        if (dbAdmin) return dbAdmin;
      }
    } catch (e) {}

    const users = getMemoryUsers();
    let admin = users.find(
      (u) =>
        u.username?.toLowerCase() === "lehanhkt01" ||
        (adminUsername && u.username?.toLowerCase() === adminUsername)
    );
    if (!admin) {
      admin = {
        id: 1,
        username: "lehanhkt01",
        passwordHash,
        fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
        role: "ADMIN",
        active: true,
        createdAt: new Date(),
      };
      users.unshift(admin);
    } else {
      admin.username = "lehanhkt01";
      admin.passwordHash = passwordHash;
      admin.role = "ADMIN";
      admin.active = true;
    }
    saveUsersToDisk(users);
    return admin;
  }

  // 2. Tìm trong database trước nếu online
  try {
    if (await isDatabaseOnline()) {
      const user = await prisma.user.findUnique({
        where: { username: cleanUsername },
      });
      if (user) return user;
    }
  } catch (error) {}

  // 3. Tìm trong file JSON / Memory đã lưu (hỗ trợ tài khoản đã được Admin đổi tên/mật khẩu)
  const users = getMemoryUsers();
  const matchedUser = users.find((u) => u.username?.toLowerCase() === cleanUsername);
  if (matchedUser) {
    return matchedUser;
  }

  // 4. Nếu chưa có nhưng là 1 trong DEFAULT_OFFICER_ACCOUNTS (fallback khởi tạo ban đầu)
  const defaultOfficer = DEFAULT_OFFICER_ACCOUNTS.find(
    (o) => o.username.toLowerCase() === cleanUsername
  );
  if (defaultOfficer) {
    const officerDefaultPass = process.env.OFFICER_DEFAULT_PASSWORD || "12345678@";
    const passwordHash = bcrypt.hashSync(officerDefaultPass, 10);
    const newOfficer: UserType = {
      id: defaultOfficer.id,
      username: defaultOfficer.username,
      passwordHash,
      fullName: defaultOfficer.fullName,
      org: defaultOfficer.org,
      role: "OFFICER",
      active: true,
      createdAt: new Date(),
    };
    users.push(newOfficer);
    saveUsersToDisk(users);
    return newOfficer;
  }

  return null;
}

/**
 * Lấy danh sách tài khoản cán bộ công vụ có quyền "Trả lời"
 */
export async function getOfficerAccounts() {
  const users = getMemoryUsers();
  return users
    .filter((u) => u.role === "OFFICER" && u.username)
    .map((u) => ({
      id: u.id,
      username: u.username || "",
      fullName: u.fullName || u.name || "",
      org: u.org || "",
      role: u.role,
      active: u.active ?? true,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
}

/**
 * Cập nhật tài khoản cán bộ: tên đăng nhập và mật khẩu (và họ tên / cơ quan nếu có)
 */
export async function updateOfficerAccount(data: {
  id: number | string;
  username: string;
  password?: string;
  fullName?: string;
  org?: string;
  active?: boolean;
}) {
  const users = getMemoryUsers();
  const cleanNewUsername = data.username.trim().toLowerCase();
  const adminUsername = (process.env.ADMIN_USERNAME || "lehanhkt01").toLowerCase();

  if (!cleanNewUsername) {
    throw new Error("Tên đăng nhập không được để trống");
  }

  if (cleanNewUsername === adminUsername || cleanNewUsername === "admin") {
    throw new Error("Tên đăng nhập này trùng với tài khoản Quản trị viên");
  }

  // Kiểm tra trùng username với tài khoản khác
  const duplicate = users.find(
    (u) => String(u.id) !== String(data.id) && u.username?.toLowerCase() === cleanNewUsername
  );
  if (duplicate) {
    throw new Error(`Tên đăng nhập "${cleanNewUsername}" đã được sử dụng bởi cán bộ khác`);
  }

  const target = users.find((u) => String(u.id) === String(data.id));
  if (!target) {
    throw new Error("Không tìm thấy tài khoản cán bộ cần cập nhật");
  }

  const oldUsername = target.username;
  target.username = cleanNewUsername;
  if (data.fullName !== undefined) target.fullName = data.fullName.trim();
  if (data.org !== undefined) target.org = data.org.trim();
  if (data.active !== undefined) target.active = data.active;
  target.updatedAt = new Date();

  let passwordChanged = false;
  if (data.password && data.password.trim().length > 0) {
    if (data.password.trim().length < 6) {
      throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
    }
    target.passwordHash = bcrypt.hashSync(data.password.trim(), 10);
    passwordChanged = true;
  }

  saveUsersToDisk(users);

  // Cập nhật CSDL PostgreSQL nếu online
  try {
    if (await isDatabaseOnline()) {
      if (oldUsername && oldUsername.toLowerCase() !== cleanNewUsername) {
        await prisma.user.deleteMany({ where: { username: oldUsername } });
      }
      await prisma.user.upsert({
        where: { username: cleanNewUsername },
        update: {
          fullName: target.fullName,
          role: "OFFICER",
          active: target.active ?? true,
          ...(passwordChanged ? { passwordHash: target.passwordHash } : {}),
        },
        create: {
          username: cleanNewUsername,
          passwordHash: target.passwordHash || bcrypt.hashSync("12345678@", 10),
          fullName: target.fullName || "Cán bộ công vụ",
          role: "OFFICER",
          active: target.active ?? true,
        },
      });
    }
  } catch (dbErr) {
    console.error("Lỗi đồng bộ officer sang DB:", dbErr);
  }

  return {
    id: target.id,
    username: target.username,
    fullName: target.fullName,
    org: target.org,
    role: target.role,
    active: target.active,
    updatedAt: target.updatedAt,
  };
}

/**
 * Tạo mới tài khoản cán bộ công vụ
 */
export async function createOfficerAccount(data: {
  username: string;
  password?: string;
  fullName: string;
  org: string;
}) {
  const users = getMemoryUsers();
  const cleanUsername = data.username.trim().toLowerCase();
  const adminUsername = (process.env.ADMIN_USERNAME || "lehanhkt01").toLowerCase();

  if (!cleanUsername) throw new Error("Tên đăng nhập không được để trống");
  if (cleanUsername === adminUsername || cleanUsername === "admin") {
    throw new Error("Tên đăng nhập này trùng với tài khoản Quản trị viên");
  }

  const duplicate = users.find((u) => u.username?.toLowerCase() === cleanUsername);
  if (duplicate) {
    throw new Error(`Tên đăng nhập "${cleanUsername}" đã tồn tại`);
  }

  const pass = data.password?.trim() || process.env.OFFICER_DEFAULT_PASSWORD || "12345678@";
  if (pass.length < 6) {
    throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
  }

  const maxId = users.reduce((m, u) => Math.max(m, Number(u.id) || 0), 100);
  const newOfficer: UserType = {
    id: maxId + 1,
    username: cleanUsername,
    passwordHash: bcrypt.hashSync(pass, 10),
    fullName: data.fullName.trim() || `Cán bộ ${data.org.trim()}`,
    org: data.org.trim(),
    role: "OFFICER",
    active: true,
    createdAt: new Date(),
  };

  users.push(newOfficer);
  saveUsersToDisk(users);

  try {
    if (await isDatabaseOnline()) {
      await prisma.user.create({
        data: {
          username: cleanUsername,
          passwordHash: newOfficer.passwordHash!,
          fullName: newOfficer.fullName!,
          role: "OFFICER",
          active: true,
        },
      });
    }
  } catch (e) {}

  return {
    id: newOfficer.id,
    username: newOfficer.username,
    fullName: newOfficer.fullName,
    org: newOfficer.org,
    role: newOfficer.role,
    active: newOfficer.active,
    createdAt: newOfficer.createdAt,
  };
}

export async function rateFeedback(data: {
  feedbackId: number;
  voterPhone: string;
  voterName: string;
  rating: "Rất hài lòng" | "Hài lòng" | "Chưa hài lòng";
}) {
  const { feedbackId, voterPhone, voterName, rating } = data;

  try {
    if (await isDatabaseOnline()) {
      const existing = await prisma.feedbackRating.findUnique({
        where: {
          feedbackId_voterPhone: {
            feedbackId,
            voterPhone,
          },
        },
      });

      const prevRating = existing?.rating;

      await prisma.feedbackRating.upsert({
        where: {
          feedbackId_voterPhone: {
            feedbackId,
            voterPhone,
          },
        },
        create: {
          feedbackId,
          voterPhone,
          voterName,
          rating,
        },
        update: {
          rating,
          voterName,
        },
      });

      const feedback = await prisma.voterFeedback.findUnique({ where: { id: feedbackId } });
      if (feedback) {
        let very = feedback.ratingVerySatisfied;
        let sat = feedback.ratingSatisfied;
        let unsat = feedback.ratingUnsatisfied;

        if (prevRating === "Rất hài lòng") very = Math.max(0, very - 1);
        if (prevRating === "Hài lòng") sat = Math.max(0, sat - 1);
        if (prevRating === "Chưa hài lòng") unsat = Math.max(0, unsat - 1);

        if (rating === "Rất hài lòng") very += 1;
        if (rating === "Hài lòng") sat += 1;
        if (rating === "Chưa hài lòng") unsat += 1;

        const updated = await prisma.voterFeedback.update({
          where: { id: feedbackId },
          data: {
            ratingVerySatisfied: very,
            ratingSatisfied: sat,
            ratingUnsatisfied: unsat,
          },
        });

        return {
          success: true,
          ratingVerySatisfied: updated.ratingVerySatisfied,
          ratingSatisfied: updated.ratingSatisfied,
          ratingUnsatisfied: updated.ratingUnsatisfied,
          userRating: rating,
        };
      }
    }
  } catch (error) {
    // Fallback
  }

  // Fallback in-memory & file JSON store
  const feedbacks = getMemoryFeedbacks();
  const ratings = getMemoryRatings();
  const feedback = feedbacks.find((f) => f.id === feedbackId);
  if (!feedback) throw new Error("Không tìm thấy hồ sơ cử tri");

  const existingIndex = ratings.findIndex(
    (r) => r.feedbackId === feedbackId && r.voterPhone === voterPhone
  );

  let prevRating: string | null = null;
  if (existingIndex >= 0) {
    prevRating = ratings[existingIndex].rating;
    ratings[existingIndex].rating = rating;
    ratings[existingIndex].voterName = voterName;
  } else {
    ratings.push({
      id: ratings.length + 1,
      feedbackId,
      voterPhone,
      voterName,
      rating,
      createdAt: new Date(),
    });
  }

  let very = feedback.ratingVerySatisfied || 0;
  let sat = feedback.ratingSatisfied || 0;
  let unsat = feedback.ratingUnsatisfied || 0;

  if (prevRating === "Rất hài lòng") very = Math.max(0, very - 1);
  if (prevRating === "Hài lòng") sat = Math.max(0, sat - 1);
  if (prevRating === "Chưa hài lòng") unsat = Math.max(0, unsat - 1);

  if (rating === "Rất hài lòng") very += 1;
  if (rating === "Hài lòng") sat += 1;
  if (rating === "Chưa hài lòng") unsat += 1;

  feedback.ratingVerySatisfied = very;
  feedback.ratingSatisfied = sat;
  feedback.ratingUnsatisfied = unsat;

  saveFeedbacksToDisk(feedbacks);
  saveRatingsToDisk(ratings);

  return {
    success: true,
    ratingVerySatisfied: very,
    ratingSatisfied: sat,
    ratingUnsatisfied: unsat,
    userRating: rating,
  };
}

export async function getVoterRatings(voterPhone: string): Promise<Record<number, string>> {
  try {
    if (await isDatabaseOnline()) {
      const list = await prisma.feedbackRating.findMany({
        where: { voterPhone },
      });
      const map: Record<number, string> = {};
      for (const r of list) {
        map[r.feedbackId] = r.rating;
      }
      return map;
    }
  } catch (error) {}

  const ratings = getMemoryRatings();
  const map: Record<number, string> = {};
  for (const r of ratings.filter((x) => x.voterPhone === voterPhone)) {
    map[r.feedbackId] = r.rating;
  }
  return map;
}

export async function updateFeedback(
  id: number,
  data: {
    voterName?: string;
    phone?: string | null;
    village?: string;
    category?: string;
    content?: string;
    status?: string;
    isApproved?: boolean;
    attachments?: AttachmentType[] | null;
    answeringOrg?: string;
    responseContent?: string;
    documentUrl?: string | null;
    answeredBy?: string;
  }
) {
  try {
    if (await isDatabaseOnline()) {
      const feedbackUpdate: any = {};
      if (data.voterName) feedbackUpdate.voterName = data.voterName;
      if (data.phone !== undefined) feedbackUpdate.phone = data.phone;
      if (data.village) feedbackUpdate.village = data.village;
      if (data.category) feedbackUpdate.category = data.category;
      if (data.content) feedbackUpdate.content = data.content;
      if (data.status) feedbackUpdate.status = data.status;

      await prisma.voterFeedback.update({
        where: { id },
        data: feedbackUpdate,
        include: { officialResponse: true },
      });

      if (data.responseContent) {
        await prisma.officialResponse.upsert({
          where: { feedbackId: id },
          create: {
            feedbackId: id,
            answeringOrg: data.answeringOrg || "Ủy ban Nhân dân xã Ea Súp",
            responseContent: data.responseContent,
            documentUrl: data.documentUrl || null,
            answeredBy: data.answeredBy || "Lãnh đạo UBND xã",
          },
          update: {
            answeringOrg: data.answeringOrg || "Ủy ban Nhân dân xã Ea Súp",
            responseContent: data.responseContent,
            documentUrl: data.documentUrl || null,
            answeredBy: data.answeredBy || "Lãnh đạo UBND xã",
            answeredAt: new Date(),
          },
        });
      }

      return await prisma.voterFeedback.findUnique({
        where: { id },
        include: { officialResponse: true },
      });
    }
  } catch (error) {
    // Fallback
  }

  const feedbacks = getMemoryFeedbacks();
  const item = feedbacks.find((f) => f.id === id);
  if (!item) throw new Error("Không tìm thấy hồ sơ");
  if (data.voterName) item.voterName = data.voterName;
  if (data.phone !== undefined) item.phone = data.phone;
  if (data.village) item.village = data.village;
  if (data.category) item.category = data.category;
  if (data.content) item.content = data.content;
  if (data.status) item.status = data.status;
  if (data.isApproved !== undefined) item.isApproved = data.isApproved;
  if (data.attachments !== undefined) item.attachments = data.attachments;

  if (data.responseContent) {
    item.officialResponse = {
      id: item.officialResponse?.id || Math.floor(Math.random() * 10000) + 1,
      feedbackId: id,
      answeringOrg: data.answeringOrg || "Ủy ban Nhân dân xã Ea Súp",
      responseContent: data.responseContent,
      documentUrl: data.documentUrl || null,
      answeredBy: data.answeredBy || "Lãnh đạo UBND xã",
      answeredAt: new Date(),
    };
    item.status = "Đã trả lời";
    item.isApproved = true;
  }

  saveFeedbacksToDisk(feedbacks);
  return item;
}

export async function deleteFeedback(id: number) {
  try {
    if (await isDatabaseOnline()) {
      await prisma.voterFeedback.delete({ where: { id } });
      return true;
    }
  } catch (error) {}

  const feedbacks = getMemoryFeedbacks();
  const idx = feedbacks.findIndex((f) => f.id === id);
  if (idx >= 0) {
    feedbacks.splice(idx, 1);
    saveFeedbacksToDisk(feedbacks);
    return true;
  }
  return false;
}

export async function batchImportFeedbacks(items: any[]) {
  const results = [];
  for (const item of items) {
    const created = await createFeedback({
      ticketCode: item.ticketCode || undefined,
      voterName: item.voterName || "Cử tri Ea Súp",
      phone: item.phone || null,
      village: item.village || "Buôn A",
      category: item.category || "Đường giao thông nông thôn, kênh mương thủy lợi",
      content: item.content || "Nội dung phản ánh tiếp nhận từ cử tri",
      status: item.status || (item.responseContent ? "Đã trả lời" : "Đã tiếp nhận"),
      isApproved: true,
      createdAt: item.createdAt || undefined,
      ratingVerySatisfied: Number(item.ratingVerySatisfied) || 0,
      ratingSatisfied: Number(item.ratingSatisfied) || 0,
      ratingUnsatisfied: Number(item.ratingUnsatisfied) || 0,
      isAnonymous: !item.voterName || item.voterName === "Cử tri ẩn danh",
    });

    if (item.responseContent && (item.status === "Đã trả lời" || item.answeringOrg || String(item.responseContent).trim().length > 0)) {
      try {
        const resp = await respondFeedback({
          feedbackId: created.id,
          answeringOrg: item.answeringOrg || "Ủy ban Nhân dân xã Ea Súp",
          responseContent: item.responseContent,
          documentUrl: item.documentUrl || null,
          answeredBy: item.answeredBy || "Lãnh đạo UBND xã",
          answeredAt: item.answeredAt || undefined,
        });
        created.officialResponse = resp;
        created.status = "Đã trả lời";
      } catch (err) {
        console.error("Lỗi thụ lý trả lời cho bản ghi import:", err);
      }
    }
    results.push(created);
  }

  // Luôn lưu toàn bộ feedbacks xuống file JSON
  saveFeedbacksToDisk(getMemoryFeedbacks());
  return results;
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    if (await isDatabaseOnline()) {
      const setting = await prisma.systemSetting.findUnique({ where: { key } });
      if (setting) return setting.value;
    }
  } catch (error) {}
  const settings = getMemorySettings();
  return settings[key] || null;
}

export async function setSystemSetting(key: string, value: string, description?: string) {
  try {
    if (await isDatabaseOnline()) {
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value, description },
        update: { value, description },
      });
    }
  } catch (error) {}
  const settings = getMemorySettings();
  settings[key] = value;
  saveSettingsToDisk(settings);
}

export async function getAllSettings() {
  const map: Record<string, string> = { ...getMemorySettings() };
  try {
    if (await isDatabaseOnline()) {
      const settings = await prisma.systemSetting.findMany();
      for (const s of settings) {
        map[s.key] = s.value;
      }
    }
  } catch (error) {}
  return map;
}

// ============================================================
// QUẢN LÝ TÀI KHOẢN CỬ TRI ĐĂNG NHẬP (GOOGLE OAUTH & SỐ ĐIỆN THOẠI)
// ============================================================

export interface VoterItemInfo {
  id: string | number;
  name: string;
  email?: string | null;
  phone?: string | null;
  village?: string | null;
  image?: string | null;
  role: string;
  authProvider: "google" | "phone" | "system";
  createdAt: Date | string;
  feedbackCount: number;
  feedbacks: { id: number; ticketCode: string; content: string; status: string; createdAt: Date | string }[];
}

/**
 * Lưu hoặc cập nhật thông tin cử tri vào danh sách users
 */
export async function saveVoterAccount(data: {
  email?: string | null;
  phone?: string | null;
  name?: string;
  image?: string | null;
  village?: string | null;
}) {
  const users = getMemoryUsers();
  const cleanEmail = data.email?.trim().toLowerCase() || null;
  const cleanPhone = data.phone?.trim() || null;
  const cleanName = data.name?.trim() || "Cử tri Ea Súp";

  let idx = -1;
  if (cleanEmail) {
    idx = users.findIndex((u) => u.email && u.email.toLowerCase() === cleanEmail);
  }
  if (idx < 0 && cleanPhone) {
    idx = users.findIndex((u) => u.phone && u.phone === cleanPhone);
  }

  if (idx >= 0) {
    users[idx] = {
      ...users[idx],
      name: cleanName,
      fullName: cleanName,
      phone: cleanPhone || users[idx].phone || null,
      village: data.village || users[idx].village || null,
      image: data.image || users[idx].image || null,
      updatedAt: new Date(),
    };
    saveUsersToDisk(users);
    return users[idx];
  } else {
    const newVoter: UserType = {
      id: `voter_${Date.now()}`,
      name: cleanName,
      fullName: cleanName,
      email: cleanEmail || undefined,
      phone: cleanPhone || null,
      village: data.village || null,
      image: data.image || null,
      role: "USER",
      active: true,
      createdAt: new Date(),
    };
    users.push(newVoter);
    saveUsersToDisk(users);
    return newVoter;
  }
}

/**
 * Lấy danh sách toàn bộ cử tri đã đăng nhập / gửi ý kiến trong hệ thống
 */
export async function getVotersList(query?: string): Promise<VoterItemInfo[]> {
  const users = getMemoryUsers();
  const feedbacks = getMemoryFeedbacks();

  // 1. Lấy danh sách các tài khoản Cử tri (role: "USER" hoặc không phải cán bộ quản trị)
  const voterUsers = users.filter((u) => {
    const r = (u.role || "").toUpperCase();
    return r !== "ADMIN" && r !== "OFFICER" && r !== "CADRE";
  });

  // Bản đồ cử tri từ users
  const mapVoters = new Map<string, VoterItemInfo>();

  for (const u of voterUsers) {
    const key = u.email ? u.email.toLowerCase() : u.phone ? `phone_${u.phone}` : String(u.id);
    mapVoters.set(key, {
      id: u.id,
      name: u.name || u.fullName || "Cử tri ẩn danh",
      email: u.email || null,
      phone: u.phone || null,
      village: u.village || null,
      image: u.image || null,
      role: "Cử tri",
      authProvider: u.email ? "google" : "phone",
      createdAt: u.createdAt || new Date(),
      feedbackCount: 0,
      feedbacks: [],
    });
  }

  // 2. Quét qua toàn bộ phản ánh để thống kê số lượng ý kiến và bổ sung cử tri gửi ý kiến
  for (const f of feedbacks) {
    let matchedKey: string | null = null;
    const phone = f.phone?.trim();

    // Tìm trong map theo phone hoặc tên
    for (const [key, voter] of mapVoters.entries()) {
      if (phone && voter.phone && voter.phone === phone) {
        matchedKey = key;
        break;
      }
      if (!voter.phone && voter.name.toLowerCase() === f.voterName.toLowerCase()) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey && mapVoters.has(matchedKey)) {
      const v = mapVoters.get(matchedKey)!;
      v.feedbackCount += 1;
      if (!v.village && f.village) v.village = f.village;
      v.feedbacks.push({
        id: f.id,
        ticketCode: f.ticketCode,
        content: f.content,
        status: f.status,
        createdAt: f.createdAt,
      });
    } else if (f.voterName && f.voterName !== "Cử tri ẩn danh") {
      // Nếu cử tri chưa có tài khoản trong map nhưng đã gửi ý kiến qua Cổng
      const pseudoKey = phone ? `phone_${phone}` : `voter_name_${f.voterName}`;
      if (!mapVoters.has(pseudoKey)) {
        mapVoters.set(pseudoKey, {
          id: pseudoKey,
          name: f.voterName,
          email: null,
          phone: phone || null,
          village: f.village || null,
          image: null,
          role: "Cử tri",
          authProvider: "phone",
          createdAt: f.createdAt,
          feedbackCount: 1,
          feedbacks: [
            {
              id: f.id,
              ticketCode: f.ticketCode,
              content: f.content,
              status: f.status,
              createdAt: f.createdAt,
            },
          ],
        });
      } else {
        const v = mapVoters.get(pseudoKey)!;
        v.feedbackCount += 1;
        v.feedbacks.push({
          id: f.id,
          ticketCode: f.ticketCode,
          content: f.content,
          status: f.status,
          createdAt: f.createdAt,
        });
      }
    }
  }

  let list = Array.from(mapVoters.values());

  // 3. Lọc theo từ khóa tìm kiếm nếu có
  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q)) ||
        (v.village && v.village.toLowerCase().includes(q))
    );
  }

  // 4. Sắp xếp: Cử tri mới nhất lên đầu
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return list;
}

/**
 * Xóa tài khoản cử tri rác hoặc tài khoản vi phạm
 * @param idOrEmailOrPhone Mã ID hoặc Email hoặc SĐT của cử tri
 * @param deleteFeedbacks Có xóa luôn các ý kiến phản ánh do cử tri này gửi hay không
 */
export async function deleteVoterAccount(
  idOrEmailOrPhone: string | number,
  deleteFeedbacks: boolean = false
): Promise<{ success: boolean; message: string; deletedFeedbacksCount: number }> {
  const users = getMemoryUsers();
  const strId = String(idOrEmailOrPhone).trim().toLowerCase();

  // Tuyệt đối không cho xóa cán bộ quản trị
  const targetUser = users.find((u) => {
    const uId = String(u.id).toLowerCase();
    const uEmail = (u.email || "").toLowerCase();
    const uPhone = (u.phone || "").toLowerCase();
    return uId === strId || uEmail === strId || uPhone === strId;
  });

  if (targetUser) {
    const role = (targetUser.role || "").toUpperCase();
    if (role === "ADMIN" || role === "OFFICER" || role === "CADRE") {
      throw new Error("Không thể xóa tài khoản Cán bộ Quản trị hệ thống!");
    }
  }

  // 1. Xóa khỏi danh sách users trong file / memory
  const initialUserLen = users.length;
  const filteredUsers = users.filter((u) => {
    const uId = String(u.id).toLowerCase();
    const uEmail = (u.email || "").toLowerCase();
    const uPhone = (u.phone || "").toLowerCase();
    return !(uId === strId || uEmail === strId || uPhone === strId);
  });
  saveUsersToDisk(filteredUsers);

  // 2. Xóa khỏi PostgreSQL nếu online
  try {
    if (await isDatabaseOnline()) {
      if (targetUser?.email) {
        await prisma.user.deleteMany({ where: { email: targetUser.email } });
      } else if (targetUser?.id && typeof targetUser.id === "string") {
        await prisma.user.deleteMany({ where: { id: targetUser.id } });
      }
    }
  } catch (dbErr) {
    console.error("Lỗi xóa user DB:", dbErr);
  }

  // 3. Nếu cán bộ chọn xóa kèm các phản ánh rác / spam của cử tri này
  let deletedFeedbacksCount = 0;
  if (deleteFeedbacks) {
    const feedbacks = getMemoryFeedbacks();
    const targetName = targetUser?.name || targetUser?.fullName;
    const targetPhone = targetUser?.phone;

    const remainingFeedbacks = feedbacks.filter((f) => {
      const matchPhone = targetPhone && f.phone && f.phone === targetPhone;
      const matchName = targetName && f.voterName && f.voterName.toLowerCase() === targetName.toLowerCase();
      if (matchPhone || matchName) {
        deletedFeedbacksCount++;
        return false;
      }
      return true;
    });

    if (deletedFeedbacksCount > 0) {
      saveFeedbacksToDisk(remainingFeedbacks);
      // Xóa trong PostgreSQL nếu online
      try {
        if (await isDatabaseOnline() && targetPhone) {
          await prisma.voterFeedback.deleteMany({ where: { phone: targetPhone } });
        }
      } catch (err) {}
    }
  }

  return {
    success: true,
    message: `Đã xóa thành công tài khoản cử tri!${
      deletedFeedbacksCount > 0 ? ` (Đã đồng thời dọn dẹp ${deletedFeedbacksCount} ý kiến phản ánh liên quan)` : ""
    }`,
    deletedFeedbacksCount,
  };
}
