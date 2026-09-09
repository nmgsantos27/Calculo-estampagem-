"use strict";

// Função de segurança para mostrar erros visíveis no telemóvel
window.onerror = function(msg, url, line) {
  let debugDiv = document.getElementById("debugErroMovil");
  if (!debugDiv) {
    debugDiv = document.createElement("div");
    debugDiv.id = "debugErroMovil";
    debugDiv.style.background = "#fee2e2";
    debugDiv.style.color = "#dc2626";
    debugDiv.style.padding = "10px";
    debugDiv.style.margin = "10px";
    debugDiv.style.borderRadius = "6px";
    debugDiv.style.fontSize = "0.85rem";
    document.body.prepend(debugDiv);
  }
  debugDiv.innerHTML = `<strong>Erro JS:</strong> ${msg} (Linha: ${line})`;
};

const TAXA_IVA = 1.23;
const STORAGE_KEY = "baseDadosGrafiSantos";

function parseNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function moeda(v) { return parseNum(v).toFixed(2).replace(".", ",") + " €"; }
function id(prefix) { return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2,7); }

const memoriaTecnicas = {
  dtf: { custoMetro: 5.50, altura: 10, largura: 28 },
  vinil: { custoMetro: 6.50, altura: 10, largura: 28 },
  sublimacao: { custoMetro: 4.50, altura: 10, largura: 28 },
  serigrafia: { numCores: 1 },
  bordado: { numCores: 1 }
};

const BASE_DADOS_PADRAO = [
  {id:"f1", nome:"Roly", portes:4.50, materiais:[
    {id:"m1_1",nome:"T-Shirt Beagle 150g",preco:1.85},
    {id:"m1_2",nome:"Polo Star 200g",preco:5.20},
    {id:"m1_3",nome:"Hoodie Capuz Capuchana",preco:9.80}
  ]},
  {id:"f2", nome:"Makito", portes:6.00, materiais:[
    {id:"m2_1",nome:"T-Shirt Tecnic Sport",preco:1.45},
    {id:"m2_2",nome:"Saco Algodão Tabela",preco:0.95}
  ]},
  {id:"f3", nome:"Levantar em Loja / Sem Portes", portes:0, materiais:[
    {id:"m3_1",nome:"Material do Cliente",preco:0}
  ]}
];

const TECNICAS = {
  dtf: { bobina:28, obterCusto(q, m, a, l) { return custoMetro(q, m, a, l, 28); } },
  vinil: { bobina:50, obterCusto(q, m, a, l) { return custoMetro(q, m, a, l, 50); } },
  sublimacao: { bobina:58, obterCusto(q, m, a, l) { return custoMetro(q, m, a, l, 58); } },
  serigrafia: {
    escaloes: [
      {min:1,max:9,precos:[8,10,12]},
      {min:10,max:24,precos:[3.5,4.5,5.5]},
      {min:25,max:49,precos:[2.2,2.8,3.4]},
      {min:50,max:99,precos:[1.5,1.9,2.3]},
      {min:100,max:Infinity,precos:[1,1.3,1.6]}
    ],
    obterCusto(qtd, cores) {
      const e = this.escaloes.find(x=>qtd>=x.min && qtd<=x.max)||this.escaloes[0];
      const idx = Math.max(0,Math.min(2,(parseInt(cores)||1)-1));
      return {custoUnComIva:e.precos[idx]*TAXA_IVA, minEscalao:e.min, metrosTotais:0};
    }
  },
  bordado: {
    escaloes: [
      {min:1,max:9,precos:[6,8]},
      {min:10,max:24,precos:[3.8,5]},
      {min:25,max:49,precos:[2.5,3.5]},
      {min:50,max:Infinity,precos:[1.8,2.5]}
    ],
    obterCusto(qtd, cores) {
      const e = this.escaloes.find(x=>qtd>=x.min && qtd<=x.max)||this.escaloes[0];
      const idx = (parseInt(cores)||1)>1?1:0;
      return {custoUnComIva:e.precos[idx]*TAXA_IVA, minEscalao:e.min, metrosTotais:0};
    }
  }
};

function custoMetro(qtd, metro, alt, larg, bobina) {
  qtd = Math.max(1,parseInt(qtd)||1);
  const area = (Math.max(0,parseNum(alt))/100)*(Math.max(0,parseNum(larg))/100)*qtd*1.05;
  const metros = area/(bobina/100);
  return {custoUnComIva:(metros*Math.max(0,parseNum(metro))*TAXA_IVA)/qtd, metrosTotais:metros, minEscalao:1};
}

let baseDados = [];
let fornecedorSelecionadoId = null;
let materialSelecionadoId = null;
let tecnicaAnterior = "dtf";

function carregarBD() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    baseDados = Array.isArray(data) ? data : structuredClone(BASE_DADOS_PADRAO);
  } catch(e) {
    baseDados = structuredClone(BASE_DADOS_PADRAO);
  }
  guardarBD();
}
function guardarBD() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(baseDados)); } catch(e) {}
}

function atualizarSelectsDinamicos() {
  const sf = document.getElementById("seletorFornecedorBD");
  if (!sf) return;
  sf.innerHTML = "";
  if (!baseDados.length) {
    sf.innerHTML = '<option value="">Nenhum fornecedor</option>';
    atualizarSelectMateriaisDinamicos([]);
    return;
  }
  baseDados.forEach(f => {
    const o = document.createElement("option");
    o.value = f.id;
    o.textContent = `${f.nome} (Portes: ${parseNum(f.portes).toFixed(2)} €)`;
    sf.appendChild(o);
  });
  if (!fornecedorSelecionadoId || !baseDados.some(f => f.id === fornecedorSelecionadoId)) {
    fornecedorSelecionadoId = baseDados[0].id;
  }
  sf.value = fornecedorSelecionadoId;
  const f = baseDados.find(x => x.id === fornecedorSelecionadoId);
  const elPortes = document.getElementById("portesFornecedor");
  if (elPortes) elPortes.value = parseNum(f?.portes).toFixed(2);
  atualizarSelectMateriaisDinamicos(f?.materiais || []);
}

function atualizarSelectMateriaisDinamicos(materiais) {
  const sm = document.getElementById("seletorMaterialBD");
  if (!sm) return;
  sm.innerHTML = "";
  if (!materiais.length) {
    sm.innerHTML = '<option value="">Nenhum material</option>';
    materialSelecionadoId = null;
    document.getElementById("nomeMaterialAtivo").textContent = "Manual";
    document.getElementById("detalheMaterialAtivo").textContent = "0,00 € s/ IVA";
    calcular();
    return;
  }
  materiais.forEach(m => {
    const o = document.createElement("option");
    o.value = m.id;
    o.textContent = `${m.nome} (${parseNum(m.preco).toFixed(2)} €)`;
    sm.appendChild(o);
  });
  if (!materialSelecionadoId || !materiais.some(m => m.id === materialSelecionadoId)) {
    materialSelecionadoId = materiais[0].id;
  }
  sm.value = materialSelecionadoId;
  const f = baseDados.find(x => x.id === fornecedorSelecionadoId);
  const m = materiais.find(x => x.id === materialSelecionadoId);
  if (m) {
    const elCusto = document.getElementById("custoPeca");
    if (elCusto) elCusto.value = parseNum(m.preco).toFixed(2);
    document.getElementById("nomeMaterialAtivo").textContent = `${m.nome}${f?" ("+f.nome+")":""}`;
    document.getElementById("detalheMaterialAtivo").textContent = `${moeda(m.preco)} s/ IVA`;
  }
  calcular();
}

function margemPorUnidade(qtd, valor, tipo, custo) {
  if (tipo === "percentagem") return Math.max(0, custo * (valor / 100));
  let m = valor;
  if (qtd >= 100) m -= 3.50;
  else if (qtd >= 50) m -= 2.50;
  else if (qtd >= 25) m -= 1.50;
  else if (qtd >= 10) m -= 0.50;
  else if (qtd >= 5) m -= 0.20;
  return Math.max(0, m);
}

function guardarValoresTecnicaAtual(t) {
  if (!document.getElementById("tecnica")) return;
  if (["dtf", "vinil", "sublimacao"].includes(t)) {
    memoriaTecnicas[t] = {
      custoMetro: parseNum(document.getElementById("custoMetroDTF").value),
      altura: parseNum(document.getElementById("alturaEstampaDTF").value),
      largura: parseNum(document.getElementById("larguraEstampaDTF").value)
    };
  } else {
    memoriaTecnicas[t] = { numCores: Math.max(1, parseInt(document.getElementById("numCores").value) || 1) };
  }
}

function alternarTecnica() {
  const t = document.getElementById("tecnica")?.value;
  if (!t) return;
  guardarValoresTecnicaAtual(tecnicaAnterior);
  tecnicaAnterior = t;
  const film = ["dtf", "vinil", "sublimacao"].includes(t);
  document.getElementById("grupoDTF").classList.toggle("hidden", !film);
  document.getElementById("grupoCores").classList.toggle("hidden", film);
  document.getElementById("linhaConsumoFilme").style.display = film ? "flex" : "none";
  if (film) {
    const d = memoriaTecnicas[t];
    document.getElementById("custoMetroDTF").value = d.custoMetro;
    document.getElementById("alturaEstampaDTF").value = d.altura;
    document.getElementById("larguraEstampaDTF").value = d.largura;
    const nomes = {
      dtf: ["Custo Metro DTF (28cm) s/ IVA:", "Consumo Filme DTF:"],
      vinil: ["Custo Metro Vinil (50cm) s/ IVA:", "Consumo Vinil Flex:"],
      sublimacao: ["Custo Metro Sublimação (58cm) s/ IVA:", "Consumo Papel Sublimação:"]
    };
    document.getElementById("labelCustoMetro").textContent = nomes[t][0];
    document.getElementById("labelConsumoFilme").textContent = nomes[t][1];
  } else {
    document.getElementById("numCores").value = memoriaTecnicas[t].numCores || 1;
  }
  calcular();
}

function obterCustoPara(qtd, tecnica) {
  const c = TECNICAS[tecnica];
  if (["dtf", "vinil", "sublimacao"].includes(tecnica))
    return c.obterCusto(qtd, parseNum(document.getElementById("custoMetroDTF").value), parseNum(document.getElementById("alturaEstampaDTF").value), parseNum(document.getElementById("larguraEstampaDTF").value));
  return c.obterCusto(qtd, parseInt(document.getElementById("numCores").value) || 1);
}

function calcular() {
  const q = Math.max(1, parseInt(document.getElementById("quantidade")?.value) || 1);
  const p = parseNum(document.getElementById("custoPeca")?.value);
  const portes = parseNum(document.getElementById("portesFornecedor")?.value);
  const tecnica = document.getElementById("tecnica")?.value || "dtf";
  const tipo = document.getElementById("tipoMargem")?.value || "valor";
  const margem = parseNum(document.getElementById("valMargem")?.value);
  const imp = obterCustoPara(q, tecnica);
  const pIva = p * TAXA_IVA, portesIva = portes * TAXA_IVA;
  const custoUn = pIva + imp.custoUnComIva + (portesIva / q);
  const lucro = margemPorUnidade(q, margem, tipo, custoUn);
  const venda = custoUn + lucro;

  document.getElementById("resPrecoUn").textContent = moeda(venda);
  document.getElementById("resTotalComercial").textContent = moeda(venda * q);
  document.getElementById("resCustoMaterialUn").textContent = moeda(pIva);
  document.getElementById("resCustoImprUn").textContent = moeda(imp.custoUnComIva);
  document.getElementById("resPortes").textContent = moeda(portesIva);
  document.getElementById("resCustoTotalLote").textContent = moeda(custoUn * q);
  document.getElementById("resLucroUn").textContent = moeda(lucro);
  document.getElementById("resLucroTotal").textContent = moeda(lucro * q);
  document.getElementById("escalaoBadge").textContent = `Escalão ≥ ${imp.minEscalao} un`;

  if (["dtf", "vinil", "sublimacao"].includes(tecnica)) {
    document.getElementById("resConsumoFilme").textContent = `${imp.metrosTotais.toFixed(2).replace(".",",")} m`;
  }
  gerarComparativoEscaloes(q, pIva, portesIva, tecnica, tipo, margem);
}

function gerarComparativoEscaloes(qAtual, pComIva, portesIva, tecnica, tipo, margem) {
  const c = document.getElementById("tabelaComparativa");
  if (!c) return;
  c.innerHTML = "";
  [1, 10, 25, 50, 100].forEach(q => {
    const imp = obterCustoPara(q, tecnica);
    const custo = pComIva + imp.custoUnComIva + portesIva / q;
    const lucro = margemPorUnidade(q, margem, tipo, custo);
    const item = document.createElement("div");
    item.className = "escalao-item" + (q === qAtual ? " active" : "");
    item.innerHTML = `<strong>${q}+</strong><br>${moeda(custo + lucro)}`;
    c.appendChild(item);
  });
}

function abrirFormFornecedor(edit = false) {
  const f = baseDados.find(x => x.id === fornecedorSelecionadoId);
  document.getElementById("formNovoFornecedor").classList.remove("hidden");
  document.getElementById("tituloFormFornecedor").textContent = edit ? "Editar fornecedor" : "Novo fornecedor";
  document.getElementById("editFornecedorId").value = edit ? (f?.id || "") : "";
  document.getElementById("novoNomeFornecedor").value = edit ? (f?.nome || "") : "";
  document.getElementById("novoPortesFornecedor").value = edit ? parseNum(f?.portes) : "";
}
function fecharFormFornecedor() { document.getElementById("formNovoFornecedor").classList.add("hidden"); }
function guardarFornecedor() {
  const nome = document.getElementById("novoNomeFornecedor").value.trim();
  if (!nome) { alert("Indica o nome do fornecedor."); return; }
  const portes = Math.max(0, parseNum(document.getElementById("novoPortesFornecedor").value));
  const eid = document.getElementById("editFornecedorId").value;
  if (eid) {
    const f = baseDados.find(x => x.id === eid);
    if (f) { f.nome = nome; f.portes = portes; }
  } else {
    const novo = { id: id("f"), nome, portes, materiais: [] };
    baseDados.push(novo);
    fornecedorSelecionadoId = novo.id;
  }
  guardarBD();
  fecharFormFornecedor();
  materialSelecionadoId = null;
  atualizarSelectsDinamicos();
}
function eliminarFornecedor() {
  if (!fornecedorSelecionadoId) return;
  if (baseDados.length <= 1) { alert("É necessário manter pelo menos um fornecedor."); return; }
  const f = baseDados.find(x => x.id === fornecedorSelecionadoId);
  if (!confirm(`Eliminar o fornecedor "${f?.nome || ""}"?`)) return;
  baseDados = baseDados.filter(x => x.id !== fornecedorSelecionadoId);
  fornecedorSelecionadoId = null;
  materialSelecionadoId = null;
  guardarBD();
  atualizarSelectsDinamicos();
}

function abrirFormMaterial(edit = false) {
  const f = baseDados.find(x => x.id === fornecedorSelecionadoId);
  if (!f) return;
  const m = (f.materiais || []).find(x => x.id === materialSelecionadoId);
  document.getElementById("formNovoMaterial").classList.remove("hidden");
  document.getElementById("tituloFormMaterial").textContent = edit ? "Editar material" : "Novo material";
  document.getElementById("editMaterialId").value = edit ? (m?.id || "") : "";
  document.getElementById("novoNomeMaterial").value = edit ? (m?.nome || "") : "";
  document.getElementById("novoPrecoMaterial").value = edit ? parseNum(m?.preco) : "";
}
function fecharFormMaterial() { document.getElementById("formNovoMaterial").classList.add("hidden"); }
function guardarMaterial() {
  const f = baseDados.find(x => x.id === fornecedorSelecionadoId);
  if (!f) return;
  const nome = document.getElementById("novoNomeMaterial").value.trim();
  if (!nome) { alert("Indica o nome do material."); return; }
  const preco = Math.max(0, parseNum(document.getElementById("novoPrecoMaterial").value));
  const eid = document.getElementById("editMaterialId").value;
  f.materiais = f.materiais || [];
  if (eid) {
    const m = f.materiais.find(x => x.id === eid);
    if (m) { m.nome = nome; m.preco = preco; }
    materialSelecionadoId = eid;
  } else {
    const m = { id: id("m"), nome, preco };
    f.materiais.push(m);
    materialSelecionadoId = m.id;
  }
  guardarBD();
  fecharFormMaterial();
  atualizarSelectMateriaisDinamicos(f.materiais);
}
function eliminarMaterial() {
  const f = baseDados.find(x => x.id === fornecedorSelecionadoId);
  if (!f) return;
  if (!materialSelecionadoId) return;
  const m = (f.materiais || []).find(x => x.id === materialSelecionadoId);
  if (!confirm(`Eliminar o material "${m?.nome || ""}"?`)) return;
  f.materiais = (f.materiais || []).filter(x => x.id !== materialSelecionadoId);
  materialSelecionadoId = null;
  guardarBD();
  atualizarSelectMateriaisDinamicos(f.materiais);
}

function resumoTexto() {
  const q = document.getElementById("quantidade").value;
  const selTec = document.getElementById("tecnica");
  const t = selTec && selTec.selectedOptions[0] ? selTec.selectedOptions[0].text : "";
  const mat = document.getElementById("nomeMaterialAtivo").textContent;
  return `GrafiSantos Print\nArtigo: ${mat}\nQuantidade: ${q}\nTécnica: ${t}\nPreço/un.: ${document.getElementById("resPrecoUn").textContent}\nTotal: ${document.getElementById("resTotalComercial").textContent}\nLucro total: ${document.getElementById("resLucroTotal").textContent}`;
}
async function copiarResumo() {
  const txt = resumoTexto();
  try { await navigator.clipboard.writeText(txt); alert("Resumo copiado."); }
  catch (e) { prompt("Copia o resumo:", txt); }
}
function guardarPDF() {
  if (typeof html2pdf === "undefined") { window.print(); return; }
  const el = document.getElementById("areaParaPdf");
  html2pdf().set({
    margin: 8, filename: "GrafiSantos-Calculadora.pdf",
    image: { type: "jpeg", quality: .95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  }).from(el).save();
}
function imprimir() { window.print(); }

function ligarEventos() {
  const acao = (idv, tipo, fn) => {
    const el = document.getElementById(idv);
    if (el) el.addEventListener(tipo, fn);
  };

  acao("seletorFornecedorBD", "change", e => {
    fornecedorSelecionadoId = e.target.value;
    materialSelecionadoId = null;
    atualizarSelectsDinamicos();
  });
  
  acao("seletorMaterialBD", "change", e => {
    materialSelecionadoId = e.target.value;
    const f = baseDados.find(x => x.id === fornecedorSelecionadoId);
    atualizarSelectMateriaisDinamicos(f?.materiais || []);
  });

  // Usar 'click' standard com pointer events desinibidos no CSS garante compatibilidade móvel total
  acao("btnNovoForn", "click", () => abrirFormFornecedor(false));
  acao("btnEditarForn", "click", () => abrirFormFornecedor(true));
  acao("btnEliminarForn", "click", eliminarFornecedor);
  acao("btnGuardarFornBD", "click", guardarFornecedor);
  acao("btnFecharFornBD", "click", fecharFormFornecedor);

  acao("btnNovoMat", "click", () => abrirFormMaterial(false));
  acao("btnEditarMat", "click", () => abrirFormMaterial(true));
  acao("btnEliminarMat", "click", eliminarMaterial);
  acao("btnGuardarMatBD", "click", guardarMaterial);
  acao("btnFecharMatBD", "click", fecharFormMaterial);

  acao("tecnica", "change", alternarTecnica);

  ["quantidade", "custoPeca", "portesFornecedor", "custoMetroDTF", "alturaEstampaDTF", "larguraEstampaDTF", "numCores", "tipoMargem", "valMargem"]
    .forEach(x => acao(x, "input", calcular));

  acao("tipoMargem", "change", calcular);
  acao("numCores", "change", calcular);

  acao("btnCopiarResumo", "click", copiarResumo);
  acao("btnGuardarPDF", "click", guardarPDF);
  acao("btnImprimir", "click", imprimir);
}

document.addEventListener("DOMContentLoaded", () => {
  carregarBD();
  atualizarSelectsDinamicos();
  ligarEventos();
  alternarTecnica();
  calcular();
});
    
