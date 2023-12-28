import path from "path";
import dotenv from "dotenv";
import { vpVerify } from "@zcloak/verify";
import { Keyring } from "@zcloak/keyring";
import { restore } from "@zcloak/did/keys";
import { initCrypto } from "@zcloak/crypto";
import { decryptMessage } from "@zcloak/message";

import { getMessage } from "../utils/messageHelper";
import { readDidKeysFile } from "../utils/didHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const responseVP = async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  // step0: get verifier DID
  const keyring = new Keyring();
  const json = readDidKeysFile();
  const password = "12345678"; // password to decrypt your DID-keys-file
  const verifier = restore(keyring, json, password);

  // step1: get latest message
  const serverMsg = await getMessage(verifier, "Send_VP");

  // step2: decrypt claim message
  const decrypted = await decryptMessage(serverMsg[0], verifier);

  // step3: verify vp
  const result = await vpVerify(decrypted.data);
  console.log(`verify vp result: ${result}`);
};

responseVP()
  .then()
  .catch((err) => {
    console.error(err);
  });
