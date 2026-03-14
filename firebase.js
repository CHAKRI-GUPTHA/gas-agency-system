import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRRvt4tflPOp0sC2s0l87kwkFQEjxMZvM",
  authDomain: "gasagencysystem-f1738.firebaseapp.com",
  projectId: "gasagencysystem-f1738",
  storageBucket: "gasagencysystem-f1738.firebasestorage.app",
  messagingSenderId: "381058400535",
  appId: "1:381058400535:web:18b2fb293e0bcb3254b752",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
<script>
  window.location.href = "https://gasagencysystem-f1738.web.app";
</script>