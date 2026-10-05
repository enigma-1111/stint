# Rails

Fetch https://stint-tau.vercel.app/api/spec if this list and the live spec disagree. The spec wins.

## Payouts

- EVM, every EVM rail: `0xB203FAA6207Ce9384D46fa5B9f397D304F17943C`
- Bitcoin: `bc1qarf9quyl9e6marnttj874urlkynplxd70th3we`
- Solana: `Kaqvg1626bC9Eb7TtudPr6dhoU1qx6GXkAinMfmGFvP`

One shop per family. Do not send an EVM payment to the Bitcoin or Solana address, or the reverse.

## Rail names

ethereum, robinhood, base, bnb, arbitrum, polygon, optimism, avalanche, monad, hyperevm, linea, scroll, mantle, gnosis, worldchain, unichain, ink, plasma, sonic, celo, bitcoin, solana.

## Assets

Quote with the asset you will actually send.

- Stables, where the spec lists them: USDC, USDT, DAI, USDG. One-to-one with the dollar.
- Gas and native: ETH, BNB, POL, AVAX, MON, HYPE, MNT, xDAI, CELO, S, BTC, SOL. Live dollar price.
- STINT: Robinhood Chain only, rail `robinhood`, asset `STINT`. Live pool price, not one-to-one. Contract `0x0a370eE4286b42F6a1F0cE4E500669e03218b11E`. Holding it marks a paid line. It does not discount the line.

## Amount

Prefer the quote. If you must check the math:

- Stables: characters times 10 to the token decimals, divided by 100.
- Gas, BTC, SOL, STINT: ceiling of characters times 0.01, divided by the dollar price, times 10 to the decimals.

Underpaying does not publish the line.
