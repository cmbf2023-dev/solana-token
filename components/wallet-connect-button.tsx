"use client"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

export function WalletConnectButton() {
  return (
    <WalletMultiButton
      className=
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      
    />
  )
}
