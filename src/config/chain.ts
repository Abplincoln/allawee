import { defineChain } from 'viem'
import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'

export const botChainBohrTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Bohr Testnet',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOHR Scan',
      url: 'https://scan.bohr.life',
    },
  },
  testnet: true,
})

export const config = createConfig({
  chains: [botChainBohrTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [botChainBohrTestnet.id]: http('https://rpc.bohr.life'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
