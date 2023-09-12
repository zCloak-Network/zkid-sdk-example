import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { initCrypto, mnemonicGenerate } from "@zcloak/crypto";

import { registerDidDoc } from "../utils/didHelper";

(async () => {
  await initCrypto();

  const mnemonic = mnemonicGenerate(12);
  const keyring = new Keyring();
  const did = keys.fromMnemonic(keyring, mnemonic, "ecdsa");

  const doc = did.getDocument();

  await registerDidDoc(doc);
})();
