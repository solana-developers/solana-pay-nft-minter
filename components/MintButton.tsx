import { useState } from "react";
import { Button } from "@chakra-ui/react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
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
import useToastHook from "@/hooks/useToastHook";
import { getRandomUri } from "@/utils/utils";

export default function MintButton() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);

  const displayToast = useToastHook();

  const onClick = async () => {
    if (!publicKey) return;

    setIsLoading(true);

    try {
      // Generate keypair to use as address of token account
      const mintKeypair = Keypair.generate();
      // Calculate minimum lamports for space required by mint account
      const lamportsForMintAccount = await getMinimumBalanceForRentExemptMint(
        connection
      );

      // 1) Instruction to create new account with space for new mint account
      const createMintAccountInstruction = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: lamportsForMintAccount,
        programId: TOKEN_PROGRAM_ID,
      });

      // 2) Instruction to initialize mint account
      const initializeMintInstruction = createInitializeMint2Instruction(
        mintKeypair.publicKey,
        0, // decimals
        publicKey, // mint authority
        null // freeze authority
      );

      // Get associated token account address
      const associatedTokenAccountAddress = getAssociatedTokenAddressSync(
        mintKeypair.publicKey, // mint address
        publicKey // token account owner
      );

      // 3) Instruction to create associated token account
      const createTokenAccountInstruction =
        createAssociatedTokenAccountInstruction(
          publicKey, // payer
          associatedTokenAccountAddress, // token account address
          publicKey, // owner
          mintKeypair.publicKey // mint address
        );

      // 4) Instruction to mint token to associated token account
      const mintTokenInstruction = createMintToInstruction(
        mintKeypair.publicKey, // mint address
        associatedTokenAccountAddress, // destination
        publicKey, // mint authority
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
        name: "OPOS",
        symbol: "OPOS",
        uri: getRandomUri(),
      };

      // 5) Instruction to create the Metadata account for the Mint Account
      const createMetadataInstruction =
        createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataAccountAddress,
            mint: mintKeypair.publicKey,
            mintAuthority: publicKey,
            payer: publicKey,
            updateAuthority: publicKey,
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

      // Create new transaction and add instructions
      const transaction = new Transaction().add(
        createMintAccountInstruction,
        initializeMintInstruction,
        createTokenAccountInstruction,
        mintTokenInstruction,
        createMetadataInstruction
      );

      const transactionSignature = await sendTransaction(
        transaction,
        connection,
        {
          signers: [mintKeypair],
        }
      );

      displayToast(transactionSignature);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={onClick} isLoading={isLoading} isDisabled={!publicKey}>
      Mint NFT
    </Button>
  );
}
