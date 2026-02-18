# Transaction Form Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the transaction form from a flat boring form into a visually rich, interactive smart form with card-based asset selection, pill trade type buttons, animated progressive disclosure, real-time summary, and semantic colors.

**Architecture:** Single-file rewrite of `TransactionForm.tsx` with the same props interface and server action integration. Add new i18n keys and a CSS animation keyframe. No new dependencies — uses existing `tailwindcss-animate` plugin and Tailwind utilities.

**Tech Stack:** React 18, Next.js 14, Tailwind CSS, tailwindcss-animate, lucide-react, existing UI primitives

---

### Task 1: Add i18n Keys for New UI Elements

**Files:**
- Modify: `src/lib/i18n.ts` (after line ~244, in the form section)

**Step 1: Add new translation keys**

Add these keys after the existing `form.namePlaceholder*` entries:

```typescript
"form.cryptoDesc": { en: "BTC, ETH, SOL...", zh: "BTC, ETH, SOL..." },
"form.stockDesc": { en: "AAPL, TSLA, 0700.HK", zh: "AAPL, TSLA, 0700.HK" },
"form.depositDesc": { en: "Fixed & demand deposits", zh: "定期和活期存款" },
"form.bondDesc": { en: "Fixed income securities", zh: "固定收益证券" },
"form.summaryPlaceholder": { en: "Fill in details to see summary", zh: "填写详情后显示摘要" },
"form.totalAmount": { en: "Total", zh: "合计" },
"form.confirmTransaction": { en: "Confirm Transaction", zh: "确认交易" },
"form.confirmDeposit": { en: "Confirm Deposit", zh: "确认存入" },
"form.confirmWithdrawal": { en: "Confirm Withdrawal", zh: "确认取出" },
"form.confirmIncome": { en: "Record Income", zh: "记录收入" },
```

**Step 2: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add i18n keys for transaction form redesign"
```

---

### Task 2: Add CSS Animation for Form Section Reveal

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Add the section-reveal animation**

Add after the existing `.animate-slide-in` block (around line 146):

```css
@keyframes sectionReveal {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-section-reveal {
  animation: sectionReveal 0.3s ease-out forwards;
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add section-reveal animation for form redesign"
```

---

### Task 3: Rewrite TransactionForm — Asset Type Card Selector

**Files:**
- Modify: `src/components/TransactionForm.tsx`

**Step 1: Rewrite the component**

Replace the entire `TransactionForm.tsx` with the new implementation. This is the full rewrite — the component keeps the same props interface (`TransactionFormProps`) and the same `handleSubmit` logic, but restructures the JSX into three visual sections.

**Section 1 — Asset Type Cards:**

The asset type selector is a grid of 4 cards (4 columns on desktop, 2x2 on mobile). Each card has:
- A colored icon container (40x40 rounded-xl with gradient bg)
- Title text (e.g. "Crypto")
- Subtitle text (e.g. "BTC, ETH, SOL...")
- Selected state: `border-2` with the asset's accent color, `bg-{color}-50/50` (light) / `bg-{color}-950/30` (dark), `scale-[1.02]`
- Unselected state: `border border-border`, `opacity-60 hover:opacity-100`, `hover:border-{color}-300`

Color mapping:
- crypto: `blue-500` icon bg, `blue-500` border when selected
- stock: `indigo-500` icon bg, `indigo-500` border
- deposit: `emerald-500` icon bg, `emerald-500` border
- bond: `amber-500` icon bg, `amber-500` border

Icons (from lucide-react):
- crypto: `Bitcoin`
- stock: `TrendingUp`
- deposit: `Landmark`
- bond: `FileText`

**Step 2: Verify it renders**

Run: `npm run dev` and navigate to `/transactions/new`
Expected: 4 asset type cards displayed, clicking switches selection

**Step 3: Commit**

```bash
git add src/components/TransactionForm.tsx
git commit -m "feat: rewrite transaction form with card-based asset selector"
```

---

### Task 4: Add Trade Type Pill Buttons

**Files:**
- Modify: `src/components/TransactionForm.tsx`

**Step 1: Implement pill button group**

Below the asset type cards, add a horizontal group of pill buttons for trade type. The section appears with `animate-section-reveal`.

Each pill button:
- `h-10 px-5 rounded-full font-medium text-sm` base
- Selected state: filled bg + white text
  - buy: `bg-emerald-500 text-white`
  - sell: `bg-red-500 text-white`
  - income: `bg-amber-500 text-white`
- Unselected state: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- `transition-all duration-200`

Label text adapts to asset type:
- deposit/bond buy → "Deposit" / "存入"
- deposit/bond sell → "Withdraw" / "取出"
- others → "Buy"/"Sell"/"Income"

**Step 2: Verify**

Run dev server, check pill buttons render and switch correctly
Expected: 3 pills, clicking changes selection, colors match trade type

**Step 3: Commit**

```bash
git add src/components/TransactionForm.tsx
git commit -m "feat: add semantic trade type pill buttons"
```

---

### Task 5: Smart Form Fields with Animation

**Files:**
- Modify: `src/components/TransactionForm.tsx`

**Step 1: Implement conditional form fields with animation**

The form fields section wraps in a div with `animate-section-reveal` and uses a `key` prop based on `${assetType}-${tradeType}-${incomeMode}` to re-trigger animation when the combination changes.

Field layout remains a 2-column grid (`grid-cols-1 md:grid-cols-2 gap-4`). The conditional logic is identical to the current implementation:

- Stock/Crypto buy/sell: Symbol, Name, Quantity, Price, Fee, Currency, Trade Date
- Deposit/Bond buy: Symbol, Name, Principal Amount, Currency, Interest Rate, Maturity Date (fixed/bond), Deposit Date
- Deposit/Bond sell: Symbol, Name, Withdrawal Amount, Currency, Date
- Deposit/Bond income: Symbol, Name, Income Amount, Currency, Date
- Cash income (non-fixed): Symbol, Name, Income Amount, Currency, Date
- Asset income (non-fixed): Symbol, Name, Quantity, Price, Currency, Date

The income mode toggle (cash vs asset) and deposit sub-type toggle (fixed vs demand) remain as card-style toggles, same as current but inside this animated section.

Remove the outer `<Card>` wrapper — the form is now "open" on the page without the card chrome. Each section (asset cards, pills, form fields, summary) is visually distinct.

**Step 2: Verify**

Switch between asset/trade types, verify correct fields show with animation
Expected: Fields fade in when switching, no layout jump, all hidden inputs present

**Step 3: Commit**

```bash
git add src/components/TransactionForm.tsx
git commit -m "feat: animated conditional form fields"
```

---

### Task 6: Real-Time Transaction Summary Bar

**Files:**
- Modify: `src/components/TransactionForm.tsx`

**Step 1: Add state tracking for real-time calculation**

Add `useState` for quantity, price, incomeAmount, symbol, and currency values. Attach `onChange` handlers to the relevant inputs to update these states in real-time (while still using `name` attributes for form submission).

**Step 2: Implement summary bar**

At the bottom of the form, add a summary section:

```
┌──────────────────────────────────────────────────┐
│  Summary line (e.g. "Buy 100 BTC x 45,000 = ...") │
│                                                    │
│  [ Submit Button ]                    [ Cancel ]   │
└──────────────────────────────────────────────────┘
```

Styling:
- Container: `rounded-xl border bg-muted/30 backdrop-blur-sm p-4 space-y-3`
- Summary text: `text-sm font-medium text-muted-foreground`, amounts in `font-num` class
- If fields incomplete: show placeholder text from i18n
- If complete: show formatted summary like "Buy 100 BTC x 45,000.00 = 4,500,000.00 USD"

Submit button styling by trade type:
- buy: `bg-gradient-to-r from-emerald-500 to-teal-500 text-white`
- sell: `bg-gradient-to-r from-red-500 to-rose-500 text-white`
- income: `bg-gradient-to-r from-amber-500 to-orange-500 text-white`
- `h-11 px-6 rounded-xl font-semibold` + hover scale

Cancel button: `variant="outline"` same as current

**Step 3: Verify end-to-end**

1. Fill in a buy transaction for crypto — verify summary updates in real time
2. Submit the form — verify it saves correctly and redirects
3. Edit an existing transaction — verify fields pre-fill and summary shows

**Step 4: Commit**

```bash
git add src/components/TransactionForm.tsx
git commit -m "feat: real-time transaction summary bar with semantic submit button"
```

---

### Task 7: Visual Polish and Dark Mode

**Files:**
- Modify: `src/components/TransactionForm.tsx`
- Modify: `src/app/globals.css` (if needed)

**Step 1: Polish visual details**

- Section headers: `text-sm font-semibold text-muted-foreground uppercase tracking-wider` (keep existing style)
- Notes section: collapse into a disclosure or keep visible but lighter styling
- Ensure all `transition-all duration-200` on interactive elements
- Verify dark mode: selected card states use `dark:bg-{color}-950/30` variants
- Verify mobile layout: cards are 2x2 grid, pills wrap if needed, form is single column
- Remove old `<CardHeader>` with icon — the page title from `page.tsx` is sufficient

**Step 2: Test dark mode**

Toggle dark mode, verify:
- Card backgrounds don't clash
- Selected states are visible but not garish
- Summary bar backdrop-blur works
- Pill buttons are readable

**Step 3: Full flow test**

Test each asset type + trade type combination:
1. Crypto buy → fields: symbol, name, qty, price, fee, currency, date
2. Stock sell → fields: symbol (autocomplete), name, qty, price, fee, currency, date
3. Deposit buy (fixed) → fields: symbol, name, amount, currency, interest rate, maturity date, date
4. Deposit buy (demand) → fields: symbol, name, amount, currency, date
5. Bond buy → fields: symbol, name, amount, currency, interest rate, maturity date, date
6. Income (cash) → fields: symbol, name, amount, currency, date
7. Income (asset) → fields: symbol, name, qty, price, currency, date
8. Edit mode → all fields pre-filled, summary shows

**Step 4: Commit**

```bash
git add src/components/TransactionForm.tsx src/app/globals.css
git commit -m "feat: visual polish and dark mode for transaction form"
```

---

### Task 8: Build Verification and Final Push

**Step 1: Run build**

```bash
npm run build
```

Expected: No TypeScript errors, no build warnings related to TransactionForm

**Step 2: Final commit and push**

```bash
git push origin main
```
