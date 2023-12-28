import path from "path";
import dotenv from "dotenv";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { addProof } from "@zcloak/verify";
import { initCrypto } from "@zcloak/crypto";
import { VerifiableCredentialBuilder } from "@zcloak/vc";
import { decryptMessage, encryptMessage } from "@zcloak/message";

import type { RawCredential } from "@zcloak/vc/types";
import type { VerifiableCredential } from "@zcloak/vc/types";

import { resolver } from "../utils/resolverHelper";
import { getMessage } from "../utils/messageHelper";
import { getCtypeFromHash } from "../utils/ctypeHelper";
import { fromDidDocument } from "@zcloak/did/did/helpers";
import { sendMessage2Server } from "../utils/messageHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const holderDidUrl = "did:zk:0xE5b8641d32a434BF3B5E6Ea6AFfdA1B56c558eea";

(async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  // Build claimer and attester DID
  // Get holder DID from DidDocument
  // We only need holder's KeyAgreement Public Key to search message
  const holderDidDoc = await resolver.resolve(holderDidUrl);
  const holder = fromDidDocument(holderDidDoc);

  // Get attester DID from mnemonic
  // We need attester's private key to sign signature when approving send credential
  const mnemonic = process.env.ATTESTER_MNEMONIC as string;
  const mnemonic2 = process.env.ATTESTER2_MNEMONIC as string;

  const keyring = new Keyring();
  const attester = keys.fromMnemonic(keyring, mnemonic, "ecdsa");

  const keyring2 = new Keyring();
  const attester2 = keys.fromMnemonic(keyring2, mnemonic2, "ecdsa");

  // Step 0: get message
  const serverMsg = await getMessage(attester, "Request_Attestation");

  // Step 1: decrypt claim message
  // serverMsg array is just for demo use, the details should be based on the actual situation
  const decrypted = await decryptMessage(serverMsg[0], attester);

  // Step 2: get rawCredential from decrypt return value
  const rawCredential: RawCredential = decrypted.data;

  // Step 3: issuer sign a signature to build vcBuilder
  const ctype = await getCtypeFromHash(rawCredential.ctype);
  const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(
    rawCredential,
    ctype
  )
    .setExpirationDate(null)
    .setIssuanceDate(Date.now());

  // Step 4: build vc from vcBuilder
  const vc: VerifiableCredential<false> = await vcBuilder.build(
    attester,
    false
  );

  // Step 5: encrypt vc to message
  const message = await encryptMessage(
    "Extends_Request_Confirmation",
    vc,
    attester,
    attester2.getKeyUrl("keyAgreement")
  );

  // Step 6: send encrypted message to server (attester => attester2)
  await sendMessage2Server(message);

  // Step 7: get message from 'attester'
  const serverMsg2 = await getMessage(
    attester2,
    "Extends_Request_Confirmation"
  );

  // Step 8: decrypt request confirmation message
  const decrypted2 = await decryptMessage(serverMsg2[0], attester2);

  // Step 9: get VerifiableCredential from decrypted return value
  const origin_vc: VerifiableCredential<false> = decrypted2.data;

  // Step 10: attester_2 should review the VC, and attach its signature to the VC
  const multi_attester_vc = await addProof(attester2, origin_vc);

  // Step 11: encrypt vc to message
  const final_message = await encryptMessage(
    "Response_Approve_Attestation",
    multi_attester_vc,
    attester,
    holder.getKeyUrl("keyAgreement"),
    decrypted2.id
  );
  console.log(multi_attester_vc);

  // Step 12: send encrypted message to server (attester2 => holder)
  await sendMessage2Server(final_message);
})();
