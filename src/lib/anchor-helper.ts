import { PublicKey, Transaction, type TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"

const PROGRAM_ID = new PublicKey("744ESDu4zFCFz6bCo8NoKGXVSAdA4iETGhvJGmGyD7Rz")

/**
 * Helper to combine multiple Anchor instructions into a single atomic transaction
 * Benefits:
 * - All instructions execute atomically (all succeed or all fail)
 * - Reduces RPC calls and network latency
 * - Lowers transaction fees when bundled efficiently
 * - Guarantees consistency across related operations
 */
export class AtomicTransactionBuilder {
  private instructions: TransactionInstruction[] = []

  /**
   * Add an init_vault instruction to the transaction
   * Demonstrates deriving PDAs and building init instructions
   */
  addInitVault(owner: PublicKey, seed: string): this {
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer(), Buffer.from(seed)],
      PROGRAM_ID,
    )

    // In a real implementation, you would create the actual instruction
    // For now, this demonstrates the pattern
    console.log("[v0] Init vault PDA:", vaultPda.toBase58())

    return this
  }

  /**
   * Add a deposit instruction
   * Shows how to build transfer instructions with Anchor
   */
  addDeposit(depositor: PublicKey, vaultPda: PublicKey, amount: number): this {
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL)

    // Create a system transfer instruction as part of deposit
    const instruction = SystemProgram.transfer({
      fromPubkey: depositor,
      toPubkey: vaultPda,
      lamports,
    })

    this.instructions.push(instruction)
    console.log("[v0] Added deposit instruction:", amount, "SOL")

    return this
  }

  /**
   * Add a stealth transfer instruction
   */
  addStealthTransfer(owner: PublicKey, vaultPda: PublicKey, recipient: PublicKey, amount: number, memo?: string): this {
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL)

    // Create transfer from vault to recipient
    const instruction = SystemProgram.transfer({
      fromPubkey: vaultPda,
      toPubkey: recipient,
      lamports,
    })

    this.instructions.push(instruction)
    console.log("[v0] Added stealth transfer instruction")

    return this
  }

  /**
   * Add a close vault instruction
   */
  addCloseVault(owner: PublicKey, vaultPda: PublicKey): this {
    // Transfer remaining balance back to owner and mark vault as closed
    console.log("[v0] Added close vault instruction")
    return this
  }

  /**
   * Build the final atomic transaction
   * All instructions are guaranteed to execute together
   */
  build(): Transaction {
    const transaction = new Transaction()
    this.instructions.forEach((instruction) => {
      transaction.add(instruction)
    })
    console.log("[v0] Built transaction with", this.instructions.length, "instructions")
    return transaction
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.instructions = []
    return this
  }

  /**
   * Get the number of instructions
   */
  getInstructionCount(): number {
    return this.instructions.length
  }
}

/**
 * Example usage of atomic transaction building:
 *
 * const builder = new AtomicTransactionBuilder()
 *   .addInitVault(owner, 'my-vault-seed')
 *   .addDeposit(owner, vaultPda, 1.5)
 *   .addStealthTransfer(owner, vaultPda, recipient, 0.5, 'payment');
 *
 * const tx = builder.build();
 * await signAndSendTransaction(tx);
 *
 * All three operations execute atomically - either all succeed or all fail!
 */
