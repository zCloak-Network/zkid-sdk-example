# Credential-API 使用说明

Hi👋，该仓库向您展示了如何使用我们的SDK来验证用户的claim信息并向其发送credential，以及如何直接向用户发送credential而无需用户提前创建claim信息。

各位Attester🧑🏻‍⚖️，准备好了么?🚀 让我们出发吧！！！

## 快速使用

```bash
git clone https://github.com/zCloak-Network/credential-api-example.git
cd credential-api-example/
npm install

npm run ctype
npm run claim
npm run attest
npm run issue
```

## ⚠️ Issue Verifiable Credential ⚠️
如果您的需求只是使用 SDK向用户直接发送 VC（即 issue模式），那么您只需参考 `/src/issue/issue.ts`文件。
👉开发教程可参考文章 [Issue Credential API Tutorial](./doc/issueCredentialApiTutorial-zh.md)。

## 使用向导

### 使用
我们支持 浏览器，node.js:
> npm install @zcloak/vc @zcloak/crypto @zcloak/message

```typescript
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";
import { VerifiableCredentialBuilder } from "@zcloak/vc";
import { initCrypto } from "@zcloak/crypto";

import { decryptMessage, encryptMessage } from "@zcloak/message";

import { CType } from "@zcloak/ctype/types";
import { RawCredential, VerifiableCredential } from "@zcloak/vc/types";
import { Message, MessageType } from "@zcloak/message/types";

import * as qs from "qs";
import axios from "axios";

// 初始化noble的库与wasm
await initCrypto();

// 生成Attester Did账户
const mnemonic = '...';
const keyring = new Keyring();
const attester = keys.fromMnemonic(keyring, mnemonic, 'ecdsa');

// 加密与解密message
const encryptedMsg: Message<MessageType> = 'xxx';
const decrypted = await decryptMessage(encryptedMsg, attester);
const message = await encryptMessage("Response_Approve_Attestation", vc, attester, decrypted.sender, decrypted.id);

// 构建vcBuilder
const raw: RawCredential = 'xxx';
const ctype: CType = 'xxx';
const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(raw, ctype)
    .setExpirationDate(null)
    .setIssuanceDate(Date.now());

// 构建vc (VerifiableCredential)
const vc: VerifiableCredential<false> = await vcBuilder.build(attester, false);
```

## Q&A
