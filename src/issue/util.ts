import qs from "qs";
import axios from "axios";

import type { CType } from "@zcloak/ctype/types";
import type { VerifiableCredential } from "@zcloak/vc/types";

// ATTENTION: if you run issue_publicVC script, please using https://card-service.zkid.xyz
const baseUrl = "https://card-service.zkid.app";

export const getCtypeFromHash = async (
  id: string | undefined,
  url = baseUrl
): Promise<CType> => {
  if (id === undefined) {
    throw new Error("ctype hash undefined !!!");
  }

  const res = await axios.get(`${url}/api/ctype?${qs.stringify({ id: id })}`);
  if (res.status !== 200) {
    throw new Error(`ctype query failed ${id}`);
  }

  const ctype: CType = res.data.data.rawData;
  return ctype;
};

export const sendMessage2Server = async (
  templateId: number,
  message: any,
  url = baseUrl
): Promise<void> => {
  const fullMessage = {
    templateId,
    msg: message,
  };
  const sendRes = await axios.post(`${url}/api/message/`, fullMessage);
  if (sendRes.status === 200) {
    console.log(`SUCCESS: send encrypted message to server`);
  } else {
    console.log(`send encrypted message response status: ${sendRes.status}`);
  }
};

export const sendKycRecord = async (
  publicVC: VerifiableCredential<true>,
  url = baseUrl
) => {
  const res = await axios.post(`${url}/api/kyc/record/callback/save`, publicVC);
  if (res.status === 200) {
    console.log(`SUCCESS: send public VC to server`);
  } else {
    console.log(`send encrypted message response status: ${res.status}`);
  }
};
