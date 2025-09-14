// Orua Organics - Shopping Cart Frontend

// Cart state management
let cartData = {
  items: [],
  subtotal: 0,
  tax: 0,
  shipping: 0,
  discount: 0,
  total: 0,
  itemCount: 0
};

// Initialize cart functionality
document.addEventListener('DOMContentLoaded', function() {
  setupCartUI();
  loadCartData();
});

function setupCartUI() {
  // Cart toggle button
  const cartToggle = document.getElementById('cart-toggle');
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartOverlay = document.getElementById('cart-overlay');
  const closeCartBtn = document.getElementById('close-cart');
  
  if (cartToggle) {
    cartToggle.addEventListener('click', function() {
      openCartSidebar();
    });
  }
  
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', function() {
      closeCartSidebar();
    });
  }
  
  if (cartOverlay) {
    cartOverlay.addEventListener('click', function() {
      closeCartSidebar();
    });
  }
  
  // ESC key to close cart
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeCartSidebar();
    }
  });
}

function openCartSidebar() {
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartOverlay = document.getElementById('cart-overlay');
  
  if (cartSidebar && cartOverlay) {
    cartSidebar.classList.remove('translate-x-full');
    cartOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Load fresh cart data when opening
    loadCartData();
  }
}

function closeCartSidebar() {
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartOverlay = document.getElementById('cart-overlay');
  
  if (cartSidebar && cartOverlay) {
    cartSidebar.classList.add('translate-x-full');
    cartOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Load cart data from server
async function loadCartData() {
  try {
    const response = await axios.get('/api/cart');
    
    if (response.data.success) {
      cartData = response.data.data;
      updateCartUI();
    } else {
      console.error('Failed to load cart:', response.data.error);
    }
  } catch (error) {
    console.error('Cart loading error:', error);
  }
}

// Update cart UI elements
function updateCartUI() {
  updateCartCount();
  updateCartSidebar();
}

function updateCartCount() {
  const cartCountElements = document.querySelectorAll('#cart-count');
  
  cartCountElements.forEach(element => {
    element.textContent = cartData.itemCount;
    
    if (cartData.itemCount > 0) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  });
}

function updateCartSidebar() {
  const cartContent = document.getElementById('cart-content');
  const cartSummary = document.getElementById('cart-summary');
  
  if (!cartContent) return;
  
  if (cartData.items.length === 0) {
    cartContent.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center">
        <i class="fas fa-shopping-cart text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-lg font-semibold text-gray-600 mb-2">Your cart is empty</h3>
        <p class="text-gray-500 mb-6">Add some products to get started</p>
        <a href="/products" class="bg-orua-green text-white px-6 py-3 rounded-lg hover:bg-orua-forest transition-colors" onclick="closeCartSidebar()">
          Browse Products
        </a>
      </div>
    `;
    
    if (cartSummary) {
      cartSummary.innerHTML = '';
    }
  } else {
    // Render cart items
    cartContent.innerHTML = `
      <div class="space-y-4">
        ${cartData.items.map(item => `
          <div class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <img src="${item.product.image_url || 'https://via.placeholder.com/60x60'}" 
                 alt="${item.product.name}" 
                 class="w-12 h-12 object-cover rounded-lg flex-shrink-0">
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-semibold text-orua-dark truncate">${item.product.name}</h4>
              <p class="text-xs text-gray-600">${item.variant.name}</p>
              <p class="text-sm font-bold text-orua-green">$${item.variant.price}</p>
            </div>
            <div class="flex items-center space-x-2">
              <button onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})" 
                      class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 border border-gray-300 rounded">
                <i class="fas fa-minus text-xs"></i>
              </button>
              <span class="w-8 text-center text-sm font-medium">${item.quantity}</span>
              <button onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})" 
                      class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 border border-gray-300 rounded">
                <i class="fas fa-plus text-xs"></i>
              </button>
            </div>
            <button onclick="removeCartItem(${item.id})" 
                    class="text-red-500 hover:text-red-700 p-1">
              <i class="fas fa-trash text-sm"></i>
            </button>
          </div>
        `).join('')}
      </div>
    `;
    
    // Render cart summary
    if (cartSummary) {
      cartSummary.innerHTML = `
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Subtotal:</span>
            <span class="font-medium">$${cartData.subtotal}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Tax:</span>
            <span class="font-medium">$${cartData.tax}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Shipping:</span>
            <span class="font-medium">${cartData.shipping === 0 ? 'Free' : '$' + cartData.shipping}</span>
          </div>
          <div class="border-t border-gray-200 pt-2">
            <div class="flex justify-between text-base font-bold">
              <span>Total:</span>
              <span class="text-orua-green">$${cartData.total}</span>
            </div>
          </div>
        </div>
      `;
    }
  }
}

// Add item to cart
async function addToCart(productVariantId, quantity = 1) {
  try {
    showCartLoading(true);
    
    const response = await axios.post('/api/cart/add', {
      product_variant_id: productVariantId,
      quantity: quantity
    });
    
    if (response.data.success) {
      await loadCartData();
      showCartNotification('Item added to cart!', 'success');
      
      // Open cart sidebar briefly to show the addition
      openCartSidebar();
      setTimeout(() => {
        // Auto-close after 2 seconds if user doesn't interact
        if (!document.getElementById('cart-sidebar').matches(':hover')) {
          // closeCartSidebar();
        }
      }, 2000);
    } else {
      showCartNotification(response.data.error || 'Failed to add item to cart', 'error');
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    showCartNotification('Network error. Please try again.', 'error');
  } finally {
    showCartLoading(false);
  }
}

// Quick add to cart from product slug
async function quickAddToCart(productSlug) {
  try {
    // Get product details first to find the first available variant
    const productResponse = await axios.get(`/api/products/${productSlug}`);
    
    if (productResponse.data.success) {
      const product = productResponse.data.data;
      const firstVariant = product.variants && product.variants[0];
      
      if (firstVariant && firstVariant.stock_quantity > 0) {
        await addToCart(firstVariant.id, 1);
      } else {
        showCartNotification('Product is out of stock', 'error');
      }
    } else {
      showCartNotification('Product not found', 'error');
    }
  } catch (error) {
    console.error('Quick add to cart error:', error);
    showCartNotification('Failed to add item to cart', 'error');
  }
}

// Update cart item quantity
async function updateCartItemQuantity(cartItemId, newQuantity) {
  try {
    showCartLoading(true);
    
    const response = await axios.put(`/api/cart/item/${cartItemId}`, {
      quantity: newQuantity
    });
    
    if (response.data.success) {
      await loadCartData();
    } else {
      showCartNotification(response.data.error || 'Failed to update quantity', 'error');
    }
  } catch (error) {
    console.error('Update quantity error:', error);
    showCartNotification('Failed to update quantity', 'error');
  } finally {
    showCartLoading(false);
  }
}

// Remove item from cart
async function removeCartItem(cartItemId) {
  try {
    showCartLoading(true);
    
    const response = await axios.delete(`/api/cart/item/${cartItemId}`);
    
    if (response.data.success) {
      await loadCartData();
      showCartNotification('Item removed from cart', 'success');
    } else {
      showCartNotification(response.data.error || 'Failed to remove item', 'error');
    }
  } catch (error) {
    console.error('Remove item error:', error);
    showCartNotification('Failed to remove item', 'error');
  } finally {
    showCartLoading(false);
  }
}

// Clear entire cart
async function clearCart() {
  if (!confirm('Are you sure you want to clear your cart?')) {
    return;
  }
  
  try {
    showCartLoading(true);
    
    const response = await axios.delete('/api/cart');
    
    if (response.data.success) {
      await loadCartData();
      showCartNotification('Cart cleared', 'success');
    } else {
      showCartNotification(response.data.error || 'Failed to clear cart', 'error');
    }
  } catch (error) {
    console.error('Clear cart error:', error);
    showCartNotification('Failed to clear cart', 'error');
  } finally {
    showCartLoading(false);
  }
}

// Show cart loading state
function showCartLoading(isLoading) {
  const cartContent = document.getElementById('cart-content');
  
  if (isLoading && cartContent) {
    cartContent.innerHTML = `
      <div class="flex items-center justify-center h-32">
        <div class="loading"></div>
        <span class="ml-2 text-gray-600">Updating cart...</span>
      </div>
    `;
  }
}

// Show cart notifications
function showCartNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 max-w-sm bg-white border-l-4 shadow-lg z-50 transition-all duration-300 transform translate-x-full p-4 rounded-lg`;
  
  // Set border color based on type
  switch (type) {
    case 'success':
      notification.classList.add('border-green-500');
      break;
    case 'error':
      notification.classList.add('border-red-500');
      break;
    default:
      notification.classList.add('border-blue-500');
  }
  
  notification.innerHTML = `
    <div class="flex items-start">
      <div class="flex-shrink-0">
        ${type === 'success' ? '<i class="fas fa-check-circle text-green-500"></i>' : 
          type === 'error' ? '<i class="fas fa-exclamation-circle text-red-500"></i>' : 
          '<i class="fas fa-info-circle text-blue-500"></i>'}
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium text-gray-900">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-gray-400 hover:text-gray-600">
        <i class="fas fa-times text-sm"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 100);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Cart page specific functions
function updateQuantity(cartItemId, newQuantity) {
  updateCartItemQuantity(cartItemId, newQuantity).then(() => {
    // Reload page to show updated totals
    window.location.reload();
  });
}

function removeItem(cartItemId) {
  removeCartItem(cartItemId).then(() => {
    // Reload page to show updated cart
    window.location.reload();
  });
}

// Export functions for global use
window.addToCart = addToCart;
window.quickAddToCart = quickAddToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeCartItem = removeCartItem;
window.clearCart = clearCart;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.openCartSidebar = openCartSidebar;
window.closeCartSidebar = closeCartSidebar;