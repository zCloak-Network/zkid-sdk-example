import fs from "fs";
import path from "path";

import {} from "@zcloak/vc";

import type { VerifiableCredential } from "@zcloak/vc/types";

export function getPrivateVC(vcFilePath: string): VerifiableCredential<false> {
  const vcStr = fs.readFileSync(path.resolve(__dirname, vcFilePath), {
    encoding: "utf-8",
  });
  const vc = JSON.parse(vcStr) as VerifiableCredential<false>;

  return vc;
}
