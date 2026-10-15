/* SIGM Local - telas e logica do app. Tudo roda no aparelho; nada e enviado a servidor. */
const VERSAO_APP = "1.0.0";
const STATUS = ["Membro", "Congregado", "Visitante", "Inativo"];
const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "Viúvo(a)", "Divorciado(a)", "União estável"];
const INSTRUCAO = ["Fundamental incompleto", "Fundamental completo", "Médio incompleto", "Médio completo", "Superior incompleto", "Superior completo", "Pós-graduação"];
const CARGOS = ["Cooperador", "Diácono", "Presbítero", "Evangelista", "Pastor"];

// [chave, rotulo, tipo, extra]
const GRUPOS = [
  ["Dados pessoais", [
    ["nome", "Nome completo", "text"],
    ["status", "Situação", "select", STATUS],
    ["data_nascimento", "Data de nascimento", "date"],
    ["estado_civil", "Estado civil", "select", ESTADOS_CIVIS],
    ["nome_conjuge", "Cônjuge", "text"],
    ["data_nascimento_conjuge", "Nascimento do cônjuge", "date"],
    ["nome_pai", "Nome do pai", "text"],
    ["nome_mae", "Nome da mãe", "text"],
    ["cidade_nascimento", "Cidade de nascimento", "text"],
    ["estado_nascimento", "UF de nascimento", "uf"],
    ["profissao", "Profissão", "text"],
    ["grau_instrucao", "Grau de instrução", "select", INSTRUCAO],
    ["rg", "RG", "text"],
    ["orgao_emissor", "Órgão emissor", "text"],
    ["cpf", "CPF", "numeric"],
  ]],
  ["Contato", [
    ["celular", "Celular / WhatsApp", "tel"],
    ["telefone", "Telefone", "tel"],
    ["email", "E-mail", "email"],
  ]],
  ["Endereço", [
    ["cep", "CEP", "numeric"],
    ["endereco", "Rua", "text"],
    ["numero", "Número", "text"],
    ["bairro", "Bairro", "text"],
    ["cidade", "Cidade", "text"],
    ["estado", "UF", "uf"],
  ]],
  ["Vida na igreja", [
    ["cargo", "Função / cargo", "cargo"],
    ["data_funcao", "Data da função", "date"],
    ["ministerio", "Ministério", "text"],
    ["curso_teologico", "Curso teológico", "text"],
    ["batismo_aguas", "Batismo nas águas (data)", "date"],
    ["igreja_local_batismo_aguas", "Igreja do batismo nas águas", "text"],
    ["data_batismo_espirito_santo", "Batismo no Espírito Santo (data)", "date"],
    ["igreja_local_batismo_espirito_santo", "Igreja do batismo no Espírito Santo", "text"],
  ]],
  ["Observações", [["observacoes", "Observações", "area"]]],
];
const CAMPOS_IGREJA = [
  ["nome_igreja", "Nome da igreja", "Ex.: Assembleia de Deus"],
  ["cidade", "Cidade", ""],
  ["convencao", "Convenção", "Ex.: CONFRADESP"],
  ["setor", "Setor", ""],
  ["congregacao_sede", "Congregação sede", ""],
  ["congregacao_local_nome", "Congregação local (nome)", "Sai nos pedidos e na carta"],
  ["congregacao_local_numero", "Congregação local (número)", ""],
  ["congregacao_local_dirigente", "Dirigente da congregação", "Sai nos pedidos"],
  ["congregacao_local_campo_setor", "Campo / setor da congregação", "Sai na ficha e na carta"],
  ["congregacao_local_cidade", "Cidade da congregação", "Sai na data dos pedidos"],
];
const TIPOS_RELATORIO = [
  ["todos", "Lista de todos os membros"], ["membros", "Membros"], ["congregados", "Congregados"],
  ["visitantes", "Visitantes"], ["aniversariantes", "Aniversariantes do mês"],
];

const estado = { membros: [], config: {}, ultimoBackup: "", busca: "", filtro: "Todos", mesAniv: new Date().getMonth() + 1, tipoRel: "todos", mesRel: new Date().getMonth() + 1, instalar: null };
const $ = (s) => document.querySelector(s);
let fichaDaTela = 0;

/* ---------- avisos e janelas ---------- */
function avisar(texto, ms = 3200) {
  const caixa = $("#aviso");
  caixa.replaceChildren(h("div", {}, texto));
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => caixa.replaceChildren(), ms);
}
function janela(conteudo) {
  return new Promise((resolver) => {
    const camada = $("#camada");
    const fechar = (valor) => { camada.classList.remove("aberta"); camada.replaceChildren(); resolver(valor); };
    camada.replaceChildren(h("div", { class: "fundo", onclick: () => fechar(null) }), h("div", { class: "janela", role: "dialog", "aria-modal": "true" }, conteudo(fechar)));
    camada.classList.add("aberta");
    const primeiro = camada.querySelector("input, button");
    if (primeiro) primeiro.focus({ preventScroll: true });
  });
}
const confirmar = (titulo, texto, botao = "Confirmar", perigo = false) => janela((fechar) => [
  h("h3", {}, titulo), texto && h("p", {}, texto),
  h("div", { class: "botoes" },
    h("button", { class: "btn", onclick: () => fechar(false) }, "Cancelar"),
    h("button", { class: "btn " + (perigo ? "btn-r" : "btn-p"), onclick: () => fechar(true) }, botao)),
]).then((r) => r === true);
const perguntar = (titulo, rotulo, inicial = "") => janela((fechar) => {
  const campo = h("input", { type: "text", value: inicial, maxlength: "160", enterkeyhint: "done" });
  campo.addEventListener("keydown", (e) => { if (e.key === "Enter") fechar(campo.value); });
  return [h("h3", {}, titulo), h("label", { class: "campo" }, h("span", {}, rotulo), campo),
    h("div", { class: "botoes" }, h("button", { class: "btn", onclick: () => fechar(null) }, "Cancelar"),
      h("button", { class: "btn btn-p", onclick: () => fechar(campo.value) }, "Continuar"))];
});
const perguntarSenha = (titulo, rotulo) => janela((fechar) => {
  const campo = h("input", { type: "password", autocomplete: "current-password" });
  campo.addEventListener("keydown", (e) => { if (e.key === "Enter") fechar(campo.value); });
  return [h("h3", {}, titulo), h("label", { class: "campo" }, h("span", {}, rotulo), campo),
    h("div", { class: "botoes" }, h("button", { class: "btn", onclick: () => fechar(null) }, "Cancelar"),
      h("button", { class: "btn btn-p", onclick: () => fechar(campo.value) }, "Continuar"))];
});
const escolher = (titulo, texto, opcoes) => janela((fechar) => [
  h("h3", {}, titulo), h("p", {}, texto),
  h("div", { class: "botoes" }, ...opcoes.map(([rotulo, valor, classe]) => h("button", { class: "btn " + (classe || ""), onclick: () => fechar(valor) }, rotulo)),
    h("button", { class: "btn", onclick: () => fechar(null) }, "Cancelar")),
]);

function mostrarPdf(bytes, nome) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const arquivo = new File([blob], nome, { type: "application/pdf" });
  const podeCompartilhar = !!(navigator.canShare && navigator.canShare({ files: [arquivo] }));
  return janela((fechar) => [
    h("h3", {}, "PDF pronto"), h("p", {}, nome),
    h("div", { class: "botoes" },
      h("button", { class: "btn btn-p", onclick: () => { window.open(url, "_blank"); } }, "Abrir"),
      podeCompartilhar && h("button", { class: "btn btn-v", onclick: () => { navigator.share({ files: [arquivo], title: nome }).catch(() => {}); } }, "Compartilhar"),
      h("button", { class: "btn", onclick: () => baixarArquivo(blob, nome) }, "Baixar"),
      h("button", { class: "btn", onclick: () => fechar(true) }, "Fechar")),
  ]).then(() => setTimeout(() => URL.revokeObjectURL(url), 120000));
}

/* ---------- apoio ---------- */
const iniciais = (nome) => String(nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const classeStatus = (s) => ({ Congregado: "verde", Visitante: "ambar", Inativo: "cinza" }[s] || "");
const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });

function avatar(m, foto, grande) {
  return h("span", { class: "avatar" + (grande ? " grande" : "") }, foto ? h("img", { src: foto, alt: "" }) : iniciais(m.nome));
}
function diasDesde(iso) { return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : Infinity; }

function aniversariantesDoMes(mes, hoje = new Date()) {
  const itens = [];
  for (const m of estado.membros) {
    if (m.status === "Inativo") continue;
    const n = interpretarData(m.data_nascimento);
    if (!n || n.mes !== mes) continue;
    itens.push({ m, dia: n.dia, nasc: formatarData(m.data_nascimento), idade: hoje.getFullYear() - n.ano, hoje: n.mes === hoje.getMonth() + 1 && n.dia === hoje.getDate() });
  }
  return itens.sort((a, b) => a.dia - b.dia || porNome(a.m, b.m));
}
function dadosRelatorio(tipo, mes) {
  const titulo = Object.fromEntries(TIPOS_RELATORIO)[tipo];
  if (tipo === "aniversariantes") {
    return [`${titulo} (${MESES[mes - 1]})`, ["Nome", "Nascimento", "Contato"],
      aniversariantesDoMes(mes).map((i) => [i.m.nome, i.nasc, contato(i.m)])];
  }
  const alvo = { membros: "Membro", congregados: "Congregado", visitantes: "Visitante" }[tipo];
  const lista = estado.membros.filter((m) => !alvo || m.status === alvo).sort(porNome);
  return [titulo, ["Nome", "Situação", "Contato", "Cidade", "Função"], lista.map((m) => [m.nome, m.status || "", contato(m), m.cidade || "", m.cargo || ""])];
}

/* ---------- molde das telas ---------- */
function montar(v) {
  document.title = v.titulo + " – SIGM Local";
  $("#titulo").replaceWith(h("div", { class: "topo-esq", id: "titulo" },
    v.voltar && h("a", { class: "voltar", href: v.voltar, "aria-label": "Voltar" }, "‹ Voltar"),
    h("h1", {}, v.titulo)));
  $("#acao-topo").replaceChildren(v.acao || "");
  document.body.classList.toggle("sem-abas", !v.aba);
  document.querySelectorAll(".abas a").forEach((a) => a.classList.toggle("ativa", a.dataset.aba === v.aba));
  $("#tela").replaceChildren(v.conteudo);
  window.scrollTo(0, 0);
}

async function renderizar() {
  const token = ++fichaDaTela;
  const [a, b, c] = location.hash.replace(/^#\/?/, "").split("/");
  let vista;
  try {
    if (!a) vista = vistaLista();
    else if (a === "membro" && b === "novo") vista = await vistaFormulario(null);
    else if (a === "membro" && c === "editar") vista = await vistaFormulario(b);
    else if (a === "membro") vista = await vistaMembro(b);
    else if (a === "aniversariantes") vista = vistaAniversariantes();
    else if (a === "relatorios") vista = vistaRelatorios();
    else if (a === "ajustes") vista = vistaAjustes();
    else vista = vistaLista();
  } catch (erro) {
    vista = { titulo: "Erro", aba: "membros", conteudo: h("div", { class: "vazio" }, "Algo deu errado: " + erro.message) };
  }
  if (token === fichaDaTela) montar(vista);
}

/* ---------- lista de membros ---------- */
function vistaLista() {
  const lista = h("ul", { class: "lista" });
  const contagem = h("p", { class: "suave", style: "margin:10px 4px" });
  const chips = h("div", { class: "filtros" });
  const busca = h("input", { class: "busca", type: "search", placeholder: "Buscar por nome, CPF ou telefone", value: estado.busca, "aria-label": "Buscar membro", autocomplete: "off" });
  const vazio = h("div", { class: "vazio" }, h("p", {}, "Nenhum membro cadastrado ainda."), h("p", { class: "suave" }, "Toque no + para cadastrar, ou restaure um backup em Ajustes."));
  const vazioBusca = h("div", { class: "vazio" }, "Ninguém encontrado.");

  function atualizar() {
    const q = semAcento(estado.busca).trim(), qd = soDigitos(estado.busca);
    const achados = estado.membros.filter((m) => {
      if (estado.filtro !== "Todos" && m.status !== estado.filtro) return false;
      if (!q) return true;
      if (semAcento(m.nome).includes(q)) return true;
      return qd.length >= 3 && soDigitos(`${m.cpf} ${m.celular} ${m.telefone}`).includes(qd);
    }).sort(porNome);
    lista.replaceChildren(...achados.map((m) => h("li", {}, h("a", { class: "item", href: `#/membro/${m.id}` },
      avatar(m), h("div", { class: "meio" }, h("div", { class: "nome" }, m.nome),
        h("div", { class: "sub" }, [m.cargo, contato(m)].filter(Boolean).join(" · ") || " ")),
      h("span", { class: "selo " + classeStatus(m.status) }, m.status || "—")))));
    const total = estado.membros.length;
    lista.hidden = achados.length === 0;
    vazio.hidden = total > 0;
    vazioBusca.hidden = total === 0 || achados.length > 0;
    contagem.hidden = total === 0;
    contagem.textContent = achados.length === total ? `${total} ${total === 1 ? "pessoa" : "pessoas"}` : `${achados.length} de ${total}`;
    chips.replaceChildren(...["Todos", ...STATUS].map((s) => h("button", { class: "chip" + (estado.filtro === s ? " ativo" : ""), onclick: () => { estado.filtro = s; atualizar(); } }, s)));
  }
  busca.addEventListener("input", () => { estado.busca = busca.value; atualizar(); });

  const raiz = h("div", {});
  const hoje = aniversariantesDoMes(new Date().getMonth() + 1).filter((i) => i.hoje);
  if (hoje.length) raiz.append(h("div", { class: "aviso-topo festa" }, `🎉 Aniversário hoje: ${hoje.map((i) => i.m.nome.split(" ")[0]).join(", ")}. `, h("a", { href: "#/aniversariantes" }, "Ver")));
  if (estado.membros.length && diasDesde(estado.ultimoBackup) > 14) {
    raiz.append(h("div", { class: "aviso-topo" }, estado.ultimoBackup ? "Faz mais de 14 dias do último backup. " : "Você ainda não fez nenhum backup. ", h("a", { href: "#/ajustes" }, "Salvar backup agora")));
  }
  raiz.append(busca, chips, contagem, lista, vazio, vazioBusca, h("a", { class: "fab", href: "#/membro/novo", "aria-label": "Novo membro" }, "+"));
  atualizar();
  return { titulo: "Membros", aba: "membros", conteudo: raiz };
}

/* ---------- ficha do membro ---------- */
async function vistaMembro(id) {
  const m = estado.membros.find((x) => x.id === id);
  if (!m) return { titulo: "Membro", voltar: "#/", aba: null, conteudo: h("div", { class: "vazio" }, "Membro não encontrado.") };
  const foto = await DB.obterFoto(id);
  const zap = linkWhatsapp(contato(m));

  async function gerar(tipo, botao) {
    let apresentar = "";
    if (tipo === "carta") {
      apresentar = await perguntar("Carta de Recomendação", "Apresentamos à Assembleia de Deus em (opcional)", "");
      if (apresentar === null) return;
    }
    botao.disabled = true;
    avisar("Gerando o PDF…", 8000);
    try {
      const { bytes, nome } = await PDFS.gerarDocumento(tipo, m, estado.config, foto, apresentar);
      avisar(estado.config.nome_igreja ? "PDF pronto." : "PDF pronto. Dica: preencha os dados da igreja em Ajustes.");
      await mostrarPdf(bytes, nome);
    } catch (e) {
      avisar("Não consegui gerar o PDF: " + e.message, 6000);
    } finally { botao.disabled = false; }
  }
  async function excluir() {
    if (!(await confirmar("Excluir cadastro?", `${m.nome} será apagado deste aparelho. Isso não pode ser desfeito (a não ser por um backup).`, "Excluir", true))) return;
    await DB.excluirMembro(id);
    estado.membros = estado.membros.filter((x) => x.id !== id);
    avisar("Cadastro excluído.");
    location.hash = "#/";
  }

  const detalhes = GRUPOS.flatMap(([, campos]) => campos).filter(([k]) => k !== "nome" && k !== "status" && k !== "observacoes" && m[k])
    .map(([k, rotulo, tipo]) => h("div", {}, h("dt", {}, rotulo), h("dd", {}, tipo === "date" ? formatarData(m[k]) : m[k])));
  const conteudo = h("div", {},
    h("div", { class: "card" },
      h("div", { class: "cabeca-membro" }, avatar(m, foto, true),
        h("div", {}, h("h2", {}, m.nome), h("span", { class: "selo " + classeStatus(m.status) }, m.status || "Sem situação"), m.cargo && h("p", { class: "suave", style: "margin-top:4px" }, m.cargo))),
      h("div", { class: "botoes" },
        contato(m) && h("a", { class: "btn", href: "tel:" + soDigitos(contato(m)) }, "📞 Ligar"),
        zap && h("a", { class: "btn btn-v", href: zap, target: "_blank", rel: "noopener" }, "WhatsApp"),
        h("a", { class: "btn btn-p", href: `#/membro/${id}/editar` }, "Editar"))),
    h("div", { class: "card" }, h("h2", {}, "Documentos em PDF"),
      h("div", { class: "botoes" }, ...Object.entries(PDFS.DOCUMENTOS).map(([tipo, nome]) => {
        const b = h("button", { class: "btn" }, nome);
        b.addEventListener("click", () => gerar(tipo, b));
        return b;
      }))),
    detalhes.length ? h("div", { class: "card" }, h("h2", {}, "Dados"), h("dl", { class: "detalhes" }, detalhes)) : null,
    m.observacoes ? h("div", { class: "card" }, h("h2", {}, "Observações"), h("p", { style: "white-space:pre-wrap" }, m.observacoes)) : null,
    h("button", { class: "btn btn-r btn-bloco", onclick: excluir }, "Excluir cadastro"));
  return { titulo: "Ficha", voltar: "#/", aba: null, conteudo };
}

/* ---------- cadastro / edicao ---------- */
async function vistaFormulario(id) {
  const existente = id ? estado.membros.find((x) => x.id === id) : null;
  if (id && !existente) return { titulo: "Membro", voltar: "#/", aba: null, conteudo: h("div", { class: "vazio" }, "Membro não encontrado.") };
  const m = existente || { status: "Membro" };
  let foto = existente ? await DB.obterFoto(id) : "";
  let fotoMudou = false;

  const entradas = {};
  const erros = {};
  function criar([chave, rotulo, tipo, extra]) {
    let el;
    if (tipo === "select") {
      el = h("select", { name: chave }, h("option", { value: "" }, "—"), ...extra.map((o) => h("option", { value: o }, o)));
      if (m[chave] && !extra.includes(m[chave])) el.append(h("option", { value: m[chave] }, m[chave]));
      el.value = m[chave] || "";
    } else if (tipo === "area") {
      el = h("textarea", { name: chave, maxlength: "2000" }); el.value = m[chave] || "";
    } else {
      const atr = { name: chave, type: "text", value: m[chave] || "", autocomplete: "off" };
      if (tipo === "date") atr.type = "date";
      if (tipo === "tel") { atr.type = "tel"; atr.inputmode = "tel"; }
      if (tipo === "email") { atr.type = "email"; atr.inputmode = "email"; }
      if (tipo === "numeric") atr.inputmode = "numeric";
      if (tipo === "uf") { atr.maxlength = "2"; atr.autocapitalize = "characters"; }
      if (tipo === "cargo") atr.list = "lista-cargos";
      el = h("input", atr);
      if (tipo === "uf") el.addEventListener("input", () => { el.value = el.value.toUpperCase(); });
    }
    entradas[chave] = el;
    erros[chave] = h("div", { class: "erro", hidden: true });
    return h("label", { class: "campo" }, h("span", {}, rotulo), el, erros[chave]);
  }

  const previa = h("span", {});
  const arquivo = h("input", { type: "file", accept: "image/*", hidden: true });
  const desenharFoto = () => previa.replaceChildren(avatar(m, foto, true));
  arquivo.addEventListener("change", async () => {
    if (!arquivo.files[0]) return;
    try { foto = await reduzirFoto(arquivo.files[0]); fotoMudou = true; desenharFoto(); }
    catch (e) { avisar(e.message); }
  });
  desenharFoto();

  const form = h("form", { novalidate: true },
    h("div", { class: "foto-edicao" }, previa, h("div", { class: "botoes", style: "flex:1" },
      h("button", { type: "button", class: "btn", onclick: () => arquivo.click() }, foto ? "Trocar foto" : "Adicionar foto"),
      h("button", { type: "button", class: "btn btn-r", onclick: () => { foto = ""; fotoMudou = true; desenharFoto(); } }, "Remover"))),
    arquivo,
    h("datalist", { id: "lista-cargos" }, ...CARGOS.map((c) => h("option", { value: c }))),
    ...GRUPOS.map(([titulo, campos]) => {
      if (titulo === "Dados pessoais") {
        const [nome, situacao, nasc, ...resto] = campos;
        return h("fieldset", {}, h("legend", {}, titulo), criar(nome), criar(situacao), criar(nasc), ...resto.map(criar));
      }
      return h("fieldset", {}, h("legend", {}, titulo), ...campos.map(criar));
    }),
    h("div", { class: "barra-salvar" },
      h("a", { class: "btn", href: existente ? `#/membro/${id}` : "#/" }, "Cancelar"),
      h("button", { class: "btn btn-p", type: "submit" }, "Salvar")));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    Object.values(erros).forEach((x) => { x.hidden = true; });
    const valores = {};
    for (const [chave, el] of Object.entries(entradas)) valores[chave] = el.value.trim().replace(/[ \t]+/g, " ");
    const falhas = {};
    if (!valores.nome) falhas.nome = "Informe o nome.";
    if (valores.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email)) falhas.email = "E-mail inválido.";
    if (Object.keys(falhas).length) {
      for (const [k, t] of Object.entries(falhas)) { erros[k].textContent = t; erros[k].hidden = false; }
      entradas[Object.keys(falhas)[0]].focus();
      return;
    }
    const cpf = soDigitos(valores.cpf);
    const repetido = estado.membros.find((x) => x.id !== id && ((cpf.length >= 11 && soDigitos(x.cpf) === cpf) || semAcento(x.nome) === semAcento(valores.nome)));
    if (repetido && !(await confirmar("Já existe esse cadastro", `${repetido.nome} já está cadastrado. Salvar mesmo assim?`, "Salvar mesmo assim"))) return;

    const agora = agoraISO();
    const novo = { ...(existente || {}), ...valores, id: existente ? id : novoId(), criado_em: existente ? existente.criado_em : agora, atualizado_em: agora };
    try {
      await DB.salvarMembro(novo, fotoMudou ? foto : undefined);
    } catch (erro) { avisar("Não consegui salvar: " + erro.message, 6000); return; }
    estado.membros = existente ? estado.membros.map((x) => (x.id === id ? novo : x)) : [...estado.membros, novo];
    avisar("Salvo.");
    location.hash = `#/membro/${novo.id}`;
  });
  return { titulo: existente ? "Editar membro" : "Novo membro", voltar: existente ? `#/membro/${id}` : "#/", aba: null, conteudo: form };
}

/* ---------- aniversariantes ---------- */
function seletorMes(valor, aoMudar) {
  const s = h("select", { "aria-label": "Mês" }, ...MESES.map((n, i) => h("option", { value: i + 1 }, n)));
  s.value = String(valor);
  s.addEventListener("change", () => aoMudar(+s.value));
  return s;
}
function vistaAniversariantes() {
  const corpo = h("div", {});
  const desenhar = () => {
    const itens = aniversariantesDoMes(estado.mesAniv);
    corpo.replaceChildren(itens.length ? h("ul", { class: "lista" }, ...itens.map((i) => {
      const zap = linkWhatsapp(contato(i.m));
      return h("li", { style: "display:flex;align-items:center" },
        h("a", { class: "item", style: "flex:1;min-width:0", href: `#/membro/${i.m.id}` }, avatar(i.m),
          h("div", { class: "meio" }, h("div", { class: "nome" }, i.m.nome),
            h("div", { class: "sub" }, `${String(i.dia).padStart(2, "0")}/${String(estado.mesAniv).padStart(2, "0")} · faz ${i.idade} anos${i.hoje ? " · hoje 🎉" : ""}`))),
        zap && h("a", { class: "btn btn-v", style: "margin-right:12px;min-height:38px;padding:0 12px", href: zap, target: "_blank", rel: "noopener", "aria-label": "Parabenizar no WhatsApp" }, "WhatsApp"));
    })) : h("div", { class: "vazio" }, "Ninguém faz aniversário neste mês."));
  };
  const seletor = seletorMes(estado.mesAniv, (v) => { estado.mesAniv = v; desenhar(); });
  seletor.className = "busca";
  desenhar();
  return { titulo: "Aniversariantes", aba: "aniversariantes", conteudo: h("div", {}, h("label", { class: "campo" }, h("span", {}, "Mês"), seletor), corpo) };
}

/* ---------- relatorios ---------- */
function vistaRelatorios() {
  const previa = h("div", { class: "rolagem" });
  const tipoSel = h("select", {}, ...TIPOS_RELATORIO.map(([v, r]) => h("option", { value: v }, r)));
  tipoSel.value = estado.tipoRel;
  const mesSel = seletorMes(estado.mesRel, (v) => { estado.mesRel = v; desenhar(); });
  const mesCampo = h("label", { class: "campo" }, h("span", {}, "Mês"), mesSel);
  const contagem = h("p", { class: "suave", style: "margin-bottom:10px" });

  function desenhar() {
    estado.tipoRel = tipoSel.value;
    mesCampo.hidden = tipoSel.value !== "aniversariantes";
    const [titulo, colunas, linhas] = dadosRelatorio(tipoSel.value, estado.mesRel);
    contagem.textContent = `${linhas.length} ${linhas.length === 1 ? "registro" : "registros"}`;
    previa.replaceChildren(linhas.length ? h("table", { class: "tab" }, h("thead", {}, h("tr", {}, ...colunas.map((c) => h("th", {}, c)))),
      h("tbody", {}, ...linhas.slice(0, 100).map((l) => h("tr", {}, ...l.map((v) => h("td", {}, v)))))) : h("div", { class: "vazio" }, "Nada para listar."));
    if (linhas.length > 100) previa.append(h("p", { class: "suave", style: "margin-top:8px" }, "Mostrando 100. O PDF e o CSV levam todos."));
  }
  tipoSel.addEventListener("change", desenhar);

  async function pdf(botao) {
    const [titulo, colunas, linhas] = dadosRelatorio(tipoSel.value, estado.mesRel);
    botao.disabled = true;
    try {
      const bytes = await PDFS.relatorio(titulo, colunas, linhas, estado.config.nome_igreja || "");
      await mostrarPdf(bytes, nomeArquivoSeguro(titulo) + ".pdf");
    } catch (e) { avisar("Não consegui gerar: " + e.message, 6000); } finally { botao.disabled = false; }
  }
  function csv() {
    const [titulo, colunas, linhas] = dadosRelatorio(tipoSel.value, estado.mesRel);
    baixarArquivo(new Blob([paraCSV(colunas, linhas)], { type: "text/csv;charset=utf-8" }), nomeArquivoSeguro(titulo) + ".csv");
  }
  const bPdf = h("button", { class: "btn btn-p" }, "Gerar PDF");
  bPdf.addEventListener("click", () => pdf(bPdf));
  desenhar();
  return { titulo: "Relatórios", aba: "relatorios", conteudo: h("div", {},
    h("div", { class: "card" }, h("label", { class: "campo" }, h("span", {}, "Relatório"), tipoSel), mesCampo,
      h("div", { class: "botoes" }, bPdf, h("button", { class: "btn", onclick: csv }, "Baixar planilha (CSV)"))),
    h("div", { class: "card" }, contagem, previa)) };
}

/* ---------- ajustes: igreja, backup, login, instalar ---------- */
const ITERACOES = 200000;
async function hashSenha(senha, sal, iteracoes = ITERACOES) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sal), iterations: iteracoes }, chave, 256);
  return Array.from(new Uint8Array(bits)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function criarConta(usuario, senha) {
  const sal = novoId() + novoId();
  await DB.gravarMeta("conta", { usuario, sal, iteracoes: ITERACOES, hash: await hashSenha(senha, sal) });
}
async function conferirSenha(conta, senha) {
  return (await hashSenha(senha, conta.sal, conta.iteracoes)) === conta.hash;
}
const temCripto = () => !!(window.crypto && crypto.subtle);

async function salvarBackup() {
  const fotosLista = await DB.todasAsFotos();
  const fotos = Object.fromEntries(fotosLista.map((f) => [f.id, f.dados]));
  const dados = { sistema: "SIGM Local", versao: 1, exportado_em: agoraISO(), config: estado.config, membros: estado.membros, fotos };
  const nome = `sigm-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(dados)], { type: "application/json" });
  const arquivo = new File([blob], nome, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
    try { await navigator.share({ files: [arquivo], title: nome }); }
    catch (e) { if (e.name === "AbortError") return false; baixarArquivo(blob, nome); }
  } else baixarArquivo(blob, nome);
  estado.ultimoBackup = agoraISO();
  await DB.gravarMeta("ultimo_backup", estado.ultimoBackup);
  return true;
}
async function restaurarBackup(arquivo) {
  let dados;
  try { dados = JSON.parse(await arquivo.text()); } catch { throw new Error("Esse arquivo não é um backup do SIGM Local."); }
  if (!dados || dados.sistema !== "SIGM Local" || !Array.isArray(dados.membros)) throw new Error("Esse arquivo não é um backup do SIGM Local.");
  const membros = dados.membros.filter((m) => m && m.id && m.nome);
  const escolha = await escolher("Restaurar backup", `O arquivo tem ${membros.length} ${membros.length === 1 ? "pessoa" : "pessoas"} (salvo em ${formatarData((dados.exportado_em || "").slice(0, 10))}).`, [
    ["Juntar com o que já existe", "juntar", "btn-p"], ["Substituir tudo", "substituir", "btn-r"]]);
  if (!escolha) return null;
  if (escolha === "substituir" && !(await confirmar("Substituir tudo?", "Todos os cadastros deste aparelho serão trocados pelos do backup.", "Substituir", true))) return null;
  const r = await DB.restaurar(membros, dados.fotos || {}, dados.config || null, escolha === "substituir");
  estado.membros = await DB.listarMembros();
  estado.config = await DB.lerMeta("config", {});
  return r;
}

function vistaAjustes() {
  /* dados da igreja */
  const campos = {};
  const formIgreja = h("form", {}, ...CAMPOS_IGREJA.map(([k, rotulo, dica]) => {
    campos[k] = h("input", { type: "text", value: estado.config[k] || "", autocomplete: "off" });
    return h("label", { class: "campo" }, h("span", {}, rotulo), campos[k], dica && h("div", { class: "suave" }, dica));
  }), h("button", { class: "btn btn-p btn-bloco", type: "submit" }, "Salvar dados da igreja"));
  formIgreja.addEventListener("submit", async (e) => {
    e.preventDefault();
    const config = { ...estado.config };
    for (const [k, el] of Object.entries(campos)) config[k] = el.value.trim();
    await DB.gravarMeta("config", config);
    estado.config = config;
    avisar("Dados da igreja salvos.");
  });

  /* backup */
  const quando = h("p", { class: "suave" });
  const mostrarQuando = () => { quando.textContent = estado.ultimoBackup ? `Último backup: ${formatarData(estado.ultimoBackup.slice(0, 10))}.` : "Nenhum backup feito ainda."; };
  mostrarQuando();
  const bSalvar = h("button", { class: "btn btn-p" }, "Salvar backup");
  bSalvar.addEventListener("click", async () => {
    bSalvar.disabled = true;
    try { if (await salvarBackup()) { mostrarQuando(); avisar("Backup salvo."); } } catch (e) { avisar("Falhou: " + e.message, 6000); } finally { bSalvar.disabled = false; }
  });
  const arqBackup = h("input", { type: "file", accept: "application/json,.json", hidden: true });
  arqBackup.addEventListener("change", async () => {
    const f = arqBackup.files[0]; arqBackup.value = "";
    if (!f) return;
    try {
      const r = await restaurarBackup(f);
      if (r) { avisar(`Restaurado: ${r.novos} novos, ${r.atualizados} atualizados.`, 5000); renderizar(); }
    } catch (e) { avisar(e.message, 6000); }
  });

  /* login e senha */
  const cartaoLogin = h("div", { class: "card" });
  async function desenharLogin() {
    const conta = await DB.lerMeta("conta", null);
    if (!temCripto()) { cartaoLogin.replaceChildren(h("h2", {}, "Login e senha"), h("p", { class: "suave" }, "Disponível quando o app é aberto pelo endereço seguro (https).")); return; }
    cartaoLogin.replaceChildren(h("h2", {}, "Login e senha"),
      h("p", { class: "suave" }, "Pede usuário e senha ao abrir o app. A senha é guardada só como código de verificação (hash), nunca o texto. Atenção: não há como recuperar a senha; se esquecer, só apagando os dados do app e restaurando um backup. Ela não criptografa os cadastros, então use também a senha de tela do celular."),
      conta ? h("div", { style: "margin-top:10px" },
        h("p", { class: "suave", style: "margin-bottom:10px" }, `Usuário: ${conta.usuario}`),
        h("div", { class: "botoes" }, h("button", { class: "btn", onclick: () => definirConta(conta) }, "Trocar senha"),
          h("button", { class: "btn", onclick: sair }, "Sair"),
          h("button", { class: "btn btn-r", onclick: () => tirarConta(conta) }, "Desativar")))
        : h("button", { class: "btn btn-p btn-bloco", style: "margin-top:10px", onclick: () => definirConta(null) }, "Ativar login e senha"));
  }
  async function definirConta(atual) {
    if (atual) {
      const antiga = await perguntarSenha("Senha atual", "Digite a senha atual");
      if (antiga === null) return;
      if (!(await conferirSenha(atual, antiga))) { avisar("Senha atual incorreta."); return; }
    }
    const dados = await janela((fechar) => {
      const usuario = h("input", { type: "text", value: atual ? atual.usuario : "", autocomplete: "username", maxlength: "40", autocapitalize: "none" });
      const senha = h("input", { type: "password", autocomplete: "new-password" });
      const repete = h("input", { type: "password", autocomplete: "new-password" });
      const erro = h("div", { class: "erro" });
      const ok = () => {
        if (!usuario.value.trim()) { erro.textContent = "Informe o usuário."; return; }
        if (senha.value.length < 6) { erro.textContent = "A senha deve ter pelo menos 6 caracteres."; return; }
        if (senha.value !== repete.value) { erro.textContent = "As senhas não são iguais."; return; }
        fechar({ usuario: usuario.value.trim(), senha: senha.value });
      };
      return [h("h3", {}, atual ? "Nova senha" : "Criar login"),
        h("label", { class: "campo" }, h("span", {}, "Usuário"), usuario),
        h("label", { class: "campo" }, h("span", {}, "Senha (mínimo 6 caracteres)"), senha),
        h("label", { class: "campo" }, h("span", {}, "Repita a senha"), repete), erro,
        h("div", { class: "botoes" }, h("button", { class: "btn", onclick: () => fechar(null) }, "Cancelar"), h("button", { class: "btn btn-p", onclick: ok }, "Salvar"))];
    });
    if (!dados) return;
    await criarConta(dados.usuario, dados.senha);
    try { sessionStorage.setItem("sigm-ok", "1"); } catch { /* ignora */ }
    avisar(atual ? "Senha alterada." : "Login ativado. Anote a senha em lugar seguro."); desenharLogin();
  }
  async function tirarConta(atual) {
    const senha = await perguntarSenha("Desativar login", "Digite a senha para confirmar");
    if (senha === null) return;
    if (!(await conferirSenha(atual, senha))) { avisar("Senha incorreta."); return; }
    await DB.gravarMeta("conta", null); avisar("Login desativado."); desenharLogin();
  }
  function sair() {
    try { sessionStorage.removeItem("sigm-ok"); } catch { /* ignora */ }
    location.hash = "#/"; location.reload();
  }
  desenharLogin();

  /* instalar */
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let blocoInstalar;
  if (standalone) blocoInstalar = h("p", { class: "suave" }, "✓ O app já está instalado neste aparelho.");
  else if (ios) blocoInstalar = h("p", { class: "suave" }, "No iPhone: abra esta página no Safari, toque em Compartilhar (quadrado com seta) e depois em “Adicionar à Tela de Início”.");
  else if (estado.instalar) blocoInstalar = h("button", { class: "btn btn-p btn-bloco", onclick: async () => { estado.instalar.prompt(); await estado.instalar.userChoice; estado.instalar = null; renderizar(); } }, "Instalar o app");
  else blocoInstalar = h("p", { class: "suave" }, "No Android: abra o menu do Chrome (⋮) e toque em “Instalar app” ou “Adicionar à tela inicial”.");

  const conteudo = h("div", {},
    h("div", { class: "card" }, h("h2", {}, "Dados da igreja"), h("p", { class: "suave", style: "margin-bottom:12px" }, "Usados para preencher os documentos em PDF."), formIgreja),
    h("div", { class: "card" }, h("h2", {}, "Backup"),
      h("p", {}, "Seus dados ficam só neste aparelho. Se perder o celular ou limpar os dados do navegador, só o backup salva tudo. Guarde o arquivo no Google Drive, e-mail ou WhatsApp."),
      quando, h("div", { class: "botoes" }, bSalvar, h("button", { class: "btn", onclick: () => arqBackup.click() }, "Restaurar backup")), arqBackup),
    cartaoLogin,
    h("div", { class: "card" }, h("h2", {}, "Instalar no celular"), blocoInstalar),
    h("p", { class: "suave", style: "text-align:center" }, `SIGM Local ${VERSAO_APP} · ${estado.membros.length} cadastros neste aparelho`));
  return { titulo: "Ajustes", aba: "ajustes", conteudo };
}

/* ---------- tela de login ---------- */
function mostrarBloqueio(conta) {
  document.body.replaceChildren(h("div", { class: "bloqueio" }, h("form", { class: "caixa" },
    h("h1", {}, "SIGM Local"), h("p", {}, "Entre para continuar"),
    h("input", { type: "text", name: "usuario", placeholder: "Usuário", autocomplete: "username", autocapitalize: "none", "aria-label": "Usuário", class: "txt" }),
    h("input", { type: "password", name: "senha", placeholder: "Senha", autocomplete: "current-password", "aria-label": "Senha", class: "txt" }),
    h("div", { class: "erro", role: "alert" }), h("button", { class: "btn", style: "background:#fff;color:#0b5ed7;border-color:#fff", type: "submit" }, "Entrar"))));
  const form = document.querySelector(".bloqueio form");
  const [usuario, senha] = form.querySelectorAll("input"), erro = form.querySelector(".erro"), botao = form.querySelector("button");
  usuario.focus();
  let falhas = 0;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    botao.disabled = true;
    const certo = usuario.value.trim().toLowerCase() === conta.usuario.toLowerCase() && (await conferirSenha(conta, senha.value));
    if (certo) {
      try { sessionStorage.setItem("sigm-ok", "1"); } catch { /* sem sessionStorage: pede de novo na proxima abertura */ }
      location.reload();
      return;
    }
    falhas += 1;
    senha.value = "";
    const espera = falhas >= 5 ? Math.min(60, (falhas - 4) * 10) : 0;
    erro.textContent = "Usuário ou senha incorretos.";
    if (espera) {
      for (let r = espera; r > 0; r--) { erro.textContent = `Muitas tentativas. Aguarde ${r}s.`; await new Promise((ok) => setTimeout(ok, 1000)); }
      erro.textContent = "Usuário ou senha incorretos.";
    }
    botao.disabled = false;
    senha.focus();
  });
}

/* ---------- inicio ---------- */
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); estado.instalar = e; });
window.addEventListener("appinstalled", () => { estado.instalar = null; });

async function iniciar() {
  try {
    estado.config = await DB.lerMeta("config", {});
    estado.ultimoBackup = await DB.lerMeta("ultimo_backup", "");
    estado.membros = await DB.listarMembros();
  } catch (erro) {
    $("#tela").replaceChildren(h("div", { class: "vazio" }, "Não consegui abrir o armazenamento do aparelho: " + erro.message));
    return;
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  const conta = await DB.lerMeta("conta", null);
  let liberado = false;
  try { liberado = sessionStorage.getItem("sigm-ok") === "1"; } catch { /* ignora */ }
  if (conta && temCripto() && !liberado) { mostrarBloqueio(conta); return; }
  window.addEventListener("hashchange", renderizar);
  renderizar();
}
iniciar();
