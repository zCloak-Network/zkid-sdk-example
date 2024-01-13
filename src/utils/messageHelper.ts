import qs from "qs";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import { Did } from "@zcloak/did";

import type { Message, MessageType } from "@zcloak/message/types";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export async function sendMessage2Server(
  message: any,
  templateId = -1,
  token = null,
  url = process.env.BASE_URL
): Promise<void> {
  const sendRes = await axios.post(`${url}/message`, {
    templateId,
    msg: message,
    token,
  });
  if (sendRes.status === 200) {
    console.log(`SUCCESS: send encrypted message to server`);
  } else {
    console.log(`send encrypted message response status: ${sendRes.status}`);
  }
}

export async function getMessage(
  receiver: Did,
  msgType: string,
  page = 1,
  size = 1,
  url = process.env.BASE_URL
) {
  const param = qs.stringify({
    page,
    size,
    receiver: receiver.getKeyUrl("keyAgreement"),
    msgType: msgType,
  });
  const res = await axios.get(`${url}/message/page?${param}`);

  return res.data.data.items.map((value: any) => value.rawData) as Array<
    Message<MessageType>
  >;
}
