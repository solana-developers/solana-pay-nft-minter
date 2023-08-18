// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import {
  PROGRAM_ID as METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

type GetResponse = {
  label: string;
  icon: string;
};

type PostRequest = {
  account: string;
};

type PostResponse = {
  transaction: string;
  message: string;
};

type PostError = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | PostResponse | PostError>
) {
  if (req.method === "GET") {
    return get(res);
  } else if (req.method === "POST") {
    return await post(req, res);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}

function get(res: NextApiResponse<GetResponse>) {
  res.status(200).json({
    label: "NFT Minter",
    icon: "https://solanapay.com/src/img/branding/Solanapay.com/downloads/gradient.svg",
  });
}

async function post(
  req: NextApiRequest,
  res: NextApiResponse<PostResponse | PostError>
) {
  const { account } = req.body as PostRequest;
  const { reference } = req.query;

  if (!account || !reference) {
    res.status(400).json({
      error: "Required data missing. Account or reference not provided.",
    });
    return;
  }

  try {
    const transaction = await buildTransaction(
      new PublicKey(account),
      new PublicKey(reference)
    );
    res.status(200).json({
      transaction,
      message: "Confirm to Mint NFT",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating transaction" });
    return;
  }
}

async function buildTransaction(account: PublicKey, reference: PublicKey) {
  // Connect to devnet cluster
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Generate keypair to use as address of token account
  const mintKeypair = Keypair.generate();

  // Calculate minimum lamports for space required by mint account
  const lamportsForMintAccount = await getMinimumBalanceForRentExemptMint(
    connection
  );

  // 1) Instruction to create new account with space for new mint account
  const createMintAccountInstruction = SystemProgram.createAccount({
    fromPubkey: account,
    newAccountPubkey: mintKeypair.publicKey,
    space: MINT_SIZE,
    lamports: lamportsForMintAccount,
    programId: TOKEN_PROGRAM_ID,
  });

  // 2) Instruction to initialize mint account
  const initializeMintInstruction = createInitializeMint2Instruction(
    mintKeypair.publicKey,
    0, // decimals
    account, // mint authority
    account // freeze authority
  );

  // Get associated token account address
  const associatedTokenAccountAddress = getAssociatedTokenAddressSync(
    mintKeypair.publicKey, // mint address
    account // token account owner
  );

  // 3) Instruction to create associated token account
  const createTokenAccountInstruction = createAssociatedTokenAccountInstruction(
    account, // payer
    associatedTokenAccountAddress, // token account address
    account, // owner
    mintKeypair.publicKey // mint address
  );

  // 4) Instruction to mint token to associated token account
  const mintTokenInstruction = createMintToInstruction(
    mintKeypair.publicKey, // mint address
    associatedTokenAccountAddress, // destination
    account, // mint authority
    1 // amount
  );

  // Derive the Metadata account address
  const [metadataAccountAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"), // hard-coded string "metadata"
      METADATA_PROGRAM_ID.toBuffer(), // metadata program address
      mintKeypair.publicKey.toBuffer(), // mint address
    ],
    METADATA_PROGRAM_ID
  );

  // Metadata for the Token
  const tokenMetadata = {
    name: "Solana Gold",
    symbol: "GOLDSOL",
    uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json",
  };

  // 5) Instruction to create the Metadata account for the Mint Account
  const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataAccountAddress,
      mint: mintKeypair.publicKey,
      mintAuthority: account,
      payer: account,
      updateAuthority: account,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          creators: null, // creators of the NFT
          name: tokenMetadata.name,
          symbol: tokenMetadata.symbol,
          uri: tokenMetadata.uri,
          sellerFeeBasisPoints: 0, // royalty fee for NFTs
          collection: null,
          uses: null,
        },
        collectionDetails: null,
        isMutable: false, // whether the metadata can be changed
      },
    }
  );

  // Add the reference address to an instruction
  // Used in client to find the transaction once sent
  createMintAccountInstruction.keys.push({
    pubkey: reference,
    isSigner: false,
    isWritable: false,
  });

  const latestBlockhash = await connection.getLatestBlockhash();

  // create new Transaction and add instruction
  const transaction = new Transaction({
    feePayer: account,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(
    createMintAccountInstruction,
    initializeMintInstruction,
    createTokenAccountInstruction,
    mintTokenInstruction,
    createMetadataInstruction
  );

  transaction.sign(mintKeypair);

  return transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");
}
