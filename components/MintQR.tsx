import { useEffect, useMemo, useRef } from "react";
import { Flex } from "@chakra-ui/react";
import {
  createQR,
  encodeURL,
  TransactionRequestURLFields,
  findReference,
  FindReferenceError,
} from "@solana/pay";
import { Keypair } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import useToastHook from "@/hooks/useToastHook";

export default function MintQR() {
  const { connection } = useConnection();
  const qrRef = useRef<HTMLDivElement>(null);

  const reference = useMemo(() => Keypair.generate().publicKey, []);
  const mostRecentNotifiedTransaction = useRef<string | undefined>(undefined);

  const displayToast = useToastHook();

  useEffect(() => {
    const { location } = window;
    const apiUrl = `${location.protocol}//${
      location.host
    }/api/transaction?reference=${reference.toBase58()}`;

    const urlParams: TransactionRequestURLFields = {
      link: new URL(apiUrl),
    };

    console.log("urlParams:", urlParams);

    const solanaUrl = encodeURL(urlParams);
    const qr = createQR(solanaUrl, 512, "transparent");
    qr.update({ backgroundOptions: { round: 1000 } });
    if (qrRef.current) {
      qrRef.current.innerHTML = "";
      qr.append(qrRef.current);
    }
  }, [reference]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        const signatureInfo = await findReference(connection, reference, {
          until: mostRecentNotifiedTransaction.current,
        });
        displayToast(signatureInfo.signature);
        mostRecentNotifiedTransaction.current = signatureInfo.signature;
        console.log("Transaction confirmed", signatureInfo);
      } catch (e) {
        if (e instanceof FindReferenceError) {
          // No transaction found yet, ignore this error
          return;
        }
        console.error("Unknown error", e);
      }
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, [reference]);

  return <Flex ref={qrRef} />;
}
