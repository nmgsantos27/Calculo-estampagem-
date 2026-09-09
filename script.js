"use strict";

var TAXA_IVA = 1.23;
var STORAGE_KEY = "baseDadosGrafiSantos_v4";

function parseNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === "") return 0;
  var n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function moeda(v) { 
  var val = parseNum(v);
  return val.toFixed(2).replace(".", ",") + " €"; 
}
function id(prefix) { 
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2,7); 
}

var BASE_DADOS_PADRAO = {
  fornecedores: [
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
  ],
  tecnicas: [
    {id:"t1", nome:"DTF", custoMetro:5.50, altura:10, largura:28, numCores:1},
    {id:"t2", nome:"Vinil Flex", custoMetro:6.50, altura:10, largura:28, numCores:1},
    {id:"t3", nome:"Sublimação", custoMetro:4.50, altura:10, largura:28, numCores:1},
    {id:"t4", nome:"Serigrafia", custoMetro:0, altura:10, largura:0, numCores:1},
    {id:"t5", nome:"Bordado", custoMetro:0, altura:10, largura:0, numCores:1}
  ]
};

var baseDados = null;
var fornecedorSelecionadoId = null;
var materialSelecionadoId = null;
var tecnicaSelecionadaId = null;

function carregarBD() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var data = JSON.parse(raw);
      if (data && data.fornecedores && data.tecnicas) {
        baseDados = data;
        return;
      }
    }
  } catch(e) {}
  baseDados = JSON.parse(JSON.stringify(BASE_DADOS_PADRAO));
  guardarBD();
}
function guardarBD() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(baseDados)); } catch(e) {}
}

// ==================== FORNECEDORES ====================
function atualizarFornecedores() {
  var sf = document.getElementById("seletorFornecedor");
  if (!sf) return;
  sf.innerHTML = "";
  if (!baseDados.fornecedores || !baseDados.fornecedores.length) {
    sf.innerHTML = '<option value="">Nenhum fornecedor</option>';
    return;
  }
  baseDados.fornecedores.forEach(function(f) {
    var o = document.createElement("option");
    o.value = f.id;
    o.textContent = f.nome + " (Portes: " + parseNum(f.portes).toFixed(2) + " €)";
    sf.appendChild(o);
  });
  if (!fornecedorSelecionadoId || !baseDados.fornecedores.some(function(f) { return f.id === fornecedorSelecionadoId; })) {
    fornecedorSelecionadoId = baseDados.fornecedores[0].id;
  }
  sf.value = fornecedorSelecionadoId;
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  var elPortes = document.getElementById("portesFornecedor");
  if (elPortes) elPortes.value = parseNum(f ? f.portes : 0).toFixed(2);
  atualizarMateriais();
}

function abrirFormFornecedor(edit) {
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  var form = document.getElementById("formNovoFornecedor");
  if (!form) return;
  form.classList.remove("hidden");
  document.getElementById("tituloFormFornecedor").textContent = edit ? "Editar fornecedor" : "Novo fornecedor";
  document.getElementById("editFornecedorId").value = edit ? (f ? f.id : "") : "";
  document.getElementById("novoNomeFornecedor").value = edit ? (f ? f.nome : "") : "";
  document.getElementById("novoPortesFornecedor").value = edit ? parseNum(f ? f.portes : 0) : "";
}

function fecharFormFornecedor() { 
  var form = document.getElementById("formNovoFornecedor");
  if (form) form.classList.add("hidden"); 
}

function guardarFornecedor() {
  var nome = document.getElementById("novoNomeFornecedor").value.trim();
  if (!nome) { alert("Indica o nome do fornecedor."); return; }
  var portes = Math.max(0, parseNum(document.getElementById("novoPortesFornecedor").value));
  var eid = document.getElementById("editFornecedorId").value;
  if (eid) {
    var f = baseDados.fornecedores.find(function(x) { return x.id === eid; });
    if (f) { f.nome = nome; f.portes = portes; }
  } else {
    var novo = { id: id("f"), nome: nome, portes: portes, materiais: [] };
    baseDados.fornecedores.push(novo);
    fornecedorSelecionadoId = novo.id;
  }
  guardarBD();
  fecharFormFornecedor();
  materialSelecionadoId = null;
  atualizarFornecedores();
}

function eliminarFornecedor() {
  if (!fornecedorSelecionadoId) return;
  if (baseDados.fornecedores.length <= 1) { alert("É necessário manter pelo menos um fornecedor."); return; }
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  if (!confirm("Eliminar o fornecedor \"" + (f ? f.nome : "") + "\"?")) return;
  baseDados.fornecedores = baseDados.fornecedores.filter(function(x) { return x.id !== fornecedorSelecionadoId; });
  fornecedorSelecionadoId = null;
  materialSelecionadoId = null;
  guardarBD();
  atualizarFornecedores();
}

// ==================== MATERIAIS ====================
function atualizarMateriais() {
  var sm = document.getElementById("seletorMaterial");
  if (!sm) return;
  sm.innerHTML = "";
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  var materiais = f ? f.materiais : [];
  if (!materiais || !materiais.length) {
    sm.innerHTML = '<option value="">Nenhum material</option>';
    materialSelecionadoId = null;
    document.getElementById("nomeMaterialAtivo").textContent = "Nenhum";
    document.getElementById("detalheMaterialAtivo").textContent = "0,00 €";
    calcular();
    return;
  }
  materiais.forEach(function(m) {
    var o = document.createElement("option");
    o.value = m.id;
    o.textContent = m.nome + " (" + parseNum(m.preco).toFixed(2) + " €)";
    sm.appendChild(o);
  });
  if (!materialSelecionadoId || !materiais.some(function(m) { return m.id === materialSelecionadoId; })) {
    materialSelecionadoId = materiais[0].id;
  }
  sm.value = materialSelecionadoId;
  var m = materiais.find(function(x) { return x.id === materialSelecionadoId; });
  if (m) {
    document.getElementById("custoPeca").value = parseNum(m.preco).toFixed(2);
    document.getElementById("nomeMaterialAtivo").textContent = m.nome + (f ? " (" + f.nome + ")" : "");
    document.getElementById("detalheMaterialAtivo").textContent = moeda(m.preco) + " s/ IVA";
  }
  calcular();
}

function abrirFormMaterial(edit) {
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  if (!f) return;
  var m = (f.materiais || []).find(function(x) { return x.id === materialSelecionadoId; });
  var form = document.getElementById("formNovoMaterial");
  if (!form) return;
  form.classList.remove("hidden");
  document.getElementById("tituloFormMaterial").textContent = edit ? "Editar material" : "Novo material";
  document.getElementById("editMaterialId").value = edit ? (m ? m.id : "") : "";
  document.getElementById("novoNomeMaterial").value = edit ? (m ? m.nome : "") : "";
  document.getElementById("novoPrecoMaterial").value = edit ? parseNum(m ? m.preco : 0) : "";
}

function fecharFormMaterial() { 
  var form = document.getElementById("formNovoMaterial");
  if (form) form.classList.add("hidden"); 
}

function guardarMaterial() {
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  if (!f) return;
  var nome = document.getElementById("novoNomeMaterial").value.trim();
  if (!nome) { alert("Indica o nome do material."); return; }
  var preco = Math.max(0, parseNum(document.getElementById("novoPrecoMaterial").value));
  var eid = document.getElementById("editMaterialId").value;
  f.materiais = f.materiais || [];
  if (eid) {
    var m = f.materiais.find(function(x) { return x.id === eid; });
    if (m) { m.nome = nome; m.preco = preco; }
    materialSelecionadoId = eid;
  } else {
    var novoM = { id: id("m"), nome: nome, preco: preco };
    f.materiais.push(novoM);
    materialSelecionadoId = novoM.id;
  }
  guardarBD();
  fecharFormMaterial();
  atualizarMateriais();
}

function eliminarMaterial() {
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  if (!f) return;
  if (!materialSelecionadoId) return;
  var m = (f.materiais || []).find(function(x) { return x.id === materialSelecionadoId; });
  if (!confirm("Eliminar o material \"" + (m ? m.nome : "") + "\"?")) return;
  f.materiais = (f.materiais || []).filter(function(x) { return x.id !== materialSelecionadoId; });
  materialSelecionadoId = null;
  guardarBD();
  atualizarMateriais();
}

// ==================== TÉCNICAS ====================
function atualizarTecnicas() {
  var st = document.getElementById("seletorTecnica");
  if (!st) return;
  st.innerHTML = "";
  if (!baseDados.tecnicas || !baseDados.tecnicas.length) {
    st.innerHTML = '<option value="">Nenhuma técnica</option>';
    return;
  }
  baseDados.tecnicas.forEach(function(t) {
    var o = document.createElement("option");
    o.value = t.id;
    var label = t.nome;
    if (t.largura > 0) label += " (" + parseNum(t.largura).toFixed(0) + "cm)";
    o.textContent = label;
    st.appendChild(o);
  });
  if (!tecnicaSelecionadaId || !baseDados.tecnicas.some(function(t) { return t.id === tecnicaSelecionadaId; })) {
    tecnicaSelecionadaId = baseDados.tecnicas[0].id;
  }
  st.value = tecnicaSelecionadaId;
  atualizarInfoTecnica();
  calcular();
}

function atualizarInfoTecnica() {
  var t = baseDados.tecnicas.find(function(x) { return x.id === tecnicaSelecionadaId; });
  document.getElementById("nomeTecnicaAtiva").textContent = t ? t.nome : "Nenhuma";
  document.getElementById("infoTecNome").textContent = t ? "📌 " + t.nome : "Nenhuma técnica selecionada";
  if (t) {
    var detalhes = [];
    if (t.custoMetro > 0) detalhes.push("€" + parseNum(t.custoMetro).toFixed(2) + "/m");
    if (t.largura > 0) detalhes.push("Larg: " + parseNum(t.largura).toFixed(0) + "cm");
    if (t.altura > 0) detalhes.push("Alt: " + parseNum(t.altura).toFixed(0) + "cm");
    if (t.numCores > 1) detalhes.push(t.numCores + " cores");
    document.getElementById("infoTecDetalhes").textContent = detalhes.length ? " (" + detalhes.join(" | ") + ")" : "";
  } else {
    document.getElementById("infoTecDetalhes").textContent = "";
  }
}

function abrirFormTecnica(edit) {
  var t = baseDados.tecnicas.find(function(x) { return x.id === tecnicaSelecionadaId; });
  var form = document.getElementById("formNovaTecnica");
  if (!form) return;
  form.classList.remove("hidden");
  document.getElementById("tituloFormTecnica").textContent = edit ? "Editar técnica" : "Nova técnica";
  document.getElementById("editTecnicaId").value = edit ? (t ? t.id : "") : "";
  document.getElementById("novoNomeTecnica").value = edit ? (t ? t.nome : "") : "";
  document.getElementById("novoCustoMetroTecnica").value = edit ? parseNum(t ? t.custoMetro : 0) : "";
  document.getElementById("novoAlturaTecnica").value = edit ? parseNum(t ? t.altura : 0) : "";
  document.getElementById("novaLarguraTecnica").value = edit ? parseNum(t ? t.largura : 0) : "";
  document.getElementById("novoNumCoresTecnica").value = edit ? (t && t.numCores ? t.numCores : 1) : 1;
}

function fecharFormTecnica() { 
  var form = document.getElementById("formNovaTecnica");
  if (form) form.classList.add("hidden"); 
}

function guardarTecnica() {
  var nome = document.getElementById("novoNomeTecnica").value.trim();
  if (!nome) { alert("Indica o nome da técnica."); return; }
  var custoMetro = parseNum(document.getElementById("novoCustoMetroTecnica").value);
  var altura = parseNum(document.getElementById("novoAlturaTecnica").value);
  var largura = parseNum(document.getElementById("novaLarguraTecnica").value);
  var numCores = Math.max(1, parseInt(document.getElementById("novoNumCoresTecnica").value) || 1);
  var eid = document.getElementById("editTecnicaId").value;
  if (eid) {
    var t = baseDados.tecnicas.find(function(x) { return x.id === eid; });
    if (t) { t.nome = nome; t.custoMetro = custoMetro; t.altura = altura; t.largura = largura; t.numCores = numCores; }
  } else {
    var novaT = { id: id("t"), nome: nome, custoMetro: custoMetro, altura: altura, largura: largura, numCores: numCores };
    baseDados.tecnicas.push(novaT);
    tecnicaSelecionadaId = novaT.id;
  }
  guardarBD();
  fecharFormTecnica();
  atualizarTecnicas();
}

function eliminarTecnica() {
  if (!tecnicaSelecionadaId) return;
  if (baseDados.tecnicas.length <= 1) { alert("É necessário manter pelo menos uma técnica."); return; }
  var t = baseDados.tecnicas.find(function(x) { return x.id === tecnicaSelecionadaId; });
  if (!confirm("Eliminar a técnica \"" + (t ? t.nome : "") + "\"?")) return;
  baseDados.tecnicas = baseDados.tecnicas.filter(function(x) { return x.id !== tecnicaSelecionadaId; });
  tecnicaSelecionadaId = null;
  guardarBD();
  atualizarTecnicas();
}

// ==================== CÁLCULOS ====================
function obterDadosTecnica(idTec) {
  if (!idTec || !baseDados || !baseDados.tecnicas) return null;
  return baseDados.tecnicas.find(function(x) { return x.id === idTec; }) || null;
}

function custoMetroCalculo(qtd, metro, alt, larg, bobina) {
  qtd = Math.max(1, parseInt(qtd) || 1);
  var area = (Math.max(0, parseNum(alt)) / 100) * (Math.max(0, parseNum(larg)) / 100) * qtd * 1.05;
  var metros = area / (bobina / 100);
  return {custoUnComIva: (metros * Math.max(0, parseNum(metro)) * TAXA_IVA) / qtd, metrosTotais: metros, minEscalao: 1};
}

function obterCustoPara(qtd, tecnicaId) {
  var t = obterDadosTecnica(tecnicaId);
  if (!t) return {custoUnComIva: 0, metrosTotais: 0, minEscalao: 1};
  var altura = parseNum(document.getElementById("alturaEstampa").value) || 10;
  var largura = parseNum(document.getElementById("larguraEstampa").value) || 28;
  if (t.custoMetro > 0 && altura > 0 && largura > 0) {
    var bobina = 28;
    var nomeLower = t.nome ? t.nome.toLowerCase() : "";
    if (nomeLower.indexOf("vinil") !== -1) bobina = 50;
    else if (nomeLower.indexOf("sublimação") !== -1 || nomeLower.indexOf("sublimacao") !== -1) bobina = 58;
    return custoMetroCalculo(qtd, t.custoMetro, altura, largura, bobina);
  }
  var cores = t.numCores || 1;
  var nomeLower2 = t.nome ? t.nome.toLowerCase() : "";
  if (nomeLower2.indexOf("serigrafia") !== -1) {
    var escaloes = [{min:1,max:9,precos:[8,10,12]},{min:10,max:24,precos:[3.5,4.5,5.5]},{min:25,max:49,precos:[2.2,2.8,3.4]},{min:50,max:99,precos:[1.5,1.9,2.3]},{min:100,max:Infinity,precos:[1,1.3,1.6]}];
    var e = escaloes.find(function(x) { return qtd >= x.min && qtd <= x.max; }) || escaloes[0];
    var idx = Math.max(0, Math.min(2, cores - 1));
    return {custoUnComIva: e.precos[idx] * TAXA_IVA, minEscalao: e.min, metrosTotais: 0};
  } else if (nomeLower2.indexOf("bordado") !== -1) {
    var escaloes2 = [{min:1,max:9,precos:[6,8]},{min:10,max:24,precos:[3.8,5]},{min:25,max:49,precos:[2.5,3.5]},{min:50,max:Infinity,precos:[1.8,2.5]}];
    var e2 = escaloes2.find(function(x) { return qtd >= x.min && qtd <= x.max; }) || escaloes2[0];
    var idx2 = cores > 1 ? 1 : 0;
    return {custoUnComIva: e2.precos[idx2] * TAXA_IVA, minEscalao: e2.min, metrosTotais: 0};
  }
  if (t.custoMetro > 0) return custoMetroCalculo(qtd, t.custoMetro, altura || 10, largura || 28, 28);
  return {custoUnComIva: 0, metrosTotais: 0, minEscalao: 1};
}

function margemPorUnidade(qtd, valor, tipo, custo) {
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
    var q = Math.max(1, parseInt(document.getElementById("quantidade").value) || 1);
    var p = parseNum(document.getElementById("custoPeca").value);
    var portes = parseNum(document.getElementById("portesFornecedor").value);
    var tecnicaId = document.getElementById("seletorTecnica").value;
    var tipo = document.getElementById("tipoMargem").value;
    var margem = parseNum(document.getElementById("valMargem").value);
    if (!tecnicaId || !baseDados || !baseDados.tecnicas) return;
    var imp = obterCustoPara(q, tecnicaId);
    var pIva = p * TAXA_IVA, portesIva = portes * TAXA_IVA;
    var custoUn = pIva + imp.custoUnComIva + (portesIva / q);
    var lucro = margemPorUnidade(q, margem, tipo, custoUn);
    var venda = custoUn + lucro;
    document.getElementById("resPrecoUn").textContent = moeda(venda);
    document.getElementById("resTotalComercial").textContent = moeda(venda * q);
    document.getElementById("resCustoMaterialUn").textContent = moeda(pIva);
    document.getElementById("resCustoImprUn").textContent = moeda(imp.custoUnComIva);
    document.getElementById("resPortes").textContent = moeda(portesIva);
    document.getElementById("resCustoTotalLote").textContent = moeda(custoUn * q);
    document.getElementById("resLucroUn").textContent = moeda(lucro);
    document.getElementById("resLucroTotal").textContent = moeda(lucro * q);
    document.getElementById("escalaoBadge").textContent = "Escalão ≥ " + imp.minEscalao + " un";
    var t = obterDadosTecnica(tecnicaId);
    var linha = document.getElementById("linhaConsumoFilme");
    if (linha) {
      if (t && t.custoMetro > 0) {
        linha.style.display = "flex";
        document.getElementById("labelConsumoFilme").textContent = "Consumo " + t.nome + ":";
        document.getElementById("resConsumoFilme").textContent = imp.metrosTotais.toFixed(2).replace(".", ",") + " m";
      } else {
        linha.style.display = "none";
      }
    }
    gerarComparativo(q, pIva, portesIva, tecnicaId, tipo, margem);
  } catch(e) { console.log("Erro:", e); }
}

function gerarComparativo(qAtual, pComIva, portesIva, tecnicaId, tipo, margem) {
  var c = document.getElementById("tabelaComparativa");
  if (!c) return;
  c.innerHTML = "";
  [1, 10, 25, 50, 100].forEach(function(q) {
    var imp = obterCustoPara(q, tecnicaId);
    var custo = pComIva + imp.custoUnComIva + portesIva / q;
    var lucro = margemPorUnidade(q, margem, tipo, custo);
    var item = document.createElement("div");
    item.className = "escalao-item" + (q === qAtual ? " active" : "");
    item.innerHTML = "<strong>" + q + "+</strong><br>" + moeda(custo + lucro);
    c.appendChild(item);
  });
}

function resumoTexto() {
  var q = document.getElementById("quantidade").value;
  var sel = document.getElementById("seletorTecnica");
  var t = sel && sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0].text : "";
  var mat = document.getElementById("nomeMaterialAtivo").textContent;
  return "GrafiSantos Print\nArtigo: " + mat + "\nQuantidade: " + q + "\nTécnica: " + t + 
    "\nPreço/un.: " + document.getElementById("resPrecoUn").textContent + 
    "\nTotal: " + document.getElementById("resTotalComercial").textContent + 
    "\nLucro total: " + document.getElementById("resLucroTotal").textContent;
}

function copiarResumo() {
  var txt = resumoTexto();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function() { alert("Resumo copiado."); }).catch(function() { prompt("Copia o resumo:", txt); });
  } else { prompt("Copia o resumo:", txt); }
}

function guardarPDF() {
  if (typeof html2pdf === "undefined" || !html2pdf) { window.print(); return; }
  var el = document.getElementById("areaParaPdf");
  if (!el) return;
  html2pdf().set({ margin: 8, filename: "GrafiSantos-Calculadora.pdf", image: { type: "jpeg", quality: 0.95 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(el).save();
}

function imprimir() { window.print(); }

// ==================== EVENTOS ====================
function ligarEventos() {
  var acao = function(id, tipo, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(tipo, fn);
  };

  // Fornecedores
  acao("seletorFornecedor", "change", function(e) {
    fornecedorSelecionadoId = e.target.value;
    materialSelecionadoId = null;
    atualizarMateriais();
  });
  acao("btnNovoFornecedor", "click", function() { abrirFormFornecedor(false); });
  acao("btnEditarFornecedor", "click", function() { abrirFormFornecedor(true); });
  acao("btnEliminarFornecedor", "click", eliminarFornecedor);
  acao("btnGuardarFornecedor", "click", guardarFornecedor);
  acao("btnFecharFornecedor", "click", fecharFormFornecedor);

  // Materiais
  acao("seletorMaterial", "change", function(e) {
    materialSelecionadoId = e.target.value;
    atualizarMateriais();
  });
  acao("btnNovoMaterial", "click", function() { abrirFormMaterial(false); });
  acao("btnEditarMaterial", "click", function() { abrirFormMaterial(true); });
  acao("btnEliminarMaterial", "click", eliminarMaterial);
  acao("btnGuardarMaterial", "click", guardarMaterial);
  acao("btnFecharMaterial", "click", fecharFormMaterial);

  // Técnicas
  acao("seletorTecnica", "change", function(e) {
    tecnicaSelecionadaId = e.target.value;
    atualizarInfoTecnica();
    calcular();
  });
  acao("btnNovaTecnica", "click", function() { abrirFormTecnica(false); });
  acao("btnEditarTecnica", "click", function() { abrirFormTecnica(true); });
  acao("btnEliminarTecnica", "click", eliminarTecnica);
  acao("btnGuardarTecnica", "click", guardarTecnica);
  acao("btnFecharTecnica", "click", fecharFormTecnica);

  // Cálculos
  ["quantidade", "custoPeca", "portesFornecedor", "tipoMargem", "valMargem", "alturaEstampa", "larguraEstampa"].forEach(function(x) {
    acao(x, "input", calcular);
    acao(x, "change", calcular);
  });

  acao("btnCopiarResumo", "click", copiarResumo);
  acao("btnGuardarPDF", "click", guardarPDF);
  acao("btnImprimir", "click", imprimir);
}

document.addEventListener("DOMContentLoaded", function() {
  carregarBD();
  atualizarFornecedores();
  atualizarTecnicas();
  ligarEventos();
  calcular();
  atualizarInfoTecnica();
});