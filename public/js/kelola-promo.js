import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { checkAuth } from './auth.js?v=999';
import { formatCurrency, showToast, showLoader, hideLoader } from './app.js';

// Hanya owner yang boleh akses kelola promo
checkAuth(['owner']);

const promoBody = document.getElementById('promoBody');
const formModal = document.getElementById('formModal');
const promoForm = document.getElementById('promoForm');

let currentPromoId = null;

// Ambil data promo
const loadPromos = async () => {
  showLoader();
  try {
    const snapshot = await getDocs(collection(db, 'promos'));
    promoBody.innerHTML = '';
    
    if (snapshot.empty) {
      promoBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Tidak ada promo.</td></tr>`;
      return;
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${data.name}</td>
        <td class="text-gold">${formatCurrency(data.discountAmount)}</td>
        <td>
          <span class="status-badge ${data.isActive ? 'status-lunas' : 'status-belum'}">
            ${data.isActive ? 'Aktif' : 'Tidak Aktif'}
          </span>
        </td>
        <td>
          <button class="btn btn-outline" onclick="window.editPromo('${doc.id}', '${data.name}', ${data.discountAmount}, ${data.isActive})" style="padding: 0.25rem 0.5rem; margin-right: 0.5rem;"><i class="ph ph-pencil-simple"></i></button>
          <button class="btn btn-danger" onclick="window.deletePromo('${doc.id}')" style="padding: 0.25rem 0.5rem;"><i class="ph ph-trash"></i></button>
        </td>
      `;
      promoBody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    showToast('Gagal memuat promo', 'error');
  } finally {
    hideLoader();
  }
};

window.openAddModal = () => {
  currentPromoId = null;
  document.getElementById('modalTitle').textContent = 'Tambah Promo Baru';
  document.getElementById('promoName').value = '';
  document.getElementById('promoDiscount').value = '';
  document.getElementById('promoStatus').checked = true;
  formModal.classList.add('active');
};

window.closeAddModal = () => {
  formModal.classList.remove('active');
};

window.editPromo = (id, name, discountAmount, isActive) => {
  currentPromoId = id;
  document.getElementById('modalTitle').textContent = 'Edit Promo';
  document.getElementById('promoName').value = name;
  document.getElementById('promoDiscount').value = discountAmount;
  document.getElementById('promoStatus').checked = isActive;
  formModal.classList.add('active');
};

window.deletePromo = async (id) => {
  if(confirm('Yakin ingin menghapus promo ini?')) {
    showLoader();
    try {
      await deleteDoc(doc(db, 'promos', id));
      showToast('Promo berhasil dihapus!');
      loadPromos();
    } catch (e) {
      console.error(e);
      showToast('Gagal menghapus promo', 'error');
    } finally {
      hideLoader();
    }
  }
};

promoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('promoName').value;
  const discountAmount = parseFloat(document.getElementById('promoDiscount').value);
  const isActive = document.getElementById('promoStatus').checked;
  
  showLoader();
  try {
    if (currentPromoId) {
      await updateDoc(doc(db, 'promos', currentPromoId), {
        name,
        discountAmount,
        isActive
      });
      showToast('Promo berhasil diupdate!');
    } else {
      await addDoc(collection(db, 'promos'), {
        name,
        discountAmount,
        isActive
      });
      showToast('Promo berhasil ditambahkan!');
    }
    
    closeAddModal();
    loadPromos();
  } catch (err) {
    console.error(err);
    showToast('Gagal menyimpan promo', 'error');
  } finally {
    hideLoader();
  }
});

// Init
document.addEventListener('authReady', () => {
  loadPromos();
});
