import { auth, db } from "./firebase.js";
import { goToPage } from "./navigation.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const adminName = document.querySelector("#admin-name");
const statsUsers = document.querySelector("#stat-users");
const statsPending = document.querySelector("#stat-pending");
const bookingList = document.querySelector("#pending-list");
const userTable = document.querySelector("#user-table");
const notifyForm = document.querySelector("#notify-form");
const notificationList = document.querySelector("#notification-list");
const adminList = document.querySelector("#admin-list");
const messageBox = document.querySelector("#admin-message");
const logoutBtn = document.querySelector("#logout");

const showMessage = (text, tone = "info") => {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.dataset.tone = tone;
};

const IDLE_MS = 3 * 60 * 1000;
let idleTimer = null;

const startIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    await signOut(auth);
    goToPage("index.html");
  }, IDLE_MS);
};

const bindActivityListeners = () => {
  const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
  events.forEach((evt) => {
    window.addEventListener(evt, startIdleTimer, { passive: true });
  });
  startIdleTimer();
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

const formatDate = (timestamp) => {
  if (!timestamp) return "-";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

let activeAdmin = null;

const loadDashboard = async () => {
  const usersSnap = await getDocs(collection(db, "users"));
  const users = usersSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  if (statsUsers) statsUsers.textContent = users.length;

  const pendingQuery = query(collection(db, "bookings"), where("status", "==", "pending"));
  const pendingSnap = await getDocs(pendingQuery);
  const pending = pendingSnap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const requestedAtMs = data.requestedAt?.toMillis ? data.requestedAt.toMillis() : 0;
      return { id: docSnap.id, ...data, requestedAtMs };
    })
    .sort((a, b) => b.requestedAtMs - a.requestedAtMs);
  if (statsPending) statsPending.textContent = pending.length;

  renderPending(pending);
  renderUsers(users);
  renderAdmins(users);
  await loadNotifications();
};

const loadNotifications = async () => {
  if (!notificationList) return;
  const noticeQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
  const noticeSnap = await getDocs(noticeQuery);
  const notices = noticeSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  renderNotifications(notices);
};

const renderPending = (bookings) => {
  if (!bookingList) return;
  bookingList.innerHTML = "";
  if (!bookings.length) {
    bookingList.innerHTML = "<div class=\"list-item\">No pending bookings.</div>";
    return;
  }

  bookings.forEach((booking) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="toolbar">
        <strong>${booking.userName}</strong>
        <span class="status pending">pending</span>
      </div>
      <div class="meta">Requested: ${formatDate(booking.requestedAt)}</div>
      <div class="meta">Quantity: ${booking.quantity}</div>
      <div class="meta">Payment: ${booking.paymentMethod} (${booking.paymentStatus})</div>
      <div class="toolbar">
        <button data-action="approve" data-id="${booking.id}">Approve</button>
        <button class="secondary" data-action="reject" data-id="${booking.id}">Reject</button>
      </div>
    `;
    bookingList.appendChild(item);
  });
};

const renderUsers = (users) => {
  if (!userTable) return;
  userTable.innerHTML = "";
  if (!users.length) {
    userTable.innerHTML = "<tr><td colspan=\"5\">No users yet.</td></tr>";
    return;
  }

  users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.phone}</td>
      <td>${user.role}</td>
      <td>${user.remainingQuota ?? 0} / ${user.annualQuota ?? 12}</td>
    `;
    userTable.appendChild(row);
  });
};

const renderAdmins = (users) => {
  if (!adminList) return;
  const admins = users.filter((user) => user.role === "admin");
  adminList.innerHTML = "";
  if (!admins.length) {
    adminList.innerHTML = "<div class=\"list-item\">No admins found.</div>";
    return;
  }

  admins.forEach((admin) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <strong>${admin.name || "Admin"}</strong>
      <div class="meta">${admin.email || ""}</div>
      <div class="meta">${admin.phone || ""}</div>
    `;
    adminList.appendChild(item);
  });
};

const renderNotifications = (notices) => {
  if (!notificationList) return;
  notificationList.innerHTML = "";
  if (!notices.length) {
    notificationList.innerHTML = "<div class=\"list-item\">No notifications yet.</div>";
    return;
  }

  notices.forEach((notice) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div class="toolbar">
        <strong>${notice.title}</strong>
        <button class="secondary" data-action="delete-notice" data-id="${notice.id}">Delete</button>
      </div>
      <div class="meta">${notice.body || ""}</div>
    `;
    notificationList.appendChild(item);
  });
};

const handleBookingAction = async (id, action) => {
  if (!activeAdmin) return;
  const bookingRef = doc(db, "bookings", id);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) return;

  const booking = bookingSnap.data();
  const userRef = doc(db, "users", booking.userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data();

  if (action === "approve") {
    if ((userData.remainingQuota ?? 0) < booking.quantity) {
      showMessage("User does not have enough quota remaining.", "error");
      return;
    }

    await updateDoc(bookingRef, {
      status: "approved",
      approvedAt: serverTimestamp(),
    });
    await updateDoc(userRef, {
      remainingQuota: (userData.remainingQuota ?? 0) - booking.quantity,
    });

    await addDoc(collection(db, "notifications"), {
      userId: booking.userId,
      audience: "user",
      title: "Booking Approved",
      body: `Your booking for ${booking.quantity} cylinder(s) has been approved.`,
      createdAt: serverTimestamp(),
    });

    await logEvent(activeAdmin.id, "booking_approved", { bookingId: id });
    showMessage("Booking approved and quota updated.", "success");
  }

  if (action === "reject") {
    await updateDoc(bookingRef, {
      status: "rejected",
      rejectedAt: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      userId: booking.userId,
      audience: "user",
      title: "Booking Rejected",
      body: "Your booking request was rejected. Please contact support.",
      createdAt: serverTimestamp(),
    });

    await logEvent(activeAdmin.id, "booking_rejected", { bookingId: id });
    showMessage("Booking rejected.", "success");
  }

  await loadDashboard();
};

if (bookingList) {
  bookingList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;
    await handleBookingAction(id, action);
  });
}

if (notifyForm) {
  notifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeAdmin) return;

    const formData = new FormData(notifyForm);
    const audience = formData.get("audience");
    const userId = formData.get("userId").trim();
    const title = formData.get("title").trim();
    const body = formData.get("body").trim();

    if (!title || !body) {
      showMessage("Enter both title and message.", "error");
      return;
    }

    await addDoc(collection(db, "notifications"), {
      audience,
      userId: audience === "user" ? userId : null,
      title,
      body,
      createdAt: serverTimestamp(),
    });

    await logEvent(activeAdmin.id, "notification_sent", { audience });
    showMessage("Notification sent.", "success");
    notifyForm.reset();
    await loadNotifications();
  });
}

if (notificationList) {
  notificationList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action !== "delete-notice") return;
    const id = target.dataset.id;
    if (!id) return;

    try {
      await deleteDoc(doc(db, "notifications", id));
      await logEvent(activeAdmin.id, "notification_deleted", { noticeId: id });
      showMessage("Notification deleted.", "success");
      await loadNotifications();
    } catch (err) {
      showMessage("Delete failed. Check rules.", "error");
      console.error(err);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (!activeAdmin) return;
    await logEvent(activeAdmin.id, "logout");
    await signOut(auth);
    goToPage("index.html");
  });
}

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
    if (userData.role !== "admin") {
      goToPage("index.html");
      return;
    }

    activeAdmin = { id: user.uid, ...userData };
    bindActivityListeners();
    if (adminName) adminName.textContent = userData.name;
    await loadDashboard();
  } catch (err) {
    showMessage("Admin load failed. Check Firestore rules.", "error");
    console.error(err);
  }
});
