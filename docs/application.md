# Application

Plata Mia lets you send and receive private payments using stealth addresses. Each payment goes to a unique one-time address, so nobody can link your transactions together on-chain. To learn how this works under the hood, see [Stealth Addresses](/stealth-addresses).

::: warning
If you lose your stealth keys, any funds sent to your stealth addresses are permanently lost. There is no recovery mechanism. Back up your keys carefully.
:::

## Connect Your Wallet

Before using the app, connect a wallet. Plata Mia supports MetaMask and Polkadot.js.

1. Click **Connect** in the header.
2. Choose your wallet provider.
3. Approve the connection in your wallet.

Once connected, your address appears in the header. Your next step is to register your stealth keys so others can send you payments.

## Register Stealth Keys

Before anyone can send you private payments, you need to register your stealth keys on-chain.

1. Navigate to the **Receive** tab.
2. If you haven't registered before, the **Register** view opens by default.
3. Enter a **hint** — a public, human-readable name that senders use to find you, like a username. Share it with anyone you want to receive payments from. Hints cannot be changed after registration.
4. Click **Generate Keys**. The app creates two key pairs:
   - A **spending key pair** — used to claim funds from stealth addresses.
   - A **viewing key pair** — used to scan the network and identify which payments are yours.
5. Save your keys. You'll be prompted to encrypt and store them locally.
6. Click **Register** to publish your public keys to the on-chain registry.
7. Approve the transaction in your wallet. Once confirmed, you'll see a success message and the app switches to the Scan view.

After registration, anyone who knows your hint can send you private payments.

::: tip
Your private keys never leave your browser. Only the public keys are published on-chain.
:::

## Send a Payment

1. Navigate to the **Send** tab.
2. Enter the recipient's **hint** in the input field.
3. Click **Lookup**. The app finds the recipient's registered public keys.
4. Select the **source chain** and **destination chain**:
   - If both are the same, it's a same-chain transfer.
   - If they differ, it's a cross-chain transfer via Hyperbridge.
5. Select a **token** and enter the **amount**.
6. Click **Send**. The app generates a fresh stealth address for the recipient and initiates the transfer.
7. Approve the transaction in your wallet.

### Same-Chain Transfers

The tokens go directly to the stealth address on the selected chain. The transaction completes in one step.

### Cross-Chain Transfers

Cross-chain sends use Hyperbridge to bridge tokens between chains. The process has multiple steps:

1. **Source transaction** — tokens are locked on the source chain.
2. **Bridge relay** — Hyperbridge relays the message across chains. This can take several minutes depending on network conditions.
3. **Destination delivery** — tokens arrive at the stealth address on the destination chain.

You can track the progress in the **History** tab next to the send form.

## Scan for Payments

The app does not notify you automatically when you receive a payment. You need to scan manually.

1. Navigate to the **Receive** tab.
2. Switch to the **Scan** view.
3. Unlock your keys (MetaMask: sign a message, Polkadot.js: enter your password).
4. Click **Scan**. The app fetches announcements from the network and checks each one against your viewing key to find payments addressed to you.
5. If a payment is found, it appears in the list with the stealth address and amount.

## Redeem Funds

Once you've found a payment through scanning, you can claim the funds:

1. The scan results show each detected payment with its stealth address.
2. The app computes the private key for that specific stealth address that you can import in your account.

::: tip
For technical details on how key pairs, address derivation, and scanning work, see [Stealth Addresses](/stealth-addresses).
:::
