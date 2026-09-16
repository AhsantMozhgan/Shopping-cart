# 🛒 JS Shopping Cart

A shopping cart UI built with plain **HTML, CSS, and JavaScript**, no
frameworks, no build tools, no dependencies. It fetches a product
catalog, lets a user add/remove items and adjust quantities, persists
the cart across page reloads with `localStorage`, and keeps the total
price and item count in sync in real time.

## 📸  **Screenshots:**

<img width="1381" height="882" alt="Screenshot" src="https://github.com/user-attachments/assets/5417f986-8095-4570-b092-890391151a19" />

## 🎥 **Demo video:**
<!-- https://github.com/user-attachments/assets/REPLACE_WITH_YOUR_UPLOAD_ID -->
https://github.com/user-attachments/assets/5b1be73f-32a8-4e64-b36e-21890f6d9ae2

<!-- <sub>Local preview: <a href="./docs/demo.mp4">docs/demo.mp4</a></sub> -->

## Why this project

I built this to get hands-on with core browser APIs without a
framework doing the work for me: `fetch`, the DOM, event delegation,
and `localStorage`. Working without React/Vue also meant I had to be
deliberate about state management and rendering.

## Features

- Fetches product data (async `fetch` + JSON, normalized from a
  Contentful-CMS-style nested shape into a flat, simple object) and
  renders it as a responsive grid
- Add to cart, with automatic quantity merge if the same product is
  added twice
- Increase / decrease quantity per line item, auto-removing a line
  once its quantity hits zero
- Remove a single item, or clear the whole cart in one click
- Live-updating item count badge and running total price
- Slide-out cart panel with open/close controls
- Cart state survives a page refresh via `localStorage`

## Tech stack

| Layer       | Choice                                              |
|-------------|------------------------------------------------------|
| Markup      | Semantic HTML5                                      |
| Styling     | Hand-written CSS (Flexbox, CSS Grid, transitions)   |
| Behavior    | Vanilla ES6+ JavaScript (classes, `async/await`, template literals) |
| Persistence | `localStorage`                                      |
| Icons       | Font Awesome (CDN)                                  |

No React, no jQuery, no bundler — everything runs directly in the
browser from static files.

## Architecture

The JavaScript is split into three small classes, each with one job:

```
Product   → fetches products.json and reshapes each entry into
            { id, title, price, image }
View      → the only code that touches the DOM: renders product
            cards and cart rows, wires up click listeners, shows/
            hides the cart panel
Storage   → the only code that touches localStorage (save/read
            products and the cart)
```

`cart` is kept as a single in-memory array that always mirrors what's
saved in `localStorage`. Every change follows the same pattern:
update the array → update the DOM → persist it. Cart-panel clicks
(delete / increase / decrease) are handled with **one delegated
listener** on the cart container rather than one listener per row,
since rows are added and removed dynamically.

## Run it

This is a static site — no build step, no dependencies to install.

```bash
git clone https://github.com/AhsantMozhgan/Shopping-cart.git
cd Shopping-cart
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

Any other static server works just as well, for example:

```bash
npx serve .
```

or opening `index.html` with the VS Code "Live Server" extension.

## Author

**Mozhgan Ahsant**