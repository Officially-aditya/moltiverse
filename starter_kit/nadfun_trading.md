# TRADING Skill - Buy, Sell, Permit

Complete viem-only trading for nad.fun bonding curve and DEX.

> **Setup**: See `nadfun_skill.md` for network config and client setup.

## Network Config

| Network | LENS                                       | BONDING_CURVE_ROUTER                       | DEX_ROUTER                                 |
| ------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| Testnet | 0xB056d79CA5257589692699a46623F901a3BB76f1 | 0x865054F0F6A288adaAc30261731361EA7E908003 | 0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2 |
| Mainnet | 0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea | 0x6F6B8F1a20703309951a5127c45B49b1CD981A22 | 0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137 |

## 1. Buy

Purchase tokens with MON.

```typescript
// 1. Get quote
const [router, amountOut] = await publicClient.readContract({
  address: CONFIG.LENS,
  abi: lensAbi,
  functionName: "getAmountOut",
  args: [tokenAddress, parseEther(monAmount), true],
})

// 2. Calculate slippage (1%)
const amountOutMin = (amountOut * 99n) / 100n
const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

// 3. Execute
const callData = encodeFunctionData({
  abi: routerAbi,
  functionName: "buy",
  args: [{ amountOutMin, token: tokenAddress, to: account.address, deadline }],
})

const hash = await walletClient.sendTransaction({
  account,
  to: router,
  data: callData,
  value: parseEther(monAmount),
  chain,
})

await publicClient.waitForTransactionReceipt({ hash })
```

**Buy Params**: `amountOutMin`, `token`, `to`, `deadline`

## 2. Sell

Sell tokens for MON (requires approve first).

```typescript
// 1. Get balance
const balance = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [account.address],
})

// 2. Get quote
const [router, amountOut] = await publicClient.readContract({
  address: CONFIG.LENS,
  abi: lensAbi,
  functionName: "getAmountOut",
  args: [tokenAddress, balance, false],
})

// 3. Approve
await walletClient.writeContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: "approve",
  args: [router, balance],
  account,
  chain,
})

// 4. Execute sell
const amountOutMin = (amountOut * 99n) / 100n
const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

const callData = encodeFunctionData({
  abi: routerAbi,
  functionName: "sell",
  args: [{ amountIn: balance, amountOutMin, token: tokenAddress, to: account.address, deadline }],
})

const hash = await walletClient.sendTransaction({ account, to: router, data: callData, chain })
await publicClient.waitForTransactionReceipt({ hash })
```

**Sell Params**: `amountIn`, `amountOutMin`, `token`, `to`, `deadline`

## 3. Sell with Permit

Single-tx sell using EIP-2612 permit (no separate approve).

```typescript
// 1. Get balance & quote
const balance = await publicClient.readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [account.address],
})
const [router, amountOut] = await publicClient.readContract({
  address: CONFIG.LENS,
  abi: lensAbi,
  functionName: "getAmountOut",
  args: [tokenAddress, balance, false],
})

// 2. Get nonce
const nonce = await publicClient.readContract({
  address: tokenAddress,
  abi: [
    {
      name: "nonces",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "owner", type: "address" }],
      outputs: [{ type: "uint256" }],
    },
  ],
  functionName: "nonces",
  args: [account.address],
})

// 3. Get token name for domain
const tokenName = await publicClient.readContract({
  address: tokenAddress,
  abi: [
    {
      name: "name",
      type: "function",
      inputs: [],
      outputs: [{ type: "string" }],
      stateMutability: "view",
    },
  ],
  functionName: "name",
})

// 4. Sign permit
const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)
const signature = await walletClient.signTypedData({
  account,
  domain: { name: tokenName, version: "1", chainId: chain.id, verifyingContract: tokenAddress },
  types: {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "Permit",
  message: { owner: account.address, spender: router, value: balance, nonce, deadline },
})

// 5. Parse signature
const r = `0x${signature.slice(2, 66)}` as `0x${string}`
const s = `0x${signature.slice(66, 130)}` as `0x${string}`
const v = parseInt(signature.slice(130, 132), 16) as 27 | 28

// 6. Execute sellPermit
const amountOutMin = (amountOut * 99n) / 100n
const callData = encodeFunctionData({
  abi: routerAbi,
  functionName: "sellPermit",
  args: [
    {
      amountIn: balance,
      amountOutMin,
      amountAllowance: balance,
      token: tokenAddress,
      to: account.address,
      deadline,
      v,
      r,
      s,
    },
  ],
})

const hash = await walletClient.sendTransaction({ account, to: router, data: callData, chain })
await publicClient.waitForTransactionReceipt({ hash })
```

## Slippage Calculation

```typescript
function calculateSlippage(amountOut: bigint, slippageBps: bigint): bigint {
  return (amountOut * (10000n - slippageBps)) / 10000n
}

// Examples: 50 bps = 0.5%, 100 bps = 1%, 200 bps = 2%
const min = calculateSlippage(amountOut, 100n) // 1% slippage
```

## Type Definitions

```typescript
interface BuyParams {
  token: `0x${string}`
  amountOutMin: bigint
  to: `0x${string}`
  deadline: bigint
}

interface SellParams {
  token: `0x${string}`
  amountIn: bigint
  amountOutMin: bigint
  to: `0x${string}`
  deadline: bigint
}

interface SellPermitParams extends SellParams {
  amountAllowance: bigint
  v: 27 | 28
  r: `0x${string}`
  s: `0x${string}`
}

interface PermitSignature {
  v: 27 | 28
  r: `0x${string}`
  s: `0x${string}`
  nonce: bigint
}
```

## Error Handling

| Error                   | Cause                     | Fix                                |
| ----------------------- | ------------------------- | ---------------------------------- |
| `DeadlineExpired`       | Transaction took too long | Extend deadline or retry           |
| `InsufficientAmountOut` | Slippage exceeded         | Increase slippage tolerance        |
| `InsufficientMon`       | Low balance               | Check balance                      |
| `InvalidAllowance`      | Missing approve           | Call approve first (or use permit) |
