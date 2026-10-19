/* SIGM Local - utilidades (DOM, datas, texto). */
function h(tag, atributos, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos || {})) {
    if (valor === false || valor == null) continue;
    if (chave === "class") el.className = valor;
    else if (chave.startsWith("on") && typeof valor === "function") el.addEventListener(chave.slice(2), valor);
    else if (chave === "value") el.value = valor;
    else if (valor === true) el.setAttribute(chave, "");
    else el.setAttribute(chave, valor);
  }
  for (const filho of filhos.flat(Infinity)) {
    if (filho == null || filho === false) continue;
    el.append(filho.nodeType ? filho : document.createTextNode(String(filho)));
  }
  return el;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function semAcento(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function soDigitos(texto) { return String(texto || "").replace(/\D/g, ""); }

// datas ficam guardadas como AAAA-MM-DD (campo de data do celular)
function interpretarData(valor) {
  const t = String(valor || "").trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let d, mes, a;
  if (m) { a = +m[1]; mes = +m[2]; d = +m[3]; }
  else if ((m = t.match(/^(\d{1,2})[\/\- ](\d{1,2})[\/\- ](\d{4})$/))) { d = +m[1]; mes = +m[2]; a = +m[3]; }
  else return null;
  const data = new Date(a, mes - 1, d);
  if (data.getFullYear() !== a || data.getMonth() !== mes - 1 || data.getDate() !== d) return null;
  return { dia: d, mes, ano: a };
}
function mascaraData(valor) {
  const d = String(valor || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function formatarData(valor) {
  const d = interpretarData(valor);
  if (!d) {
    const t = String(valor || "").trim();
    if (/^true$/i.test(t)) return "Sim";
    if (/^false$/i.test(t)) return "Não";
    return t;
  }
  return `${String(d.dia).padStart(2, "0")}/${String(d.mes).padStart(2, "0")}/${d.ano}`;
}
function contato(m) { return m.celular || m.telefone || ""; }
function linkWhatsapp(numero) {
  let d = soDigitos(numero);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 ? `https://wa.me/${d}` : "";
}
function novoId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
function agoraISO() { return new Date().toISOString(); }
function nomeArquivoSeguro(texto) {
  return semAcento(texto).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "arquivo";
}

// reduz a foto para caber (720x960 JPEG) e devolve data URL
function reduzirFoto(arquivo, largMax = 720, altMax = 960) {
  return new Promise((resolver, rejeitar) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const fator = Math.min(1, largMax / img.width, altMax / img.height);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * fator));
      c.height = Math.max(1, Math.round(img.height * fator));
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolver(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error("Não consegui ler essa imagem.")); };
    img.src = url;
  });
}

function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function paraCSV(colunas, linhas) {
  const esc = (v) => {
    const t = String(v ?? "");
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + [colunas, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
}
