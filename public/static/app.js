// Orua Organics Webstore - Frontend JavaScript

// Global state
let cart = JSON.parse(localStorage.getItem('oruaCart')) || [];

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNewsletterForm();
    setupMobileMenu();
    updateCartDisplay();
    setupProductInteractions();
    setupScrollEffects();
}

// Newsletter Subscription
function setupNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    const emailInput = document.getElementById('newsletter-email');
    const messageDiv = document.getElementById('newsletter-message');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            if (!email) {
                showMessage('Please enter a valid email address.', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Subscribing...';
            submitBtn.disabled = true;
            
            try {
                const response = await axios.post('/api/newsletter/subscribe', {
                    email: email,
                    firstName: '',
                    lastName: ''
                });
                
                if (response.data.success) {
                    showMessage('Thank you for subscribing! We\'ll keep you updated on our launch.', 'success');
                    emailInput.value = '';
                } else {
                    showMessage(response.data.error || 'Subscription failed. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Newsletter subscription error:', error);
                showMessage('Network error. Please check your connection and try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    function showMessage(message, type) {
        if (!messageDiv) return;
        
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }
}

// Mobile Menu Toggle
function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            
            const icon = this.querySelector('i');
            if (mobileMenu.classList.contains('active')) {
                icon.className = 'fas fa-times text-lg';
            } else {
                icon.className = 'fas fa-bars text-lg';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                icon.className = 'fas fa-bars text-lg';
            }
        });
    }
}

// Shopping Cart Functions
function updateCartDisplay() {
    const cartBadges = document.querySelectorAll('.cart-badge');
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    cartBadges.forEach(badge => {
        badge.textContent = itemCount;
        badge.style.display = itemCount > 0 ? 'flex' : 'none';
    });
}

function addToCart(productVariantId, quantity = 1) {
    const existingItem = cart.find(item => item.productVariantId === productVariantId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productVariantId,
            quantity,
            addedAt: new Date().toISOString()
        });
    }
    
    saveCart();
    updateCartDisplay();
    showCartNotification('Item added to cart!');
}

function removeFromCart(productVariantId) {
    cart = cart.filter(item => item.productVariantId !== productVariantId);
    saveCart();
    updateCartDisplay();
}

function updateCartItemQuantity(productVariantId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productVariantId);
        return;
    }
    
    const item = cart.find(item => item.productVariantId === productVariantId);
    if (item) {
        item.quantity = newQuantity;
        saveCart();
        updateCartDisplay();
    }
}

function saveCart() {
    localStorage.setItem('oruaCart', JSON.stringify(cart));
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartDisplay();
}

function showCartNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-orua-green text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full';
    notification.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Product Interactions
function setupProductInteractions() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const variantId = this.dataset.variantId;
            const quantity = parseInt(this.dataset.quantity) || 1;
            
            if (variantId) {
                addToCart(parseInt(variantId), quantity);
            }
        });
    });
    
    // Product quick view
    document.querySelectorAll('.quick-view-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const productSlug = this.dataset.productSlug;
            
            if (productSlug) {
                openQuickView(productSlug);
            }
        });
    });
    
    // Quantity selectors
    document.querySelectorAll('.quantity-selector').forEach(selector => {
        const decreaseBtn = selector.querySelector('.quantity-decrease');
        const increaseBtn = selector.querySelector('.quantity-increase');
        const input = selector.querySelector('.quantity-input');
        
        if (decreaseBtn && increaseBtn && input) {
            decreaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(input.value) || 1;
                if (currentValue > 1) {
                    input.value = currentValue - 1;
                    input.dispatchEvent(new Event('change'));
                }
            });
            
            increaseBtn.addEventListener('click', () => {
                const currentValue = parseInt(input.value) || 1;
                const maxValue = parseInt(input.max) || 99;
                if (currentValue < maxValue) {
                    input.value = currentValue + 1;
                    input.dispatchEvent(new Event('change'));
                }
            });
            
            input.addEventListener('change', function() {
                const value = parseInt(this.value) || 1;
                const min = parseInt(this.min) || 1;
                const max = parseInt(this.max) || 99;
                
                if (value < min) this.value = min;
                if (value > max) this.value = max;
            });
        }
    });
}

// Product Quick View Modal
async function openQuickView(productSlug) {
    try {
        // Show loading modal
        showLoadingModal('Loading product details...');
        
        const response = await axios.get(`/api/products/${productSlug}`);
        
        if (response.data.success) {
            showProductModal(response.data.data);
        } else {
            showErrorModal('Product not found');
        }
    } catch (error) {
        console.error('Error loading product:', error);
        showErrorModal('Failed to load product details');
    } finally {
        hideLoadingModal();
    }
}

function showProductModal(product) {
    const modal = createModal(`
        <div class="max-w-4xl mx-auto bg-white rounded-lg overflow-hidden">
            <div class="flex flex-col md:flex-row">
                <div class="md:w-1/2">
                    <img src="${product.images?.[0]?.image_url || 'https://via.placeholder.com/400x400'}" 
                         alt="${product.name}" 
                         class="w-full h-96 object-cover">
                </div>
                <div class="md:w-1/2 p-6">
                    <h2 class="text-2xl font-bold mb-4 text-orua-dark">${product.name}</h2>
                    <p class="text-gray-600 mb-4">${product.description || product.short_description || ''}</p>
                    
                    <div class="flex items-center space-x-4 mb-6">
                        <span class="text-2xl font-bold text-orua-green">$${product.price}</span>
                        ${product.compare_at_price ? `<span class="text-gray-400 line-through">$${product.compare_at_price}</span>` : ''}
                        <span class="bg-orua-green text-white text-xs px-2 py-1 rounded-full">Organic</span>
                    </div>
                    
                    ${product.variants?.length > 1 ? `
                        <div class="mb-6">
                            <label class="block text-sm font-medium mb-2">Size/Type:</label>
                            <select class="form-input variant-selector">
                                ${product.variants.map(variant => `
                                    <option value="${variant.id}" data-price="${variant.price}">
                                        ${variant.name} - $${variant.price}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    ` : ''}
                    
                    <div class="flex items-center space-x-4">
                        <div class="quantity-selector flex items-center border rounded-lg">
                            <button type="button" class="quantity-decrease px-3 py-2 hover:bg-gray-100">-</button>
                            <input type="number" class="quantity-input w-16 text-center py-2 border-0" value="1" min="1" max="10">
                            <button type="button" class="quantity-increase px-3 py-2 hover:bg-gray-100">+</button>
                        </div>
                        <button class="btn-primary add-to-cart-modal-btn flex-1" data-product-id="${product.id}">
                            <i class="fas fa-shopping-cart mr-2"></i>
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    // Setup modal interactions
    setupModalInteractions(modal, product);
}

function setupModalInteractions(modal, product) {
    const variantSelector = modal.querySelector('.variant-selector');
    const quantityInput = modal.querySelector('.quantity-input');
    const addToCartBtn = modal.querySelector('.add-to-cart-modal-btn');
    
    // Setup quantity controls
    setupQuantityControls(modal.querySelector('.quantity-selector'));
    
    // Add to cart functionality
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const selectedVariant = variantSelector ? 
                product.variants.find(v => v.id === parseInt(variantSelector.value)) :
                product.variants?.[0];
            
            const quantity = parseInt(quantityInput.value) || 1;
            
            if (selectedVariant) {
                addToCart(selectedVariant.id, quantity);
                closeModal(modal);
            }
        });
    }
}

// Modal Functions
function createModal(content) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modalOverlay.innerHTML = `
        <div class="modal-content relative">
            <button class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10 bg-white rounded-full p-2">
                <i class="fas fa-times"></i>
            </button>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Close modal on overlay click
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal(modalOverlay);
        }
    });
    
    // Close modal on close button click
    modalOverlay.querySelector('button').addEventListener('click', () => {
        closeModal(modalOverlay);
    });
    
    // Close modal on Escape key
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            closeModal(modalOverlay);
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    return modalOverlay;
}

function closeModal(modal) {
    if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
    }
}

function showLoadingModal(message = 'Loading...') {
    const loadingModal = createModal(`
        <div class="bg-white rounded-lg p-8 text-center">
            <div class="loading mx-auto mb-4"></div>
            <p class="text-gray-600">${message}</p>
        </div>
    `);
    loadingModal.id = 'loading-modal';
    return loadingModal;
}

function hideLoadingModal() {
    const loadingModal = document.getElementById('loading-modal');
    if (loadingModal) {
        closeModal(loadingModal);
    }
}

function showErrorModal(message) {
    const errorModal = createModal(`
        <div class="bg-white rounded-lg p-8 text-center max-w-md mx-auto">
            <div class="text-red-500 text-4xl mb-4">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3 class="text-lg font-semibold mb-2">Error</h3>
            <p class="text-gray-600 mb-4">${message}</p>
            <button class="btn-primary" onclick="closeModal(this.closest('.fixed'))">
                Close
            </button>
        </div>
    `);
    return errorModal;
}

// Quantity Controls Helper
function setupQuantityControls(selector) {
    if (!selector) return;
    
    const decreaseBtn = selector.querySelector('.quantity-decrease');
    const increaseBtn = selector.querySelector('.quantity-increase');
    const input = selector.querySelector('.quantity-input');
    
    if (decreaseBtn && increaseBtn && input) {
        decreaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(input.value) || 1;
            if (currentValue > 1) {
                input.value = currentValue - 1;
            }
        });
        
        increaseBtn.addEventListener('click', () => {
            const currentValue = parseInt(input.value) || 1;
            const maxValue = parseInt(input.max) || 99;
            if (currentValue < maxValue) {
                input.value = currentValue + 1;
            }
        });
    }
}

// Scroll Effects
function setupScrollEffects() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Fade in animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements for scroll animations
    document.querySelectorAll('.product-card, .feature-icon, .heartbeat-value').forEach(el => {
        observer.observe(el);
    });
}

// Search Functionality
function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

async function performSearch() {
    const searchInput = document.querySelector('.search-input');
    const query = searchInput?.value.trim();
    
    if (!query) return;
    
    try {
        const response = await axios.get(`/api/products?search=${encodeURIComponent(query)}`);
        
        if (response.data.success) {
            displaySearchResults(response.data.data, query);
        }
    } catch (error) {
        console.error('Search error:', error);
        showErrorModal('Search failed. Please try again.');
    }
}

function displaySearchResults(products, query) {
    // This would typically update a results container or navigate to a results page
    console.log('Search results for:', query, products);
}

// Utility Functions
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for external use
window.OruaOrganics = {
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    openQuickView,
    formatCurrency,
    formatDate
};