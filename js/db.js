/* SIGM Local - banco de dados no proprio aparelho (IndexedDB). */
const DB = (() => {
  let conexao = null;

  function abrir() {
    if (conexao) return Promise.resolve(conexao);
    return new Promise((resolver, rejeitar) => {
      if (!window.indexedDB) return rejeitar(new Error("Este navegador não guarda dados no aparelho."));
      const pedido = indexedDB.open("sigm-local", 1);
      pedido.onupgradeneeded = () => {
        const d = pedido.result;
        d.createObjectStore("membros", { keyPath: "id" });
        d.createObjectStore("fotos", { keyPath: "id" });
        d.createObjectStore("meta", { keyPath: "chave" });
      };
      pedido.onsuccess = () => { conexao = pedido.result; resolver(conexao); };
      pedido.onerror = () => rejeitar(pedido.error || new Error("Não foi possível abrir o banco de dados."));
    });
  }

  // executa operacoes em varias lojas na mesma transacao
  async function transacao(lojas, modo, trabalho) {
    const d = await abrir();
    return new Promise((resolver, rejeitar) => {
      const t = d.transaction(lojas, modo);
      let resultado;
      Promise.resolve(trabalho(...lojas.map((l) => t.objectStore(l)))).then((r) => { resultado = r; }, rejeitar);
      t.oncomplete = () => resolver(resultado);
      t.onerror = () => rejeitar(t.error);
      t.onabort = () => rejeitar(t.error || new Error("Operação cancelada."));
    });
  }

  const pedir = (req) => new Promise((ok, erro) => { req.onsuccess = () => ok(req.result); req.onerror = () => erro(req.error); });

  return {
    listarMembros: () => transacao(["membros"], "readonly", (s) => pedir(s.getAll())),
    obterMembro: (id) => transacao(["membros"], "readonly", (s) => pedir(s.get(id))),
    obterFoto: async (id) => {
      const r = await transacao(["fotos"], "readonly", (s) => pedir(s.get(id)));
      return r ? r.dados : "";
    },
    salvarMembro: (membro, foto) => transacao(["membros", "fotos"], "readwrite", (m, f) => {
      m.put(membro);
      if (foto === "") f.delete(membro.id);
      else if (typeof foto === "string") f.put({ id: membro.id, dados: foto });
    }),
    excluirMembro: (id) => transacao(["membros", "fotos"], "readwrite", (m, f) => { m.delete(id); f.delete(id); }),
    lerMeta: async (chave, padrao) => {
      const r = await transacao(["meta"], "readonly", (s) => pedir(s.get(chave)));
      return r ? r.valor : padrao;
    },
    gravarMeta: (chave, valor) => transacao(["meta"], "readwrite", (s) => { s.put({ chave, valor }); }),
    todasAsFotos: () => transacao(["fotos"], "readonly", (s) => pedir(s.getAll())),
    // backup: troca tudo (substituir) ou junta (mesclar, vence o registro mais recente)
    restaurar: (membros, fotos, config, substituir) => transacao(["membros", "fotos", "meta"], "readwrite", async (m, f, meta) => {
      if (substituir) { m.clear(); f.clear(); }
      const atuais = new Map();
      if (!substituir) (await pedir(m.getAll())).forEach((x) => atuais.set(x.id, x));
      let novos = 0, atualizados = 0;
      for (const membro of membros) {
        const atual = atuais.get(membro.id);
        if (atual && String(atual.atualizado_em || "") >= String(membro.atualizado_em || "")) continue;
        m.put(membro);
        if (atual) atualizados += 1; else novos += 1;
        if (fotos[membro.id]) f.put({ id: membro.id, dados: fotos[membro.id] });
      }
      if (substituir && config) meta.put({ chave: "config", valor: config });
      return { novos, atualizados };
    }),
  };
})();
