# Research: AI Agent Onchain — trend + how to integrate into EuroRWA

> Updated: 2026-08-04. This file serves ROADMAP Phase 5 (onchain attestation).

## 1. How hot the AI agent onchain trend is

- **Pump.fun $3M hackathon** for 12 AI/game projects — AI agents are the hottest topic
  at 2026 hackathons.
- **Bug bounty**: 560+ reports submitted by AI agents have been paid out on Immunefi
  → developers are shifting to writing automation agents.
- **Job market**: AI Engineer is the highest-paid skill, "AI Products" jobs
  appear constantly at exchanges (Paradex, Binance...).
- Money is flowing from pure crypto to AI (the first Hashdex DEFI ETF had to shut
  down because investors chased AI returns — CoinDesk 04/08/2026).

## 2. Onchain agent frameworks/infrastructure (2026)

| Framework                            | Characteristics                                                                                      | Best fit                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **NEAR AI / IronClaw**               | Agent runs in TEE (Trusted Execution Environment), hardware-signed attestation, zero operator access | Production, enterprise, costs money |
| **NEAR AI Cloud**                    | Confidential inference, sealed environment                                                           | Running private models/agents       |
| **NEAR AI Agent Marketplace**        | market.near.ai — list agents for sale                                                                | Making money from agents            |
| **ElizaOS (ai16z)**                  | Most popular onchain agent framework on Solana/AI                                                    | Trading/twitter agents              |
| **Generic TEE (Intel TDX, AMD SEV)** | Hardware platform for confidential compute                                                           | Platform under the agent            |
| **rwa.xyz MCP**                      | mcp.rwa.xyz — RWA data into AI workflows (OAuth)                                                     | Research, not production            |

**Conclusion for this project**: NO heavy framework needed for MVP. Start with a signing
attestation script (lighter), upgrade to NEAR AI/IronClaw once there's revenue. See ROADMAP Phase 5.

## 3. Minimal attestation design (how we do it)

### Idea

"Our RWA yield data has an on-chain signature — anyone can verify it".
This is the differentiator vs rwa.xyz: data with provable provenance.

### Flow (script `src/agent/attest.ts`)

1. Read SQLite (15 EU funds: TVL + yield + holders) → serialize
2. Hash payload: `keccak256(payload + date)`
3. Sign the hash with the private key of a dedicated EVM wallet (new, agent-only)
4. Write `data/attestations/<date>.json`: `{date, hash, signature, signer, payload}`
5. (Optional) Write hash + signature to a contract on Sepolia:
   Solidity contract ~30 lines, function `attest(bytes32 hash, bytes calldata signature)`

### Verify (`src/agent/verify.ts`)

1. Read the attestation file
2. `ecrecover(hash, signature)` → get signer
3. Match against the published signer → data is "authentic"

### Tools

- Signing: `ethers` (or `viem` — lighter for Bun). `viem` recommended.
- Hash: `keccak256` from viem.
- Wallet: create a new `viem`/`ethers` wallet, **don't fund it**, signing only.

## 4. Advanced direction (once there's revenue) — NEAR AI / IronClaw

- Agent runs in TEE → attestation is **hardware-signed** (Intel TDX/AMD SEV)
  → much more trustworthy than a self-signed EVM wallet
- Each request returns a hardware-signed attestation certificate a third party can verify
- Suitable when selling data to organizations that need "proof of integrity"
- Docs: https://docs.near.ai, https://ironclaw.com, https://cloud.near.ai

## 5. Risks & notes

- If the agent private key is lost → re-sign, announce "key rotation" — keep it in a
  separate file, don't commit
- The signing wallet is used to SIGN only, don't load much gas (Sepolia testnet is free)
- If publishing a real tx needs gas: use the Sepolia testnet faucet (free)
- Don't put the private key in `.env.local` and commit it to git

## 6. Resources

- NEAR AI docs: https://docs.near.ai
- IronClaw: https://ironclaw.com
- rwa.xyz MCP: https://docs.rwa.xyz/mcp/overview.md
- viem: https://viem.sh
- Sepolia faucet: search "sepolia faucet" (free testnet ETH)
