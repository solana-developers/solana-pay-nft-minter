import { Box, Flex, VStack, Spacer } from "@chakra-ui/react";
import WalletMultiButton from "@/components/WalletMultiButton";
import MintButton from "@/components/MintButton";
import MintQR from "@/components/MintQR";

export default function Home() {
  return (
    <Box>
      <Flex px={4} py={4}>
        <Spacer />
        <WalletMultiButton />
      </Flex>

      <VStack justifyContent="center">
        <MintButton />
        <MintQR />
      </VStack>
    </Box>
  );
}
