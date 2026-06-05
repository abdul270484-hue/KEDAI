import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showLoader, hideLoader, showToast, formatCurrency } from './app.js';

let menuData = [];

// Fallback initial data for demo mode if localStorage is empty
const defaultDemoMenu = [
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

const menuBody = document.getElementById('menuBody');
const modal = document.getElementById('formModal');
const menuForm = document.getElementById('menuForm');
if (
  !menuBody ||
  !modal ||
  !menuForm
) {

  console.error(
    'Element HTML tidak ditemukan'
  );

  throw new Error(
    'DOM Missing'
  );
}

// Inputs
const idInput = document.getElementById('menuId');
const categoryInput = document.getElementById('menuCategory');
const nameInput = document.getElementById('menuName');
const priceInput = document.getElementById('menuPrice');
const availableInput = document.getElementById('menuAvailable');


async function loadData() {
  showLoader();
  try {
    if (window.isOfflineMode) {
      const stored = localStorage.getItem('demo_menu_data');
      if (stored) {
        menuData = JSON.parse(stored);
        // Fix for previously truncated menu bug
        if (menuData.length === 4 && menuData[0].name === 'Mie Ketumbar Nyemek/Goreng') {
           menuData = defaultDemoMenu.map((item, idx) => ({ id: `demo_${idx}`, ...item }));
           localStorage.setItem('demo_menu_data', JSON.stringify(menuData));
        }
      } else {
        // Just load a few items for demo if empty
        menuData = defaultDemoMenu.map((item, idx) => ({ id: `demo_${idx}`, ...item }));
        localStorage.setItem('demo_menu_data', JSON.stringify(menuData));
      }
    } else {
      const snapshot = await getDocs(collection(db, 'menu'));
      menuData = snapshot.docs.map(
  doc => {

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
  }
);
    }
    renderTable();
  } catch (error) {
    console.error(error);
    showToast('Gagal memuat data menu', 'error');
  } finally {
    hideLoader();
  }
};

const renderTable = () => {
  menuBody.innerHTML = '';
  
  if (menuData.length === 0) {
    menuBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Belum ada menu</td></tr>';
    return;
  }
  
  // Sort by category then name
  const sorted = [...menuData].sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return a.name.localeCompare(b.name);
  });
  
  sorted.forEach((item, index) => {
    const tr = document.createElement('tr');
    const statusText = item.available ? '<span style="color:var(--success);">Tersedia</span>' : '<span style="color:var(--danger);">Kosong</span>';
    
    tr.innerHTML = `
      <td style="font-size:0.85rem; color:var(--text-muted);">${item.category}</td>
      <td style="font-weight:600;">${item.name}</td>
      <td style="color:var(--accent-gold);">${formatCurrency(item.price)}</td>
      <td>${statusText}</td>
      <td>
        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size:0.8rem;" onclick="window.editMenu('${item.id}')">Edit</button>
        <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size:0.8rem;" onclick="window.deleteMenu('${item.id}')">Hapus</button>
      </td>
    `;
    menuBody.appendChild(tr);
  });
};

// =====================
// MODAL HANDLERS
// =====================

function openAddModal() {

document.getElementById(
'modalTitle'
).textContent = 'Tambah Menu';

menuForm.reset();

idInput.value = '';

availableInput.checked = true;

modal.classList.add('active');
}

function closeAddModal() {
modal.classList.remove('active');
}

// expose ke global window
window.openAddModal =
openAddModal;

window.closeAddModal =
closeAddModal;



window.editMenu = (id) => {
  const item = menuData.find(m => m.id === id);
  if (!item) return;
  
  document.getElementById('modalTitle').textContent = 'Edit Menu';
  idInput.value = item.id;
  categoryInput.value = item.category;
  nameInput.value = item.name;
  priceInput.value = item.price;
  availableInput.checked = item.available;
  
  modal.classList.add('active');
};

// Form Submit (Save / Update)
menuForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoader();
  
  const isEdit = !!idInput.value;
  const payload = {
    category: categoryInput.value.toUpperCase(),
    name: nameInput.value,
    price: Number(priceInput.value),
    available: availableInput.checked
  };

  try {
    if (window.isOfflineMode) {
      // Offline mode saving
      if (isEdit) {
        const index = menuData.findIndex(m => m.id === idInput.value);
        if(index > -1) menuData[index] = { ...menuData[index], ...payload };
      } else {
        payload.id = 'demo_' + Date.now();
        menuData.push(payload);
      }
      localStorage.setItem('demo_menu_data', JSON.stringify(menuData));
      
    } else {
      // Firebase saving
      if (isEdit) {
        const docRef = doc(db, 'menu', idInput.value);
        await updateDoc(docRef, payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'menu'), payload);
      }
    }
    
    showToast(isEdit ? 'Menu berhasil diubah!' : 'Menu berhasil ditambahkan!', 'success');
    modal.classList.remove('active');
    
    // Refresh Data
    if (!window.isOfflineMode) {
       loadData(); // Re-fetch
    } else {
       renderTable(); // Just re-render
    }
    
  } catch (error) {
    console.error(error);
    showToast('Terjadi kesalahan!', 'error');
  } finally {
    hideLoader();
  }
});

// Delete Handler
window.deleteMenu = async (id) => {
  if(!confirm('Anda yakin ingin menghapus menu ini?')) return;
  
  showLoader();
  try {
    if (window.isOfflineMode) {
      menuData = menuData.filter(m => m.id !== id);
      localStorage.setItem('demo_menu_data', JSON.stringify(menuData));
      renderTable();
    } else {
      await deleteDoc(doc(db, 'menu', id));
      loadData();
    }
    showToast('Menu berhasil dihapus', 'success');
  } catch (error) {
    console.error(error);
    showToast('Gagal menghapus menu', 'error');
  } finally {
    hideLoader();
  }
};

// =====================
// INIT APP
// =====================

function initKelola() {
  loadData();
}

// tunggu auth selesai
if (window.currentUser) {

  initKelola();

} else {

  document.addEventListener(
    'authReady',
    initKelola,
    { once: true }
  );

  // fallback kalau authReady tidak terpanggil
  setTimeout(() => {

    if (menuData.length === 0) {
      initKelola();
    }

  }, 1200);
}