/* Add products to cart
   clicking a bag button now actually pushes an
   item onto `cart`, using Storage.getProduct(id) to look up the full
   product record. */

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
            // FIX: attributes quoted — see step 103.
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
                let cartItem = Storage.getProduct(id)
                cart = [...cart, cartItem]
                console.log(cart)
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
}

document.addEventListener('DOMContentLoaded', () => {
    const view = new View()
    const product = new Product()

    product.getProducts().then((data) => {
        view.displayProducts(data)
        Storage.saveProducts(data)
    }).then(() => {
        // Must run AFTER displayProducts() has put the buttons in the
        // DOM, otherwise querySelectorAll('.bag-btn') finds nothing.
        view.getCartButtons()
    })
})