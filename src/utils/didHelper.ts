import fs from "fs";
import path from "path";

import type { DidKeys$Json } from "@zcloak/did/keys/types";

export function readDidKeysFile() {
  const attesterKeysFile = fs.readFileSync(
    path.resolve(__dirname, "../../attester-DID-keys-file.json"),
    { encoding: "utf-8" }
  );
  return JSON.parse(attesterKeysFile) as DidKeys$Json;
}
