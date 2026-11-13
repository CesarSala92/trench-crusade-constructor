"use strict";
/* =====================================================================
   MOTOR DEL CONSTRUCTOR DE BANDAS
   No contiene reglas de ninguna facción: todo sale de /datos/*.json.
   Las variantes se describen como cambios sobre su facción base.
   Reglas que no caben en datos (excepciones del libro) están en ESPECIALES.
   ===================================================================== */

const D = { version:null, comun:null, es:null, merc:null, fac:{}, obj:{}, orden:[] };
const $=(s,el=document)=>el.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nid=()=>Math.random().toString(36).slice(2,9);
const menos=n=> n<0? "−"+Math.abs(n) : String(n);
const clon=x=>JSON.parse(JSON.stringify(x));

/* ---------- Carga de datos ---------- */
async function cargarJSON(ruta){ const r=await fetch(ruta,{cache:"no-cache"}); if(!r.ok) throw new Error(ruta+": "+r.status); return r.json(); }
function prepararFaccion(f){
  (f.objetosPropios||[]).forEach(o=>D.obj[o.id]=o);
  f.arm={}; f.armeria.forEach(e=>f.arm[e.obj]=e);
  f.U={}; f.unidades.forEach(u=>f.U[u.id]=u);
  D.merc.unidades.filter(u=> u.contratable==="cualquiera" || ((u.contratable||{}).alineacion||[]).includes(f.alineacion) || ((u.contratable||{}).facciones||[]).includes(f.base||f.id))
    .forEach(u=>f.U[u.id]=u);
  D.fac[f.id]=f;
}
function aplicarVariante(base, v){
  const f=clon(base);
  Object.assign(f,{id:v.id, en:v.en, base:base.id, variante:true, reglasVariante:v.reglas||[]});
  if(v.presupuesto!=null) f.presupuesto=v.presupuesto;
  if(v.gloria!=null) f.gloria=v.gloria;
  if(v.equiposDeFuego) f.equiposDeFuego=v.equiposDeFuego;
  f.especiales=[...(base.especiales||[]), ...(v.especiales||[])];
  f.objetosPropios=[...(base.objetosPropios||[]), ...(v.objetosPropios||[])];
  const a=v.armeria||{};
  (a.menos||[]).forEach(id=>{ f.armeria=f.armeria.filter(e=>e.obj!==id); });
  Object.entries(a.cambios||{}).forEach(([id,c])=>{ const e=f.armeria.find(x=>x.obj===id); if(!e) return;
    const {quitarSolo,...resto}=c; Object.assign(e,resto); if(quitarSolo) delete e.solo; });
  (a.mas||[]).forEach(e=>f.armeria.push(clon(e)));
  const aplicarU=(u,c)=>{
    if(c.max!==undefined) u.max=c.max;
    if(c.d!==undefined) u.d=c.d;
    if(c.kit) u.kit=clon(c.kit);
    if(c.alias) u.alias=c.alias;
    const perfiles=u.perfiles? Object.values(u.perfiles) : [];
    const listas=[u,...perfiles];
    listas.forEach(p=>{ if(p.kw||p===u){ p.kw=(p.kw||[]).filter(k=>!(c.kwMenos||[]).includes(k)); (c.kwMas||[]).forEach(k=>{ if(!p.kw.includes(k)) p.kw.push(k); }); } });
    perfiles.forEach(p=>{ if(!p.kw) return; });
    if(c.stats) [u.perfil,...perfiles.map(p=>p.perfil)].filter(Boolean).forEach(p=>Object.assign(p,c.stats));
    listas.forEach(p=>{ if(!p.habilidades&&p!==u) return; p.habilidades=(p.habilidades||[]).filter(h=>!(c.habMenos||[]).includes(h)); (c.habMas||[]).forEach(h=>{ if(!p.habilidades.includes(h)) p.habilidades.push(h); }); });
    u.opciones=(u.opciones||[]).filter(o=>!(c.opcMenos||[]).includes(o.id)); (c.opcMas||[]).forEach(o=>u.opciones.push(clon(o)));
    (c.perfilesMenos||[]).forEach(k=>{ if(u.perfiles) delete u.perfiles[k]; });
  };
  Object.entries(v.unidades||{}).forEach(([id,c])=>{
    if(c.quitar){ f.unidades=f.unidades.filter(u=>u.id!==id); return; }
    const u=f.unidades.find(x=>x.id===id); if(u) aplicarU(u,c);
  });
  (v.unidadesNuevas||[]).forEach(n=>{ const src=f.unidades.find(x=>x.id===n.copiaDe); if(!src) return;
    const u=clon(src); u.id=n.id; u.en=n.en; if(n.max!==undefined) u.max=n.max; u.copiaDe=n.copiaDe; aplicarU(u,n); f.unidades.push(u); });
  if(v.opcionesTodas) f.unidades.forEach(u=>{ if((v.opcionesTodas.excepto||[]).includes(u.id)) return; u.opciones=u.opciones||[]; v.opcionesTodas.opciones.forEach(o=>u.opciones.push(clon(o))); });
  if(v.restricciones) f.restricciones=clon(v.restricciones);
  f.restricciones=[...(f.restricciones||[]), ...clon(v.restriccionesMas||[])];
  f.reglasEquipo=clon(v.reglasEquipo||[]);
  return f;
}
async function cargarDatos(){
  const [version, comun, es, merc] = await Promise.all(["datos/version.json","datos/comun.json","datos/es.json","datos/mercenarios.json"].map(cargarJSON));
  Object.assign(D,{version,comun,es,merc});
  comun.objetos.forEach(o=>D.obj[o.id]=o);
  (merc.objetosPropios||[]).forEach(o=>D.obj[o.id]=o);
  const bases = await Promise.all(version.facciones.map(id=>cargarJSON(`datos/faccion/${id}.json`)));
  const vars = await Promise.all((version.variantes||[]).map(id=>cargarJSON(`datos/variante/${id}.json`)));
  bases.forEach(b=>{ const crudo=clon(b); prepararFaccion(b); D.orden.push(b.id);
    vars.filter(v=>v.base===b.id).forEach(v=>{ const f=aplicarVariante(crudo,v); prepararFaccion(f); D.orden.push(f.id); }); });
}

/* ---------- Textos ---------- */
const tx = {
  obj: id => (D.es.objetos[id]||{}).n || (D.obj[id]||{}).en || id,
  unidad: (u,perfil) => { const E=D.es.unidades, ids=[u.alias,u.id,u.copiaDe].filter(Boolean);
    for(const id of ids){ if(perfil&&E[id+"/"+perfil]) return E[id+"/"+perfil].n; if(E[id]&&(!perfil||!u.perfiles)) return E[id].n; }
    for(const id of ids) if(E[id]) return E[id].n;
    return perfil&&u.perfiles&&u.perfiles[perfil]?u.perfiles[perfil].en:u.en; },
  fac: id => (D.es.facciones[id]||{}).n || (D.fac[id]||{}).en || id,
  hab: id => D.es.habilidades[id] || [id,""],
  opc: id => D.es.opciones[id] || {n:id},
  regla: id => (D.es.reglasObjeto||{})[id] || "",
  ui: (g,k) => ((D.es.interfaz||{})[g]||{})[k] || k
};
// Palabras clave: se guardan en inglés ("+1 INJURY DICE", "BLAST 3\"", "NEGATE GAS", "AMMUNITION (CRITICAL)") y se traducen al mostrar
function kwParse(tok){
  tok=String(tok).trim(); let m;
  if((m=tok.match(/^([+-]\d+) (DICE|INJURY DICE|INJURY MODIFIER)$/))) return {base:m[2], num:+m[1]};
  if(tok==="IGNORE ARMOUR") return {base:tok};
  if((m=tok.match(/^(.+?) \((.+)\)$/))) return {base:m[1], paren:m[2]};
  if((m=tok.match(/^(NEGATE|IGNORE) (.+)$/))) return {base:m[1], sub:m[2]};
  if((m=tok.match(/^(.+?) (\d+"?)$/)) && D.es.palabrasClave[m[1]]) return {base:m[1], param:m[2]};
  return {base:tok};
}
const kwNombre=k=> (D.es.palabrasClave[k]||{}).n || (D.es.palabrasClave[k.replace(/-/g," ")]||{}).n || k;
function kwLabel(tok){
  const p=kwParse(tok), e=D.es.palabrasClave[p.base]||{};
  if(p.num!=null) return `${p.num>0?"+":""}${menos(p.num)} ${Math.abs(p.num)>1&&e.pl?e.pl:(e.n||p.base)}`;
  if(p.paren) return `${e.n||p.base} (${kwLabel(p.paren)})`;
  if(p.sub) return `${e.n||p.base} ${kwNombre(p.sub)}`;
  return (e.n||p.base)+(p.param?" "+p.param:"");
}
function kwInfo(tok){
  const p=kwParse(tok), e=D.es.palabrasClave[p.base]; if(!e||!e.d) return null;
  let d=e.d;
  if(p.base==="NEGATE"){ const s=D.es.palabrasClave[p.sub]; if(s&&s.d) d+=` ${s.t||s.n}: ${s.d}`; }
  if(p.paren){ const s=D.es.palabrasClave[kwParse(p.paren).base]; if(s&&s.d) d+=` ${s.t||s.n}: ${s.d}`; }
  return [p.sub||p.param||p.paren||p.num!=null? kwLabel(tok) : (e.t||e.n), d];
}
function kwChips(lista){
  return (lista||[]).map(k=>{ const i=kwInfo(k), l=kwLabel(k);
    return i?`<button type="button" class="kwb" data-kw="${esc(k)}" aria-expanded="false">${esc(l)}</button>`:`<span class="kwb" style="cursor:default">${esc(l)}</span>`; }).join("");
}
const dados = n => n==null? "—" : `${n>=0?"+":""}${menos(n)} ${Math.abs(n)===1?"DADO":"DADOS"}`;

/* ---------- Reglas excepcionales (las que no caben en datos) ---------- */
const ESPECIALES = {
  // Grial Negro: hasta 2 devotos por modelo, máx. 2 modelos con devotos; el 2.º devoto cuesta 2 de gloria
  "grail-devotee": {
    coste(l,m,idx){ const pos=m.eq.slice(0,idx+1).filter(x=>x==="grail-devotee").length; return pos>=2?{d:0,g:2}:null; },
    motivo(m, l){ const n=m.eq.filter(x=>x==="grail-devotee").length; if(n>=2) return "máx. 2 por modelo";
      if(n===0 && l.modelos.filter(x=>x.eq.includes("grail-devotee")).length>=2) return "ya hay 2 modelos con devotos"; return null; },
    banda(l){ return l.modelos.filter(m=>m.eq.includes("grail-devotee")).length>2 ? "Solo 2 modelos pueden llevar Devotos del Grial." : null; },
    sinDuplicados:false, saltaLimite:true
  },
  // Amalgama: 6 brazos; 2 armas PESADAS de dos manos cuentan como una; resto de dos manos, doble; máx. 2 iguales
  "six-arms": {
    validar(items){ const E=[]; let heavy=0, slots=0;
      const w=items.filter(i=>i.o.cat==="ranged"||i.o.cat==="melee");
      w.forEach(i=>{ if(i.o.manos===2){ if(tieneKw(i.o,"HEAVY") && heavy<2){ heavy++; slots+=1; } else slots+=2; } else slots+=1; });
      const sh=items.filter(i=>i.o.cat==="shield"); slots+=sh.length;
      if(slots>6) E.push(`Lleva ${slots} brazos ocupados de 6 (dos armas PESADAS de dos manos cuentan como una; el resto de dos manos cuentan doble).`);
      const rep={}; w.forEach(i=>rep[i.o.id]=(rep[i.o.id]||0)+1);
      Object.entries(rep).forEach(([k,v])=>{ if(v>2) E.push(`No puede llevar más de 2 ${tx.obj(k)}.`); });
      if(sh.length>1) E.push("Solo puede llevar 1 escudo.");
      return {E, chip:`${slots}/6 brazos`, mal:slots>6};
    }, sustituyeManos:true
  },
  // Guardián de las Escrituras: dos armas cuerpo a cuerpo de una mano o una de dos manos
  "mandatory-melee": {
    validar(items){ const mel=items.filter(i=>i.o.cat==="melee"&&!i.fijo);
      const ok=(mel.length===1&&mel[0].o.manos===2)||(mel.length===2&&mel.every(i=>i.o.manos===1));
      return {E: ok?[]:["Debe llevar exactamente dos armas cuerpo a cuerpo de una mano o una de dos manos."]}; }
  },
  // Estados Pontificios: el primer Crucifijo del Sumo Pontífice es gratis
  "gratis-primero": {
    coste(l,m,idx,id){ const p=primeraCompra(l,id); return p&&p[0]===m.uid&&p[1]===idx? {d:0,g:0} : null; }
  },
  // Nueva Antioquía: 2 Topos de trinchera; un 3.º si el resto de la banda vale 1.000 ducados o más
  "trench-mole": {
    maxBanda(l){ const resto=l.modelos.filter(m=>!(m.opc||{})["trench-mole"]).reduce((a,m)=>a+costeModelo(l,m).d,0); return resto>=1000?3:2; }
  }
};
// Reglas de coste de la banda entera (variantes)
const ESPECIALES_BANDA = {
  // Reino de Alba: la primera compra de cada arma cuerpo a cuerpo cuesta la mitad (redondeo hacia arriba)
  "cold-steel": (l,m,idx,id,c)=>{ const o=D.obj[id]; if(!o||o.cat!=="melee"||!c.d) return c; const p=primeraCompra(l,id); return p&&p[0]===m.uid&&p[1]===idx? {...c, d:Math.ceil(c.d/2), nota:"Acero frío: mitad de precio"} : c; }
};
function primeraCompra(l,id){ for(const m of l.modelos){ const i=m.eq.indexOf(id); if(i>=0) return [m.uid,i]; } return null; }
const tieneKw=(o,k)=>(o.kw||[]).some(x=>x===k||x.startsWith(k+" "));

/* ---------- Modelos ---------- */
function fac(l){ return D.fac[l.faccion]; }
function unidad(l,m){ return fac(l).U[m.u]; }
function perfilDe(u,m){ return u.perfiles? (u.perfiles[m.perfil]||Object.values(u.perfiles)[0]) : u; }
function opcionesActivas(u,m){ return (u.opciones||[]).filter(o=>o.tipo==="check"&&(m.opc||{})[o.id]); }
function kwModelo(u,m){
  const p=perfilDe(u,m); const kw=[...(p.kw||u.kw||[])];
  opcionesActivas(u,m).forEach(o=>((o.efecto||{}).kw||[]).forEach(k=>{ if(!kw.includes(k)) kw.push(k); }));
  if(m.ft) kw.push("FIRETEAM");
  return kw;
}
function nombreTipo(u,m){ const o=opcionesActivas(u,m).find(o=>o.efecto&&o.efecto.nombre); return tx.unidad(u, o? o.efecto.nombre : (u.perfiles?m.perfil:null)); }
function esElite(l,m){ return kwModelo(unidad(l,m),m).includes("ELITE"); }
function entrada(l,objId){ return fac(l).arm[objId]; }
function costeBaseUnidad(u,m){ const p=u.perfiles? perfilDe(u,m) : null; return {d:(p&&p.d!=null?p.d:u.d)||0, g:u.g||0}; }

function objetosDeOpciones(l,m){
  const u=unidad(l,m), out=[];
  (u.opciones||[]).forEach(o=>{ const v=(m.opc||{})[o.id]; if(o.tipo==="select"&&v&&v.v){ const op=o.opciones.find(x=>x.id===v.v);
      if(op&&op.eleccion&&op.eleccion.tipo==="objeto"&&v.e){ const lista=fac(l).listas[op.eleccion.lista]; const en=lista.opciones.find(x=>x.obj===v.e);
        if(en) out.push({o:D.obj[en.obj], ent:en, opcion:op.id}); } } });
  return out;
}
function itemsDe(l,m){
  const u=unidad(l,m), p=perfilDe(u,m);
  return [
    ...((p&&p.fijo)||u.fijo||[]).map(id=>({o:D.obj[id], fijo:true})),
    ...objetosDeOpciones(l,m).map(x=>({...x, deOpcion:true})),
    ...m.eq.map((id,i)=>({o:D.obj[id], ent:entrada(l,id), idx:i}))
  ].filter(x=>x.o);
}
function costeItem(l,m,id,idx){
  const o=D.obj[id], e=entrada(l,id)||{}, u=unidad(l,m);
  let c={d:e.d||0, g:e.g||0};
  if(u.precios&&u.precios[id]!=null&&m.eq.indexOf(id)===idx) c={d:u.precios[id], g:0, nota:"precio especial de la unidad"};
  const esp=(o.especial&&ESPECIALES[o.especial]) || (e.especial&&ESPECIALES[e.especial]);
  if(esp&&esp.coste){ const r=esp.coste(l,m,idx,id); if(r) c=r; }
  (fac(l).especiales||[]).forEach(k=>{ if(ESPECIALES_BANDA[k]) c=ESPECIALES_BANDA[k](l,m,idx,id,c); });
  return c;
}
function costeModelo(l,m){
  const u=unidad(l,m); const b=costeBaseUnidad(u,m); let d=b.d, g=b.g;
  m.eq.forEach((id,i)=>{ const c=costeItem(l,m,id,i); d+=c.d; g+=c.g; });
  (u.opciones||[]).forEach(o=>{ const v=(m.opc||{})[o.id]; if(!v) return;
    if(o.tipo==="check"){ d+=o.d||0; g+=o.g||0; }
    else if(o.tipo==="select"&&v.v){ const op=o.opciones.find(x=>x.id===v.v); if(op){ d+=op.d||0; g+=op.g||0; } } });
  objetosDeOpciones(l,m).forEach(x=>{ d+=x.ent.d||0; g+=x.ent.g||0; });
  return {d,g};
}
function statsModelo(l,m){
  const u=unidad(l,m), p=perfilDe(u,m).perfil||u.perfil;
  const st={...p};
  (u.opciones||[]).forEach(o=>{ const v=(m.opc||{})[o.id]; if(o.tipo==="select"&&v&&v.v){ const op=o.opciones.find(x=>x.id===v.v);
    if(op&&op.eleccion&&op.eleccion.tipo==="stat"){ const k=v.e||op.eleccion.valores[0]; if(st[k]!=null) st[k]+=op.eleccion.suma; } } });
  let arm=st.arm; const det=[];
  m.eq.map(id=>D.obj[id]).filter(Boolean).forEach(o=>{
    if(!u.armaduraIncluida&&(o.cat==="armour"||o.cat==="shield")){ const k=(o.kw||[]).find(x=>/INJURY MODIFIER$/.test(x)); if(k){ const n=parseInt(k,10); arm+=n; det.push(`${o.cat==="armour"?"armadura":"escudo"} ${menos(n)}`); } }
    if(u.armaduraIncluida&&o.cat==="shield"){ const k=(o.kw||[]).find(x=>/INJURY MODIFIER$/.test(x)); if(k){ const n=parseInt(k,10); arm+=n; det.push(`escudo ${menos(n)}`); } }
    Object.entries(o.statMas||{}).forEach(([k,v])=>{ if(st[k]!=null) st[k]+=v; });
    if(o.base && parseInt(o.base)>parseInt(st.base)) st.base=o.base;
  });
  return {...st, arm, armDet:det};
}

/* ---------- Condiciones "solo para…" ---------- */
// ELITE (palabra clave), unit:<id>, obj:<id> (lleva ese objeto), opc:<id> (tiene esa mejora)
function cumple(l,m,cond){
  const u=unidad(l,m);
  if(cond.startsWith("unit:")) return cond.slice(5)===u.id || u.copiaDe===cond.slice(5);
  if(cond.startsWith("obj:")) return itemsDe(l,m).some(i=>i.o.id===cond.slice(4));
  if(cond.startsWith("opc:")) return !!(m.opc||{})[cond.slice(4)];
  return kwModelo(u,m).includes(cond);
}
function textoCond(l,c){
  if(c.startsWith("unit:")){ const u=fac(l).U[c.slice(5)]; return u? tx.unidad(u) : c.slice(5); }
  if(c.startsWith("obj:")) return "quien lleve "+tx.obj(c.slice(4));
  if(c.startsWith("opc:")) return "quien tenga "+tx.opc(c.slice(4)).n;
  return kwLabel(c);
}
function prohibidasPorOpcion(l,m){ const u=unidad(l,m), out=[]; opcionesActivas(u,m).forEach(o=>out.push(...((o.efecto||{}).prohibeCategorias||[]))); return out; }
// Reglas de equipo de la variante que afectan a un modelo
function erroresReglasEquipo(l,m,items){
  const E=[], u=unidad(l,m), base=u.copiaDe||u.id;
  (fac(l).reglasEquipo||[]).forEach(r=>{
    const compra=items.filter(i=>!i.fijo);
    if(r.tipo==="solo-unidades" && !r.unidades.includes(base)) compra.filter(i=>r.objs.includes(i.o.id)).forEach(i=>E.push(`${tx.obj(i.o.id)}: solo ${r.unidades.map(x=>tx.unidad(fac(l).U[x]||{id:x,en:x})).join(" y ")} en esta variante.`));
    if(r.tipo==="prohibido" && r.unidades.includes(base)) compra.filter(i=>r.objs.includes(i.o.id)).forEach(i=>E.push(`${tx.unidad(u)} no puede llevar ${tx.obj(i.o.id)} en esta variante.`));
    if(r.tipo==="kw-solo-unidades" && !r.unidades.includes(base)) compra.filter(i=>r.cats.includes(i.o.cat)&&tieneKw(i.o,r.kw)&&!(r.excepto||[]).includes(i.o.id)).forEach(i=>E.push(`${tx.obj(i.o.id)}: en esta variante solo ${r.unidades.map(x=>tx.unidad(fac(l).U[x]||{id:x,en:x})).join(" y ")} puede llevar armas ${kwLabel(r.kw)}.`));
  });
  return E;
}

/* ---------- Validación de un modelo ---------- */
function validarModelo(l,m){
  const u=unidad(l,m), E=[], W=[], items=itemsDe(l,m);
  const esp = u.kit&&u.kit.especial? ESPECIALES[u.kit.especial] : null;
  let extra=null;
  if(esp&&esp.validar){ const r=esp.validar(items); E.push(...r.E); extra=r; }
  (u.kit&&u.kit.requiere||[]).forEach(cat=>{ if(!items.some(i=>i.o.cat===cat)) E.push(`Debe llevar ${tx.ui("tipos",cat).toLowerCase()}.`); });
  prohibidasPorOpcion(l,m).forEach(cat=>{ items.filter(i=>i.o.cat===cat).forEach(i=>E.push(`Con ${opcionesActivas(u,m).filter(o=>((o.efecto||{}).prohibeCategorias||[]).includes(cat)).map(o=>tx.opc(o.id).n).join(", ")} no puede llevar ${tx.obj(i.o.id)}.`)); });
  (u.opciones||[]).forEach(o=>{ if(o.tipo==="check"&&(m.opc||{})[o.id]&&o.requiere&&!o.requiere.some(c=>cumple(l,m,c))) E.push(`${tx.opc(o.id).n} requiere ${o.requiere.map(c=>textoCond(l,c)).join(" o ")}.`); });
  E.push(...erroresReglasEquipo(l,m,items));
  items.filter(i=>!i.fijo&&!i.deOpcion).forEach(i=>{ const e=i.ent;
    if(!e) E.push(`${tx.obj(i.o.id)} no está en la armería de esta facción.`);
    else if(e.solo&&!e.solo.some(c=>cumple(l,m,c))) E.push(`${tx.obj(i.o.id)}: solo ${e.solo.map(c=>textoCond(l,c)).join(" o ")}.`);
    if(u.kit&&(u.kit.excluyeCategorias||[]).includes(i.o.cat)) E.push(`No puede comprar ${tx.ui("tipos",i.o.cat).toLowerCase()}: ya lleva la suya fija.`);
    const k=u.kit||{};
    if(k.nada) E.push(`${tx.unidad(u)} no puede llevar equipo (${tx.obj(i.o.id)}).`);
    else if((k.soloCategorias||k.soloObjetos)&&!((k.soloCategorias||[]).includes(i.o.cat)||(k.soloObjetos||[]).includes(i.o.id))) E.push(`${tx.obj(i.o.id)}: esta unidad no lo puede llevar.`); });
  items.forEach(i=>(i.o.incompatibles||[]).forEach(x=>{ if(items.some(j=>j.o.id===x)) E.push(`${tx.obj(i.o.id)} no se puede llevar con ${tx.obj(x)}.`); }));
  if(esp&&esp.sustituyeManos) return {E,W,extra};
  const fuerte = kwModelo(u,m).includes("STRONG");
  const est = i => (i.ent&&i.ent.estip)||[];
  const r=items.filter(i=>i.o.cat==="ranged"), c=items.filter(i=>i.o.cat==="melee");
  const r2=r.filter(i=>i.o.manos===2).length, r1=r.filter(i=>i.o.manos===1).length;
  let c2=c.filter(i=>i.o.manos===2).length, c1=c.filter(i=>i.o.manos===1).length;
  const conv = fuerte ? c.find(i=>i.o.manos===2 && !tieneKw(i.o,"CUMBERSOME")) : null;
  if(conv){ c2--; c1++; }
  if(r2>1||(r2===1&&r1>0)||r1>2) E.push("Armas a distancia: una de dos manos o hasta dos de una mano.");
  if(c2>1||(c2===1&&c1>0)||c1>2) E.push("Armas cuerpo a cuerpo: una de dos manos o hasta dos de una mano"+(fuerte?" (por ser FUERTE, una de dos manos que no sea ENGORROSA cuenta como de una).":"."));
  if(items.filter(i=>i.o.cat==="grenade").length>1) E.push("Solo un tipo de granada.");
  if(items.filter(i=>i.o.cat==="armour").length>1) E.push("Solo una armadura.");
  const sh=items.filter(i=>i.o.cat==="shield");
  if(sh.length>1) E.push("Solo un escudo.");
  if(sh.length===1){
    if(r1>1||c1>1) E.push("Con escudo solo puede llevar un arma de una mano de cada tipo.");
    [...r.filter(i=>i.o.manos===2), ...c.filter(i=>i.o.manos===2&&i!==conv)].forEach(i=>{
      if(!(est(i).includes("SHIELD_COMBO")&&est(sh[0]).includes("SHIELD_COMBO"))) E.push(`${tx.obj(i.o.id)} y ${tx.obj(sh[0].o.id)} no tienen Combinación con escudo: no se pueden llevar juntos.`); });
  }
  if(items.filter(i=>i.o.cabeza||est(i).includes("HEADGEAR")).length>1) E.push("Solo una pieza para la cabeza.");
  const vistos=new Set();
  items.filter(i=>i.o.cat==="equipment").forEach(i=>{ const es=i.o.especial&&ESPECIALES[i.o.especial]; if(es&&es.sinDuplicados===false) return;
    if(vistos.has(i.o.id)) E.push(`No puede repetir ${tx.obj(i.o.id)}.`); vistos.add(i.o.id); });
  if(!fuerte && items.filter(i=>tieneKw(i.o,"HEAVY")).length>1) E.push("No puede llevar más de una pieza PESADA (solo los modelos FUERTES pueden).");
  if(items.some(i=>i.o.requiereEnganche) && !r.some(i=>est(i).includes("BAYONET_LUG"))) E.push("La bayoneta necesita un arma a distancia con enganche de bayoneta.");
  if(items.some(i=>tieneKw(i.o,"HELD"))){
    if(r.some(i=>i.o.manos===2)||c.some(i=>i.o.manos===2&&i!==conv)) E.push("Con un objeto EMPUÑADO no puede usar armas de dos manos.");
    if(sh.length&&(r.length||c.length)) E.push("Con un objeto EMPUÑADO no puede llevar a la vez arma y escudo.");
  }
  (u.opciones||[]).forEach(o=>{ const v=(m.opc||{})[o.id]; if(o.tipo==="select"&&v&&v.v){ const op=o.opciones.find(x=>x.id===v.v);
    if(op&&op.eleccion&&op.eleccion.tipo==="objeto"&&!v.e) W.push(`Elige el arma de ${tx.opc(op.id).n}.`); } });
  return {E,W,extra};
}
function usadosEnBanda(l,objId){
  const e=entrada(l,objId)||{};
  return l.modelos.reduce((a,x)=>{ if((e.limExcluye||[]).some(c=>cumple(l,x,c))) return a; return a+x.eq.filter(y=>y===objId).length; },0);
}
// ¿Por qué no se puede añadir este objeto? (null = se puede)
function motivo(l,m,objId){
  const u=unidad(l,m), o=D.obj[objId], e=entrada(l,objId), kit=u.kit||{};
  if(kit.nada) return "no puede llevar equipo";
  if(kit.soloCategorias||kit.soloObjetos){ if(!((kit.soloCategorias||[]).includes(o.cat)||(kit.soloObjetos||[]).includes(objId))) return "no la puede llevar esta unidad"; }
  if((kit.excluyeCategorias||[]).includes(o.cat)) return "ya lleva su "+tx.ui("tipos",o.cat).toLowerCase()+" fija";
  if(prohibidasPorOpcion(l,m).includes(o.cat)) return "no permitido por sus mejoras";
  if(e.solo && !e.solo.some(c=>cumple(l,m,c))) return "solo "+e.solo.map(c=>textoCond(l,c)).join(" o ");
  const esp=(o.especial&&ESPECIALES[o.especial])||(e.especial&&ESPECIALES[e.especial]);
  if(esp&&esp.motivo){ const r=esp.motivo(m,l); if(r) return r; }
  if(e.lim&&!(esp&&esp.saltaLimite)&&!(e.limExcluye||[]).some(c=>cumple(l,m,c))){ if(usadosEnBanda(l,objId)>=e.lim) return `límite ${e.lim} alcanzado`; }
  if(o.cat==="equipment"&&!(esp&&esp.sinDuplicados===false)&&m.eq.includes(objId)) return "ya lo lleva";
  const prueba={...m,eq:[...m.eq,objId]};
  const r1=erroresReglasEquipo(l,prueba,itemsDe(l,prueba)); if(r1.length>erroresReglasEquipo(l,m,itemsDe(l,m)).length) return r1[r1.length-1].replace(/\.$/,"").toLowerCase();
  const rb=errBandaEquipo(l,prueba); if(rb) return rb;
  const antes=validarModelo(l,m).E.length, d=validarModelo(l,prueba).E;
  if(d.length>antes) return d[d.length-1].replace(/\.$/,"").toLowerCase();
  return null;
}
// Reglas de equipo de la variante que cuentan en toda la banda (simulando el cambio de un modelo)
function errBandaEquipo(l,mPrueba){
  const mods=l.modelos.map(x=>x.uid===mPrueba.uid?mPrueba:x);
  for(const r of (fac(l).reglasEquipo||[])){
    if(r.tipo==="max-modelos"){ const n=mods.filter(x=>x.eq.some(id=>r.objs.includes(id))).length; if(n>r.max) return `máximo ${r.max} modelos con ${r.objs.map(tx.obj).join(" o ")}`; }
    if(r.tipo==="max-kw"){ const n=mods.reduce((a,x)=>a+x.eq.filter(id=>{ const o=D.obj[id]; return o&&r.cats.includes(o.cat)&&tieneKw(o,r.kw)&&!(r.excepto||[]).includes(id); }).length,0);
      if(n>r.max) return `máximo ${r.max} armas ${kwLabel(r.kw)} en la banda`; }
  }
  return null;
}

/* ---------- Validación de la banda ---------- */
function contar(l,uid){ return l.modelos.filter(m=>m.u===uid).length; }
function maxUnidad(l,u){
  let max=u.max==null?Infinity:u.max;
  (fac(l).restricciones||[]).forEach(r=>{ if(r.tipo!=="una-de"||!r.casos.some(c=>c[u.id])) return;
    let mejor=-1; r.casos.forEach(c=>{ const cabe=Object.entries(c).every(([k,[mn,mx]])=>k===u.id||contar(l,k)<=mx); if(cabe&&c[u.id]) mejor=Math.max(mejor,c[u.id][1]); });
    if(mejor>=0) max=Math.min(max,mejor); });
  return max;
}
function maxOpcion(l,o){ return o.especial&&ESPECIALES[o.especial]&&ESPECIALES[o.especial].maxBanda? ESPECIALES[o.especial].maxBanda(l) : o.maxBanda; }
function totales(l){ let d=0,g=0; l.modelos.forEach(m=>{ const c=costeModelo(l,m); d+=c.d; g+=c.g; }); return {d,g}; }
function validarBanda(l){
  const f=fac(l), E=[], W=[];
  (f.restricciones||[]).forEach(r=>{
    if(r.tipo==="una-de"){ const ok=r.casos.some(c=>Object.entries(c).every(([k,[mn,mx]])=>{ const n=contar(l,k); return n>=mn&&n<=mx; }));
      if(!ok){ const desc=r.casos.map(c=>Object.entries(c).filter(([k,[mn,mx]])=>mx>0).map(([k,[mn,mx]])=>`${mn===mx?mn:mn+"-"+mx} ${tx.unidad(f.U[k]||{id:k,en:k})}`).join(" y ")).join(", o bien ");
        E.push(`Composición obligatoria: ${desc}.`); } }
    if(r.tipo==="requiere-objeto"){ const n=l.modelos.reduce((a,m)=>a+m.eq.filter(x=>x===r.obj).length,0); if(n<r.min) E.push(`Un modelo debe llevar ${tx.obj(r.obj)}.`); }
  });
  Object.values(f.U).forEach(u=>{ if(u.max!=null&&contar(l,u.id)>u.max) E.push(`Máximo ${u.max} ${tx.unidad(u)}.`); });
  const tot={}; l.modelos.forEach(m=>m.eq.forEach(id=>tot[id]=1));
  Object.keys(tot).forEach(id=>{ const e=f.arm[id], o=D.obj[id]; const esp=o&&o.especial&&ESPECIALES[o.especial];
    const n=usadosEnBanda(l,id);
    if(e&&e.lim&&!(esp&&esp.saltaLimite)&&n>e.lim) E.push(`${tx.obj(id)}: límite ${e.lim} en la banda (llevas ${n}).`); });
  Object.values(ESPECIALES).forEach(s=>{ if(s.banda){ const r=s.banda(l); if(r) E.push(r); } });
  const r0=l.modelos.length? errBandaEquipo(l,l.modelos[0]) : null; if(r0) E.push(r0.charAt(0).toUpperCase()+r0.slice(1)+".");
  const vistos=new Set();
  Object.values(f.U).forEach(u=>(u.opciones||[]).forEach(o=>{
    const lim=(op,id)=>{ const mx=maxOpcion(l,op); if(!mx||vistos.has(id)) return; vistos.add(id);
      const n=l.modelos.filter(m=>{ const v=(m.opc||{})[o.id]; return o.tipo==="check"? !!v : v&&v.v===id; }).length; if(n>mx) E.push(`Solo ${mx} con ${tx.opc(id).n} (llevas ${n}).`); };
    if(o.tipo==="check") lim(o,o.id); else o.opciones.forEach(op=>lim(op,op.id)); }));
  if(f.equiposDeFuego){ const eq={}; l.modelos.forEach(m=>{ if(m.ft) eq[m.ft]=(eq[m.ft]||0)+1; });
    Object.entries(eq).forEach(([k,n])=>{ if(+k>f.equiposDeFuego.max) E.push(`Solo puedes tener ${f.equiposDeFuego.max} equipos de fuego.`); else if(n!==f.equiposDeFuego.miembros) E.push(`El equipo de fuego ${k} tiene ${n} modelo${n>1?"s":""}: debe tener exactamente ${f.equiposDeFuego.miembros}.`); }); }
  const t=totales(l);
  if(t.d>l.presupuesto) E.push(`Te pasas ${t.d-l.presupuesto} ducados del presupuesto.`);
  if(t.g>l.gloria) E.push(`Gastas ${t.g}☼ y solo tienes ${l.gloria}☼ de Gloria.`);
  const mal=l.modelos.filter(m=>validarModelo(l,m).E.length).length;
  if(mal) E.push(`${mal} modelo${mal>1?"s tienen":" tiene"} el equipo mal (revisa los avisos en rojo).`);
  if(!l.modelos.length) W.push("La banda está vacía: recluta modelos en el panel de la derecha.");
  return {E,W};
}

/* ---------- Bandas antiguas (primera versión del constructor) ---------- */
const MIGRA = {
  u:{senor:"lord-of-tumours",caballero:"plague-knight",guardia:"corpse-guard",siervo:"grail-thrall",sabueso:"hound-of-the-black-grail",heraldo:"herald-of-beelzebub",amalgama:"amalgam",devorapecados:"sin-eater",guardian:"scripture-guardian"},
  o:{trabuco:"blunderbuss",cerrojo:"bolt-action-rifle",eructador:"corruption-belcher",infestado:"infested-rifle",ametralladora:"machine-gun",mosquete:"musket",pistola:"pistol",putrida:"putrid-shotgun",escopeta:"shotgun",visceras:"viscera-cannon",bayoneta:"bayonet",hachabelcebu:"beelzebubs-axe",granmartillo:"great-hammer",mandoble:"great-sword",hojaplaga:"plague-blade",asta:"polearm",espada:"sword-axe",porra:"trench-club",cuchillo:"trench-knife",gas:"gas-grenades",parasitas:"parasite-grenades",escudogrial:"black-grail-shield",escudotrinchera:"trench-shield",reforzada:"reinforced-armour",estandar:"standard-armour",casco:"combat-helmet",ojoscompuestos:"compound-eyes-helmet",devoto:"grail-devotee",santuario:"field-shrine",instrumento:"musical-instrument",estandarte:"troop-flag",baratija:"unholy-trinket"},
  rango:{limosnero:"plague-almoner",companero:"knight-companion-of-the-fly",cruz:"knight-of-the-rotten-cross"},
  cruz:{"x-autopistola":"automatic-pistol","x-autofusil":"automatic-rifle","x-autoescopeta":"automatic-shotgun","x-lanzallamas":"flamethrower","x-lanzagranadas":"grenade-launcher","x-lanzallamaspesado":"heavy-flamethrower","x-escopetapesada":"heavy-shotgun","x-ametralladora":"machine-gun","x-semiauto":"semi-automatic-rifle","x-francotirador":"sniper-rifle","x-subfusil":"submachine-gun","x-silenciada":"silenced-pistol","x-hellblade":"hellblade"}
};
function migrar(l){
  if(l.faccion!=="grial") return l;
  l.faccion="black-grail";
  l.modelos=l.modelos.map(m=>{ const n={uid:m.uid,u:MIGRA.u[m.u]||m.u,nombre:m.nombre||"",eq:(m.eq||[]).map(x=>MIGRA.o[x]||x),opc:{}};
    if(m.u==="siervo") n.perfil=m.perfil==="mosca"?"fly-thrall":"grail-thrall";
    if(m.rango) n.opc["plague-knight-rank"]={v:MIGRA.rango[m.rango], e: m.rango==="companero"?(m.rangoCar==="dis"?"dis":"cac") : (MIGRA.cruz[m.rangoArma]||"")};
    if(m.infestado) n.opc["infested-carcasses"]=true;
    if(m.zumbido) n.opc["maddening-buzzing"]=true;
    return n; });
  l._migrada=true; return l;
}
