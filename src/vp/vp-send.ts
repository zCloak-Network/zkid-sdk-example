import path from "path";
import dotenv from "dotenv";
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { encryptMessage } from "@zcloak/message";
import { initCrypto, randomAsHex } from "@zcloak/crypto";
import { VerifiablePresentationBuilder } from "@zcloak/vc";

import type { DidUrl } from "@zcloak/did-resolver/types";

import { getPrivateVC } from "../utils/vcHelper";
import { resolver } from "../utils/resolverHelper";
import { fromDidDocument } from "@zcloak/did/did/helpers";
import { sendMessage2Server } from "../utils/messageHelper";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const verifierDidUrl: DidUrl =
  "did:zk:0xB16FEfFaED0630F4C580a58ae0349C68609A6fDc";

const sendVP = async () => {
  // initCrypto for wasm
  await initCrypto();
  console.log("initCrypto for wasm...");

  // step0: get holder and verifier Did obj
  // get holder DID from mnemonic (we need holder's private key to sign VP)
  const keyring = new Keyring();
  const holder = keys.fromMnemonic(
    keyring,
    process.env.CLAIMER_MNEMONIC as string,
    "ecdsa"
  );

  // get verifier DID from DID Document
  const verifierDoc = await resolver.resolve(verifierDidUrl);
  const verifier = fromDidDocument(verifierDoc);

  // step1: get vc
  const vc0 = getPrivateVC("../../vc-example0.json");
  const vc1 = getPrivateVC("../../vc-example1.json");

  // step2: build vp builder
  const vpBuilder = new VerifiablePresentationBuilder(holder);

  // step3: generate challange and build vp
  // note: you can add more vc to build multi type vp
  const challange = randomAsHex();
  const vp = await vpBuilder
    .addVC(vc0, "VP")
    .addVC(vc0, "VP_Digest")
    .addVC(vc0, "VP_SelectiveDisclosure", ["id"])
    .addVC(vc1, "VP")
    .build("Keccak256", challange);

  // step4: encrypt message
  // notice: receiverUrl parameter is verifier's keyAgreement key
  const message = await encryptMessage(
    "Send_VP",
    vp,
    holder,
    verifier.getKeyUrl("keyAgreement"),
    undefined,
    resolver
  );

  // step5: send encrypted message to server
  await sendMessage2Server(message);
};

sendVP()
  .then()
  .catch((err) => {
    console.error(err);
  });
