# Wallet App

This is how to use `@solana/web3.js` and `@solana/react` to build a React web application.

## Features

- Connects to browser wallets that support the Wallet Standard; one or more at a time
- Fetches and subscribes to the balance of the selected wallet
- Connect to backend apis to get List of NFTs
- Allows you to make a transfer from the selected wallet to any other connected wallet

## Sample Data to Render NFT in the Web App
```shell

[ { "id": 1, "publicKey": "8pgtyLWYWc4Kmzy7NyoTPAmBQp4VMrQ45TgwUh9ddJhq", "name": "Pup Test NFT", "symbol": "", "uri": "https://arweave.net/8pgtyLWYWc4Kmzy7NyoTPAmBQp4VMrQ45TgwUh9ddJhq", "selected": false, "description": "Pup Test NFT", "image": ".../nftdata/main/dog1.jpg" } ]
```

## Developing

Start a server in development mode.

```shell
pnpm install
pnpm turbo compile:js compile:typedefs
pnpm dev
```

Press <kbd>o</kbd> + <kbd>Enter</kbd> to open the app in a browser. Edits to the source code will automatically reload the app.

## Building for deployment

Build a static bundle and HTML for deployment to a webserver.

```shell
pnpm install
pnpm turbo build
```

The contents of the `dist/` directory can now be uploaded to a webserver.

## Enabling Mainnet-Beta

Access to this cluster is typically blocked by [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) rules, so it is disabled in the example app by default. To enable it, start the server or compile the application with the `REACT_EXAMPLE_APP_ENABLE_MAINNET` environment variable set to `"true"`.

```shell
REACT_EXAMPLE_APP_ENABLE_MAINNET=true pnpm dev
REACT_EXAMPLE_APP_ENABLE_MAINNET=true pnpm build
```
