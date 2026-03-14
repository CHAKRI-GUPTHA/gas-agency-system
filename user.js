import { auth, db } from "./firebase.js";
import { goToPage } from "./navigation.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const profileAddress = document.querySelector("#profile-address");
const portalName = document.querySelector("#portal-name");
const quotaEl = document.querySelector("#quota");
const bookingList = document.querySelector("#booking-list");
const noticeList = document.querySelector("#notice-list");
const bookingForm = document.querySelector("#booking-form");
const paymentSelect = document.querySelector("#payment");
const phonepeQr = document.querySelector("#phonepe-qr");
const messageBox = document.querySelector("#user-message");
const logoutBtn = document.querySelector("#logout");

const showMessage = (text, tone = "info") => {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.dataset.tone = tone;
};


const toggleQr = () => {
  if (!paymentSelect || !phonepeQr) return;
  const show = paymentSelect.value === "PhonePe";
  phonepeQr.classList.toggle("hidden", !show);
};

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

const renderBookings = (bookings) => {
  if (!bookingList) return;
  bookingList.innerHTML = "";
  if (!bookings.length) {
    bookingList.innerHTML = "<div class=\"list-item\">No bookings yet.</div>";
    return;
  }

  bookings.forEach((booking) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="toolbar">
        <strong>${booking.status.toUpperCase()}</strong>
        <span class="status ${booking.status}">${booking.status}</span>
      </div>
      <div class="meta">Requested: ${booking.requestedAt}</div>
      <div class="meta">Payment: ${booking.paymentMethod} (${booking.paymentStatus})</div>
      <div class="meta">Quantity: ${booking.quantity}</div>
    `;
    bookingList.appendChild(item);
  });
};

const renderNotices = (notices) => {
  if (!noticeList) return;
  noticeList.innerHTML = "";
  if (!notices.length) {
    noticeList.innerHTML = "<div class=\"list-item\">No notifications yet.</div>";
    return;
  }

  notices.forEach((notice) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <strong>${notice.title}</strong>
      <div class="meta">${notice.body}</div>
      <div class="meta">${notice.createdAt}</div>
    `;
    noticeList.appendChild(item);
  });
};

const formatDate = (timestamp) => {
  if (!timestamp) return "-";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

let activeUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    goToPage("index.html");
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      goToPage("index.html");
      return;
    }

    const userData = userDoc.data();
    if (userData.role === "admin") {
      goToPage("admin.html");
      return;
    }

    activeUser = { id: user.uid, ...userData };
    profileName.textContent = userData.name;
    if (portalName) portalName.textContent = userData.name || "Customer";
    profileEmail.textContent = userData.email;
    profileAddress.textContent = userData.address;
    quotaEl.textContent = `${userData.remainingQuota} / ${userData.annualQuota}`;

  const bookingQuery = query(collection(db, "bookings"), where("userId", "==", user.uid));
  const bookingSnapshot = await getDocs(bookingQuery);
  const bookings = bookingSnapshot.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const requestedAtMs = data.requestedAt?.toMillis ? data.requestedAt.toMillis() : 0;
      return {
        ...data,
        requestedAtMs,
      };
    })
    .sort((a, b) => b.requestedAtMs - a.requestedAtMs)
    .map((booking) => ({
      ...booking,
      requestedAt: formatDate(booking.requestedAtMs),
    }));
    renderBookings(bookings);

  const noticeQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const noticeSnapshot = await getDocs(noticeQuery);
    const notices = noticeSnapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((notice) => notice.audience === "all" || notice.userId === user.uid)
      .map((notice) => ({
        ...notice,
        createdAt: formatDate(notice.createdAt),
      }));
    renderNotices(notices);
  } catch (err) {
    showMessage("Profile load failed. Check Firestore rules.", "error");
    console.error(err);
  }
});

if (paymentSelect) {
  paymentSelect.addEventListener("change", toggleQr);
  toggleQr();
}

if (bookingForm) {
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeUser) return;

    const formData = new FormData(bookingForm);
    const quantity = Number(formData.get("quantity"));
    const paymentMethod = formData.get("payment");
    const confirmPay = formData.get("confirm") === "on";

    if (Number.isNaN(quantity) || quantity <= 0) {
      showMessage("Enter a valid quantity.", "error");
      return;
    }

    if (quantity > activeUser.remainingQuota) {
      showMessage("Not enough quota remaining for this year.", "error");
      return;
    }

    if (!confirmPay) {
      showMessage("Please confirm the total amount to send request.", "error");
      return;
    }

    try {
      const paymentStatus = "confirmed";
      await addDoc(collection(db, "bookings"), {
        userId: activeUser.id,
        userName: activeUser.name,
        status: "pending",
        quantity,
        paymentMethod,
        paymentStatus,
        amount: 824,
        tax: 50,
        total: 874,
        requestedAt: serverTimestamp(),
      });

      await logEvent(activeUser.id, "booking_request", { quantity, paymentMethod });
      showMessage("Booking request sent to admin.", "success");
      bookingForm.reset();
    } catch (err) {
      showMessage(err.message, "error");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (!activeUser) return;
    await logEvent(activeUser.id, "logout");
    await signOut(auth);
    goToPage("index.html");
  });
}
