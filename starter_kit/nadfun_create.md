# CREATE Skill - Token Creation

Complete guide to creating tokens on nad.fun using pure viem and direct API calls.

> **Setup**: See `nadfun_skill.md` for network config and client setup.

## API Key (Optional)

API Key is optional but recommended (100 req/min vs 10 req/min without).

```typescript
const API_KEY = process.env.NAD_API_KEY // optional
const headers = API_KEY ? { "X-API-Key": API_KEY } : {}
```

## Network Config

| Network | API URL                 | CURVE                                      | BONDING_CURVE_ROUTER                       | LENS                                       |
| ------- | ----------------------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| Testnet | https://dev-api.nad.fun | 0x1228b0dc9481C11D3071E7A924B794CfB038994e | 0x865054F0F6A288adaAc30261731361EA7E908003 | 0xB056d79CA5257589692699a46623F901a3BB76f1 |
| Mainnet | https://api.nadapp.net  | 0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE | 0x6F6B8F1a20703309951a5127c45B49b1CD981A22 | 0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea |

## Token Creation Flow (4 Steps)

### Step 1: Upload Image

```typescript
const imageResponse = await fetch(`${CONFIG.apiUrl}/agent/token/image`, {
  method: "POST",
  headers: { "Content-Type": "image/png", ...headers },
  body: imageBuffer,
})
const { image_uri, is_nsfw } = await imageResponse.json()
```

**Supported formats**: PNG, JPEG, WebP, SVG (max 5MB)

### Step 2: Upload Metadata

```typescript
const metadataResponse = await fetch(`${CONFIG.apiUrl}/agent/token/metadata`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({
    image_uri,
    name: "My Token",
    symbol: "MTK",
    description: "Token description",
    website: "https://...", // optional
    twitter: "https://x.com/...", // optional
    telegram: "https://t.me/...", // optional
  }),
})
const { metadata_uri } = await metadataResponse.json()
```

### Step 3: Mine Salt

```typescript
const saltResponse = await fetch(`${CONFIG.apiUrl}/agent/salt`, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify({
    creator: account.address,
    name: "My Token",
    symbol: "MTK",
    metadata_uri,
  }),
})
const { salt, address: predictedAddress } = await saltResponse.json()
```

### Step 4: Create On-Chain

```typescript
// Get deploy fee
const feeConfig = await publicClient.readContract({
  address: CONFIG.CURVE,
  abi: curveAbi,
  functionName: "feeConfig",
})
const deployFeeAmount = feeConfig[0]

// Optional: Get expected tokens for initial buy
const initialBuyAmount = parseEther("0.1") // or 0n for no initial buy
let minTokens = 0n
if (initialBuyAmount > 0n) {
  minTokens = await publicClient.readContract({
    address: CONFIG.LENS,
    abi: lensAbi,
    functionName: "getInitialBuyAmountOut",
    args: [initialBuyAmount],
  })
}

// Create token (always estimate gas first - typically ~7M for create)
const createArgs = {
  name: "My Token",
  symbol: "MTK",
  tokenURI: metadata_uri,
  amountOut: minTokens,
  salt: salt as `0x${string}`,
  actionId: 1,
}

const estimatedGas = await publicClient.estimateContractGas({
  address: CONFIG.BONDING_CURVE_ROUTER,
  abi: bondingCurveRouterAbi,
  functionName: "create",
  args: [createArgs],
  account: account.address,
  value: deployFeeAmount + initialBuyAmount,
})

const hash = await walletClient.writeContract({
  address: CONFIG.BONDING_CURVE_ROUTER,
  abi: bondingCurveRouterAbi,
  functionName: "create",
  args: [createArgs],
  account,
  chain,
  value: deployFeeAmount + initialBuyAmount,
  gas: estimatedGas + estimatedGas / 10n, // +10% buffer
})

// Get token address from event
const receipt = await publicClient.waitForTransactionReceipt({ hash })
for (const log of receipt.logs) {
  try {
    const event = decodeEventLog({ abi: curveAbi, data: log.data, topics: log.topics })
    if (event.eventName === "CurveCreate") {
      const { token: tokenAddress, pool: poolAddress } = event.args
      break
    }
  } catch {}
}
```

## Fee Config

Fetch once and cache. Rarely changes - retry once on failure.

```typescript
const feeConfig = await publicClient.readContract({
  address: CONFIG.CURVE,
  abi: curveAbi,
  functionName: "feeConfig",
})
const deployFeeAmount = feeConfig[0]
const protocolFeeRate = feeConfig[2]
```

## Creator Rewards - Claiming

Token creators earn fees from trading. Claim via CreatorTreasury contract.

**Contract Addresses**:

- Testnet: `0x24dFf9B68fA36f8400302e2babC3e049eA19459E`
- Mainnet: `0x42e75B4B96d7000E7Da1e0c729Cec8d2049B9731`

### Check Claimable Rewards

```typescript
const result = await fetch(`${CONFIG.apiUrl}/agent/token/created/${accountAddress}`, { headers })
const { tokens } = await result.json()

for (const token of tokens) {
  const unclaimed = BigInt(token.reward_info.amount) - BigInt(token.reward_info.claimed_amount)
  if (token.reward_info.claimable && unclaimed > 0n) {
    // Has claimable rewards
  }
}
```

### Claim Rewards

```typescript
const tokens: Address[] = []
const amounts: bigint[] = []
const proofs: Hex[][] = []

for (const token of claimableTokens) {
  tokens.push(token.token_info.token_id)
  amounts.push(BigInt(token.reward_info.amount) - BigInt(token.reward_info.claimed_amount))
  proofs.push(token.reward_info.proof)
}

const hash = await walletClient.writeContract({
  address: CREATOR_TREASURY,
  abi: creatorTreasuryAbi,
  functionName: "claim",
  args: [tokens, amounts, proofs],
})
```

## Error Reference

| Error                | Cause                       | Fix                                                  |
| -------------------- | --------------------------- | ---------------------------------------------------- |
| `InsufficientFee`    | value < deployFeeAmount     | Ensure `value >= deployFeeAmount + initialBuyAmount` |
| `InvalidName/Symbol` | Empty or invalid            | Use non-empty strings, < 32 chars                    |
| HTTP 400             | Invalid image/missing field | Check format and required fields                     |
| HTTP 413             | Image too large             | Keep < 5MB                                           |

## Type Definitions

```typescript
interface CreateTokenParams {
  name: string
  symbol: string
  tokenURI: string
  amountOut: bigint
  salt: `0x${string}`
  actionId: number // Always 1
}

interface CreateTokenResult {
  tokenAddress: Address
  poolAddress: Address
  transactionHash: Hex
  imageUri: string
  metadataUri: string
  salt: `0x${string}`
  isNsfw: boolean
}
```
