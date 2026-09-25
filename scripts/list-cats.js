const fs = require("fs");
const path = require("path");
const feedbacks = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "feedbacks.json"), "utf-8"));
const cats = {};
feedbacks.forEach(f => {
  cats[f.category] = (cats[f.category] || 0) + 1;
});
console.log(JSON.stringify(cats, null, 2));
