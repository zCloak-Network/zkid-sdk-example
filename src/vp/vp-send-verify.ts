import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { keys } from "@zcloak/did";
import { vpVerify } from "@zcloak/verify";
import { Keyring } from "@zcloak/keyring";
import { restore } from "@zcloak/did/keys";
import { initCrypto, randomAsHex } from "@zcloak/crypto";
import { VerifiablePresentationBuilder } from "@zcloak/vc";
import { encryptMessage, decryptMessage } from "@zcloak/message";

import type { DidUrl } from "@zcloak/did-resolver/types";
import type { VerifiableCredential } from "@zcloak/vc/types";

import { resolver } from "../utils/resolverHelper";
import { getMessage } from "../utils/messageHelper";
import { readDidKeysFile } from "../utils/didHelper";
import { fromDidDocument } from "@zcloak/did/did/helpers";
import { sendMessage2Server } from "../utils/messageHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const holderDidUrl: DidUrl =
  "did:zk:0xE5b8641d32a434BF3B5E6Ea6AFfdA1B56c558eea";

const responseVP = async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  // step0: get holder and verifier DID
  // Get holder DID from DidDocument
  // We only need holder's KeyAgreement Public Key to search message
  const holderDidDoc = await resolver.resolve(holderDidUrl);
  const holder = fromDidDocument(holderDidDoc);

  const keyring = new Keyring();
  const json = readDidKeysFile();
  const password = "12345678"; // password to decrypt your DID-keys-file
  const verifier = restore(keyring, json, password);

  // step1: get message
  const serverMsg = await getMessage(holder, verifier, "Send_VP");

  // step2: decrypt claim message
  // serverMsg array is just for demo use, the details should be based on the actual situation
  const decrypted = await decryptMessage(
    serverMsg[serverMsg.length - 1],
    verifier
  );

  // step3: verify vp
  const result = await vpVerify(decrypted.data);
  console.log(`vp id: ${decrypted.data.id}`);
  console.log(`verify vp result: ${result}`);
};

responseVP()
  .then()
  .catch((err) => {
    console.error(err);
  });
