// Abertura/fecho 100% garantida no telemóvel
function alternarFormNovoArtigo() {
  const box = document.getElementById('formNovoArtigo');
  if (!box) return;
  
  if (box.style.display === 'block') {
    box.style.display = 'none';
  } else {
    box.style.display = 'block';
  }
}

// Guardar novo artigo com tratamento de números e vírgulas
function guardarNovoArtigoBD() {
  const inputNome = document.getElementById('novoNomeArtigo');
  const inputPreco = document.getElementById('novoPrecoArtigo');

  if (!inputNome || !inputPreco) return;

  const nome = inputNome.value.trim();
  // Substitui vírgulas por pontos caso o teclado do telemóvel use vírgula
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

  // Guardar na lista
  artigosBD.push(novoArtigo);
  guardarBD();
  atualizarSeletorArtigos();

  // Selecionar o artigo recém-criado
  document.getElementById('seletorArtigo').value = novoArtigo.id;
  selecionarArtigoBD();

  // Limpar formulário e fechar
  inputNome.value = '';
  inputPreco.value = '';
  alternarFormNovoArtigo();
}
