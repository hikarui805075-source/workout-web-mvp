# 引継ぎプロンプト（workout-web-mvp）

以下を新しいエージェント／担当者への最初のメッセージとしてそのまま貼り付けてください。

---

## プロンプト本文（コピー用）

```
あなたは GitHub リポジトリ `hikarui805075-source/workout-web-mvp` の開発を引き継ぐエージェントです。

### プロジェクト概要
- 筋トレ記録 Web MVP（Vite 8 + React 19 + TypeScript + Tailwind 4 + Dexie + Recharts）
- データはブラウザ IndexedDB（Dexie）にローカル保存
- PWA 対応（本番ビルド時のみ Service Worker 登録）

### リポジトリ
- URL: https://github.com/hikarui805075-source/workout-web-mvp
- 作業ブランチ: `master`（UI 変更はすでにマージ済み）
- 参考 PR: https://github.com/hikarui805075-source/workout-web-mvp/pull/1（draft・内容は master に取り込み済み）

### 直近で完了した UI 変更（2026-05-16）
1. **ホーム**: 「今週のカレンダー」→ **月間カレンダー**（`src/components/MonthCalendar.tsx`、前月/次月ナビ、完了日は水色ドット）
2. **ホーム**: 「次回おすすめメニュー」セクションを **一旦非表示**（ロジックは `src/services/aiSuggest.ts` に残置）
3. **下部ナビ**: ホーム/記録/分析/設定を **Lucide アイコン付きタブ**（`src/components/AppLayout.tsx`）
4. **開発まわり**: ポート **5174** 固定、開発時 SW/キャッシュ無効化（`src/main.tsx`, `vite.config.ts`）

### 開発サーバー（必読）
- **必ずエージェント側で起動・再起動する**。ユーザーに `git pull` / `npm run dev` を頼まない。
- URL: **http://localhost:5174/**（5173 は使わない・古いローカルプロセスと競合しやすい）
- 起動例（tmux）:
  SESSION_NAME="vite-dev-server"
  tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c /workspace -- bash -l  # 未作成時のみ
  tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" 'cd /workspace && npm run dev -- --force' C-m
- UI 変更後は `curl` 等で配信確認（例: HomePage に `MonthCalendar` が含まれるか）してからユーザーに報告する。
- 詳細ルール: `.cursor/rules/dev-workflow.mdc`（alwaysApply）

### 画面が古いままのとき
1. ユーザーに 5173 ではなく **5174** を開いてもらう
2. 開発サーバー再起動 + 配信内容の curl 確認
3. それでもダメなら Application → Service Workers の Unregister / Clear site data を案内（開発時は SW 登録しない実装だが、過去のキャッシュが残ることがある）

### 主要ファイル
| 用途 | パス |
|------|------|
| ルーティング | `src/App.tsx` |
| レイアウト・下部タブ | `src/components/AppLayout.tsx` |
| ホーム | `src/pages/HomePage.tsx` |
| 月間カレンダー | `src/components/MonthCalendar.tsx` |
| 記録 | `src/pages/RecordPage.tsx` |
| 分析 | `src/pages/AnalysisPage.tsx` |
| 設定 | `src/pages/SettingsPage.tsx` |
| DB | `src/db/database.ts`, `src/db/models.ts` |
| おすすめロジック（UI 非表示） | `src/services/aiSuggest.ts` |

### コマンド
npm install          # node_modules 未作成時
npm run dev            # → http://localhost:5174/
npm run build
npm test

### 未対応・今後の候補
- README の `npm run dev` 説明がポート 5174 と不一致（更新余地あり）
- 「次回おすすめメニュー」の UI 再表示（ユーザーが「一旦排除」と言っていたためロジックのみ残置）
- `package-lock.json` と `npm ci` の不整合（環境によっては `npm install` が必要）

### ブランチ命名（Cloud Agent 時）
- feature ブランチは `cursor/<name>-b18f` 形式

### 言語
- ユーザーへの返答は **日本語**

上記を踏まえ、ユーザーの次の指示に従って作業を続けてください。開発サーバーが止まっていれば起動し、URL は 5174 を案内してください。
```

---

## 変更履歴（main commits）

| commit | 内容 |
|--------|------|
| `5aa3354` | 月間カレンダー・アイコンタブ・おすすめメニュー非表示 |
| `1936885` | dev ポート 5174、開発時 SW 解除 |
| `26f3f16` | `.cursor/rules/dev-workflow.mdc` 追加 |
