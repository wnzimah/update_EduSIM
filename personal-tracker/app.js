const STORAGE_KEY = "personal-tracker-v1";

const state = loadState();
const currencyFormatter = new Intl.NumberFormat("ms-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const scheduleForm = document.getElementById("scheduleForm");
const scheduleTitleInput = document.getElementById("scheduleTitle");
const scheduleDueDateInput = document.getElementById("scheduleDueDate");
const schedulePriorityInput = document.getElementById("schedulePriority");
const scheduleList = document.getElementById("scheduleList");
const scheduleEmpty = document.getElementById("scheduleEmpty");

const cashflowForm = document.getElementById("cashflowForm");
const cashflowDateInput = document.getElementById("cashflowDate");
const cashflowTypeInput = document.getElementById("cashflowType");
const cashflowAmountInput = document.getElementById("cashflowAmount");
const cashflowNoteInput = document.getElementById("cashflowNote");
const cashflowBody = document.getElementById("cashflowBody");
const cashflowEmpty = document.getElementById("cashflowEmpty");
const cashInTotal = document.getElementById("cashInTotal");
const cashOutTotal = document.getElementById("cashOutTotal");
const cashBalance = document.getElementById("cashBalance");

const businessForm = document.getElementById("businessForm");
const businessDateInput = document.getElementById("businessDate");
const businessTypeInput = document.getElementById("businessType");
const businessItemInput = document.getElementById("businessItem");
const businessAmountInput = document.getElementById("businessAmount");
const businessBody = document.getElementById("businessBody");
const businessEmpty = document.getElementById("businessEmpty");
const businessCost = document.getElementById("businessCost");
const businessRevenue = document.getElementById("businessRevenue");
const businessProfit = document.getElementById("businessProfit");

const todayDateLabel = document.getElementById("todayDate");
const tomorrowTaskCountLabel = document.getElementById("tomorrowTaskCount");

initialize();

function initialize() {
  setDefaultDates();
  renderTodayLabel();
  bindEvents();
  renderAll();
}

function bindEvents() {
  scheduleForm.addEventListener("submit", onScheduleSubmit);
  scheduleList.addEventListener("click", onScheduleListClick);
  scheduleList.addEventListener("change", onScheduleListChange);

  cashflowForm.addEventListener("submit", onCashflowSubmit);
  cashflowBody.addEventListener("click", onCashflowTableClick);

  businessForm.addEventListener("submit", onBusinessSubmit);
  businessBody.addEventListener("click", onBusinessTableClick);
}

function onScheduleSubmit(event) {
  event.preventDefault();

  const title = scheduleTitleInput.value.trim();
  const dueDate = scheduleDueDateInput.value;
  const priority = schedulePriorityInput.value;
  if (!title || !dueDate) {
    return;
  }

  state.schedule.push({
    id: createId(),
    title,
    dueDate,
    priority,
    done: false,
    createdAt: Date.now()
  });

  persist();
  renderSchedule();
  scheduleForm.reset();
  scheduleDueDateInput.value = toInputDate(getTomorrowDate());
  schedulePriorityInput.value = "MEDIUM";
}

function onScheduleListChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  if (target.dataset.action !== "toggle-done") {
    return;
  }

  const rowId = target.dataset.id;
  const row = state.schedule.find((item) => item.id === rowId);
  if (!row) {
    return;
  }

  row.done = target.checked;
  persist();
  renderSchedule();
}

function onScheduleListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  if (target.dataset.action !== "delete-task") {
    return;
  }

  const rowId = target.dataset.id;
  state.schedule = state.schedule.filter((item) => item.id !== rowId);
  persist();
  renderSchedule();
}

function onCashflowSubmit(event) {
  event.preventDefault();

  const date = cashflowDateInput.value;
  const type = cashflowTypeInput.value;
  const amount = Number(cashflowAmountInput.value);
  const note = cashflowNoteInput.value.trim();
  if (!date || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  state.cashflow.push({
    id: createId(),
    date,
    type,
    amount,
    note,
    createdAt: Date.now()
  });

  persist();
  renderCashflow();
  cashflowForm.reset();
  cashflowDateInput.value = toInputDate(new Date());
  cashflowTypeInput.value = "IN";
}

function onCashflowTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  if (target.dataset.action !== "delete-cashflow") {
    return;
  }

  const rowId = target.dataset.id;
  state.cashflow = state.cashflow.filter((item) => item.id !== rowId);
  persist();
  renderCashflow();
}

function onBusinessSubmit(event) {
  event.preventDefault();

  const date = businessDateInput.value;
  const type = businessTypeInput.value;
  const item = businessItemInput.value.trim();
  const amount = Number(businessAmountInput.value);
  if (!date || !item || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  state.business.push({
    id: createId(),
    date,
    type,
    item,
    amount,
    createdAt: Date.now()
  });

  persist();
  renderBusiness();
  businessForm.reset();
  businessDateInput.value = toInputDate(new Date());
  businessTypeInput.value = "PURCHASE";
}

function onBusinessTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }
  if (target.dataset.action !== "delete-business") {
    return;
  }

  const rowId = target.dataset.id;
  state.business = state.business.filter((item) => item.id !== rowId);
  persist();
  renderBusiness();
}

function renderAll() {
  renderSchedule();
  renderCashflow();
  renderBusiness();
}

function renderSchedule() {
  const rows = [...state.schedule].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.createdAt - a.createdAt;
  });

  scheduleList.innerHTML = "";

  for (const row of rows) {
    const li = document.createElement("li");
    li.className = `task-item${row.done ? " done" : ""}`;

    li.innerHTML = `
      <div class="task-main">
        <input type="checkbox" data-action="toggle-done" data-id="${escapeHtml(row.id)}" ${row.done ? "checked" : ""}>
        <div>
          <div class="task-text">${escapeHtml(row.title)}</div>
          <div class="task-meta">Tarikh: ${formatDate(row.dueDate)} | <span class="tag ${priorityClass(row.priority)}">${priorityText(row.priority)}</span></div>
        </div>
      </div>
      <button class="danger-btn" data-action="delete-task" data-id="${escapeHtml(row.id)}">Padam</button>
    `;

    scheduleList.appendChild(li);
  }

  scheduleEmpty.style.display = rows.length === 0 ? "block" : "none";

  const tomorrowKey = toInputDate(getTomorrowDate());
  const tomorrowCount = state.schedule.filter((row) => row.dueDate === tomorrowKey && !row.done).length;
  tomorrowTaskCountLabel.textContent = `Tugasan esok: ${tomorrowCount}`;
}

function renderCashflow() {
  const rows = [...state.cashflow].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.createdAt - a.createdAt;
  });

  cashflowBody.innerHTML = "";

  let totalIn = 0;
  let totalOut = 0;

  for (const row of rows) {
    if (row.type === "IN") {
      totalIn += row.amount;
    } else {
      totalOut += row.amount;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(row.date)}</td>
      <td><span class="pill ${row.type === "IN" ? "pill-in" : "pill-out"}">${row.type === "IN" ? "Masuk" : "Keluar"}</span></td>
      <td class="${row.type === "IN" ? "amount-positive" : "amount-negative"}">${row.type === "IN" ? "+" : "-"}${formatMoney(row.amount)}</td>
      <td>${escapeHtml(row.note || "-")}</td>
      <td><button class="danger-btn" data-action="delete-cashflow" data-id="${escapeHtml(row.id)}">Padam</button></td>
    `;
    cashflowBody.appendChild(tr);
  }

  const balance = totalIn - totalOut;
  cashInTotal.textContent = formatMoney(totalIn);
  cashOutTotal.textContent = formatMoney(totalOut);
  cashBalance.textContent = formatMoney(balance);
  cashBalance.className = balance < 0 ? "amount-negative" : "amount-positive";

  cashflowEmpty.style.display = rows.length === 0 ? "block" : "none";
}

function renderBusiness() {
  const rows = [...state.business].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.createdAt - a.createdAt;
  });

  businessBody.innerHTML = "";

  let totalCost = 0;
  let totalRevenue = 0;

  for (const row of rows) {
    if (row.type === "PURCHASE") {
      totalCost += row.amount;
    } else {
      totalRevenue += row.amount;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(row.date)}</td>
      <td><span class="pill ${row.type === "PURCHASE" ? "pill-purchase" : "pill-sale"}">${row.type === "PURCHASE" ? "Kos Pembelian" : "Jualan"}</span></td>
      <td>${escapeHtml(row.item)}</td>
      <td class="${row.type === "SALE" ? "amount-positive" : "amount-negative"}">${row.type === "SALE" ? "+" : "-"}${formatMoney(row.amount)}</td>
      <td><button class="danger-btn" data-action="delete-business" data-id="${escapeHtml(row.id)}">Padam</button></td>
    `;
    businessBody.appendChild(tr);
  }

  const profit = totalRevenue - totalCost;
  businessCost.textContent = formatMoney(totalCost);
  businessRevenue.textContent = formatMoney(totalRevenue);
  businessProfit.textContent = formatMoney(profit);
  businessProfit.className = profit < 0 ? "amount-negative" : "amount-positive";

  businessEmpty.style.display = rows.length === 0 ? "block" : "none";
}

function renderTodayLabel() {
  const now = new Date();
  todayDateLabel.textContent = `Hari ini: ${now.toLocaleDateString("ms-MY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  })}`;
}

function setDefaultDates() {
  if (!scheduleDueDateInput.value) {
    scheduleDueDateInput.value = toInputDate(getTomorrowDate());
  }
  if (!cashflowDateInput.value) {
    cashflowDateInput.value = toInputDate(new Date());
  }
  if (!businessDateInput.value) {
    businessDateInput.value = toInputDate(new Date());
  }
}

function getTomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
}

function priorityText(value) {
  if (value === "HIGH") {
    return "Tinggi";
  }
  if (value === "LOW") {
    return "Rendah";
  }
  return "Sederhana";
}

function priorityClass(value) {
  if (value === "HIGH") {
    return "tag-high";
  }
  if (value === "LOW") {
    return "tag-low";
  }
  return "tag-medium";
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      schedule: [],
      cashflow: [],
      business: []
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      cashflow: Array.isArray(parsed.cashflow) ? parsed.cashflow : [],
      business: Array.isArray(parsed.business) ? parsed.business : []
    };
  } catch (_error) {
    return {
      schedule: [],
      cashflow: [],
      business: []
    };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(isoDate) {
  if (!isoDate) {
    return "-";
  }
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("ms-MY", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatMoney(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
