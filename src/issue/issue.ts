import path from "path";
import dotenv from "dotenv";
import { Keyring } from "@zcloak/keyring";
import { restore } from "@zcloak/did/keys";
import { initCrypto } from "@zcloak/crypto";
import { encryptMessage } from "@zcloak/message";
import { Raw, VerifiableCredentialBuilder } from "@zcloak/vc";

import type { CType } from "@zcloak/ctype/types";
import type { RawCredential } from "@zcloak/vc/types";
import type { DidUrl } from "@zcloak/did-resolver/types";
import type { VerifiableCredential } from "@zcloak/vc/types";

import { resolver } from "../utils/resolverHelper";
import { readDidKeysFile } from "../utils/didHelper";
import { getCtypeFromHash } from "../utils/ctypeHelper";
import { fromDidDocument } from "@zcloak/did/did/helpers";
import { sendMessage2Server } from "../utils/messageHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ctypeHash = process.env.CTYPEHASH as string;
const holderDidUrl: DidUrl =
  "did:zk:0xE5b8641d32a434BF3B5E6Ea6AFfdA1B56c558eea";

const issue = async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  // step0: get holder and attester Did obj
  // get holder DID from DidDocument
  // we only need holders's public key to encrypt message
  const holderDidDoc = await resolver.resolve(holderDidUrl);
  const holder = fromDidDocument(holderDidDoc);

  // get attester DID from DID-Keys-file
  // we need attester's private key to sign signature when deciding to issue credential
  const keyring = new Keyring();
  const json = readDidKeysFile();
  const password = "12345678"; // password to decrypt your DID-keys-file
  const attester = restore(keyring, json, password);

  // step1: get ctype
  const ctype: CType = await getCtypeFromHash(ctypeHash);

  // step2: build raw
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

  // step3: build rawCredential from raw
  const rawCredential: RawCredential = raw.toRawCredential("Keccak256");

  // step4: build a vcBuilder by using rawCredential and ctype
  const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(
    rawCredential,
    ctype
  )
    .setExpirationDate(null)
    .setIssuanceDate(Date.now());

  // step5: build a vc
  const vc: VerifiableCredential<false> = await vcBuilder.build(
    attester,
    false
  );

  // step6: encrypt message
  // notice: receiverUrl parameter is holder's keyAgreement key
  const message = await encryptMessage(
    "Send_issuedVC",
    vc,
    attester,
    holder.getKeyUrl("keyAgreement"),
    undefined,
    resolver
  );

  // step7: send encrypted message to server
  await sendMessage2Server(message);
};

issue()
  .then()
  .catch((err) => {
    console.error(err);
  });
