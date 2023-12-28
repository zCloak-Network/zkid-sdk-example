import path from "path";
import dotenv from "dotenv";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { decryptMessage } from "@zcloak/message";

import { getMessage } from "../utils/messageHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

(async () => {
  // step0: build receiver and sender DID
  const mnemonic = process.env.CLAIMER_MNEMONIC as string;
  const keyring = new Keyring();
  const receiver = keys.fromMnemonic(keyring, mnemonic, "ecdsa");

  // step1: get latest encrypted message from server
  const encryptedMsgs = await getMessage(receiver, "Extends_string");

  // step2: decrypt message
  const decrypted = await decryptMessage(encryptedMsgs[0], receiver);

  console.log(`message data: ${decrypted.data}`);
})();
