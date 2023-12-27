import fs from "fs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

import type { DidKeys$Json } from "@zcloak/did/keys/types";
import type { DidDocument } from "@zcloak/did-resolver/types";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export function readDidKeysFile() {
  const attesterKeysFile = fs.readFileSync(
    path.resolve(__dirname, "../../attester-DID-keys-file.json"),
    { encoding: "utf-8" }
  );
  return JSON.parse(attesterKeysFile) as DidKeys$Json;
}

export async function registerDidDoc(
  didDoc: DidDocument,
  url = process.env.BASE_URL
) {
  const res = await axios.post(`${url}/did`, { didDocument: didDoc });

  if (res.data.code === 200) {
    console.log(`Success: DID Document Registerd (${didDoc.controller})`);
  } else {
    console.log(`ERROR: ${res.data.message}`);
  }
}
