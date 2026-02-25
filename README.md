# hacker-tracker.tw

這裡蒐集了台灣資訊與資安領域相關的活動，供大家舉辦活動選擇日期時可以參考。  

本專案以 JSON 檔管理活動資料。以主辦單位為單位將活動資訊存入各主辦單位的 JSON 檔案中。以下流程教你新增活動並讓活動出現在網站上。

## 1. 先準備活動 JSON
使用網站上的「➕ 提交新活動」表單產生 JSON，或自行建立一個 JSON 物件，格式範例如下：

```json
{
    "title": "CYBERSEC 2026 台灣資安大會",
    "start": "2026-05-05",
    "end": "2026-05-07",
    "location": "南港展覽館二館",
    "organizer": "iThome",
    "url": "https://cybersec.ithome.com.tw/2026/",
    "contact": "cybersec@ithome.tw",
    "status": "confirmed",
    "tags": ["實體", "資安", "Conf"]
}
```

必填欄位：`title`, `start`, `end`, `status`, `organizer`, `tags`

規則：
- `status` 只能是 `confirmed` 或 `tentative`。分別代表已確定資訊的活動與暫定的活動。
- `tags` 必須至少包含一個 `實體` 或 `線上`。可參考 `data/tags.json` 選擇 tags。
- `start` / `end` 可為 `YYYY-MM-DD` 或完整時間字串，若含時間必須帶時區（例如 `2026-05-05T09:00+08:00`）。
- `url` 必須是 `http` 或 `https`。

## 2. 建立活動檔案
把 JSON 存成檔案，放在 `data/original/`（存成陣列），例如：
- `data/original/`

檔名格式：
```
{ORG}.json
```

範例：
```
hitcon.json
```

## 3. 驗證資料 (可選，發 PR 時會有 GitHub Action 強制執行檢查)
可執行以下指令驗證單一 JSON 檔案格式是否正確：

```bash
python3 scripts/validate-event.py data/original/hitcon.json
```

## 4. 提交 PR
完成後送出 Pull Request，待 GitHub Action 自動檢查與維護者審核合併即可。
