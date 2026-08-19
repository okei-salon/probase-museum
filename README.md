# ProBase Museum

プロ野球データ博物館 — 数字が語る、感動の軌跡。

## Development

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Structure

- `src/components/ui` — GlassCard / MenuCard / Button など共通UI
- `src/components/layout` — PageShell / Header / Footer / Background
- `src/components/home` — ホーム画面セクション
- `src/config/media.ts` — 画像パス管理
- `src/data/home.ts` — ホーム表示データ

`MenuCard` は後から画面遷移を追加しやすい再利用コンポーネントです。

## 画像クレジット

### ホーム背景 — 甲子園・夕景

| 項目 | 内容 |
| --- | --- |
| ファイル | `public/images/backgrounds/koshien-sunset.jpg` |
| 原題 | [Sunset at KOSHIEN in 2012.jpg](https://commons.wikimedia.org/wiki/File:Sunset_at_KOSHIEN_in_2012.jpg) |
| 作者 | [BOLTandK2](https://www.flickr.com/people/28529353@N05/) |
| ライセンス | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/) |

### カテゴリ背景（派生）

| ファイル | 用途 |
| --- | --- |
| `pennant-stadium.jpg` | ペナントレース（明るい球場） |
| `interleague-blue.jpg` | 交流戦（青系ナイター） |
| `postseason-night.jpg` | ポストシーズン（ナイター＋紙吹雪感） |

上記3点は既存の甲子園写真を色調加工した派生アセットです。UI文字は含みません。

### ナビカード / Pickup サムネイル

`public/images/nav/*` および `public/images/pickup/season.jpg` は、添付完成デザインから切り出したプレースホルダーです。本番用写真に差し替える場合は `src/config/media.ts` を更新してください。
