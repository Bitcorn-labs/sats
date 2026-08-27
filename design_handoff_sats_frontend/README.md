# Handoff: SATS frontend (ckBTC ⇄ SATS exchange)

## Overview

A complete redesign of the SATS frontend — the web app where users wrap **ckBTC** into **SATS** and unwrap back. SATS is a low-fee ckBTC wrapper on ICP: one raw ckBTC unit (one satoshi) becomes `1.00000000 SATS`, and SATS is divisible eight decimals further, so transfers cost ~10,000,000× less than moving ckBTC.

The design replaces the forked Bob/GLDT frontend entirely. Nothing from the old UI carries over except the functionality it implied. The **only** brand asset reused is the SATS token logo (`sats_black.svg` / `sats_white.svg`).

Single-page app. There is **no marketing/landing page** — users land directly on the swap screen in a signed-out state.

## About the design files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. `.dc.html` files use an internal streaming-component runtime (`<sc-if>`, `<sc-for>`, `{{ hole }}` templates, a `Component extends DCLogic` logic class); **do not** try to run or port that runtime.

The task is to **recreate these designs in this repo's existing environment**: React 18 + TypeScript + Vite, with `@icp-sdk/*` clients for agent/auth/ICRC calls (see `CLAUDE.md` §6 — prefer the official SDK over custom-rolled equivalents). Existing components under `src/components/` (`CkBTCMintingField`, `SatsWithdrawField`, `TokenManagement`, `TokenReceive`, `TransactionBox`, `InternetIdentityLoginHandler`, `ShowTransactionStatus`) hold the working canister logic; **keep the call sequences, replace the UI**. MUI (`@mui/material`) and `src/theme.ts` / `App.css` / `index.scss` are no longer needed for these screens — plain CSS/CSS modules is enough and avoids fighting MUI's `TextField` chrome.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, radii and copy. Recreate pixel-accurately. Every hex value, font size, radius and string below is taken from the prototype; where a value is not listed, read it off `SATS App.dc.html`.

---

## Design tokens

### Color

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0E0D0B` | Page background (warm near-black) |
| `surface` | `#141210` | Header bar, cards, footer strip |
| `surface-sunken` | `#1A1713` | Inputs, rows inside cards, fee breakdown, list rows |
| `surface-raised` | `#221D17` | Pills, segmented-control track, MAX/Send chips, principal chip |
| `surface-raised-hi` | `#2B2318` | MAX pill inside amount fields, Send button, Copy button (idle) |
| `border` | `#241F19` | Default 1px card/input border, grid gap lines |
| `border-strong` | `#302921` | Elevated swap card, Sign-out button outline |
| `border-faint` | `#1C1815` | Row dividers inside tables/lists |
| `text` | `#F5F0E8` | Primary text |
| `text-2` | `#D4CCBE` | Principal chip text, receive-address text |
| `text-3` | `#B4AB9C` | Secondary values in tables |
| `muted` | `#948C7E` | Labels, captions, inactive nav |
| `muted-2` | `#6F6659` | Monospace footnotes, disabled text, column headers |
| `accent` | `#E8912F` | Amber — CTAs, active pill, receive amount, positive deltas, logo tile |
| `accent-on` | `#17130E` | Text/icon on amber |
| `danger` | `#E8734A` | Below-minimum text and error accents |
| `danger-border` | `#7A3A22` | Error card border |
| `danger-bg` | `#1F1512` | Error field background |

Roughly two backgrounds only (`#0E0D0B` page, `#141210` card) plus the sunken/raised steps. No gradients anywhere.

### Typography

- **Display / UI:** `Archivo` (Google Fonts, weights 400/500/600/700/800). Fallback `system-ui, sans-serif`.
- **Numbers / labels / code:** `Space Mono` (400/700). All monetary values, principals, block indices, and uppercase micro-labels.

| Role | Font | Size | Weight | Extra |
|---|---|---|---|---|
| Brand wordmark "Sats" | Archivo | 16px | 800 | `letter-spacing:-0.01em` |
| Nav item | Archivo | 13px | 500 | |
| Card title (`The vault`, `Wrap`, `Send`, `Activity`) | Archivo | 19px | 700 | `letter-spacing:-0.01em` |
| Section body copy | Archivo | 13px | 400 | `line-height:1.6`, `text-wrap:pretty` |
| Field label ("You pay") | Archivo | 12px | 400 | color `muted` |
| Amount input / receive value | Space Mono | 32px | 400 | `font-variant-numeric:tabular-nums`, right-aligned |
| Stat-strip value | Space Mono | 16px | 400 | tabular-nums |
| Balance/inline caption | Space Mono | 11px | 400 | color `muted` |
| Uppercase micro-label | Space Mono | 9.5–11px | 400 | `letter-spacing:.12em`, color `muted` |
| Fee-breakdown row | Archivo label / Space Mono value | 12.5px | 400 (700 on total) | |
| Primary CTA | Archivo | 15px | 700 | height 54px |
| Table cell (Activity) | Space Mono | 12–13px | 400 | |
| Footer disclaimer | Archivo | 11.5px | 400 | `line-height:1.6`, color `muted-2` |

### Spacing, radius, elevation

- Page gutter `28px`; content `max-width:1180px`, centred.
- Vertical rhythm: `20px` between stacked cards, `24px` between major blocks, `28px` grid gap.
- Card padding `24–26px`; input/row padding `18px 20px`; small chip padding `3px 8px`.
- Radii: `6px` nav pill · `8px` chips, stat strip cells, list rows · `10px` inputs, buttons, stat strip container · `12px` cards · `14px` elevated swap card · `999px` token pills · `50%` circular glyphs.
- Only one shadow in the design, on the swap card: `0 24px 60px rgba(0,0,0,.45)`.
- 1px borders only; hairline dividers are `1px` solid `border`/`border-faint`, or a 1px grid gap over a `#241F19` background.

---

## Screens / views

One route. Three tabs (`swap` | `wallet` | `activity`) and two auth states (signed out / signed in). Tabs and the wallet/activity views are only reachable when signed in.

### Global chrome — header

Sticky top bar, `z-index:5`. Background `surface`, `border-bottom:1px solid border`, padding `16px 28px`, flex space-between.

- **Left:** logo tile — 32×32, `background:accent`, `border-radius:6px`, containing `sats_black.svg` at 24×24 — then the wordmark "Sats". Clicking returns to the Swap tab.
- **Left, signed in only:** nav `Swap` / `Wallet` / `Activity`, 4px gap. Active: `background:surface-raised`, `color:text`. Inactive: transparent, `color:muted`. Padding `7px 13px`, radius 6px.
- **Right, signed in:** principal chip — `background:surface-raised`, radius 8px, padding `8px 12px`, a 7px amber dot, then the truncated principal in Space Mono 12px `text-2` (e.g. `hqbg2-ryaaa…4ae-cai`). Then **Sign out**: `1px solid border-strong`, radius 8px, 12px `muted`; hover → border `#3E362C`, text `text-2`.
- **Right, signed out:** **Connect Internet Identity** — `background:accent`, `color:accent-on`, radius 8px, padding `10px 16px`, 13px/700, with a 7px `accent-on` dot at 55% opacity.

### Global chrome — footer

Inside the content column: `padding:0 28px 40px`, 11.5px `muted-2`, line-height 1.6:

> No warranty. You use SATS entirely at your own risk — financial loss, technical failure, contract risk.

### 1. Swap tab (the hero — this is what you land on)

Content column is `max-width:1180px`, `padding:28px 28px 56px`, `display:flex; flex-direction:column; gap:24px`.

**a) Public vault stat strip** (always visible, signed in or out)

A 4-up grid: `grid-template-columns:repeat(4,1fr); gap:1px; background:border; border:1px solid border; border-radius:10px; overflow:hidden`. Each cell `background:surface`, padding `14px 18px`; label in Space Mono 9.5px `.12em` uppercase `muted`, value in Space Mono 16px tabular-nums.

| Label | Value | Note |
|---|---|---|
| CKBTC IN VAULT | `12.48310250` | `icrc1_balance_of` on the ckBTC ledger for the backend canister principal. Read **anonymously** — must render before connect. |
| SATS SUPPLY | `1,248,310,250` | `icrc1_total_supply` on the backend (SATS ledger) |
| HOLDERS | `3,417` | optional; omit the cell if you have no source |
| BACKING | `1:100,000,000` | static, `color:accent` |

**b) Two-column body**

`display:grid; grid-template-columns:minmax(0,620px) minmax(320px,1fr); gap:28px; align-items:start`.
⚠️ Both tracks **must** be `minmax(0, …)` — a fixed `620px` track plus a `1fr` track overflows and clips the right rail below ~1180px. This was a real bug in the prototype; don't reintroduce it.

**Left column — the swap card** (`background:surface; border:1px solid border-strong; border-radius:14px; padding:24px; box-shadow:0 24px 60px rgba(0,0,0,.45)`)

1. **Header row:** title `Wrap` or `Unwrap` (19px/700) on the left; segmented control on the right — track `background:surface-raised`, radius 8px, `padding:3px`; each option `padding:6px 14px`, radius 6px, 12px/600; active `background:accent; color:accent-on`, inactive `color:muted`.
2. **"You pay" panel:** `background:surface-sunken; border:1px solid border; border-radius:12px; padding:18px 20px`.
   - Row 1: label `You pay` (12px `muted`) — right side, Space Mono 11px `muted`: `Balance 0.04213770` (signed out: `Balance —`) and, signed in only, a **MAX** pill (`background:surface-raised-hi`, radius 5px, `padding:3px 8px`, `color:accent`).
   - Row 2: token pill — `background:surface-raised`, `border-radius:999px`, `padding:8px 12px 8px 8px`, gap 9px, 24×24 icon + ticker at 14px/600. Then the amount `<input>`: `flex:1; min-width:0; width:100%; box-sizing:border-box`, right-aligned, Space Mono 32px, `caret-color:accent`, no border/background. `inputMode="decimal"`.
     ⚠️ `min-width:0` is required — without it a flex amount input can't shrink and overflows the card.
3. **Flip control:** a 34px circle, `background:accent`, `color:accent-on`, glyph `⇅` at 15px/700, `border:4px solid surface` so it punches through the seam. Positioned `padding-left:20px; margin:-10px 0; position:relative; z-index:1` between the two panels. Click swaps direction and resets the amount to that mode's default.
4. **"You receive" panel:** same construction; value is a right-aligned Space Mono 32px span in `accent` (read-only, computed).
5. **Fee breakdown:** `background:surface-sunken; border-radius:12px; padding:16px 20px; margin-top:14px`, rows at 12.5px with a `1px border` divider before the bold total.
6. **CTA:** full-width, `height:54px`, radius 10px, 15px/700, gap 10px. Enabled `background:accent; color:accent-on`. Disabled/pending `background:surface-raised; color:muted-2`. When pending, a 14px spinner (2px ring, `rgba(23,19,14,.35)` with `accent-on` top, `spin .9s linear infinite`) sits left of the label.
7. **Note line:** centred Space Mono 11px under the CTA; `muted-2` normally, `danger` when below minimum.

Wrap mode content:

| Element | Value |
|---|---|
| Rate | `1 sat = 1.00000000 SATS` |
| Ledger fees ×2 | `0.00000020 ckBTC` |
| Protocol fee | `None` (muted) |
| Total debited | input + `0.00000020` ckBTC |
| CTA | `Approve & wrap` → pending `Approving…` |
| Note | `MIN 0.00001 CKBTC · APPROVE THEN DEPOSIT` |
| Below min | `BELOW MINIMUM — 0.00001 CKBTC REQUIRED` |
| Default amount | `0.00100000` → receives `100,000.00000000` |

Unwrap mode content:

| Element | Value |
|---|---|
| Rate | `1.00000000 SATS = 1 sat` |
| ckBTC network fee | `10 sats` |
| Protocol fee | `5 sats` |
| Total burned | `floor(input)` SATS |
| CTA | `Unwrap to ckBTC` → pending `Burning…` |
| Note | `MIN 16 SATS · WHOLE SATOSHIS ONLY` |
| Below min | `BELOW MINIMUM — 16 SATS REQUIRED` |
| Default amount | `100000.00000000` → receives `0.00099985` |

**Right rail — signed in:** two cards.

- **Activity** (`surface`, `border`, radius 12px, padding 24px): title 15px/700 with `ALL ↗` in Space Mono 11px `accent` (jumps to the Activity tab). Three rows, `gap:2px`, each `background:surface-sunken`, radius 8px, `padding:11px 12px`: a 26px circular glyph (`surface-raised`, `muted`, 12px — `↓` wrap, `↑` unwrap, `→` send, `←` receive), kind at 13px/500, meta in Space Mono 10.5px `muted-2` (`BLOCK 4,812,003 · 2m`), and the delta right-aligned Space Mono 12.5px — `accent` for credits, `text` for debits.
- **Send SATS**: title 15px/700 with `Receive ↗` (12px `accent`, → Wallet tab). Recipient input full width (`surface-sunken`, `1px border`, radius 10px, `padding:14px 16px`, Space Mono 12px), then a row: amount input (`flex:1; min-width:0`), a 64px **MAX** chip (`surface-raised`, radius 10px, Space Mono 11px `accent`), an 88px **Send** button (`surface-raised-hi`, radius 10px, 13px/700). Footnote Space Mono 11px `muted-2`: `FEE 0.000001 SATS · REMAINING 4,213,769.99`.

**Right rail — signed out:** two cards (no connect button here — the header and the CTA already cover it).

- **Conversion table** (`surface`, `border`, radius 12px, `overflow:hidden`): header row `background:surface-sunken`, `padding:14px 20px`, Space Mono 9.5px `.12em` — `CKBTC IN` / `SATS OUT` (right-aligned). Three rows separated by `1px border-faint`, `padding:14px 20px`, Space Mono 12.5px: `0.00001000 → 1,000.00000000`, `0.00010000 → 10,000.00000000`, `1.00000000 → 100,000,000.00000000` (last value in `accent`). Footer row, Space Mono 10.5px `muted-2`: `MIN WRAP 0.00001 CKBTC · MIN UNWRAP 16 SATS · WITHDRAWALS FLOOR TO WHOLE SATOSHIS`.
- **Fees** card: title 15px/700, then four 12.5px rows — Wrap `20 raw ckBTC`, Unwrap `15 raw ckBTC`, SATS transfer `0.000001 SATS` (value in `accent`), ckBTC transfer `10 sats`.

In the signed-out state the swap card stays fully visible and keeps computing the rate live (it's a preview): balances read `Balance —`, MAX is hidden, the CTA reads **Connect Internet Identity**, and the note reads `PREVIEW ONLY — CONNECT TO WRAP OR UNWRAP`. Clicking the CTA starts the II login.

### 2. Wallet tab (signed in only)

`display:grid; grid-template-columns:minmax(0,1fr) minmax(0,540px); gap:28px; align-items:start`.

**Left column**

- **Balances** card, title 19px/700, two rows (`gap:2px`, `background:surface-sunken`, radius 10px, `padding:16px 18px`): 32px token icon (ckBTC image, or `sats_black.svg` in a 32px amber circle), ticker 14px/600 with a Space Mono 10.5px `muted-2` sub-line (`FEE 10 SATS · 8 DECIMALS`, `FEE 0.000001 · 8 DECIMALS`), and the balance right-aligned Space Mono 18px tabular-nums.
- **Receive** card: title 19px/700, body 13px `muted` — "Both tokens arrive at the same principal. There is no separate deposit address." Then a row: the principal in a `surface-sunken` box (`1px border`, radius 10px, `padding:15px 16px`, Space Mono 12.5px `text-2`, `word-break:break-all`) and a 104px **Copy** button (`surface-raised-hi`, radius 10px, 13px/700) that switches to `Copy → Copied` with `background:accent; color:accent-on` for 1600ms. Warning line, Space Mono 10.5px `muted-2`: `NEVER SEND TO THE SATS CANISTER ID — A TRANSFER TO THE MINTING ACCOUNT IS A BURN. UNWRAP INSTEAD.`

**Right column — Send** card (`border-strong`, radius 14px, padding 24px): title `Send` plus a SATS/ckBTC segmented control (same styling as the wrap/unwrap one). Fields: `To principal` (placeholder `ryjl3-tyaaa-aaaaa-aaaba-cai`), then `Amount` with the balance shown right of the label and a 64px MAX chip. Summary block (`surface-sunken`, radius 10px, `padding:14px 16px`): `Transfer fee 0.000001 SATS`, `Remaining after send 4,213,769.99999900`. CTA `Send SATS`, height 52px, amber.

### 3. Activity tab (signed in only)

One full-width card (`surface`, `border`, radius 12px, padding 26px). Title `Activity` with `ICRC-3 BLOCK LOG` in Space Mono 11px `muted-2`.

Table grid `130px 1fr 150px 200px 190px`. Header row `padding:0 14px 12px`, `border-bottom:1px solid border`, Space Mono 10px `.12em` `muted-2`: TYPE · DETAIL · FEE · BLOCK · AMOUNT (right-aligned). Rows `padding:15px 14px`, `border-bottom:1px solid border-faint`: 22px circular glyph + kind (13px/500); detail, fee and block in Space Mono 12px (`muted`, `muted-2`, `muted`); amount right-aligned Space Mono 13px, `accent` for credits.

Sample rows (replace with real ICRC-3 data): Wrap `0.00100000 ckBTC in` / `0.00000020 ckBTC` / `4,812,003 / 881,204` / `+100,000.00000000`; Send `to ryjl3-tyaaa…aaaba-7lp` / `0.000001 SATS` / `881,199` / `−250.00000000`; Unwrap `1 sat released` / `15 sats` / `881,140 / 4,809,772` / `−16.00000000`; Receive `from 2vxsx-fae` / `—` / `880,981` / `+12,500.00000000`.

---

## Interactions & behavior

### Auth
- Signed out on first load. `Connect Internet Identity` (header or swap CTA) runs the existing II flow — `AuthClient` with `identityProvider: 'https://id.ai/authorize'`, `signIn()` **inside the click handler** or the popup is blocked; restore an existing session on mount via `isAuthenticated()`. Keep `InternetIdentityLoginHandler`'s logic verbatim; only the markup changes.
- On connect: build the backend + ckBTC actors from the identity, fetch balances and allowances, switch to the Swap tab, reveal nav/principal/right-rail.
- Sign out: `signOut()`, clear actors, principal and balances, return to the signed-out Swap view.

### Amount input
- Accept digits and a single decimal point, max 8 decimals — the existing regex `/^\d*\.?\d{0,8}$/` is correct for both directions (the prototype's 6-decimal SATS regex was wrong; SATS has 8).
- Convert to raw with `BigInt((parseFloat(v) * 1e8).toFixed(0))`. Never do arithmetic on floats for the actual calls.
- Switching mode or flipping resets the field to that mode's default.

### Live computation
- **Wrap:** `receive_SATS = ckBTC_input × 1e8` (display), i.e. `raw_SATS = raw_ckBTC × 100_000_000`. `total_debited = input + 0.00000020 ckBTC` (two 10-raw ledger fees: approve + `transfer_from`). Minimum `1_000` raw ckBTC = `0.00001`.
- **Unwrap:** `out_ckBTC = floor(SATS_input − 15) / 1e8`, floored to whole satoshis; the 15 raw (10 network + 5 protocol) comes out of the release, not on top. Minimum `16 SATS` = `1_600_000_000` raw. A non-multiple of `100_000_000` burns only the whole-satoshi part; the remainder stays in the balance — surface that rather than hiding it.
- Format with `toLocaleString('en-US')` grouping on the integer part and a fixed 8-decimal fraction.

### Validation states
- **Below minimum:** note line turns `danger` with the mode's message; CTA disabled (`surface-raised` / `muted-2`). In the field-level error treatment (see `SATS Swap Directions.dc.html`, states row) the panel gets `background:danger-bg; border:1px solid danger-border` and the amount turns `danger`.
- **Insufficient balance:** disable the CTA when `amount + fees > balance`; caption reads `You don't have enough ckBTC` / `…SATS`.
- **Invalid principal on send:** validate with `Principal.fromText` in a try/catch; on failure show `Enter a valid principal` and disable Send.

### Transaction lifecycle
1. **Pending** — CTA disabled with spinner and `Approving…` / `Burning…`. Show the two wrap steps as they resolve: `Approved 0.00100010 ckBTC` (solid amber dot) then `Depositing to mint SATS…` (dot with `pulse 1.2s ease-in-out infinite`). Footnote `DO NOT CLOSE THIS TAB`.
2. **Success** — card border turns `accent`; headline `+100,000.00000000` in Space Mono 26px `accent` with `SATS minted` beneath; a `surface-sunken` block lists `CKBTC BLOCK` and `SATS BLOCK` from the result tuple; secondary button `Wrap more`. Refresh balances and prepend the row to Activity.
3. **Error / rejected** — border `danger-border`, title `Approval rejected`, body "The ckBTC allowance was never granted, so nothing left your account.", then the raw reason in a `surface-sunken` Space Mono block (`ICRC2_APPROVE → ERR / REJECTED BY USER`), and an amber `Try again`. Distinguish "approve failed" (nothing moved) from "approved but deposit failed" (allowance outstanding) — the old code already tracks this.

All five states are drawn in `SATS Swap Directions.dc.html` (option `1b`, states row) — use it as the visual reference.

### Motion
Keep it minimal: `spin .9s linear infinite` on ring spinners, `pulse 1.2s ease-in-out infinite` (opacity .35→1) on the in-flight step dot, and short colour transitions (~120ms) on hover/press. No layout animation.

### Responsive
- ≥1180px: as specified.
- Mid widths: the `minmax(0, …)` tracks compress; the right rail may drop below the swap card under ~900px.
- Mobile (~390px): single column — header (logo + truncated principal), stat strip stacked 2×2 or reduced to CKBTC IN VAULT, then the swap card at full width with the amount type dropped to ~23px, the flip circle at 30px, and a 50px CTA. See the mobile frame in `SATS Swap Directions.dc.html`. Keep all tap targets ≥44px.

---

## State management

```
connected: boolean            // II session present
principal: string             // caller principal (display + balance queries)
tab: 'swap' | 'wallet' | 'activity'
mode: 'wrap' | 'unwrap'
amount: string                // raw field text, per-mode default on reset
pending: boolean
result: { ok?: [bigint, bigint], err?: string } | null
ckbtcBalance: bigint          // raw
satsBalance: bigint           // raw
vaultCkbtc: bigint            // anonymous read, renders pre-auth
satsSupply: bigint
activity: Row[]               // ICRC-3 derived
copied: boolean               // 1600ms flash on the Receive copy button
```

Data fetching:
- **Anonymous, on mount:** ckBTC `icrc1_balance_of` for the backend principal (vault total) and backend `icrc1_total_supply`.
- **On connect and after every successful tx:** both `icrc1_balance_of` calls plus `icrc2_allowance` for the backend spender.
- **Activity:** backend `icrc3_get_blocks`, newest first. Debounce refetch (the old code guarded with a 2s window — keep something equivalent).
- Units differ between calls: `deposit` takes **raw ckBTC**, `withdraw` takes **raw SATS**, 1e8 apart. This is the easiest thing in the whole app to get wrong.

---

## Assets

In `assets/`, copied from `src/assets/` in the repo:

- `sats_black.svg` / `sats_black.png` — SATS mark, black glyph. Used at 24–32px inside an amber tile/circle. This is the primary token logo everywhere in the design.
- `sats_white.svg` / `sats_white.png` — white variant, for use directly on dark backgrounds (used in the `1a` direction; keep it available for dark-on-dark contexts and favicons).
- `ckbtc.png` — ckBTC token icon, used at 20–32px.

Drop the old `logo.png`, `sats.png` and `background.jpg` — nothing in this design uses them. Fonts come from Google Fonts (`Archivo`, `Space Mono`); self-host if you'd rather not hit a CDN from the asset canister.

## Files

- `SATS App.dc.html` — **the design to implement.** All three tabs, both auth states, live math, pending state. Open it in a browser; click Connect, flip the swap, move between tabs.
- `SATS Swap Directions.dc.html` — the exploration that produced it. Option **`1b`** is the chosen direction and is the reference for the eight states (disconnected, connected, below minimum, fee breakdown, pending, success, rejected, mobile). Option `1a` was **not** chosen — ignore it except as contrast.
- `assets/` — the images above.
- `screenshots/` — captures of the live prototype at ~910px wide (a mid-width viewport, so the layout is compressed relative to the 1180px spec):
  - `01-swap-signed-out.png` — the landing state
  - `02-swap-signed-in-wrap.png` — connected, wrap mode
  - `03-swap-unwrap.png` — unwrap mode
  - `04-wallet.png` — balances, receive, send
  - `05-activity.png` — ICRC-3 block log
