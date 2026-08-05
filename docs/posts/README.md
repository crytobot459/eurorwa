# docs/posts — Bài đăng sẵn sàng mỗi ngày

Pipeline tự động sinh **1 thư mục mỗi ngày**: `docs/posts/<YYYY-MM-DD>/`

Mở thư mục ngày hôm nay là có đủ mọi thứ để đăng — không cần tìm gì thêm.

## Cấu trúc mỗi ngày

| File          | Dùng để                                                         |
| ------------- | --------------------------------------------------------------- |
| `ready.md`    | Bài đăng đã soạn sẵn cho **X / Reddit / LinkedIn** (copy-paste) |
| `visual.png`  | Ảnh chart 1200×630 — đính kèm khi đăng LinkedIn/X               |
| `visual.html` | Nguồn HTML của ảnh (không cần đụng)                             |

## Cách đăng (2 phút)

1. Mở thư mục hôm nay: `docs/posts/<ngày>/`
2. Mở `ready.md` → copy mục **X** sang X, mục **Reddit** sang Reddit, mục **LinkedIn** sang LinkedIn
3. Đính kèm `visual.png` (LinkedIn/X)
4. Sau khi đăng xong → ghi link bài vào `PROGRESS.md` (mục "Việc tiếp theo") để track

## Lưu ý

- File được tạo bởi `bun run posts` + `bun run visual` (chạy trong `scripts/run.sh`)
- Nếu 1 ngày không có file → pipeline hôm đó lỗi ở bước nào đó, xem `data/cron.log` (local) hoặc tab Actions của repo GitHub
- `ready.md` luôn sinh theo snapshot mới nhất — đăng ngày nào thì dùng thư mục ngày đó
