import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'
import { 
  addToCart, 
  getCartItems, 
  updateCartItemQuantity, 
  removeCartItem, 
  clearCart,
  calculateCartSummary,
  getSessionId,
  setSessionCookie
} from './cart'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Database utility functions
const getCategories = async (db: D1Database) => {
  try {
    const result = await db.prepare(`
      SELECT * FROM categories 
      WHERE is_active = 1 
      ORDER BY display_order ASC
    `).all()
    return result.results || []
  } catch (error) {
    console.error('Database error in getCategories:', error)
    return []
  }
}

const getProducts = async (db: D1Database, categoryId?: number, featured?: boolean, limit: number = 20) => {
  try {
    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug,
             pi.image_url, pi.alt_text
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.is_active = 1
    `
    
    const params: any[] = []
    
    if (categoryId) {
      query += ` AND p.category_id = ?`
      params.push(categoryId)
    }
    
    if (featured) {
      query += ` AND p.is_featured = 1`
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT ?`
    params.push(limit)
    
    const result = await db.prepare(query).bind(...params).all()
    return result.results || []
  } catch (error) {
    console.error('Database error in getProducts:', error)
    return []
  }
}

const getProductBySlug = async (db: D1Database, slug: string) => {
  try {
    const result = await db.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = 1
    `).bind(slug).first()
    
    if (!result) return null
    
    // Get product images
    const images = await db.prepare(`
      SELECT * FROM product_images 
      WHERE product_id = ? 
      ORDER BY display_order ASC
    `).bind(result.id).all()
    
    // Get product variants
    const variants = await db.prepare(`
      SELECT * FROM product_variants 
      WHERE product_id = ? AND is_active = 1
      ORDER BY price ASC
    `).bind(result.id).all()
    
    return {
      ...result,
      images: images.results || [],
      variants: variants.results || []
    }
  } catch (error) {
    console.error('Database error in getProductBySlug:', error)
    return null
  }
}

// Cart API Routes
app.post('/api/cart/add', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const { product_variant_id, quantity = 1 } = await c.req.json()
    const sessionId = getSessionId(c.req.raw)
    
    const result = await addToCart(c.env.DB, sessionId, product_variant_id, quantity)
    
    const response = c.json(result)
    
    // Set session cookie if successful
    if (result.success) {
      response.headers.set('Set-Cookie', setSessionCookie(sessionId))
    }
    
    return response
  } catch (error) {
    console.error('Cart add API error:', error)
    return c.json({ success: false, error: 'Failed to add item to cart' }, 500)
  }
})

app.get('/api/cart', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const sessionId = getSessionId(c.req.raw)
    const summary = await calculateCartSummary(c.env.DB, sessionId)
    
    return c.json({ success: true, data: summary })
  } catch (error) {
    console.error('Cart get API error:', error)
    return c.json({ success: false, error: 'Failed to fetch cart' }, 500)
  }
})

app.put('/api/cart/item/:id', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const cartItemId = parseInt(c.req.param('id'))
    const { quantity } = await c.req.json()
    const sessionId = getSessionId(c.req.raw)
    
    const result = await updateCartItemQuantity(c.env.DB, cartItemId, quantity, sessionId)
    return c.json(result)
  } catch (error) {
    console.error('Cart update API error:', error)
    return c.json({ success: false, error: 'Failed to update cart item' }, 500)
  }
})

app.delete('/api/cart/item/:id', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const cartItemId = parseInt(c.req.param('id'))
    const sessionId = getSessionId(c.req.raw)
    
    const result = await removeCartItem(c.env.DB, cartItemId, sessionId)
    return c.json(result)
  } catch (error) {
    console.error('Cart remove API error:', error)
    return c.json({ success: false, error: 'Failed to remove cart item' }, 500)
  }
})

app.delete('/api/cart', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const sessionId = getSessionId(c.req.raw)
    const result = await clearCart(c.env.DB, sessionId)
    
    return c.json(result)
  } catch (error) {
    console.error('Cart clear API error:', error)
    return c.json({ success: false, error: 'Failed to clear cart' }, 500)
  }
})

// Existing API routes
app.get('/api/test', async (c) => {
  return c.json({ success: true, message: 'API is working!' })
})

app.get('/api/categories', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const categories = await getCategories(c.env.DB)
    return c.json({ success: true, data: categories })
  } catch (error) {
    console.error('API error in /api/categories:', error)
    return c.json({ success: false, error: 'Failed to fetch categories' }, 500)
  }
})

app.get('/api/products', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const categoryId = c.req.query('category')
    const featured = c.req.query('featured')
    const limit = parseInt(c.req.query('limit') || '20')
    
    const products = await getProducts(
      c.env.DB, 
      categoryId ? parseInt(categoryId) : undefined,
      featured === 'true',
      limit
    )
    
    return c.json({ success: true, data: products })
  } catch (error) {
    console.error('API error in /api/products:', error)
    return c.json({ success: false, error: 'Failed to fetch products' }, 500)
  }
})

app.get('/api/products/:slug', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const slug = c.req.param('slug')
    const product = await getProductBySlug(c.env.DB, slug)
    
    if (!product) {
      return c.json({ success: false, error: 'Product not found' }, 404)
    }
    
    return c.json({ success: true, data: product })
  } catch (error) {
    console.error('API error in /api/products/:slug:', error)
    return c.json({ success: false, error: 'Failed to fetch product' }, 500)
  }
})

app.post('/api/newsletter/subscribe', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const { email, firstName, lastName } = await c.req.json()
    
    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400)
    }
    
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO newsletter_subscribers (email, first_name, last_name, status, source)
      VALUES (?, ?, ?, 'subscribed', 'website')
    `).bind(email, firstName || '', lastName || '').run()
    
    return c.json({ 
      success: true, 
      message: 'Successfully subscribed to newsletter!' 
    })
  } catch (error) {
    console.error('API error in newsletter subscribe:', error)
    return c.json({ success: false, error: 'Failed to subscribe' }, 500)
  }
})

// Individual product page
app.get('/product/:slug', async (c) => {
  try {
    if (!c.env.DB) {
      return c.html(`
        <html><body><h1>Database Error</h1><p>Database not available</p></body></html>
      `, 500)
    }
    
    const slug = c.req.param('slug')
    const product = await getProductBySlug(c.env.DB, slug)
    
    if (!product) {
      return c.redirect('/products')
    }
    
    const sessionId = getSessionId(c.req.raw)
    const cartSummary = await calculateCartSummary(c.env.DB, sessionId)
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${product.name} | Orua Organics</title>
          <meta name="description" content="${product.seo_description || product.short_description}">
          
          <!-- Tailwind CSS -->
          <script src="https://cdn.tailwindcss.com"></script>
          
          <!-- Font Awesome -->
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
          
          <!-- Custom CSS -->
          <link href="/static/style.css" rel="stylesheet">
          
          <!-- Tailwind Config -->
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    'orua-green': '#2F8F3A',
                    'orua-gold': '#D98A00',
                    'orua-cream': '#FBFBF8',
                    'orua-dark': '#222222',
                    'orua-forest': '#1F5A2E'
                  }
                }
              }
            }
          </script>
          
          <!-- Google Fonts -->
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      </head>
      <body class="bg-orua-cream text-orua-dark font-body">
          
          <!-- Header -->
          <header class="bg-white shadow-sm sticky top-0 z-50">
              <div class="container mx-auto px-4 py-4">
                  <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-4">
                          <img src="https://oruaorganics.com/images/logo.jpg" alt="Orua Organics" class="h-12 w-auto">
                          <div class="hidden md:block">
                              <h1 class="text-xl font-heading font-bold text-orua-dark">Orua Organics</h1>
                              <p class="text-sm text-gray-600">Africa's Natural Wellness</p>
                          </div>
                      </div>
                      
                      <nav class="hidden md:flex items-center space-x-8">
                          <a href="/" class="text-orua-dark hover:text-orua-green transition-colors">Home</a>
                          <a href="/products" class="text-orua-dark hover:text-orua-green transition-colors">Products</a>
                          <a href="/categories/teas" class="text-orua-dark hover:text-orua-green transition-colors">Teas</a>
                          <a href="/categories/powders" class="text-orua-dark hover:text-orua-green transition-colors">Powders</a>
                          <a href="/categories/oils" class="text-orua-dark hover:text-orua-green transition-colors">Oils</a>
                          <a href="/about" class="text-orua-dark hover:text-orua-green transition-colors">About</a>
                      </nav>
                      
                      <div class="flex items-center space-x-4">
                          <button class="text-orua-dark hover:text-orua-green transition-colors">
                              <i class="fas fa-search text-lg"></i>
                          </button>
                          <button id="cart-toggle" class="text-orua-dark hover:text-orua-green transition-colors relative">
                              <i class="fas fa-shopping-cart text-lg"></i>
                              <span id="cart-count" class="absolute -top-2 -right-2 bg-orua-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ${cartSummary.itemCount > 0 ? '' : 'hidden'}">${cartSummary.itemCount}</span>
                          </button>
                          <button class="md:hidden text-orua-dark hover:text-orua-green transition-colors">
                              <i class="fas fa-bars text-lg"></i>
                          </button>
                      </div>
                  </div>
              </div>
          </header>

          <!-- Breadcrumbs -->
          <nav class="bg-gray-50 py-3">
              <div class="container mx-auto px-4">
                  <ol class="flex items-center space-x-2 text-sm">
                      <li><a href="/" class="text-gray-600 hover:text-orua-green">Home</a></li>
                      <li><span class="text-gray-400">/</span></li>
                      <li><a href="/products" class="text-gray-600 hover:text-orua-green">Products</a></li>
                      <li><span class="text-gray-400">/</span></li>
                      <li><a href="/categories/${product.category_slug}" class="text-gray-600 hover:text-orua-green">${product.category_name}</a></li>
                      <li><span class="text-gray-400">/</span></li>
                      <li class="text-orua-dark font-medium">${product.name}</li>
                  </ol>
              </div>
          </nav>

          <!-- Product Details -->
          <main class="py-12">
              <div class="container mx-auto px-4">
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      
                      <!-- Product Images -->
                      <div class="space-y-4">
                          <div class="aspect-square bg-white rounded-xl overflow-hidden shadow-lg">
                              <img id="main-image" 
                                   src="${product.images[0]?.image_url || 'https://via.placeholder.com/600x600?text=' + encodeURIComponent(product.name)}" 
                                   alt="${product.images[0]?.alt_text || product.name}"
                                   class="w-full h-full object-cover">
                          </div>
                          
                          ${product.images.length > 1 ? `
                              <div class="flex space-x-2 overflow-x-auto">
                                  ${product.images.map((image, index) => `
                                      <button class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${index === 0 ? 'border-orua-green' : 'border-gray-200'} hover:border-orua-green transition-colors"
                                              onclick="changeMainImage('${image.image_url}', ${index})">
                                          <img src="${image.image_url}" 
                                               alt="${image.alt_text || product.name}"
                                               class="w-full h-full object-cover">
                                      </button>
                                  `).join('')}
                              </div>
                          ` : ''}
                      </div>
                      
                      <!-- Product Info -->
                      <div class="space-y-6">
                          <div>
                              <h1 class="text-3xl lg:text-4xl font-heading font-bold text-orua-dark mb-4">${product.name}</h1>
                              <p class="text-lg text-gray-600 leading-relaxed">${product.description || product.short_description}</p>
                          </div>
                          
                          <!-- Price and Stock -->
                          <div class="flex items-center space-x-4">
                              <span id="current-price" class="text-3xl font-bold text-orua-green">$${product.price}</span>
                              ${product.compare_at_price ? `<span class="text-xl text-gray-400 line-through">$${product.compare_at_price}</span>` : ''}
                              <span class="bg-orua-green text-white text-sm px-3 py-1 rounded-full">Organic</span>
                          </div>
                          
                          <form id="add-to-cart-form" class="space-y-6">
                              ${product.variants.length > 1 ? `
                                  <div>
                                      <label class="block text-sm font-medium text-orua-dark mb-3">Size/Type:</label>
                                      <select id="variant-selector" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orua-green focus:border-orua-green">
                                          ${product.variants.map(variant => `
                                              <option value="${variant.id}" data-price="${variant.price}" data-stock="${variant.stock_quantity}">
                                                  ${variant.name} - $${variant.price}
                                                  ${variant.stock_quantity <= 0 ? ' (Out of Stock)' : variant.stock_quantity <= 5 ? ` (Only ${variant.stock_quantity} left)` : ''}
                                              </option>
                                          `).join('')}
                                      </select>
                                  </div>
                              ` : `
                                  <input type="hidden" id="variant-selector" value="${product.variants[0]?.id}" data-price="${product.variants[0]?.price}" data-stock="${product.variants[0]?.stock_quantity}">
                              `}
                              
                              <div>
                                  <label class="block text-sm font-medium text-orua-dark mb-3">Quantity:</label>
                                  <div class="flex items-center">
                                      <div class="quantity-selector flex items-center border border-gray-300 rounded-lg">
                                          <button type="button" class="quantity-decrease px-4 py-2 hover:bg-gray-50 border-r border-gray-300">
                                              <i class="fas fa-minus text-sm"></i>
                                          </button>
                                          <input type="number" id="quantity-input" class="quantity-input w-20 text-center py-2 border-0 focus:ring-0" 
                                                 value="1" min="1" max="10">
                                          <button type="button" class="quantity-increase px-4 py-2 hover:bg-gray-50 border-l border-gray-300">
                                              <i class="fas fa-plus text-sm"></i>
                                          </button>
                                      </div>
                                      <div class="ml-4">
                                          <span id="stock-indicator" class="text-sm text-gray-600"></span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div class="flex space-x-4">
                                  <button type="submit" id="add-to-cart-btn" 
                                          class="flex-1 bg-orua-green text-white py-3 px-6 rounded-lg font-semibold hover:bg-orua-forest transition-colors focus:ring-2 focus:ring-orua-green focus:ring-offset-2 flex items-center justify-center space-x-2">
                                      <i class="fas fa-shopping-cart"></i>
                                      <span>Add to Cart</span>
                                  </button>
                                  <button type="button" class="bg-orua-gold text-white py-3 px-6 rounded-lg font-semibold hover:bg-yellow-600 transition-colors flex items-center justify-center">
                                      <i class="fas fa-heart"></i>
                                  </button>
                              </div>
                          </form>
                          
                          <!-- Product Features -->
                          <div class="grid grid-cols-2 gap-4 py-6 border-t border-gray-200">
                              <div class="flex items-center space-x-2">
                                  <i class="fas fa-leaf text-orua-green"></i>
                                  <span class="text-sm text-gray-600">100% Organic</span>
                              </div>
                              <div class="flex items-center space-x-2">
                                  <i class="fas fa-globe-africa text-orua-green"></i>
                                  <span class="text-sm text-gray-600">From ${product.origin_country}</span>
                              </div>
                              <div class="flex items-center space-x-2">
                                  <i class="fas fa-shipping-fast text-orua-green"></i>
                                  <span class="text-sm text-gray-600">Free shipping over $50</span>
                              </div>
                              <div class="flex items-center space-x-2">
                                  <i class="fas fa-award text-orua-green"></i>
                                  <span class="text-sm text-gray-600">Premium Quality</span>
                              </div>
                          </div>
                          
                          <!-- Additional Info -->
                          <div class="space-y-4">
                              <details class="border border-gray-200 rounded-lg">
                                  <summary class="p-4 font-medium cursor-pointer hover:bg-gray-50">
                                      <i class="fas fa-info-circle mr-2 text-orua-green"></i>
                                      Product Details
                                  </summary>
                                  <div class="p-4 border-t border-gray-200 text-sm text-gray-600">
                                      <p><strong>SKU:</strong> ${product.sku}</p>
                                      <p><strong>Brand:</strong> ${product.brand}</p>
                                      <p><strong>Origin:</strong> ${product.origin_country}</p>
                                      <p><strong>Category:</strong> ${product.category_name}</p>
                                  </div>
                              </details>
                              
                              <details class="border border-gray-200 rounded-lg">
                                  <summary class="p-4 font-medium cursor-pointer hover:bg-gray-50">
                                      <i class="fas fa-truck mr-2 text-orua-green"></i>
                                      Shipping & Returns
                                  </summary>
                                  <div class="p-4 border-t border-gray-200 text-sm text-gray-600">
                                      <p>• Free shipping on orders over $50</p>
                                      <p>• Standard delivery: 3-7 business days</p>
                                      <p>• Express delivery: 1-3 business days</p>
                                      <p>• 30-day return policy</p>
                                  </div>
                              </details>
                          </div>
                      </div>
                  </div>
              </div>
          </main>

          <!-- Shopping Cart Sidebar -->
          <div id="cart-sidebar" class="fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform translate-x-full transition-transform duration-300 z-50">
              <div class="flex flex-col h-full">
                  <div class="flex items-center justify-between p-6 border-b border-gray-200">
                      <h2 class="text-lg font-semibold text-orua-dark">Shopping Cart</h2>
                      <button id="close-cart" class="text-gray-400 hover:text-gray-600">
                          <i class="fas fa-times text-xl"></i>
                      </button>
                  </div>
                  
                  <div id="cart-content" class="flex-1 overflow-y-auto">
                      <!-- Cart items will be loaded here -->
                  </div>
              </div>
          </div>

          <!-- Cart Overlay -->
          <div id="cart-overlay" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40"></div>

          <!-- JavaScript -->
          <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
          <script>
            // Product data
            const productData = ${JSON.stringify(product)};
            
            // Initialize page
            document.addEventListener('DOMContentLoaded', function() {
                setupProductPage();
                setupCart();
                updateVariantInfo();
            });
          </script>
          <script src="/static/app.js"></script>
          <script src="/static/product.js"></script>
      </body>
      </html>
    `
    
    const response = c.html(html)
    response.headers.set('Set-Cookie', setSessionCookie(sessionId))
    return response
  } catch (error) {
    console.error('Product page error:', error)
    return c.html(`
      <html>
        <head><title>Error | Orua Organics</title></head>
        <body>
          <h1>Error Loading Product</h1>
          <p>Product not found. <a href="/products">Browse all products</a></p>
        </body>
      </html>
    `, 404)
  }
})

// Cart page
app.get('/cart', async (c) => {
  try {
    if (!c.env.DB) {
      return c.html(`<html><body><h1>Database Error</h1></body></html>`, 500)
    }
    
    const sessionId = getSessionId(c.req.raw)
    const cartSummary = await calculateCartSummary(c.env.DB, sessionId)
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Shopping Cart | Orua Organics</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
          <link href="/static/style.css" rel="stylesheet">
      </head>
      <body class="bg-gray-50">
          <div class="container mx-auto px-4 py-8">
              <h1 class="text-3xl font-bold mb-8">Shopping Cart</h1>
              
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div class="lg:col-span-2">
                      <div id="cart-items" class="space-y-4">
                          ${cartSummary.items.length === 0 ? `
                              <div class="text-center py-12">
                                  <i class="fas fa-shopping-cart text-6xl text-gray-300 mb-4"></i>
                                  <h2 class="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h2>
                                  <p class="text-gray-500 mb-6">Add some products to get started</p>
                                  <a href="/products" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
                                      Browse Products
                                  </a>
                              </div>
                          ` : cartSummary.items.map(item => `
                              <div class="bg-white rounded-lg shadow-md p-6 flex items-center space-x-4">
                                  <img src="${item.product.image_url || 'https://via.placeholder.com/100x100'}" 
                                       alt="${item.product.name}" 
                                       class="w-20 h-20 object-cover rounded-lg">
                                  <div class="flex-1">
                                      <h3 class="font-semibold text-lg">${item.product.name}</h3>
                                      <p class="text-gray-600">${item.variant.name}</p>
                                      <p class="text-green-600 font-bold">$${item.variant.price}</p>
                                  </div>
                                  <div class="flex items-center space-x-2">
                                      <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})" class="text-gray-400 hover:text-gray-600">
                                          <i class="fas fa-minus"></i>
                                      </button>
                                      <span class="px-3 py-1 border border-gray-300 rounded">${item.quantity}</span>
                                      <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})" class="text-gray-400 hover:text-gray-600">
                                          <i class="fas fa-plus"></i>
                                      </button>
                                  </div>
                                  <button onclick="removeItem(${item.id})" class="text-red-500 hover:text-red-700">
                                      <i class="fas fa-trash"></i>
                                  </button>
                              </div>
                          `).join('')}
                      </div>
                  </div>
                  
                  <div class="bg-white rounded-lg shadow-md p-6 h-fit">
                      <h2 class="text-xl font-semibold mb-4">Order Summary</h2>
                      <div class="space-y-3">
                          <div class="flex justify-between">
                              <span>Subtotal:</span>
                              <span>$${cartSummary.subtotal}</span>
                          </div>
                          <div class="flex justify-between">
                              <span>Tax:</span>
                              <span>$${cartSummary.tax}</span>
                          </div>
                          <div class="flex justify-between">
                              <span>Shipping:</span>
                              <span>${cartSummary.shipping === 0 ? 'Free' : '$' + cartSummary.shipping}</span>
                          </div>
                          <hr class="border-gray-200">
                          <div class="flex justify-between text-xl font-bold">
                              <span>Total:</span>
                              <span class="text-green-600">$${cartSummary.total}</span>
                          </div>
                      </div>
                      
                      ${cartSummary.items.length > 0 ? `
                          <button class="w-full mt-6 bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700">
                              Proceed to Checkout
                          </button>
                      ` : ''}
                  </div>
              </div>
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
          <script src="/static/cart.js"></script>
      </body>
      </html>
    `
    
    const response = c.html(html)
    response.headers.set('Set-Cookie', setSessionCookie(sessionId))
    return response
  } catch (error) {
    console.error('Cart page error:', error)
    return c.html(`<html><body><h1>Error loading cart</h1></body></html>`, 500)
  }
})

// Homepage route (existing enhanced)
app.get('/', async (c) => {
  try {
    let categories = []
    let featuredProducts = []
    let cartItemCount = 0
    
    if (c.env.DB) {
      try {
        categories = await getCategories(c.env.DB)
        featuredProducts = await getProducts(c.env.DB, undefined, true, 6)
        
        const sessionId = getSessionId(c.req.raw)
        const cartSummary = await calculateCartSummary(c.env.DB, sessionId)
        cartItemCount = cartSummary.itemCount
      } catch (dbError) {
        console.error('Database error:', dbError)
      }
    }
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Orua Organics | Africa's Natural Wellness</title>
          <meta name="description" content="Premium organic wellness products from Liberia. Discover natural teas, powders, oils, and balms sourced directly from African farms.">
          
          <!-- Tailwind CSS -->
          <script src="https://cdn.tailwindcss.com"></script>
          
          <!-- Font Awesome -->
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
          
          <!-- Custom CSS -->
          <link href="/static/style.css" rel="stylesheet">
          
          <!-- Tailwind Config -->
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    'orua-green': '#2F8F3A',
                    'orua-gold': '#D98A00',
                    'orua-cream': '#FBFBF8',
                    'orua-dark': '#222222',
                    'orua-forest': '#1F5A2E'
                  },
                  fontFamily: {
                    'heading': ['Montserrat', 'sans-serif'],
                    'body': ['Open Sans', 'sans-serif']
                  }
                }
              }
            }
          </script>
          
          <!-- Google Fonts -->
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      </head>
      <body class="bg-orua-cream text-orua-dark font-body">
          
          <!-- Header -->
          <header class="bg-white shadow-sm sticky top-0 z-50">
              <div class="container mx-auto px-4 py-4">
                  <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-4">
                          <img src="https://oruaorganics.com/images/logo.jpg" alt="Orua Organics" class="h-12 w-auto">
                          <div class="hidden md:block">
                              <h1 class="text-xl font-heading font-bold text-orua-dark">Orua Organics</h1>
                              <p class="text-sm text-gray-600">Africa's Natural Wellness</p>
                          </div>
                      </div>
                      
                      <nav class="hidden md:flex items-center space-x-8">
                          <a href="/" class="text-orua-dark hover:text-orua-green transition-colors">Home</a>
                          <a href="/products" class="text-orua-dark hover:text-orua-green transition-colors">Products</a>
                          <a href="/categories/teas" class="text-orua-dark hover:text-orua-green transition-colors">Teas</a>
                          <a href="/categories/powders" class="text-orua-dark hover:text-orua-green transition-colors">Powders</a>
                          <a href="/categories/oils" class="text-orua-dark hover:text-orua-green transition-colors">Oils</a>
                          <a href="/about" class="text-orua-dark hover:text-orua-green transition-colors">About</a>
                      </nav>
                      
                      <div class="flex items-center space-x-4">
                          <button class="text-orua-dark hover:text-orua-green transition-colors">
                              <i class="fas fa-search text-lg"></i>
                          </button>
                          <button id="cart-toggle" class="text-orua-dark hover:text-orua-green transition-colors relative">
                              <i class="fas fa-shopping-cart text-lg"></i>
                              <span id="cart-count" class="absolute -top-2 -right-2 bg-orua-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ${cartItemCount > 0 ? '' : 'hidden'}">${cartItemCount}</span>
                          </button>
                          <button class="md:hidden text-orua-dark hover:text-orua-green transition-colors">
                              <i class="fas fa-bars text-lg"></i>
                          </button>
                      </div>
                  </div>
              </div>
          </header>

          <!-- Hero Section -->
          <section class="py-20 bg-gradient-to-br from-orua-cream to-white">
              <div class="container mx-auto px-4 text-center">
                  <div class="max-w-4xl mx-auto">
                      <h1 class="text-5xl md:text-6xl font-heading font-bold mb-6 text-orua-dark leading-tight">
                          Africa's Natural Wellness.
                      </h1>
                      <p class="text-xl md:text-2xl mb-8 text-gray-700 font-medium">
                          Coming Soon to Your Home.
                      </p>
                      <div class="bg-orua-green text-white px-8 py-3 rounded-full inline-block mb-8 text-lg font-semibold">
                          DECEMBER 2025
                      </div>
                      <p class="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                          Premium organic wellness products sourced directly from Liberian farms. 
                          Experience the power of traditional African botanicals.
                      </p>
                  </div>
              </div>
          </section>

          <!-- Our Heartbeat Section -->
          <section class="py-16 bg-white">
              <div class="container mx-auto px-4 text-center">
                  <h2 class="text-3xl font-heading font-bold mb-12 text-orua-dark">Our Heartbeat</h2>
                  <div class="flex flex-wrap justify-center gap-8">
                      <div class="bg-orua-green text-white px-6 py-3 rounded-full font-semibold">Sustainable</div>
                      <div class="bg-orua-gold text-white px-6 py-3 rounded-full font-semibold">Heritage</div>
                      <div class="bg-orua-forest text-white px-6 py-3 rounded-full font-semibold">Quality</div>
                      <div class="bg-orua-green text-white px-6 py-3 rounded-full font-semibold">Wellness</div>
                  </div>
              </div>
          </section>

          <!-- Featured Products Section -->
          <section class="py-20 bg-orua-cream">
              <div class="container mx-auto px-4">
                  <div class="text-center mb-16">
                      <h2 class="text-4xl font-heading font-bold mb-6 text-orua-dark">Premium Natural Products</h2>
                      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
                          Discover our collection of organic teas, superfood powders, essential oils, and healing balms.
                      </p>
                      <div class="mt-4 text-sm text-orua-green font-semibold uppercase tracking-wide">
                          Teas • Oils • Balms • Powders
                      </div>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="featured-products">
                      ${featuredProducts.map(product => `
                          <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                              <div class="aspect-square bg-gray-100 overflow-hidden">
                                  <img src="${product.image_url || 'https://via.placeholder.com/400x400?text=' + encodeURIComponent(product.name)}" 
                                       alt="${product.alt_text || product.name}"
                                       class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                              </div>
                              <div class="p-6">
                                  <h3 class="text-xl font-heading font-semibold mb-2 text-orua-dark">${product.name}</h3>
                                  <p class="text-gray-600 mb-4 line-clamp-2">${product.short_description || ''}</p>
                                  <div class="flex items-center justify-between">
                                      <div class="flex items-center space-x-2">
                                          <span class="text-xl font-bold text-orua-green">$${product.price}</span>
                                          ${product.compare_at_price ? `<span class="text-gray-400 line-through">$${product.compare_at_price}</span>` : ''}
                                      </div>
                                      <span class="bg-orua-green text-white text-xs px-2 py-1 rounded-full">Organic</span>
                                  </div>
                                  <div class="flex space-x-2 mt-4">
                                      <a href="/product/${product.slug}" 
                                         class="flex-1 bg-orua-green text-white py-2 px-4 rounded-lg hover:bg-orua-forest transition-colors duration-200 font-semibold text-center">
                                          View Details
                                      </a>
                                      <button onclick="quickAddToCart('${product.slug}')" 
                                              class="bg-orua-gold text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors">
                                          <i class="fas fa-cart-plus"></i>
                                      </button>
                                  </div>
                              </div>
                          </div>
                      `).join('')}
                      
                      ${featuredProducts.length === 0 ? `
                          <!-- Placeholder products if no data from database -->
                          <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                              <div class="aspect-square bg-gray-100 overflow-hidden">
                                  <img src="https://oruaorganics.com/images/moringa_tea.png" 
                                       alt="Moringa Tea"
                                       class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                              </div>
                              <div class="p-6">
                                  <h3 class="text-xl font-heading font-semibold mb-2 text-orua-dark">Moringa Tea</h3>
                                  <p class="text-gray-600 mb-4 line-clamp-2">Organic Moringa tea for natural energy and wellness</p>
                                  <div class="flex items-center justify-between">
                                      <div class="flex items-center space-x-2">
                                          <span class="text-xl font-bold text-orua-green">$24.99</span>
                                          <span class="text-gray-400 line-through">$29.99</span>
                                      </div>
                                      <span class="bg-orua-green text-white text-xs px-2 py-1 rounded-full">Organic</span>
                                  </div>
                                  <div class="flex space-x-2 mt-4">
                                      <a href="/product/moringa-tea" 
                                         class="flex-1 bg-orua-green text-white py-2 px-4 rounded-lg hover:bg-orua-forest transition-colors duration-200 font-semibold text-center">
                                          View Details
                                      </a>
                                      <button onclick="quickAddToCart('moringa-tea')" 
                                              class="bg-orua-gold text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors">
                                          <i class="fas fa-cart-plus"></i>
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ` : ''}
                  </div>
              </div>
          </section>

          <!-- Features Section -->
          <section class="py-20 bg-white">
              <div class="container mx-auto px-4">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                      <div class="text-center">
                          <div class="w-16 h-16 bg-orua-green rounded-full flex items-center justify-center mx-auto mb-6">
                              <i class="fas fa-leaf text-white text-2xl"></i>
                          </div>
                          <h3 class="text-xl font-heading font-semibold mb-4 text-orua-dark">Sustainable Harmony</h3>
                          <p class="text-gray-600">Ethically sourced from Liberian farms with respect for nature and local communities.</p>
                      </div>
                      <div class="text-center">
                          <div class="w-16 h-16 bg-orua-gold rounded-full flex items-center justify-center mx-auto mb-6">
                              <i class="fas fa-heart text-white text-2xl"></i>
                          </div>
                          <h3 class="text-xl font-heading font-semibold mb-4 text-orua-dark">Honoring Heritage</h3>
                          <p class="text-gray-600">Preserving traditional African wellness practices for modern life.</p>
                      </div>
                      <div class="text-center">
                          <div class="w-16 h-16 bg-orua-forest rounded-full flex items-center justify-center mx-auto mb-6">
                              <i class="fas fa-award text-white text-2xl"></i>
                          </div>
                          <h3 class="text-xl font-heading font-semibold mb-4 text-orua-dark">Unwavering Quality</h3>
                          <p class="text-gray-600">Premium organic products meeting the highest standards of purity and potency.</p>
                      </div>
                  </div>
              </div>
          </section>

          <!-- Newsletter Section -->
          <section class="py-20 bg-orua-green text-white">
              <div class="container mx-auto px-4 text-center">
                  <div class="max-w-2xl mx-auto">
                      <h2 class="text-3xl font-heading font-bold mb-6">Join Our Wellness Journey</h2>
                      <p class="text-lg mb-8 opacity-90">
                          Be the first to experience Africa's finest wellness products. Get exclusive updates and early access.
                      </p>
                      
                      <form id="newsletter-form" class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                          <input type="email" 
                                 id="newsletter-email"
                                 placeholder="Enter your email address" 
                                 class="flex-1 px-4 py-3 rounded-lg text-orua-dark focus:outline-none focus:ring-2 focus:ring-orua-gold"
                                 required>
                          <button type="submit" 
                                  class="bg-orua-gold hover:bg-opacity-90 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200">
                              Subscribe
                          </button>
                      </form>
                      
                      <div id="newsletter-message" class="mt-4 hidden"></div>
                  </div>
              </div>
          </section>

          <!-- Footer -->
          <footer class="bg-orua-dark text-white py-16">
              <div class="container mx-auto px-4">
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div class="md:col-span-2">
                          <div class="flex items-center space-x-4 mb-6">
                              <img src="https://oruaorganics.com/images/logo.jpg" alt="Orua Organics" class="h-12 w-auto">
                              <div>
                                  <h3 class="text-xl font-heading font-bold">Orua Organics</h3>
                                  <p class="text-gray-400">Africa's Natural Wellness</p>
                              </div>
                          </div>
                          <p class="text-gray-400 mb-6 max-w-md">
                              Premium organic wellness products sourced directly from Liberian farms. 
                              Bringing traditional African botanicals to your modern lifestyle.
                          </p>
                          <div class="flex space-x-4">
                              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                                  <i class="fab fa-facebook-f"></i>
                              </a>
                              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                                  <i class="fab fa-instagram"></i>
                              </a>
                              <a href="#" class="text-gray-400 hover:text-white transition-colors">
                                  <i class="fab fa-twitter"></i>
                              </a>
                          </div>
                      </div>
                      
                      <div>
                          <h4 class="text-lg font-heading font-semibold mb-4">Products</h4>
                          <ul class="space-y-2">
                              <li><a href="/categories/teas" class="text-gray-400 hover:text-white transition-colors">Organic Teas</a></li>
                              <li><a href="/categories/powders" class="text-gray-400 hover:text-white transition-colors">Superfood Powders</a></li>
                              <li><a href="/categories/oils" class="text-gray-400 hover:text-white transition-colors">Essential Oils</a></li>
                              <li><a href="/categories/balms" class="text-gray-400 hover:text-white transition-colors">Healing Balms</a></li>
                          </ul>
                      </div>
                      
                      <div>
                          <h4 class="text-lg font-heading font-semibold mb-4">Company</h4>
                          <ul class="space-y-2">
                              <li><a href="/about" class="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                              <li><a href="/contact" class="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                              <li><a href="/shipping" class="text-gray-400 hover:text-white transition-colors">Shipping Info</a></li>
                              <li><a href="/returns" class="text-gray-400 hover:text-white transition-colors">Returns</a></li>
                          </ul>
                      </div>
                  </div>
                  
                  <div class="border-t border-gray-700 mt-12 pt-8 text-center">
                      <p class="text-gray-400">© 2024 Orua Organics. All rights reserved. Bringing Africa's Natural Wellness to the World.</p>
                  </div>
              </div>
          </footer>

          <!-- Shopping Cart Sidebar -->
          <div id="cart-sidebar" class="fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform translate-x-full transition-transform duration-300 z-50">
              <div class="flex flex-col h-full">
                  <div class="flex items-center justify-between p-6 border-b border-gray-200">
                      <h2 class="text-lg font-semibold text-orua-dark">Shopping Cart</h2>
                      <button id="close-cart" class="text-gray-400 hover:text-gray-600">
                          <i class="fas fa-times text-xl"></i>
                      </button>
                  </div>
                  
                  <div id="cart-content" class="flex-1 overflow-y-auto p-6">
                      <!-- Cart items will be loaded here -->
                  </div>
                  
                  <div class="border-t border-gray-200 p-6">
                      <div id="cart-summary" class="space-y-3 mb-4">
                          <!-- Cart summary will be loaded here -->
                      </div>
                      <div class="flex space-x-3">
                          <a href="/cart" class="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg text-center font-semibold hover:bg-gray-300 transition-colors">
                              View Cart
                          </a>
                          <button class="flex-1 bg-orua-green text-white py-2 px-4 rounded-lg font-semibold hover:bg-orua-forest transition-colors">
                              Checkout
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Cart Overlay -->
          <div id="cart-overlay" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40"></div>

          <!-- JavaScript -->
          <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
          <script src="/static/app.js"></script>
          <script src="/static/cart.js"></script>
      </body>
      </html>
    `
    
    return c.html(html)
  } catch (error) {
    console.error('Homepage error:', error)
    return c.html(`
      <html>
        <head>
          <title>Orua Organics | Error</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 flex items-center justify-center min-h-screen">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
            <p class="text-gray-600 mb-4">Please check the server logs for more details.</p>
            <p class="text-sm text-gray-500">Error: ${error.message}</p>
            <a href="/test" class="inline-block mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Test Basic Route
            </a>
          </div>
        </body>
      </html>
    `, 500)
  }
})

// Products page (enhanced)
app.get('/products', async (c) => {
  try {
    if (!c.env.DB) {
      return c.html(`<html><body><h1>Database Error</h1></body></html>`, 500)
    }
    
    const categorySlug = c.req.query('category')
    let categoryId
    let selectedCategory
    
    if (categorySlug) {
      selectedCategory = await c.env.DB.prepare(`
        SELECT * FROM categories WHERE slug = ? AND is_active = 1
      `).bind(categorySlug).first()
      categoryId = selectedCategory?.id
    }
    
    const categories = await getCategories(c.env.DB)
    const products = await getProducts(c.env.DB, categoryId, false, 50)
    
    const sessionId = getSessionId(c.req.raw)
    const cartSummary = await calculateCartSummary(c.env.DB, sessionId)
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${selectedCategory ? selectedCategory.name + ' | ' : ''}Products | Orua Organics</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet">
          <link href="/static/style.css" rel="stylesheet">
          
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    'orua-green': '#2F8F3A',
                    'orua-gold': '#D98A00',
                    'orua-cream': '#FBFBF8',
                    'orua-dark': '#222222',
                    'orua-forest': '#1F5A2E'
                  }
                }
              }
            }
          </script>
      </head>
      <body class="bg-orua-cream">
          
          <!-- Header -->
          <header class="bg-white shadow-sm sticky top-0 z-50">
              <div class="container mx-auto px-4 py-4">
                  <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-4">
                          <a href="/">
                              <img src="https://oruaorganics.com/images/logo.jpg" alt="Orua Organics" class="h-12 w-auto">
                          </a>
                          <div class="hidden md:block">
                              <h1 class="text-xl font-heading font-bold text-orua-dark">Orua Organics</h1>
                              <p class="text-sm text-gray-600">Africa's Natural Wellness</p>
                          </div>
                      </div>
                      
                      <nav class="hidden md:flex items-center space-x-8">
                          <a href="/" class="text-orua-dark hover:text-orua-green transition-colors">Home</a>
                          <a href="/products" class="text-orua-green font-medium">Products</a>
                          <a href="/categories/teas" class="text-orua-dark hover:text-orua-green transition-colors">Teas</a>
                          <a href="/categories/powders" class="text-orua-dark hover:text-orua-green transition-colors">Powders</a>
                          <a href="/categories/oils" class="text-orua-dark hover:text-orua-green transition-colors">Oils</a>
                          <a href="/about" class="text-orua-dark hover:text-orua-green transition-colors">About</a>
                      </nav>
                      
                      <div class="flex items-center space-x-4">
                          <button class="text-orua-dark hover:text-orua-green transition-colors">
                              <i class="fas fa-search text-lg"></i>
                          </button>
                          <button id="cart-toggle" class="text-orua-dark hover:text-orua-green transition-colors relative">
                              <i class="fas fa-shopping-cart text-lg"></i>
                              <span id="cart-count" class="absolute -top-2 -right-2 bg-orua-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ${cartSummary.itemCount > 0 ? '' : 'hidden'}">${cartSummary.itemCount}</span>
                          </button>
                      </div>
                  </div>
              </div>
          </header>
          
          <!-- Breadcrumbs -->
          <nav class="bg-gray-50 py-3">
              <div class="container mx-auto px-4">
                  <ol class="flex items-center space-x-2 text-sm">
                      <li><a href="/" class="text-gray-600 hover:text-orua-green">Home</a></li>
                      <li><span class="text-gray-400">/</span></li>
                      <li class="text-orua-dark font-medium">Products${selectedCategory ? ` / ${selectedCategory.name}` : ''}</li>
                  </ol>
              </div>
          </nav>
          
          <div class="container mx-auto px-4 py-8">
              <div class="text-center mb-12">
                  <h1 class="text-4xl font-heading font-bold mb-4 text-orua-dark">
                      ${selectedCategory ? selectedCategory.name : 'All Products'}
                  </h1>
                  <p class="text-lg text-gray-600 max-w-2xl mx-auto">
                      ${selectedCategory ? selectedCategory.description : 'Discover our complete collection of premium organic wellness products from Liberia.'}
                  </p>
              </div>
              
              <!-- Category Filter -->
              <div class="flex flex-wrap justify-center gap-4 mb-12">
                  <a href="/products" class="category-pill ${!categorySlug ? 'active' : ''}">All Products</a>
                  ${categories.map(category => `
                      <a href="/products?category=${category.slug}" 
                         class="category-pill ${categorySlug === category.slug ? 'active' : ''}">
                          ${category.name}
                      </a>
                  `).join('')}
              </div>
              
              <!-- Products Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  ${products.map(product => `
                      <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                          <div class="aspect-square bg-gray-100 overflow-hidden relative">
                              <img src="${product.image_url || 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(product.name)}" 
                                   alt="${product.name}" 
                                   class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                              ${product.is_featured ? '<div class="absolute top-3 left-3 bg-orua-gold text-white text-xs px-2 py-1 rounded-full font-semibold">Featured</div>' : ''}
                          </div>
                          <div class="p-6">
                              <div class="flex items-center justify-between mb-2">
                                  <span class="text-xs text-orua-green font-semibold uppercase tracking-wide">${product.category_name}</span>
                                  <span class="bg-orua-green text-white text-xs px-2 py-1 rounded-full">Organic</span>
                              </div>
                              <h3 class="text-lg font-heading font-semibold mb-2 text-orua-dark">${product.name}</h3>
                              <p class="text-gray-600 text-sm mb-4 line-clamp-2">${product.short_description || ''}</p>
                              <div class="flex items-center justify-between mb-4">
                                  <div class="flex items-center space-x-2">
                                      <span class="text-lg font-bold text-orua-green">$${product.price}</span>
                                      ${product.compare_at_price ? `<span class="text-sm text-gray-400 line-through">$${product.compare_at_price}</span>` : ''}
                                  </div>
                                  <div class="flex items-center text-yellow-400">
                                      <i class="fas fa-star text-xs"></i>
                                      <i class="fas fa-star text-xs"></i>
                                      <i class="fas fa-star text-xs"></i>
                                      <i class="fas fa-star text-xs"></i>
                                      <i class="fas fa-star text-xs"></i>
                                      <span class="text-gray-600 text-xs ml-1">(${Math.floor(Math.random() * 20) + 5})</span>
                                  </div>
                              </div>
                              <div class="flex space-x-2">
                                  <a href="/product/${product.slug}" 
                                     class="flex-1 bg-orua-green text-white py-2 px-4 rounded-lg hover:bg-orua-forest transition-colors font-semibold text-center text-sm">
                                      View Details
                                  </a>
                                  <button onclick="quickAddToCart('${product.slug}')" 
                                          class="bg-orua-gold text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition-colors">
                                      <i class="fas fa-cart-plus text-sm"></i>
                                  </button>
                              </div>
                          </div>
                      </div>
                  `).join('')}
              </div>
              
              ${products.length === 0 ? `
                  <div class="text-center py-12">
                      <i class="fas fa-search text-6xl text-gray-300 mb-4"></i>
                      <h3 class="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
                      <p class="text-gray-500 mb-6">Try browsing a different category</p>
                      <a href="/products" class="bg-orua-green text-white px-6 py-3 rounded-lg hover:bg-orua-forest">
                          View All Products
                      </a>
                  </div>
              ` : ''}
          </div>
          
          <!-- Shopping Cart Sidebar -->
          <div id="cart-sidebar" class="fixed inset-y-0 right-0 w-96 bg-white shadow-xl transform translate-x-full transition-transform duration-300 z-50">
              <div class="flex flex-col h-full">
                  <div class="flex items-center justify-between p-6 border-b border-gray-200">
                      <h2 class="text-lg font-semibold text-orua-dark">Shopping Cart</h2>
                      <button id="close-cart" class="text-gray-400 hover:text-gray-600">
                          <i class="fas fa-times text-xl"></i>
                      </button>
                  </div>
                  
                  <div id="cart-content" class="flex-1 overflow-y-auto">
                      <!-- Cart items will be loaded here -->
                  </div>
              </div>
          </div>

          <!-- Cart Overlay -->
          <div id="cart-overlay" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40"></div>
          
          <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
          <script src="/static/app.js"></script>
          <script src="/static/cart.js"></script>
      </body>
      </html>
    `
    
    return c.html(html)
  } catch (error) {
    console.error('Products page error:', error)
    return c.html('<h1>Error loading products</h1>', 500)
  }
})

// Category redirect
app.get('/categories/:slug', async (c) => {
  const slug = c.req.param('slug')
  return c.redirect(`/products?category=${slug}`)
})

// 404 handler
app.notFound((c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Page Not Found | Orua Organics</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 flex items-center justify-center min-h-screen">
        <div class="text-center">
            <h1 class="text-6xl font-bold text-gray-300 mb-4">404</h1>
            <h2 class="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
            <p class="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
            <a href="/" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
                Return Home
            </a>
        </div>
    </body>
    </html>
  `, 404)
})

export default app