import dotenv from "dotenv";
import { ArweaveDidResolver } from "@zcloak/did-resolver";

dotenv.config({ path: "../../.env" });

export const resolver = new ArweaveDidResolver({
  server: process.env.BASE_URL,
});
