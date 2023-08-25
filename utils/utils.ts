// Off-chain metadata
const uris = [
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/Climate/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/ClosedCube/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/CompressedCoil/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/CompressedNFT/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/Consensus/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperToolkit/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/GlobalPayments/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/OpenCube/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/ParallelTransactions/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/SagaPhone/metadata.json",
  "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/Security/metadata.json",
];

// Select a random URI from the list
export function getRandomUri() {
  const randomIndex = Math.floor(Math.random() * uris.length);
  return uris[randomIndex];
}
