import { Keyring } from "@zcloak/keyring";
import { restore } from "@zcloak/did/keys";
import { initCrypto } from "@zcloak/crypto";
import { getPublish, getCTypeHash } from "@zcloak/ctype";

import type { BaseCType, CType } from "@zcloak/ctype/types";

import { publishCtype } from "../utils/ctypeHelper";
import { readDidKeysFile } from "../utils/didHelper";

(async () => {
  // attester
  const keyring = new Keyring();
  const json = readDidKeysFile();
  const password = "12345678"; // password to decrypt your DID-keys-file
  const attester = restore(keyring, json, password);

  // initCrypto for wasm
  await initCrypto();

  // construct and publish a ctype
  const base: BaseCType = {
    title: "CType Create Demo",
    description: "Demo for creating ctype",
    type: "object",
    properties: {
      Name: {
        type: "string",
      },
      Data_Of_Birth: {
        type: "integer",
        format: "timestamp",
      },
      Country: {
        type: "integer",
        format: "national-code",
      },
    },
    required: [],
  };
  const ctype: CType = await getPublish(base, attester);
  console.log(`ctype hash: ${getCTypeHash(base, attester.id)}`);
  // await publishCtype(ctype);
  // console.dir(ctype);
})();
