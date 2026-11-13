"use strict";
/* =====================================================================
   INTERFAZ DEL CONSTRUCTOR (pantalla, guardado, exportar)
   Usa las funciones de motor.js; no conoce ninguna facción concreta.
   ===================================================================== */
let db=null, uid=null, persist=false; // persist: true (cuenta de Claude) | "local" (este navegador) | false
const CLAVE_LOCAL="tcb-listas";
function leerLocal(){ try{ return JSON.parse(localStorage.getItem(CLAVE_LOCAL)||"{}"); }catch(_){ return null; } }
function guardarLocal(){ try{ localStorage.setItem(CLAVE_LOCAL, JSON.stringify(S.listas)); return true; }catch(_){ return false; } }
const S={ listas:{}, actual:null, cargado:false, error:null };
const L=()=>S.listas[S.actual];

function nuevaLista(faccion){
  const f=D.fac[faccion];
  return {id:"l"+Date.now().toString(36), nombre:"Nueva banda: "+tx.fac(faccion), faccion, presupuesto:f.presupuesto||700, gloria:f.gloria||0, modelos:[], ts:Date.now()};
}
function nuevoModelo(l,uId){
  const u=D.fac[l.faccion].U[uId];
  const m={uid:nid(), u:uId, nombre:"", eq:[...(u.defecto||[])], opc:{}};
  if(u.perfiles) m.perfil=Object.keys(u.perfiles)[0];
  return m;
}

/* ---------- Render ---------- */
function render(){
  renderListas();
  if(S.error){ $("#app").innerHTML=`<div class="status">No se han podido cargar los datos de reglas (${esc(S.error)}).</div>`; return; }
  const l=L();
  if(!l){ $("#app").innerHTML=`<div class="status">${S.cargado?"Crea tu primera banda con «Nueva banda».":"Cargando…"}</div>`; return; }
  const t=totales(l), v=validarBanda(l), f=D.fac[l.faccion];
  const pct=Math.min(100,Math.round(t.d/Math.max(1,l.presupuesto)*100));
  const nE=l.modelos.filter(m=>esElite(l,m)).length;
  const rf=id=>Object.entries((D.es.facciones[id]||{}).reglas||{}).map(([k,[n,d]])=>`<p><b>${esc(n)}.</b> ${esc(d)}</p>`).join("");
  const reglasF=(f.base? rf(f.base)+`<p class="sub" style="margin-top:6px">Reglas de la variante:</p>`:"")+rf(f.id);
  const aside=`<aside>
    <section class="panel">
      <div class="f"><label for="l-nombre">Nombre de la banda</label><input type="text" id="l-nombre" value="${esc(l.nombre)}"></div>
      <div class="sub">${esc(tx.fac(l.faccion))}${f.base?` · variante de ${esc(tx.fac(f.base))}`:""}</div>
      <div class="row">
        <div class="f"><label for="l-pres">Ducados disponibles</label><input type="number" min="0" step="10" id="l-pres" value="${l.presupuesto}"></div>
        <div class="f"><label for="l-glo">Gloria disponible</label><input type="number" min="0" id="l-glo" value="${l.gloria}"></div>
      </div>
      ${reglasF?`<details><summary>Reglas de facción</summary><div class="habs">${reglasF}</div></details>`:""}
    </section>
    <section class="panel total">
      <div class="kv"><span class="sub">Coste de la banda</span><span class="sub num">${l.modelos.length} modelos · ${nE} élites</span></div>
      <div><span class="big num">${t.d}</span> <span class="muted num">/ ${l.presupuesto} ducados</span></div>
      <div class="bar ${t.d>l.presupuesto?"over":""}"><i style="width:${pct}%"></i></div>
      <div class="kv"><span>Quedan en el cofre</span><strong class="num ${t.d>l.presupuesto?"over":""}">${menos(l.presupuesto-t.d)} ducados</strong></div>
      <div class="kv"><span>Gloria</span><strong class="num">${t.g} / ${l.gloria}☼</strong></div>
    </section>
    <section class="panel">
      <h3>Revisión</h3>
      ${l._migrada?`<p class="sub" style="margin:0">Banda convertida desde la primera versión del constructor.</p>`:""}
      <ul class="msgs">${v.E.map(x=>`<li class="err">${esc(x)}</li>`).join("")}${v.W.map(x=>`<li>${esc(x)}</li>`).join("")}${!v.E.length&&!v.W.length?`<li class="ok">Banda válida y lista para jugar.</li>`:""}</ul>
      <button class="btn" data-act="exportar">Exportar como texto</button>
      <p class="sub" style="margin:0">El texto exportado se puede pegar en el importador de la página de la campaña.</p>
    </section>
    ${persist===true?"":persist==="local"?`<div class="status">Tus bandas se guardan en este navegador. Para pasarlas a otro dispositivo, usa «Exportar como texto».</div>`:`<div class="status">No se pueden guardar los cambios en este navegador: se perderán al cerrar.</div>`}
  </aside>`;
  const modelos=l.modelos.length? l.modelos.map(m=>tarjeta(l,m)).join("") : `<div class="empty">Todavía no has reclutado a nadie. Empieza por tu líder.</div>`;
  $("#app").innerHTML=aside+`<div style="display:grid;gap:16px;min-width:0">
    <section class="panel"><header><h2>Modelos</h2><span class="sub">Toca el nombre para renombrar · pulsa una palabra clave para ver qué hace</span></header><div style="display:grid;gap:10px">${modelos}</div></section>
    <section class="panel"><header><h2>Reclutar</h2><span class="sub">Precio base sin equipo</span></header>${reclutar(l)}</section>
  </div>`;
}
function renderListas(){
  const sel=$("#sel-lista"); const ids=Object.keys(S.listas).sort((a,b)=>(S.listas[b].ts||0)-(S.listas[a].ts||0));
  sel.innerHTML=ids.length? ids.map(id=>`<option value="${id}" ${id===S.actual?"selected":""}>${esc(S.listas[id].nombre||"Sin nombre")}</option>`).join("") : `<option>—</option>`;
  sel.disabled=!ids.length;
  if(D.version) $("#sub-version").textContent=`${D.version.facciones.map(tx.fac).join(" · ")} · ${D.version.reglamento}`;
}
function reclutar(l){
  const f=D.fac[l.faccion];
  const grupo=(titulo,us)=> us.length? `<h3 style="margin-top:4px">${titulo}</h3><div class="recruit">${us.map(u=>{
    const max=maxUnidad(l,u), n=contar(l,u.id), lleno=n>=max;
    const pf0=u.perfiles? Object.values(u.perfiles)[0] : u;
    const p=pf0.perfil||u.perfil, kw=pf0.kw||u.kw;
    const cs=u.perfiles? [...new Set(Object.values(u.perfiles).map(x=>x.d!=null?x.d:u.d))] : [u.d];
    return `<button class="ucard" data-act="reclutar" data-u="${u.id}" ${lleno?"disabled":""} title="${esc(u.en)}">
      <div class="h"><strong>${esc(tx.unidad(u))}</strong><span class="cost num">${u.g?u.g+"☼":cs.join("/")+" <small class='sub'>duc.</small>"}</span></div>
      <div class="chips">${kw.includes("ELITE")?`<span class="chip gold">Élite</span>`:""}${u.merc?`<span class="chip">Mercenario</span>`:""}<span class="chip">${max===Infinity?"Sin límite":`${n}/${max}`}</span><span class="chip">${p.mov}"/${esc(tx.ui("movimiento",p.tipoMov))}</span><span class="chip">Disp ${esc(dados(p.dis))}</span><span class="chip">CaC ${esc(dados(p.cac))}</span></div>
    </button>`; }).join("")}</div>` : "";
  const us=Object.values(f.U);
  const eli=u=>((u.perfiles?Object.values(u.perfiles)[0].kw:null)||u.kw).includes("ELITE");
  return grupo("Élites", us.filter(u=>!u.merc&&eli(u))) + grupo("Tropa", us.filter(u=>!u.merc&&!eli(u))) + grupo("Mercenarios (se pagan con Gloria)", us.filter(u=>u.merc));
}
function filaItem(l,m,it){
  const o=it.o, nat=o.cat==="natural";
  const c = it.fijo||nat? null : it.deOpcion? {d:it.ent.d||0,g:it.ent.g||0} : costeItem(l,m,o.id,it.idx);
  const cs = c? (c.g?`${c.g}☼`:`${c.d} duc.`)+(c.nota?`<br><span class="sub" style="font-size:.72rem">${esc(c.nota)}</span>`:"") : (nat?"":"incluido");
  const perfil=[tx.ui("tipos",o.cat), o.manos?(o.manos===2?"dos manos":"una mano"):"", o.alcance?o.alcance.replace("Melee","CaC"):""].filter(Boolean).join(" · ");
  const regla=o.regla? tx.regla(o.regla) : "";
  let kws=[...(o.kw||[])]; if(nat) kws=[...kwNaturalesExtra(l,m), ...kws];
  const est=((it.ent&&it.ent.estip)||[]).filter(e=>e==="SHIELD_COMBO"||e==="BAYONET_LUG").map(e=>e==="SHIELD_COMBO"?"Combinación con escudo":"Enganche de bayoneta");
  const quitar = it.fijo||nat||it.deOpcion? `<span class="sub" title="${nat?"Ataque natural":"Incluido"}">${nat||it.deOpcion?"":"🔒"}</span>` : `<button class="icon" data-act="quitar-eq" data-m="${m.uid}" data-i="${it.idx}" aria-label="Quitar ${esc(tx.obj(o.id))}">✕</button>`;
  return `<div class="item ${it.fijo?"fixed":""} ${nat?"nat":""}"><div class="n"><span>${esc(tx.obj(o.id))}${it.deOpcion?` <span class="sub">(${esc(tx.opc(it.opcion).n)})</span>`:""}${o.cabeza?' <span class="sub">(cabeza)</span>':""}</span>
    <span class="p">${esc(perfil)}${est.length?" · "+esc(est.join(", ")):""}${regla?" — "+esc(regla):""}</span><div class="kwrow">${kwChips(kws)}</div></div>
    <span class="c">${cs}</span>${quitar}</div>`;
}
function kwNaturalesExtra(l,m){ const u=unidad(l,m), out=[]; (u.opciones||[]).forEach(o=>{ if(o.tipo==="check"&&(m.opc||{})[o.id]&&o.efecto&&o.efecto.kwNaturales) out.push(...o.efecto.kwNaturales); }); return out; }
function tarjeta(l,m){
  const u=unidad(l,m), f=D.fac[l.faccion]; if(!u) return "";
  const c=costeModelo(l,m), v=validarModelo(l,m), st=statsModelo(l,m), kw=kwModelo(u,m), elite=kw.includes("ELITE");
  const pf=perfilDe(u,m);
  const nTipo=nombreTipo(u,m);
  const naturales=(u.naturales||[]).map(id=>({o:D.obj[id]}));
  const items=itemsDe(l,m);
  const kit=[...naturales,...items].map(it=>filaItem(l,m,it)).join("");
  let addSel="";
  if(!(u.kit&&u.kit.nada)){
    const grupos={}; f.armeria.forEach(e=>{ const o=D.obj[e.obj]; (grupos[o.cat]=grupos[o.cat]||[]).push(e); });
    const opts=D.comun.categorias.filter(k=>grupos[k]).map(cat=>`<optgroup label="${esc(tx.ui("categorias",cat))}">${grupos[cat].map(e=>{
      const r=motivo(l,m,e.obj); const o=D.obj[e.obj];
      const mp={...m,eq:[...m.eq,e.obj]}, lp={...l,modelos:l.modelos.map(x=>x.uid===m.uid?mp:x)};
      const cc=costeItem(lp,mp,e.obj,m.eq.length); const ci=cc.g?cc.g+"☼":cc.d+" duc.";
      return `<option value="${e.obj}" ${r?"disabled":""}>${esc(tx.obj(e.obj))} — ${ci}${e.lim?` · lím. ${e.lim}`:""}${r?` (${esc(r)})`:""}</option>`; }).join("")}</optgroup>`).join("");
    addSel=`<div class="add"><label class="sub" for="add-${m.uid}">Añadir equipo</label><select id="add-${m.uid}" data-addeq="${m.uid}"><option value="">Elige un objeto…</option>${opts}</select></div>`;
  }
  let mejoras="", notas="";
  if(u.perfiles) mejoras+=`<div class="f"><label for="pf-${m.uid}">Tipo</label><select id="pf-${m.uid}" data-perfil="${m.uid}">${Object.entries(u.perfiles).map(([k,p])=>`<option value="${k}" ${(m.perfil||Object.keys(u.perfiles)[0])===k?"selected":""}>${esc(tx.unidad(u,k))}${p.d!=null&&p.d!==u.d?` (${p.d} duc.)`:p.d!=null?` (${p.d} duc.)`:""}</option>`).join("")}</select></div>`;
  if(f.equiposDeFuego){ const ft=f.equiposDeFuego; const cuenta=k=>l.modelos.filter(x=>x!==m&&x.ft==k).length;
    mejoras+=`<div class="f"><label for="ft-${m.uid}">${esc(tx.ui("equipoFuego","n"))}</label><select id="ft-${m.uid}" data-ft="${m.uid}"><option value="">${esc(tx.ui("equipoFuego","ninguno"))}</option>${Array.from({length:ft.max},(_,i)=>i+1).map(k=>{ const n=cuenta(k); const lleno=n>=ft.miembros&&m.ft!=k;
      return `<option value="${k}" ${m.ft==k?"selected":""} ${lleno?"disabled":""}>Equipo ${k} (${n}/${ft.miembros})</option>`; }).join("")}</select></div>`; }
  (u.opciones||[]).forEach(o=>{
    const v=(m.opc||{})[o.id];
    if(o.tipo==="check"){ const mx=maxOpcion(l,o); const otros=l.modelos.filter(x=>x!==m&&(x.opc||{})[o.id]).length;
      const falta=o.requiere&&!o.requiere.some(c=>cumple(l,m,c));
      const bloq=!v&&((mx&&otros>=mx)||falta);
      const precio=o.d?`+${o.d} duc.`:o.g?`+${o.g}☼`:"gratis";
      mejoras+=`<label class="sub" style="flex-basis:100%"><input type="checkbox" data-opc="${m.uid}" data-o="${o.id}" ${v?"checked":""} ${bloq?"disabled":""}> <b style="color:var(--ink);font-weight:500">${esc(tx.opc(o.id).n)}</b> (${precio}${mx?`, máx. ${mx} en la banda`:""}${falta?`, requiere ${esc(o.requiere.map(c=>textoCond(l,c)).join(" o "))}`:""}): ${esc(tx.opc(o.id).d||"")}</label>`; }
    if(o.tipo==="select"){
      const sel=v&&v.v||"";
      mejoras+=`<div class="f"><label for="op-${m.uid}-${o.id}">${esc(tx.opc(o.id).n)}</label><select id="op-${m.uid}-${o.id}" data-opcsel="${m.uid}" data-o="${o.id}"><option value="">${esc(tx.opc(o.id).ninguno||"Ninguno")}</option>${o.opciones.map(op=>{
        const otros=l.modelos.filter(x=>x!==m&&((x.opc||{})[o.id]||{}).v===op.id).length; const bloq=op.maxBanda&&otros>=op.maxBanda;
        return `<option value="${op.id}" ${sel===op.id?"selected":""} ${bloq?"disabled":""}>${esc(tx.opc(op.id).n)}${op.d?` (+${op.d} duc.)`:""}${bloq?" — ya hay uno":""}</option>`; }).join("")}</select></div>`;
      const op=o.opciones.find(x=>x.id===sel);
      if(op){ notas+=`<p class="sub" style="margin:0">${esc(tx.opc(op.id).d||"")}</p>`;
        if(op.eleccion&&op.eleccion.tipo==="stat") mejoras+=`<div class="f"><label for="oe-${m.uid}">Característica mejorada</label><select id="oe-${m.uid}" data-opcel="${m.uid}" data-o="${o.id}">${op.eleccion.valores.map(k=>`<option value="${k}" ${(v.e||op.eleccion.valores[0])===k?"selected":""}>${esc(tx.ui("stats",k))}</option>`).join("")}</select></div>`;
        if(op.eleccion&&op.eleccion.tipo==="objeto"){ const lista=f.listas[op.eleccion.lista];
          mejoras+=`<div class="f" style="flex:1 1 260px"><label for="oe-${m.uid}">Arma</label><select id="oe-${m.uid}" data-opcel="${m.uid}" data-o="${o.id}"><option value="">Elige un arma…</option>${lista.opciones.map(x=>`<option value="${x.obj}" ${v.e===x.obj?"selected":""}>${esc(tx.obj(x.obj))}${x.origen?` (${esc(tx.ui("origen",x.origen))})`:""} — ${x.g?x.g+"☼":x.d+" duc."}</option>`).join("")}</select></div>`; } }
    }
  });
  const habs=(pf.habilidades||u.habilidades||[]).map(id=>{ const [n,d]=tx.hab(id); return `<p><b>${esc(n)}.</b> ${esc(d)}</p>`; }).join("");
  const chipExtra = v.extra&&v.extra.chip? `<span class="chip ${v.extra.mal?"bad":"rot"}">${esc(v.extra.chip)}</span>`:"";
  return `<article class="model ${elite?"elite":""} ${v.E.length?"bad":""}">
    <div class="h">
      <input type="text" data-nombre="${m.uid}" value="${esc(m.nombre)}" placeholder="${esc(nTipo)}" aria-label="Nombre del modelo">
      <span class="chips">${elite?`<span class="chip gold">Élite</span>`:""}${u.merc?`<span class="chip">Mercenario</span>`:""}${chipExtra}<span class="chip">${esc(nTipo)}</span></span>
      <span class="cost num">${c.d?c.d+" duc.":""}${c.d&&c.g?" + ":""}${c.g?c.g+"☼":""}${!c.d&&!c.g?"0":""}</span>
      <button class="icon" data-act="dup-m" data-m="${m.uid}" title="Duplicar modelo" aria-label="Duplicar">⧉</button>
      <button class="icon" data-act="del-m" data-m="${m.uid}" title="Quitar de la banda" aria-label="Quitar">✕</button>
    </div>
    <div class="stats num"><div><span>Movimiento</span>${st.mov}"/${esc(tx.ui("movimiento",st.tipoMov))}</div><div><span>Disparo</span>${esc(dados(st.dis))}</div><div><span>Cuerpo a cuerpo</span>${esc(dados(st.cac))}</div><div><span>Armadura</span>${esc(menos(st.arm))}${st.armDet.length?`<span class="armnote">${esc(st.armDet.join(", "))}</span>`:""}</div><div><span>Peana</span>${esc(String(st.base).replace("mm"," mm").replace("x","×"))}</div></div>
    <div class="kwrow">${kwChips(kw)}</div>
    ${mejoras?`<div class="row">${mejoras}</div>${notas}`:""}
    ${kit?`<div class="kit">${kit}</div>`:""}
    ${u.kit&&u.kit.nada&&!(u.fijo||[]).length?`<p class="sub" style="margin:0">No puede llevar equipo.</p>`:""}
    ${addSel}
    ${v.E.length||v.W.length?`<ul class="wlist">${v.E.map(x=>`<li>${esc(x)}</li>`).join("")}${v.W.map(x=>`<li class="w">${esc(x)}</li>`).join("")}</ul>`:""}
    <details><summary>Habilidades</summary><div class="habs">${habs}</div></details>
  </article>`;
}

/* ---------- Exportar (formato compatible con el importador de la campaña) ---------- */
function exportar(l){
  const t=totales(l);
  const linea=m=>{ const u=unidad(l,m), tipo=nombreTipo(u,m), c=costeModelo(l,m);
    const cs=[c.d?c.d+"D":"", c.g?c.g+"G":""].filter(Boolean).join(" + ")||"0D";
    const kit=itemsDe(l,m).map(i=>tx.obj(i.o.id));
    const up=[]; (u.opciones||[]).forEach(o=>{ const v=(m.opc||{})[o.id]; if(!v) return;
      if(o.tipo==="check") up.push(tx.opc(o.id).n);
      else if(v.v){ const op=o.opciones.find(x=>x.id===v.v); let s=tx.opc(v.v).n; if(op&&op.eleccion&&op.eleccion.tipo==="stat") s+=` (${tx.ui("stats",v.e||op.eleccion.valores[0])})`; up.push(s); } });
    return `${m.nombre?m.nombre+" ("+tipo+")":tipo} - ${cs}\n${up.length?"Upgrades & Choices: "+up.join(", ")+"\n":""}${kit.length?"Battlekit: "+kit.join(", ")+"\n":""}`; };
  const el=l.modelos.filter(m=>esElite(l,m)), tr=l.modelos.filter(m=>!esElite(l,m));
  return `## ${l.nombre} ##\n\nFaction: ${tx.fac(l.faccion)}\nRating: ${t.d} Ducats | ${t.g} Glory\nPatron: None\n\n## Elites ##\n\n${el.map(linea).join("\n")}\n## Troops ##\n\n${tr.map(linea).join("\n")}\n## Stash ##\n\nStashed Ducats: ${Math.max(0,l.presupuesto-t.d)}\nUnspent Glory: ${Math.max(0,l.gloria-t.g)}\n`;
}
function modal(html){ $("#modal-root").innerHTML=`<div class="ov" data-ov="1"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; }
function cerrar(){ $("#modal-root").innerHTML=""; }
function abrirExport(){
  modal(`<div class="row" style="justify-content:space-between;align-items:baseline"><h2>Exportar banda</h2><button class="btn sm" data-act="cerrar">Cerrar</button></div>
    <p class="sub" style="margin:0">Cópialo y pégalo en «Importar» de la página de la campaña, o compártelo por WhatsApp.</p>
    <textarea id="ex-txt" readonly>${esc(exportar(L()))}</textarea>
    <div class="row" style="justify-content:flex-end"><span id="ex-msg" class="sub" role="status"></span><button class="btn pri" data-act="copiar">Copiar</button></div>`);
}
function abrirNueva(){
  const ids=D.orden;
  if(ids.length===1){ crear(ids[0]); return; }
  const bases=ids.filter(id=>!D.fac[id].base);
  const opts=bases.map(b=>{ const vs=ids.filter(id=>D.fac[id].base===b);
    return `<optgroup label="${esc(tx.fac(b))}"><option value="${b}">${esc(tx.fac(b))}</option>${vs.map(v=>`<option value="${v}">↳ ${esc(tx.fac(v))}</option>`).join("")}</optgroup>`; }).join("");
  modal(`<h2>Nueva banda</h2><div class="f"><label for="nf">Facción o variante</label><select id="nf">${opts}</select></div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" data-act="crear">Crear</button></div>`);
}
function crear(fid){ const n=nuevaLista(fid); S.listas[n.id]=n; cerrar(); setActual(n.id); guardar(n.id); }
function confirmar(texto, ok){
  modal(`<p style="margin:0">${esc(texto)}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-act="cerrar">Cancelar</button><button class="btn pri" id="cf-ok">Sí, borrar</button></div>`);
  $("#cf-ok").onclick=()=>{ cerrar(); ok(); };
}
function abrirNovedades(){
  const v=D.version;
  modal(`<div class="row" style="justify-content:space-between;align-items:baseline"><h2>Versión de las reglas</h2><button class="btn sm" data-act="cerrar">Cerrar</button></div>
    <p style="margin:0">${esc(v.reglamento)}<br><span class="sub">Datos actualizados el ${esc(v.datos)}</span></p>
    <ul class="msgs">${v.cambios.slice().reverse().map(c=>`<li class="ok"><b>${esc(c.fecha)}</b> · ${esc(c.texto)}</li>`).join("")}</ul>`);
}

/* ---------- Guardado ---------- */
const pendientes={}, escribiendo={}, sucios={};
function cambio(){ const l=L(); if(!l) return; l.ts=Date.now(); ocultarPop(); render(); guardar(l.id); }
function guardar(id){
  if(persist==="local"){ guardarLocal(); return; }
  if(!persist) return;
  sucios[id]=true;
  clearTimeout(pendientes[id]);
  pendientes[id]=setTimeout(async()=>{
    delete pendientes[id];
    if(escribiendo[id]) return guardar(id);
    const l=S.listas[id]; if(!l) return;
    escribiendo[id]=true; sucios[id]=false;
    try{ await db.collection("data/users/"+uid).doc(id).set(JSON.parse(JSON.stringify(l))); }catch(e){ console.warn(e); sucios[id]=true; }
    escribiendo[id]=false;
    if(sucios[id]&&!pendientes[id]) guardar(id);
  },700);
}
function setActual(id){ S.actual=id; try{ localStorage.setItem("tcb-actual",id); }catch(_){} render(); }

/* ---------- Bocadillo de palabras clave ---------- */
const pop=$("#pop"); let popFor=null;
function ocultarPop(){ pop.hidden=true; if(popFor) popFor.setAttribute("aria-expanded","false"); popFor=null; }
function mostrarPop(el){
  const i=kwInfo(el.dataset.kw); if(!i) return;
  if(popFor===el){ ocultarPop(); return; }
  ocultarPop(); popFor=el; el.setAttribute("aria-expanded","true");
  pop.innerHTML=`<b>${esc(i[0])}</b>${esc(i[1])}`; pop.hidden=false;
  const r=el.getBoundingClientRect(), w=Math.min(340, window.innerWidth-24);
  let left=r.left+window.scrollX; if(left+w>window.scrollX+window.innerWidth-12) left=window.scrollX+window.innerWidth-12-w; left=Math.max(12,left);
  pop.style.width=w+"px"; pop.style.left=left+"px"; pop.style.top=(r.bottom+window.scrollY+8)+"px";
  pop.style.setProperty("--ax", Math.max(10,Math.min(w-20, r.left+window.scrollX-left+r.width/2-5))+"px");
}

/* ---------- Eventos ---------- */
const findM=id=>L().modelos.find(m=>m.uid===id);
document.addEventListener("click", e=>{
  const k=e.target.closest("[data-kw]"); if(k){ mostrarPop(k); return; }
  if(!e.target.closest("#pop")) ocultarPop();
  const t=e.target.closest("[data-act]");
  if(!t){ if(e.target.dataset&&e.target.dataset.ov) cerrar(); return; }
  const a=t.dataset.act, l=L();
  if(a==="cerrar") return cerrar();
  if(a==="nueva") return abrirNueva();
  if(a==="crear") return crear($("#nf").value);
  if(a==="novedades") return abrirNovedades();
  if(a==="duplicar"&&l){ const n=JSON.parse(JSON.stringify(l)); n.id="l"+Date.now().toString(36); n.nombre=l.nombre+" (copia)"; n.ts=Date.now(); S.listas[n.id]=n; setActual(n.id); guardar(n.id); return; }
  if(a==="borrar"&&l){ confirmar(`¿Borrar «${l.nombre}»? No se puede deshacer.`, async()=>{ const id=l.id; delete S.listas[id];
      S.actual=Object.keys(S.listas)[0]||null; render(); if(persist==="local") guardarLocal(); else if(persist){ try{ await db.collection("data/users/"+uid).doc(id).delete(); }catch(_){} } }); return; }
  if(a==="exportar") return abrirExport();
  if(a==="copiar"){ const tx_=$("#ex-txt"); navigator.clipboard.writeText(tx_.value).then(()=>{$("#ex-msg").textContent="Copiado.";}).catch(()=>{ tx_.select(); $("#ex-msg").textContent="Selecciona el texto y cópialo a mano."; }); return; }
  if(!l) return;
  if(a==="reclutar"){ l.modelos.push(nuevoModelo(l,t.dataset.u)); return cambio(); }
  if(a==="del-m"){ l.modelos=l.modelos.filter(m=>m.uid!==t.dataset.m); return cambio(); }
  if(a==="dup-m"){ const m=findM(t.dataset.m), u=unidad(l,m), c=JSON.parse(JSON.stringify(m)); c.uid=nid(); c.nombre=""; delete c.ft;
    (u.opciones||[]).forEach(o=>{ const v=c.opc[o.id]; if(!v) return; if(o.tipo==="check"&&o.maxBanda) delete c.opc[o.id];
      if(o.tipo==="select"){ const op=o.opciones.find(x=>x.id===v.v); if(op&&op.maxBanda) delete c.opc[o.id]; } });
    l.modelos.splice(l.modelos.indexOf(m)+1,0,c); return cambio(); }
  if(a==="quitar-eq"){ findM(t.dataset.m).eq.splice(+t.dataset.i,1); return cambio(); }
});
document.addEventListener("change", e=>{
  const t=e.target, l=L(), d=t.dataset;
  if(t.id==="sel-lista") return setActual(t.value);
  if(!l) return;
  if(t.id==="l-nombre"){ l.nombre=t.value.trim()||"Banda sin nombre"; return cambio(); }
  if(t.id==="l-pres"){ l.presupuesto=Math.max(0,+t.value||0); return cambio(); }
  if(t.id==="l-glo"){ l.gloria=Math.max(0,+t.value||0); return cambio(); }
  if(d.addeq&&t.value){ const m=findM(d.addeq); m.eq.push(t.value); cambio(); const s=document.getElementById("add-"+m.uid); if(s) s.focus(); return; }
  if(d.nombre!==undefined){ findM(d.nombre).nombre=t.value.trim(); return cambio(); }
  if(d.perfil){ findM(d.perfil).perfil=t.value; return cambio(); }
  if(d.ft!==undefined){ const m=findM(d.ft); if(t.value) m.ft=+t.value; else delete m.ft; return cambio(); }
  if(d.opc){ const m=findM(d.opc); m.opc=m.opc||{}; if(t.checked) m.opc[d.o]=true; else delete m.opc[d.o]; return cambio(); }
  if(d.opcsel){ const m=findM(d.opcsel); m.opc=m.opc||{}; if(t.value) m.opc[d.o]={v:t.value, e:""}; else delete m.opc[d.o]; return cambio(); }
  if(d.opcel){ const m=findM(d.opcel); m.opc[d.o].e=t.value; return cambio(); }
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ cerrar(); ocultarPop(); } });
window.addEventListener("resize", ocultarPop);

/* ---------- Arranque ---------- */
function ejemplo(){
  const l=nuevaLista("black-grail"); l.nombre="Ejemplo: Corte de la Mosca";
  const add=(u,eq,opc,perfil)=>{ const m=nuevoModelo(l,u); if(eq) m.eq=eq; if(opc) m.opc=opc; if(perfil) m.perfil=perfil; l.modelos.push(m); };
  add("lord-of-tumours",["beelzebubs-axe","standard-armour","grail-devotee"]);
  add("plague-knight",["infested-rifle","bayonet","reinforced-armour"],{"plague-knight-rank":{v:"knight-companion-of-the-fly",e:"dis"}});
  add("corpse-guard",["putrid-shotgun","trench-club","standard-armour"]);
  add("herald-of-beelzebub",["infested-rifle"]);
  add("grail-thrall"); add("grail-thrall",null,null,"fly-thrall");
  add("hound-of-the-black-grail",null,{"infested-carcasses":true});
  return l;
}
(async()=>{
  let prefer=null; try{ prefer=localStorage.getItem("tcb-actual"); }catch(_){}
  render();
  try{ await cargarDatos(); }catch(e){ S.error=e.message; render(); return; }
  const timer=setTimeout(()=>{ if(!S.cargado){ S.cargado=true; if(!Object.keys(S.listas).length){ const l=ejemplo(); S.listas[l.id]=l; S.actual=l.id; } render(); } },10000);
  try{ if(typeof claude!=="undefined"){ db=await claude.use("db"); const user=await claude.use("user"); uid=user? await user.id():null; } }catch(_){ db=null; }
  if(!db||!uid){ // fuera de Claude (p. ej. GitHub Pages): guardado en el navegador
    clearTimeout(timer); S.cargado=true;
    const loc=leerLocal();
    if(loc){ persist="local"; Object.values(loc).forEach(x=>{ migrar(x); if(D.fac[x.faccion]) S.listas[x.id]=x; }); }
    if(!Object.keys(S.listas).length){ const l=ejemplo(); S.listas[l.id]=l; if(persist==="local") guardarLocal(); }
    S.actual=(prefer&&S.listas[prefer])?prefer:Object.keys(S.listas).sort((a,b)=>(S.listas[b].ts||0)-(S.listas[a].ts||0))[0];
    render(); return; }
  persist=true; let primera=true;
  db.collection("data/users/"+uid).onSnapshot(snap=>{
    snap.docs.forEach(d=>{ if(pendientes[d.id]||escribiendo[d.id]||sucios[d.id]) return; const x={...JSON.parse(JSON.stringify(d.data())),id:d.id}; // la base de datos entrega objetos congelados: copia editable
      const antes=x.faccion; migrar(x); if(!D.fac[x.faccion]) return; S.listas[d.id]=x; if(antes!==x.faccion) guardar(d.id); });
    if(!snap.metadata.fromCache&&primera){ primera=false; clearTimeout(timer); S.cargado=true;
      if(!Object.keys(S.listas).length){ const l=ejemplo(); S.listas[l.id]=l; guardar(l.id); }
      S.actual=(prefer&&S.listas[prefer])?prefer:Object.keys(S.listas).sort((a,b)=>(S.listas[b].ts||0)-(S.listas[a].ts||0))[0];
      render(); }
  }, ()=>{ persist=false; clearTimeout(timer); S.cargado=true; if(!Object.keys(S.listas).length){ const l=ejemplo(); S.listas[l.id]=l; S.actual=l.id; } render(); });
})();
