# BOT-FLOW — Luồng hoạt động của pipeline EuroRWA

Pipeline tự động hóa toàn bộ: lấy data → verify on-chain → viết bài → deploy. Chạy độc lập trên GitHub server nên **máy tắt vẫn hoạt động**.

## 1. Trình kích hoạt (trigger)

| Nguồn                 | Thời gian                                                | Mục đích               |
| --------------------- | -------------------------------------------------------- | ---------------------- |
| Cron local (máy user) | `0 */12 * * *` (00:00, 12:00)                            | Chạy khi máy bật       |
| GitHub Actions        | `30 0,12 * * *` (00:30, 12:30 UTC) + `workflow_dispatch` | Chạy kể cả khi máy tắt |

Lệch 30 phút để tránh 2 luồng chạy cùng lúc (guard chặn attest trùng nên dù trùng cũng không hỏng).

## 2. Chuỗi xử lý (`scripts/run.sh`)

```
fetch.ts   → gọi rwa.xyz, lấy TVL/yield/holders của 15 quỹ → data/snapshots/<ngày>.json
ingest.ts  → đọc snapshot, ghi vào SQLite (data/rwa.db)
guard.ts   → kiểm tra on-chain: ngày này đã attest chưa?
              ├─ đã attest  → thoát (giữ nguyên bản chính thức trên chuỗi)
              └─ chưa attest → attest.ts + publish.ts
attest.ts  → hash snapshot (keccak-256) + ký bằng ví agent → data/attestations/<ngày>.json
publish.ts → gửi hash + chữ ký lên contract Sepolia → ghi published.tx vào file attestation
posts.ts   → sinh ready.md (bài X/Reddit/LinkedIn) vào docs/posts/<ngày>/
visual.ts  → dựng chart HTML → chụp PNG bằng Chrome headless → docs/posts/<ngày>/visual.png
```

Sau đó (chỉ trong GitHub Actions):

```
commit + push → nếu có thay đổi: commit snapshot + bài + ảnh về repo main
redeploy      → nếu có commit mới: gọi Vercel Deploy Hook → site tự cập nhật
```

## 3. Ví agent & bảo mật

- Ví ký = địa chỉ `0x02B027ecd3004Fbb579bD4c64B6e22Fff369F846`
- Key nằm ở `data/agent.key` (local) **hoặc** env `AGENT_PRIVATE_KEY` (GitHub Actions secret `AGENT_PRIVATE_KEY`)
- 2 nơi đều dùng **cùng một key** → chữ ký nhất quán giữa local và GitHub
- Không bao giờ commit `data/agent.key`, `.env*`, `data/rwa.db`

## 4. Guard chống attest trùng ngày

Contract chỉ nhận **1 attestation/ngày** (`require date already attested`). Nếu không có guard, cron chạy lại lần 2 sẽ tạo hash khác (payload có `generated_at`) → lệch on-chain. Guard đọc contract trước khi attest:

- Hash ngày đã tồn tại → `exit 1` → giữ nguyên bản chính thức (đã publish từ lần đầu)
- Chưa có → `exit 0` → mới attest + publish

→ Chỉ **lần đầu chạy trong ngày** mới là bản chính thức lên chuỗi.

## 5. Data & deploy

- API Vercel đọc trực tiếp `data/snapshots/*.json` (không cần SQLite)
- Snapshot được commit về repo → Deploy Hook → Vercel rebuild → dashboard hiện data mới
- Dashboard: https://rwa-dashboard-gamma.vercel.app
- Repo: https://github.com/crytobot459/eurorwa

## 6. Khi có lỗi — kiểm tra ở đâu

| Triệu chứng                                      | Nơi xem                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Hôm nay không có file trong `docs/posts/<ngày>/` | `data/cron.log` (local) hoặc GitHub → Actions → pipeline                                                                            |
| Attestation không publish                        | `data/attestations/<ngày>.json` thiếu `published.tx` → xem lỗi tx trên Sepolia scan                                                 |
| Site không có data mới                           | GitHub Actions có commit không? Hook Vercel có chạy không?                                                                          |
| Ảnh không sinh ra                                | Chrome bận (đang mở nhiều tab) — visual.ts đã có `--user-data-dir` riêng + timeout 30s, lỗi sẽ chỉ cảnh báo chứ không chặn pipeline |

## 7. Chạy tay để test

```bash
bun run fetch && bun run ingest
bun run posts      # sinh bài
bun run visual     # sinh ảnh
bun run verify     # verify attestation khớp chữ ký
```
