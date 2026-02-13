// ==========================================
// db.js - 产品数据管理中心
// ==========================================

// 🔴 请确保这个链接是您“发布到网络”后生成的 CSV 链接
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwZ_BgnXtX_ZdO87jkvLU_IMUByJwFKZoyzVVI0Sghwe-2_Qq676JsqsrO0AnGubJGuCxonKizijyj/pub?gid=0&single=true&output=csv";

// 缓存时间
const CACHE_DURATION = 1 * 60 * 1000;

window.perfumeDB = [];

document.addEventListener("DOMContentLoaded", () => {
  initProductData();
});

async function initProductData() {
  const cacheKey = "perfumeDB_Data_V3";
  const timeKey = "perfumeDB_Time_V3";
  const now = new Date().getTime();
  const cachedTime = localStorage.getItem(timeKey);
  const cachedData = localStorage.getItem(cacheKey);

  // 1. 尝试加载缓存
  if (cachedData && cachedTime && now - cachedTime < CACHE_DURATION) {
    console.log("🚀 加载缓存数据");
    try {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
      return;
    } catch (e) {
      console.warn("缓存数据损坏，重新下载");
    }
  }

  // 2. 下载新数据
  console.log("🌐 下载最新数据...");
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error("网络响应错误");
    const data = await response.text();
    window.perfumeDB = parseCSV(data);

    // 存入缓存
    localStorage.setItem(cacheKey, JSON.stringify(window.perfumeDB));
    localStorage.setItem(timeKey, now);

    runPageLogic();
  } catch (error) {
    console.error("下载失败:", error);
    if (cachedData) {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
      alert("网络较慢，已加载离线数据");
    }
  }
}

function runPageLogic() {
  if (typeof renderHome === "function") renderHome();
  if (typeof renderCart === "function") renderCart();
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  // 获取表头并转小写，去空格
  const headers = lines[0]
    .trim()
    .split(",")
    .map((h) => h.trim().toLowerCase());

  return lines
    .slice(1)
    .map((line) => {
      // 处理 CSV 中的逗号和引号
      const values = [];
      let current = "";
      let inQuote = false;
      for (let char of line) {
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === "," && !inQuote) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const obj = {};
      // 如果列数不匹配，跳过
      if (values.length < headers.length) return null;

      headers.forEach((header, index) => {
        let val = values[index] ? values[index].replace(/^"|"$/g, "") : "";
        if (header === "price" || header === "stock") val = Number(val);
        obj[header] = val;
      });
      return obj;
    })
    .filter((item) => item !== null);
}
