// ============================================================
// Supabase 設定
// ============================================================
// 請到 Supabase 後台 → 你的專案 → Settings → API，
// 把下面兩個值換成你自己的 Project URL 和 anon public key。
// （anon public key 是設計給前端公開使用的，不是密碼，可以放心寫在這裡，
//   真正的存取限制是靠 Supabase 資料表的 RLS policy 控制，見部署說明文件。）
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
