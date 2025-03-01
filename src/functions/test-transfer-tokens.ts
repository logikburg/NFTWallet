import {
    airdropFactory,
    appendTransactionMessageInstructions,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    createTransactionMessage,
    generateKeyPairSigner,
    getSignatureFromTransaction,
    lamports,
    pipe,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
    some,
  } from "@solana/web3.js";
  import { getCreateAccountInstruction } from "@solana-program/system";
//   import {
//     extension,
//     findAssociatedTokenPda,
//     getCreateAssociatedTokenInstruction,
//     getCreateAssociatedTokenInstructionAsync,
//     getInitializeMetadataPointerInstruction,
//     getInitializeMintInstruction,
//     getInitializeTokenMetadataInstruction,
//     getMintSize,
//     getMintToInstruction,
//     getTransferCheckedInstruction,
//     getUpdateTokenMetadataFieldInstruction,
//     TOKEN_2022_PROGRAM_ADDRESS,
//     tokenMetadataField,
//   } from "@solana-program/token-2022";
  
  // Create Connection, localhost in this example
  const rpc = createSolanaRpc("http://127.0.0.1:8899");
  const rpcSubscriptions = createSolanaRpcSubscriptions("ws://127.0.0.1:8900");
  
  const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });
  
  // Generate keypairs for fee payer and mint
  const sender = await generateKeyPairSigner();
  const mint = await generateKeyPairSigner();
  
  // Fund fee payer
  await airdropFactory({ rpc, rpcSubscriptions })({
    commitment: "confirmed",
    lamports: lamports(1_000_000_000n),
    recipientAddress: sender.address,
  });
  
  // Log SOL balance of fee payer
  const balance = await rpc.getBalance(sender.address).send();
  console.log("balance:", balance.value);
  
  // Storing metadata directly in the mint account
  const metadataPointerExtensionData = extension("MetadataPointer", {
    authority: some(sender.address),
    metadataAddress: some(mint.address),
  });
  
  // Using this to calculate rent lamports up front
  const tokenMetadataExtensionData = extension("TokenMetadata", {
    additionalMetadata: new Map([["description", "Only Possible On Solana"]]),
    mint: mint.address,
    name: "OPOS",
    symbol: "OPOS",
    updateAuthority: some(sender.address),
    uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
  });
  
  // The amount of space required to initialize the mint account (with metadata pointer extension only)
  const spaceWithoutMetadata = BigInt(getMintSize([metadataPointerExtensionData]));
  
  const spaceWithMetadata = BigInt(getMintSize([metadataPointerExtensionData, tokenMetadataExtensionData]));
  
  // Calculate rent lamports for mint account with metadata pointer and token metadata extensions
  const rent = await rpc.getMinimumBalanceForRentExemption(spaceWithMetadata).send();
  
  const createAccountInstruction = getCreateAccountInstruction({
    lamports: rent,
    newAccount: mint,
    payer: sender,
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    space: spaceWithoutMetadata,
  });
  
  // Instruction to initialize metadata pointer extension
  // This instruction must come before initialize mint instruction
  const initializeMetadataPointerInstruction = getInitializeMetadataPointerInstruction({
    authority: sender.address,
    metadataAddress: mint.address,
    mint: mint.address,
  });
  
  // Instruction to initialize base mint account data
  const initializeMintInstruction = getInitializeMintInstruction({
    decimals: 2,
    mint: mint.address,
    mintAuthority: sender.address,
  });
  
  // Instruction to initialize token metadata extension
  // This instruction must come after initialize mint instruction
  // This ONLY initializes basic metadata fields (name, symbol, uri)
  const initializeTokenMetadataInstruction = getInitializeTokenMetadataInstruction({
    metadata: mint.address,
    mint: mint.address,
    mintAuthority: sender,
    name: tokenMetadataExtensionData.name,
    symbol: tokenMetadataExtensionData.symbol,
    updateAuthority: sender.address,
    uri: tokenMetadataExtensionData.uri,
  });
  
  // Instruction to update token metadata extension
  // This either updates existing fields or adds the custom additionalMetadata fields
  const updateTokenMetadataInstruction = getUpdateTokenMetadataFieldInstruction({
    field: tokenMetadataField("Key", ["description"]),
    metadata: mint.address,
    updateAuthority: sender,
    value: "Only Possible On Solana",
  });
  
  // Instruction to create Associated Token Account
  const createAtaInstruction = await getCreateAssociatedTokenInstructionAsync({
    mint: mint.address,
    owner: sender.address,
    payer: sender,
  });
  
  // Derive associated token address
  const [senderAssociatedTokenAddress] = await findAssociatedTokenPda({
    mint: mint.address,
    owner: sender.address,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  
  // Instruction to mint tokens to associated token account
  const mintToInstruction = getMintToInstruction({
    amount: 100n,
    mint: mint.address,
    mintAuthority: sender.address,
    token: senderAssociatedTokenAddress,
  });
  
  // Order of instructions to add to transaction
  const setupInstructions = [
    createAccountInstruction,
    initializeMetadataPointerInstruction,
    initializeMintInstruction,
    initializeTokenMetadataInstruction,
    updateTokenMetadataInstruction,
    createAtaInstruction,
    mintToInstruction,
  ];
  
  // Get latest blockhash to include in transaction
  const { value: setupLatestBlockhash } = await rpc.getLatestBlockhash().send();
  
  // Create transaction message
  const firstTransactionMessage = pipe(
    createTransactionMessage({ version: 0 }), // Create transaction message
    (message) => setTransactionMessageFeePayerSigner(sender, message), // Set fee payer
    (message) => setTransactionMessageLifetimeUsingBlockhash(setupLatestBlockhash, message), // Set transaction blockhash
    (message) => appendTransactionMessageInstructions(setupInstructions, message), // Append instructions
  );
  
  // Sign transaction message with required signers (fee payer and mint keypair)
  const signedSetupTransaction = await signTransactionMessageWithSigners(firstTransactionMessage);
  
  // Get transaction signature for creating mint and associated token account
  const transactionSignature = getSignatureFromTransaction(signedSetupTransaction);
  
  console.log("Transaction Signature:", `https://explorer.solana.com/tx/${transactionSignature}?cluster=custom`);
  
  // Send and confirm transaction
  await sendAndConfirmTransaction(signedSetupTransaction, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  
  console.log(
    `✅ Created wallet ${sender.address} with mint ${mint.address}. Associated token address: ${senderAssociatedTokenAddress}`,
  );
  
  // OK, setup is done. Now we can send tokens to a recipient.
  
  const recipient = await generateKeyPairSigner();
  
  console.log(`ℹ Will send tokens to ${recipient.address}`);
  
  const [destinationAssociatedTokenAddress] = await findAssociatedTokenPda({
    mint: mint.address,
    owner: recipient.address,
    tokenProgram: TOKEN_2022_PROGRAM_ADDRESS,
  });
  
  console.log(`ℹ Destination associated token address: ${destinationAssociatedTokenAddress}`);
  
  const createAssociatedTokenInstruction = getCreateAssociatedTokenInstruction(
    {
      ata: destinationAssociatedTokenAddress,
      mint: mint.address,
      owner: recipient.address,
      payer: sender,
    },
    {
      programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    },
  );
  
  // SolanaError: invalid account data for instruction
  const transferInstruction = getTransferCheckedInstruction(
    {
      amount: 50n,
      authority: sender.address,
      decimals: 2,
      destination: destinationAssociatedTokenAddress,
      mint: mint.address,
      source: senderAssociatedTokenAddress,
    },
    {
      programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    },
  );

Instruction
  
  const instructions = [createAssociatedTokenInstruction, transferInstruction];
  
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
    (message) => setTransactionMessageFeePayerSigner(sender, message),
    (message) => appendTransactionMessageInstructions(instructions, message),
  );
  
  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
  
  await sendAndConfirmTransaction(signedTransaction, {
    commitment: "confirmed",
    skipPreflight: true,
  });
  
  const signature = getSignatureFromTransaction(signedTransaction);
  
  console.log("✅ Token transfer transaction Signature:", `https://explorer.solana.com/tx/${signature}?cluster=custom`);
  
  