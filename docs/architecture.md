# Architecture

Plata Mia is built from four components that work together. As a user, you interact with the web app — the other three run behind the scenes to handle cryptography, on-chain storage, and private announcement delivery.

## Components

### Web App

The interface you see and use. It handles connecting your wallet, registering your stealth keys, sending payments, and scanning for received funds. Built with Next.js and React.

### Stealth Core

A cryptography library that runs in your browser. It generates your key pairs, derives one-time stealth addresses when you send payments, and scans announcements to detect payments addressed to you. You never interact with it directly — the web app calls it automatically.

### Registry Contract

A smart contract on Polkadot Asset Hub that stores public keys. When you register with a hint like "alice," your two public keys are saved on-chain so anyone can look them up. The hint itself is hashed before storage — the plain text never appears on-chain.

### Announcement Proxy

An HTTP service that connects to the xx network, a mixnet that strips metadata (like IP addresses) from messages. After sending a payment, the app publishes a small announcement through this proxy. The mixnet ensures that the announcement can't be traced back to you.

## How They Connect

**Registration:**
The web app generates your key pairs using stealth core, then writes them to the registry contract on-chain.

**Sending:**
The web app looks up the recipient's public keys from the registry contract, derives a one-time stealth address using stealth core, sends funds on-chain, and publishes an announcement through the proxy.

**Receiving:**
The web app fetches announcements from the proxy, scans them with stealth core to find payments addressed to you, and displays the results with balances.

