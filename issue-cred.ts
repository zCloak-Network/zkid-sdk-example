import axios from "axios";
import * as qs from "qs";
import * as dotenv from "dotenv";
import { VerifiableCredential } from "@zcloak/vc/types";
import { Raw, VerifiableCredentialBuilder } from "@zcloak/vc";
import { RawCredential } from "@zcloak/vc/types";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { encryptMessage } from "@zcloak/message";
import { initCrypto } from "@zcloak/crypto";
import { DidUrl } from "@zcloak/did-resolver/types";
import { CType } from "@zcloak/ctype/types";
import { fromDidDocument } from "@zcloak/did/did/helpers";

dotenv.config();

const base_url = process.env.BASE_URL as string;
const mnemonic = process.env.ATTESTER_MNEMONIC as string;
const ctypeHash = process.env.CTYPEHASH as string;

const holderDidUrl: DidUrl = 'did:zk:0x2808e410610ae6077c6291CF3582Be5EDd2023cc';
const keyring = new Keyring();
const attester = keys.fromMnemonic(keyring, mnemonic, "ecdsa");

const issue = async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log('initCrypto for wasm...');

  // step0: get holder Did obj
  const didRes = await axios.get(`${base_url}/did/${holderDidUrl}`);
  if (didRes.status !== 200) {
    throw new Error(`get ${holderDidUrl} did document failed`);
  }
  const holderDidDoc = didRes.data.data.rawData;
  const holder = fromDidDocument(holderDidDoc);

  // step1: get ctype
  const res = await axios.get(
    `${base_url}/ctype?${qs.stringify({ id: ctypeHash })}`
  );
  if (res.status !== 200) {
    throw new Error(`ctype query failed ${ctypeHash}`);
  }
  const ctype: CType = res.data.data[0].rawData;

  // step2: build raw
  const raw = new Raw({
    contents: {
      name: "vss-claimer",
    },
    owner: holderDidUrl,
    ctype: ctype,
    hashType: "Blake3",
  });

  // step3: build rawCredential from raw
  const rawCredential: RawCredential = raw.toRawCredential('Keccak256');

  // step4: build a vcBuilder by using rawCredential and ctype
  const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(rawCredential, ctype)
      .setExpirationDate(null)
      .setIssuanceDate(Date.now());

  // step5: build a vc
  const vc: VerifiableCredential<false> = await vcBuilder.build(attester, false);

  // step6: encrypt message
  // notice: receiverUrl parameter is holder's keyAgreement key
  const message = await encryptMessage("Send_issuedVC", vc, attester, holder.getKeyUrl('keyAgreement'));

  // step7: send encrypted message to server
  const sendRes = await axios.post(`${base_url}/message`, message);
  if (sendRes.status === 200) {
    console.log(`SUCCESS: send encrypted message to server, issue a credential to holder directly.`);
  } else {
    console.log(`send encrypted message response status: ${sendRes.status}`);
  }
};

issue()
  .then()
  .catch((err) => {
    console.error(err);
  });
