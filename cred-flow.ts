import axios from "axios";
import * as qs from "qs";
import * as dotenv from "dotenv";
import { VerifiableCredential } from "@zcloak/vc/types";
import {VerifiableCredentialBuilder} from "@zcloak/vc";
import {RawCredential} from "@zcloak/vc/types";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { decryptMessage, encryptMessage } from "@zcloak/message";
import { Message, MessageType } from "@zcloak/message/types";
import { initCrypto } from "@zcloak/crypto";

dotenv.config();

const base_url = process.env.BASE_URL as string;
const mnemonic = process.env.ATTESTER_MNEMONIC as string;

const params = {
  receiver: "did:zk:0x4867c2Dfa7Aa14459c843d69220623cA97B652d7#key-1",
  sender: "did:zk:0xEdfdf6BCaa1A4c5Ed47f062Bbb51220A1001d2f7#key-1",
  reply: "",
  id: "0x5154fd176184f51150ca5767056830dfe448e31689301efefc3881eecfee6fe0",
  msgType: "Request_Attestation",
};

const keyring = new Keyring();
const attester = keys.fromMnemonic(keyring, mnemonic, 'ecdsa');

const main = async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log('initCrypto for wasm...');

  const res = await axios.get(`${base_url}/message/?${qs.stringify(params)}`);
  if (res.data.code !== 200) {
    return null;
  }

  const serverMsg: Message<MessageType> = res.data.data[0].rawData;

  if (serverMsg.msgType === "Request_Attestation") {
    // step1: decrypt claim message
    const decrypted = await decryptMessage(serverMsg, attester);

    // step2: get rawCredential from decrypt return value
    const raw: RawCredential = decrypted.data;

    // step3: issuer sign a signature to build vcBuilder
    const ctypeRes = await axios.get(`${base_url}/ctype/?id=${raw.ctype}`);
    const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(raw, ctypeRes.data.data[0].rawData)
        .setExpirationDate(null)
        .setIssuanceDate(Date.now());

    // step4: build vc from vcBuilder
    const vc: VerifiableCredential<false> = await vcBuilder.build(attester, false);

    // step5: encrypt vc to message
    const message = await encryptMessage("Response_Approve_Attestation", vc, attester, decrypted.sender, decrypted.id);

    // step6: send encrypted message to server
    const sendRes = await axios.post(`${base_url}/message`, message);
    if (sendRes.status === 200) {
      console.log('SUCCESS: send encrypted message to server, claim has already attested.');
    } else {
      console.log(`send encrypted message response status: ${res.status}`);
    }
  }
};

main()
  .then()
  .catch((err) => {
    console.error(err);
  });
