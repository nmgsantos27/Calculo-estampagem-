"use strict";

// Função de segurança para mostrar erros visíveis no telemóvel
window.onerror = function(msg, url, line) {
  var debugDiv = document.getElementById("debugErroMovil");
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
  debugDiv.style.display = "block";
  debugDiv.innerHTML = "<strong>Erro JS:</strong> " + msg + " (Linha: " + line + ")";
};

var TAXA_IVA = 1.23;
var STORAGE_KEY = "baseDadosGrafiSantos_v3";

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

// DADOS PADRÃO
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

// Variáveis globais
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
  } catch(e) {
    console.log("Erro ao carregar dados:", e);
  }
  baseDados = JSON.parse(JSON.stringify(BASE_DADOS_PADRAO));
  guardarBD();
}

function guardarBD() {
  try { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(baseDados)); 
  } catch(e) {
    console.log("Erro ao guardar dados:", e);
  }
}

// ==================== FORNECEDORES ====================
function atualizarSelectFornecedores() {
  var sf = document.getElementById("seletorFornecedorBD");
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
  
  atualizarSelectMateriais();
}

function abrirFormFornecedor(edit) {
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  document.getElementById("formNovoFornecedor").classList.remove("hidden");
  document.getElementById("tituloFormFornecedor").textContent = edit ? "Editar fornecedor" : "Novo fornecedor";
  document.getElementById("editFornecedorId").value = edit ? (f ? f.id : "") : "";
  document.getElementById("novoNomeFornecedor").value = edit ? (f ? f.nome : "") : "";
  document.getElementById("novoPortesFornecedor").value = edit ? parseNum(f ? f.portes : 0) : "";
}

function fecharFormFornecedor() { 
  document.getElementById("formNovoFornecedor").classList.add("hidden"); 
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
  atualizarSelectFornecedores();
}

function eliminarFornecedor() {
  if (!fornecedorSelecionadoId) return;
  if (baseDados.fornecedores.length <= 1) { 
    alert("É necessário manter pelo menos um fornecedor."); 
    return; 
  }
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  if (!confirm("Eliminar o fornecedor \"" + (f ? f.nome : "") + "\"?")) return;
  
  baseDados.fornecedores = baseDados.fornecedores.filter(function(x) { return x.id !== fornecedorSelecionadoId; });
  fornecedorSelecionadoId = null;
  materialSelecionadoId = null;
  guardarBD();
  atualizarSelectFornecedores();
}

// ==================== MATERIAIS ====================
function atualizarSelectMateriais() {
  var sm = document.getElementById("seletorMaterialBD");
  if (!sm) return;
  sm.innerHTML = "";
  
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  var materiais = f ? f.materiais : [];
  
  if (!materiais || !materiais.length) {
    sm.innerHTML = '<option value="">Nenhum material</option>';
    materialSelecionadoId = null;
    var nomeMat = document.getElementById("nomeMaterialAtivo");
    var detalheMat = document.getElementById("detalheMaterialAtivo");
    if (nomeMat) nomeMat.textContent = "Nenhum";
    if (detalheMat) detalheMat.textContent = "0,00 €";
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
    var elCusto = document.getElementById("custoPeca");
    if (elCusto) elCusto.value = parseNum(m.preco).toFixed(2);
    var nomeMat = document.getElementById("nomeMaterialAtivo");
    var detalheMat = document.getElementById("detalheMaterialAtivo");
    if (nomeMat) nomeMat.textContent = m.nome + (f ? " (" + f.nome + ")" : "");
    if (detalheMat) detalheMat.textContent = moeda(m.preco) + " s/ IVA";
  }
  calcular();
}

function abrirFormMaterial(edit) {
  var f = baseDados.fornecedores.find(function(x) { return x.id === fornecedorSelecionadoId; });
  if (!f) return;
  var m = (f.materiais || []).find(function(x) { return x.id === materialSelecionadoId; });
  
  document.getElementById("formNovoMaterial").classList.remove("hidden");
  document.getElementById("tituloFormMaterial").textContent = edit ? "Editar material" : "Novo material";
  document.getElementById("editMaterialId").value = edit ? (m ? m.id : "") : "";
  document.getElementById("novoNomeMaterial").value = edit ? (m ? m.nome : "") : "";
  document.getElementById("novoPrecoMaterial").value = edit ? parseNum(m ? m.preco : 0) : "";
}

function fecharFormMaterial() { 
  document.getElementById("formNovoMaterial").classList.add("hidden"); 
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
  atualizarSelectMateriais();
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
  atualizarSelectMateriais();
}

// ==================== TÉCNICAS ====================
function atualizarSelectTecnicas() {
  var st = document.getElementById("seletorTecnicaBD");
  if (!st) return;
  st.innerHTML = "";
  
  if (!baseDados.tecnicas || !baseDados.tecnicas.length) {
    st.innerHTML = '<option value="">Nenhuma técnica</option>';
    return;
  }
  
  baseDados.tecnicas.forEach(function(t) {
    var o = document.createElement("option");
    o.value = t.id;
    // Mostrar nome e largura
    var label = t.nome;
    if (t.largura > 0) {
      label += " (" + parseNum(t.largura).toFixed(0) + "cm)";
    }
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
  var nomeTec = document.getElementById("nomeTecnicaAtiva");
  var infoTecNome = document.getElementById("infoTecNome");
  var infoTecDetalhes = document.getElementById("infoTecDetalhes");
  
  if (t) {
    if (nomeTec) nomeTec.textContent = t.nome;
    if (infoTecNome) infoTecNome.textContent = "📌 " + t.nome;
    
    var detalhes = [];
    if (t.custoMetro > 0) {
      detalhes.push("€" + parseNum(t.custoMetro).toFixed(2) + "/m");
    }
    if (t.largura > 0) {
      detalhes.push("Larg: " + parseNum(t.largura).toFixed(0) + "cm");
    }
    if (t.altura > 0) {
      detalhes.push("Alt: " + parseNum(t.altura).toFixed(0) + "cm");
    }
    if (t.numCores > 1) {
      detalhes.push(t.numCores + " cores");
    }
    
    if (infoTecDetalhes) {
      infoTecDetalhes.textContent = detalhes.length ? " (" + detalhes.join(" | ") + ")" : "";
    }
  } else {
    if (nomeTec) nomeTec.textContent = "Nenhuma";
    if (infoTecNome) infoTecNome.textContent = "Nenhuma técnica selecionada";
    if (infoTecDetalhes) infoTecDetalhes.textContent = "";
  }
}

function abrirFormTecnica(edit) {
  var t = baseDados.tecnicas.find(function(x) { return x.id === tecnicaSelecionadaId; });
  document.getElementById("formNovaTecnica").classList.remove("hidden");
  document.getElementById("tituloFormTecnica").textContent = edit ? "Editar técnica" : "Nova técnica";
  document.getElementById("editTecnicaId").value = edit ? (t ? t.id : "") : "";
  document.getElementById("novoNomeTecnica").value = edit ? (t ? t.nome : "") : "";
  document.getElementById("novoCustoMetroTecnica").value = edit ? parseNum(t ? t.custoMetro : 0) : "";
  document.getElementById("novoAlturaTecnica").value = edit ? parseNum(t ? t.altura : 0) : "";
  document.getElementById("novaLarguraTecnica").value = edit ? parseNum(t ? t.largura : 0) : "";
  document.getElementById("novoNumCoresTecnica").value = edit ? (t && t.numCores ? t.numCores : 1) : 1;
}

function fecharFormTecnica() { 
  document.getElementById("formNovaTecnica").classList.add("hidden"); 
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
    if (t) { 
      t.nome = nome; 
      t.custoMetro = custoMetro; 
      t.altura = altura; 
      t.largura = largura;
      t.numCores = numCores;
    }
  } else {
    var novaT = { 
      id: id("t"), 
      nome: nome, 
      custoMetro: custoMetro, 
      altura: altura, 
      largura: largura,
      numCores: numCores
    };
    baseDados.tecnicas.push(novaT);
    tecnicaSelecionadaId = novaT.id;
  }
  guardarBD();
  fecharFormTecnica();
  atualizarSelectTecnicas();
}

function eliminarTecnica() {
  if (!tecnicaSelecionadaId) return;
  if (baseDados.tecnicas.length <= 1) { 
    alert("É necessário manter pelo menos uma técnica."); 
    return; 
  }
  var t = baseDados.tecnicas.find(function(x) { return x.id === tecnicaSelecionadaId; });
  if (!confirm("Eliminar a técnica \"" + (t ? t.nome : "") + "\"?")) return;
  
  baseDados.tecnicas = baseDados.tecnicas.filter(function(x) { return x.id !== tecnicaSelecionadaId; });
  tecnicaSelecionadaId = null;
  guardarBD();
  atualizarSelectTecnicas();
}

// ==================== CÁLCULOS ====================
function obterDadosTecnica(idTec) {
  if (!idTec) return null;
  if (!baseDados || !baseDados.tecnicas) return null;
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
  
  // Usar altura e largura dos campos de cálculo (podem ser diferentes da técnica)
  var altura = parseNum(document.getElementById("alturaEstampa") ? document.getElementById("alturaEstampa").value : 10);
  var largura = parseNum(document.getElementById("larguraEstampa") ? document.getElementById("larguraEstampa").value : 28);
  
  // Se tem custoMetro > 0, é uma técnica de filme
  if (t.custoMetro > 0 && altura > 0 && largura > 0) {
    var bobina = 28; // padrão
    var nomeLower = t.nome ? t.nome.toLowerCase() : "";
    if (nomeLower.indexOf("vinil") !== -1) bobina = 50;
    else if (nomeLower.indexOf("sublimação") !== -1 || nomeLower.indexOf("sublimacao") !== -1) bobina = 58;
    return custoMetroCalculo(qtd, t.custoMetro, altura, largura, bobina);
  }
  
  // Para serigrafia e bordado - usar escalões
  var cores = t.numCores || 1;
  var nomeLower2 = t.nome ? t.nome.toLowerCase() : "";
  
  if (nomeLower2.indexOf("serigrafia") !== -1) {
    var escaloesSerigrafia = [
      {min:1,max:9,precos:[8,10,12]},
      {min:10,max:24,precos:[3.5,4.5,5.5]},
      {min:25,max:49,precos:[2.2,2.8,3.4]},
      {min:50,max:99,precos:[1.5,1.9,2.3]},
      {min:100,max:Infinity,precos:[1,1.3,1.6]}
    ];
    var e = escaloesSerigrafia.find(function(x) { return qtd >= x.min && qtd <= x.max; }) || escaloesSerigrafia[0];
    var idx = Math.max(0, Math.min(2, cores - 1));
    return {custoUnComIva: e.precos[idx] * TAXA_IVA, minEscalao: e.min, metrosTotais: 0};
  } else if (nomeLower2.indexOf("bordado") !== -1) {
    var escaloesBordado = [
      {min:1,max:9,precos:[6,8]},
      {min:10,max:24,precos:[3.8,5]},
      {min:25,max:49,precos:[2.5,3.5]},
      {min:50,max:Infinity,precos:[1.8,2.5]}
    ];
    var e2 = escaloesBordado.find(function(x) { return qtd >= x.min && qtd <= x.max; }) || escaloesBordado[0];
    var idx2 = cores > 1 ? 1 : 0;
    return {custoUnComIva: e2.precos[idx2] * TAXA_IVA, minEscalao: e2.min, metrosTotais: 0};
  }
  
  // Técnica genérica com custoMetro
  if (t.custoMetro > 0) {
    return custoMetroCalculo(qtd, t.custoMetro, altura || 10, largura || 28, 28);
  }
  
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
    var q = Math.max(1, parseInt(document.getElementById("quantidade") ? document.getElementById("quantidade").value : 1) || 1);
    var p = parseNum(document.getElementById("custoPeca") ? document.getElementById("custoPeca").value : 0);
    var portes = parseNum(document.getElementById("portesFornecedor") ? document.getElementById("portesFornecedor").value : 0);
    
    var selectTec = document.getElementById("seletorTecnicaBD");
    var tecnicaId = selectTec ? selectTec.value : null;
    
    var tipo = document.getElementById("tipoMargem") ? document.getElementById("tipoMargem").value : "valor";
    var margem = parseNum(document.getElementById("valMargem") ? document.getElementById("valMargem").value : 5);
    
    if (!tecnicaId || !baseDados || !baseDados.tecnicas) {
      var resPreco = document.getElementById("resPrecoUn");
      var resTotal = document.getElementById("resTotalComercial");
      if (resPreco) resPreco.textContent = "0,00 €";
      if (resTotal) resTotal.textContent = "0,00 €";
      return;
    }
    
    var imp = obterCustoPara(q, tecnicaId);
    var pIva = p * TAXA_IVA, portesIva = portes * TAXA_IVA;
    var custoUn = pIva + imp.custoUnComIva + (portesIva / q);
    var lucro = margemPorUnidade(q, margem, tipo, custoUn);
    var venda = custoUn + lucro;

    var elPreco = document.getElementById("resPrecoUn");
    var elTotal = document.getElementById("resTotalComercial");
    var elCustoMat = document.getElementById("resCustoMaterialUn");
    var elCustoImpr = document.getElementById("resCustoImprUn");
    var elPortes = document.getElementById("resPortes");
    var elCustoTotal = document.getElementById("resCustoTotalLote");
    var elLucroUn = document.getElementById("resLucroUn");
    var elLucroTotal = document.getElementById("resLucroTotal");
    var elEscalao = document.getElementById("escalaoBadge");
    
    if (elPreco) elPreco.textContent = moeda(venda);
    if (elTotal) elTotal.textContent = moeda(venda * q);
    if (elCustoMat) elCustoMat.textContent = moeda(pIva);
    if (elCustoImpr) elCustoImpr.textContent = moeda(imp.custoUnComIva);
    if (elPortes) elPortes.textContent = moeda(portesIva);
    if (elCustoTotal) elCustoTotal.textContent = moeda(custoUn * q);
    if (elLucroUn) elLucroUn.textContent = moeda(lucro);
    if (elLucroTotal) elLucroTotal.textContent = moeda(lucro * q);
    if (elEscalao) elEscalao.textContent = "Escalão ≥ " + imp.minEscalao + " un";

    var t = obterDadosTecnica(tecnicaId);
    var linhaConsumo = document.getElementById("linhaConsumoFilme");
    var labelConsumo = document.getElementById("labelConsumoFilme");
    var resConsumo = document.getElementById("resConsumoFilme");
    
    if (linhaConsumo) {
      if (t && t.custoMetro > 0) {
        linhaConsumo.style.display = "flex";
        if (labelConsumo) labelConsumo.textContent = "Consumo " + t.nome + ":";
        if (resConsumo) resConsumo.textContent = imp.metrosTotais.toFixed(2).replace(".", ",") + " m";
      } else {
        linhaConsumo.style.display = "none";
      }
    }
    
    gerarComparativoEscaloes(q, pIva, portesIva, tecnicaId, tipo, margem);
  } catch(e) {
    console.log("Erro no cálculo:", e);
    var debugDiv = document.getElementById("debugErroMovil");
    if (debugDiv) {
      debugDiv.style.display = "block";
      debugDiv.innerHTML = "<strong>Erro no cálculo:</strong> " + e.message;
    }
  }
}

function gerarComparativoEscaloes(qAtual, pComIva, portesIva, tecnicaId, tipo, margem) {
  var c = document.getElementById("tabelaComparativa");
  if (!c) return;
  c.innerHTML = "";
  var escaloes = [1, 10, 25, 50, 100];
  escaloes.forEach(function(q) {
    var imp = obterCustoPara(q, tecnicaId);
    var custo = pComIva + imp.custoUnComIva + portesIva / q;
    var lucro = margemPorUnidade(q, margem, tipo, custo);
    var item = document.createElement("div");
    item.className = "escalao-item" + (q === qAtual ? " active" : "");
    item.innerHTML = "<strong>" + q + "+</strong><br>" + moeda(custo + lucro);
    c.appendChild(item);
  });
}

// ==================== UTILITÁRIOS ====================
function resumoTexto() {
  var q = document.getElementById("quantidade") ? document.getElementById("quantidade").value : "0";
  var selTec = document.getElementById("seletorTecnicaBD");
  var t = selTec && selTec.selectedOptions && selTec.selectedOptions[0] ? selTec.selectedOptions[0].text : "";
  var mat = document.getElementById("nomeMaterialAtivo") ? document.getElementById("nomeMaterialAtivo").textContent : "";
  var preco = document.getElementById("resPrecoUn") ? document.getElementById("resPrecoUn").textContent : "0,00 €";
  var total = document.getElementById("resTotalComercial") ? document.getElementById("resTotalComercial").textContent : "0,00 €";
  var lucro = document.getElementById("resLucroTotal") ? document.getElementById("resLucroTotal").textContent : "0,00 €";
  
  return "GrafiSantos Print\nArtigo: " + mat + "\nQuantidade: " + q + "\nTécnica: " + t + 
    "\nPreço/un.: " + preco + 
    "\nTotal: " + total + 
    "\nLucro total: " + lucro;
}

function copiarResumo() {
  var txt = resumoTexto();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function() {
      alert("Resumo copiado.");
    }).catch(function() {
      prompt("Copia o resumo:", txt);
    });
  } else {
    prompt("Copia o resumo:", txt);
  }
}

function guardarPDF() {
  if (typeof html2pdf === "undefined" || !html2pdf) { 
    window.print(); 
    return; 
  }
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

function imprimir() { window.print(); }

// ==================== EVENTOS ====================
function ligarEventos() {
  var acao = function(idv, tipo, fn) {
    var el = document.getElementById(idv);
    if (el) el.addEventListener(tipo, fn);
  };

  // Fornecedores
  acao("seletorFornecedorBD", "change", function(e) {
    fornecedorSelecionadoId = e.target.value;
    materialSelecionadoId = null;
    atualizarSelectMateriais();
  });
  acao("btnNovoForn", "click", function() { abrirFormFornecedor(false); });
  acao("btnEditarForn", "click", function() { abrirFormFornecedor(true); });
  acao("btnEliminarForn", "click", eliminarFornecedor);
  acao("btnGuardarFornBD", "click", guardarFornecedor);
  acao("btnFecharFornBD", "click", fecharFormFornecedor);

  // Materiais
  acao("seletorMaterialBD", "change", function(e) {
    materialSelecionadoId = e.target.value;
    atualizarSelectMateriais();
  });
  acao("btnNovoMat", "click", function() { abrirFormMaterial(false); });
  acao("btnEditarMat", "click", function() { abrirFormMaterial(true); });
  acao("btnEliminarMat", "click", eliminarMaterial);
  acao("btnGuardarMatBD", "click", guardarMaterial);
  acao("btnFecharMatBD", "click", fecharFormMaterial);

  // Técnicas
  acao("seletorTecnicaBD", "change", function(e) {
    tecnicaSelecionadaId = e.target.value;
    atualizarInfoTecnica();
    calcular();
  });
  acao("btnNovaTec", "click", function() { abrirFormTecnica(false); });
  acao("btnEditarTec", "click", function() { abrirFormTecnica(true); });
  acao("btnEliminarTec", "click", eliminarTecnica);
  acao("btnGuardarTecBD", "click", guardarTecnica);
  acao("btnFecharTecBD", "click", fecharFormTecnica);

  // Cálculos - incluir altura e largura
  var inputs = ["quantidade", "custoPeca", "portesFornecedor", "tipoMargem", "valMargem", "alturaEstampa", "larguraEstampa"];
  inputs.forEach(function(x) { 
    acao(x, "input", calcular); 
    acao(x, "change", calcular);
  });

  // Ações
  acao("btnCopiarResumo", "click", copiarResumo);
  acao("btnGuardarPDF", "click", guardarPDF);
  acao("btnImprimir", "click", imprimir);
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", function() {
  try {
    carregarBD();
    atualizarSelectFornecedores();
    atualizarSelectTecnicas();
    ligarEventos();
    calcular();
    atualizarInfoTecnica();
  } catch(e) {
    console.log("Erro na inicialização:", e);
    var debugDiv = document.getElementById("debugErroMovil");
    if (debugDiv) {
      debugDiv.style.display = "block";
      debugDiv.innerHTML = "<strong>Erro na inicialização:</strong> " + e.message;
    }
  }
});
