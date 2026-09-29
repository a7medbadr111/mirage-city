(() => {
  const canvas = document.getElementById("city");
  const ctx = canvas.getContext("2d");
  const speechLayer = document.getElementById("speech");
  const PLACES = {
    park: { x: 70, y: 280, w: 160, h: 220, label: "الحديقة" },
    square: { x: 280, y: 210, w: 280, h: 200, label: "الميدان" },
    cafe: { x: 600, y: 80, w: 140, h: 110, label: "الكافيه" },
    hall: { x: 430, y: 40, w: 140, h: 100, label: "البلدية" },
    market: { x: 760, y: 220, w: 150, h: 130, label: "السوق" },
    workshop: { x: 760, y: 380, w: 150, h: 110, label: "الورشة" },
    arcade: { x: 280, y: 450, w: 180, h: 110, label: "الأركيد" },
    stop: { x: 70, y: 80, w: 120, h: 80, label: "المحطة" }
  };
  const JOBS = {
    "عامل كافيه": { place: "cafe", wage: 18 },
    "كاتب بلدية": { place: "hall", wage: 22 },
    "بائع سوق": { place: "market", wage: 16 },
    "عامل ورشة": { place: "workshop", wage: 20 },
    "عاطل": { place: "park", wage: 0 }
  };
  const MOODS = ["مبتهج", "راضي", "مركز", "قلق", "متحمس", "متضايق", "حنون", "ساخر"];
  const NAMES = [
    { id: "nova", name: "نوفا", color: "#7ee0c8", traits: ["حامية", "منظمة"], secret: "بتكتب رسائل محدش بيبعتها", goal: "تبقى عمدة", belief: "الحسابات تمسك المدينة" },
    { id: "milo", name: "ميلو", color: "#ffb86b", traits: ["اجتماعي", "متهور"], secret: "خسر فلوس في الأركيد", goal: "يلاقي شغل", belief: "الضحك بيفتح الأبواب" },
    { id: "mira", name: "ميرا", color: "#ff7aa2", traits: ["دقيقة", "حنونة"], secret: "بتحب نوفا", goal: "بلدية عادلة", belief: "القانون محتاج رحمة" },
    { id: "kai", name: "كاي", color: "#9ecbff", traits: ["صانع", "صامت"], secret: "بيصلح الورشة سرًا", goal: "ورشة خاصة", belief: "الشغل أصدق من الكلام" },
    { id: "lina", name: "لينا", color: "#c3a6ff", traits: ["تاجرة", "حادة"], secret: "بتسلّف بفايدة", goal: "أغنى واحد", belief: "الثقة غالية" },
    { id: "niko", name: "نيكو", color: "#b8f27a", traits: ["رومانسي", "فوضوي"], secret: "الهدايا بديل الكلام", goal: "حد يصدقه", belief: "لو اديت هتتحب" },
    { id: "aya", name: "آيا", color: "#ff8b6b", traits: ["فضولية", "خفيفة"], secret: "بتكتب الجريدة السرية", goal: "تفضح إشاعة", belief: "المدينة قصص" },
    { id: "theo", name: "ثيو", color: "#e6d27a", traits: ["حساس", "غيور"], secret: "بيحسب المجاملات", goal: "احترام الورشة", belief: "الاحترام بيتاخد" },
    { id: "rhea", name: "ريا", color: "#6be0ff", traits: ["منافسة", "وفية"], secret: "خايفة من الوحدة", goal: "حلقة أصحاب", belief: "الدفاع حب" },
    { id: "zed", name: "زيد", color: "#d0d6e4", traits: ["متأمل", "منعزل"], secret: "عرض شغل بره المدينة", goal: "يقرر يفضل أو يمشي", belief: "الهدوء مش ضعف" }
  ];
  const feed = []; const paper = []; const board = [{ from: "الميدان", text: "الموسم بدأ." }];
  let visitorVotes = {}, selected = "nova", speed = 1, paused = false, tickAcc = 0, minute = 8*60, day = 1, phase = "مجتمع", seasonMin = 0;
  function placePos(key){ const p=PLACES[key]; return { x:p.x+20+Math.random()*(p.w-40), y:p.y+20+Math.random()*(p.h-40) }; }
  const citizens = NAMES.map((n,i)=>{
    const jobs=Object.keys(JOBS);
    const job=i%3===2?"عاطل":jobs[i%(jobs.length-1)];
    const loc=JOBS[job].place; const pos=placePos(loc); const rel={};
    NAMES.forEach(o=>{ if(o.id!==n.id) rel[o.id]=Math.floor(Math.random()*30)-5; });
    return {...n, job, money:20+Math.floor(Math.random()*80), energy:60+Math.floor(Math.random()*30), mood:MOODS[i%MOODS.length], loc, x:pos.x, y:pos.y, tx:pos.x, ty:pos.y, rel, mem:[`وصلت: ${n.goal}`], lastAct:{}, speech:"", speechT:0, acting:"واقف"};
  });
  const byId=id=>citizens.find(c=>c.id===id);
  const others=c=>citizens.filter(o=>o.id!==c.id);
  function closestRel(c,pred){ return others(c).map(o=>({o,v:c.rel[o.id]})).filter(pred).sort((a,b)=>b.v-a.v)[0]; }
  function remember(c,t){ c.mem.unshift(t); if(c.mem.length>12) c.mem.pop(); }
  function log(t){ feed.unshift(t); if(feed.length>40) feed.pop(); document.getElementById("ticker").textContent=t; }
  function say(c,t){ c.speech=t; c.speechT=8; }
  function shiftRel(a,b,n,why){ a.rel[b.id]=Math.max(-100,Math.min(100,a.rel[b.id]+n)); if(Math.abs(n)>=4) remember(a, why+" ("+b.name+")"); }
  function cooled(c,act,hours=6){ return seasonMin-(c.lastAct[act]||-999)>=hours*60; }
  function mark(c,act){ c.lastAct[act]=seasonMin; }
  function walkTo(c,loc){ c.loc=loc; const p=placePos(loc); c.tx=p.x; c.ty=p.y; }
  const ACTIONS=[
    {id:"work", can:c=>c.job!=="عاطل"&&c.energy>15, run(c){ c.loc=JOBS[c.job].place; walkTo(c,c.loc); const pay=JOBS[c.job].wage; c.money+=pay; c.energy-=12; c.acting="بيشتغل"; say(c,"الشغل ماشي."); if(Math.random()<0.3) log(c.name+" خلّصت وردية ("+pay+")"); }},
    {id:"seek", can:c=>c.job==="عاطل"&&cooled(c,"seek",10), run(c){ walkTo(c,"hall"); mark(c,"seek"); if(Math.random()<0.45){ c.job="بائع سوق"; c.mood="متحمس"; remember(c,"اتعينت"); log(c.name+" لاقت شغل"); say(c,"أخيرًا شغل."); } else { c.mood="قلق"; say(c,"مش دلوقتي."); } c.acting="بيدوّر على شغل"; }},
    {id:"eat", can:c=>c.energy<55&&c.money>=8, run(c){ walkTo(c,"cafe"); c.money-=8; c.energy+=25; c.acting="بياكل"; say(c,"قهوة."); }},
    {id:"talk", can:()=>true, run(c){ const t=others(c)[Math.floor(Math.random()*9)]; walkTo(c,t.loc); c.acting="بتكلم "+t.name; shiftRel(c,t,3,"كلام"); shiftRel(t,c,2,"كلام"); say(c,"الميدان غريب النهارده."); if(Math.random()<0.35) log(c.name+" و"+t.name+" بيتكلموا"); }},
    {id:"gift", can:c=>c.money>=6&&cooled(c,"gift",8)&&(c.traits.includes("رومانسي")||Math.random()<0.35), run(c){ const crush=closestRel(c,()=>true); if(!crush) return; const t=crush.o; walkTo(c,t.loc); c.money-=6; t.money+=2; mark(c,"gift"); const liked=t.rel[c.id]>10||t.traits.includes("حنونة"); shiftRel(t,c,liked?6:-2, liked?"هدية":"ضغط"); log(c.name+" قدّم هدية لـ "+t.name); say(c, liked?"خدي دي.":"مش لازم."); c.acting="هدية"; }},
    {id:"loan", can:c=>c.money>=25&&cooled(c,"loan",16)&&(c.traits.includes("تاجرة")||c.traits.includes("حنونة")), run(c){ const poor=others(c).sort((a,b)=>a.money-b.money)[0]; if(poor.money>40) return; walkTo(c,poor.loc); mark(c,"loan"); c.money-=10; poor.money+=10; poor.rel[c.id]+=8; remember(poor,c.name+" سلفني"); log(c.name+" سلفت "+poor.name); say(c,"هترجعهم."); c.acting="سلف"; }},
    {id:"rumor", can:c=>cooled(c,"rumor",12)&&(c.traits.includes("فضولية")||Math.random()<0.2), run(c){ const a=others(c)[Math.floor(Math.random()*9)]; const b=others(a)[0]; mark(c,"rumor"); walkTo(c,"square"); const text=a.name+" بتقرّب من "+b.name; remember(c,"إشاعة: "+text); paper.unshift({day,headline:"همس",body:text}); log(c.name+" نشرت إشاعة"); say(c,"سمعت..."); c.acting="تهمس"; }},
    {id:"defend", can:c=>cooled(c,"defend",9)&&(c.traits.includes("حامية")||c.traits.includes("وفية")), run(c){ const friend=closestRel(c,x=>x.v>8); const foe=closestRel(c,x=>x.v<5); if(!friend||!foe||friend.o.id===foe.o.id) return; mark(c,"defend"); walkTo(c,friend.o.loc); shiftRel(friend.o,c,7,"دفاع"); shiftRel(foe.o,c,-6,"ضد"); log(c.name+" دافعت عن "+friend.o.name); say(c,"سيبها في حالها."); c.acting="تدافع"; }},
    {id:"sorry", can:c=>{ const e=closestRel(c,x=>x.v<-8); return e&&cooled(c,"sorry",14); }, run(c){ const enemy=closestRel(c,x=>x.v<-8).o; mark(c,"sorry"); walkTo(c,enemy.loc); shiftRel(c,enemy,8,"اعتذار"); shiftRel(enemy,c,6,"اعتذار"); log(c.name+" اعتذر لـ "+enemy.name); say(c,"آسفة."); c.acting="تعتذر"; }},
    {id:"arcade", can:c=>c.energy>20&&c.money>=4&&cooled(c,"arcade",7), run(c){ mark(c,"arcade"); walkTo(c,"arcade"); c.money-=4; c.energy-=8; if(Math.random()<0.5){ c.money+=12; c.mood="متحمس"; log(c.name+" كسبت في الأركيد"); say(c,"الجولة دي ليا."); } else { c.mood="متضايق"; say(c,"الأزرار ظلمتني."); } c.acting="أركيد"; }},
    {id:"park", can:c=>c.energy<40||c.traits.includes("متأمل"), run(c){ walkTo(c,"park"); c.energy+=10; c.mood="راضي"; c.acting="حديقة"; say(c,"الهوا هنا أصله."); }},
    {id:"camp", can:c=>phase!=="مجتمع"&&cooled(c,"camp",8)&&(c.traits.includes("منظمة")||c.money>70), run(c){ mark(c,"camp"); walkTo(c,"hall"); paper.unshift({day,headline:"خطاب "+c.name, body:c.name+": المدينة محتاجة حد يسمع."); log(c.name+" نزلت الحملة"); say(c,"صوّتوا."); c.acting="حملة"; }}
  ];
  function chooseAction(c){ const bag=ACTIONS.filter(a=>a.can(c)); if(!bag.length) return ACTIONS[ACTIONS.length-1]; if(c.energy<30){ return bag.find(a=>a.id==="eat")||bag.find(a=>a.id==="park")||bag[0]; } if(c.job!=="عاطل"&&Math.random()<0.4){ return bag.find(a=>a.id==="work")||bag[0]; } return bag[Math.floor(Math.random()*bag.length)]; }
  const hour=()=>Math.floor((minute%(24*60))/60); const mins=()=>minute%60;
  function updatePhase(){ phase = day<5?"مجتمع":day<8?"حملة":"سلطة"; }
  function stepWorld(){ minute+=12; seasonMin+=12; if(minute>=24*60){ minute=0; day+=1; citizens.forEach(c=>{ c.energy=Math.min(100,c.energy+20); if(c.job!=="عاطل") c.money+=4; else c.money=Math.max(0,c.money-3); }); const richest=[...citizens].sort((a,b)=>b.money-a.money)[0]; paper.unshift({day,headline:"صباح اليوم "+day, body:richest.name+" أغنى الميدان ($"+richest.money+")"}); if(paper.length>16) paper.pop(); } updatePhase(); const shuffled=[...citizens].sort(()=>Math.random()-0.5).slice(0,2+Math.floor(Math.random()*3)); shuffled.forEach(c=>{ if(c.speechT>0) c.speechT-=1; chooseAction(c).run(c); }); citizens.forEach(c=>{ c.x+=(c.tx-c.x)*0.18; c.y+=(c.ty-c.y)*0.18; }); renderUI(); }
  function drawMap(){ const w=canvas.width,h=canvas.height; ctx.fillStyle="#1c2434"; ctx.fillRect(0,0,w,h); ctx.fillStyle="#2a4a32"; ctx.fillRect(30,200,210,330); ctx.fillStyle="#3a4154"; ctx.fillRect(240,0,90,h); ctx.fillRect(0,160,w,70); ctx.fillRect(680,0,70,h); ctx.fillStyle="#6aa7c9"; ctx.beginPath(); ctx.arc(420,310,36,0,Math.PI*2); ctx.fill(); const colors={cafe:"#6b3f2a",hall:"#3d4a6b",market:"#8a5a2a",workshop:"#4a3b32",arcade:"#3a2158",stop:"#2f3648"}; Object.entries(PLACES).forEach(([k,p])=>{ if(colors[k]){ ctx.fillStyle=colors[k]; ctx.fillRect(p.x,p.y,p.w,p.h); } ctx.fillStyle="#e8edf5"; ctx.font="12px IBM Plex Sans Arabic"; ctx.fillText(p.label,p.x+8,p.y+16); }); ctx.fillStyle="#e87cff"; ctx.font="bold 16px sans-serif"; ctx.fillText("ARCADE", PLACES.arcade.x+40, PLACES.arcade.y+70); citizens.forEach(c=>{ ctx.fillStyle=c.color; ctx.fillRect(c.x-7,c.y-16,14,14); ctx.fillStyle="#1a120c"; ctx.fillRect(c.x-5,c.y-2,10,10); ctx.fillStyle="#f0f3fa"; ctx.font="11px IBM Plex Sans Arabic"; ctx.fillText(c.name,c.x-12,c.y-20); if(c.id===selected){ ctx.strokeStyle="#7ee0c8"; ctx.strokeRect(c.x-10,c.y-20,20,28); } }); }
  function renderSpeech(){ speechLayer.innerHTML=citizens.filter(c=>c.speechT>0&&c.speech).map(c=>{ const r=canvas.getBoundingClientRect(); const sx=(c.x/canvas.width)*r.width; const sy=(c.y/canvas.height)*r.height; return `<div class="bubble" style="left:${sx}px;top:${sy}px">${c.speech}</div>`; }).join(""); }
  function renderCitizens(){ const box=document.getElementById("tab-citizens"); box.innerHTML=citizens.map(c=>`<div class="citizen ${c.id===selected?"sel":""}" data-id="${c.id}"><div class="dot" style="background:${c.color}"></div><div><strong>${c.name}</strong><div class="meta">${c.acting} · ${PLACES[c.loc].label}</div><div class="meta">${c.mood} · ${c.job} · $${c.money}</div></div></div>`).join(""); box.querySelectorAll(".citizen").forEach(el=>{ el.onclick=()=>{ selected=el.dataset.id; renderUI(); }; }); }
  function renderProfile(){ const c=byId(selected); const bonds=others(c).map(o=>({o,v:c.rel[o.id]})).sort((a,b)=>b.v-a.v); document.getElementById("tab-profile").innerHTML=`<h3>${c.name}</h3><div class="tiny">${c.traits.join(" · ")}</div><div class="kv"><span>المزاج</span><span>${c.mood}</span></div><div class="kv"><span>الشغل</span><span>${c.job}</span></div><div class="kv"><span>الفلوس</span><span>$${c.money}</span></div><div class="kv"><span>الطاقة</span><span>${Math.round(c.energy)}</span></div><p><strong>بتصدق:</strong> ${c.belief}</p><p><strong>الهدف:</strong> ${c.goal}</p><p><strong>السر:</strong> ${c.secret}</p><h3>العلاقات</h3>${bonds.map(({o,v})=>`<div class="rel ${v>=0?"pos":"neg"}"><span>${o.name}</span><span>${v}</span></div>`).join("")}<h3>الذاكرة</h3>${c.mem.map(m=>`<div class="mem">${m}</div>`).join("")}`; }
  function renderBonds(){ let html="<h3>خريطة العلاقات</h3>"; citizens.forEach(c=>{ const top=others(c).sort((a,b)=>c.rel[b.id]-c.rel[a.id]); html+=`<div class="mem"><strong>${c.name}</strong> أقرب لـ ${top[0].name} · أبعد عن ${top[top.length-1].name}</div>`; }); document.getElementById("tab-bonds").innerHTML=html; }
  function renderDaily(){ document.getElementById("tab-daily").innerHTML=`<h3>الجريدة</h3>${paper.slice(0,8).map(p=>`<div class="mem"><strong>يوم ${p.day} — ${p.headline}</strong><div>${p.body}</div></div>`).join("")||"<p class='tiny'>لسه الفجر.</p>"}<h3>الشريط</h3>${feed.slice(0,12).map(f=>`<div class="mem">${f}</div>`).join("")}`; }
  function renderBoard(){ const cands=[...citizens].sort((a,b)=>Object.values(b.rel).reduce((s,v)=>s+v,0)-Object.values(a.rel).reduce((s,v)=>s+v,0)).slice(0,3); document.getElementById("tab-board").innerHTML=`<h3>لوحة الحائط</h3>${board.map(b=>`<div class="mem"><strong>${b.from}</strong> — ${b.text}</div>`).join("")}<h3>ملاحظة</h3><textarea id="note" maxlength="140"></textarea><div class="row"><button class="act" id="postNote">علّق</button><button class="act" id="postRumor">همس</button></div><h3>استفتاء ${phase==="مجتمع"?"(في الحملة)":""}</h3>${cands.map(c=>`<div class="kv"><span>${c.name}</span><span><button class="act vote" data-id="${c.id}" ${phase==="مجتمع"?"disabled":""}>صوّت</button> ${visitorVotes[c.id]||0}</span></div>`).join("")}`; document.getElementById("postNote").onclick=()=>{ const text=document.getElementById("note").value.trim(); if(!text) return; board.unshift({from:"زائر",text}); log("ملاحظة جديدة"); renderBoard(); }; document.getElementById("postRumor").onclick=()=>{ const text=document.getElementById("note").value.trim(); if(!text) return; board.unshift({from:"همس زائر",text}); remember(citizens[Math.floor(Math.random()*10)], "الزائر: "+text); log("همسة من زائر"); renderBoard(); }; document.querySelectorAll(".vote").forEach(b=>{ b.onclick=()=>{ if(phase==="مجتمع") return; visitorVotes[b.dataset.id]=(visitorVotes[b.dataset.id]||0)+1; remember(byId(b.dataset.id),"الزائر صوّت لي"); renderBoard(); }; }); }
  function renderUI(){ document.getElementById("dayLabel").textContent="اليوم "+day; document.getElementById("timeLabel").textContent=String(hour()).padStart(2,"0")+":"+String(mins()).padStart(2,"0"); document.getElementById("phaseBadge").textContent=phase; document.getElementById("speedBtn").textContent="×"+speed; renderCitizens(); renderProfile(); renderBonds(); renderDaily(); if(document.querySelector('[data-tab="board"]').classList.contains("on") || !document.getElementById("tab-board").dataset.ready){ renderBoard(); document.getElementById("tab-board").dataset.ready="1"; } }
  canvas.addEventListener("click",e=>{ const r=canvas.getBoundingClientRect(); const x=((e.clientX-r.left)/r.width)*canvas.width; const y=((e.clientY-r.top)/r.height)*canvas.height; let best=null,d0=28; citizens.forEach(c=>{ const d=Math.hypot(c.x-x,c.y-y); if(d<d0){ d0=d; best=c.id; } }); if(best){ selected=best; document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on", b.dataset.tab==="profile")); document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("on", t.id==="tab-profile")); renderUI(); } });
  document.querySelectorAll(".tabs button").forEach(b=>{ b.onclick=()=>{ document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("on")); b.classList.add("on"); document.querySelectorAll(".tab").forEach(t=>t.classList.remove("on")); document.getElementById("tab-"+b.dataset.tab).classList.add("on"); if(b.dataset.tab==="board") renderBoard(); }; });
  document.getElementById("speedBtn").onclick=()=>{ speed=speed===1?3:speed===3?8:1; renderUI(); };
  document.getElementById("pauseBtn").onclick=()=>{ paused=!paused; document.getElementById("pauseBtn").textContent=paused?"تشغيل":"إيقاف"; };
  function loop(){ drawMap(); renderSpeech(); if(!paused){ tickAcc++; const every=speed===1?50:speed===3?18:7; if(tickAcc%every===0) stepWorld(); } requestAnimationFrame(loop); }
  log("ميراج سيتي فتح أبوابه."); renderUI(); requestAnimationFrame(loop);
})();
