/* GrafiSantos Print - versão corrigida
   Mantém a lógica da calculadora original e completa a inicialização,
   gestão de fornecedores/materiais, eventos, PDF, impressão e comparação.
*/
"use strict";

const TAXA_IVA = 1.23;
const STORAGE_KEY = "baseDadosGrafiSantos";

function parseNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function moeda(v) { return parseNum(v).toFixed(2).replace(".", ",") + " €"; }
function id(prefix) { return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2,7); }

const memoriaTecnicas = {
  dtf: { custoMetro: 5.50, altura: 10, largura: 28 },
  vinil: { custoMetro: 6.50, altura: 10, largura: 28 },
  sublimacao: { custoMetro: 4.50, altura: 10, largura: 28 },
  serigrafia: { numCores: 1 },
  bordado: { numCores: 1 }
};

const BASE_DADOS_PADRAO = [
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

const TECNICAS = {
  dtf: {
    bobina:28,
    obterCusto(qtd, metro, alt, larg) {
      return custoMetro(qtd, metro, alt, larg, 28);
    }
  },
  vinil: {
    bobina:50,
    obterCusto(qtd, metro, alt, larg) {
      return custoMetro(qtd, metro, alt, larg, 50);
    }
  },
  sublimacao: {
    bobina:58,
    obterCusto(qtd, metro, alt, larg) {
      return custoMetro(qtd, metro, alt, larg, 58);
    }
  },
  serigrafia: {
    escaloes:[
      {min:1,max:9,precos:[8,10,12]},
      {min:10,max:24,precos:[3.5,4.5,5.5]},
      {min:25,max:49,precos:[2.2,2.8,3.4]},
      {min:50,max:99,precos:[1.5,1.9,2.3]},
      {min:100,max:Infinity,precos:[1,1.3,1.6]}
    ],
    obterCusto(qtd, cores) {
      const e=this.escaloes.find(x=>qtd>=x.min && qtd<=x.max)||this.escaloes[0];
      const idx=Math.max(0,Math.min(2,(parseInt(cores)||1)-1));
      return {custoUnComIva:e.precos[idx]*TAXA_IVA,minEscalao:e.min,metrosTotais:0};
    }
  },
  bordado: {
    escaloes:[
      {min:1,max:9,precos:[6,8]},
      {min:10,max:24,precos:[3.8,5]},
      {min:25,max:49,precos:[2.5,3.5]},
      {min:50,max:Infinity,precos:[1.8,2.5]}
    ],
    obterCusto(qtd, cores) {
      const e=this.escaloes.find(x=>qtd>=x.min && qtd<=x.max)||this.escaloes[0];
      const idx=(parseInt(cores)||1)>1?1:0;
      return {custoUnComIva:e.precos[idx]*TAXA_IVA,minEscalao:e.min,metrosTotais:0};
    }
  }
};

function custoMetro(qtd, metro, alt, larg, bobina) {
  qtd=Math.max(1,parseInt(qtd)||1);
  const area=(Math.max(0,parseNum(alt))/100)*(Math.max(0,parseNum(larg))/100)*qtd*1.05;
  const metros=area/(bobina/100);
  return {custoUnComIva:(metros*Math.max(0,parseNum(metro))*TAXA_IVA)/qtd, metrosTotais:metros, minEscalao:1};
}

let baseDados=[];
let fornecedorSelecionadoId=null;
let materialSelecionadoId=null;
let tecnicaAnterior="dtf";

function carregarBD(){
  try {
    const raw=localStorage.getItem(STORAGE_KEY);
    const data=raw?JSON.parse(raw):null;
    baseDados=Array.isArray(data)?data:structuredClone(BASE_DADOS_PADRAO);
  } catch(e) { baseDados=structuredClone(BASE_DADOS_PADRAO); }
  guardarBD();
}
function guardarBD(){
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(baseDados)); } catch(e) {}
}

function renderizarInterfaceCompleta(){
  const app=document.getElementById("areaParaPdf");
  if(!app) return;
  app.innerHTML=`
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
        <div class="campo" style="margin-bottom:0">
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
        <h4 id="tituloFormFornecedor">Novo fornecedor</h4>
        <input type="hidden" id="editFornecedorId">
        <input type="text" id="novoNomeFornecedor" placeholder="Nome do Fornecedor">
        <input type="number" inputmode="decimal" id="novoPortesFornecedor" placeholder="Portes (€)" step="0.01">
        <div class="linha-botoes">
          <button type="button" id="btnGuardarFornBD" class="btn btn-sucesso">Guardar</button>
          <button type="button" id="btnFecharFornBD" class="btn btn-cancelar">Cancelar</button>
        </div>
      </div>

      <div class="linha-flex" style="margin-top:8px">
        <div class="campo" style="margin-bottom:0">
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
        <h4 id="tituloFormMaterial">Novo material</h4>
        <input type="hidden" id="editMaterialId">
        <input type="text" id="novoNomeMaterial" placeholder="Nome do Material">
        <input type="number" inputmode="decimal" id="novoPrecoMaterial" placeholder="Preço Base (€)" step="0.01">
        <div class="linha-botoes">
          <button type="button" id="btnGuardarMatBD" class="btn btn-sucesso">Guardar</button>
          <button type="button" id="btnFecharMatBD" class="btn btn-cancelar">Cancelar</button>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="grid-2">
        <div class="campo"><label for="quantidade">Quantidade:</label><input type="number" inputmode="numeric" id="quantidade" value="1" min="1"></div>
        <div class="campo"><label for="tecnica">Técnica:</label>
          <select id="tecnica">
            <option value="dtf">DTF</option><option value="vinil">Vinil Flex</option>
            <option value="sublimacao">Sublimação</option><option value="serigrafia">Serigrafia</option>
            <option value="bordado">Bordado</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="campo"><label for="custoPeca">Custo Peça s/ IVA (€):</label><input type="number" inputmode="decimal" id="custoPeca" value="0.00" step="0.01"></div>
        <div class="campo"><label for="portesFornecedor">Portes Lote s/ IVA (€):</label><input type="number" inputmode="decimal" id="portesFornecedor" value="0.00" step="0.01"></div>
      </div>
      <div id="grupoDTF" class="painel-tecnica">
        <div class="campo"><label id="labelCustoMetro" for="custoMetroDTF">Custo Metro DTF (28cm) s/ IVA:</label><input type="number" inputmode="decimal" id="custoMetroDTF" value="5.50" step="0.10"></div>
        <div class="grid-2">
          <div class="campo"><label for="alturaEstampaDTF">Altura (cm):</label><input type="number" inputmode="decimal" id="alturaEstampaDTF" value="10" step="0.1"></div>
          <div class="campo"><label for="larguraEstampaDTF">Largura (cm):</label><input type="number" inputmode="decimal" id="larguraEstampaDTF" value="28" step="0.1"></div>
        </div>
      </div>
      <div id="grupoCores" class="painel-tecnica hidden">
        <div class="campo"><label for="numCores">Número de Cores / Posições:</label><input type="number" inputmode="numeric" id="numCores" value="1" min="1" max="3"></div>
      </div>
      <div class="grid-2">
        <div class="campo"><label for="tipoMargem">Tipo de Margem:</label><select id="tipoMargem"><option value="valor">Valor Fixo (€)</option><option value="percentagem">Percentagem (%)</option></select></div>
        <div class="campo"><label for="valMargem">Margem Lucro:</label><input type="number" inputmode="decimal" id="valMargem" value="5.00" step="0.50"></div>
      </div>
    </section>

    <section class="card resultados">
      <div class="linha-resultado destaque"><span>Preço Venda / Un (c/ IVA):</span><strong id="resPrecoUn">0,00 €</strong></div>
      <div class="linha-resultado destaque-total"><span>Total Comercial (c/ IVA):</span><strong id="resTotalComercial">0,00 €</strong></div>
      <hr>
      <div class="detalhes-custo">
        <div class="linha-resultado"><span>Material (c/ IVA):</span><span id="resCustoMaterialUn">0,00 €</span></div>
        <div class="linha-resultado"><span>Impressão (c/ IVA):</span><span id="resCustoImprUn">0,00 €</span></div>
        <div class="linha-resultado"><span>Portes Lote (c/ IVA):</span><span id="resPortes">0,00 €</span></div>
        <div class="linha-resultado" id="linhaConsumoFilme"><span id="labelConsumoFilme">Consumo Filme DTF:</span><span id="resConsumoFilme">0,00 m</span></div>
        <div class="linha-resultado"><span>Custo Total Lote (c/ IVA):</span><span id="resCustoTotalLote">0,00 €</span></div>
        <div class="linha-resultado"><span>Lucro Unitário:</span><span id="resLucroUn">0,00 €</span></div>
        <div class="linha-resultado"><span>Lucro Total Estimado:</span><span id="resLucroTotal">0,00 €</span></div>
      </div>
      <div class="badge-escalao" id="escalaoBadge">Escalão</div>
      <div class="comparativo-escaloes"><h4>Tabela Comparativa por Quantidade</h4><div id="tabelaComparativa" class="grid-escaloes"></div></div>
    </section>
    <footer class="info-material-ativo">Artigo: <strong id="nomeMaterialAtivo">Nenhum</strong> (<span id="detalheMaterialAtivo">0,00 €</span>)</footer>
  `;
  atualizarSelectsDinamicos();
}

function atualizarSelectsDinamicos(){
  const sf=document.getElementById("seletorFornecedorBD");
  if(!sf) return;
  sf.innerHTML="";
  if(!baseDados.length){
    sf.innerHTML='<option value="">Nenhum fornecedor</option>';
    atualizarSelectMateriaisDinamicos([]);
    return;
  }
  baseDados.forEach(f=>{
    const o=document.createElement("option");
    o.value=f.id; o.textContent=`${f.nome} (Portes: ${parseNum(f.portes).toFixed(2)} €)`;
    sf.appendChild(o);
  });
  if(!fornecedorSelecionadoId || !baseDados.some(f=>f.id===fornecedorSelecionadoId)) fornecedorSelecionadoId=baseDados[0].id;
  sf.value=fornecedorSelecionadoId;
  const f=baseDados.find(x=>x.id===fornecedorSelecionadoId);
  document.getElementById("portesFornecedor").value=parseNum(f?.portes).toFixed(2);
  atualizarSelectMateriaisDinamicos(f?.materiais||[]);
}

function atualizarSelectMateriaisDinamicos(materiais){
  const sm=document.getElementById("seletorMaterialBD");
  if(!sm) return;
  sm.innerHTML="";
  if(!materiais.length){
    sm.innerHTML='<option value="">Nenhum material</option>';
    materialSelecionadoId=null;
    document.getElementById("nomeMaterialAtivo").textContent="Manual";
    document.getElementById("detalheMaterialAtivo").textContent="0,00 € s/ IVA";
    calcular(); return;
  }
  materiais.forEach(m=>{
    const o=document.createElement("option");
    o.value=m.id; o.textContent=`${m.nome} (${parseNum(m.preco).toFixed(2)} €)`;
    sm.appendChild(o);
  });
  if(!materialSelecionadoId || !materiais.some(m=>m.id===materialSelecionadoId)) materialSelecionadoId=materiais[0].id;
  sm.value=materialSelecionadoId;
  const f=baseDados.find(x=>x.id===fornecedorSelecionadoId);
  const m=materiais.find(x=>x.id===materialSelecionadoId);
  if(m){
    document.getElementById("custoPeca").value=parseNum(m.preco).toFixed(2);
    document.getElementById("nomeMaterialAtivo").textContent=`${m.nome}${f?" ("+f.nome+")":""}`;
    document.getElementById("detalheMaterialAtivo").textContent=`${moeda(m.preco)} s/ IVA`;
  }
  calcular();
}

function margemPorUnidade(qtd, valor, tipo, custo){
  if(tipo==="percentagem") return Math.max(0,custo*(valor/100));
  let m=valor;
  if(qtd>=100)m-=3.50; else if(qtd>=50)m-=2.50; else if(qtd>=25)m-=1.50; else if(qtd>=10)m-=0.50; else if(qtd>=5)m-=0.20;
  return Math.max(0,m);
}

function guardarValoresTecnicaAtual(t){
  if(!document.getElementById("tecnica")) return;
  if(["dtf","vinil","sublimacao"].includes(t)){
    memoriaTecnicas[t]={
      custoMetro:parseNum(document.getElementById("custoMetroDTF").value),
      altura:parseNum(document.getElementById("alturaEstampaDTF").value),
      largura:parseNum(document.getElementById("larguraEstampaDTF").value)
    };
  } else {
    memoriaTecnicas[t]={numCores:Math.max(1,parseInt(document.getElementById("numCores").value)||1)};
  }
}

function alternarTecnica(){
  const t=document.getElementById("tecnica")?.value;
  if(!t)return;
  guardarValoresTecnicaAtual(tecnicaAnterior);
  tecnicaAnterior=t;
  const film=["dtf","vinil","sublimacao"].includes(t);
  document.getElementById("grupoDTF").classList.toggle("hidden",!film);
  document.getElementById("grupoCores").classList.toggle("hidden",film);
  document.getElementById("linhaConsumoFilme").style.display=film?"flex":"none";
  if(film){
    const d=memoriaTecnicas[t];
    document.getElementById("custoMetroDTF").value=d.custoMetro;
    document.getElementById("alturaEstampaDTF").value=d.altura;
    document.getElementById("larguraEstampaDTF").value=d.largura;
    const nomes={dtf:["Custo Metro DTF (28cm) s/ IVA:","Consumo Filme DTF:"],vinil:["Custo Metro Vinil (50cm) s/ IVA:","Consumo Vinil Flex:"],sublimacao:["Custo Metro Sublimação (58cm) s/ IVA:","Consumo Papel Sublimação:"]};
    document.getElementById("labelCustoMetro").textContent=nomes[t][0];
    document.getElementById("labelConsumoFilme").textContent=nomes[t][1];
  } else {
    document.getElementById("numCores").value=memoriaTecnicas[t].numCores||1;
  }
  calcular();
}

function obterCustoPara(qtd, tecnica){
  const c=TECNICAS[tecnica];
  if(["dtf","vinil","sublimacao"].includes(tecnica))
    return c.obterCusto(qtd,parseNum(document.getElementById("custoMetroDTF").value),parseNum(document.getElementById("alturaEstampaDTF").value),parseNum(document.getElementById("larguraEstampaDTF").value));
  return c.obterCusto(qtd,parseInt(document.getElementById("numCores").value)||1);
}

function calcular(){
  const q=Math.max(1,parseInt(document.getElementById("quantidade")?.value)||1);
  const p= parseNum(document.getElementById("custoPeca")?.value);
  const portes=parseNum(document.getElementById("portesFornecedor")?.value);
  const tecnica=document.getElementById("tecnica")?.value||"dtf";
  const tipo=document.getElementById("tipoMargem")?.value||"valor";
  const margem=parseNum(document.getElementById("valMargem")?.value);
  const imp=obterCustoPara(q,tecnica);
  const pIva=p*TAXA_IVA, portesIva=portes*TAXA_IVA;
  const custoUn=pIva+imp.custoUnComIva+(portesIva/q);
  const lucro=margemPorUnidade(q,margem,tipo,custoUn);
  const venda=custoUn+lucro;
  document.getElementById("resPrecoUn").textContent=moeda(venda);
  document.getElementById("resTotalComercial").textContent=moeda(venda*q);
  document.getElementById("resCustoMaterialUn").textContent=moeda(pIva);
  document.getElementById("resCustoImprUn").textContent=moeda(imp.custoUnComIva);
  document.getElementById("resPortes").textContent=moeda(portesIva);
  document.getElementById("resCustoTotalLote").textContent=moeda(custoUn*q);
  document.getElementById("resLucroUn").textContent=moeda(lucro);
  document.getElementById("resLucroTotal").textContent=moeda(lucro*q);
  document.getElementById("escalaoBadge").textContent=`Escalão ≥ ${imp.minEscalao} un`;
  if(["dtf","vinil","sublimacao"].includes(tecnica))
    document.getElementById("resConsumoFilme").textContent=`${imp.metrosTotais.toFixed(2).replace(".",",")} m`;
  gerarComparativoEscaloes(q,pIva,portesIva,tecnica,tipo,margem);
}

function gerarComparativoEscaloes(qAtual,pComIva,portesIva,tecnica,tipo,margem){
  const c=document.getElementById("tabelaComparativa"); if(!c)return;
  c.innerHTML="";
  [1,10,25,50,100].forEach(q=>{
    const imp=obterCustoPara(q,tecnica);
    const custo=pComIva+imp.custoUnComIva+portesIva/q;
    const lucro=margemPorUnidade(q,margem,tipo,custo);
    const item=document.createElement("div");
    item.className="escalao-item"+(q===qAtual?" active":"");
    item.innerHTML=`<strong>${q}+</strong><br>${moeda(custo+lucro)}`;
    c.appendChild(item);
  });
}

function abrirFormFornecedor(edit=false){
  const f=baseDados.find(x=>x.id===fornecedorSelecionadoId);
  document.getElementById("formNovoFornecedor").classList.remove("hidden");
  document.getElementById("tituloFormFornecedor").textContent=edit?"Editar fornecedor":"Novo fornecedor";
  document.getElementById("editFornecedorId").value=edit?(f?.id||""):"";
  document.getElementById("novoNomeFornecedor").value=edit?(f?.nome||""):"";
  document.getElementById("novoPortesFornecedor").value=edit?parseNum(f?.portes):"";
}
function fecharFormFornecedor(){document.getElementById("formNovoFornecedor").classList.add("hidden");}
function guardarFornecedor(){
  const nome=document.getElementById("novoNomeFornecedor").value.trim();
  if(!nome){alert("Indica o nome do fornecedor.");return;}
  const portes=Math.max(0,parseNum(document.getElementById("novoPortesFornecedor").value));
  const eid=document.getElementById("editFornecedorId").value;
  if(eid){
    const f=baseDados.find(x=>x.id===eid); if(f){f.nome=nome;f.portes=portes;}
  } else {
    const novo={id:id("f"),nome,portes,materiais:[]}; baseDados.push(novo); fornecedorSelecionadoId=novo.id;
  }
  guardarBD(); fecharFormFornecedor(); materialSelecionadoId=null; atualizarSelectsDinamicos();
}
function eliminarFornecedor(){
  if(!fornecedorSelecionadoId)return;
  if(baseDados.length<=1){alert("É necessário manter pelo menos um fornecedor.");return;}
  const f=baseDados.find(x=>x.id===fornecedorSelecionadoId);
  if(!confirm(`Eliminar o fornecedor "${f?.nome||""}"?`))return;
  baseDados=baseDados.filter(x=>x.id!==fornecedorSelecionadoId);
  fornecedorSelecionadoId=null; materialSelecionadoId=null; guardarBD(); atualizarSelectsDinamicos();
}

function abrirFormMaterial(edit=false){
  const f=baseDados.find(x=>x.id===fornecedorSelecionadoId); if(!f)return;
  const m=(f.materiais||[]).find(x=>x.id===materialSelecionadoId);
  document.getElementById("formNovoMaterial").classList.remove("hidden");
  document.getElementById("tituloFormMaterial").textContent=edit?"Editar material":"Novo material";
  document.getElementById("editMaterialId").value=edit?(m?.id||""):"";
  document.getElementById("novoNomeMaterial").value=edit?(m?.nome||""):"";
  document.getElementById("novoPrecoMaterial").value=edit?parseNum(m?.preco):"";
}
function fecharFormMaterial(){document.getElementById("formNovoMaterial").classList.add("hidden");}
function guardarMaterial(){
  const f=baseDados.find(x=>x.id===fornecedorSelecionadoId); if(!f)return;
  const nome=document.getElementById("novoNomeMaterial").value.trim();
  if(!nome){alert("Indica o nome do material.");return;}
  const preco=Math.max(0,parseNum(document.getElementById("novoPrecoMaterial").value));
  const eid=document.getElementById("editMaterialId").value;
  f.materiais=f.materiais||[];
  if(eid){
    const m=f.materiais.find(x=>x.id===eid); if(m){m.nome=nome;m.preco=preco;}
    materialSelecionadoId=eid;
  } else {
    const m={id:id("m"),nome,preco}; f.materiais.push(m); materialSelecionadoId=m.id;
  }
  guardarBD(); fecharFormMaterial(); atualizarSelectMateriaisDinamicos(f.materiais);
}
function eliminarMaterial(){
  const f=baseDados.find(x=>x.id===fornecedorSelecionadoId); if(!f)return;
  if(!materialSelecionadoId)return;
  const m=(f.materiais||[]).find(x=>x.id===materialSelecionadoId);
  if(!confirm(`Eliminar o material "${m?.nome||""}"?`))return;
  f.materiais=(f.materiais||[]).filter(x=>x.id!==materialSelecionadoId);
  materialSelecionadoId=null; guardarBD(); atualizarSelectMateriaisDinamicos(f.materiais);
}

function resumoTexto(){
  const q=document.getElementById("quantidade").value;
  const t=document.getElementById("tecnica").selectedOptions[0].text;
  const mat=document.getElementById("nomeMaterialAtivo").textContent;
  return `GrafiSantos Print\nArtigo: ${mat}\nQuantidade: ${q}\nTécnica: ${t}\nPreço/un.: ${document.getElementById("resPrecoUn").textContent}\nTotal: ${document.getElementById("resTotalComercial").textContent}\nLucro total: ${document.getElementById("resLucroTotal").textContent}`;
}
async function copiarResumo(){
  const txt=resumoTexto();
  try{await navigator.clipboard.writeText(txt);alert("Resumo copiado.");}
  catch(e){prompt("Copia o resumo:",txt);}
}
function guardarPDF(){
  if(typeof html2pdf==="undefined"){window.print();return;}
  const el=document.getElementById("areaParaPdf");
  html2pdf().set({
    margin:8,filename:"GrafiSantos-Calculadora.pdf",
    image:{type:"jpeg",quality:.95},
    html2canvas:{scale:2,useCORS:true},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}
  }).from(el).save();
}
function imprimir(){window.print();}

function ligarEventos(){
  const on=(idv,event,fn)=>{const e=document.getElementById(idv);if(e)e.addEventListener(event,fn);};
  on("seletorFornecedorBD","change",e=>{fornecedorSelecionadoId=e.target.value;materialSelecionadoId=null;atualizarSelectsDinamicos();});
  on("seletorMaterialBD","change",e=>{materialSelecionadoId=e.target.value;const f=baseDados.find(x=>x.id===fornecedorSelecionadoId);atualizarSelectMateriaisDinamicos(f?.materiais||[]);});
  on("btnNovoForn","click",()=>abrirFormFornecedor(false));
  on("btnEditarForn","click",()=>abrirFormFornecedor(true));
  on("btnEliminarForn","click",eliminarFornecedor);
  on("btnGuardarFornBD","click",guardarFornecedor);
  on("btnFecharFornBD","click",fecharFormFornecedor);
  on("btnNovoMat","click",()=>abrirFormMaterial(false));
  on("btnEditarMat","click",()=>abrirFormMaterial(true));
  on("btnEliminarMat","click",eliminarMaterial);
  on("btnGuardarMatBD","click",guardarMaterial);
  on("btnFecharMatBD","click",fecharFormMaterial);
  on("tecnica","change",alternarTecnica);
  ["quantidade","custoPeca","portesFornecedor","custoMetroDTF","alturaEstampaDTF","larguraEstampaDTF","numCores","tipoMargem","valMargem"]
    .forEach(x=>on(x,"input",calcular));
  on("tipoMargem","change",calcular);
  on("numCores","change",calcular);
  on("btnCopiarResumo","click",copiarResumo);
  on("btnGuardarPDF","click",guardarPDF);
  on("btnImprimir","click",imprimir);
}

document.addEventListener("DOMContentLoaded",()=>{
  carregarBD();
  renderizarInterfaceCompleta();
  ligarEventos();
  alternarTecnica();
  calcular();
});
