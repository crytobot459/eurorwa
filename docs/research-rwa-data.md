# Nghiên cứu: Dữ liệu RWA + API rwa.xyz

> Nguồn: rwa.xyz (trang chính + docs), CoinDesk 04/08/2026. Cập nhật: 2026-08-04.

## 1. Thị trường RWA hiện tại (số liệu thật từ rwa.xyz)

| Chỉ số                   | Giá trị   | Ghi chú        |
| ------------------------ | --------- | -------------- |
| Distributed Asset Value  | $37.38B   | ▲1.71% / 30d   |
| Represented Asset Value  | $419.71B  | ▲176.57% / 30d |
| Total Asset Holders      | 1,588,665 | ▲53.09% / 30d  |
| Total Stablecoin Value   | $295.85B  | ▲0.17%         |
| Total Stablecoin Holders | 280.57M   | ▲3.47%         |

**Ngày 04/08/2026**: BlackRock mở **12 tokenized share class** từ 6 quỹ,
phủ **$311 tỷ AUM money market funds** ở châu Âu (15 thị trường, tuân thủ UCITS),
hợp tác JPMorgan Kinexys. Trước đó 1 ngày BlackRock thêm 2 quỹ tokenized ở Mỹ.
Thị trường RWA tăng **>200%/năm, vượt $30 tỷ** (rwa.xyz). Citi: $5.5 ngàn tỷ vào 2030.

## 2. Các quỹ EU hiện có (dữ liệu rwa.xyz — non-US govt debt)

| Ticker | TVL     | 1d change |
| ------ | ------- | --------- |
| EUTBL  | $898.5M | -4.27%    |
| NRW1   | $115.1M | +1.06%    |
| CAMMF  | $91.4M  | +0.21%    |
| AICRT  | $72.7M  | +0.02%    |
| CRMBR  | $31.3M  | +0.01%    |
| AICHT  | $26.0M  | +0.02%    |
| UKTBL  | $18.5M  | -0.59%    |
| bC3M   | $10.0M  | +1.55%    |
| CETES  | $5.4M   | +0.77%    |
| CRMFR  | $4.9M   | +15.29%   |

**Nhận xét quan trọng**: các quỹ EU hiện tại đều RẤT NHỎ (lớn nhất EUTBL ~$900M)
so với $311 tỷ BlackRock vừa mở. Đây chính là **data gap** — thị trường vừa bùng nổ
nhưng dữ liệu theo dõi chưa có. Dashboard của chúng ta lấp chỗ này.

## 3. API rwa.xyz — cách dùng

### Endpoint chính

```
GET https://api.rwa.xyz/v4/assets
Header: Authorization: Bearer $RWA_API_KEY
```

### Query mẫu (top 3 asset theo market value)

```bash
curl -G 'https://api.rwa.xyz/v4/assets' \
  -H "Authorization: Bearer $RWA_API_KEY" \
  --data-urlencode 'query={
    "sort": {"field": "circulating_market_value_dollar", "direction": "desc"},
    "pagination": {"page": 1, "perPage": 3}
  }'
```

### Field trả về (~200 field/asset)

- `circulating_market_value_dollar`: `{val, val_7d, val_30d, chg_7d_pct}`
- `asset_class_name`, `issuer_name`, `network_names`, `token_count`
- Có endpoints riêng: issuers, managers, networks, platforms, tokens, transactions

### API key

- Đăng ký tại **app.rwa.xyz** → API Tools → API Keys
- Nếu không có quyền: email team@rwa.xyz
- Docs đầy đủ: https://docs.rwa.xyz/llms.txt (index)

### MCP server (cho AI)

- URL: `https://mcp.rwa.xyz`, OAuth 2.0
- Hiện chỉ hỗ trợ Claude. Hữu ích cho research, không dùng cho production code.

## 4. Etherscan API (free, 5 req/s)

- Lấy balance/supply ERC-20: `https://api.etherscan.io/api?module=account&action=tokenbalance...`
- Cần API key free (etherscan.io → API keys). Dùng để cross-check supply onchain
  của các token: BUIDL, EURC, USYC, USDY, EUTBL.

## 5. Data gap (tại sao dự án này tồn tại)

1. **Châu Âu thiếu dữ liệu**: quỹ EU nhỏ, không ai cover; $311 tỷ vừa bùng nổ
2. **Không có portfolio tracker**: rwa.xyz là registry tổng, không cho nhập ví
3. **Không có alerts**: không cảnh báo inflow/outflow bất thường
4. **Không track RWA làm collateral trong DeFi** (RWA perps trend mới)
5. **Không có yield marketplace** ("bỏ $10K vào đâu lời nhất")

## 6. Các tài nguyên học thêm

- https://docs.rwa.xyz/methodology/overview.md — cách tính yield/NAV
- https://docs.rwa.xyz/api/examples.md — ví dụ từng endpoint
- https://docs.rwa.xyz/schemas/assets.md — toàn bộ field reference
