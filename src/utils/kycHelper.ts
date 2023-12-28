import path from "path";
import axios from "axios";
import dotenv from "dotenv";

import type { VerifiableCredential } from "@zcloak/vc/types";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const sendKycRecord = async (
  publicVC: VerifiableCredential<true>,
  url = process.env.BASE_URL
) => {
  const res = await axios.post(`${url}/kyc/record/callback/save`, publicVC);
  if (res.status === 200) {
    console.log(`SUCCESS: send public VC to server`);
  } else {
    console.log(`send encrypted message response status: ${res.status}`);
  }
};
