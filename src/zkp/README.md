# ZKP Demo Description

In the zkp demo, you can use our zkid-sdk to generate zk program, execute zk program in vm and verify the zk proof.

For demo using, we simulated a scenario that judges whether a person is greater than or equal to 18 years old.

Let's see how to build it.

## step0 Run verifier service
You have seen there is a binary program called 'verifier' in the /src/zkp folder. This is our verifier service to verify your zk proof. It listens 3000 port and provides a verify API to allow you send proof and verify it.

Using flowing command to run the verifier service.
```bash
# If you don't have permission to launch program directly, run this first
chmod +x ./verifier

# Run the verifier service
./verifier

# Run demo
npm run zkp
```

## step1 Generate zk program
In this section, you will learn how to generate a zk program.
First, you need to construct a ProgramConstraints.
The `fields` field represents which of the credential content field you want to operate on.
The `operation` field is your specific operation, such as 'lt', 'gt' or 'membership_in' and others.
The `value` is the value of the specific operation.

```typescript
const constraints: ProgramConstraints[] = [
    {
      fields: [4],
      operation: ["gte"],
      value: 18,
    },
  ];
const program = unstable_generateProgram(7, constraints);
const programHash = generateProgramHash(program);
```
In this scenario, our program constraints represent the judgment of the fourth credential content field whether greater than or equal to 18.
Note: Credential content field starts at index 0.

## step2 Generate secret_input
Generally speaking, vm needs two inputs, one is public input and other is secret input. The public input is used to initialize vm stack, but we don't use it in this scenaria. The secret input is only known by prover (user) and is used to perform practical calculations.

```typescript
const cred = fs.readFileSync(
    path.resolve(__dirname, "../../vc-example2-zkp.json"),
    { encoding: "utf-8" }
);
const credential = JSON.parse(cred) as VerifiableCredential<false>;
const secretInput = toMidenInput(credential, [4]);
```
Get your credential first and use `toMidenInput(params)` to build secret input.
Note: The second parameter is your specific credential content field index array (Credential content field starts at index 0).

## step3 Execute zk program
Run the following API to get zkp result, it includes stack output and your proof.

```typescript
const zkpResult = executeZkProgram(program, "", secretInput);
```

## step4 Organize verifier service input data
Build verifier input data object.

## step5 Verify whether the entire program was faithfully executed
Send verify input data to verifier service, it can return two data fields. One is `roothash` and other is  `is_valid`. `roothash` is recoved credential roothash, if the roothash is the same before and after the build, it is a valid credential. `is_valid` field could explain whether the entire program was faithfully executed.

## step6 Judge
Let's get back to our real concerns. In this step you will judge whether greater than or equal to 18 years old. In the zkp result, the `output.stack` array stores your roothash and judgment result, the first four items are roothash, and the fifth item is the result of the judgment, with 1 satisfying the condition and 0 not satisfying it.
Like this `["2491764550750522191","11331489113581156736","14446766722750100225","14034721822984398472","1","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0","0"]`, the fifth item is 1, it presents the selected credential content field is greater than or equal to 18.