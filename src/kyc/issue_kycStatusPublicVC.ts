import path from "path";
import dotenv from "dotenv";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { initCrypto } from "@zcloak/crypto";
import { Raw, VerifiableCredentialBuilder } from "@zcloak/vc";

import type { CType } from "@zcloak/ctype/types";
import type { RawCredential } from "@zcloak/vc/types";
import type { DidUrl } from "@zcloak/did-resolver/types";
import type { VerifiableCredential } from "@zcloak/vc/types";

import { sendKycRecord } from "../utils/kycHelper";
import { getCtypeFromHash } from "../utils/ctypeHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Legit ID Punlic VC ctypehash
const ctypeHash =
  "0xbc2995791cb5b02f6a35eda411648d71bd0c1c03f9489c05d1bebbd37e2d7664";

// ATTENTION: replace it with real KYC user's did
const holderDidUrl: DidUrl =
  "did:zk:0xE5b8641d32a434BF3B5E6Ea6AFfdA1B56c558eea";

(async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  // step0: get attester DID
  // from mnemonic
  const keyring = new Keyring();
  const mnemonic = process.env.ATTESTER_MNEMONIC as string;
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
      on_chain_address: "0xE5b8641d32a434BF3B5E6Ea6AFfdA1B56c558eea",
    },
    owner: holderDidUrl,
    ctype: ctype,
    hashType: "Keccak256",
  });

  // step3: build rawCredential from raw
  const rawCredential: RawCredential = raw.toRawCredential("Keccak256");

  // step4: build a vcBuilder by using rawCredential and ctype
  // ATTENTION: set expirarion date with OCR result (example is one year later in milliseconds)
  const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(
    rawCredential,
    ctype
  )
    .setExpirationDate(new Date().setFullYear(new Date().getFullYear() + 1))
    .setIssuanceDate(Date.now());

  // step5: build a public vc
  // ATTENTION: build public vc with `true` parameter.
  const vc: VerifiableCredential<true> = await vcBuilder.build(attester, true);

  // step6: send public VC to server
  await sendKycRecord(vc);
})();
