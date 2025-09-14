-- Orua Organics Webstore - Seed Data
-- Sample data based on the original Orua Organics website

-- Insert Categories
INSERT OR IGNORE INTO categories (name, slug, description, display_order, is_active) VALUES
  ('Teas', 'teas', 'Premium organic herbal teas from Liberia', 1, TRUE),
  ('Powders', 'powders', 'Nutrient-rich superfood powders', 2, TRUE),
  ('Oils', 'oils', 'Pure essential and carrier oils', 3, TRUE),
  ('Balms', 'balms', 'Natural healing balms and topicals', 4, TRUE),
  ('Wellness', 'wellness', 'Complete wellness products', 5, TRUE),
  ('Gift Sets', 'gift-sets', 'Curated gift collections', 6, TRUE);

-- Insert Products (Based on Orua Organics original products)
INSERT OR IGNORE INTO products (
  name, slug, description, short_description, sku, price, compare_at_price, 
  category_id, brand, origin_country, is_organic, is_featured, is_active,
  seo_title, seo_description
) VALUES
  -- Moringa Products
  (
    'Moringa Tea',
    'moringa-tea',
    'Pure organic Moringa tea made from hand-picked Moringa leaves sourced directly from Liberian farms. Rich in vitamins, minerals, and antioxidants. Known as the "Tree of Life," Moringa provides natural energy and supports overall wellness.',
    'Organic Moringa tea for natural energy and wellness',
    'MOR-TEA-001',
    24.99,
    29.99,
    1, -- Teas category
    'Orua Organics',
    'Liberia',
    TRUE,
    TRUE,
    TRUE,
    'Premium Organic Moringa Tea from Liberia | Orua Organics',
    'Discover the power of Moringa with our premium organic tea from Liberian farms. Rich in nutrients and antioxidants.'
  ),
  (
    'Moringa Powder',
    'moringa-powder',
    'Pure organic Moringa leaf powder, carefully dried and ground to preserve maximum nutritional value. Perfect for smoothies, teas, or cooking. One of nature''s most complete superfoods.',
    'Organic Moringa leaf powder superfood',
    'MOR-POW-001',
    34.99,
    39.99,
    2, -- Powders category
    'Orua Organics',
    'Liberia',
    TRUE,
    TRUE,
    TRUE,
    'Organic Moringa Powder Superfood | Orua Organics',
    'Premium Moringa leaf powder from Liberia. Rich in vitamins, minerals, and protein for optimal health.'
  ),

  -- Soursop Products
  (
    'Soursop Tea',
    'soursop-tea',
    'Traditional Soursop tea made from carefully selected Soursop leaves. Known for its distinctive flavor and wellness properties. A cherished herbal remedy in West African traditional medicine.',
    'Traditional Soursop herbal tea',
    'SOU-TEA-001',
    22.99,
    27.99,
    1, -- Teas category
    'Orua Organics',
    'Liberia',
    TRUE,
    FALSE,
    TRUE,
    'Organic Soursop Tea | Traditional West African Herbal Tea',
    'Experience traditional West African wellness with our premium Soursop tea. Natural and organic.'
  ),

  -- Turmeric Products
  (
    'Turmeric Powder',
    'turmeric-powder',
    'Golden organic Turmeric powder with high curcumin content. Sourced from Liberian turmeric roots and carefully processed to maintain potency. Perfect for cooking, golden milk, or wellness drinks.',
    'Organic Turmeric powder with high curcumin',
    'TUR-POW-001',
    28.99,
    32.99,
    2, -- Powders category
    'Orua Organics',
    'Liberia',
    TRUE,
    TRUE,
    TRUE,
    'Premium Organic Turmeric Powder | High Curcumin | Orua Organics',
    'Golden organic Turmeric powder from Liberia with high curcumin content for maximum wellness benefits.'
  ),

  -- Ginger Products
  (
    'Ginger Tea',
    'ginger-tea',
    'Warming Ginger tea made from fresh Liberian ginger roots. Known for digestive support and warming properties. A perfect blend for cold days or after meals.',
    'Organic Ginger tea for digestive wellness',
    'GIN-TEA-001',
    21.99,
    25.99,
    1, -- Teas category
    'Orua Organics',
    'Liberia',
    TRUE,
    FALSE,
    TRUE,
    'Organic Ginger Tea | Digestive Wellness | Orua Organics',
    'Warming organic Ginger tea from Liberia. Perfect for digestive support and natural wellness.'
  ),

  -- Baobab Products
  (
    'Baobab Powder',
    'baobab-powder',
    'Premium Baobab fruit powder from the iconic African Baobab tree. Rich in Vitamin C, fiber, and antioxidants. Known as the "Tree of Life," Baobab provides natural energy and immune support.',
    'Organic Baobab powder superfruit',
    'BAO-POW-001',
    32.99,
    36.99,
    2, -- Powders category
    'Orua Organics',
    'Liberia',
    TRUE,
    TRUE,
    TRUE,
    'Premium Baobab Powder | Vitamin C Superfruit | Orua Organics',
    'Organic Baobab powder from African Baobab trees. Rich in Vitamin C and natural antioxidants.'
  ),

  -- Noni Products
  (
    'Noni Tea',
    'noni-tea',
    'Traditional Noni tea made from Noni fruit leaves. A revered wellness tea in Pacific and African traditional medicine. Known for its unique properties and earthy flavor.',
    'Traditional Noni wellness tea',
    'NON-TEA-001',
    26.99,
    30.99,
    1, -- Teas category
    'Orua Organics',
    'Liberia',
    TRUE,
    FALSE,
    TRUE,
    'Organic Noni Tea | Traditional Wellness | Orua Organics',
    'Traditional Noni tea from organic Noni plants. Experience centuries-old wellness traditions.'
  ),

  -- Essential Oils
  (
    'Moringa Oil',
    'moringa-oil',
    'Pure cold-pressed Moringa oil extracted from Moringa seeds. Excellent for skin and hair care. Rich in antioxidants and has natural anti-aging properties.',
    'Cold-pressed Moringa oil for skin and hair',
    'MOR-OIL-001',
    45.99,
    52.99,
    3, -- Oils category
    'Orua Organics',
    'Liberia',
    TRUE,
    FALSE,
    TRUE,
    'Pure Moringa Oil | Cold-Pressed | Skin & Hair Care',
    'Premium cold-pressed Moringa oil from Liberian Moringa seeds. Natural beauty and wellness oil.'
  ),

  -- Wellness Balms
  (
    'Healing Balm',
    'healing-balm',
    'All-natural healing balm made with traditional Liberian herbs and organic ingredients. Perfect for dry skin, minor cuts, and general skin wellness.',
    'Natural healing balm with traditional herbs',
    'HEA-BAL-001',
    18.99,
    22.99,
    4, -- Balms category
    'Orua Organics',
    'Liberia',
    TRUE,
    FALSE,
    TRUE,
    'Natural Healing Balm | Traditional Liberian Herbs',
    'All-natural healing balm with traditional Liberian herbs for skin wellness and care.'
  ),

  -- Gift Sets
  (
    'Wellness Starter Set',
    'wellness-starter-set',
    'Perfect introduction to Orua Organics wellness products. Includes Moringa Tea, Turmeric Powder, and Healing Balm. A complete wellness experience in one package.',
    'Complete wellness starter package',
    'WEL-SET-001',
    69.99,
    89.99,
    6, -- Gift Sets category
    'Orua Organics',
    'Liberia',
    TRUE,
    TRUE,
    TRUE,
    'Wellness Starter Set | Complete Orua Organics Experience',
    'Perfect starter set with Moringa Tea, Turmeric Powder, and Healing Balm. Experience African wellness.'
  );

-- Insert Product Variants
INSERT OR IGNORE INTO product_variants (product_id, name, sku, price, stock_quantity, is_active) VALUES
  -- Moringa Tea variants
  (1, '25 Tea Bags', 'MOR-TEA-001-25', 24.99, 50, TRUE),
  (1, '50 Tea Bags', 'MOR-TEA-001-50', 42.99, 30, TRUE),

  -- Moringa Powder variants
  (2, '50g Powder', 'MOR-POW-001-50', 34.99, 45, TRUE),
  (2, '100g Powder', 'MOR-POW-001-100', 59.99, 25, TRUE),

  -- Soursop Tea variants
  (3, '25 Tea Bags', 'SOU-TEA-001-25', 22.99, 40, TRUE),
  (3, '50 Tea Bags', 'SOU-TEA-001-50', 39.99, 20, TRUE),

  -- Turmeric Powder variants
  (4, '50g Powder', 'TUR-POW-001-50', 28.99, 55, TRUE),
  (4, '100g Powder', 'TUR-POW-001-100', 49.99, 35, TRUE),

  -- Ginger Tea variants
  (5, '25 Tea Bags', 'GIN-TEA-001-25', 21.99, 35, TRUE),
  (5, '50 Tea Bags', 'GIN-TEA-001-50', 37.99, 18, TRUE),

  -- Baobab Powder variants
  (6, '50g Powder', 'BAO-POW-001-50', 32.99, 40, TRUE),
  (6, '100g Powder', 'BAO-POW-001-100', 54.99, 22, TRUE),

  -- Noni Tea variants
  (7, '25 Tea Bags', 'NON-TEA-001-25', 26.99, 30, TRUE),

  -- Moringa Oil variants
  (8, '30ml Bottle', 'MOR-OIL-001-30', 45.99, 25, TRUE),
  (8, '50ml Bottle', 'MOR-OIL-001-50', 72.99, 15, TRUE),

  -- Healing Balm variants
  (9, '30g Jar', 'HEA-BAL-001-30', 18.99, 40, TRUE),
  (9, '60g Jar', 'HEA-BAL-001-60', 32.99, 20, TRUE),

  -- Gift Set variants
  (10, 'Standard Set', 'WEL-SET-001-STD', 69.99, 15, TRUE);

-- Insert Product Images (using placeholder URLs for now)
INSERT OR IGNORE INTO product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
  (1, 'https://oruaorganics.com/images/moringa_tea.png', 'Moringa Tea Package', 0, TRUE),
  (2, 'https://www.cultivatornatural.com/wp-content/uploads/2022/11/Moringa-2.jpg', 'Fresh Moringa Leaves', 0, TRUE),
  (3, 'https://oruaorganics.com/images/soursoup.png', 'Soursop Tea Package', 0, TRUE),
  (4, 'https://oruaorganics.com/images/turmeric_powder.png', 'Turmeric Powder Package', 0, TRUE),
  (5, 'https://oruaorganics.com/images/ginger_tea.png', 'Ginger Tea Package', 0, TRUE),
  (6, 'https://oruaorganics.com/images/baobab_powder.png', 'Baobab Powder Package', 0, TRUE),
  (7, 'https://oruaorganics.com/images/noni_tea.png', 'Noni Tea Package', 0, TRUE),
  (8, 'https://i.etsystatic.com/28962278/r/il/66a32c/4640572771/il_1588xN.4640572771_e4y3.jpg', 'Moringa Oil Bottle', 0, TRUE),
  (9, 'https://kj1bcdn.b-cdn.net/media/60414/imagesjpeg-197.jpg', 'Natural Healing Balm', 0, TRUE),
  (10, 'https://oruaorganics.com/images/logo.jpg', 'Wellness Starter Set', 0, TRUE);

-- Insert sample tax rates
INSERT OR IGNORE INTO tax_rates (name, rate, country, state_province, is_active) VALUES
  ('US Standard', 0.0875, 'US', NULL, TRUE),
  ('California Sales Tax', 0.0725, 'US', 'CA', TRUE),
  ('New York Sales Tax', 0.08, 'US', 'NY', TRUE),
  ('Texas Sales Tax', 0.0625, 'US', 'TX', TRUE),
  ('No Tax (International)', 0.0, 'INTL', NULL, TRUE);

-- Insert sample coupons
INSERT OR IGNORE INTO coupons (code, name, description, type, value, minimum_order_amount, usage_limit, is_active, starts_at, expires_at) VALUES
  ('WELCOME10', 'Welcome Discount', 'Get 10% off your first order', 'percentage', 10.00, 25.00, 100, TRUE, 
   '2024-01-01 00:00:00', '2025-12-31 23:59:59'),
  ('FREESHIP50', 'Free Shipping', 'Free shipping on orders over $50', 'free_shipping', 0.00, 50.00, NULL, TRUE,
   '2024-01-01 00:00:00', '2025-12-31 23:59:59'),
  ('HEALTH20', 'Health & Wellness', '$20 off orders over $100', 'fixed_amount', 20.00, 100.00, 50, TRUE,
   '2024-01-01 00:00:00', '2025-06-30 23:59:59');

-- Insert newsletter subscriber (sample)
INSERT OR IGNORE INTO newsletter_subscribers (email, first_name, status, source) VALUES
  ('hello@oruaorganics.com', 'Orua', 'subscribed', 'website');

-- Insert admin user (default: admin@oruaorganics.com / password123)
INSERT OR IGNORE INTO admin_users (username, email, password_hash, first_name, last_name, role, is_active) VALUES
  ('admin', 'admin@oruaorganics.com', '$2a$10$rqZVHfGH5p8K5OyYHdLdvOZLG/pShQqnX5p8GXJvLKczjLqr4OdB6', 'Admin', 'User', 'super_admin', TRUE);