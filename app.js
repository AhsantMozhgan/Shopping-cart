/* Save cart data
   every cart item now also gets an `amount` field,
   and Storage.saveCart() persists the whole cart array to
   localStorage after every change. */

const productsDOM = document.querySelector('.products-center')

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
            })
        })
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