import fs from "fs";
import path from "path";
import {
  executeZkProgram,
  initMidenWasm,
  generateProgramHash,
} from "@zcloak/miden";
import axios from "axios";
import { calcRoothash } from "@zcloak/vc";
import { initCrypto } from "@zcloak/crypto";
import { toMidenInput } from "@zcloak/vc/parser";
import { unstable_generateProgram } from "@zcloak/miden";

import type { ProgramConstraints } from "@zcloak/miden/types";
import type { AnyJson, VerifiableCredential } from "@zcloak/vc/types";

(async () => {
  await initCrypto();
  await initMidenWasm();
  // step0: Run verifier service

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
    credential.credentialSubjectNonceMap
  );
  console.log("credential rootHash: ", rootHashRes.rootHash);

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
  try {
    const res = await axios.post("http://127.0.0.1:3000/verify", data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "bearer",
      },
    });
    console.log(`Recovered credential rootHash: 0x${res.data.roothash}`);
    console.log(
      `Whether the entire program was faithfully executed? ${res.data.is_valid}`
    );
  } catch (err) {
    console.error(err);
  }

  // step6: judge whether greater than or equal to 18 years old
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
