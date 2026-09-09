const TAXA_IVA = 1.23;

function parseNum(valor) {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  const limpo = valor.toString().replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

// ESTRUTURA INICIAL DE FORNECEDORES E MATERIAIS
const BASE_DADOS_PADRAO = [
  {
    id: 'f1',
    nome: 'Roly',
    portes: 4.50,
    materiais: [
      { id: 'm1_1', nome: 'T-Shirt Beagle 150g', preco: 1.85 },
      { id: 'm1_2', nome: 'Polo Star 200g', preco: 5.20 },
      { id: 'm1_3', nome: 'Hoodie Capuz Capuchana', preco: 9.80 }
    ]
  },
  {
    id: 'f2',
    nome: 'Makito',
    portes: 6.00,
    materiais: [
      { id: 'm2_1', nome: 'T-Shirt Tecnic Sport', preco: 1.45 },
      { id: 'm2_2', nome: 'Saco Algodão Tabela', preco: 0.95 }
    ]
  },
  {
    id: 'f3',
    nome: 'Levantar em Loja / Sem Portes',
    portes: 0.00,
    materiais: [
      { id: 'm3_1', nome: 'Material do Cliente', preco: 0.00 }
    ]
  }
];

let baseDados = [];

// CÁLCULO DA MARGEM DINÂMICA
function obterMargemPorUnidade(qtd, valMargemInput, tipoMargem, custoUnComIva) {
  if (tipoMargem === 'percentagem') {
    return custoUnComIva * (valMargemInput / 100);
  }
  
  const margemBase = valMargemInput;

  if (qtd >= 100) {
    return Math.max(0, margemBase - 3.50);
  } else if (qtd >= 50) {
    return Math.max(0, margemBase - 2.50);
  } else if (qtd >= 25) {
    return Math.max(0, margemBase - 1.50);
  } else if (qtd >= 10) {
    return Math.max(0, margemBase - 0.50);
  } else if (qtd >= 5) {
    return Math.max(0, margemBase - 0.20);
  }
  
  return margemBase;
}

const TECNICAS = {
  dtf: {
    obterCusto: function(qtd, custoMetro, alturaCm, larguraCm) {
      const margemPerda = 1.05;
      const larguraFilmeCm = 28;
      
      const areaTotal = (alturaCm / 100) * (larguraCm / 100) * qtd * margemPerda;
      const metrosTotais = areaTotal / (larguraFilmeCm / 100);
      const custoLoteComIva = metrosTotais * custoMetro * TAXA_IVA;
      
      return {
        custoUnComIva: custoLoteComIva / qtd,
        metrosTotais: metrosTotais,
        minEscalao: 1
      };
    }
  },
  serigrafia: {
    escaloes: [
      { min: 1, max: 9, precos: [8.00, 10.00, 12.00] },
      { min: 10, max: 24, precos: [3.50, 4.50, 5.50] },
      { min: 25, max: 49, precos: [2.20, 2.80, 3.40] },
      { min: 50, max: 99, precos: [1.50, 1.90, 2.30] },
      { min: 100, max: Infinity, precos: [1.00, 1.30, 1.60] }
    ],
    obterCusto: function(qtd, cores) {
      const escalao = this.escaloes.find(e => qtd >= e.min && qtd <= e.max) || this.escaloes[0];
      const idxCor = Math.min(cores, 3) - 1;
      return {
        custoUnComIva: escalao.precos[idxCor] * TAXA_IVA,
        minEscalao: escalao.min
      };
    }
  },
  bordado: {
    escaloes: [
      { min: 1, max: 9, precos: [6.00, 8.00] },
      { min: 10, max: 24, precos: [3.80, 5.00] },
      { min: 25, max: 49, precos: [2.50, 3.50] },
      { min: 50, max: Infinity, precos: [1.80, 2.50] }
    ],
    obterCusto: function(qtd, cores) {
      const escalao = this.escaloes.find(e => qtd >= e.min && qtd <= e.max) || this.escaloes[0];
      const idxCor = cores > 1 ? 1 : 0;
      return {
        custoUnComIva: escalao.precos[idxCor] * TAXA_IVA,
        minEscalao: escalao.min
      };
    }
  }
};

// --- GESTÃO DA BASE DE DADOS (LOCALSTORAGE) ---
function carregarBD() {
  try {
    const guardado = localStorage.getItem('baseDadosGrafiSantos');
    if (guardado) {
      baseDados = JSON.parse(guardado);
    } else {
      baseDados = [...BASE_DADOS_PADRAO];
    }
  } catch (e) {
    baseDados = [...BASE_DADOS_PADRAO];
  }
  guardarBD();
  atualizarSeletorFornecedoresBD();
}

function guardarBD() {
  try {
    localStorage.setItem('baseDadosGrafiSantos', JSON.stringify(baseDados));
  } catch(e) {
    console.warn("Erro ao guardar na cache.");
  }
}

// --- INTERFAÇOES DE FORNECEDORES E MATERIAIS ---
function atualizarSeletorFornecedoresBD() {
  const select = document.getElementById('seletorFornecedorBD');
  if (!select) return;
  select.innerHTML = '';

  if (baseDados.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "Nenhum fornecedor registado";
    select.appendChild(opt);
    atualizarSeletorMateriaisBD([]);
    return;
  }

  baseDados.forEach(forn => {
    const opt = document.createElement('option');
    opt.value = forn.id;
    opt.textContent = `${forn.nome} (Portes: ${parseNum(forn.portes).toFixed(2)} €)`;
    select.appendChild(opt);
  });

  selecionarFornecedorBD();
}

function selecionarFornecedorBD() {
  const fornId = document.getElementById('seletorFornecedorBD').value;
  const forn = baseDados.find(f => f.id === fornId);

  if (forn) {
    document.getElementById('portesFornecedor').value = parseNum(forn.portes).toFixed(2);
    atualizarSeletorMateriaisBD(forn.materiais || []);
  } else {
    atualizarSeletorMateriaisBD([]);
  }
  calcular();
}

function atualizarSeletorMateriaisBD(materiais) {
  const select = document.getElementById('seletorMaterialBD');
  if (!select) return;
  select.innerHTML = '';

  if (!materiais || materiais.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "Nenhum material neste fornecedor";
    select.appendChild(opt);
    document.getElementById('nomeMaterialAtivo').innerText = "Manual";
    document.getElementById('detalheMaterialAtivo').innerText = "0,00 € s/ IVA";
    return;
  }

  materiais.forEach(mat => {
    const opt = document.createElement('option');
    opt.value = mat.id;
    opt.textContent = `${mat.nome} (${parseNum(mat.preco).toFixed(2)} €)`;
    select.appendChild(opt);
  });

  selecionarMaterialBD();
}

function selecionarMaterialBD() {
  const fornId = document.getElementById('seletorFornecedorBD').value;
  const matId = document.getElementById('seletorMaterialBD').value;

  const forn = baseDados.find(f => f.id === fornId);
  if (!forn) return;

  const mat = (forn.materiais || []).find(m => m.id === matId);
  if (mat) {
    const precoNum = parseNum(mat.preco);
    document.getElementById('custoPeca').value = precoNum.toFixed(2);
    document.getElementById('nomeMaterialAtivo').innerText = `${mat.nome} (${forn.nome})`;
    document.getElementById('detalheMaterialAtivo').innerText = `${precoNum.toFixed(2).replace('.', ',')} € s/ IVA`;
  }
  calcular();
}

// --- FORNECEDORES: ADICIONAR / ELIMINAR ---
function alternarFormNovoFornecedor() {
  const box = document.getElementById('formNovoFornecedor');
  if (!box) return;
  box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'block' : 'none';
}

function guardarNovoFornecedorBD() {
  const nome = document.getElementById('novoNomeFornecedor').value.trim();
  const portes = parseNum(document.getElementById('novoPortesFornecedor').value);

  if (!nome) {
    alert('Introduza o nome do fornecedor.');
    return;
  }

  const novoForn = {
    id: 'f_' + Date.now(),
    nome: nome,
    portes: portes,
    materiais: []
  };

  baseDados.push(novoForn);
  guardarBD();
  atualizarSeletorFornecedoresBD();

  document.getElementById('seletorFornecedorBD').value = novoForn.id;
  selecionarFornecedorBD();

  document.getElementById('novoNomeFornecedor').value = '';
  document.getElementById('novoPortesFornecedor').value = '';
  alternarFormNovoFornecedor();
}

function eliminarFornecedorAtivo() {
  const fornId = document.getElementById('seletorFornecedorBD').value;
  if (!fornId) return;

  if (confirm('Tem a certeza que deseja eliminar este fornecedor e todos os seus materiais?')) {
    baseDados = baseDados.filter(f => f.id !== fornId);
    guardarBD();
    atualizarSeletorFornecedoresBD();
  }
}

// --- MATERIAIS: ADICIONAR / ELIMINAR ---
function alternarFormNovoMaterial() {
  const box = document.getElementById('formNovoMaterial');
  if (!box) return;
  box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'block' : 'none';
}

function guardarNovoMaterialBD() {
  const fornId = document.getElementById('seletorFornecedorBD').value;
  const forn = baseDados.find(f => f.id === fornId);

  if (!forn) {
    alert('Selecione primeiro um fornecedor.');
    return;
  }

  const nome = document.getElementById('novoNomeMaterial').value.trim();
  const preco = parseNum(document.getElementById('novoPrecoMaterial').value);

  if (!nome) {
    alert('Introduza o nome do material.');
    return;
  }

  const novoMat = {
    id: 'm_' + Date.now(),
    nome: nome,
    preco: preco
  };

  if (!forn.materiais) forn.materiais = [];
  forn.materiais.push(novoMat);

  guardarBD();
  atualizarSeletorMateriaisBD(forn.materiais);

  document.getElementById('seletorMaterialBD').value = novoMat.id;
  selecionarMaterialBD();

  document.getElementById('novoNomeMaterial').value = '';
  document.getElementById('novoPrecoMaterial').value = '';
  alternarFormNovoMaterial();
}

function eliminarMaterialAtivo() {
  const fornId = document.getElementById('seletorFornecedorBD').value;
  const matId = document.getElementById('seletorMaterialBD').value;

  const forn = baseDados.find(f => f.id === fornId);
  if (!forn || !matId) return;

  if (confirm('Tem a certeza que deseja eliminar este material?')) {
    forn.materiais = forn.materiais.filter(m => m.id !== matId);
    guardarBD();
    atualizarSeletorMateriaisBD(forn.materiais);
  }
}

// --- ESTADO LOCAL DO FORMULÁRIO ---
function guardarEstadoCampos() {
  const estado = {
    quantidade: document.getElementById('quantidade').value,
    custoPeca: document.getElementById('custoPeca').value,
    portesFornecedor: document.getElementById('portesFornecedor').value,
    tecnica: document.getElementById('tecnica').value,
    custoMetroDTF: document.getElementById('custoMetroDTF').value,
    alturaEstampaDTF: document.getElementById('alturaEstampaDTF').value,
    larguraEstampaDTF: document.getElementById('larguraEstampaDTF').value,
    numCores: document.getElementById('numCores').value,
    tipoMargem: document.getElementById('tipoMargem').value,
    valMargem: document.getElementById('valMargem').value,
    fornId: document.getElementById('seletorFornecedorBD') ? document.getElementById('seletorFornecedorBD').value : '',
    matId: document.getElementById('seletorMaterialBD') ? document.getElementById('seletorMaterialBD').value : ''
  };
  localStorage.setItem('ultimoEstadoOrcamento', JSON.stringify(estado));
}

function carregarEstadoCampos() {
  const guardado = localStorage.getItem('ultimoEstadoOrcamento');
  if (!guardado) return;

  try {
    const estado = JSON.parse(guardado);
    if (estado.quantidade !== undefined) document.getElementById('quantidade').value = estado.quantidade;
    if (estado.custoPeca !== undefined) document.getElementById('custoPeca').value = estado.custoPeca;
    if (estado.portesFornecedor !== undefined) document.getElementById('portesFornecedor').value = estado.portesFornecedor;
    if (estado.tecnica !== undefined) document.getElementById('tecnica').value = estado.tecnica;
    if (estado.custoMetroDTF !== undefined) document.getElementById('custoMetroDTF').value = estado.custoMetroDTF;
    if (estado.alturaEstampaDTF !== undefined) document.getElementById('alturaEstampaDTF').value = estado.alturaEstampaDTF;
    if (estado.larguraEstampaDTF !== undefined) document.getElementById('larguraEstampaDTF').value = estado.larguraEstampaDTF;
    if (estado.numCores !== undefined) document.getElementById('numCores').value = estado.numCores;
    if (estado.tipoMargem !== undefined) document.getElementById('tipoMargem').value = estado.tipoMargem;
    if (estado.valMargem !== undefined) document.getElementById('valMargem').value = estado.valMargem;

    if (estado.fornId && document.getElementById('seletorFornecedorBD')) {
      document.getElementById('seletorFornecedorBD').value = estado.fornId;
      selecionarFornecedorBD();
      if (estado.matId && document.getElementById('seletorMaterialBD')) {
        document.getElementById('seletorMaterialBD').value = estado.matId;
        selecionarMaterialBD();
      }
    }
  } catch (e) {
    console.warn("Erro ao carregar estado guardado:", e);
  }
}

// --- CÁLCULO GERAL ---
function formatarMoeda(valor) {
  return parseNum(valor).toFixed(2).replace('.', ',') + ' €';
}

function formatarInputDecimal(input) {
  if (input.value !== "") {
    input.value = parseNum(input.value).toFixed(2);
  }
}

function alternarTecnica() {
  const tecnica = document.getElementById('tecnica').value;
  const grupoDTF = document.getElementById('grupoDTF');
  const grupoCores = document.getElementById('grupoCores');
  const linhaConsumoFilme = document.getElementById('linhaConsumoFilme');

  if (tecnica === 'dtf') {
    grupoDTF.classList.remove('hidden');
    grupoCores.classList.add('hidden');
    linhaConsumoFilme.style.display = 'flex';
  } else {
    grupoDTF.classList.add('hidden');
    grupoCores.classList.remove('hidden');
    linhaConsumoFilme.style.display = 'none';
  }
}

function calcular() {
  const qtd = Math.max(1, parseInt(document.getElementById('quantidade').value) || 1);
  const custoPecaBase = parseNum(document.getElementById('custoPeca').value);
  const portesFornecedorBase = parseNum(document.getElementById('portesFornecedor').value);
  
  const custoPecaBaseComIva = custoPecaBase * TAXA_IVA;
  const portesFornecedorComIva = portesFornecedorBase * TAXA_IVA;
  
  const tecnica = document.getElementById('tecnica').value;
  const tipoMargem = document.getElementById('tipoMargem').value;
  const valMargemInput = parseNum(document.getElementById('valMargem').value);

  const config = TECNICAS[tecnica];
  let resImpressao = { custoUnComIva: 0, minEscalao: 1, metrosTotais: 0 };

  if (tecnica === 'dtf') {
    const custoMetro = parseNum(document.getElementById('custoMetroDTF').value);
    const alt = parseNum(document.getElementById('alturaEstampaDTF').value);
    const larg = parseNum(document.getElementById('larguraEstampaDTF').value);
    resImpressao = config.obterCusto(qtd, custoMetro, alt, larg);
    document.getElementById('resConsumoFilme').innerText = `${resImpressao.metrosTotais.toFixed(2).replace('.', ',')} m`;
  } else {
    const numCores = parseInt(document.getElementById('numCores').value) || 1;
    resImpressao = config.obterCusto(qtd, numCores);
  }

  const portesPorPecaComIva = portesFornecedorComIva / qtd;
  const custoTotalUnComIva = custoPecaBaseComIva + resImpressao.custoUnComIva + portesPorPecaComIva;

  const lucroUn = parseNum(obterMargemPorUnidade(qtd, valMargemInput, tipoMargem, custoTotalUnComIva));
  const lucroTotal = lucroUn * qtd;

  const precoVendaUn = custoTotalUnComIva + lucroUn;
  const totalComercial = precoVendaUn * qtd;
  const custoTotalLoteComIva = custoTotalUnComIva * qtd;

  document.getElementById('escalaoBadge').innerText = `Escalão ≥ ${resImpressao.minEscalao} un`;
  document.getElementById('resPrecoUn').innerText = formatarMoeda(precoVendaUn);
  document.getElementById('resTotalComercial').innerText = formatarMoeda(totalComercial);
  document.getElementById('resLucroUn').innerText = formatarMoeda(lucroUn);
  document.getElementById('resLucroTotal').innerText = formatarMoeda(lucroTotal);

  document.getElementById('resCustoMaterialUn').innerText = formatarMoeda(custoPecaBaseComIva);
  document.getElementById('resCustoImprUn').innerText = formatarMoeda(resImpressao.custoUnComIva);
  document.getElementById('resPortes').innerText = formatarMoeda(portesFornecedorComIva);
  document.getElementById('resCustoTotalLote').innerText = formatarMoeda(custoTotalLoteComIva);

  const elMargemUn = document.getElementById('resMargemUn');
  if (elMargemUn) {
    elMargemUn.innerText = `${formatarMoeda(lucroUn)} / un`;
  }

  gerarComparativoEscaloes(qtd, custoPecaBaseComIva, portesFornecedorComIva, tecnica, tipoMargem, valMargemInput);
  guardarEstadoCampos();
}

function gerarComparativoEscaloes(qtdAtual, custoPecaComIva, portesComIva, tecnica, tipoMargem, valMargemInput) {
  const listaEscaloes = [1, 10, 25, 50, 100];
  const container = document.getElementById('tabelaComparativa');
  if (!container) return;
  container.innerHTML = '';

  listaEscaloes.forEach(q => {
    const config = TECNICAS[tecnica];
    let res = { custoUnComIva: 0 };

    if (tecnica === 'dtf') {
      const custoMetro = parseNum(document.getElementById('custoMetroDTF').value);
      const alt = parseNum(document.getElementById('alturaEstampaDTF').value);
      const larg = parseNum(document.getElementById('larguraEstampaDTF').value);
      res = config.obterCusto(q, custoMetro, alt, larg);
    } else {
      const numCores = parseInt(document.getElementById('numCores').value) || 1;
      res = config.obterCusto(q, numCores);
    }

    const custoUn = custoPecaComIva + res.custoUnComIva + (portesComIva / q);
    const lucroUn = parseNum(obterMargemPorUnidade(q, valMargemInput, tipoMargem, custoUn));
    const precoVendaUn = custoUn + lucroUn;

    const div = document.createElement('div');
    div.className = `escalao-item ${q === qtdAtual ? 'active' : ''}`;
    div.innerHTML = `
      <span>${q} un</span>
      <strong>${formatarMoeda(precoVendaUn)} / un</strong>
    `;
    container.appendChild(div);
  });
}

function copiarResumo() {
  const artigo = document.getElementById('nomeMaterialAtivo').innerText;
  const qtd = document.getElementById('quantidade').value;
  const precoUn = document.getElementById('resPrecoUn').innerText;
  const total = document.getElementById('resTotalComercial').innerText;

  const texto = `Orçamento GrafiSantos Print:\n` +
                `- Material: ${artigo}\n` +
                `- Quantidade: ${qtd} un\n` +
                `- Preço Unitário: ${precoUn} (c/ IVA)\n` +
                `- Total do Lote: ${total} (c/ IVA)\n` +
                `Válido por 15 dias.`;

  navigator.clipboard.writeText(texto).then(() => {
    alert('Resumo copiado com sucesso!');
  });
}

function guardarPDF() {
  const elemento = document.getElementById('areaParaPdf');
  const nomeArtigo = document.getElementById('nomeMaterialAtivo').innerText.replace(/[^a-zA-Z0-9]/g, '_');
  
  const opcoes = {
    margin:       10,
    filename:     `Orcamento_GrafiSantos_${nomeArtigo || 'Print'}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opcoes).from(elemento).save();
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
  carregarBD();
  carregarEstadoCampos();
  alternarTecnica();
  calcular();
});
