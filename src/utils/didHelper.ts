import fs from "fs";
import path from "path";
import axios from "axios";

import type { DidKeys$Json } from "@zcloak/did/keys/types";
import type { DidDocument } from "@zcloak/did-resolver/types";

export function readDidKeysFile() {
  const attesterKeysFile = fs.readFileSync(
    path.resolve(__dirname, "../../attester-DID-keys-file.json"),
    { encoding: "utf-8" }
  );
  return JSON.parse(attesterKeysFile) as DidKeys$Json;
}

export async function registerDidDoc(
  didDoc: DidDocument,
  url = "https://did-service.zkid.app"
) {
  const res = await axios.post(`${url}/did`, didDoc);

  if (res.data.code === 200) {
    console.log(`Success: DID Document Registerd (${didDoc.controller})`);
  } else {
    console.log(`ERROR: ${res.data.message}`);
  }
}
