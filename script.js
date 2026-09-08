const TAXA_IVA = 1.23;

function parseNum(valor) {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;
  const limpo = valor.toString().replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

const ARTIGOS_PADRAO = [
  { id: '1', nome: 'T-Shirt Algodão 150g', preco: 1.85 },
  { id: '2', nome: 'T-Shirt Premium 180g', preco: 2.90 },
  { id: '3', nome: 'Polo Piqué Clássico', preco: 5.20 },
  { id: '4', nome: 'Sweatshirt Gola Redonda', preco: 7.50 },
  { id: '5', nome: 'Hoodie c/ Capuz e Bolso', preco: 9.80 },
  { id: '6', nome: 'Saco Tote Bag Algodão', preco: 0.95 }
];

let artigosBD = [];

const ESCALAO_MARGEM_FIXA = [
  { min: 1, max: 4, margemUn: 7.00 },
  { min: 5, max: 9, margemUn: 6.80 },
  { min: 10, max: 24, margemUn: 6.50 },
  { min: 25, max: 49, margemUn: 5.50 },
  { min: 50, max: 99, margemUn: 4.50 },
  { min: 100, max: Infinity, margemUn: 3.50 }
];

function obterMargemPorUnidade(qtd, valMargemInput, tipoMargem, custoUnComIva) {
  if (tipoMargem === 'percentagem') {
    return custoUnComIva * (valMargemInput / 100);
  }
  
  const escalao = ESCALAO_MARGEM_FIXA.find(e => qtd >= e.min && qtd <= e.max);
  if (escalao) {
    return escalao.margemUn;
  }
  
  return valMargemInput;
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

function carregarBD() {
  try {
    const guardados = localStorage.getItem('artigosBD');
    if (guardados) {
      let lidos = JSON.parse(guardados);
      // Filtra e remove automaticamente itens inválidos ou "undefined"
      artigosBD = lidos.filter(a => a && a.id && a.nome && a.nome !== 'undefined');
    } else {
      artigosBD = [...ARTIGOS_PADRAO];
    }
  } catch (e) {
    artigosBD = [...ARTIGOS_PADRAO];
  }
  guardarBD();
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
    opt.textContent = `${artigo.nome} (${parseNum(artigo.preco).toFixed(2)} €)`;
    select.appendChild(opt);
  });

  selecionarArtigoBD();
}

function selecionarArtigoBD() {
  const idSel = document.getElementById('seletorArtigo').value;
  const artigo = artigosBD.find(a => a.id === idSel);

  if (artigo) {
    const precoNum = parseNum(artigo.preco);
    document.getElementById('nomeArtigoAtivo').innerText = artigo.nome;
    document.getElementById('custoArtigoAtivo').innerText = `${precoNum.toFixed(2).replace('.', ',')} € s/ IVA`;
    document.getElementById('custoPeca').value = precoNum.toFixed(2);
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
  const preco = parseNum(inputPreco.value);

  if (!nome || nome.toLowerCase() === 'undefined') {
    alert('Por favor introduza um nome de artigo válido.');
    return;
  }

  if (preco <= 0) {
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
    artigosBD = artigosBD.filter(a => a.id !== idSel && a.nome !== 'undefined');
    guardarBD();
    atualizarSeletorArtigos();
  }
}

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
  const artigo = document.getElementById('nomeArtigoAtivo').innerText;
  const qtd = document.getElementById('quantidade').value;
  const precoUn = document.getElementById('resPrecoUn').innerText;
  const total = document.getElementById('resTotalComercial').innerText;

  const texto = `Orçamento GrafiSantos Print:\n` +
                `- Artigo: ${artigo}\n` +
                `- Quantidade: ${qtd} un\n` +
                `- Preço Unitário: ${precoUn} (c/ IVA)\n` +
                `- Total do Lote: ${total} (c/ IVA)\n` +
                `Válido por 15 dias.`;

  navigator.clipboard.writeText(texto).then(() => {
    alert('Resumo copiado com sucesso!');
  });
}

// Inicialização e Registo do Service Worker para PWA
document.addEventListener('DOMContentLoaded', () => {
  alternarTecnica();
  carregarBD();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('Service Worker Registado!'))
      .catch((err) => console.log('Erro ao registar Service Worker:', err));
  }
});
