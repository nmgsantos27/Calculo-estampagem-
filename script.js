  dtf: {
    obterCusto: function(qtd, custoMetro, alturaCm, larguraCm) {
      const margemPerda = 1.05; // 5% de margem de segurança/perda
      const larguraFilmeCm = 28; // Largura útil do rolo de 30cm (ex: 28cm de área de impressão)
      
      // Cálculo da área necessária em metros
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
