// Orua Organics Webstore - TypeScript Interfaces

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  parent_id?: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  weight?: number;
  dimensions?: string;
  category_id: number;
  brand?: string;
  origin_country: string;
  is_organic: boolean;
  is_featured: boolean;
  is_active: boolean;
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  weight?: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  email: string;
  password_hash?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  accepts_marketing: boolean;
  email_verified: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  last_login?: string;
  total_orders: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  session_id: string;
  customer_id?: number;
  product_variant_id: number;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id?: number;
  customer_email: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed';
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  billing_first_name: string;
  billing_last_name: string;
  billing_company?: string;
  billing_address_1: string;
  billing_address_2?: string;
  billing_city: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country: string;
  billing_phone?: string;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_company?: string;
  shipping_address_1: string;
  shipping_address_2?: string;
  shipping_city: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country: string;
  shipping_phone?: string;
  payment_method?: string;
  payment_transaction_id?: string;
  order_date: string;
  shipped_date?: string;
  delivered_date?: string;
  notes?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_variant_id: number;
  product_name: string;
  variant_name?: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

export interface Coupon {
  id: number;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimum_order_amount: number;
  maximum_discount_amount?: number;
  usage_limit?: number;
  usage_count: number;
  usage_limit_per_customer: number;
  applies_to: 'all' | 'specific_products' | 'specific_categories';
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  country: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  status: 'subscribed' | 'unsubscribed' | 'pending';
  source?: string;
  subscribed_at: string;
  unsubscribed_at?: string;
  created_at: string;
}

export interface ProductReview {
  id: number;
  product_id: number;
  customer_id?: number;
  customer_name: string;
  customer_email: string;
  rating: number;
  title?: string;
  review_text?: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// Cloudflare Bindings
export type Bindings = {
  DB: D1Database;
};

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Shopping Cart Types
export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  itemCount: number;
}

// Payment Types
export interface PaymentMethod {
  type: 'paypal' | 'stripe' | 'square';
  name: string;
  description: string;
  enabled: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
}

// Database Query Types
export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Record<string, any>;
}