# 📨 Issue Credential API Tutorial

🤓 在该文档中，我们将以 `issue-cred.ts`文件为基础，详细介绍一下如何使用 API来 Issue Credential。

## 核心 API介绍

**前置条件**
```typescript
await initCrypto();

const resolver = new ArweaveDidResolver({
  server: `${base_url}`,
});
```
在前置步骤中，我们主要进行两个操作：
1. 调用 `initCrypto()`接口，初始化 @noble密码学库与 wasm，此步骤为必需，因为我们的 API基于此开发；
2. 生成 resolver，resolver指定了具体的环境，其中 `server`为正式环境或者测试环境的 URL，通过 resolver，可以解析 DID或者通过给定的 DID URL来获取对应的 DID Document。
注意⚠️：对于将 resolver作为参数的 API，开发者应当在使用中明确指定，特别是当您在我们的开发环境中进行测试时。这是因为我们的 resolver默认连接生产环境，如果您没有指定 resolver，则可能会出现 DID Method找不到等情况。

**Step 0: 根据 claimer DID URL 获取其 DID对象**
```typescript
const holderDidDoc = await resolver.resolve(holderDidUrl);
const holder = fromDidDocument(holderDidDoc);

const keyring = new Keyring();
const json = readDidKeysFile();
const password = "12345678"; // password to decrypt your DID-keys-file
const attester = restore(keyring, json, password);
```
在本步骤中，我们用到以下两个API，
1. `fromDidDocument(document: DidDocument, keyring?: KeyringInstance)`该 API可通过 DID Document恢复 DID，其中 Document的获取通过调用接口 `resoler.resolve(didUrl: string)`;
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
const res = await axios.get(
    `${base_url}/ctype?${qs.stringify({ id: ctypeHash })}`
);
if (res.status !== 200) {
    throw new Error(`ctype query failed ${ctypeHash}`);
}
const ctype: CType = res.data.data[0].rawData;
```
在本步骤中，我们使用 axios方法向我们的 RESTful API发起 GET请求，将cType hash作为查询参数请求返回 CType对象。

**Step 2: 构建 Raw对象**
```typescript
const raw = new Raw({
    contents: {
      id: 9870456,
      name: "vss-claimer",
    },
    owner: holderDidUrl,
    ctype: ctype,
    hashType: "RescuePrimeOptimized",
});
```
在本步骤中，我们构建了一个 Raw对象，该对象用于后续构建 RawCredential使用。下面解释一下各个参数：
- contents: 对应 ctype构建时要求用户填入的字段
- owner: claimer，接收该 credential的用户
- ctype: 对应的 ctype对象
- hashType: 加密算法类型，此处选择 RescuePrimeOptimized（我们还支持 Blake2、Blake3、Keccak256等加密算法）

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
- MessageData: 消息数据，这里为VC；
- sender: issuer，或者前面构建的 attester；
- receiverUrl: 用户 DID对应的 keyAgreement类型的 key，该 key在此处用于加密 MessageData；
- resolver: 环境 DID resolver

**Step 7: 发送加密后的 message至服务器**
```typescript
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
```
在该步骤中，我们通过 axios向服务器发送加密后的消息，我们的后端服务在接收到该加密消息后会将消息推送到 credential平台。
设计该加密通信方式是为了保护用户的 VC隐私，所有经过 zCloak服务器的内容均为加密后的信息；对于发送 credential情景，只有 claimer (即用户自己)才能解密该 message，zCloak 只做中间邮递人。