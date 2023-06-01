import qs from "qs";
import axios from "axios";
import { CType } from "@zcloak/ctype/types";

export async function getCtypeFromHash(
  hash: string | undefined,
  url = "https://did-service.zkid.app"
): Promise<CType> {
  if (hash === undefined) {
    throw new Error("ctype hash undefined !!!");
  }

  const res = await axios.get(`${url}/ctype?${qs.stringify({ id: hash })}`);
  if (res.status !== 200) {
    throw new Error(`ctype query failed ${hash}`);
  }
  const ctype: CType = res.data.data[0].rawData;
  return ctype;
}

export async function publishCtype(
  ctype: CType,
  url = "https://did-service.zkid.app"
) {
  const res = await axios.post(`${url}/ctype`, ctype);
  // console.log(res.status);
  // console.dir(res.data);
  if (res.data.code === 200) {
    console.log("Success: publish ctype");
  } else {
    console.log(`Publish ERROR: ${res.data.message}`);
  }
}
