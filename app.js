/* Set cart values
   View.setCartValues() sums up the cart's total
   price and total item count, and writes them into the navbar badge
   and (eventually) the cart footer. */

const productsDOM = document.querySelector('.products-center')
const cartItems = document.querySelector('.cart-items')
const cartTotal = document.querySelector('.cart-total')

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
            })
        })
    }

    setCartValues(cart) {
        let totalPrice = 0
        let totalItems = 0

        cart.map((item) => {
            // Products now come out of products.json as real numbers
            // (see products.json), so this math is no longer relying
            // on implicit string coercion the way "$89" * 1 used to.
            totalPrice = totalPrice + item.price * item.amount
            totalItems = totalItems + item.amount
        })
        cartTotal.innerText = totalPrice
        cartItems.innerText = totalItems
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
}

document.addEventListener('DOMContentLoaded', () => {
    const view = new View()
    const product = new Product()

    product
        .getProducts()
        .then((data) => {
            view.displayProducts(data)
            Storage.saveProducts(data)
        }).then(() => {
            view.getCartButtons()
        })
})