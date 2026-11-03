import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <p className="footer-brand">ALLAWEE</p>
          <p className="footer-subtitle">Minimal ERC-20 Allowance Checker & Revocation Tool</p>
        </div>
        <div className="footer-links">
          <a
            href="https://www.botchain.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            BOT Chain Official Website ↗
          </a>
          <a
            href="https://scan.bohr.life/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            BOHR Testnet Explorer ↗
          </a>
        </div>
      </div>
    </footer>
  )
}
