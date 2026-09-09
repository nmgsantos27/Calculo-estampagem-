const TAXA_IVA = 1.23;

function parseNum(valor) {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  const limpo = valor.toString().replace(',', '.').trim();
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

const memoriaTecnicas = {
  dtf: { custoMetro: 5.50, altura: 10, largura: 28 },
  vinil: { custoMetro: 6.50, altura: 10, largura: 28 },
  sublimacao: { custoMetro: 4.50, altura: 10, largura: 28 },
  serigrafia: { numCores: 1 },
  bordado: { numCores: 1 }
};

let tecnicaAnterior = 'dtf';

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

function calcularCustoMetroGeral(qtd, custoMetro, alturaCm, larguraCm, larguraBobinaCm) {
  const margemPerda = 1.05;
  const areaTotal = (alturaCm / 100) * (larguraCm / 100) * qtd * margemPerda;
  const metrosTotais = areaTotal / (larguraBobinaCm / 100);
  const custoLoteComIva = metrosTotais * custoMetro * TAXA_IVA;
  return { custoUnComIva: custoLoteComIva / qtd, metrosTotais: metrosTotais, minEscalao: 1 };
}

const TECNICAS = {
  dtf: {
    obterCusto: (qtd, custoMetro, alturaCm, larguraCm) => calcularCustoMetroGeral(qtd, custoMetro, alturaCm, larguraCm, 28)
  },
  vinil: {
    obterCusto: (qtd, custoMetro, alturaCm, larguraCm) => calcularCustoMetroGeral(qtd, custoMetro, alturaCm, larguraCm, 50)
  },
  sublimacao: {
    obterCusto: (qtd, custoMetro, alturaCm, larguraCm) => calcularCustoMetroGeral(qtd, custoMetro, alturaCm, larguraCm, 58)
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

  if (baseDados.length === 0) {
    select.innerHTML = '<option value="">Nenhum fornecedor</option>';
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
  const select = document.getElementById('seletorFornecedorBD');
  if (!select) return;
  const forn = baseDados.find(f => f.id === select.value);

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
    select.innerHTML = '<option value="">Nenhum material</option>';
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

function formatarMoeda(valor) {
  return parseNum(valor).toFixed(2).replace('.', ',') + ' €';
}

function guardarValoresTecnicaAtual(tecnica) {
  if (tecnica === 'dtf' || tecnica === 'vinil' || tecnica === 'sublimacao') {
    const elMetro = document.getElementById('custoMetroDTF');
    const elAlt = document.getElementById('alturaEstampaDTF');
    const elLarg = document.getElementById('larguraEstampaDTF');
    if (elMetro && elAlt && elLarg) {
      memoriaTecnicas[tecnica] = {
        custoMetro: parseNum(elMetro.value),
        altura: parseNum(elAlt.value),
        largura: parseNum(elLarg.value)
      };
    }
  } else if (tecnica === 'serigrafia' || tecnica === 'bordado') {
    const elCores = document.getElementById('numCores');
    if (elCores) {
      memoriaTecnicas[tecnica] = {
        numCores: parseInt(elCores.value) || 1
      };
    }
  }
}

function alternarTecnica() {
  const tecnicaNova = document.getElementById('tecnica').value;
  guardarValoresTecnicaAtual(tecnicaAnterior);
  tecnicaAnterior = tecnicaNova;

  const grupoDTF = document.getElementById('grupoDTF');
  const grupoCores = document.getElementById('grupoCores');
  const linhaConsumoFilme = document.getElementById('linhaConsumoFilme');
  const labelCustoMetro = document.getElementById('labelCustoMetro');
  const labelConsumoFilme = document.getElementById('labelConsumoFilme');

  if (tecnicaNova === 'dtf' || tecnicaNova === 'vinil' || tecnicaNova === 'sublimacao') {
    grupoDTF.classList.remove('hidden');
    grupoCores.classList.add('hidden');
    linhaConsumoFilme.style.display = 'flex';

    const dadosGuardados = memoriaTecnicas[tecnicaNova];
    document.getElementById('custoMetroDTF').value = dadosGuardados.custoMetro.toFixed(2);
    document.getElementById('alturaEstampaDTF').value = dadosGuardados.altura;
    document.getElementById('larguraEstampaDTF').value = dadosGuardados.largura;

    if (tecnicaNova === 'dtf') {
      labelCustoMetro.innerText = 'Custo Metro DTF (28cm) s/ IVA:';
      labelConsumoFilme.innerText = 'Consumo Filme DTF:';
    } else if (tecnicaNova === 'vinil') {
      labelCustoMetro.innerText = 'Custo Metro Vinil (50cm) s/ IVA:';
      labelConsumoFilme.innerText = 'Consumo Vinil Flex:';
    } else if (tecnicaNova === 'sublimacao') {
      labelCustoMetro.innerText = 'Custo Metro Sublimação (58cm) s/ IVA:';
      labelConsumoFilme.innerText = 'Consumo Papel Sublimação:';
    }
  } else {
    grupoDTF.classList.add('hidden');
    grupoCores.classList.remove('hidden');
    linhaConsumoFilme.style.display = 'none';

    const dadosGuardados = memoriaTecnicas[tecnicaNova];
    document.getElementById('numCores').value = dadosGuardados.numCores;
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

  if (tecnica === 'dtf' || tecnica === 'vinil' || tecnica === 'sublimacao') {
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

  gerarComparativoEscaloes(qtd, custoPecaBaseComIva, portesFornecedorComIva, tecnica, tipoMargem, valMargemInput);
}

function gerarComparativoEscaloes(qtdAtual, custoPecaComIva, portesComIva, tecnica, tipoMargem, valMargemInput) {
  const listaEscaloes = [1, 10, 25, 50, 100];
  const container = document.getElementById('tabelaComparativa');
  if (!container) return;
  container.innerHTML = '';

  listaEscaloes.forEach(q => {
    const config = TECNICAS[tecnica];
    let res = { custoUnComIva: 0 };

    if (tecnica === 'dtf' || tecnica === 'vinil' || tecnica === 'sublimacao') {
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

  const texto = `ORÇAMENTO GRAFISANTOS PRINT\nArtigo: ${artigo}\nQuantidade: ${qtd} un\nPreço Unitário (c/ IVA): ${precoUn}\nTotal (c/ IVA): ${total}`;

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(texto).then(() => alert('Resumo copiado!'));
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Resumo copiado!');
  }
}

function guardarPDF() {
  if (typeof html2pdf === 'undefined') {
    alert('A biblioteca de PDF ainda está a carregar.');
    return;
  }
  const elemento = document.getElementById('areaParaPdf');
  const opt = {
    margin:       5,
    filename:     'Orcamento_GrafiSantos.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 1.5, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(elemento).save();
}

function associarAcaoBotao(id, acao) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      acao();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarBD();

  associarAcaoBotao('btnNovoForn', () => {
    document.getElementById('tituloFormFornecedor').innerText = 'Adicionar Fornecedor';
    document.getElementById('editFornecedorId').value = '';
    document.getElementById('novoNomeFornecedor').value = '';
    document.getElementById('novoPortesFornecedor').value = '';
    document.getElementById('formNovoFornecedor').classList.remove('hidden');
  });

  associarAcaoBotao('btnEditarForn', () => {
    const fornId = document.getElementById('seletorFornecedorBD').value;
    const forn = baseDados.find(f => f.id === fornId);
    if (!forn) return alert('Selecione um fornecedor.');
    document.getElementById('tituloFormFornecedor').innerText = 'Editar Fornecedor';
    document.getElementById('editFornecedorId').value = forn.id;
    document.getElementById('novoNomeFornecedor').value = forn.nome;
    document.getElementById('novoPortesFornecedor').value = parseNum(forn.portes).toFixed(2);
    document.getElementById('formNovoFornecedor').classList.remove('hidden');
  });

  associarAcaoBotao('btnEliminarForn', () => {
    const fornId = document.getElementById('seletorFornecedorBD').value;
    if (fornId && confirm('Eliminar este fornecedor?')) {
      baseDados = baseDados.filter(f => f.id !== fornId);
      guardarBD();
      atualizarSeletorFornecedoresBD();
    }
  });

  associarAcaoBotao('btnGuardarFornBD', () => {
    const editId = document.getElementById('editFornecedorId').value;
    const nome = document.getElementById('novoNomeFornecedor').value.trim();
    const portes = parseNum(document.getElementById('novoPortesFornecedor').value);
    if (!nome) return alert('Introduza o nome.');

    if (editId) {
      const forn = baseDados.find(f => f.id === editId);
      if (forn) { forn.nome = nome; forn.portes = portes; }
    } else {
      baseDados.push({ id: 'f_' + Date.now(), nome, portes, materiais: [] });
    }
    guardarBD();
    atualizarSeletorFornecedoresBD();
    document.getElementById('formNovoFornecedor').classList.add('hidden');
  });

  associarAcaoBotao('btnFecharFornBD', () => {
    document.getElementById('formNovoFornecedor').classList.add('hidden');
  });

  associarAcaoBotao('btnNovoMat', () => {
    document.getElementById('tituloFormMaterial').innerText = 'Adicionar Material';
    document.getElementById('editMaterialId').value = '';
    document.getElementById('novoNomeMaterial').value = '';
    document.getElementById('novoPrecoMaterial').value = '';
    document.getElementById('formNovoMaterial').classList.remove('hidden');
  });

  associarAcaoBotao('btnEditarMat', () => {
    const fornId = document.getElementById('seletorFornecedorBD').value;
    const matId = document.getElementById('seletorMaterialBD').value;
    const forn = baseDados.find(f => f.id === fornId);
    const mat = forn ? (forn.materiais || []).find(m => m.id === matId) : null;
    if (!mat) return alert('Selecione um material.');
    document.getElementById('tituloFormMaterial').innerText = 'Editar Material';
    document.getElementById('editMaterialId').value = mat.id;
    document.getElementById('novoNomeMaterial').value = mat.nome;
    document.getElementById('novoPrecoMaterial').value = parseNum(mat.preco).toFixed(2);
    document.getElementById('formNovoMaterial').classList.remove('hidden');
  });

  associarAcaoBotao('btnEliminarMat', () => {
    const fornId = document.getElementById('seletorFornecedorBD').value;
    const matId = document.getElementById('seletorMaterialBD').value;
    const forn = baseDados.find(f => f.id === fornId);
    if (forn && matId && confirm('Eliminar material?')) {
      forn.materiais = forn.materiais.filter(m => m.id !== matId);
      guardarBD();
      atualizarSeletorMateriaisBD(forn.materiais);
    }
  });

  associarAcaoBotao('btnGuardarMatBD', () => {
    const fornId = document.getElementById('seletorFornecedorBD').value;
    const forn = baseDados.find(f => f.id === fornId);
    if (!forn) return;
    const editId = document.getElementById('editMaterialId').value;
    const nome = document.getElementById('novoNomeMaterial').value.trim();
    const preco = parseNum(document.getElementById('novoPrecoMaterial').value);
    if (!nome) return alert('Introduza o nome.');

    if (editId) {
      const mat = (forn.materiais || []).find(m => m.id === editId);
      if (mat) { mat.nome = nome; mat.preco = preco; }
    } else {
      if (!forn.materiais) forn.materiais = [];
      forn.materiais.push({ id: 'm_' + Date.now(), nome, preco });
    }
    guardarBD();
    atualizarSeletorMateriaisBD(forn.materiais);
    document.getElementById('formNovoMaterial').classList.add('hidden');
  });

  associarAcaoBotao('btnFecharMatBD', () => {
    document.getElementById('formNovoMaterial').classList.add('hidden');
  });

  associarAcaoBotao('btnCopiarResumo', copiarResumo);
  associarAcaoBotao('btnGuardarPDF', guardarPDF);
  associarAcaoBotao('btnImprimir', () => window.print());

  // Ligar as alterações dos seletores principais às respetivas funções
  docum