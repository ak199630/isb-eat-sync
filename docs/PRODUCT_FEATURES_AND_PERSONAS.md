# ISB Eat-Sync – Product Features & User Personas

Each feature is described with the target persona and how it addresses their pain points. Where a screenshot would help, instructions are given for you to attach one manually.

---

## 1. Product overview

ISB Eat-Sync is a hyper-local campus food app for the Indian School of Business. It supports just-in-time (JIT) ordering, a “time to head out” cue so customers leave at the right time, and a QR-based handoff so vendors can mark orders fulfilled at the counter. The app is built for a single campus with defined stalls, residential blocks, and walk times.

**Core value:** Reduce wait and uncertainty for customers, and give stall operators a single place to see orders, manage prep, and complete handoff (including by scanning the customer’s QR).

---

## 2. User personas and pain points

### 2.1 Persona 1: Student / customer

**Who:** On-campus student (or guest) who orders food from campus stalls and picks it up in person.

**Pain points:**
- Not knowing when to leave to reach the stall on time.
- Showing up too early (waiting) or too late (food cold or stall confused).
- Unclear which stall is open or what’s available.
- Awkward handoff (“which order is mine?”).

---

### 2.2 Persona 2: Vendor / stall operator

**Who:** Staff running one campus stall (e.g. Goer, TCC). They take orders, prepare food, and hand off at the counter.

**Pain points:**
- Orders arriving in a chaotic way (no single list by time).
- No signal that the customer has left, so prep timing is guesswork.
- Manual or verbal handoff at counter is error-prone.
- No easy way to mark items sold out or control stall status (open/busy/closed).
- Hard to assign orders to cooks or see “new order” / “customer left” at a glance.

---

### 2.3 Persona 3: Authorized customer (e.g. Bajaj)

**Who:** User with access to restricted stalls (e.g. Bajaj Dining Hall).

**Pain point:** Need to see and order from restricted stalls without exposing them to all students.

---

## 3. Customer-facing features

### 3.1 Browse stalls and menu

**What it is:** Home page lists campus stalls (e.g. Goer, TCC, MFC, Nescafe, Bajaj). Tapping a stall opens its menu with items, prices, and availability. “Quick Bite” appears for stalls with short prep time.

**Persona:** Student / customer.  
**Pain point addressed:** “Which stall is open and what can I order?” — One place to see stalls and live availability.

**Screenshot – attach here:**  
- **Where to capture:** Home page (`/`).  
- **What to show:** “Campus Stalls” heading and stall cards (e.g. Goer, TCC) with names and any status/Quick Bite.  
- **Suggested filename:** `01-home-stalls.png`

---

### 3.2 Cart and checkout (residential block, pickup time)

**What it is:** Cart shows items and total. Checkout asks for residential block (for walk time) and pickup preference: “As soon as ready” or a time slot. Order can be placed as guest or when signed in.

**Persona:** Student / customer.  
**Pain point addressed:** “When will my order be ready?” — Pick a slot or “as soon as ready”; block is used to compute “leave by” time.

**Screenshot – attach here:**  
- **Where to capture:** Checkout page (`/checkout` with items in cart).  
- **What to show:** “Leaving from” dropdown (residential block), “Pickup time” options (As soon as ready / Pick a time), and “Place order” button.  
- **Suggested filename:** `02-checkout.png`

---

### 3.3 Place order (guest or logged in)

**What it is:** User places order and is redirected to the order status page. Order is created with a unique QR token for handoff.

**Persona:** Student / customer.  
**Pain point addressed:** “I want to order quickly without creating an account” — Guest checkout; optional sign-in for saved block and history.

**Screenshot – attach here (optional):**  
- **Where to capture:** Order confirmation page (`/order/[id]`) right after placing order.  
- **What to show:** Stall name, status (e.g. Pending), pickup window, total.  
- **Suggested filename:** `03-order-page.png`

---

### 3.4 Order page: “Leave by” time and “I’m leaving”

**What it is:** Order page shows status, pickup window, and a “Leave by HH:MM” time (based on block and walk time). When it’s time, a “Time to head out!” banner appears. “I’m leaving” button notifies the stall once; then the message “Vendor notified — they know you're on your way” is shown.

**Persona:** Student / customer.  
**Pain point addressed:** “When should I leave?” and “Does the stall know I’m coming?” — Clear leave-by time and one-tap “I’m leaving” so the vendor can time prep.

**Screenshot – attach here:**  
- **Where to capture:** Order page (`/order/[id]`) with an active (non-cancelled) order.  
- **What to show:** “Leave by” time, “I’m leaving” button, and (if already tapped) “Vendor notified” message.  
- **Suggested filename:** `04-order-leave-by-and-im-leaving.png`

---

### 3.5 QR code for handoff

**What it is:** Order page displays a QR code encoding the order’s token. Customer shows it at the counter; vendor scans it to mark the order fulfilled.

**Persona:** Student / customer.  
**Pain point addressed:** “Which order is mine?” and “How does the stall know to mark it done?” — Clear QR for quick, accurate handoff.

**Screenshot – attach here:**  
- **Where to capture:** Order page (`/order/[id]`), scroll to the QR section.  
- **What to show:** QR code and the line “Show this QR at pickup for the vendor to scan”.  
- **Suggested filename:** `05-order-qr.png`

---

### 3.6 Order status (including cancelled)

**What it is:** Order page reflects current status (pending, accepted, preparing, ready, fulfilled). If the vendor cancels, the customer sees “Order could not be fulfilled” and an optional reason.

**Persona:** Student / customer.  
**Pain point addressed:** “Why can’t I get my order?” — Clear cancelled state and reason.

**Screenshot – attach here (optional):**  
- **Where to capture:** Order page for a cancelled order.  
- **What to show:** “Order could not be fulfilled” and vendor reason.  
- **Suggested filename:** `06-order-cancelled.png`

---

## 4. Vendor-facing features

### 4.1 Vendor sign-in and dashboard (order inbox)

**What it is:** Vendor signs in and is redirected to `/vendor`. Dashboard shows today’s orders for their stall, sorted by pickup time, with filters: All, Pending, Accepted, Preparing, Ready, Fulfilled. Each card shows short ID, pickup window, status, total, items, block, notes, and “Customer left” if applicable.

**Persona:** Vendor / stall operator.  
**Pain point addressed:** “Orders are chaotic” — One inbox, ordered by pickup time, with clear status.

**Screenshot – attach here:**  
- **Where to capture:** Vendor dashboard (`/vendor`) while signed in as vendor.  
- **What to show:** Header (stall name, Orders / Menu), status filters, and at least one order card with details.  
- **Suggested filename:** `07-vendor-inbox.png`

---

### 4.2 Accept and reject orders

**What it is:** For pending orders, vendor can Accept or Reject. Reject can include an optional reason (e.g. “sold out”). Rejected orders are not shown in the main inbox; customer sees “Order could not be fulfilled” and the reason.

**Persona:** Vendor / stall operator.  
**Pain point addressed:** “I can’t fulfill every order” — Explicit accept/reject with reason so the customer is informed.

**Screenshot – attach here (optional):**  
- **Where to capture:** Vendor inbox with a Pending order card in view.  
- **What to show:** “Accept” and “Reject” (and optional reason field) on the card.  
- **Suggested filename:** `08-vendor-accept-reject.png`

---

### 4.3 Prep flow: Preparing → Ready for pickup

**What it is:** After accept, vendor can move order: “Start preparing” → “Mark ready”. When ready, “Fulfill (delivered)” or “Scan QR” is available.

**Persona:** Vendor / stall operator.  
**Pain point addressed:** “I need a clear flow from accepted to handoff” — Simple status steps and one-click actions.

**Screenshot – attach here (optional):**  
- **Where to capture:** Vendor inbox with an Accepted or Preparing order.  
- **What to show:** “Start preparing” or “Mark ready” (and “Fulfill (delivered)”) on the card.  
- **Suggested filename:** `09-vendor-prep-flow.png`

---

### 4.4 Assign order to cook

**What it is:** Each order card has an “Assigned to” field (free text, e.g. “Ramesh” or “Station 1”). Value is saved on blur or Enter.

**Persona:** Vendor / stall operator.  
**Pain point addressed:** “Who is making this order?” — Quick assignment visible on the card.

**Screenshot – attach here (optional):**  
- **Where to capture:** Vendor inbox, one order card.  
- **What to show:** “Assigned to:” input with a name or placeholder.  
- **Suggested filename:** `10-vendor-assigned-to.png`

---

### 4.5 Stall status: Open / Busy / Closed

**What it is:** Vendor header has Open | Busy | Closed. When set to Closed, customers see the stall as closed and cannot add to cart; when Busy, a “Stall busy” message can be shown.

**Persona:** Vendor / stall operator.  
**Pain point addressed:** “I need to stop or slow orders when overwhelmed” — One control that affects the customer app in real time.

**Screenshot – attach here:**  
- **Where to capture:** Vendor dashboard header.  
- **What to show:** “Stall status:” with Open | Busy | Closed buttons.  
- **Suggested filename:** `11-vendor-stall-status.png`

---

### 4.6 Sold-out toggle and inventory

**What it is:** Vendor Menu page (`/vendor/menu`) lists items with “Mark sold out” / “Back in stock”. Options for “Mark all sold out” / “Mark all available”, and (if using inventory mode) set initial inventory, restock, or switch to manual. Fulfilling an order decrements inventory; at zero the item is auto-marked sold out.

**Persona:** Vendor / stall operator.  
**Pain point addressed:** “I run out of items and customers don’t know” — Per-item and bulk control, with optional inventory tracking.

**Screenshot – attach here:**  
- **Where to capture:** Vendor Menu page (`/vendor/menu`).  
- **What to show:** List of menu items with sold-out/available toggles and any bulk or inventory controls.  
- **Suggested filename:** `12-vendor-menu-sold-out.png`

---

### 4.7 Scan QR to fulfill

**What it is:** “Scan QR” on the vendor inbox opens a modal with camera (or upload image). Scanning the customer’s order QR sends the token to the API; if the order is “Ready for pickup” for that stall, it is marked fulfilled and inventory is updated.

**Persona:** Vendor / stall operator.  
**Pain point addressed:** “Handoff at the counter is manual and error-prone” — Scan customer’s QR to confirm handoff and update status in one step.

**Screenshot – attach here:**  
- **Where to capture:** Vendor inbox, after clicking “Scan QR” (modal open).  
- **What to show:** Modal with camera/view and “Upload QR image” (or similar).  
- **Suggested filename:** `13-vendor-scan-qr.png`

---

### 4.8 New-order and “customer left” alerts

**What it is:** Vendor layout subscribes to Realtime for their stall’s orders. New order (INSERT) and “customer left” (UPDATE with `customer_left_at` set) trigger a sound and a badge on “Orders”. Badge clears when the vendor is on the orders page.

**Persona:** Vendor / stall operator.  
**Pain point addressed:** “I miss new orders or don’t know when the customer left” — Immediate audio and badge so they can react without constantly refreshing.

**Screenshot – attach here (optional):**  
- **Where to capture:** Vendor layout with an alert badge visible (e.g. after a new order or “I’m leaving”).  
- **What to show:** “Orders” link with a badge count (e.g. “1” or “2”).  
- **Suggested filename:** `14-vendor-alerts-badge.png`

---

## 5. Cross-cutting / system

- **Realtime updates:** Stall status and sold-out state sync to the customer app; order changes and “customer left” sync to the vendor dashboard.  
- **Role-based access:** Authorized users can see and order from restricted stalls (e.g. Bajaj); vendors see only their stall’s orders and menu.

No separate screenshot instructions for this section unless you want a diagram of data flow.

---

## 6. Summary

| Feature | Primary persona | Pain point solved |
|--------|-----------------|--------------------|
| Browse stalls & menu | Customer | “What’s open and what can I order?” |
| Cart & checkout (block, time) | Customer | “When will it be ready? When should I leave?” |
| Place order (guest/logged in) | Customer | “I want to order without an account” |
| “Leave by” + “I’m leaving” | Customer | “When to leave?” and “Does the stall know I’m coming?” |
| QR at handoff | Customer + Vendor | “Which order is mine?” / “Confirm handoff quickly” |
| Order status (cancelled) | Customer | “Why wasn’t my order fulfilled?” |
| Vendor inbox + filters | Vendor | “Orders are chaotic” |
| Accept / Reject | Vendor | “I can’t fulfill every order” |
| Prep flow (preparing → ready) | Vendor | “Clear flow to handoff” |
| Assigned to | Vendor | “Who is making this order?” |
| Stall status (Open/Busy/Closed) | Vendor | “Stop or slow orders when overwhelmed” |
| Sold-out + inventory | Vendor | “Customers don’t know what’s out” |
| Scan QR to fulfill | Vendor | “Handoff is manual and error-prone” |
| New-order & “customer left” alerts | Vendor | “I miss new orders or when customer left” |

**In one sentence:** For customers, ISB Eat-Sync reduces wait and uncertainty by giving a clear “leave by” time and a one-tap “I’m leaving” plus QR handoff; for vendors, it centralizes orders by time, supports accept/reject and prep flow, and adds scan-to-fulfill and alerts so they can manage capacity and handoff without chaos.

---

## 7. Where to store screenshots

- **Folder:** Create a folder in the repo, e.g. `docs/product-screenshots/`.
- **Naming:** Use the suggested filenames above (e.g. `01-home-stalls.png`, `07-vendor-inbox.png`) so you can reference them in the doc later (e.g. `![Home – stalls](product-screenshots/01-home-stalls.png)`).
- **Attach:** Paste or insert each image in this document at the “Screenshot – attach here” lines above, or add a short “Screenshots” subsection that references each file from the table.

End of document.
