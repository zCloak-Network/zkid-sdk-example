import fs from "fs";
import {
  executeZkProgram,
  initMidenWasm,
  generateProgramHash,
} from "@zcloak/miden";
import path from "path";
import axios from "axios";
import { initCrypto } from "@zcloak/crypto";
import { toMidenInput } from "@zcloak/vc/parser";
import { signedVCMessage } from "@zcloak/vc/utils";
import { calcDigest, calcRoothash } from "@zcloak/vc";
import { unstable_generateProgram } from "@zcloak/miden";
import { proofVerify } from "@zcloak/verify/proofVerify";

import type {
  AnyJson,
  VerifiableCredential,
  VerifiableCredentialVersion,
} from "@zcloak/vc/types";
import type { DigestPayload } from "@zcloak/vc";
import type { HexString } from "@zcloak/crypto/types";
import type { ProgramConstraints } from "@zcloak/miden/types";

const BLANK_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

(async () => {
  await initCrypto();
  await initMidenWasm();
  // step0: Run verifier service
  //        Read /src/zkp/README.md file to get how to launch a verifer service

  // step1: generate zk program
  const constraints: ProgramConstraints[] = [
    {
      fields: [4],
      operation: ["gte"],
      value: 18,
    },
  ];
  const program = unstable_generateProgram(7, constraints);
  const programHash = generateProgramHash(program);

  // step2: generate advice_stack (secret_input)
  const cred = fs.readFileSync(
    path.resolve(__dirname, "../../vc-example2-zkp.json"),
    { encoding: "utf-8" }
  );
  const credential = JSON.parse(cred) as VerifiableCredential<false>;
  const secretInput = toMidenInput(credential, [4]);

  const rootHashRes = calcRoothash(
    credential.credentialSubject as AnyJson,
    credential.hasher[0],
    credential.version,
    credential.credentialSubjectNonceMap
  );
  console.log("Original vc rootHash: ", rootHashRes.rootHash);

  // step3: execute zk program
  const zkpResult = executeZkProgram(program, "", secretInput);

  // step4: organize verifier service input data
  const dataObj = {
    program_hash: programHash,
    stack_inputs: "",
    zkp_result: JSON.parse(zkpResult),
  };
  let data = JSON.stringify(dataObj);
  data = data.replace(/\\/g, "");

  // step5: verify whether the entire program was faithfully executed
  // NOTE: Starting from step 5, the following operations are generally performed
  //       from the back-end.
  let rootHash: HexString;
  const ctypeHash = credential.ctype;
  const holderDidUrl = credential.holder;
  const issuanceDate = credential.issuanceDate;
  const expirationDate = credential.expirationDate;
  const credentialVersion = credential.version;
  try {
    const res = await axios.post("http://127.0.0.1:3000/verify", data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "bearer",
      },
    });
    rootHash = `0x${res.data.roothash}`;
    console.log(`Recovered rootHash:    ${rootHash}`);

    if (rootHash === BLANK_HASH) {
      throw new Error("Invalid VC: recoverd rootHash is empty !!!");
    } else if (rootHash !== rootHashRes.rootHash) {
      throw new Error("Original vc rootHash not match recovered rootHash !!!");
    }

    console.log(
      `Whether the entire program was faithfully executed? ${res.data.is_valid}\n`
    );
  } catch (err) {
    console.error(err);
    return;
  }

  // step6: verify credential is valid (verify attester signature)
  // a, build digest
  const digestPayload: DigestPayload<VerifiableCredentialVersion> = {
    rootHash,
    holder: holderDidUrl,
    issuanceDate,
    expirationDate,
    ctype: ctypeHash,
  };
  const digestObj = calcDigest(credentialVersion, digestPayload);
  console.log(`Recoverd digest: ${digestObj.digest}`);

  // b, verify attester signature
  let message: `0x${string}` | Uint8Array;
  if (credentialVersion == "1") {
    message = signedVCMessage(digestObj.digest, "1");
  } else if (credentialVersion == "0") {
    message = digestObj.digest;
  } else {
    throw new Error(
      `Wrong credential version, your version is ${credential.version}`
    );
  }
  const res = await proofVerify(message, credential.proof[0]);
  console.log("Attester signature verify result: ", res);
  if (res === false) {
    throw new Error("Invalid VC: can not pass attester signature verify !!!");
  }

  // step7: judge whether greater than or equal to 18 years old
  const zkpResultObj = JSON.parse(zkpResult);
  const result = zkpResultObj.outputs.stack;
  if (Number(result[4]) === 1) {
    console.log(
      `Is ${
        (credential.credentialSubject as AnyJson).EN_NAME
      } older than 18 years old? true`
    );
  } else {
    console.log(
      `Is ${
        (credential.credentialSubject as AnyJson).EN_NAME
      } older than 18 years old? false`
    );
  }
  console.log("Success!!");
})();
