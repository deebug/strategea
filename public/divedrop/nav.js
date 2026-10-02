// Shared top bar for every DiveDrop page. Each page loads this right before <main>,
// so the bar is in place before first paint. It adopts the page's own language toggle
// (the page script keeps handling it) and follows <html lang> for its labels.
(function () {
  const L = {
    en: { compatibility: "Compatibility", changelog: "What's new", support: "Support", press: "Press", download: "Download", menu: "Menu" },
    fr: { compatibility: "Compatibilité", changelog: "Nouveautés", support: "Support", press: "Presse", download: "Télécharger", menu: "Menu" },
    nl: { compatibility: "Compatibiliteit", changelog: "Wat is er nieuw", support: "Support", press: "Pers", download: "Downloaden", menu: "Menu" }
  };
  const ITEMS = ["compatibility", "changelog", "support", "press"];

  // Works on divedrop.app (pages at the root) and on the repo layout (/divedrop/...).
  const path = location.pathname;
  const m = path.match(/^(.*?\/divedrop\/)/);
  const root = m ? m[1] : "/";
  const current = path.slice(root.length).split("/")[0];
  const home = current === "" || current === "index.html";

  const css = `
  .ddnav{position:sticky;top:0;z-index:50;background:rgba(249,249,251,.84);-webkit-backdrop-filter:saturate(1.4) blur(14px);backdrop-filter:saturate(1.4) blur(14px);border-bottom:1px solid transparent;transition:border-color .2s}
  .ddnav.scrolled{border-bottom-color:rgba(17,24,39,.08)}
  .ddnav-in{max-width:1000px;margin:0 auto;padding:.65rem 1.25rem;display:flex;align-items:center;gap:1rem}
  .ddnav-brand{display:flex;align-items:center;gap:.55rem;margin-right:auto;text-decoration:none;color:#111827;font-weight:700;font-size:1.05rem;letter-spacing:-.01em}
  .ddnav-brand img{width:30px;height:30px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.14)}
  .ddnav-links{display:flex;gap:.15rem}
  .ddnav-links a,.ddnav-panel a.lnk{color:#4b5563;text-decoration:none;font-weight:500;font-size:.93rem;padding:.45rem .7rem;border-radius:10px;transition:background .15s,color .15s}
  .ddnav-links a:hover,.ddnav-panel a.lnk:hover{color:#111827;background:rgba(17,24,39,.05)}
  .ddnav-links a[aria-current],.ddnav-panel a.lnk[aria-current]{color:#111827;font-weight:600}
  .ddnav .lang-toggle{position:static;box-shadow:none;border:1px solid rgba(17,24,39,.08);padding:.15rem;flex:none}
  .ddnav .lang-toggle button{padding:.28rem .55rem;font-size:.76rem}
  .ddnav-cta{flex:none;background:#111827;color:#fff;text-decoration:none;font-weight:600;font-size:.88rem;padding:.55rem 1.05rem;border-radius:50px;white-space:nowrap;transition:background .15s}
  .ddnav-cta:hover{background:#2a5a8a}
  .ddnav-burger{display:none;flex:none;width:40px;height:40px;border:1px solid rgba(17,24,39,.1);border-radius:12px;background:#fff;cursor:pointer;align-items:center;justify-content:center}
  .ddnav-burger svg{width:20px;height:20px;stroke:#111827;stroke-width:2;fill:none;stroke-linecap:round}
  .ddnav-burger .x{display:none}
  .ddnav.open .ddnav-burger .x{display:block}.ddnav.open .ddnav-burger .bars{display:none}
  .ddnav-panel{display:none}
  .ddnav a:focus-visible,.ddnav button:focus-visible{outline:2px solid #54b3d6;outline-offset:2px}
  main.wrap > a.brand{display:none}
  [id]{scroll-margin-top:84px}
  html body main.wrap{padding-top:2.75rem}
  @media (max-width:820px){
    .ddnav-links,.ddnav-in > .ddnav-cta{display:none}
    .ddnav-burger{display:inline-flex}
    .ddnav.open .ddnav-panel{display:grid;gap:.1rem;max-width:1000px;margin:0 auto;padding:0 1.25rem 1rem}
    .ddnav-panel a.lnk{font-size:1.02rem;padding:.75rem .7rem}
    .ddnav-panel .ddnav-cta{text-align:center;margin-top:.5rem;padding:.8rem 1rem;font-size:.98rem}
    html body main.wrap{padding-top:1.75rem}
  }
  @media (prefers-reduced-motion:reduce){.ddnav,.ddnav *{transition:none!important}}`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const links = ITEMS.map(k =>
    `<a data-k="${k}" href="${root}${k}/"${k === current ? ' aria-current="page"' : ""}></a>`).join("");
  const download = `<a class="ddnav-cta" data-k="download" href="${home ? "" : root}#download"></a>`;
  const bar = document.createElement("header");
  bar.className = "ddnav";
  bar.innerHTML =
    `<div class="ddnav-in">` +
      `<a class="ddnav-brand" href="${root}"><img src="${root}img/icon.png" alt=""><span>DiveDrop</span></a>` +
      `<nav class="ddnav-links" aria-label="DiveDrop">${links}</nav>` +
      `<span class="ddnav-lang"></span>` + download +
      `<button class="ddnav-burger" type="button" aria-expanded="false" aria-controls="ddnavPanel">` +
        `<svg class="bars" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>` +
        `<svg class="x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>` +
      `</button>` +
    `</div>` +
    `<nav class="ddnav-panel" id="ddnavPanel" aria-label="DiveDrop">` +
      links.replace(/<a /g, '<a class="lnk" ') + download +
    `</nav>`;
  document.body.prepend(bar);

  const toggle = document.querySelector("body > .lang-toggle");
  if (toggle) bar.querySelector(".ddnav-lang").replaceWith(toggle);
  else bar.querySelector(".ddnav-lang").remove();

  const burger = bar.querySelector(".ddnav-burger");
  const setOpen = open => { bar.classList.toggle("open", open); burger.setAttribute("aria-expanded", String(open)); };
  burger.addEventListener("click", () => setOpen(!bar.classList.contains("open")));
  bar.querySelectorAll(".ddnav-panel a").forEach(a => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });

  const onScroll = () => bar.classList.toggle("scrolled", window.scrollY > 4);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Pages without a toggle (privacy) still follow the visitor's last choice.
  let stored = null;
  try { stored = localStorage.getItem("divedrop.lang"); } catch (e) {}
  const label = () => {
    let lang = (document.documentElement.lang || "en").slice(0, 2);
    if (!toggle && stored) lang = stored;
    const t = L[lang] || L.en;
    bar.querySelectorAll("[data-k]").forEach(el => { el.textContent = t[el.dataset.k]; });
    burger.setAttribute("aria-label", t.menu);
  };
  label();
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
