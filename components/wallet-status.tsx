"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { Badge } from "../src/components/ui/badge"

export function WalletStatus() {
  const { connected, connecting, disconnecting } = useWallet()

  if (connecting) {
    return (
      <Badge variant="secondary" className="font-normal">
        Connecting...
      </Badge>
    )
  }

  if (disconnecting) {
    return (
      <Badge variant="secondary" className="font-normal">
        Disconnecting...
      </Badge>
    )
  }

  if (connected) {
    return (
      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:bg-green-500/20 dark:text-green-400">
        Connected
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="font-normal">
      Not Connected
    </Badge>
  )
}
