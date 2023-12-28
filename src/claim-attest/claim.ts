import path from "path";
import dotenv from "dotenv";
import { Raw } from "@zcloak/vc";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { initCrypto } from "@zcloak/crypto";
import { encryptMessage } from "@zcloak/message";

import type { CType } from "@zcloak/ctype/types";
import type { DidUrl } from "@zcloak/did-resolver/types";

import { resolver } from "../utils/resolverHelper";
import { getCtypeFromHash } from "../utils/ctypeHelper";
import { fromDidDocument } from "@zcloak/did/did/helpers";
import { sendMessage2Server } from "../utils/messageHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const holderDidUrl =
  "did:zk:0xE5b8641d32a434BF3B5E6Ea6AFfdA1B56c558eea" as DidUrl;
const attesterDidUrl =
  "did:zk:0xB16FEfFaED0630F4C580a58ae0349C68609A6fDc" as DidUrl;

// =====> Simulate CLAIM full process <=====
(async () => {
  // init crypto for wasm
  await initCrypto();

  // get holder DID from mnemonic (we need claimer's private key)
  const keyring = new Keyring();
  const holder = keys.fromMnemonic(
    keyring,
    process.env.CLAIMER_MNEMONIC as string,
    "ecdsa"
  );

  // get attester url from DidDocument (We only need attester's public key)
  const attesterDidDoc = await resolver.resolve(attesterDidUrl);
  const attester = fromDidDocument(attesterDidDoc);

  // Step 0: import ctype hash to construct ctype object
  const ctype: CType = await getCtypeFromHash(process.env.CTYPEHASH);

  // Step 1: claimer build raw and raw credential
  // Note: If the use case for VC does not involve zk computation,
  //       it is recommended to use the Keccak256 hashing method for Raw hashType.
  //       Otherwise, it is advisable to use the RescuePrimeOptimized method.
  const raw = new Raw({
    contents: {
      id: 9870456,
      name: "vss-claimer",
    },
    owner: holderDidUrl,
    ctype: ctype,
    hashType: "Keccak256",
  });
  const rawCredential = raw.toRawCredential("Keccak256");

  // Step 2: encrypt Request_Attestation message
  const message = await encryptMessage(
    "Request_Attestation",
    rawCredential,
    holder,
    attester.getKeyUrl("keyAgreement"),
    undefined,
    resolver
  );

  // Step 3: send encrypted message to server
  // 'message' => server => attester
  await sendMessage2Server(message);
})();
