import { NextResponse } from "next/server"

// Full standalone menu HTML for menu.hivebuckhead.com
// Embedded at build time — no filesystem dependency on Vercel serverless
const MENU_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Menu — Hive Buckhead</title>
<meta name="description" content="The HIVE Buckhead | Atlanta's #1 Bistro — Full Menu. Brunch all day, every day." />
<link rel="icon" href="https://hivebuckhead.com/wp-content/uploads/2018/10/favi.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Montserrat:wght@300;400;500;600;700&family=Oswald:wght@300;400;500;600&display=swap" rel="stylesheet" />
<style>
/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
:root {
  --gold:       #be9953;
  --gold-light: #d4ae6a;
  --gold-dim:   #7a6235;
  --black:      #0a0907;
  --surface:    #141210;
  --surface2:   #1c1916;
  --surface3:   #232019;
  --border:     #2c2620;
  --border2:    #3a3228;
  --text:       #f0ebe2;
  --text2:      #c8bfb0;
  --muted:      #7a6e5a;
  --muted2:     #504540;

  --font-heading:   'Cormorant Garamond', Georgia, serif;
  --font-nav:       'Montserrat', sans-serif;
  --font-body:      'Oswald', sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  background: var(--black);
  color: var(--text);
  font-family: var(--font-body);
  font-weight: 300;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* ─────────────────────────────────────────────────────────────
   TOP BAR
───────────────────────────────────────────────────────────── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 200;
  background: rgba(10,9,7,0.97);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
}

.topbar-inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 1.25rem;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

/* Logo */
.logo-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}
.logo-link img {
  height: 42px;
  width: auto;
  object-fit: contain;
  display: block;
}
.logo-wordmark {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.logo-name {
  font-family: var(--font-nav);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--gold);
  text-transform: uppercase;
}
.logo-tagline {
  font-family: var(--font-nav);
  font-size: 0.55rem;
  font-weight: 400;
  letter-spacing: 0.14em;
  color: var(--muted);
  text-transform: uppercase;
}

/* Back link — visible on desktop, hidden mobile */
.back-link {
  font-family: var(--font-nav);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: color 0.2s;
  flex-shrink: 0;
}
.back-link:hover { color: var(--gold); }
.back-link svg { width: 12px; height: 12px; }

/* ─────────────────────────────────────────────────────────────
   TAB NAV
───────────────────────────────────────────────────────────── */
.tab-bar {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 68px;
  z-index: 190;
}

.tab-inner {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 1.25rem;
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  gap: 0;
}
.tab-inner::-webkit-scrollbar { display: none; }

.tab-btn {
  background: none;
  border: none;
  border-bottom: 2.5px solid transparent;
  cursor: pointer;
  font-family: var(--font-nav);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 1rem;
  height: 46px;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
  position: relative;
  flex-shrink: 0;
}
.tab-btn:hover { color: var(--text2); }
.tab-btn.active {
  color: var(--gold);
  border-bottom-color: var(--gold);
}

/* ─────────────────────────────────────────────────────────────
   HERO
───────────────────────────────────────────────────────────── */
.hero {
  text-align: center;
  padding: 3.5rem 1.25rem 2.5rem;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--surface) 0%, var(--black) 100%);
}

.hero-eyebrow {
  font-family: var(--font-nav);
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 0.9rem;
}

.hero-title {
  font-family: var(--font-heading);
  font-size: clamp(3rem, 8vw, 5rem);
  font-weight: 300;
  font-style: italic;
  color: var(--text);
  line-height: 1.05;
  letter-spacing: 0.03em;
}
.hero-title strong {
  font-weight: 600;
  font-style: normal;
  color: var(--gold);
}

.hero-divider {
  width: 60px;
  height: 1px;
  background: var(--gold);
  margin: 1.2rem auto;
  opacity: 0.5;
}

.hero-tagline {
  font-family: var(--font-nav);
  font-size: 0.68rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}

/* Hours strip */
.hours-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0;
  max-width: 720px;
  margin: 1.8rem auto 0;
  border: 1px solid var(--border2);
  border-radius: 10px;
  overflow: hidden;
}

.hours-col {
  flex: 1;
  min-width: 220px;
  padding: 1.1rem 1.5rem;
  background: var(--surface2);
  position: relative;
}
.hours-col + .hours-col {
  border-left: 1px solid var(--border2);
}
@media (max-width: 480px) {
  .hours-col + .hours-col {
    border-left: none;
    border-top: 1px solid var(--border2);
  }
}

.hours-day {
  font-family: var(--font-nav);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 0.5rem;
}
.hours-row {
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--text2);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  line-height: 1.9;
}
.hours-row .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold);
  flex-shrink: 0;
  opacity: 0.6;
}

/* ─────────────────────────────────────────────────────────────
   MAIN CONTENT
───────────────────────────────────────────────────────────── */
.main {
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 1.25rem 6rem;
}

/* Sections */
.menu-section {
  display: none;
  animation: fadeUp 0.22s ease;
}
.menu-section.active { display: block; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Section header */
.sec-header {
  padding: 2.5rem 0 1.5rem;
  border-bottom: 1px solid var(--border2);
  margin-bottom: 2rem;
}
.sec-label {
  font-family: var(--font-nav);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--gold-dim);
  margin-bottom: 0.4rem;
}
.sec-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 300;
  font-style: italic;
  color: var(--text);
  line-height: 1.1;
}
.sec-note {
  font-family: var(--font-nav);
  font-size: 0.6rem;
  font-weight: 400;
  letter-spacing: 0.1em;
  color: var(--muted);
  margin-top: 0.5rem;
  text-transform: uppercase;
}

/* Sub-section */
.subsection {
  margin-bottom: 2.5rem;
}
.sub-title {
  font-family: var(--font-nav);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--gold-dim);
  padding-bottom: 0.6rem;
  margin-bottom: 0.2rem;
  border-bottom: 1px solid var(--border);
}

/* ─────────────────────────────────────────────────────────────
   MENU ITEM
───────────────────────────────────────────────────────────── */
.item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.9rem 0;
  border-bottom: 1px solid var(--border);
}
.item:last-child { border-bottom: none; }

.item-left { flex: 1; min-width: 0; }

.item-name {
  font-family: var(--font-body);
  font-size: 0.92rem;
  font-weight: 400;
  color: var(--text);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.item-desc {
  font-family: var(--font-nav);
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--muted);
  margin-top: 0.22rem;
  line-height: 1.65;
  letter-spacing: 0.02em;
}

.item-note {
  font-family: var(--font-nav);
  font-size: 0.62rem;
  font-weight: 400;
  color: var(--muted2);
  margin-top: 0.15rem;
  font-style: italic;
  letter-spacing: 0.04em;
}

.item-price {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 400;
  color: var(--gold);
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

/* Two column grid for sides, beers etc */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0 3rem;
}

/* ─────────────────────────────────────────────────────────────
   HAPPY HOUR TIERS
───────────────────────────────────────────────────────────── */
.hh-tiers { margin-top: 0.5rem; }

.hh-tier {
  margin-bottom: 2rem;
}

.hh-tier-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.hh-price {
  font-family: var(--font-heading);
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--gold);
  white-space: nowrap;
  line-height: 1;
  min-width: 52px;
  text-align: right;
}

.hh-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--gold-dim) 0%, var(--border) 100%);
  opacity: 0.5;
}

.hh-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.hh-chip {
  font-family: var(--font-nav);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: var(--text2);
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 5px;
  padding: 0.38rem 0.85rem;
  white-space: nowrap;
}

/* ─────────────────────────────────────────────────────────────
   COCKTAIL CLASSICS GRID
───────────────────────────────────────────────────────────── */
.classics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0;
}
.classic-item {
  font-family: var(--font-body);
  font-size: 0.84rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text2);
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border);
}
.classic-sub {
  font-family: var(--font-nav);
  font-size: 0.62rem;
  font-weight: 300;
  color: var(--muted);
  letter-spacing: 0.04em;
  display: block;
  margin-top: 0.1rem;
  text-transform: none;
}

/* Beer grid */
.beer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0;
}
.beer-item {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 400;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text2);
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--border);
}

/* Price group header */
.price-group-header {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--gold);
  margin-bottom: 0.4rem;
}

/* ─────────────────────────────────────────────────────────────
   DESSERT CARDS
───────────────────────────────────────────────────────────── */
.dessert-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.8rem;
  margin-bottom: 0.5rem;
}
.dessert-card {
  background: var(--surface2);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}
.dessert-name {
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text);
  line-height: 1.3;
}
.dessert-note {
  font-family: var(--font-nav);
  font-size: 0.6rem;
  color: var(--muted);
  margin-top: 0.3rem;
  font-style: italic;
}

/* ─────────────────────────────────────────────────────────────
   CTA + ADVISORY + FOOTER
───────────────────────────────────────────────────────────── */
.cta-row {
  text-align: center;
  padding: 3rem 0 1.5rem;
}
.rsvp-btn {
  display: inline-block;
  font-family: var(--font-nav);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--black);
  background: var(--gold);
  padding: 0.9rem 2.4rem;
  border-radius: 4px;
  transition: background 0.2s, transform 0.1s;
}
.rsvp-btn:hover {
  background: var(--gold-light);
  transform: translateY(-1px);
}
.rsvp-btn:active { transform: translateY(0); }

.advisory {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  font-family: var(--font-nav);
  font-size: 0.67rem;
  font-weight: 300;
  color: var(--muted);
  line-height: 1.8;
  letter-spacing: 0.02em;
  margin-top: 2rem;
}
.advisory strong {
  font-weight: 600;
  color: var(--text2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.6rem;
}

.site-footer {
  border-top: 1px solid var(--border);
  padding: 2.5rem 1.25rem;
  text-align: center;
  font-family: var(--font-nav);
  font-size: 0.68rem;
  font-weight: 400;
  color: var(--muted);
  letter-spacing: 0.08em;
  line-height: 2.2;
}
.site-footer a {
  color: var(--text2);
  text-decoration: none;
  transition: color 0.2s;
}
.site-footer a:hover { color: var(--gold); }
.footer-brand {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  font-style: italic;
  font-weight: 300;
  color: var(--gold);
  display: block;
  margin-bottom: 0.3rem;
}

/* ─────────────────────────────────────────────────────────────
   MOBILE OVERRIDES  ≤ 600px
───────────────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .topbar-inner { padding: 0 1rem; height: 60px; }
  .logo-link img { height: 36px; }
  .logo-name { font-size: 0.72rem; }
  .logo-tagline { display: none; }
  .back-link span { display: none; }

  .tab-bar { top: 60px; }
  .tab-btn { font-size: 0.58rem; padding: 0 0.75rem; height: 42px; letter-spacing: 0.12em; }

  .hero { padding: 2.5rem 1rem 2rem; }
  .hero-title { font-size: 2.4rem; }

  .main { padding: 0 1rem 5rem; }

  .item { gap: 0.75rem; }
  .item-name { font-size: 0.86rem; }
  .item-price { font-size: 0.92rem; }

  .grid-2 { grid-template-columns: 1fr; gap: 0; }
  .classics-grid { grid-template-columns: repeat(2, 1fr); }
  .beer-grid { grid-template-columns: repeat(2, 1fr); }
  .dessert-grid { grid-template-columns: repeat(2, 1fr); }

  .hh-chip { font-size: 0.68rem; padding: 0.35rem 0.7rem; }
  .hh-price { font-size: 1.3rem; min-width: 42px; }
}

/* ─────────────────────────────────────────────────────────────
   LIGHT MODE
───────────────────────────────────────────────────────────── */
@media (prefers-color-scheme: light) {
  :root {
    --black:    #faf8f4;
    --surface:  #f2ede6;
    --surface2: #ebe5dc;
    --surface3: #e0d9ce;
    --border:   #d5cec4;
    --border2:  #c8c0b4;
    --text:     #1a1510;
    --text2:    #3a3028;
    --muted:    #6b5e48;
    --muted2:   #9a8e7a;
  }
  .topbar { background: rgba(250,248,244,0.97); }
  .tab-bar { background: var(--surface); }
}
</style>
</head>
<body>

<!-- ══ TOP BAR ═══════════════════════════════════════════════ -->
<header class="topbar">
  <div class="topbar-inner">
    <a href="https://hivebuckhead.com" class="logo-link" aria-label="Hive Buckhead — Return to main site">
      <img src="https://hivebuckhead.com/wp-content/uploads/2018/10/site-logo_C.png" alt="Hive Buckhead" />
      <div class="logo-wordmark">
        <span class="logo-name">Hive Buckhead</span>
        <span class="logo-tagline">Atlanta's #1 Bistro</span>
      </div>
    </a>
    <a href="https://hivebuckhead.com" class="back-link" aria-label="Back to main site">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M8 1L3 6l5 5"/>
      </svg>
      <span>Back to site</span>
    </a>
  </div>
</header>

<!-- ══ TAB NAV ════════════════════════════════════════════════ -->
<nav class="tab-bar" aria-label="Menu sections">
  <div class="tab-inner">
    <button class="tab-btn active" data-target="brunch"    onclick="switchTab(this,'brunch')">Brunch</button>
    <button class="tab-btn"        data-target="apps"      onclick="switchTab(this,'apps')">Appetizers</button>
    <button class="tab-btn"        data-target="dinner"    onclick="switchTab(this,'dinner')">Dinner</button>
    <button class="tab-btn"        data-target="happyhour" onclick="switchTab(this,'happyhour')">Happy Hour</button>
    <button class="tab-btn"        data-target="cocktails" onclick="switchTab(this,'cocktails')">Cocktails</button>
    <button class="tab-btn"        data-target="desserts"  onclick="switchTab(this,'desserts')">Desserts</button>
  </div>
</nav>

<!-- ══ HERO ══════════════════════════════════════════════════ -->
<div class="hero">
  <p class="hero-eyebrow">1845 Peachtree Rd NW &nbsp;·&nbsp; Atlanta, GA 30309 &nbsp;·&nbsp; (470) 451-6419</p>
  <h1 class="hero-title">Our <strong>Menu</strong></h1>
  <div class="hero-divider"></div>
  <p class="hero-tagline">Brunch All Day &nbsp;·&nbsp; Every Day &nbsp;·&nbsp; 11 AM – Close</p>

  <div class="hours-bar">
    <div class="hours-col">
      <div class="hours-day">Mon – Thu</div>
      <div class="hours-row"><span class="dot"></span>Open 12 PM – 12 AM</div>
      <div class="hours-row"><span class="dot"></span>Brunch 12 PM – 5 PM</div>
      <div class="hours-row"><span class="dot"></span>Happy Hour 5 PM – 9 PM</div>
      <div class="hours-row"><span class="dot"></span>Dinner 5 PM – 12 AM</div>
    </div>
    <div class="hours-col">
      <div class="hours-day">Fri – Sun</div>
      <div class="hours-row"><span class="dot"></span>Open 11 AM – 12 AM</div>
      <div class="hours-row"><span class="dot"></span>Brunch 11 AM – 6 PM</div>
      <div class="hours-row"><span class="dot"></span>Happy Hour Fri 5 PM – 9 PM only</div>
      <div class="hours-row"><span class="dot"></span>Dinner 6 PM – 12 AM</div>
    </div>
  </div>
</div>

<!-- ══ CONTENT ════════════════════════════════════════════════ -->
<main class="main">

<!-- ─── BRUNCH ─────────────────────────────────────────────── -->
<section class="menu-section active" id="brunch">
  <div class="sec-header">
    <p class="sec-label">Served All Day</p>
    <h2 class="sec-title">Brunch</h2>
    <p class="sec-note">Substituted sides on fixed entrées may have an upcharge</p>
  </div>

  <div class="subsection">
    <p class="sub-title">Burgers &amp; Sandwiches</p>
    <div class="item"><div class="item-left"><div class="item-name">Chicken Burger</div><div class="item-desc">Fried chicken breast, american cheese, lettuce, tomato, onions, hive house aioli — BBQ, Buffalo, or Plain. Choice of fries or sweet fries (+$4)</div></div><div class="item-price">$18.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Catfish Burger</div><div class="item-desc">Fried catfish filet, lettuce, tomato, onions, hive house aioli, tartar sauce, coleslaw. Choice of fries or sweet fries (+$4)</div></div><div class="item-price">$18.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Smash Burger</div><div class="item-desc">Smashed ground beef, american cheese, arugula, onions, pickles, house burger sauce. Choice of fries or sweet fries (+$4)</div></div><div class="item-price">$23.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Breakfast Cheeseburger</div><div class="item-desc">Ground beef patty, lettuce, tomato, hive burger sauce, avocado spread, any egg choice, bacon (turkey or pork). Choice of grits, fries, sweet fries (+$4), or breakfast potatoes (+$6)</div></div><div class="item-price">$27</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Vegan Burger</div><div class="item-desc">Veggie patty, lettuce, tomato, vegan house mayo, choice of vegan mozzarella or vegan cheddar. Choice of fries, sweet fries (+$4), or brussels sprouts (+$9)</div></div><div class="item-price">$30</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Wagyu Burger</div><div class="item-desc">Ground wagyu beef, american cheese, lettuce, tomato, caramelized onions, mushrooms, house mayo. Temp: medium / medium well. Choice of fries, sweet fries (+$4), or brussels sprouts (+$9)</div></div><div class="item-price">$45</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Lobster &amp; Crab Grilled Cheese Panini</div><div class="item-desc">Lobster and lump crab grilled cheese on french bread, served with fries</div></div><div class="item-price">$33</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Grits Dishes</p>
    <div class="item"><div class="item-left"><div class="item-name">Catfish &amp; Grits</div><div class="item-desc">2 fried catfish filets, southern styled grits, creole sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$20.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Whiting &amp; Grits</div><div class="item-desc">2 fried whiting filets, southern styled grits, creole sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$20.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Shrimp &amp; Grits</div><div class="item-desc">Shrimp sautéed with garlic, lemon juice, and butter, southern styled grits <span class="item-note">Contains dairy</span></div></div><div class="item-price">$20.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Salmon &amp; Grits</div><div class="item-desc">8oz salmon, southern styled grits, creamy house sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$35</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Red Snapper &amp; Grits</div><div class="item-desc">1 lb whole or filet fried snapper, southern styled grits, creamy house sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$60</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Lobster Tail &amp; Grits</div><div class="item-desc">Petite lobster tail, southern styled grits, creamy house sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$65</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Main Courses</p>
    <div class="item"><div class="item-left"><div class="item-name">Cajun Pasta</div><div class="item-desc">Creamy red spicy cajun alfredo linguine, onions, bell peppers, topped with chicken or shrimp</div></div><div class="item-price">$25.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Fried Shrimp Tacos</div><div class="item-desc">Flour tortillas, fried gulf shrimp, veggie blend, house aioli, pico de gallo</div></div><div class="item-price">$14</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Avocado Toast</div><div class="item-desc">Toasted brioche, avocado spread, any egg choice, topped with micro greens</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Pecan Banana Foster French Toast</div><div class="item-desc">4 slices toasted brioche, bananas, strawberries, cream cheese, foster sauce, caramelized pecans</div></div><div class="item-price">$18.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Hive Omelet</div><div class="item-desc">2 eggs, spinach, pico de gallo, bell peppers. Choice of grits, fries, sweet fries (+$4), or breakfast potatoes (+$6)</div></div><div class="item-price">$19.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">10 Wings &amp; Fries</div><div class="item-desc">Deep fried split wings — 5 flat / 5 drum — served with fries. Sauce: hive, lemon pepper, mild, hot, plain, or jerk</div></div><div class="item-price">$20</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Chicken &amp; Waffles</div><div class="item-desc">2 whole wings with waffle: Red Velvet · Banana Nut · Belgian</div></div><div class="item-price">$27.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Steak &amp; Eggs</div><div class="item-desc">16oz ribeye grilled to perfection, 2 eggs. Choice of grits, fries, sweet fries (+$4), or breakfast potatoes (+$6)</div></div><div class="item-price">$33</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Whole Fried Red Snapper</div><div class="item-desc">1 lb whole snapper, lemon butter garlic sauce, kale, choice of grits or rice</div></div><div class="item-price">$50</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Chef's Whole Branzino or Branzino Filet</div><div class="item-desc">Oven and grilled branzino in hive sauce with onions, capers, and seasonal vegetables</div></div><div class="item-price">$55</div></div>
  </div>
</section>

<!-- ─── APPETIZERS ─────────────────────────────────────────── -->
<section class="menu-section" id="apps">
  <div class="sec-header">
    <p class="sec-label">Start Here</p>
    <h2 class="sec-title">Appetizers &amp; Salads</h2>
  </div>

  <div class="subsection">
    <p class="sub-title">Starters</p>
    <div class="item"><div class="item-left"><div class="item-name">Salmon Bites</div><div class="item-desc">Fresh salmon cubed, seasoned with hive seasoning, fried and served with aioli</div></div><div class="item-price">$14</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Chips &amp; Salsa</div><div class="item-desc">Housemade hot chips with house seasoning, served with salsa</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Hummus &amp; Pita</div><div class="item-desc">Delicious hummus served with naan bread</div></div><div class="item-price">$16</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Calamari</div><div class="item-desc">Calamari tubes and tentacles, jalapeño and banana peppers, marinara or aioli</div></div><div class="item-price">$16.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Wings</div><div class="item-desc">Tossed in hive sauce and lemon pepper, served with fries</div></div><div class="item-price">$20</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Chicken Egg Rolls</div><div class="item-desc">House-made, served with aioli</div></div><div class="item-price">$24</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Salmon Egg Rolls</div><div class="item-desc">House-made, served with aioli</div></div><div class="item-price">$24</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Crab Cakes</div><div class="item-desc">Hive lump crab cakes, fried, with house aioli</div></div><div class="item-price">$25</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Artichoke &amp; Spinach Dip</div><div class="item-desc">House made spinach dip served with hot fresh chips</div></div><div class="item-price">$25</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Salads</p>
    <div class="item"><div class="item-left"><div class="item-name">Beet Salad</div><div class="item-desc">Arugula, fresh beets, onions, blue cheese, balsamic vinaigrette</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Cobb Salad</div><div class="item-desc">Garden mix, grilled chicken, hard-boiled egg, bacon bits, blue cheese crumbles</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Caesar Salad</div><div class="item-desc">Romaine, croutons, parmesan cheese</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">House Salad</div><div class="item-desc">Lettuce, onions, tomatoes, croutons, parmesan cheese</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Spinach Berry Salad</div><div class="item-desc">Spinach, blueberries, strawberries, onions, croutons, parmesan, raspberry vinaigrette</div></div><div class="item-price">$15</div></div>
  </div>
</section>

<!-- ─── DINNER ─────────────────────────────────────────────── -->
<section class="menu-section" id="dinner">
  <div class="sec-header">
    <p class="sec-label">Mon–Thu 5 PM · Fri–Sun 6 PM</p>
    <h2 class="sec-title">Dinner &amp; Entrées</h2>
    <p class="sec-note">Substituted sides on fixed entrées may have an upcharge</p>
  </div>

  <div class="subsection">
    <p class="sub-title">Burgers</p>
    <div class="item"><div class="item-left"><div class="item-name">Chicken Burger</div><div class="item-desc">Fried chicken breast, american cheese, lettuce, tomato, onions, hive house aioli — BBQ, Buffalo, or Plain. Choice of fries or sweet fries (+$4)</div></div><div class="item-price">$18.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Catfish Burger</div><div class="item-desc">Fried catfish filet, lettuce, tomato, onions, hive house aioli, tartar sauce, coleslaw</div></div><div class="item-price">$18.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Smash Burger</div><div class="item-desc">Mashed ground beef, american cheese, arugula, onions, pickles, house burger sauce. Choice of fries or sweet fries (+$4)</div></div><div class="item-price">$23.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Vegan Burger</div><div class="item-desc">Veggie patty, lettuce, tomato, vegan house mayo, choice of vegan mozzarella or vegan cheddar. Choice of fries, sweet fries (+$4), or brussels sprouts (+$9)</div></div><div class="item-price">$30</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Wagyu Burger</div><div class="item-desc">Ground wagyu beef, american cheese, lettuce, tomato, caramelized onions, mushrooms, house mayo. Temp: medium or medium well only</div></div><div class="item-price">$45</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Grits</p>
    <div class="item"><div class="item-left"><div class="item-name">Catfish &amp; Grits</div><div class="item-desc">2 fried catfish filets, southern styled grits, creole sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$25</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Whiting &amp; Grits</div><div class="item-desc">2 fried whiting filets, southern styled grits, creole sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$25</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Shrimp &amp; Grits</div><div class="item-desc">Shrimp sautéed with garlic, lemon juice, and butter, southern styled grits <span class="item-note">Contains dairy</span></div></div><div class="item-price">$25</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Salmon &amp; Grits</div><div class="item-desc">8oz salmon, southern styled grits, creamy house sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$35</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Red Snapper &amp; Grits</div><div class="item-desc">1 lb whole or filet fried snapper, southern styled grits, creamy house sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$60</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Lobster Tail &amp; Grits</div><div class="item-desc">Petite lobster tail, southern styled grits, creamy house sauce <span class="item-note">Contains dairy</span></div></div><div class="item-price">$65</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Main Course</p>
    <div class="item"><div class="item-left"><div class="item-name">Jerk Pasta or Hive Pasta</div><div class="item-desc">Creamy alfredo penne, onions, spinach, tomatoes, parmesan — topped with salmon or chicken</div></div><div class="item-price">$38</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Lobster &amp; Shrimp Pasta</div><div class="item-desc">Choice of hive or jerk creamy alfredo penne, onions, spinach, tomatoes, topped with lobster and shrimp</div></div><div class="item-price">$50</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Chicken &amp; Waffles</div><div class="item-desc">2 whole wings with waffle: Red Velvet · Banana Nut · Belgian</div></div><div class="item-price">$27.5</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Hive South</div><div class="item-desc">3 whole wings served with hive collard greens and sweet yams</div></div><div class="item-price">$35</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Hive Prawns</div><div class="item-desc">Succulent prawns in cajun sauce, served with hive fried rice</div></div><div class="item-price">$35</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Salmon &amp; Shrimp</div><div class="item-desc">Fresh salmon fillet and grilled blackened shrimp, served with choice of side</div></div><div class="item-price">$40</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Chilean Seabass</div><div class="item-desc">Pan seared and lightly grilled seabass, breadcrumb parmesan crusted, served with seasonal vegetables</div></div><div class="item-price">$45</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Whole Fried Red Snapper</div><div class="item-desc">1 lb whole snapper, lemon butter garlic sauce, served with choice of side</div></div><div class="item-price">$50</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Steak &amp; Shrimp</div><div class="item-desc">16oz ribeye grilled to perfection, succulent grilled shrimp, served with choice of side</div></div><div class="item-price">$50</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Short Ribs</div><div class="item-desc">Succulent beef short ribs seasoned with a blend of spices, sweet sauce, seasonal vegetables</div></div><div class="item-price">$55</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Lamb Chops &amp; Shrimp</div><div class="item-desc">Tender lamb chops and succulent shrimp grilled, topped with hive Jack Daniel's sauce</div></div><div class="item-price">$55</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Chef's Whole Branzino or Branzino Filet</div><div class="item-desc">Oven and grilled branzino in hive sauce with onions, capers, and seasonal vegetables</div></div><div class="item-price">$55</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Signature Sides</p>
    <div class="grid-2">
      <div class="item"><div class="item-left"><div class="item-name">Parmesan Mashed Potatoes</div></div><div class="item-price">$8</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Creole Rice</div></div><div class="item-price">$8</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Herb Rice</div></div><div class="item-price">$8</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Side Plantains</div></div><div class="item-price">$8</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Asparagus</div></div><div class="item-price">$10</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Parmesan Fries</div></div><div class="item-price">$10</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Broccoli</div></div><div class="item-price">$12</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Brussels Sprouts</div></div><div class="item-price">$12</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Sautéed Spinach &amp; Mushrooms</div></div><div class="item-price">$12</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Mac &amp; Cheese</div></div><div class="item-price">$15</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Crab Mac</div></div><div class="item-price">$20</div></div>
      <div class="item"><div class="item-left"><div class="item-name">Lobster Mac</div></div><div class="item-price">$26</div></div>
    </div>
  </div>
</section>

<!-- ─── HAPPY HOUR ─────────────────────────────────────────── -->
<section class="menu-section" id="happyhour">
  <div class="sec-header">
    <p class="sec-label">Mon–Fri 4 PM – 9 PM · Sun 6 PM – Midnight</p>
    <h2 class="sec-title">Happy Hour</h2>
    <p class="sec-note">No Saturday Happy Hour</p>
  </div>

  <div class="hh-tiers">
    <div class="hh-tier">
      <div class="hh-tier-header">
        <div class="hh-price">$2</div>
        <div class="hh-line"></div>
      </div>
      <div class="hh-chips">
        <span class="hh-chip">Tacos</span>
      </div>
    </div>

    <div class="hh-tier">
      <div class="hh-tier-header">
        <div class="hh-price">$5</div>
        <div class="hh-line"></div>
      </div>
      <div class="hh-chips">
        <span class="hh-chip">Tostones</span>
        <span class="hh-chip">Shot Specials</span>
      </div>
    </div>

    <div class="hh-tier">
      <div class="hh-tier-header">
        <div class="hh-price">$7</div>
        <div class="hh-line"></div>
      </div>
      <div class="hh-chips">
        <span class="hh-chip">Churros</span>
        <span class="hh-chip">Chips &amp; Salsa</span>
        <span class="hh-chip">Mozzarella Cheese Sticks</span>
        <span class="hh-chip">Fried Mushrooms</span>
        <span class="hh-chip">Mac Bites</span>
        <span class="hh-chip">Veggie Spring Rolls</span>
      </div>
    </div>

    <div class="hh-tier">
      <div class="hh-tier-header">
        <div class="hh-price">$8</div>
        <div class="hh-line"></div>
      </div>
      <div class="hh-chips">
        <span class="hh-chip">Plantains</span>
      </div>
    </div>

    <div class="hh-tier">
      <div class="hh-tier-header">
        <div class="hh-price">$10</div>
        <div class="hh-line"></div>
      </div>
      <div class="hh-chips">
        <span class="hh-chip">Lamb Chops</span>
        <span class="hh-chip">Steak Frites</span>
        <span class="hh-chip">Pasta &amp; Chicken</span>
        <span class="hh-chip">Chicken &amp; Waffle</span>
        <span class="hh-chip">Roasted Chicken &amp; Rice</span>
        <span class="hh-chip">Burger &amp; Fries</span>
      </div>
    </div>

    <div class="hh-tier">
      <div class="hh-tier-header">
        <div class="hh-price" style="font-size:1rem;padding-top:3px;">Drinks</div>
        <div class="hh-line"></div>
      </div>
      <div class="hh-chips">
        <span class="hh-chip">Daiquiri Specials</span>
        <span class="hh-chip">Bottle Specials — $75</span>
      </div>
    </div>
  </div>
</section>

<!-- ─── COCKTAILS ──────────────────────────────────────────── -->
<section class="menu-section" id="cocktails">
  <div class="sec-header">
    <p class="sec-label">Full Bar Available · 21+ to consume alcohol</p>
    <h2 class="sec-title">Cocktails &amp; Drinks</h2>
  </div>

  <div class="subsection">
    <p class="sub-title">Hive Signature Cocktails</p>
    <div class="item"><div class="item-left"><div class="item-name">Georgia Peach</div><div class="item-desc">Peach vodka, peach purée, orange juice</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Lemon Drop</div><div class="item-desc">Vodka, simple syrup, fresh lemon</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Tango With Mango</div><div class="item-desc">Vodka, mango purée, Grand Marnier, orange juice</div></div><div class="item-price">$15</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Sweet Temper</div><div class="item-desc">Vodka, strawberry purée, Grand Marnier, cranberry juice</div></div><div class="item-price">$17</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Twilight Zone</div><div class="item-desc">Vodka, Grand Marnier, cranberry juice, lime squeeze</div></div><div class="item-price">$17</div></div>
    <div class="item"><div class="item-left"><div class="item-name">She's A Keeper</div><div class="item-desc">Champagne, vodka, strawberry purée, triple sec — on rocks or frozen</div></div><div class="item-price">$18</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Love Slide</div><div class="item-desc">Vodka, strawberry cream Bailey's</div></div><div class="item-price">$18</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Atlanta Weather</div><div class="item-desc">Vodka, apple pucker, triple sec, melon liqueur, pineapple juice, sprite</div></div><div class="item-price">$18</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Beekeeper</div><div class="item-desc">Whiskey, strawberry purée, lemonade, sprite</div></div><div class="item-price">$18</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Hive Hummer</div><div class="item-desc">Tequila, blue curaçao, sour mix, triple sec — blue margarita style</div></div><div class="item-price">$18</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Peach Be Still</div><div class="item-desc">Crown Royal Peach, sour mix, triple sec, lime juice, peach schnapps</div></div><div class="item-price">$18</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Merry Margarita</div><div class="item-desc">Tequila, sour mix, triple sec, lime juice, pomegranate</div></div><div class="item-price">$18</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Lust Martini</div><div class="item-desc">Vodka lemon drop with watermelon or blueberry liqueur</div></div><div class="item-price">$20</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Cupid Shuffle</div><div class="item-desc">Tequila, rum, sour mix, cranberry juice, triple sec, splash of sprite</div></div><div class="item-price">$20</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Jaded</div><div class="item-desc">Jack Daniel's, peach schnapps, sour mix, cranberry, lime squeezed</div></div><div class="item-price">$20</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Queen Bee</div><div class="item-desc">Tequila, mango purée, orange juice, grenadine</div></div><div class="item-price">$20</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Peachtree Traffic</div><div class="item-desc">Coconut rum, melon liqueur, peach schnapps, OJ, pineapple juice</div></div><div class="item-price">$20</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Buckhead Tea</div><div class="item-desc">Peach vodka, rum, gin, triple sec, sour mix, splash of sprite</div></div><div class="item-price">$20</div></div>
    <div class="item"><div class="item-left"><div class="item-name">The Festival</div><div class="item-desc">Rum, OJ, pineapple juice, lime squeeze, strawberry purée</div></div><div class="item-price">$20</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Basic Cocktails — $15</p>
    <div class="classics-grid">
      <div class="classic-item">Sex On The Beach</div>
      <div class="classic-item">Long Island</div>
      <div class="classic-item">Blue Motorcycle / BMF</div>
      <div class="classic-item">Long Beach</div>
      <div class="classic-item">Tokyo Tea</div>
      <div class="classic-item">Bahama Mama</div>
      <div class="classic-item">Mojito</div>
      <div class="classic-item">Margarita</div>
      <div class="classic-item">Hennessy Margarita</div>
      <div class="classic-item">Tequila Sunrise</div>
      <div class="classic-item">Old Fashion</div>
      <div class="classic-item">Gimlet</div>
      <div class="classic-item">Mai Tai</div>
      <div class="classic-item">Cosmopolitan</div>
      <div class="classic-item">Moscow Mule</div>
      <div class="classic-item">Tom Collins</div>
    </div>
  </div>

  <div class="subsection">
    <p class="sub-title">Premium Cocktails</p>
    <div class="item"><div class="item-left"><div class="item-name">Manhattan</div></div><div class="item-price">$17</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Cocktail Flights</p>
    <div class="item"><div class="item-left"><div class="item-name">Lemon Drop Flight</div><div class="item-desc">4 lemon drops: strawberry, regular, blue curaçao, pomegranate</div></div><div class="item-price">House $60 · Top Shelf $70</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Margarita Flight</div></div><div class="item-price">House $60 · Top Shelf $70</div></div>
  </div>

  <div class="subsection">
    <p class="sub-title">Frozen Daiquiris — $18</p>
    <div class="classics-grid">
      <div class="classic-item">Bumble Rumble<span class="classic-sub">Blue hawaiian, rum</span></div>
      <div class="classic-item">Lemon Drop<span class="classic-sub">Lemon, vodka</span></div>
      <div class="classic-item">Abeemination<span class="classic-sub">Hurricane, rum</span></div>
      <div class="classic-item">Frosé<span class="classic-sub">Sparkling rosé, vodka</span></div>
      <div class="classic-item">The Drone<span class="classic-sub">Margarita, strawberry, tequila</span></div>
    </div>
    <div class="item" style="margin-top:1rem">
      <div class="item-left"><div class="item-name">The Hornet</div><div class="item-desc">Peach, Hennessy</div></div>
      <div class="item-price">$20</div>
    </div>
  </div>

  <div class="subsection">
    <p class="sub-title">Draft Beer</p>
    <div class="item"><div class="item-left"><div class="item-name">Pint</div></div><div class="item-price">$6.50</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Pitcher</div></div><div class="item-price">$26</div></div>
    <div class="beer-grid" style="margin-top:0.8rem">
      <div class="beer-item">Sweetwater</div>
      <div class="beer-item">Stella Artois</div>
      <div class="beer-item">Scofflaw</div>
      <div class="beer-item">Blue Moon</div>
      <div class="beer-item">Angry Orchard</div>
      <div class="beer-item">Yuengling</div>
    </div>
  </div>

  <div class="subsection">
    <p class="sub-title">Bottle Beer — $8</p>
    <div class="beer-grid">
      <div class="beer-item">Budweiser</div>
      <div class="beer-item">Coors Light</div>
      <div class="beer-item">Bud Light</div>
      <div class="beer-item">Corona</div>
      <div class="beer-item">Sweetwater IPA</div>
      <div class="beer-item">Guinness</div>
      <div class="beer-item">Mich Ultra</div>
      <div class="beer-item">Peroni</div>
      <div class="beer-item">Dos XX</div>
      <div class="beer-item">Heineken</div>
      <div class="beer-item">Modelo</div>
      <div class="beer-item">Ginger Beer</div>
    </div>
  </div>
</section>

<!-- ─── DESSERTS ───────────────────────────────────────────── -->
<section class="menu-section" id="desserts">
  <div class="sec-header">
    <p class="sec-label">Sweet Endings</p>
    <h2 class="sec-title">Desserts</h2>
  </div>

  <div class="subsection">
    <p class="sub-title">Cakes &amp; Pastries — $20</p>
    <div class="dessert-grid">
      <div class="dessert-card"><div class="dessert-name">Tiramisu Cake</div></div>
      <div class="dessert-card"><div class="dessert-name">Strawberry Cheesecake</div></div>
      <div class="dessert-card"><div class="dessert-name">Chocolate Lava Brownie</div></div>
      <div class="dessert-card"><div class="dessert-name">Chocolate Cake</div><div class="dessert-note">Gluten free</div></div>
      <div class="dessert-card"><div class="dessert-name">Crème Brûlée Cheesecake</div></div>
      <div class="dessert-card"><div class="dessert-name">Tres Leches</div></div>
      <div class="dessert-card"><div class="dessert-name">Classic Cheesecake</div></div>
    </div>
  </div>

  <div class="subsection">
    <p class="sub-title">Additional Desserts</p>
    <div class="item"><div class="item-left"><div class="item-name">Ice Cream</div><div class="item-desc">Served per scoop: Vanilla · Butter Pecan · Cookies &amp; Cream</div></div><div class="item-price">$6 / scoop</div></div>
    <div class="item"><div class="item-left"><div class="item-name">Churros &amp; Ice Cream</div></div><div class="item-price">$20</div></div>
  </div>
</section>

<!-- ─── CTA ────────────────────────────────────────────────── -->
<div class="cta-row">
  <a href="https://reservations.thehivebuckhead.com/rsvp" class="rsvp-btn">Reserve a Table</a>
</div>

<!-- ─── ADVISORY ───────────────────────────────────────────── -->
<div class="advisory">
  <strong>Health Advisory</strong><br/>
  Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness, especially if you have certain medical conditions.<br/><br/>
  <strong>Service &amp; Payment</strong><br/>
  A 20% gratuity will be added to all dine-in checks. We accept cash and chip-enabled credit/debit cards. Menu items and prices are subject to change without notice.
</div>

</main>

<!-- ─── FOOTER ──────────────────────────────────────────────── -->
<footer class="site-footer">
  <span class="footer-brand">Hive Buckhead</span>
  1845 Peachtree Rd NW, Atlanta, GA 30309<br/>
  <a href="tel:+14704516419">(470) 451-6419</a>
  &nbsp;·&nbsp;
  <a href="https://reservations.thehivebuckhead.com/rsvp">Make a Reservation</a>
  &nbsp;·&nbsp;
  <a href="https://hivebuckhead.com">hivebuckhead.com</a>
</footer>

<script>
function switchTab(btn, id) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Scroll tab button into view on mobile without jumping page
  btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  // Scroll to top of content (below the two sticky bars)
  const offset = 68 + 46 + 8;
  window.scrollTo({ top: offset, behavior: 'smooth' });
}

// Deep link via URL hash: menu.hivebuckhead.com#dinner
(function() {
  const map = {
    brunch: 'brunch', appetizers: 'apps', apps: 'apps',
    dinner: 'dinner', 'happy-hour': 'happyhour', happyhour: 'happyhour',
    cocktails: 'cocktails', desserts: 'desserts',
  };
  const hash = location.hash.replace('#','').toLowerCase();
  if (hash && map[hash]) {
    const target = map[hash];
    const btn = document.querySelector('[data-target="' + target + '"]');
    if (btn) { switchTab(btn, target); }
  }
})();
</script>
</body>
</html>
`

export async function GET() {
  return new NextResponse(MENU_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  })
}
