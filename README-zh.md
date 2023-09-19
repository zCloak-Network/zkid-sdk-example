# Zkid-SDK 使用说明

Hi👋，各位开发者🧑‍💻，本教程将向你展示如何使用 SDK来完成 credential分发的 **request模式**（claimer发起 attestation请求，attester批准或拒绝请求）与 **issue模式**（attester 直接向指定 claimer发送 VC）。

各位Attester🧑🏻‍⚖️，准备好了么?🚀 让我们出发吧！！！

## 快速使用

请确保使用最新兼容版本，您可以使用 `npm update` 命令来升级依赖。

```bash
git clone https://github.com/zCloak-Network/zkid-sdk-example.git
cd zkid-sdk-example/
npm install

npm run ctype
npm run claim
npm run attest
npm run issue
npm run vp-send
npm run vp-send-verify
npm run zkp
```

## ⚠️ Issue Verifiable Credential ⚠️
如果您的需求只是使用 SDK向用户直接发送 VC（即 issue模式），那么您只需参考 `/src/issue/issue.ts`文件。

## 使用向导

### Demo文件说明
所有 Demo文件位于 `src/`文件夹中，以下将根据文件夹的归类来分别介绍几个主要功能模块。

**claim-attest**
在 claim-attest文件夹下，包含了 claim.ts脚本与 attest.ts脚本，二者用于展示签发 VC的 request模式，即 claimer发起 attestation请求，attester批准/拒绝请求，attester批准请求后签发 VC。

**issue**
在 issue文件夹下，只包含一个 issue.ts脚本文件，该文件用于展示签发 VC的 issue模式，即 attester直接向指定用户签发一个 VC，用户不需要提前请求。

**ctype**
在 ctype文件夹中，只包含一个 createCtype.ts脚本文件，该文件用于展示如何创建一个 ctype。建议各位开发者使用 [credential 平台](https://cred.zkid.app)创建 ctype。

### 📨 Issue Credential API Tutorial

🤓 在 issue模式的教程中，我们将以 `src/issue/issue.ts`文件为基础，详细介绍一下如何使用 API来 Issue Credential。

**前置条件**
```typescript
await initCrypto();
```
在前置步骤中，我们需要对密码学库进行初始化操作：
调用 `initCrypto()`接口，初始化 @noble密码学库与 wasm，此步骤为必需，因为我们的 API基于此开发。
1. 生成 resolver，resolver指定了具体的环境，其中 `server`为正式环境或者测试环境的 URL，通过 resolver，可以解析 DID或者通过给定的 DID URL来获取对应的 DID Document。

**Step 0: 根据 claimer DID URL 获取其 DID对象**
```typescript
const holderDidDoc = await resolver.resolve(holderDidUrl);
const holder = fromDidDocument(holderDidDoc);

const keyring = new Keyring();
const json = readDidKeysFile();
const password = "12345678"; // password to decrypt your DID-keys-file
const attester = restore(keyring, json, password);

// src/utils/resolverHelper.ts
export const resolver = new ArweaveDidResolver({
  server: process.env.BASE_URL,
});

// src/utils/didHelper.ts
export function readDidKeysFile() {
  const attesterKeysFile = fs.readFileSync(
    path.resolve(__dirname, "../../attester-DID-keys-file.json"),
    { encoding: "utf-8" }
  );
  return JSON.parse(attesterKeysFile) as DidKeys$Json;
}

```
在本步骤中，我们用到以下API，
1. `fromDidDocument(document: DidDocument, keyring?: KeyringInstance)`该 API可通过 DID Document恢复 DID，其中 Document的获取通过调用接口 `resoler.resolve(didUrl: string)`。注意⚠️：resolver可以作为某些 API的参数，对于这类 API，开发者应当在使用中明确指定 resolver，特别是当您在我们的开发环境中进行测试时。这是因为我们的 resolver默认连接生产环境，如果您没有指定 resolver，则可能会出现 DID Method找不到等情况;
2. `restore(keyring: Keyring, json: DidKeys$Json, password: string)`该 API旨在通过 DID-keys-file来恢复 DID，需要注意一点：password参数为创建 DID时的密码，正确的使用该密码才可以解密 DID-keys-file并恢复 DID。

除了使用上述方法恢复 DID外，我们还提供了通过助记词来恢复 DID，具体接口为：`fromMnemonic(keyring: KeyringInstance, mnemonic: string, signingKeyType?: 'ecdsa' | 'ed25519', index?: number)`。

```typescript
import { keys } from "@zcloak/did";
import { Keyring } from "@zcloak/keyring";

const keyring = new Keyring();
const mnemonic = 'xxx';
const attester = keys.fromMnemonic(keyring, mnemonic, "ecdsa");
```

**Step 1: 根据 cType hash值获取 CType对象**
```typescript
const ctype: CType = await getCtypeFromHash(ctypeHash);

// src/utils/ctypeHelper.ts
export async function getCtypeFromHash(
  hash: string | undefined,
  url = "https://did-service.zkid.app"
): Promise<CType> {
  if (hash === undefined) {
    throw new Error("ctype hash undefined !!!");
  }

  const res = await axios.get(`${url}/ctype?${qs.stringify({ id: hash })}`);
  if (res.status !== 200) {
    throw new Error(`ctype query failed ${hash}`);
  }
  const ctype: CType = res.data.data[0].rawData;
  return ctype;
}
```
在本步骤中，我们使用 axios方法向我们的 RESTful API发起 GET请求，将ctype hash作为查询参数请求 ctype对象。

**Step 2: 构建 Raw对象**
```typescript
const raw = new Raw({
    contents: {
      id: 9870456,
      name: "vss-claimer",
    },
    owner: holderDidUrl,
    ctype: ctype,
    hashType: "Keccak256",
});
```
在本步骤中，我们构建了一个 Raw对象，该对象用于后续构建 RawCredential使用。下面解释一下各个参数：
- contents: 对应 ctype构建时要求用户填入的字段
- owner: claimer，接收该 credential的用户
- ctype: 对应的 ctype对象
- hashType: 加密算法类型，此处选择 Keccak256（我们还支持 Blake2、Blake3、RescuePrimeOptimized等加密算法。注意：考虑到 Keccak256的哈希效率在链上最高，因此如果您的 vc使用场景不包括 zk计算，那么建议使用 Keccak256作为构建 Raw时的哈希，否则使用 RescuePrimeOptimized哈希。）

**Step 3: 构建 Raw Credential**
```typescript
const rawCredential: RawCredential = raw.toRawCredential("Keccak256");
```
在这一步中，我们基于上一步生成的 Raw对象，调用 `toRawCredential(digestHashType?: HashType)`接口生成 Raw Credential，这一步用到的加密算法默认为 Keccak256（同时我们还支持其他加密算法，与构建 Raw时可用的加密算法一致）。

**Step 4: 构建 vcBuilder**
```typescript
const vcBuilder = VerifiableCredentialBuilder.fromRawCredential(
    rawCredential,
    ctype
  )
    .setExpirationDate(null)
    .setIssuanceDate(Date.now());
```
在该步骤中，我们构建了一个 vcBuilder对象，后续的 VC可由该 vcBuilder构建。vcBuilder 提供多个方法，对于一般通用型的 VC，一般设置其为永不过期，签发时间设置为当前时间。

**Step 5: 构建 VC**
```typescript
const vc: VerifiableCredential<false> = await vcBuilder.build(
    attester,
    false
);
```
在该步骤中，我们通过 vcBuilder的 `build(issuer: Did, isPublic?: false)`接口成功的构建了 VC。
该接口的两个参数需要说明一下：
- issuer: 一个 DID对象，这里的角色为 issuer，即签发人，一般指某个 attester；
- isPublic: 当该参数为 `false`时，生成的 VC为 private VC，如果为 `true`则生成 public VC，如果此参数指定为 `false`，则生成的 VC类型为 `VerifiableCredential<false>`；一般意义上的 VC均为 private VC，因此默认的VC均指 private VC，考虑到日后某些 VC可以公开，因此我们也设计了可公开的 public VC。

**Step 6: 构建加密 message**
```typescript
const message = await encryptMessage(
    "Send_issuedVC",
    vc,
    attester,
    holder.getKeyUrl("keyAgreement"),
    undefined,
    resolver
  );
```
在该步骤中，我们使用 `encryptMessage<T extends MessageType>(type: T, data: MessageData[T], sender: IDidKeyring, receiverUrl: DidUrl, reply?: string, resolver?: DidResolver)`接口生成加密信息，其中在 issue credential过程中会用到以下几个参数：
- type: 消息类型，issue 对应的消息类型为 “Send_issuedVC”；
- MessageData: 消息数据，这里指VC；
- sender: issuer，或者前面构建的 attester；
- receiverUrl: 用户 DID对应的 keyAgreement类型的 key，该 key在此处用于加密 MessageData；
- resolver: 环境 DID resolver

**Step 7: 发送加密后的 message至服务器**
```typescript
await sendMessage2Server(message);

// src/utils/messageHelper.ts
export async function sendMessage2Server(
  message: any,
  url = "https://did-service.zkid.app"
): Promise<void> {
  const sendRes = await axios.post(`${url}/wxBlockchainEvent/message`, message);
  if (sendRes.status === 200) {
    console.log(`SUCCESS: send encrypted message to server`);
  } else {
    console.log(`send encrypted message response status: ${sendRes.status}`);
  }
}
```
在该步骤中，我们通过 axios向服务器发送加密后的消息，我们的后端服务在接收到该加密消息后会将消息推送到 credential平台。
使用该加密通信方式是为了保护用户的 VC隐私，所有经过 zCloak服务器的内容均为加密后的信息；对于发送 VC的情景，只有 claimer (即用户自己)才能解密该 message，zCloak 只做中间邮递人。