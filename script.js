const TAXA_IVA = 1.23;

function parseNum(valor) {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  const limpo = valor.toString().replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

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

function obterMargemPorUnidade(qtd, valMargemInput, tipoMargem, custoUnComIva) {
  if (tipoMargem === 'percentagem') return custoUnComIva * (valMargemInput / 100);
  const margemBase = valMargemInput;
  if (qtd >= 100) return Math.max(0, margemBase - 3.50);
  if (qtd >= 50) return Math.max(0, margemBase - 2.50);
  if (qtd >= 25) return Math.max(0, margemBase - 1.50);
  if (qtd >= 10) return Math.max(0, margemBase - 0.50);
  if (qtd >= 5) return Math.max(0, margemBase - 0.20);
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
      return { custoUnComIva: custoLoteComIva / qtd, metrosTotais: metrosTotais, minEscalao: 1 };
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
      return { custoUnComIva: escalao.precos[idxCor] * TAXA_IVA, minEscalao: escalao.min };
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
      return { custoUnComIva: escalao.precos[idxCor] * TAXA_IVA, minEscalao: escalao.min };
    }
  }
};

function carregarBD() {
  try {
    const guardado = localStorage.getItem('baseDadosGrafiSantos');
    baseDados = guardado ? JSON.parse(guardado) : [...BASE_DADOS_PADRAO];
  } catch (e) {
    baseDados = [...BASE_DADOS_PADRAO];
  }
  guardarBD();
  atualizarSeletorFornecedoresBD();
}

function guardarBD() {
  try { localStorage.setItem('baseDadosGrafiSantos', JSON.stringify(baseDados)); } catch(e) {}
}

function atualizarSeletorFornecedoresBD() {
  const select = document.getElementById('seletorFornecedorBD');
  if (!select) return;
  select.innerHTML = '';
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
  }
  calcular();
}

function atualizarSeletorMateriaisBD(materiais) {
  const select = document.getElementById('seletorMaterialBD');
  if (!select) return;
  select.innerHTML = '';
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

function formatarMoeda(valor) {
  return parseNum(valor).toFixed(2).replace('.', ',') + ' €';
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
}

// INICIALIZAÇÃO SEGURA NO ANDROID
window.addEventListener('DOMContentLoaded', () => {
  carregarBD();
  
  // Associar cliques aos botões diretamente
  const btnNovoForn = document.querySelector('button[onclick*="prepararFormNovoFornecedor"]');
  if(btnNovoForn) btnNovoForn.onclick = () => document.getElementById('formNovoFornecedor').style.display = 'block';

  const btnNovoMat = document.querySelector('button[onclick*="prepararFormNovoMaterial"]');
  if(btnNovoMat) btnNovoMat.onclick = () => document.getElementById('formNovoMaterial').style.display = 'block';

  alternarTecnica();
  calcular();
});
