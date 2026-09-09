# MyHealth Training Log

個人用トレーニング記録画面です。GitHub Pagesで画面を配信し、記録はSupabaseへ保存します。

- Supabase Authによる本人ログイン
- Row Level Securityにより本人の行書きのみ許可
- パスワード、管理者キー、身体データ、SQLiteはこのリポジトリに含めません

`config.js` にあるのはブラウザー利用を想定した公開用anonキーです。secret/service_roleキーは置かないでください。
