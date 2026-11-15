var db = [];

function todayISO() {
  var d = new Date();
  var mm = ("0" + (d.getMonth() + 1)).slice(-2);
  var dd = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + mm + "-" + dd;
}

function isoToDMY(iso) {
  if (!iso || iso.length < 10) return iso;
  return iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);
}

function dmyToISO(dmy) {
  if (!dmy || dmy.length < 10) return todayISO();
  return dmy.slice(6, 10) + "-" + dmy.slice(3, 5) + "-" + dmy.slice(0, 2);
}

document.getElementById("pLoanDate").value = todayISO();
document.getElementById("pDate").value = todayISO();

try {
  var s = localStorage.getItem("rk_finance_v3");
  if (s) db = JSON.parse(s);
} catch (e) {}

function save() {
  try { localStorage.setItem("rk_finance_v3", JSON.stringify(db)); } catch (e) {}
}

function calc() {
  var a = Number(document.getElementById("pAmt").value) || 0;
  var r = Number(document.getElementById("pRate").value) || 0;
  var m = Number(document.getElementById("pMonths").value) || 0;
  var p = Number(document.getElementById("pPaid").value) || 0;
  var mi = (a * r) / 100;
  var ti = mi * m;
  var b = Math.max(0, (a + ti) - p);
  document.getElementById("previewBox").innerText =
    "1 Month Interest: " + mi + " | " + m + " Months Interest: " + ti + " | Current Balance: " + b;
}

document.getElementById("pAmt").oninput = calc;
document.getElementById("pRate").oninput = calc;
document.getElementById("pMonths").oninput = calc;
document.getElementById("pPaid").oninput = calc;

document.getElementById("btnAdd").onclick = function() {
  var name = document.getElementById("pName").value.trim();
  var amt = Number(document.getElementById("pAmt").value) || 0;
  var rate = Number(document.getElementById("pRate").value) || 0;
  var months = Number(document.getElementById("pMonths").value) || 0;
  var paid = Number(document.getElementById("pPaid").value) || 0;
  var inst = Number(document.getElementById("pInst").value) || 0;
  var type = document.getElementById("pType").value;
  var lISO = document.getElementById("pLoanDate").value || todayISO();
  var dISO = document.getElementById("pDate").value || todayISO();

  if (!name || amt <= 0) {
    alert("Please enter Name and Initial Amount!");
    return;
  }

  var mi = (amt * rate) / 100;
  var bal = Math.max(0, (amt + (mi * months)) - paid);
  if (inst <= 0 && mi > 0) inst = mi;

  var lDMY = isoToDMY(lISO);
  var dDMY = isoToDMY(dISO);
  var hist = [];
  if (paid > 0) {
    hist.push({ date: lDMY, note: "Initial Paid (" + months + " Months)", amt: paid, bal: bal });
  }

  db.push({
    id: Date.now(), name: name, loanDate: lDMY, dueDate: dDMY, dueISO: dISO,
    amt: amt, rate: rate, intAmt: mi, inst: inst, type: type, bal: bal, history: hist
  });

  save();
  document.getElementById("pName").value = "";
  document.getElementById("pAmt").value = "";
  document.getElementById("pRate").value = "";
  document.getElementById("pMonths").value = "1";
  document.getElementById("pPaid").value = "0";
  document.getElementById("pInst").value = "";
  document.getElementById("pLoanDate").value = todayISO();
  document.getElementById("pDate").value = todayISO();
  calc();
  show();
};

document.getElementById("btnCloseHist").onclick = function() {
  document.getElementById("histBox").style.display = "none";
};

function find(id) {
  return db.find(function(x) { return x.id === id; });
}

function pay(id) {
  var x = find(id);
  if (!x) return;
  var p = Number(prompt(x.name + " Paid Amount (Balance: " + x.bal + "):", x.inst));
  if (p > 0) {
    var cd = prompt("Collected Date (DD/MM/YYYY):", isoToDMY(todayISO())) || isoToDMY(todayISO());
    var nt = prompt("Month / Note:", "Installment Paid") || "Installment Paid";
    x.bal = Math.max(0, x.bal - p);
    x.history.push({ date: cd, note: nt, amt: p, bal: x.bal });
    var curISO = x.dueISO || dmyToISO(x.dueDate);
    var dt = new Date(curISO + "T00:00:00");
    if (x.type === "Daily") dt.setDate(dt.getDate() + 1);
    else dt.setMonth(dt.getMonth() + 1);
    var mm = ("0" + (dt.getMonth() + 1)).slice(-2);
    var dd = ("0" + dt.getDate()).slice(-2);
    x.dueISO = dt.getFullYear() + "-" + mm + "-" + dd;
    x.dueDate = isoToDMY(x.dueISO);
    save(); show(); hist(id);
  }
}

function oldMonth(id) {
  var x = find(id);
  if (!x) return;
  var m = prompt("Month Name (e.g. 7th Month Interest):", "7th Month Interest");
  if (!m) return;
  var cd = prompt("Collected Date (DD/MM/YYYY):", isoToDMY(todayISO())) || isoToDMY(todayISO());
  var p = Number(prompt("Amount:", x.intAmt)) || 0;
  if (p > 0) {
    x.history.push({ date: cd, note: m, amt: p, bal: x.bal });
    save(); hist(id);
  }
}

function addInt(id) {
  var x = find(id);
  if (!x) return;
  var ni = (x.amt * x.rate) / 100;
  if (confirm("Add next month interest " + ni + "?")) {
    x.bal += ni;
    x.history.push({ date: isoToDMY(todayISO()), note: "Next Month Interest (+)", amt: ni, bal: x.bal });
    save(); show(); hist(id);
  }
}

function hist(id) {
  var x = find(id);
  if (!x) return;
  document.getElementById("histTitle").innerText = x.name + " - History";
  var h = x.history.length ? "" : "<tr><td colspan='5'>No records.</td></tr>";
  var n = 0;
  x.history.forEach(function(r) {
    n++;
    h += "<tr><td>" + n + "</td><td><b>" + r.date + "</b></td><td>" + r.note + "</td><td>" + r.amt + "</td><td>" + r.bal + "</td></tr>";
  });
  document.getElementById("histBody").innerHTML = h;
  document.getElementById("histBox").style.display = "block";
}

function del(id) {
  if (confirm("Delete?")) {
    db = db.filter(function(x) { return x.id !== id; });
    save(); show();
    document.getElementById("histBox").style.display = "none";
  }
}

document.getElementById("btnBackup").onclick = function() {
  if (!db.length) { alert("No data to backup!"); return; }
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db)], { type: "application/json" }));
  a.download = "RK_Finance_Backup_" + isoToDMY(todayISO()).replace(/\//g, "-") + ".json";
  a.click();
};

document.getElementById("btnRestore").onclick = function() {
  document.getElementById("fileRestore").click();
};

document.getElementById("fileRestore").onchange = function(e) {
  var file = e.target.files.item(0);
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) {
        db = data;
        save();
        show();
        alert("Data restored successfully!");
      }
    } catch (err) {
      alert("Invalid backup file!");
    }
  };
  reader.readAsText(file);
};

document.getElementById("btnExcel").onclick = function() {
  if (!db.length) { alert("No data!"); return; }
  var csv = "Name,Loan Date,Initial,Interest %,Monthly Interest,Installment,Type,Balance,Next Due\n";
  db.forEach(function(x) {
    csv += '"' + x.name + '","' + x.loanDate + '",' + x.amt + ',' + x.rate + ',' + x.intAmt + ',' + x.inst + ',"' + x.type + '",' + x.bal + ',"' + x.dueDate + '"\n';
  });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "RK_Finance_" + isoToDMY(todayISO()).replace(/\//g, "-") + ".csv";
  a.click();
};

function show() {
  var rows = "", rem = "", now = todayISO();
  db.forEach(function(x) {
    var dISO = x.dueISO || dmyToISO(x.dueDate);
    if (x.bal > 0 && dISO <= now) {
      rem += "<div>• <b>" + x.name + "</b> - Due: " + x.inst + " | Balance: " + x.bal + "</div>";
    }
    rows += "<tr><td><b>" + x.name + "</b><br><small>" + x.loanDate + "</small></td><td>" + x.amt + "</td><td>" + x.rate + "% (" + x.intAmt + ")</td><td>" + x.inst + " (" + x.type + ")</td><td style='color:red;font-weight:bold;'>" + x.bal + "</td><td>" + (x.bal > 0 ? x.dueDate : "Paid") + "</td><td>" +
      (x.bal > 0 ? "<button class='btn' style='background:#2563eb;' onclick='pay(" + x.id + ")'>Pay</button>" : "") +
      (x.bal > 0 && x.rate > 0 ? "<button class='btn' style='background:#d97706;' onclick='addInt(" + x.id + ")'>+Int</button>" : "") +
      "<button class='btn' style='background:#7c3aed;' onclick='oldMonth(" + x.id + ")'>+Old Month</button>" +
      "<button class='btn' style='background:#0891b2;' onclick='hist(" + x.id + ")'>History</button>" +
      "<button class='btn' style='background:#dc2626;' onclick='del(" + x.id + ")'>X</button></td></tr>";
  });
  document.getElementById("listBody").innerHTML = rows;
  document.getElementById("remBox").innerHTML = rem || "No dues today.";
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

show();
