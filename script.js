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
var STORAGE_KEY = "baseDadosGrafiSantos";
var TECNICAS_STORAGE_KEY = "tecnicasGrafiSantos_v2";

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

// Valores padrão para cada técnica
var VALORES_PADRAO_TECNICAS = {
  dtf: { custoMetro: 5.50, altura: 10, largura: 28 },
  vinil: { custoMetro: 6.50, altura: 10, largura: 28 },
  sublimacao: { custoMetro: 4.50, altura: 10, largura: 28 },
  serigrafia: { numCores: 1 },
  bordado: { numCores: 1 }
};

// Carregar técnicas guardadas ou usar padrão
function carregarTecnicas() {
  try {
    var raw = localStorage.getItem(TECNICAS_STORAGE_KEY);
    if (raw) {
      var data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        // Mesclar com os padrões para garantir que todas as técnicas existem
        var tecnicas = {};
        // Copiar valores padrão
        for (var chave in VALORES_PADRAO_TECNICAS) {
          if (VALORES_PADRAO_TECNICAS.hasOwnProperty(chave)) {
            tecnicas[chave] = JSON.parse(JSON.stringify(VALORES_PADRAO_TECNICAS[chave]));
          }
        }
        // Sobrescrever com valores guardados
        for (var chave2 in data) {
          if (data.hasOwnProperty(chave2) && tecnicas.hasOwnProperty(chave2)) {
            for (var prop in data[chave2]) {
              if (data[chave2].hasOwnProperty(prop)) {
                tecnicas[chave2][prop] = data[chave2][prop];
              }
            }
          }
        }
        return tecnicas;
      }
    }
  } catch(e) {
    console.log("Erro ao carregar técnicas:", e);
  }
  // Se não houver dados guardados, usar padrão
  return JSON.parse(JSON.stringify(VALORES_PADRAO_TECNICAS));
}

// Guardar técnicas no localStorage
function guardarTecnicas(tecnicas) {
  try {
    localStorage.setItem(TECNICAS_STORAGE_KEY, JSON.stringify(tecnicas));
    console.log("Técnicas guardadas:", tecnicas);
  } catch(e) {
    console.log("Erro ao guardar técnicas:", e);
  }
}

// Carregar técnicas uma vez e manter
var memoriaTecnicas = carregarTecnicas();

// Verificar se há técnicas guardadas e garantir que estão no localStorage
(function verificarTecnicasGuardadas() {
  var raw = localStorage.getItem(TECNICAS_STORAGE_KEY);
  if (!raw) {
    guardarTecnicas(memoriaTecnicas);
  }
})();

var BASE_DADOS_PADRAO = [
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

var TECNICAS = {
  dtf: { bobina:28, obterCusto: function(q, m, a, l) { return custoMetro(q, m, a, l, 28); } },
  vinil: { bobina:50, obterCusto: function(q, m, a, l) { return custoMetro(q, m, a, l, 50); } },
  sublimacao: { bobina:58, obterCusto: function(q, m, a, l) { return custoMetro(q, m, a, l, 58); } },
  serigrafia: {
    escaloes: [
      {min:1,max:9,precos:[8,10,12]},
      {min:10,max:24,precos:[3.5,4.5,5.5]},
      {min:25,max:49,precos:[2.2,2.8,3.4]},
      {min:50,max:99,precos:[1.5,1.9,2.3]},
      {min:100,max:Infinity,precos:[1,1.3,1.6]}
    ],
    obterCusto: function(qtd, cores) {
      var e = this.escaloes.find(function(x) { return qtd >= x.min && qtd <= x.max; }) || this.escaloes[0];
      var idx = Math.max(0, Math.min(2, (parseInt(cores) || 1) - 1));
      return {custoUnComIva: e.precos[idx] * TAXA_IVA, minEscalao: e.min, metrosTotais: 0};
    }
  },
  bordado: {
    escaloes: [
      {min:1,max:9,precos:[6,8]},
      {min:10,max:24,precos:[3.8,5]},
      {min:25,max:49,precos:[2.5,3.5]},
      {min:50,max:Infinity,precos:[1.8,2.5]}
    ],
    obterCusto: function(qtd, cores) {
      var e = this.escaloes.find(function(x) { return qtd >= x.min && qtd <= x.max; }) || this.escaloes[0];
      var idx = (parseInt(cores) || 1) > 1 ? 1 : 0;
      return {custoUnComIva: e.precos[idx] * TAXA_IVA, minEscalao: e.min, metrosTotais: 0};
    }
  }
};

function custoMetro(qtd, metro, alt, larg, bobina) {
  qtd = Math.max(1, parseInt(qtd) || 1);
  var area = (Math.max(0, parseNum(alt)) / 100) * (Math.max(0, parseNum(larg)) / 100) * qtd * 1.05;
  var metros = area / (bobina / 100);
  return {custoUnComIva: (metros * Math.max(0, parseNum(metro)) * TAXA_IVA) / qtd, metrosTotais: metros, minEscalao: 1};
}

var baseDados = [];
var fornecedorSelecionadoId = null;
var materialSelecionadoId = null;
var tecnicaAnterior = "dtf";

function carregarBD() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    var data = raw ? JSON.parse(raw) : null;
    baseDados = Array.isArray(data) && data.length > 0 ? data : JSON.parse(JSON.stringify(BASE_DADOS_PADRAO));
  } catch(e) {
    baseDados = JSON.parse(JSON.stringify(BASE_DADOS_PADRAO));
  }
  guardarBD();
}
function guardarBD() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(baseDados)); } catch(e) {}
}

function atualizarSelectsDinamicos() {
  var sf = document.getElementById("seletorFornecedorBD");
  if (!sf) return;
  sf.innerHTML = "";
  if (!baseDados.length) {
    sf.innerHTML = '<option value="">Nenhum fornecedor</option>';
    atualizarSelectMateriaisDinamicos([]);
    return;
  }
  baseDados.forEach(function(f) {
    var o = document.createElement("option");
    o.value = f.id;
    o.textContent = f.nome + " (Portes: " + parseNum(f.portes).toFixed(2) + " €)";
    sf.appendChild(o);
  });
  if (!fornecedorSelecionadoId || !baseDados.some(function(f) { return f.id === fornecedorSelecionadoId; })) {
    fornecedorSelecionadoId = baseDados[0].id;
  }
  sf.value = fornecedorSelecionadoId;
  var f = baseDados.find(function(x) { return x.id === fornecedorSelecionadoId; });
  var elPortes = document.getElementById("portesFornecedor");
  if (elPortes) elPortes.value = parseNum(f ? f.portes : 0).toFixed(2);
  atualizarSelectMateriaisDinamicos(f ? f.materiais : []);
}

function atualizarSelectMateriaisDinamicos(materiais) {
  var sm = document.getElementById("seletorMaterialBD");
  if (!sm) return;
  sm.innerHTML = "";
  var lista = materiais || [];
  if (!lista.length) {
    sm.innerHTML = '<option value="">Nenhum material</option>';
    materialSelecionadoId = null;
    document.getElementById("nomeMaterialAtivo").textContent = "Manual";
    document.getElementById("detalheMaterialAtivo").textContent = "0,00 € s/ IVA";
    calcular();
    return;
  }
  lista.forEach(function(m) {
    var o = document.createElement("option");
    o.value = m.id;
    o.textContent = m.nome + " (" + parseNum(m.preco).toFixed(2) + " €)";
    sm.appendChild(o);
  });
  if (!materialSelecionadoId || !lista.some(function(m) { return m.id === materialSelecionadoId; })) {
    materialSelecionadoId = lista[0].id;
  }
  sm.value = materialSelecionadoId;
  var f = baseDados.find(function(x) { return x.id === fornecedorSelecionadoId; });
  var m = lista.find(function(x) { return x.id === materialSelecionadoId; });
  if (m) {
    var elCusto = document.getElementById("custoPeca");
    if (elCusto) elCusto.value = parseNum(m.preco).toFixed(2);
    document.getElementById("nomeMaterialAtivo").textContent = m.nome + (f ? " (" + f.nome + ")" : "");
    document.getElementById("detalheMaterialAtivo").textContent = moeda(m.preco) + " s/ IVA";
  }
  calcular();
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

function guardarValoresTecnicaAtual(t) {
  if (!document.getElementById("tecnica")) return;
  
  if (["dtf", "vinil", "sublimacao"].indexOf(t) !== -1) {
    var custoMetro = parseNum(document.getElementById("custoMetroDTF").value);
    var altura = parseNum(document.getElementById("alturaEstampaDTF").value);
    var largura = parseNum(document.getElementById("larguraEstampaDTF").value);
    
    memoriaTecnicas[t] = {
      custoMetro: custoMetro,
      altura: altura,
      largura: largura
    };
  } else {
    var numCores = Math.max(1, parseInt(document.getElementById("numCores").value) || 1);
    memoriaTecnicas[t] = { numCores: numCores };
  }
  
  // Guardar no localStorage imediatamente
  guardarTecnicas(memoriaTecnicas);
}

function alternarTecnica() {
  var t = document.getElementById("tecnica") ? document.getElementById("tecnica").value : "dtf";
  if (!t) return;
  
  // Guardar valores da técnica anterior antes de mudar
  if (tecnicaAnterior && tecnicaAnterior !== t) {
    guardarValoresTecnicaAtual(tecnicaAnterior);
  }
  tecnicaAnterior = t;
  
  var film = ["dtf", "vinil", "sublimacao"].indexOf(t) !== -1;
  document.getElementById("grupoDTF").classList.toggle("hidden", !film);
  document.getElementById("grupoCores").classList.toggle("hidden", film);
  document.getElementById("linhaConsumoFilme").style.display = film ? "flex" : "none";
  
  // Carregar os valores da técnica selecionada
  if (film) {
    var d = memoriaTecnicas[t];
    if (!d) {
      d = JSON.parse(JSON.stringify(VALORES_PADRAO_TECNICAS[t]));
      memoriaTecnicas[t] = d;
    }
    document.getElementById("custoMetroDTF").value = d.custoMetro !== undefined ? d.custoMetro : 5.50;
    document.getElementById("alturaEstampaDTF").value = d.altura !== undefined ? d.altura : 10;
    document.getElementById("larguraEstampaDTF").value = d.largura !== undefined ? d.largura : 28;
    var nomes = {
      dtf: ["Custo Metro DTF (28cm) s/ IVA:", "Consumo Filme DTF:"],
      vinil: ["Custo Metro Vinil (50cm) s/ IVA:", "Consumo Vinil Flex:"],
      sublimacao: ["Custo Metro Sublimação (58cm) s/ IVA:", "Consumo Papel Sublimação:"]
    };
    document.getElementById("labelCustoMetro").textContent = nomes[t][0];
    document.getElementById("labelConsumoFilme").textContent = nomes[t][1];
  } else {
    var d2 = memoriaTecnicas[t];
    if (!d2) {
      d2 = JSON.parse(JSON.stringify(VALORES_PADRAO_TECNICAS[t]));
      memoriaTecnicas[t] = d2;
    }
    document.getElementById("numCores").value = d2.numCores !== undefined ? d2.numCores : 1;
  }
  calcular();
}

function obterCustoPara(qtd, tecnica) {
  var c = TECNICAS[tecnica];
  if (["dtf", "vinil", "sublimacao"].indexOf(tecnica) !== -1) {
    return c.obterCusto(qtd, 
      parseNum(document.getElementById("custoMetroDTF").value), 
      parseNum(document.getElementById("alturaEstampaDTF").value), 
      parseNum(document.getElementById("larguraEstampaDTF").value)
    );
  }
  return c.obterCusto(qtd, parseInt(document.getElementById("numCores").value) || 1);
}

function calcular() {
  var q = Math.max(1, parseInt(document.getElementById("quantidade") ? document.getElementById("quantidade").value : 1) || 1);
  var p = parseNum(document.getElementById("custoPeca") ? document.getElementById("custoPeca").value : 0);
  var portes = parseNum(document.getElementById("portesFornecedor") ? document.getElementById("portesFornecedor").value : 0);
  var tecnica = document.getElementById("tecnica") ? document.getElementById("tecnica").value : "dtf";
  var tipo = document.getElementById("tipoMargem") ? document.getElementById("tipoMargem").value : "valor";
  var margem = parseNum(document.getElementById("valMargem") ? document.getElementById("valMargem").value : 5);
  var imp = obterCustoPara(q, tecnica);
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

  if (["dtf", "vinil", "sublimacao"].indexOf(tecnica) !== -1) {
    document.getElementById("resConsumoFilme").textContent = imp.metrosTotais.toFixed(2).replace(".", ",") + " m";
  }
  gerarComparativoEscaloes(q, pIva, portesIva, tecnica, tipo, margem);
}

function gerarComparativoEscaloes(qAtual, pComIva, portesIva, tecnica, tipo, margem) {
  var c = document.getElementById("tabelaComparativa");
  if (!c) return;
  c.innerHTML = "";
  var escaloes = [1, 10, 25, 50, 100];
  escaloes.forEach(function(q) {
    var imp = obterCustoPara(q, tecnica);
    var custo = pComIva + imp.custoUnComIva + portesIva / q;
    var lucro = margemPorUnidade(q, margem, tipo, custo);
    var item = document.createElement("div");
    item.className = "escalao-item" + (q === qAtual ? " active" : "");
    item.innerHTML = "<strong>" + q + "+</strong><br>" + moeda(custo + lucro);
    c.appendChild(item);
  });
}

function abrirFormFornecedor(edit) {
  var f = baseDados.find(function(x) { return x.id === fornecedorSelecionadoId; });
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
    var f = baseDados.find(function(x) { return x.id === eid; });
    if (f) { f.nome = nome; f.portes = portes; }
  } else {
    var novo = { id: id("f"), nome: nome, portes: portes, materiais: [] };
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
  var f = baseDados.find(function(x) { return x.id === fornecedorSelecionadoId; });
  if (!confirm("Eliminar o fornecedor \"" + (f ? f.nome : "") + "\"?")) return;
  baseDados = baseDados.filter(function(x) { return x.id !== fornecedorSelecionadoId; });
  fornecedorSelecionadoId = null;
  materialSelecionadoId = null;
  guardarBD();
  atualizarSelectsDinamicos();
}

function abrirFormMaterial(edit) {
  var f = baseDados.find(function(x) { return x.id === fornecedorSelecionadoId; });
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
  var f = baseDados.find(function(x) { return x.id === fornecedorSelecionadoId; });
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
  atualizarSelectMateriaisDinamicos(f.materiais);
}
function eliminarMaterial() {
  var f = baseDados.find(function(x) { return x.id === fornecedorSelecionadoId; });
  if (!f) return;
  if (!materialSelecionadoId) return;
  var m = (f.materiais || []).find(function(x) { return x.id === materialSelecionadoId; });
  if (!confirm("Eliminar o material \"" + (m ? m.nome : "") + "\"?")) return;
  f.materiais = (f.materiais || []).filter(function(x) { return x.id !== materialSelecionadoId; });
  materialSelecionadoId = null;
  guardarBD();
  atualizarSelectMateriaisDinamicos(f.materiais);
}

function resumoTexto() {
  var q = document.getElementById("quantidade").value;
  var selTec = document.getElementById("tecnica");
  var t = selTec && selTec.selectedOptions && selTec.selectedOptions[0] ? selTec.selectedOptions[0].text : "";
  var mat = document.getElementById("nomeMaterialAtivo").textContent;
  return "GrafiSantos Print\nArtigo: " + mat + "\nQuantidade: " + q + "\nTécnica: " + t + 
    "\nPreço/un.: " + document.getElementById("resPrecoUn").textContent + 
    "\nTotal: " + document.getElementById("resTotalComercial").textContent + 
    "\nLucro total: " + document.getElementById("resLucroTotal").textContent;
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
  html2pdf().set({
    margin: 8, 
    filename: "GrafiSantos-Calculadora.pdf",
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  }).from(el).save();
}
function imprimir() { window.print(); }

function ligarEventos() {
  var acao = function(idv, tipo, fn) {
    var el = document.getElementById(idv);
    if (el) el.addEventListener(tipo, fn);
  };

  acao("seletorFornecedorBD", "change", function(e) {
    fornecedorSelecionadoId = e.target.value;
    materialSelecionadoId = null;
    atualizarSelectsDinamicos();
  });
  
  acao("seletorMaterialBD", "change", function(e) {
    materialSelecionadoId = e.target.value;
    var f = baseDados.find(function(x) { return x.id === fornecedorSelecionadoId; });
    atualizarSelectMateriaisDinamicos(f ? f.materiais : []);
  });

  acao("btnNovoForn", "click", function() { abrirFormFornecedor(false); });
  acao("btnEditarForn", "click", function() { abrirFormFornecedor(true); });
  acao("btnEliminarForn", "click", eliminarFornecedor);
  acao("btnGuardarFornBD", "click", guardarFornecedor);
  acao("btnFecharFornBD", "click", fecharFormFornecedor);

  acao("btnNovoMat", "click", function() { abrirFormMaterial(false); });
  acao("btnEditarMat", "click", function() { abrirFormMaterial(true); });
  acao("btnEliminarMat", "click", eliminarMaterial);
  acao("btnGuardarMatBD", "click", guardarMaterial);
  acao("btnFecharMatBD", "click", fecharFormMaterial);

  acao("tecnica", "change", alternarTecnica);

  // Função para guardar e calcular quando os inputs mudam
  function guardarECalcular() {
    var t = document.getElementById("tecnica").value;
    guardarValoresTecnicaAtual(t);
    calcular();
  }

  acao("custoMetroDTF", "input", guardarECalcular);
  acao("custoMetroDTF", "change", guardarECalcular);
  acao("alturaEstampaDTF", "input", guardarECalcular);
  acao("alturaEstampaDTF", "change", guardarECalcular);
  acao("larguraEstampaDTF", "input", guardarECalcular);
  acao("larguraEstampaDTF", "change", guardarECalcular);
  acao("numCores", "input", guardarECalcular);
  acao("numCores", "change", guardarECalcular);

  var inputs = ["quantidade", "custoPeca", "portesFornecedor", "tipoMargem", "valMargem"];
  inputs.forEach(function(x) { 
    acao(x, "input", calcular); 
    acao(x, "change", calcular);
  });

  acao("btnCopiarResumo", "click", copiarResumo);
  acao("btnGuardarPDF", "click", guardarPDF);
  acao("btnImprimir", "click", imprimir);
}

document.addEventListener("DOMContentLoaded", function() {
  // Recarregar técnicas do localStorage
  memoriaTecnicas = carregarTecnicas();
  
  carregarBD();
  atualizarSelectsDinamicos();
  ligarEventos();
  alternarTecnica();
  calcular();
  
  // Forçar guardar após carregar
  var t = document.getElementById("tecnica").value;
  guardarValoresTecnicaAtual(t);
});
