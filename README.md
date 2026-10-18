# LinkPulse: URL Shortener & Analytics Platform ⚡

> **An Integrated Link Management, Rule-Driven Redirection, and Asynchronous Telemetry Platform**  
> Developed for **TECH GEEKS Hackathon** • **Graphic Era Hill University (GEHU)**  
> **Team:** CodeMaxxing (Gaurav Joshi, Ansh Ahlawat, Anubhav Chand, Dhruvansh Chandola, Kushi Mathela)

---

## 🚀 Key Architectural Pillars

LinkPulse solves the classic trade-off between **high-speed redirects** and **deep analytics writes** by strictly isolating the **Hot Path** from the **Cold Path**.

1. **Sub-50ms Hot-Path Redirection Engine (`src/lib/redirect-engine.ts`)**:
   - Cache-first O(1) in-memory resolution.
   - Enforces active status, admin takedowns, and domain safety.
   - Evaluates scheduled expiration timestamps and atomic click-cap limits.
   - Supports **Device-Specific Smart Routing** (iOS vs. Android vs. Desktop).
   - Emits **RFC 9110 HTTP 302/307** redirects without blocking for database operations.

2. **Asynchronous BullMQ/Queue Telemetry Worker (`src/lib/queue.ts`)**:
   - Zero-latency non-blocking event dispatch.
   - **Bot & Crawler Filtration**: Flags web scrapers and automated bots using RFC-compliant pattern detection.
   - **Geo-IP & User-Agent Parsing**: Extracted country, city, device type, OS, and browser.
   - **GDPR Privacy Hashing**: Generates a salted SHA-256 daily visitor fingerprint; raw IPs are never permanently stored.

3. **Frontend Client Experience (`src/app/page.tsx`)**:
   - **Two-Step Creation Wizard**: Validates destination URLs against the **WHATWG URL Standard** and **OWASP Anti-SSRF** rules, features debounced custom alias availability checking, and pre-publish warnings.
   - **Interactive Recharts Telemetry**: Area charts for click velocity, donut charts for device distribution, top referrers, and geo-footprints.
   - **CSV Bulk Link Uploader**: Streaming PapaParse uploader with table verification and batch caching.
   - **Customizable QR Code Generator**: High-resolution downloadable PNGs with custom brand accent colors.
   - **Public Link-in-Bio Micro-Pages (`/bio/:slug`)**: Responsive glassmorphic profile pages with grouped short links.
   - **Password Gate UI (`src/components/PasswordGate.tsx`)**: Glassmorphism password challenge for confidential links.
   - **Clean Fallback Screens**: Branded status displays for HTTP 410 Gone (Expired / Capped) and HTTP 403 Forbidden (Suspended).

4. **Governance & Admin Console (`src/components/GovernanceAdminView.tsx`)**:
   - One-click instant link takedowns with real-time cache invalidation while **strictly preserving historical analytics for auditability**.
   - Global Domain Blocklist management.
   - **Hackathon 5-Minute Live Demo Simulator**: Buttons for "+15 Clicks" and "+50 Clicks" to demonstrate real-time chart updating during live judging!

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript)
- **Styling**: Tailwind CSS with sleek glassmorphism and modern dark aesthetics
- **Charts**: Recharts (`ResponsiveContainer`, `AreaChart`, `PieChart`)
- **QR Codes**: `qrcode` (SVG and PNG rendering)
- **CSV Engine**: `papaparse`
- **User-Agent / Bot Detection**: `ua-parser-js` and `isbot`
- **Data Engine**: Node 24 Native `DatabaseSync` (`node:sqlite`) with Write-Ahead Logging (WAL) and ACID transactions

---

## 🏃 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to open the LinkPulse Management Hub.

### 3. Sample Demo Links Pre-Seeded
- **Normal Redirect**: `http://localhost:3000/techgeeks` ➡️ Redirects to GEHU Portal
- **Device Targeted**: `http://localhost:3000/get-app` ➡️ Routes based on iOS, Android, or Desktop
- **Password Protected**: `http://localhost:3000/secret-pitch` ➡️ Password: `codemaxxing`
- **Click-Capped**: `http://localhost:3000/flash-90off` ➡️ Capped at 100 clicks
- **Expired Link**: `http://localhost:3000/early-bird` ➡️ Fallback HTTP 410 Gone Screen
- **Public Link-in-Bio**: `http://localhost:3000/bio/codemaxxing` ➡️ Responsive mobile-first profile
