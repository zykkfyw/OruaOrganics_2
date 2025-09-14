// Orua Organics - Shopping Cart Management

import type { Bindings } from './types'

export interface CartItem {
  id: string
  session_id: string
  customer_id?: number
  product_variant_id: number
  quantity: number
  product: {
    id: number
    name: string
    slug: string
    price: number
    image_url?: string
  }
  variant: {
    id: number
    name: string
    price: number
    stock_quantity: number
  }
  created_at: string
}

export interface CartSummary {
  items: CartItem[]
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  itemCount: number
}

// Get or create session ID
export function getSessionId(request: Request): string {
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader)
    if (cookies.session_id) {
      return cookies.session_id
    }
  }
  
  // Generate new session ID
  return generateSessionId()
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  })
  return cookies
}

function generateSessionId(): string {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

// Add item to cart
export async function addToCart(
  db: D1Database,
  sessionId: string,
  productVariantId: number,
  quantity: number,
  customerId?: number
): Promise<{ success: boolean; error?: string; cartItem?: any }> {
  try {
    // Check if product variant exists and has enough stock
    const variant = await db.prepare(`
      SELECT pv.*, p.name as product_name, p.slug, p.price as base_price,
             pi.image_url
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE pv.id = ? AND pv.is_active = 1 AND p.is_active = 1
    `).bind(productVariantId).first()
    
    if (!variant) {
      return { success: false, error: 'Product variant not found' }
    }
    
    if (variant.stock_quantity < quantity) {
      return { success: false, error: `Only ${variant.stock_quantity} items available in stock` }
    }
    
    // Check if item already exists in cart
    const existingItem = await db.prepare(`
      SELECT * FROM cart_items 
      WHERE session_id = ? AND product_variant_id = ?
    `).bind(sessionId, productVariantId).first()
    
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity
      
      if (variant.stock_quantity < newQuantity) {
        return { success: false, error: `Only ${variant.stock_quantity} items available in stock` }
      }
      
      await db.prepare(`
        UPDATE cart_items 
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(newQuantity, existingItem.id).run()
      
      return { success: true, cartItem: { ...existingItem, quantity: newQuantity } }
    } else {
      // Add new item
      const result = await db.prepare(`
        INSERT INTO cart_items (session_id, customer_id, product_variant_id, quantity)
        VALUES (?, ?, ?, ?)
      `).bind(sessionId, customerId || null, productVariantId, quantity).run()
      
      return { 
        success: true, 
        cartItem: {
          id: result.meta.last_row_id,
          session_id: sessionId,
          customer_id: customerId,
          product_variant_id: productVariantId,
          quantity
        }
      }
    }
  } catch (error) {
    console.error('Add to cart error:', error)
    return { success: false, error: 'Failed to add item to cart' }
  }
}

// Get cart items
export async function getCartItems(
  db: D1Database,
  sessionId: string,
  customerId?: number
): Promise<CartItem[]> {
  try {
    const items = await db.prepare(`
      SELECT 
        ci.*,
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        p.price as product_base_price,
        pi.image_url,
        pv.name as variant_name,
        pv.price as variant_price,
        pv.stock_quantity
      FROM cart_items ci
      JOIN product_variants pv ON ci.product_variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE ci.session_id = ? AND pv.is_active = 1 AND p.is_active = 1
      ORDER BY ci.created_at DESC
    `).bind(sessionId).all()
    
    return items.results.map((item: any) => ({
      id: item.id,
      session_id: item.session_id,
      customer_id: item.customer_id,
      product_variant_id: item.product_variant_id,
      quantity: item.quantity,
      product: {
        id: item.product_id,
        name: item.product_name,
        slug: item.product_slug,
        price: item.product_base_price,
        image_url: item.image_url
      },
      variant: {
        id: item.product_variant_id,
        name: item.variant_name,
        price: item.variant_price,
        stock_quantity: item.stock_quantity
      },
      created_at: item.created_at
    }))
  } catch (error) {
    console.error('Get cart items error:', error)
    return []
  }
}

// Update cart item quantity
export async function updateCartItemQuantity(
  db: D1Database,
  cartItemId: number,
  newQuantity: number,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (newQuantity <= 0) {
      return removeCartItem(db, cartItemId, sessionId)
    }
    
    // Check stock availability
    const cartItem = await db.prepare(`
      SELECT ci.*, pv.stock_quantity
      FROM cart_items ci
      JOIN product_variants pv ON ci.product_variant_id = pv.id
      WHERE ci.id = ? AND ci.session_id = ?
    `).bind(cartItemId, sessionId).first()
    
    if (!cartItem) {
      return { success: false, error: 'Cart item not found' }
    }
    
    if (cartItem.stock_quantity < newQuantity) {
      return { success: false, error: `Only ${cartItem.stock_quantity} items available in stock` }
    }
    
    await db.prepare(`
      UPDATE cart_items 
      SET quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND session_id = ?
    `).bind(newQuantity, cartItemId, sessionId).run()
    
    return { success: true }
  } catch (error) {
    console.error('Update cart item error:', error)
    return { success: false, error: 'Failed to update cart item' }
  }
}

// Remove item from cart
export async function removeCartItem(
  db: D1Database,
  cartItemId: number,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.prepare(`
      DELETE FROM cart_items 
      WHERE id = ? AND session_id = ?
    `).bind(cartItemId, sessionId).run()
    
    return { success: true }
  } catch (error) {
    console.error('Remove cart item error:', error)
    return { success: false, error: 'Failed to remove cart item' }
  }
}

// Clear cart
export async function clearCart(
  db: D1Database,
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.prepare(`
      DELETE FROM cart_items WHERE session_id = ?
    `).bind(sessionId).run()
    
    return { success: true }
  } catch (error) {
    console.error('Clear cart error:', error)
    return { success: false, error: 'Failed to clear cart' }
  }
}

// Calculate cart summary
export async function calculateCartSummary(
  db: D1Database,
  sessionId: string,
  shippingAddress?: { country: string; state?: string; postal_code?: string }
): Promise<CartSummary> {
  try {
    const items = await getCartItems(db, sessionId)
    
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.variant.price * item.quantity)
    }, 0)
    
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    
    // Calculate tax (basic implementation)
    let taxRate = 0.08 // Default 8%
    if (shippingAddress) {
      const tax = await db.prepare(`
        SELECT rate FROM tax_rates 
        WHERE country = ? AND (state_province = ? OR state_province IS NULL)
        AND is_active = 1
        ORDER BY state_province DESC
        LIMIT 1
      `).bind(shippingAddress.country, shippingAddress.state || '').first()
      
      if (tax) {
        taxRate = tax.rate
      }
    }
    
    const tax = subtotal * taxRate
    
    // Calculate shipping (basic implementation)
    let shipping = 0
    if (subtotal < 50) {
      shipping = 9.99 // Free shipping over $50
    }
    
    const discount = 0 // TODO: Implement coupon system
    const total = subtotal + tax + shipping - discount
    
    return {
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
      itemCount
    }
  } catch (error) {
    console.error('Calculate cart summary error:', error)
    return {
      items: [],
      subtotal: 0,
      tax: 0,
      shipping: 0,
      discount: 0,
      total: 0,
      itemCount: 0
    }
  }
}

// Set session cookie helper
export function setSessionCookie(sessionId: string): string {
  const expires = new Date()
  expires.setDate(expires.getDate() + 30) // 30 days
  
  return `session_id=${sessionId}; Path=/; Expires=${expires.toUTCString()}; HttpOnly; SameSite=Lax`
}