# 🛡️ Deep Focus Shield

SNS依存防止のために、短時間で消費される中毒性コンテンツを自動的にブロックし、深い集中力を保つことをサポートします

## 機能

### 共通機能（すべてのサイトに適用）
- ✅ グレースケールモード（色彩による脳への報酬刺激をカット）
- ✅ 曜日・時間帯による制限（複数時間帯設定可能）
- ✅ 常時ON機能
- ✅ ダークモード対応

### YouTube
- ✅ Shortsの非表示
- ✅ ホーム画面を登録チャンネルへリダイレクト
- ✅ 関連動画の非表示（動画再生ページ右側）
- ✅ コメントを非表示

### Twitter/X
- ✅ デフォルトのTLを「フォロー中」に変更
- ✅ おすすめ（For you）タブの非表示
- ✅ トレンドの非表示（デフォルトON）
- ✅ 動画の自動再生停止

### TikTok
- ✅ サイト全体をブロック（デフォルトON）

## ファイル構成

```
deep-focus-shield/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── youtube-content.js
├── youtube-style.css
├── twitter-content.js
├── twitter-style.css
├── icon16.png
├── icon48.png
└── icon128.png
```

## ライセンス

MIT License

Copyright (c) 2025 SKYMY-Workshop

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## デフォルト設定について

最大限の効果を得るため、以下の機能がデフォルトでONになっています：
- 共通機能: 常にON（全機能を常時有効化）
- YouTube: Shorts非表示、ホームリダイレクト、関連動画非表示、コメント非表示
- Twitter: トレンド非表示
- TikTok: サイトブロック

## 更新履歴

- v1.0.0 初回リリース
