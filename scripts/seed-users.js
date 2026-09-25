const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const usersFile = path.join(process.cwd(), "data", "users.json");
const officerDefaultPass = "12345678@";
const adminPass = "Hh@$123456";
const officerHash = bcrypt.hashSync(officerDefaultPass, 10);
const adminHash = bcrypt.hashSync(adminPass, 10);

const users = [
  {
    id: 1,
    username: "lehanhkt01",
    passwordHash: adminHash,
    fullName: "Quản Trị Viên Toàn Quyền Xã Ea Súp",
    role: "ADMIN",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 101,
    username: "mttq",
    passwordHash: officerHash,
    fullName: "Cán bộ Ban Thường trực MTTQ Xã Ea Súp",
    org: "Ban Thường trực Ủy ban MTTQ Việt Nam Xã Ea Súp",
    role: "OFFICER",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 102,
    username: "ubnd",
    passwordHash: officerHash,
    fullName: "Cán bộ Ủy ban Nhân dân Xã Ea Súp",
    org: "Ủy ban Nhân dân xã Ea Súp",
    role: "OFFICER",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 103,
    username: "hdnd",
    passwordHash: officerHash,
    fullName: "Cán bộ Thường trực Hội đồng Nhân dân Xã Ea Súp",
    org: "Thường trực Hội đồng Nhân dân xã Ea Súp",
    role: "OFFICER",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 104,
    username: "danguy",
    passwordHash: officerHash,
    fullName: "Cán bộ Đảng ủy Xã Ea Súp",
    org: "Đảng ủy xã Ea Súp",
    role: "OFFICER",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 105,
    username: "congan",
    passwordHash: officerHash,
    fullName: "Cán bộ Ban Chỉ huy Công an Xã Ea Súp",
    org: "Ban Chỉ huy Công an xã Ea Súp",
    role: "OFFICER",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 106,
    username: "yte",
    passwordHash: officerHash,
    fullName: "Cán bộ Trạm Y tế Xã Ea Súp",
    org: "Trạm Y tế xã Ea Súp",
    role: "OFFICER",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 107,
    username: "quansu",
    passwordHash: officerHash,
    fullName: "Cán bộ Ban Chỉ huy Quân sự Xã Ea Súp",
    org: "Ban Chỉ huy Quân sự xã Ea Súp",
    role: "OFFICER",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    email: "zipzenhanh@gmail.com",
    name: "Hanh MTTQ",
    image: "https://lh3.googleusercontent.com/a/ACg8ocLqES8eeda8FCyXUWJWSNMcROWdUsj8sBNKZVopkTJiIWbkhY8=s96-c",
    role: "USER",
    id: "user_1790265625380",
    createdAt: "2026-09-24T16:00:25.380Z",
    updatedAt: "2026-09-24T16:06:49.307Z"
  }
];

fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");
console.log("Successfully seeded users to data/users.json");
