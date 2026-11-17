const $ = s => document.querySelector(s);
const initial = () => ({materials:[],transcripts:[],breakdowns:[],ideas:[]});
let state = initial();
function cleanState(v) { const s=initial(); for(const k of Object.keys(s)) s[k]=Array.isArray(v?.[k])?v[k]:[]; return s; }
function esc(v="") { const d=document.createElement("div"); d.textContent=String(v); return d.innerHTML; }
function id() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()); }
function status(s) { $("#saved-state").textContent=s; }
async function boot() {
  try { state=cleanState(JSON.parse(localStorage.getItem("creative-loop-v2")||localStorage.getItem("creative-loop-v1"))); } catch { state=initial(); }
  try { const brief=JSON.parse(localStorage.getItem("creative-loop-brief-v1")||"{}"); for (const [key, selector] of Object.entries({product:"#auto-product",market:"#auto-market",language:"#auto-language",facts:"#auto-facts",evidence:"#auto-evidence"})) if(brief[key]) $(selector).value=brief[key]; } catch {}
  $("#auto-key").value=sessionStorage.getItem("creative-loop-access")||"";
  status("仅浏览器保存 · 请导出");
  render();
}
async function save() {
  localStorage.setItem("creative-loop-v2",JSON.stringify(state));
  status("仅浏览器保存 · 请导出备份");
  render();
}
function show(view) {
  document.querySelectorAll(".view,.tool-page,[data-view]").forEach(x=>x.classList.remove("active"));
  if(view==="home") $("#home-view").classList.add("active");
  else { $("#workspace-view").classList.add("active"); $(`#${view}-page`).classList.add("active"); document.querySelectorAll(`[data-view="${view}"]`).forEach(x=>x.classList.add("active")); }
}
function options(selector,items,empty) { $(selector).innerHTML=items.length?items.map((x,i)=>`<option value="${esc(x.id)}">${i+1}. ${esc(x.title||x.source||x.hook||"未命名")}</option>`).join(""):`<option value="">${empty}</option>`; }
function card(meta,title,copy,tags=[],full=copy) {
  const a=document.createElement("article"); a.className="saved-item";
  const m=document.createElement("div"); m.className="item-meta"; m.textContent=meta;
  const h=document.createElement("h3"); h.textContent=title;
  const p=document.createElement("p"); p.textContent=copy;
  const t=document.createElement("div"); t.className="item-tags";
  tags.filter(Boolean).forEach(v=>{const x=document.createElement("span");x.textContent=v;t.append(x)});
  const b=document.createElement("button"); b.className="copy-button"; b.textContent="复制"; b.onclick=async()=>{await navigator.clipboard.writeText(full);b.textContent="已复制"};
  a.append(m,h,p,t,b); return a;
}
function list(selector,items,empty,fn) { const n=$(selector); n.innerHTML=""; n.className="item-list"; if(!items.length){n.classList.add("empty");n.textContent=empty;return} items.slice().reverse().forEach(x=>n.append(fn(x))); }
function render() {
  $("#collect-count").textContent=state.materials.length; $("#transcript-count").textContent=state.transcripts.length; $("#breakdown-count").textContent=state.breakdowns.length; $("#idea-count").textContent=state.ideas.length;
  options("#transcript-material",state.materials,"请先入库素材"); options("#breakdown-transcript",state.transcripts,"请先保存逐字稿"); options("#idea-breakdown",state.breakdowns,"可选：先完成拆解卡");
  list("#material-list",state.materials,"还没有素材。只入库你手动提供的链接和文件。",x=>card(`${x.format||"素材"} · ${x.locale||"市场待定"}`,x.source,x.highlight,[x.angle,...(x.tags||[])],`来源：${x.source}\n亮点：${x.highlight}\n方向：${x.angle}`));
  list("#transcript-list",state.transcripts,"逐字稿会在这里保留，供拆解时引用。",x=>card("RAW TRANSCRIPT",x.title,x.text,[x.note],x.text));
  list("#breakdown-list",state.breakdowns,"完成一次拆解后，会在这里形成可复用机制。",x=>card("TRANSFERABLE MECHANISM",x.hook,`问题：${x.problem}\n中段：${x.mechanism||"待补"}\n证据：${x.proof}`,[x.nontransfer?"含不可迁移项":"待测试"],`钩子：${x.hook}\n问题：${x.problem}\n中段：${x.mechanism||""}\n证据：${x.proof}\n行动：${x.cta||""}\n不可迁移：${x.nontransfer||""}`));
  list("#idea-list",state.ideas,"还没有脚本。填写产品事实与可拍证据，再生成待审草案。",x=>card(`${x.market||"MY"} / ${x.language||"EN"} / ${x.stage||"cold"} · 待验证`,x.title,x.script||x.variable||"旧版创意假设",[x.supply,x.variable,"需合规审核"],x.script||x.title));
}
const voice={
  EN:["In my daily routine: ","Here is the situation I wanted to make easier: ","What I can verify on this product is: ","See the real package / use moment: ","Why I would consider it: ","Check the product card for the current label, details and price."],
  MS:["Dalam rutin harian saya: ","Situasi yang saya hadapi: ","Fakta produk yang boleh saya semak ialah: ","Lihat pembungkusan / penggunaan sebenar: ","Sebab saya mempertimbangkannya: ","Semak kad produk untuk label, butiran dan harga terkini."],
  ZH:["我日常会遇到这个场景：","具体困扰是：","这款产品可以核对的事实是：","实拍包装或使用过程：","我考虑它的理由是：","请到商品卡核对标签、规格和实时价格。"]
};
function script(f,b) {
  const v=voice[f.language]||voice.EN;
  const signal=f.stage==="cold"?"同轮比较前三秒留存、平均观看、有效互动；不以单条播放量判胜。":f.stage==="convert"?"比较商品卡点击、商品页行为及成交转化；控制价格与投放条件。":"比较可归因成交成本/ROI、稳定性与边际效率。";
  const locale=f.market==="MY"?"马来西亚：补充剂短视频发布/投放前核对 MAB 广告批准、上架资质和本地政策。":"先核对目标市场的上架、广告与健康宣称要求。";
  const risky=/治愈|治疗|预防|恢复视力|改善近视|立刻|保证|cure|treat|prevent|restore vision|myopia|guarantee|instantly/i.test(f.fact);
  return `# ${f.product}｜${f.scene}\n\n状态：待验证 · 脚本工作稿（${f.language}）\n平台/市场：TikTok Shop / ${f.market}\n阶段：${f.stage} · 供给：${f.supply}\n\n## 分镜与口播（20–30 秒为测试假设）\n| 时间 | 画面 | 口播/字幕草案 |\n| --- | --- | --- |\n| 0–3s | 真实生活中的${f.scene}；先见人或动作 | ${v[0]}${f.scene} |\n| 3–8s | 继续日常动作，不夸张表演症状 | ${v[1]}${b?.problem||f.scene} |\n| 8–16s | 实拍产品与标签，不展示虚构效果 | ${v[2]}${f.fact} |\n| 16–23s | ${f.visual} | ${v[3]}${f.visual} |\n| 23–30s | 回到真实使用/收纳；商品卡可见 | ${v[4]}${f.whybuy} ${v[5]} |\n\n## 测试设置\n- 借鉴机制：${b?.hook?`${b.hook}（只借机制，不照搬原句）`:"原创生活场景开头"}\n- 本轮唯一主变量：${f.variable}\n- 不变量：${f.constants}\n- 验收信号：${signal}\n- KOC 须使用真实体验；品牌自制须拍真实产品。评论/搜索问题只能来自用户提供的素材。\n\n## 发布前关口\n- 事实依据：${f.evidence||"待审核"}。\n- ${locale}\n- ${risky?"检测到可能涉及功效/保证/即时性词句，必须人工审核并修改。":"仍需人工审核全部功效、价格、资质、达人体验和本地语感。"}\n- 如果输入不是所选语言，需母语者本地化后再拍摄。\n`;
}
document.querySelectorAll("[data-view]").forEach(x=>x.onclick=()=>show(x.dataset.view));
$("#collect-form").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));state.materials.push({id:id(),...f,tags:(f.tags||"").split(",").map(x=>x.trim()).filter(Boolean)});e.currentTarget.reset();save()};
$("#transcript-form").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));const m=state.materials.find(x=>x.id===$("#transcript-material").value);state.transcripts.push({id:id(),title:m?.source||"未关联素材",material:m?.id||"",text:f.transcript,note:f.note});e.currentTarget.reset();save()};
$("#auto-transcribe").onclick=async()=>{
  const m=state.materials.find(x=>x.id===$("#transcript-material").value);
  if(!m){$("#transcribe-status").textContent="请先选择一条素材。";return}
  $("#auto-form input[name=url]").value=m.source||"";
  show("home");$(".auto-workbench").scrollIntoView({behavior:"smooth"});
};
$("#breakdown-form").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));state.breakdowns.push({id:id(),transcript:$("#breakdown-transcript").value,...f});e.currentTarget.reset();save()};
$("#idea-form").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));const b=state.breakdowns.find(x=>x.id===$("#idea-breakdown").value);state.ideas.push({id:id(),title:`${f.product}｜${f.scene}｜${f.variable}`,...f,breakdown:b?.id||"",script:script(f,b),createdAt:new Date().toISOString()});e.currentTarget.reset();save()};
document.querySelectorAll("[data-clear]").forEach(x=>x.onclick=()=>{if(confirm("确认清空此类记录？会覆盖本地数据，请先导出备份。")){state[x.dataset.clear]=[];save()}});
$("#export-all").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`creative-loop-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
function currentBrief(){return {product:$("#auto-product").value.trim(),market:$("#auto-market").value.trim(),language:$("#auto-language").value,facts:$("#auto-facts").value.trim(),evidence:$("#auto-evidence").value.trim()}}
function rememberBrief(){localStorage.setItem("creative-loop-brief-v1",JSON.stringify(currentBrief()));sessionStorage.setItem("creative-loop-access",$("#auto-key").value)}
document.querySelectorAll("#product-settings input,#product-settings textarea,#product-settings select").forEach(x=>x.addEventListener("change",rememberBrief));
async function api(path,body,key){
  const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json","X-Workbench-Key":key},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"接口错误 "+r.status);return data;
}
$("#auto-form").onsubmit=async e=>{
  e.preventDefault();const url=new FormData(e.currentTarget).get("url")?.trim(),brief=currentBrief(),key=$("#auto-key").value;
  if(!brief.product||!brief.facts||!key){$("#product-settings").open=true;$("#auto-status").textContent="请先填写产品名称、可公开核对的产品事实和访问口令；之后每条视频只需粘贴链接。";return}
  rememberBrief();const button=$("#auto-run");button.disabled=true;$("#auto-output").hidden=true;
  try{
    $("#auto-status").textContent="正在提交你提供的视频链接…";
    const started=await api("/api/start",{url},key);if(!started.runId)throw Error("视频解析服务没有返回任务编号");
    let result;for(let attempt=0;attempt<72;attempt++){
      if(attempt)await new Promise(resolve=>setTimeout(resolve,5000));
      result=await api("/api/result",{runId:started.runId,brief},key);
      if(result.status==="done")break;
      $("#auto-status").textContent="正在获取视频口播与素材信息…（约 "+Math.round((attempt+1)*5/60)+" 分钟）";
    }
    if(result?.status!=="done")throw Error("处理超过 6 分钟；请到 Apify 控制台检查任务结果。");
    const m=result.material||{},b=result.breakdown||{};
    const materialId=id(),transcriptId=id(),breakdownId=id();
    state.materials.push({id:materialId,source:url,format:"TikTok 自动入库",locale:brief.market,highlight:m.caption||"已提取口播",angle:b.hook||"待验证",tags:["自动处理"]});
    state.transcripts.push({id:transcriptId,title:url,material:materialId,text:result.transcript,note:(m.transcriptSource||"字幕/ASR")+"；请核对原语种、错词和漏词。"});
    state.breakdowns.push({id:breakdownId,transcript:transcriptId,...b});
    state.ideas.push({id:id(),title:brief.product+"｜"+(b.hook||"自动生成"),market:brief.market,language:brief.language,stage:"cold",supply:"待选择",variable:"开头场景",script:result.script,breakdown:breakdownId,createdAt:new Date().toISOString()});
    await save();
    $("#auto-transcript").textContent=result.transcript;
    $("#auto-breakdown").textContent=["开头钩子："+(b.hook||"待核对"),"问题："+(b.problem||"待核对"),"中段机制："+(b.mechanism||"待核对"),"证据画面："+(b.proof||"待核对"),"行动："+(b.cta||"待核对"),"不可迁移："+(b.nontransfer||"待核对")].join("\n");
    $("#auto-script").textContent=result.script;
    $("#auto-output").hidden=false;
    $("#auto-status").textContent="已自动入库、拆解并生成待验证脚本。请核对逐字稿、产品事实和合规措辞。";
  }catch(err){$("#auto-status").textContent=err.message||"自动处理失败，请核对链接或服务配置。"}
  finally{button.disabled=false}
};
let selectedBriefFiles=[], briefCandidates=[];
function showBriefFiles(){
  $("#brief-file-list").textContent=selectedBriefFiles.length ? selectedBriefFiles.map(f=>f.name+"（"+(f.size/1024/1024).toFixed(1)+" MB）").join("、") : "支持 PDF、Word、Excel、CSV、文本和图片；最多 5 个文件，单个不超过 20 MB、总量不超过 50 MB。";
}
$("#brief-files").addEventListener("change",e=>{selectedBriefFiles=Array.from(e.target.files||[]);showBriefFiles()});
const drop=$("#brief-drop");
for(const eventName of ["dragenter","dragover"])drop.addEventListener(eventName,e=>{e.preventDefault();drop.classList.add("drag-over")});
for(const eventName of ["dragleave","drop"])drop.addEventListener(eventName,e=>{e.preventDefault();drop.classList.remove("drag-over")});
drop.addEventListener("drop",e=>{selectedBriefFiles=Array.from(e.dataTransfer?.files||[]);showBriefFiles()});
function renderBriefCandidates(){
  const list=$("#brief-candidate-list");list.replaceChildren();
  for(const [index,item] of briefCandidates.entries()){
    const label=document.createElement("label");label.className="brief-candidate";
    const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.value=String(index);
    const body=document.createElement("span");body.className="brief-candidate-body";
    const type=document.createElement("span");type.className="brief-candidate-type";type.textContent={fact:"候选事实",evidence:"可拍证据",restriction:"限制/风险"}[item.type]||"待核对";
    const statement=document.createElement("span");statement.className="brief-candidate-statement";statement.textContent=item.statement;
    const source=document.createElement("span");source.className="brief-candidate-source";source.textContent="来源："+item.source+" · "+item.status;
    const quote=document.createElement("span");quote.className="brief-candidate-quote";quote.textContent=(item.sourceKind==="image"?"图像识别文本：“":"提取原文：“")+item.quote+"”";
    body.append(type,statement,source,quote);label.append(checkbox,body);list.append(label);
  }
  $("#brief-candidates").hidden=!briefCandidates.length;
}
$("#brief-extract").onclick=async()=>{
  const key=$("#auto-key").value, button=$("#brief-extract");
  if(!key){$("#product-settings").open=true;$("#brief-import-status").textContent="请先填写访问口令。";return}
  if(!selectedBriefFiles.length||selectedBriefFiles.length>5){$("#brief-import-status").textContent="请选择 1–5 个文件。";return}
  if(selectedBriefFiles.some(f=>f.size>20*1024*1024)||selectedBriefFiles.reduce((n,f)=>n+f.size,0)>50*1024*1024){$("#brief-import-status").textContent="单文件不能超过 20 MB，总量不能超过 50 MB。";return}
  button.disabled=true;briefCandidates=[];renderBriefCandidates();rememberBrief();
  $("#brief-import-status").textContent="正在解析你选中的文件并提取候选项，请稍候…";
  try{
    const form=new FormData();selectedBriefFiles.forEach(file=>form.append("files",file,file.name));
    const response=await fetch("/api/brief-import",{method:"POST",headers:{"X-Workbench-Key":key},body:form});
    const data=await response.json().catch(()=>({}));
    const fileSummary=Array.isArray(data.files)?data.files.map(x=>x.name+"："+x.status).join("；"):"";
    if(!response.ok)throw Error((data.error||"文件解析失败")+" "+fileSummary);
    briefCandidates=Array.isArray(data.candidates)?data.candidates:[];
    renderBriefCandidates();
    $("#brief-import-status").textContent=briefCandidates.length ? "提取到 "+briefCandidates.length+" 条待核对候选项。请对照原件，尤其是图片上的小字，勾选确认后写入 Brief。"+(fileSummary?" 文件状态："+fileSummary:"") : "文件已解析，但没有找到带可追溯依据的候选项。请检查原件或手动填写。"+(fileSummary?" 文件状态："+fileSummary:"");
  }catch(error){$("#brief-import-status").textContent=error.message||"导入失败，请检查文件和服务配置。"}
  finally{button.disabled=false}
};
$("#brief-apply").onclick=()=>{
  const selected=Array.from($("#brief-candidate-list").querySelectorAll("input:checked")).map(input=>briefCandidates[Number(input.value)]).filter(Boolean);
  if(!selected.length){$("#brief-import-status").textContent="请先对照原件核对，再勾选要写入的候选项。";return}
  const facts=$("#auto-facts"),evidence=$("#auto-evidence");
  for(const item of selected){
    const entry="• "+item.statement+"（来源："+item.source+"；"+(item.sourceKind==="image"?"图像识别文本":"提取原文")+"："+item.quote+"）";
    const target=item.type==="fact"?facts:evidence;
    if(!target.value.includes(entry))target.value=(target.value.trim()?target.value.trim()+"\n":"")+entry;
  }
  rememberBrief();
  $("#brief-import-status").textContent="已写入 "+selected.length+" 条候选内容。请继续核对能否公开使用、功效措辞和目标市场合规要求；这一步不代表已验证。";
};
boot();
