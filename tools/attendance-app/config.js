// サーバー未設定時は API_URL を空のままにしておくと、端末内保存のみで動作する。
// デプロイ時はこのファイルを直接編集するか、server/config.php の app_token と
// 揃えた値を設定すること(フロント側のトークンは完全な秘密にはならない点に注意)。
window.ATTENDANCE_CONFIG = {
  API_URL: "",
  APP_TOKEN: "",
};
