"use client"

import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useEffect, useState } from "react"
import { Card, CardContent } from "../src/components/ui/card"
import { Spinner } from "../src/components/ui/spinner"

export function WalletBalance() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) {
      setBalance(null)
      return
    }

    setLoading(true)

    // Fetch balance
    connection
      .getBalance(publicKey)
      .then((balance) => {
        setBalance(balance / LAMPORTS_PER_SOL)
      })
      .catch((err) => {
        console.error("[v0] Failed to fetch balance:", err)
      })
      .finally(() => {
        setLoading(false)
      })

    // Subscribe to balance changes
    const subscriptionId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        setBalance(accountInfo.lamports / LAMPORTS_PER_SOL)
      },
      "confirmed",
    )

    return () => {
      connection.removeAccountChangeListener(subscriptionId)
    }
  }, [publicKey, connection])

  if (!publicKey) {
    return null
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Wallet Balance</p>
            {loading ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : (
              <p className="text-2xl font-bold text-foreground">
                {balance !== null ? `${balance.toFixed(4)} SOL` : "—"}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.6 17.7h16.8l-2.7 2.7c-.4.4-.4 1 0 1.4.4.4 1 .4 1.4 0l4.4-4.4c.4-.4.4-1 0-1.4l-4.4-4.4c-.4-.4-1-.4-1.4 0-.4.4-.4 1 0 1.4l2.7 2.7H3.6c-.6 0-1 .4-1 1s.4 1 1 1zm16.8-11.4H3.6l2.7-2.7c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0L.5 6.6c-.4.4-.4 1 0 1.4l4.4 4.4c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4L3.6 8.3h16.8c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
          </div>
        </div>
        {publicKey && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Address:</p>
            <code className="flex-1 truncate text-xs font-mono">{publicKey.toBase58()}</code>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
