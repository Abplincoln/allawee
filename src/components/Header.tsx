import React from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { botChainBohrTestnet } from '../config/chain'

export const Header: React.FC = () => {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isWrongNetwork = isConnected && chain?.id !== botChainBohrTestnet.id

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = () => {
    const injectedConnector = connectors.find((c) => c.id === 'injected') || connectors[0]
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }

  return (
    <header className="header">
      <div className="header-container">
        <div className="brand">
          <div className="logo-badge">A</div>
          <div className="brand-text">
            <span className="brand-title">ALLAWEE</span>
            <span className="network-tag">Bohr Testnet</span>
          </div>
        </div>

        <div className="wallet-actions">
          {isConnected ? (
            <div className="connected-info">
              {isWrongNetwork ? (
                <button
                  className="btn btn-warning"
                  onClick={() => switchChain({ chainId: botChainBohrTestnet.id })}
                  disabled={isSwitching}
                >
                  {isSwitching ? 'Switching...' : 'Switch to BOT Chain'}
                </button>
              ) : (
                <span className="network-pill active">
                  <span className="status-dot"></span>
                  BOT Chain Testnet (968)
                </span>
              )}

              <div className="account-pill" title={address}>
                <span className="account-address">{address && formatAddress(address)}</span>
                <button
                  className="btn-disconnect"
                  onClick={() => disconnect()}
                  title="Disconnect wallet"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
