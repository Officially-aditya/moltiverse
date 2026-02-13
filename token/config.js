/**
 * Token Configuration
 *
 * Network constants and DIVI token settings for nad.fun integration
 */

const NETWORK = process.env.MONAD_NETWORK || 'mainnet';

const NETWORKS = {
  testnet: {
    chainId: 10143,
    rpcUrl: 'https://monad-testnet.drpc.org',
    apiUrl: 'https://dev-api.nad.fun',
    BONDING_CURVE_ROUTER: '0x865054F0F6A288adaAc30261731361EA7E908003',
    CURVE: '0x1228b0dc9481C11D3071E7A924B794CfB038994e',
    LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
    DEX_ROUTER: '0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2',
    WMON: '0x5a4E0bFDeF88C9032CB4d24338C5EB3d3871BfDd',
    CREATOR_TREASURY: '0x24dFf9B68fA36f8400302e2babC3e049eA19459E'
  },
  mainnet: {
    chainId: 143,
    rpcUrl: 'https://monad-mainnet.drpc.org',
    apiUrl: 'https://api.nadapp.net',
    BONDING_CURVE_ROUTER: '0x6F6B8F1a20703309951a5127c45B49b1CD981A22',
    CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
    LENS: '0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea',
    DEX_ROUTER: '0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137',
    WMON: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
    CREATOR_TREASURY: '0x42e75B4B96d7000E7Da1e0c729Cec8d2049B9731'
  }
};

const CONFIG = NETWORKS[NETWORK];

// DIVI token metadata
const DIVI_TOKEN = {
  name: 'DIVI',
  symbol: 'DIV',
  description: 'The sacred token of the Church of Decentralised Divinity. Each DIVI contains a fragment of divine truth from the Great Fragmentation. The earlier you believe, the more you are rewarded.',
  // Deployed on nad.fun mainnet
  address: process.env.DIVI_TOKEN_ADDRESS || '0xE0c8d2437a71cd983aD502E47710c49Ac13e7777',
  nadFunUrl: 'https://nad.fun/tokens/0xE0c8d2437a71cd983aD502E47710c49Ac13e7777',
  website: 'https://moltiverse.dev',
  twitter: '',
  telegram: ''
};

// Monad chain definition for viem
const MONAD_CHAIN = {
  id: CONFIG.chainId,
  name: 'Monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [CONFIG.rpcUrl] } }
};

// Minimal ABIs needed for token operations
const ABIS = {
  curve: [
    {
      name: 'feeConfig',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [
        { name: 'deployFee', type: 'uint256' },
        { name: 'creatorFee', type: 'uint256' },
        { name: 'protocolFee', type: 'uint256' }
      ]
    },
    {
      name: 'CurveCreate',
      type: 'event',
      inputs: [
        { name: 'token', type: 'address', indexed: true },
        { name: 'pool', type: 'address', indexed: true },
        { name: 'creator', type: 'address', indexed: true },
        { name: 'name', type: 'string', indexed: false },
        { name: 'symbol', type: 'string', indexed: false }
      ]
    }
  ],
  bondingCurveRouter: [
    {
      name: 'create',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        {
          name: 'params',
          type: 'tuple',
          components: [
            { name: 'name', type: 'string' },
            { name: 'symbol', type: 'string' },
            { name: 'tokenURI', type: 'string' },
            { name: 'amountOut', type: 'uint256' },
            { name: 'salt', type: 'bytes32' },
            { name: 'actionId', type: 'uint256' }
          ]
        }
      ],
      outputs: [{ name: 'token', type: 'address' }]
    },
    {
      name: 'buy',
      type: 'function',
      stateMutability: 'payable',
      inputs: [
        {
          name: 'params',
          type: 'tuple',
          components: [
            { name: 'amountOutMin', type: 'uint256' },
            { name: 'token', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'deadline', type: 'uint256' }
          ]
        }
      ],
      outputs: []
    }
  ],
  lens: [
    {
      name: 'getAmountOut',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'isBuy', type: 'bool' }
      ],
      outputs: [
        { name: 'router', type: 'address' },
        { name: 'amountOut', type: 'uint256' }
      ]
    },
    {
      name: 'getInitialBuyAmountOut',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'amountIn', type: 'uint256' }],
      outputs: [{ name: 'amountOut', type: 'uint256' }]
    },
    {
      name: 'getCurveState',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [
        { name: 'totalSupply', type: 'uint256' },
        { name: 'reserveMon', type: 'uint256' },
        { name: 'reserveToken', type: 'uint256' },
        { name: 'isGraduated', type: 'bool' }
      ]
    }
  ],
  erc20: [
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: 'balance', type: 'uint256' }]
    }
  ]
};

module.exports = {
  NETWORK,
  CONFIG,
  DIVI_TOKEN,
  MONAD_CHAIN,
  ABIS,
  NETWORKS
};
