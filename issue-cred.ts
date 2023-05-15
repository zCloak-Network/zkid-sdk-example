import axios from "axios";
import * as fs from "fs";
import * as qs from "qs";
import * as path from "path";
import * as dotenv from "dotenv";
import { VerifiableCredential } from "@zcloak/vc/types";
import { Raw, VerifiableCredentialBuilder } from "@zcloak/vc";
import { RawCredential } from "@zcloak/vc/types";
import { Keyring } from "@zcloak/keyring";
import { restore } from "@zcloak/did/keys";
import { DidKeys$Json } from "@zcloak/did/keys/types";
import { encryptMessage } from "@zcloak/message";
import { initCrypto } from "@zcloak/crypto";
import { DidUrl } from "@zcloak/did-resolver/types";
import { CType } from "@zcloak/ctype/types";
import { fromDidDocument } from "@zcloak/did/did/helpers";

dotenv.config();

const base_url = process.env.BASE_URL as string;
const ctypeHash = process.env.CTYPEHASH as string;
const holderDidUrl: DidUrl =
  "did:zk:0x2808e410610ae6077c6291CF3582Be5EDd2023cc";

const readDidKeysFile = () => {
  const attesterKeysFile = fs.readFileSync(
    `${path.join(__dirname, "/attester-DID-keys-file.json")}`,
    { encoding: "utf-8" }
  );
  return JSON.parse(attesterKeysFile) as DidKeys$Json;
};

const issue = async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  // step0: get holder and attester Did obj
  const didRes = await axios.get(`${base_url}/did/${holderDidUrl}`);
  if (didRes.status !== 200) {
    throw new Error(`get ${holderDidUrl} did document failed`);
  }
  const holderDidDoc = didRes.data.data.rawData;
  const holder = fromDidDocument(holderDidDoc);

  const keyring = new Keyring();
  const json = readDidKeysFile();
  const password = " "; // password to decrypt your DID-keys-file
  const attester = restore(keyring, json, password);

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
      id: 9870456,
      name: "vss-claimer",
    },
    owner: holderDidUrl,
    ctype: ctype,
    hashType: "RescuePrimeOptimized",
  });

  // step3: build rawCredential from raw
  const rawCredential: RawCredential = raw.toRawCredential("Keccak256");

  // step4: build a vcBuilder by using rawCredential and ctype
  const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(
    rawCredential,
    ctype
  )
    .setExpirationDate(null)
    .setIssuanceDate(Date.now());

  // step5: build a vc
  const vc: VerifiableCredential<false> = await vcBuilder.build(
    attester,
    false
  );

  // step6: encrypt message
  // notice: receiverUrl parameter is holder's keyAgreement key
  const message = await encryptMessage(
    "Send_issuedVC",
    vc,
    attester,
    holder.getKeyUrl("keyAgreement")
  );

  // step7: send encrypted message to server
  const sendRes = await axios.post(
    `${base_url}/wxBlockchainEvent/message`,
    message
  );
  if (sendRes.status === 200) {
    console.log(
      `SUCCESS: send encrypted message to server, issue a credential to holder directly.`
    );
  } else {
    console.log(`send encrypted message response status: ${sendRes.status}`);
  }
};

issue()
  .then()
  .catch((err) => {
    console.error(err);
  });
