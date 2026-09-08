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

  // Totais de Custo
  const portesPorPecaComIva = portesFornecedorComIva / qtd;
  const custoTotalUnComIva = custoPecaBaseComIva + resImpressao.custoUnComIva + portesPorPecaComIva;
  const custoTotalLoteComIva = custoTotalUnComIva * qtd;

  // CÁLCULO DA MARGEM (Diluída se for valor Fixo)
  let lucroUn = 0;
  if (tipoMargem === 'fixo') {
    lucroUn = valMargem / qtd; // Dilui o valor fixo da margem pela quantidade
  } else {
    lucroUn = custoTotalUnComIva * (valMargem / 100); // Percentual sobre o custo unitário
  }

  const precoVendaUn = custoTotalUnComIva + lucroUn;
  const totalComercial = precoVendaUn * qtd;
  const lucroTotal = lucroUn * qtd;

  // Atualizar UI
  document.getElementById('escalaoBadge').innerText = `Escalão ≥ ${resImpressao.minEscalao} un`;
  document.getElementById('resPrecoUn').innerText = formatarMoeda(precoVendaUn);
  document.getElementById('resTotalComercial').innerText = formatarMoeda(totalComercial);
  document.getElementById('resLucroTotal').innerText = formatarMoeda(lucroTotal);

  document.getElementById('resCustoMaterialUn').innerText = formatarMoeda(custoPecaBaseComIva);
  document.getElementById('resCustoImprUn').innerText = formatarMoeda(resImpressao.custoUnComIva);
  document.getElementById('resPortes').innerText = formatarMoeda(portesFornecedorComIva);
  document.getElementById('resCustoTotalLote').innerText = formatarMoeda(custoTotalLoteComIva);

  gerarComparativoEscaloes(qtd, custoPecaBaseComIva, portesFornecedorComIva, tecnica, tipoMargem, valMargem);
}

function gerarComparativoEscaloes(qtdAtual, custoPecaComIva, portesComIva, tecnica, tipoMargem, valMargem) {
  const listaEscaloes = [1, 10, 25, 50, 100];
  const container = document.getElementById('tabelaComparativa');
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
    
    // Dilui a margem fixa também na tabela comparativa
    let lucroUn = 0;
    if (tipoMargem === 'fixo') {
      lucroUn = valMargem / q;
    } else {
      lucroUn = custoUn * (valMargem / 100);
    }

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
    
