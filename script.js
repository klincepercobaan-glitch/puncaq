const firebaseConfig = {
  apiKey: "https://tabungan-iki-default-rtdb.firebaseio.com/",
  authDomain: "tabungan-iki-default-rtdb.firebaseapp.com",
  databaseURL: "https://tabungan-iki-default-rtdb.firebaseio.com/",
  projectId: "tabungan-iki-default-rtdb",
  storageBucket: "tabungan-iki-default-rtdb.appspot.com",
  messagingSenderId: "",
  appId: ""
};

let db = null;
try {
  if (firebaseConfig.apiKey !== "https://tabungan-iki-default-rtdb.firebaseio.com/") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  } else {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  }
} catch (e) {
  console.log("Menjalankan mode penyimpanan lokal sementara.");
}

const TARGET_PER_PERSON = 250000;
let currentFilter = 'all';
let selectedMemberIndex = 0;
let selectedNominalValue = 5000;
let targetLogIdToDelete = null;
let targetMemberIndexToDelete = null;

let defaultMembers = [
  { name: "DERI", balance: 0, isDev: true },
  { name: "ZEMA", balance: 0, isDev: false },
  { name: "BAIM", balance: 0, isDev: false },
  { name: "RIZKI H", balance: 0, isDev: false },
  { name: "REZA", balance: 0, isDev: false },
  { name: "DAEN", balance: 0, isDev: false },
  { name: "DAFFA", balance: 0, isDev: false },
  { name: "HAMZAH", balance: 0, isDev: false },
  { name: "AL MAZID", balance: 0, isDev: false },
  { name: "RIDHO", balance: 0, isDev: false }
];

let members = [...defaultMembers];
let historyLogs = [];

// AUDIO UNLOCK
function unlockAudioAndStart() {
  const audio = document.getElementById('bg-music');
  audio.play().then(() => {
    document.getElementById('audio-gate').classList.add('hidden');
  }).catch(err => {
    console.log("Autoplay error:", err);
    document.getElementById('audio-gate').classList.add('hidden');
  });
}

function playConfirmationSound(isDev) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (isDev) {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.04 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.04);
        osc.stop(ctx.currentTime + idx * 0.04 + 0.35);
      });
    } else {
      const notes = [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.2);
      });
    }
  } catch (e) {}
}

function triggerConfirmationEffects(isDev) {
  const flash = document.getElementById('flash-overlay');
  playConfirmationSound(isDev);

  if (isDev) {
    flash.className = "flash-overlay dev-flash";
    flash.style.opacity = "1";
    setTimeout(() => flash.style.opacity = "0", 450);

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 160,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#8b5cf6', '#10b981', '#ffffff', '#f59e0b']
      });
    }
  } else {
    flash.className = "flash-overlay normal-flash";
    flash.style.opacity = "1";
    setTimeout(() => flash.style.opacity = "0", 300);

    if (typeof confetti === 'function') {
      confetti({
        particleCount: 45,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#10b981', '#06b6d4']
      });
    }
  }
}

// FIREBASE SYNC
function saveDataToFirebase() {
  if (db) {
    db.ref('puncak_tabungan').set({
      members: members,
      historyLogs: historyLogs
    });
  } else {
    localStorage.setItem('puncak_members', JSON.stringify(members));
    localStorage.setItem('puncak_logs', JSON.stringify(historyLogs));
  }
}

function listenFirebaseData() {
  if (db) {
    db.ref('puncak_tabungan').on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.members) members = data.members;
        if (data.historyLogs) historyLogs = data.historyLogs;
        render();
      } else {
        saveDataToFirebase();
      }
    });
  } else {
    const localM = localStorage.getItem('puncak_members');
    const localL = localStorage.getItem('puncak_logs');
    if (localM) members = JSON.parse(localM);
    if (localL) historyLogs = JSON.parse(localL);
    render();
  }
}

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

function selectNominal(value, cardElement) {
  selectedNominalValue = value;
  document.querySelectorAll('.amount-card').forEach(card => card.classList.remove('selected'));
  cardElement.classList.add('selected');
}

function setFilter(filterType, btnElement) {
  currentFilter = filterType;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  render();
}

function openMemberModal() {
  renderModalOptions();
  document.getElementById('member-modal').classList.add('active');
}

function closeMemberModal() {
  document.getElementById('member-modal').classList.remove('active');
}

function renderModalOptions() {
  const modalList = document.getElementById('modal-member-list');
  modalList.innerHTML = '';

  members.forEach((member, index) => {
    const item = document.createElement('div');
    item.className = `member-option ${selectedMemberIndex === index ? 'selected' : ''}`;
    item.innerHTML = `<span>${member.name} ${member.isDev ? '<span class="dev-badge">DEV</span>' : ''}</span>`;
    item.onclick = () => {
      selectedMemberIndex = index;
      document.getElementById('selected-member-text').innerHTML = `${member.isDev ? '⚡ ' : ''}${member.name} ${member.isDev ? '(DEV)' : ''}`;
      closeMemberModal();
    };
    modalList.appendChild(item);
  });
}

function confirmPayment() {
  if (members.length === 0) return;

  const currentMember = members[selectedMemberIndex];
  const inputMessage = document.getElementById('input-message');
  const amount = selectedNominalValue;
  const message = inputMessage.value.trim();

  currentMember.balance += amount;

  const now = new Date();
  const timeStr = `${now.getDate()}/${now.getMonth() + 1} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  historyLogs.push({
    id: Date.now(),
    memberIndex: selectedMemberIndex,
    memberName: currentMember.name,
    amount: amount,
    message: message,
    timeStr: timeStr
  });

  inputMessage.value = '';
  triggerConfirmationEffects(currentMember.isDev);
  saveDataToFirebase();
  render();
}

// FUNGSI KONFIRMASI HAPUS RIWAYAT
function requestCancelTransaction(logId) {
  targetLogIdToDelete = logId;
  document.getElementById('delete-confirm-modal').classList.add('active');
}

function closeDeleteModal() {
  targetLogIdToDelete = null;
  document.getElementById('delete-confirm-modal').classList.remove('active');
}

function executeDeleteTransaction() {
  if (targetLogIdToDelete !== null) {
    const logIndex = historyLogs.findIndex(l => l.id === targetLogIdToDelete);
    if (logIndex !== -1) {
      const log = historyLogs[logIndex];
      if (members[log.memberIndex]) {
        members[log.memberIndex].balance = Math.max(0, members[log.memberIndex].balance - log.amount);
      }
      historyLogs.splice(logIndex, 1);
      saveDataToFirebase();
      render();
    }
  }
  closeDeleteModal();
}

function addMember() {
  const input = document.getElementById('input-new-name');
  const name = input.value.trim().toUpperCase();
  if (name) {
    const isDev = name.includes("DERI");
    members.push({ name: name, balance: 0, isDev: isDev });
    input.value = '';
    saveDataToFirebase();
    render();
  }
}

// FUNGSI KONFIRMASI HAPUS ANGGOTA
function requestRemoveMember() {
  const selectDelete = document.getElementById('select-delete-member');
  const idx = parseInt(selectDelete.value);
  if (!isNaN(idx) && idx >= 0 && idx < members.length) {
    targetMemberIndexToDelete = idx;
    const memberName = members[idx].name;
    document.getElementById('delete-member-name-desc').innerText = `Apakah Anda yakin ingin menghapus "${memberName}" dari daftar?`;
    document.getElementById('delete-member-modal').classList.add('active');
  }
}

function closeDeleteMemberModal() {
  targetMemberIndexToDelete = null;
  document.getElementById('delete-member-modal').classList.remove('active');
}

function executeRemoveMember() {
  if (targetMemberIndexToDelete !== null && targetMemberIndexToDelete >= 0 && targetMemberIndexToDelete < members.length) {
    members.splice(targetMemberIndexToDelete, 1);
    if (selectedMemberIndex >= members.length) selectedMemberIndex = 0;
    saveDataToFirebase();
    render();
  }
  closeDeleteMemberModal();
}

function updateDeleteSelectOptions() {
  const selectDelete = document.getElementById('select-delete-member');
  selectDelete.innerHTML = '';
  members.forEach((member, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.innerText = member.isDev ? `${member.name} (DEV)` : member.name;
    selectDelete.appendChild(opt);
  });
}

function render() {
  const container = document.getElementById('member-cards-container');
  const historyContainer = document.getElementById('history-container');
  container.innerHTML = '';
  let totalCollected = 0;

  members.forEach(m => totalCollected += m.balance);

  if (members.length > 0 && selectedMemberIndex < members.length) {
    const m = members[selectedMemberIndex];
    document.getElementById('selected-member-text').innerText = `${m.isDev ? '⚡ ' : ''}${m.name}${m.isDev ? ' (DEV)' : ''}`;
  }

  let filteredMembers = members.map((m, idx) => ({ ...m, originalIndex: idx })).filter(member => {
    const isLunas = member.balance >= TARGET_PER_PERSON;
    if (currentFilter === 'lunas') return isLunas;
    if (currentFilter === 'belum') return !isLunas;
    return true;
  });

  filteredMembers.forEach((member) => {
    const percent = Math.min(Math.round((member.balance / TARGET_PER_PERSON) * 100), 100);
    const remainingPercent = 100 - percent;
    const isLunas = member.balance >= TARGET_PER_PERSON;

    const frame = document.createElement('div');
    frame.className = `card-frame ${member.isDev ? 'dev-frame' : ''}`;

    frame.innerHTML = `
      <div class="member-card">
        <div class="member-header">
          <div class="member-name">
            ${member.name}
            ${member.isDev ? '<span class="dev-badge">DEV</span>' : ''}
          </div>
          <span class="status-badge ${isLunas ? 'lunas' : ''}">${isLunas ? '✨ LUNAS' : 'Belum Lunas'}</span>
        </div>
        <div style="font-size: 1.2rem; font-weight: 800; color: ${isLunas ? 'var(--accent-green)' : '#fff'};">
          ${formatRupiah(member.balance)}
        </div>
        <div class="member-target-info">
          <span class="current-val">Target: ${formatRupiah(TARGET_PER_PERSON)}</span>
          <span class="percent-val ${isLunas ? 'lunas' : ''}">
            ${isLunas ? '🎉 100% LUNAS' : `${percent}% (Kurang ${remainingPercent}%)`}
          </span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
    container.appendChild(frame);
  });

  historyContainer.innerHTML = '';
  historyLogs.slice().reverse().forEach((log) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-info">
        <div class="h-name">${log.memberName}</div>
        <div class="h-time">${log.timeStr}</div>
        ${log.message ? `<div class="h-msg">"${log.message}"</div>` : ''}
      </div>
      <div>
        <div class="history-amount">+${log.amount.toLocaleString('id-ID')}</div>
        <button class="btn-cancel" onclick="requestCancelTransaction(${log.id})">Cancel</button>
      </div>
    `;
    historyContainer.appendChild(item);
  });

  document.getElementById('stat-count').innerText = `${members.length} Orang`;
  document.getElementById('stat-target').innerText = formatRupiah(members.length * TARGET_PER_PERSON);
  document.getElementById('stat-collected').innerText = formatRupiah(totalCollected);

  updateDeleteSelectOptions();
}

listenFirebaseData();
