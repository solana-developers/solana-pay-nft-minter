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
  createSetAuthorityInstruction,
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
      // Generate keypair to use as address of mint account
      const mintKeypair = Keypair.generate();

      // Calculate minimum lamports for space required by mint account
      const lamportsForMintAccount = await getMinimumBalanceForRentExemptMint(
        connection
      );

      // 1) Instruction to invoke System Program to create new account with space for new mint account
      const createMintAccountInstruction = SystemProgram.createAccount({
        fromPubkey: publicKey, // payer
        newAccountPubkey: mintKeypair.publicKey, // mint account address
        space: MINT_SIZE, // space (in bytes) required by mint account
        lamports: lamportsForMintAccount, // lamports to transfer to mint account
        programId: TOKEN_PROGRAM_ID, // new program owner
      });

      // 2) Instruction to invoke Token Program to initialize mint account
      const initializeMintInstruction = createInitializeMint2Instruction(
        mintKeypair.publicKey, // mint address
        0, // decimals of mint (0 for NFTs)
        publicKey, // mint authority
        null // freeze authority
      );

      // Derive associated token account address from mint address and token account owner
      // This address is a PDA (Program Derived Address) and is generated deterministically
      const associatedTokenAccountAddress = getAssociatedTokenAddressSync(
        mintKeypair.publicKey, // mint address
        publicKey // token account owner
      );

      // 3) Instruction to invoke Associated Token Program to create associated token account
      // The Associated Token Program invokes the Token Program to create the token account with a PDA as the address of the token account
      const createTokenAccountInstruction =
        createAssociatedTokenAccountInstruction(
          publicKey, // payer
          associatedTokenAccountAddress, // associated token account address
          publicKey, // owner
          mintKeypair.publicKey // mint address
        );

      // 4) Instruction to invoke Token Program to mint 1 token to associated token account
      const mintTokenInstruction = createMintToInstruction(
        mintKeypair.publicKey, // mint address
        associatedTokenAccountAddress, // destination
        publicKey, // mint authority
        1 // amount
      );

      // Metadata for the Token
      const tokenMetadata = {
        name: "OPOS",
        symbol: "OPOS",
        uri: getRandomUri(), // random URI (off-chain metadata)
      };

      // Derive the Metadata account address
      const [metadataAccountAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"), // hard-coded string "metadata"
          METADATA_PROGRAM_ID.toBuffer(), // metadata program address
          mintKeypair.publicKey.toBuffer(), // mint address
        ],
        METADATA_PROGRAM_ID // metadata program address
      );

      // 5) Instruction invoke Metaplex Token Metadata Program to create the Metadata account
      const createMetadataInstruction =
        createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataAccountAddress, // metadata account address
            mint: mintKeypair.publicKey, // mint address
            mintAuthority: publicKey, // authority to mint tokens
            payer: publicKey, // payer
            updateAuthority: publicKey, // authority to update metadata account
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                creators: null, // creators of the NFT (optional)
                name: tokenMetadata.name, // on-chain name
                symbol: tokenMetadata.symbol, // on-chain symbol
                uri: tokenMetadata.uri, // off-chain metadata
                sellerFeeBasisPoints: 0, // royalty fee
                collection: null, // collection the NFT belongs to (optional)
                uses: null, // uses (optional)
              },
              collectionDetails: null, // collection details (optional)
              isMutable: false, // whether the metadata can be changed
            },
          }
        );

      // 6) Instruction to invoke Token Program to set mint authority to null
      const setAuthorityInstruction = createSetAuthorityInstruction(
        mintKeypair.publicKey, // mint address
        publicKey, // current authority (mint authority)
        0, // authority type (mint authority)
        null // new authority
      );

      // Create new transaction and add instructions
      const transaction = new Transaction().add(
        // 1) Create mint account
        createMintAccountInstruction,

        // 2) Initialize mint account
        initializeMintInstruction,

        // 3) Create associated token account
        createTokenAccountInstruction,

        // 4) Mint 1 token to associated token account
        mintTokenInstruction,

        // 5) Create metadata account
        createMetadataInstruction,

        // 6) Set mint authority to null
        setAuthorityInstruction
      );

      // Send transaction
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
