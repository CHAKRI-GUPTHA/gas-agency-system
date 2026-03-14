import { auth, db } from "./firebase.js";
import { goToPage } from "./navigation.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ADMIN_EMAILS = ["chakriguptha123@gmail.com"];

window.__appLoaded = true;
console.log("app.js loaded");

const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const phoneForm = document.querySelector("#phone-form");
const otpForm = document.querySelector("#otp-form");
const registerPass = document.querySelector("#password");
const loginPass = document.querySelector("#login-password");
const showRegisterPass = document.querySelector("#show-register-pass");
const showLoginPass = document.querySelector("#show-login-pass");
const messageBox = document.querySelector("#message");

const showMessage = (text, tone = "info") => {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.dataset.tone = tone;
};

showMessage("Ready. Please login or register.", "info");

if (showRegisterPass && registerPass) {
  showRegisterPass.addEventListener("change", () => {
    registerPass.type = showRegisterPass.checked ? "text" : "password";
  });
}

if (showLoginPass && loginPass) {
  showLoginPass.addEventListener("change", () => {
    loginPass.type = showLoginPass.checked ? "text" : "password";
  });
}

const clearAutoFill = () => {
  const fields = document.querySelectorAll(
    "#register-form input, #register-form textarea, #login-form input, #phone-form input, #otp-form input"
  );
  fields.forEach((field) => {
    if (field) field.value = "";
  });
};

window.addEventListener("load", () => {
  setTimeout(clearAutoFill, 300);
  setTimeout(clearAutoFill, 1200);
});

const logEvent = async (uid, action, details = {}) => {
  try {
    await addDoc(collection(db, "logs"), {
      uid,
      action,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Log failed", err);
  }
};

const routeByRole = (role) => {
  if (role === "admin") {
    goToPage("admin.html");
    return;
  }
  goToPage("user.html");
};

const ensureUserProfile = async (user, emailFallback, phoneFallback) => {
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) return userDoc.data();

  const role = ADMIN_EMAILS.includes(user.email || emailFallback) ? "admin" : "user";
  const profile = {
    name: user.displayName || "New User",
    email: user.email || emailFallback || "",
    phone: user.phoneNumber || phoneFallback || "",
    address: "",
    role,
    annualQuota: 12,
    remainingQuota: 12,
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, profile, { merge: true });
  return profile;
};

let confirmationResult = null;
let recaptchaVerifier = null;

const ensureRecaptcha = () => {
  if (recaptchaVerifier) return;
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "normal",
  });
  recaptchaVerifier.render();
};

if (otpForm) {
  otpForm.style.display = "none";
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const name = formData.get("name").trim();
    const email = formData.get("email").trim();
    const password = formData.get("password");
    const phone = formData.get("phone").trim();
    const address = formData.get("address").trim();

    if (!name || !email || !password || !phone || !address) {
      showMessage("Please fill all registration fields.", "error");
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const role = ADMIN_EMAILS.includes(email) ? "admin" : "user";

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        phone,
        address,
        role,
        annualQuota: 12,
        remainingQuota: 12,
        createdAt: serverTimestamp(),
      });

      await logEvent(user.uid, "register", { role });
      showMessage("Registration successful. Redirecting...", "success");
      routeByRole(role);
    } catch (err) {
      showMessage(err.message, "error");
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const email = formData.get("email").trim();
    const password = formData.get("password");

    if (!email || !password) {
      showMessage("Enter both email and password.", "error");
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const profile = await ensureUserProfile(result.user, email);
      await logEvent(result.user.uid, "login", { role: profile.role });
      showMessage("Login successful. Redirecting...", "success");
      routeByRole(profile.role);
    } catch (err) {
      showMessage(err.message, "error");
    }
  });
}

if (phoneForm) {
  phoneForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(phoneForm);
    const phone = formData.get("phone").trim();

    if (!phone.startsWith("+")) {
      showMessage("Use phone with country code (example: +91XXXXXXXXXX).", "error");
      return;
    }

    try {
      ensureRecaptcha();
      confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      showMessage("OTP sent. Enter the code to continue.", "success");
      if (otpForm) otpForm.style.display = "block";
    } catch (err) {
      showMessage(err.message, "error");
    }
  });
}

if (otpForm) {
  otpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(otpForm);
    const code = formData.get("otp").trim();

    if (!confirmationResult) {
      showMessage("Request OTP first.", "error");
      return;
    }

    try {
      const result = await confirmationResult.confirm(code);
      const profile = await ensureUserProfile(result.user, null, result.user.phoneNumber);
      await logEvent(result.user.uid, "login_phone", { role: profile.role });
      showMessage("OTP verified. Redirecting...", "success");
      routeByRole(profile.role);
    } catch (err) {
      showMessage("Invalid OTP. Please try again.", "error");
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const profile = await ensureUserProfile(user);
    routeByRole(profile.role);
  } catch (err) {
    showMessage("Login worked, but profile read failed. Check Firestore rules.", "error");
    console.error(err);
  }
});
