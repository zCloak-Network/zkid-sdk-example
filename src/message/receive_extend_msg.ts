import path from "path";
import dotenv from "dotenv";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { decryptMessage } from "@zcloak/message";

import { resolver } from "../utils/resolverHelper";
import { fromDidDocument } from "@zcloak/did/did/helpers";
import { getMessage } from "../utils/messageHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

(async () => {
  // step0: build receiver and sender DID
  const mnemonic = process.env.CLAIMER_MNEMONIC as string;
  const keyring = new Keyring();
  const receiver = keys.fromMnemonic(keyring, mnemonic, "ecdsa");

  const senderDidUrl = "did:zk:0xB16FEfFaED0630F4C580a58ae0349C68609A6fDc";
  const senderDidDoc = await resolver.resolve(senderDidUrl);
  const sender = fromDidDocument(senderDidDoc);

  // step1: get encrypted message from server
  const encryptedMsgsOrigin = await getMessage(
    sender,
    receiver,
    "Extends_string"
  );
  const encryptedMsgs = encryptedMsgsOrigin.sort(
    (a, b) => b.createTime - a.createTime
  );

  // step2: decrypt message
  const decrypted = await decryptMessage(encryptedMsgs[0], receiver);

  console.log(`message data: ${decrypted.data}`);
})();
