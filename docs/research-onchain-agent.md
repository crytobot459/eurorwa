# Nghiên cứu: AI Agent Onchain — trend + cách tích hợp vào EuroRWA

> Cập nhật: 2026-08-04. File này phục vụ Phase 5 của ROADMAP (attestation onchain).

## 1. Trend AI agent onchain đang nóng thế nào

- **Hackathon Pump.fun $3M** cho 12 dự án AI/game — AI agents là chủ đề hot nhất
  các hackathon 2026.
- **Bug bounty**: 560+ report do AI agent nộp đã được trả tiền trên Immunefi
  → dev đang chuyển sang viết agent tự động hóa.
- **Thị trường việc làm**: AI Engineer là skill lương cao nhất, job "AI Products"
  xuất hiện liên tục ở các sàn (Paradex, Binance...).
- Tiền đang chảy từ crypto thuần sang AI (Hashdex DEFI ETF đầu tiên phải đóng
  cửa vì nhà đầu tư chạy theo AI returns — CoinDesk 04/08/2026).

## 2. Các framework/infrastructure agent onchain (2026)

| Framework                          | Đặc điểm                                                                                                | Phù hợp                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **NEAR AI / IronClaw**             | Agent chạy trong TEE (Trusted Execution Environment), hardware-signed attestation, zero operator access | Production, doanh nghiệp, có chi phí |
| **NEAR AI Cloud**                  | Confidential inference, sealed environment                                                              | Chạy model/agent riêng tư            |
| **NEAR AI Agent Marketplace**      | market.near.ai — list agent bán cho người khác                                                          | Kiếm tiền từ agent                   |
| **ElizaOS (ai16z)**                | Framework agent onchain phổ biến nhất hệ Solana/AI                                                      | Agent giao dịch/twitter              |
| **TEE chung (Intel TDX, AMD SEV)** | Nền tảng phần cứng cho confidential compute                                                             | Nền tảng dưới agent                  |
| **rwa.xyz MCP**                    | mcp.rwa.xyz — data RWA vào AI workflow (OAuth)                                                          | Research, không production           |

**Kết luận cho dự án**: KHÔNG cần framework nặng cho MVP. Bắt đầu bằng script ký
attestation (lighter), nâng lên NEAR AI/IronClaw khi có revenue. Xem Phase 5 ROADMAP.

## 3. Thiết kế attestation tối giản (cách chúng ta làm)

### Ý tưởng

"Dữ liệu RWA yield của chúng ta có chữ ký onchain — ai cũng verify được".
Đây là điểm khác biệt vs rwa.xyz: dữ liệu có thể chứng minh nguồn gốc.

### Luồng (script `src/agent/attest.ts`)

1. Đọc SQLite (15 quỹ EU: TVL + yield + holders) → serialize
2. Hash payload: `keccak256(payload + date)`
3. Ký hash bằng private key của ví EVM riêng (tạo mới, chỉ dùng cho agent)
4. Ghi `data/attestations/<date>.json`: `{date, hash, signature, signer, payload}`
5. (Optional) Ghi hash + signature lên contract trên Sepolia:
   contract Solidity ~30 dòng, hàm `attest(bytes32 hash, bytes calldata signature)`

### Verify (`src/agent/verify.ts`)

1. Đọc file attestation
2. `ecrecover(hash, signature)` → ra signer
3. Khớp với signer công bố → dữ liệu "authentic"

### Công cụ

- Ký: `ethers` (hoặc `viem` — nhẹ hơn cho Bun). `viem` khuyến khích.
- Hash: `keccak256` từ viem.
- Ví: tạo ví mới `viem`/`ethers`, **KHÔNG nạp tiền**, chỉ để ký.

## 4. Hướng nâng cao (khi có revenue) — NEAR AI / IronClaw

- Agent chạy trong TEE → attestation do **phần cứng ký** (Intel TDX/AMD SEV)
  → tin cậy hơn nhiều so với ví EVM tự ký
- Mỗi request trả hardware-signed attestation certificate, bên thứ 3 verify được
- Phù hợp khi bán data cho tổ chức cần "proof of integrity"
- Tài liệu: https://docs.near.ai, https://ironclaw.com, https://cloud.near.ai

## 5. Rủi ro & lưu ý

- Private key agent mất → ký mới, thông báo "key rotation" — lưu trong file
  riêng, không commit
- Ví ký chỉ dùng để KÝ, không nạp gas nhiều (Sepolia testnet thì miễn phí)
- Nếu publish tx thật cần gas: dùng Sepolia testnet faucet (free)
- Đừng để private key vào `.env.local` commit lên git

## 6. Tài nguyên

- NEAR AI docs: https://docs.near.ai
- IronClaw: https://ironclaw.com
- rwa.xyz MCP: https://docs.rwa.xyz/mcp/overview.md
- viem: https://viem.sh
- Sepolia faucet: search "sepolia faucet" (free ETH cho testnet)
