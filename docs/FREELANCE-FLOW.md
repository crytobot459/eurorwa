# EuroRWA — Freelance Flow

Luồng nhận freelance task từ khách **trong chính rwa-dashboard** — khách thấy bài
LinkedIn/dashboard → liên hệ qua Telegram bot → máy local báo giá → nhận tiền 100%
trước → opencode làm → bàn giao.

## Nguyên tắc

- **Hai bot phối hợp**:
  - **Bot công khai** `TG_TOKEN` (Vercel webhook, luôn online): trả lời Q&A data,
    phát hiện khách muốn đặt task → báo giá nhanh (quick quote) + đưa link chat bot
    build → gửi `#[lead]` vào nhóm chung.
  - **Bot build** `TG_FREELANCE_TOKEN` (local long-polling): khách bấm link `/start`
    → tự nhận task, báo giá, chốt, nhận USDT → tạo task → đăng trạng thái vào nhóm.
- **Nhóm Telegram chung** (`GROUP_CHAT_ID`, cả 2 bot là thành viên) = **nhật ký
  audit cho chủ**: bot công khai đăng `#[lead]`, bot build đăng `#[task]` và
  `#[approved]`. Chủ approve (`/approve`) từ chat riêng hoặc trong nhóm.
- **LƯU Ý QUAN TRỌNG — giới hạn Telegram**: bot **không thấy tin nhắn của bot
  khác** (cả trong nhóm lẫn DM riêng; tắt privacy mode qua BotFather cũng không
  giúp). Vì vậy bot build **không tự nhìn thấy** `#[lead]` do bot công khai đăng
  (mã xử lý `#[ack]` chỉ chạy khi _chủ_ tự post `#[lead]` thủ công). **Handoff
  khách → bot build là user-initiated**: khách bấm deep link
  `t.me/<build_bot>?start=build`. Không cần phối hợp bot→bot để chạy luồng.
- **Thanh toán**: 100% trước khi làm, USDT TRC20 tới ví Binance của chủ.
- **Tự động tới cùng**: bot tự nhận task, tự báo giá, tự chốt; chủ chỉ cần xác nhận
  đã nhận tiền (`/approve`). Chỉ hỏi chủ khi kẹt (giá ngoài khung, task đặc biệt).

## Kiến trúc

```
Khách chat bot công khai (Vercel)
   → detectBuild? → trả Q&A + giá ước lượng + link t.me/<build_bot>?start=build
   → post #[lead] vào nhóm chung
Khách bấm link → /start với bot build (local long-polling)
   → scripts/freelance-bot.js (vòng lặp getUpdates + sendMessage)
   → scripts/freelance-core.js (state machine thuần: scope → quote → pay → task)
   → data/freelance/tasks.json (task chờ approve) + #[task] vào nhóm
Chủ gõ /approve <id> (chat riêng hoặc trong nhóm) → #[approved] → opencode đọc task → code → bàn giao
```

Luồng tin nhắn nhóm giữa 2 bot (protocol `#[tag]`):

| Tin                                       | Ý nghĩa                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `#[lead] <chat_id>\|<name>\|<mô tả>`      | bot công khai báo có khách muốn đặt task (nhật ký cho chủ)                                 |
| `#[ack] <chat_id>`                        | bot build xác nhận — **chỉ khi chủ post `#[lead]` thủ công** (bot không thấy tin bot khác) |
| `#[task] <id> — $<giá> (<cat>) — <mô tả>` | bot build đã tạo task, chờ chủ approve                                                     |
| `#[approved] <id> — $<giá>`               | chủ đã duyệt, bắt đầu làm                                                                  |

- `api/freelance.js`: bảng giá + `classify` + `quickQuote` dùng chung cho cả 2 bot.
- `api/tgbot.js`: bot công khai — thêm `detectBuild` + gửi lead.
- Bot build local chỉ xử lý chat riêng + lệnh chủ trong nhóm; không phản hồi tin nhóm khác.
- Bot build không tự thấy `#[lead]` từ bot công khai (bot không thấy tin bot khác) — handoff qua deep link.

## Setup

1. Tạo 2 bot qua @BotFather → token → `TG_TOKEN` (bot công khai), `TG_FREELANCE_TOKEN` (bot build).
2. Telegram chat id của chủ → `OWNER_CHAT_ID` (chủ = người approve task; hiện `444148694`).
3. Địa chỉ ví Binance nhận USDT (TRC20) → `USDT_ADDRESS`.
4. Tạo nhóm Telegram riêng (vd "EuroRWA Bots Hub"), **thêm cả 2 bot + chủ** →
   `GROUP_CHAT_ID` đọc từ `location.hash` khi mở nhóm (vd `#-5127324366` → `-5127324366`).
5. `BUILD_BOT_USERNAME` = username bot build (không có @) — để bot công khai tạo link.
   - `TG_TOKEN`, `BUILD_BOT_USERNAME`, `GROUP_CHAT_ID` đặt trên **Vercel** (bot công khai).
   - `TG_FREELANCE_TOKEN`, `OWNER_CHAT_ID`, `USDT_ADDRESS`, `GROUP_CHAT_ID` đặt khi chạy local.
6. Set webhook cho bot công khai:
   ```bash
   TG_TOKEN=... bun run scripts/tg-webhook.js https://rwa-dashboard-gamma.vercel.app/api/tg
   ```
7. Chạy bot build local:
   ```bash
   bun run freelance   # = bun --env-file=.env.local run scripts/freelance-bot.js
   ```

## Luồng hội thoại (state machine)

| Bước | Khách gõ                | Bot trả lời                                   |
| ---- | ----------------------- | --------------------------------------------- |
| 1    | `/start`                | Bảng giá theo loại task                       |
| 2    | mô tả task (1-2 câu)    | Loại + giá tự báo (mid-range)                 |
| 3    | `ok` / trả giá          | Chốt giá / giá giảm 20% 1 lần                 |
| 4    | tx hash hoặc screenshot | "Đã nhận, chủ xác nhận" → tạo task + nhắn chủ |
| 5    | (chủ) `/approve <id>`   | Bắt đầu làm                                   |

### Bảng giá (tự phân loại bằng keyword, `api/freelance.js`)

| Loại                     | Giá      |
| ------------------------ | -------- |
| dashboard / frontend     | $80-150  |
| bot Telegram/Discord     | $80-150  |
| data / API / scrape      | $40-100  |
| smart contract / onchain | $150-300 |
| script / tool nhỏ        | $30-60   |
| khác                     | $50-100  |

## Lệnh chủ (gõ trong chat riêng với bot build hoặc trong nhóm chung)

- `/tasks` — danh sách task chờ approve
- `/approve <id>` — xác nhận đã nhận tiền → chính thức nhận làm
- `/reject <id>` — từ chối (khách chưa chuyển đủ)

## Vòng lặp việc

1. Bot build nhận task + proof → ghi `data/freelance/tasks.json` → nhắn chủ + `#[task]` vào nhóm.
2. Chủ kiểm tra tiền trong Binance (USDT TRC20 khớp `USDT_ADDRESS`).
3. Chủ gõ `/approve <id>` (chat riêng hoặc trong nhóm) → bot báo khách + `#[approved]`.
4. Chủ mở opencode tại `rwa-dashboard`, hỏi agent xử lý task có id đó
   (hoặc tự đọc `data/freelance/tasks.json`).
5. Agent code xong → chủ gửi file/ảnh cho khách qua Telegram → đóng task.

## Lưu ý

- Bot build chạy **trên máy local** — máy tắt thì lead không xử lý được; khi chạy lại
  vẫn nhận được tin nhắn mới (Telegram giữ update 24h cho long-polling).
- Luật Telegram: bot **không được nhắn trước người lạ** — đó là lý do bot công khai
  đưa link để khách tự bấm `/start` với bot build, không thể tự "đá" khách sang.
- `data/freelance/` nằm trong `.gitignore` (task + proof không đưa lên repo).
- Không tự động đăng/trả lời LinkedIn (rủi ro ToS) — chỉ dùng bot làm kênh nhận task.
