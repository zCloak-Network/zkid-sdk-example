import axios from "axios";
import * as qs from "qs";
import * as dotenv from "dotenv";
import { VerifiableCredential } from "@zcloak/vc/types";
import { VerifiableCredentialBuilder } from "@zcloak/vc";
import { RawCredential } from "@zcloak/vc/types";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { decryptMessage, encryptMessage } from "@zcloak/message";
import { Message, MessageType } from "@zcloak/message/types";
import { initCrypto } from "@zcloak/crypto";

dotenv.config();

const base_url = process.env.BASE_URL as string;
const mnemonic = process.env.ATTESTER_MNEMONIC as string;

const params = [
  {
    receiver: "did:zk:0x4867c2Dfa7Aa14459c843d69220623cA97B652d7#key-1",
    sender: "did:zk:0xEdfdf6BCaa1A4c5Ed47f062Bbb51220A1001d2f7#key-1",
    msgType: "Request_Attestation",
  },
  {
    receiver: "did:zk:0x4867c2Dfa7Aa14459c843d69220623cA97B652d7#key-1",
    sender: "did:zk:0x2808e410610ae6077c6291CF3582Be5EDd2023cc#key-1",
    msgType: "Request_Attestation",
  },
];

const keyring = new Keyring();
const attester = keys.fromMnemonic(keyring, mnemonic, "ecdsa");

const attest = async (
  serverMsg: Message<MessageType>,
  num: number,
  deputy_num: number
) => {
  // step1: decrypt claim message
  const decrypted = await decryptMessage(serverMsg, attester);

  // step2: get rawCredential from decrypt return value
  const raw: RawCredential = decrypted.data;

  // step3: issuer sign a signature to build vcBuilder
  const ctypeRes = await axios.get(`${base_url}/ctype/?id=${raw.ctype}`);
  const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(
    raw,
    ctypeRes.data.data[0].rawData
  )
    .setExpirationDate(null)
    .setIssuanceDate(Date.now());

  // step4: build vc from vcBuilder
  const vc: VerifiableCredential<false> = await vcBuilder.build(
    attester,
    false
  );

  // step5: encrypt vc to message
  const message = await encryptMessage(
    "Response_Approve_Attestation",
    vc,
    attester,
    decrypted.sender,
    decrypted.id
  );

  // step6: send encrypted message to server
  const sendRes = await axios.post(
    `${base_url}/wxBlockchainEvent/message`,
    message
  );
  if (sendRes.status === 200) {
    console.log(
      `SUCCESS_${num}.${deputy_num}: send encrypted message to server, claim has been already attested.`
    );
  } else {
    console.log(`send encrypted message response status: ${sendRes.status}`);
  }
};

const findAndAttest = async (param: any, num: number) => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  const res = await axios.get(`${base_url}/message/?${qs.stringify(param)}`);
  if (res.data.code !== 200) {
    return null;
  }

  for (let i = 0; i < res.data.data.length; i++) {
    const serverMsg: Message<MessageType> = res.data.data[i].rawData;
    if (serverMsg.msgType === "Request_Attestation") {
      await attest(serverMsg, num, i);
    }
  }
};

const main = async (params: any) => {
  for (let i = 0; i < params.length; i++) {
    await findAndAttest(params[i], i);
  }
};

main(params)
  .then()
  .catch((err) => {
    console.error(err);
  });
