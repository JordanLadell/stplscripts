// ============================================================
// STOP: If you are reading this as plain text, Tampermonkey is
// NOT installed in this browser. Install it first, then reopen
// this exact page/link to trigger the script install prompt.
//
//   1) Install Tampermonkey:  https://www.tampermonkey.net/
//   2) Reload this page to install the script automatically.
// ============================================================

// ==UserScript==
// @name         Vision - Live Bulk Picker TV Dashboard
// @namespace    staples.orlando.vision.bulk
// @version      6.22.16
// @description  Standalone Bulk picker credit dashboard using Vision Associate Productivity data.
// @match        https://sci-prod.az.staples.com/vision/clientWeb/flr/associateProductivity/*
// @match        https://sci-prod.az.staples.com/vision/clientWeb/flr/associateProductivity*
// @grant        GM_xmlhttpRequest
// @connect      lcvyprwbv05.staples.com
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/JordanLadell/stplscripts/master/Vision-Bulk-TV-Dashboard.user.js
// @downloadURL  https://raw.githubusercontent.com/JordanLadell/stplscripts/master/Vision-Bulk-TV-Dashboard.user.js
// ==/UserScript==
(() => {
  'use strict';
  const CONFIG = {
    apiPath: '/vision/clientWeb/flr/api/associateProductivity/',
    cartonApiPath: '/vision/clientWeb/flr/api/carton/',
    settingsKey: 'visionLiveBulkDashboardSettingsV1',
    displaySettingsKey: 'visionLiveBulkDashboardDisplaySettingsV1',
    sharedSettingsCacheKey: 'visionLiveBulkDashboardSharedSettingsCacheV1',
    sharedSettingsFileName: 'VisionBulkSharedSettings.json',
    historyKey: 'visionLiveBulkDashboardHistoryV1',
    pingHistoryKey: 'visionLiveBulkDashboardPingHistoryV1',
    operationalDayStartHour: 2,
    activeMinutes: 20,
    timeoutMs: 90000,
    defaultRefreshSeconds: 30, adjustmentHistoryKey: 'visionLiveBulkAdjustmentHistoryV1',
    highVolumeUrl: 'http://lcvyprwbv05.staples.com:6801/Home/HighVolumeBatchReport',
    highVolumeBatchDetailUrl: 'http://lcvyprwbv05.staples.com:6801/Home/BatchDetail?batchid=',
    prescanUrl: 'http://lcvyprwbv05.staples.com:6801/Home/PrescanReport',
    hubStatusUrl: 'http://lcvyprwbv05.staples.com:6801/Home/HubStatus',
    batchStatusUrl: 'http://lcvyprwbv05.staples.com:6801/Home/BatchStatus?completed=True',
    zoneStatusUrl: 'http://lcvyprwbv05.staples.com:6801/Home/ZoneStatus',
    visionLoginUrl: 'https://sci-prod.az.staples.com/vision/clientWeb/flr/login',
    dpLoginUrl: 'http://lcvyprwbv05.staples.com:6801/account/login',
    historyDirHandleDbName: 'visionBulkDashboardFsHandles',
    historyDirHandleDbStore: 'handles',
    historyDirHandleKey: 'historyDir',
    historyFilePrefix: 'VisionBulkHistory_',
    adjustmentFilePrefix: 'VisionBulkAdjustments_',
    historyDirSyncMs: 30000,
    areaScrollResyncMs: 180000,
    dateRolloverCheckMs: 30000,
    pickDataFolderName: 'PickData',
    settingsFolderName: 'Settings',
    masterFileName: 'VisionBulkMaster.json',
    instanceIdKey: 'visionLiveBulkDashboardInstanceIdV1',
    instanceLabelKey: 'visionLiveBulkDashboardInstanceLabelV1'
  };
  const DEFAULT_WORK_LEFT_GROUPS = Object.freeze([
    {id:'floor',name:'FLOOR',areaIds:[46,48,51],enabled:true},
    {id:'unit_pick',name:'UNIT PICK',areaIds:[37,50],enabled:true},
    {id:'pick_to_belt',name:'PICK TO BELT',areaIds:[45],enabled:true},
    {id:'calendars',name:'CALENDARS',areaIds:[36],enabled:true},
    {id:'reserve',name:'RESERVE',areaIds:[47],enabled:true}
  ]);
  function normalizeWorkLeftGroups(raw){
    const source=Array.isArray(raw)&&raw.length?raw:DEFAULT_WORK_LEFT_GROUPS;
    return source.map((item,index)=>({id:String(item?.id||`work_left_${index}`),name:String(item?.name||`AREA ${index+1}`).trim().toUpperCase().slice(0,30),areaIds:[...new Set((Array.isArray(item?.areaIds)?item.areaIds:String(item?.areaIds||'').split(/[,;\s]+/)).map(Number).filter(v=>Number.isInteger(v)&&v>0))],enabled:item?.enabled!==false})).filter(item=>item.name&&item.areaIds.length);
  }
  const APP_ID = 'vision-live-bulk-tv';
  // SHA-256 hash of the supervisor PIN. The PIN is never displayed in the UI.
  const SETTINGS_PASSWORD_SHA256 = 'd325ff4e3fd410be29cb96fe1edb7a1ca103fe1d58a18d3be3b1981ce7b7169f';
  const DEFAULT_CLASSIFICATION_RULES = Object.freeze([
    {id:'header_paper',name:'Header Paper',codes:['FULL-R','MIXED-R','MIXED-P','FULL-P'],enabled:true,exclude:false},
    {id:'header_water',name:'Header Water',codes:['MIXED-W'],enabled:true,exclude:false},
    {id:'bags',name:'Bags',codes:['MIXED-B','FULL-B'],enabled:true,exclude:false},
    {id:'excluded_full_w',name:'Excluded Header Type',codes:['FULL-W'],enabled:true,exclude:true}
  ]);
  function normalizeClassificationRules(raw){
    const source=Array.isArray(raw)&&raw.length?raw:DEFAULT_CLASSIFICATION_RULES;
    const output=[],usedIds=new Set();
    for(const item of source){
      const name=String(item?.name||'').trim().replace(/\s+/g,' ').slice(0,50);
      const codes=[...new Set((Array.isArray(item?.codes)?item.codes:String(item?.codes||'').split(/[,;\n]+/)).map(v=>String(v).trim().toUpperCase()).filter(Boolean))];
      if(!name||!codes.length)continue;
      let id=String(item?.id||`classification_${Date.now()}_${output.length}`).trim();
      if(usedIds.has(id))id=`${id}_${output.length}`;
      output.push({id,name,codes,enabled:item?.enabled!==false,exclude:item?.exclude===true});usedIds.add(id);
    }
    return output;
  }
  function classificationAreas(){return [...new Set((state.classificationRules||[]).filter(rule=>rule.enabled&&!rule.exclude).map(rule=>rule.name))];}
  function classificationFromValue(value) {
    const text=String(value||'').trim().toUpperCase();
    if(!text)return null;
    for(const rule of state.classificationRules||DEFAULT_CLASSIFICATION_RULES){
      if(!rule.enabled)continue;
      const matched=rule.codes.some(code=>{
        const token=String(code||'').trim().toUpperCase();
        if(!token)return false;
        return text===token||text.split(/[\s,;|/()\[\]{}:]+/).includes(token)||new RegExp(`(^|[^A-Z0-9-])${token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^A-Z0-9-]|$)`).test(text);
      });
      if(matched)return {area:rule.name,exclude:rule.exclude===true};
    }
    return null;
  }
  function headerAreaFromPalletType(value) {
    const match=classificationFromValue(value);
    return match&&!match.exclude?match.area:null;
  }
  function headerAreaFromVisionDetail(detail) {
    const values=[detail?.pallet_type,detail?.palletType,detail?.batch_type,detail?.batchType,detail?.work_location,detail?.area,detail?.label,detail?.job_function?.display_value];
    for(const value of values){const match=classificationFromValue(value);if(match)return match.exclude?'__EXCLUDED_CLASSIFICATION__':match.area;}
    const text=values.map(v=>String(v||'').trim().toUpperCase()).join(' | ');
    for(const rule of state.classificationRules||[]){if(rule.enabled&&!rule.exclude&&text.includes(rule.name.toUpperCase()))return rule.name;}
    return null;
  }
  async function settingsPasswordValid(value) {
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'').trim()));
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')===SETTINGS_PASSWORD_SHA256;
  }
  const CARD_ELEMENT_DEFAULTS = Object.freeze({
    username:{label:'Username',textSize:100,color:'#FFFFFF',marginTop:0,marginBottom:0,paddingX:0},
    fullName:{label:'Full Name',textSize:100,color:'#8496AB',marginTop:2,marginBottom:0,paddingX:0},
    groupBadge:{label:'Group Badge',textSize:100,color:'#FFFFFF',marginTop:0,marginBottom:0,paddingX:7},
    totalCredit:{label:'Total Credit Value',textSize:100,color:'#3ECF8E',marginTop:0,marginBottom:0,paddingX:0},
    totalCreditLabel:{label:'Total Credit Label',textSize:100,color:'#8496AB',marginTop:0,marginBottom:0,paddingX:0},
    areaHeader:{label:'Area Column Header',textSize:100,color:'#8496AB',marginTop:0,marginBottom:0,paddingX:0},
    areaName:{label:'Area Name',textSize:100,color:'#FFFFFF',marginTop:0,marginBottom:0,paddingX:0},
    pickValue:{label:'Pick Value',textSize:100,color:'#FFFFFF',marginTop:0,marginBottom:0,paddingX:0},
    creditValue:{label:'Credit Value',textSize:100,color:'#9FB8D9',marginTop:0,marginBottom:0,paddingX:0}
  });
  function normalizeCardElementStyles(raw={}){
    const out={};
    const numeric=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
    for(const [key,defaults] of Object.entries(CARD_ELEMENT_DEFAULTS)){
      const value=raw?.[key]||{};
      out[key]={
        label:defaults.label,
        textSize:Math.min(250,Math.max(40,numeric(value.textSize,defaults.textSize))),
        color:/^#[0-9a-f]{6}$/i.test(String(value.color||''))?String(value.color).toUpperCase():defaults.color,
        marginTop:Math.min(40,Math.max(-20,numeric(value.marginTop,defaults.marginTop))),
        marginBottom:Math.min(40,Math.max(-20,numeric(value.marginBottom,defaults.marginBottom))),
        paddingX:Math.min(40,Math.max(0,numeric(value.paddingX,defaults.paddingX)))
      };
    }
    return out;
  }
  const state = {
    token: '', data: null, selectedDate: '', running: false, refreshing: false,
    requestId: 0, controller: null, refreshTimer: null, lastRefresh: null,
    lastDuration: 0, responseBytes: 0, lastError: '', highVolumeError: '', highVolumeRows: [], highVolumeBatchDetailCache: {}, prescanError: '', prescanRows: [], manualAdjustments: [], overlay: null, frame: null, ui: null,
    historyDirHandle: null, historyDirName: '', historyDirStatus: 'none', historyDirError: '', historyDirLastSync: null, historyDirSyncing: false, historyDirSyncTimer: null, historyDirSyncProgress: {phase:'idle',completed:0,total:0},
    adjustmentFileModTimes: {}, adjustmentFileItemCounts: {},
    pickDataDirHandle: null, settingsDirHandle: null,
    instanceId: '', instanceLabel: '', isMaster: false, masterOwnerId: '', masterOwnerLabel: '', masterClaimedAt: null, masterHeartbeatAt: null,
    sharedSettingsAppliedAt: 0,
    pickers: [], detectedAreas: [], creditRates: {}, enabledAreas: {}, areaAliases: {}, excludedUsernames: new Set(),
    minimumPicks: 0, columns: 5, rows: 5, refreshSeconds: 30,
    sidebarWidthPercent: 14, cardTextPercent: 100, cardFullNamePercent: 100, cardPaddingPercent: 100, cardRowGapPercent: 100, groupBadgeTextPercent: 100, groupBadgeMarginPercent: 100, groupBadgeSizePercent: 100, highVolumeMultiplier: 0.75, sidebarTextPercent: 100, sidebarPaddingPercent: 100, sidebarRowGapPercent: 100, tickerTextPercent: 100, tickerHeightPercent: 100, tickerSpacingPercent: 100, showTicker: true,
    rankingPeople: 10, rankingRotationSeconds: 10, rankingView: 'FT', rankingPrimaryMetric: 'creditPerActiveHour', rankingSecondaryMetric: 'totalCredit', cardPrimaryMetric: 'totalCredit', cardSecondaryMetric: 'creditPerActiveHour', rankingRotationTimer: null, tickerSignature: '', tickerStructureSignature: '', workLeftGroups: normalizeWorkLeftGroups(), workLeftTotals: [], workLeftRefreshSeconds: 60, workLeftTimer: null, workLeftRefreshing: false, workLeftAreaCounts: {}, workLeftAreaHealth: {}, workLeftSourceRefreshing: false, workLeftError: '', workLeftLastRefresh: null, disBatchPending: 0, disHubError: '', floorBatchPending: 0, floorBatchError: '', renderFrame: null, sourceHealth: {}, history: {}, pingHistory: [], lastPingSampleAt: 0, healthTimer: null, workLeftRequestId: 0, workLeftRetryTimer: null, visionRetryTimer: null, cardsSignature: '', rankingSignature: '', goalsSignature: '', areaScrollResyncTimer: null, dateFollowsToday: true, dateRolloverTimer: null, pickerGroups: [], classificationRules: normalizeClassificationRules(), groupCreditGoals: {}, goalOperationalDate: '', goalWarningPercent: 70, goalNearPercent: 90, goalLowColor: '#f2707d', goalWarningColor: '#e8b455', goalNearColor: '#9FB8D9', goalMetColor: '#3ECF8E', cardElementStyles: normalizeCardElementStyles(), filter: '', sort: 'name',
    visionLoginRequired: false, dpLoginFlags: { zoneStatus: false, highVolume: false, prescan: false }, visionLastDataAt: null, dpLastDataAt: null,
    showingHistoricalPreview: false, historicalPreviewDate: '', loadingWithoutSavedData: false, goalHitTimes: {}
  };
  function anyDpLoginRequired(){return Object.values(state.dpLoginFlags||{}).some(Boolean);}
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const fmt = v => Math.round(n(v)).toLocaleString();
  const creditFmt = v => n(v).toFixed(2);
  function pickerElapsedHours(p){const first=p?.firstPick,last=p?.latestEnd;if(!first||!last)return 0;const ms=last.getTime?last.getTime()-first.getTime():0;return ms>0?ms/3600000:0;}
  function pickerNetElapsedHours(p){const elapsedHours=pickerElapsedHours(p);const breakHours=n(p?.breakSeconds)/3600;return Math.max(0,elapsedHours-breakHours);}
  const RANKING_METRICS = {
    totalCredit:{label:'Total Credit',short:'CREDIT',value:p=>n(p.totalCredit),format:v=>fmt(v)},
    creditPerActiveHour:{label:'Credit / Active Hour',short:'CREDIT / ACTIVE HR',value:p=>n(p.creditPerHour),format:v=>`${fmt(v)}/hr`},
    creditPerElapsedHour:{label:'Credit / Elapsed Hour',short:'CREDIT / ELAPSED HR',value:p=>{const hours=pickerElapsedHours(p);return hours>0?n(p.totalCredit)/hours:0;},format:v=>`${fmt(v)}/hr`},
    creditPerNetElapsedHour:{label:'Credit / Net Elapsed Hour (excludes Break/Lunch)',short:'CREDIT / NET ELAPSED HR',value:p=>{const hours=pickerNetElapsedHours(p);return hours>0?n(p.totalCredit)/hours:0;},format:v=>`${fmt(v)}/hr`},
    totalPicks:{label:'Total Picks',short:'PICKS',value:p=>n(p.totalPicks),format:v=>fmt(v)}
  };
  function metricKeyOrDefault(value,fallback){return RANKING_METRICS[value]?value:fallback;}
  function metricValue(metricKey,p){return (RANKING_METRICS[metricKey]||RANKING_METRICS.totalCredit).value(p);}
  function metricDisplay(metricKey,p){const def=RANKING_METRICS[metricKey]||RANKING_METRICS.totalCredit;return def.format(def.value(p));}
  function metricOptionsHtml(selected){return Object.entries(RANKING_METRICS).map(([key,def])=>`<option value="${key}" ${selected===key?'selected':''}>${esc(def.label)}</option>`).join('');}
  function cardSecondaryMetricDef(){return RANKING_METRICS[metricKeyOrDefault(state.cardSecondaryMetric,'creditPerActiveHour')]||RANKING_METRICS.creditPerActiveHour;}
  function cardPrimaryLabel(p){
    const primary=metricKeyOrDefault(state.cardPrimaryMetric,'totalCredit');
    if(primary==='totalCredit'){const progress=goalProgress(p);return progress===null?'TOTAL CREDIT':`${Math.round(progress)}% OF ${fmt(goalForPicker(p))}`;}
    return RANKING_METRICS[primary].short;
  }
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const operationalDate = (date = new Date()) => { const d = new Date(date); if (d.getHours() < CONFIG.operationalDayStartHour) d.setDate(d.getDate()-1); return formatDate(d); };
  const parseDate = value => { if (!value) return null; const d = new Date(String(value).replace(' ','T')); return Number.isNaN(d.getTime()) ? null : d; };
  const timeText = value => { const d = value instanceof Date ? value : parseDate(value); return d ? d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '--'; };
  function setSourceHealth(id,label,ok,error=''){const previous=state.sourceHealth[id]||{};state.sourceHealth[id]={id,label,ok:!!ok,error:String(error||''),lastAttempt:new Date(),lastSuccess:ok?new Date():(previous.lastSuccess||null)};renderConnectivity();}
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function retryableStatus(status){return status===502||status===503||status===504;}
  async function withRetry(task,{attempts=3,delays=[1800,4500],onRetry}={}){
    let lastError;
    for(let attempt=0;attempt<attempts;attempt++){
      try{return await task(attempt);}
      catch(error){lastError=error;if(!error?.retryable||attempt>=attempts-1)throw error;onRetry?.(error,attempt+1);await sleep(delays[Math.min(attempt,delays.length-1)]||5000);}
    }
    throw lastError;
  }
  function healthSummary(){const sources=Object.values(state.sourceHealth),core=state.sourceHealth.vision;if(!state.running)return {level:'idle',title:'Dashboard stopped'};if(core&&core.ok===false&&/retry .* pending/i.test(core.error))return {level:'warning',title:'Vision temporarily unavailable; automatic retry pending'};if(core&&core.ok===false)return {level:'error',title:'Vision production connection lost'};if(sources.some(source=>source.ok===false))return {level:'warning',title:'One or more supplemental sources are unavailable'};if(!sources.length)return {level:'idle',title:'Waiting for first connection check'};return {level:'ok',title:'All monitored data sources connected'};}
  function renderConnectivity(){const icon=state.ui?.connectivity;if(!icon)return;const summary=healthSummary();icon.className=`connectivity ${summary.level}`;const lines=[summary.title,''];for(const id of ['vision','zoneStatus','highVolume','prescan']){const source=state.sourceHealth[id];if(!source)continue;lines.push(`${source.label}: ${source.ok?'Connected':'ERROR'}`);if(source.error)lines.push(`  ${source.error}`);if(source.lastSuccess)lines.push(`  Last success: ${source.lastSuccess.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);}icon.title=lines.join('\n');icon.setAttribute('aria-label',summary.title);}
  function loginBannerText(){
    const parts=[];
    if(state.visionLoginRequired){
      const stamp=state.visionLastDataAt?timeText(state.visionLastDataAt):'never';
      parts.push(`VISION LOGIN REQUIRED — data is not updating. Last pulled: ${stamp}. Sign in to Vision (${CONFIG.visionLoginUrl}).`);
    }
    if(anyDpLoginRequired()){
      const stamp=state.dpLastDataAt?timeText(state.dpLastDataAt):'never';
      parts.push(`DECISION POINT LOGIN REQUIRED — work-left/prescan/high-volume data is not updating. Last pulled: ${stamp}. Sign in to Decision Point (${CONFIG.dpLoginUrl}).`);
    }
    return parts;
  }
  function renderLoginBanner(){
    const el=state.ui?.loginBanner;
    if(!el)return;
    const lines=loginBannerText();
    if(!lines.length){el.hidden=true;el.innerHTML='';return;}
    el.hidden=false;
    el.innerHTML=lines.map(line=>`<div class="loginBannerLine">⚠ ${esc(line)}</div>`).join('');
  }
  const NON_ZONE_EFFICIENCY_AREAS=new Set(['HEADER PAPER','HEADER WATER','BAGS']);
  function loadHistory(){
    try{const raw=JSON.parse(localStorage.getItem(CONFIG.historyKey)||'{}');state.history=raw&&typeof raw==='object'?raw:{}}catch(_){state.history={}}
    try{const raw=JSON.parse(localStorage.getItem(CONFIG.pingHistoryKey)||'[]');state.pingHistory=Array.isArray(raw)?raw:[]}catch(_){state.pingHistory=[]}
    state.pingHistory=state.pingHistory.slice(-2000);state.lastPingSampleAt=Date.parse(state.pingHistory.at(-1)?.capturedAt||'')||0;
  }
  function idbOpenHandleDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(CONFIG.historyDirHandleDbName,1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(CONFIG.historyDirHandleDbStore))req.result.createObjectStore(CONFIG.historyDirHandleDbStore);};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function idbGetHandle(key){
    try{
      const db=await idbOpenHandleDb();
      return await new Promise((resolve,reject)=>{
        const tx=db.transaction(CONFIG.historyDirHandleDbStore,'readonly');
        const req=tx.objectStore(CONFIG.historyDirHandleDbStore).get(key);
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>reject(req.error);
      });
    }catch(_){return null;}
  }
  async function idbSetHandle(key,value){
    try{
      const db=await idbOpenHandleDb();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(CONFIG.historyDirHandleDbStore,'readwrite');
        tx.objectStore(CONFIG.historyDirHandleDbStore).put(value,key);
        tx.oncomplete=()=>resolve(true);
        tx.onerror=()=>reject(tx.error);
      });
    }catch(_){}
  }
  async function historyDirPermissionState(handle,requestIfNeeded=false){
    if(!handle)return 'none';
    try{
      const opts={mode:'readwrite'};
      let status=await handle.queryPermission(opts);
      if(status!=='granted'&&requestIfNeeded)status=await handle.requestPermission(opts);
      return status;
    }catch(_){return 'error';}
  }
  async function getOrCreateSubdir(rootHandle,name){
    return await rootHandle.getDirectoryHandle(name,{create:true});
  }
  async function ensureFolderStructure(rootHandle){
    const pickDataHandle=await getOrCreateSubdir(rootHandle,CONFIG.pickDataFolderName);
    const settingsHandle=await getOrCreateSubdir(rootHandle,CONFIG.settingsFolderName);
    state.pickDataDirHandle=pickDataHandle;state.settingsDirHandle=settingsHandle;
    return {pickDataHandle,settingsHandle};
  }
  async function migrateLegacyRootFiles(rootHandle,pickDataHandle,settingsHandle){
    try{
      const entries=[];
      for await (const [name,entry] of rootHandle.entries())entries.push([name,entry]);
      for(const [name,entry] of entries){
        if(entry.kind!=='file')continue;
        let destHandle=null;
        if(name.endsWith('.json')&&(name.startsWith(CONFIG.historyFilePrefix)||name.startsWith(CONFIG.adjustmentFilePrefix)))destHandle=pickDataHandle;
        else if(name===CONFIG.sharedSettingsFileName||name===CONFIG.masterFileName)destHandle=settingsHandle;
        if(!destHandle)continue;
        try{
          const file=await entry.getFile();
          const text=await file.text();
          const newFileHandle=await destHandle.getFileHandle(name,{create:true});
          const writable=await newFileHandle.createWritable();
          await writable.write(text);
          await writable.close();
          await rootHandle.removeEntry(name);
        }catch(_){}
      }
    }catch(_){}
  }
  async function cleanupOrphanedSwapFiles(dirHandle){
    if(!dirHandle)return;
    try{
      const toRemove=[];
      for await (const [name,entry] of dirHandle.entries()){
        if(entry.kind==='file'&&name.endsWith('.crswap'))toRemove.push(name);
      }
      for(const name of toRemove){try{await dirHandle.removeEntry(name);}catch(_){}}
    }catch(_){}
  }
  function ensureInstanceIdentity(){
    let id='';try{id=localStorage.getItem(CONFIG.instanceIdKey)||'';}catch(_){id='';}
    if(!id){id=(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():`inst_${Date.now()}_${Math.random().toString(16).slice(2)}`;try{localStorage.setItem(CONFIG.instanceIdKey,id);}catch(_){}}
    state.instanceId=id;
    let label='';try{label=localStorage.getItem(CONFIG.instanceLabelKey)||'';}catch(_){label='';}
    state.instanceLabel=label||`PC-${id.slice(0,4).toUpperCase()}`;
  }
  function saveInstanceLabel(label){
    const clean=String(label||'').trim().slice(0,40)||`PC-${state.instanceId.slice(0,4).toUpperCase()}`;
    state.instanceLabel=clean;
    try{localStorage.setItem(CONFIG.instanceLabelKey,clean);}catch(_){}
  }
  async function readMasterFile(handle){
    try{
      const fileHandle=await handle.getFileHandle(CONFIG.masterFileName,{create:false});
      const file=await fileHandle.getFile();
      const parsed=JSON.parse(await file.text());
      if(!parsed||!parsed.ownerId)return null;
      return parsed;
    }catch(_){return null;}
  }
  async function writeMasterFile(handle,record){
    const fileHandle=await handle.getFileHandle(CONFIG.masterFileName,{create:true});
    const writable=await fileHandle.createWritable();
    await writable.write(JSON.stringify({format:'VisionBulkMasterRecord',schemaVersion:1,...record},null,2));
    await writable.close();
  }
  async function syncMasterStatus(settingsHandle){
    if(!settingsHandle)return;
    try{
      const existing=await readMasterFile(settingsHandle);
      const nowIso=new Date().toISOString();
      if(!existing){
        await writeMasterFile(settingsHandle,{ownerId:state.instanceId,ownerLabel:state.instanceLabel,claimedAt:nowIso,lastHeartbeatAt:nowIso});
        state.isMaster=true;state.masterOwnerId=state.instanceId;state.masterOwnerLabel=state.instanceLabel;state.masterClaimedAt=nowIso;state.masterHeartbeatAt=nowIso;
      }else if(existing.ownerId===state.instanceId){
        await writeMasterFile(settingsHandle,{ownerId:state.instanceId,ownerLabel:state.instanceLabel,claimedAt:existing.claimedAt||nowIso,lastHeartbeatAt:nowIso});
        state.isMaster=true;state.masterOwnerId=existing.ownerId;state.masterOwnerLabel=state.instanceLabel;state.masterClaimedAt=existing.claimedAt||nowIso;state.masterHeartbeatAt=nowIso;
      }else{
        state.isMaster=false;state.masterOwnerId=existing.ownerId;state.masterOwnerLabel=existing.ownerLabel||'Unknown PC';state.masterClaimedAt=existing.claimedAt||null;state.masterHeartbeatAt=existing.lastHeartbeatAt||null;
      }
    }catch(_){}
    renderMasterBadge();
  }
  async function claimMasterRole(){
    if(!state.settingsDirHandle)throw new Error('History folder is not connected yet.');
    const nowIso=new Date().toISOString();
    await writeMasterFile(state.settingsDirHandle,{ownerId:state.instanceId,ownerLabel:state.instanceLabel,claimedAt:nowIso,lastHeartbeatAt:nowIso});
    state.isMaster=true;state.masterOwnerId=state.instanceId;state.masterOwnerLabel=state.instanceLabel;state.masterClaimedAt=nowIso;state.masterHeartbeatAt=nowIso;
    renderMasterBadge();
    return true;
  }
  function masterBadgeText(){
    if(state.historyDirStatus!=='connected')return '';
    return state.isMaster?'★ MASTER':`VIEWER (Master: ${state.masterOwnerLabel||'Unknown'})`;
  }
  function renderMasterBadge(){
    const el=state.frame?.contentDocument?.getElementById('masterBadge');
    if(!el)return;
    if(state.historyDirStatus!=='connected'){el.hidden=true;return;}
    el.hidden=false;
    el.textContent=masterBadgeText();
    el.classList.toggle('isMaster',!!state.isMaster);
    el.title=state.isMaster
      ?`This PC ("${state.instanceLabel}") is saving pick data to the shared folder. Last heartbeat ${state.masterHeartbeatAt?timeText(state.masterHeartbeatAt):'unknown'}.`
      :`Master is "${state.masterOwnerLabel||'unknown'}" (last heartbeat ${state.masterHeartbeatAt?timeText(state.masterHeartbeatAt):'unknown'}). Click to take over.`;
    renderHistoryFolderStatus();
  }
  function openMasterTakeoverConfirm(){
    if(!state.frame?.contentDocument)return;
    const d=state.frame.contentDocument;
    d.getElementById('masterTakeoverShade')?.remove();
    const shade=d.createElement('div');shade.id='masterTakeoverShade';shade.className='miniFrameShade';
    const ownerLabel=esc(state.masterOwnerLabel||'another PC');
    const heartbeatText=esc(state.masterHeartbeatAt?timeText(state.masterHeartbeatAt):'unknown');
    shade.innerHTML=`<section class="manualBox"><h2>Take Over Master Role</h2><p>Current master: <b>${ownerLabel}</b><br>Last save: ${heartbeatText}</p><small>This PC ("${esc(state.instanceLabel)}") will become responsible for saving daily pick data to the shared folder. The other PC automatically switches to viewer mode on its next check.</small><div><button id="masterTakeoverConfirm">Take Over</button><button id="masterTakeoverCancel">Cancel</button></div><span id="masterTakeoverMsg"></span></section>`;
    d.body.appendChild(shade);
    const close=()=>shade.remove();
    shade.querySelector('#masterTakeoverCancel').onclick=close;
    shade.querySelector('#masterTakeoverConfirm').onclick=async()=>{
      const btn=shade.querySelector('#masterTakeoverConfirm');btn.disabled=true;btn.textContent='Taking over...';
      try{await claimMasterRole();close();}
      catch(error){shade.querySelector('#masterTakeoverMsg').textContent=error.message||String(error);btn.disabled=false;btn.textContent='Take Over';}
    };
  }
  async function readHistoryFolderFiles(handle){
    const parsedDays={};
    const presentDates=new Set();
    if(!handle)return {parsedDays,presentDates};
    try{
      const toRead=[];
      for await (const [name,entry] of handle.entries()){
        if(entry.kind!=='file'||!name.startsWith(CONFIG.historyFilePrefix)||!name.endsWith('.json'))continue;
        const dateKey=name.slice(CONFIG.historyFilePrefix.length,-5);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey))continue;
        presentDates.add(dateKey);
        // Historical days are immutable once written and we already merge only unknown dates below,
        // so skip the (slow) open+read+parse entirely for any date this browser already has cached.
        if(!state.history[dateKey])toRead.push([name,entry,dateKey]);
      }
      if(toRead.length){
        await runWithConcurrency(toRead,8,async([name,entry,dateKey])=>{
          try{
            const file=await entry.getFile();
            const text=await file.text();
            const parsed=JSON.parse(text);
            const day=parsed&&parsed.format==='VisionBulkDashboardHistoryDay'&&parsed.day?parsed.day:(parsed&&parsed.operationalDate?parsed:null);
            if(day)parsedDays[dateKey]=day;
          }catch(_){}
        });
      }
    }catch(_){}
    return {parsedDays,presentDates};
  }
  async function writeHistoryDayFile(handle,dateKey,dayData){
    if(!handle||!dateKey||!dayData)return false;
    try{
      const fileHandle=await handle.getFileHandle(`${CONFIG.historyFilePrefix}${dateKey}.json`,{create:true});
      const writable=await fileHandle.createWritable();
      await writable.write(JSON.stringify({format:'VisionBulkDashboardHistoryDay',schemaVersion:1,updatedAt:new Date().toISOString(),day:dayData},null,2));
      await writable.close();
      return true;
    }catch(error){state.historyDirError=error.message||String(error);return false;}
  }
  async function runWithConcurrency(items,limit,task){
    let index=0;
    const workers=Array.from({length:Math.min(limit,items.length)},async()=>{
      while(index<items.length){
        const current=items[index++];
        await task(current);
      }
    });
    await Promise.all(workers);
  }
  function updateSyncProgress(phase,completed,total){
    state.historyDirSyncProgress={phase,completed,total};
    renderHistoryFolderStatus();renderHistorySyncNote();
  }
  async function syncHistoryWithFolder(){
    const rootHandle=state.historyDirHandle;
    if(!rootHandle||state.historyDirSyncing)return;
    state.historyDirSyncing=true;
    updateSyncProgress('reading',0,0);
    try{
      const {pickDataHandle,settingsHandle}=await ensureFolderStructure(rootHandle);
      await migrateLegacyRootFiles(rootHandle,pickDataHandle,settingsHandle);
      await cleanupOrphanedSwapFiles(pickDataHandle);
      await cleanupOrphanedSwapFiles(settingsHandle);
      await cleanupOrphanedSwapFiles(rootHandle);
      const {parsedDays,presentDates}=await readHistoryFolderFiles(pickDataHandle);
      let changed=false;
      for(const [dateKey,dayData] of Object.entries(parsedDays)){
        if(!state.history[dateKey]){state.history[dateKey]=dayData;changed=true;}
      }
      if(changed){
        const keys=Object.keys(state.history).sort();while(keys.length>180)delete state.history[keys.shift()];
        localStorage.setItem(CONFIG.historyKey,JSON.stringify(state.history));
      }
      if(state.isMaster){
        const missingFromFolder=Object.entries(state.history).filter(([dateKey])=>!presentDates.has(dateKey));
        if(missingFromFolder.length){
          let completed=0;
          updateSyncProgress('writing',0,missingFromFolder.length);
          await runWithConcurrency(missingFromFolder,6,async([dateKey,dayData])=>{
            await writeHistoryDayFile(pickDataHandle,dateKey,dayData);
            completed++;updateSyncProgress('writing',completed,missingFromFolder.length);
          });
        }
      }
      await syncSharedSettingsWithFolder(settingsHandle);
      await syncAdjustmentsWithFolder(pickDataHandle);
      await syncMasterStatus(settingsHandle);
      state.historyDirLastSync=new Date();state.historyDirError='';state.historyDirStatus='connected';
    }catch(error){
      state.historyDirError=error.message||String(error);
    }finally{
      state.historyDirSyncing=false;updateSyncProgress('idle',0,0);
    }
  }
  async function chooseHistoryFolder(){
    if(!window.showDirectoryPicker){state.historyDirStatus='unsupported';state.historyDirError='This browser does not support local folder access. Use Chrome or Edge.';renderHistoryFolderStatus();throw new Error(state.historyDirError);}
    const handle=await window.showDirectoryPicker({id:'visionBulkHistoryFolder',mode:'readwrite'});
    state.historyDirHandle=handle;state.historyDirName=handle.name||'Selected Folder';state.historyDirStatus='connected';state.historyDirError='';
    await idbSetHandle(CONFIG.historyDirHandleKey,handle);
    renderHistoryFolderStatus();
    syncHistoryWithFolder();
    return handle;
  }
  async function reconnectHistoryFolderSilently(){
    const handle=await idbGetHandle(CONFIG.historyDirHandleKey);
    if(!handle){state.historyDirStatus='none';renderHistoryFolderStatus();return;}
    state.historyDirHandle=handle;state.historyDirName=handle.name||'Selected Folder';
    const status=await historyDirPermissionState(handle,false);
    if(status==='granted'){state.historyDirStatus='connected';syncHistoryWithFolder();}
    else{state.historyDirStatus='needs-permission';}
    renderHistoryFolderStatus();
  }
  async function reconnectHistoryFolderWithPermission(){
    if(!state.historyDirHandle)return chooseHistoryFolder();
    const status=await historyDirPermissionState(state.historyDirHandle,true);
    if(status==='granted'){state.historyDirStatus='connected';state.historyDirError='';renderHistoryFolderStatus();syncHistoryWithFolder();}
    else{state.historyDirStatus='needs-permission';state.historyDirError='Folder access was not granted.';renderHistoryFolderStatus();}
  }
  function restartHistoryFolderSyncTimer(){
    clearInterval(state.historyDirSyncTimer);state.historyDirSyncTimer=null;
    if(!state.running)return;
    state.historyDirSyncTimer=setInterval(()=>{if(state.historyDirStatus==='connected')syncHistoryWithFolder();},CONFIG.historyDirSyncMs);
  }
  function historyFolderStatusText(){
    const progress=state.historyDirSyncProgress||{phase:'idle'};
    if(progress.phase==='reading')return `Connected: ${state.historyDirName} — reading existing files...`;
    if(progress.phase==='writing')return `Connected: ${state.historyDirName} — writing history files (${progress.completed}/${progress.total})...`;
    if(state.historyDirStatus==='connected')return `Connected: ${state.historyDirName}${state.historyDirLastSync?` (synced ${timeText(state.historyDirLastSync)})`:''}`;
    if(state.historyDirStatus==='needs-permission')return `Reconnect required: ${state.historyDirName}`;
    if(state.historyDirStatus==='unsupported')return 'Not supported in this browser';
    if(state.historyDirStatus==='error')return `Error: ${state.historyDirError||'Unknown error'}`;
    return 'No folder selected';
  }
  function renderHistoryFolderStatus(){
    const el=state.frame?.contentDocument?.getElementById('historyFolderStatus');
    if(el)el.textContent=historyFolderStatusText();
    const masterLine=state.frame?.contentDocument?.getElementById('masterStatusLine');
    if(masterLine){
      if(state.historyDirStatus!=='connected'){masterLine.hidden=true;}
      else{
        masterLine.hidden=false;
        masterLine.textContent=state.isMaster
          ?`This PC ("${state.instanceLabel}") is the Master saving pick data.`
          :`Master: ${state.masterOwnerLabel||'Unknown PC'}${state.masterHeartbeatAt?` (last save ${timeText(state.masterHeartbeatAt)})`:''}`;
      }
    }
  }
  function renderHistorySyncNote(){
    const el=state.frame?.contentDocument?.getElementById('historySyncNote');
    if(!el)return;
    const progress=state.historyDirSyncProgress||{phase:'idle'};
    if(progress.phase==='idle'){el.hidden=true;return;}
    el.hidden=false;
    el.textContent=progress.phase==='reading'?'Syncing history folder...':`Syncing history folder: ${progress.completed}/${progress.total} files`;
  }
  function savePingSample(sample){
    const now=Date.now();if(state.lastPingSampleAt&&now-state.lastPingSampleAt<30*60*1000)return;
    state.lastPingSampleAt=now;state.pingHistory.push({capturedAt:new Date(now).toISOString(),operationalDate:operationalDate(),...sample});
    state.pingHistory=state.pingHistory.slice(-2000);localStorage.setItem(CONFIG.pingHistoryKey,JSON.stringify(state.pingHistory));
  }
  function pickerAreaDaily(picker){
    const out=[];
    for(const area of picker.areas){
      const key=canonicalAreaKey(area.baseArea||area.area);if(NON_ZONE_EFFICIENCY_AREAS.has(key))continue;
      let seconds=0;if(!area.isManual&&!area.isPrescan)seconds=picker.includedPickRecords.filter(record=>canonicalAreaKey(areaName(record))===key).reduce((sum,record)=>sum+n(record.working_seconds),0);
      out.push({area:displayAreaName(area.area),picks:n(area.picks),credit:n(area.credit),activeSeconds:seconds,creditPerActiveHour:seconds>0?n(area.credit)/(seconds/3600):0});
    }
    return out;
  }
  function remainingCreditBreakdown(){
    const rows=[];const add=(area,cartons,rateKey,partial=false)=>rows.push({area,cartons:n(cartons),rate:creditRate(rateKey),credit:n(cartons)*creditRate(rateKey),partial});
    const floor=state.workLeftTotals.find(item=>item.id==='floor');if(floor)add('Floor',floor.count,'BULK',floor.partial);
    for(const group of state.workLeftGroups){
      if(!group.enabled||group.id==='floor')continue;
      for(const areaId of group.areaIds){const count=state.workLeftAreaCounts[areaId];if(!Number.isFinite(Number(count)))continue;
        const rateKey=areaId===50?'HAZMAT':group.name;add(areaId===50?'Hazmat':group.name,count,rateKey,false);
      }
    }
    const header={};for(const row of state.prescanRows.filter(row=>!row.allocated)){const key=canonicalAreaKey(row.area);header[key]=(header[key]||0)+n(row.cartons);}
    for(const [area,cartons] of Object.entries(header))add(displayAreaName(area),cartons,area,false);
    return rows;
  }
  function currentCreditRemaining(){return remainingCreditBreakdown().reduce((sum,row)=>sum+n(row.credit),0);}
  function captureDailyHistory(){
    if(!state.selectedDate||!state.pickers.length)return;
    const pickers=state.pickers.map(picker=>{const first=picker.firstPick,last=picker.latestEnd,elapsedSeconds=first&&last?Math.max(0,(last-first)/1000):0,goal=goalForPicker(picker);return {id:String(picker.id),username:picker.label,employeeId:picker.employeeId,fullName:picker.fullName,group:picker.pickerGroup?.name||'',firstPick:first?.toISOString()||'',lastPick:last?.toISOString()||'',elapsedSeconds,activeSeconds:n(picker.workSeconds),totalPicks:n(picker.totalPicks),totalCredit:n(picker.totalCredit),creditPerElapsedHour:elapsedSeconds>0?n(picker.totalCredit)/(elapsedSeconds/3600):0,creditPerActiveHour:picker.workSeconds>0?n(picker.totalCredit)/(picker.workSeconds/3600):0,goal,goalPercent:goal>0?n(picker.totalCredit)/goal*100:null,goalMet:goal>0&&n(picker.totalCredit)>=goal,goalHitTime:(goalHitTimeForPicker(picker)?.toISOString()||''),areas:pickerAreaDaily(picker)};});
    const areaMap={};for(const picker of pickers)for(const area of picker.areas){const key=canonicalAreaKey(area.area);if(!areaMap[key])areaMap[key]={area:area.area,picks:0,credit:0,activeSeconds:0};areaMap[key].picks+=area.picks;areaMap[key].credit+=area.credit;areaMap[key].activeSeconds+=area.activeSeconds;}
    const areas=Object.values(areaMap).map(area=>({...area,creditPerActiveHour:area.activeSeconds>0?area.credit/(area.activeSeconds/3600):0})).sort((x,y)=>x.area.localeCompare(y.area));
    const remainingBreakdown=remainingCreditBreakdown();state.history[state.selectedDate]={operationalDate:state.selectedDate,capturedAt:new Date().toISOString(),pickers,areas,creditProduced:pickers.reduce((sum,p)=>sum+n(p.totalCredit),0),activeSeconds:pickers.reduce((sum,p)=>sum+n(p.activeSeconds),0),creditRemaining:remainingBreakdown.reduce((sum,row)=>sum+n(row.credit),0),remainingBreakdown};
    const keys=Object.keys(state.history).sort();while(keys.length>180)delete state.history[keys.shift()];localStorage.setItem(CONFIG.historyKey,JSON.stringify(state.history));
    if(state.pickDataDirHandle&&state.historyDirStatus==='connected'&&state.isMaster)writeHistoryDayFile(state.pickDataDirHandle,state.selectedDate,state.history[state.selectedDate]);
  }
  function historyRows(){return Object.values(state.history).sort((a,b)=>a.operationalDate.localeCompare(b.operationalDate));}
  function csvCell(value){
    const text=value===null||value===undefined?'':String(value);
    return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
  }
  function downloadTextFile(filename,text,type='text/csv;charset=utf-8'){
    const blob=new Blob(['\ufeff',text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function associateHistoryExportRows(){
    const rows=[];
    for(const day of historyRows()){
      for(const picker of day.pickers||[]){
        const areaValues={};for(const area of picker.areas||[]){const key=canonicalAreaKey(area.area);areaValues[key]={picks:n(area.picks),credit:n(area.credit),activeHours:n(area.activeSeconds)/3600,creditPerActiveHour:n(area.creditPerActiveHour)};}
        rows.push({
          operationalDate:day.operationalDate,username:picker.username,employeeId:picker.employeeId,fullName:picker.fullName,group:picker.group,
          firstPick:picker.firstPick,lastPick:picker.lastPick,elapsedHours:n(picker.elapsedSeconds)/3600,activeHours:n(picker.activeSeconds)/3600,
          totalPicks:n(picker.totalPicks),totalCredit:n(picker.totalCredit),creditPerActiveHour:n(picker.creditPerActiveHour),creditPerElapsedHour:n(picker.creditPerElapsedHour),
          goal:n(picker.goal),goalPercent:picker.goalPercent===null||picker.goalPercent===undefined?'':n(picker.goalPercent),goalMet:picker.goal>0?(picker.goalMet?'Yes':'No'):'',areaValues
        });
      }
    }
    return rows.sort((a,b)=>a.operationalDate.localeCompare(b.operationalDate)||a.username.localeCompare(b.username));
  }
  function exportAssociateHistoryCsv(){
    captureDailyHistory();const rows=associateHistoryExportRows();
    if(!rows.length)throw new Error('No associate history is stored yet.');
    const areaKeys=[...new Set(rows.flatMap(row=>Object.keys(row.areaValues)))].sort((a,b)=>a.localeCompare(b));
    const headers=['Operational Date','Username','Employee ID','Full Name','Group','First Pick','Last Pick','Elapsed Hours','Active Picking Hours','Total Picks','Total Credit','Credit per Active Hour','Credit per Elapsed Hour','Goal','Goal Percent','Goal Met'];
    for(const area of areaKeys)headers.push(`${displayAreaName(area)} Picks`,`${displayAreaName(area)} Credit`,`${displayAreaName(area)} Active Hours`,`${displayAreaName(area)} Credit per Active Hour`);
    const data=[headers];
    for(const row of rows){
      const values=[row.operationalDate,row.username,row.employeeId,row.fullName,row.group,row.firstPick,row.lastPick,row.elapsedHours.toFixed(2),row.activeHours.toFixed(2),Math.round(row.totalPicks),row.totalCredit.toFixed(2),row.creditPerActiveHour.toFixed(2),row.creditPerElapsedHour.toFixed(2),row.goal?row.goal.toFixed(2):'',row.goalPercent===''?'':Number(row.goalPercent).toFixed(1),row.goalMet];
      for(const area of areaKeys){const value=row.areaValues[area];values.push(value?Math.round(value.picks):'',value?value.credit.toFixed(2):'',value?value.activeHours.toFixed(2):'',value?value.creditPerActiveHour.toFixed(2):'');}
      data.push(values);
    }
    const csv=data.map(row=>row.map(csvCell).join(',')).join('\r\n');
    const first=rows[0].operationalDate,last=rows.at(-1).operationalDate;downloadTextFile(`Vision_Bulk_Associate_Daily_History_${first}_to_${last}.csv`,csv);
    return rows.length;
  }
  function exportHistoricalData(){downloadJsonFile(`Vision_Bulk_Dashboard_History_${formatDate(new Date())}.json`,{format:'VisionBulkDashboardHistory',schemaVersion:2,scriptVersion:'6.22.16',exportedAt:new Date().toISOString(),days:historyRows(),visionPingHistory:state.pingHistory});}
  function weightedRate(days){const credit=days.reduce((sum,day)=>sum+n(day.creditProduced||day.pickers?.reduce((x,p)=>x+n(p.totalCredit),0)),0),seconds=days.reduce((sum,day)=>sum+n(day.activeSeconds||day.pickers?.reduce((x,p)=>x+n(p.activeSeconds),0)),0);return seconds>0?credit/(seconds/3600):0;}
  function trackedWorkLeftRows(){
    const order=['header','unit_pick','pick_to_belt','calendars','reserve'];
    return order.map(id=>state.workLeftTotals.find(row=>row.id===id)).filter(Boolean).map(row=>({...row}));
  }
  function trendSeries(days,scope,key,metric){
    const selected=days.slice(-60),points=[];
    for(const day of selected){
      let credit=0,activeSeconds=0,elapsedSeconds=0,picks=0,label='Overall';
      if(scope==='area'){
        const row=(day.areas||[]).find(item=>canonicalAreaKey(item.area)===canonicalAreaKey(key));if(!row)continue;
        credit=n(row.credit);activeSeconds=n(row.activeSeconds);picks=n(row.picks);label=row.area;
      }else if(scope==='associate'){
        const row=(day.pickers||[]).find(item=>String(item.username)===String(key));if(!row)continue;
        credit=n(row.totalCredit);activeSeconds=n(row.activeSeconds);elapsedSeconds=n(row.elapsedSeconds);picks=n(row.totalPicks);label=row.username;
      }else{
        credit=n(day.creditProduced||(day.pickers||[]).reduce((sum,row)=>sum+n(row.totalCredit),0));
        activeSeconds=n(day.activeSeconds||(day.pickers||[]).reduce((sum,row)=>sum+n(row.activeSeconds),0));
        elapsedSeconds=(day.pickers||[]).reduce((sum,row)=>sum+n(row.elapsedSeconds),0);picks=(day.pickers||[]).reduce((sum,row)=>sum+n(row.totalPicks),0);
      }
      let value=0,metricLabel='Credit / Active Hour';
      if(metric==='credit'){value=credit;metricLabel='Total Credit';}
      else if(metric==='picks'){value=picks;metricLabel='Total Picks';}
      else if(metric==='elapsedRate'){value=elapsedSeconds>0?credit/(elapsedSeconds/3600):0;metricLabel='Credit / Elapsed Hour';}
      else{value=activeSeconds>0?credit/(activeSeconds/3600):0;metricLabel='Credit / Active Hour';}
      if(Number.isFinite(value)&&value>=0)points.push({date:day.operationalDate,value,credit,picks,activeHours:activeSeconds/3600,elapsedHours:elapsedSeconds/3600,label,metricLabel});
    }
    return points;
  }
  function drawInteractiveTrend(canvas,tooltip,days,scope,key,metric){
    if(!canvas)return;const ctx=canvas.getContext('2d'),dpr=Math.max(1,window.devicePixelRatio||1),rect=canvas.getBoundingClientRect(),points=trendSeries(days,scope,key,metric);
    canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);
    const width=rect.width,height=rect.height,pad={left:60,right:22,top:25,bottom:39};ctx.clearRect(0,0,width,height);canvas._trendPoints=[];
    ctx.font='11px Arial';ctx.fillStyle='#7690a8';
    if(points.length<2){ctx.textAlign='center';ctx.fillText('At least two stored days are needed for this selection.',width/2,height/2);return;}
    const values=points.map(point=>point.value),rawMin=Math.min(...values),rawMax=Math.max(...values),spread=Math.max(1,rawMax-rawMin),min=Math.max(0,rawMin-spread*.18),max=rawMax+spread*.18,range=Math.max(1,max-min);
    ctx.strokeStyle='#244B61';ctx.lineWidth=1;ctx.textAlign='right';ctx.textBaseline='middle';
    for(let index=0;index<=5;index++){const y=pad.top+(height-pad.top-pad.bottom)*index/5,value=max-range*index/5;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(width-pad.right,y);ctx.stroke();ctx.fillStyle='#7690a8';ctx.fillText(metric==='credit'||metric==='picks'?fmt(Math.round(value)):value.toFixed(1),pad.left-9,y);}
    const xFor=index=>pad.left+(width-pad.left-pad.right)*index/(points.length-1),yFor=value=>pad.top+(height-pad.top-pad.bottom)*(max-value)/range;
    const gradient=ctx.createLinearGradient(0,pad.top,0,height-pad.bottom);gradient.addColorStop(0,'rgba(62,207,142,.22)');gradient.addColorStop(1,'rgba(62,207,142,0)');
    ctx.beginPath();points.forEach((point,index)=>{const x=xFor(index),y=yFor(point.value);index?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.lineTo(xFor(points.length-1),height-pad.bottom);ctx.lineTo(xFor(0),height-pad.bottom);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
    ctx.strokeStyle='#3ECF8E';ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();points.forEach((point,index)=>{const x=xFor(index),y=yFor(point.value);index?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    points.forEach((point,index)=>{const x=xFor(index),y=yFor(point.value);canvas._trendPoints.push({...point,x,y});ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle='#3ECF8E';ctx.fill();ctx.strokeStyle='#10151D';ctx.lineWidth=2;ctx.stroke();});
    ctx.fillStyle='#8496AB';ctx.textAlign='center';ctx.textBaseline='top';const step=Math.max(1,Math.ceil(points.length/8));points.forEach((point,index)=>{if(index%step===0||index===points.length-1)ctx.fillText(point.date.slice(5),xFor(index),height-pad.bottom+10);});
    const showPoint=event=>{const bounds=canvas.getBoundingClientRect(),mx=event.clientX-bounds.left,my=event.clientY-bounds.top;let nearest=null,distance=Infinity;for(const point of canvas._trendPoints){const current=Math.hypot(point.x-mx,point.y-my);if(current<distance){distance=current;nearest=point;}}if(!nearest||distance>24){tooltip.hidden=true;return;}tooltip.hidden=false;tooltip.innerHTML=`<b>${esc(nearest.label)}</b><span>${esc(nearest.date)}</span><strong>${esc(nearest.metricLabel)}: ${nearest.metricLabel.includes('Hour')?creditFmt(nearest.value):fmt(Math.round(nearest.value))}</strong><span>Credit: ${creditFmt(nearest.credit)} · Picks: ${fmt(nearest.picks)}</span><span>Active Hours: ${creditFmt(nearest.activeHours)}${nearest.elapsedHours?` · Elapsed: ${creditFmt(nearest.elapsedHours)}`:''}</span>`;let left=nearest.x+14,top=nearest.y-35;if(left+250>bounds.width)left=nearest.x-260;if(top<5)top=5;tooltip.style.left=`${left}px`;tooltip.style.top=`${top}px`;};
    canvas.onmousemove=showPoint;canvas.onmouseleave=()=>{tooltip.hidden=true;};
  }
  function openTrends(){
    captureDailyHistory();const d=state.frame.contentDocument;d.getElementById('trendShade')?.remove();const days=historyRows(),latest=days.at(-1),prior=days.at(-2);
    const credit=day=>n(day?.creditProduced||(day?.pickers||[]).reduce((sum,p)=>sum+n(p.totalCredit),0)),hours=day=>n(day?.activeSeconds||(day?.pickers||[]).reduce((sum,p)=>sum+n(p.activeSeconds),0))/3600;
    const latestCredit=credit(latest),latestHours=hours(latest),latestRate=latestHours?latestCredit/latestHours:0,priorRate=hours(prior)?credit(prior)/hours(prior):0,leftRows=trackedWorkLeftRows();
    const shade=d.createElement('div');shade.id='trendShade';shade.className='detailShade';shade.innerHTML=`<section class="detailBox"><header class="detailHead"><div><h2>Historical Performance Trends</h2><p>${days.length} operational day${days.length===1?'':'s'} stored in this browser</p></div><div class="detailActions"><button id="exportAssociateCsv">Export Associate CSV</button><button id="exportHistory">Export JSON Backup</button><button id="trendClose">Close</button></div></header><div class="detailBody"><div class="trendKpis compact"><div><span>Credit Produced</span><b>${creditFmt(latestCredit)}</b></div><div><span>Active Picking Hours</span><b>${creditFmt(latestHours)}</b></div><div><span>Credit / Active Hour</span><b>${creditFmt(latestRate)}</b><small>${priorRate?`${((latestRate/priorRate-1)*100).toFixed(1)}% vs prior day`:'No prior-day comparison'}</small></div></div><h3>Work Left</h3><div class="workLeftKpis">${leftRows.map(row=>`<div><span>${esc(row.name)} LEFT${row.partial?' *':''}</span><b>${fmt(row.count)}</b></div>`).join('')}</div><div class="trendChartHeading"><div><h3 id="trendChartTitle">Credit per Active Hour Trend</h3><p>Hover over a point for date, credit, picks, and hours.</p></div><div class="trendFilters"><label>View<select id="trendScope"><option value="overall">Overall</option><option value="area">Area</option><option value="associate">Associate</option></select></label><label id="trendEntityLabel" hidden>Selection<select id="trendEntity"></select></label><label>Metric<select id="trendMetric"><option value="activeRate">Credit / Active Hour</option><option value="elapsedRate">Credit / Elapsed Hour</option><option value="credit">Total Credit</option><option value="picks">Total Picks</option></select></label><label>Days<select id="trendDays"><option value="14">14</option><option value="30" selected>30</option><option value="60">60</option></select></label></div></div><div class="trendChartWrap"><canvas id="creditRateTrend"></canvas><div id="trendTooltip" class="trendTooltip" hidden></div></div><h3>Individual Daily Credit and Rate</h3><table><thead><tr><th>Date</th><th>Picker</th><th>Group</th><th>Credit</th><th>Active Hours</th><th>Credit/Active Hr</th><th>Elapsed Hours</th><th>Credit/Elapsed Hr</th><th>Goal %</th></tr></thead><tbody>${days.slice(-30).reverse().flatMap(day=>(day.pickers||[]).sort((x,y)=>y.totalCredit-x.totalCredit).map(p=>`<tr><td>${esc(day.operationalDate)}</td><td>${esc(p.username)}</td><td>${esc(p.group)}</td><td>${creditFmt(p.totalCredit)}</td><td>${creditFmt(n(p.activeSeconds)/3600)}</td><td>${creditFmt(p.creditPerActiveHour)}</td><td>${creditFmt(n(p.elapsedSeconds)/3600)}</td><td>${creditFmt(p.creditPerElapsedHour)}</td><td>${p.goalPercent===null||p.goalPercent===undefined?'--':`${Math.round(p.goalPercent)}%`}</td></tr>`)).join('')||'<tr><td colspan="9">History will populate as the dashboard refreshes.</td></tr>'}</tbody></table><h3>Area Weighted Credit per Active Hour</h3><p class="detailNote">Header Paper, Header Water, and Bags are excluded from zone efficiency.</p><table><thead><tr><th>Date</th><th>Area</th><th>Picks</th><th>Credit</th><th>Active Hours</th><th>Weighted Credit/Hour</th></tr></thead><tbody>${days.slice(-30).reverse().flatMap(day=>(day.areas||[]).filter(area=>!NON_ZONE_EFFICIENCY_AREAS.has(canonicalAreaKey(area.area))).map(area=>`<tr><td>${esc(day.operationalDate)}</td><td>${esc(area.area)}</td><td>${fmt(area.picks)}</td><td>${creditFmt(area.credit)}</td><td>${creditFmt(n(area.activeSeconds)/3600)}</td><td>${creditFmt(area.creditPerActiveHour)}</td></tr>`)).join('')||'<tr><td colspan="6">No area history yet.</td></tr>'}</tbody></table><h3>Vision API Ping Samples</h3><table><thead><tr><th>Timestamp</th><th>Status</th><th>Ping</th><th>HTTP</th><th>Payload</th></tr></thead><tbody>${state.pingHistory.slice(-48).reverse().map(ping=>`<tr><td>${esc(new Date(ping.capturedAt).toLocaleString())}</td><td>${ping.success?'OK':'FAILED'}</td><td>${ping.ms===null?'--':`${fmt(ping.ms)} ms`}</td><td>${esc(ping.httpStatus||'--')}</td><td>${ping.bytes?`${fmt(ping.bytes)} bytes`:'--'}</td></tr>`).join('')||'<tr><td colspan="5">The first ping sample will be recorded from a Vision refresh.</td></tr>'}</tbody></table></div></section>`;
    d.body.appendChild(shade);shade.querySelector('#trendClose').onclick=()=>shade.remove();shade.querySelector('#exportHistory').onclick=exportHistoricalData;shade.querySelector('#exportAssociateCsv').onclick=()=>{try{const count=exportAssociateHistoryCsv();shade.querySelector('#exportAssociateCsv').textContent=`Exported ${count} Rows`;}catch(error){shade.querySelector('#exportAssociateCsv').textContent=error.message||String(error);}};const scope=shade.querySelector('#trendScope'),entity=shade.querySelector('#trendEntity'),entityLabel=shade.querySelector('#trendEntityLabel'),metric=shade.querySelector('#trendMetric'),dayFilter=shade.querySelector('#trendDays'),canvas=shade.querySelector('#creditRateTrend'),tooltip=shade.querySelector('#trendTooltip'),title=shade.querySelector('#trendChartTitle');
    const areaOptions=[...new Set(days.flatMap(day=>(day.areas||[]).filter(item=>!NON_ZONE_EFFICIENCY_AREAS.has(canonicalAreaKey(item.area))).map(item=>item.area)))].sort();
    const associateOptions=[...new Set(days.flatMap(day=>(day.pickers||[]).map(item=>item.username)))].sort();
    const refill=()=>{const values=scope.value==='area'?areaOptions:associateOptions;entity.innerHTML=values.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');entityLabel.hidden=scope.value==='overall';};
    const redraw=()=>{const selectedDays=days.slice(-Number(dayFilter.value||30)),scopeText=scope.options[scope.selectedIndex].text,metricText=metric.options[metric.selectedIndex].text;title.textContent=`${metricText} Trend · ${scopeText}${scope.value==='overall'?'':` · ${entity.value}`}`;drawInteractiveTrend(canvas,tooltip,selectedDays,scope.value,entity.value,metric.value);};
    scope.onchange=()=>{refill();redraw();};entity.onchange=redraw;metric.onchange=redraw;dayFilter.onchange=redraw;refill();requestAnimationFrame(redraw);
  }
  const minutesAgo = d => d ? Math.max(0,(Date.now()-d.getTime())/60000) : 99999;
  function captureToken(value) {
    const match = String(value || '').match(/^Token\s+(.+)$/i);
    if (match && match[1].length > 10) state.token = match[1].trim();
  }
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init={}) {
    try { const h = new Headers(init.headers || (input instanceof Request ? input.headers : undefined)); captureToken(h.get('authorization')); } catch (_) {}
    return nativeFetch(input, init);
  };
  const nativeSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(name,value) { if (String(name).toLowerCase()==='authorization') captureToken(value); return nativeSetHeader.apply(this,arguments); };
  function scanToken() {
    for (const store of [localStorage,sessionStorage]) try {
      for (let i=0;i<store.length;i++) { const key=store.key(i), value=store.getItem(key)||''; captureToken(value); if (!state.token && /token|auth/i.test(key)) { try { const stack=[JSON.parse(value)]; while(stack.length&&!state.token){const x=stack.pop();if(typeof x==='string')captureToken(x);else if(x&&typeof x==='object')Object.values(x).forEach(v=>stack.push(v));} } catch(_){} } }
    } catch(_){}
  }
  function apiUrl(date) { const u=new URL(CONFIG.apiPath,location.origin);u.searchParams.append('date_range',date);u.searchParams.append('date_range',date);u.searchParams.set('count','1');return u; }
  async function fetchVision(date,controller){
    scanToken();const started=performance.now();
    try{
      const json=await withRetry(async attempt=>{
        const timeout=setTimeout(()=>controller.abort(),CONFIG.timeoutMs);
        try{const headers={accept:'application/json, text/plain, */*'};if(state.token)headers.authorization=`Token ${state.token}`;
          const requestStarted=performance.now();const response=await nativeFetch(apiUrl(date),{credentials:'include',cache:'no-store',headers,signal:controller.signal});
          if(/\/login(\?|\/|$)/i.test(response.url||'')){savePingSample({success:false,ms:Math.round(performance.now()-requestStarted),httpStatus:response.status,bytes:0});const error=new Error('Vision session is not logged in.');error.code='VISION_LOGIN_REQUIRED';error.retryable=false;throw error;}
          if(!response.ok){savePingSample({success:false,ms:Math.round(performance.now()-requestStarted),httpStatus:response.status,bytes:0});const message=response.status===401||response.status===403?'Vision authorization not captured. Refresh Associate Productivity once.':`Vision API HTTP ${response.status}`;const error=new Error(message);error.status=response.status;error.retryable=retryableStatus(response.status);if(response.status===401||response.status===403)error.code='VISION_LOGIN_REQUIRED';throw error;}
          const text=await response.text();state.responseBytes=new Blob([text]).size;
          if(/^\s*</.test(text)){savePingSample({success:false,ms:Math.round(performance.now()-requestStarted),httpStatus:response.status,bytes:state.responseBytes});const error=new Error('Vision returned a login page instead of data.');error.code='VISION_LOGIN_REQUIRED';error.retryable=false;throw error;}
          savePingSample({success:true,ms:Math.round(performance.now()-requestStarted),httpStatus:response.status,bytes:state.responseBytes});
          let data;try{data=JSON.parse(text);}catch(parseError){const error=new Error('Vision response could not be parsed. The session may have expired.');error.code='VISION_LOGIN_REQUIRED';error.retryable=false;throw error;}
          if(!Array.isArray(data.associateDetails))throw new Error('associateDetails missing from Vision response.');return data;
        }finally{clearTimeout(timeout);}
      },{attempts:3,delays:[2000,5000],onRetry:(error,attempt)=>setSourceHealth('vision','Vision Productivity',false,`${error.message}; retry ${attempt} pending`)});
      state.lastDuration=Math.round(performance.now()-started);setSourceHealth('vision','Vision Productivity',true);return json;
    }catch(error){setSourceHealth('vision','Vision Productivity',false,error.message||String(error));throw error;}
  }
  function fetchZoneStatus(){
    if(typeof GM_xmlhttpRequest!=='function')return Promise.reject(new Error('Decision Point Zone Status connection is unavailable.'));
    return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url:CONFIG.zoneStatusUrl,timeout:20000,anonymous:false,onload:response=>{if(response.status>=200&&response.status<400){setSourceHealth('zoneStatus','Decision Point Zone Status',true);resolve(response.responseText);}else{const message=`Zone Status HTTP ${response.status}`;setSourceHealth('zoneStatus','Decision Point Zone Status',false,message);reject(new Error(message));}},onerror:()=>{const message='Zone Status connection failed.';setSourceHealth('zoneStatus','Decision Point Zone Status',false,message);reject(new Error(message));},ontimeout:()=>{const message='Zone Status request timed out.';setSourceHealth('zoneStatus','Decision Point Zone Status',false,message);reject(new Error(message));}}));
  }
  function parseZoneStatus(html){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const table=[...doc.querySelectorAll('table')].find(candidate=>{const text=String(candidate.tHead?.textContent||'').replace(/\s+/g,' ').toUpperCase();return text.includes('ZONE')&&text.includes('PRESCAN PENDING')&&text.includes('BATCH PENDING');});
    if(!table){const error=new Error('Zone Status table was not found. Log into Decision Point once.');error.code='DP_LOGIN_REQUIRED';throw error;}
    const headers=[...table.querySelectorAll('thead th, thead td')].map(cell=>String(cell.textContent||'').replace(/\s+/g,' ').trim().toUpperCase());
    const zoneIndex=headers.findIndex(value=>value==='ZONE'),prescanIndex=headers.findIndex(value=>value==='PRESCAN PENDING'),batchIndex=headers.findIndex(value=>value==='BATCH PENDING'),printedIndex=headers.findIndex(value=>value==='BATCH PRINTED');
    if(zoneIndex<0||prescanIndex<0||batchIndex<0||printedIndex<0)throw new Error('Zone Status columns were not recognized.');
    const rows={};
    for(const row of table.querySelectorAll('tbody tr')){
      if(row.cells.length<=Math.max(zoneIndex,prescanIndex,batchIndex,printedIndex))continue;
      const zone=String(row.cells[zoneIndex]?.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();if(!zone||zone==='TOTAL')continue;
      const number=index=>Math.max(0,Number(String(row.cells[index]?.textContent||'0').replace(/,/g,'').trim())||0);
      rows[zone]={prescan:number(prescanIndex),batch:number(batchIndex),printed:number(printedIndex)};
    }
    const sum=(zones,column)=>zones.reduce((total,zone)=>total+n(rows[zone]?.[column]),0);
    const pickLeft=zones=>sum(zones,'batch')+sum(zones,'printed');
    return [
      {id:'header',name:'HEADER',count:sum(['FLOOR','MATS','MATS FURNITURE','LIQUID','BOARDS','PICK BY PALLET'],'prescan'),partial:false},
      {id:'unit_pick',name:'UNIT PICK',count:pickLeft(['UNIT PICK','HAZMAT']),partial:false},
      {id:'pick_to_belt',name:'PICK TO BELT',count:pickLeft(['PTB HIGH','PTB LOW']),partial:false},
      {id:'calendars',name:'CALENDARS',count:pickLeft(['CALENDAR']),partial:false},
      {id:'reserve',name:'RESERVE',count:pickLeft(['RESERVE','RESERVE2']),partial:false}
    ];
  }
  async function refreshWorkLeft(date=state.selectedDate||operationalDate()){
    if(state.workLeftRefreshing)return;state.workLeftRefreshing=true;renderStatus();
    try{
      const html=await fetchZoneStatus(),totals=parseZoneStatus(html);
      if(date!==state.selectedDate)return;
      state.workLeftTotals=totals;state.workLeftError='';state.workLeftLastRefresh=new Date();state.dpLoginFlags.zoneStatus=false;state.dpLastDataAt=new Date();captureDailyHistory();renderTicker();renderStatus();renderLoginBanner();
    }catch(error){state.workLeftError=error.message||String(error);state.dpLoginFlags.zoneStatus=error.code==='DP_LOGIN_REQUIRED';setSourceHealth('zoneStatus','Decision Point Zone Status',false,state.workLeftError);renderStatus();renderLoginBanner();}
    finally{state.workLeftRefreshing=false;renderStatus();}
  }
  function restartWorkLeftTimer(){clearInterval(state.workLeftTimer);state.workLeftTimer=null;if(!state.running)return;state.workLeftTimer=setInterval(()=>{if(state.selectedDate===operationalDate())refreshWorkLeft();},state.workLeftRefreshSeconds*1000);}
  const isBulkUser = a => String(a?.label || '').includes('!');
  const rawAreaName = d => {const classified=headerAreaFromVisionDetail(d);if(classified==='__EXCLUDED_CLASSIFICATION__')return classified;return classified||String(d?.work_location||d?.area||'UNASSIGNED').trim().replace(/\s+/g,' ').toUpperCase()||'UNASSIGNED';};
  const areaName = d => canonicalAreaKey(rawAreaName(d));
  const areaEnabled = area => state.enabledAreas[String(area||'').trim().toUpperCase()] !== false;
  function canonicalAreaKey(value){const key=String(value||'').trim().replace(/\s+/g,' ').toUpperCase();return key==='CALENDARS'?'CALENDARS':key;}
  function displayAreaName(value){const key=canonicalAreaKey(value);if(key==='HEADER PAPER')return 'Header Paper';if(key==='HEADER WATER')return 'Header Water';if(key==='BAGS')return 'Bags';if(key==='CALENDARS')return 'Calendars';return key;}
  function mergeAreaSettings(){
    const rates={},enabled={},aliases={};
    for(const [key,value] of Object.entries(state.creditRates||{})){const canonical=canonicalAreaKey(key);if(canonical&&rates[canonical]===undefined)rates[canonical]=n(value);}
    for(const [key,value] of Object.entries(state.enabledAreas||{})){const canonical=canonicalAreaKey(key);if(canonical)enabled[canonical]=(enabled[canonical]!==false)&&(value!==false);}
    for(const [key,value] of Object.entries(state.areaAliases||{})){const from=canonicalAreaKey(key),to=canonicalAreaKey(value);if(from&&to)aliases[from]=to;}
    // v1.5 migration: merge any prior mapped-area settings into the detected source area, then remove aliases.
    for(const [from,to] of Object.entries(aliases)){
      if(rates[from]===undefined&&rates[to]!==undefined)rates[from]=rates[to];
      if(enabled[from]===undefined&&enabled[to]!==undefined)enabled[from]=enabled[to];
    }
    state.creditRates=rates;state.enabledAreas=enabled;state.areaAliases={};
  }
  const pickQty = d => {const values=[d?.adjusted_unit_quantity,d?.unit_quantity,d?.carton_count,d?.cartons,d?.case_quantity,d?.quantity];for(const value of values){const amount=Number(value);if(Number.isFinite(amount)&&amount>0)return amount;}return 0;};
  function isPickRecord(d) {
    const job=String(d?.job_function?.display_value || d?.label || '').toLowerCase();
    return pickQty(d)>0 && rawAreaName(d)!=='__EXCLUDED_CLASSIFICATION__' && !/lunch|break|downtime|indirect|off.?standard/.test(job);
  }
  function isBreakOrLunchRecord(d) {
    const job=String(d?.job_function?.display_value || d?.label || '').toLowerCase();
    return /lunch|break/.test(job);
  }
  function recordDurationSeconds(d) {
    const working=n(d?.working_seconds);
    if(working>0)return working;
    const start=parseDate(d?.start),end=parseDate(d?.end);
    return start&&end?Math.max(0,(end-start)/1000):0;
  }
  const creditRate = area => Math.max(0,n(state.creditRates[String(area).toUpperCase()]));
  function minutesFromTime(value){
    const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/);
    if(!match)return null;
    const hours=Number(match[1]),minutes=Number(match[2]);
    return hours>=0&&hours<24&&minutes>=0&&minutes<60?hours*60+minutes:null;
  }
  function timeInGroupRange(minutes,start,end){
    if(minutes===null||start===null||end===null)return false;
    return start<=end ? minutes>=start&&minutes<=end : minutes>=start||minutes<=end;
  }
  function firstPickDate(records){
    return (records||[]).map(r=>parseDate(r.start)).filter(Boolean).sort((a,b)=>a-b)[0]||null;
  }
  function groupForFirstPick(date){
    if(!date)return null;
    const value=date.getHours()*60+date.getMinutes();
    return state.pickerGroups.find(group=>timeInGroupRange(value,minutesFromTime(group.start),minutesFromTime(group.end)))||null;
  }
  function normalizeColor(value){return /^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toUpperCase():'#5b8def';}
  function readableColor(hex){const value=normalizeColor(hex).slice(1),r=parseInt(value.slice(0,2),16),g=parseInt(value.slice(2,4),16),b=parseInt(value.slice(4,6),16);return (r*299+g*587+b*114)/1000>=150?'#0E131C':'#FFFFFF';}
  function normalizeGroupAbbreviation(value,name=''){return String(value||'').replace(/\s+/g,'').toUpperCase().slice(0,8)||String(name||'').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').toUpperCase().slice(0,4)||'GRP';}
  function normalizePickerGroups(raw=[]){
    const groups=[];
    for(const item of Array.isArray(raw)?raw:[]){
      const name=String(item?.name||'').trim().replace(/\s+/g,' ').slice(0,40);
      const start=/^\d{2}:\d{2}$/.test(String(item?.start||''))?String(item.start):'00:00';
      const end=/^\d{2}:\d{2}$/.test(String(item?.end||''))?String(item.end):'23:59';
      if(!name)continue;
      groups.push({id:String(item?.id||`group_${Date.now()}_${groups.length}`),name,abbreviation:normalizeGroupAbbreviation(item?.abbreviation,name),start,end,color:normalizeColor(item?.color)});
    }
    return groups;
  }
  function fetchPrescanReport(dateText){
    if(typeof GM_xmlhttpRequest!=='function')return Promise.reject(new Error('Decision Point Prescan connection is unavailable.'));
    const url=`${CONFIG.prescanUrl}?CreatedDate=${encodeURIComponent(mmddyyyy(dateText))}`;
    return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,timeout:25000,anonymous:false,onload:r=>r.status>=200&&r.status<400?resolve(r.responseText):reject(new Error(`Prescan HTTP ${r.status}`)),onerror:()=>reject(new Error('Prescan connection failed.')),ontimeout:()=>reject(new Error('Prescan request timed out.'))}));
  }
  function parsePrescanReport(html){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const table=doc.querySelector('#tblAssets')||[...doc.querySelectorAll('table')].find(t=>/pallet type/i.test(t.tHead?.textContent||'')&&/carton count/i.test(t.tHead?.textContent||'')&&/allocated to/i.test(t.tHead?.textContent||''));
    if(!table){const error=new Error('Prescan detail table was not found. Log into Decision Point Bulk & Case once.');error.code='DP_LOGIN_REQUIRED';throw error;}
    const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.replace(/\s+/g,' ').trim().toLowerCase());
    const index=name=>headers.findIndex(h=>h===name||h.includes(name));
    const indexes={id:index('palletid'),type:index('pallet type'),count:index('carton count'),picker:index('allocated to')};
    if(indexes.type<0||indexes.count<0||indexes.picker<0)throw new Error('Prescan columns were not recognized.');
    return [...table.querySelectorAll('tbody tr')].map(row=>{
      const cells=[...row.cells],text=key=>indexes[key]>=0?(cells[indexes[key]]?.textContent||'').replace(/\s+/g,' ').trim():'';
      const palletId=text('id');if(!/^\d+$/.test(palletId))return null;
      const picker=text('picker'),palletType=text('type').toUpperCase(),cartons=Math.max(0,Number(text('count').replace(/,/g,''))||0);
      if(!cartons||!palletType)return null;
      const match=classificationFromValue(palletType);
      if(!match||match.exclude)return null;
      return {palletId,picker,pickerKey:picker.toLowerCase(),allocated:!!picker,palletType,cartons,area:match.area};
    }).filter(Boolean);
  }
  function applyPrescanHeaderProduction(areas,label){
    const pickerKey=String(label||'').trim().toLowerCase();
    const totals={};
    for(const row of state.prescanRows.filter(row=>row.allocated&&row.pickerKey===pickerKey))totals[row.area]=(totals[row.area]||0)+row.cartons;
    for(const [displayArea,cartons] of Object.entries(totals)){
      const area=canonicalAreaKey(displayArea);if(!areaEnabled(area))continue;
      if(!areas[area])areas[area]={area,picks:0,credit:0,isHighVolume:false,isPrescan:true};
      areas[area].picks+=cartons;areas[area].credit+=cartons*creditRate(area);areas[area].isPrescan=true;
    }
  }
  function mmddyyyy(dateText){const [year,month,day]=String(dateText).split('-');return `${month}/${day}/${year}`;}
  function fetchHighVolumeReport(dateText){
    if(typeof GM_xmlhttpRequest!=='function')return Promise.reject(new Error('Decision Point connection is unavailable in this script runner.'));
    const url=`${CONFIG.highVolumeUrl}?SelectedDate=${encodeURIComponent(mmddyyyy(dateText))}`;
    return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,timeout:20000,anonymous:false,onload:r=>r.status>=200&&r.status<400?resolve(r.responseText):reject(new Error(`High Volume HTTP ${r.status}`)),onerror:()=>reject(new Error('High Volume connection failed.')),ontimeout:()=>reject(new Error('High Volume request timed out.'))}));
  }
  function highVolumeBaseArea(zone){
    const text=String(zone||'').trim().toUpperCase();
    if(text==='FLOOR'||text==='BULK'||text.startsWith('FLOOR '))return 'BULK';
    if(/^PTB\b/.test(text)||text.includes('PICK TO BELT'))return 'PICK TO BELT';
    if(/^RESERVE(?:\s*\d+)?$/.test(text))return 'RESERVE';
    return canonicalAreaKey(text);
  }
  function highVolumeDisplayArea(baseArea){return `HIGH VOLUME ${displayAreaName(baseArea)}`;}
  function parseHighVolumeReport(html){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const table=doc.querySelector('#tblAssets')||[...doc.querySelectorAll('table')].find(t=>/batch size/i.test(t.tHead?.textContent||'')&&/picker/i.test(t.tHead?.textContent||''));
    if(!table){const error=new Error('High Volume report table was not found. Log into Decision Point Bulk & Case once.');error.code='DP_LOGIN_REQUIRED';throw error;}
    const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.replace(/\s+/g,' ').trim().toLowerCase());
    const index=name=>headers.findIndex(h=>h===name||h.includes(name));
    const indexes={type:index('batch type'),size:index('batch size'),picker:index('picker'),zone:index('zone'),batch:index('batch id')};
    return [...table.querySelectorAll('tbody tr')].map(row=>{
      const cells=[...row.cells],text=key=>indexes[key]>=0?(cells[indexes[key]]?.textContent||'').replace(/\s+/g,' ').trim():'';
      const batchId=text('batch');
      if(!/^\d+$/.test(batchId)||!/high volume/i.test(text('type')))return null;
      const picker=text('picker'),size=Math.max(0,Number(text('size').replace(/,/g,''))||0),baseArea=highVolumeBaseArea(text('zone'));
      if(!size||!baseArea)return null;
      return {batchId,picker,pickerKey:picker.toLowerCase(),size,zone:text('zone'),baseArea};
    }).filter(Boolean);
  }
  function parseHighVolumeBatchDetail(html,batch){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const table=doc.querySelector('#tblAssets')||[...doc.querySelectorAll('table')].find(candidate=>/carton number/i.test(candidate.tHead?.textContent||'')&&/status/i.test(candidate.tHead?.textContent||'')&&/picker/i.test(candidate.tHead?.textContent||''));
    if(!table){const error=new Error(`Batch ${batch.batchId} details were not found. Log into Decision Point Bulk & Case once.`);error.code='DP_LOGIN_REQUIRED';throw error;}
    const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.replace(/\s+/g,' ').trim().toLowerCase());
    const index=name=>headers.findIndex(header=>header===name||header.includes(name));
    const indexes={carton:index('carton number'),status:index('status'),picker:index('picker'),picked:index('picked')};
    if(indexes.carton<0||indexes.status<0||indexes.picker<0||indexes.picked<0)throw new Error(`Batch ${batch.batchId} detail columns were not recognized.`);
    const rows=[...table.querySelectorAll('tbody tr')].map(row=>{
      const cells=[...row.cells],text=key=>(cells[indexes[key]]?.textContent||'').replace(/\s+/g,' ').trim();
      return {carton:text('carton'),status:text('status'),picker:text('picker'),pickedAt:text('picked')};
    }).filter(row=>row.carton);
    const wasPicked=row=>Boolean(row.pickedAt)||/^(picked|complete|completed)$/i.test(row.status);
    const allocations={};
    for(const row of rows){
      if(!row.picker||!wasPicked(row))continue;
      const pickerKey=row.picker.toLowerCase();
      if(!allocations[pickerKey])allocations[pickerKey]={picker:row.picker,pickerKey,cartons:new Set()};
      allocations[pickerKey].cartons.add(row.carton);
    }
    return {allocations:Object.values(allocations).map(({cartons,...allocation})=>({...allocation,picks:cartons.size})),complete:rows.length>0&&rows.every(row=>row.picker&&wasPicked(row))};
  }
  function fetchHighVolumeBatchDetail(batchId){
    if(typeof GM_xmlhttpRequest!=='function')return Promise.reject(new Error('Decision Point batch details are unavailable in this script runner.'));
    const url=`${CONFIG.highVolumeBatchDetailUrl}${encodeURIComponent(batchId)}`;
    return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,timeout:20000,anonymous:false,onload:r=>r.status>=200&&r.status<400?resolve(r.responseText):reject(new Error(`Batch ${batchId} detail HTTP ${r.status}`)),onerror:()=>reject(new Error(`Batch ${batchId} detail connection failed.`)),ontimeout:()=>reject(new Error(`Batch ${batchId} detail request timed out.`))}));
  }
  async function highVolumePickedRows(reportRows,dateText){
    const batches=[...new Map(reportRows.map(row=>[row.batchId,row])).values()],allocations=[];let firstError='';
    await runWithConcurrency(batches,6,async batch=>{
      const cacheKey=`${dateText}|${batch.batchId}`;let detail=state.highVolumeBatchDetailCache[cacheKey];
      if(!detail?.complete&&(!detail?.fetchedAt||Date.now()-detail.fetchedAt>=60000)){
        try{
          const html=await fetchHighVolumeBatchDetail(batch.batchId);
          detail={...parseHighVolumeBatchDetail(html,batch),fetchedAt:Date.now()};state.highVolumeBatchDetailCache[cacheKey]=detail;
        }catch(error){firstError=firstError||error.message||String(error);}
      }
      for(const allocation of detail?.allocations||[])allocations.push({...batch,...allocation});
    });
    return {allocations,error:firstError};
  }
  function highVolumeForPicker(label){return state.highVolumeRows.filter(row=>row.pickerKey===String(label||'').trim().toLowerCase());}
  function applyHighVolumeReclassification(areas,label){
    const rows=highVolumeForPicker(label);
    if(!rows.length)return;
    const byBase={};for(const row of rows)byBase[row.baseArea]=(byBase[row.baseArea]||0)+n(row.picks);
    for(const [baseArea,reported] of Object.entries(byBase)){
      const regular=areas[baseArea];
      if(!regular)continue;
      const moved=Math.min(regular.picks,reported);
      if(moved<=0)continue;
      regular.picks-=moved;regular.credit=regular.picks*creditRate(baseArea);
      const hvArea=highVolumeDisplayArea(baseArea),multiplier=Math.max(0,n(state.highVolumeMultiplier));
      areas[hvArea]={area:hvArea,picks:moved,credit:moved*creditRate(baseArea)*multiplier,isHighVolume:true,baseArea};
      if(regular.picks<=0)delete areas[baseArea];
    }
  }
  function loadAdjustmentHistory(){try{const x=JSON.parse(localStorage.getItem(CONFIG.adjustmentHistoryKey)||'[]');state.manualAdjustments=Array.isArray(x)?x:[]}catch(_){state.manualAdjustments=[]}}
  const adjustmentsForPicker=label=>state.manualAdjustments.filter(x=>!x.deletedAt&&x.pickerKey===String(label).toLowerCase()&&x.operationalDate===(state.selectedDate||operationalDate()));
  function applyManualAdjustments(areas,label){for(const x of adjustmentsForPicker(label)){const key=`MANUAL: ${x.name.toUpperCase()}::${x.id}`;areas[key]={area:`MANUAL: ${x.name.toUpperCase()}`,picks:n(x.lines),credit:n(x.lines)*n(x.creditPerLine),isManual:true,isRemoval:n(x.lines)<0,adjustmentId:x.id};}}
  function saveAdjustmentsCache(){localStorage.setItem(CONFIG.adjustmentHistoryKey,JSON.stringify(state.manualAdjustments));}
  function adjustmentsByDate(list){const out={};for(const item of list){const key=item.operationalDate;if(!key)continue;(out[key]=out[key]||[]).push(item);}return out;}
  async function readAdjustmentFolderFiles(handle){
    const parsedByDate={};
    const presentDates=new Set();
    if(!handle)return {parsedByDate,presentDates};
    try{
      const toCheck=[];
      for await (const [name,entry] of handle.entries()){
        if(entry.kind!=='file'||!name.startsWith(CONFIG.adjustmentFilePrefix)||!name.endsWith('.json'))continue;
        const dateKey=name.slice(CONFIG.adjustmentFilePrefix.length,-5);
        if(!/^\d{4}-\d{2}-\d{2}$/.test(dateKey))continue;
        presentDates.add(dateKey);
        toCheck.push([name,entry,dateKey]);
      }
      await runWithConcurrency(toCheck,8,async([name,entry,dateKey])=>{
        try{
          const file=await entry.getFile();
          // Adjustment files can gain new items from another PC without changing name, so use the
          // filesystem's own lastModified timestamp to skip re-parsing files that haven't changed
          // since our last successful read, instead of re-downloading+parsing every file every cycle.
          if(state.adjustmentFileModTimes[name]===file.lastModified)return;
          const parsed=JSON.parse(await file.text());
          const list=parsed&&parsed.format==='VisionBulkAdjustmentsDay'&&Array.isArray(parsed.adjustments)?parsed.adjustments:null;
          if(list){
            parsedByDate[dateKey]=list;
            state.adjustmentFileModTimes[name]=file.lastModified;
            state.adjustmentFileItemCounts[dateKey]=list.length;
          }
        }catch(_){}
      });
    }catch(_){}
    return {parsedByDate,presentDates};
  }
  async function writeAdjustmentDayFile(handle,dateKey,adjustmentsForDay){
    if(!handle||!dateKey)return false;
    try{
      const fileHandle=await handle.getFileHandle(`${CONFIG.adjustmentFilePrefix}${dateKey}.json`,{create:true});
      const writable=await fileHandle.createWritable();
      await writable.write(JSON.stringify({format:'VisionBulkAdjustmentsDay',schemaVersion:1,updatedAt:new Date().toISOString(),adjustments:adjustmentsForDay},null,2));
      await writable.close();
      return true;
    }catch(error){state.historyDirError=error.message||String(error);return false;}
  }
  async function syncAdjustmentsWithFolder(handle){
    try{
      const {parsedByDate,presentDates}=await readAdjustmentFolderFiles(handle);
      const merged=new Map(state.manualAdjustments.map(item=>[item.id,item]));
      let changed=false;
      for(const list of Object.values(parsedByDate))for(const item of list){const existing=merged.get(item.id);if(!existing){merged.set(item.id,item);changed=true;}else if(item.deletedAt&&!existing.deletedAt){merged.set(item.id,item);changed=true;}}
      if(changed){
        state.manualAdjustments=[...merged.values()];
        saveAdjustmentsCache();
        if(state.data)processData(state.data);
        render();
      }
      const localByDate=adjustmentsByDate(state.manualAdjustments);
      const daysToWrite=Object.keys(localByDate).filter(dateKey=>{
        if(!presentDates.has(dateKey))return true;
        // File exists but we may have skipped re-parsing it (unchanged mtime); compare against the
        // item count we recorded the last time we actually parsed it, so unchanged files don't get
        // needlessly rewritten every cycle while genuine local-vs-folder drift is still caught.
        const knownCount=state.adjustmentFileItemCounts[dateKey];
        if(knownCount===undefined)return false;
        return localByDate[dateKey].length!==knownCount;
      });
      if(daysToWrite.length){
        await runWithConcurrency(daysToWrite,6,async dateKey=>{await writeAdjustmentDayFile(handle,dateKey,localByDate[dateKey]);state.adjustmentFileItemCounts[dateKey]=localByDate[dateKey].length;});
      }
    }catch(error){state.historyDirError=error.message||String(error);}
  }
  async function saveManualAdjustment(item){
    state.manualAdjustments.push(item);
    saveAdjustmentsCache();
    if(state.pickDataDirHandle&&state.historyDirStatus==='connected'){
      try{
        const dayList=adjustmentsByDate(state.manualAdjustments)[item.operationalDate]||[item];
        await writeAdjustmentDayFile(state.pickDataDirHandle,item.operationalDate,dayList);
      }catch(e){console.warn(e);}
    }
    if(state.data)processData(state.data);render();
  }
  function summarize(a) {
  async function deleteManualAdjustment(id){
    const item=state.manualAdjustments.find(adjustment=>String(adjustment.id)===String(id));
    if(!item||item.deletedAt)return false;
    item.deletedAt=new Date().toISOString();
    saveAdjustmentsCache();
    if(state.pickDataDirHandle&&state.historyDirStatus==='connected'){
      const dayList=adjustmentsByDate(state.manualAdjustments)[item.operationalDate]||[];
      await writeAdjustmentDayFile(state.pickDataDirHandle,item.operationalDate,dayList);
    }
    if(state.data)processData(state.data);render();
    return true;
  }
    if(!isBulkUser(a))return null;
    const all=(a.time_details||[]), picks=all.filter(isPickRecord); if(!picks.length)return null;
    const areas={};
    for(const d of picks){const area=areaName(d);if(!areaEnabled(area))continue;const qty=pickQty(d);if(!areas[area])areas[area]={area,picks:0,credit:0,isHighVolume:false};areas[area].picks+=qty;areas[area].credit+=qty*creditRate(area);}
    applyPrescanHeaderProduction(areas,a.label);
    applyHighVolumeReclassification(areas,a.label);
    applyManualAdjustments(areas,a.label);
    const ordered=[...all].sort((x,y)=>(parseDate(x.end)?.getTime()||0)-(parseDate(y.end)?.getTime()||0));
    const latest=ordered.at(-1), latestEnd=parseDate(latest?.end), totalPicks=Object.values(areas).reduce((s,x)=>s+x.picks,0), totalCredit=Object.values(areas).reduce((s,x)=>s+x.credit,0);
    const firstPick=firstPickDate(picks),pickerGroup=groupForFirstPick(firstPick);
    const includedPickRecords=picks.filter(d=>areaEnabled(areaName(d)));
    const workSeconds=includedPickRecords.reduce((sum,d)=>sum+n(d.working_seconds),0);
    const creditPerHour=workSeconds>0?totalCredit/(workSeconds/3600):0;
    const breakSeconds=all.filter(isBreakOrLunchRecord).reduce((sum,d)=>sum+recordDurationSeconds(d),0);
    return {id:a.id,label:a.label,fullName:a.full_name||'',employeeId:a.employee_id||'',areas:Object.values(areas).sort((x,y)=>y.credit-x.credit||y.picks-x.picks),totalPicks,totalCredit,workSeconds,creditPerHour,breakSeconds,latestEnd,currentArea:areaName(picks.at(-1)),firstPick,pickerGroup,active:minutesAgo(latestEnd)<=CONFIG.activeMinutes,all,allPickRecords:picks,includedPickRecords};
  }
  function pickerGroupForHistoricalRow(row){
    const savedGroup=String(row?.group||'').trim().toLowerCase();
    return state.pickerGroups.find(group=>String(group.name||'').trim().toLowerCase()===savedGroup)||null;
  }
  function historicalPickerFromSaved(row,index){
    const firstPick=parseDate(row?.firstPick),latestEnd=parseDate(row?.lastPick);
    const activeSeconds=n(row?.activeSeconds),elapsedSeconds=n(row?.elapsedSeconds);
    const totalCredit=n(row?.totalCredit),totalPicks=n(row?.totalPicks);
    const pickerGroup=pickerGroupForHistoricalRow(row);
    const areas=(row?.areas||[]).map(area=>({
      area:canonicalAreaKey(area.area),
      baseArea:canonicalAreaKey(area.area),
      picks:n(area.picks),
      credit:n(area.credit),
      isHighVolume:false,
      isPrescan:false,
      isManual:false
    })).sort((a,b)=>b.credit-a.credit||b.picks-a.picks);
    return {
      id:String(row?.id||row?.username||`historical_${index}`),
      label:String(row?.username||''),
      fullName:String(row?.fullName||''),
      employeeId:String(row?.employeeId||''),
      areas,
      totalPicks,
      totalCredit,
      workSeconds:activeSeconds,
      creditPerHour:activeSeconds>0?totalCredit/(activeSeconds/3600):n(row?.creditPerActiveHour),
      breakSeconds:Math.max(0,elapsedSeconds-activeSeconds),
      latestEnd,
      currentArea:areas[0]?.area||'HISTORICAL',
      firstPick,
      pickerGroup,
      active:false,
      all:[],
      allPickRecords:[],
      includedPickRecords:[],
      savedGoalHitTime:parseDate(row?.goalHitTime)
    };
  }
  function showSavedHistoricalPreview(date){
    const day=state.history?.[date];
    if(!day||!Array.isArray(day.pickers)||!day.pickers.length)return false;
    state.data=null;
    state.pickers=day.pickers.map(historicalPickerFromSaved).filter(p=>p.label);
    state.lastRefresh=day.capturedAt?parseDate(day.capturedAt):null;
    state.lastError='';
    state.showingHistoricalPreview=true;
    state.historicalPreviewDate=date;
    state.loadingWithoutSavedData=false;
    state.cardsSignature=state.rankingSignature=state.goalsSignature='';
    return true;
  }
  function clearDisplayedProductionData(){
    state.data=null;
    state.pickers=[];
    state.highVolumeRows=[];
    state.prescanRows=[];
    state.lastRefresh=null;
    state.lastError='';
    state.showingHistoricalPreview=false;
    state.historicalPreviewDate='';
    state.loadingWithoutSavedData=true;
    state.cardsSignature=state.rankingSignature=state.goalsSignature='';
  }
  function prepareDateLoad(date){
    const historical=date!==operationalDate();
    if(historical&&showSavedHistoricalPreview(date))return true;
    clearDisplayedProductionData();
    return false;
  }
  function processData(json) {
    state.showingHistoricalPreview=false;state.historicalPreviewDate='';state.loadingWithoutSavedData=false;
    state.data=json; const detected=new Set([...classificationAreas(),...Object.keys(state.creditRates)]);
    for(const a of json.associateDetails.filter(isBulkUser))for(const d of (a.time_details||[]).filter(isPickRecord))detected.add(rawAreaName(d));
    state.detectedAreas=[...detected].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    const excluded=new Set([...state.excludedUsernames].map(x=>x.toLowerCase()));
    state.pickers=json.associateDetails.filter(isBulkUser).filter(a=>!excluded.has(String(a.label).toLowerCase())).map(summarize).filter(p=>p&&(p.totalPicks>=state.minimumPicks||p.totalPicks<0));
    state.lastRefresh=new Date(); state.lastError='';captureDailyHistory();
  }
  function sortedPickers() {
    const q=state.filter.toLowerCase(); const list=state.pickers.filter(p=>!q||`${p.label} ${p.fullName} ${p.currentArea} ${(p.areas||[]).map(area=>area.area).join(' ')}`.toLowerCase().includes(q));
    list.sort((a,b)=>state.sort==='credit'?b.totalCredit-a.totalCredit:state.sort==='picks'?b.totalPicks-a.totalPicks:state.sort==='recent'?(b.latestEnd?.getTime()||0)-(a.latestEnd?.getTime()||0):a.label.localeCompare(b.label)); return list;
  }
  async function refresh(date=state.ui?.date?.value||state.selectedDate||operationalDate(),options={}) {
    resetExpiredGoals();
    const dateChanged=date!==state.selectedDate||options.forceDateLoad===true;
    if(state.refreshing){state.controller?.abort();}
    if(dateChanged)prepareDateLoad(date);
    const id=++state.requestId, controller=new AbortController(); state.controller=controller; state.refreshing=true; state.selectedDate=date; renderStatus();render();
    try {
      const highVolumeLoad=fetchHighVolumeReport(date)
        .then(html=>highVolumePickedRows(parseHighVolumeReport(html),date))
        .then(result=>({result}),error=>({error}));
      const prescanLoad=fetchPrescanReport(date)
        .then(html=>({rows:parsePrescanReport(html)}),error=>({error}));
      const json=await fetchVision(date,controller);
      if(id!==state.requestId)return;
      state.visionLoginRequired=false;
      state.visionLastDataAt=new Date();
      const [highVolume,prescan]=await Promise.all([highVolumeLoad,prescanLoad]);
      if(id!==state.requestId||state.selectedDate!==date)return;
      if(highVolume.error){
        state.highVolumeRows=[];state.highVolumeError=highVolume.error.message||String(highVolume.error);state.dpLoginFlags.highVolume=highVolume.error.code==='DP_LOGIN_REQUIRED';
      }else{
        state.highVolumeRows=highVolume.result.allocations;state.highVolumeError=highVolume.result.error;state.dpLoginFlags.highVolume=/DP_LOGIN_REQUIRED/.test(highVolume.result.error);state.dpLastDataAt=new Date();
      }
      if(prescan.error){
        state.prescanRows=[];state.prescanError=prescan.error.message||String(prescan.error);state.dpLoginFlags.prescan=prescan.error.code==='DP_LOGIN_REQUIRED';
      }else{
        state.prescanRows=prescan.rows;state.prescanError='';state.dpLoginFlags.prescan=false;state.dpLastDataAt=new Date();
      }
      processData(json);render();renderLoginBanner();
    }
    catch(e){if(id!==state.requestId)return;state.loadingWithoutSavedData=false;state.lastError=e.name==='AbortError'?'Request cancelled or timed out.':e.message;state.visionLoginRequired=e.code==='VISION_LOGIN_REQUIRED';render();renderLoginBanner();}
    finally{if(id===state.requestId){state.refreshing=false;state.controller=null;renderStatus();}}
  }
  function goalDayKey(date=new Date()){
    const d=new Date(date);if(d.getHours()<4)d.setDate(d.getDate()-1);return formatDate(d);
  }
  function resetExpiredGoals(){
    const today=goalDayKey();
    if(state.goalOperationalDate===today)return false;
    state.groupCreditGoals={};state.goalOperationalDate=today;saveSharedSettingsCache();return true;
  }
  function activeGoalEntries(){
    if(state.selectedDate&&state.selectedDate!==operationalDate()){
      const day=state.history?.[state.selectedDate];
      if(!day||!Array.isArray(day.pickers))return [];
      return state.pickerGroups.map(group=>{
        const historical=(day.pickers||[]).find(row=>String(row?.group||'').trim().toLowerCase()===String(group.name||'').trim().toLowerCase()&&n(row?.goal)>0);
        return {group,goal:historical?Math.max(0,n(historical.goal)):0};
      }).filter(item=>item.goal>0);
    }
    return state.pickerGroups.map(group=>({group,goal:Math.max(0,n(state.groupCreditGoals[group.id]))})).filter(item=>item.goal>0);
  }
  function groupEarnedCredit(groupId){return state.pickers.filter(p=>p.pickerGroup?.id===groupId).reduce((sum,p)=>sum+n(p.totalCredit),0);}
  function goalForPicker(picker){
    if(state.selectedDate&&state.selectedDate!==operationalDate()){
      const day=state.history?.[state.selectedDate];
      const historical=day?.pickers?.find(x=>String(x.username)===String(picker?.label));
      return historical?Math.max(0,n(historical.goal)):0;
    }
    const id=picker?.pickerGroup?.id;
    return id?Math.max(0,n(state.groupCreditGoals?.[id])):0;
  }
  function goalProgress(picker){const goal=goalForPicker(picker);return goal>0?Math.max(0,n(picker.totalCredit)/goal*100):null;}
  function goalHitTimeForPicker(picker){
    const goal=goalForPicker(picker);
    if(!(goal>0)||!(n(picker.totalCredit)>=goal))return null;
    if(picker?.savedGoalHitTime)return picker.savedGoalHitTime;
    const cacheKey=`${state.selectedDate||operationalDate()}|${String(picker?.label||picker?.id||'')}|${goal}`;
    const cached=parseDate(state.goalHitTimes[cacheKey]);
    if(cached)return cached;
    // Reconcile each timestamped Vision area's final credited total back across its own
    // chronological pick records. This correctly accounts for High Volume reclassification
    // and area-specific credit while preserving the exact Vision pick completion timestamps.
    const records=[...(picker.includedPickRecords||[])]
      .filter(d=>areaEnabled(areaName(d)))
      .sort((a,b)=>(parseDate(a.end)?.getTime()||0)-(parseDate(b.end)?.getTime()||0));
    const rawCreditByArea={};
    for(const record of records){
      const area=canonicalAreaKey(areaName(record));
      rawCreditByArea[area]=(rawCreditByArea[area]||0)+pickQty(record)*creditRate(area);
    }
    const actualTimestampedCreditByArea={};
    for(const area of picker.areas||[]){
      if(area.isManual||area.isPrescan)continue;
      const base=canonicalAreaKey(area.baseArea||area.area);
      actualTimestampedCreditByArea[base]=(actualTimestampedCreditByArea[base]||0)+n(area.credit);
    }
    let cumulative=0;
    for(const record of records){
      const area=canonicalAreaKey(areaName(record));
      const rawTotal=n(rawCreditByArea[area]);
      const actualTotal=n(actualTimestampedCreditByArea[area]);
      const factor=rawTotal>0?actualTotal/rawTotal:1;
      cumulative+=pickQty(record)*creditRate(area)*factor;
      if(cumulative>=goal){
        const hit=parseDate(record.end)||picker.latestEnd||null;
        if(hit)state.goalHitTimes[cacheKey]=hit.toISOString();
        return hit;
      }
    }
    // Manual adjustments and Prescan production do not include a reliable pick timestamp.
    // If those untimed credits are what pushed the picker over goal, lock the first observed
    // qualifying Vision activity time so later picks never move the displayed goal time.
    const fallback=picker.latestEnd||picker.firstPick||null;
    if(fallback)state.goalHitTimes[cacheKey]=fallback.toISOString();
    return fallback;
  }
  function setupAreaRowAutoScroll(savedProgress=new Map()){
    if(!state.ui?.cards)return;
    for(const viewport of state.ui.cards.querySelectorAll('.areaRows')){
      const track=viewport.querySelector('.areaRowsTrack');
      if(!track)continue;
      viewport.classList.remove('autoScroll');
      track.style.animation='none';
      track.style.transform='translate3d(0,0,0)';
      track.querySelectorAll('[data-scroll-clone]').forEach(node=>node.remove());
      const originals=[...track.children].filter(node=>node.classList?.contains('cols'));
      if(!originals.length)continue;
      // Reserve three consistent visible zone slots on every card. Fewer zones remain
      // top-aligned without stretching; cards with more than three zones auto-scroll.
      const visibleRows=3;
      const rowHeight=Math.max(1,viewport.clientHeight/visibleRows);
      const areaFontSize=Math.max(9,Math.min(13,rowHeight*0.64));
      viewport.style.setProperty('--area-row-height',`${rowHeight}px`);
      viewport.style.setProperty('--area-font-size',`${areaFontSize}px`);
      for(const row of originals)row.style.height=`${rowHeight}px`;
      if(originals.length<=3)continue;
      let firstClone=null;
      for(const row of originals){
        const clone=row.cloneNode(true);
        clone.dataset.scrollClone='true';
        clone.setAttribute('aria-hidden','true');
        clone.style.height=`${rowHeight}px`;
        track.appendChild(clone);
        if(!firstClone)firstClone=clone;
      }
      // One full original set is the exact loop distance, producing a seamless forever loop.
      const distance=rowHeight*originals.length;
      const duration=Math.max(24,distance/8);
      track.style.setProperty('--area-scroll-distance',`${distance}px`);
      track.style.setProperty('--area-scroll-duration',`${duration}s`);
      track.style.animation='';
      track.style.transform='';
      void track.offsetHeight;
      viewport.classList.add('autoScroll');
      const cardId=viewport.closest('.pickerCard')?.dataset.pickerId;
      const progress=cardId?savedProgress.get(String(cardId)):null;
      if(Number.isFinite(progress))requestAnimationFrame(()=>{
        const animation=track.getAnimations?.()[0];
        if(animation&&animation.effect?.getTiming){
          const total=Number(animation.effect.getTiming().duration)||duration*1000;
          animation.currentTime=Math.max(0,Math.min(.999999,progress))*total;
        }
      });
    }
  }
  function renderGroupGoals(){
    if(!state.ui?.goals)return;
    const entries=activeGoalEntries();
    const signature=JSON.stringify(entries.map(({group,goal})=>[group.id,group.name,group.color,goal,state.pickers.filter(p=>p.pickerGroup?.id===group.id&&n(p.totalCredit)>=goal).length]));
    if(signature===state.goalsSignature)return;
    state.goalsSignature=signature;
    state.ui.goals.innerHTML=entries.length?entries.map(({group,goal})=>{const hitCount=state.pickers.filter(p=>p.pickerGroup?.id===group.id&&goalForPicker(p)>0&&n(p.totalCredit)>=goalForPicker(p)).length;return `<button class="goalKpiCard" data-edit-goals type="button" style="--goal-group-color:${esc(group.color)}"><span class="goalMain"><span class="goalGroupName">${esc(group.name)}</span><b class="goalNumber">${fmt(goal)}</b></span><span class="goalHitBlock"><small><em>HIT</em><em>GOAL</em></small><strong>${fmt(hitCount)}</strong></span></button>`;}).join(''):'<button class="noGoalsCard" data-edit-goals type="button">No goals set</button>';
    state.ui.goals.querySelectorAll('[data-edit-goals]').forEach(button=>button.onclick=()=>requestSupervisorPassword('Edit Group Goals',openQuickGoalEditor));
  }
  function openQuickGoalEditor(){
    const d=state.frame.contentDocument;d.getElementById('quickGoalShade')?.remove();
    const shade=d.createElement('div');shade.id='quickGoalShade';shade.className='miniFrameShade';
    shade.innerHTML=`<section class="quickGoalBox"><header><div><h2>Today’s Group Goals</h2><p>Goals reset to 0 automatically at 4:00 AM.</p></div><button id="quickGoalClose">Close</button></header><main>${state.pickerGroups.length?state.pickerGroups.map(group=>`<label><span class="groupBadge" style="--group-color:${group.color};--group-text:${readableColor(group.color)}">${esc(group.abbreviation)}</span><b>${esc(group.name)}</b><small>${group.start} to ${group.end}</small><input data-quick-goal="${esc(group.id)}" type="number" min="0" step="1" value="${state.groupCreditGoals[group.id]||''}" placeholder="0"></label>`).join(''):'<div class="muted">No groups configured.</div>'}</main><footer><span id="quickGoalMessage"></span><button id="quickGoalSave">Save Goals</button></footer></section>`;
    d.body.appendChild(shade);const close=()=>shade.remove();shade.querySelector('#quickGoalClose').onclick=close;
    shade.querySelector('#quickGoalSave').onclick=async()=>{const btn=shade.querySelector('#quickGoalSave'),msg=shade.querySelector('#quickGoalMessage');btn.disabled=true;btn.textContent='Saving...';msg.textContent='Saving goals to shared folder...';try{state.groupCreditGoals=Object.fromEntries([...shade.querySelectorAll('[data-quick-goal]')].map(input=>[input.dataset.quickGoal,Math.max(0,n(input.value))]));state.goalOperationalDate=goalDayKey();await pushSharedSettingsNow();await syncHistoryWithFolder();render();msg.textContent='Goals saved.';btn.textContent='Saved';setTimeout(close,400);}catch(error){msg.textContent=error?.message||String(error);btn.disabled=false;btn.textContent='Save Goals';}};
  }
  function rankingTypeForPicker(picker){
    const name=String(picker?.pickerGroup?.name||'').toUpperCase();
    if(/(^|[^A-Z])PT([^A-Z]|$)/.test(name))return 'PT';
    if(/(^|[^A-Z])FT([^A-Z]|$)/.test(name))return 'FT';
    return null;
  }
  function rankingTitleText(type){
    const primary=metricKeyOrDefault(state.rankingPrimaryMetric,'creditPerActiveHour');
    return `${type} ${RANKING_METRICS[primary].short} RANKINGS`;
  }
  function rankingRowsHtml(type){
    const primary=metricKeyOrDefault(state.rankingPrimaryMetric,'creditPerActiveHour');
    const secondary=metricKeyOrDefault(state.rankingSecondaryMetric,'totalCredit');
    const ranked=state.pickers.filter(p=>rankingTypeForPicker(p)===type).sort((a,b)=>metricValue(primary,b)-metricValue(primary,a));
    if(!ranked.length)return `<div class="rankingEmpty">No ${type} groups active.</div>`;
    return ranked.map((p,index)=>{const place=index+1,podium=place<=3?` podium podium${place}`:'';return `<div class="rankingRow${podium}" data-picker-id="${esc(p.id)}"><span class="rankingPlace">${place}</span><span class="rankingPerson"><b>${esc(p.label)}</b><small class="rankGroup" style="--group-color:${esc(p.pickerGroup.color)};--group-text:${readableColor(p.pickerGroup.color)}">${esc(p.pickerGroup.abbreviation)}</small></span><span class="rankingValues"><small class="rankingSecondary">${esc(metricDisplay(secondary,p))}</small><strong class="rankingPrimary">${esc(metricDisplay(primary,p))}</strong></span></div>`;}).join('');
  }
  function fitRankingRows(){
    if(!state.ui?.rank)return;
    const rank=state.ui.rank,rows=[...rank.querySelectorAll('.rankingRow')];
    rows.forEach(row=>row.hidden=false);
    const bottom=rank.getBoundingClientRect().bottom;
    let visible=0;
    for(const row of rows){if(row.getBoundingClientRect().bottom<=bottom+0.5)visible++;else row.hidden=true;}
    if(rows.length&&!visible)rows[0].hidden=false;
  }
  function renderRankingView(animate=true){
    if(!state.ui?.rank||!state.ui?.rankTitle)return;
    const type=state.rankingView==='PT'?'PT':'FT';
    const apply=()=>{state.ui.rankTitle.textContent=rankingTitleText(type);state.ui.rank.innerHTML=rankingRowsHtml(type);state.ui.rank.classList.remove('rankingFadeOut');state.ui.rank.classList.add('rankingFadeIn');requestAnimationFrame(()=>requestAnimationFrame(fitRankingRows));setTimeout(()=>{state.ui?.rank?.classList.remove('rankingFadeIn');fitRankingRows();},450);};
    if(!animate){apply();return;}
    state.ui.rank.classList.add('rankingFadeOut');setTimeout(apply,350);
  }
  function updateRankingValuesInPlace(){
    if(!state.ui?.rank)return;
    const type=state.rankingView==='PT'?'PT':'FT';
    const primary=metricKeyOrDefault(state.rankingPrimaryMetric,'creditPerActiveHour');
    const secondary=metricKeyOrDefault(state.rankingSecondaryMetric,'totalCredit');
    const ranked=state.pickers.filter(p=>rankingTypeForPicker(p)===type).sort((a,b)=>metricValue(primary,b)-metricValue(primary,a));
    const rows=[...state.ui.rank.querySelectorAll('.rankingRow')];
    const existing=rows.map(row=>row.dataset.pickerId||'');
    const incoming=ranked.map(p=>String(p.id));
    if(existing.length!==incoming.length||existing.some((id,index)=>id!==incoming[index])){state.ui.rankTitle.textContent=rankingTitleText(type);state.ui.rank.innerHTML=rankingRowsHtml(type);requestAnimationFrame(fitRankingRows);return;}
    rows.forEach((row,index)=>{
      const picker=ranked[index];
      const primaryEl=row.querySelector('.rankingPrimary'),secondaryEl=row.querySelector('.rankingSecondary');
      const primaryText=metricDisplay(primary,picker),secondaryText=metricDisplay(secondary,picker);
      if(primaryEl&&primaryEl.textContent!==primaryText)primaryEl.textContent=primaryText;
      if(secondaryEl&&secondaryEl.textContent!==secondaryText)secondaryEl.textContent=secondaryText;
    });
  }
  function restartRankingRotation(force=false){
    if(!state.running)return;
    const hasFT=state.pickers.some(p=>rankingTypeForPicker(p)==='FT'),hasPT=state.pickers.some(p=>rankingTypeForPicker(p)==='PT');
    const signature=`${hasFT}|${hasPT}|${state.rankingRotationSeconds}`;
    if(!force&&signature===state.rankingSignature){if(!state.ui?.rank?.classList.contains('rankingFadeOut'))updateRankingValuesInPlace();return;}
    state.rankingSignature=signature;
    clearInterval(state.rankingRotationTimer);state.rankingRotationTimer=null;
    if(!hasFT&&hasPT)state.rankingView='PT';else if(hasFT&&!hasPT)state.rankingView='FT';else if(!hasFT&&!hasPT)state.rankingView='FT';
    renderRankingView(false);
    if(hasFT&&hasPT)state.rankingRotationTimer=setInterval(()=>{state.rankingView=state.rankingView==='FT'?'PT':'FT';renderRankingView(true);},state.rankingRotationSeconds*1000);
  }
  function pickerCardHtml(p){
    return `<article class="pickerCard ${p.active?'active':'inactive'} ${goalProgress(p)!==null&&goalProgress(p)>=100?'goalMet':''}" data-picker-id="${esc(p.id)}" role="button" tabindex="0" title="Open picker details"><header><div class="pickerIdentityBlock"><div class="pickerIdentity"><h2 class="ce-username">${esc(p.label)}</h2>${p.pickerGroup?`<span class="groupBadge ce-groupBadge" title="${esc(p.pickerGroup.name)} | First pick ${timeText(p.firstPick)}" style="--group-color:${esc(p.pickerGroup.color)};--group-text:${readableColor(p.pickerGroup.color)}">${esc(p.pickerGroup.abbreviation)}</span>`:''}</div><small class="pickerFullName ce-fullName">${esc(p.fullName)}</small></div><div class="pickerHeroBlock"><div class="pickerHeroNumbers"><small class="pickerCreditPerHour" title="${esc(cardSecondaryMetricDef().label)}">${esc(metricDisplay(state.cardSecondaryMetric,p))}</small><b class="ce-totalCredit">${esc(metricDisplay(state.cardPrimaryMetric,p))}</b></div><small class="ce-totalCreditLabel">${cardPrimaryLabel(p)}</small></div></header><div class="rule"></div><div class="cols head ce-areaHeader"><span>AREA</span><span>PICKS</span><span>CREDIT</span></div><div class="areaRows"><div class="areaRowsTrack">${p.areas.map(a=>`<div data-area-key="${esc(a.area)}" title="${a.isPrescan?'Decision Point Prescan cartons':''}" class="cols ${a.isHighVolume?'highVolumeArea':''} ${a.isManual?(a.isRemoval?'manualRemoved':'manualAdded'):''}"><strong class="ce-areaName">${esc(a.isManual?a.area:displayAreaName(a.area))}</strong><span class="ce-pickValue">${a.isManual&&a.picks>0?'+':''}${fmt(a.picks)}</span><b class="ce-creditValue">${a.isManual&&a.credit>0?'+':''}${creditFmt(a.credit)}</b></div>`).join('')}</div></div></article>`;
  }
  function bindPickerCardOpenHandlers(scope){
    scope.querySelectorAll('.pickerCard[data-picker-id]').forEach(card=>{
      const open=()=>openPickerDetail(state.pickers.find(p=>String(p.id)===card.dataset.pickerId));
      card.onclick=open;
      card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
    });
  }
  function updateCardsValuesInPlace(list){
    if(!state.ui?.cards)return;
    for(const p of list){
      const card=state.ui.cards.querySelector(`.pickerCard[data-picker-id="${CSS.escape(String(p.id))}"]`);
      if(!card)continue;
      card.classList.toggle('active',!!p.active);
      card.classList.toggle('inactive',!p.active);
      card.classList.toggle('goalMet',goalProgress(p)!==null&&goalProgress(p)>=100);
      const secondaryEl=card.querySelector('.pickerCreditPerHour'),primaryEl=card.querySelector('.ce-totalCredit'),labelEl=card.querySelector('.ce-totalCreditLabel');
      const secondaryText=metricDisplay(state.cardSecondaryMetric,p),primaryText=metricDisplay(state.cardPrimaryMetric,p),labelText=cardPrimaryLabel(p);
      if(secondaryEl&&secondaryEl.textContent!==secondaryText)secondaryEl.textContent=secondaryText;
      if(primaryEl&&primaryEl.textContent!==primaryText)primaryEl.textContent=primaryText;
      if(labelEl&&labelEl.textContent!==labelText)labelEl.textContent=labelText;
      for(const a of p.areas){
        const pickText=`${a.isManual&&a.picks>0?'+':''}${fmt(a.picks)}`;
        const creditText=`${a.isManual&&a.credit>0?'+':''}${creditFmt(a.credit)}`;
        card.querySelectorAll(`[data-area-key="${CSS.escape(a.area)}"]`).forEach(row=>{
          const pickEl=row.querySelector('.ce-pickValue'),creditEl=row.querySelector('.ce-creditValue');
          if(pickEl&&pickEl.textContent!==pickText)pickEl.textContent=pickText;
          if(creditEl&&creditEl.textContent!==creditText)creditEl.textContent=creditText;
        });
      }
    }
  }
  function renderCards() {
    const list=sortedPickers(); state.ui.count.textContent=`BULK PICKERS ${list.length}`;
    // Only the STRUCTURE (which pickers, which areas, group identity) forces a full rebuild.
    // Numeric values (credit, picks, goal state) update in place every refresh so the running
    // area-row auto-scroll animation is never interrupted, eliminating the visible scroll jitter
    // that a full innerHTML rebuild would cause on effectively every single refresh cycle.
    // Area order within a card is naturally sorted by credit and reshuffles often on a live floor;
    // sorting the keys here before comparing means pure re-ranking (no area added/removed) is
    // treated as a value-only change instead of a structural one, avoiding needless full rebuilds.
    const structureSignature=JSON.stringify(list.map(p=>[p.id,p.pickerGroup?.id,p.pickerGroup?.abbreviation,p.pickerGroup?.color,[...p.areas.map(a=>a.area)].sort()]));
    const structureChanged=structureSignature!==state.cardsSignature;
    if(structureChanged){
      const savedScrollProgress=new Map();
      state.ui.cards.querySelectorAll('.pickerCard[data-picker-id]').forEach(card=>{const animation=card.querySelector('.areaRowsTrack')?.getAnimations?.()[0],progress=animation?.effect?.getComputedTiming?.().progress;if(Number.isFinite(progress))savedScrollProgress.set(String(card.dataset.pickerId),progress);});
      state.cardsSignature=structureSignature;
      state.ui.cards.innerHTML=list.map(pickerCardHtml).join('')||`<div class="empty">${state.refreshing&&state.loadingWithoutSavedData?`REFRESHING ${esc(state.selectedDate||'')}...`:esc(state.lastError||`No data available for date ${state.selectedDate||operationalDate()}`)}</div>`;
      requestAnimationFrame(()=>requestAnimationFrame(()=>setupAreaRowAutoScroll(savedScrollProgress)));
      bindPickerCardOpenHandlers(state.ui.cards);
    }else{
      updateCardsValuesInPlace(list);
    }
    restartRankingRotation();
  }
  function resyncAreaScrollMetrics(){
    if(!state.ui?.cards)return;
    const savedScrollProgress=new Map();
    state.ui.cards.querySelectorAll('.pickerCard[data-picker-id]').forEach(card=>{const animation=card.querySelector('.areaRowsTrack')?.getAnimations?.()[0],progress=animation?.effect?.getComputedTiming?.().progress;if(Number.isFinite(progress))savedScrollProgress.set(String(card.dataset.pickerId),progress);});
    setupAreaRowAutoScroll(savedScrollProgress);
  }
  function restartAreaScrollResyncTimer(){
    // Intentionally no periodic reset. The previous timed resync tore down and restarted every
    // area animation, which produced a visible stutter. Structural card changes and actual window
    // resizes already recalculate the row geometry when required.
    clearInterval(state.areaScrollResyncTimer);state.areaScrollResyncTimer=null;
  }
  function rebuildWorkLeftTotals(){
    // This function was called from the date-picker's onchange handler but was never actually
    // defined anywhere in the script — calling an undefined function throws a ReferenceError,
    // which silently aborted the refresh()/refreshWorkLeft() calls that were supposed to run right
    // after it any time someone manually changed the date via the on-screen date picker. Defining it
    // here (as a safe reset of the ticker's cached signatures so the Work Left ticker fully
    // redraws once fresh totals arrive) fixes that dead call without changing any other behavior.
    state.tickerStructureSignature='';state.tickerSignature='';
  }
  function checkDateRollover(){
    // The refresh/work-left timers only fire when state.selectedDate matches the live operational
    // date, so once the operational-day cutoff passes, nothing ever advances selectedDate itself and
    // the whole dashboard silently freezes on yesterday. This periodic check advances it — but only
    // when the dashboard is passively following "today" (dateFollowsToday), never overriding someone
    // who deliberately picked a historical date via the date picker.
    if(!state.running||!state.dateFollowsToday)return;
    const today=operationalDate();
    if(today===state.selectedDate)return;
    if(state.ui?.date)state.ui.date.value=today;
    state.workLeftAreaCounts={};state.workLeftAreaHealth={};
    rebuildWorkLeftTotals();
    refresh(today,{forceDateLoad:true});
    refreshWorkLeft(today);
  }
  function restartDateRolloverTimer(){
    clearInterval(state.dateRolloverTimer);state.dateRolloverTimer=null;
    if(!state.running)return;
    state.dateRolloverTimer=setInterval(checkDateRollover,CONFIG.dateRolloverCheckMs);
  }
  function formatDurationSeconds(seconds){
    const minutes=Math.max(0,Math.round(n(seconds)/60)),hours=Math.floor(minutes/60),remain=minutes%60;
    return hours?`${hours}h ${String(remain).padStart(2,'0')}m`:`${minutes}m`;
  }
  function openPickerDetail(picker){
    if(!picker||!state.ui)return;
    const d=state.frame.contentDocument;
    d.getElementById('bulkPickerDetail')?.remove();
    const shade=d.createElement('div');shade.id='bulkPickerDetail';shade.className='detailShade';
    const areaRows=picker.areas.map(area=>{const rate=area.isManual?(area.picks?Math.abs(area.credit/area.picks):0):(area.isHighVolume?creditRate(area.baseArea)*state.highVolumeMultiplier:creditRate(area.area));const cls=area.isManual?(area.isRemoval?'manualRemoved':'manualAdded'):(area.isHighVolume?'highVolumeDetail':'');const removeButton=area.isManual?`<button type="button" class="deleteManualAdjustment" data-adjustment-id="${esc(area.adjustmentId)}" aria-label="Delete ${esc(area.area)} adjustment" title="Delete adjustment" style="position:relative;z-index:2;padding:2px 6px;min-width:24px;background:#3a2027;color:#f2838d;border:1px solid #7b3b48;border-radius:3px;line-height:1;cursor:pointer">X</button>`:'';return `<tr class="${cls}"><td>${esc(area.isManual?area.area:displayAreaName(area.area))}</td><td>${area.isManual&&area.picks>0?'+':''}${fmt(area.picks)}</td><td>${creditFmt(rate)}</td><td>${area.isManual&&area.credit>0?'+':''}${creditFmt(area.credit)}</td><td>${area.isManual?'Manual':area.isPrescan?'Prescan':'Included'}</td><td>${removeButton}</td></tr>`;}).join('');
    const timeline=[...picker.all].sort((a,b)=>(parseDate(b.end)?.getTime()||0)-(parseDate(a.end)?.getTime()||0)).map(record=>{
      const raw=rawAreaName(record),mapped=areaName(record),included=isPickRecord(record)&&areaEnabled(mapped),qty=pickQty(record),credit=included?qty*creditRate(mapped):0;
      const job=record?.job_function?.display_value||record?.label||record?.type||'';
      const mapping=displayAreaName(mapped);
      return `<tr class="${included?'includedRow':'excludedRow'}"><td>${timeText(record.start)}</td><td>${timeText(record.end)}</td><td>${esc(job)}</td><td>${esc(mapping)}</td><td>${fmt(qty)}</td><td>${creditFmt(credit)}</td><td>${included?'<span class="includedTag">Included</span>':'<span class="excludedTag">Excluded</span>'}</td></tr>`;
    }).join('');
    shade.innerHTML=`<section class="detailBox"><header class="detailHead"><div><h2>${esc(picker.label)} <small>${esc(picker.fullName)}</small></h2><p>${fmt(picker.totalPicks)} included picks | ${creditFmt(picker.totalCredit)} total credit | ${creditFmt(picker.creditPerHour)} credit/hr</p></div><div class="detailActions"><span>${picker.pickerGroup?`${esc(picker.pickerGroup.name)} | `:''}First pick ${timeText(picker.firstPick)} | ${picker.active?'ACTIVE':'INACTIVE'} | Last activity ${timeText(picker.latestEnd)}</span><button id="manualAdjustment">Manual Adjustment</button><button id="detailClose">Close</button></div></header><div class="detailBody"><div class="detailKpis"><div><span>Total Credit</span><b>${creditFmt(picker.totalCredit)}</b></div><div><span>Included Picks</span><b>${fmt(picker.totalPicks)}</b></div><div><span>Work Time</span><b>${formatDurationSeconds(picker.workSeconds)}</b></div><div><span>Current Area</span><b>${esc(picker.currentArea)}</b></div><div><span>Break/Lunch Time</span><b>${formatDurationSeconds(picker.breakSeconds)}</b></div><div><span>Credit / Net Elapsed Hr</span><b>${creditFmt(metricValue('creditPerNetElapsedHour',picker))}</b></div></div><h3>Area Credit Summary</h3><table><thead><tr><th>Area</th><th>Picks</th><th>Credit/Pick</th><th>Credit</th><th>Status</th><th></th></tr></thead><tbody>${areaRows||'<tr><td colspan="6">No included areas.</td></tr>'}</tbody></table><h3>Complete Vision Activity Timeline</h3><p class="detailNote">Disabled or non-pick records remain visible for auditing but contribute zero picks and zero credit.</p><table><thead><tr><th>Start</th><th>End</th><th>Activity</th><th>Area</th><th>Picks</th><th>Credit</th><th>Status</th></tr></thead><tbody>${timeline}</tbody></table></div></section>`;
    d.body.appendChild(shade);
    const close=()=>shade.remove();
    shade.querySelector('#detailClose').onclick=close;
    shade.querySelector('#manualAdjustment').onclick=()=>requestSupervisorPassword('Manual Adjustment',()=>openManualAdjustmentFrame(picker));
    shade.onclick=e=>{if(e.target===shade)close();};
    shade.addEventListener('click',event=>{const button=event.target.closest?.('.deleteManualAdjustment');if(!button)return;event.preventDefault();event.stopPropagation();const adjustment=state.manualAdjustments.find(item=>String(item.id)===button.dataset.adjustmentId);if(!adjustment)return;requestSupervisorPassword('Delete Manual Adjustment',()=>{button.disabled=true;deleteManualAdjustment(adjustment.id).then(()=>{const updatedPicker=state.pickers.find(item=>String(item.id)===String(picker.id));if(updatedPicker)openPickerDetail(updatedPicker);else close();}).catch(error=>{button.disabled=false;button.title=error.message||String(error);});});});
    shade.onkeydown=e=>{if(e.key==='Escape')close();};
    shade.tabIndex=-1;shade.focus();
  }
  function openManualAdjustmentFrame(picker){const d=state.frame.contentDocument;d.getElementById('manualAdjust')?.remove();const sh=d.createElement('div');sh.id='manualAdjust';sh.className='miniFrameShade';sh.innerHTML=`<section class="manualBox"><h2>${esc(picker.label)} Adjustment</h2><label>Description<input id="adjName" placeholder="Example: Missed credit"></label><label>Lines<input id="adjLines" type="number" step="1" placeholder="Negative removes lines"></label><label>Credit per Line<input id="adjRate" type="number" min="0" step="0.0001"></label><small>Positive lines are added in green. Negative lines are removed in red.</small><div><button id="adjSave">Save</button><button id="adjCancel">Cancel</button></div><span id="adjMsg"></span></section>`;d.body.appendChild(sh);const close=()=>sh.remove(),saveButton=sh.querySelector('#adjSave'),message=sh.querySelector('#adjMsg');let saving=false;sh.querySelector('#adjCancel').onclick=close;saveButton.onclick=async()=>{if(saving)return;const name=sh.querySelector('#adjName').value.trim(),lines=Math.trunc(Number(sh.querySelector('#adjLines').value)),rate=Number(sh.querySelector('#adjRate').value);if(!name||!lines||!Number.isFinite(rate)||rate<0){message.textContent='Enter a name, non-zero lines, and valid credit.';return}saving=true;saveButton.disabled=true;saveButton.textContent='Saving...';message.textContent='';try{await saveManualAdjustment({id:`adj_${Date.now()}`,createdAt:new Date().toISOString(),operationalDate:state.selectedDate||operationalDate(),picker:picker.label,pickerKey:picker.label.toLowerCase(),fullName:picker.fullName,name,lines,creditPerLine:rate});close();openPickerDetail(state.pickers.find(x=>String(x.id)===String(picker.id)));}catch(error){message.textContent=error.message||String(error);saving=false;saveButton.disabled=false;saveButton.textContent='Save';}};}
  function renderTicker() {
    if(!state.ui)return;
    const top=state.ui.ticker.closest('.top'),ticker=state.ui.ticker;top.style.display='flex';state.ui.tickerViewport.style.display=state.showTicker?'block':'none';state.ui.layout.style.height='calc(100vh - 40px)';
    Object.assign(ticker.style,{animation:'none',width:'100%',minWidth:'0',justifyContent:'center'});
    if(!state.showTicker)return;
    const ordered=state.workLeftTotals.map(item=>({...item,label:`${item.name} LEFT:`}));
    if(!ordered.length){
      if(state.tickerStructureSignature!=='empty'){state.tickerStructureSignature='empty';state.tickerSignature='';state.ui.ticker.innerHTML='<section><div><b>WORK LEFT</b><strong data-ticker-value="empty">LOADING</strong></div></section>';}
      const value=state.ui.ticker.querySelector('[data-ticker-value="empty"]');if(value)value.textContent=state.workLeftRefreshing?'LOADING':'NO DATA';return;
    }
    const structureSignature=JSON.stringify(ordered.map(item=>[item.id,item.name]));
    const valueSignature=JSON.stringify(ordered.map(item=>[item.id,item.count,item.partial,item.error]));
    if(structureSignature===state.tickerStructureSignature&&state.ui.ticker.querySelector('[data-ticker-value]')){
      if(valueSignature===state.tickerSignature)return;
      state.tickerSignature=valueSignature;
      requestAnimationFrame(()=>{for(const item of ordered){state.ui?.ticker?.querySelectorAll(`[data-ticker-value="${CSS.escape(String(item.id))}"]`).forEach(node=>{const value=`${Number.isFinite(item.count)?fmt(item.count):'--'}${item.partial?'*':''}`;if(node.textContent!==value)node.textContent=value;});}});
      return;
    }
    state.tickerStructureSignature=structureSignature;state.tickerSignature=valueSignature;
    const items=ordered.map(item=>`<div title="${esc(item.error||(item.partial?'Partial result: one or more data sources failed':''))}" style="flex:1 1 0;min-width:0;justify-content:center;gap:6px;padding:0 8px"><b style="min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(item.label||`${item.name} LEFT:`)}</b><strong data-ticker-value="${esc(item.id)}">${Number.isFinite(item.count)?fmt(item.count):'--'}${item.partial?'*':''}</strong></div>`).join('');
    state.ui.ticker.innerHTML=`<section style="display:flex;width:100%;min-width:0;justify-content:space-around">${items}</section>`;
  }
  function renderStatus(){if(!state.ui)return;state.ui.status.textContent=[state.refreshing&&!state.showingHistoricalPreview?'REFRESHING':state.running?'LIVE':'STOPPED',`DATE ${state.selectedDate||operationalDate()}`,state.lastRefresh?`UPDATED ${timeText(state.lastRefresh)}`:'',state.lastDuration?`API ${state.lastDuration}ms`:'',state.lastError?`ERROR ${state.lastError}`:'',state.highVolumeError?`HV ${state.highVolumeError}`:'',state.prescanError?`HEADER ${state.prescanError}`:'',state.workLeftError?`WORK LEFT ${state.workLeftError}`:'',state.workLeftLastRefresh?`LEFT UPDATED ${timeText(state.workLeftLastRefresh)}`:''].filter(Boolean).join(' | ');}
  function render(){
    if(!state.ui)return;
    if(state.renderFrame!==null)return;
    state.renderFrame=requestAnimationFrame(()=>{state.renderFrame=null;if(!state.ui)return;applyLayout();renderTicker();renderCards();renderGroupGoals();renderStatus();renderLoginBanner();});
  }
  function applyLayout(){
    if(!state.ui)return;
    const root=state.frame.contentDocument.documentElement;
    const viewportWidth=state.frame.contentWindow?.innerWidth||1920;
    const viewportHeight=state.frame.contentWindow?.innerHeight||1080;
    const viewportScale=Math.min(1.35,Math.max(.68,Math.min(viewportWidth/1920,viewportHeight/1080)));
    root.style.setProperty('--viewport-scale',viewportScale.toFixed(3));
    state.ui.layout.style.gridTemplateColumns=`minmax(0,1fr) minmax(calc(220px * var(--viewport-scale)),${state.sidebarWidthPercent}%)`;
    state.ui.cards.style.gridTemplateColumns=`repeat(${state.columns},minmax(0,1fr))`;
    state.ui.cards.style.gridAutoRows=`minmax(calc(110px * var(--viewport-scale)),calc((100% - ${(state.rows-1)*6}px)/${state.rows}))`;
    root.style.setProperty('--card-text-scale',state.cardTextPercent/100*viewportScale);
    root.style.setProperty('--goal-met-color','#3ECF8E');
    root.style.setProperty('--card-fullname-scale',state.cardFullNamePercent/100*viewportScale);
    root.style.setProperty('--card-padding-scale',state.cardPaddingPercent/100*viewportScale);
    root.style.setProperty('--card-row-gap-scale',state.cardRowGapPercent/100*viewportScale);
    root.style.setProperty('--group-badge-text-scale',state.groupBadgeTextPercent/100*viewportScale);
    root.style.setProperty('--group-badge-margin-scale',state.groupBadgeMarginPercent/100*viewportScale);
    root.style.setProperty('--group-badge-size-scale',state.groupBadgeSizePercent/100*viewportScale);
    const elementStyles=normalizeCardElementStyles(state.cardElementStyles);
    for(const [key,value] of Object.entries(elementStyles)){
      root.style.setProperty(`--ce-${key}-size`,value.textSize/100);
      root.style.setProperty(`--ce-${key}-color`,value.color);
      root.style.setProperty(`--ce-${key}-mt`,`${value.marginTop}px`);
      root.style.setProperty(`--ce-${key}-mb`,`${value.marginBottom}px`);
      root.style.setProperty(`--ce-${key}-px`,`${value.paddingX}px`);
    }
    root.style.setProperty('--sidebar-text-scale',state.sidebarTextPercent/100*viewportScale);
    root.style.setProperty('--sidebar-padding-scale',state.sidebarPaddingPercent/100*viewportScale);
    root.style.setProperty('--sidebar-row-gap-scale',state.sidebarRowGapPercent/100*viewportScale);
    root.style.setProperty('--ticker-text-scale',state.tickerTextPercent/100*viewportScale);
    root.style.setProperty('--ticker-height-scale',state.tickerHeightPercent/100*viewportScale);
    root.style.setProperty('--ticker-spacing-scale',state.tickerSpacingPercent/100*viewportScale);
  }
  function normalizeDisplaySettings(raw={}) {
    return {
      columns:Math.min(8,Math.max(2,n(raw.columns)||5)),
      rows:Math.min(8,Math.max(2,n(raw.rows)||5)),
      sidebarWidthPercent:Math.min(35,Math.max(10,n(raw.sidebarWidthPercent)||14)),
      cardTextPercent:Math.min(175,Math.max(50,n(raw.cardTextPercent)||100)),
      cardFullNamePercent:Math.min(200,Math.max(50,n(raw.cardFullNamePercent)||100)),
      cardPaddingPercent:Math.min(175,Math.max(50,n(raw.cardPaddingPercent)||100)),
      cardRowGapPercent:Math.min(175,Math.max(50,n(raw.cardRowGapPercent)||100)),
      groupBadgeTextPercent:Math.min(200,Math.max(50,n(raw.groupBadgeTextPercent)||100)),
      groupBadgeMarginPercent:Math.min(200,Math.max(25,n(raw.groupBadgeMarginPercent)||100)),
      groupBadgeSizePercent:Math.min(200,Math.max(50,n(raw.groupBadgeSizePercent)||100)),
      sidebarTextPercent:Math.min(175,Math.max(50,n(raw.sidebarTextPercent)||100)),
      sidebarPaddingPercent:Math.min(175,Math.max(50,n(raw.sidebarPaddingPercent)||100)),
      sidebarRowGapPercent:Math.min(175,Math.max(50,n(raw.sidebarRowGapPercent)||100)),
      tickerTextPercent:Math.min(175,Math.max(50,n(raw.tickerTextPercent)||100)),
      tickerHeightPercent:Math.min(175,Math.max(50,n(raw.tickerHeightPercent)||100)),
      tickerSpacingPercent:Math.min(175,Math.max(50,n(raw.tickerSpacingPercent)||100)),
      cardElementStyles:normalizeCardElementStyles(raw.cardElementStyles||{})
    };
  }
  function normalizeSharedSettings(raw={}) {const rates={},enabled={},aliases={};for(const [k,v] of Object.entries(raw.creditRates||{})){const x=Number(v);if(Number.isFinite(x)&&x>=0)rates[String(k).toUpperCase()]=x;}for(const [k,v] of Object.entries(raw.enabledAreas||{}))enabled[String(k).toUpperCase()]=v!==false;for(const [k,v] of Object.entries(raw.areaAliases||{})){const from=String(k).trim().toUpperCase(),to=String(v||'').trim().replace(/\s+/g,' ').toUpperCase();if(from&&to)aliases[from]=to;}return {creditRates:rates,enabledAreas:enabled,areaAliases:aliases,excludedUsernames:raw.excludedUsernames||[],minimumPicks:Math.max(0,n(raw.minimumPicks)),refreshSeconds:Math.min(300,Math.max(10,n(raw.refreshSeconds)||30)),highVolumeMultiplier:Math.min(5,Math.max(0,Number.isFinite(Number(raw.highVolumeMultiplier))?Number(raw.highVolumeMultiplier):0.75)),showTicker:raw.showTicker!==false,workLeftRefreshSeconds:Math.min(600,Math.max(15,n(raw.workLeftRefreshSeconds)||60)),workLeftGroups:normalizeWorkLeftGroups(raw.workLeftGroups),rankingPeople:Math.min(30,Math.max(1,n(raw.rankingPeople)||10)),rankingRotationSeconds:Math.min(60,Math.max(3,n(raw.rankingRotationSeconds)||10)),rankingPrimaryMetric:metricKeyOrDefault(raw.rankingPrimaryMetric,'creditPerActiveHour'),rankingSecondaryMetric:metricKeyOrDefault(raw.rankingSecondaryMetric,'totalCredit'),cardPrimaryMetric:metricKeyOrDefault(raw.cardPrimaryMetric,'totalCredit'),cardSecondaryMetric:metricKeyOrDefault(raw.cardSecondaryMetric,'creditPerActiveHour'),pickerGroups:normalizePickerGroups(raw.pickerGroups||[]),classificationRules:normalizeClassificationRules(raw.classificationRules),groupCreditGoals:(raw.groupCreditGoals&&typeof raw.groupCreditGoals==='object'?Object.fromEntries(Object.entries(raw.groupCreditGoals).map(([k,v])=>[k,Math.max(0,n(v))])):{}),goalOperationalDate:String(raw.goalOperationalDate||''),goalWarningPercent:Math.min(99,Math.max(1,n(raw.goalWarningPercent)||70)),goalNearPercent:Math.min(99,Math.max(1,n(raw.goalNearPercent)||90)),goalLowColor:normalizeColor(raw.goalLowColor||'#f2707d'),goalWarningColor:normalizeColor(raw.goalWarningColor||'#e8b455'),goalNearColor:normalizeColor(raw.goalNearColor||'#9FB8D9'),goalMetColor:normalizeColor(raw.goalMetColor||'#3ECF8E')};}
  function applyDisplaySettings(raw){const x=normalizeDisplaySettings(raw);state.columns=x.columns;state.rows=x.rows;state.sidebarWidthPercent=x.sidebarWidthPercent;state.cardTextPercent=x.cardTextPercent;state.cardFullNamePercent=x.cardFullNamePercent;state.cardPaddingPercent=x.cardPaddingPercent;state.cardRowGapPercent=x.cardRowGapPercent;state.groupBadgeTextPercent=x.groupBadgeTextPercent;state.groupBadgeMarginPercent=x.groupBadgeMarginPercent;state.groupBadgeSizePercent=x.groupBadgeSizePercent;state.sidebarTextPercent=x.sidebarTextPercent;state.sidebarPaddingPercent=x.sidebarPaddingPercent;state.sidebarRowGapPercent=x.sidebarRowGapPercent;state.tickerTextPercent=x.tickerTextPercent;state.tickerHeightPercent=x.tickerHeightPercent;state.tickerSpacingPercent=x.tickerSpacingPercent;state.cardElementStyles=x.cardElementStyles;}
  function applySharedSettings(raw){const x=normalizeSharedSettings(raw);state.creditRates=x.creditRates;state.enabledAreas=x.enabledAreas;state.areaAliases=x.areaAliases;state.excludedUsernames=new Set(x.excludedUsernames);state.minimumPicks=x.minimumPicks;state.refreshSeconds=x.refreshSeconds;state.highVolumeMultiplier=x.highVolumeMultiplier;state.showTicker=x.showTicker;state.workLeftRefreshSeconds=x.workLeftRefreshSeconds;state.workLeftGroups=x.workLeftGroups;state.rankingPeople=x.rankingPeople;state.rankingRotationSeconds=x.rankingRotationSeconds;state.rankingPrimaryMetric=x.rankingPrimaryMetric;state.rankingSecondaryMetric=x.rankingSecondaryMetric;state.cardPrimaryMetric=x.cardPrimaryMetric;state.cardSecondaryMetric=x.cardSecondaryMetric;state.pickerGroups=x.pickerGroups;state.classificationRules=x.classificationRules;state.groupCreditGoals=x.groupCreditGoals;state.goalOperationalDate=x.goalOperationalDate;state.goalWarningPercent=x.goalWarningPercent;state.goalNearPercent=x.goalNearPercent;state.goalLowColor=x.goalLowColor;state.goalWarningColor=x.goalWarningColor;state.goalNearColor=x.goalNearColor;state.goalMetColor=x.goalMetColor;mergeAreaSettings();}
  function currentDisplaySettings(){return normalizeDisplaySettings({columns:state.columns,rows:state.rows,sidebarWidthPercent:state.sidebarWidthPercent,cardTextPercent:state.cardTextPercent,cardFullNamePercent:state.cardFullNamePercent,cardPaddingPercent:state.cardPaddingPercent,cardRowGapPercent:state.cardRowGapPercent,groupBadgeTextPercent:state.groupBadgeTextPercent,groupBadgeMarginPercent:state.groupBadgeMarginPercent,groupBadgeSizePercent:state.groupBadgeSizePercent,sidebarTextPercent:state.sidebarTextPercent,sidebarPaddingPercent:state.sidebarPaddingPercent,sidebarRowGapPercent:state.sidebarRowGapPercent,tickerTextPercent:state.tickerTextPercent,tickerHeightPercent:state.tickerHeightPercent,tickerSpacingPercent:state.tickerSpacingPercent,cardElementStyles:state.cardElementStyles});}
  function currentSharedSettings(){return normalizeSharedSettings({creditRates:state.creditRates,enabledAreas:state.enabledAreas,areaAliases:state.areaAliases,excludedUsernames:[...state.excludedUsernames],minimumPicks:state.minimumPicks,refreshSeconds:state.refreshSeconds,highVolumeMultiplier:state.highVolumeMultiplier,showTicker:state.showTicker,workLeftRefreshSeconds:state.workLeftRefreshSeconds,workLeftGroups:state.workLeftGroups,rankingPeople:state.rankingPeople,rankingRotationSeconds:state.rankingRotationSeconds,rankingPrimaryMetric:state.rankingPrimaryMetric,rankingSecondaryMetric:state.rankingSecondaryMetric,cardPrimaryMetric:state.cardPrimaryMetric,cardSecondaryMetric:state.cardSecondaryMetric,pickerGroups:state.pickerGroups,classificationRules:state.classificationRules,groupCreditGoals:state.groupCreditGoals,goalOperationalDate:state.goalOperationalDate,goalWarningPercent:state.goalWarningPercent,goalNearPercent:state.goalNearPercent,goalLowColor:state.goalLowColor,goalWarningColor:state.goalWarningColor,goalNearColor:state.goalNearColor,goalMetColor:state.goalMetColor});}
  // Combined helpers kept only for full Export/Import All Settings backup compatibility.
  function normalizeSettings(raw={}){return {...normalizeDisplaySettings(raw),...normalizeSharedSettings(raw)};}
  function applySettings(raw){applyDisplaySettings(raw);applySharedSettings(raw);}
  function currentSettings(){return {...currentDisplaySettings(),...currentSharedSettings()};}
  function saveDisplaySettings(){localStorage.setItem(CONFIG.displaySettingsKey,JSON.stringify(currentDisplaySettings()));}
  function saveSharedSettingsCache(updatedAtMs=Date.now()){localStorage.setItem(CONFIG.sharedSettingsCacheKey,JSON.stringify({updatedAt:updatedAtMs,settings:currentSharedSettings()}));state.sharedSettingsAppliedAt=updatedAtMs;}
  function loadSettings(){
    let legacyRaw={};try{legacyRaw=JSON.parse(localStorage.getItem(CONFIG.settingsKey)||'{}');}catch(_){legacyRaw={};}
    let displayRaw=null;try{const stored=localStorage.getItem(CONFIG.displaySettingsKey);displayRaw=stored?JSON.parse(stored):null;}catch(_){displayRaw=null;}
    applyDisplaySettings(displayRaw||legacyRaw);
    let sharedCache=null;try{const stored=localStorage.getItem(CONFIG.sharedSettingsCacheKey);sharedCache=stored?JSON.parse(stored):null;}catch(_){sharedCache=null;}
    if(sharedCache&&sharedCache.settings&&typeof sharedCache.settings==='object'){applySharedSettings(sharedCache.settings);state.sharedSettingsAppliedAt=Number(sharedCache.updatedAt)||0;}
    else{applySharedSettings(legacyRaw);state.sharedSettingsAppliedAt=0;}
  }
  async function pushSharedSettingsNow(){
    const nowMs=Date.now();
    saveSharedSettingsCache(nowMs);
    if(state.settingsDirHandle&&state.historyDirStatus==='connected'){
      try{await writeSharedSettingsFile(state.settingsDirHandle,currentSharedSettings(),new Date(nowMs).toISOString());}
      catch(error){state.historyDirError=error.message||String(error);}
    }
  }
  async function readSharedSettingsFile(handle){
    try{
      const fileHandle=await handle.getFileHandle(CONFIG.sharedSettingsFileName,{create:false});
      const file=await fileHandle.getFile();
      const parsed=JSON.parse(await file.text());
      if(!parsed||typeof parsed.settings!=='object')return null;
      return {settings:parsed.settings,updatedAtMs:Date.parse(parsed.updatedAt)||0};
    }catch(_){return null;}
  }
  async function writeSharedSettingsFile(handle,settingsObj,updatedAtIso){
    const fileHandle=await handle.getFileHandle(CONFIG.sharedSettingsFileName,{create:true});
    const writable=await fileHandle.createWritable();
    await writable.write(JSON.stringify({format:'VisionBulkSharedSettings',schemaVersion:1,updatedAt:updatedAtIso,settings:settingsObj},null,2));
    await writable.close();
  }
  function onSharedSettingsChangedExternally(){
    state.tickerSignature=state.tickerStructureSignature=state.cardsSignature=state.rankingSignature=state.goalsSignature='';
    if(state.data)processData(state.data);
    render();restartTimer();restartWorkLeftTimer();restartRankingRotation(true);
  }
  async function syncSharedSettingsWithFolder(handle){
    try{
      const remote=await readSharedSettingsFile(handle);
      if(remote){
        if(remote.updatedAtMs>state.sharedSettingsAppliedAt){
          applySharedSettings(remote.settings);
          state.sharedSettingsAppliedAt=remote.updatedAtMs;
          saveSharedSettingsCache(remote.updatedAtMs);
          onSharedSettingsChangedExternally();
        }else if(remote.updatedAtMs<state.sharedSettingsAppliedAt){
          await writeSharedSettingsFile(handle,currentSharedSettings(),new Date(state.sharedSettingsAppliedAt).toISOString());
        }
      }else{
        const nowMs=state.sharedSettingsAppliedAt||Date.now();
        await writeSharedSettingsFile(handle,currentSharedSettings(),new Date(nowMs).toISOString());
        state.sharedSettingsAppliedAt=nowMs;saveSharedSettingsCache(nowMs);
      }
    }catch(error){state.historyDirError=error.message||String(error);}
  }
  function downloadJsonFile(filename,data){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportAllSettings(){
    downloadJsonFile(`Vision_Bulk_Dashboard_All_Settings_${formatDate(new Date())}.json`,{format:'VisionBulkDashboardAllSettings',schemaVersion:1,scriptVersion:'6.22.16',exportedAt:new Date().toISOString(),settings:currentSettings()});
  }
  function chooseSettingsImportFile(){
    return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>{const file=input.files?.[0];if(!file){reject(new Error('No settings file selected.'));return;}const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Unable to read the settings file.'));reader.readAsText(file);};input.click();});
  }
  async function importAllSettings(){
    const text=await chooseSettingsImportFile(),payload=JSON.parse(text);
    if(!payload||payload.format!=='VisionBulkDashboardAllSettings'||!payload.settings||typeof payload.settings!=='object')throw new Error('This is not a valid Vision Bulk dashboard settings export.');
    applyDisplaySettings(payload.settings);saveDisplaySettings();
    applySharedSettings(payload.settings);await pushSharedSettingsNow();
    state.tickerSignature=state.tickerStructureSignature=state.cardsSignature=state.rankingSignature=state.goalsSignature='';
    if(state.data)processData(state.data);restartTimer();restartWorkLeftTimer();render();refreshWorkLeft();restartRankingRotation(true);
    return payload;
  }
  const parseNames=v=>[...new Set(String(v||'').split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean))];
  function requestSupervisorPassword(title,onSuccess){
    const d=state.frame.contentDocument;
    d.getElementById('bulkSupervisorPasswordShade')?.remove();
    const shade=d.createElement('div');shade.id='bulkSupervisorPasswordShade';shade.className='shade';
    shade.innerHTML=`<section class="passwordBox"><h2>${esc(title||'Supervisor Authorization')}</h2><p>Enter the supervisor password to continue.</p><input id="supervisorPassword" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12"><div class="passwordActions"><button id="supervisorUnlock" class="primary">Unlock</button><button id="supervisorCancel">Cancel</button></div><span id="supervisorMessage"></span></section>`;
    d.body.appendChild(shade);
    const input=shade.querySelector('#supervisorPassword'),message=shade.querySelector('#supervisorMessage');
    const close=()=>shade.remove();
    const unlock=async()=>{const button=shade.querySelector('#supervisorUnlock');button.disabled=true;message.textContent='Checking...';const valid=await settingsPasswordValid(input.value).catch(()=>false);button.disabled=false;if(!valid){message.textContent='Incorrect password.';input.select();return;}close();onSuccess?.();};
    shade.querySelector('#supervisorUnlock').onclick=unlock;shade.querySelector('#supervisorCancel').onclick=close;
    input.onkeydown=e=>{if(e.key==='Enter')unlock();if(e.key==='Escape')close();};setTimeout(()=>input.focus(),0);
  }
  function openSettings(){requestSupervisorPassword('Supervisor Settings',openTabbedSettings);}
  function openTabbedSettings(){
    const d=state.frame.contentDocument,shade=d.createElement('div');shade.className='shade';
    const rawAreas=[...new Set([...classificationAreas(),...state.detectedAreas,...Object.keys(state.creditRates),...Object.keys(state.enabledAreas)].map(canonicalAreaKey))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    const areaRows=rawAreas.map(raw=>{
      const enabled=state.enabledAreas[raw]!==false;
      const rate=state.creditRates[raw]??'';
      return `<div class="areaConfigRow simplified" data-raw-area="${esc(raw)}"><label class="areaEnable"><input data-area-enabled type="checkbox" ${enabled?'checked':''}><span>Include</span></label><div class="areaIdentity"><b>${esc(displayAreaName(raw))}</b><small>Detected area</small></div><label><small>Credit per pick</small><input data-area-rate type="number" min="0" step="0.0001" value="${rate}" placeholder="0"></label></div>`;
    }).join('');
    shade.innerHTML=`<section class="settings"><header><div><h2>Bulk Dashboard Settings</h2><p>Building-portable configuration for Vision Bulk operations.</p></div><button id="closeSet">Close</button></header><div class="settingsLayout"><nav class="settingsTabs"><button class="active" data-tab="goals">Daily Goals</button><button data-tab="areas">Areas & Credit</button><button data-tab="rules">Classifications</button><button data-tab="display">Display</button><button data-tab="people">People</button><button data-tab="workleft">Work Left Ticker</button><button data-tab="refresh">Refresh</button><button data-tab="backup">Backup & Transfer</button></nav><main class="settingsMain"><section data-panel="goals"><h3>Daily Credit Goals</h3><span class="syncBadge shared">Synced via shared history folder</span><p>Set the daily credit goal for each current first-pick-time group. Pickers use the goal assigned to their matched group.</p><div id="goalGroupList" class="goalGroupList">${state.pickerGroups.length?state.pickerGroups.map(group=>`<label><span class="groupBadge" style="--group-color:${group.color};--group-text:${readableColor(group.color)}">${esc(group.abbreviation)}</span><b>${esc(group.name)}</b><small>${group.start} to ${group.end}</small><input data-goal-group="${esc(group.id)}" type="number" min="0" step="1" value="${state.groupCreditGoals[group.id]??''}" placeholder="No goal"></label>`).join(''):'<div class="note">No groups configured yet. Create groups under People first.</div>'}</div></section><section data-panel="areas" hidden><h3>Areas & Credit</h3><span class="syncBadge shared">Synced via shared history folder</span><p>Clear Include to exclude an area from picks, credit totals, rankings, card breakdowns, and ticker calculations.</p><div class="highVolumeSetting"><label><span><b>High Volume Credit Multiplier</b><small>Normal area credit rate × this multiplier. Default 0.75.</small></span><input id="highVolumeMultiplier" type="number" min="0" max="5" step="0.01" value="${state.highVolumeMultiplier}"></label><div><b>Decision Point reconciliation</b><span>Assigned High Volume batches are removed from their regular area and shown as a separate yellow card line.</span></div><div><b>Manual Adjustments</b><span class="syncBadge shared" style="margin:4px 0 6px">Synced via shared history folder</span><span>Adjustments made on any picker card automatically sync to every PC through the shared history folder — no file selection needed here.</span></div></div><div class="areaConfigHeader simplified"><span>Use</span><span>Detected Area</span><span>Credit per Pick</span></div><div id="areaConfigRows" class="areaConfigRows">${areaRows||'<div class="note">No areas detected yet.</div>'}</div></section><section data-panel="rules" hidden><div class="classificationHeader"><div><h3>Classification Rules</h3><span class="syncBadge shared">Synced via shared history folder</span><p>Create building-specific classifications. Decision Point Prescan pallet types matching any listed source code are grouped under the saved classification name and added to the allocated picker’s card.</p></div><button id="addClassificationRule" type="button">Add Classification</button></div><div class="classificationHelp"><b>How it works</b><span>Example: name the classification Header Water and enter MIXED-W as the source code. The script totals Carton Count by Allocated To from the Prescan Report. Use commas for multiple codes. Exclude ignores matching pallet types.</span></div><div class="classificationColumns"><span>Use</span><span>Classification Name</span><span>Source Codes</span><span>Exclude</span><span></span></div><div id="classificationRows" class="classificationRows"></div></section><section data-panel="display" hidden><h3>Display</h3><span class="syncBadge local">Saved on this device only (not shared)</span><p>Each percentage modifies the automatic responsive size. 100% is the default automatic size. Changes preview immediately and save when Save Settings is selected. Sizing is device-specific since every TV may need different text/panel sizes.</p><div class="displayAccordion"><details open><summary>Picker Cards</summary><div class="displayEditor"><div class="displayControls"><label>Columns<input id="displayColumns" type="number" min="2" max="8" value="${state.columns}"></label><label>Rows<input id="displayRows" type="number" min="2" max="8" value="${state.rows}"></label><label>Text Size %<input id="displayTextPercent" type="number" min="50" max="175" step="5" value="${state.cardTextPercent}"></label><label>Full Name Text Size %<input id="displayFullNamePercent" type="number" min="50" max="200" step="5" value="${state.cardFullNamePercent}"><small>Adjusts only the full name under the username.</small></label><label>Card Padding %<input id="displayCardPadding" type="number" min="50" max="175" step="5" value="${state.cardPaddingPercent}"></label><label>Area Row Spacing %<input id="displayCardRowGap" type="number" min="50" max="175" step="5" value="${state.cardRowGapPercent}"></label><label>Badge Text Size %<input id="displayGroupBadgeText" type="number" min="50" max="200" step="5" value="${state.groupBadgeTextPercent}"><small>Changes only the abbreviation text.</small></label><label>Badge Text Margin %<input id="displayGroupBadgeMargin" type="number" min="25" max="200" step="5" value="${state.groupBadgeMarginPercent}"><small>Controls space between the text and badge edges.</small></label><label>Badge Overall Size %<input id="displayGroupBadgeSize" type="number" min="50" max="200" step="5" value="${state.groupBadgeSizePercent}"><small>Scales badge height, border, and corner radius.</small></label><label>Big Number (main focus)<select id="cardPrimaryMetric">${metricOptionsHtml(state.cardPrimaryMetric)}</select><small>Shown large on the card. Goal progress % only displays when this is Total Credit.</small></label><label>Small Number (context)<select id="cardSecondaryMetric">${metricOptionsHtml(state.cardSecondaryMetric)}</select><small>Shown small, to the left of the big number.</small></label></div><div class="displayPreview"><div class="previewTitleRow"><span class="previewTitle">LIVE PICKER CARD | CLICK AN ELEMENT TO EDIT</span><span id="pickerPreviewSize" class="previewSize"></span></div><div id="selectedElementEditor" class="selectedElementEditor"><div class="selectedElementHeading"><b id="selectedElementName">Username</b><button id="resetSelectedElement" type="button">Reset Element</button></div><div class="elementEditGrid"><label>Text Size %<input id="elementTextSize" type="number" min="40" max="250" step="5"></label><label>Text Color<div class="colorPair"><input id="elementColor" type="color"><input id="elementColorText" maxlength="7"></div></label><label>Top Margin px<input id="elementMarginTop" type="number" min="-20" max="40" step="1"></label><label>Bottom Margin px<input id="elementMarginBottom" type="number" min="-20" max="40" step="1"></label><label>Horizontal Text Space px<input id="elementPaddingX" type="number" min="0" max="40" step="1"></label></div></div><article id="pickerCardPreview" class="pickerCard previewPicker"><header><div class="pickerIdentityBlock"><div class="pickerIdentity"><h2 class="ce-username" data-edit-element="username">JordanL!</h2><span class="groupBadge ce-groupBadge" data-edit-element="groupBadge" style="--group-color:#5b8def;--group-text:#FFFFFF">AM</span></div><small class="pickerFullName ce-fullName" data-edit-element="fullName">Jordan Ladell</small></div><div class="pickerHeroBlock"><div class="pickerHeroNumbers"><small class="pickerCreditPerHour">8.55</small><b class="ce-totalCredit" data-edit-element="totalCredit">248</b></div><small class="ce-totalCreditLabel" data-edit-element="totalCreditLabel">TOTAL CREDIT</small></div></header><div class="rule"></div><div class="cols head ce-areaHeader" data-edit-element="areaHeader"><span>AREA</span><span>PICKS</span><span>CREDIT</span></div><div class="areaRows"><div class="areaRowsTrack"><div class="cols"><strong class="ce-areaName" data-edit-element="areaName">BULK</strong><span class="ce-pickValue" data-edit-element="pickValue">207</span><b class="ce-creditValue" data-edit-element="creditValue">178.02</b></div><div class="cols highVolumeArea"><strong>HIGH VOLUME BULK</strong><span>44</span><b>26.40</b></div><div class="cols"><strong>CHAIRS</strong><span>18</span><b>17.10</b></div></div></div></article></div></div></details><details><summary>Sidebar</summary><div class="displayEditor"><div class="displayControls"><label>Right Panel Width %<input id="displaySideWidth" type="number" min="10" max="35" value="${state.sidebarWidthPercent}"></label><label>Text Size %<input id="displaySidebarText" type="number" min="50" max="175" step="5" value="${state.sidebarTextPercent}"></label><label>Panel Padding %<input id="displaySidebarPadding" type="number" min="50" max="175" step="5" value="${state.sidebarPaddingPercent}"></label><label>Ranking Row Spacing %<input id="displaySidebarRowGap" type="number" min="50" max="175" step="5" value="${state.sidebarRowGapPercent}"></label></div><div class="displayPreview"><span class="previewTitle">LIVE SIDEBAR</span><aside id="sidebarPreview" class="side previewSide"><section class="panel"><h3>GROUP CREDIT RANKINGS</h3><div class="rank"><div><span>1</span><b>AlexisR! <small>AM</small></b><strong>292</strong></div><div><span>2</span><b>KevinRo! <small>MID</small></b><strong>252</strong></div><div><span>3</span><b>OmarA! <small>PM</small></b><strong>225</strong></div></div></section></aside></div></div></details><details><summary>Ticker</summary><div class="displayEditor"><div class="displayControls"><label class="check">Show Top Ticker<input id="displayShowTicker" type="checkbox" ${state.showTicker?'checked':''}></label><label>Text Size %<input id="displayTickerText" type="number" min="50" max="175" step="5" value="${state.tickerTextPercent}"></label><label>Height %<input id="displayTickerHeight" type="number" min="50" max="175" step="5" value="${state.tickerHeightPercent}"></label><label>Item Spacing %<input id="displayTickerSpacing" type="number" min="50" max="175" step="5" value="${state.tickerSpacingPercent}"></label></div><div class="displayPreview tickerPreviewWrap"><span class="previewTitle">LIVE TICKER</span><div id="tickerPreview" class="top previewTop"><div class="ticker"><section><div><b>FLOOR LEFT:</b><strong>1,214</strong></div><div><b>RESERVE LEFT:</b><strong>688</strong></div></section></div></div></div></div></details></div></section><section data-panel="workleft" hidden><h3>Work Left Ticker</h3><span class="syncBadge shared">Synced via shared history folder</span><p>The ticker uses one Decision Point Zone Status request. Header uses Prescan Pending. Unit Pick, Pick to Belt, Calendars, and Reserve use Batch Pending plus Batch Printed because printed batches still need to be picked.</p><div class="form"><label>Zone Status Refresh Seconds<input id="workLeftRefreshSeconds" type="number" min="30" max="600" value="${state.workLeftRefreshSeconds}"><small>Default 60 seconds. One Decision Point request refreshes every displayed area.</small></label></div><div class="note">Fixed Orlando mapping:<br>HEADER = Floor + Mats + Mats Furniture + Liquid + Boards + Pick by Pallet Prescan Pending<br>UNIT PICK = Unit Pick + Hazmat Batch Pending + Batch Printed<br>PICK TO BELT = PTB High + PTB Low Batch Pending + Batch Printed<br>CALENDARS = Calendar Batch Pending + Batch Printed<br>RESERVE = Reserve + Reserve2 Batch Pending + Batch Printed</div><div class="note">All ticker counts are refreshed together from Decision Point Zone Status.</div></section><section data-panel="people" hidden><span class="syncBadge shared">Synced via shared history folder</span><div class="groupsHeader"><div><h3>First-Pick-Time Groups</h3><p>Each picker is automatically assigned to the first matching group based on the time of the picker’s first Vision pick. Overnight time ranges are supported.</p></div><button id="addPickerGroup" type="button">Add Group</button></div><div id="pickerGroupRows" class="pickerGroupRows"></div><h3>People Filters</h3><label class="wide">Excluded Usernames<textarea id="peopleExcluded">${esc([...state.excludedUsernames].join('\n'))}</textarea></label><div class="form"><label>Minimum Picks<input id="peopleMinimumPicks" type="number" min="0" value="${state.minimumPicks}"></label><label>Ranking Rotation Seconds<input id="rankingRotationSeconds" type="number" min="3" max="60" value="${state.rankingRotationSeconds}"><small>FT and PT rankings alternate when both are active.</small></label></div><h3>Sidebar Ranking Metrics</h3><p>Choose what the sidebar credit rankings rank by (big number) and what shows for context (small number to the left of it).</p><div class="form"><label>Big Number (ranked by this)<select id="rankingPrimaryMetric">${metricOptionsHtml(state.rankingPrimaryMetric)}</select></label><label>Small Number (context)<select id="rankingSecondaryMetric">${metricOptionsHtml(state.rankingSecondaryMetric)}</select></label></div></section><section data-panel="refresh" hidden><h3>Refresh</h3><span class="syncBadge shared">Synced via shared history folder</span><div class="form"><label>Vision Refresh Seconds<input id="refreshInterval" type="number" min="10" max="300" value="${state.refreshSeconds}"></label></div><div class="note">Historical dates use the selected Vision Associate Productivity date filter. Settings are stored separately for this Bulk dashboard.</div></section><section data-panel="backup" hidden><h3>Backup & Transfer</h3><div class="historyFolderSetting"><b>Daily History Folder</b><span id="historyFolderStatus">${esc(historyFolderStatusText())}</span><span id="masterStatusLine" class="masterStatusLine" ${state.historyDirStatus==='connected'?'':'hidden'}>${esc(state.isMaster?`This PC ("${state.instanceLabel}") is the Master saving pick data.`:`Master: ${state.masterOwnerLabel||'Unknown PC'}${state.masterHeartbeatAt?` (last save ${timeText(state.masterHeartbeatAt)})`:''}`)}</span><p>The dashboard automatically reads and writes one JSON file per day inside a <b>PickData</b> subfolder, and a shared settings file inside a <b>Settings</b> subfolder, both created automatically inside the folder you choose below. Any day already saved is kept; any day missing is added automatically once captured. Point every PC at the same shared/network folder to keep everything in sync and protect it from browser cache clears. Group Goals, credit rates, groups, classifications, rankings, and big/small number metrics all sync this way, checked every 5 minutes and pushed immediately on Save Settings. Manual Adjustments sync the same way. Only the <b>Master</b> PC (see status above) automatically writes the continuous production-data capture; every PC can still make adjustments and save settings immediately regardless of Master status. Display/sizing options stay local to each device.</p><label class="wide">This PC's Name<span class="syncBadge local" style="margin:2px 0 6px">Saved on this device only</span><input id="instanceLabelInput" type="text" maxlength="40" value="${esc(state.instanceLabel)}" placeholder="e.g. Front Office PC or TV Display"></label><button id="changeHistoryFolder" type="button">${state.historyDirStatus==='connected'?'Change History Folder':'Choose History Folder'}</button></div><h3>Export & Import</h3><p>Export or import every saved dashboard setting in one JSON file. Authentication tokens and live production data are not included. Manual Adjustments are synced separately through the history folder, not this export.</p><div class="backupActions"><button id="exportAllSettings" type="button">Export All Settings</button><button id="importAllSettings" type="button">Import All Settings</button><button id="exportAssociateHistoryCsv" type="button">Export Associate History CSV</button></div><div class="backupList"><b>Included</b><span>Area credit rates and enabled areas</span><span>Picker groups and daily group goals</span><span>Work Left names, IDs, enabled states, and update timer</span><span>Display sizing and card element designer settings</span><span>Classifications, High Volume multiplier, excluded usernames, refresh timers, rankings, and ticker settings</span><span>Associate history CSV creates one row per associate per operational day across all stored dates</span></div><div id="backupMessage" class="note">Import validates and normalizes older exports before applying them.</div></section></main></div><footer><span id="settingsMessage"></span><button id="saveSet" class="primary">Save Settings</button></footer></section>`;
    d.body.appendChild(shade);
    const activateSettingsTab=tabName=>{
      shade.querySelectorAll('[data-tab]').forEach(button=>button.classList.toggle('active',button.dataset.tab===tabName));
      shade.querySelectorAll('[data-panel]').forEach(panel=>{panel.hidden=panel.dataset.panel!==tabName;});
    };
    shade.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>activateSettingsTab(btn.dataset.tab));
    activateSettingsTab('goals');
    shade.querySelector('#exportAssociateHistoryCsv').onclick=()=>{try{const count=exportAssociateHistoryCsv();shade.querySelector('#backupMessage').textContent=`Exported ${count} associate-day rows across all stored dates.`;}catch(error){shade.querySelector('#backupMessage').textContent=error.message||String(error);}};
    shade.querySelector('#exportAllSettings').onclick=()=>{try{exportAllSettings();shade.querySelector('#backupMessage').textContent='All settings exported successfully.';}catch(error){shade.querySelector('#backupMessage').textContent=error.message||String(error);}};
    shade.querySelector('#importAllSettings').onclick=async()=>{const button=shade.querySelector('#importAllSettings'),message=shade.querySelector('#backupMessage');button.disabled=true;message.textContent='Reading and validating settings file...';try{const payload=await importAllSettings();message.textContent=`Imported all settings from ${payload.exportedAt?new Date(payload.exportedAt).toLocaleString():'the selected backup'}. Reopen Settings to view imported values.`;}catch(error){message.textContent=error.message||String(error);}finally{button.disabled=false;}};
    shade.querySelector('#changeHistoryFolder').onclick=async()=>{const button=shade.querySelector('#changeHistoryFolder'),status=shade.querySelector('#historyFolderStatus');button.disabled=true;try{await chooseHistoryFolder();status.textContent=historyFolderStatusText();button.textContent='Change History Folder';}catch(error){status.textContent=error.message||String(error);}finally{button.disabled=false;}};
    let draftClassificationRules=normalizeClassificationRules(state.classificationRules);
    const classificationHost=shade.querySelector('#classificationRows');
    const renderClassificationEditor=()=>{
      classificationHost.innerHTML=draftClassificationRules.length?draftClassificationRules.map((rule,index)=>`<div class="classificationRow" data-rule-index="${index}"><label class="classificationCheck"><input data-rule-enabled type="checkbox" ${rule.enabled?'checked':''}></label><label><small>Classification Name</small><input data-rule-name maxlength="50" value="${esc(rule.name)}"></label><label><small>Source Codes</small><input data-rule-codes value="${esc(rule.codes.join(', '))}" placeholder="FULL-R, MIXED-R"></label><label class="classificationCheck excludeCheck"><input data-rule-exclude type="checkbox" ${rule.exclude?'checked':''}></label><button data-delete-rule type="button">Delete</button></div>`).join(''):'<div class="note">No classification rules are configured. Select Add Classification to create one.</div>';
      classificationHost.querySelectorAll('.classificationRow').forEach(row=>{
        const index=Number(row.dataset.ruleIndex),rule=draftClassificationRules[index];
        const sync=()=>{rule.enabled=row.querySelector('[data-rule-enabled]').checked;rule.name=String(row.querySelector('[data-rule-name]').value||'').trim();rule.codes=[...new Set(String(row.querySelector('[data-rule-codes]').value||'').split(/[,;\\n]+/).map(v=>v.trim().toUpperCase()).filter(Boolean))];rule.exclude=row.querySelector('[data-rule-exclude]').checked;};
        row.querySelectorAll('input').forEach(input=>input.addEventListener('input',sync));
        row.querySelector('[data-delete-rule]').onclick=()=>{draftClassificationRules.splice(index,1);renderClassificationEditor();};
      });
    };
    shade.querySelector('#addClassificationRule').onclick=()=>{draftClassificationRules.push({id:`classification_${Date.now()}`,name:`New Classification ${draftClassificationRules.length+1}`,codes:[],enabled:true,exclude:false});renderClassificationEditor();};
    renderClassificationEditor();
    let draftGroups=normalizePickerGroups(state.pickerGroups);
    const groupHost=shade.querySelector('#pickerGroupRows');
    const renderGroupEditor=()=>{
      groupHost.innerHTML=draftGroups.length?draftGroups.map((group,index)=>`<div class="pickerGroupRow" data-group-index="${index}"><span class="groupBadge editorBadge" style="--group-color:${group.color};--group-text:${readableColor(group.color)}">${esc(group.abbreviation)}</span><label><small>Group Name</small><input data-group-name value="${esc(group.name)}"></label><label><small>Abbreviation</small><input data-group-abbreviation maxlength="8" value="${esc(group.abbreviation)}"></label><label><small>First Pick Start</small><input data-group-start type="time" value="${group.start}"></label><label><small>First Pick End</small><input data-group-end type="time" value="${group.end}"></label><label><small>Badge Color</small><input data-group-color type="color" value="${group.color}"></label><button data-delete-group type="button">Delete</button></div>`).join(''):'<div class="note">No groups configured. Add a group to begin automatic first-pick assignment.</div>';
      groupHost.querySelectorAll('.pickerGroupRow').forEach(row=>{
        const index=Number(row.dataset.groupIndex),group=draftGroups[index],badge=row.querySelector('.editorBadge');
        const sync=()=>{group.name=String(row.querySelector('[data-group-name]').value||'').trim();group.abbreviation=normalizeGroupAbbreviation(row.querySelector('[data-group-abbreviation]').value,group.name);group.start=row.querySelector('[data-group-start]').value||'00:00';group.end=row.querySelector('[data-group-end]').value||'23:59';group.color=normalizeColor(row.querySelector('[data-group-color]').value);badge.textContent=group.abbreviation;badge.style.setProperty('--group-color',group.color);badge.style.setProperty('--group-text',readableColor(group.color));};
        row.querySelectorAll('input').forEach(input=>input.addEventListener('input',sync));
        row.querySelector('[data-delete-group]').onclick=()=>{draftGroups.splice(index,1);renderGroupEditor();};
      });
    };
    shade.querySelector('#addPickerGroup').onclick=()=>{draftGroups.push({id:`group_${Date.now()}`,name:`Group ${draftGroups.length+1}`,abbreviation:`G${draftGroups.length+1}`,start:'00:00',end:'23:59',color:'#5b8def'});renderGroupEditor();};
    renderGroupEditor();
    const draftElementStyles=normalizeCardElementStyles(state.cardElementStyles);
    let selectedElementKey='username';
    const elementEditor={name:shade.querySelector('#selectedElementName'),textSize:shade.querySelector('#elementTextSize'),color:shade.querySelector('#elementColor'),colorText:shade.querySelector('#elementColorText'),marginTop:shade.querySelector('#elementMarginTop'),marginBottom:shade.querySelector('#elementMarginBottom'),paddingX:shade.querySelector('#elementPaddingX')};
    const applyDraftElementStyles=target=>{
      if(!target)return;
      for(const [key,value] of Object.entries(draftElementStyles)){
        target.style.setProperty(`--ce-${key}-size`,value.textSize/100);
        target.style.setProperty(`--ce-${key}-color`,value.color);
        target.style.setProperty(`--ce-${key}-mt`,`${value.marginTop}px`);
        target.style.setProperty(`--ce-${key}-mb`,`${value.marginBottom}px`);
        target.style.setProperty(`--ce-${key}-px`,`${value.paddingX}px`);
      }
    };
    const loadSelectedElement=key=>{
      selectedElementKey=key;const style=draftElementStyles[key];if(!style)return;
      shade.querySelectorAll('[data-edit-element]').forEach(el=>el.classList.toggle('selectedPreviewElement',el.dataset.editElement===key));
      elementEditor.name.textContent=style.label;elementEditor.textSize.value=style.textSize;elementEditor.color.value=style.color;elementEditor.colorText.value=style.color;elementEditor.marginTop.value=style.marginTop;elementEditor.marginBottom.value=style.marginBottom;elementEditor.paddingX.value=style.paddingX;
    };
    const updateSelectedElement=()=>{
      const style=draftElementStyles[selectedElementKey];if(!style)return;
      style.textSize=Math.min(250,Math.max(40,n(elementEditor.textSize.value)||100));
      const color=/^#[0-9a-f]{6}$/i.test(elementEditor.colorText.value)?elementEditor.colorText.value.toUpperCase():elementEditor.color.value.toUpperCase();
      style.color=color;elementEditor.color.value=color;elementEditor.colorText.value=color;
      style.marginTop=Math.min(40,Math.max(-20,n(elementEditor.marginTop.value)));style.marginBottom=Math.min(40,Math.max(-20,n(elementEditor.marginBottom.value)));style.paddingX=Math.min(40,Math.max(0,n(elementEditor.paddingX.value)));
      applyDraftElementStyles(shade.querySelector('#pickerCardPreview'));
    };
    shade.querySelectorAll('[data-edit-element]').forEach(el=>el.onclick=e=>{e.stopPropagation();loadSelectedElement(el.dataset.editElement);});
    for(const input of [elementEditor.textSize,elementEditor.color,elementEditor.colorText,elementEditor.marginTop,elementEditor.marginBottom,elementEditor.paddingX])input.addEventListener('input',()=>{if(input===elementEditor.color)elementEditor.colorText.value=elementEditor.color.value;updateSelectedElement();});
    shade.querySelector('#resetSelectedElement').onclick=()=>{draftElementStyles[selectedElementKey]={...CARD_ELEMENT_DEFAULTS[selectedElementKey]};loadSelectedElement(selectedElementKey);applyDraftElementStyles(shade.querySelector('#pickerCardPreview'));};
    loadSelectedElement(selectedElementKey);
    const calculatePreviewCardSize=()=>{
      const liveGrid=state.ui?.cards;
      const columnInput=shade.querySelector('#displayColumns');
      const rowInput=shade.querySelector('#displayRows');
      const columns=Math.min(8,Math.max(2,Math.round(n(columnInput?.value)||state.columns||5)));
      const rows=Math.min(8,Math.max(2,Math.round(n(rowInput?.value)||state.rows||5)));
      if(!liveGrid)return {width:360,height:210,columns,rows};
      const style=getComputedStyle(liveGrid);
      const gapX=parseFloat(style.columnGap)||7;
      const gapY=parseFloat(style.rowGap)||7;
      const width=Math.max(180,(liveGrid.clientWidth-gapX*(columns-1))/columns);
      const height=Math.max(110,(liveGrid.clientHeight-gapY*(rows-1))/rows);
      return {width,height,columns,rows};
    };
    const updateDisplayPreviews=()=>{
      const card=shade.querySelector('#pickerCardPreview'),cardWrap=card?.closest('.displayPreview'),sizeLabel=shade.querySelector('#pickerPreviewSize'),side=shade.querySelector('#sidebarPreview'),ticker=shade.querySelector('#tickerPreview');
      const cardText=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displayTextPercent')?.value||100)/100));
      const fullNameText=Math.min(2,Math.max(.5,n(shade.querySelector('#displayFullNamePercent')?.value||100)/100));
      const cardPad=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displayCardPadding')?.value||100)/100));
      const cardGap=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displayCardRowGap')?.value||100)/100));
      const badgeText=Math.min(2,Math.max(.5,n(shade.querySelector('#displayGroupBadgeText')?.value||100)/100));
      const badgeMargin=Math.min(2,Math.max(.25,n(shade.querySelector('#displayGroupBadgeMargin')?.value||100)/100));
      const badgeSize=Math.min(2,Math.max(.5,n(shade.querySelector('#displayGroupBadgeSize')?.value||100)/100));
      if(card){
        const measured=calculatePreviewCardSize();
        card.style.width=`${measured.width.toFixed(1)}px`;
        card.style.height=`${measured.height.toFixed(1)}px`;
        card.style.minHeight='0';
        card.style.maxWidth='none';
        card.style.flex='0 0 auto';
        card.style.setProperty('--card-text-scale',cardText);
        card.style.setProperty('--card-fullname-scale',fullNameText);
        card.style.setProperty('--card-padding-scale',cardPad);
        card.style.setProperty('--card-row-gap-scale',cardGap);
        card.style.setProperty('--group-badge-text-scale',badgeText);
        card.style.setProperty('--group-badge-margin-scale',badgeMargin);
        card.style.setProperty('--group-badge-size-scale',badgeSize);
        applyDraftElementStyles(card);
        if(cardWrap){cardWrap.style.display='block';cardWrap.style.overflow='auto';}
        if(sizeLabel)sizeLabel.textContent=`${Math.round(measured.width)} x ${Math.round(measured.height)} px | ${measured.columns} cols x ${measured.rows} rows`;
        const previewPrimary=metricKeyOrDefault(shade.querySelector('#cardPrimaryMetric')?.value,'totalCredit');
        const previewSecondary=metricKeyOrDefault(shade.querySelector('#cardSecondaryMetric')?.value,'creditPerActiveHour');
        const fakePicker={totalCredit:248,totalPicks:269,workSeconds:29000,breakSeconds:1800,firstPick:new Date('2000-01-01T09:00:00'),latestEnd:new Date('2000-01-01T17:30:00'),creditPerHour:248/(29000/3600)};
        const previewSecondaryEl=card.querySelector('.pickerCreditPerHour'),previewPrimaryEl=card.querySelector('.ce-totalCredit'),previewLabelEl=card.querySelector('.ce-totalCreditLabel');
        if(previewSecondaryEl){previewSecondaryEl.textContent=metricDisplay(previewSecondary,fakePicker);previewSecondaryEl.title=(RANKING_METRICS[previewSecondary]||RANKING_METRICS.creditPerActiveHour).label;}
        if(previewPrimaryEl)previewPrimaryEl.textContent=metricDisplay(previewPrimary,fakePicker);
        if(previewLabelEl)previewLabelEl.textContent=previewPrimary==='totalCredit'?'TOTAL CREDIT':RANKING_METRICS[previewPrimary].short;
      }
      const sideText=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displaySidebarText')?.value||100)/100));
      const sidePad=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displaySidebarPadding')?.value||100)/100));
      const sideGap=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displaySidebarRowGap')?.value||100)/100));
      if(side){side.style.setProperty('--sidebar-text-scale',sideText);side.style.setProperty('--sidebar-padding-scale',sidePad);side.style.setProperty('--sidebar-row-gap-scale',sideGap);}
      const tickerText=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displayTickerText')?.value||100)/100));
      const tickerHeight=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displayTickerHeight')?.value||100)/100));
      const tickerSpacing=Math.min(1.75,Math.max(.5,n(shade.querySelector('#displayTickerSpacing')?.value||100)/100));
      if(ticker){ticker.style.setProperty('--ticker-text-scale',tickerText);ticker.style.setProperty('--ticker-height-scale',tickerHeight);ticker.style.setProperty('--ticker-spacing-scale',tickerSpacing);ticker.style.display=shade.querySelector('#displayShowTicker')?.checked?'flex':'none';}
    };
    for(const id of ['displayColumns','displayRows','displayTextPercent','displayFullNamePercent','displayCardPadding','displayCardRowGap','displayGroupBadgeText','displayGroupBadgeMargin','displayGroupBadgeSize','cardPrimaryMetric','cardSecondaryMetric','displaySidebarText','displaySidebarPadding','displaySidebarRowGap','displayTickerText','displayTickerHeight','displayTickerSpacing','displayShowTicker'])shade.querySelector('#'+id)?.addEventListener('input',updateDisplayPreviews);
    updateDisplayPreviews();
    let previewResizeObserver=null;
    if(typeof ResizeObserver==='function'){
      previewResizeObserver=new ResizeObserver(()=>requestAnimationFrame(updateDisplayPreviews));
      if(state.ui?.cards)previewResizeObserver.observe(state.ui.cards);
      const previewHost=shade.querySelector('#pickerCardPreview')?.closest('.displayPreview');
      if(previewHost)previewResizeObserver.observe(previewHost);
    }
    const close=()=>{previewResizeObserver?.disconnect();shade.remove();};shade.querySelector('#closeSet').onclick=close;
    shade.querySelector('#saveSet').onclick=async()=>{
      state.groupCreditGoals=Object.fromEntries([...shade.querySelectorAll('[data-goal-group]')].map(input=>[input.dataset.goalGroup,Math.max(0,n(input.value))]));state.goalOperationalDate=goalDayKey();
      const newRates={},newEnabled={};
      shade.querySelectorAll('.areaConfigRow').forEach(row=>{
        const area=canonicalAreaKey(row.dataset.rawArea);
        const rateText=row.querySelector('[data-area-rate]').value.trim();
        newEnabled[area]=row.querySelector('[data-area-enabled]').checked;
        if(rateText!=='')newRates[area]=Math.max(0,n(rateText));
      });
      state.creditRates=newRates;state.enabledAreas=newEnabled;state.areaAliases={};state.highVolumeMultiplier=Math.min(5,Math.max(0,n(shade.querySelector('#highVolumeMultiplier').value)));
      state.columns=n(shade.querySelector('#displayColumns').value);state.rows=n(shade.querySelector('#displayRows').value);state.sidebarWidthPercent=n(shade.querySelector('#displaySideWidth').value);state.cardTextPercent=n(shade.querySelector('#displayTextPercent').value);state.cardFullNamePercent=n(shade.querySelector('#displayFullNamePercent').value);state.cardPaddingPercent=n(shade.querySelector('#displayCardPadding').value);state.cardRowGapPercent=n(shade.querySelector('#displayCardRowGap').value);state.groupBadgeTextPercent=n(shade.querySelector('#displayGroupBadgeText').value);state.groupBadgeMarginPercent=n(shade.querySelector('#displayGroupBadgeMargin').value);state.groupBadgeSizePercent=n(shade.querySelector('#displayGroupBadgeSize').value);state.cardPrimaryMetric=metricKeyOrDefault(shade.querySelector('#cardPrimaryMetric').value,'totalCredit');state.cardSecondaryMetric=metricKeyOrDefault(shade.querySelector('#cardSecondaryMetric').value,'creditPerActiveHour');state.sidebarTextPercent=n(shade.querySelector('#displaySidebarText').value);state.sidebarPaddingPercent=n(shade.querySelector('#displaySidebarPadding').value);state.sidebarRowGapPercent=n(shade.querySelector('#displaySidebarRowGap').value);state.tickerTextPercent=n(shade.querySelector('#displayTickerText').value);state.tickerHeightPercent=n(shade.querySelector('#displayTickerHeight').value);state.tickerSpacingPercent=n(shade.querySelector('#displayTickerSpacing').value);state.showTicker=shade.querySelector('#displayShowTicker').checked;
      state.workLeftRefreshSeconds=n(shade.querySelector('#workLeftRefreshSeconds').value);state.pickerGroups=normalizePickerGroups(draftGroups);state.classificationRules=normalizeClassificationRules(draftClassificationRules);state.cardElementStyles=normalizeCardElementStyles(draftElementStyles);state.excludedUsernames=new Set(parseNames(shade.querySelector('#peopleExcluded').value));state.minimumPicks=n(shade.querySelector('#peopleMinimumPicks').value);state.rankingRotationSeconds=n(shade.querySelector('#rankingRotationSeconds').value);state.rankingPrimaryMetric=metricKeyOrDefault(shade.querySelector('#rankingPrimaryMetric').value,'creditPerActiveHour');state.rankingSecondaryMetric=metricKeyOrDefault(shade.querySelector('#rankingSecondaryMetric').value,'totalCredit');state.refreshSeconds=n(shade.querySelector('#refreshInterval').value);
      applyDisplaySettings(currentDisplaySettings());saveDisplaySettings();
      applySharedSettings(currentSharedSettings());await pushSharedSettingsNow();await syncHistoryWithFolder();
      saveInstanceLabel(shade.querySelector('#instanceLabelInput').value);renderMasterBadge();
      state.tickerSignature='';state.tickerStructureSignature='';state.cardsSignature='';state.rankingSignature='';state.goalsSignature='';if(state.data)processData(state.data);restartTimer();restartWorkLeftTimer();render();refreshWorkLeft();restartRankingRotation(true);shade.querySelector('#settingsMessage').textContent=state.historyDirStatus==='connected'?'Settings saved (shared settings pushed to folder).':'Settings saved. Shared settings will push to the folder once connected.';
    };
  }
  function html(){return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;height:100%;overflow:hidden;background:#0a0e14;color:#eef1f6;font-family:Arial,sans-serif}:root{--viewport-scale:1;--card-text-scale:1;--card-fullname-scale:1;--card-padding-scale:1;--card-row-gap-scale:1;--group-badge-text-scale:1;--group-badge-margin-scale:1;--group-badge-size-scale:1;--sidebar-text-scale:1;--sidebar-padding-scale:1;--sidebar-row-gap-scale:1;--ticker-text-scale:1;--ticker-height-scale:1;--ticker-spacing-scale:1}.top{height:calc(40px * var(--ticker-height-scale));border-bottom:1px solid #232a38;overflow:hidden;background:linear-gradient(180deg,#12171f,#0d1219);box-shadow:0 1px 0 rgba(255,255,255,.03) inset;display:flex;align-items:stretch}.brandLogo{flex:0 0 auto;width:136px;display:flex;align-items:center;justify-content:center;padding:4px 10px;background:#0d1219;border-right:1px solid #232a38;overflow:hidden}.brandLogo img{display:block;width:100%;height:100%;object-fit:contain;filter:none;transform:scale(1.04);transform-origin:center}.tickerViewport{flex:1 1 auto;min-width:0;overflow:hidden}.connectivity{flex:0 0 auto;width:16px;height:16px;margin:auto 14px;border-radius:50%;border:2px solid rgba(255,255,255,.65);background:#64748b;box-shadow:0 0 0 3px rgba(0,0,0,.25);cursor:help;padding:0}.connectivity.ok{background:#3ecf8e}.connectivity.warning{background:#e8b455}.connectivity.error{background:#ef4444;animation:connectionPulse 1.15s ease-in-out infinite}.connectivity.idle{background:#64748b}@keyframes connectionPulse{0%,100%{box-shadow:0 0 0 3px rgba(0,0,0,.25),0 0 0 0 rgba(239,68,68,.65)}50%{box-shadow:0 0 0 3px rgba(0,0,0,.25),0 0 0 8px rgba(239,68,68,0)}}.ticker{display:flex;width:max-content;will-change:transform;backface-visibility:hidden;contain:layout paint;animation:move var(--ticker-loop-duration,70s) linear infinite}.ticker section{display:flex}.ticker div{height:calc(40px * var(--ticker-height-scale));display:flex;align-items:center;gap:8px;padding:0 calc(22px * var(--ticker-spacing-scale));border-right:1px solid #232a38;white-space:nowrap}.ticker b{color:#8496ab;font-size:calc(12px * var(--ticker-text-scale));font-weight:800;letter-spacing:.4px;text-transform:uppercase}.ticker strong{color:#3ecf8e;font-size:calc(16px * var(--ticker-text-scale));font-weight:900;font-variant-numeric:tabular-nums}@keyframes move{from{transform:translate3d(0,0,0)}to{transform:translate3d(calc(-1 * var(--ticker-loop-distance,0px)),0,0)}}
.layout{height:calc(100vh - 40px);display:grid;grid-template-columns:minmax(0,1fr) 14%;gap:6px;padding:4px 4px 40px}.cards{display:grid;overflow-x:hidden!important;scrollbar-gutter:stable;grid-template-columns:repeat(5,minmax(0,1fr));grid-auto-rows:minmax(110px,1fr);gap:6px;overflow:auto;min-height:0}.pickerCard{position:relative;display:flex;flex-direction:column;cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .2s ease;background:linear-gradient(180deg,#181f2c 0%,#141a24 100%);border:1px solid #2a3242;border-left:3px solid #5b8def;border-radius:9px;padding:calc(3px * var(--card-padding-scale)) calc(8px * var(--card-padding-scale)) calc(4px * var(--card-padding-scale));box-shadow:0 1px 2px rgba(0,0,0,.5),0 6px 14px rgba(0,0,0,.22);overflow:hidden}.pickerCard.goalMet{border-color:#2a3242!important;border-left-color:var(--goal-met-color,#3ECF8E)!important;background:linear-gradient(180deg,#19352b 0%,#17271f 48%,#141a24 78%)!important;box-shadow:0 1px 2px rgba(0,0,0,.5),0 6px 20px rgba(62,207,142,.24),inset 0 0 24px rgba(62,207,142,.07)!important}.pickerCard:hover,.pickerCard:focus{outline:none;border-color:#5b8def;box-shadow:0 2px 4px rgba(0,0,0,.5),0 8px 22px rgba(91,141,239,.22);transform:translateY(-2px)}
.ce-username{font-size:calc(20px * var(--card-text-scale) * var(--ce-username-size,1))!important;color:var(--ce-username-color,#fff)!important;margin:var(--ce-username-mt,0) var(--ce-username-px,0) var(--ce-username-mb,0)!important}
.ce-fullName{font-size:calc(11px * var(--card-text-scale) * var(--card-fullname-scale) * var(--ce-fullName-size,1))!important;color:var(--ce-fullName-color,#8496AB)!important;margin:var(--ce-fullName-mt,2px) var(--ce-fullName-px,0) var(--ce-fullName-mb,0)!important}
.ce-groupBadge{font-size:calc(9px * var(--card-text-scale) * var(--group-badge-text-scale) * var(--ce-groupBadge-size,1))!important;color:var(--ce-groupBadge-color,var(--group-text,#fff))!important;margin:var(--ce-groupBadge-mt,0) var(--ce-groupBadge-px,7px) var(--ce-groupBadge-mb,0)!important}
.ce-totalCredit{font-size:calc(19px * var(--card-text-scale) * var(--ce-totalCredit-size,1))!important;color:var(--ce-totalCredit-color,#3ECF8E)!important;margin:var(--ce-totalCredit-mt,0) var(--ce-totalCredit-px,0) var(--ce-totalCredit-mb,0)!important}
.ce-totalCreditLabel{font-size:calc(8px * var(--card-text-scale) * var(--ce-totalCreditLabel-size,1))!important;color:var(--ce-totalCreditLabel-color,#8496AB)!important;margin:var(--ce-totalCreditLabel-mt,0) var(--ce-totalCreditLabel-px,0) var(--ce-totalCreditLabel-mb,0)!important}
.ce-areaHeader{font-size:calc(8px * var(--card-text-scale) * var(--ce-areaHeader-size,1))!important;color:var(--ce-areaHeader-color,#8496AB)!important;margin:var(--ce-areaHeader-mt,0) var(--ce-areaHeader-px,0) var(--ce-areaHeader-mb,0)!important}
.ce-areaName{font-size:calc(var(--area-font-size,calc(12px * var(--card-text-scale))) * var(--ce-areaName-size,1))!important;color:var(--ce-areaName-color,#fff);margin:var(--ce-areaName-mt,0) var(--ce-areaName-px,0) var(--ce-areaName-mb,0)!important}
.ce-pickValue{font-size:calc(var(--area-font-size,calc(12px * var(--card-text-scale))) * var(--ce-pickValue-size,1))!important;color:var(--ce-pickValue-color,#fff);margin:var(--ce-pickValue-mt,0) var(--ce-pickValue-px,0) var(--ce-pickValue-mb,0)!important}
.ce-creditValue{font-size:calc(var(--area-font-size,calc(12px * var(--card-text-scale))) * var(--ce-creditValue-size,1))!important;color:var(--ce-creditValue-color,#9FB8D9);margin:var(--ce-creditValue-mt,0) var(--ce-creditValue-px,0) var(--ce-creditValue-mb,0)!important}
.pickerIdentityBlock{min-width:0;display:flex;flex-direction:column;align-items:flex-start}.pickerIdentity{display:flex;align-items:center;gap:4px;min-width:0;max-width:100%}.pickerIdentity h2{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pickerFullName{display:block;max-width:100%;margin-top:0;color:#8496ab!important;font-size:calc(11px * var(--card-text-scale) * var(--card-fullname-scale))!important;line-height:1.12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left!important;font-weight:600}.groupBadge{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;min-height:calc(20px * var(--group-badge-size-scale));padding:calc(3px * var(--group-badge-margin-scale) * var(--group-badge-size-scale)) calc(7px * var(--group-badge-margin-scale) * var(--group-badge-size-scale));border-radius:calc(999px * var(--group-badge-size-scale));background:linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)),var(--group-color,#5b8def);color:var(--group-text,#fff);border:calc(1px * var(--group-badge-size-scale)) solid rgba(255,255,255,.22);box-shadow:0 1px 3px rgba(0,0,0,.3);font-size:calc(9px * var(--card-text-scale) * var(--group-badge-text-scale));font-weight:900;letter-spacing:.2px;line-height:1;white-space:nowrap}.pickerCard header{display:flex;justify-content:space-between;align-items:flex-start;gap:5px;flex:0 0 auto;min-height:0}.pickerCard h2{font-size:calc(20px * var(--card-text-scale));font-weight:800;letter-spacing:.2px;line-height:1.08;margin:0}.pickerCard header div{text-align:right}.pickerCard header b{display:block;color:#3ecf8e;font-size:calc(19px * var(--card-text-scale))}.pickerCard header small:not(.pickerFullName),.head{font-size:calc(8px * var(--card-text-scale));color:#8496ab;font-weight:800;letter-spacing:.4px;text-transform:uppercase}.pickerHeroBlock{min-width:0;padding-top:0;margin:0}.pickerHeroNumbers{display:flex;align-items:baseline;justify-content:flex-end;gap:4px;line-height:1}.pickerCreditPerHour{font-size:calc(12px * var(--card-text-scale))!important;color:#8496ab!important;font-weight:700!important;white-space:nowrap}.rule{height:1px;flex:0 0 auto;background:#232a38;margin:2px 0 1px}.cols{display:grid;grid-template-columns:minmax(0,1fr) 52px 62px;gap:4px;align-items:center;height:var(--area-row-height,auto);font-size:var(--area-font-size,calc(12px * var(--card-text-scale)));line-height:1.15;padding:0;border-bottom:1px solid #1c222e;min-height:0;overflow:hidden}.cols strong,.cols span,.cols b{min-width:0;margin:0;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cols span,.cols b{text-align:right}.cols.head{flex:0 0 auto;height:auto;min-height:calc(11px * var(--viewport-scale,1));padding:0;border-bottom-color:#2a3242}.cols.head span{font-size:calc(8px * var(--card-text-scale));line-height:1;letter-spacing:.3px}.cols.head span:first-child{text-align:left;justify-self:start}.cols b{color:#9fb8d9;font-weight:800}.cols.highVolumeArea strong,.cols.highVolumeArea span,.cols.highVolumeArea b{color:#e8b455!important}.cols.manualAdded>* ,.manualAdded td{color:#3ECF8E!important}.cols.manualRemoved>* ,.manualRemoved td{color:#f2707d!important}.highVolumeDetail td{color:#e8b455!important}.areaRows{position:relative;display:flex;align-items:flex-start;flex:1 1 auto;min-height:0;overflow:hidden}.areaRowsTrack{position:relative;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;width:100%;will-change:transform;transform:translate3d(0,0,0);backface-visibility:hidden;contain:layout paint;transform-style:preserve-3d}.areaRowsTrack>.cols{min-height:0;padding:0;line-height:1.15;overflow:hidden}.areaScrollSpacer{height:0;min-height:0}.areaRows.autoScroll .areaRowsTrack{animation:areaRowsMarquee var(--area-scroll-duration,30s) linear infinite}@keyframes areaRowsMarquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,calc(-1 * var(--area-scroll-distance,0px)),0)}}.inactive{border-left-color:#4a5568}.side{display:flex;flex-direction:column;gap:8px;min-height:0}.goalsPanel{flex:0 0 auto}.rankingsPanel{flex:1 1 auto;min-height:0;overflow:hidden;display:flex;flex-direction:column}.panelTitleRow{display:flex;align-items:center;justify-content:space-between;gap:5px}.panelTitleRow h3{margin:0!important}.panelTitleRow button{background:#1C2740;color:#9FB8D9;border:1px solid #333D52;border-radius:4px;padding:4px 7px;font-size:10px;font-weight:900}.groupGoals{display:grid;grid-template-columns:1fr;gap:6px;margin-top:8px}.goalKpiCard,.noGoalsCard{width:100%;border:1px solid color-mix(in srgb,var(--goal-group-color) 45%,#2A3242);border-left:3px solid var(--goal-group-color);border-radius:9px;background:linear-gradient(135deg,color-mix(in srgb,var(--goal-group-color) 12%,#161C27),#161C27 65%);box-shadow:0 1px 2px rgba(0,0,0,.4),0 4px 10px rgba(0,0,0,.18);color:#fff;padding:11px 12px;text-align:left;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}.goalKpiCard:hover{transform:translateY(-1px);box-shadow:0 2px 4px rgba(0,0,0,.4),0 6px 16px rgba(0,0,0,.24)}.goalKpiCard{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;gap:9px;min-height:68px}.goalMain{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:7px;min-width:0;overflow:visible!important}.goalKpiCard .goalGroupName{display:block;min-width:0;color:#9FB8D9;font-size:calc(16px * var(--sidebar-text-scale));font-weight:900;line-height:1.05;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.goalKpiCard .goalNumber{display:block;color:#fff;font-size:calc(28px * var(--sidebar-text-scale));font-weight:900;line-height:1;text-align:left;font-variant-numeric:tabular-nums;white-space:nowrap}.goalHitBlock{display:grid!important;grid-template-columns:auto minmax(24px,auto);align-items:center;justify-content:end;gap:7px;min-width:82px;padding-left:9px;border-left:2px solid color-mix(in srgb,var(--goal-group-color) 62%,#2A3242);overflow:visible!important}.goalHitBlock small{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;color:#9fb8d9;font-size:calc(11px * var(--sidebar-text-scale));font-weight:900;line-height:.88;letter-spacing:.35px;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.65)}.goalHitBlock small em{display:block;font-style:normal}.goalHitBlock strong{display:block;min-width:24px;color:#3ECF8E;font-size:calc(29px * var(--sidebar-text-scale));font-weight:900;line-height:1;text-align:right;font-variant-numeric:tabular-nums;text-shadow:0 0 8px rgba(62,207,142,.18)}.noGoalsCard{border-left-color:#4A5568;color:#7690a8;text-align:center;font-weight:900;padding:14px 8px}.quickGoalBox{width:min(650px,92vw);max-height:78vh;background:#12171f;border:1px solid #3A4763;border-radius:9px;display:flex;flex-direction:column}.quickGoalBox header,.quickGoalBox footer{display:flex;align-items:center;padding:12px 15px;border-bottom:1px solid #2A3242}.quickGoalBox header h2{margin:0;color:#9FB8D9}.quickGoalBox header p{margin:3px 0 0;color:#8496AB;font-size:11px}.quickGoalBox header button{margin-left:auto}.quickGoalBox main{padding:12px;overflow:auto;display:grid;gap:8px}.quickGoalBox main label{display:grid;grid-template-columns:auto 1fr 100px 120px;gap:9px;align-items:center;background:#161C27;border:1px solid #2A3242;border-radius:6px;padding:9px}.quickGoalBox main small{color:#7690a8}.quickGoalBox main input{height:40px;background:#0E131C;color:#fff;border:1px solid #333D52;border-radius:5px;padding:6px;font-size:17px}.quickGoalBox footer{border-top:1px solid #2A3242;border-bottom:0}.quickGoalBox footer span{margin-right:auto;color:#3ECF8E}.quickGoalBox button{background:#3F6FD1;color:#fff;border:1px solid #7BA3E8;border-radius:5px;padding:7px 12px;font-weight:900}.panel{background:linear-gradient(180deg,#171d29,#141a24);border:1px solid #2a3242;border-radius:10px;padding:calc(11px * var(--sidebar-padding-scale));box-shadow:0 1px 2px rgba(0,0,0,.4),0 4px 10px rgba(0,0,0,.16)}.panel h3{color:#9fb8d9;font-size:calc(14px * var(--sidebar-text-scale));font-weight:800;letter-spacing:.5px;text-transform:uppercase;margin:0 0 9px}.rank{flex:1 1 auto;min-height:0;overflow:hidden;opacity:1;transform:translateY(0);transition:opacity .35s ease,transform .35s ease}.rank.rankingFadeOut{opacity:0;transform:translateY(5px)}.rank.rankingFadeIn{animation:rankingFadeIn .45s ease both}@keyframes rankingFadeIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}}.rankingRow[hidden]{display:none!important}.rankingRow{display:grid;grid-template-columns:26px minmax(0,1fr) auto;align-items:center;gap:8px;padding:calc(8px * var(--sidebar-row-gap-scale)) 8px;margin-bottom:3px;border:1px solid transparent;border-bottom:1px solid #232a38;border-radius:6px;background:rgba(22,28,39,.55);font-size:calc(14px * var(--sidebar-text-scale))}.rankingPlace{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#232a38;color:#8496AB;font-size:11px;font-weight:900}.rankingPerson{display:flex;align-items:center;gap:5px;min-width:0}.rankingPerson>b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eef1f6;font-size:calc(13px * var(--sidebar-text-scale))}.rankingValues{display:flex;align-items:baseline;justify-content:flex-end;gap:7px}.rankingSecondary{color:#8496ab;font-size:calc(11px * var(--sidebar-text-scale));font-variant-numeric:tabular-nums;white-space:nowrap}.rankingPrimary{color:#3ECF8E;text-align:right;font-size:calc(16px * var(--sidebar-text-scale));font-variant-numeric:tabular-nums;white-space:nowrap}.rankingRow.podium{margin-bottom:5px;border:1px solid rgba(255,255,255,.10);border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.25);padding-top:calc(11px * var(--sidebar-row-gap-scale));padding-bottom:calc(11px * var(--sidebar-row-gap-scale))}.rankingRow.podium .rankingPlace{width:29px;height:29px;color:#0E131C;font-size:calc(16px * var(--sidebar-text-scale));box-shadow:0 0 8px rgba(0,0,0,.35)}.rankingRow.podium .rankingPerson>b{font-size:calc(15px * var(--sidebar-text-scale));font-weight:900}.rankingRow.podium .rankingSecondary{font-size:calc(12px * var(--sidebar-text-scale))}.rankingRow.podium .rankingPrimary{font-size:calc(19px * var(--sidebar-text-scale));font-weight:900}.rankingRow.podium1{background:linear-gradient(90deg,rgba(232,180,85,.20),rgba(22,28,39,.92));border-color:rgba(232,180,85,.48)}.rankingRow.podium1 .rankingPlace{background:#e8b455}.rankingRow.podium2{background:linear-gradient(90deg,rgba(169,188,207,.17),rgba(22,28,39,.92));border-color:rgba(169,188,207,.38)}.rankingRow.podium2 .rankingPlace{background:#A9BCCF}.rankingRow.podium3{background:linear-gradient(90deg,rgba(205,127,50,.18),rgba(22,28,39,.92));border-color:rgba(205,127,50,.42)}.rankingRow.podium3 .rankingPlace{background:#CD7F32}.rankingEmpty{display:grid;place-items:center;min-height:120px;color:#7690a8;font-weight:900;text-align:center;padding:15px}.rankGroup{display:inline-flex!important;padding:2px 5px;border-radius:999px;background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),var(--group-color,#5b8def);color:var(--group-text,#fff)!important;font-size:9px!important;flex:0 0 auto}.muted{color:#7690a8;padding:15px}.controls{position:fixed;left:0;right:0;bottom:0;height:36px;background:linear-gradient(180deg,#12171f,#0d1219);box-shadow:0 -1px 0 rgba(255,255,255,.03) inset;border-top:1px solid #2a3242;display:flex;align-items:center;gap:6px;padding:4px 8px;z-index:5}.controls #status{margin-right:auto;font-size:10px;color:#8496ab;letter-spacing:.3px}.controls button,.controls input,.controls select{height:27px;background:#161c27;color:#eef1f6;border:1px solid #333d52;border-radius:5px;padding:3px 9px;font-weight:700;transition:border-color .12s ease,background .12s ease}.controls button:hover{border-color:#5b8def;background:#1a2130}.masterBadge{font-size:10px!important;font-weight:900!important;letter-spacing:.3px;cursor:pointer;background:#111827;color:#9fb8d9;border:1px solid #333d52}.masterBadge.isMaster{background:rgba(62,207,142,.16)!important;color:#3ECF8E!important;border-color:rgba(62,207,142,.5)!important}.masterBadge[hidden]{display:none!important}.empty{grid-column:1/-1;display:grid;place-items:center;color:#9fb8d9;font-size:20px}
.detailShade{position:fixed;inset:0;z-index:45;background:rgba(0,0,0,.86);padding:3vh 3vw}.detailBox{height:94vh;background:#12171f;border:1px solid #3a4763;border-radius:10px;display:flex;flex-direction:column;overflow:hidden}.detailHead{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 17px;border-bottom:1px solid #2a3242}.detailHead h2{margin:0;color:#9fb8d9;font-size:26px}.detailHead h2 small{font-size:15px;color:#8496ab}.detailHead p{margin:5px 0 0;color:#3ecf8e;font-weight:900}.detailActions{display:flex;align-items:center;gap:12px;color:#8496ab;font-size:12px;font-weight:900}.detailActions #manualAdjustment{background:#3f6fd1;border-color:#7ba3e8}.detailActions button{background:#8b1d2c;color:#fff;border:1px solid #b14b58;border-radius:5px;padding:8px 15px;font-weight:900}.detailBody{padding:12px 16px;overflow:auto}.detailBody h3{color:#9fb8d9;margin:18px 0 8px}.detailBody table{width:100%;border-collapse:collapse;font-size:12px}.detailBody th,.detailBody td{padding:7px 9px;border-bottom:1px solid #232a38;text-align:left}.detailBody th{position:sticky;top:0;background:#161c27;color:#9fb8d9;z-index:1}.detailKpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.trendKpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.trendKpis.compact{grid-template-columns:repeat(3,minmax(0,1fr))}.workLeftKpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:9px}.workLeftKpis div{background:#161c27;border:1px solid #2a3242;border-radius:6px;padding:12px}.workLeftKpis span{display:block;color:#9fb8d9;font-size:10px;font-weight:900}.workLeftKpis b{display:block;color:#fff;font-size:26px;margin-top:5px}.trendChartHeading{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-top:16px}.trendChartHeading h3{margin:0}.trendChartHeading p{margin:4px 0 8px;color:#7690a8;font-size:11px}.trendFilters{display:flex;align-items:end;flex-wrap:wrap;gap:8px}.trendFilters label{display:grid;gap:3px;color:#9fb8d9;font-size:9px;font-weight:900;text-transform:uppercase}.trendFilters select{height:32px;min-width:120px;background:#161c27;color:#fff;border:1px solid #333d52;border-radius:4px;padding:4px 7px;font-weight:800}.trendChartWrap{position:relative;height:330px;background:#0d1219;border:1px solid #2a3242;border-radius:7px;padding:10px}.trendChartWrap canvas{display:block;width:100%;height:100%;cursor:crosshair}.trendTooltip{position:absolute;z-index:4;pointer-events:none;width:245px;padding:10px 12px;border:1px solid #3ecf8e;border-radius:6px;background:rgba(10,14,20,.96);box-shadow:0 8px 24px rgba(0,0,0,.45);color:#eef1f6;font-size:11px}.trendTooltip b,.trendTooltip strong,.trendTooltip span{display:block}.trendTooltip b{color:#9fb8d9;font-size:13px}.trendTooltip strong{color:#3ecf8e;font-size:14px;margin:5px 0}.trendTooltip span{margin-top:2px;color:#a9bccf}.trendKpis div{background:#161c27;border:1px solid #2a3242;border-radius:6px;padding:12px}.trendKpis span{display:block;color:#9fb8d9;font-size:10px;font-weight:900;text-transform:uppercase}.trendKpis b{display:block;color:#3ecf8e;font-size:23px;margin-top:4px}.trendKpis small{display:block;color:#7690a8;margin-top:4px}.detailKpis div{background:#161c27;border:1px solid #2a3242;border-radius:6px;padding:12px}.detailKpis span{display:block;color:#9fb8d9;font-size:10px;font-weight:900;text-transform:uppercase}.detailKpis b{display:block;color:#fff;font-size:23px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.detailKpis div:first-child b{color:#3ecf8e}.includedRow{background:rgba(91,141,239,.10)}.excludedRow{opacity:.62;background:rgba(242,112,125,.05)}.includedTag,.excludedTag{display:inline-block;border-radius:999px;padding:3px 7px;font-size:9px;font-weight:900}.includedTag{background:rgba(0,166,140,.18);color:#5df2cb}.excludedTag{background:rgba(239,68,68,.16);color:#f2838d}.detailNote{color:#8496ab;font-size:12px;margin:0 0 8px}
.loginBanner{position:fixed;left:0;right:0;bottom:36px;z-index:6;background:rgba(20,4,4,.94);border-top:2px solid #ef4444;padding:5px 14px;display:flex;flex-direction:column;gap:2px}.loginBanner[hidden]{display:none}.loginBannerLine{color:#ef6461;font-size:15px;font-weight:900;text-shadow:0 0 10px rgba(239,68,68,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.historySyncNote{position:fixed;right:14px;bottom:40px;z-index:40;background:rgba(8,42,58,.94);border:1px solid #5b8def;border-radius:6px;padding:6px 12px;color:#9fb8d9;font-size:12px;font-weight:900;box-shadow:0 4px 14px rgba(0,0,0,.4)}.historySyncNote[hidden]{display:none}
.historyGateShade{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:4vh 5vw}.historyGateBox{width:min(560px,92vw);background:#12171f;border:1px solid #3a4763;border-radius:10px;padding:28px;text-align:center;box-shadow:0 22px 70px #000}.historyGateBox h2{margin:0 0 10px;color:#9fb8d9;font-size:24px}.historyGateBox p{color:#a9bccf;margin:0 0 16px;line-height:1.5;font-size:14px}.historyGateError{color:#f2838d!important;font-weight:900}.historyGateActions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.historyGateActions button{background:#3f6fd1;color:#fff;border:1px solid #7ba3e8;border-radius:6px;padding:12px 20px;font-weight:900;cursor:pointer;font-size:14px}.historyGateActions button:disabled{opacity:.6;cursor:default}
.miniFrameShade{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.78);display:grid;place-items:center}.manualBox{width:430px;background:#12171f;border:1px solid #3a4763;border-radius:9px;padding:20px}.manualBox h2{color:#9fb8d9}.manualBox label{display:flex;flex-direction:column;gap:5px;margin:10px 0;color:#9fb8d9;font-weight:900}.manualBox input{height:40px;background:#0e131c;color:#fff;border:1px solid #333d52;border-radius:5px;padding:7px}.manualBox small{color:#e8b455}.manualBox div{display:flex;gap:8px;margin-top:14px}.manualBox button{padding:8px 14px;background:#1c2740;color:#fff;border:1px solid #333d52;border-radius:5px}.manualBox #adjSave{background:#3f6fd1}.manualBox span{display:block;color:#f2838d;margin-top:8px}
.shade{position:fixed;inset:0;background:rgba(0,0,0,.86);z-index:50;padding:4vh 6vw;display:flex;align-items:center;justify-content:center}.settings{width:100%;height:92vh;background:#12171f;border:1px solid #3a4763;border-radius:9px;display:flex;flex-direction:column}.settings>header,.settings>footer{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #2a3242}.settings>header h2{margin:0;color:#9fb8d9}.settings>header button{margin-left:auto}.passwordBox{width:min(430px,92vw);background:#12171f;border:1px solid #3a4763;border-radius:9px;padding:22px;box-shadow:0 22px 70px #000}.passwordBox h2{margin:0;color:#9fb8d9}.passwordBox p{color:#8496ab}.passwordBox input{width:100%;height:42px;background:#0e131c;color:#fff;border:1px solid #333d52;border-radius:6px;padding:8px;font-size:18px}.passwordActions{display:flex;gap:8px;margin-top:12px}.passwordBox button,.primary{background:#3f6fd1!important;color:#fff!important}.passwordBox span{display:block;color:#f2838d;margin-top:8px}.settingsLayout{display:grid;grid-template-columns:210px minmax(0,1fr);flex:1;min-height:0}.settingsTabs{padding:12px;background:#0d1219;border-right:1px solid #2a3242}.settingsTabs button{display:block;width:100%;height:42px;margin-bottom:5px;text-align:left;background:transparent;color:#8496ab;border:0;border-radius:5px;padding:0 11px;font-weight:900}.settingsTabs button.active{background:#1c2740;color:#7ba3e8;border-left:4px solid #5b8def}.settingsMain{padding:16px;overflow:auto}.highVolumeSetting{display:grid;grid-template-columns:minmax(300px,500px) 1fr 230px;gap:12px;margin:12px 0 18px}.highVolumeSetting>label,.highVolumeSetting>div{display:grid;grid-template-columns:1fr 130px;align-items:center;gap:12px;background:#161c27;border:1px solid #8a6a1c;border-radius:7px;padding:12px}.highVolumeSetting>div{grid-template-columns:1fr}.highVolumeSetting b{display:block;color:#e8b455}.highVolumeSetting small,.highVolumeSetting span{display:block;color:#d9c790;margin-top:3px}.highVolumeSetting>button{height:48px;align-self:center;background:#3f6fd1;color:#fff;border:1px solid #7ba3e8;border-radius:6px;font-weight:900}.highVolumeSetting input{height:42px;background:#0e131c;color:#fff;border:1px solid #8a6a1c;border-radius:5px;padding:6px 9px;font-size:18px}
.syncBadge{display:inline-block;margin:6px 0 0;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.3px;text-transform:uppercase}.syncBadge.shared{background:rgba(62,207,142,.16);color:#3ECF8E;border:1px solid rgba(62,207,142,.4)}.syncBadge.local{background:rgba(159,184,217,.14);color:#9FB8D9;border:1px solid rgba(159,184,217,.38)}
.historyFolderSetting{background:#161c27;border:1px solid #2a3242;border-radius:7px;padding:14px;margin:12px 0 18px}.historyFolderSetting b{display:block;color:#9FB8D9;font-size:15px}.historyFolderSetting span{display:block;color:#3ECF8E;font-weight:900;margin-top:4px}.historyFolderSetting .masterStatusLine{color:#e8b455}.historyFolderSetting p{color:#a9bccf;font-size:12px;margin:8px 0 12px;line-height:1.5}.historyFolderSetting button{background:#3F6FD1;color:#fff;border:1px solid #7BA3E8;border-radius:5px;padding:9px 15px;font-weight:900}.historyFolderSetting label.wide{margin:0 0 14px;display:block}.historyFolderSetting label.wide input{width:100%;max-width:340px;height:38px;background:#0E131C;color:#fff;border:1px solid #333D52;border-radius:5px;padding:6px 9px;margin-top:4px}
.backupActions{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}.backupActions button{min-width:190px;height:46px;background:#3f6fd1!important;color:#fff!important;border-color:#7ba3e8!important;font-weight:900}.backupList{display:grid;gap:7px;background:#161c27;border:1px solid #2a3242;border-radius:7px;padding:14px;margin-bottom:12px}.backupList b{color:#9fb8d9}.backupList span{color:#a9bccf}.backupList span:before{content:"✓ ";color:#3ecf8e;font-weight:900}.workLeftHeader,.workLeftRow{display:grid;grid-template-columns:80px minmax(180px,1fr) minmax(240px,1.2fr);gap:10px;align-items:center}.workLeftHeader{padding:0 10px 7px;color:#9fb8d9;font-size:10px;font-weight:900}.workLeftRows{display:grid;gap:8px;margin:12px 0}.workLeftRow{background:#161c27;border:1px solid #2a3242;border-radius:6px;padding:10px}.workLeftRow>input{height:40px;width:100%}
.areaConfigHeader,.areaConfigRow{display:grid;grid-template-columns:78px minmax(180px,1fr) 160px;gap:10px;align-items:center}.areaConfigHeader{padding:0 10px 7px;color:#9fb8d9;font-size:10px;font-weight:900}.areaConfigRows{display:grid;gap:7px}.areaConfigRow{background:#161c27;border:1px solid #2a3242;border-radius:6px;padding:9px}.areaConfigRow label{display:flex;flex-direction:column;gap:4px}.areaConfigRow input[type=text],.areaConfigRow input[type=number],.areaConfigRow input:not([type]){width:100%;height:38px}.areaEnable{align-items:center!important;color:#9fb8d9;font-weight:900}.areaEnable input{width:22px!important;height:22px!important;accent-color:#5b8def}.areaIdentity small,.areaConfigRow label small{color:#7690a8}.goalGroupList{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:10px;margin:14px 0}.goalGroupList label{display:grid;grid-template-columns:auto 1fr 90px 110px;gap:9px;align-items:center;background:#161C27;border:1px solid #2A3242;border-radius:7px;padding:11px}.goalGroupList small{color:#7690a8}.goalGroupList input{height:40px;background:#0E131C;color:#fff;border:1px solid #333D52;border-radius:5px;padding:6px;font-size:17px}
.displayAccordion{display:grid;gap:10px}.displayAccordion details{background:#0d1219;border:1px solid #2a3242;border-radius:7px;overflow:hidden}.displayAccordion summary{cursor:pointer;padding:13px 15px;color:#9fb8d9;font-size:16px;font-weight:900;background:#161c27}.displayEditor{display:grid;grid-template-columns:minmax(300px,420px) minmax(420px,1fr);gap:16px;padding:14px}.displayControls{display:grid;grid-template-columns:repeat(2,minmax(140px,1fr));gap:10px;align-content:start}.displayControls label{display:flex;flex-direction:column;gap:5px;color:#9fb8d9;font-weight:900}.displayControls label small{color:#7690a8;font-size:9px;font-weight:400;line-height:1.25}.displayControls input{height:40px}.displayControls .check{flex-direction:row;align-items:center}.displayControls .check input{width:22px;height:22px}.selectedElementEditor{background:#161C27;border:1px solid #3a4763;border-radius:7px;padding:10px;margin-bottom:10px}.selectedElementHeading{display:flex;align-items:center;justify-content:space-between}.selectedElementHeading b{color:#9FB8D9}.selectedElementHeading button{background:#1C2740;color:#fff;border:1px solid #3A4763;border-radius:5px;padding:6px 9px;font-weight:900}.elementEditGrid{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:8px;margin-top:8px}.elementEditGrid label{display:flex;flex-direction:column;gap:4px;color:#9FB8D9;font-size:10px;font-weight:900}.elementEditGrid input{height:34px;background:#0E131C;color:#fff;border:1px solid #333D52;border-radius:4px;padding:4px 7px}.colorPair{display:grid;grid-template-columns:40px 1fr;gap:5px}.colorPair input[type=color]{padding:2px}.previewPicker [data-edit-element]{cursor:pointer;border-radius:3px;outline:1px dashed transparent;transition:outline-color .12s,background .12s}.previewPicker [data-edit-element]:hover{outline-color:#7BA3E8;background:rgba(123,163,232,.12)}.previewPicker .selectedPreviewElement{outline:2px solid #e8b455!important;background:rgba(232,180,85,.13)!important}
.displayPreview{background:#0e131c;border:1px solid #2a3242;border-radius:7px;padding:12px;min-height:270px;overflow:auto}.previewTitle{display:block;color:#9fb8d9;font-size:10px;font-weight:900;margin-bottom:8px}.previewPicker{width:auto;height:auto;min-width:180px;min-height:110px;cursor:default;transform:none!important}.previewTitleRow{display:flex;align-items:center;justify-content:space-between;gap:12px}.previewSize{color:#7690a8;font-size:10px;font-weight:900;white-space:nowrap}.previewPicker:hover{transform:none}.previewSide{width:100%;height:300px}.previewSide .panel{height:100%}.previewTop{width:100%;overflow:hidden}.previewTop .ticker{animation:none}.tickerPreviewWrap{min-height:150px}@media(max-width:1200px){.displayEditor{grid-template-columns:1fr}}
.groupsHeader{display:flex;align-items:start;justify-content:space-between;gap:16px}.groupsHeader h3{margin-top:0}.groupsHeader button{background:#3f6fd1!important;color:#fff!important;font-weight:900}.pickerGroupRows{display:grid;gap:8px;margin:12px 0 22px}.pickerGroupRow{display:grid;grid-template-columns:65px minmax(150px,1.2fr) 110px 130px 130px 84px 72px;gap:8px;align-items:end;background:#161c27;border:1px solid #2a3242;border-radius:7px;padding:10px}.pickerGroupRow label{display:flex;flex-direction:column;gap:4px}.pickerGroupRow label small{color:#9fb8d9;font-size:9px;font-weight:900}.pickerGroupRow input{height:38px;width:100%}.pickerGroupRow [type=color]{padding:2px}.pickerGroupRow [data-delete-group]{height:38px;background:#6f2330;color:#fff;font-weight:900}.editorBadge{align-self:center;justify-self:center;font-size:12px}@media(max-width:1300px){.pickerGroupRow{grid-template-columns:65px 1fr 100px 120px 120px 75px}.pickerGroupRow [data-delete-group]{grid-column:1/-1}}
.classificationHeader{display:flex;align-items:start;justify-content:space-between;gap:18px}.classificationHeader h3{margin-top:0}.classificationHeader button{background:#3F6FD1!important;color:#fff!important;font-weight:900}.classificationHelp{display:flex;flex-direction:column;gap:4px;background:#161c27;border:1px solid #2A3242;border-radius:7px;padding:12px;margin:10px 0 16px}.classificationHelp b{color:#9FB8D9}.classificationHelp span{color:#a9bccf}.classificationColumns,.classificationRow{display:grid;grid-template-columns:65px minmax(180px,.8fr) minmax(280px,1.3fr) 75px 75px;gap:9px;align-items:center}.classificationColumns{padding:0 10px 7px;color:#9FB8D9;font-size:10px;font-weight:900}.classificationRows{display:grid;gap:8px}.classificationRow{background:#161C27;border:1px solid #2A3242;border-radius:7px;padding:10px}.classificationRow label{display:flex;flex-direction:column;gap:4px}.classificationRow small{color:#7690a8;font-size:9px}.classificationRow input:not([type=checkbox]){height:40px;width:100%;background:#0E131C;color:#fff;border:1px solid #333D52;border-radius:5px;padding:6px 9px}.classificationCheck{align-items:center}.classificationCheck input{width:23px;height:23px;accent-color:#5B8DEF}.excludeCheck input{accent-color:#f2707d}.classificationRow [data-delete-rule]{height:38px;background:#6F2330;color:#fff;border:1px solid #A64B59;border-radius:5px;font-weight:900}@media(max-width:1200px){.classificationRow{grid-template-columns:55px 1fr 1.4fr 65px}.classificationRow [data-delete-rule]{grid-column:1/-1}}
.ruleCards{display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:10px}.ruleCards div{background:#161c27;border:1px solid #2a3242;border-radius:6px;padding:12px}.ruleCards b{display:block;color:#9fb8d9}.ruleCards span{display:block;color:#a9bccf;margin-top:5px}.settings h3{color:#9fb8d9}.settings button,.settings input,.settings textarea{background:#0e131c;color:#fff;border:1px solid #333d52;border-radius:5px;padding:7px}.rates{display:grid;grid-template-columns:repeat(3,minmax(260px,1fr));gap:8px}.rates label{display:grid;grid-template-columns:1fr 110px;align-items:center;background:#161c27;border:1px solid #2a3242;border-radius:6px;padding:9px}.rates small{display:block;color:#7690a8}.form{display:grid;grid-template-columns:repeat(4,minmax(180px,1fr));gap:9px}.form label,.wide{display:flex;flex-direction:column;gap:5px;color:#9fb8d9;font-weight:900}.form .check{flex-direction:row;align-items:center}.wide{margin-top:10px}.wide textarea{height:80px}.settings>footer{border-top:1px solid #2a3242;border-bottom:0}.settings>footer span{margin-right:auto;color:#3ecf8e}
</style></head><body><header class="top"><div class="brandLogo"><img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Staples_2019.svg" alt="Staples"></div><div id="tickerViewport" class="tickerViewport"><div id="ticker" class="ticker"></div></div><button id="connectivity" class="connectivity idle" type="button" aria-label="Connection status"></button></header><div id="layout" class="layout"><main id="cards" class="cards"></main><aside class="side"><section class="panel goalsPanel"><div class="panelTitleRow"><h3>GROUP GOALS</h3><button id="editGoals" type="button">Edit</button></div><div id="groupGoals" class="groupGoals"></div></section><section class="panel rankingsPanel"><h3 id="rankingTitle">FT CREDIT RANKINGS</h3><div id="rank" class="rank"></div></section></aside></div><div id="loginBanner" class="loginBanner" hidden></div><div id="historySyncNote" class="historySyncNote" hidden></div><footer class="controls"><div id="status">READY</div><b id="count"></b><button id="masterBadge" class="masterBadge" type="button" hidden></button><input id="filter" placeholder="Filter picker or area"><select id="sort"><option value="name">Alphabetical</option><option value="credit">Total Credit</option><option value="picks">Picks</option><option value="recent">Recent</option></select><input id="date" type="date"><button id="refresh">Refresh</button><button id="trends">Trends</button><button id="settings">Settings</button><button id="fullscreen">Fullscreen</button><button id="close">Close</button></footer></body></html>`;}
  function restartTimer(){clearInterval(state.refreshTimer);if(state.running)state.refreshTimer=setInterval(()=>{if(state.selectedDate===operationalDate())refresh();},state.refreshSeconds*1000);}
  function openDashboard(){if(document.getElementById(`${APP_ID}-overlay`))return;state.selectedDate=operationalDate();const overlay=document.createElement('div');overlay.id=`${APP_ID}-overlay`;Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483646',background:'#000'});const frame=document.createElement('iframe');frame.srcdoc=html();frame.setAttribute('sandbox','allow-scripts allow-same-origin');Object.assign(frame.style,{width:'100%',height:'100%',border:'0'});overlay.appendChild(frame);document.body.appendChild(overlay);state.overlay=overlay;state.frame=frame;frame.onload=()=>{const d=frame.contentDocument,$=id=>d.getElementById(id);state.ui={ticker:$('ticker'),tickerViewport:$('tickerViewport'),connectivity:$('connectivity'),layout:$('layout'),cards:$('cards'),rank:$('rank'),rankTitle:$('rankingTitle'),goals:$('groupGoals'),status:$('status'),count:$('count'),filter:$('filter'),sort:$('sort'),date:$('date'),loginBanner:$('loginBanner'),masterBadge:$('masterBadge')};state.ui.date.value=state.selectedDate;state.ui.sort.value=state.sort;$('filter').oninput=e=>{state.filter=e.target.value;renderCards();};$('sort').onchange=e=>{state.sort=e.target.value;renderCards();};$('date').onchange=e=>{state.dateFollowsToday=(e.target.value===operationalDate());state.workLeftAreaCounts={};state.workLeftAreaHealth={};rebuildWorkLeftTotals();refresh(e.target.value,{forceDateLoad:true});refreshWorkLeft(e.target.value);};$('refresh').onclick=()=>{refresh();setTimeout(()=>{if(state.running)refreshWorkLeft();},1200);};$('trends').onclick=openTrends;$('settings').onclick=openSettings;$('editGoals').onclick=()=>requestSupervisorPassword('Edit Group Goals',openQuickGoalEditor);$('fullscreen').onclick=()=>overlay.requestFullscreen?.();$('close').onclick=closeDashboard;$('masterBadge').onclick=()=>{if(!state.isMaster)openMasterTakeoverConfirm();};ensureHistoryFolderThenStart();};}
  function handleDashboardResize(){
    if(!state.ui)return;
    applyLayout();
    requestAnimationFrame(()=>requestAnimationFrame(()=>{fitRankingRows();resyncAreaScrollMetrics();}));
  }
  function startDashboardRuntime(){
    state.running=true;renderConnectivity();renderLoginBanner();renderHistoryFolderStatus();renderHistorySyncNote();renderMasterBadge();restartTimer();restartWorkLeftTimer();restartHistoryFolderSyncTimer();restartAreaScrollResyncTimer();restartDateRolloverTimer();render();window.addEventListener('resize',handleDashboardResize);refresh();setTimeout(()=>{if(state.running)refreshWorkLeft();},1000);
  }
  async function ensureHistoryFolderThenStart(){
    if(state.historyDirStatus==='connected'){startDashboardRuntime();syncHistoryWithFolder();return;}
    if(state.historyDirHandle&&state.historyDirStatus!=='connected'){
      const status=await historyDirPermissionState(state.historyDirHandle,false);
      if(status==='granted'){state.historyDirStatus='connected';startDashboardRuntime();syncHistoryWithFolder();return;}
    }
    renderHistoryFolderGate();
  }
  function historyFolderGateHtml(){
    const needsPermission=state.historyDirStatus==='needs-permission';
    const unsupported=state.historyDirStatus==='unsupported';
    return `<section class="historyGateBox">
      <h2>History Folder Required</h2>
      <p>Choose a shared folder to store daily production history. This lets other PCs read the same history and protects it if this browser's cache is ever cleared. Existing days already in the folder are kept; any days missing from the folder are added automatically.</p>
      ${state.historyDirError?`<p class="historyGateError">${esc(state.historyDirError)}</p>`:''}
      <div class="historyGateActions">
        ${needsPermission?`<button id="historyGateReconnect" type="button">Reconnect "${esc(state.historyDirName)}"</button>`:''}
        <button id="historyGateChoose" type="button">${needsPermission?'Choose a Different Folder':'Choose History Folder'}</button>
      </div>
    </section>`;
  }
  function renderHistoryFolderGate(){
    const d=state.frame.contentDocument;
    d.getElementById('historyGateShade')?.remove();
    const shade=d.createElement('div');shade.id='historyGateShade';shade.className='historyGateShade';
    shade.innerHTML=historyFolderGateHtml();
    d.body.appendChild(shade);
    const finishIfConnected=()=>{if(state.historyDirStatus==='connected'){shade.remove();startDashboardRuntime();}};
    shade.querySelector('#historyGateChoose').onclick=async()=>{
      const button=shade.querySelector('#historyGateChoose');button.disabled=true;button.textContent='Waiting for folder selection...';
      try{await chooseHistoryFolder();finishIfConnected();}
      catch(error){state.historyDirError=error.message||String(error);renderHistoryFolderGate();}
    };
    const reconnectButton=shade.querySelector('#historyGateReconnect');
    if(reconnectButton)reconnectButton.onclick=async()=>{
      reconnectButton.disabled=true;reconnectButton.textContent='Reconnecting...';
      try{await reconnectHistoryFolderWithPermission();finishIfConnected();if(state.historyDirStatus!=='connected')renderHistoryFolderGate();}
      catch(error){state.historyDirError=error.message||String(error);renderHistoryFolderGate();}
    };
  }
  function closeDashboard(){state.running=false;clearInterval(state.refreshTimer);clearInterval(state.rankingRotationTimer);clearInterval(state.workLeftTimer);clearInterval(state.historyDirSyncTimer);clearInterval(state.areaScrollResyncTimer);clearInterval(state.dateRolloverTimer);clearTimeout(state.workLeftRetryTimer);clearTimeout(state.visionRetryTimer);state.workLeftRequestId++;state.controller?.abort();if(state.renderFrame!==null){cancelAnimationFrame(state.renderFrame);state.renderFrame=null;}document.getElementById(`${APP_ID}-overlay`)?.remove();window.removeEventListener('resize',handleDashboardResize);state.tickerSignature=state.tickerStructureSignature=state.cardsSignature=state.rankingSignature=state.goalsSignature='';state.overlay=state.frame=state.ui=null;}
  function addButton(){if(!document.body||document.getElementById(`${APP_ID}-button`))return;const b=document.createElement('button');b.id=`${APP_ID}-button`;b.textContent='Open Live Bulk TV Dashboard';Object.assign(b.style,{position:'fixed',right:'20px',bottom:'160px',zIndex:'2147483645',background:'#0d9a78',color:'#fff',border:'1px solid #66e1c2',borderRadius:'999px',padding:'12px 18px',fontWeight:'900',cursor:'pointer',boxShadow:'0 7px 22px rgba(0,0,0,.38)'});b.onclick=openDashboard;document.body.appendChild(b);}
  function init(){ensureInstanceIdentity();loadSettings();loadHistory();resetExpiredGoals();loadAdjustmentHistory();scanToken();addButton();new MutationObserver(addButton).observe(document.documentElement,{childList:true,subtree:true});reconnectHistoryFolderSilently();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
