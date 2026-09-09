"use strict";

var TAXA_IVA = 1.23;
var STORAGE_KEY = "grafisantos_dados";

function parseNum(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (!v && v !== 0) return 0;
  var n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) ? n : 0;
}
function moeda(v) {
  return parseNum(v).toFixed(2).replace(".", ",") + " €";
}
function gerarId() {
  return Date.now() + "_" + Math.random().toString(36).slice(2, 6);
}

var DADOS_PADRAO = {
  fornecedores: [
    { id: "f1", nome: "Roly", portes: 4.50, materiais: [
      { id: "m1", nome: "T-Shirt Beagle 150g", preco: 1.85 },
      { id: "m2", nome: "Polo Star 200g", preco: 5.20 },
      { id: "m3", nome: "Hoodie Capuz Capuchana", preco: 9.80 }
    ]},
    { id: "f2", nome: "Makito", portes: 6.00, materiais: [
      { id: "m4", nome: "T-Shirt Tecnic Sport", preco: 1.45 },
      { id: "m5", nome: "Saco Algodão Tabela", preco: 0.95 }
    ]},
    { id: "f3", nome: "Levantar em Loja", portes: 0, materiais: [
      { id: "m6", nome: "Material do Cliente", preco: 0 }
    ]}
  ],
  tecnicas: [
    { id: "t1", nome: "DTF", custoMetro: 5.50, altura: 10, largura: 28, numCores: 1 },
    { id: "t2", nome: "Vinil Flex", custoMetro: 6.50, altura: 10, largura: 28, numCores: 1 },
    { id: "t3", nome: "Sublimação", custoMetro: 4.50, altura: 10, largura: 28, numCores: 1 },
    { id: "t4", nome: "Serigrafia", custoMetro: 0, altura: 10, largura: 0, numCores: 1 },
    { id: "t5", nome: "Bordado", custoMetro: 0, altura: 10, largura: 0, numCores: 1 }
  ]
};

var dados = null;
var fornecedorId = null;
var materialId = null;
var tecnicaId = null;

function carregarDados() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.fornecedores && parsed.tecnicas) {
        dados = parsed;
        return;
      }
    }
  } catch (e) {}
  dados = JSON.parse(JSON.stringify(DADOS_PADRAO));
  guardarDados();
}
function guardarDados() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch (e) {}
}

function obterFornecedor(id) {
  return dados.fornecedores.find(function(f) { return f.id === id; });
}
function obterMaterial(id) {
  var f = obterFornecedor(fornecedorId);
  if (!f) return null;
  return f.materiais.find(function(m) { return m.id === id; });
}
function obterTecnica(id) {
  return dados.tecnicas.find(function(t) { return t.id === id; });
}

// ==================== FORNECEDORES ====================
function renderFornecedores() {
  var sel = document.getElementById("selFornecedor");
  if (!sel) return;
  sel.innerHTML = "";
  dados.fornecedores.forEach(function(f) {
    var opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.nome + " (Portes: " + parseNum(f.portes).toFixed(2) + " €)";
    sel.appendChild(opt);
  });
  if (!fornecedorId || !obterFornecedor(fornecedorId)) {
    fornecedorId = dados.fornecedores[0] ? dados.fornecedores[0].id : null;
  }
  if (fornecedorId) sel.value = fornecedorId;
  var f = obterFornecedor(fornecedorId);
  var el = document.getElementById("portesFornecedor");
  if (el && f) el.value = parseNum(f.portes).toFixed(2);
  renderMateriais();
}

function abrirFormFornecedor(editar) {
  var f = obterFornecedor(fornecedorId);
  document.getElementById("formFornecedor").classList.remove("hidden");
  document.getElementById("tituloFornecedor").textContent = editar ? "Editar fornecedor" : "Novo fornecedor";
  document.getElementById("editFornecedorId").value = editar && f ? f.id : "";
  document.getElementById("inputNomeFornecedor").value = editar && f ? f.nome : "";
  document.getElementById("inputPortesFornecedor").value = editar && f ? parseNum(f.portes) : "";
}
function fecharFormFornecedor() {
  document.getElementById("formFornecedor").classList.add("hidden");
}
function guardarFornecedor() {
  var nome = document.getElementById("inputNomeFornecedor").value.trim();
  if (!nome) { alert("Indica o nome do fornecedor."); return; }
  var portes = Math.max(0, parseNum(document.getElementById("inputPortesFornecedor").value));
  var eid = document.getElementById("editFornecedorId").value;
  if (eid) {
    var f = obterFornecedor(eid);
    if (f) { f.nome = nome; f.portes = portes; }
  } else {
    var novo = { id: gerarId(), nome: nome, portes: portes, materiais: [] };
    dados.fornecedores.push(novo);
    fornecedorId = novo.id;
  }
  guardarDados();
  fecharFormFornecedor();
  renderFornecedores();
}
function eliminarFornecedor() {
  if (!fornecedorId) return;
  if (dados.fornecedores.length <= 1) { alert("É necessário manter pelo menos um fornecedor."); return; }
  var f = obterFornecedor(fornecedorId);
  if (!confirm("Eliminar \"" + (f ? f.nome : "") + "\"?")) return;
  dados.fornecedores = dados.fornecedores.filter(function(x) { return x.id !== fornecedorId; });
  fornecedorId = null;
  materialId = null;
  guardarDados();
  renderFornecedores();
}

// ==================== MATERIAIS ====================
function renderMateriais() {
  var sel = document.getElementById("selMaterial");
  if (!sel) return;
  sel.innerHTML = "";
  var f = obterFornecedor(fornecedorId);
  if (!f || !f.materiais || !f.materiais.length) {
    sel.innerHTML = '<option value="">Nenhum material</option>';
    materialId = null;
    document.getElementById("footerMaterial").textContent = "Nenhum";
    document.getElementById("footerPreco").textContent = "0,00 €";
    calcular();
    return;
  }
  f.materiais.forEach(function(m) {
    var opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.nome + " (" + parseNum(m.preco).toFixed(2) + " €)";
    sel.appendChild(opt);
  });
  if (!materialId || !obterMaterial(materialId)) {
    materialId = f.materiais[0] ? f.materiais[0].id : null;
  }
  if (materialId) sel.value = materialId;
  var m = obterMaterial(materialId);
  if (m) {
    document.getElementById("custoPeca").value = parseNum(m.preco).toFixed(2);
    document.getElementById("footerMaterial").textContent = m.nome + (f ? " (" + f.nome + ")" : "");
    document.getElementById("footerPreco").textContent = moeda(m.preco) + " s/IVA";
  }
  calcular();
}

function abrirFormMaterial(editar) {
  var m = obterMaterial(materialId);
  document.getElementById("formMaterial").classList.remove("hidden");
  document.getElementById("tituloMaterial").textContent = editar ? "Editar material" : "Novo material";
  document.getElementById("editMaterialId").value = editar && m ? m.id : "";
  document.getElementById("inputNomeMaterial").value = editar && m ? m.nome : "";
  document.getElementById("inputPrecoMaterial").value = editar && m ? parseNum(m.preco) : "";
}
function fecharFormMaterial() {
  document.getElementById("formMaterial").classList.add("hidden");
}
function guardarMaterial() {
  var f = obterFornecedor(fornecedorId);
  if (!f) return;
  var nome = document.getElementById("inputNomeMaterial").value.trim();
  if (!nome) { alert("Indica o nome do material."); return; }
  var preco = Math.max(0, parseNum(document.getElementById("inputPrecoMaterial").value));
  var eid = document.getElementById("editMaterialId").value;
  if (eid) {
    var m = f.materiais.find(function(x) { return x.id === eid; });
    if (m) { m.nome = nome; m.preco = preco; }
    materialId = eid;
  } else {
    var novo = { id: gerarId(), nome: nome, preco: preco };
    f.materiais.push(novo);
    materialId = novo.id;
  }
  guardarDados();
  fecharFormMaterial();
  renderMateriais();
}
function eliminarMaterial() {
  var f = obterFornecedor(fornecedorId);
  if (!f) return;
  if (!materialId) return;
  var m = f.materiais.find(function(x) { return x.id === materialId; });
  if (!confirm("Eliminar \"" + (m ? m.nome : "") + "\"?")) return;
  f.materiais = f.materiais.filter(function(x) { return x.id !== materialId; });
  materialId = null;
  guardarDados();
  renderMateriais();
}

// ==================== TÉCNICAS ====================
function renderTecnicas() {
  var sel = document.getElementById("selTecnica");
  if (!sel) return;
  sel.innerHTML = "";
  dados.tecnicas.forEach(function(t) {
    var opt = document.createElement("option");
    opt.value = t.id;
    var label = t.nome;
    if (t.largura > 0) label += " (" + parseNum(t.largura).toFixed(0) + "cm)";
    opt.textContent = label;
    sel.appendChild(opt);
  });
  if (!tecnicaId || !obterTecnica(tecnicaId)) {
    tecnicaId = dados.tecnicas[0] ? dados.tecnicas[0].id : null;
  }
  if (tecnicaId) sel.value = tecnicaId;
  atualizarInfoTecnica();
  calcular();
}

function atualizarInfoTecnica() {
  var t = obterTecnica(tecnicaId);
  document.getElementById("footerTecnica").textContent = t ? t.nome : "Nenhuma";
  document.getElementById("infoTecNome").textContent = t ? "📌 " + t.nome : "Nenhuma técnica selecionada";
  var detalhes = [];
  if (t) {
    if (t.custoMetro > 0) detalhes.push("€" + parseNum(t.custoMetro).toFixed(2) + "/m");
    if (t.largura > 0) detalhes.push("Larg: " + parseNum(t.largura).toFixed(0) + "cm");
    if (t.altura > 0) detalhes.push("Alt: " + parseNum(t.altura).toFixed(0) + "cm");
    if (t.numCores > 1) detalhes.push(t.numCores + " cores");
  }
  document.getElementById("infoTecDetalhes").textContent = detalhes.length ? " (" + detalhes.join(" | ") + ")" : "";
}

function abrirFormTecnica(editar) {
  var t = obterTecnica(tecnicaId);
  document.getElementById("formTecnica").classList.remove("hidden");
  document.getElementById("tituloTecnica").textContent = editar ? "Editar técnica" : "Nova técnica";
  document.getElementById("editTecnicaId").value = editar && t ? t.id : "";
  document.getElementById("inputNomeTecnica").value = editar && t ? t.nome : "";
  document.getElementById("inputCustoMetro").value = editar && t ? parseNum(t.custoMetro) : "";
  document.getElementById("inputAlturaTecnica").value = editar && t ? parseNum(t.altura) : "";
  document.getElementById("inputLarguraTecnica").value = editar && t ? parseNum(t.largura) : "";
  document.getElementById("inputCoresTecnica").value = editar && t ? (t.numCores || 1) : 1;
}
function fecharFormTecnica() {
  document.getElementById("formTecnica").classList.add("hidden");
}
function guardarTecnica() {
  var nome = document.getElementById("inputNomeTecnica").value.trim();
  if (!nome) { alert("Indica o nome da técnica."); return; }
  var custoMetro = parseNum(document.getElementById("inputCustoMetro").value);
  var altura = parseNum(document.getElementById("inputAlturaTecnica").value);
  var largura = parseNum(document.getElementById("inputLarguraTecnica").value);
  var numCores = Math.max(1, parseInt(document.getElementById("inputCoresTecnica").value) || 1);
  var eid = document.getElementById("editTecnicaId").value;
  if (eid) {
    var t = obterTecnica(eid);
    if (t) { t.nome = nome; t.custoMetro = custoMetro; t.altura = altura; t.largura = largura; t.numCores = numCores; }
  } else {
    var novo = { id: gerarId(), nome: nome, custoMetro: custoMetro, altura: altura, largura: largura, numCores: numCores };
    dados.tecnicas.push(novo);
    tecnicaId = novo.id;
  }
  guardarDados();
  fecharFormTecnica();
  renderTecnicas();
}
function eliminarTecnica() {
  if (!tecnicaId) return;
  if (dados.tecnicas.length <= 1) { alert("É necessário manter pelo menos uma técnica."); return; }
  var t = obterTecnica(tecnicaId);
  if (!confirm("Eliminar \"" + (t ? t.nome : "") + "\"?")) return;
  dados.tecnicas = dados.tecnicas.filter(function(x) { return x.id !== tecnicaId; });
  tecnicaId = null;
  guardarDados();
  renderTecnicas();
}

// ==================== CÁLCULOS ====================
function calcularConsumo(qtd, metro, alt, larg, bobina) {
  qtd = Math.max(1, parseInt(qtd) || 1);
  var area = (Math.max(0, parseNum(alt)) / 100) * (Math.max(0, parseNum(larg)) / 100) * qtd * 1.05;
  var metros = area / (bobina / 100);
  return { custoUn: (metros * Math.max(0, parseNum(metro)) * TAXA_IVA) / qtd, metrosTotais: metros, escala: 1 };
}

function obterCustoImpressao(qtd, tecId) {
  var t = obterTecnica(tecId);
  if (!t) return { custoUn: 0, metros: 0, escala: 1 };
  var alt = parseNum(document.getElementById("alturaEstampa").value) || 10;
  var larg = parseNum(document.getElementById("larguraEstampa").value) || 28;
  var cores = t.numCores || 1;
  var nome = (t.nome || "").toLowerCase();

  if (t.custoMetro > 0 && alt > 0 && larg > 0) {
    var bobina = 28;
    if (nome.indexOf("vinil") !== -1) bobina = 50;
    else if (nome.indexOf("sublimação") !== -1 || nome.indexOf("sublimacao") !== -1) bobina = 58;
    var res = calcularConsumo(qtd, t.custoMetro, alt, larg, bobina);
    return { custoUn: res.custoUn, metros: res.metrosTotais, escala: res.escala };
  }

  if (nome.indexOf("serigrafia") !== -1) {
    var escSerigrafia = [
      { min: 1, max: 9, precos: [8, 10, 12] },
      { min: 10, max: 24, precos: [3.5, 4.5, 5.5] },
      { min: 25, max: 49, precos: [2.2, 2.8, 3.4] },
      { min: 50, max: 99, precos: [1.5, 1.9, 2.3] },
      { min: 100, max: Infinity, precos: [1, 1.3, 1.6] }
    ];
    var e = escSerigrafia.find(function(x) { return qtd >= x.min && qtd <= x.max; }) || escSerigrafia[0];
    var idx = Math.max(0, Math.min(2, cores - 1));
    return { custoUn: e.precos[idx] * TAXA_IVA, metros: 0, escala: e.min };
  }

  if (nome.indexOf("bordado") !== -1) {
    var escBordado = [
      { min: 1, max: 9, precos: [6, 8] },
      { min: 10, max: 24, precos: [3.8, 5] },
      { min: 25, max: 49, precos: [2.5, 3.5] },
      { min: 50, max: Infinity, precos: [1.8, 2.5] }
    ];
    var e2 = escBordado.find(function(x) { return qtd >= x.min && qtd <= x.max; }) || escBordado[0];
    var idx2 = cores > 1 ? 1 : 0;
    return { custoUn: e2.precos[idx2] * TAXA_IVA, metros: 0, escala: e2.min };
  }

  if (t.custoMetro > 0) {
    var res2 = calcularConsumo(qtd, t.custoMetro, alt || 10, larg || 28, 28);
    return { custoUn: res2.custoUn, metros: res2.metrosTotais, escala: res2.escala };
  }

  return { custoUn: 0, metros: 0, escala: 1 };
}

function calcularMargem(qtd, valor, tipo, custo) {
  var v = parseNum(valor);
  if (tipo === "percentagem") return Math.max(0, custo * (v / 100));
  var m = v;
  if (qtd >= 100) m -= 3.50;
  else if (qtd >= 50) m -= 2.50;
  else if (qtd >= 25) m -= 1.50;
  else if (qtd >= 10) m -= 0.50;
  else if (qtd >= 5) m -= 0.20;
  return Math.max(0, m);
}

function calcular() {
  try {
    var qtd = Math.max(1, parseInt(document.getElementById("quantidade").value) || 1);
    var custoPeca = parseNum(document.getElementById("custoPeca").value);
    var portes = parseNum(document.getElementById("portesFornecedor").value);
    var tecId = document.getElementById("selTecnica").value;
    var tipoMargem = document.getElementById("tipoMargem").value;
    var margem = parseNum(document.getElementById("valMargem").value);

    if (!tecId || !obterTecnica(tecId)) {
      document.getElementById("resPrecoUn").textContent = "0,00 €";
      document.getElementById("resTotalComercial").textContent = "0,00 €";
      return;
    }

    var imp = obterCustoImpressao(qtd, tecId);
    var pIva = custoPeca * TAXA_IVA;
    var portesIva = portes * TAXA_IVA;
    var custoUn = pIva + imp.custoUn + (portesIva / qtd);
    var lucro = calcularMargem(qtd, margem, tipoMargem, custoUn);
    var venda = custoUn + lucro;

    document.getElementById("resPrecoUn").textContent = moeda(venda);
    document.getElementById("resTotalComercial").textContent = moeda(venda * qtd);
    document.getElementById("resCustoMaterial").textContent = moeda(pIva);
    document.getElementById("resCustoImpr").textContent = moeda(imp.custoUn);
    document.getElementById("resPortes").textContent = moeda(portesIva);
    document.getElementById("resCustoTotal").textContent = moeda(custoUn * qtd);
    document.getElementById("resLucroUn").textContent = moeda(lucro);
    document.getElementById("resLucroTotal").textContent = moeda(lucro * qtd);
    document.getElementById("escalaoBadge").textContent = "Escalão ≥ " + imp.escala + " un";

    var t = obterTecnica(tecId);
    var linha = document.getElementById("linhaConsumo");
    if (linha) {
      if (t && t.custoMetro > 0) {
        linha.style.display = "flex";
        document.getElementById("labelConsumo").textContent = "Consumo " + t.nome + ":";
        document.getElementById("resConsumo").textContent = imp.metros.toFixed(2).replace(".", ",") + " m";
      } else {
        linha.style.display = "none";
      }
    }

    gerarComparativo(qtd, pIva, portesIva, tecId, tipoMargem, margem);
  } catch (e) {
    console.log("Erro calcular:", e);
  }
}

function gerarComparativo(qAtual, pIva, portesIva, tecId, tipoMargem, margem) {
  var el = document.getElementById("tabelaComparativa");
  if (!el) return;
  el.innerHTML = "";
  [1, 10, 25, 50, 100].forEach(function(q) {
    var imp = obterCustoImpressao(q, tecId);
    var custo = pIva + imp.custoUn + (portesIva / q);
    var lucro = calcularMargem(q, margem, tipoMargem, custo);
    var div = document.createElement("div");
    div.className = "escalao-item" + (q === qAtual ? " active" : "");
    div.innerHTML = "<strong>" + q + "+</strong><br>" + moeda(custo + lucro);
    el.appendChild(div);
  });
}

// ==================== UTILITÁRIOS ====================
function copiarResumo() {
  var q = document.getElementById("quantidade").value;
  var sel = document.getElementById("selTecnica");
  var tec = sel && sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0].text : "";
  var mat = document.getElementById("footerMaterial").textContent;
  var txt = "GrafiSantos Print\n" +
    "Artigo: " + mat + "\n" +
    "Quantidade: " + q + "\n" +
    "Técnica: " + tec + "\n" +
    "Preço/un.: " + document.getElementById("resPrecoUn").textContent + "\n" +
    "Total: " + document.getElementById("resTotalComercial").textContent + "\n" +
    "Lucro total: " + document.getElementById("resLucroTotal").textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function() { alert("Resumo copiado."); }).catch(function() { prompt("Copia:", txt); });
  } else {
    prompt("Copia:", txt);
  }
}

function gerarPDF() {
  if (typeof html2pdf === "undefined") { window.print(); return; }
  var el = document.getElementById("areaParaPdf");
  if (!el) return;
  html2pdf().set({
    margin: 8,
    filename: "GrafiSantos-Calculadora.pdf",
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  }).from(el).save();
}

// ==================== EVENTOS ====================
function ligarEventos() {
  function addEvent(el, fn) {
    if (!el) return;
    el.addEventListener('click', fn);
    el.addEventListener('touchstart', function(e) {
      if (!e.target._clicked) {
        e.target._clicked = true;
        fn(e);
        setTimeout(function() { e.target._clicked = false; }, 300);
      }
    });
  }

  function addChange(el, fn) {
    if (!el) return;
    el.addEventListener('change', fn);
    el.addEventListener('input', fn);
  }

  // Fornecedores
  addChange(document.getElementById("selFornecedor"), function(e) {
    fornecedorId = e.target.value;
    materialId = null;
    renderMateriais();
  });
  addEvent(document.getElementById("btnAddFornecedor"), function() { abrirFormFornecedor(false); });
  addEvent(document.getElementById("btnEditFornecedor"), function() { abrirFormFornecedor(true); });
  addEvent(document.getElementById("btnDelFornecedor"), eliminarFornecedor);
  addEvent(document.getElementById("btnSaveFornecedor"), guardarFornecedor);
  addEvent(document.getElementById("btnCancelFornecedor"), fecharFormFornecedor);

  // Materiais
  addChange(document.getElementById("selMaterial"), function(e) {
    materialId = e.target.value;
    renderMateriais();
  });
  addEvent(document.getElementById("btnAddMaterial"), function() { abrirFormMaterial(false); });
  addEvent(document.getElementById("btnEditMaterial"), function(