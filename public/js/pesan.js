import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { formatCurrency, showToast } from './app.js';

// Parse URL for table number
const urlParams = new URLSearchParams(window.location.search);
const tableNumberParam = urlParams.get('meja') || 'Unknown';
document.getElementById('tableBadge').textContent = `Meja ${tableNumberParam}`;

// State
let menuData = [];
let categories = [];
let currentCategory = 'All';
let cart = [];

const init = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'menu'));
    menuData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).filter(item => item.isAvailable !== false); // Only available items
    
    // Extract unique categories
    const cats = new Set(menuData.map(item => item.category));
    categories = ['All', ...Array.from(cats)];
    
    renderCategories();
    renderMenu();
  } catch (error) {
    console.error("Error fetching menu: ", error);
    showToast("Gagal memuat menu. Cek koneksi.", "error");
  }
};

const renderCategories = () => {
  const container = document.getElementById('categoryScroll');
  container.innerHTML = '';
  
  categories.forEach(cat => {
    const btn = document.createElement('div');
    btn.className = `cat-pill ${cat === currentCategory ? 'active' : ''}`;
    btn.textContent = cat;
    btn.onclick = () => {
      currentCategory = cat;
      renderCategories();
      renderMenu();
    };
    container.appendChild(btn);
  });
};

const renderMenu = () => {
  const container = document.getElementById('menuGridCust');
  container.innerHTML = '';
  
  const filtered = currentCategory === 'All' 
    ? menuData 
    : menuData.filter(item => item.category === currentCategory);
    
  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <img src="${item.image || 'img/placeholder.jpg'}" alt="${item.name}" loading="lazy">
      <div class="menu-card-content">
        <h3>${item.name}</h3>
        <p>${formatCurrency(item.price)}</p>
        <button class="btn btn-primary w-full" style="margin-top:0.5rem; padding: 0.5rem;" onclick="window.addToCart('${item.id}')">
          Tambah
        </button>
      </div>
    `;
    container.appendChild(card);
  });
};

const addToCart = (id) => {
  const item = menuData.find(m => m.id === id);
  if (!item) return;
  
  const existingIndex = cart.findIndex(c => c.id === id && c.note === '');
  if (existingIndex > -1) {
    cart[existingIndex].qty += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: 1,
      note: '',
      category: item.category
    });
  }
  
  showToast(`${item.name} ditambahkan`);
  updateCartUI();
};

const updateCartNote = (index, note) => {
  cart[index].note = note ? note.toUpperCase() : '';
};

const updateCartQty = (index, delta) => {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  updateCartUI();
};

const updateCartUI = () => {
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  
  document.getElementById('cartTotalSummary').textContent = formatCurrency(total);
  document.getElementById('cartCountSummary').textContent = totalQty;
  document.getElementById('modalTotal').textContent = formatCurrency(total);
  
  // Render modal items
  const container = document.getElementById('cartItemsCust');
  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-cart-msg">Keranjang Anda masih kosong.</div>';
    document.getElementById('btnSubmitOrder').disabled = true;
  } else {
    document.getElementById('btnSubmitOrder').disabled = false;
    container.innerHTML = '';
    cart.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <div class="cart-item-top">
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            <p>${formatCurrency(item.price)}</p>
          </div>
          <div class="cart-item-actions">
            <button class="qty-btn" onclick="window.updateQty(${index}, -1)">-</button>
            <span style="font-weight:600; width: 20px; text-align:center;">${item.qty}</span>
            <button class="qty-btn" onclick="window.updateQty(${index}, 1)">+</button>
          </div>
        </div>
        <input type="text" class="cart-item-note" placeholder="Catatan (ex: pedas)" value="${item.note}" onchange="window.updateNote(${index}, this.value)" style="text-transform: uppercase;">
      `;
      container.appendChild(div);
    });
  }
};

// Modal handlers
document.getElementById('btnOpenCart').addEventListener('click', () => {
  document.getElementById('cartModal').classList.add('active');
});

document.getElementById('btnCloseCart').addEventListener('click', () => {
  document.getElementById('cartModal').classList.remove('active');
});

// Submit Order
document.getElementById('btnSubmitOrder').addEventListener('click', async () => {
  if (cart.length === 0) return;
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const btn = document.getElementById('btnSubmitOrder');
  btn.disabled = true;
  btn.textContent = 'MENGIRIM...';
  
  try {
    await addDoc(collection(db, 'pending_orders'), {
      tableNumber: tableNumberParam,
      items: cart,
      subtotal: total,
      status: 'pending',
      timestamp: serverTimestamp()
    });
    
    document.getElementById('cartModal').classList.remove('active');
    document.getElementById('successModal').classList.add('active');
    
    // Reset cart in background
    cart = [];
    updateCartUI();
    
  } catch (e) {
    console.error("Error submitting order: ", e);
    showToast("Gagal mengirim pesanan.", "error");
    btn.disabled = false;
    btn.textContent = 'KIRIM PESANAN SEKARANG';
  }
});

// Expose globally for inline HTML handlers
window.addToCart = addToCart;
window.updateQty = updateCartQty;
window.updateNote = updateCartNote;

// Init
init();
