/* SIGM Local - gera os PDFs no proprio aparelho (pdf-lib).
   Mesmos modelos, campos e posicoes do SIGM Desktop / SIGM Celular. */
const PDFS = (() => {
  const { PDFDocument, StandardFonts, rgb, TextAlignment } = PDFLib;

  const DOCUMENTOS = {
    ficha: "Ficha Cadastral",
    membramento: "Pedido de Apresentação / Membramento",
    reconciliacao: "Pedido de Reconciliação",
    carta: "Carta de Recomendação",
  };
  const MESES_PDF = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const MESES_EXTENSO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const FUNCOES = { cooperador: "cooperador", diacono: "diacono", presbitero: "presbitero", evangelista: "evangelista", pastor: "pastor" };
  const LOCAL_FUNCAO = {
    cooperador: "igreja_local_cooperador", diacono: "igreja_local_diacono", presbitero: "igreja_local_presbitero",
    evangelista: "igreja_local_convencao_evangelista", pastor: "igreja_local_convencao_pastor",
  };
  const DATAS_CENTRALIZADAS = new Set(["batismo_aguas", "batismo_espirito_santo", "cooperador", "diacono", "presbitero",
    "evangelista", "pastor", "data_nascimento", "data_nascimento_conjuge"]);

  const cache = {};
  async function carregar(url) {
    if (!cache[url]) {
      const r = await fetch(url);
      if (!r.ok) throw new Error("Modelo de documento não encontrado (" + url + ").");
      cache[url] = new Uint8Array(await r.arrayBuffer());
    }
    return cache[url];
  }

  const txt = (v) => (v == null ? "" : String(v));
  function partesData(v) {
    const d = interpretarData(v);
    if (!d) return ["", "", ""];
    return [String(d.dia).padStart(2, "0"), String(d.mes).padStart(2, "0"), String(d.ano)];
  }
  function funcaoPdf(cargo) {
    return FUNCOES[semAcento(cargo).trim()] || "";
  }

  // texto que o Helvetica (WinAnsi) consegue escrever
  function seguro(fonte, texto) {
    let saida = "";
    for (const ch of txt(texto).normalize("NFC").replace(/[\r\n\t]+/g, " ")) {
      try { fonte.widthOfTextAtSize(ch, 10); saida += ch; }
      catch { saida += semAcento(ch).replace(/[^\x20-\x7e]/g, "?"); }
    }
    return saida.trim();
  }

  function montarDados(m, c, hoje = new Date()) {
    c = c || {};
    const [nd, nm, na] = partesData(m.data_nascimento);
    const [bd, bm, ba] = partesData(m.batismo_aguas);
    const [ed, em, ea] = partesData(m.data_batismo_espirito_santo);
    const [cd, cm, ca] = partesData(m.data_nascimento_conjuge);
    const congregacao = txt(c.congregacao_local_nome);
    const localIgreja = congregacao || txt(c.congregacao_sede) || txt(c.nome_igreja);
    const localConvencao = [congregacao.trim(), txt(c.convencao)].filter(Boolean).join(" - ");
    const cidadeEstadoNasc = [txt(m.cidade_nascimento).trim(), txt(m.estado_nascimento).trim()].filter(Boolean).join(" - ");
    const dados = {
      setor_campo: txt(c.congregacao_local_campo_setor) || txt(c.setor),
      dirigente: txt(c.congregacao_local_dirigente),
      congregacao,
      numero_congregacao: txt(c.congregacao_local_numero),
      nome_membro: txt(m.nome), rg: txt(m.rg), orgao_emissor: txt(m.orgao_emissor), cpf: txt(m.cpf),
      data_nascimento_dia: nd, data_nascimento_mes: nm, data_nascimento_ano: na,
      estado_civil: txt(m.estado_civil), profissao: txt(m.profissao),
      pai: txt(m.nome_pai), mae: txt(m.nome_mae),
      cidade_estado_nascimento: cidadeEstadoNasc,
      conjuge: txt(m.nome_conjuge),
      data_nascimento_conjuge_dia: cd, data_nascimento_conjuge_mes: cm, data_nascimento_conjuge_ano: ca,
      grau_instrucao_secular: txt(m.grau_instrucao), curso_teologico: txt(m.curso_teologico),
      residencial: txt(m.telefone), celular: txt(m.celular), email: txt(m.email),
      rua: txt(m.endereco), numero: txt(m.numero), bairro: txt(m.bairro), cidade: txt(m.cidade),
      uf: txt(m.estado), cep: txt(m.cep),
      batismo_aguas_dia: bd, batismo_aguas_mes: bm, batismo_aguas_ano: ba,
      igreja_local_batismo_aguas: txt(m.igreja_local_batismo_aguas) || localIgreja,
      batismo_espirito_santo_dia: ed, batismo_espirito_santo_mes: em, batismo_espirito_santo_ano: ea,
      igreja_local_batismo_espirito_santo: txt(m.igreja_local_batismo_espirito_santo) || localIgreja,
      nome_titular_lgpd: txt(m.nome),
      cargo: txt(m.cargo), observacoes: txt(m.observacoes),
      local_cidade: txt(c.congregacao_local_cidade) || txt(c.cidade) || txt(m.cidade),
      local_dia: String(hoje.getDate()).padStart(2, "0"),
      local_mes: MESES_PDF[hoje.getMonth()],
      local_ano: String(hoje.getFullYear()),
      cidade_igreja: txt(c.cidade),
    };
    for (const nome of Object.values(FUNCOES)) { dados[nome + "_dia"] = dados[nome + "_mes"] = dados[nome + "_ano"] = ""; }
    for (const nome of Object.values(LOCAL_FUNCAO)) dados[nome] = "";
    const funcao = funcaoPdf(m.cargo);
    if (funcao) {
      const [fd, fm, fa] = partesData(m.data_funcao);
      dados[funcao + "_dia"] = fd; dados[funcao + "_mes"] = fm; dados[funcao + "_ano"] = fa;
      dados[LOCAL_FUNCAO[funcao]] = (funcao === "evangelista" || funcao === "pastor") ? localConvencao : congregacao || localIgreja;
    }
    dados.numero_pedido = dados.numero_congregacao;
    return dados;
  }

  /* ---------- Ficha Cadastral: PDF com campos, preenchido e "achatado" ---------- */
  async function fichaCadastral(dados, fotoDataUrl) {
    const pdf = await PDFDocument.load(await carregar("modelos/ficha.pdf"));
    const fonte = await pdf.embedFont(StandardFonts.Helvetica);
    const form = pdf.getForm();
    for (const [nome, valor] of Object.entries(dados)) {
      if (!valor) continue;
      let campo;
      try { campo = form.getTextField(nome); } catch { continue; }
      campo.setText(seguro(fonte, valor));
      const base = nome.replace(/_(dia|mes|ano)$/, "");
      if (base !== nome && DATAS_CENTRALIZADAS.has(base)) campo.setAlignment(TextAlignment.Center);
    }
    for (const campo of form.getFields()) { // campos vazios somem (senao ficam com o fundo colorido)
      if (campo instanceof PDFLib.PDFTextField && !campo.getText()) form.removeField(campo);
    }
    // campos viram texto fixo, sem o fundo amarelo e a borda vermelha do formulario
    for (const campo of form.getFields()) {
      for (const w of campo.acroField.getWidgets()) {
        const c = w.getOrCreateAppearanceCharacteristics();
        c.setBackgroundColor([]);
        c.setBorderColor([]);
        const borda = w.getOrCreateBorderStyle();
        borda.setWidth(0);
      }
    }
    form.updateFieldAppearances(fonte);
    form.flatten();
    if (fotoDataUrl) {
      try {
        const bytes = await (await fetch(fotoDataUrl)).arrayBuffer();
        const img = await pdf.embedJpg(bytes);
        const caixa = { x: 489, y: 734, w: 74, h: 82 };
        const fator = Math.min(caixa.w / img.width, caixa.h / img.height);
        const w = img.width * fator, hh = img.height * fator;
        pdf.getPage(0).drawImage(img, { x: caixa.x + (caixa.w - w) / 2, y: caixa.y + (caixa.h - hh) / 2, width: w, height: hh });
      } catch { /* foto ilegivel: segue sem foto */ }
    }
    return pdf.save();
  }

  /* ---------- Pedidos: texto por cima do modelo impresso ---------- */
  const TAM = 10.5, TAM_MIN = 6.5, FOLGA = 2.6;
  const RECONCILIACAO = {
    arquivo: "modelos/reconciliacao.pdf",
    campos: {
      congregacao: [80, 332, 638.8], numero: [354, 379, 638.8], dirigente: [80, 402, 621.2], nome_membro: [80, 402, 600.2],
      carimbo_assinatura_dirigente: [16, 206, 358.5], visto_pastor_setorial: [218, 392, 358.5],
    },
    obs: [16, 388, [0, 1, 2, 3, 4, 5, 6].map((i) => 539.0 - 24.33 * i)],
    data: { cidade: [71, 141], dia: [148, 188], mes: [212, 366], ano: [372, 406], y: 286.8 },
  };
  const MEMBRAMENTO = {
    arquivo: "modelos/membramento.pdf",
    campos: {
      congregacao: [80, 332, 638.8], numero: [354, 379, 638.8], dirigente: [80, 402, 621.2, 7], nome_membro: [80, 402, 600.2, 7],
      igreja_origem: [112, 402, 579.8, 18], cidade_origem: [66, 334, 561.8, 12], estado_origem: [372, 402, 561.8, 9],
      carimbo_assinatura_dirigente: [18, 206, 281.5], visto_pastor_setorial: [218, 396, 281.5],
    },
    obs: [19, 391, [417.0, 391.75, 366.5, 341.25, 316.0]],
    data: { cidade: [78, 147], dia: [154, 194], mes: [218, 366], ano: [378, 412], y: 209.8 },
  };

  function ajustar(fonte, texto, larguraUtil, tamMax = TAM) {
    let tam = tamMax;
    while (tam > TAM_MIN && fonte.widthOfTextAtSize(texto, tam) > larguraUtil) tam -= 0.5;
    if (fonte.widthOfTextAtSize(texto, tam) > larguraUtil) {
      while (texto && fonte.widthOfTextAtSize(texto + "...", tam) > larguraUtil) texto = texto.slice(0, -1);
      texto = texto.trimEnd() + "...";
    }
    return [texto, tam];
  }
  function escrever(pagina, fonte, texto, x1, x2, yLinha, { centro = false, recuo = 4, tamMax = TAM, folga = FOLGA } = {}) {
    texto = seguro(fonte, texto);
    if (!texto) return;
    const [t, tam] = ajustar(fonte, texto, (x2 - (x1 + recuo - 4)) - 4, tamMax);
    const x = centro ? (x1 + x2) / 2 - fonte.widthOfTextAtSize(t, tam) / 2 : x1 + recuo;
    pagina.drawText(t, { x, y: yLinha + folga, size: tam, font: fonte, color: rgb(0, 0, 0) });
  }
  function quebrar(fonte, texto, largura) {
    const linhas = [];
    for (const par of txt(texto).replace(/\r/g, "").split("\n")) {
      let atual = "";
      for (const palavra of par.split(/\s+/).filter(Boolean)) {
        const teste = (atual + " " + palavra).trim();
        if (fonte.widthOfTextAtSize(teste, TAM) <= largura) atual = teste;
        else { if (atual) linhas.push(atual); atual = palavra; }
      }
      linhas.push(atual);
    }
    return linhas;
  }
  async function pedido(modelo, dados) {
    const pdf = await PDFDocument.load(await carregar(modelo.arquivo));
    const fonte = await pdf.embedFont(StandardFonts.Helvetica);
    const pag = pdf.getPage(0);
    const d = { ...dados, numero: dados.numero_congregacao };
    for (const [campo, [x1, x2, y, recuo]] of Object.entries(modelo.campos)) {
      escrever(pag, fonte, d[campo], x1, x2, y, { recuo: recuo ?? 4 });
    }
    const [ox1, ox2, ys] = modelo.obs;
    const linhas = quebrar(fonte, seguro(fonte, d.observacoes), ox2 - ox1 - 4);
    linhas.slice(0, ys.length).forEach((linha, i) => {
      if (linha) pag.drawText(linha, { x: ox1 + 2, y: ys[i] + FOLGA, size: TAM, font: fonte });
    });
    const dt = modelo.data, y = dt.y, branco = rgb(1, 1, 1);
    const cidade = seguro(fonte, d.local_cidade);
    if (cidade) { // troca a cidade impressa
      pag.drawRectangle({ x: dt.cidade[0] - 1, y: y - 0.5, width: dt.cidade[1] - dt.cidade[0] + 2, height: 17, color: branco });
      pag.drawText(cidade + ",", { x: dt.cidade[0] + 2, y: y + 5, size: 11, font: fonte });
    }
    escrever(pag, fonte, d.local_dia, dt.dia[0], dt.dia[1], y, { centro: true, tamMax: 11, folga: 4 });
    escrever(pag, fonte, d.local_mes, dt.mes[0], dt.mes[1], y, { centro: true, tamMax: 11, folga: 4 });
    if (d.local_ano) { // troca o ano impresso
      pag.drawRectangle({ x: dt.ano[0] - 2, y: y + 1.5, width: dt.ano[1] - dt.ano[0] + 8, height: 15, color: branco });
      pag.drawText(txt(d.local_ano), { x: dt.ano[0] + 2, y: y + 5, size: 11, font: fonte });
    }
    return pdf.save();
  }

  /* ---------- Carta de Recomendacao: texto sobre a imagem de fundo ---------- */
  const CM = 28.3465;
  const CARTA_POS = {
    apresentar_em: [0.33, 0.388, 0.60], nome_membro: [0.41, 0.5385, 0.52], cargo: [0.41, 0.5765, 0.25],
    sexo: [0.815, 0.5765, 0.14], setor_campo: [0.43, 0.611, 0.06], congregacao: [0.66, 0.611, 0.32],
    cidade_data: [0.32, 0.762, 0.60],
  };
  async function carta(dados, config, apresentarEm, hoje = new Date()) {
    const L = 16 * CM, A = 21 * CM;
    const pdf = await PDFDocument.create();
    const fonte = await pdf.embedFont(StandardFonts.Helvetica);
    const pag = pdf.addPage([L, A]);
    const fundo = await pdf.embedJpg(await carregar("modelos/carta.jpg"));
    pag.drawImage(fundo, { x: 0, y: 0, width: L, height: A });
    const cidade = txt(config && config.cidade).trim();
    const dataExtenso = `${String(hoje.getDate()).padStart(2, "0")} de ${MESES_EXTENSO[hoje.getMonth()]} de ${hoje.getFullYear()}`;
    const valores = { ...dados, apresentar_em: txt(apresentarEm).trim().slice(0, 160), cidade_data: cidade ? `${cidade}, ${dataExtenso}` : dataExtenso };
    for (const [campo, [fx, fy, fl]] of Object.entries(CARTA_POS)) {
      let texto = seguro(fonte, valores[campo]);
      if (!texto) continue;
      const maxL = fl * L;
      let tam = 10.5;
      while (tam > 6.5 && fonte.widthOfTextAtSize(texto, tam) > maxL) tam -= 0.5;
      if (fonte.widthOfTextAtSize(texto, tam) > maxL) {
        while (texto && fonte.widthOfTextAtSize(texto + "...", tam) > maxL) texto = texto.slice(0, -1);
        texto = texto.trimEnd() + "...";
      }
      pag.drawText(texto, { x: fx * L, y: A - fy * A, size: tam, font: fonte, color: rgb(0, 0, 0) });
    }
    return pdf.save();
  }

  async function gerarDocumento(tipo, membro, config, foto, apresentarEm) {
    if (!DOCUMENTOS[tipo]) throw new Error("Documento desconhecido.");
    const dados = montarDados(membro, config);
    let bytes;
    if (tipo === "ficha") bytes = await fichaCadastral(dados, foto);
    else if (tipo === "membramento") bytes = await pedido(MEMBRAMENTO, dados);
    else if (tipo === "reconciliacao") bytes = await pedido(RECONCILIACAO, dados);
    else bytes = await carta({ ...dados, cargo: dados.cargo }, config, apresentarEm);
    return { bytes, nome: nomeArquivoSeguro(`${DOCUMENTOS[tipo]} ${membro.nome}`) + ".pdf" };
  }

  /* ---------- Relatorios (lista em PDF, paisagem A4) ---------- */
  async function relatorio(titulo, colunas, linhas, nomeIgreja) {
    const pdf = await PDFDocument.create();
    const fonte = await pdf.embedFont(StandardFonts.Helvetica);
    const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
    const L = 841.89, A = 595.28, x0 = 40;
    const larguraCol = (L - 80) / Math.max(colunas.length, 1);
    const cortar = (t, f, tam, max) => {
      t = seguro(f, t);
      while (t.length > 1 && f.widthOfTextAtSize(t, tam) > max) t = t.slice(0, -1);
      return t;
    };
    let pag, y;
    const cabecalho = () => {
      pag = pdf.addPage([L, A]);
      y = A - 44;
      pag.drawText(seguro(negrito, titulo), { x: x0, y, size: 14, font: negrito });
      if (nomeIgreja) {
        const n = seguro(fonte, nomeIgreja);
        pag.drawText(n, { x: L - 40 - fonte.widthOfTextAtSize(n, 9), y, size: 9, font: fonte });
      }
      y -= 28;
      colunas.forEach((c, i) => pag.drawText(cortar(c, negrito, 9, larguraCol - 6), { x: x0 + i * larguraCol, y, size: 9, font: negrito }));
      y -= 16;
    };
    cabecalho();
    for (const linha of linhas) {
      if (y < 40) cabecalho();
      linha.forEach((v, i) => pag.drawText(cortar(v, fonte, 8, larguraCol - 6), { x: x0 + i * larguraCol, y, size: 8, font: fonte }));
      y -= 14;
    }
    return pdf.save();
  }

  return { DOCUMENTOS, gerarDocumento, relatorio, montarDados };
})();
