import path from "path";
import dotenv from "dotenv";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { encryptMessage } from "@zcloak/message";

import { resolver } from "../utils/resolverHelper";
import { fromDidDocument } from "@zcloak/did/did/helpers";
import { sendMessage2Server } from "../utils/messageHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

(async () => {
  // step0: build message sender and receiver DID
  const mnemonic = process.env.ATTESTER_MNEMONIC as string;
  const keyring = new Keyring();
  const sender = keys.fromMnemonic(keyring, mnemonic, "ecdsa");

  const receiverDidUrl = "did:zk:0xE5b8641d32a434BF3B5E6Ea6AFfdA1B56c558eea";
  const receiverDidDoc = await resolver.resolve(receiverDidUrl);
  const receiver = fromDidDocument(receiverDidDoc);

  // step1: encrypt message
  const message = await encryptMessage(
    "Extends_string",
    "string data",
    sender,
    receiver.getKeyUrl("keyAgreement"),
    undefined,
    resolver
  );

  // step2: send encrypted message
  await sendMessage2Server(message);
})();
