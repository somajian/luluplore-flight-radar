// ============================================================
// Supabase 設定
// ============================================================
// 這個檔案是全站唯一負責「跟 Supabase 連線」的地方 -- script.js 只會呼叫
// window.supabaseClient，完全不知道 URL／key 長什麼樣子，之後要換專案、
// 換 key，只要改這一個檔案。
//
// 請到 Supabase 後台 → 你的專案 → Settings → API Keys，把下面兩個值換成：
//   SUPABASE_URL      → Project URL（長得像 https://xxxxxxxxxxxx.supabase.co）
//   SUPABASE_ANON_KEY → Publishable key（新專案顯示的名稱，sb_publishable_...
//                        開頭），如果你的專案介面還是舊版、顯示的是
//                        「anon public」key（一長串 JWT），用那組也可以。
//
// ⚠️ 絕對不要把 Secret key／service_role key 放進這個檔案或任何前端程式碼！
//    那組 key 可以繞過 RLS、讀寫整個資料庫，只能放在後端，這個網站完全
//    不需要用到它。
//
// Publishable key／anon key 本來就是設計給前端公開使用的，不是密碼，可以
// 放心寫在這裡、上傳到公開的 GitHub repo 也沒關係 -- 真正的存取限制是靠
// Supabase 資料表的 RLS policy 控制（只能新增、不能讀取/修改/刪除），見
// README 的 Supabase 設定章節。
// ============================================================

var SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
var SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

var supabaseClient = null;

(function(){
  var notConfigured = SUPABASE_URL.indexOf('YOUR-PROJECT-REF') !== -1 ||
                       SUPABASE_ANON_KEY.indexOf('YOUR-ANON-PUBLIC-KEY') !== -1;
  if (notConfigured) {
    console.warn('[Luluplore] Supabase 尚未設定（supabase-config.js 裡還是預設值），查詢紀錄功能會自動略過，不影響查票功能本身。');
    return;
  }
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.warn('[Luluplore] Supabase JS 函式庫載入失敗（可能是網路問題），查詢紀錄功能會自動略過。');
    }
  } catch (e) {
    console.warn('[Luluplore] Supabase 初始化失敗，查詢紀錄功能會自動略過：', e);
  }
})();
