import qs from "qs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

import { CType } from "@zcloak/ctype/types";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export async function getCtypeFromHash(
  hash: string | undefined,
  url = process.env.BASE_URL
): Promise<CType> {
  if (hash === undefined) {
    throw new Error("ctype hash undefined !!!");
  }

  const res = await axios.get(`${url}/ctype?${qs.stringify({ id: hash })}`);
  if (res.status !== 200) {
    throw new Error(`ctype query failed ${hash}`);
  }
  const ctype: CType = res.data.data.rawData;
  return ctype;
}

export async function publishCtype(ctype: CType, url = process.env.BASE_URL) {
  const res = await axios.post(`${url}/ctype`, ctype);
  console.dir(res.data);
  if (res.data.code === 200) {
    console.log("Success: publish ctype");
  } else {
    console.log(`Publish ERROR: ${res.data.message}`);
  }
}
