# tradetracker

Command-line companion for [TradeTracker](https://tt.ozlab.xyz) — manage your stock, crypto, deposit, and bond portfolio from the terminal.

The web app is the source of truth; this CLI talks to the same account so you can list holdings, add transactions, refresh prices, and tweak settings without leaving your shell.

## Install

```bash
cargo install tradetracker
```

This installs a `tradetracker` binary to `~/.cargo/bin`.

## Quick start

```bash
# 1. Open a browser, sign in with the same Google/email you use on the web,
#    and persist a token to ~/.config/tradetracker/config.json
tradetracker login

# 2. See your portfolio
tradetracker portfolio

# 3. Refresh live prices
tradetracker prices refresh
```

To point the CLI at a self-hosted TradeTracker instance, pass `--server` to `login` or set `TT_SERVER_URL`:

```bash
TT_SERVER_URL=https://your-host.example.com tradetracker login
```

## Commands

### Auth

| Command | Description |
| --- | --- |
| `tradetracker login [--server <url>]` | Browser-based OAuth, saves a token locally |
| `tradetracker logout` | Clear the stored token |

### Portfolio & prices

| Command | Description |
| --- | --- |
| `tradetracker portfolio` | Holdings summary with cost, market value, and unrealized P&L |
| `tradetracker prices refresh` | Force a refresh of all asset prices |
| `tradetracker prices lookup <SYMBOL> [--type crypto\|stock]` | Look up a single price |
| `tradetracker search <QUERY>` | Search Yahoo Finance / crypto symbols |

### Transactions

```bash
tradetracker transactions list
tradetracker transactions get <ID>
tradetracker transactions add \
  --symbol AAPL --trade-type buy \
  --quantity 10 --price 187.42 \
  --currency USD --date 2026-04-01 \
  --fee 0.50 --notes "long-term hold"
tradetracker transactions update <ID> --price 190.00
tradetracker transactions delete <ID>
```

### Deposits

```bash
tradetracker deposits list
tradetracker deposits add \
  --symbol "ICBC-CD-12M" --principal 50000 \
  --interest-rate 2.85 --currency CNY \
  --start-date 2026-01-15 --maturity-date 2027-01-15
tradetracker deposits update <ID> --interest-rate 3.00
tradetracker deposits withdraw <ID> --amount 10000
tradetracker deposits delete <ID>
```

### Settings

```bash
tradetracker settings                       # show current preferences
tradetracker settings set currency CNY      # USD | CNY | HKD
tradetracker settings set language zh       # en | zh
tradetracker settings set color-scheme cn   # us | cn
tradetracker settings set style-theme classic  # sketchy | classic
```

Run `tradetracker --help` (or `tradetracker <command> --help`) for the full flag list.

## Configuration

| Path / variable | Purpose |
| --- | --- |
| `~/.config/tradetracker/config.json` | Stored auth token and server URL |
| `TT_SERVER_URL` | Override the server URL for `login` |

To switch accounts, run `tradetracker logout` and `tradetracker login` again.

## Links

- Web app: <https://tt.ozlab.xyz>
- Source: <https://github.com/lxhyl/trade-tracker>
- Issues: <https://github.com/lxhyl/trade-tracker/issues>

## License

MIT
