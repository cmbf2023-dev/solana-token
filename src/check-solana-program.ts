import { Connection, PublicKey } from "@solana/web3.js";

// Your deployed program ID from the console
const PROGRAM_ID = new PublicKey("2WaTn2ATgtiDraS2TKuLaVnA2bJFdPUGCpchkkXxw46J");

async function verifyDeployment() {
  const connection = new Connection("https://api.devnet.solana.com");
  
  try {
    // Check if the program exists on devnet
    const programAccount = await connection.getAccountInfo(PROGRAM_ID);
    
    if (programAccount) {
      console.log("✅ Program deployment verified!");
      console.log("Program ID:", PROGRAM_ID.toString());
      console.log("Owner:", programAccount.owner.toString());
      console.log("Executable:", programAccount.executable);
      console.log("Data size:", programAccount.data.length, "bytes");
      return true;
    } else {
      console.log("❌ Program not found on devnet");
      return false;
    }
  } catch (error) {
    console.error("Error verifying deployment:", error);
    return false;
  }
}

// Run the verification
verifyDeployment();