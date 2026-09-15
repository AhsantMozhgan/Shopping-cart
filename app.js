/* Remove cart products (clear cart)
   the "Delete Products" button empties the cart. */

const productsDOM = document.querySelector('.products-center')
const cartItems = document.querySelector('.cart-items')
const cartTotal = document.querySelector('.cart-total')
const cartContent = document.querySelector('.cart-content')
const cartDOM = document.querySelector('.cart')
const cartOverlay = document.querySelector('.cart-overlay')
const cartBtn = document.querySelector('.cart-btn')
const closeCartBtn = document.querySelector('.close-cart')
const clearCartBtn = document.querySelector('.clear-cart')

let cart = []

class Product {
    async getProducts() {
        try {
            const result = await fetch('products.json')
            const data = await result.json()
            let products = data.items
            products = products.map((item) => {
                const { title, price } = item.fields
                const { id } = item.sys
                const image = item.fields.image.fields.file.url
                return { title, price, id, image }
            })
            return products
        } catch (err) {
            console.log(err)
        }
    }
}

class View {
    displayProducts(products) {
        let result = ''
        products.forEach((item) => {
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
                <h4>${item.price}</h4>
            </article>
            `
        })
        productsDOM.innerHTML = result
    }

    getCartButtons() {
        const buttons = [...document.querySelectorAll('.bag-btn')]
        buttons.forEach((item) => {
            let id = item.dataset.id

            item.addEventListener('click', (event) => {
                let cartItem = { ...Storage.getProduct(id), amount: 1 }
                cart = [...cart, cartItem]
                Storage.saveCart(cart)

                this.setCartValues(cart)
                this.addCartItem(cartItem)
                this.showCart()
            })
        })
    }

    setCartValues(cart) {
        let totalPrice = 0
        let totalItems = 0

        cart.map((item) => {
            totalPrice = totalPrice + item.price * item.amount
            totalItems = totalItems + item.amount
        })
        cartTotal.innerText = totalPrice
        cartItems.innerText = totalItems
    }

    addCartItem(item) {
        const div = document.createElement('div')
        div.classList.add('cart-item')

        // FIX: the original had literal `// ` text sitting inside the
        // template string right before/after the wrapper tags —
        // someone tried to "comment out" a duplicate <div>/</div>
        // pair, but `//` isn't a comment inside an HTML string, so it
        // rendered as visible " // " text in every cart row, AND the
        // nesting was still mismatched underneath it (same bug as
        // steps 109-112). Both problems are fixed by writing clean,
        // correctly nested markup with no leftover comment characters.
        div.innerHTML = `
            <img src="${item.image}" alt="${item.title}">
            <div>
                <h4>${item.title}</h4>
                <h5>${item.price}</h5>
                <span class="remove-item">Delete</span>
            </div>
            <div class="cart-item-amount">
                <i class="fas fa-chevron-up"></i>
                <p class="item-amount">${item.amount}</p>
                <i class="fas fa-chevron-down"></i>
            </div>
        `

        cartContent.appendChild(div)
    }

    showCart() {
        cartOverlay.classList.add('transparentBcg')
        cartDOM.classList.add('showCart')
    }

    hideCart() {
        cartOverlay.classList.remove('transparentBcg')
        cartDOM.classList.remove('showCart')
    }

    initApp() {
        cart = Storage.getCart()
        this.setCartValues(cart)
        this.populate(cart)

        cartBtn.addEventListener('click', () => this.showCart())
        closeCartBtn.addEventListener('click', () => this.hideCart())
    }

    populate(cart) {
        cart.forEach((item) => {
            return this.addCartItem(item)
        })
    }

    cartProcess() {
        clearCartBtn.addEventListener('click', () => {
            this.clearCart()
        })
    }

    clearCart() {
        // THE CRASH BUG in this step:
        //   let cartItem = cart.map((item) => { return item.id })
        //   cartItems.forEach((item) => { return this.removeProduct(item) })
        // Two things wrong: (1) the array of ids was named `cartItem`
        // (singular) but the loop below it iterated over `cartItems`
        // (plural) — the constant declared at the very top of this
        // file that points at the small navbar badge <div>. (2) that
        // badge is a single DOM element, not an array, so it has no
        // .forEach method at all — calling it would throw
        // "cartItems.forEach is not a function" and clearCart() would
        // crash immediately, before ever reaching the code that empties
        // the visible cart panel.
        //
        // FIX: rename the local array so it can't collide with the
        // cached `cartItems` DOM node, and loop over that instead.
        let productIds = cart.map((item) => item.id)

        productIds.forEach((id) => {
            this.removeProduct(id)
        })

        while (cartContent.children.length > 0) {
            cartContent.removeChild(cartContent.children[0])
        }
    }

    removeProduct(id) {
        cart = cart.filter((item) => item.id !== id)

        this.setCartValues(cart)
        Storage.saveCart(cart)
    }
}

class Storage {
    static saveProducts(products) {
        localStorage.setItem('products', JSON.stringify(products))
    }

    static getProduct(id) {
        let products = JSON.parse(localStorage.getItem('products'))
        return products.find((item) => item.id === id)
    }

    static saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart))
    }

    static getCart() {
        return localStorage.getItem('cart')
            ? JSON.parse(localStorage.getItem('cart'))
            : []
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const view = new View()
    const product = new Product()

    view.initApp()

    product
        .getProducts()
        .then((data) => {
            view.displayProducts(data)
            Storage.saveProducts(data)
        }).then(() => {
            view.getCartButtons()
            view.cartProcess()
        })
})