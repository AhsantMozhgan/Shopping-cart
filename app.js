/* Add to cart button
   View.getCartButtons() attaches a click listener
   to every "Add to the Shopping Cart" button. For now the handler
   just logs the click event(actually adding the item to the cart) */

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
        } catch (error) {
            console.log(error)
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
                console.log(event)
            })
        })
    }
}

class Storage {
    static saveProducts(products) {
        localStorage.setItem('products', JSON.stringify(products))
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