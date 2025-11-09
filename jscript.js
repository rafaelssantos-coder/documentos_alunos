const API_URL = "https://script.google.com/macros/s/AKfycbwJDYQ9bQm3_mOn5cPQVdzAAkKYAWdDnwb_K3SyTpn5mj-Ibld2jXRXDSvmftSV9Hzh/exec";

let allFiles = [];
let statuses = [];
let currentTab = "arquivos";
let currentPage = 1;
const filesPerPage = 10;

// Carrega arquivos da API
async function loadFiles() {
  const statusElem = document.getElementById('status');
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Erro ao acessar API: " + res.status);
    allFiles = await res.json();

    // Tenta recuperar status salvos
    const saved = JSON.parse(localStorage.getItem("fileStatuses") || "null");
    if (saved && saved.length === allFiles.length) {
      statuses = saved;
    } else {
      statuses = new Array(allFiles.length).fill("pendente");
    }

    statusElem.textContent = `Encontrados ${allFiles.length} arquivo(s).`;
    renderFiles();
  } catch (err) {
    statusElem.textContent = "Erro: " + err.message;
  }
}

// Salva no localStorage
function saveStatuses() {
  localStorage.setItem("fileStatuses", JSON.stringify(statuses));
}

// Renderiza arquivos filtrados e paginados
function renderFiles() {
  const ul = document.getElementById('files');
  const searchTerm = document.getElementById('searchBox').value.toLowerCase();
  ul.innerHTML = "";

  let filtered = allFiles.map((f, i) => ({ ...f, index: i }));

  // 🔍 Busca global
  if (searchTerm) {
    filtered = filtered.filter(f => f.name.toLowerCase().includes(searchTerm));
  } else {
    // 📂 Filtro de abas
    filtered = filtered.filter(f => {
      const st = statuses[f.index];
      if (currentTab === "arquivos") return true;
      if (currentTab === "pendente") return st === "pendente";
      if (currentTab === "validado") return st === "validado";
      if (currentTab === "erro") return st === "erro";
      if (currentTab === "invalido") return st === "invalido";
      return true;
    });
  }

  // Paginação
  const totalPages = Math.ceil(filtered.length / filesPerPage);
  if (currentPage > totalPages) currentPage = 1;
  const start = (currentPage - 1) * filesPerPage;
  const paginated = filtered.slice(start, start + filesPerPage);

  // Renderiza cada arquivo
  paginated.forEach(f => {
    const i = f.index;
    const li = document.createElement('li');
    const fileInfo = document.createElement('div');
    fileInfo.className = "file-info";

    const a = document.createElement('a');
    a.href = f.url;
    a.textContent = f.name;
    a.target = "_blank";

    const meta = document.createElement('div');
    meta.className = "meta";
    meta.textContent = `${f.mimeType} — ${f.size} bytes`;

    fileInfo.appendChild(a);
    fileInfo.appendChild(meta);
    li.appendChild(fileInfo);

    // ✅ Radios de status
    ["validado", "erro", "invalido"].forEach(val => {
      const div = document.createElement('div');
      div.className = "checkbox-group";

      const input = document.createElement('input');
      input.type = "radio";
      input.name = "status_" + i;
      input.value = val;
      input.checked = statuses[i] === val;

      input.addEventListener("change", () => {
        statuses[i] = val;
        saveStatuses(); // 💾 salva no localStorage
        updateStats();
        renderFiles();
      });

      div.appendChild(input);
      li.appendChild(div);
    });

    ul.appendChild(li);
    ul.appendChild(document.createElement('hr'));
  });

  renderPagination(totalPages);
  updateStats();
}

// Renderiza botões de página
function renderPagination(totalPages) {
  let paginationDiv = document.getElementById("pagination");
  if (!paginationDiv) {
    paginationDiv = document.createElement("div");
    paginationDiv.id = "pagination";
    paginationDiv.style.display = "flex";
    paginationDiv.style.justifyContent = "center";
    paginationDiv.style.gap = "8px";
    paginationDiv.style.marginTop = "15px";
    document.querySelector(".conteudo").appendChild(paginationDiv);
  }
  paginationDiv.innerHTML = "";

  if (totalPages <= 1) return;

  const prev = document.createElement("button");
  prev.textContent = "← Anterior";
  prev.disabled = currentPage === 1;
  prev.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderFiles();
    }
  });
  paginationDiv.appendChild(prev);

  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.style.padding = "6px 12px";
    btn.style.borderRadius = "6px";
    btn.style.border = "1px solid #ccc";
    btn.style.cursor = "pointer";
    if (p === currentPage) {
      btn.style.backgroundColor = "#11228d";
      btn.style.color = "#fff";
    }
    btn.addEventListener("click", () => {
      currentPage = p;
      renderFiles();
    });
    paginationDiv.appendChild(btn);
  }

  const next = document.createElement("button");
  next.textContent = "Próxima →";
  next.disabled = currentPage === totalPages;
  next.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderFiles();
    }
  });
  paginationDiv.appendChild(next);
}

// Atualiza contadores
function updateStats() {
  const counts = { pendente: 0, validado: 0, erro: 0, invalido: 0 };
  statuses.forEach(st => counts[st]++);
  document.getElementById('stats').innerHTML = `
    <span>Pendentes: ${counts.pendente}</span>
    <span>Validados: ${counts.validado}</span>
    <span>Com Erro: ${counts.erro}</span>
    <span>Inválidos: ${counts.invalido}</span>`;
}

// Troca de abas
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    currentPage = 1;
    renderFiles();
  });
});

// Busca
document.getElementById('searchBox').addEventListener('input', () => {
  currentPage = 1;
  renderFiles();
});

loadFiles();