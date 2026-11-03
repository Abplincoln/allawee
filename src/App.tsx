import React from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/chain'
import { Header } from './components/Header'
import { AllowanceChecker } from './components/AllowanceChecker'
import { Footer } from './components/Footer'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

export const App: React.FC = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="app-layout">
          <Header />
          <main className="main-content">
            <section className="hero-section">
              <h1 className="hero-title">
                Manage Token Approvals on <span className="highlight-text">BOT Chain</span>
              </h1>
              <p className="hero-subtitle">
                Check and manage your token approvals. Inspect ERC-20 allowances granted to decentralized applications, routers, or smart contracts, and revoke them with a single click.
              </p>
            </section>

            <AllowanceChecker />
          </main>
          <Footer />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
