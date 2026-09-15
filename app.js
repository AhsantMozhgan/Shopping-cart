/* ---------- DOM references ----------
   These run at the top level, which is safe because <script src="app.js"> sits
   at the very end of <body>. By the time this file executes, every element it
   asks for already exists in the document. Caching them once here means we
   never pay for a DOM lookup inside a loop or an event handler.
   ------------------------------------ */
const productsDOM = document.querySelector('.products-center')   // grid the product cards go into
const cartItems   = document.querySelector('.cart-items')        // little number badge on the navbar icon
const cartTotal   = document.querySelector('.cart-total')        // total price in the cart footer
const cartContent = document.querySelector('.cart-content')      // list the cart rows get appended to
const cartDOM     = document.querySelector('.cart')              // the sliding panel itself
const cartOverlay = document.querySelector('.cart-overlay')      // dim layer behind the panel
const cartBtn     = document.querySelector('.cart-btn')          // navbar icon that opens the panel
const closeCartBtn= document.querySelector('.close-cart')        // X icon that closes it
const clearCartBtn= document.querySelector('.clear-cart')        // 'Delete Products' button

/* ---------- Application state ----------
   `cart` is the single array every other part of the app reads from and writes to.
   It is `let`, not `const`, because the update methods below replace it with a new
   array rather than mutating it in place. Rebuilding instead of mutating makes each
   change explicit: you can always see exactly where the array became something new.
   ---------------------------------------- */
let cart = []

/* ============================================================
   class Product — everything to do with fetching product data
   ============================================================
   Keeping the network call in its own class means the rest of the app never needs
   to know where products come from. Swap products.json for a real API later and
   only this one method changes.
   ============================================================ */
class Product {
    /* `async` lets us write the two-stage fetch as straight-line code instead of
       nesting .then() callbacks. The function still returns a Promise, which is why
       the caller at the bottom of the file uses .then() on it. */
    async getProducts() {
        try {
            const result = await fetch('products.json')   // wait for the HTTP response
            const data   = await result.json()            // wait for the body to parse as JSON

            /* The raw feed is deeply nested (fields.image.fields.file.url). Every part
               of the UI would have to repeat that path. Instead we flatten it once,
               right here, so the rest of the app only ever sees {title, price, id, image}. */
            let products = data.items
            products = products.map((item) => {
                const { title } = item.fields
                const { id }    = item.sys                 // id lives on `sys`, not `fields`
                const image     = item.fields.image.fields.file.url

                /* The feed stores price as a string, and that string carries a leading
                   "$" — "$89", not "89". Number() cannot parse a "$" character, so
                   Number("$89") is NaN, not 89. .replace() strips out anything that
                   isn't a digit or a decimal point (the "$", and commas too, in case a
                   price is ever written "$1,299") before Number() ever sees the string.

                   Number.isFinite() then catches whatever the strip-and-convert still
                   gets wrong: a missing field comes through as undefined; an unset
                   field can come through as null; either way .replace() would throw on
                   a non-string, which is exactly the case this check is for. Falling
                   back to 0 and logging a warning means one product with bad price data
                   shows as $0 with a visible trail to the cause, rather than "$NaN" or
                   a silently wrong number baked into the page. */
                const rawPrice = item.fields.price
                let price = typeof rawPrice === 'string'
                    ? Number(rawPrice.replace(/[^0-9.]/g, ''))
                    : Number(rawPrice)

                if (!Number.isFinite(price)) {
                    console.warn(`Product "${title}" (id: ${id}) has a non-numeric price:`, rawPrice)
                    price = 0
                }

                return { title, price, id, image }
            })

            return products
        } catch (err) {
            /* A failed fetch or malformed JSON lands here. Catching keeps a network
               problem from silently rejecting the Promise with no explanation. */
            console.log(err)
        }
    }
}

/* ============================================================
   class View — everything that reads from or writes to the page
   ============================================================
   All DOM work lives here. Product knows about data, Storage knows about
   persistence, View knows about pixels. Keeping those three apart is why a change
   to the markup never forces a change to the fetch logic.
   ============================================================ */
class View {

    /* ---------- displayProducts ----------
       Builds the whole grid as one string, then assigns it once.
       Why one assignment instead of appending inside the loop: every write to
       .innerHTML makes the browser reparse and relayout that element. Concatenating
       into a local string and assigning a single time means one reparse total,
       no matter how many products come back. */
    displayProducts(products) {
        let result = ''

        products.forEach((item) => {
            /* Template literals let the HTML keep its real shape across several lines
               while ${...} drops the live values in. */
            result += `
            <article class="product">
                <div class="img-container">
                    <img
                        src="${item.image}"
                        alt="${item.title}"
                        class="product-img"
                    />
                    <button class="bag-btn" data-id="${item.id}">Add to the Shopping Cart</button>
                </div>
                <h3>${item.title}</h3>
                <h4>$${item.price}</h4>
            </article>
            `
        })

        productsDOM.innerHTML = result
    }

    /* ---------- getCartButtons ----------
       The stored product record has no quantity on it, because quantity is a
       property of a cart line rather than of the product itself. Spreading the
       record into a new object and adding `amount: 1` produces a cart line without
       modifying what Storage handed back.

       Persisting immediately after the array changes means localStorage and `cart`
       can never drift apart — there is no separate "save" step to forget.

       The handler is an arrow function so `this` still refers to the View instance;
       a regular function would rebind it to the clicked button. */
    getCartButtons() {
        const buttons = [...document.querySelectorAll('.bag-btn')]

        buttons.forEach((item) => {
            const id = item.dataset.id

            item.addEventListener('click', (event) => {
                const product = Storage.getProduct(id)

                /* getProduct returns undefined if no product with this id exists in
                   the saved catalogue. Spreading undefined would silently produce a
                   cart line with no price and no title, which is exactly the kind of
                   line that turns the total into NaN. Bailing out here means a lookup
                   failure never reaches the cart at all. */
                if (!product) {
                    console.warn(`No saved product found for id: ${id}`)
                    return
                }

                const cartItem = { ...product, amount: 1 }

                cart = [...cart, cartItem]
                Storage.saveCart(cart)

                this.setCartValues(cart)    // badge + total recalculated from the new array
                this.addCartItem(cartItem)  // one new row inside the cart panel
                this.showCart()             // slide the panel open so the change is visible
            })
        })
    }

    /* ---------- setCartValues ----------
       Both numbers on screen are derived from `cart` rather than tracked separately.
       That is the important idea here: there is no `totalPrice` variable sitting
       around that could fall out of sync. Whatever the array currently holds is what
       gets displayed, so every code path that changes the cart only has to call this.

       Totals start at 0 and accumulate across the array. `.forEach` is used rather
       than `.map` because nothing is being built from the return values, the loop
       exists purely for its running totals.

       .innerText is used instead of .innerHTML because these are plain numbers; there
       is no markup to parse and no reason to let a value be interpreted as HTML. */
    setCartValues(cart) {
        let totalPrice = 0
        let totalItems = 0

        cart.forEach((item) => {
            /* Number(...) turns a missing or malformed price/amount into 0 instead of
               NaN. Without this, a single bad line — e.g. a cart line left over from
               localStorage in an older shape, or a lookup that failed to find a match —
               poisons the total forever: NaN + anything is NaN, and it never recovers
               on its own, even after that line is removed and new lines are added. */
            const price  = Number(item.price)  || 0
            const amount = Number(item.amount) || 0

            totalPrice = totalPrice + price * amount
            totalItems = totalItems + amount
        })

        /* Prices come out of multiplication as floats, so toFixed(2) keeps the display
           to two decimal places instead of showing something like 118.97000000000001. */
        cartTotal.innerText = totalPrice.toFixed(2)
        cartItems.innerText = totalItems
    }

    /* ---------- addCartItem ----------
       createElement + appendChild adds one row without touching the rows already on
       screen. Rewriting cartContent.innerHTML would work too, but it would throw away
       and rebuild every existing row on each addition.

       .classList.add() puts the styling class on the wrapper element itself, so the
       template below only has to describe what goes inside it.
       Every control inside the row carries its own data-id. The delegated listener
       added below reads that attribute to know which cart line was acted on, which
       means the row needs no listener of its own. */
    addCartItem(item) {
        const div = document.createElement('div')
        div.classList.add('cart-item')

        div.innerHTML = `
            <img src="${item.image}" alt="${item.title}" />
            <div>
                <h4>${item.title}</h4>
                <h5>$${item.price}</h5>
                <span class="remove-item" data-id="${item.id}">Delete</span>
            </div>
            <div>
                <i class="fas fa-chevron-up" data-id="${item.id}"></i>
                <p class="item-amount">${item.amount}</p>
                <i class="fas fa-chevron-down" data-id="${item.id}"></i>
            </div>
        `

        cartContent.appendChild(div)
    }

    /* ---------- showCart ----------
       Opening the panel is done by adding classes, not by setting styles in JS.
       The CSS already describes both states and the transition between them, so all
       this has to do is flip which state is active. Animation timing, colours and
       easing stay in the stylesheet where they belong. */
    showCart() {
        cartOverlay.classList.add('transparentBcg')   // fades the dim layer in
        cartDOM.classList.add('showCart')             // slides the panel in from the right
    }

    /* ---------- initApp ----------
       Runs once, before anything else, and rebuilds the UI from whatever was saved.
       Without this the array would start empty on every page load and a refresh would
       silently throw the cart away. Restoring first also means the totals on screen
       are correct before the user has touched anything. */
    initApp() {
        cart = Storage.getCart()  // saved lines, or [] on a first visit
        this.setCartValues(cart)  // badge and total reflect them immediately
        this.populate(cart)       // rebuild one row per saved line
        /* Arrow functions are used rather than passing the method directly. Handing
           `this.showCart` straight to addEventListener would lose the binding and
           `this` inside it would become the clicked button. Wrapping in an arrow keeps
           `this` pointed at the View instance. */
        cartBtn.addEventListener('click', () => this.showCart())
        closeCartBtn.addEventListener('click', () => this.hideCart())
    }

    /* ---------- populate ----------
       Reuses addCartItem for each saved line. Restored rows and freshly added rows go
       through exactly the same code, so they can never render differently. */
    populate(cart) {
        cart.forEach((item) => this.addCartItem(item))
    }

    /* ---------- hideCart ----------
       The exact mirror of showCart. Because both states are described in CSS, closing
       is just removing the same two classes and the transition plays in reverse. */
    hideCart() {
        cartOverlay.classList.remove('transparentBcg')
        cartDOM.classList.remove('showCart')
    }

    /* ---------- cartProcess ----------
       One method that wires up every interaction inside the cart panel. Grouping them
       means there is a single place to look when asking "what can the user do in
       here", and a single call to make after the products have rendered. */
    cartProcess() {
        clearCartBtn.addEventListener('click', () => this.clearCart())
        /* One listener on the container instead of one per control.

           Cart rows are created and destroyed constantly, and a listener attached to
           a row disappears with it — new rows would need to be re-bound every time.
           Clicks bubble up to .cart-content, which always exists, so a single listener
           here covers every row that ever appears. event.target is whatever was
           actually clicked, and the class checks below route it to the right branch. */
        cartContent.addEventListener('click', (event) => {
            /* --- Delete this line --- */
            if (event.target.classList.contains('remove-item')) {
                const removeItem = event.target
                const id = removeItem.dataset.id

                /* The Delete link sits inside a <div> inside the .cart-item wrapper,
                   so the element to remove is two levels up from what was clicked. */
                cartContent.removeChild(removeItem.parentElement.parentElement)

                this.removeProduct(id)
            }

            /* --- Increase quantity --- */
            if (event.target.classList.contains('fa-chevron-up')) {
                const addAmount = event.target
                const id = addAmount.dataset.id

                /* .find() returns the actual object inside `cart`, not a copy, so
                   changing .amount on it updates the array in place. */
                const product = cart.find((item) => item.id === id)
                product.amount = product.amount + 1

                Storage.saveCart(cart)
                this.setCartValues(cart)

                /* The quantity <p> is the element immediately after the up-chevron,
                   so nextElementSibling reaches it without another querySelector. */
                addAmount.nextElementSibling.innerText = product.amount
            }

            /* --- Decrease quantity --- */
            if (event.target.classList.contains('fa-chevron-down')) {
                const lowerAmount = event.target
                const id = lowerAmount.dataset.id

                const product = cart.find((item) => item.id === id)
                product.amount = product.amount - 1

                /* Two outcomes from one decrement. Above zero the line stays and only
                   its number changes. At zero the line has no meaning any more, so the
                   row comes out of the DOM and the record comes out of the array —
                   which is exactly what the Delete link does, reusing removeProduct. */
                if (product.amount > 0) {
                    Storage.saveCart(cart)
                    this.setCartValues(cart)

                    /* The quantity <p> sits just before the down-chevron. */
                    lowerAmount.previousElementSibling.innerText = product.amount
                } else {
                    cartContent.removeChild(lowerAmount.parentElement.parentElement)
                    this.removeProduct(id)
                }
            }
        })
    }

    /* ---------- clearCart ----------
       The ids are collected into their own array first. Iterating `cart` directly
       while removeProduct reassigns it would mean walking a list that is changing
       underneath the loop, and entries would be skipped. Snapshotting the ids gives
       the loop something stable to work through.

       The while loop then empties the panel. Removing children[0] repeatedly works
       because the collection is live: each removal shifts the next row into index 0,
       so the loop keeps taking the front of the list until nothing is left. */
    clearCart() {
        const cartIds = cart.map((item) => item.id)

        cartIds.forEach((id) => this.removeProduct(id))

        while (cartContent.children.length > 0) {
            cartContent.removeChild(cartContent.children[0])
        }
    }

    /* ---------- removeProduct ----------
       .filter() builds a new array containing everything except the matching id,
       which reads more directly than finding an index and splicing it out.

       Recalculating and saving happen here rather than at each call site, so removing
       a line always leaves the totals and localStorage consistent no matter which
       control triggered it. */
    removeProduct(id) {
        cart = cart.filter((item) => item.id !== id)

        this.setCartValues(cart)
        Storage.saveCart(cart)
    }

}

/* ============================================================
   class Storage — the only code that talks to localStorage
   ============================================================
   Every method is `static`, so they are called as Storage.saveCart(...) with no
   `new Storage()` anywhere. That fits because there is nothing to remember between
   calls — localStorage itself holds the state, and the class is just a named home
   for the functions that reach it.

   localStorage only stores strings, which is why JSON.stringify goes in and
   JSON.parse comes back out on every read.
   ============================================================ */
class Storage {

    /* Saving the fetched products means a lookup by id later costs a read from
       localStorage instead of a second network request. */
    static saveProducts(products) {
        localStorage.setItem('products', JSON.stringify(products))
    }

    /* The click handler only knows an id, taken from the button's data-id. This turns
       that id back into the full record. .find() returns the first match, or undefined
       if nothing matches.

       Note the strict === comparison: ids were saved as strings and dataset values are
       always strings, so both sides are already the same type. */
    static getProduct(id) {
        const products = JSON.parse(localStorage.getItem('products'))
        return products.find((item) => item.id === id)
    }

    /* Called on every cart change. Writing the whole array each time is simpler than
       tracking individual edits, and at this size the cost is nothing. */
    static saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart))
    }

    /* getItem returns null when the key has never been set — a first-time visitor.
       The ternary turns that null into an empty array so callers always receive
       something they can safely .forEach over, with no null check on their side.

       The .filter() below is a safety net for a saved cart from an older version of
       the app, or one edited by hand in DevTools, where a line might be missing its
       price or amount. Without it, one bad line loaded here would make the total show
       NaN from the moment the page loads — and it would stay that way, since NaN
       cannot be fixed by adding more valid numbers to it. Filtering here means a
       damaged cart heals itself on the next load instead of failing permanently. */
    static getCart() {
        const cart = localStorage.getItem('cart')
            ? JSON.parse(localStorage.getItem('cart'))
            : []

        return cart.filter(
            (item) => item && !isNaN(Number(item.price)) && !isNaN(Number(item.amount))
        )
    }

}

/* ============================================================
   Start-up
   ============================================================
   DOMContentLoaded fires once the HTML is parsed. Waiting for it means the code
   below never runs against an unfinished document, even if the <script> tag is
   later moved out of the bottom of <body>.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    const view    = new View()
    const product = new Product()

    view.initApp()   // restore saved cart before anything renders

    /* The chain matters. The second .then() runs only after the first has finished,
       and getCartButtons can only find .bag-btn elements that displayProducts has
       already written into the page. Chaining is what enforces that order. */
    product
        .getProducts()
        .then((data) => {
            view.displayProducts(data)   // paint the grid
            Storage.saveProducts(data)   // keep a copy for id lookups later
        })
        .then(() => {
            view.getCartButtons()
            view.cartProcess()
        })
})