import path from "path";
import dotenv from "dotenv";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { restore } from "@zcloak/did/keys";
import { initCrypto } from "@zcloak/crypto";
import { encryptMessage } from "@zcloak/message";
import { Raw, VerifiableCredentialBuilder } from "@zcloak/vc";

import type { CType } from "@zcloak/ctype/types";
import type { RawCredential } from "@zcloak/vc/types";
import type { DidUrl } from "@zcloak/did-resolver/types";
import type { VerifiableCredential } from "@zcloak/vc/types";

import { resolver } from "../utils/resolverHelper";
import { readDidKeysFile } from "../utils/didHelper";
import { fromDidDocument } from "@zcloak/did/did/helpers";
import { getCtypeFromHash, sendKycRecord } from "./util";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// const ctypeHash =
//   "0xeb798a4e225ca0c841d07b86453af634a4ace4fb1446b2283da4b4896846daa2";
const ctypeHash =
  "0xbc2995791cb5b02f6a35eda411648d71bd0c1c03f9489c05d1bebbd37e2d7664";
const holderDidUrl: DidUrl =
  "did:zk:0x89590750403758a34A83248A3EAA27112aee96DF";

(async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  // step0: get holder and attester Did obj
  // get holder DID from DidDocument
  // we only need holders's public key to encrypt message
  const holderDidDoc = await resolver.resolve(holderDidUrl);
  const holder = fromDidDocument(holderDidDoc);

  // get attester DID from DID-Keys-file
  // we need attester's private key to sign signature when deciding to issue credential
  //   const keyring = new Keyring();
  //   const json = readDidKeysFile();
  //   const password = "12345678"; // password to decrypt your DID-keys-file
  //   const attester = restore(keyring, json, password);
  const mnemonic =
    "napkin patient sister puppy lake case super limb artefact alone famous edit";
  const keyring = new Keyring();
  const attester = keys.fromMnemonic(keyring, mnemonic, "ecdsa");

  // step1: get ctype
  const ctype: CType = await getCtypeFromHash(ctypeHash);

  // step2: build raw
  // Note: If the use case for VC does not involve zk computation,
  //       it is recommended to use the Keccak256 hashing method for Raw hashType.
  //       Otherwise, it is advisable to use the RescuePrimeOptimized method.
  const raw = new Raw({
    contents: {
      kyc_status: 1,
      chain_code: "eth",
      on_chain_address: "0x89590750403758a34A83248A3EAA27112aee96DF",
    },
    owner: holderDidUrl,
    ctype: ctype,
    hashType: "Keccak256",
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
  const vc: VerifiableCredential<true> = await vcBuilder.build(attester, true);
  console.dir(vc);

  // step6: send public VC to server
  await sendKycRecord(vc);
})();
