/* Getting products
   Goal of this step: prove we can fetch products.json and reshape
   the (intentionally messy, Contentful-CMS-style) data into
   something simple: { title, price, id, image }. */

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

class View {}

class Storage {}

document.addEventListener('DOMContentLoaded', () => {
    const view = new View()
    const product = new Product()

    // For this step we just prove the data comes back correctly shaped.
    product.getProducts().then((data) => console.log(data))
})