# AGENTS.md — EuroRWA Agent

Hướng dẫn cho **mọi phiên opencode** làm việc trong dự án này.
Đọc file này TRƯỚC TIÊN, rồi `ROADMAP.md`, rồi `PROGRESS.md`.

## Nhiệm vụ chính (mission)

Agent được giao hoàn thiện **EuroRWA dashboard**:
một dashboard theo dõi các quỹ money market tokenized ở châu Âu
(BlackRock/JPMorgan vừa mở $311 tỷ), có tích hợp **AI agent onchain**
publish attestation dữ liệu lên blockchain. Mục tiêu cuối: kiếm tiền
qua bán API/data → grant → việc làm.

## Trạng thái mỗi phiên (bắt buộc làm)

Khi bắt đầu phiên mới:

1. Đọc `ROADMAP.md` (toàn bộ)
2. Đọc `PROGRESS.md` (nếu có) — xem phiên trước đã làm tới đâu
3. Xác định phase đang dang dở, tiếp tục từ đó (không làm lại)

Khi kết thúc phiên:

1. Cập nhật `PROGRESS.md`: phase nào xong, ghi tiêu chí Done đã tick
2. Ghi rõ "việc tiếp theo phải làm" để phiên sau biết

## Quy tắc làm việc

- **Theo thứ tự phase** trong ROADMAP, không nhảy cóc trừ khi PROGRESS.md nói rõ lý do
- **Mỗi phase có tiêu chí Done** — chỉ sang phase sau khi tick đủ checklist
- **Đăng/khoe từ sớm** (Phase 2 trở đi) — đừng giấu sản phẩm cho tới khi "hoàn hảo"
- **Chi phí $0-15/tháng** — không thêm dependency/cloud tốn tiền trừ khi có lý do
- **Mỗi phiên nên hoàn thành trọn 1 phase** thay vì dở dang nhiều phase

## Quy ước code (kế thừa AGENTS.md root của repo)

- Biến 1 từ: `const db`, `const cfg` — không `camelCase` dài trừ khi thật cần
- Không dùng `any`
- Tránh try/catch trừ khi cần
- Dùng Bun APIs: `Bun.file()`, `bun:sqlite`
- Ưu tiên type inference, `const` hơn `let`, early return thay `else`
- Dùng snake_case cho cột DB

## Cấu trúc dự án

```
rwa-dashboard/
├── ROADMAP.md          # Lộ trình 8 phase (đọc trước)
├── AGENTS.md           # File này
├── PROGRESS.md         # Trạng thái — cập nhật mỗi phiên
├── docs/
│   ├── research-rwa-data.md       # Nghiên cứu dữ liệu RWA
│   ├── research-onchain-agent.md  # Nghiên cứu AI agent onchain
│   ├── research-monetization.md   # Cách kiếm tiền + mẫu bài đăng
│   └── posts/                     # 5 bài đăng mẫu (Phase 6)
├── src/
│   ├── fetch.ts        # Lấy dữ liệu từ rwa.xyz + etherscan
│   ├── ingest.ts       # Ghi vào SQLite
│   ├── api.ts          # API endpoints
│   ├── frontend/       # React dashboard
│   └── agent/
│       ├── attest.ts   # Ký + publish attestation onchain
│       └── verify.ts   # Verify signature
└── data/
    ├── snapshots/      # JSON mỗi ngày
    ├── rwa.db          # SQLite
    └── attestations/   # Hash + chữ ký mỗi ngày
```

## Các nguồn dữ liệu chính

- **rwa.xyz API**: `https://api.rwa.xyz/v4/assets` — Bearer token `RWA_API_KEY`
  (đăng ký tại app.rwa.xyz → API Tools → API Keys)
- **rwa.xyz MCP**: `https://mcp.rwa.xyz` (OAuth — cho AI assistant)
- **Docs**: https://docs.rwa.xyz/llms.txt (index đầy đủ)
- **Etherscan API**: free, 5 req/s
- **Docs nội bộ quan trọng**: ROADMAP Phase 5 nói rõ cách làm attestation

## Cảnh báo bảo mật

- **KHÔNG bao giờ** commit `.env.local`, private key agent, `RWA_API_KEY`
- Private key cho attestation: tạo ví EVM mới riêng cho agent, chỉ dùng cho ký
  dữ liệu, không nạp tiền vào
- `.gitignore` phải có: `.env*`, `data/rwa.db`, `data/attestations/`, `data/snapshots/`

## Thứ tự ưu tiên khi phiên bị giới hạn thời gian

1. Cập nhật PROGRESS.md (luôn làm đầu tiên khi kết thúc)
2. Hoàn thành phase đang dang dở
3. Build 1 tính năng nhỏ trong phase hiện tại
