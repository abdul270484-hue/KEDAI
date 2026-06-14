import { db } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast, showLoader, hideLoader } from './app.js';

const userBody = document.getElementById('userBody');
const userForm = document.getElementById('userForm');
const formModal = document.getElementById('formModal');
const modalTitle = document.getElementById('modalTitle');
const userIdInput = document.getElementById('userId');
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');

let usersData = [];

// FETCH USERS
const fetchUsers = async () => {
  try {
    showLoader();
    const querySnapshot = await getDocs(collection(db, 'users'));
    usersData = [];
    querySnapshot.forEach((doc) => {
      usersData.push({ id: doc.id, ...doc.data() });
    });
    renderUsers();
  } catch (error) {
    console.error("Error fetching users: ", error);
    showToast('Gagal mengambil data user', 'error');
  } finally {
    hideLoader();
  }
};

// RENDER USERS
const renderUsers = () => {
  userBody.innerHTML = '';
  
  if (usersData.length === 0) {
    userBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--text-muted);">Belum ada kasir yang terdaftar.</td></tr>`;
    return;
  }

  usersData.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td><span style="background-color: rgba(234, 179, 8, 0.2); color: var(--primary-color); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; text-transform: uppercase;">${user.role || 'KASIR'}</span></td>
      <td>
        <button class="btn btn-outline" onclick="window.editUser('${user.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;">Edit</button>
        <button class="btn btn-primary" onclick="window.deleteUser('${user.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; background-color: #ef4444; color: white; border: none;">Hapus</button>
      </td>
    `;
    userBody.appendChild(tr);
  });
};

// SAVE USER (ADD/EDIT)
userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = userIdInput.value;
  const name = userNameInput.value.trim();
  const email = userEmailInput.value.trim();
  
  if (!name || !email) {
    showToast('Nama dan Email harus diisi', 'error');
    return;
  }

  try {
    showLoader();
    if (id) {
      // Edit Mode
      await updateDoc(doc(db, 'users', id), {
        name,
        email,
        updatedAt: new Date()
      });
      showToast('Data user berhasil diperbarui', 'success');
    } else {
      // Add Mode
      await addDoc(collection(db, 'users'), {
        name,
        email,
        role: 'kasir',
        createdAt: new Date()
      });
      showToast('Kasir baru berhasil ditambahkan', 'success');
    }
    window.closeAddModal();
    fetchUsers();
  } catch (error) {
    console.error("Error saving user: ", error);
    showToast('Gagal menyimpan data', 'error');
  } finally {
    hideLoader();
  }
});

// GLOBAL FUNCTIONS FOR INLINE ONCLICK
window.openAddModal = () => {
  userForm.reset();
  userIdInput.value = '';
  modalTitle.textContent = 'Tambah Kasir Baru';
  formModal.classList.add('active');
};

window.closeAddModal = () => {
  formModal.classList.remove('active');
};

window.editUser = (id) => {
  const user = usersData.find(u => u.id === id);
  if (user) {
    userIdInput.value = user.id;
    userNameInput.value = user.name;
    userEmailInput.value = user.email;
    modalTitle.textContent = 'Edit Data Kasir';
    formModal.classList.add('active');
  }
};

window.deleteUser = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus akses kasir ini? Mereka tidak akan bisa login lagi.')) {
    try {
      showLoader();
      await deleteDoc(doc(db, 'users', id));
      showToast('Akses kasir berhasil dicabut', 'success');
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user: ", error);
      showToast('Gagal menghapus user', 'error');
    } finally {
      hideLoader();
    }
  }
};

// INIT
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(fetchUsers, 500);
});
