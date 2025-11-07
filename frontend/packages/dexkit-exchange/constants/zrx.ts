export const ZEROEX_AFFILIATE_ADDRESS =
  "0x5bD68B4d6f90Bcc9F3a9456791c0Db5A43df676d";

export const ZRX_EXCHANGE_ABI = [
  {
    inputs: [
      {
        name: "order",
        type: "tuple",
        components: [
          {
            name: "makerToken",
            type: "address",
          },
          {
            name: "takerToken",
            type: "address",
          },
          {
            name: "makerAmount",
            type: "uint128",
          },
          {
            name: "takerAmount",
            type: "uint128",
          },
          {
            name: "takerTokenFeeAmount",
            type: "uint128",
          },
          {
            name: "maker",
            type: "address",
          },
          {
            name: "taker",
            type: "address",
          },
          {
            name: "sender",
            type: "address",
          },
          {
            name: "feeRecipient",
            type: "address",
          },
          {
            name: "pool",
            type: "bytes32",
          },
          {
            name: "expiry",
            type: "uint64",
          },
          {
            name: "salt",
            type: "uint256",
          },
        ],
      },
    ],
    name: "cancelLimitOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "contract IERC20Token",
            name: "makerToken",
            type: "address",
          },
          {
            internalType: "contract IERC20Token",
            name: "takerToken",
            type: "address",
          },
          { internalType: "uint128", name: "makerAmount", type: "uint128" },
          { internalType: "uint128", name: "takerAmount", type: "uint128" },
          {
            internalType: "uint128",
            name: "takerTokenFeeAmount",
            type: "uint128",
          },
          { internalType: "address", name: "maker", type: "address" },
          { internalType: "address", name: "taker", type: "address" },
          { internalType: "address", name: "sender", type: "address" },
          { internalType: "address", name: "feeRecipient", type: "address" },
          { internalType: "bytes32", name: "pool", type: "bytes32" },
          { internalType: "uint64", name: "expiry", type: "uint64" },
          { internalType: "uint256", name: "salt", type: "uint256" },
        ],
        internalType: "struct LibNativeOrder.LimitOrder",
        name: "order",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "enum LibSignature.SignatureType",
            name: "signatureType",
            type: "uint8",
          },
          { internalType: "uint8", name: "v", type: "uint8" },
          { internalType: "bytes32", name: "r", type: "bytes32" },
          { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        internalType: "struct LibSignature.Signature",
        name: "signature",
        type: "tuple",
      },
      {
        internalType: "uint128",
        name: "takerTokenFillAmount",
        type: "uint128",
      },
    ],
    name: "fillLimitOrder",
    outputs: [
      {
        internalType: "uint128",
        name: "takerTokenFilledAmount",
        type: "uint128",
      },
      {
        internalType: "uint128",
        name: "makerTokenFilledAmount",
        type: "uint128",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
];
