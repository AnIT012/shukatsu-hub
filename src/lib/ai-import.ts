// AI取り込み用の「依頼文」。設定→取り込み→AIで整理 の1タップコピーで使う。
// 中身はユーザーに見せず、コピーだけできる。生成AIにメモ/募集要項と一緒に貼ると、
// このアプリが取り込める JSON(applications/events)を返してくれる。
//
// スキーマは src/lib/types.ts と src/lib/io.ts(sanitize*) に一致させること。
// ここを変えたら parseImport が受けられる形か必ず確認する。

export const AI_IMPORT_PROMPT = `あなたは就活の進捗管理を手伝うアシスタントです。
これから貼る私のメモ・企業の募集要項・選考案内などを読み取り、就活管理アプリ「就活Hub」に取り込める JSON に変換してください。

# 出力ルール（厳守）
- 出力は **JSON のみ**。前後の説明・挨拶・コードブロックの言語名など一切不要。
- わからない項目は空文字 "" か null にする。**勝手に事実を創作しない**（締切や日程を推測で埋めない）。
- 日付は "YYYY-MM-DD" か "YYYY-MM-DDTHH:mm"（例 "2026-04-30T23:59"）。不明なら null。
- 1回のメモに複数社あれば applications に複数入れてよい。説明会/イベントは events へ。

# JSON の形
{
  "applications": [
    {
      "company": "会社名（必須）",
      "role": "職種・コース名（任意）",
      "priority": "high | medium | low（志望度。不明は medium）",
      "selectionType": "long_intern | short_intern | early | main（本選考は main。不明は main）",
      "loginId": "マイページのログインID・会員番号（任意）",
      "memo": "自由メモ（任意）",
      "links": [{ "label": "リンク名", "url": "https://..." }],
      "esEntries": [
        { "question": "設問文", "answer": "回答（あれば）", "charLimit": 400 }
      ],
      "stages": [
        {
          "label": "段階名（例: ES / 一次面接 / 最終面接）",
          "result": "pending | waiting | passed | failed | declined（進行中は pending、結果待ちは waiting）",
          "tasks": [
            {
              "kind": "entry | es | web_test | video | gd | interview | final_interview | internship | other",
              "name": "やること（例: ES提出 / SPI受検）",
              "dueAt": "締切 ISO or null",
              "heldAt": "実施日時 ISO or null",
              "location": "場所 or オンラインURL（任意）",
              "memo": "任意"
            }
          ]
        }
      ]
    }
  ],
  "events": [
    {
      "company": "主催（会社名など・任意）",
      "title": "説明会/イベント名（必須）",
      "venueMode": "online | onsite | \\"\\"（不明は空）",
      "venuePlace": "会場 or URL（任意）",
      "applyBy": "申込締切 ISO or null",
      "heldAt": "開催日時 ISO or null",
      "memo": "任意",
      "links": [{ "label": "リンク名", "url": "https://..." }]
    }
  ]
}

# 変換のコツ
- 選考は「段階(stages)」の下に「やること(tasks)」がぶら下がる2階層。ES→面接…と進むごとに stage を分ける。
- まだ受けていない段階は result:"pending"。結果連絡待ちなら "waiting"。
- ES の設問と字数制限がわかれば esEntries に入れる。
- 会社説明会・逆求人・インターン説明会などは applications ではなく events に。

では、以下を変換してください（JSONのみ返す）:
---
`;
