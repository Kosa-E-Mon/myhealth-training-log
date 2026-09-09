# MyHealth Training Log

個人用トレーニング記録画面です。GitHub Pagesで画面を配信し、記録はSupabaseへ保存します。

- Supabase Authによる本人ログイン
- Row Level Securityにより本人の行書きのみ許可
- 本人専用の体重・BMI・体脂肪率と最大30点の体重推移グラフ
- 体重・体組成の手動追加と身長設定（BMI計算）
- パスワード、管理者キー、身体データ、SQLiteはこのリポジトリに含めません

`config.js` にあるのはブラウザー利用を想定した公開用anonキーです。secret/service_roleキーは置かないでください。
