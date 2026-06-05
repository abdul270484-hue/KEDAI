import {
  auth,
  db,
  googleProvider
} from './firebase-config.js';

import {
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  showToast,
  showLoader,
  hideLoader
} from './app.js';

const btnGoogleLogin =
  document.getElementById(
    'btnGoogleLogin'
  );

// LOGIN GOOGLE
if (btnGoogleLogin) {

  btnGoogleLogin
    .addEventListener(
      'click',
      async () => {

        showLoader();

        try {

          const result =
            await signInWithPopup(
              auth,
              googleProvider
            );

          const user =
            result.user;

          // OWNER
          if (
            user.email ===
            'abdul270484@gmail.com'
          ) {

            window.location.href =
              'dashboard.html';

            return;
          }

          // KASIR
          const q =
            query(
              collection(
                db,
                'users'
              ),
              where(
                'email',
                '==',
                user.email
              )
            );

          const snapshot =
            await getDocs(q);

          if (
            snapshot.empty
          ) {

            showToast(
              'Akses ditolak',
              'error'
            );

            await signOut(
              auth
            );

            return;
          }

          const userData =
  snapshot.docs[0]
  .data();

const role =
  (
    userData.role ||
    ''
  )
  .toLowerCase();

if (
  role !==
  'kasir'
) {

  showToast(
    'Akses ditolak',
    'error'
  );

  await signOut(
    auth
  );

  return;
}

window.location.href =
  'kasir.html';

        } catch (error) {

          console.error(
            error
          );

          showToast(
            'Login gagal',
            'error'
          );

        } finally {

          hideLoader();
        }
      }
    );
}

// CHECK AUTH
export const checkAuth = (
  allowedRoles = []
) => {

  showLoader();

  const isLoginPage =
    window.location.pathname
      .includes('index.html') ||
    window.location.pathname === '/';

  onAuthStateChanged(
    auth,
    async (user) => {

      try {

        // BELUM LOGIN
        if (!user) {

  if (!isLoginPage) {
    window.location.href =
      'index.html';
  }

  hideLoader();
  return;
}

        let userData = null;

        // OWNER
        if (
          user.email ===
          'abdul270484@gmail.com'
        ) {

          userData = {
            role: 'owner',
            name: 'Abdul'
          };

        } else {

          // KASIR
          const q = query(
            collection(
              db,
              'users'
            ),
            where(
              'email',
              '==',
              user.email
            )
          );

          const snapshot =
            await getDocs(q);

          if (
            snapshot.empty
          ) {

            await signOut(auth);
            hideLoader();
            return;
          }

          userData =
            snapshot.docs[0]
            .data();
        }

        const role =
          (
            userData.role ||
            ''
          )
          .toLowerCase();

        window.currentUser = {
          uid: user.uid,
          email: user.email,
          ...userData
        };

        // ROLE CHECK
if (
  allowedRoles.length &&
  !allowedRoles.includes(role)
) {

  window.location.href =
    role === 'owner'
      ? 'dashboard.html'
      : 'kasir.html';

  return;
}

        document.dispatchEvent(
          new CustomEvent(
            'authReady',
            {
              detail:
                window.currentUser
            }
          )
        );

      } catch (error) {

        console.error(
          'AUTH ERROR:',
          error
        );

      } finally {

        hideLoader();
      }
    }
  );
};

// LOGOUT
export const logout =
  async () => {

    try {

      showLoader();

      await signOut(
        auth
      );

      window.currentUser =
        null;

      window.location.replace(
        'index.html'
      );

    } catch (
      error
    ) {

      console.error(
        error
      );

      showToast(
        'Gagal logout',
        'error'
      );

    } finally {

      hideLoader();
    }
  };