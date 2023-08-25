# Solana Pay NFT Minter

This repo is intended to provide a minimal example of how to use [Solana Pay](https://docs.solanapay.com/) transaction requests to mint NFTs on Solana.

- **Solana Pay Transaction Request**: The Solana Pay transaction request implementation can be found in [`./pages/api/mintNft.ts`](./pages/api/mintNft.ts).
- **Solana Pay QR Code**: The implementation for generating a Solana Pay QR code is located in [`./components/MintQR.tsx`](./components/MintQR.tsx).
- **Solana Wallet-Adapter Example**: For comparison, an example of minting NFTs using the Solana wallet-adapter is available in [`./components/MintButton.tsx`](./components/MintButton.tsx).

Here is the [Devnet Demo](https://solana-pay-nft-minter.vercel.app/). To mint, ensure that your Devnet wallet is funded with Devnet SOL.

![SolanaPayNFTMinter](https://github.com/ZYJLiu/solana-pay-nft-minter/assets/75003086/6a85c9ad-922a-496a-8d49-a74e80b09959)

## Getting Started

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Installation

```bash
npm install
# or
yarn install
```

## Build and Run

Next, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scanning QR codes

Solana Pay only works with https URLs, so you won't be able to scan QR codes from a `http://localhost` or `http://192.168...` domain with a wallet.

The easiest way in dev is to use [ngrok](https://ngrok.com). Once you install it you'll be able to run `ngrok http 3000` to get your app running on an https ngrok subdomain. Visiting that subdomain will be identical to your localhost, including hot reloading. But because it's public and https, you'll be able to scan Solana Pay QR codes with any compatible wallet.

## Reference

The `reference` in Solana Pay refers to a unique public key that is included as an account in a transaction, so that we can listen for a transaction including it. It doesn't affect the behavior of the transaction, and is neither a signer nor writeable.

When we create a transaction request QR code we don't know what transaction is going to be created. The API can return any transaction, and can for example choose to return different transactions based on the user requesting the transaction.

We can use the `findReference` function to find a transaction on-chain with the given reference. This allows us to display the QR code on one device, scan it and sign/send the transaction in a wallet on a different device/network, and detect it on the device displaying the QR code (or anywhere else) immediately, without knowing anything about the transaction beforehand - except that it will include the `reference`.

An example of listens for transactions with a given reference can be found in [`./components/MintQR.tsx`](./components/MintQR.)
