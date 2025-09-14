import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for API routes
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Test route to check if app works
app.get('/test', (c) => {
  return c.json({ success: true, message: 'App is working!' })
})

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

// API Routes
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

// Newsletter API
app.post('/api/newsletter/subscribe', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Database not available' }, 500)
    }
    
    const { email, firstName, lastName } = await c.req.json()
    
    if (!email) {
      return c.json({ success: false, error: 'Email is required' }, 400)
    }
    
    // Insert newsletter subscriber
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

// Main homepage route
app.get('/', async (c) => {
  try {
    // Try to get data, but don't fail if database is not available
    let categories = []
    let featuredProducts = []
    
    if (c.env.DB) {
      try {
        categories = await getCategories(c.env.DB)
        featuredProducts = await getProducts(c.env.DB, undefined, true, 6)
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Continue with empty arrays
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
                          <button class="text-orua-dark hover:text-orua-green transition-colors relative">
                              <i class="fas fa-shopping-cart text-lg"></i>
                              <span class="absolute -top-2 -right-2 bg-orua-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
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
                                  <button class="w-full mt-4 bg-orua-green text-white py-2 px-4 rounded-lg hover:bg-orua-forest transition-colors duration-200 font-semibold">
                                      View Details
                                  </button>
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
                                  <button class="w-full mt-4 bg-orua-green text-white py-2 px-4 rounded-lg hover:bg-orua-forest transition-colors duration-200 font-semibold">
                                      View Details
                                  </button>
                              </div>
                          </div>
                          
                          <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                              <div class="aspect-square bg-gray-100 overflow-hidden">
                                  <img src="https://oruaorganics.com/images/turmeric_powder.png" 
                                       alt="Turmeric Powder"
                                       class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                              </div>
                              <div class="p-6">
                                  <h3 class="text-xl font-heading font-semibold mb-2 text-orua-dark">Turmeric Powder</h3>
                                  <p class="text-gray-600 mb-4 line-clamp-2">Organic Turmeric powder with high curcumin</p>
                                  <div class="flex items-center justify-between">
                                      <div class="flex items-center space-x-2">
                                          <span class="text-xl font-bold text-orua-green">$28.99</span>
                                          <span class="text-gray-400 line-through">$32.99</span>
                                      </div>
                                      <span class="bg-orua-green text-white text-xs px-2 py-1 rounded-full">Organic</span>
                                  </div>
                                  <button class="w-full mt-4 bg-orua-green text-white py-2 px-4 rounded-lg hover:bg-orua-forest transition-colors duration-200 font-semibold">
                                      View Details
                                  </button>
                              </div>
                          </div>
                          
                          <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                              <div class="aspect-square bg-gray-100 overflow-hidden">
                                  <img src="https://oruaorganics.com/images/baobab_powder.png" 
                                       alt="Baobab Powder"
                                       class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
                              </div>
                              <div class="p-6">
                                  <h3 class="text-xl font-heading font-semibold mb-2 text-orua-dark">Baobab Powder</h3>
                                  <p class="text-gray-600 mb-4 line-clamp-2">Organic Baobab powder superfruit</p>
                                  <div class="flex items-center justify-between">
                                      <div class="flex items-center space-x-2">
                                          <span class="text-xl font-bold text-orua-green">$32.99</span>
                                          <span class="text-gray-400 line-through">$36.99</span>
                                      </div>
                                      <span class="bg-orua-green text-white text-xs px-2 py-1 rounded-full">Organic</span>
                                  </div>
                                  <button class="w-full mt-4 bg-orua-green text-white py-2 px-4 rounded-lg hover:bg-orua-forest transition-colors duration-200 font-semibold">
                                      View Details
                                  </button>
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

          <!-- JavaScript -->
          <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
          <script src="/static/app.js"></script>
          
          <!-- Debug Info -->
          <script>
            console.log('Featured products from server:', ${JSON.stringify(featuredProducts)});
            console.log('Categories from server:', ${JSON.stringify(categories)});
          </script>
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

// Products page
app.get('/products', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Products | Orua Organics</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50">
        <div class="container mx-auto px-4 py-8">
            <h1 class="text-4xl font-bold text-center mb-8">Our Products</h1>
            <p class="text-center text-gray-600">Products page is under construction. Please check back soon!</p>
            <div class="text-center mt-8">
                <a href="/" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
                    Back to Home
                </a>
            </div>
        </div>
    </body>
    </html>
  `)
})

// Category pages redirect
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