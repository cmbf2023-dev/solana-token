// usage-examples.ts
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl,
  LAMPORTS_PER_SOL, 
  TransactionInstruction
} from "@solana/web3.js"
import { 
  AtomicTransactionBuilder, 
  deriveVaultPda, 
  createTransferInstruction,
  createMemoInstruction,
  createAndSendTransaction 
} from "@/lib/anchor-helper"

/**
 * Example 1: Basic Atomic Transaction
 * Initialize a vault and deposit funds atomically
 */
async function exampleBasicVaultCreation() {
  console.log("=== Example 1: Basic Vault Creation ===")
  
  // Setup connection and wallet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.generate() // In reality, use your actual wallet
  
  // Get some test SOL (devnet only)
  try {
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      2 * LAMPORTS_PER_SOL
    )
    await connection.confirmTransaction(airdropSignature)
    console.log("Airdrop received")
  } catch (e) {
    console.log("Skipping airdrop (might be rate-limited)")
  }
  
  const builder = new AtomicTransactionBuilder(connection, payer.publicKey)
  
  try {
    // Build atomic transaction: Create vault and deposit 1 SOL
    const signature = await builder
      .addInitVault(payer.publicKey, 'savings-vault')
      .addDeposit(payer.publicKey, deriveVaultPda(payer.publicKey, 'savings-vault'), 1.0)
      .addInstruction(createMemoInstruction('Created savings vault with initial deposit'))
      .send([payer])
    
    console.log(`✅ Transaction successful: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
  } catch (error) {
    console.error("❌ Transaction failed:", error)
  }
}

/**
 * Example 2: Multi-Step Atomic Operation
 * Create vault, deposit, and transfer in one atomic transaction
 */
async function exampleMultiStepVaultOperation() {
  console.log("\n=== Example 2: Multi-Step Vault Operation ===")
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.generate()
  const recipient = Keypair.generate().publicKey // Example recipient
  
  const builder = new AtomicTransactionBuilder(connection, payer.publicKey)
  const seed = 'payment-vault-001'
  const vaultPda = deriveVaultPda(payer.publicKey, seed)
  
  try {
    console.log(`Vault PDA: ${vaultPda.toBase58()}`)
    
    // Set priority fee for faster processing
    builder.setComputeBudget(400_000, 5000) // Higher priority
    
    // Execute multiple operations atomically
    const signature = await builder
      .addInitVault(payer.publicKey, seed)
      .addDeposit(payer.publicKey, vaultPda, 1.5)
      .addStealthTransfer(payer.publicKey, vaultPda, recipient, 0.75, 'Invoice #12345')
      .addInstruction(createMemoInstruction('Complete payment flow executed atomically'))
      .send([payer])
    
    console.log(`✅ Multi-step transaction successful: ${signature}`)
    console.log("All operations completed atomically!")
  } catch (error) {
    console.error("❌ Transaction failed - all operations rolled back:", error)
  }
}

/**
 * Example 3: Custom Instruction Building
 * Manually create and add custom instructions
 */
async function exampleCustomInstructions() {
  console.log("\n=== Example 3: Custom Instruction Building ===")
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.generate()
  const PROGRAM_ID = new PublicKey("744ESDu4zFCFz6bCo8NoKGXVSAdA4iETGhvJGmGyD7Rz")
  
  const builder = new AtomicTransactionBuilder(connection, payer.publicKey)
  
  // Create a custom instruction manually
  const customInstructionData = Buffer.concat([
    Buffer.from([255]), // Custom instruction discriminator
    Buffer.from("Custom payload"),
  ])
  
  const customInstruction = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: customInstructionData,
  })
  
  try {
    const signature = await builder
      .addInstruction(customInstruction)
      .addInstruction(createTransferInstruction(
        payer.publicKey,
        Keypair.generate().publicKey,
        0.1
      ))
      .send([payer])
    
    console.log(`✅ Custom instruction transaction successful: ${signature}`)
  } catch (error) {
    console.error("❌ Custom transaction failed:", error)
  }
}

/**
 * Example 4: Transaction Inspection and Fee Estimation
 * Build transaction without sending to inspect and estimate fees
 */
async function exampleTransactionInspection() {
  console.log("\n=== Example 4: Transaction Inspection ===")
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.generate()
  
  const builder = new AtomicTransactionBuilder(connection, payer.publicKey)
  
  try {
    // Build transaction but don't send yet
    await builder
      .addInitVault(payer.publicKey, 'inspection-vault')
      .addDeposit(payer.publicKey, deriveVaultPda(payer.publicKey, 'inspection-vault'), 0.5)
    
    // Inspect the transaction
    console.log(`Number of instructions: ${builder.getInstructionCount()}`)
    
    const instructions = builder.getInstructions()
    console.log(`First instruction program ID: ${instructions[0]?.programId.toBase58()}`)
    
    // Estimate fee
    const estimatedFee = await builder.getEstimatedFee()
    console.log(`Estimated transaction fee: ${estimatedFee} lamports (${estimatedFee / LAMPORTS_PER_SOL} SOL)`)
    
    // Build transaction to inspect
    const transaction = await builder.buildAndPrepare()
    console.log(`Transaction has ${transaction.instructions.length} instructions`)
    console.log(`Fee payer: ${transaction.feePayer?.toBase58()}`)
    console.log(`Blockhash: ${transaction.recentBlockhash?.substring(0, 16)}...`)
    
    // Reset builder if you don't want to send
    builder.reset()
    console.log("✅ Transaction built and inspected successfully (not sent)")
    
  } catch (error) {
    console.error("❌ Inspection failed:", error)
  }
}

/**
 * Example 5: Batch Operations
 * Execute multiple independent operations atomically
 */
async function exampleBatchOperations() {
  console.log("\n=== Example 5: Batch Operations ===")
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.generate()
  
  // Create multiple recipients
  const recipients = [
    Keypair.generate().publicKey,
    Keypair.generate().publicKey,
    Keypair.generate().publicKey,
  ]
  
  const builder = new AtomicTransactionBuilder(connection, payer.publicKey)
  
  try {
    // Add multiple transfers in one transaction
    builder.addInstruction(createMemoInstruction('Batch payment processing'))
    
    recipients.forEach((recipient, index) => {
      builder.addInstruction(createTransferInstruction(
        payer.publicKey,
        recipient,
        0.01 // 0.01 SOL each
      ))
      builder.addInstruction(createMemoInstruction(`Payment #${index + 1} to ${recipient.toBase58().substring(0, 8)}...`))
    })
    
    console.log(`Building batch transaction with ${builder.getInstructionCount()} instructions`)
    
    // Estimate batch fee
    const estimatedFee = await builder.getEstimatedFee()
    console.log(`Batch fee: ${estimatedFee} lamports`)
    
    // In real scenario, you would send:
    // const signature = await builder.send([payer])
    // console.log(`✅ Batch transaction successful: ${signature}`)
    
    console.log("✅ Batch transaction prepared (not sent in example)")
    builder.reset()
    
  } catch (error) {
    console.error("❌ Batch operation failed:", error)
  }
}

/**
 * Example 6: Error Handling and Rollback
 * Demonstrates atomic rollback when one instruction fails
 */
async function exampleErrorHandling() {
  console.log("\n=== Example 6: Error Handling Demonstration ===")
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.generate()
  
  console.log("This example demonstrates that if any instruction fails, all are rolled back.")
  console.log("Try creating a transaction that will intentionally fail...")
  
  const builder = new AtomicTransactionBuilder(connection, payer.publicKey)
  
  try {
    // This will fail because payer has no funds
    const signature = await builder
      .addInstruction(createTransferInstruction(
        payer.publicKey,
        Keypair.generate().publicKey,
        1000.0 // Trying to send 1000 SOL from empty wallet
      ))
      .addInstruction(createMemoInstruction('This should not execute'))
      .send([payer])
    
    console.log(`Transaction succeeded (unexpected): ${signature}`)
  } catch (error: any) {
    console.log(`❌ Transaction failed as expected: ${error.message}`)
    console.log("✅ All operations were rolled back atomically!")
  }
}

/**
 * Example 7: Complete Vault Lifecycle
 * Full vault creation, usage, and closure
 */
async function exampleCompleteVaultLifecycle() {
  console.log("\n=== Example 7: Complete Vault Lifecycle ===")
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.generate()
  const recipient = Keypair.generate().publicKey
  
  const seed = 'temporary-vault'
  const vaultPda = deriveVaultPda(payer.publicKey, seed)
  
  console.log(`Simulating complete vault lifecycle for seed: ${seed}`)
  console.log(`Vault PDA: ${vaultPda.toBase58()}`)
  
  // Note: This is a simulation since we can't actually execute without the program
  const builder = new AtomicTransactionBuilder(connection, payer.publicKey)
  
  try {
    console.log("\n1. Creating vault with deposit...")
    await builder
      .addInitVault(payer.publicKey, seed)
      .addDeposit(payer.publicKey, vaultPda, 2.0)
    
    console.log(`   Instructions ready: ${builder.getInstructionCount()}`)
    
    console.log("\n2. Adding stealth transfer...")
    await builder.addStealthTransfer(payer.publicKey, vaultPda, recipient, 1.0, 'Partial withdrawal')
    
    console.log("\n3. Closing vault...")
    await builder.addCloseVault(payer.publicKey, vaultPda)
    
    console.log("\n4. Adding final memo...")
    builder.addInstruction(createMemoInstruction('Vault lifecycle completed'))
    
    console.log(`\nTotal instructions in atomic transaction: ${builder.getInstructionCount()}`)
    console.log("✅ Complete vault lifecycle transaction prepared")
    console.log("Note: All operations will execute atomically or none will")
    
    // In production, you would call:
    // const signature = await builder.send([payer])
    
  } catch (error) {
    console.error("❌ Lifecycle simulation error:", error)
  }
}

/**
 * Example 8: Helper Function Usage
 * Using the convenience functions
 */
async function exampleHelperFunctions() {
  console.log("\n=== Example 8: Helper Function Usage ===")
  
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.generate()
  
  try {
    // Use the createAndSendTransaction helper
    const instructions = [
      createTransferInstruction(payer.publicKey, Keypair.generate().publicKey, 0.01),
      createMemoInstruction('Simple transfer using helper'),
    ]
    
    console.log("Using createAndSendTransaction helper...")
    // const signature = await createAndSendTransaction(connection, payer, instructions)
    // console.log(`✅ Helper transaction successful: ${signature}`)
    
    console.log("✅ Helper functions demonstrated (transaction not sent)")
    
  } catch (error) {
    console.error("❌ Helper function example failed:", error)
  }
}

/**
 * Main function to run all examples
 */
async function runAllExamples() {
  console.log("🚀 AtomicTransactionBuilder Usage Examples")
  console.log("==========================================\n")
  
  // Run examples (comment out as needed)
  await exampleBasicVaultCreation()
  await exampleMultiStepVaultOperation()
  await exampleCustomInstructions()
  await exampleTransactionInspection()
  await exampleBatchOperations()
  await exampleErrorHandling()
  await exampleCompleteVaultLifecycle()
  await exampleHelperFunctions()
  
  console.log("\n==========================================")
  console.log("✅ All examples completed!")
  console.log("\nKey Takeaways:")
  console.log("1. All instructions in a transaction execute atomically")
  console.log("2. If one fails, all are rolled back")
  console.log("3. Reduces RPC calls and network latency")
  console.log("4. Can bundle multiple operations efficiently")
}

// Export for use in other files
export {
  exampleBasicVaultCreation,
  exampleMultiStepVaultOperation,
  exampleCustomInstructions,
  exampleTransactionInspection,
  exampleBatchOperations,
  exampleErrorHandling,
  exampleCompleteVaultLifecycle,
  exampleHelperFunctions,
  runAllExamples
}

// Quick start example for copy-paste
export const quickStartExample = `
// Quick Start Example
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js"
import { AtomicTransactionBuilder, deriveVaultPda } from "./anchor-helper"

async function quickStart() {
  // 1. Setup
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const payer = Keypair.fromSecretKey(YOUR_SECRET_KEY) // Your wallet
  
  // 2. Create builder
  const builder = new AtomicTransactionBuilder(connection, payer.publicKey)
  
  // 3. Add operations (all execute atomically)
  await builder
    .addInitVault(payer.publicKey, 'my-vault')
    .addDeposit(payer.publicKey, deriveVaultPda(payer.publicKey, 'my-vault'), 1.0)
    .addInstruction(createMemoInstruction('Vault created'))
  
  // 4. Send
  const signature = await builder.send([payer])
  console.log('Transaction:', signature)
}

// Or use the helper:
import { createAndSendTransaction } from "./anchor-helper"

async function quickStartSimple() {
  const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed')
  const payer = Keypair.fromSecretKey(YOUR_SECRET_KEY)
  
  const instructions = [
    // Your instructions here
  ]
  
  const signature = await createAndSendTransaction(connection, payer, instructions)
}
`

// Run examples if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples().catch(console.error)
}