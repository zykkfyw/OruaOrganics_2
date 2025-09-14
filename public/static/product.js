// Orua Organics - Product Page JavaScript

let selectedVariant = null;
let currentProduct = null;

function setupProductPage() {
  if (typeof productData !== 'undefined') {
    currentProduct = productData;
    initializeVariantSelector();
    initializeQuantityControls();
    initializeAddToCartForm();
    initializeImageGallery();
  }
}

function initializeVariantSelector() {
  const variantSelector = document.getElementById('variant-selector');
  
  if (variantSelector) {
    // Set initial variant
    updateVariantInfo();
    
    // Listen for variant changes
    variantSelector.addEventListener('change', function() {
      updateVariantInfo();
    });
  }
}

function updateVariantInfo() {
  const variantSelector = document.getElementById('variant-selector');
  const currentPrice = document.getElementById('current-price');
  const stockIndicator = document.getElementById('stock-indicator');
  const quantityInput = document.getElementById('quantity-input');
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  
  if (!variantSelector) return;
  
  // Get selected variant
  const selectedOption = variantSelector.options[variantSelector.selectedIndex];
  const variantId = parseInt(selectedOption.value);
  const variantPrice = parseFloat(selectedOption.dataset.price);
  const variantStock = parseInt(selectedOption.dataset.stock);
  
  // Find the full variant object
  selectedVariant = currentProduct.variants.find(v => v.id === variantId);
  
  // Update price display
  if (currentPrice) {
    currentPrice.textContent = `$${variantPrice.toFixed(2)}`;
  }
  
  // Update stock indicator
  if (stockIndicator) {
    if (variantStock <= 0) {
      stockIndicator.innerHTML = '<span class="text-red-500 font-medium">Out of Stock</span>';
      stockIndicator.className = 'text-sm text-red-500';
    } else if (variantStock <= 5) {
      stockIndicator.innerHTML = `<span class="text-orange-500 font-medium">Only ${variantStock} left!</span>`;
      stockIndicator.className = 'text-sm text-orange-500';
    } else {
      stockIndicator.innerHTML = `<span class="text-green-600">${variantStock} available</span>`;
      stockIndicator.className = 'text-sm text-green-600';
    }
  }
  
  // Update quantity input max
  if (quantityInput) {
    quantityInput.max = Math.min(variantStock, 10);
    
    // Reset quantity if current value exceeds stock
    if (parseInt(quantityInput.value) > variantStock) {
      quantityInput.value = Math.min(1, variantStock);
    }
  }
  
  // Update add to cart button
  if (addToCartBtn) {
    if (variantStock <= 0) {
      addToCartBtn.disabled = true;
      addToCartBtn.innerHTML = '<i class="fas fa-ban mr-2"></i>Out of Stock';
      addToCartBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
      addToCartBtn.classList.remove('bg-orua-green', 'hover:bg-orua-forest');
    } else {
      addToCartBtn.disabled = false;
      addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart mr-2"></i>Add to Cart';
      addToCartBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
      addToCartBtn.classList.add('bg-orua-green', 'hover:bg-orua-forest');
    }
  }
}

function initializeQuantityControls() {
  const quantitySelector = document.querySelector('.quantity-selector');
  
  if (quantitySelector) {
    const decreaseBtn = quantitySelector.querySelector('.quantity-decrease');
    const increaseBtn = quantitySelector.querySelector('.quantity-increase');
    const input = quantitySelector.querySelector('.quantity-input');
    
    if (decreaseBtn && increaseBtn && input) {
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(input.value) || 1;
        const minValue = parseInt(input.min) || 1;
        
        if (currentValue > minValue) {
          input.value = currentValue - 1;
          input.dispatchEvent(new Event('change'));
        }
      });
      
      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(input.value) || 1;
        const maxValue = parseInt(input.max) || 10;
        
        if (currentValue < maxValue) {
          input.value = currentValue + 1;
          input.dispatchEvent(new Event('change'));
        }
      });
      
      input.addEventListener('input', function() {
        const value = parseInt(this.value) || 1;
        const min = parseInt(this.min) || 1;
        const max = parseInt(this.max) || 10;
        
        if (value < min) this.value = min;
        if (value > max) this.value = max;
      });
    }
  }
}

function initializeAddToCartForm() {
  const form = document.getElementById('add-to-cart-form');
  
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!selectedVariant) {
        showProductNotification('Please select a product variant', 'error');
        return;
      }
      
      const quantityInput = document.getElementById('quantity-input');
      const quantity = parseInt(quantityInput?.value) || 1;
      
      // Validate stock
      if (selectedVariant.stock_quantity < quantity) {
        showProductNotification(`Only ${selectedVariant.stock_quantity} items available`, 'error');
        return;
      }
      
      // Show loading state
      const addToCartBtn = document.getElementById('add-to-cart-btn');
      const originalText = addToCartBtn.innerHTML;
      
      addToCartBtn.disabled = true;
      addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding...';
      
      try {
        await addToCart(selectedVariant.id, quantity);
      } catch (error) {
        showProductNotification('Failed to add item to cart', 'error');
      } finally {
        // Restore button
        addToCartBtn.disabled = false;
        addToCartBtn.innerHTML = originalText;
      }
    });
  }
}

function initializeImageGallery() {
  const thumbnails = document.querySelectorAll('[onclick*="changeMainImage"]');
  
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', function() {
      // Remove active class from all thumbnails
      thumbnails.forEach(t => t.classList.remove('border-orua-green'));
      thumbnails.forEach(t => t.classList.add('border-gray-200'));
      
      // Add active class to clicked thumbnail
      this.classList.add('border-orua-green');
      this.classList.remove('border-gray-200');
    });
  });
}

function changeMainImage(imageUrl, index) {
  const mainImage = document.getElementById('main-image');
  
  if (mainImage) {
    // Add fade effect
    mainImage.style.opacity = '0.5';
    
    setTimeout(() => {
      mainImage.src = imageUrl;
      mainImage.style.opacity = '1';
    }, 150);
  }
  
  // Update thumbnail active state
  const thumbnails = document.querySelectorAll('[onclick*="changeMainImage"]');
  thumbnails.forEach((thumb, i) => {
    if (i === index) {
      thumb.classList.add('border-orua-green');
      thumb.classList.remove('border-gray-200');
    } else {
      thumb.classList.remove('border-orua-green');
      thumb.classList.add('border-gray-200');
    }
  });
}

function showProductNotification(message, type = 'info') {
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
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// Product recommendations and related products
async function loadRelatedProducts() {
  if (!currentProduct) return;
  
  try {
    const response = await axios.get(`/api/products?category=${currentProduct.category_id}&limit=4`);
    
    if (response.data.success) {
      const relatedProducts = response.data.data.filter(p => p.id !== currentProduct.id);
      displayRelatedProducts(relatedProducts);
    }
  } catch (error) {
    console.error('Failed to load related products:', error);
  }
}

function displayRelatedProducts(products) {
  const container = document.getElementById('related-products');
  
  if (!container || products.length === 0) return;
  
  container.innerHTML = `
    <div class="mt-16">
      <h2 class="text-2xl font-heading font-bold mb-8 text-center">Related Products</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${products.map(product => `
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div class="aspect-square bg-gray-100">
              <img src="${product.image_url || 'https://via.placeholder.com/200x200'}" 
                   alt="${product.name}" 
                   class="w-full h-full object-cover">
            </div>
            <div class="p-4">
              <h3 class="font-semibold text-sm mb-2 line-clamp-2">${product.name}</h3>
              <div class="flex items-center justify-between">
                <span class="text-orua-green font-bold">$${product.price}</span>
                <a href="/product/${product.slug}" class="text-orua-green hover:text-orua-forest text-sm">
                  View Details
                </a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Load related products after a short delay
  setTimeout(loadRelatedProducts, 1000);
});

// Export functions for global use
window.changeMainImage = changeMainImage;
window.showProductNotification = showProductNotification;