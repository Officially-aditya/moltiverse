/**
 * DIVI Token Deployment Script
 *
 * Deploys the DIVI token on nad.fun bonding curve (Monad blockchain).
 * Run once: node token/deploy.js
 *
 * Required env vars:
 *   PRIVATE_KEY     - Monad wallet private key (with ~10 MON)
 *   MONAD_NETWORK   - 'testnet' or 'mainnet' (default: mainnet)
 *   NAD_API_KEY     - Optional nad.fun API key (100 req/min vs 10)
 *   INITIAL_BUY_MON - Optional initial buy amount in MON (default: 0)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { CONFIG, DIVI_TOKEN, MONAD_CHAIN, ABIS } = require('./config');

// Dynamic import for viem (ESM module)
async function loadViem() {
  const viem = await import('viem');
  const accounts = await import('viem/accounts');
  return { ...viem, ...accounts };
}

async function deploy() {
  console.log('=== DIVI Token Deployment ===');
  console.log(`Network: ${process.env.MONAD_NETWORK || 'mainnet'}`);
  console.log(`API URL: ${CONFIG.apiUrl}`);
  console.log('');

  if (!process.env.PRIVATE_KEY) {
    console.error('ERROR: PRIVATE_KEY not set in .env');
    console.error('Add your Monad wallet private key to deploy DIVI token.');
    process.exit(1);
  }

  const viem = await loadViem();
  const account = viem.privateKeyToAccount(process.env.PRIVATE_KEY);
  console.log(`Deployer: ${account.address}`);

  const publicClient = viem.createPublicClient({
    chain: MONAD_CHAIN,
    transport: viem.http(CONFIG.rpcUrl)
  });

  const walletClient = viem.createWalletClient({
    account,
    chain: MONAD_CHAIN,
    transport: viem.http(CONFIG.rpcUrl)
  });

  const headers = {};
  if (process.env.NAD_API_KEY) {
    headers['X-API-Key'] = process.env.NAD_API_KEY;
  }

  // Step 1: Upload image
  console.log('Step 1/4: Uploading DIVI logo...');
  const imagePath = path.join(__dirname, '..', 'divi-logo.png');
  if (!fs.existsSync(imagePath)) {
    console.error(`ERROR: divi-logo.png not found at ${imagePath}`);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const imageRes = await fetch(`${CONFIG.apiUrl}/agent/token/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png', ...headers },
    body: imageBuffer
  });

  if (!imageRes.ok) {
    console.error('Image upload failed:', await imageRes.text());
    process.exit(1);
  }

  const { image_uri, is_nsfw } = await imageRes.json();
  console.log(`   Image URI: ${image_uri}`);
  if (is_nsfw) console.warn('   WARNING: Image flagged as NSFW');

  // Step 2: Upload metadata
  console.log('Step 2/4: Uploading metadata...');
  const metadataRes = await fetch(`${CONFIG.apiUrl}/agent/token/metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      image_uri,
      name: DIVI_TOKEN.name,
      symbol: DIVI_TOKEN.symbol,
      description: DIVI_TOKEN.description,
      website: DIVI_TOKEN.website,
      twitter: DIVI_TOKEN.twitter || undefined,
      telegram: DIVI_TOKEN.telegram || undefined
    })
  });

  if (!metadataRes.ok) {
    console.error('Metadata upload failed:', await metadataRes.text());
    process.exit(1);
  }

  const { metadata_uri } = await metadataRes.json();
  console.log(`   Metadata URI: ${metadata_uri}`);

  // Step 3: Mine salt
  console.log('Step 3/4: Mining salt...');
  const saltRes = await fetch(`${CONFIG.apiUrl}/agent/salt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      creator: account.address,
      name: DIVI_TOKEN.name,
      symbol: DIVI_TOKEN.symbol,
      metadata_uri
    })
  });

  if (!saltRes.ok) {
    console.error('Salt mining failed:', await saltRes.text());
    process.exit(1);
  }

  const { salt, address: predictedAddress } = await saltRes.json();
  console.log(`   Salt: ${salt}`);
  console.log(`   Predicted address: ${predictedAddress}`);

  // Step 4: Create on-chain
  console.log('Step 4/4: Creating token on-chain...');

  // Get deploy fee
  const feeConfig = await publicClient.readContract({
    address: CONFIG.CURVE,
    abi: ABIS.curve,
    functionName: 'feeConfig'
  });
  const deployFee = feeConfig[0];
  console.log(`   Deploy fee: ${viem.formatEther(deployFee)} MON`);

  // Optional initial buy
  const initialBuyMon = process.env.INITIAL_BUY_MON || '0';
  const initialBuyAmount = viem.parseEther(initialBuyMon);
  let minTokens = 0n;

  if (initialBuyAmount > 0n) {
    minTokens = await publicClient.readContract({
      address: CONFIG.LENS,
      abi: ABIS.lens,
      functionName: 'getInitialBuyAmountOut',
      args: [initialBuyAmount]
    });
    console.log(`   Initial buy: ${initialBuyMon} MON -> ~${viem.formatEther(minTokens)} DIVI`);
  }

  const totalValue = deployFee + initialBuyAmount;
  console.log(`   Total cost: ${viem.formatEther(totalValue)} MON`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  if (balance < totalValue) {
    console.error(`   ERROR: Insufficient balance. Have ${viem.formatEther(balance)} MON, need ${viem.formatEther(totalValue)} MON`);
    process.exit(1);
  }

  const createArgs = {
    name: DIVI_TOKEN.name,
    symbol: DIVI_TOKEN.symbol,
    tokenURI: metadata_uri,
    amountOut: minTokens,
    salt: salt,
    actionId: 1
  };

  // Estimate gas
  const estimatedGas = await publicClient.estimateContractGas({
    address: CONFIG.BONDING_CURVE_ROUTER,
    abi: ABIS.bondingCurveRouter,
    functionName: 'create',
    args: [createArgs],
    account: account.address,
    value: totalValue
  });

  console.log(`   Estimated gas: ${estimatedGas}`);

  // Send transaction
  const hash = await walletClient.writeContract({
    address: CONFIG.BONDING_CURVE_ROUTER,
    abi: ABIS.bondingCurveRouter,
    functionName: 'create',
    args: [createArgs],
    account,
    chain: MONAD_CHAIN,
    value: totalValue,
    gas: estimatedGas + estimatedGas / 10n // +10% buffer
  });

  console.log(`   TX hash: ${hash}`);
  console.log('   Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`   Confirmed in block ${receipt.blockNumber}`);

  // Extract token address from CurveCreate event
  let tokenAddress = predictedAddress;
  for (const log of receipt.logs) {
    try {
      const event = viem.decodeEventLog({
        abi: ABIS.curve,
        data: log.data,
        topics: log.topics
      });
      if (event.eventName === 'CurveCreate') {
        tokenAddress = event.args.token;
        break;
      }
    } catch {}
  }

  console.log('');
  console.log('=== DEPLOYMENT COMPLETE ===');
  console.log(`Token Address: ${tokenAddress}`);
  console.log(`TX Hash:       ${hash}`);
  console.log(`Block:         ${receipt.blockNumber}`);
  console.log('');
  console.log('Add this to your .env file:');
  console.log(`DIVI_TOKEN_ADDRESS=${tokenAddress}`);
  console.log('');
  console.log(`View on nad.fun: ${CONFIG.apiUrl.replace('api.nadapp.net', 'nad.fun').replace('dev-api.nad.fun', 'testnet.nad.fun')}/token/${tokenAddress}`);

  // Save deployment info
  const deploymentInfo = {
    tokenAddress,
    txHash: hash,
    blockNumber: Number(receipt.blockNumber),
    network: process.env.MONAD_NETWORK || 'mainnet',
    deployer: account.address,
    imageUri: image_uri,
    metadataUri: metadata_uri,
    salt,
    deployedAt: new Date().toISOString()
  };

  const deploymentPath = path.join(__dirname, '..', 'data', 'deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to ${deploymentPath}`);

  return deploymentInfo;
}

// Run if called directly
if (require.main === module) {
  deploy().catch(err => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
}

module.exports = { deploy };
