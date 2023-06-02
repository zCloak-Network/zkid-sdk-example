import qs from "qs";
import axios from "axios";
import { Did } from "@zcloak/did";

import type { Message, MessageType } from "@zcloak/message/types";

export async function sendMessage2Server(
  message: any,
  url = "https://did-service.zkid.app"
): Promise<void> {
  const sendRes = await axios.post(`${url}/wxBlockchainEvent/message`, message);
  if (sendRes.status === 200) {
    console.log(`SUCCESS: send encrypted message to server`);
  } else {
    console.log(`send encrypted message response status: ${sendRes.status}`);
  }
}

export async function getMessage(
  sender: Did,
  receiver: Did,
  msgType: string,
  reply?: string,
  url = "https://did-service.zkid.app"
) {
  const param = qs.stringify({
    sender: sender.getKeyUrl("keyAgreement"),
    receiver: receiver.getKeyUrl("keyAgreement"),
    msgType: msgType,
    reply: reply,
  });
  const res = await axios.get(`${url}/message?${param}`);

  return res.data.data.map((value: any) => value.rawData) as Array<
    Message<MessageType>
  >;
}
