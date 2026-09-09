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
let fornecedorSelecionadoId = null;
let materialSelecionadoId = null;

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

function carregarBD() {
  try {
    const guardado = localStorage.getItem('baseDadosGrafiSantos');
    baseDados = guardado ? JSON.parse(guardado) : [...BASE_DADOS_PADRAO];
  } catch (e) {
    baseDados = [...BASE_DADOS_PADRAO];
  }
  guardarBD();
}

function guardarBD() {
  try { localStorage.setItem('baseDadosGrafiSantos', JSON.stringify(baseDados)); } catch(e) {}
}

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

function renderizarInterfaceCompleta() {
  const app = document.getElementById('areaParaPdf');
  if (!app) return;
  
  app.innerHTML = `
    <header class="header-acoes">
      <h1>GrafiSantos Print</h1>
      <div class="grupo-botoes-topo">
        <button type="button" id="btnCopiarResumo" class="btn btn-secundario">Copiar</button>
        <button type="button" id="btnGuardarPDF" class="btn btn-secundario">PDF</button>
        <button type="button" id="btnImprimir" class="btn btn-secundario">Imprimir</button>
      </div>
    </header>

    <section class="card bd-section">
      <div class="linha-flex">
        <div class="campo" style="margin-bottom:0;">
          <label for="seletorFornecedorBD">Fornecedor:</label>
          <select id="seletorFornecedorBD"></select>
        </div>
        <div class="botoes-gestao">
          <button type="button" id="btnNovoForn" class="btn-icon">+</button>
          <button type="button" id="btnEditarForn" class="btn-icon">✎</button>
          <button type="button" id="btnEliminarForn" class="btn-icon btn-danger">✕</button>
        </div>
      </div>

      <div id="formNovoFornecedor" class="painel-form hidden">
        <h4 id="tituloFormFornecedor">Fornecedor</h4>
        <input type="hidden" id="editFornecedorId">
        <input type="text" id="novoNomeFornecedor" placeholder="Nome do Fornecedor">
        <input type="number" inputmode="decimal" id="novoPortesFornecedor" placeholder="Portes (€)">
        <div class="linha-botoes">
          <button type="button" id="btnGuardarFornBD" class="btn btn-sucesso">Guardar</button>
          <button type="button" id="btnFecharFornBD" class="btn btn-cancelar">Cancelar</button>
        </div>
      </div>

      <div class="linha-flex" style="margin-top:8px;">
        <div class="campo" style="margin-bottom:0;">
          <label for="seletorMaterialBD">Material / T-Shirt:</label>
          <select id="seletorMaterialBD"></select>
        </div>
        <div class="botoes-gestao">
          <button type="button" id="btnNovoMat" class="btn-icon">+</button>
          <button type="button" id="btnEditarMat" class="btn-icon">✎</button>
          <button type="button" id="btnEliminarMat" class="btn-icon btn-danger">✕</button>
        </div>
      </div>

      <div id="formNovoMaterial" class="painel-form hidden">
        <h4 id="tituloFormMaterial">Material</h4>
        <input type="hidden" id="editMaterialId">
        <input type="text" id="novoNomeMaterial" placeholder="Nome do Material">
        <input type="number" inputmode="decimal" id="novoPrecoMaterial" placeholder="Preço Base (€)">
        <div class="linha-botoes">
          <button type="button" id="btnGuardarMatBD" class="btn btn-sucesso">Guardar</button>
          <button type="button" id="btnFecharMatBD" class="btn btn-cancelar">Cancelar</button>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="grid-2">
        <div class="campo">
          <label for="quantidade">Quantidade:</label>
          <input type="number" inputmode="numeric" id="quantidade" value="1" min="1">
        </div>
        <div class="campo">
          <label for="tecnica">Técnica:</label>
          <select id="tecnica">
            <option value="dtf">DTF</option>
            <option value="vinil">Vinil Flex</option>
            <option value="sublimacao">Sublimação</option>
            <option value="serigrafia">Serigrafia</option>
            <option value="bordado">Bordado</option>
          </select>
        </div>
      </div>

      <div class="grid-2">
        <div class="campo">
          <label for="custoPeca">Custo Peça s/ IVA (€):</label>
          <input type="number" inputmode="decimal" id="custoPeca" value="0.00" step="0.01">
        </div>
        <div class="campo">
          <label for="portesFornecedor">Portes Lote s/ IVA (€):</label>
          <input type="number" inputmode="decimal" id="portesFornecedor" value="0.00" step="0.01">
        </div>
      </div>

      <div id="grupoDTF" class="painel-tecnica">
        <div class="campo">
          <label id="labelCustoMetro" for="custoMetroDTF">Custo Metro s/ IVA (€):</label>
          <input type="number" inputmode="decimal" id="custoMetroDTF" value="5.50" step="0.10">
        </div>
        <div class="grid-2">
          <div class="campo">
            <label for="alturaEstampaDTF">Altura (cm):</label>
            <input type="number" inputmode="decimal" id="alturaEstampaDTF" value="10">
          </div>
          <div class="campo">
            <label for="larguraEstampaDTF">Largura (cm):</label>
            <input type="number" inputmode="decimal" id="larguraEstampaDTF" value="28">
          </div>
        </div>
      </div>

      <div id="grupoCores" class="painel-tecnica hidden">
        <div class="campo">
          <label for="numCores">Número de Cores / Posições:</label>
          <input type="number" inputmode="numeric" id="numCores" value="1" min="1" max="3">
        </div>
      </div>

      <div class="grid-2">
        <div class="campo">
          <label for="tipoMargem">Tipo de Margem:</label>
          <select id="tipoMargem">
            <option value="valor">Valor Fixo (€)</option>
            <option value="percentagem">Percentagem (%)</option>
          </select>
        </div>
        <div class="campo">
          <label for="valMargem">Margem Lucro:</label>
          <input type="number" inputmode="decimal" id="valMargem" value="5.00" step="0.50">
        </div>
      </div>
    </section>

    <section class="card resultados">
      <div class="linha-resultado destaque">
        <span>Preço Venda / Un (c/ IVA):</span>
        <strong id="resPrecoUn">0,00 €</strong>
      </div>
      <div class="linha-resultado destaque-total">
        <span>Total Comercial (c/ IVA):</span>
        <strong id="resTotalComercial">0,00 €</strong>
      </div>

      <hr>

      <div class="detalhes-custo">
        <div class="linha-resultado"><span>Material (c/ IVA):</span> <span id="resCustoMaterialUn">0,00 €</span></div>
        <div class="linha-resultado"><span>Impressão (c/ IVA):</span> <span id="resCustoImprUn">0,00 €</span></div>
        <div class="linha-resultado"><span>Portes Lote (c/ IVA):</span> <span id="resPortes">0,00 €</span></div>
        <div class="linha-resultado" id="linhaConsumoFilme">
          <span id="labelConsumoFilme">Consumo Material:</span> <span id="resConsumoFilme">0,00 m</span>
        </div>
        <div class="linha-resultado"><span>Custo Total Lote (c/ IVA):</span> <span id="resCustoTotalLote">0,00 €</span></div>
        <div class="linha-resultado"><span>Lucro Unitário:</span> <span id="resLucroUn">0,00 €</span></div>
        <div class="linha-resultado"><span>Lucro Total Estimado:</span> <span id="resLucroTotal">0,00 €</span></div>
      </div>

      <div class="badge-escalao" id="escalaoBadge">Escalão</div>
      
      <div class="comparativo-escaloes">
        <h4>Tabela Comparativa por Quantidade</h4>
        <div id="tabelaComparativa" class="grid-escaloes"></div>
      </div>
    </section>

    <footer class="info-material-ativo">
      Artigo: <strong id="nomeMaterialAtivo">Nenhum</strong> (<span id="detalheMaterialAtivo">0,00 €</span>)
    </footer>
  `;

  atualizarSelectsDinamicos();
}

function atualizarSelectsDinamicos() {
  const selectForn = document.getElementById('seletorFornecedorBD');
  if (!selectForn) return;
  
  const valorAnteriorForn = fornecedorSelecionadoId || selectForn.value;
  selectForn.innerHTML = '';

  if (baseDados.length === 0) {
    selectForn.innerHTML = '<option value="">Nenhum fornecedor</option>';
    atualizarSelectMateriaisDinamicos([]);
    return;
  }

  baseDados.forEach(forn => {
    const opt = document.createElement('option');
    opt.value = forn.id;
    opt.textContent = `${forn.nome} (Portes: ${parseNum(forn.portes).toFixed(2)} €)`;
    selectForn.appendChild(opt);
  });

  if (baseDados.some(f => f.id === valorAnteriorForn)) {
    selectForn.value = valorAnteriorForn;
  } else {
    selectForn.value = baseDados[0].id;
  }

  fornecedorSelecionadoId = selectForn.value;
  const fornAtual = baseDados.find(f => f.id === fornecedorSelecionadoId);
  
  if (fornAtual) {
    document.getElementById('portesFornecedor').value = parseNum(fornAtual.portes).toFixed(2);
    atualizarSelectMateriaisDinamicos(fornAtual.materiais || []);
  } else {
    atualizarSelectMateriaisDinamicos([]);
  }
}

function atualizarSelectMateriaisDinamicos(materiais) {
  const selectMat = document.getElementById('seletorMaterialBD');
  if (!selectMat) return;

  const valorAnteriorMat = materialSelecionadoId || selectMat.value;
  selectMat.innerHTML = '';

  if (!materiais || materiais.length === 0) {
    selectMat.innerHTML = '<option value="">Nenhum material</option>';
    document.getElementById('nomeMaterialAtivo').innerText = "Manual";
    document.getElementById('detalheMaterialAtivo').innerText = "0,00 € s/ IVA";
    return;
  }

  materiais.forEach(mat => {
    const opt = document.createElement('option');
    opt.value = mat.id;
    opt.textContent = `${mat.nome} (${parseNum(mat.preco).toFixed(2)} €)`;
    selectMat.appendChild(opt);
  });

  if (materiais.some(m => m.id === valorAnteriorMat)) {
    selectMat.value = valorAnteriorMat;
  } else {
    selectMat.value = materiais[0].id;
  }

  materialSelecionadoId = selectMat.value;
  const forn = baseDados.find(f => f.id === fornecedorSelecionadoId);
  const mat = materiais.find(m => m.id === materialSelecionadoId);

  if (forn && mat) {
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
      memoriaTecnicas[tecnica] = { numCores: parseInt(elCores.value) || 1 };
    }
  }
}

function alternarTecnica() {
  const selectTecnica = document.getElementById('tecnica');
  if (!selectTecnica) return;
  
  const tecnicaNova = selectTecnica.value;
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
  const qtdEl = document.getElementById('quantidade');
  if (!qtdEl) return;

  const qtd = Math.max(1, parseInt(qtdEl.value) || 1);
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