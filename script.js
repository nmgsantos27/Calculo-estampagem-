const TAXA_IVA = 1.23;

// Base de Dados Padrão Inicial
const ARTIGOS_PADRAO = [
  { id: '1', nome: 'T-Shirt Algodão 150g', preco: 1.85 },
  { id: '2', nome: 'T-Shirt Premium 180g', preco: 2.90 },
  { id: '3', nome: 'Polo Piqué Clássico', preco: 5.20 },
  { id: '4', nome: 'Sweatshirt Gola Redonda', preco: 7.50 },
  { id: '5', nome: 'Hoodie c/ Capuz e Bolso', preco: 9.80 },
  { id: '6', nome: 'Saco Tote Bag Algodão', preco: 0.95 }
];

let artigosBD = [];

// ESCALA REGRESSIVA DE MARGEM POR UNIDADE (€)
// Ajusta aqui os teus patamares de lucro por t-shirt:
const ESCALAO_MARGEM_FIXA = [
  { min: 1, max: 4, margemUn: 7.00 },   // 1 a 4 un: 7,00 € de lucro por peça
  { min: 5, max: 9, margemUn: 6.80 },   // 5 a 9 un: 6,80 € de lucro por peça
  { min: 10, max: 24, margemUn: 6.50 }, // 10 a 24 un: 6,50 € de lucro por peça
  { min: 25, max: 49, margemUn: 5.50 }, // 25 a 49 un: 5,50 € de lucro por peça
  { min: 50, max: 99, margemUn: 4.50 }, // 50 a 99 un: 4,50 € de lucro por peça
  { min: 100, max: Infinity, margemUn: 3.50 } // 100+ un: 3,50 € de lucro por peça
];

function obterMargemPorUnidade(qtd, valMargemInput, tipoMargem, custoUnComIva) {
  if (tipoMargem === 'percentagem') {
    return custoUnComIva * (valMargemInput / 100);
  }
  
  // Se for "fixo", procura o escalão regressivo
  const escalao = ESCALAO_MARGEM_FIXA.find(e => qtd >= e.min && qtd <= e.max);
  if (escalao) {
    return escalao.margemUn;
  }
  
  // Caso a quantidade não se enquadre, assume o valor do input
  return valMargemInput;
}

// Tabela de Preços de Personalização
const TECNICAS = {
  dtf: {
    obterCusto: function(qtd, custoMetro, alturaCm, larguraCm) {
      const margemPerda = 1.05; // 5% de perda
      const larguraFilmeCm = 28; // Área útil 28cm
      
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

// --- GESTÃO DA BASE DE DADOS ---

function carregarBD() {
  try {
    const guardados = localStorage.getItem('artigosBD');
    if (guardados) {
      artigosBD = JSON.parse(guardados);
    } else {
      artigosBD = [...ARTIGOS_PADRAO];
      guardarBD();
    }
  } catch (e) {
    artigosBD = [...ARTIGOS_PADRAO];
  }
  atualizarSeletorArtigos();
}

function guardarBD() {
  try {
    localStorage.setItem('artigosBD', JSON.stringify(artigosBD));
  } catch(e) {
    console.warn("Não foi possível guardar na cache do navegador.");
  }
}

function atualizarSeletorArtigos() {
  const select = document.getElementById('seletorArtigo');
  if (!select) return;
  select.innerHTML = '';

  if (artigosBD.length === 0) {
    const opt = document.createElement('option');
    opt.value = "";
    opt.textContent = "Nenhum artigo registado";
    select.appendChild(opt);
    document.getElementById('nomeArtigoAtivo').innerText = "Manual";
    document.getElementById('custoArtigoAtivo').innerText = "0,00 € s/ IVA";
    return;
  }
  
  artigosBD.forEach(artigo => {
    const opt = document.createElement('option');
    opt.value = artigo.id;
    opt.textContent = `${artigo.nome} (${artigo.preco.toFixed(2)} €)`;
    select.appendChild(opt);
  });

  selecionarArtigoBD();
}

function selecionarArtigoBD() {
  const idSel = document.getElementById('seletorArtigo').value;
  const artigo = artigosBD.find(a => a.id === idSel);

  if (artigo) {
    document.getElementById('nomeArtigoAtivo').innerText = artigo.nome;
    document.getElementById('custoArtigoAtivo').innerText = `${artigo.preco.toFixed(2).replace('.', ',')} € s/ IVA`;
    document.getElementById('custoPeca').value = artigo.preco.toFixed(2);
  }
  calcular();
}

function alternarFormNovoArtigo() {
  const box = document.getElementById('formNovoArtigo');
  if (!box) return;

  if (box.style.display === 'none' || box.style.display === '') {
    box.style.display = 'block';
  } else {
    box.style.display = 'none';
  }
}

function guardarNovoArtigoBD() {
  const inputNome = document.getElementById('novoNomeArtigo');
  const inputPreco = document.getElementById('novoPrecoArtigo');

  if (!inputNome || !inputPreco) return;

  const nome = inputNome.value.trim();
  const precoValor = inputPreco.value.replace(',', '.');
  const preco = parseFloat(precoValor);

  if (!nome) {
    alert('Por favor introduza o nome do artigo.');
    return;
  }

  if (isNaN(preco) || preco <= 0) {
    alert('Por favor introduza um preço válido maior que 0.');
    return;
  }

  const novoArtigo = {
    id: Date.now().toString(),
    nome: nome,
    preco: preco
  };

  artigosBD.push(novoArtigo);
  guardarBD();
  atualizarSeletorArtigos();

  document.getElementById('seletorArtigo').value = novoArtigo.id;
  selecionarArtigoBD();

  inputNome.value = '';
  inputPreco.value = '';
  alternarFormNovoArtigo();
}

function eliminarArtigoAtivo() {
  const idSel = document.getElementById('seletorArtigo').value;
  if (!idSel) return;

  if (confirm('Tem a certeza que deseja eliminar este artigo da Base de Dados?')) {
    artigosBD = artigosBD.filter(a => a.id !== idSel);
    guardarBD();
    atualizarSeletorArtigos();
  }
}

// --- FUNÇÕES DE CÁLCULO E INTERFACE ---

function formatarMoeda(valor) {
  return (parseFloat(valor) || 0).toFixed(2).replace('.', ',') + ' €';
}

function formatarInputDecimal(input) {
  if (input.value !== "") {
    input.value = (parseFloat(input.value) || 0).toFixed(2);
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
  const qtd = parseInt(document.getElementById('quantidade').value) || 1;
  const custoPecaBaseComIva = (parseFloat(document.getElementById('custoPeca').value) || 0) * TAXA_IVA;
  const portesFornecedorComIva = (parseFloat(document.getElementById('portesFornecedor').value) || 0) * TAXA_IVA;
  
  const tecnica = document.getElementById('tecnica').value;
  const tipoMargem = document.getElementById('tipoMargem').value;
  const valMargem = parseFloat(document.getElementById('valMargem').value) || 0;

  const config = TECNICAS[tecnica];
  let resImpressao = { custoUnComIva: 0, minEscalao: 1, metrosTotais: 0 };

  if (tecnica === 'dtf') {
    const custoMetro = parseFloat(document.getElementById('custoMetroDTF').value) || 0;
    const alt = parseFloat(document.getElementById('alturaEstampaDTF').value) || 0;
    const larg = parseFloat(document.getElementById('larguraEstampaDTF').value) || 0;
    resImpressao = config.obterCusto(qtd, custoMetro, alt, larg);
    document.getElementById('resConsumoFilme').innerText = `${resImpressao.metrosTotais.toFixed(2).replace('.', ',')} m`;
  } else {
    const numCores = parseInt(document.getElementById('numCores').value) || 1;
    resImpressao = config.obterCusto(qtd, numCores);
  }

  // Custo por unidade com IVA
  const portesPorPecaComIva = portesFornecedorComIva / qtd;
  const custoTotalUnComIva = custoPecaBaseComIva + resImpressao.custoUnComIva + portesPorPecaComIva;

  // Lógica da Margem Unitária Regressiva
  const lucroUn = obterMargemPorUnidade(qtd, valMargem, tipoMargem, custoTotalUnComIva);
  const lucroTotal = lucroUn * qtd;

  // Preço de venda unitário e totais
  const precoVendaUn = custoTotalUnComIva + lucroUn;
  const totalComercial = precoVendaUn * qtd;
  const custoTotalLoteComIva = custoTotalUnComIva * qtd;

  // Atualizar UI
  document.getElementById('escalaoBadge').innerText = `Escalão ≥ ${resImpressao.minEscalao} un`;
  document.getElementById('resPrecoUn').innerText = formatarMoeda(precoVendaUn);
  document.getElementById('resTotalComercial').innerText = formatarMoeda(totalComercial);
  document.getElementById('resLucroTotal').innerText = formatarMoeda(lucroTotal);

  document.getElementById('resCustoMaterialUn').innerText = formatarMoeda(custoPecaBaseComIva);
  document.getElementById('resCustoImprUn').innerText = formatarMoeda(resImpressao.custoUnComIva);
  document.getElementById('resPortes').innerText = formatarMoeda(portesFornecedorComIva);
  document.getElementById('resCustoTotalLote').innerText = formatarMoeda(custoTotalLoteComIva);

  const elMargemUn = document.getElementById('resMargemUn');
  if (elMargemUn) {
    elMargemUn.innerText = `${formatarMoeda(lucroUn)} / un`;
  }

  gerarComparativoEscaloes(qtd, custoPecaBaseComIva, portesFornecedorComIva, tecnica, tipoMargem, valMargem);
}

function gerarComparativoEscaloes(qtdAtual, custoPecaComIva, portesComIva, tecnica, tipoMargem, valMargem) {
  const listaEscaloes = [1, 10, 25, 50, 100];
  const container = document.getElementById('tabelaComparativa');
  if (!container) return;
  container.innerHTML = '';

  listaEscaloes.forEach(q => {
    const config = TECNICAS[tecnica];
    let res = { custoUnComIva: 0 };

    if (tecnica === 'dtf') {
      const custoMetro = parseFloat(document.getElementById('custoMetroDTF').value) || 0;
      const alt = parseFloat(document.getElementById('alturaEstampaDTF').value) || 0;
      const larg = parseFloat(document.getElementById('larguraEstampaDTF').value) || 0;
      res = config.obterCusto(q, custoMetro, alt, larg);
    } else {
      const numCores = parseInt(document.getElementById('numCores').value) || 1;
      res = config.obterCusto(q, numCores);
    }

    const custoUn = custoPecaComIva + res.custoUnComIva + (portesComIva / q);
    const lucroUn = obterMargemPorUnidade(q, valMargem, tipoMargem, custoUn);
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
  const artigo = document.getElementById('nomeArtigoAtivo').innerText;
  const qtd = document.getElementById('quantidade').value;
  const precoUn = document.getElementById('resPrecoUn').innerText;
  const total = document.getElementById('resTotalComercial').innerText;

  const texto = `Orçamento de Personalização:\n` +
                `- Artigo: ${artigo}\n` +
                `- Quantidade: ${qtd} un\n` +
                `- Preço Unitário: ${precoUn} (c/ IVA)\n` +
                `- Total do Lote: ${total} (c/ IVA)\n` +
                `Válido por 15 dias.`;

  navigator.clipboard.writeText(texto).then(() => {
    alert('Resumo copiado com sucesso!');
  });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  alternarTecnica();
  carregarBD();
});
          
