import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';
import { formatCurrency, showToast, showLoader, hideLoader, playSound } from './app.js';

// State
let menuData = [];
let categories = [];
let currentCategory = 'All';
let cart = [];
let selectedTable = '';
let paymentMethod = 'Cash';
let paymentStatus = 'Lunas';
let discountAmount = 0;
let appliedPromoName = '';
let cashierName = 'Kasir';
let activePromos = [];

// Elements
const categorySidebar = document.getElementById('categorySidebar');
const menuGrid = document.getElementById('menuGrid');
const cartItemsContainer = document.getElementById('cartItems');
const subtotalDisplay = document.getElementById('subtotalDisplay');
const totalDisplay = document.getElementById('totalDisplay');
const cartCount = document.getElementById('cartCount');
const tableSelector = document.getElementById('tableSelector');

// Initial Data for Seeding if empty
const initialMenu = [
  { category: 'MIE HOT PLATE', name: 'Mie Ketumbar Nyemek/Goreng', price: 10000, available: true },
  { category: 'MIE HOT PLATE', name: 'Mie Lada Hitam Nyemek', price: 10000, available: true },
  { category: 'MIE HOT PLATE', name: 'Indomie Pedas Mampus LV1', price: 10000, available: true },
  { category: 'MIE HOT PLATE', name: 'Indomie Pedas Mampus LV2', price: 10000, available: true },
  { category: 'MIE HOT PLATE', name: 'Indomie Pedas Mampus LV3', price: 10000, available: true },
  { category: 'MIE HOT PLATE', name: 'Indomie Pedas Mampus LV4', price: 12000, available: true },
  { category: 'MIE HOT PLATE', name: 'Indomie Pedas Mampus LV5', price: 13000, available: true },
  { category: 'KOPI TRADISIONAL+', name: 'Kopi Tubruk', price: 6000, available: true },
  { category: 'KOPI TRADISIONAL+', name: 'Kopi Tubruk Susu', price: 8000, available: true },
  { category: 'SIGNATURE', name: 'Kopi Susu Gula Aren (Hot)', price: 12000, available: true },
  { category: 'SIGNATURE', name: 'Es Kopi Susu Gula Aren', price: 13000, available: true },
  { category: 'MINUMAN HANGAT', name: 'Teh Tarik (Hot)', price: 8000, available: true },
  { category: 'MINUMAN HANGAT', name: 'Wedang Jahe', price: 5000, available: true },
  { category: 'MINUMAN HANGAT', name: 'Wedang Jahe Susu', price: 7000, available: true },
  { category: 'ES TEH SERIES', name: 'Es Teh Jumbo', price: 6000, available: true },
  { category: 'ES TEH SERIES', name: 'Es Teh Tarik Jumbo', price: 12000, available: true },
  { category: 'MINUMAN LAIN', name: 'Air Mineral', price: 5000, available: true },
  { category: 'PAKET HEMAT', name: 'Paket 1: Mie Ketumbar + Es Teh Jumbo', price: 14000, available: true },
  { category: 'PAKET HEMAT', name: 'Paket 2: Mie Ketumbar + Es Teh Tarik Jumbo', price: 20000, available: true },
  { category: 'PAKET HEMAT', name: 'Paket 3: Indomie Pedas Mampus LV1-3 + Es Teh Jumbo', price: 14000, available: true },
  { category: 'PAKET HEMAT', name: 'Paket 4: Indomie Pedas Mampus LV4 + Es Teh Jumbo', price: 16000, available: true },
  { category: 'MENU PROMO', name: 'Mie Pedas Mampus LV5 + Es Teh Jumbo', price: 17000, available: true }
];

// Setup Auth UI
const initAuthUI = () => {
  if (window.currentUser) {
    cashierName = window.currentUser.name || 'Kasir';
    document.getElementById('cashierNameDisplay').textContent = `Kasir: ${cashierName}`;
    if (window.currentUser.role === 'owner') {
      const btnDash = document.getElementById('btnDashboard');
      if (btnDash) btnDash.classList.remove('hidden');
    }
  }
};
document.addEventListener('authReady', initAuthUI);
initAuthUI();

  
 // =====================
// LOAD MENU
// =====================

async function loadMenuRealtime() {

  showLoader();

  renderTables();
  loadPromos();

  try {

    // MODE DEMO
    if (window.isOfflineMode) {

      const stored =
        localStorage.getItem(
          'demo_menu_data'
        );

      if (stored) {

        menuData =
          JSON.parse(stored);

      } else {

        menuData =
          initialMenu.map(
            (m, i) => ({
              id: 'demo_' + i,
              ...m
            })
          );

        localStorage.setItem(
          'demo_menu_data',
          JSON.stringify(menuData)
        );
      }

    } else {

      const snapshot =
        await getDocs(
          collection(db, 'menu')
        );

      // AUTO SEED
      if (snapshot.empty) {

        for (
          const item
          of initialMenu
        ) {

          await addDoc(
            collection(
              db,
              'menu'
            ),
            {
              ...item,
              createdAt:
                serverTimestamp()
            }
          );
        }

        menuData =
          [...initialMenu];

      } else {

        menuData =
          snapshot.docs.map(doc => {

            const data =
              doc.data();

            return {
              id: doc.id,
              category:
                data.category
                || 'LAINNYA',

              name:
                data.name
                || 'Tanpa Nama',

              price:
                data.price
                || 0,

              available:
                data.available
                ?? true
            };
          });
      }
    }

    // kategori
    const catSet =
      new Set(
        menuData.map(
          item =>
            item.category
        )
      );

    categories = [
      'All',
      ...Array.from(catSet)
    ];

    renderCategories();
    renderMenu();

  } catch (error) {

    console.error(
      "Error menu:",
      error
    );

    showToast(
      "Gagal memuat menu",
      "error"
    );

  } finally {

    hideLoader();
  }
}

const loadPromos = async () => {
  try {
    const snap = await getDocs(collection(db, 'promos'));
    activePromos = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (data.isActive) activePromos.push({ id: doc.id, ...data });
    });
  } catch (error) {
    console.error("Gagal load promo", error);
  }
};

const renderCategories = () => {
  categorySidebar.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `category-btn ${cat === currentCategory ? 'active' : ''}`;
    btn.textContent = cat;
    btn.onclick = () => {
      currentCategory = cat;
      renderCategories(); // re-render to update active class
      renderMenu();
    };
    categorySidebar.appendChild(btn);
  });
};

const renderTables = () => {
  tableSelector.innerHTML = '';
  const tables = Array.from({length: 15}, (_, i) => `Meja ${i + 1}`);
  tables.push('Take Away');
  
  tables.forEach(table => {
    const btn = document.createElement('button');
    btn.className = `table-btn ${table === selectedTable ? 'active' : ''}`;
    btn.textContent = table;
    btn.onclick = () => {
      selectedTable = table;
      renderTables();
    };
    tableSelector.appendChild(btn);
  });
};

const renderMenu = () => {
  menuGrid.innerHTML = '';
  const filteredMenu = currentCategory === 'All' 
    ? menuData 
    : menuData.filter(item => item.category === currentCategory);
    
  filteredMenu.forEach(item => {
    if (
  item.available === false
) return;
    
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <div>
        <div class="menu-name">${item.name}</div>
        <div class="text-muted" style="font-size: 0.8rem; margin-bottom: 0.5rem;">${item.category}</div>
      </div>
      <div class="menu-price">${formatCurrency(item.price)}</div>
    `;
    
    card.onclick = () => addToCart(item);
    menuGrid.appendChild(card);
  });
};

// Cart Logic
const addToCart = (item) => {
  playSound('pop');
  // Simple add, no note initially. Note can be added in cart.
  const existingItemIndex = cart.findIndex(c => c.name === item.name && c.note === '');
  if (existingItemIndex > -1) {
    cart[existingItemIndex].qty += 1;
  } else {
    cart.push({
      name: item.name,
      price: item.price,
      qty: 1,
      note: '',
      category: item.category
    });
  }
  renderCart();
};

const updateCartQty = (index, delta) => {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  renderCart();
};

const updateCartNote = (index, note) => {
  cart[index].note = note;
};

const renderCart = () => {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<div class="text-muted" style="text-align: center; margin-top: 2rem;">Keranjang kosong</div>';
    subtotalDisplay.textContent = 'Rp 0';
    totalDisplay.textContent = 'Rp 0';
    cartCount.textContent = '0 Item';
    return;
  }
  
  cartItemsContainer.innerHTML = '';
  let subtotal = 0;
  let totalQty = 0;
  
  cart.forEach((item, index) => {
    subtotal += item.price * item.qty;
    totalQty += item.qty;
    
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
      <input type="text" class="cart-item-note" placeholder="Catatan opsional (ex: pedas)" value="${item.note}" onchange="window.updateNote(${index}, this.value)">
    `;
    cartItemsContainer.appendChild(div);
  });
  
  subtotalDisplay.textContent = formatCurrency(subtotal);
  let total = subtotal - discountAmount;
  if (total < 0) total = 0;
  
  const discountDisplay = document.getElementById('discountDisplay');
  if (discountDisplay) {
    if (appliedPromoName) {
      discountDisplay.textContent = `- ${formatCurrency(discountAmount)} (${appliedPromoName})`;
    } else {
      discountDisplay.textContent = `- Rp 0`;
    }
  }
  
  totalDisplay.textContent = formatCurrency(total);
  cartCount.textContent = `${totalQty} Item`;
};

// Global expose for inline event handlers
window.updateQty = updateCartQty;
window.updateNote = updateCartNote;

// Payment Selection Handlers
document.querySelectorAll('#paymentMethods .pay-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('#paymentMethods .pay-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    paymentMethod = e.target.dataset.method;
  });
});

document.querySelectorAll('#paymentStatuses .pay-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('#paymentStatuses .pay-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    paymentStatus = e.target.dataset.status;
  });
});

// Checkout Logic
const paymentModal = document.getElementById('paymentModal');
const btnCancelPayment = document.getElementById('btnCancelPayment');
const btnConfirmPayment = document.getElementById('btnConfirmPayment');
const promoModal = document.getElementById('promoModal');
const promoListContainer = document.getElementById('promoListContainer');
const btnRemovePromo = document.getElementById('btnRemovePromo');
const btnCancelPromoModal = document.getElementById('btnCancelPromoModal');

// Discount Handler
document.getElementById('btnSetDiscount').addEventListener('click', () => {
  if (promoModal) {
    promoListContainer.innerHTML = '';
    if (activePromos.length === 0) {
      promoListContainer.innerHTML = '<p class="text-muted" style="margin-bottom: 1rem;">Belum ada promo aktif yang dibuat oleh Owner.</p>';
    } else {
      activePromos.forEach(promo => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline';
        btn.style.textAlign = 'left';
        btn.style.marginBottom = '0.5rem';
        btn.style.width = '100%';
        btn.textContent = `${promo.name} (- ${formatCurrency(promo.discountAmount)})`;
        btn.onclick = () => {
          discountAmount = promo.discountAmount;
          appliedPromoName = promo.name;
          promoModal.classList.remove('active');
          renderCart();
        };
        promoListContainer.appendChild(btn);
      });
    }
    promoModal.classList.add('active');
  }
});

if (btnCancelPromoModal) {
  btnCancelPromoModal.addEventListener('click', () => {
    promoModal.classList.remove('active');
  });
}
if (btnRemovePromo) {
  btnRemovePromo.addEventListener('click', () => {
    discountAmount = 0;
    appliedPromoName = '';
    promoModal.classList.remove('active');
    renderCart();
  });
}

document.getElementById('btnCheckout').addEventListener('click', () => {
  if (cart.length === 0) {
    showToast('Keranjang kosong!', 'error');
    return;
  }
  if (!selectedTable) {
    showToast('Pilih meja terlebih dahulu!', 'error');
    return;
  }
  
  if (paymentModal) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let total = subtotal - discountAmount;
    if (total < 0) total = 0;
    const modalTotalDisplay = document.getElementById('modalTotalDisplay');
    if (modalTotalDisplay) modalTotalDisplay.textContent = formatCurrency(total);
    
    const cashInputGroup = document.getElementById('cashInputGroup');
    const cashReceivedInput = document.getElementById('cashReceived');
    const changeDisplayContainer = document.getElementById('changeDisplayContainer');
    const cashWarning = document.getElementById('cashWarning');
    
    if (paymentMethod === 'Tunai' || paymentMethod === 'Cash') {
      if(cashInputGroup) cashInputGroup.style.display = 'flex';
      if(cashReceivedInput) cashReceivedInput.value = '';
      if(changeDisplayContainer) changeDisplayContainer.style.display = 'none';
      if(cashWarning) cashWarning.style.display = 'none';
      
      // Auto focus after a short delay
      setTimeout(() => { if(cashReceivedInput) cashReceivedInput.focus(); }, 100);
    } else {
      if(cashInputGroup) cashInputGroup.style.display = 'none';
      if(cashReceivedInput) cashReceivedInput.value = '';
    }
    
    paymentModal.classList.add('active');
  }
});

const cashReceivedInput = document.getElementById('cashReceived');
if (cashReceivedInput) {
  cashReceivedInput.addEventListener('input', (e) => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const cash = parseFloat(e.target.value) || 0;
    const changeDisplayContainer = document.getElementById('changeDisplayContainer');
    const changeAmount = document.getElementById('changeAmount');
    const cashWarning = document.getElementById('cashWarning');
    
    if (e.target.value !== '') {
      changeDisplayContainer.style.display = 'block';
      let total = subtotal - discountAmount;
      if (total < 0) total = 0;
      const change = cash - total;
      
      if (change < 0) {
        changeAmount.textContent = formatCurrency(change);
        changeAmount.style.color = 'var(--danger)';
        cashWarning.style.display = 'block';
      } else {
        changeAmount.textContent = formatCurrency(change);
        changeAmount.style.color = 'var(--success)';
        cashWarning.style.display = 'none';
      }
    } else {
      changeDisplayContainer.style.display = 'none';
      cashWarning.style.display = 'none';
    }
  });
}

if (btnCancelPayment) {
  btnCancelPayment.addEventListener('click', () => {
    paymentModal.classList.remove('active');
  });
}

// --- TELEGRAM NOTIFICATION ---
const TELEGRAM_BOT_TOKEN = '8812350691:AAGOAkgR5nJqARg0f0lcCmJJbiX5kDadrHQ';
const TELEGRAM_CHAT_ID = '8891442507';

const sendTelegramNotification = async (trxId, table, items, subtotal, discount, promoName, total, paymentMethod) => {
  try {
    let itemsText = '';
    items.forEach(item => {
      itemsText += `- ${item.qty}x ${item.name} (${formatCurrency(item.price)})\n`;
    });
    
    let discountText = '';
    if (discount > 0) {
      discountText = `\n🎁 *Diskon:* -${formatCurrency(discount)} ${promoName ? `(${promoName})` : ''}`;
    }

    const message = `🔔 *TRANSAKSI BARU!*\n\n` +
      `🆔 *ID:* ${trxId}\n` +
      `🪑 *Meja:* ${table}\n` +
      `💳 *Metode:* ${paymentMethod}\n\n` +
      `🛒 *Pesanan:*\n${itemsText}` +
      `\n💰 *Subtotal:* ${formatCurrency(subtotal)}` +
      discountText +
      `\n\n💵 *TOTAL AKHIR: ${formatCurrency(total)}*`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch(e) {
    console.error("Gagal mengirim Telegram notif", e);
  }
};

if (btnConfirmPayment) {
  btnConfirmPayment.addEventListener('click', async () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let total = subtotal - discountAmount;
    if (total < 0) total = 0;
    
    let cashRecv = 0;
    let changeAmt = 0;
    
    if (paymentMethod === 'Tunai' || paymentMethod === 'Cash') {
      const cashInput = document.getElementById('cashReceived');
      if (cashInput && cashInput.value) {
        cashRecv = parseFloat(cashInput.value);
        if (cashRecv < total) {
          showToast('Uang diterima kurang dari total tagihan!', 'error');
          return; // Batalkan proses simpan
        }
        changeAmt = cashRecv - total;
      }
    }

    if (paymentModal) paymentModal.classList.remove('active');
    showLoader();
    try {
    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = window.isOfflineMode ? new Date() : serverTimestamp();
    
    // Generate Transaction ID: MDPYYMMDDXX
    let nextSeq = 1;
    if (!window.isOfflineMode) {
      const analyticsRef = doc(db, 'analytics_daily', dateStr);
      const analyticsSnap = await getDoc(analyticsRef);
      if (analyticsSnap.exists()) {
        nextSeq = (analyticsSnap.data().totalTransaction || 0) + 1;
      }
    } else {
      nextSeq = Math.floor(Math.random() * 100); // Random fallback for offline
    }
    
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const seqStr = String(nextSeq).padStart(2, '0');
    const transactionId = `MDP${yy}${mm}${dd}${seqStr}`;
    
    const waInput = document.getElementById('waNumber');
    const waNumber = waInput ? waInput.value.trim() : '';
    
    // Simpan salinan cart & meja sebelum di-reset untuk di-print
    const printCartData = [...cart];
    const printTableNumber = selectedTable;
    
    if (window.isOfflineMode) {
       // Mock Checkout
       console.log("Mock Checkout", { transactionId, tableNumber: selectedTable, items: cart, total });
       await new Promise(r => setTimeout(r, 1000));
    } else {
       // 1. Save Transaction
       await addDoc(
  collection(
    db,
    'transactions'
  ),
  {
    transactionId,
    tableNumber:
      selectedTable,
    items: cart,
    subtotal,
    discount: discountAmount,
    promoName: appliedPromoName,
    total,
    paymentMethod,
    paymentStatus,
    cashierName,
    timestamp,

    // TAMBAHAN
    status: 'completed',
    cancelReason: '',
    cancelledBy: '',
    cancelledAt: null,
    cashReceived: cashRecv,
    changeAmount: changeAmt
  }
);
       
       // 2. Update Daily Analytics (Atomic increment)
       const analyticsRef = doc(db, 'analytics_daily', dateStr);
       
       // Create payload for category sales update dynamically
       let categoryUpdates = {};
       cart.forEach(item => {
           categoryUpdates[`categorySales.${item.category}`] = increment(item.qty * item.price);
       });

       await setDoc(analyticsRef, {
         totalSales: increment(total),
         totalTransaction: increment(1),
         ...categoryUpdates
       }, { merge: true }); // merge true allows creating if not exists
       
       // 3. Send Silent Notification to Owner
       sendTelegramNotification(transactionId, selectedTable, cart, subtotal, discountAmount, appliedPromoName, total, paymentMethod);
    }
    
    playSound('kaching');
    showToast(`Transaksi Berhasil! (${transactionId})`, 'success');
    
    // Reset State
    cart = [];
    selectedTable = '';
    discountAmount = 0;
    appliedPromoName = '';
    renderTables();
    renderCart();
    
    // Hide loader BEFORE printing so it doesn't block the UI or print preview
    hideLoader();
    
    // Generate WhatsApp Receipt if number provided
    if (waNumber) {
      let formattedNumber = waNumber;
      // Format 08... to 628...
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '62' + formattedNumber.substring(1);
      }
      // Remove any non-numeric characters (like + or spaces)
      formattedNumber = formattedNumber.replace(/\D/g, '');
      
      // Title outside the code block to allow bold formatting
      let waText = '*KEDAI MADEP NGULON*\n';
      waText += '📸 IG: @madepngulon.lawu\n\n';
      
      waText += '--------------------------------\n';
      waText += `No. TRX: ${transactionId}\n`;
      waText += `Tanggal: ${new Date().toLocaleString('id-ID')}\n`;
      waText += `Meja   : ${printTableNumber}\n`;
      waText += `Kasir  : ${cashierName}\n`;
      waText += '--------------------------------\n';
      
      printCartData.forEach(item => {
        // Line 1: Item Name
        waText += `${item.name}\n`;
        
        // Line 2: Qty x Price ... Total
        let leftPart = `${item.qty} x ${formatCurrency(item.price)}`;
        let rightPart = `*${formatCurrency(item.qty * item.price)}*`;
        
        let spacesNeeded = 32 - leftPart.length - formatCurrency(item.qty * item.price).length;
        if (spacesNeeded < 1) spacesNeeded = 1;
        
        // WhatsApp standard font is proportional, but we use spaces to push to right
        waText += `${leftPart}${' '.repeat(spacesNeeded)}${rightPart}\n`;
      });
      
      waText += '--------------------------------\n';
      
      let totalStr = formatCurrency(total);
      let totalSpaces = 32 - 7 - totalStr.length; // "*TOTAL:* " is approx 7 chars visually
      if (totalSpaces < 1) totalSpaces = 1;
      waText += `*TOTAL:* ${' '.repeat(totalSpaces)}*${totalStr}*\n`;
      
      let payMethod = `${paymentMethod}`;
      if (paymentStatus === 'Belum Lunas' || paymentStatus === 'Belum') payMethod += ' (Belum)';
      
      let paySpaces = 32 - 7 - payMethod.length;
      if (paySpaces < 1) paySpaces = 1;
      waText += `*BAYAR:* ${' '.repeat(paySpaces)}${payMethod}\n`;
      
      if (cashRecv > 0) {
        let cashStr = formatCurrency(cashRecv);
        let cSpaces = 32 - 7 - cashStr.length;
        if (cSpaces < 1) cSpaces = 1;
        waText += `*TUNAI:* ${' '.repeat(cSpaces)}${cashStr}\n`;
        
        let changeStr = formatCurrency(changeAmt);
        let chSpaces = 32 - 9 - changeStr.length; // "KEMBALI: " = 9
        if (chSpaces < 1) chSpaces = 1;
        waText += `*KEMBALI:*${' '.repeat(chSpaces)}${changeStr}\n`;
      }
      
      waText += '--------------------------------\n';
      
      waText += 'Terima kasih atas kunjungan Anda!\n';

      const encodedText = encodeURIComponent(waText);
      const waUrl = `https://wa.me/${formattedNumber}?text=${encodedText}`;
      
      // Open WA in a new tab
      window.open(waUrl, '_blank');
      
      // Clear input
      if (waInput) waInput.value = '';
    }
    
    // Print Struk (use slight delay to ensure UI updates before freezing for print)
    setTimeout(() => {
      printReceipt({
        transactionId,
        tableNumber: printTableNumber,
        items: printCartData,
        total,
        discount: discountAmount,
        promoName: appliedPromoName,
        paymentMethod,
        paymentStatus,
        cashierName,
        cashReceived: cashRecv,
        changeAmount: changeAmt,
        date: new Date()
      });
    }, 100);
    
  } catch (error) {
    console.error("Checkout error:", error);
    showToast('Gagal memproses transaksi!', 'error');
    hideLoader();
  }
  });
}

const printReceipt = (trx) => {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;
  
  const d = trx.date;
  const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  
  let itemsHtml = '';
  trx.items.forEach(item => {
    let noteHtml = (item.note && item.note.trim() !== '') ? `<div style="font-size: 12px; font-style: italic; color: #333; margin-top: -2px; margin-bottom: 3px;">* Note: ${item.note}</div>` : '';
    itemsHtml += `
      <div class="flex-between">
        <span style="flex:1; font-weight: bold;">${item.name}</span>
      </div>
      ${noteHtml}
      <div class="flex-between" style="margin-bottom: 5px;">
        <span style="color: #666;">${item.qty} x ${item.price}</span>
        <span>${formatCurrency(item.qty * item.price)}</span>
      </div>
    `;
  });

  printArea.innerHTML = `
    <div class="text-center">
      <img src="img/logo.jpeg" style="width: 60px; height: 60px; object-fit: cover; border-radius: 50%; filter: grayscale(100%); margin-bottom: 5px;">
    </div>
    <h2>KEDAI MADEP NGULON</h2>
    <div class="text-center" style="margin-bottom: 10px;">
      Point of Sales System<br>
      ------------------------
    </div>
    <div>No: ${trx.transactionId}</div>
    <div>Tgl: ${dateStr}</div>
    <div>Kasir: ${trx.cashierName}</div>
    <div>Meja: ${trx.tableNumber}</div>
    <div class="dashed-line"></div>
    ${itemsHtml}
    <div class="dashed-line"></div>
    <div class="flex-between" style="font-weight: bold; font-size: 14px;">
      <span>TOTAL:</span>
      <span>${formatCurrency(trx.total)}</span>
    </div>
    ${trx.discount > 0 ? `
    <div class="flex-between" style="font-size: 13px;">
      <span>Diskon ${trx.promoName ? `(${trx.promoName})` : ''}:</span>
      <span>- ${formatCurrency(trx.discount)}</span>
    </div>
    ` : ''}
    ${trx.cashReceived > 0 ? `
    <div class="flex-between" style="margin-top: 5px;">
      <span>Tunai:</span>
      <span>${formatCurrency(trx.cashReceived)}</span>
    </div>
    <div class="flex-between">
      <span>Kembali:</span>
      <span>${formatCurrency(trx.changeAmount)}</span>
    </div>
    ` : ''}
    <div class="flex-between" style="margin-top: 5px;">
      <span>Metode:</span>
      <span>${trx.paymentMethod}</span>
    </div>
    <div class="flex-between">
      <span>Status:</span>
      <span>${trx.paymentStatus}</span>
    </div>
    <div class="dashed-line"></div>
    <div class="text-center" style="margin-top: 15px;">
      Terima Kasih!<br>
      Silakan datang kembali
    </div>
  `;
  
  // Trigger print dialog
  window.print();
};

// Init
loadMenuRealtime();

// cache-buster-v2

// fallback-fix-v3

// anti-crash-v1
