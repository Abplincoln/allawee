import React, { useState, useEffect, useCallback } from 'react'
import { isAddress, formatUnits, type Address, getAddress } from 'viem'
import { useAccount, usePublicClient, useWriteContract, useSwitchChain } from 'wagmi'
import { erc20Abi } from '../contracts/erc20Abi'
import { botChainBohrTestnet } from '../config/chain'

interface TokenInfo {
  name: string
  symbol: string
  decimals: number
  allowance: bigint
  formattedAllowance: string
  isUnlimited: boolean
}

type TxStatus = 'idle' | 'awaiting_signature' | 'confirming' | 'success' | 'error'

const MAX_UINT256 = 2n ** 256n - 1n

export const AllowanceChecker: React.FC = () => {
  const { address: ownerAddress, isConnected, chain } = useAccount()
  const publicClient = usePublicClient({ chainId: botChainBohrTestnet.id })
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  // Form inputs
  const [tokenAddressInput, setTokenAddressInput] = useState('')
  const [spenderAddressInput, setSpenderAddressInput] = useState('')

  // Validation & Loading
  const [inputErrors, setInputErrors] = useState<{ token?: string; spender?: string }>({})
  const [isChecking, setIsChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  // Results
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [queriedSpender, setQueriedSpender] = useState<Address | null>(null)
  const [queriedToken, setQueriedToken] = useState<Address | null>(null)

  // Revocation transaction state
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [txError, setTxError] = useState<string | null>(null)

  const isWrongNetwork = isConnected && chain?.id !== botChainBohrTestnet.id

  const validateInputs = (): { valid: boolean; token?: Address; spender?: Address } => {
    const errors: { token?: string; spender?: string } = {}
    const trimmedToken = tokenAddressInput.trim()
    const trimmedSpender = spenderAddressInput.trim()

    if (!trimmedToken) {
      errors.token = 'Token contract address is required.'
    } else if (!isAddress(trimmedToken)) {
      errors.token = 'Invalid token contract address.'
    }

    if (!trimmedSpender) {
      errors.spender = 'Spender address is required.'
    } else if (!isAddress(trimmedSpender)) {
      errors.spender = 'Invalid spender address.'
    }

    setInputErrors(errors)

    if (errors.token || errors.spender) {
      return { valid: false }
    }

    return {
      valid: true,
      token: getAddress(trimmedToken),
      spender: getAddress(trimmedSpender),
    }
  }

  const fetchAllowanceData = useCallback(
    async (tokenAddr: Address, spenderAddr: Address, owner: Address) => {
      if (!publicClient) {
        setCheckError('Blockchain client is not available. Please reconnect your wallet.')
        return
      }

      setIsChecking(true)
      setCheckError(null)

      try {
        // Read name, symbol, decimals, and allowance in parallel
        const [nameRes, symbolRes, decimalsRes, allowanceRes] = await Promise.allSettled([
          publicClient.readContract({
            address: tokenAddr,
            abi: erc20Abi,
            functionName: 'name',
          }),
          publicClient.readContract({
            address: tokenAddr,
            abi: erc20Abi,
            functionName: 'symbol',
          }),
          publicClient.readContract({
            address: tokenAddr,
            abi: erc20Abi,
            functionName: 'decimals',
          }),
          publicClient.readContract({
            address: tokenAddr,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [owner, spenderAddr],
          }),
        ])

        if (allowanceRes.status === 'rejected') {
          throw new Error(
            'Failed to read allowance. Please verify that this contract is a valid ERC-20 token on BOT Chain Bohr Testnet.'
          )
        }

        const name = nameRes.status === 'fulfilled' ? nameRes.value : 'Unknown Token'
        const symbol = symbolRes.status === 'fulfilled' ? symbolRes.value : 'TOKEN'
        const decimals = decimalsRes.status === 'fulfilled' ? Number(decimalsRes.value) : 18
        const allowance = allowanceRes.value

        const isUnlimited = allowance === MAX_UINT256
        const formattedAllowance = isUnlimited
          ? 'Unlimited (Max uint256)'
          : formatUnits(allowance, decimals)

        setTokenInfo({
          name,
          symbol,
          decimals,
          allowance,
          formattedAllowance,
          isUnlimited,
        })
        setQueriedToken(tokenAddr)
        setQueriedSpender(spenderAddr)
      } catch (err: unknown) {
        console.error('Error querying allowance:', err)
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to query token allowance. Ensure the address is an ERC-20 contract on BOT Chain Bohr Testnet.'
        setCheckError(msg)
        setTokenInfo(null)
      } finally {
        setIsChecking(false)
      }
    },
    [publicClient]
  )

  const handleCheckAllowance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !ownerAddress) {
      setCheckError('Please connect your wallet first to inspect token allowances.')
      return
    }

    const { valid, token, spender } = validateInputs()
    if (!valid || !token || !spender) return

    // Clear previous tx messages
    setTxStatus('idle')
    setTxHash(null)
    setTxError(null)

    await fetchAllowanceData(token, spender, ownerAddress)
  }

  // Revoke Allowance: Call approve(spender, 0)
  const handleRevokeAllowance = async () => {
    if (!isConnected || !ownerAddress) {
      setTxError('Please connect your wallet.')
      return
    }

    if (isWrongNetwork) {
      setTxError('Please switch to BOT Chain Bohr Testnet before performing transactions.')
      return
    }

    if (!queriedToken || !queriedSpender) {
      setTxError('Missing queried token or spender address.')
      return
    }

    if (!tokenInfo || tokenInfo.allowance === 0n) {
      setTxError('Allowance is already zero.')
      return
    }

    setTxStatus('awaiting_signature')
    setTxError(null)
    setTxHash(null)

    try {
      // 1. Submit approval transaction to wallet
      const hash = await writeContractAsync({
        address: queriedToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [queriedSpender, 0n],
        chainId: botChainBohrTestnet.id,
      })

      setTxHash(hash)
      setTxStatus('confirming')

      // 2. Wait for transaction receipt
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status === 'success') {
          setTxStatus('success')
          // Refresh allowance automatically
          await fetchAllowanceData(queriedToken, queriedSpender, ownerAddress)
        } else {
          setTxStatus('error')
          setTxError('Transaction reverted on-chain. Please check explorer for details.')
        }
      } else {
        setTxStatus('success')
      }
    } catch (err: unknown) {
      console.error('Revocation transaction failed:', err)
      setTxStatus('error')
      const msg =
        err instanceof Error
          ? err.message.includes('User rejected')
            ? 'Transaction rejected in wallet.'
            : err.message
          : 'Failed to revoke allowance.'
      setTxError(msg)
    }
  }

  // Reset queried token and allowance state if owner changes or disconnects
  useEffect(() => {
    setTokenInfo(null)
    setQueriedToken(null)
    setQueriedSpender(null)
    setTxStatus('idle')
    setTxHash(null)
    setTxError(null)
    setCheckError(null)
  }, [isConnected, ownerAddress])

  return (
    <div className="allowance-container">
      {/* Network Warning Banner */}
      {isWrongNetwork && (
        <div className="alert alert-warning">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Incorrect Network Detected:</strong> You are currently connected to an unsupported network. Please switch to <strong>BOT Chain Bohr Testnet (Chain ID 968)</strong> to interact with ALLAWEE.
            </div>
          </div>
          <button
            className="btn btn-warning-sm"
            onClick={() => switchChain({ chainId: botChainBohrTestnet.id })}
            disabled={isSwitching}
          >
            {isSwitching ? 'Switching...' : 'Switch Network'}
          </button>
        </div>
      )}

      {/* Main Checker Card */}
      <div className="card main-card">
        <div className="card-header">
          <h2 className="card-title">Check Token Allowance</h2>
          <p className="card-subtitle">
            Enter an ERC-20 token address and spender address to query approved allowances for your connected wallet.
          </p>
        </div>

        <form onSubmit={handleCheckAllowance} className="allowance-form">
          <div className="form-group">
            <label htmlFor="tokenAddress" className="form-label">
              ERC-20 Token Contract Address
            </label>
            <input
              id="tokenAddress"
              type="text"
              placeholder="0x..."
              value={tokenAddressInput}
              onChange={(e) => {
                setTokenAddressInput(e.target.value)
                if (inputErrors.token) setInputErrors((prev) => ({ ...prev, token: undefined }))
              }}
              className={`form-input ${inputErrors.token ? 'input-error' : ''}`}
              spellCheck={false}
              autoComplete="off"
            />
            {inputErrors.token && <span className="field-error">{inputErrors.token}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="spenderAddress" className="form-label">
              Spender Address (DApp, Router, or Contract)
            </label>
            <input
              id="spenderAddress"
              type="text"
              placeholder="0x..."
              value={spenderAddressInput}
              onChange={(e) => {
                setSpenderAddressInput(e.target.value)
                if (inputErrors.spender) setInputErrors((prev) => ({ ...prev, spender: undefined }))
              }}
              className={`form-input ${inputErrors.spender ? 'input-error' : ''}`}
              spellCheck={false}
              autoComplete="off"
            />
            {inputErrors.spender && <span className="field-error">{inputErrors.spender}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isChecking || !isConnected}
          >
            {isChecking
              ? 'Reading Blockchain State...'
              : !isConnected
              ? 'Connect Wallet to Check Allowance'
              : 'Check Allowance'}
          </button>
        </form>

        {checkError && (
          <div className="alert alert-danger" style={{ marginTop: '1.25rem' }}>
            <span className="alert-icon">❌</span>
            <div className="alert-text">{checkError}</div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {tokenInfo && queriedToken && queriedSpender && (
        <div className="card results-card">
          <div className="results-header">
            <div>
              <span className="badge badge-token">{tokenInfo.symbol}</span>
              <h3 className="results-title">{tokenInfo.name}</h3>
            </div>
            {tokenInfo.allowance > 0n ? (
              <span className="status-badge status-warning">
                ● Active Allowance Detected
              </span>
            ) : (
              <span className="status-badge status-safe">
                ✓ Zero Allowance (Safe)
              </span>
            )}
          </div>

          <div className="results-grid">
            <div className="result-item">
              <span className="result-label">Token Contract</span>
              <span className="result-value mono" title={queriedToken}>
                {queriedToken}
              </span>
            </div>

            <div className="result-item">
              <span className="result-label">Spender Address</span>
              <span className="result-value mono" title={queriedSpender}>
                {queriedSpender}
              </span>
            </div>

            <div className="result-item">
              <span className="result-label">Decimals</span>
              <span className="result-value">{tokenInfo.decimals}</span>
            </div>

            <div className="result-item highlight-item">
              <span className="result-label">Current Allowance</span>
              <div className="allowance-display">
                <span className="allowance-amount">
                  {tokenInfo.formattedAllowance}
                </span>
                <span className="allowance-symbol">{tokenInfo.symbol}</span>
              </div>
              {tokenInfo.isUnlimited && (
                <span className="unlimited-notice">
                  ⚠️ This spender has unlimited permission to spend this token.
                </span>
              )}
            </div>
          </div>

          {/* Revoke Action Section */}
          <div className="action-section">
            {tokenInfo.allowance > 0n ? (
              <div className="revoke-box">
                <div className="revoke-info">
                  <h4>Revoke Approval</h4>
                  <p>
                    Set the allowance to zero (<code>approve(spender, 0)</code>) to permanently protect your funds from unauthorized spending by this contract.
                  </p>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={handleRevokeAllowance}
                  disabled={
                    txStatus === 'awaiting_signature' ||
                    txStatus === 'confirming' ||
                    isWrongNetwork
                  }
                >
                  {txStatus === 'awaiting_signature'
                    ? 'Confirm in Wallet...'
                    : txStatus === 'confirming'
                    ? 'Confirming On-Chain...'
                    : 'Revoke Allowance'}
                </button>
              </div>
            ) : (
              <div className="zero-allowance-box">
                <span className="check-icon">✓</span>
                <span>No active allowance exists for this token and spender. Your tokens cannot be moved by this spender.</span>
              </div>
            )}
          </div>

          {/* Transaction Feedback Section */}
          {txStatus !== 'idle' && (
            <div className="tx-feedback">
              {txStatus === 'awaiting_signature' && (
                <div className="alert alert-info">
                  <span className="spinner"></span>
                  <div>
                    <strong>Signature Required:</strong> Please check your connected wallet to confirm the revocation transaction.
                  </div>
                </div>
              )}

              {txStatus === 'confirming' && (
                <div className="alert alert-info">
                  <span className="spinner"></span>
                  <div>
                    <strong>Transaction Submitted:</strong> Waiting for block confirmation on BOT Chain Bohr Testnet...
                    {txHash && (
                      <div className="tx-hash-link">
                        <a
                          href={`https://scan.bohr.life/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Transaction on BOHR Scan ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {txStatus === 'success' && (
                <div className="alert alert-success">
                  <span className="alert-icon">🎉</span>
                  <div>
                    <strong>Allowance Revoked Successfully!</strong>
                    <p className="alert-desc">The allowance has been reset to 0.</p>
                    {txHash && (
                      <div className="tx-hash-link">
                        <a
                          href={`https://scan.bohr.life/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Confirmed Transaction on BOHR Scan ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {txStatus === 'error' && (
                <div className="alert alert-danger">
                  <span className="alert-icon">❌</span>
                  <div>
                    <strong>Revocation Failed:</strong>
                    <p className="alert-desc">{txError || 'Transaction failed or was rejected.'}</p>
                    {txHash && (
                      <div className="tx-hash-link">
                        <a
                          href={`https://scan.bohr.life/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Transaction on BOHR Scan ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
