// ==UserScript==
// @name         Hide/Show DIS Batches with Correct Picker Column Alignment
// @namespace    http://tampermonkey.net/
// @version      2026-10-05.110
// @description  Fixes Picker column, tweaks widths, sorts pickers, auto-scan, relative time, FLAT UI, auto-focuses search, secure background sync, fixed alignment, and adds an A-Z Associate Last Pick sidebar with location and time since scan. KPI mini-cards source remaining counts from Zone Status (so mixed-zone batches are no longer undercounted), exclude DIS from Floor unless "Show DIS" is on while retaining DIS in Unit Pick and Calendars, use a compact responsive layout, dynamically create start groups from each associate first-pick hour, and rate non-High-Volume batch pick efficiency above a configurable carton cutoff.
// @author       You
// @match        http://lcvyprwbv05.staples.com:6801/Home/BatchStatus*
// @match        http://lcvyprwbv05.staples.com:6801/Home/BatchDetail*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=staples.com
// @updateURL    https://raw.githubusercontent.com/JordanLadell/stplscripts/master/Batch-Status-Hide-Show-DIS.user.js
// @downloadURL  https://raw.githubusercontent.com/JordanLadell/stplscripts/master/Batch-Status-Hide-Show-DIS.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /*
            const timelineEvents = items.filter(item => item.ts > 0 && String(item.status || '').toLocaleLowerCase().includes('picking complete')).sort((a,b) => a.ts - b.ts);
            const timelineGaps = timelineEvents.slice(1).map((item,index) => Math.max(0, (item.ts - timelineEvents[index].ts) / 60000));
            const longestGap = timelineGaps.length ? Math.max(...timelineGaps) : 0;
                const averageGap = timelineGaps.length ? timelineGaps.reduce((sum,gap) => sum + gap, 0) / timelineGaps.length : 0;
                const eventTimes = associate.cartonDetails.map(item => item.ts).filter(ts => ts > 0).sort((a,b) => a-b);
                const gaps = eventTimes.slice(1).map((ts,index) => (ts - eventTimes[index]) / 60000).filter(gap => gap >= 0);
                associate.longestGapMinutes = gaps.length ? Math.max(...gaps) : 0;
                associate.totalDowntimeMinutes = gaps.reduce((sum,gap) => sum + gap, 0);
                associate.averageGapMinutes = gaps.length ? associate.totalDowntimeMinutes / gaps.length : 0;
            const observedSpan = timelineEvents.length > 1 ? (timelineEvents[timelineEvents.length - 1].ts - timelineEvents[0].ts) / 60000 : 0;
            const gapLabel = minutes => minutes < 1 ? '<1m' : minutes < 60 ? `${Math.round(minutes)}m` : `${Math.floor(minutes/60)}h ${Math.round(minutes%60)}m`;
            const timelineRows = timelineEvents.map((item,index) => {
                const gap = index ? Math.max(0, (item.ts - timelineEvents[index - 1].ts) / 60000) : 0;
                const gapWidth = longestGap > 0 ? Math.max(8, Math.round(gap / longestGap * 100)) : 0;
                const gapHtml = index ? `<div class="scan-gap ${gap >= 15 ? 'long-gap' : ''}"><span class="gap-track"><i style="width:${gapWidth}%"></i></span><strong>${gapLabel(gap)} between scans</strong></div>` : '';
                return `${gapHtml}<div class="timeline-event"><span class="timeline-dot"></span><div><strong>${esc(item.timeStr || new Date(item.ts).toLocaleString())}</strong><span>${esc(item.location || 'Unknown')} · ${esc(item.area || 'Unknown')} · Carton ${esc(item.carton || 'Unknown')} · Batch ${esc(item.batchId)}</span></div></div>`;
            }).join('');
            const timeline = `<section class="timeline"><div class="timeline-head"><div><strong>Pick timeline</strong><span>Completed pick scans in time order</span></div><div class="timeline-metrics"><span><b>${gapLabel(observedSpan)}</b> observed span</span><span><b>${gapLabel(averageGap)}</b> average scan gap</span><span><b>${gapLabel(longestGap)}</b> longest scan gap</span></div></div><p>Intervals show time between recorded scans, not confirmed idle time. Travel, work, breaks, or missing scans may contribute.</p>${timelineEvents.length ? `<div class="timeline-list">${timelineRows}</div>` : '<div class="empty">No completed pick timestamps are available for this associate.</div>'}</section>`;
                const averageGapLabel = gaps.length ? gapLabel(averageGap) : '--';
                const longestGapLabel = gaps.length ? gapLabel(longestGap) : '--';
                const timeline = `<section class="timeline"><div class="timeline-head"><div><strong>Pick timeline</strong><span>Completed pick scans in time order</span></div><div class="timeline-metrics"><span><b>${gapLabel(observedSpan)}</b> observed span</span><span><b>${averageGapLabel}</b> average scan gap</span><span><b>${longestGapLabel}</b> longest scan gap</span></div></div><p>Intervals show time between recorded scans, not confirmed idle time. Travel, work, breaks, or missing scans may contribute.</p>${timelineEvents.length ? `<div class="timeline-list">${timelineRows}</div>` : '<div class="empty">No completed pick timestamps are available for this associate.</div>'}</section>`;
            detailFrame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#0f172a;font:11px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial}.head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:10px;background:#0f172a;color:#fff}.head strong{font-size:13px}.head input,.head select{height:29px;border:1px solid #64748b;border-radius:4px;padding:4px 7px}.head input{flex:1}.head button{height:29px;border:1px solid #93c5fd;border-radius:4px;background:#2563eb;color:#fff;font-weight:800;cursor:pointer}.count{margin-left:auto;font-weight:800}.progress{padding:7px 10px;background:#dbeafe;color:#1d4ed8;font-weight:800}.timeline{padding:12px 16px;background:#fff;border-bottom:1px solid #cbd5e1}.timeline-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.timeline-head>div:first-child{display:grid;gap:3px}.timeline-head>div:first-child strong{font-size:13px}.timeline-head>div:first-child span,.timeline p{color:#64748b}.timeline-metrics{display:flex;gap:16px;flex-wrap:wrap}.timeline-metrics span{display:grid;gap:2px;color:#64748b;font-size:9px;text-transform:uppercase}.timeline-metrics b{color:#0f172a;font-size:13px;font-variant-numeric:tabular-nums}.timeline p{margin:8px 0;font-size:10px}.timeline-list{border-left:2px solid #cbd5e1;margin:8px 0 2px 7px;padding-left:13px}.timeline-event{position:relative;display:flex;align-items:flex-start;gap:8px;padding:5px 0}.timeline-dot{position:absolute;left:-20px;top:9px;width:10px;height:10px;border:2px solid #fff;border-radius:50%;background:#16a34a;box-shadow:0 0 0 1px #15803d}.timeline-event div{display:grid;gap:3px}.timeline-event div strong{font-size:10px}.timeline-event div span{color:#475569}.scan-gap{display:flex;align-items:center;gap:9px;padding:4px 0;color:#475569}.gap-track{width:clamp(45px,12vw,110px);height:5px;background:#e2e8f0;border-radius:5px;overflow:hidden}.gap-track i{display:block;height:100%;background:#0ea5e9;border-radius:5px}.scan-gap.long-gap{color:#b45309}.scan-gap.long-gap .gap-track i{background:#f59e0b}.scan-gap strong{font-size:9px;font-variant-numeric:tabular-nums}table{width:100%;border-collapse:collapse}th{position:sticky;top:49px;background:#e2e8f0;color:#475569;text-transform:uppercase;font-size:9px;padding:7px;text-align:center}td{padding:7px;border-bottom:1px solid #e2e8f0;text-align:center}tbody tr:nth-child(even){background:#fff}.carton{font-family:Consolas,monospace}a{display:inline-block;padding:4px 7px;border-radius:4px;background:#2563eb;color:#fff;text-decoration:none;font-weight:800}.empty{padding:18px;text-align:center;color:#64748b}@media(max-width:700px){.head{flex-wrap:wrap}.head strong{width:100%}.head input{min-width:180px}.timeline-head{align-items:flex-start;flex-direction:column}.timeline-metrics{gap:10px}.timeline-metrics span{min-width:90px}table{font-size:9px}td,th{padding:5px}}</style></head><body><div class="head"><strong>${esc(name)} • Completed / Short Cartons</strong><input id="search" placeholder="Search carton, batch, hub, location, status or area"><select id="area"><option value="all">All areas</option><option>Floor</option><option>Calendars</option><option>Pick to Belt</option><option>Reserve</option><option>Unit Pick</option></select><span class="count" id="count"></span><button id="close">Close Drawer</button></div>${progressText?`<div class="progress">${esc(progressText)}</div>`:''}${timeline}${items.length?`<table><thead><tr><th>#</th><th>Batch</th><th>Carton</th><th>Status</th><th>Hub</th><th>Location</th><th>Area</th><th>Picked Time</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">No completed or short cartons were found.</div>'}<script>const search=document.getElementById('search'),area=document.getElementById('area'),body=document.querySelector('tbody'),count=document.getElementById('count');function apply(){const q=search.value.toLocaleLowerCase(),a=area.value;let n=0;body?.querySelectorAll('tr').forEach(row=>{const show=row.dataset.search.includes(q)&&(a==='all'||row.children[6].textContent===a);row.hidden=!show;if(show)n++;});count.textContent=n+' cartons';}search.addEventListener('input',apply);area.addEventListener('change',apply);document.getElementById('close').addEventListener('click',()=>parent.postMessage({type:'close-associate-drawer'},'*'));apply();</script></body></html>`;
    */
    let originalDataRows = [];
    let countdownInterval = null;
    let autoScanIntervalId = null;
    let isScanning = false;
    let associateIntelDetailData = new Map();
    let batchMetaCache = new Map();
    let batchCacheMemory = null;
    let batchCacheDirty = false;
    let masterBatchIndex = new Map();
    let dailyHistoryMemory = null;
    let dailyHistorySourceSignature = '';
    let selectedHistoricalBatchSnapshot = null;
    let associateIntelReportWindow = null;
    let associateIntelHistorical = false;
    let dailyHistoryDbPromise = null;
    let historyLoadSequence = 0;
    let historyLoadDateKey = '';
    // Every page load starts on the live day; a picked historical date is not persisted across loads.
    localStorage.removeItem('__batch_status_history_date');
    let historicalViewActive = false;
    let displayBatchIndex = null;
    let displayedBatchRows = null;
    let displayedBatchCache = null;
    const DAILY_HISTORY_KEY = '__batch_status_daily_history_v1';
    const DAILY_BATCH_HISTORY_DB = 'batch-status-daily-history-v1';
    const DAILY_BATCH_HISTORY_STORE = 'days';
    const DAILY_HISTORY_RETENTION_DAYS = 90;
    let masterBatchRowIndex = new WeakMap();
    const AI_MISSCAN_RULE_VERSION = 2;
    const PICKER_TIMELINE_SCHEMA_VERSION = 7;
    const PICKABILITY_SCORE_VERSION = 1;
    let pickabilityCacheDirty = false;
    const BATCH_SCAN_CONCURRENCY = 6;

    // Cache of parsed Zone Status data, keyed by zone name.
    // Refreshed in the background so the KPI mini-cards reflect true remaining
    // counts per zone (including cartons that live inside "Mixed" batches),
    // instead of only summing batches whose Batch Type text matches the zone.
    let zoneStatusCache = null;

    // Whether the single shared "Zone Breakdown" dropdown is currently open.
    // Kept at module scope so it survives the frequent generateKPIWidgets() re-renders.
    let kpiBreakdownOpen = false;

    // --- Hardcoded defaults fallback ---
    const HARDCODED_HUB_MAP = {
        'UPS 1': '7:30 PM', 'FEDEX': '7:30 PM', 'PNC': '9:30 PM',
        'TAL': '10:30 PM', 'NFM': '10:30 PM', 'MIA': '11:30 PM', 'FEDEX F2': '11:30 PM',
        'VIL': '12:00 AM', 'ALB': '12:30 AM', 'TPA': '1:00 AM', 'CJX': '1:00 AM',
        'POM': '1:00 AM', 'WPM': '1:00 AM', 'ORL': '1:30 AM', 'DTB': '1:30 AM',
        'MLB': '1:30 AM', 'NASA': '1:30 AM', 'AMP': '2:00 AM', 'GVL': '2:00 AM',
        'USPS': '2:00 AM', 'UPG': 'Export', 'CTR': 'Export', '1RC': 'Export',
        'MULTIPLE': 'MULTIPLE'
    };

    const TIME_OPTIONS = [];
    for (let h = 5; h <= 11; h++) {
        TIME_OPTIONS.push(`${h}:00 PM`, `${h}:30 PM`);
    }
    TIME_OPTIONS.push("12:00 AM", "12:30 AM");
    for (let h = 1; h <= 2; h++) {
        TIME_OPTIONS.push(`${h}:00 AM`, `${h}:30 AM`);
    }
    TIME_OPTIONS.push("3:00 AM", "Export", "MULTIPLE");

    // Maps each KPI mini-card to the Zone Status zone(s) that feed it.
    // "Reserve" combines Reserve + Reserve2, matching the old behavior where
    // a batch type of "Reserve2" also satisfied the "reserve" match.
    const KPI_ZONE_GROUPS = {
        'PTB Low': ['PTB Low'],
        'PTB High': ['PTB High'],
        'Reserve': ['Reserve', 'Reserve2'],
        'Unit Pick': ['Unit Pick'],
        'Calendars': ['Calendar']
    };
    // Zone Status has no per-hub breakdown, so it can't tell us how much of a
    // zone's total belongs to the DIS hub. To keep DIS out of the KPI cards
    // (unless "Show DIS" is checked), we fall back to the batch-level rows we
    // already have on Batch Status — which DO carry hub — and match them to a
    // zone group the same way the old (pre-Zone-Status) KPI logic did. This is
    // only used to correct the DIS-hub sliver, not the whole zone total, so it
    // doesn't reintroduce the "Mixed batch" undercount the Zone Status switch
    // was meant to fix.
    const KPI_TYPE_KEYWORDS = {
        'Floor': ['floor'],
        'PTB 13': ['ptb 13'],
        'PTB 14': ['ptb 14'],
        'Reserve': ['reserve'],
        'Unit Pick': ['unit pick'],
        'Calendars': ['calendar']
    };

    function applyDynamicWidth(widthValue) {
        let styleEl = document.getElementById('dynamic-page-width-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-page-width-style';
            document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = `
            .container, .container-sm, .container-md, .container-lg, .container-xl {
                max-width: ${widthValue}% !important;
                width: ${widthValue}% !important;
            }
        `;
    }

    // --- SHARPER, FLATTER UI CSS INJECTION ---
    function injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            /* Base layout & typography */
            main[role="main"], main { width: 100% !important; max-width: 100% !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; }
            body { background-color: #f4f7f8 !important; }

            /* Crisper Table Override */
            .datatable { background-color: #ffffff; border-radius: 4px; border: 1px solid #cbd5e1 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; }
            .datatable thead th { background-color: #f8fafc !important; color: #475569 !important; font-weight: 600 !important; text-transform: uppercase; font-size: 11px !important; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1 !important; border-top: none !important; padding: 10px 8px !important; border-right: 1px solid #e2e8f0 !important; border-left: none !important; }
            .datatable tbody td { vertical-align: middle; border-bottom: 1px solid #f1f5f9 !important; border-right: 1px solid #f1f5f9 !important; padding: 8px !important; border-left: none !important; }

            /* Sharper Action Buttons */
            .datatable .btn-primary { background-color: #2563eb !important; border-color: #2563eb !important; border-radius: 3px !important; font-weight: 600; padding: 4px 10px !important; transition: background-color 0.15s; }
            .datatable .btn-primary:hover { background-color: #1d4ed8 !important; border-color: #1d4ed8 !important; }

            /* Cut Time Cells */
            .vertical-cut-time-cell { vertical-align: middle !important; text-align: center; font-weight: 700; font-size: 13px; border-right: 2px solid #cbd5e1 !important; background-color: #ffffff !important; color: #334155; white-space: nowrap; padding: 10px 6px !important; }
            .vertical-cut-time-cell.urgent-time { color: #e11d48 !important; background-color: #fff1f2 !important; border-right: 3px solid #e11d48 !important; }
            .vertical-cut-time-cell.passed-time { color: #64748b !important; background-color: #f1f5f9 !important; border-right: 3px solid #94a3b8 !important; }

            /* Mini Buttons in Cut Time */
            .scan-group-btn { font-size: 10px; font-weight: 700; padding: 3px 6px; border-radius: 3px; border: 1px solid #cbd5e1 !important; color: #475569 !important; background: #f8fafc; transition: background-color 0.15s; box-shadow: none; }
            .scan-group-btn:hover { background-color: #e2e8f0; border-color: #94a3b8 !important; color: #0f172a !important; }
            .cut-time-action-wrapper { margin-top: 6px; display: flex; flex-direction: column; align-items: center; gap: 3px; }

            /* Badges & Text */
            .high-vol-badge { display: inline-block; background-color: #dc2626; color: #ffffff; font-size: 9px; font-weight: 700; padding: 2px 4px; border-radius: 2px; margin-left: 6px; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: text-top; }
            .last-scan-cell { font-weight: 500; color: #64748b !important; transition: color 0.2s; }
            .last-scan-cell.stale-scan { color: #dc2626 !important; font-weight: 700 !important; }
            .picker-name-span strong { color: #0f172a !important; font-weight: 700; }
            .picker-name-span { color: #475569; transition: color 0.15s; }
            .picker-name-span:hover { color: #0f172a; }

            /* Flatter Sidebar Panel */
            #hub-settings-panel { background: #ffffff !important; border: 1px solid #cbd5e1 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 4px !important; padding: 16px !important; max-height: calc(100vh - 40px); overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: #94a3b8 #f1f5f9; overscroll-behavior: contain; }
            #hub-settings-panel::-webkit-scrollbar { width: 9px; }
            #hub-settings-panel::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
            #hub-settings-panel::-webkit-scrollbar-thumb { background: #94a3b8; border: 2px solid #f1f5f9; border-radius: 8px; }
            #hub-settings-panel::-webkit-scrollbar-thumb:hover { background: #64748b; }
            #hub-settings-panel h5 { color: #0f172a !important; font-weight: 700 !important; letter-spacing: -0.2px; margin-bottom: 10px !important; }
            #hub-settings-panel select, #hub-settings-panel input[type="number"], #hub-settings-panel input[type="text"] { border-radius: 3px !important; border: 1px solid #cbd5e1 !important; background-color: #f8fafc; font-weight: 500; color: #334155; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); }
            #hub-settings-panel select:focus, #hub-settings-panel input:focus { background-color: #ffffff; border-color: #3b82f6 !important; outline: none; }
            #hub-settings-panel details > summary::-webkit-details-marker { display: none; }
            #hub-settings-panel details > summary::after { content: '▸'; color: #64748b; font-size: 11px; margin-left: 8px; }
            #hub-settings-panel details[open] > summary::after { content: '▾'; }
            #hub-settings-panel details > summary:hover { color: #2563eb !important; }

            /* Sidebar Actions */
            #scanAllBatchesBtn { background-color: #0f172a !important; border: none !important; border-radius: 3px !important; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px !important; transition: background-color 0.15s; }
            #scanAllBatchesBtn:hover { background-color: #334155 !important; }
            #clearScanDataBtn { border-radius: 3px !important; border-color: #e11d48 !important; color: #e11d48 !important; padding: 4px !important; background-color: transparent !important; transition: background-color 0.15s; }
            #clearScanDataBtn:hover { background-color: #fff1f2 !important; }

            /* Crisper KPI Widgets */
            .kpi-dashboard-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; width: 100%; }
            .kpi-metric-card { flex: 1; min-width: 150px; background: #ffffff !important; border: 1px solid #cbd5e1 !important; border-radius: 4px !important; padding: 12px 16px !important; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; }
            .kpi-card-title { font-size: 11px !important; font-weight: 700 !important; color: #475569 !important; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
            .kpi-card-remaining { font-size: 22px !important; font-weight: 700 !important; color: #dc2626 !important; line-height: 1; margin-bottom: 4px; }
            .kpi-card-remaining .kpi-unit { font-size: 11px !important; font-weight: 600 !important; color: #64748b !important; margin-left: 4px; text-transform: uppercase; }
            .kpi-card-subtext { font-size: 10px !important; font-weight: 600; color: #64748b !important; margin-bottom: 8px; }
            .kpi-progress-bg { background-color: #e2e8f0; height: 4px; border-radius: 2px; width: 100%; overflow: hidden; }
            .kpi-progress-bar { background-color: #059669; height: 100%; border-radius: 2px; transition: width 0.3s ease; }

            /* Single shared KPI breakdown dropdown (mirrors the High Volume card's Details toggle/panel) */
            .kpi-toggle-btn { cursor: pointer; font-size: 10px; color: #2563eb; font-weight: 700; user-select: none; padding: 2px 8px; border-radius: 3px; background: #eff6ff; transition: background 0.15s; }
            .kpi-toggle-btn:hover { background-color: #dbeafe; }
            .kpi-shared-breakdown-panel { display: none; flex-wrap: wrap; gap: 15px; width: 100%; margin-bottom: 16px; }
            .kpi-shared-breakdown-panel.open { display: flex; }
            .kpi-breakdown-zone-title { font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; }
            .kpi-breakdown-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 8px; }
            .kpi-breakdown-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; color: #475569; font-weight: 600; margin-bottom: 3px; }
            .kpi-breakdown-row:last-child { margin-bottom: 0; }
            .kpi-breakdown-row strong { color: #0f172a; font-weight: 700; }

            /* Accordion & Overlays */
            .accordion-drawer-row { background:#eef6ff; }
            .accordion-drawer-row > td { padding:0 !important; border:1px solid #93c5fd !important; border-top:0 !important; }
            .accordion-container { overflow:hidden; background:#fff; border-left:4px solid #2563eb; animation:tmDrawerOpen .18s ease-out; }
            @keyframes tmDrawerOpen { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
            .accordion-header { background:#eff6ff; color:#0f172a; padding:9px 12px; border-bottom:1px solid #bfdbfe; display:flex; justify-content:space-between; align-items:center; }
            .accordion-header h6 { font-size:12px; font-weight:800; margin:0; }
            .accordion-close-btn { background:#fff; border:1px solid #93c5fd; border-radius:4px; padding:4px 9px; font-size:10px; font-weight:800; color:#1d4ed8; cursor:pointer; }
            .accordion-close-btn:hover { background:#dbeafe; }
            .accordion-iframe { display:block; width:100%; height:min(620px,72vh); border:0; background:#fff; }
            tr.tm-details-open > td { background:#eff6ff !important; border-bottom-color:#93c5fd !important; }
            .tm-details-chevron { display:inline-block; margin-right:5px; transition:transform .18s ease; }
            tr.tm-details-open .tm-details-chevron { transform:rotate(90deg); }
            /* AS400 TERMINAL THEME */
            body.tm-dark-mode{background:#000!important;color:#39ff14!important;font-family:Consolas,"Courier New",monospace!important}
            body.tm-dark-mode main,body.tm-dark-mode .container,body.tm-dark-mode .container-fluid{color:#39ff14!important}
            body.tm-dark-mode h1,body.tm-dark-mode h2,body.tm-dark-mode h3,body.tm-dark-mode h4,body.tm-dark-mode h5,body.tm-dark-mode h6{color:#7cff6b!important;text-shadow:0 0 5px rgba(57,255,20,.18)}
            body.tm-dark-mode .datatable{background:#000!important;border-color:#009933!important;box-shadow:0 0 12px rgba(0,255,65,.08)!important}
            body.tm-dark-mode .datatable thead th{background:#001a08!important;color:#7cff6b!important;border-color:#008f32!important;font-family:Consolas,"Courier New",monospace!important}
            body.tm-dark-mode .datatable tbody td{background:#000!important;color:#39ff14!important;border-color:#003b16!important}
            body.tm-dark-mode .datatable tbody tr:nth-child(even) td{background:#001006!important}
            body.tm-dark-mode .datatable tbody tr:hover td{background:#003311!important;color:#b7ffad!important}
            body.tm-dark-mode a{color:#33ffcc!important}
            body.tm-dark-mode .vertical-cut-time-cell{background:#000!important;color:#7cff6b!important;border-color:#00aa3c!important}
            body.tm-dark-mode .vertical-cut-time-cell.urgent-time{background:#2f2100!important;color:#ffd34d!important;border-color:#ffd34d!important}
            body.tm-dark-mode .vertical-cut-time-cell.passed-time{background:#101010!important;color:#66a875!important;border-color:#286638!important}
            body.tm-dark-mode #hub-settings-panel,body.tm-dark-mode .kpi-metric-card,body.tm-dark-mode .high-volume-kpi{background:#000!important;color:#39ff14!important;border-color:#008f32!important;box-shadow:0 0 10px rgba(0,255,65,.06)!important}
            body.tm-dark-mode #hub-settings-panel h5,body.tm-dark-mode .picker-name-span strong,body.tm-dark-mode .kpi-breakdown-row strong{color:#7cff6b!important}
            body.tm-dark-mode #hub-settings-panel details>summary,body.tm-dark-mode .kpi-card-title,body.tm-dark-mode .kpi-card-subtext,body.tm-dark-mode .kpi-breakdown-row{color:#55d96b!important}
            body.tm-dark-mode #hub-settings-panel input,body.tm-dark-mode #hub-settings-panel select{background:#001006!important;color:#7cff6b!important;border-color:#007a2b!important;font-family:Consolas,"Courier New",monospace!important}
            body.tm-dark-mode #associate-last-pick-panel,body.tm-dark-mode #short-locations-panel,body.tm-dark-mode .kpi-breakdown-box{background:#001006!important;border-color:#007a2b!important}
            body.tm-dark-mode .associate-last-pick-row,body.tm-dark-mode .short-location-row{border-color:#003b16!important}
            body.tm-dark-mode .kpi-card-remaining{color:#39ff14!important;text-shadow:0 0 6px rgba(57,255,20,.2)}
            body.tm-dark-mode .kpi-progress-bg{background:#00260d!important}body.tm-dark-mode .kpi-progress-bar{background:#00dd55!important}
            body.tm-dark-mode .accordion-container{background:#000!important;border-left-color:#00dd55!important}
            body.tm-dark-mode .accordion-header{background:#001a08!important;color:#7cff6b!important;border-color:#007a2b!important}
            body.tm-dark-mode .accordion-close-btn{background:#000!important;color:#39ff14!important;border-color:#00aa3c!important}
            body.tm-dark-mode tr.tm-details-open>td{background:#001a08!important}
            body.tm-dark-mode .btn-primary,body.tm-dark-mode .datatable .btn-primary,body.tm-dark-mode #scanAllBatchesBtn{background:#003b16!important;color:#7cff6b!important;border-color:#00cc44!important;box-shadow:none!important}
            body.tm-dark-mode .btn-primary:hover,body.tm-dark-mode .datatable .btn-primary:hover,body.tm-dark-mode #scanAllBatchesBtn:hover{background:#006622!important;color:#d5ffd0!important}
            body.tm-dark-mode #tm-dark-mode-toggle{background:#001006!important;color:#39ff14!important;border-color:#00cc44!important;font-family:Consolas,"Courier New",monospace!important}
            body.tm-dark-mode #tm-dark-mode-toggle:hover{background:#003311!important}
            body.tm-dark-mode #openPossibleMisScansReportTop{background:#241a00!important;color:#ffd34d!important;border-color:#cc9900!important}
            body.tm-dark-mode .high-vol-badge{background:#330000!important;color:#ff6666!important;border:1px solid #cc3333!important}
            body.tm-dark-mode .last-scan-cell.stale-scan{color:#ff6666!important}
            body.tm-dark-mode ::selection{background:#39ff14;color:#000}

            #tm-dark-mode-toggle{height:39px;margin-right:8px;padding:0 12px;border:1px solid #94a3b8;border-radius:4px;background:#fff;color:#334155;font-size:11px;font-weight:800;cursor:pointer;vertical-align:middle}
            body.tm-dark-mode{background:#0f172a!important;color:#e2e8f0!important} body.tm-dark-mode .datatable{background:#111827!important;border-color:#334155!important} body.tm-dark-mode .datatable thead th{background:#1e293b!important;color:#cbd5e1!important;border-color:#475569!important} body.tm-dark-mode .datatable tbody td{background:#111827;color:#e2e8f0!important;border-color:#293548!important} body.tm-dark-mode .datatable tbody tr:nth-child(even) td{background:#172033} body.tm-dark-mode .datatable tbody tr:hover td{background:#24324a!important} body.tm-dark-mode .vertical-cut-time-cell{background:#111827!important;color:#e2e8f0!important;border-color:#475569!important} body.tm-dark-mode #hub-settings-panel,body.tm-dark-mode .kpi-metric-card,body.tm-dark-mode .high-volume-kpi{background:#111827!important;color:#e2e8f0!important;border-color:#334155!important} body.tm-dark-mode #hub-settings-panel h5{color:#f8fafc!important} body.tm-dark-mode #hub-settings-panel input,body.tm-dark-mode #hub-settings-panel select{background:#1e293b!important;color:#f8fafc!important;border-color:#475569!important} body.tm-dark-mode #associate-last-pick-panel,body.tm-dark-mode #short-locations-panel{background:#172033!important;border-color:#334155!important} body.tm-dark-mode .accordion-container{background:#111827} body.tm-dark-mode .accordion-header{background:#1e293b;color:#f8fafc;border-color:#334155} body.tm-dark-mode tr.tm-details-open>td{background:#1e293b!important} body.tm-dark-mode #tm-dark-mode-toggle{background:#1e293b;color:#f8fafc;border-color:#475569}


            /* FINAL READABLE AS400 OVERRIDES */
            body.tm-dark-mode { background:#09110d !important; color:#d8e8de !important; }
            body.tm-dark-mode main, body.tm-dark-mode .container, body.tm-dark-mode .container-fluid { color:#d8e8de !important; }
            body.tm-dark-mode h1, body.tm-dark-mode h2, body.tm-dark-mode h3, body.tm-dark-mode h4, body.tm-dark-mode h5, body.tm-dark-mode h6 { color:#8cff9a !important; text-shadow:none !important; }
            body.tm-dark-mode .datatable { background:#0b1510 !important; border-color:#315443 !important; box-shadow:0 2px 8px rgba(0,0,0,.35) !important; }
            body.tm-dark-mode .datatable thead th { background:#17251d !important; color:#9fffb0 !important; border-color:#3c5d4b !important; }
            body.tm-dark-mode .datatable tbody td { background:#0b1510 !important; color:#d8e8de !important; border-color:#243b2e !important; }
            body.tm-dark-mode .datatable tbody tr:nth-child(even) td { background:#101d16 !important; }
            body.tm-dark-mode .datatable tbody tr:hover td { background:#1a3425 !important; color:#f2fff5 !important; }
            body.tm-dark-mode .datatable tbody tr[style*="fff1f2"] td { background:#382126 !important; }
            body.tm-dark-mode a { color:#68dfff !important; }
            body.tm-dark-mode .vertical-cut-time-cell { background:#0d1a13 !important; color:#d8e8de !important; border-color:#416551 !important; }
            body.tm-dark-mode .vertical-cut-time-cell.urgent-time { background:#3a2d12 !important; color:#ffd66b !important; border-color:#d3a936 !important; }
            body.tm-dark-mode .vertical-cut-time-cell.passed-time { background:#151d19 !important; color:#93a99b !important; border-color:#506459 !important; }
            body.tm-dark-mode #hub-settings-panel, body.tm-dark-mode .kpi-metric-card, body.tm-dark-mode .high-volume-kpi { background:#101a14 !important; color:#d8e8de !important; border-color:#315443 !important; box-shadow:0 2px 8px rgba(0,0,0,.28) !important; }
            body.tm-dark-mode #hub-settings-panel h5, body.tm-dark-mode .picker-name-span strong { color:#f0fff3 !important; }
            body.tm-dark-mode #hub-settings-panel details>summary, body.tm-dark-mode .kpi-card-title { color:#8cff9a !important; }
            body.tm-dark-mode .kpi-card-subtext, body.tm-dark-mode .kpi-unit { color:#a8bdb0 !important; }
            body.tm-dark-mode .kpi-card-remaining { color:#60f579 !important; text-shadow:none !important; }
            body.tm-dark-mode .kpi-progress-bg { height:6px !important; background:#34443a !important; border:1px solid #496052 !important; }
            body.tm-dark-mode .kpi-progress-bar { background:#20d663 !important; }
            body.tm-dark-mode .high-volume-kpi>div:last-child { background:#34443a !important; border:1px solid #496052 !important; }
            body.tm-dark-mode .high-volume-kpi>div:last-child>div { background:#20d663 !important; }
            body.tm-dark-mode #associate-last-pick-panel, body.tm-dark-mode #short-locations-panel, body.tm-dark-mode .kpi-breakdown-box { background:#0c1711 !important; border-color:#315443 !important; }
            body.tm-dark-mode #hub-settings-panel input, body.tm-dark-mode #hub-settings-panel select { background:#17251d !important; color:#e8f5ec !important; border-color:#496052 !important; }
            body.tm-dark-mode #hub-settings-panel input::placeholder { color:#86998d !important; }
            body.tm-dark-mode .accordion-container { background:#0b1510 !important; border-left-color:#20d663 !important; }
            body.tm-dark-mode .accordion-header { background:#17251d !important; color:#e8f5ec !important; border-color:#315443 !important; }
            body.tm-dark-mode tr.tm-details-open>td { background:#17251d !important; }
            body.tm-dark-mode .btn-primary, body.tm-dark-mode .datatable .btn-primary, body.tm-dark-mode #scanAllBatchesBtn, body.tm-dark-mode #tm-dark-mode-toggle { background:#123b24 !important; color:#a7ffb5 !important; border:1px solid #2fc85d !important; }
            body.tm-dark-mode .btn-primary:hover, body.tm-dark-mode .datatable .btn-primary:hover, body.tm-dark-mode #scanAllBatchesBtn:hover, body.tm-dark-mode #tm-dark-mode-toggle:hover { background:#1b5833 !important; color:#fff !important; }
            body.tm-dark-mode #openPossibleMisScansReportTop { background:#3b2d0d !important; color:#ffdc70 !important; border-color:#b89128 !important; }
            body.tm-dark-mode .last-scan-cell.stale-scan { color:#ff7f89 !important; }

            /* FINAL AS400 TYPOGRAPHY AND CONTRAST FIXES */
            body.tm-dark-mode, body.tm-dark-mode button, body.tm-dark-mode input, body.tm-dark-mode select, body.tm-dark-mode textarea,
            body.tm-dark-mode table, body.tm-dark-mode .btn, body.tm-dark-mode .kpi-metric-card, body.tm-dark-mode #hub-settings-panel {
                font-family:"Lucida Console",Consolas,"Courier New",monospace !important;
                font-variant-ligatures:none !important;
                letter-spacing:.01em;
            }
            body.tm-dark-mode .datatable tbody td, body.tm-dark-mode .datatable tbody td span,
            body.tm-dark-mode .picker-name-span, body.tm-dark-mode .picker-name-span strong {
                color:#d9eadf !important;
            }
            body.tm-dark-mode .picker-name-span { border-bottom-color:#63806d !important; opacity:1 !important; }
            body.tm-dark-mode .picker-name-span strong { color:#83f296 !important; }
            body.tm-dark-mode .last-scan-cell { color:#c5d8cb !important; }
            body.tm-dark-mode .datatable tbody tr[style*="font-weight"] td,
            body.tm-dark-mode .datatable tbody tr[style*="background-color: rgb(248, 250, 252)"] td {
                background:#17251d !important; color:#bfe5c9 !important; border-top:1px solid #466250 !important; border-bottom:1px solid #466250 !important;
            }
            body.tm-dark-mode .datatable tbody tr[style*="font-weight"] td strong,
            body.tm-dark-mode .datatable tbody tr[style*="font-weight"] td span,
            body.tm-dark-mode .datatable tbody tr[style*="font-weight"] td a { color:#b8ffc4 !important; opacity:1 !important; }
            body.tm-dark-mode .kpi-toggle-btn { background:#123b24 !important; color:#a7ffb5 !important; border:1px solid #2fc85d !important; }
            body.tm-dark-mode .kpi-toggle-btn:hover { background:#1b5833 !important; color:#fff !important; }
            body.tm-dark-mode .high-volume-kpi { border-color:#2fc85d !important; }
            body.tm-dark-mode .high-volume-kpi div[style*="color:#dc2626"],
            body.tm-dark-mode .high-volume-kpi div[style*="color: #dc2626"],
            body.tm-dark-mode .high-volume-kpi span[style*="color:#dc2626"],
            body.tm-dark-mode .high-volume-kpi span[style*="color: #dc2626"] { color:#60f579 !important; }
            body.tm-dark-mode .high-volume-kpi div[style*="background-color:#dc2626"],
            body.tm-dark-mode .high-volume-kpi div[style*="background-color: #dc2626"] { background-color:#20d663 !important; }
            body.tm-dark-mode .high-volume-kpi .kpi-toggle-btn,
            body.tm-dark-mode .high-volume-kpi a, body.tm-dark-mode .high-volume-kpi button { color:#a7ffb5 !important; }
            body.tm-dark-mode a.btn, body.tm-dark-mode button, body.tm-dark-mode .btn,
            body.tm-dark-mode .scan-group-btn, body.tm-dark-mode .accordion-close-btn,
            body.tm-dark-mode #cartonSearchBtn, body.tm-dark-mode #clearScanDataBtn {
                background:#123b24 !important; color:#a7ffb5 !important; border:1px solid #2fc85d !important; box-shadow:none !important;
            }
            body.tm-dark-mode a.btn:hover, body.tm-dark-mode button:hover, body.tm-dark-mode .btn:hover,
            body.tm-dark-mode .scan-group-btn:hover, body.tm-dark-mode .accordion-close-btn:hover {
                background:#1b5833 !important; color:#fff !important; border-color:#60f579 !important;
            }
            body.tm-dark-mode #clearScanDataBtn { background:#32191d !important; color:#ff9ca4 !important; border-color:#b84b57 !important; }
            body.tm-dark-mode #openPossibleMisScansReportTop { background:#3b2d0d !important; color:#ffdc70 !important; border-color:#b89128 !important; }
            body.tm-dark-mode .text-secondary, body.tm-dark-mode .text-muted { color:#a8bdb0 !important; }
            body.tm-dark-mode .kpi-shared-breakdown-panel, body.tm-dark-mode .kpi-shared-toggle-row { color:#d9eadf !important; }

            /* FINAL MODULE AND HIGH-VOLUME CONTROL THEME */
            body.tm-dark-mode .high-volume-kpi a,
            body.tm-dark-mode .high-volume-kpi button,
            body.tm-dark-mode .high-volume-kpi .btn,
            body.tm-dark-mode .high-volume-kpi [role="button"],
            body.tm-dark-mode .high-volume-kpi input[type="button"] {
                background:#123b24 !important; color:#a7ffb5 !important; border:1px solid #2fc85d !important;
                border-radius:4px !important; box-shadow:none !important; text-shadow:none !important;
            }
            body.tm-dark-mode .high-volume-kpi a:hover,
            body.tm-dark-mode .high-volume-kpi button:hover,
            body.tm-dark-mode .high-volume-kpi .btn:hover,
            body.tm-dark-mode .high-volume-kpi [role="button"]:hover {
                background:#1b5833 !important; color:#fff !important; border-color:#60f579 !important;
            }
            body.tm-dark-mode .high-volume-kpi a[style*="color"],
            body.tm-dark-mode .high-volume-kpi span[style*="color"] { color:#9fffb0 !important; }
            body.tm-dark-mode #associate-last-pick-panel,
            body.tm-dark-mode #short-locations-panel {
                background:#0d1912 !important; color:#d9eadf !important; border:1px solid #3b684d !important;
                box-shadow:inset 0 0 0 1px rgba(47,200,93,.08) !important;
            }
            body.tm-dark-mode #associate-last-pick-panel h5,
            body.tm-dark-mode #short-locations-panel h5 { color:#f0fff3 !important; }
            body.tm-dark-mode #associateLastPickCount,
            body.tm-dark-mode #shortLocationCount { color:#9db5a5 !important; }
            body.tm-dark-mode #associate-last-pick-panel input,
            body.tm-dark-mode #short-locations-panel input {
                background:#14251b !important; color:#eaf7ee !important; border:1px solid #496c57 !important;
            }
            body.tm-dark-mode #associate-last-pick-panel input::placeholder,
            body.tm-dark-mode #short-locations-panel input::placeholder { color:#91a69a !important; opacity:1 !important; }
            body.tm-dark-mode #associate-last-pick-panel [style*="color:#64748b"],
            body.tm-dark-mode #short-locations-panel [style*="color:#64748b"],
            body.tm-dark-mode #associate-last-pick-panel [style*="color: #64748b"],
            body.tm-dark-mode #short-locations-panel [style*="color: #64748b"] { color:#9db5a5 !important; }
            body.tm-dark-mode .associate-last-pick-row,
            body.tm-dark-mode .short-location-row { border-bottom-color:#284735 !important; }
            body.tm-dark-mode .associate-last-pick-row div,
            body.tm-dark-mode .associate-last-pick-row span,
            body.tm-dark-mode .short-location-row div,
            body.tm-dark-mode .short-location-row span { color:#d9eadf !important; }
            body.tm-dark-mode .associate-last-pick-row>div:first-child>div>div { color:#f0fff3 !important; }
            body.tm-dark-mode .associate-last-pick-row span[style*="background:#dcfce7"] {
                background:#17492b !important; color:#9fffb0 !important; border:1px solid #2fc85d !important;
            }
            body.tm-dark-mode .associate-last-pick-row span[style*="background:#dbeafe"],
            body.tm-dark-mode .short-location-row span[style*="background:#dbeafe"] {
                background:#12364a !important; color:#9ce6ff !important; border:1px solid #2b7996 !important;
            }
            body.tm-dark-mode .short-location-row span[style*="background:#fee2e2"] {
                background:#482126 !important; color:#ffadb4 !important; border:1px solid #b84b57 !important;
            }
            body.tm-dark-mode .short-location-row a { color:#68dfff !important; border-bottom-color:#3eb6db !important; }
            body.tm-dark-mode #associateLastPickRows,
            body.tm-dark-mode #shortLocationRows {
                scrollbar-color:#4d755d #142019 !important; scrollbar-width:thin !important;
            }
            body.tm-dark-mode #associateLastPickRows::-webkit-scrollbar,
            body.tm-dark-mode #shortLocationRows::-webkit-scrollbar { width:9px; }
            body.tm-dark-mode #associateLastPickRows::-webkit-scrollbar-track,
            body.tm-dark-mode #shortLocationRows::-webkit-scrollbar-track { background:#142019; }
            body.tm-dark-mode #associateLastPickRows::-webkit-scrollbar-thumb,
            body.tm-dark-mode #shortLocationRows::-webkit-scrollbar-thumb { background:#4d755d; border:2px solid #142019; border-radius:8px; }

            /* FINAL CONTROL, HIGH-VOLUME DETAILS, AND SHORTS BLUE THEME */
            body.tm-dark-mode .high-volume-kpi a,
            body.tm-dark-mode .high-volume-kpi a.btn,
            body.tm-dark-mode .high-volume-kpi button,
            body.tm-dark-mode .high-volume-kpi .btn,
            body.tm-dark-mode .high-volume-kpi [class*="detail"],
            body.tm-dark-mode .high-volume-kpi [class*="report"] {
                background:#123b24 !important;
                color:#a7ffb5 !important;
                border:1px solid #2fc85d !important;
                border-radius:4px !important;
                box-shadow:none !important;
                opacity:1 !important;
                filter:none !important;
            }
            body.tm-dark-mode .high-volume-kpi a *,
            body.tm-dark-mode .high-volume-kpi button * { color:#a7ffb5 !important; }
            body.tm-dark-mode .high-volume-kpi a:hover,
            body.tm-dark-mode .high-volume-kpi button:hover,
            body.tm-dark-mode .high-volume-kpi .btn:hover {
                background:#1b5833 !important;
                color:#fff !important;
                border-color:#60f579 !important;
            }
            body.tm-dark-mode input[type="checkbox"] {
                appearance:none !important;
                -webkit-appearance:none !important;
                width:14px !important;
                height:14px !important;
                border:1px solid #73917e !important;
                border-radius:2px !important;
                background:#101a14 !important;
                display:inline-grid !important;
                place-content:center !important;
                vertical-align:middle !important;
            }
            body.tm-dark-mode input[type="checkbox"]::before {
                content:"✓";
                color:#07110a;
                font-size:11px;
                font-weight:900;
                line-height:1;
                transform:scale(0);
            }
            body.tm-dark-mode input[type="checkbox"]:checked {
                background:#39e66b !important;
                border-color:#72ff94 !important;
                box-shadow:0 0 0 1px rgba(57,230,107,.18) !important;
            }
            body.tm-dark-mode input[type="checkbox"]:checked::before { transform:scale(1); }
            body.tm-dark-mode input[type="range"] { accent-color:#28df68 !important; }
            body.tm-dark-mode input[type="range"]::-webkit-slider-runnable-track {
                height:6px !important; background:#254b34 !important; border:1px solid #3f6f50 !important; border-radius:999px !important;
            }
            body.tm-dark-mode input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance:none !important; width:18px !important; height:18px !important; margin-top:-7px !important;
                border-radius:50% !important; background:#39e66b !important; border:2px solid #a7ffb5 !important;
            }
            body.tm-dark-mode input[type="range"]::-moz-range-track { height:6px; background:#254b34; border:1px solid #3f6f50; border-radius:999px; }
            body.tm-dark-mode input[type="range"]::-moz-range-progress { height:6px; background:#28df68; border-radius:999px; }
            body.tm-dark-mode input[type="range"]::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#39e66b; border:2px solid #a7ffb5; }
            body.tm-dark-mode #widthValueDisplay { color:#5df285 !important; }
            body.tm-dark-mode #short-locations-panel {
                background:#0b1820 !important;
                border-color:#25769a !important;
                box-shadow:inset 0 0 0 1px rgba(62,182,219,.08) !important;
            }
            body.tm-dark-mode #short-locations-panel h5,
            body.tm-dark-mode #shortLocationCount { color:#8bddff !important; }
            body.tm-dark-mode #short-locations-panel input {
                background:#102632 !important;
                color:#d9f5ff !important;
                border-color:#2d7898 !important;
            }
            body.tm-dark-mode #short-locations-panel input::placeholder { color:#83acbd !important; }
            body.tm-dark-mode .short-location-row { border-bottom-color:#164e68 !important; }
            body.tm-dark-mode .short-location-row a {
                color:#62dcff !important;
                border-bottom-color:#3eb6db !important;
            }
            body.tm-dark-mode .short-location-row span[style*="background:#dbeafe"] {
                background:#123e55 !important;
                color:#a4e9ff !important;
                border:1px solid #2d8db4 !important;
            }
            body.tm-dark-mode .short-location-row span[style*="background:#fee2e2"] {
                background:#13384a !important;
                color:#8bddff !important;
                border:1px solid #2d8db4 !important;
            }
            body.tm-dark-mode #shortLocationRows { scrollbar-color:#347b99 #102632 !important; }
            body.tm-dark-mode #shortLocationRows::-webkit-scrollbar-track { background:#102632 !important; }
            body.tm-dark-mode #shortLocationRows::-webkit-scrollbar-thumb { background:#347b99 !important; border-color:#102632 !important; }

            /* FINAL SHORT LOCATIONS GREEN THEME */
            body.tm-dark-mode #short-locations-panel {
                background:#0d1912 !important;
                color:#d9eadf !important;
                border:1px solid #3b684d !important;
                box-shadow:inset 0 0 0 1px rgba(47,200,93,.08) !important;
            }
            body.tm-dark-mode #short-locations-panel h5 { color:#f0fff3 !important; }
            body.tm-dark-mode #shortLocationCount { color:#9db5a5 !important; }
            body.tm-dark-mode #short-locations-panel input {
                background:#14251b !important;
                color:#eaf7ee !important;
                border:1px solid #496c57 !important;
            }
            body.tm-dark-mode #short-locations-panel input::placeholder { color:#91a69a !important; opacity:1 !important; }
            body.tm-dark-mode .short-location-row { border-bottom-color:#284735 !important; }
            body.tm-dark-mode .short-location-row a {
                color:#83f296 !important;
                border-bottom-color:#4aaa61 !important;
            }
            body.tm-dark-mode .short-location-row span[style*="background:#dbeafe"] {
                background:#17492b !important;
                color:#b8ffc4 !important;
                border:1px solid #2fc85d !important;
            }
            body.tm-dark-mode .short-location-row span[style*="background:#fee2e2"] {
                background:#173d25 !important;
                color:#a7ffb5 !important;
                border:1px solid #39d86a !important;
            }
            body.tm-dark-mode #shortLocationRows { scrollbar-color:#4d755d #142019 !important; }
            body.tm-dark-mode #shortLocationRows::-webkit-scrollbar-track { background:#142019 !important; }
            body.tm-dark-mode #shortLocationRows::-webkit-scrollbar-thumb {
                background:#4d755d !important;
                border-color:#142019 !important;
            }

            /* FINAL HUB BADGE, TABLE HEADER, AND TOP TOOLBAR FIXES */
            body.tm-dark-mode .associate-last-pick-row span[style*="background:#dbeafe"] {
                background:#17492b !important;
                color:#b8ffc4 !important;
                border:1px solid #2fc85d !important;
            }
            body.tm-dark-mode .datatable thead th,
            body.tm-dark-mode table.datatable thead th,
            body.tm-dark-mode .datatable thead th.text-primary,
            body.tm-dark-mode .datatable thead th a {
                background:#17251d !important;
                color:#9fffb0 !important;
                border-color:#496052 !important;
                text-shadow:none !important;
            }
            #tm-batch-top-actions {
                display:inline-flex !important;
                align-items:center !important;
                justify-content:flex-end !important;
                gap:8px !important;
                flex-wrap:nowrap !important;
                vertical-align:middle !important;
                white-space:nowrap !important;
            }
            #tm-batch-top-actions > * {
                margin:0 !important;
                flex:0 0 auto !important;
                width:auto !important;
                min-width:auto !important;
            }
            #tm-batch-top-actions #openPossibleMisScansReportTop,
            #tm-batch-top-actions #tm-dark-mode-toggle,
            #tm-batch-top-actions a.btn-primary {
                height:39px !important;
                display:inline-flex !important;
                align-items:center !important;
                justify-content:center !important;
                padding:0 13px !important;
                line-height:1 !important;
            }

            /* MERGED HIGH VOLUME BREAKDOWN */
            #high-vol-injected-breakdown { margin-top:8px; padding-top:10px; border-top:1px dashed #cbd5e1; flex-wrap:wrap; gap:15px; width:100%; margin-bottom:12px; }
            .hvo-time-block { flex:1 1 180px; min-width:200px; }
            .hvo-time-title { font-size:10px; font-weight:800; color:#334155; margin-bottom:6px; border-bottom:1px solid #cbd5e1; padding-bottom:4px; text-transform:uppercase; }
            .hvo-hub-box { margin-bottom:6px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:5px 7px; }
            .hvo-hub-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; }
            .hvo-hub-name { font-weight:800; color:#047857; font-size:10.5px; }
            .hvo-total { font-weight:800; color:#0f172a; font-size:11px; }
            .hvo-total-small { font-size:9.5px; color:#64748b; }
            .hvo-zone-row { display:flex; justify-content:space-between; font-size:9.5px; color:#475569; font-weight:700; }
            .hvo-active { color:#dc2626; } .hvo-zero { color:#94a3b8; }
            #hvo-report-link, #hvo-toggle-btn { display:inline-flex; align-items:center; height:24px; padding:2px 7px; border-radius:4px; font-size:10px; font-weight:800; text-decoration:none; cursor:pointer; user-select:none; }
            #hvo-report-link { color:#047857; background:#ecfdf5; border:1px solid #6ee7b7; }
            #hvo-toggle-btn { color:#1d4ed8; background:#eff6ff; border:1px solid #93c5fd; }
            #hvo-report-link:hover { background:#d1fae5; } #hvo-toggle-btn:hover { background:#dbeafe; }
            body.tm-dark-mode #high-vol-injected-breakdown { border-top-color:#315443 !important; }
            body.tm-dark-mode .hvo-time-title { color:#9fffb0 !important; border-bottom-color:#3b684d !important; }
            body.tm-dark-mode .hvo-hub-box { background:#0d1912 !important; border-color:#3b684d !important; }
            body.tm-dark-mode .hvo-hub-name, body.tm-dark-mode .hvo-active { color:#60f579 !important; }
            body.tm-dark-mode .hvo-total { color:#eaf7ee !important; }
            body.tm-dark-mode .hvo-total-small, body.tm-dark-mode .hvo-zone-row { color:#a8bdb0 !important; }
            body.tm-dark-mode .hvo-zero { color:#6f8578 !important; }
            body.tm-dark-mode #hvo-report-link, body.tm-dark-mode #hvo-toggle-btn { background:#123b24 !important; color:#a7ffb5 !important; border-color:#2fc85d !important; }
            body.tm-dark-mode #hvo-report-link:hover, body.tm-dark-mode #hvo-toggle-btn:hover { background:#1b5833 !important; color:#fff !important; }

            /* FINAL COMPACT LAYOUT OVERRIDES */
            #main-layout-flex-wrapper { gap:14px !important; align-items:flex-start !important; }
            #main-layout-flex-wrapper > div:first-child { min-width:0 !important; }
            #hub-settings-panel { height:auto !important; max-height:calc(100vh - 24px) !important; padding:14px !important; margin:16px 0 0 !important; }
            #main-layout-flex-wrapper > div:first-child > table.datatable { margin-top:16px !important; }
            #main-layout-flex-wrapper > div:first-child { padding-top:0 !important; }

            .kpi-dashboard-grid { gap:10px !important; margin-bottom:8px !important; }
            .kpi-metric-card { min-width:145px !important; padding:10px 13px !important; border-radius:6px !important; }
            .kpi-shared-toggle-row { margin:-2px 0 8px !important; }
            .kpi-shared-breakdown-panel { width:100% !important; margin:0 0 10px !important; gap:8px !important; }
            .kpi-shared-breakdown-panel.open { display:grid !important; grid-template-columns:repeat(6,minmax(0,1fr)) !important; align-items:start !important; }
            .kpi-shared-breakdown-panel > div { min-width:0 !important; width:auto !important; }
            .tm-panel-drilldown-title { display:inline-flex; align-items:center; gap:6px; margin:0; padding:2px 4px 2px 0; border:0; background:transparent; color:#0f172a; font:inherit; font-weight:800; cursor:pointer; text-align:left; }
            .tm-panel-drilldown-title::after { content:'OPEN'; padding:2px 5px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:8px; font-weight:900; letter-spacing:.35px; }
            .tm-panel-drilldown-title:hover { color:#2563eb; }
            body.tm-dark-mode .tm-panel-drilldown-title { color:#f0fff3 !important; }
            body.tm-dark-mode .tm-panel-drilldown-title::after { background:#17492b !important; color:#b8ffc4 !important; border:1px solid #2fc85d !important; }
            .kpi-breakdown-zone-title { margin-bottom:4px !important; padding-bottom:3px !important; }
            .kpi-breakdown-box { padding:5px 7px !important; }
            .kpi-breakdown-row { font-size:9.5px !important; margin-bottom:2px !important; }

            .high-volume-kpi { overflow:visible !important; }
            .hvo-summary-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:0 0 5px; min-height:24px; }
            .hvo-summary-title { color:#dc2626; font-size:10px; font-weight:800; letter-spacing:.65px; text-transform:uppercase; white-space:nowrap; }
            .hvo-summary-actions { margin-left:auto; display:flex; align-items:center; justify-content:flex-end; gap:7px; min-width:0; }
            .hvo-summary-percent { color:#64748b; font-size:9.5px; font-weight:700; white-space:nowrap; }
            .hvo-summary-metrics { display:flex; align-items:center; flex-wrap:wrap; gap:7px 18px; margin:0 0 6px !important; }
            .hvo-summary-metric { display:grid; grid-template-columns:auto auto auto; align-items:baseline; column-gap:5px; white-space:nowrap; }
            .hvo-summary-metric > span { color:#64748b; font-size:9px; font-weight:700; text-transform:uppercase; }
            .hvo-summary-metric > strong { color:#0f172a; font-size:17px; line-height:1; font-weight:800; }
            .hvo-summary-metric:nth-child(1) > strong, .hvo-summary-metric:nth-child(4) > strong { color:#dc2626; }
            .hvo-summary-metric > small { color:#64748b; font-size:9px; font-weight:700; }
            .hvo-summary-divider { width:1px; height:20px; background:#e2e8f0; }
            .hvo-summary-progress { width:100%; height:3px; overflow:hidden; border-radius:99px; background:#e2e8f0; }
            .hvo-summary-progress > div { height:100%; border-radius:99px; background:#dc2626; transition:width .3s ease; }
            #high-vol-injected-breakdown { margin:5px 0 7px !important; padding-top:7px !important; gap:8px !important; }
            .hvo-time-block { min-width:175px !important; }
            #hvo-report-link, #hvo-toggle-btn { height:22px !important; padding:1px 7px !important; font-size:9px !important; }

            #tm-batch-top-actions { display:inline-flex !important; align-items:center !important; justify-content:flex-end !important; gap:5px !important; flex-wrap:nowrap !important; white-space:nowrap !important; max-width:calc(100vw - 24px) !important; margin-right:6px !important; }
            #tm-batch-top-actions > * { flex:0 0 auto !important; margin:0 !important; min-width:0 !important; }
            #tm-batch-top-actions #openPossibleMisScansReportTop,
            #tm-batch-top-actions #tm-dark-mode-toggle,
            #tm-batch-top-actions a.btn-primary { height:34px !important; padding:0 9px !important; font-size:10px !important; line-height:1 !important; }
            #tm-batch-top-actions #openPossibleMisScansReportTop span { min-width:17px !important; height:17px !important; margin-left:4px !important; padding:0 4px !important; }

            body.tm-dark-mode .hvo-summary-title { color:#8cff9a !important; }
            body.tm-dark-mode .hvo-summary-percent, body.tm-dark-mode .hvo-summary-metric > span, body.tm-dark-mode .hvo-summary-metric > small { color:#a8bdb0 !important; }
            body.tm-dark-mode .hvo-summary-metric > strong { color:#eaf7ee !important; }
            body.tm-dark-mode .hvo-summary-metric:nth-child(1) > strong, body.tm-dark-mode .hvo-summary-metric:nth-child(4) > strong { color:#60f579 !important; }
            body.tm-dark-mode .hvo-summary-divider { background:#315443 !important; }
            body.tm-dark-mode .hvo-summary-progress { background:#34443a !important; border:0 !important; }
            body.tm-dark-mode .hvo-summary-progress > div { background:#20d663 !important; }
            /* FINAL COMPACT TOP TOOLBAR LAYOUT */
            #tm-batch-top-actions {
                display:flex !important;
                align-items:center !important;
                justify-content:flex-end !important;
                gap:5px !important;
                flex-wrap:nowrap !important;
                width:auto !important;
                max-width:100% !important;
                min-width:0 !important;
                margin:0 4px 0 auto !important;
                padding:0 !important;
                white-space:nowrap !important;
                box-sizing:border-box !important;
            }
            #tm-batch-top-actions > button,
            #tm-batch-top-actions > a {
                flex:0 1 auto !important;
                width:auto !important;
                min-width:0 !important;
                max-width:none !important;
                height:34px !important;
                margin:0 !important;
                padding:0 9px !important;
                display:inline-flex !important;
                align-items:center !important;
                justify-content:center !important;
                border-radius:5px !important;
                font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif !important;
                font-size:10px !important;
                font-weight:800 !important;
                line-height:1 !important;
                letter-spacing:0 !important;
                text-transform:none !important;
                white-space:nowrap !important;
                box-sizing:border-box !important;
                overflow:visible !important;
            }
            #tm-batch-top-actions #openAssociateIntelligenceTop {
                font-size:10px !important;
                padding:0 10px !important;
            }
            #tm-batch-top-actions #openPossibleMisScansReportTop span {
                min-width:17px !important;
                height:17px !important;
                margin-left:5px !important;
                padding:0 4px !important;
                font-size:9px !important;
            }
            #tm-batch-top-actions #tm-dark-mode-toggle {
                margin:0 !important;
            }
            #tm-batch-top-actions a[href*="BatchStatus?completed="] {
                flex:0 0 auto !important;
                padding:0 10px !important;
            }
            @media (max-width:720px) {
                #tm-batch-top-actions {
                    flex-wrap:wrap !important;
                    justify-content:flex-end !important;
                }
                #tm-batch-top-actions > button,
                #tm-batch-top-actions > a {
                    height:31px !important;
                    padding:0 7px !important;
                    font-size:9px !important;
                }
            }

            /* FINAL TOPBAR BUTTON GEOMETRY: PREVENT TEXT COMPRESSION */
            #tm-batch-top-actions {
                display:flex !important;
                align-items:center !important;
                justify-content:flex-end !important;
                gap:4px !important;
                flex-wrap:nowrap !important;
                width:max-content !important;
                max-width:none !important;
                min-width:max-content !important;
                margin:0 4px 0 auto !important;
                padding:0 !important;
                white-space:nowrap !important;
                overflow:visible !important;
            }
            #tm-batch-top-actions > button,
            #tm-batch-top-actions > a {
                flex:0 0 auto !important;
                width:auto !important;
                min-width:max-content !important;
                max-width:none !important;
                height:34px !important;
                margin:0 !important;
                padding:0 8px !important;
                display:inline-flex !important;
                align-items:center !important;
                justify-content:center !important;
                border-radius:5px !important;
                font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif !important;
                font-size:9px !important;
                font-weight:800 !important;
                line-height:1 !important;
                letter-spacing:0 !important;
                text-transform:none !important;
                white-space:nowrap !important;
                overflow:visible !important;
                text-overflow:clip !important;
                box-sizing:border-box !important;
            }
            #tm-batch-top-actions #openAssociateIntelligenceTop {
                padding:0 9px !important;
                font-size:9px !important;
            }
            #tm-batch-top-actions #openPossibleMisScansReportTop {
                padding:0 7px 0 9px !important;
            }
            #tm-batch-top-actions #openPossibleMisScansReportTop span {
                flex:0 0 auto !important;
                min-width:16px !important;
                width:auto !important;
                height:16px !important;
                margin-left:4px !important;
                padding:0 4px !important;
                font-size:8px !important;
                line-height:16px !important;
            }
            #tm-batch-top-actions #tm-dark-mode-toggle {
                padding:0 9px !important;
            }
            #tm-batch-top-actions a[href*="BatchStatus?completed="] {
                flex:0 0 auto !important;
                min-width:max-content !important;
                padding:0 9px !important;
            }
            @media (max-width:760px) {
                #tm-batch-top-actions {
                    gap:3px !important;
                }
                #tm-batch-top-actions > button,
                #tm-batch-top-actions > a {
                    height:32px !important;
                    padding-left:6px !important;
                    padding-right:6px !important;
                    font-size:8px !important;
                }
            }

            /* UNIFIED TOP ACTION BUTTON THEME */
            #tm-batch-top-actions > button,
            #tm-batch-top-actions > a,
            #hvo-report-link,
            #hvo-toggle-btn {
                background:#2563eb !important;
                color:#fff !important;
                border:1px solid #2563eb !important;
                border-radius:5px !important;
                box-shadow:none !important;
                font-weight:800 !important;
            }
            #tm-batch-top-actions > button:hover,
            #tm-batch-top-actions > a:hover,
            #hvo-report-link:hover,
            #hvo-toggle-btn:hover {
                background:#1d4ed8 !important;
                color:#fff !important;
                border-color:#1d4ed8 !important;
            }
            #tm-batch-top-actions #openPossibleMisScansReportTop span {
                background:rgba(255,255,255,.2) !important;
                color:#fff !important;
            }
            body.tm-dark-mode #tm-batch-top-actions > button,
            body.tm-dark-mode #tm-batch-top-actions > a,
            body.tm-dark-mode #hvo-report-link,
            body.tm-dark-mode #hvo-toggle-btn {
                background:#123b24 !important;
                color:#a7ffb5 !important;
                border-color:#2fc85d !important;
            }
            body.tm-dark-mode #tm-batch-top-actions > button:hover,
            body.tm-dark-mode #tm-batch-top-actions > a:hover,
            body.tm-dark-mode #hvo-report-link:hover,
            body.tm-dark-mode #hvo-toggle-btn:hover {
                background:#1b5833 !important;
                color:#fff !important;
                border-color:#60f579 !important;
            }
            @media (max-width:1500px) {
                .kpi-shared-breakdown-panel.open { grid-template-columns:repeat(3,minmax(0,1fr)) !important; }
                #main-layout-flex-wrapper { gap:10px !important; }
                #hub-settings-panel { flex-basis:250px !important; }
            }
            @media (max-width:1050px) {
                #tm-batch-top-actions { flex-wrap:wrap !important; }
                .kpi-shared-breakdown-panel.open { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
            }
        `;
        document.head.appendChild(style);
    }

    // --- Storage & Helper Functions ---
    function getOperationalDayWindow(referenceDate = new Date()) {
        const start = new Date(referenceDate);
        start.setHours(2, 0, 0, 0);
        if (referenceDate.getTime() < start.getTime()) start.setDate(start.getDate() - 1);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start: start.getTime(), end: end.getTime() };
    }
    function isTimestampInCurrentOperationalDay(timeStr) {
        const ts = getScanTimestamp(timeStr);
        if (!ts) return false;
        const { start, end } = getOperationalDayWindow();
        return ts >= start && ts < end;
    }
    function getOperationalDayKey() {
        const { start } = getOperationalDayWindow();
        const d = new Date(start);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function getOperationalDayWindowForKey(dateKey) {
        const [year, month, day] = String(dateKey || '').split('-').map(Number);
        const start = new Date(year, month - 1, day, 2, 0, 0, 0).getTime();
        return { start, end:new Date(year, month - 1, day + 1, 2, 0, 0, 0).getTime() };
    }
    function markCompletedBatchScanned(batchId, row = null) {
        const cache = getStoredBatchCache();
        const key = String(batchId || '');
        if (!key || !cache[key]) return;
        cache[key].completedSnapshotDay = getOperationalDayKey();
        cache[key].completedSnapshot = {
            pending: parseInt(row?.getAttribute('data-saved-pending'), 10) || 0,
            picked: parseInt(row?.getAttribute('data-saved-picked'), 10) || 0,
            total: parseInt(row?.getAttribute('data-saved-total'), 10) || 0,
            capturedAt: new Date().toISOString()
        };
        cache[key].cacheUpdatedAt = new Date().toISOString();
        cache[key].possibleMisScans = [];
        cache[key].shortLocations = [];
        batchCacheDirty = true;
    }
    function wasCompletedBatchScannedThisOperationalDay(batchId) {
        return getStoredBatchCache()[String(batchId || '')]?.completedSnapshotDay === getOperationalDayKey();
    }
    function purgeOldPickerDataFromCache(cache) {
        let changed = false;
        const retentionCutoff = Date.now() - (2 * 24 * 60 * 60 * 1000);
        Object.keys(cache).forEach(batchId => {
            const batch = cache[batchId];
            if (!batch) {
                delete cache[batchId];
                changed = true;
                return;
            }
            // Prefer the cache write timestamp. Older records created before this
            // version fall back to their last valid batch scan timestamp.
            const cacheTs = Date.parse(batch.cacheUpdatedAt || '') || getScanTimestamp(batch.lastScanTime);
            if (!cacheTs || cacheTs < retentionCutoff) {
                delete cache[batchId];
                changed = true;
            }
        });
        Object.values(cache).forEach(batch => {
            if (!batch) return;
            if (Array.isArray(batch.pickers)) {
                const currentPickers = batch.pickers.filter(picker => {
                    if (!picker || typeof picker === 'string') return false;
                    return isTimestampInCurrentOperationalDay(picker.timeStr);
                });
                if (currentPickers.length !== batch.pickers.length) {
                    batch.pickers = currentPickers;
                    changed = true;
                }
            }
            const batchIsCurrent = isTimestampInCurrentOperationalDay(batch.lastScanTime);
            if (!batchIsCurrent && Array.isArray(batch.possibleMisScans) && batch.possibleMisScans.length) {
                batch.possibleMisScans = [];
                changed = true;
            }
        });
        return changed;
    }
    function getStoredBatchCache() {
        if (batchCacheMemory) return batchCacheMemory;
        const stored = localStorage.getItem('__batch_status_scan_cache');
        if (stored) {
            try {
                const cache = JSON.parse(stored);
                batchCacheMemory = cache && typeof cache === 'object' ? cache : {};
                if (purgeOldPickerDataFromCache(batchCacheMemory)) batchCacheDirty = true;
                return batchCacheMemory;
            } catch(e) {}
        }
        batchCacheMemory = {};
        return batchCacheMemory;
    }

    function persistBatchCacheIfDirty() {
        if (!batchCacheDirty && !pickabilityCacheDirty) return;
        try {
            localStorage.setItem('__batch_status_scan_cache', JSON.stringify(getStoredBatchCache()));
            batchCacheDirty = false;
            pickabilityCacheDirty = false;
        } catch (error) {
            console.warn('Could not persist batch cache', error);
        }
    }

    function syncMasterBatchIndex(rows, cacheMap = getStoredBatchCache(), activate = true) {
        const nextIndex = new Map();
        const rowIndex = new WeakMap();
        rows.forEach(row => {
            const id = String(row.getAttribute('data-saved-id') || '');
            if (!id) return;
            const previous = masterBatchIndex.get(id);
            const record = previous?.row === row ? previous : { id, row };
            if (previous?.row !== row) {
                record.rawCells = Array.from(row.cells, cell => cell.innerHTML);
                record.rawSignature = hashHistoryValue(record.rawCells.join('\u001f'));
                record.detailHref = row.querySelector("a[href*='BatchDetail']")?.getAttribute('href') || '';
            }
            record.batchType = row.getAttribute('data-saved-type') || '';
            const savedZone = row.getAttribute('data-saved-zone') || '';
            record.zone = ['Floor', 'PTB', 'Reserve'].includes(savedZone) ? savedZone : classifyWorkZone(record.batchType);
            record.hub = row.getAttribute('data-saved-hub') || '';
            record.pending = parseInt(row.getAttribute('data-saved-pending'), 10) || 0;
            record.picked = parseInt(row.getAttribute('data-saved-picked'), 10) || 0;
            record.total = parseInt(row.getAttribute('data-saved-total'), 10) || 0;
            record.cache = cacheMap[id] || null;
            record.isHighVol = !!record.cache?.isHighVol;
            record.isFullPallet = isFullPalletPickBatch(record.batchType);
            nextIndex.set(id, record);
            rowIndex.set(row, record);
        });
        nextIndex.rowIndex = rowIndex;
        if (activate) {
            masterBatchIndex = nextIndex;
            masterBatchRowIndex = rowIndex;
        }
        return nextIndex;
    }

    function saveBatchCacheItem(batchId, isHighVol, lastScanTime, pickersList, shortLocationsList, possibleMisScansList, completionInfo, pickabilityData, batchType, batchTotal, batchPrintInfo) {
        const cache = getStoredBatchCache();
        const cachedBatch = {
            isHighVol: !!isHighVol,
            lastScanTime: lastScanTime || '--',
            pickers: pickersList || [],
            shortLocations: shortLocationsList || [],
            possibleMisScans: possibleMisScansList || [],
            aiMisScanRuleVersion: AI_MISSCAN_RULE_VERSION,
            pickerTimelineSchemaVersion: PICKER_TIMELINE_SCHEMA_VERSION,
            completionInfo: completionInfo || { effectivelyComplete: false, canceledCount: 0, actionableRemaining: 0 },
            pickabilityData: pickabilityData || null,
            batchPrintInfo:batchPrintInfo || null,
            cacheUpdatedAt: new Date().toISOString()
        };
        cachedBatch.pickabilityRating = cachedBatch.isHighVol || isFullPalletPickBatch(batchType)
            ? null
            : buildPickabilityRating(cachedBatch.pickabilityData, batchTotal, getPickabilityMinimumCartons());
        cache[String(batchId)] = cachedBatch;
        batchCacheDirty = true;
        const indexedBatch = masterBatchIndex.get(String(batchId));
        if (indexedBatch) {
            indexedBatch.cache = cachedBatch;
            indexedBatch.isHighVol = !!cachedBatch.isHighVol;
        }
    }

    function clearBatchCache() {
        localStorage.removeItem('__batch_status_scan_cache');
        batchCacheMemory = {};
        batchCacheDirty = false;
        pickabilityCacheDirty = false;
        masterBatchIndex.clear();
    }
    function purgeDISDetailCache() {
        const cache = getStoredBatchCache();
        let changed = false;
        originalDataRows.forEach(row => {
            if ((row.getAttribute('data-saved-hub') || '') !== 'DIS') return;
            const batchId = String(row.getAttribute('data-saved-id') || '');
            if (batchId && cache[batchId]) {
                delete cache[batchId];
                const indexedBatch = masterBatchIndex.get(batchId);
                if (indexedBatch) {
                    indexedBatch.cache = null;
                    indexedBatch.isHighVol = false;
                }
                changed = true;
            }
        });
        if (changed) {
            batchCacheDirty = true;
            persistBatchCacheIfDirty();
        }
    }


    function getRelativeTimeStr(dateStr) {
        if (!dateStr || dateStr === '--' || dateStr === 'Unknown') return dateStr;

        let ts = new Date(dateStr).getTime();
        if (isNaN(ts) || new Date(ts).getFullYear() < 2020) {
             ts = new Date(`${new Date().getFullYear()}/${dateStr}`).getTime();
        }
        if (isNaN(ts)) return dateStr;

        const diffMs = Date.now() - ts;
        if (diffMs < 0) return 'Just now';

        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';

        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        if (hrs >= 24) {
            const days = Math.floor(hrs / 24);
            const remainderHrs = hrs % 24;
            if (remainderHrs > 0) return `${days}d ${remainderHrs}hr ago`;
            return `${days}d ago`;
        }
        if (hrs > 0) {
            return `${hrs}hr ${mins}min ago`;
        }
        return `${mins} min ago`;
    }

    function parseBatchDetailHTML(htmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const isHighVol = htmlText.includes("Print Message:") && htmlText.includes("High Vol Qty:");
        const detailText = String(doc.body?.innerText || '').replace(/\u00a0/g, ' ');
        const readDetailField = label => {
            const pattern = new RegExp(`\\b${label}\\s*:\\s*([\\s\\S]*?)(?=\\s+\\b(?:Printed|Assigned|Type)\\s*:|\\r?\\n|$)`, 'i');
            return String(detailText.match(pattern)?.[1] || '').trim();
        };
        const printedAt = readDetailField('Printed');
        const assignedAt = readDetailField('Assigned');
        const batchTypeLabel = readDetailField('Type');
        const printedTs = getBatchDetailTimestamp(printedAt);
        const assignedTs = getBatchDetailTimestamp(assignedAt);
        const batchPrintInfo = {
            version:1,
            printedAt,
            assignedAt,
            type:batchTypeLabel,
            manualPrint:/manual/i.test(batchTypeLabel),
            minutesToPick:printedTs && assignedTs >= printedTs ? Math.round((assignedTs - printedTs) / 60000) : null
        };

        let pickersMap = new Map();
        let shortLocationsMap = new Map();
        let pickabilityCartons = new Map();
        let timestamps = [];
        let maxOverallTs = 0;
        let overallNewestTimeStr = "--";

        doc.querySelectorAll("table tr").forEach(row => {
            // FIX: Strip out Script 1's injected columns before counting the cells
            row.querySelectorAll('.tm-last-scan-cell, #tm-last-scan-header').forEach(el => el.remove());

            const cells = Array.from(row.querySelectorAll("td, th")).map(c => c.innerText.trim());
            if (cells.length >= 8) {
                // Grab Location (usually 4 cols from right), Picker (2 from right), Time (last col)
                const locationVal = (cells.length >= 9 ? cells[5] : cells[cells.length - 4]) || "Unknown";
                const cartonVal = cells[2] || "";
                const pickerName = (cells.length >= 9 ? cells[7] : cells[cells.length - 2]) || "";
                const timestampPattern = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/i;
                const expectedTimeCell = cells.length >= 9 ? cells[8] : '';
                const timestampVal = timestampPattern.test(String(expectedTimeCell))
                    ? String(expectedTimeCell).match(timestampPattern)[0]
                    : ((cells.map(value => String(value).match(timestampPattern)?.[0]).find(Boolean)) || '--');
                const statusVal = cells.find(value => String(value).trim().toLowerCase() === 'picking') || '';
                const pickerStatus = String(cells.length >= 9 ? cells[6] : cells[cells.length - 3] || '').trim();
                const normalizedStatus = pickerStatus.toLocaleLowerCase();
                const normalizedCarton = String(cartonVal || '').trim().toLocaleUpperCase().replace(/\s+/g, '');
                const normalizedPickLocation = String(locationVal || '').trim().toLocaleUpperCase().replace(/[-\s]/g, '');
                if (row.querySelector('td') && normalizedCarton && normalizedPickLocation && normalizedPickLocation !== 'UNKNOWN' &&
                    !normalizedStatus.includes('canceled') && !normalizedStatus.includes('cancelled') &&
                    !['carton', 'ticket', 'barcode', 'lpn'].includes(normalizedCarton)) {
                    if (!pickabilityCartons.has(normalizedCarton)) pickabilityCartons.set(normalizedCarton, normalizedPickLocation);
                }
                if (statusVal) {
                    const normalizedShortLocation = String(locationVal).replace(/-/g, '').trim() || 'Unknown';
                    if (!shortLocationsMap.has(normalizedShortLocation)) shortLocationsMap.set(normalizedShortLocation, { count: 0, cartons: [] });
                    const shortEntry = shortLocationsMap.get(normalizedShortLocation);
                    shortEntry.count++;
                    const shortCarton = String(cartonVal || '').trim();
                    if (shortCarton && !shortEntry.cartons.includes(shortCarton)) shortEntry.cartons.push(shortCarton);
                }

                const ts = getScanTimestamp(timestampVal);

                // Track the absolute newest timestamp across the entire batch for the main UI column
                if (ts > maxOverallTs) {
                    maxOverallTs = ts;
                    overallNewestTimeStr = timestampVal;
                }

                if (pickerName && pickerName !== "Picker" && pickerName !== "" && isTimestampInCurrentOperationalDay(timestampVal)) {
                    const existingPicker = pickersMap.get(pickerName);
                    if (!existingPicker) {
                        pickersMap.set(pickerName, {
                            ts: ts,
                            timeStr: timestampVal,
                            firstTs: ts,
                            firstTimeStr: timestampVal,
                            firstLocation: locationVal,
                            firstCarton: cartonVal,
                            location: locationVal,
                            completedCartons: 1,
                            pickEvents: ts ? [{ ts, timeStr: timestampVal, location: locationVal, carton: cartonVal, status: pickerStatus }] : []
                        });
                    } else {
                        existingPicker.completedCartons = (existingPicker.completedCartons || 0) + 1;
                        if (ts) existingPicker.pickEvents.push({ ts, timeStr: timestampVal, location: locationVal, carton: cartonVal, status: pickerStatus });
                        if (!existingPicker.firstTs || (ts > 0 && ts < existingPicker.firstTs)) {
                            existingPicker.firstTs = ts;
                            existingPicker.firstTimeStr = timestampVal;
                            existingPicker.firstLocation = locationVal;
                            existingPicker.firstCarton = cartonVal;
                        }
                        if (ts > existingPicker.ts) {
                            existingPicker.ts = ts;
                            existingPicker.timeStr = timestampVal;
                            existingPicker.location = locationVal;
                        }
                    }
                }

                if (timestampVal && timestampVal !== "Picked" && /\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}/.test(timestampVal)) {
                    timestamps.push(timestampVal);
                }
            }
        });

        // Backup regex parsing if the table structure fails
        if (timestamps.length === 0) {
            const matches = htmlText.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi);
            if (matches && matches.length > 0) timestamps = matches;
        }

        let lastScanTime = overallNewestTimeStr;
        if (lastScanTime === "--" && timestamps.length > 0) {
            lastScanTime = timestamps[0]; // Failsafe fallback
        }

        // Sort pickers by most recent scan time (descending) and export as objects
        const sortedPickers = Array.from(pickersMap.entries())
            .sort((a, b) => b[1].ts - a[1].ts)
            .map(entry => ({
                name: entry[0],
                location: entry[1].location,
                timeStr: entry[1].timeStr,
                firstTimeStr: entry[1].firstTimeStr || entry[1].timeStr,
                firstLocation: entry[1].firstLocation || entry[1].location,
                firstCarton: entry[1].firstCarton || '',
                firstTs: entry[1].firstTs || getScanTimestamp(entry[1].firstTimeStr || entry[1].timeStr),
                lastTs: entry[1].ts || getScanTimestamp(entry[1].timeStr),
                pickEvents: (entry[1].pickEvents || []).sort((a,b) => a.ts - b.ts),
                completedCartons: entry[1].completedCartons || 0
            }));

        // Secondary failsafe if table layout bypassed maxOverall logic entirely
        if (sortedPickers.length > 0 && maxOverallTs === 0) {
            lastScanTime = sortedPickers[0].timeStr;
        }

        const pickabilityLocationCounts = new Map();
        pickabilityCartons.forEach(location => pickabilityLocationCounts.set(location, (pickabilityLocationCounts.get(location) || 0) + 1));
        const pickabilityData = {
            cartonCount:pickabilityCartons.size,
            locations:Array.from(pickabilityLocationCounts, ([location, count]) => ({ location, count }))
        };

        const possibleMisScans = [];
        doc.querySelectorAll('table').forEach(table => {
            const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
            if (!headerRow) return;
            const headers = Array.from(headerRow.querySelectorAll('th,td')).map(cell => cell.textContent.trim().toLowerCase());
            const findHeader = (...terms) => headers.findIndex(header => terms.some(term => header === term || header.includes(term)));
            let statusIndex = findHeader('status');
            let locationIndex = findHeader('location');
            let pickerIndex = findHeader('picker', 'associate');
            let itemIndex = findHeader('description', 'product', 'item description', 'sku description');
            let cartonIndex = findHeader('carton', 'ticket', 'barcode', 'license plate', 'lpn');

            const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
            if (!bodyRows.length) return;
            const sampleCells = Array.from(bodyRows.find(row => row.querySelectorAll('td').length >= 9)?.querySelectorAll('td') || []);

            // Fallback for the actual Batch Detail layout:
            // checkbox, sequence, carton, description, qty, location, status, picker, time, Locate.
            if (sampleCells.length >= 9) {
                if (cartonIndex < 0) cartonIndex = 2;
                if (itemIndex < 0) itemIndex = 3;
                if (locationIndex < 0) locationIndex = 5;
                if (statusIndex < 0) statusIndex = 6;
                if (pickerIndex < 0) pickerIndex = 7;
            }
            if ([statusIndex, locationIndex, itemIndex, cartonIndex].some(index => index < 0)) return;

            const itemGroups = new Map();
            bodyRows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length <= Math.max(statusIndex, locationIndex, itemIndex, cartonIndex)) return;
                const carton = cells[cartonIndex].textContent.trim();
                const status = cells[statusIndex].textContent.trim().replace(/\s+/g, ' ');
                const item = cells[itemIndex].textContent.trim().replace(/\s+/g, ' ');
                const location = cells[locationIndex].textContent.trim().replace(/-/g, '') || 'Unknown';
                if (!carton || !status || !item || location === 'Unknown') return;
                const normalizedStatus = status.toLowerCase();
                const isCompleted = normalizedStatus.includes('picking complete');
                const isCanceled = normalizedStatus.includes('canceled') || normalizedStatus.includes('cancelled');
                const isActivelyPicking = normalizedStatus.trim() === 'picking';
                const picker = pickerIndex >= 0 && cells[pickerIndex] ? cells[pickerIndex].textContent.trim() || 'Unknown' : 'Unknown';
                const rowData = { carton, status, isCompleted, isCanceled, isActivelyPicking, location, picker, item };
                const groupKey = `${item.toLocaleLowerCase()}||${location.toLocaleLowerCase()}`;
                if (!itemGroups.has(groupKey)) itemGroups.set(groupKey, []);
                itemGroups.get(groupKey).push(rowData);
            });

            itemGroups.forEach(rows => {
                const activeRows = rows.filter(row => !row.isCanceled);
                const completedRows = activeRows.filter(row => row.isCompleted);
                const hasActivePicking = activeRows.some(row => row.isActivelyPicking);
                // If ANY carton for this same item and location is still in Picking,
                // the picker may still be actively working the run. Suppress the entire
                // item/location group until no matching carton remains in Picking.
                if (hasActivePicking) return;
                // Only unexpected non-completed statuses such as Printed are review candidates.
                const notPickedRows = activeRows.filter(row => !row.isCompleted && !row.isActivelyPicking);
                if (!completedRows.length || !notPickedRows.length) return;
                const likelyPicker = completedRows.map(row => row.picker).find(name => name && name !== 'Unknown') || 'Unknown';
                notPickedRows.forEach(row => possibleMisScans.push({
                    status: row.status,
                    location: row.location,
                    picker: row.picker !== 'Unknown' ? row.picker : likelyPicker,
                    item: row.item,
                    carton: row.carton,
                    completedItems: completedRows.length,
                    remainingItems: notPickedRows.length,
                    totalItems: activeRows.length
                }));
            });
        });
        const ticketStatuses = [];
        doc.querySelectorAll('table').forEach(table => {
            const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
            if (!headerRow) return;
            const headers = Array.from(headerRow.querySelectorAll('th,td')).map(cell => cell.textContent.trim().toLowerCase());
            let statusIndex = headers.findIndex(header => header === 'status' || header.includes('status'));
            const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
            const sampleCellCount = bodyRows.find(row => row.querySelectorAll('td').length >= 9)?.querySelectorAll('td').length || 0;
            if (statusIndex < 0 && sampleCellCount >= 9) statusIndex = 6;
            if (statusIndex < 0) return;
            bodyRows.forEach(row => {
                const status = row.querySelectorAll('td')[statusIndex]?.textContent.trim().replace(/\s+/g, ' ') || '';
                if (status) ticketStatuses.push(status);
            });
        });
        const normalizedStatuses = ticketStatuses.map(status => status.toLowerCase());
        const canceledCount = normalizedStatuses.filter(status => status.includes('canceled') || status.includes('cancelled')).length;
        const completedCount = normalizedStatuses.filter(status => status.includes('picking complete')).length;
        const started = normalizedStatuses.some(status => status === 'picking' || status.includes('picking complete'));
        const actionableRemaining = normalizedStatuses.filter(status =>
            !status.includes('picking complete') &&
            !status.includes('canceled') &&
            !status.includes('cancelled')
        ).length;
        const effectivelyComplete = normalizedStatuses.length > 0 && actionableRemaining === 0;
        const completionInfo = { effectivelyComplete, started, canceledCount, completedCount, actionableRemaining, ticketCount: normalizedStatuses.length };
        const shortLocations = Array.from(shortLocationsMap.entries()).map(([location, entry]) => ({ location, count: entry.count || 0, cartons: Array.isArray(entry.cartons) ? entry.cartons : [] }));
        return {
            isHighVol,
            lastScanTime,
            batchPrintInfo,
            pickers: sortedPickers,
            pickabilityData,
            shortLocations,
            possibleMisScans,
            completionInfo
        };
    }

    // --- ZONE STATUS DATA FETCH ---
    // Pulls the Zone Status table in the background and parses it into a map
    // keyed by zone name. This is the authoritative "remaining" source for the
    // KPI mini-cards because Zone Status already accounts for cartons sitting
    // inside "Mixed" batches, which the old batch-type-matching logic missed.
    async function fetchZoneStatusData() {
        try {
            const response = await fetch(window.location.origin + '/Home/ZoneStatus');
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const rows = doc.querySelectorAll('table.datatable tbody tr');
            const zoneMap = {};

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 9) return;

                const zoneName = cells[0].textContent.trim();
                if (!zoneName || zoneName.toLowerCase() === 'total') return;

                const parseCell = (idx) => parseInt((cells[idx]?.textContent || '0').replace(/,/g, '').trim(), 10) || 0;

                zoneMap[zoneName] = {
                    rejected: parseCell(1),
                    prescanPending: parseCell(2),
                    prescanPalletized: parseCell(3),
                    batchPending: parseCell(4),
                    palletHold: parseCell(5),
                    batchPrinted: parseCell(6),
                    completed: parseCell(7),
                    total: parseCell(8)
                };
            });

            zoneStatusCache = zoneMap;
            return zoneMap;
        } catch (err) {
            console.warn('Failed to fetch Zone Status data for KPI cards', err);
            return null;
        }
    }

    // Sums Zone Status stats across one or more zones (e.g. Reserve + Reserve2)
    function getZoneGroupStats(zoneNames, source = zoneStatusCache) {
        const stats = { rejected: 0, prescanPending: 0, prescanPalletized: 0, batchPending: 0, palletHold: 0, batchPrinted: 0, completed: 0, total: 0 };
        if (!source) return stats;
        zoneNames.forEach(zn => {
            const z = source[zn];
            if (!z) return;
            stats.rejected += z.rejected;
            stats.prescanPending += z.prescanPending;
            stats.prescanPalletized += z.prescanPalletized;
            stats.batchPending += z.batchPending;
            stats.palletHold += z.palletHold;
            stats.batchPrinted += z.batchPrinted;
            stats.completed += z.completed;
            stats.total += z.total;
        });
        return stats;
    }

    // Approximates how much of a zone group's totals belong to DIS-hub batches,
    // using the already-fetched Batch Status rows (which have hub info that
    // Zone Status lacks). Batch Status only ever lists batches that have
    // already been printed, so this sliver is treated as sitting inside the
    // zone's "Batch Printed" bucket. See KPI_TYPE_KEYWORDS comment above.
    function getDisAdjustment(groupName) {
        const adjustment = { disPending: 0, disPicked: 0, disTotal: 0 };
        // Floor is the only zone KPI that hides DIS while Show DIS is off.
        // Unit Pick and Calendars retain DIS by design. Other zone KPIs are left unchanged.
        if (groupName !== 'Floor') return adjustment;
        const keywords = KPI_TYPE_KEYWORDS[groupName] || [];
        if (keywords.length === 0) return adjustment;

        (displayBatchIndex || masterBatchIndex).forEach(record => {
            if (record.hub !== 'DIS') return;

            const typeLower = record.batchType.toLowerCase();
            if (!keywords.some(kw => typeLower.includes(kw))) return;

            adjustment.disPending += record.pending;
            adjustment.disPicked += record.picked;
            adjustment.disTotal += record.total;
        });

        return adjustment;
    }

    // Re-renders just the KPI widgets (without tearing down/rebuilding the whole
    // table) so a background Zone Status refresh can update the numbers cheaply.
    function refreshKpiCardsOnly() {
        const wrapperFlex = document.getElementById("hub-settings-panel")?.parentNode;
        if (wrapperFlex) generateKPIWidgets(wrapperFlex);
    }

    function isBatchStatusSummaryRow(row) {
        if (!row || row.style.fontWeight === 'bold' || row.querySelector('td[colspan]')) return true;
        const firstCell = String(row.cells[0]?.innerText || '').trim();
        return /^(?:grand\s+)?total:?$|^subtotal:?$/i.test(firstCell);
    }

    // --- SECURE BACKGROUND REFRESH LOGIC ---
    async function refreshMainTable() {
        try {
            // Find the active form to pass security tokens flawlessly
            const form = document.querySelector('form[action*="BatchStatus"]');
            let response;

            if (form) {
                const formData = new FormData(form);
                formData.set('displayCompletedBatches', 'true'); // Guarantee we get all raw data
                response = await fetch(form.action, {
                    method: 'POST',
                    body: formData
                });
            } else {
                response = await fetch(window.location.origin + '/Home/BatchStatus?completed=True&_t=' + Date.now());
            }

            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const newTbody = doc.querySelector("table.datatable tbody");
            if (!newTbody) return;

            // Zero out original references and rebuild from the freshly fetched raw server HTML
            originalDataRows = [];

            newTbody.querySelectorAll("tr").forEach(row => {
                // Completely bypass headers/totals from the raw response to build them dynamically later
                if (isBatchStatusSummaryRow(row)) return;

                const batchId = row.cells[0]?.innerText.trim() || "";
                if (!batchId) return; // Skip broken empty rows natively returned by server

                const batchType = row.cells[1]?.innerText.trim() || "Unknown";
                const rawHub = row.cells[2]?.innerText.trim() || "";
                const normalizedHub = (rawHub === "UNKNOWN") ? "MULTIPLE" : rawHub;

                if (row.cells[2]) row.cells[2].innerText = normalizedHub;

                row.setAttribute('data-saved-id', batchId);
                row.setAttribute('data-saved-type', batchType);
                row.setAttribute('data-saved-zone', classifyWorkZone(batchType) || '');
                row.setAttribute('data-saved-hub', normalizedHub);
                row.setAttribute('data-saved-pending', row.cells[5]?.innerText.replace(/,/g, '') || "0");
                row.setAttribute('data-saved-picked', row.cells[6]?.innerText.replace(/,/g, '') || "0");
                row.setAttribute('data-saved-total', row.cells[7]?.innerText.replace(/,/g, '') || "0");

                originalDataRows.push(row);
            });

            refreshBatchMetaCache(originalDataRows);
        } catch (err) {
            console.warn("Failed to background refresh main table", err);
        }
    }

    async function executeScanForRows(rowsToScan, buttonEl, statusEl) {
        if (historicalViewActive) return;
        // Individual group scans bypass the full table refresh and just fetch selected details.
        // Never fetch DIS Batch Detail; DIS is retained for batch-level totals only.
        const queue = rowsToScan.filter(row => (row.getAttribute('data-saved-hub') || '') !== 'DIS');
        if (!queue.length) {
            if (statusEl) statusEl.innerText = 'No rows to scan';
            return;
        }

        if (buttonEl) buttonEl.disabled = true;

        const total = queue.length;
        let completedCount = 0;

        const workerLimit = Math.min(BATCH_SCAN_CONCURRENCY, total || 1);
        const activeQueue = [...queue];

        const worker = async () => {
            while (activeQueue.length) {
                const row = activeQueue.shift();
                if (!row) continue;

                const batchId = row.getAttribute('data-saved-id');
                const detailsLink = row.querySelector("a[href*='BatchDetail']");
                if (batchId && detailsLink) {
                    try {
                        const response = await fetch(detailsLink.getAttribute('href'));
                        const htmlText = await response.text();
                        const parsed = parseBatchDetailHTML(htmlText);

                        saveBatchCacheItem(batchId, parsed.isHighVol, parsed.lastScanTime, parsed.pickers, parsed.shortLocations, parsed.possibleMisScans, parsed.completionInfo, parsed.pickabilityData, row.getAttribute('data-saved-type'), row.getAttribute('data-saved-total'), parsed.batchPrintInfo);
                        const serverPending = parseInt(row.getAttribute('data-saved-pending')) || 0;
                        if (serverPending === 0 || parsed.completionInfo?.effectivelyComplete) {
                            markCompletedBatchScanned(batchId, row);
                        }
                    } catch (err) {
                        console.warn(`Error scanning batch ${batchId}`, err);
                    }
                }

                completedCount += 1;
                if (statusEl) statusEl.innerText = `Scanning: ${completedCount}/${total}`;
            }
        };

        await Promise.all(Array.from({ length: workerLimit }, worker));

        persistBatchCacheIfDirty();
        recordBatchScan('Group');
        if (buttonEl) buttonEl.disabled = false;

        if (statusEl) {
            statusEl.innerText = 'Done';
            setTimeout(() => { statusEl.innerText = ''; }, 3000);
        }

        rebuildTable();
    }

    async function runFullUpdateCycle(buttonEl, statusEl, isAuto = false) {
        if (historicalViewActive && !isAuto) return;
        if (isScanning) return; // Prevent concurrent loops
        isScanning = true;

        if (buttonEl) buttonEl.disabled = true;
        if (statusEl) statusEl.innerText = 'Refreshing table data...';

        // 1. Silently fetch main table updates (Pending, Picked, Total values) securely via POST,
        //    and refresh the Zone Status data that powers the KPI mini-cards, in parallel.
        await Promise.all([refreshMainTable(), fetchZoneStatusData()]);

        // 2. Manual Scan Now scans every batch, including completed and DIS.
        //    Automatic scans only scan active, non-completed, non-DIS batches.
        const smartQueue = isAuto ? null : getSmartScanQueue();
        const rowsToScan = isAuto ? getValidRowsToScan() : smartQueue.rows;
        // Do not erase valid completed snapshots. Only records selected by the
        // smart queue are refreshed, and skipped completed batches retain their
        // original first-pick and pace timelines.
        let completedCount = 0;
        if (statusEl) {
            statusEl.innerText = isAuto
                ? `Auto-scanning ${rowsToScan.length} active batches...`
                : `Smart scan: ${smartQueue.activeCount} active + ${smartQueue.completedCount} completed updates; ${smartQueue.skippedCompletedCount} completed skipped.`;
        }

        const workerLimit = Math.min(BATCH_SCAN_CONCURRENCY, Math.max(rowsToScan.length, 1));
        const activeQueue = [...rowsToScan];

        const worker = async () => {
            while (activeQueue.length) {
                const row = activeQueue.shift();
                if (!row) continue;

                const batchId = row.getAttribute('data-saved-id');
                const detailsLink = row.querySelector("a[href*='BatchDetail']");
                if (batchId && detailsLink) {
                    try {
                        const response = await fetch(detailsLink.getAttribute('href'));
                        const htmlText = await response.text();
                        const parsed = parseBatchDetailHTML(htmlText);

                        saveBatchCacheItem(batchId, parsed.isHighVol, parsed.lastScanTime, parsed.pickers, parsed.shortLocations, parsed.possibleMisScans, parsed.completionInfo, parsed.pickabilityData, row.getAttribute('data-saved-type'), row.getAttribute('data-saved-total'), parsed.batchPrintInfo);
                        const serverPending = parseInt(row.getAttribute('data-saved-pending')) || 0;
                        if (serverPending === 0 || parsed.completionInfo?.effectivelyComplete) {
                            markCompletedBatchScanned(batchId, row);
                        }
                    } catch (err) {
                        console.warn(`Error scanning batch ${batchId}`, err);
                    }
                }

                completedCount += 1;
                if (statusEl) statusEl.innerText = `Scanning: ${completedCount}/${rowsToScan.length}`;
            }
        };

        await Promise.all(Array.from({ length: workerLimit }, worker));

        persistBatchCacheIfDirty();
        recordBatchScan(isAuto ? 'Auto' : 'Smart Scan');
        if (buttonEl) buttonEl.disabled = false;

        // Output permanent last scanned time
        if (statusEl) {
            const now = new Date();
            let hrs = now.getHours();
            let mins = now.getMinutes().toString().padStart(2, '0');
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            hrs = hrs % 12 || 12;
            statusEl.innerText = isAuto
                ? `Last Auto-Scan: ${hrs}:${mins} ${ampm}`
                : `Last Smart Scan: ${hrs}:${mins} ${ampm} • ${rowsToScan.length} scanned${smartQueue ? ` • ${smartQueue.skippedCompletedCount} completed skipped` : ''}`;
        }

        isScanning = false;

        // Safety Catch: If auto-scanning while user is actively viewing a details accordion,
        // DO NOT redraw the table to prevent visual glitches. It will pull the new cache data the next time they close the accordion.
        if (isAuto && document.querySelector('.accordion-drawer-row')) {
            return;
        }

        rebuildTable();
    }

    function removeDimOverlay() {
        const overlay = document.getElementById('accordion-dim-overlay');
        if (overlay) overlay.remove();
    }

    function createDimOverlay() {
        removeDimOverlay();
        const overlay = document.createElement('div');
        overlay.id = 'accordion-dim-overlay';
        overlay.className = 'accordion-dim-overlay';
        overlay.addEventListener('click', () => { closeAllAccordions(true); });
        document.body.appendChild(overlay);
    }

    function closeAllAccordions(triggerRefresh = false) {
        removeDimOverlay();
        document.querySelectorAll('tr.tm-details-open').forEach(row => row.classList.remove('tm-details-open'));
        document.querySelectorAll('.accordion-drawer-row').forEach(drawer => drawer.remove());

    }

    function applyBatchDetailIframeTheme(iframe) {
        if (!iframe) return;
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc?.head) return;
            let style = iframeDoc.getElementById('tm-batch-detail-theme');
            if (!style) {
                style = iframeDoc.createElement('style');
                style.id = 'tm-batch-detail-theme';
                iframeDoc.head.appendChild(style);
            }
            const dark = document.body.classList.contains('tm-dark-mode');
            iframeDoc.documentElement.classList.toggle('tm-as400-iframe', dark);
            iframeDoc.body?.classList.toggle('tm-as400-iframe', dark);
            style.textContent = dark ? `
                html, body { background:#09110d !important; color:#d9eadf !important; font-family:"Lucida Console",Consolas,"Courier New",monospace !important; }
                header, nav, .navbar, .top-banner, #header { display:none !important; }
                body, main, .container, .container-fluid { padding-top:0 !important; margin-top:0 !important; background:#09110d !important; color:#d9eadf !important; max-width:100% !important; width:100% !important; }
                h1,h2,h3,h4,h5,h6,label,strong { color:#9fffb0 !important; }
                table, .datatable { background:#0b1510 !important; color:#d9eadf !important; border-color:#315443 !important; font-family:"Lucida Console",Consolas,"Courier New",monospace !important; }
                thead th, table thead th, .datatable thead th { background:#17251d !important; color:#9fffb0 !important; border-color:#496052 !important; }
                tbody td, table tbody td, .datatable tbody td { background:#0b1510 !important; color:#d9eadf !important; border-color:#243b2e !important; }
                tbody tr:nth-child(even) td { background:#101d16 !important; }
                tbody tr:hover td { background:#1a3425 !important; color:#f2fff5 !important; }
                a { color:#68dfff !important; }
                input, select, textarea { background:#17251d !important; color:#eaf7ee !important; border:1px solid #496052 !important; font-family:"Lucida Console",Consolas,"Courier New",monospace !important; }
                input::placeholder { color:#91a69a !important; }
                button, .btn, a.btn, input[type="submit"] { background:#123b24 !important; color:#a7ffb5 !important; border:1px solid #2fc85d !important; box-shadow:none !important; font-family:"Lucida Console",Consolas,"Courier New",monospace !important; }
                button:hover, .btn:hover, a.btn:hover, input[type="submit"]:hover { background:#1b5833 !important; color:#fff !important; border-color:#60f579 !important; }
                input[type="checkbox"] { accent-color:#39e66b !important; }
                .text-muted, .text-secondary { color:#a8bdb0 !important; }
                .alert, .card, .panel, .modal-content { background:#101a14 !important; color:#d9eadf !important; border-color:#315443 !important; }
                .table-danger td, tr.table-danger td, tr[style*="background-color: rgb(248, 215, 218)"] td { background:#482126 !important; color:#ffccd0 !important; }
                .table-warning td, tr.table-warning td, tr[style*="background-color: rgb(255, 243, 205)"] td { background:#3b2d0d !important; color:#ffdc70 !important; }
                ::selection { background:#39e66b !important; color:#07110a !important; }
                ::-webkit-scrollbar { width:10px; height:10px; }
                ::-webkit-scrollbar-track { background:#102019; }
                ::-webkit-scrollbar-thumb { background:#4d755d; border:2px solid #102019; border-radius:8px; }
            ` : `
                header, nav, .navbar, .top-banner, #header { display:none !important; }
                body, main { padding-top:0 !important; margin-top:0 !important; }
            `;
        } catch (e) {
            console.warn('Could not theme Batch Detail iframe', e);
        }
    }
    function refreshOpenBatchDetailIframeThemes() {
        document.querySelectorAll('.accordion-iframe').forEach(applyBatchDetailIframeTheme);
    }
    function toggleAccordionDrawer(targetRow, url, titleText) {
        const openedFromHistory = historicalViewActive;
        const existingDrawer = targetRow.nextElementSibling;
        if (existingDrawer && existingDrawer.classList.contains('accordion-drawer-row')) {
            closeAllAccordions(true);
            return;
        }

        closeAllAccordions(false);
        targetRow.classList.add('tm-details-open');

        let colCount = 0;
        for (let cell of targetRow.cells) colCount += cell.colSpan || 1;

        const drawerRow = document.createElement('tr');
        drawerRow.className = 'accordion-drawer-row';
        const drawerCell = document.createElement('td');
        drawerCell.colSpan = colCount;

        drawerCell.innerHTML = `
            <div class="accordion-container">
                <div class="accordion-header">
                    <h6>📂 ${titleText}</h6>
                    <button class="accordion-close-btn">Close ✕</button>
                </div>
                <iframe class="accordion-iframe" src="${url}"></iframe>
            </div>
        `;

        drawerRow.appendChild(drawerCell);
        targetRow.parentNode.insertBefore(drawerRow, targetRow.nextSibling);

        drawerRow.querySelector('.accordion-close-btn').addEventListener('click', () => { closeAllAccordions(true); });

        // Keep the interaction anchored to the clicked table row. Only make a
        // small scroll correction when the drawer header is below the viewport.
        setTimeout(() => {
            const rect = drawerRow.getBoundingClientRect();
            if (rect.top > window.innerHeight - 120) {
                window.scrollBy({ top: rect.top - (window.innerHeight - 140), behavior: 'smooth' });
            }
        }, 80);

        const iframe = drawerRow.querySelector('.accordion-iframe');
        iframe.onload = function() {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

                // Apply the active Light or AS400 theme inside same-origin Batch Detail.
                if (iframeDoc) {
                    applyBatchDetailIframeTheme(iframe);

                    // --- NEW: Intercept form submissions (Reprint Labels) to prevent iframe redirect ---
                    iframeDoc.querySelectorAll('form').forEach(form => {
                        form.addEventListener('submit', async function(e) {
                            e.preventDefault(); // Stop the page from redirecting

                            const submitBtn = e.submitter || form.querySelector('button[type="submit"], input[type="submit"], .btn-success');
                            let originalText = 'Submit';

                            if (submitBtn) {
                                originalText = submitBtn.innerText || submitBtn.value;
                                if (submitBtn.tagName === 'BUTTON') submitBtn.innerText = 'Sending...';
                                else submitBtn.value = 'Sending...';
                                submitBtn.disabled = true;
                            }

                            try {
                                const formData = new FormData(form);
                                if (e.submitter && e.submitter.name) {
                                    formData.append(e.submitter.name, e.submitter.value);
                                }

                                await fetch(form.action || iframeDoc.location.href, {
                                    method: form.method || 'POST',
                                    body: formData
                                });

                                if (submitBtn) {
                                    if (submitBtn.tagName === 'BUTTON') submitBtn.innerText = 'Sent to Printer!';
                                    else submitBtn.value = 'Sent to Printer!';
                                    setTimeout(() => {
                                        if (submitBtn.tagName === 'BUTTON') submitBtn.innerText = originalText;
                                        else submitBtn.value = originalText;
                                        submitBtn.disabled = false;
                                    }, 2000);
                                }
                            } catch (err) {
                                console.error('Form background submit failed', err);
                                if (submitBtn) {
                                    if (submitBtn.tagName === 'BUTTON') submitBtn.innerText = 'Error';
                                    else submitBtn.value = 'Error';
                                    setTimeout(() => {
                                        if (submitBtn.tagName === 'BUTTON') submitBtn.innerText = originalText;
                                        else submitBtn.value = originalText;
                                        submitBtn.disabled = false;
                                    }, 2000);
                                }
                            }
                        });
                    });
                }

                // Properly fetch the outer HTML so we don't accidentally parse plain text and wipe the cache
                const iframeHTML = iframeDoc?.documentElement?.outerHTML || "";
                const batchId = targetRow.getAttribute('data-saved-id');

                if (!openedFromHistory && batchId && iframeHTML.includes("<table")) {
                    const parsed = parseBatchDetailHTML(iframeHTML);
                    saveBatchCacheItem(batchId, parsed.isHighVol, parsed.lastScanTime, parsed.pickers, parsed.shortLocations, parsed.possibleMisScans, parsed.completionInfo, parsed.pickabilityData, targetRow.getAttribute('data-saved-type'), targetRow.getAttribute('data-saved-total'), parsed.batchPrintInfo);
                    persistBatchCacheIfDirty();
                }
            } catch (e) {
                console.warn('Iframe cross-origin or load error:', e);
            }
        };
    }

    function forceServerCompletedBatchesOn() {
        const nativeCompletedCB = document.getElementById('completedBatchesCB');
        if (nativeCompletedCB && !nativeCompletedCB.checked) {
            nativeCompletedCB.checked = true;
            nativeCompletedCB.form.submit();
            return true;
        }
        return false;
    }

    function getStoredHubCutTimes() {
        const stored = localStorage.getItem('__custom_hub_cut_times');
        if (stored) {
            try { return JSON.parse(stored); } catch(e) { }
        }
        return { ...HARDCODED_HUB_MAP };
    }

    function saveHubCutTimes(map) {
        localStorage.setItem('__custom_hub_cut_times', JSON.stringify(map));
    }

    function getStoredHighVolumeBreakdownExpanded() {
        return localStorage.getItem('__hvo_breakdown_expanded') === 'true';
    }
    function setStoredHighVolumeBreakdownExpanded(expanded) {
        localStorage.setItem('__hvo_breakdown_expanded', expanded ? 'true' : 'false');
    }
    function injectHighVolumeDetailsIntoMainKPI() {
        const kpiCard = document.querySelector('.high-volume-kpi');
        if (!kpiCard) return;
        kpiCard.querySelector('#high-vol-injected-breakdown')?.remove();
        kpiCard.querySelector('#hvo-report-link')?.remove();
        kpiCard.querySelector('#hvo-toggle-btn')?.remove();
        kpiCard.style.padding = '7px 12px';
        kpiCard.style.minHeight = 'auto';
        if (kpiCard.children[0]) kpiCard.children[0].style.marginBottom = '5px';
        if (kpiCard.children[1]) {
            kpiCard.children[1].style.marginBottom = '6px';
            kpiCard.children[1].style.gap = '7px 18px';
        }
        let currentCutTime = 'Unknown';
        const data = {};
        document.querySelectorAll('table.datatable tbody tr').forEach(row => {
            const cutCell = row.querySelector('.vertical-cut-time-cell');
            if (cutCell) currentCutTime = (cutCell.getAttribute('data-base-time') || 'Unknown').trim();
            if (!row.hasAttribute('data-saved-id') || !row.querySelector('.high-vol-badge')) return;
            const hub = row.getAttribute('data-saved-hub') || 'UNKNOWN';
            if (hub === 'DIS') return;
            const type = (row.getAttribute('data-saved-type') || '').toUpperCase();
            const pending = parseInt(row.getAttribute('data-saved-pending'), 10) || 0;
            const total = parseInt(row.getAttribute('data-saved-total'), 10) || 0;
            data[currentCutTime] ||= {};
            data[currentCutTime][hub] ||= { pending:0, total:0, floor:0, reserve:0, ptb:0 };
            const stats = data[currentCutTime][hub];
            stats.pending += pending; stats.total += total;
            if (type.includes('FLOOR')) stats.floor += pending;
            else if (type.includes('RESERVE')) stats.reserve += pending;
            else if (type.includes('PTB')) stats.ptb += pending;
        });
        const expanded = getStoredHighVolumeBreakdownExpanded();
        const details = document.createElement('div');
        details.id = 'high-vol-injected-breakdown';
        details.style.display = expanded ? 'flex' : 'none';
        const entries = Object.entries(data);
        if (!entries.length) {
            details.innerHTML = '<div style="width:100%;text-align:center;padding:4px;color:#64748b;font-size:11px;font-weight:700;">All active High Volume cartons completed or hidden.</div>';
        } else {
            entries.forEach(([cutTime, hubs]) => {
                const block = document.createElement('div');
                block.className = 'hvo-time-block';
                let html = `<div class="hvo-time-title">CUT ${escapeHTML(cutTime)}</div>`;
                Object.entries(hubs).forEach(([hub, stats]) => {
                    if (!stats.total) return;
                    html += `<div class="hvo-hub-box"><div class="hvo-hub-row"><span class="hvo-hub-name">${escapeHTML(hub)}</span><span class="hvo-total">${stats.pending.toLocaleString()} <span class="hvo-total-small">/ ${stats.total.toLocaleString()}</span></span></div><div class="hvo-zone-row"><span>FLR: <span class="${stats.floor ? 'hvo-active':'hvo-zero'}">${stats.floor.toLocaleString()}</span></span><span>RES: <span class="${stats.reserve ? 'hvo-active':'hvo-zero'}">${stats.reserve.toLocaleString()}</span></span><span>PTB: <span class="${stats.ptb ? 'hvo-active':'hvo-zero'}">${stats.ptb.toLocaleString()}</span></span></div></div>`;
                });
                block.innerHTML = html;
                details.appendChild(block);
            });
        }
        const header = kpiCard.children[0];
        const right = header?.querySelector('.hvo-summary-actions') || header?.children[1];
        if (right) {
            right.style.display = 'flex'; right.style.alignItems = 'center'; right.style.gap = '8px'; right.style.flexWrap = 'nowrap';
            const report = document.createElement('a');
            report.id = 'hvo-report-link'; report.href = '/Home/HighVolumeBatchReport'; report.textContent = 'Report';
            const toggle = document.createElement('span');
            toggle.id = 'hvo-toggle-btn'; toggle.textContent = expanded ? 'Hide Details' : 'Show Details';
            toggle.addEventListener('click', e => {
                e.preventDefault(); e.stopPropagation();
                const open = details.style.display === 'none';
                details.style.display = open ? 'flex' : 'none';
                toggle.textContent = open ? 'Hide Details' : 'Show Details';
                setStoredHighVolumeBreakdownExpanded(open);
            });
            right.append(report, toggle);
        }
        const progress = kpiCard.lastElementChild;
        kpiCard.insertBefore(details, progress);
    }
    function generateKPIWidgets(flexContainerElement) {
        document.querySelectorAll('.high-volume-kpi,.kpi-dashboard-grid,.kpi-shared-toggle-row,.kpi-shared-breakdown-panel').forEach(el=>el.remove());
        const showKPIs = getStoredToggleState('__sidebar_show_kpis', true);
        if (!showKPIs) return;

        const cacheMap = displayedBatchCache || (getStoredBatchCache ? getStoredBatchCache() : {});
        const sourceRows = displayedBatchRows || originalDataRows;
        const displayDateKey = localStorage.getItem('__batch_status_history_date') || getOperationalDayKey();
        const displayZoneStatus = historicalViewActive ? (getDailyHistory()[displayDateKey]?.zoneStatus || null) : zoneStatusCache;
        const showDIS = getStoredToggleState('__sidebar_show_dis', false);
        const hv={completedBatches:0,totalBatches:0,completedCartons:0,remainingCartons:0};

        // High Volume Overview honors the same Show DIS setting as the table and zone KPIs.
        sourceRows.forEach(row => {
            const hub = (row.getAttribute('data-saved-hub') || '').trim().toUpperCase();
            if (!showDIS && hub === 'DIS') return;
            const batchId=row.getAttribute('data-saved-id');
            const cached=cacheMap[batchId];
            const pending=parseInt(row.getAttribute('data-saved-pending'))||0;
            const picked=parseInt(row.getAttribute('data-saved-picked'))||0;

            if(cached && cached.isHighVol){
                hv.totalBatches++;
                hv.completedCartons+=picked;
                hv.remainingCartons+=pending;
                if(pending===0) hv.completedBatches++;
            }
        });

        const remainBatches=hv.totalBatches-hv.completedBatches;
        const totalCartons=hv.completedCartons+hv.remainingCartons;
        const pct=hv.totalBatches?Math.round((hv.completedBatches/hv.totalBatches)*100):0;

        const hvDiv=document.createElement('div');
        hvDiv.className='high-volume-kpi';

        // Flattened and condensed inline styling
        hvDiv.style.cssText='margin:6px 0 10px; border:1px solid #fecaca; border-left:4px solid #dc2626; border-radius:6px; padding:7px 12px; background:#fff; box-shadow:0 1px 2px rgba(15,23,42,.05); display:flex; flex-direction:column;';
        hvDiv.innerHTML=`
        <div class="hvo-summary-header">
            <div class="hvo-summary-title">High Volume</div>
            <div class="hvo-summary-actions"><span class="hvo-summary-percent">${pct}% Complete</span></div>
        </div>
        <div class="hvo-summary-metrics">
            <div class="hvo-summary-metric"><span>Batches Left</span><strong>${remainBatches}</strong><small>/ ${hv.totalBatches}</small></div>
            <div class="hvo-summary-metric"><span>Completed</span><strong>${hv.completedBatches}</strong></div>
            <div class="hvo-summary-divider"></div>
            <div class="hvo-summary-metric"><span>Cartons Left</span><strong>${hv.remainingCartons.toLocaleString()}</strong><small>/ ${totalCartons.toLocaleString()}</small></div>
            <div class="hvo-summary-metric"><span>Picked</span><strong>${hv.completedCartons.toLocaleString()}</strong></div>
        </div>
        <div class="hvo-summary-progress"><div style="width:${pct}%;"></div></div>`;

        flexContainerElement.parentNode.insertBefore(hvDiv, flexContainerElement);

        // --- Zone-based KPI mini cards ---
        // Sourced from Zone Status (fetchZoneStatusData), which already rolls up
        // cartons across every batch containing that zone — including "Mixed"
        // batches that the old batch-type-text matching used to miss.
        const dashboardDiv=document.createElement('div');
        dashboardDiv.className='kpi-dashboard-grid';

        const hasData = !!displayZoneStatus;
        let breakdownBlocksHtml = '';

        Object.keys(KPI_ZONE_GROUPS).forEach(groupName => {
            const zoneNames = KPI_ZONE_GROUPS[groupName];
            const s = getZoneGroupStats(zoneNames, displayZoneStatus);

            // "Rejected by PKMS" and "Prescan Pending" cartons have not been
            // routed to a hub yet — that's exactly what parks them under the
            // DIS placeholder bucket on Hub Status. There's no per-hub data for
            // this stage anywhere in the tool, but there doesn't need to be:
            // by definition none of it belongs to a real hub yet, so the whole
            // stage is DIS until "Show DIS" is checked back on.
            let rejectedDisplay = s.rejected;
            let prescanPendingDisplay = s.prescanPending;
            // "Batch Printed" (and completed) IS hub-assigned by this point, so
            // that portion is corrected precisely via the batch-level rows,
            // which do carry hub info (see getDisAdjustment).
            let batchPrintedDisplay = s.batchPrinted;
            let completed = s.completed;

            if (!showDIS && groupName === 'Floor') {
                // Floor excludes DIS unless the Show DIS toggle is enabled.
                rejectedDisplay = 0;
                prescanPendingDisplay = 0;
                if (hasData) {
                    const dis = getDisAdjustment(groupName);
                    batchPrintedDisplay = Math.max(0, batchPrintedDisplay - dis.disPending);
                    completed = Math.max(0, completed - dis.disPicked);
                }
            }

            // Prescan Palletized / Batch Pending / Pallet Hold are already
            // hub-assigned to their real destination hub, so they're left as-is
            // regardless of the DIS toggle.
            const remaining = rejectedDisplay + prescanPendingDisplay + s.prescanPalletized + s.batchPending + s.palletHold + batchPrintedDisplay;
            const total = completed + remaining;
            const p = total ? Math.round((completed / total) * 100) : 0;

            // Fixed-height card: title, remaining, subtext, progress bar only.
            // (Per-card breakdown was removed — see the single shared dropdown below —
            // so unopened cards never get stretched tall by a sibling's expanded panel.)
            const card=document.createElement('div');
            card.className='kpi-metric-card';
            card.innerHTML=`
                <div class="kpi-card-title">${groupName}</div>
                <div class="kpi-card-remaining">${hasData ? remaining.toLocaleString() : '—'} <span class="kpi-unit">LEFT</span></div>
                <div class="kpi-card-subtext">${hasData ? `${p}% Picked (${completed.toLocaleString()} / ${total.toLocaleString()})` : 'Loading zone data…'}</div>
                <div class="kpi-progress-bg"><div class="kpi-progress-bar" style="width:${hasData ? p : 0}%"></div></div>
            `;
            dashboardDiv.appendChild(card);

            breakdownBlocksHtml += `
                <div style="flex: 1 1 180px; min-width: 190px;">
                    <div class="kpi-breakdown-zone-title">${groupName}</div>
                    <div class="kpi-breakdown-box">
                        <div class="kpi-breakdown-row"><span>Rejected by PKMS</span><strong>${rejectedDisplay.toLocaleString()}</strong></div>
                        <div class="kpi-breakdown-row"><span>Prescan Pending</span><strong>${prescanPendingDisplay.toLocaleString()}</strong></div>
                        <div class="kpi-breakdown-row"><span>Prescan Palletized</span><strong>${s.prescanPalletized.toLocaleString()}</strong></div>
                        <div class="kpi-breakdown-row"><span>Batch Pending</span><strong>${s.batchPending.toLocaleString()}</strong></div>
                        <div class="kpi-breakdown-row"><span>Pallet Hold</span><strong>${s.palletHold.toLocaleString()}</strong></div>
                        <div class="kpi-breakdown-row"><span>Batch Printed</span><strong>${batchPrintedDisplay.toLocaleString()}</strong></div>
                    </div>
                </div>
            `;
        });

        flexContainerElement.parentNode.insertBefore(dashboardDiv, flexContainerElement);

        // --- Single shared breakdown dropdown for ALL zone KPI cards ---
        // One toggle instead of one-per-card: clicking it reveals every zone's
        // category breakdown side-by-side, so collapsed cards stay a fixed
        // height instead of being flex-stretched into blank space by whichever
        // card's own panel happens to be open.
        const toggleRow = document.createElement('div');
        toggleRow.className = 'kpi-shared-toggle-row';
        toggleRow.style.cssText = 'display:flex; justify-content:flex-end; margin:-4px 0 8px 0; min-height:22px;';
        toggleRow.innerHTML = `<span class="kpi-toggle-btn" id="kpiSharedToggleBtn">${kpiBreakdownOpen ? '▲' : '▼'} Zone Breakdown</span>`;
        dashboardDiv.insertAdjacentElement('afterend', toggleRow);

        const sharedBreakdownPanel = document.createElement('div');
        sharedBreakdownPanel.className = 'kpi-shared-breakdown-panel' + (kpiBreakdownOpen ? ' open' : '');
        sharedBreakdownPanel.id = 'kpiSharedBreakdownPanel';
        sharedBreakdownPanel.innerHTML = breakdownBlocksHtml;
        toggleRow.insertAdjacentElement('afterend', sharedBreakdownPanel);

        const sharedToggleBtn = toggleRow.querySelector('#kpiSharedToggleBtn');
        sharedToggleBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            kpiBreakdownOpen = sharedBreakdownPanel.classList.toggle('open');
            sharedToggleBtn.textContent = `${kpiBreakdownOpen ? '▲' : '▼'} Zone Breakdown`;
        });
        injectHighVolumeDetailsIntoMainKPI();
    }

    function getStoredSectionState(sectionId, defaultOpen) {
        const stored = localStorage.getItem(`__sidebar_section_${sectionId}`);
        return stored === null ? defaultOpen : stored === 'true';
    }
    function bindStoredSectionStates() {
        document.querySelectorAll('#hub-settings-panel details[id]').forEach(section => {
            section.addEventListener('toggle', () => {
                localStorage.setItem(`__sidebar_section_${section.id}`, String(section.open));
            });
        });
    }
function getStoredToggleState(key, defaultValue) {
        const stored = localStorage.getItem(key);
        return stored !== null ? (stored === 'true') : defaultValue;
    }

    function setStoredToggleState(key, value) { localStorage.setItem(key, value); }
    function getPickabilityMinimumCartons() {
        const configured = parseInt(localStorage.getItem('__pickability_min_cartons'), 10);
        return Number.isFinite(configured) ? Math.max(0, configured) : 5;
    }
    function getStoredWidth() { const stored = localStorage.getItem('__sidebar_container_width'); return stored !== null ? parseInt(stored) : 97; }
    function setStoredWidth(value) { localStorage.setItem('__sidebar_container_width', value); }
    function getStoredThresholdVal() { const stored = localStorage.getItem('__sidebar_threshold_val'); return stored !== null ? parseFloat(stored) : 5; }
    function setStoredThresholdVal(val) { localStorage.setItem('__sidebar_threshold_val', val); }
    function getStoredThresholdType() { return localStorage.getItem('__sidebar_threshold_type') || 'percent'; }
    function setStoredThresholdType(type) { localStorage.setItem('__sidebar_threshold_type', type); }

    function getMinutesFromString(timeStr) {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return null;
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        if (hours < 5) hours += 24;
        return (hours * 60) + minutes;
    }

    function getBatchMeta(row) {
        if (!row) return null;
        const batchId = String(row.getAttribute('data-saved-id') || '');
        if (!batchId) return null;

        let meta = batchMetaCache.get(batchId);
        if (!meta) {
            meta = {
                batchId,
                type: String(row.getAttribute('data-saved-type') || 'Unknown'),
                hub: String(row.getAttribute('data-saved-hub') || ''),
                pending: parseInt(row.getAttribute('data-saved-pending'), 10) || 0,
                picked: parseInt(row.getAttribute('data-saved-picked'), 10) || 0,
                total: parseInt(row.getAttribute('data-saved-total'), 10) || 0,
            };
            batchMetaCache.set(batchId, meta);
        }
        return meta;
    }

    function refreshBatchMetaCache(rows = originalDataRows) {
        batchMetaCache.clear();
        rows.forEach(row => getBatchMeta(row));
    }

    function getChronologicalWeight(timeStr) {
        if (timeStr === "MULTIPLE") return 900000;
        if (timeStr === "Export") return 888888;
        if (!timeStr || timeStr === "No Cut Time Match") return 999999;
        return getMinutesFromString(timeStr) || 999999;
    }

    function getCountdownData(timeStr) {
        const targetMinutes = getMinutesFromString(timeStr);
        if (targetMinutes === null) return { text: timeStr, status: "normal" };

        const now = new Date();
        let currentHours = now.getHours();
        if (currentHours < 5) currentHours += 24;
        const currentTotalMinutes = (currentHours * 60) + now.getMinutes();
        const diff = targetMinutes - currentTotalMinutes;

        if (diff > 0) {
            if (diff >= 60) {
                return { text: `${timeStr}<br><span style="font-size:10px; opacity:0.75; font-weight: 500;">in ${Math.floor(diff/60)}h ${diff%60}m</span>`, status: "normal" };
            }
            return { text: `${timeStr}<br><span style="font-size:10px; font-weight:700;">${diff}m left</span>`, status: "urgent" };
        }
        return { text: `${timeStr}<br><span style="font-size:10px; font-weight: 500;">Passed</span>`, status: "passed" };
    }

    function updateAllCountdowns() {
        document.querySelectorAll(".vertical-cut-time-cell").forEach(cell => {
            const baseTime = cell.getAttribute("data-base-time");
            if (!baseTime) return;
            const textSpan = cell.querySelector('.cut-time-text-area');
            const countdown = getCountdownData(baseTime);
            if (textSpan) {
                textSpan.innerHTML = countdown.text;
            }
            cell.className = "vertical-cut-time-cell " + (countdown.status === "urgent" ? "urgent-time" : countdown.status === "passed" ? "passed-time" : "");
        });

        // Actively update "Relative Time" formats on every tick without full DOM rebuild
        document.querySelectorAll(".last-scan-cell").forEach(cell => {
            const rawTime = cell.getAttribute("data-raw-time");
            if (rawTime && rawTime !== '--') {
                const relStr = getRelativeTimeStr(rawTime);
                cell.innerText = relStr;

                // Add stale-scan styling for > 1hr ago
                if (relStr.includes('hr') || relStr.includes('d')) {
                    cell.classList.add('stale-scan');
                } else {
                    cell.classList.remove('stale-scan');
                }
            }
        });

        document.querySelectorAll(".associate-last-pick-time").forEach(span => {
            const rawTime = span.getAttribute("data-raw-time");
            if (!rawTime || rawTime === '--' || rawTime === 'Unknown') return;
            const relStr = getRelativeTimeStr(rawTime);
            span.textContent = relStr;
            const isStale = relStr.includes('hr') || relStr.includes('d ago');
            span.classList.toggle('associate-last-pick-stale', isStale);
            span.style.color = isStale ? '#dc2626' : '#64748b';
            span.style.fontWeight = isStale ? '700' : '600';
        });
        document.querySelectorAll(".picker-name-span").forEach(span => {
            const rawTime = span.getAttribute("data-raw-time");
            const loc = span.getAttribute("data-location") || "Unknown";
            if (rawTime && rawTime !== '--' && rawTime !== 'Unknown') {
                span.setAttribute("title", `Last Scanned: ${loc} - ${getRelativeTimeStr(rawTime)}`);
            }
        });
    }

    // --- Core Scraper Query Logic ---
    function getValidRowsToScan() {
        return originalDataRows.filter(row => {
            const pendingVal = parseInt(row.getAttribute('data-saved-pending')) || 0;
            const hub = row.getAttribute('data-saved-hub') || "";
            const batchId = row.getAttribute('data-saved-id') || '';
            const cached = getStoredBatchCache()[batchId];
            return pendingVal > 0 && hub !== "DIS" && !cached?.completionInfo?.effectivelyComplete;
        });
    }
    function completedBatchNeedsRescan(row, cacheMap = null) {
        const batchId = String(row?.getAttribute('data-saved-id') || '');
        if (!batchId) return false;
        const cache = cacheMap || getStoredBatchCache();
        const cached = cache[batchId];
        if (!cached) return true;
        if (cached.pickerTimelineSchemaVersion !== PICKER_TIMELINE_SCHEMA_VERSION) return true;
        if (cached.batchPrintInfo?.version !== 1) return true;
        if (typeof cached.completionInfo?.started !== 'boolean') return true;
        if (cached.completedSnapshotDay !== getOperationalDayKey()) return true;
        if (!Array.isArray(cached.pickers)) return true;

        // Pace requires the complete per-carton timeline. Rescan legacy or partial
        // completed records that only contain first/last timestamps.
        const timelineIncomplete = cached.pickers.some(picker => {
            if (!picker || typeof picker === 'string') return true;
            const cartonCount = parseInt(picker.completedCartons, 10) || 0;
            const events = Array.isArray(picker.pickEvents) ? picker.pickEvents : [];
            return cartonCount > 1 && events.length < 2;
        });
        if (timelineIncomplete) return true;

        // If the server-side Batch Status totals changed after the completed
        // snapshot, the batch was reopened, corrected, or otherwise updated.
        const snapshot = cached.completedSnapshot;
        if (!snapshot) return true;
        const currentPending = parseInt(row.getAttribute('data-saved-pending'), 10) || 0;
        const currentPicked = parseInt(row.getAttribute('data-saved-picked'), 10) || 0;
        const currentTotal = parseInt(row.getAttribute('data-saved-total'), 10) || 0;
        return currentPending !== Number(snapshot.pending || 0) ||
            currentPicked !== Number(snapshot.picked || 0) ||
            currentTotal !== Number(snapshot.total || 0);
    }
    function getSmartScanQueue() {
        const cache = getStoredBatchCache();
        const queue = [];
        let activeCount = 0;
        let completedCount = 0;
        let skippedCompletedCount = 0;
        originalDataRows.forEach(row => {
            const batchId = String(row.getAttribute('data-saved-id') || '');
            const hub = String(row.getAttribute('data-saved-hub') || '');
            const detailsLink = row.querySelector("a[href*='BatchDetail']");
            if (hub === 'DIS' || !batchId || !detailsLink) return;

            const meta = getBatchMeta(row);
            const pending = meta ? meta.pending : (parseInt(row.getAttribute('data-saved-pending'), 10) || 0);
            const cachedComplete = !!cache[batchId]?.completionInfo?.effectivelyComplete;
            const isCompleted = pending === 0 || cachedComplete;
            if (!isCompleted) {
                queue.push(row);
                activeCount++;
            } else if (completedBatchNeedsRescan(row, cache)) {
                queue.push(row);
                completedCount++;
            } else {
                skippedCompletedCount++;
            }
        });
        return { rows: queue, activeCount, completedCount, skippedCompletedCount };
    }

    function getAllRowsToScan() {
        return getSmartScanQueue().rows;
    }
    function startAutoScanTimer() {
        if (autoScanIntervalId) clearInterval(autoScanIntervalId);

        const isEnabled = getStoredToggleState('__sidebar_auto_scan_enabled', false);
        if (!isEnabled) return;

        const intervalMins = parseFloat(localStorage.getItem('__sidebar_auto_scan_interval')) || 1;
        const ms = intervalMins * 60 * 1000;

        autoScanIntervalId = setInterval(() => {
            if (!isScanning) {
                // Pass true for the 'isAuto' flag
                runFullUpdateCycle(null, document.getElementById('scanAllBatchesProgress'), true);
            }
        }, ms);
    }

    function isFullPalletPickBatch(batchType) {
        return /\b(?:pick\s*by\s*pallet|full\s*pallet|pallet\s*pick)\b/i.test(String(batchType || ''));
    }

    function classifyWorkZone(batchType) {
        const type = String(batchType || '').toLowerCase();
        if (/reserve|reserve2/.test(type)) return 'Reserve';
        if (/ptb|pick\s*to\s*belt|ptb\s*13|ptb\s*14|ptb\s*low|ptb\s*high/.test(type)) return 'PTB';
        if (/calendar|unit\s*pick/.test(type)) return null;
        return 'Floor'; // Default to Floor for unrecognized types and 'Mixed'
    }

    function scorePickability(cartons, locationStops, singleCartonStops, aisleSections, hasAisleData, minimumCartons) {
        if (cartons <= minimumCartons || locationStops === 0) return null;
        const stopRate = Math.min(1, locationStops / cartons);
        const singlePickShare = locationStops ? Math.min(1, singleCartonStops / locationStops) : 0;
        const aisleStopRate = Math.min(1, aisleSections / cartons);
        const complexity = hasAisleData
            ? (0.55 * stopRate) + (0.25 * singlePickShare) + (0.20 * aisleStopRate)
            : (0.70 * stopRate) + (0.30 * singlePickShare);
        return Math.max(0, Math.min(100, Math.round((1 - complexity) * 100)));
    }

    function buildPickabilityRating(pickabilityData, batchTotal, minimumCartons) {
        const locationCounts = new Map();
        (Array.isArray(pickabilityData?.locations) ? pickabilityData.locations : []).forEach(item => {
            const location = String(item?.location || '').trim().toLocaleUpperCase().replace(/[-\s]/g, '');
            const count = parseInt(item?.count, 10) || 0;
            if (!location || location === 'UNKNOWN' || count <= 0) return;
            locationCounts.set(location, (locationCounts.get(location) || 0) + count);
        });

        const locations = Array.from(locationCounts.keys());
        const cartons = Array.from(locationCounts.values()).reduce((sum, count) => sum + count, 0);
        const locationStops = locations.length;
        const singlePickStops = Array.from(locationCounts.values()).filter(count => count === 1).length;
        const aisleCodes = locations.map(location => location.match(/^(\d{2}[A-Z])/i)?.[1]?.toLocaleUpperCase() || '');
        const hasAisleData = locations.length > 0 && aisleCodes.every(Boolean);
        const aisleSections = hasAisleData ? new Set(aisleCodes).size : 0;
        const parsedBatchTotal = parseInt(batchTotal, 10);
        const total = Number.isFinite(parsedBatchTotal) ? Math.max(0, parsedBatchTotal) : cartons;
        const score = total > minimumCartons
            ? scorePickability(cartons, locationStops, singlePickStops, aisleSections, hasAisleData, minimumCartons)
            : null;

        return {
            version:PICKABILITY_SCORE_VERSION,
            minimumCartons,
            batchTotal:total,
            state:total <= minimumCartons ? 'low-sample'
                : !cartons ? 'no-location-data'
                : score === null ? 'low-sample' : 'scored',
            score,
            cartons,
            locationStops,
            singlePickStops,
            aisleSections,
            hasAisleData
        };
    }

    function calculateBatchPickability(batch, batchType, batchTotal = null) {
        const minimumCartons = getPickabilityMinimumCartons();
        if (isFullPalletPickBatch(batchType)) return { state:'excluded', reason:'full-pallet', minimumCartons };
        if (batch?.isHighVol) return { state:'excluded', reason:'high-volume', minimumCartons };
        const totalCartons = parseInt(batchTotal, 10);
        if (Number.isFinite(totalCartons) && totalCartons <= minimumCartons) {
            return { state:'low-sample', cartons:0, batchTotal:totalCartons, locationStops:0, minimumCartons };
        }
        if (!batch) return { state:'unscanned' };
        if (batch.pickerTimelineSchemaVersion !== PICKER_TIMELINE_SCHEMA_VERSION) return { state:'rescan' };
        if (!Array.isArray(batch.pickabilityData?.locations)) return { state:'rescan' };
        const rating = batch.pickabilityRating;
        const ratingTotal = Number.isFinite(totalCartons) ? Math.max(0, totalCartons) : Number(rating?.batchTotal);
        if (rating?.version === PICKABILITY_SCORE_VERSION &&
            rating.minimumCartons === minimumCartons &&
            rating.batchTotal === ratingTotal) return rating;

        const updatedRating = buildPickabilityRating(batch.pickabilityData, totalCartons, minimumCartons);
        batch.pickabilityRating = updatedRating;
        pickabilityCacheDirty = true;
        batchCacheDirty = true;
        return updatedRating;
    }

    function persistPickabilityCacheIfDirty(cacheMap) {
        if (pickabilityCacheDirty) batchCacheDirty = true;
        persistBatchCacheIfDirty();
    }

    function calculateDailyPickability(batchRecords) {
        const minimumCartons = getPickabilityMinimumCartons();
        const initZone = () => ({ expectedCartons:0, mappedCartons:0, locationStops:0, singleCartonStops:0, aisleSections:0, hasAisleData:true, batchCount:0, eligibleBatches:0, ratedBatches:0, lowSampleBatches:0, rescanBatches:0, excludedHighVolumeBatches:0, excludedFullPalletBatches:0, score:null, cartonsPerStop:0, coverage:0 });
        const zones = { Floor: initZone(), PTB: initZone(), Reserve: initZone() };
        batchRecords.forEach(record => {
            const batchType = record.batchType;
            if (record.hub === 'DIS' || !record.zone) return;
            const zone = record.zone;
            const day = zones[zone];
            day.batchCount++;
            if (record.isFullPallet) {
                day.excludedFullPalletBatches++;
                return;
            }
            const cached = record.cache;
            if (record.isHighVol) {
                day.excludedHighVolumeBatches++;
                return;
            }
            const expectedCartons = record.total;
            const metric = calculateBatchPickability(cached, batchType, expectedCartons);
            if (expectedCartons <= minimumCartons) {
                if (expectedCartons > 0 || metric.cartons > 0) day.lowSampleBatches++;
                return;
            }
            day.eligibleBatches++;
            day.expectedCartons += expectedCartons;
            if (metric.state === 'rescan' || metric.state === 'unscanned') {
                day.rescanBatches++;
                return;
            }
            if (metric.state === 'low-sample' || metric.state === 'no-location-data') {
                day.lowSampleBatches++;
                return;
            }
            if (metric.state !== 'scored') return;
            day.ratedBatches++;
            day.mappedCartons += metric.cartons;
            day.locationStops += metric.locationStops;
            day.singleCartonStops += metric.singlePickStops;
            day.aisleSections += metric.aisleSections;
            day.hasAisleData = day.hasAisleData && metric.hasAisleData;
        });
        persistPickabilityCacheIfDirty();
        Object.values(zones).forEach(day => {
            if (!day.ratedBatches) day.hasAisleData = false;
            day.score = day.ratedBatches ? scorePickability(day.mappedCartons, day.locationStops, day.singleCartonStops, day.aisleSections, day.hasAisleData, minimumCartons) : null;
            day.cartonsPerStop = day.locationStops ? day.mappedCartons / day.locationStops : 0;
            day.coverage = day.expectedCartons ? Math.min(100, Math.round(day.mappedCartons / day.expectedCartons * 100)) : (day.mappedCartons ? 100 : 0);
        });
        return zones;
    }

    function getDailyHistory() {
        if (dailyHistoryMemory) return dailyHistoryMemory;
        try {
            const parsed = JSON.parse(localStorage.getItem(DAILY_HISTORY_KEY) || '{}');
            dailyHistoryMemory = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            dailyHistoryMemory = {};
        }
        return dailyHistoryMemory;
    }

    function hashHistoryValue(value) {
        let hash = 2166136261;
        const text = String(value || '');
        for (let index = 0; index < text.length; index++) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }

    function openDailyBatchHistoryDb() {
        if (dailyHistoryDbPromise) return dailyHistoryDbPromise;
        dailyHistoryDbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB is unavailable'));
                return;
            }
            const request = window.indexedDB.open(DAILY_BATCH_HISTORY_DB, 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(DAILY_BATCH_HISTORY_STORE)) {
                    db.createObjectStore(DAILY_BATCH_HISTORY_STORE, { keyPath:'dateKey' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Could not open daily batch history'));
        });
        return dailyHistoryDbPromise;
    }

    function buildHistoricalBatchSnapshot(dateKey, batchRecords) {
        return {
            dateKey,
            batches:Array.from(batchRecords.values(), record => ({
                id:record.id,
                batchType:record.batchType,
                zone:record.zone,
                hub:record.hub,
                pending:record.pending,
                picked:record.picked,
                total:record.total,
                cells:record.rawCells || [],
                detailHref:record.detailHref || '',
                cache:record.cache ? {
                    isHighVol:!!record.cache.isHighVol,
                    lastScanTime:record.cache.lastScanTime || '--',
                    batchPrintInfo:record.cache.batchPrintInfo || null,
                    pickerTimelineSchemaVersion:record.cache.pickerTimelineSchemaVersion,
                    completionInfo:record.cache.completionInfo || null,
                    pickabilityRating:record.cache.pickabilityRating || null,
                    pickers:Array.isArray(record.cache.pickers) ? record.cache.pickers : [],
                    shortLocations:Array.isArray(record.cache.shortLocations) ? record.cache.shortLocations : []
                } : null
            }))
        };
    }

    function persistHistoricalBatchSnapshot(snapshot) {
        return openDailyBatchHistoryDb().then(db => new Promise((resolve, reject) => {
            const transaction = db.transaction(DAILY_BATCH_HISTORY_STORE, 'readwrite');
            const store = transaction.objectStore(DAILY_BATCH_HISTORY_STORE);
            store.put(snapshot);
            const cutoffDate = new Date();
            cutoffDate.setHours(2, 0, 0, 0);
            cutoffDate.setDate(cutoffDate.getDate() - (DAILY_HISTORY_RETENTION_DAYS - 1));
            const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;
            const cursorRequest = store.openCursor();
            cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (!cursor) return;
                if (String(cursor.key) < cutoffKey) cursor.delete();
                cursor.continue();
            };
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error || new Error('Could not save daily batch history'));
            transaction.onabort = () => reject(transaction.error || new Error('Daily batch history write was aborted'));
        }));
    }

    function loadHistoricalBatchSnapshot(dateKey) {
        return openDailyBatchHistoryDb().then(db => new Promise((resolve, reject) => {
            const transaction = db.transaction(DAILY_BATCH_HISTORY_STORE, 'readonly');
            const request = transaction.objectStore(DAILY_BATCH_HISTORY_STORE).get(dateKey);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error || new Error('Could not load daily batch history'));
        }));
    }

    function createHistoricalBatchRows(snapshot) {
        return (snapshot?.batches || []).map(batch => {
            const row = document.createElement('tr');
            (batch.cells || []).forEach(cellHtml => {
                const cell = document.createElement('td');
                cell.innerHTML = cellHtml;
                row.appendChild(cell);
            });
            while (row.cells.length < 8) row.appendChild(document.createElement('td'));
            const detailLink = row.querySelector("a[href*='BatchDetail']");
            if (detailLink && batch.detailHref) detailLink.setAttribute('href', batch.detailHref);
            row.setAttribute('data-saved-id', String(batch.id));
            row.setAttribute('data-saved-type', batch.batchType || 'Unknown');
            row.setAttribute('data-saved-zone', batch.zone || '');
            row.setAttribute('data-saved-hub', batch.hub || '');
            row.setAttribute('data-saved-pending', String(batch.pending || 0));
            row.setAttribute('data-saved-picked', String(batch.picked || 0));
            row.setAttribute('data-saved-total', String(batch.total || 0));
            return row;
        });
    }

    function buildHistoricalBatchCache(snapshot) {
        const cache = Object.create(null);
        (snapshot?.batches || []).forEach(batch => {
            if (batch.cache) cache[String(batch.id)] = batch.cache;
        });
        return cache;
    }

    function ensureDailyHistorySelector() {
        let wrapper = document.getElementById('tm-daily-history-control');
        if (!wrapper) {
            wrapper = document.createElement('label');
            wrapper.id = 'tm-daily-history-control';
            wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:7px;margin-left:auto;color:#475569;font-size:10px;font-weight:700;white-space:nowrap;';
            wrapper.innerHTML = `<span>History</span><select id="tm-daily-history-date" aria-label="Choose batch history day" style="height:30px;min-width:165px;padding:3px 7px;border:1px solid #cbd5e1;border-radius:3px;background:#fff;color:#0f172a;font-size:11px;font-weight:600;"></select>`;
            const selector = wrapper.querySelector('select');
            selector.addEventListener('change', () => selectDailyHistoryDate(selector.value));
        }
        const heading = Array.from(document.querySelectorAll('h1,h2,h3')).find(item => /^batch status\b/i.test(item.textContent.trim()));
        if (heading?.parentElement) {
            const headerRow = heading.parentElement;
            headerRow.style.display = 'flex';
            headerRow.style.alignItems = 'center';
            headerRow.style.justifyContent = 'space-between';
            headerRow.style.gap = '12px';
            headerRow.style.width = '100%';
            heading.style.marginBottom = '0';
            if (wrapper.parentElement !== headerRow) headerRow.appendChild(wrapper);
        }
        return wrapper.querySelector('select');
    }

    function selectDailyHistoryDate(dateKey) {
        localStorage.setItem('__batch_status_history_date', dateKey);
        const currentDateKey = getOperationalDayKey();
        if (dateKey === currentDateKey) {
            historyLoadSequence++;
            historyLoadDateKey = '';
            selectedHistoricalBatchSnapshot = null;
            historicalViewActive = false;
            rebuildTable();
            return;
        }
        historicalViewActive = true;
        if (selectedHistoricalBatchSnapshot?.dateKey === dateKey) {
            rebuildTable();
            return;
        }
        if (historyLoadDateKey === dateKey) return;
        const loadSequence = ++historyLoadSequence;
        historyLoadDateKey = dateKey;
        loadHistoricalBatchSnapshot(dateKey).then(snapshot => {
            if (loadSequence !== historyLoadSequence) return;
            selectedHistoricalBatchSnapshot = snapshot;
            historyLoadDateKey = dateKey;
            rebuildTable();
        }).catch(error => {
            if (loadSequence !== historyLoadSequence) return;
            selectedHistoricalBatchSnapshot = null;
            historyLoadDateKey = dateKey;
            console.warn('Could not load selected historical batches', error);
            rebuildTable();
        });
    }

    function buildAssociateGapSnapshot(batchRecords, dateKey) {
        const [year, month, day] = dateKey.split('-').map(Number);
        const start = new Date(year, month - 1, day, 2, 0, 0, 0).getTime();
        const end = new Date(year, month - 1, day + 1, 2, 0, 0, 0).getTime();
        const associates = new Map();
        batchRecords.forEach(record => {
            if (record.hub === 'DIS' || record.isFullPallet || !Array.isArray(record.cache?.pickers)) return;
            record.cache.pickers.forEach(picker => {
                if (!picker || typeof picker === 'string') return;
                const name = String(picker.name || '').trim();
                if (!name || name.includes('.') || name.toLowerCase() === 'flr895jyc') return;
                const events = Array.isArray(picker.pickEvents) ? picker.pickEvents : [];
                events.forEach(event => {
                    const timestamp = Number(event?.ts) || getScanTimestamp(event?.timeStr);
                    const carton = String(event?.carton || '').trim();
                    const status = String(event?.status || '').toLocaleLowerCase();
                    if (!carton || !status.includes('picking complete') || timestamp < start || timestamp >= end) return;
                    const key = name.toLocaleLowerCase();
                    if (!associates.has(key)) associates.set(key, { name, eventMap:new Map() });
                    const entry = associates.get(key);
                    entry.eventMap.set(`${record.id}|${carton}`, { ts:timestamp, batchId:record.id, zone:record.zone || 'Other', location:String(event?.location || picker.location || 'Unknown') });
                });
            });
        });

        const zonePace = {
            Floor:{ picks:0, observedSpanMinutes:0, picksPerHour:0 },
            PTB:{ picks:0, observedSpanMinutes:0, picksPerHour:0 },
            Reserve:{ picks:0, observedSpanMinutes:0, picksPerHour:0 }
        };
        const associateSnapshots = Array.from(associates.values()).map(associate => {
            const events = Array.from(associate.eventMap.values()).sort((a, b) => a.ts - b.ts);
            const gaps = [];
            const eventsByZone = { Floor:[], PTB:[], Reserve:[] };
            events.forEach(event => { if (eventsByZone[event.zone]) eventsByZone[event.zone].push(event); });
            Object.entries(eventsByZone).forEach(([zone, zoneEvents]) => {
                if (zoneEvents.length < 2) return;
                const spanMinutes = (zoneEvents[zoneEvents.length - 1].ts - zoneEvents[0].ts) / 60000;
                if (spanMinutes <= 0) return;
                zonePace[zone].picks += zoneEvents.length;
                zonePace[zone].observedSpanMinutes += spanMinutes;
            });
            let totalGapMinutes = 0;
            for (let index = 1; index < events.length; index++) {
                const minutes = (events[index].ts - events[index - 1].ts) / 60000;
                if (minutes <= 0) continue;
                totalGapMinutes += minutes;
                gaps.push({ start:events[index - 1].ts, end:events[index].ts, minutes });
            }
            gaps.sort((a, b) => b.minutes - a.minutes);
            return {
                name:associate.name,
                picks:events.length,
                gapCount:gaps.length,
                totalGapMinutes:Math.round(totalGapMinutes),
                averageGapMinutes:gaps.length ? Math.round(totalGapMinutes / gaps.length) : 0,
                longestGapMinutes:gaps[0] ? Math.round(gaps[0].minutes) : 0,
                longestGaps:gaps.slice(0, 5).map(gap => [gap.start, gap.end, Math.round(gap.minutes)])
            };
        }).sort((a, b) => b.longestGapMinutes - a.longestGapMinutes || a.name.localeCompare(b.name)).slice(0, 40);
        Object.values(zonePace).forEach(zone => {
            zone.picksPerHour = zone.observedSpanMinutes > 0 ? zone.picks / (zone.observedSpanMinutes / 60) : 0;
            zone.observedSpanMinutes = Math.round(zone.observedSpanMinutes);
            zone.picksPerHour = Math.round(zone.picksPerHour * 10) / 10;
        });
        return { associates:associateSnapshots, zonePace };
    }

    function saveDailyHistorySnapshot(dateKey, zones, batchRecords) {
        const history = getDailyHistory();
        const batchSignatures = Array.from(batchRecords.values(), record => [
            record.id, record.batchType, record.zone, record.hub, record.pending, record.picked, record.total,
            record.rawSignature || '', record.cache?.cacheUpdatedAt || '', record.cache?.pickabilityRating?.score ?? ''
        ].join(':'));
        const sourceSignature = `${dateKey}|${getPickabilityMinimumCartons()}|${hashHistoryValue(batchSignatures.join('|'))}|${hashHistoryValue(JSON.stringify(zoneStatusCache || {}))}|${hashHistoryValue(JSON.stringify(getStoredHubCutTimes()))}`;
        if (sourceSignature === dailyHistorySourceSignature && history[dateKey]) return history;
        const associateHistory = buildAssociateGapSnapshot(batchRecords, dateKey);
        const historicalBatches = buildHistoricalBatchSnapshot(dateKey, batchRecords);
        const snapshot = {
            dateKey,
            capturedAt:new Date().toISOString(),
            batchSnapshotSignature:sourceSignature,
            minimumCartons:getPickabilityMinimumCartons(),
            zones:JSON.parse(JSON.stringify(zones)),
            zoneStatus:zoneStatusCache ? JSON.parse(JSON.stringify(zoneStatusCache)) : null,
            hubCutTimes:getStoredHubCutTimes(),
            associates:associateHistory.associates,
            zonePace:associateHistory.zonePace
        };
        const previous = history[dateKey];
        const comparableSnapshot = { ...snapshot, capturedAt:'' };
        const comparablePrevious = previous ? { ...previous, capturedAt:'' } : null;
        if (!comparablePrevious || JSON.stringify(comparableSnapshot) !== JSON.stringify(comparablePrevious)) {
            history[dateKey] = snapshot;
            const cutoff = new Date();
            cutoff.setHours(2, 0, 0, 0);
            cutoff.setDate(cutoff.getDate() - (DAILY_HISTORY_RETENTION_DAYS - 1));
            const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
            Object.keys(history).forEach(key => { if (key < cutoffKey) delete history[key]; });
            try {
                localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(history));
            } catch (error) {
                console.warn('Could not persist daily history snapshot', error);
            }
        }
        persistHistoricalBatchSnapshot(historicalBatches).then(() => {
            dailyHistorySourceSignature = sourceSignature;
        }).catch(error => console.warn('Could not persist full daily batch snapshot', error));
        return history;
    }

    function renderDailyHistorySnapshot(dateKey) {
        const history = getDailyHistory();
        const snapshot = history[dateKey];
        const zoneContainer = document.getElementById('tm-daily-history-zones');
        if (!zoneContainer) return;
        if (!snapshot) {
            zoneContainer.textContent = 'No saved summary for this day.';
            return;
        }
        const minimumCartons = Number.isFinite(Number(snapshot.minimumCartons)) ? Number(snapshot.minimumCartons) : getPickabilityMinimumCartons();
        zoneContainer.innerHTML = Object.entries(snapshot.zones).map(([zoneName, zoneData]) => {
            const scoreLabel = zoneData.score === null ? '--' : `${zoneData.score} / 100`;
            const scoreColor = zoneData.score === null ? '#64748b' : zoneData.score >= 70 ? '#047857' : zoneData.score >= 40 ? '#b45309' : '#b91c1c';
            const cartonsPerStop = zoneData.locationStops ? Number(zoneData.cartonsPerStop).toFixed(1) : '--';
            const pace = snapshot.zonePace?.[zoneName];
            const paceLabel = pace?.observedSpanMinutes ? `${pace.picksPerHour} picks/hour over observed span · ${pace.picks} timed picks` : 'Observed pace unavailable';
            const batchCount = Number(zoneData.batchCount ?? zoneData.eligibleBatches) || 0;
            const excludedText = `${Number(zoneData.excludedHighVolumeBatches) || 0} High Vol · ${Number(zoneData.excludedFullPalletBatches) || 0} pallet excluded`;
            const scanStatusText = `${Number(zoneData.lowSampleBatches) || 0} low sample · ${Number(zoneData.rescanBatches) || 0} need scan`;
            return `<div style="display:flex;flex-direction:column;gap:4px;padding:8px 11px;border:1px solid #cbd5e1;border-left:4px solid #2563eb;border-radius:4px;background:#fff;color:#0f172a;font-size:11px;"><strong>${zoneName} <span style="margin-left:5px;color:${scoreColor};font-size:13px;">${scoreLabel}</span></strong><span style="color:#475569;font-size:10px;">${cartonsPerStop} c/stop · ${zoneData.locationStops} stops · ${zoneData.coverage}% coverage</span><span style="color:#475569;font-size:10px;">${paceLabel}</span><span style="color:#64748b;font-size:9px;">${zoneData.ratedBatches}/${batchCount} batches rated · cutoff &gt;${minimumCartons}</span><span style="color:#64748b;font-size:9px;">${scanStatusText} · ${excludedText}</span></div>`;
        }).join('');
    }

    function renderDailyHistorySelector(history, currentDateKey) {
        const selector = ensureDailyHistorySelector();
        if (!selector) return;
        const dates = Object.keys(history).sort((a, b) => b.localeCompare(a));
        selector.innerHTML = dates.map(date => {
            const weekday = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday:'short' });
            return `<option value="${date}">${date === currentDateKey ? 'Today · ' : ''}${date} (${weekday})</option>`;
        }).join('');
        const savedDate = localStorage.getItem('__batch_status_history_date');
        const selectedDate = savedDate && history[savedDate] ? savedDate : currentDateKey;
        selector.value = selectedDate;
        if (savedDate !== selectedDate) localStorage.setItem('__batch_status_history_date', selectedDate);
        renderDailyHistorySnapshot(selector.value);
        if (selector.value !== currentDateKey && selectedHistoricalBatchSnapshot?.dateKey !== selector.value && historyLoadDateKey !== selector.value) {
            selectDailyHistoryDate(selector.value);
        }
    }

    function getBatchPickabilityTitle(metric) {
        if (metric.state === 'excluded' && metric.reason === 'high-volume') return 'Excluded: High Volume batches are omitted from batch ranks and the day score.';
        if (metric.state === 'excluded') return 'Excluded: full-pallet batches are not comparable to carton-pick batches.';
        if (metric.state === 'low-sample' && !metric.locationStops) return `Low sample: ${metric.batchTotal} total cartons; batches must have more than ${metric.minimumCartons}.`;
        if (metric.state === 'unscanned') return 'Not rated: scan this batch to collect carton and location details.';
        if (metric.state === 'rescan') return 'Rescan needed: this cached scan predates the pick-status and location scoring data. Run Smart Scan.';
        if (metric.state === 'no-location-data') return 'Not rated: no batch cartons with a known pick location were found.';

        const cartonsPerStop = (metric.cartons / metric.locationStops).toFixed(1);
        const singlePickShare = Math.round(metric.singlePickStops / metric.locationStops * 100);
        const method = metric.hasAisleData
            ? 'Score = 100 x (1 - [55% locations per carton + 25% single-carton-location share + 20% aisle-prefixes per carton]).'
            : 'Score = 100 x (1 - [70% locations per carton + 30% single-carton-location share]); aisle prefixes were unavailable.';
        const lines = [
            metric.score === null ? `Low sample: this batch must have more than ${metric.minimumCartons} assigned cartons with known locations.` : `Pick efficiency: ${metric.score}/100 (higher means a more concentrated, easier-to-pick route; not labor productivity).`,
            `Cartons assigned to known locations: ${metric.cartons}`,
            `Distinct pick locations: ${metric.locationStops}`,
            `Cartons per location: ${cartonsPerStop}`,
            `Single-carton locations: ${metric.singlePickStops} (${singlePickShare}%)`,
            `Aisle-prefix sections: ${metric.hasAisleData ? metric.aisleSections : 'not available'}`,
            method,
            'All assigned cartons count, including unpicked cartons. This estimates route concentration, not picker performance, travel distance, or labor time.'
        ];
        return lines.join('\n');
    }

    function getDailyPickabilityTitle(day) {
        const minimumCartons = getPickabilityMinimumCartons();
        const method = day.hasAisleData
            ? 'Score = 100 x (1 - [55% locations per carton + 25% single-carton-location share + 20% aisle-prefixes per carton]).'
            : 'Score = 100 x (1 - [70% locations per carton + 30% single-carton-location share]); aisle prefixes were unavailable.';
        return [
            day.score === null ? `Not rated: at least one batch must have more than ${minimumCartons} assigned cartons with known locations.` : `Day pick efficiency: ${day.score}/100 (higher means a more concentrated, easier-to-pick route; not labor productivity).`,
            `Location coverage: ${day.mappedCartons} mapped cartons of ${day.expectedCartons} batch cartons (${day.coverage}%).`,
            `Mapped batch-location stops: ${day.locationStops}`,
            `Cartons per stop: ${day.cartonsPerStop.toFixed(1)}`,
            `Single-carton stops: ${day.singleCartonStops}`,
            `Aisle-prefix sections: ${day.hasAisleData ? day.aisleSections : 'not available'}`,
            `Batches rated: ${day.ratedBatches} of ${day.eligibleBatches} above the cutoff; ${day.lowSampleBatches} at/below cutoff or without enough mapped locations; ${day.rescanBatches} need a refreshed scan.`,
            `High Volume batches excluded: ${day.excludedHighVolumeBatches}. Cutoff: more than ${minimumCartons} cartons per batch.`,
            method,
            `All assigned cartons count, including unpicked cartons. Full-pallet, High Volume, and DIS batches are excluded. The configured cutoff is strictly more than ${minimumCartons} cartons. This estimates route concentration, not picker performance, travel distance, or labor time.`
        ].join('\n');
    }

    function rebuildTable() {
        // FIX: Ensure no orphaned dimming overlays are left behind during a table rebuild
        removeDimOverlay();

        if (countdownInterval) clearInterval(countdownInterval);
        const mainTable = document.querySelector("table.datatable");
        if (!mainTable) return;
        const tbody = mainTable.querySelector("tbody");
        if (!tbody) return;

        // Correct table head columns & Set dynamic header widths
        const headerRow = mainTable.querySelector("thead tr");
        if (headerRow) {
            if (!headerRow.querySelector('.cut-time-header-col')) {
                const cutTimeHeader = document.createElement("th");
                cutTimeHeader.className = "cut-time-header-col text-primary";
                cutTimeHeader.innerText = "Cut Time";
                cutTimeHeader.style.width = "95px";
                cutTimeHeader.style.textAlign = "center";
                headerRow.insertBefore(cutTimeHeader, headerRow.firstChild);
            }
            if (!headerRow.querySelector('.last-scan-header-col')) {
                const lastScanHeader = document.createElement("th");
                lastScanHeader.className = "last-scan-header-col";
                lastScanHeader.innerText = "Last Scanned";
                lastScanHeader.style.width = "100px";
                headerRow.insertBefore(lastScanHeader, headerRow.children[2]);
            }
            if (!headerRow.querySelector('.pickability-header-col')) {
                const pickabilityHeader = document.createElement("th");
                pickabilityHeader.className = "pickability-header-col";
                pickabilityHeader.innerText = "Pick Efficiency";
                pickabilityHeader.title = 'Batch route-concentration score, not labor productivity; hover each score for its breakdown.';
                pickabilityHeader.style.width = "94px";
                headerRow.querySelector('.last-scan-header-col')?.insertAdjacentElement('afterend', pickabilityHeader);
            }
            if (!headerRow.querySelector('.time-to-pick-header-col')) {
                const timeToPickHeader = document.createElement('th');
                timeToPickHeader.className = 'time-to-pick-header-col';
                timeToPickHeader.innerText = 'Table Time';
                timeToPickHeader.title = 'Elapsed time from batch Printed time to Assigned time. Manual print type is marked.';
                timeToPickHeader.style.width = '105px';
                headerRow.querySelector('.pickability-header-col')?.insertAdjacentElement('afterend', timeToPickHeader);
            }

            // Set balanced widths and fix alignment
            if (headerRow.children[5]) {
                headerRow.children[5].style.width = "75px";
                headerRow.children[5].style.maxWidth = "80px";
            }
            if (headerRow.children[6]) {
                headerRow.children[6].style.width = "110px";
                headerRow.children[6].style.maxWidth = "130px";
            }
            if (headerRow.children[8]) {
                headerRow.children[8].style.width = "auto";
                headerRow.children[8].style.minWidth = "150px";
                headerRow.children[8].style.textAlign = "left"; // Align header to left to match names
            }
        }

        const showCompleted = getStoredToggleState('__sidebar_show_completed', true);
        const showDIS = getStoredToggleState('__sidebar_show_dis', false);
        const enableHighlight = getStoredToggleState('__sidebar_highlight_done', true);
        const threshVal = getStoredThresholdVal();
        const threshType = getStoredThresholdType();
        const cacheMap = getStoredBatchCache();
        const pickabilityMinimumCartons = getPickabilityMinimumCartons();

        if (originalDataRows.length === 0) {
            const originalCheckboxWrapper = document.querySelector(".custom-control.custom-checkbox");
            if (originalCheckboxWrapper) originalCheckboxWrapper.style.setProperty('display', 'none', 'important');

            tbody.querySelectorAll("tr").forEach(row => {
                // Ignore formatting rows completely, we dynamically build totals
                if (isBatchStatusSummaryRow(row)) return;

                const batchId = row.cells[0]?.innerText.trim() || "";
                if (!batchId) return;

                const batchType = row.cells[1]?.innerText.trim() || "Unknown";
                const rawHub = row.cells[2]?.innerText.trim() || "";
                const normalizedHub = (rawHub === "UNKNOWN") ? "MULTIPLE" : rawHub;

                if (row.cells[2]) row.cells[2].innerText = normalizedHub;

                row.setAttribute('data-saved-id', batchId);
                row.setAttribute('data-saved-type', batchType);
                row.setAttribute('data-saved-zone', classifyWorkZone(batchType) || '');
                row.setAttribute('data-saved-hub', normalizedHub);
                row.setAttribute('data-saved-pending', row.cells[5]?.innerText.replace(/,/g, '') || "0");
                row.setAttribute('data-saved-picked', row.cells[6]?.innerText.replace(/,/g, '') || "0");
                row.setAttribute('data-saved-total', row.cells[7]?.innerText.replace(/,/g, '') || "0");

                originalDataRows.push(row);
            });
            setupPageLayout(mainTable);
        }

        const currentDateKey = getOperationalDayKey();
        const liveBatchIndex = syncMasterBatchIndex(originalDataRows, cacheMap, true);
        const dailyPickabilityZones = calculateDailyPickability(liveBatchIndex);
        const dailyHistory = saveDailyHistorySnapshot(currentDateKey, dailyPickabilityZones, liveBatchIndex);
        let pickabilitySummary = document.getElementById('tm-daily-pickability-summary');
        if (!pickabilitySummary) {
            pickabilitySummary = document.createElement('div');
            pickabilitySummary.id = 'tm-daily-pickability-summary';
            pickabilitySummary.style.cssText = 'display:grid;grid-template-columns:1fr;gap:8px;margin:0 0 8px;padding:8px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;';
            pickabilitySummary.innerHTML = `<div id="tm-daily-history-zones" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;"></div>`;
            mainTable.parentNode.insertBefore(pickabilitySummary, mainTable);
        }
        renderDailyHistorySelector(dailyHistory, currentDateKey);

        const selectedDateKey = localStorage.getItem('__batch_status_history_date') || currentDateKey;
        historicalViewActive = selectedDateKey !== currentDateKey;
        let displayRows = originalDataRows;
        let displayCacheMap = cacheMap;
        let batchIndex = liveBatchIndex;
        if (historicalViewActive) {
            if (selectedHistoricalBatchSnapshot?.dateKey === selectedDateKey) {
                displayRows = createHistoricalBatchRows(selectedHistoricalBatchSnapshot);
                displayCacheMap = buildHistoricalBatchCache(selectedHistoricalBatchSnapshot);
                batchIndex = syncMasterBatchIndex(displayRows, displayCacheMap, false);
            } else {
                displayRows = [];
                displayCacheMap = Object.create(null);
                batchIndex = new Map();
                batchIndex.rowIndex = new WeakMap();
            }
        }
        displayBatchIndex = batchIndex;
        displayedBatchRows = displayRows;
        displayedBatchCache = displayCacheMap;
        renderDailyHistorySnapshot(selectedDateKey);

        if (!historicalViewActive) purgeDISDetailCache();
        const HUB_CUT_TIMES = historicalViewActive
            ? (dailyHistory[selectedDateKey]?.hubCutTimes || getStoredHubCutTimes())
            : getStoredHubCutTimes();
        const activeRows = Array.from(batchIndex.values()).filter(record => {
            const pending = record.cache?.completionInfo?.effectivelyComplete ? 0 : record.pending;
            return (showDIS || record.hub !== 'DIS') && (showCompleted || pending !== 0);
        }).map(record => record.row);

        const groups = {};
        activeRows.forEach(row => {
            const savedHub = batchIndex.rowIndex.get(row)?.hub || "";
            const cutTimeStr = HUB_CUT_TIMES[savedHub] || "No Cut Time Match";
            if (!groups[cutTimeStr]) groups[cutTimeStr] = [];
            groups[cutTimeStr].push(row);
        });

        const sortedCutTimes = Object.keys(groups).sort((a, b) => getChronologicalWeight(a) - getChronologicalWeight(b));
        tbody.innerHTML = "";
        if (historicalViewActive && !selectedHistoricalBatchSnapshot) {
            const missingHistoryRow = document.createElement('tr');
            missingHistoryRow.innerHTML = `<td colspan="13" style="padding:18px;text-align:center;color:#64748b;">Full batch rows were not saved for ${escapeHTML(selectedDateKey)}. This day may predate batch-history capture or its snapshot could not be loaded.</td>`;
            tbody.appendChild(missingHistoryRow);
        }

        let grandPending = 0, grandPicked = 0, grandAll = 0;
        batchIndex.forEach(record => {
            if (record.hub === 'DIS' && !showDIS) return;
            grandPending += record.cache?.completionInfo?.effectivelyComplete ? 0 : record.pending;
            grandPicked += record.picked;
            grandAll += record.total;
        });

        sortedCutTimes.forEach(cutTime => {
            const currentGroupRows = groups[cutTime];
            currentGroupRows.sort((a, b) => (batchIndex.rowIndex.get(a)?.pending || 0) - (batchIndex.rowIndex.get(b)?.pending || 0));

            let groupPending = 0, groupPicked = 0, groupAll = 0;

            currentGroupRows.forEach((row, idx) => {
                row.querySelector('.vertical-cut-time-cell')?.remove();

                if (idx === 0) {
                    const rowspanCell = document.createElement("td");
                    rowspanCell.className = "vertical-cut-time-cell";
                    // Explicitly map length + 1 to account for the generated Subtotal
                    rowspanCell.setAttribute("rowspan", currentGroupRows.length + 1);
                    rowspanCell.setAttribute("data-base-time", cutTime);

                    const countdown = getCountdownData(cutTime);
                    rowspanCell.innerHTML = `
                        <div class="cut-time-text-area">${countdown.text}</div>
                        <div class="cut-time-action-wrapper">
                            <button class="btn btn-xs btn-outline-primary scan-group-btn">⚡ Scan</button>
                            <span class="group-scan-status" style="font-size:9px; color:#3b82f6; font-weight:bold;"></span>
                        </div>
                    `;

                    const groupBtn = rowspanCell.querySelector('.scan-group-btn');
                    const groupStatus = rowspanCell.querySelector('.group-scan-status');
                    if (historicalViewActive) {
                        groupBtn.disabled = true;
                        groupBtn.title = 'Historical batches are read-only.';
                    } else {
                        groupBtn?.addEventListener('click', (e) => {
                            e.stopPropagation();
                            executeScanForRows(currentGroupRows, groupBtn, groupStatus);
                        });
                    }

                    row.insertBefore(rowspanCell, row.firstChild);
                }

                const batchRecord = batchIndex.rowIndex.get(row);
                const batchId = batchRecord?.id || row.getAttribute('data-saved-id') || "";
                const cached = batchRecord?.cache || displayCacheMap[batchId];
                const isEffectivelyComplete = !!cached?.completionInfo?.effectivelyComplete;
                const pendingVal = isEffectivelyComplete ? 0 : (batchRecord?.pending || 0);
                const pickedVal = batchRecord?.picked || 0;
                const totalVal = batchRecord?.total || 0;

                const batchIdCell = (idx === 0) ? row.cells[1] : row.cells[0];

                if (batchIdCell) {
                    batchIdCell.querySelector('.high-vol-badge')?.remove();
                    if (cached && cached.isHighVol) {
                        const badge = document.createElement('span');
                        badge.className = 'high-vol-badge';
                        badge.innerText = '🔥 High Vol';
                        batchIdCell.appendChild(badge);
                    }
                }

                // Last Scan Time Column Insertion (Now formatted as Relative Time)
                let lastScanCell = row.querySelector('.last-scan-cell');
                if (!lastScanCell) {
                    lastScanCell = document.createElement('td');
                    lastScanCell.className = 'last-scan-cell text-center';
                    const targetIdx = (idx === 0) ? 2 : 1;
                    row.insertBefore(lastScanCell, row.children[targetIdx]);
                }
                const rawScanTime = (cached && cached.lastScanTime && cached.lastScanTime !== '--') ? cached.lastScanTime : '--';
                lastScanCell.setAttribute('data-raw-time', rawScanTime);
                const relStr = getRelativeTimeStr(rawScanTime);
                lastScanCell.innerText = relStr;
                if (relStr.includes('hr') || relStr.includes('d')) {
                    lastScanCell.classList.add('stale-scan');
                } else {
                    lastScanCell.classList.remove('stale-scan');
                }

                let pickabilityCell = row.querySelector('.pickability-cell');
                if (!pickabilityCell) {
                    pickabilityCell = document.createElement('td');
                    pickabilityCell.className = 'pickability-cell text-center';
                    lastScanCell.insertAdjacentElement('afterend', pickabilityCell);
                }
                const pickability = historicalViewActive && cached?.pickabilityRating
                    ? cached.pickabilityRating
                    : calculateBatchPickability(cached, row.getAttribute('data-saved-type'), totalVal);
                let pickText = '--', pickColor = '#64748b';
                if (pickability.state === 'scored') {
                    pickText = `${pickability.score} / 100`;
                    pickColor = pickability.score >= 70 ? '#047857' : pickability.score >= 40 ? '#b45309' : '#b91c1c';
                } else {
                    pickText = pickability.state === 'excluded'
                        ? (pickability.reason === 'high-volume' ? 'High Vol' : 'Excluded')
                        : pickability.state === 'rescan' ? 'Rescan'
                        : pickability.state === 'low-sample' ? 'Low sample'
                        : pickability.state === 'unscanned' ? 'Scan needed' : '--';
                }
                pickabilityCell.textContent = pickText;
                pickabilityCell.title = getBatchPickabilityTitle(pickability);
                pickabilityCell.style.cssText = `text-align:center;font-size:10px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums;color:${pickColor};cursor:help;`;

                let timeToPickCell = row.querySelector('.time-to-pick-cell');
                if (!timeToPickCell) {
                    timeToPickCell = document.createElement('td');
                    timeToPickCell.className = 'time-to-pick-cell text-center';
                    pickabilityCell.insertAdjacentElement('afterend', timeToPickCell);
                }
                const printInfo = cached?.batchPrintInfo;
                const minutesToPick = Number(printInfo?.minutesToPick);
                const typeLabel = printInfo?.type || (printInfo?.manualPrint ? 'Manual' : '');
                let timeToPickText = '--';
                if (printInfo && printInfo.minutesToPick !== null && Number.isFinite(minutesToPick)) {
                    timeToPickText = `${Math.round(minutesToPick)}m`;
                }
                timeToPickCell.textContent = timeToPickText;
                timeToPickCell.title = printInfo
                    ? `Type: ${typeLabel || 'not available'}\nPrinted: ${printInfo.printedAt || 'not available'}\nAssigned: ${printInfo.assignedAt || 'not available'}`
                    : 'Batch print metadata is not available in this scan.';
                timeToPickCell.style.cssText = 'text-align:center;font-size:10px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums;color:#475569;';

                // Balanced Column Width Constraints (Zone and Hub)
                const zoneCell = row.cells[(idx === 0) ? 5 : 4];
                const hubCell = row.cells[(idx === 0) ? 6 : 5];
                if (zoneCell) zoneCell.style.cssText = 'width:75px;max-width:80px;white-space:normal;word-break:break-word;font-size:11px;';
                if (hubCell) hubCell.style.cssText = 'width:110px;max-width:130px;white-space:normal;word-break:break-word;font-size:14px;font-weight:800;color:#0f172a;';

                // Explicit Target for Picker Column (Index 7 for first row, 6 for others)
                const pickerIdx = (idx === 0) ? 8 : 7;
                const pickersCell = row.cells[pickerIdx];
                if (pickersCell) {
                    pickersCell.style.cssText = 'text-align:left;font-size:11px;white-space:normal;';
                    if (cached && cached.pickers && cached.pickers.length > 0) {
                        const pickerHTML = cached.pickers.map((p, i) => {
                            const pName = typeof p === 'string' ? p : p.name;
                            const pLoc = typeof p === 'string' ? 'Unknown' : (p.location || 'Unknown');
                            const pTime = typeof p === 'string' ? 'Unknown' : p.timeStr;
                            const relativeTimeStr = getRelativeTimeStr(pTime);
                            const nameDisplay = i === 0 ? `<strong>${pName}</strong>` : pName;
                            return `<span class="picker-name-span" data-raw-time="${pTime}" data-location="${pLoc}" title="Last Scanned: ${pLoc} - ${relativeTimeStr}" style="cursor:help;border-bottom:1px dotted #94a3b8;">${nameDisplay}</span>`;
                        }).join(', ');
                        pickersCell.innerHTML = pickerHTML;
                    } else if (cached) {
                        pickersCell.innerText = '--';
                    }
                }

                if (isEffectivelyComplete) {
                    const statusCell = row.cells[(idx === 0) ? 7 : 6];
                    const pendingCell = row.cells[(idx === 0) ? 9 : 8];
                    if (statusCell) statusCell.innerHTML = `<span style="color:#047857;font-weight:800;">Picking Completed</span><br><span style="color:#64748b;font-size:9px;">${cached.completionInfo.canceledCount || 0} canceled ticket${cached.completionInfo.canceledCount === 1 ? '' : 's'} ignored</span>`;
                    if (pendingCell) pendingCell.innerText = '0';
                }
                // MODERNIZED ROW HIGHLIGHTING
                row.style.backgroundColor = isEffectivelyComplete ? "#ecfdf5" : "";
                if (!isEffectivelyComplete && enableHighlight && totalVal > 0) {
                    let shouldHighlight = (threshType === 'percent') ? (((pendingVal / totalVal) * 100) < threshVal) : (pendingVal <= threshVal);
                    if (shouldHighlight) {
                        row.style.backgroundColor = "#fff1f2"; // Modern Tailwind Rose-50 instead of harsh red
                    }
                }

                tbody.appendChild(row);
                groupPending += pendingVal; groupPicked += pickedVal; groupAll += totalVal;
            });

            if (currentGroupRows.length > 0) {
                // Dynamically build the 12-column mapped Subtotal
                const subTotalRow = document.createElement("tr");
                subTotalRow.style.backgroundColor = "#f8fafc";
                subTotalRow.style.fontWeight = "bold";
                subTotalRow.style.borderBottom = "2px solid #cbd5e1";

                // Exclude leading <td> since 'Cut Time' rowspan explicitly covers this column
                subTotalRow.innerHTML = `
                    <td colspan="7" style="text-align: left; padding-left: 1.5rem !important;"><span style="color: #64748b; font-style: italic;">Subtotal</span></td>
                    <td class="text-right pr-md-3"><strong style="color: #0f172a;">${groupPending.toLocaleString()}</strong></td>
                    <td class="text-right pr-md-3"><span style="color: #475569;">${groupPicked.toLocaleString()}</span></td>
                    <td class="text-right pr-md-3"><span style="color: #475569;">${groupAll.toLocaleString()}</span></td>
                    <td></td>
                    <td></td>
                `;
                tbody.appendChild(subTotalRow);
            }
        });

        if (displayRows.length > 0) {
            // Dynamically build the 13-column mapped Grand Total
            const finalTotalRow = document.createElement("tr");
            finalTotalRow.style.backgroundColor = "#ecfdf5"; // Tailwind Emerald-50
            finalTotalRow.style.borderTop = "2px solid #34d399";
            finalTotalRow.style.fontWeight = "bold";

            // Include leading <td> since 'Cut Time' rowspan DOES NOT stretch this far
            finalTotalRow.innerHTML = `
                <td></td>
                <td colspan="7" style="text-align: left; padding-left: 1.5rem !important;"><a href="/Home/PendingCartons" style="font-weight: 800; color: #059669; text-decoration: none;">Grand Total:</a></td>
                <td class="text-right pr-md-3"><strong style="color: #0f172a;">${grandPending.toLocaleString()}</strong></td>
                <td class="text-right pr-md-3"><strong style="color: #475569;">${grandPicked.toLocaleString()}</strong></td>
                <td class="text-right pr-md-3"><strong style="color: #475569;">${grandAll.toLocaleString()}</strong></td>
                <td></td>
                <td></td>
            `;
            tbody.appendChild(finalTotalRow);
        }

        modifyDetailsButtons();
        renderSettingsPanel();

        const wrapperFlex = document.getElementById("hub-settings-panel")?.parentNode;
        if (wrapperFlex) generateKPIWidgets(wrapperFlex);

        updateAllCountdowns();
        countdownInterval = setInterval(updateAllCountdowns, 30000);
    }

    function setupPageLayout(table) {
        if (document.getElementById('hub-settings-panel')) return;
        const originalParent = table.parentNode;
        const wrapperFlex = document.createElement("div");
        wrapperFlex.id = "main-layout-flex-wrapper";
        wrapperFlex.style.display = "flex"; wrapperFlex.style.alignItems = "flex-start"; wrapperFlex.style.gap = "14px"; wrapperFlex.style.width = "100%";

        const tableContainer = document.createElement("div");
        tableContainer.style.flex = "1 1 auto"; tableContainer.style.minWidth = "0"; tableContainer.style.overflowX = "auto"; tableContainer.style.display = "flex"; tableContainer.style.flexDirection = "column";

        const panelContainer = document.createElement("div");
        panelContainer.id = "hub-settings-panel";
        panelContainer.style.flex = "0 0 286px"; panelContainer.style.minWidth = "240px";
        panelContainer.style.position = "sticky"; panelContainer.style.top = "8px"; panelContainer.style.boxSizing = "border-box"; panelContainer.style.alignSelf = "flex-start";

        originalParent.insertBefore(wrapperFlex, table);
        tableContainer.appendChild(table);
        wrapperFlex.appendChild(tableContainer);
        wrapperFlex.appendChild(panelContainer);
    }

    function escapeHTML(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    function getScanTimestamp(timeStr) {
        if (!timeStr || timeStr === '--' || timeStr === 'Unknown') return 0;
        let ts = new Date(timeStr).getTime();
        if (isNaN(ts) || new Date(ts).getFullYear() < 2020) {
            ts = new Date(`${new Date().getFullYear()}/${timeStr}`).getTime();
        }
        return isNaN(ts) ? 0 : ts;
    }
    function getBatchDetailTimestamp(timeStr) {
        const parsed = getScanTimestamp(timeStr);
        if (parsed) return parsed;

        const match = String(timeStr || '').trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) return 0;

        const month = Number(match[1]);
        const day = Number(match[2]);
        const yearPart = match[3] ? Number(match[3]) : new Date().getFullYear();
        const year = yearPart < 100 ? yearPart + 2000 : yearPart;
        let hour = Number(match[4]);
        const minute = Number(match[5]);
        const second = Number(match[6] || 0);
        const meridiem = String(match[7] || '').toUpperCase();
        if (meridiem && hour <= 12) hour = (hour % 12) + (meridiem === 'PM' ? 12 : 0);
        if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return 0;

        const date = new Date(year, month - 1, day, hour, minute, second);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return 0;
        return date.getTime();
    }
    function bindShortLocationBatchLinks(iframe) {
        const doc = iframe?.contentDocument;
        if (!doc) return;
        const viewer = doc.getElementById('batchViewer');
        const frame = doc.getElementById('batchViewerFrame');
        const viewerTitle = doc.getElementById('batchViewerTitle');
        const closeButton = doc.getElementById('closeBatchViewer');
        if (!viewer || !frame || viewer.dataset.shortLinksBound === 'true') return;
        viewer.dataset.shortLinksBound = 'true';
        let savedScrollTop = 0;
        const close = () => {
            viewer.classList.remove('open');
            frame.src = 'about:blank';
            doc.body.style.overflow = '';
            iframe.contentWindow?.requestAnimationFrame(() => iframe.contentWindow?.scrollTo(0, savedScrollTop));
        };
        const normalize = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const highlightShortRows = (location, carton) => {
            try {
                const batchDoc = frame.contentDocument;
                if (!batchDoc?.body) return false;
                const targetLocation = normalize(location);
                const targetCarton = normalize(carton);
                const rows = Array.from(batchDoc.querySelectorAll('table tbody tr'));
                const locationRows = rows.filter(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    return cells.some(cell => normalize(cell.textContent) === targetLocation);
                });
                const cartonRow = targetCarton ? locationRows.find(row => Array.from(row.querySelectorAll('td')).some(cell => normalize(cell.textContent) === targetCarton)) : null;
                const focusRow = cartonRow || locationRows[0];
                if (!focusRow) return false;
                locationRows.forEach(row => {
                    row.style.setProperty('outline', '2px solid #f59e0b', 'important');
                    row.style.setProperty('outline-offset', '-2px', 'important');
                    row.style.setProperty('box-shadow', 'inset 5px 0 0 #f59e0b', 'important');
                    row.querySelectorAll('td').forEach(cell => cell.style.setProperty('background-color', '#fef3c7', 'important'));
                });
                const win = frame.contentWindow;
                const center = () => {
                    const rect = focusRow.getBoundingClientRect();
                    const top = Math.max(0, win.scrollY + rect.top - (win.innerHeight / 2) + (rect.height / 2));
                    win.scrollTo({ top, behavior: 'auto' });
                };
                center();
                [250,700,1400].forEach(delay => setTimeout(center, delay));
                batchDoc.getElementById('tm-short-location-banner')?.remove();
                const banner = batchDoc.createElement('div');
                banner.id = 'tm-short-location-banner';
                banner.textContent = `Highlighted short location: ${location}${carton ? ` • Carton ${carton}` : ''}`;
                banner.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;background:#92400e;color:#fff;padding:8px 14px;border-radius:4px;font:700 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.24);';
                batchDoc.body.appendChild(banner);
                setTimeout(() => banner.remove(), 5500);
                return true;
            } catch (e) { return false; }
        };
        doc.addEventListener('click', event => {
            const link = event.target.closest('.short-batch-link');
            if (!link) return;
            event.preventDefault();
            event.stopPropagation();
            const batchId = String(link.dataset.batchId || '').trim();
            const batchUrl = String(link.dataset.batchUrl || '').trim();
            const location = String(link.dataset.location || '').trim();
            const carton = String(link.dataset.carton || '').trim();
            if (!batchId || !batchUrl) return;
            savedScrollTop = iframe.contentWindow?.scrollY || doc.documentElement.scrollTop || 0;
            if (viewerTitle) viewerTitle.textContent = `Batch #${batchId} • Short Location ${location}`;
            frame.onload = () => {
                applyBatchDetailIframeTheme(frame);
                let attempts = 0;
                const timer = setInterval(() => {
                    attempts++;
                    if (highlightShortRows(location, carton) || attempts >= 20) clearInterval(timer);
                }, 150);
            };
            frame.src = batchUrl;
            viewer.classList.add('open');
            doc.body.style.overflow = 'hidden';
        }, true);
        closeButton?.addEventListener('click', event => { event.preventDefault(); close(); });
        viewer.addEventListener('click', event => { if (event.target === viewer) close(); });
        doc.addEventListener('keydown', event => { if (event.key === 'Escape' && viewer.classList.contains('open')) close(); });
    }

    function bindAssociateIntelligenceFilters(iframe) {
        const doc = iframe?.contentDocument;
        if (!doc || !doc.getElementById('statusFilter')) return;
        const rows = Array.from(doc.querySelectorAll('tbody tr[data-cartons]'));
        const status = doc.getElementById('statusFilter');
        const minCartons = doc.getElementById('minCartons');
        const area = doc.getElementById('areaFilter');
        const shorts = doc.getElementById('shortsOnly');
        const sort = doc.getElementById('sortFilter');
        const reset = doc.getElementById('resetFilters');
        const search = doc.getElementById('q');
        const visible = doc.getElementById('visible');
        const filteredTotals = doc.getElementById('filteredTotals');
        const areaColumnIndex = { floor:5, calendars:6, 'pick-to-belt':7, reserve:8, 'unit-pick':9 };
        const sortColumnIndex = { 'floor-desc':5, 'calendars-desc':6, 'ptb-desc':7, 'reserve-desc':8, 'unit-desc':9 };
        const numberAt = (row, index) => Number(String(row.children[index]?.textContent || '0').replace(/,/g,'')) || 0;
        const apply = () => {
            const selectedStatus = String(status?.value || 'all');
            const minimum = Number(minCartons?.value || 0);
            const selectedArea = String(area?.value || 'all');
            const onlyShorts = !!shorts?.checked;
            const query = String(search?.value || '').trim().toLocaleLowerCase();
            let shown = 0;
            const totals = [0,0,0,0,0,0];
            rows.forEach(row => {
                const areaIndex = areaColumnIndex[selectedArea];
                const matches =
                    (selectedStatus === 'all' || row.dataset.status === selectedStatus) &&
                    Number(row.dataset.cartons || 0) >= minimum &&
                    (selectedArea === 'all' || numberAt(row, areaIndex) > 0) &&
                    (!onlyShorts || Number(row.dataset.shorts || 0) > 0) &&
                    (!query || row.innerText.toLocaleLowerCase().includes(query));
                row.hidden = !matches;
                row.style.setProperty('display', matches ? 'table-row' : 'none', 'important');
                if (matches) {
                    shown++;
                    totals[0] += numberAt(row,4);
                    totals[1] += numberAt(row,5);
                    totals[2] += numberAt(row,6);
                    totals[3] += numberAt(row,7);
                    totals[4] += numberAt(row,8);
                    totals[5] += numberAt(row,9);
                }
            });
            const tbody = doc.querySelector('tbody');
            if (tbody) {
                rows.slice().sort((a,b) => {
                    const mode = sort?.value || 'total-desc';
                    if (mode === 'name') return a.children[1].innerText.localeCompare(b.children[1].innerText);
                    if (mode === 'activity') return ['active','recent','stale'].indexOf(a.dataset.status)-['active','recent','stale'].indexOf(b.dataset.status);
                    if (mode === 'gap-total') return Number(b.dataset.gapTotal || 0)-Number(a.dataset.gapTotal || 0) || a.children[1].innerText.localeCompare(b.children[1].innerText);
                    const column = sortColumnIndex[mode] || 4;
                    return numberAt(b,column)-numberAt(a,column) || a.children[1].innerText.localeCompare(b.children[1].innerText);
                }).forEach(row => tbody.appendChild(row));
            }
            const totalIds = ['visibleTotalPicked','visibleFloor','visibleCalendars','visiblePTB','visibleReserve','visibleUnit'];
            totalIds.forEach((id,index) => { const cell=doc.getElementById(id); if(cell) cell.textContent=totals[index].toLocaleString(); });
            if (visible) visible.textContent = `${shown} / ${rows.length} rows`;
            if (filteredTotals) filteredTotals.textContent = `Visible picked: ${totals[0].toLocaleString()}`;
        };
        [status, area, shorts, sort].forEach(control => control?.addEventListener('change', apply));
        minCartons?.addEventListener('input', apply);
        minCartons?.addEventListener('change', apply);
        search?.addEventListener('input', apply);
        reset?.addEventListener('click', event => {
            event.preventDefault();
            if(status) status.value='all';
            if(minCartons) minCartons.value='0';
            if(area) area.value='all';
            if(shorts) shorts.checked=false;
            if(sort) sort.value='total-desc';
            if(search) search.value='';
            apply();
        });

        const viewer = doc.getElementById('batchViewer');
        const frame = doc.getElementById('batchViewerFrame');
        const viewerTitle = doc.getElementById('batchViewerTitle');
        const closeViewerButton = doc.getElementById('closeBatchViewer');
        let savedScrollTop = 0;
        const closeNestedBatch = () => {
            if (!viewer || !frame) return;
            viewer.classList.remove('open');
            frame.src = 'about:blank';
            doc.body.style.overflow = '';
            iframe.contentWindow?.requestAnimationFrame(() => iframe.contentWindow?.scrollTo(0, savedScrollTop));
        };
        doc.addEventListener('click', event => {
            const link = event.target.closest('.last-pick-link');
            if (!link) return;
            event.preventDefault();
            event.stopPropagation();
            const batchId = String(link.dataset.batchId || '').trim();
            const batchUrl = String(link.dataset.batchUrl || '').trim();
            if (!batchId || !batchUrl || !viewer || !frame) return;
            savedScrollTop = iframe.contentWindow?.scrollY || doc.documentElement.scrollTop || 0;
            if (viewerTitle) viewerTitle.textContent = `Batch #${batchId} • Last Pick Detail`;
            frame.src = batchUrl;
            viewer.classList.add('open');
            doc.body.style.overflow = 'hidden';
        }, true);
        closeViewerButton?.addEventListener('click', event => { event.preventDefault(); closeNestedBatch(); });
        viewer?.addEventListener('click', event => { if (event.target === viewer) closeNestedBatch(); });
        doc.addEventListener('keydown', event => { if (event.key === 'Escape' && viewer?.classList.contains('open')) closeNestedBatch(); });
        const normalizeAssociate = value => String(value || '').trim().toLocaleLowerCase();
        const parseAssociateBatchRows = (htmlText, associateName, batchMeta) => {
            const parsedDoc = new DOMParser().parseFromString(htmlText, 'text/html');
            const results = [];
            parsedDoc.querySelectorAll('table').forEach(table => {
                const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
                if (!headerRow) return;
                const headers = Array.from(headerRow.querySelectorAll('th,td')).map(cell => cell.textContent.trim().toLocaleLowerCase());
                const headerIndex = (...terms) => headers.findIndex(header => terms.some(term => header === term || header.includes(term)));
                let cartonIndex = headerIndex('carton','ticket','barcode','license plate','lpn');
                let locationIndex = headerIndex('location');
                let statusIndex = headerIndex('status');
                let pickerIndex = headerIndex('picker','associate');
                let timeIndex = headerIndex('picked time','pick time','time','timestamp');
                const rows = Array.from(table.querySelectorAll('tbody tr'));
                const sampleCount = rows.find(row => row.querySelectorAll('td').length >= 9)?.querySelectorAll('td').length || 0;
                if (sampleCount >= 9) {
                    if (cartonIndex < 0) cartonIndex = 2;
                    if (locationIndex < 0) locationIndex = 5;
                    if (statusIndex < 0) statusIndex = 6;
                    if (pickerIndex < 0) pickerIndex = 7;
                    if (timeIndex < 0) timeIndex = 8;
                }
                if ([cartonIndex,locationIndex,statusIndex,pickerIndex].some(index => index < 0)) return;
                rows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    if (cells.length <= Math.max(cartonIndex,locationIndex,statusIndex,pickerIndex)) return;
                    const picker = String(cells[pickerIndex]?.textContent || '').trim();
                    if (normalizeAssociate(picker) !== normalizeAssociate(associateName)) return;
                    const status = String(cells[statusIndex]?.textContent || '').trim().replace(/\s+/g,' ');
                    const normalizedStatus = status.toLocaleLowerCase();
                    const isCompleted = normalizedStatus.includes('picking complete');
                    const isShort = normalizedStatus === 'picking' || normalizedStatus.includes('short');
                    if (!isCompleted && !isShort) return;
                    const carton = String(cells[cartonIndex]?.textContent || '').trim();
                    if (!carton) return;
                    const timeText = String(cells[timeIndex]?.textContent || '').trim();
                    results.push({
                        batchId:batchMeta.batchId,
                        batchUrl:batchMeta.batchUrl,
                        carton,
                        hub:batchMeta.hub,
                        location:String(cells[locationIndex]?.textContent || 'Unknown').trim(),
                        area:batchMeta.area,
                        status,
                        timeStr:timeText,
                        ts:getScanTimestamp(timeText)
                    });
                });
            });
            return results;
        };
        const renderAssociateDrawer = (detailFrame, name, items, progressText = '', navigation = {}) => {
            const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            const rows = items.map((item,index) => `<tr data-search="${esc(`${item.batchId} ${item.carton} ${item.hub} ${item.location} ${item.area} ${item.status}`.toLocaleLowerCase())}"><td>${index+1}</td><td>${esc(item.batchId)}</td><td class="carton">${esc(item.carton)}</td><td>${esc(item.status)}</td><td>${esc(item.hub)}</td><td>${esc(item.location)}</td><td>${esc(item.area)}</td><td>${esc(item.timeStr || '--')}</td><td><a href="${esc(item.batchUrl.split('#')[0])}#tm-carton=${encodeURIComponent(item.carton)}" target="_blank">Open / Reprint</a></td></tr>`).join('');
            detailFrame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f8fafc;color:#0f172a;font:11px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial}.head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;padding:10px;background:#0f172a;color:#fff}.head strong{font-size:13px}.head input,.head select{height:29px;border:1px solid #64748b;border-radius:4px;padding:4px 7px}.head input{flex:1}.head button{height:29px;border:1px solid #93c5fd;border-radius:4px;background:#2563eb;color:#fff;font-weight:800;cursor:pointer}.count{margin-left:auto;font-weight:800}.progress{padding:7px 10px;background:#dbeafe;color:#1d4ed8;font-weight:800}table{width:100%;border-collapse:collapse}th{position:sticky;top:49px;background:#e2e8f0;color:#475569;text-transform:uppercase;font-size:9px;padding:7px;text-align:center}td{padding:7px;border-bottom:1px solid #e2e8f0;text-align:center}tbody tr:nth-child(even){background:#fff}.carton{font-family:Consolas,monospace}a{display:inline-block;padding:4px 7px;border-radius:4px;background:#2563eb;color:#fff;text-decoration:none;font-weight:800}.empty{padding:35px;text-align:center;color:#64748b}</style></head><body><div class="head"><strong>${esc(name)} • Completed / Short Cartons</strong><input id="search" placeholder="Search carton, batch, hub, location, status or area"><select id="area"><option value="all">All areas</option><option>Floor</option><option>Calendars</option><option>Pick to Belt</option><option>Reserve</option><option>Unit Pick</option></select><span class="count" id="count"></span><button id="close">Close Drawer</button></div>${progressText?`<div class="progress">${esc(progressText)}</div>`:''}${items.length?`<table><thead><tr><th>#</th><th>Batch</th><th>Carton</th><th>Status</th><th>Hub</th><th>Location</th><th>Area</th><th>Picked Time</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">No completed or short cartons were found for this associate in the associated batches.</div>'}<script>const rows=[...document.querySelectorAll('tbody tr')],q=document.getElementById('search'),a=document.getElementById('area'),c=document.getElementById('count');function f(){const x=(q?.value||'').toLowerCase(),area=a?.value||'all';let n=0;rows.forEach(r=>{const ok=(!x||r.dataset.search.includes(x))&&(area==='all'||r.children[6].textContent===area);r.style.display=ok?'':'none';if(ok)n++});if(c)c.textContent=n+' / '+rows.length}q?.addEventListener('input',f);a?.addEventListener('change',f);document.getElementById('close').onclick=()=>parent.postMessage({type:'close-associate-drawer'},'*');f();<\/script></body></html>`;
            detailFrame.onload = () => {
                const drawerDoc = detailFrame.contentDocument;
                if (drawerDoc.querySelector('.timeline')) return;
                const operationalWindow = associateIntelReportWindow || getOperationalDayWindow();
                const timelineEvents = items.filter(item => item.ts >= operationalWindow.start && item.ts < operationalWindow.end && String(item.status || '').toLocaleLowerCase().includes('picking complete')).sort((a,b) => a.ts - b.ts);
                const gaps = timelineEvents.slice(1).map((item,index) => Math.max(0, (item.ts - timelineEvents[index].ts) / 60000));
                const longestGap = gaps.length ? Math.max(...gaps) : 0;
                const averageGap = gaps.length ? gaps.reduce((sum,gap) => sum + gap, 0) / gaps.length : 0;
                const observedSpan = timelineEvents.length > 1 ? (timelineEvents[timelineEvents.length - 1].ts - timelineEvents[0].ts) / 60000 : 0;
                const gapLabel = minutes => minutes < 1 ? '<1m' : minutes < 60 ? `${Math.round(minutes)}m` : `${Math.floor(minutes/60)}h ${Math.round(minutes%60)}m`;
                const renderTimelineEvent = item => `<div class="timeline-event"><span class="timeline-dot"></span><div><strong>${esc(item.timeStr || new Date(item.ts).toLocaleString())}</strong><span>${esc(item.location || 'Unknown')} · ${esc(item.area || 'Unknown')} · Carton ${esc(item.carton || 'Unknown')} · Batch ${esc(item.batchId)}</span></div></div>`;
                const timelineRows = timelineEvents.map((item,index) => {
                    const gap = index ? Math.max(0, (item.ts - timelineEvents[index - 1].ts) / 60000) : 0;
                    const width = longestGap > 0 ? Math.max(8, Math.round(gap / longestGap * 100)) : 0;
                    const gapHtml = index ? `<div class="scan-gap ${gap >= 15 ? 'long-gap' : ''}"><span class="gap-track"><i style="width:${width}%"></i></span><strong>${gapLabel(gap)} between scans</strong></div>` : '';
                    return `${gapHtml}${renderTimelineEvent(item)}`;
                }).join('');
                const gapCases = timelineEvents.slice(1).map((item,index) => {
                    const previous = timelineEvents[index];
                    const gap = Math.max(0, (item.ts - previous.ts) / 60000);
                    const width = longestGap > 0 ? Math.max(8, Math.round(gap / longestGap * 100)) : 0;
                    return {
                        minutes:gap,
                        start:previous,
                        end:item,
                        html:`<article class="gap-case ${gap >= 15 ? 'long-gap' : ''}">${renderTimelineEvent(previous)}<div class="scan-gap ${gap >= 15 ? 'long-gap' : ''}"><span class="gap-track"><i style="width:${width}%"></i></span><strong>${gapLabel(gap)} between scans</strong></div>${renderTimelineEvent(item)}</article>`
                    };
                });
                const averageGapLabel = gaps.length ? gapLabel(averageGap) : '--';
                const longestGapLabel = gaps.length ? gapLabel(longestGap) : '--';
                const timeline = `<section class="timeline"><div class="timeline-head"><div><strong>Pick timeline</strong><span>Completed pick scans in time order</span></div><div class="timeline-metrics"><span><b>${gapLabel(observedSpan)}</b> observed span</span><span><b>${averageGapLabel}</b> average scan gap</span><span><b>${longestGapLabel}</b> longest scan gap</span></div></div><div class="timeline-controls"><label for="timelineGapFilter">Focus gaps<select id="timelineGapFilter"><option value="0">All scans</option><option value="5">5+ min</option><option value="10">10+ min</option><option value="15">15+ min</option><option value="30">30+ min</option><option value="60">60+ min</option></select></label><span id="timelineGapCount"></span></div><p>Intervals show time between recorded scans, not confirmed idle time. Travel, work, breaks, or missing scans may contribute.</p><div class="timeline-list" id="timelineList">${timelineEvents.length ? timelineRows : '<div class="empty">No completed pick timestamps are available for this associate.</div>'}</div></section>`;
                const style = drawerDoc.createElement('style');
                style.textContent = '.timeline{padding:12px 16px;background:#fff;border-bottom:1px solid #cbd5e1}.timeline-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.timeline-head>div:first-child{display:grid;gap:3px}.timeline-head>div:first-child strong{font-size:13px}.timeline-head>div:first-child span,.timeline p{color:#64748b}.timeline-metrics{display:flex;gap:16px;flex-wrap:wrap}.timeline-metrics span{display:grid;gap:2px;color:#64748b;font-size:9px;text-transform:uppercase}.timeline-metrics b{color:#0f172a;font-size:13px;font-variant-numeric:tabular-nums}.timeline p{margin:8px 0;font-size:10px}.timeline-list{border-left:2px solid #cbd5e1;margin:8px 0 2px 7px;padding-left:13px}.timeline-event{position:relative;display:flex;align-items:flex-start;gap:8px;padding:5px 0}.timeline-dot{position:absolute;left:-20px;top:9px;width:10px;height:10px;border:2px solid #fff;border-radius:50%;background:#16a34a;box-shadow:0 0 0 1px #15803d}.timeline-event div{display:grid;gap:3px}.timeline-event div strong{font-size:10px}.timeline-event div span{color:#475569}.scan-gap{display:flex;align-items:center;gap:9px;padding:4px 0;color:#475569}.gap-track{width:clamp(45px,12vw,110px);height:5px;background:#e2e8f0;border-radius:5px;overflow:hidden}.gap-track i{display:block;height:100%;background:#0ea5e9;border-radius:5px}.scan-gap.long-gap{color:#b45309}.scan-gap.long-gap .gap-track i{background:#f59e0b}.scan-gap strong{font-size:9px;font-variant-numeric:tabular-nums}@media(max-width:700px){.timeline-head{align-items:flex-start;flex-direction:column}.timeline-metrics{gap:10px}.timeline-metrics span{min-width:90px}}';
                style.textContent += '.timeline-controls{display:flex;align-items:center;gap:10px;margin-top:10px}.timeline-controls label{display:flex;align-items:center;gap:7px;color:#475569;font-size:10px;font-weight:800;text-transform:uppercase}.timeline-controls select{height:28px;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;color:#0f172a;padding:3px 7px;font-size:11px;font-weight:700}.timeline-controls>span{color:#64748b;font-size:10px;font-weight:700}.gap-case{margin:8px 0;padding:6px 10px;border:1px solid #e2e8f0;border-left:3px solid #94a3b8;border-radius:4px;background:#fff}.gap-case.long-gap{border-left-color:#f59e0b;background:#fffbeb}.gap-case .timeline-list{margin:0;border:0;padding:0}.gap-case .timeline-dot{background:#2563eb;box-shadow:0 0 0 1px #1d4ed8}.gap-case.long-gap .timeline-dot{background:#d97706;box-shadow:0 0 0 1px #b45309}.head #expandAssociateDrawer{height:29px;flex:0 0 auto;border:1px solid #93c5fd;border-radius:4px;background:#1e293b;color:#fff;padding:0 9px;font-size:10px;font-weight:800;cursor:pointer}@media(max-width:700px){.timeline-controls{align-items:flex-start;flex-direction:column}.gap-case{padding:5px 7px}}';
                style.textContent += '.timeline-controls input[type=range]{width:min(240px,52vw);height:22px;accent-color:#2563eb}.timeline-controls output{min-width:55px;color:#0f172a;font-size:10px;font-variant-numeric:tabular-nums}.head button:disabled{opacity:.45;cursor:default}';
                drawerDoc.head.appendChild(style);
                drawerDoc.querySelector('.head')?.insertAdjacentHTML('afterend', timeline);
                const timelineList = drawerDoc.getElementById('timelineList');
                const gapFilter = drawerDoc.createElement('input');
                gapFilter.id = 'timelineGapFilter';
                gapFilter.type = 'range';
                gapFilter.min = '0';
                gapFilter.max = '180';
                gapFilter.step = '1';
                gapFilter.setAttribute('aria-label', 'Minimum scan gap in minutes');
                let savedGapThreshold = 0;
                try { savedGapThreshold = Number(localStorage.getItem('__associate_gap_focus_minutes')) || 0; }
                catch (e) { savedGapThreshold = 0; }
                gapFilter.value = String(Math.max(0, Math.min(180, savedGapThreshold)));
                drawerDoc.getElementById('timelineGapFilter')?.replaceWith(gapFilter);
                const gapFilterLabel = gapFilter.closest('label');
                const gapThresholdValue = drawerDoc.createElement('output');
                gapThresholdValue.id = 'timelineGapThresholdValue';
                gapFilterLabel?.appendChild(gapThresholdValue);
                const gapCount = drawerDoc.getElementById('timelineGapCount');
                const applyGapFilter = () => {
                    const minimum = Number(gapFilter?.value || 0);
                    const visibleGaps = gapCases.filter(gap => gap.minutes >= minimum);
                    if (gapThresholdValue) gapThresholdValue.textContent = minimum ? `${minimum}+ min` : 'All';
                    if (gapCount) gapCount.textContent = `${visibleGaps.length} / ${gapCases.length} intervals`;
                    if (!timelineList) return;
                    timelineList.classList.toggle('gap-focus', minimum > 0);
                    timelineList.innerHTML = minimum > 0
                        ? visibleGaps.map(gap => gap.html).join('') || '<div class="empty">No scan gaps meet this threshold.</div>'
                        : timelineEvents.length ? timelineRows : '<div class="empty">No completed pick timestamps are available for this associate.</div>';
                };
                gapFilter.addEventListener('input', () => {
                    try { localStorage.setItem('__associate_gap_focus_minutes', gapFilter.value); }
                    catch (e) { console.warn('Could not save timeline gap threshold', e); }
                    applyGapFilter();
                });
                applyGapFilter();
                const header = drawerDoc.querySelector('.head');
                const searchInput = drawerDoc.getElementById('search');
                const navigationLabel = drawerDoc.createElement('span');
                navigationLabel.className = 'associate-nav-count';
                navigationLabel.textContent = `${navigation.index || 1} / ${navigation.count || 1}`;
                const previousButton = drawerDoc.createElement('button');
                previousButton.type = 'button';
                previousButton.textContent = 'Previous';
                previousButton.disabled = !navigation.hasPrevious;
                previousButton.title = navigation.previousName ? `Previous: ${navigation.previousName}` : 'No previous associate';
                previousButton.addEventListener('click', () => navigation.onNavigate?.('previous'));
                const nextButton = drawerDoc.createElement('button');
                nextButton.type = 'button';
                nextButton.textContent = 'Next';
                nextButton.disabled = !navigation.hasNext;
                nextButton.title = navigation.nextName ? `Next: ${navigation.nextName}` : 'No next associate';
                nextButton.addEventListener('click', () => navigation.onNavigate?.('next'));
                const printButton = drawerDoc.createElement('button');
                printButton.type = 'button';
                printButton.textContent = 'Print gaps / PDF';
                printButton.title = 'Print a compact review of significant gaps; choose Save as PDF in the print dialog';
                printButton.addEventListener('click', () => {
                    const minimum = Math.max(5, Number(gapFilter.value) || 0);
                    const reportGaps = gapCases.filter(gap => gap.minutes >= minimum).sort((a,b) => b.minutes-a.minutes);
                    const printEscape = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
                    const printRows = reportGaps.map((gap,index) => `<tr><td>${index+1}</td><td><strong>${gapLabel(gap.minutes)}</strong></td><td>${printEscape(gap.start.timeStr || new Date(gap.start.ts).toLocaleString())}<br>${printEscape(gap.start.location || 'Unknown')}</td><td>${printEscape(gap.end.timeStr || new Date(gap.end.ts).toLocaleString())}<br>${printEscape(gap.end.location || 'Unknown')}</td><td>${printEscape(gap.start.carton || '--')} → ${printEscape(gap.end.carton || '--')}</td><td>${printEscape(gap.end.batchId)}</td></tr>`).join('');
                    const totalGapMinutes = gaps.reduce((sum,gap) => sum + gap, 0);
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    printWindow.document.open();
                    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${printEscape(name)} - Pick Gap Review</title><style>*{box-sizing:border-box}body{margin:0;padding:18px;color:#172033;font:12px Arial,sans-serif}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #172033;padding-bottom:10px}.top h1{margin:0;font-size:20px}.top p{margin:4px 0 0;color:#596579}.metrics{display:flex;gap:18px;margin:12px 0}.metric{padding:7px 10px;background:#f1f5f9;border-left:3px solid #2563eb}.metric b{display:block;font-size:15px}.metric span{color:#596579;font-size:9px;text-transform:uppercase}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#e8edf3;text-align:left;text-transform:uppercase;font-size:9px}th,td{padding:6px 7px;border-bottom:1px solid #d7dee8;vertical-align:top}tbody tr:nth-child(even){background:#f8fafc}.note{margin-top:10px;color:#596579;font-size:10px}.empty{padding:20px;text-align:center;border:1px solid #d7dee8;color:#596579}@page{size:landscape;margin:10mm}@media print{body{padding:0}.top,.metric,thead,tr{break-inside:avoid}}</style></head><body><header class="top"><div><h1>${printEscape(name)} · Pick Gap Review</h1><p>${new Date().toLocaleDateString()} · ${reportGaps.length} gaps of ${minimum}+ minutes</p></div><strong>Completed pick scans</strong></header><section class="metrics"><div class="metric"><b>${timelineEvents.length.toLocaleString()}</b><span>Recorded picks</span></div><div class="metric"><b>${gapLabel(observedSpan)}</b><span>Observed span</span></div><div class="metric"><b>${gapLabel(totalGapMinutes)}</b><span>Total scan gap time</span></div><div class="metric"><b>${gapLabel(longestGap)}</b><span>Longest gap</span></div></section>${reportGaps.length ? `<table><thead><tr><th>#</th><th>Gap</th><th>Previous pick</th><th>Next pick</th><th>Cartons</th><th>Batch</th></tr></thead><tbody>${printRows}</tbody></table>` : '<div class="empty">No scan gaps meet this threshold.</div>'}<p class="note">A scan gap is time between recorded completed picks, not proof of inactivity. Travel, other work, breaks, or missing scans can contribute.</p></body></html>`);
                    printWindow.document.close();
                    printWindow.focus();
                    printWindow.print();
                });
                drawerDoc.addEventListener('keydown', event => {
                    if (!['ArrowLeft','ArrowRight'].includes(event.key) || event.target.closest('input,select,textarea')) return;
                    event.preventDefault();
                    navigation.onNavigate?.(event.key === 'ArrowLeft' ? 'previous' : 'next');
                });
                const closeButton = drawerDoc.getElementById('close');
                if (closeButton) closeButton.textContent = 'Close';
                header?.insertBefore(previousButton, searchInput);
                header?.insertBefore(navigationLabel, searchInput);
                header?.insertBefore(nextButton, searchInput);
                header?.insertBefore(printButton, closeButton);
            };
        };
        let activeAssociateRow = null;
        let associateLoadToken = 0;
        const visibleAssociateRows = () => Array.from(doc.querySelectorAll('tbody tr.associate-click-row'))
            .filter(row => !row.hidden && row.style.display !== 'none');
        const getAssociateNavigation = row => {
            const orderedRows = visibleAssociateRows();
            const index = orderedRows.indexOf(row);
            const nameForRow = target => {
                const targetKey = String(target?.dataset.associateKey || '').toLocaleLowerCase();
                return associateIntelDetailData.get(targetKey)?.name || targetKey;
            };
            return {
                index:index + 1,
                count:orderedRows.length,
                hasPrevious:index > 0,
                hasNext:index >= 0 && index < orderedRows.length - 1,
                previousName:index > 0 ? nameForRow(orderedRows[index - 1]) : '',
                nextName:index >= 0 && index < orderedRows.length - 1 ? nameForRow(orderedRows[index + 1]) : ''
            };
        };
        const navigateAssociate = direction => {
            const orderedRows = visibleAssociateRows();
            const currentIndex = orderedRows.indexOf(activeAssociateRow);
            const nextIndex = currentIndex + (direction === 'previous' ? -1 : 1);
            if (currentIndex >= 0 && nextIndex >= 0 && nextIndex < orderedRows.length) {
                openAssociateFullView(orderedRows[nextIndex]);
            }
        };
        const openAssociateFullView = async parentRow => {
            const key = String(parentRow.dataset.associateKey || '').toLocaleLowerCase();
            const payload = associateIntelDetailData.get(key) || {name:key,batches:[]};
            const name = payload.name || key;
            const detailFrame = doc.querySelector('.associate-detail-frame') || doc.createElement('iframe');
            const loadToken = ++associateLoadToken;
            detailFrame.title = `${name} full-screen pick intelligence`;
            doc.querySelectorAll('.associate-click-row.drawer-open').forEach(row => row.classList.remove('drawer-open'));
            activeAssociateRow = parentRow;
            parentRow.classList.add('drawer-open');
            if (!detailFrame.isConnected) {
                detailFrame.className = 'associate-detail-frame';
                detailFrame.title = `${name} full-screen pick intelligence`;
                detailFrame.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100vw;height:100vh;border:0;background:#fff;';
                detailFrame.dataset.previousBodyOverflow = doc.body.style.overflow;
                doc.body.appendChild(detailFrame);
                doc.body.style.overflow = 'hidden';
            }
            const navigation = { ...getAssociateNavigation(parentRow), onNavigate: navigateAssociate };
            renderAssociateDrawer(detailFrame, name, [], `Loading 0 of ${payload.batches.length} associated batches...`, navigation);
            const combined = [];
            const seen = new Set();
            let loaded = 0;
            if (associateIntelHistorical) {
                const saved = (payload.cachedDetails || []).slice().sort((a,b) => String(a.batchId).localeCompare(String(b.batchId),undefined,{numeric:true}) || a.ts-b.ts);
                renderAssociateDrawer(detailFrame, name, saved, '', navigation);
                return;
            }
            for (const batch of payload.batches) {
                if (loadToken !== associateLoadToken) return;
                try {
                    const response = await fetch(batch.batchUrl.split('#')[0]);
                    const htmlText = await response.text();
                    if (loadToken !== associateLoadToken) return;
                    parseAssociateBatchRows(htmlText, name, batch).forEach(item => {
                        const uniqueKey = `${item.batchId}|${item.carton}|${item.status}`;
                        if (!seen.has(uniqueKey)) { seen.add(uniqueKey); combined.push(item); }
                    });
                } catch (error) { console.warn(`Could not load Batch ${batch.batchId} for ${name}`, error); }
                loaded++;
                combined.sort((a,b) => String(a.batchId).localeCompare(String(b.batchId),undefined,{numeric:true}) || a.ts-b.ts || a.carton.localeCompare(b.carton));
                renderAssociateDrawer(detailFrame, name, combined, loaded < payload.batches.length ? `Loading ${loaded} of ${payload.batches.length} associated batches...` : '', navigation);
            }
        };
        const closeAssociateFullView = () => {
            associateLoadToken++;
            const detailFrame = doc.querySelector('.associate-detail-frame');
            if (detailFrame) {
                doc.body.style.overflow = detailFrame.dataset.previousBodyOverflow || '';
                detailFrame.remove();
            }
            activeAssociateRow?.classList.remove('drawer-open');
            activeAssociateRow = null;
        };
        doc.addEventListener('click', event => {
            const parentRow = event.target.closest('tbody tr.associate-click-row');
            if (!parentRow || event.target.closest('button,a,input,select,label')) return;
            if (activeAssociateRow === parentRow) closeAssociateFullView();
            else openAssociateFullView(parentRow);
        });
        const closeDrawerMessage = event => {
            const detailFrame = doc.querySelector('.associate-detail-frame');
            if (!detailFrame) return;
            if (event.data?.type === 'close-associate-drawer') {
                closeAssociateFullView();
                return;
            }
        };
        iframe.contentWindow?.addEventListener('message', closeDrawerMessage);
        apply();
    }

    function openIntelligenceIframe(title, html, periodLabel = 'Current 2:00 AM Operational Day') {
        document.getElementById('tm-intelligence-modal')?.remove();
        const dark = document.body.classList.contains('tm-dark-mode');
        const modal = document.createElement('div');
        modal.id = 'tm-intelligence-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;padding:16px;';
        modal.innerHTML = `<div style="width:98vw;height:94vh;display:flex;flex-direction:column;overflow:hidden;border-radius:9px;background:${dark ? '#09110d' : '#fff'};box-shadow:0 24px 75px rgba(0,0,0,.4);"><div style="height:44px;flex:0 0 44px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:${dark ? '#17251d' : '#0f172a'};color:#fff;font:800 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><span>${escapeHTML(title)} • ${escapeHTML(periodLabel)}</span><button id="tmCloseIntelligence" type="button" style="border:1px solid ${dark ? '#2fc85d' : '#475569'};border-radius:4px;background:${dark ? '#123b24' : '#1e293b'};color:#fff;padding:5px 11px;font-weight:800;cursor:pointer;">Close</button></div><iframe title="${escapeHTML(title)}" style="width:100%;flex:1;border:0;background:${dark ? '#09110d' : '#f1f5f9'};"></iframe></div>`;
        document.body.appendChild(modal);
        const reportIframe = modal.querySelector('iframe');
        reportIframe.addEventListener('load', () => { bindShortLocationBatchLinks(reportIframe); bindAssociateIntelligenceFilters(reportIframe); bindBatchIntelFilters(reportIframe); });
        reportIframe.srcdoc = html;
        const close = () => modal.remove();
        modal.querySelector('#tmCloseIntelligence').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
    }

    function getIntelligenceReportShell(title, subtitle, summaryHtml, tableHtml) {
        const dark = document.body.classList.contains('tm-dark-mode');
        const bg = dark ? '#09110d' : '#f1f5f9';
        const card = dark ? '#101a14' : '#fff';
        const card2 = dark ? '#0d1912' : '#f8fafc';
        const text = dark ? '#d9eadf' : '#0f172a';
        const muted = dark ? '#a8bdb0' : '#64748b';
        const border = dark ? '#315443' : '#cbd5e1';
        const accent = dark ? '#7dd3fc' : '#2563eb';
        return `<!doctype html><html><head><meta charset="utf-8"><style>
            *{box-sizing:border-box}body{margin:0;background:${bg};color:${text};font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.wrap{padding:16px}.hero{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:12px}.hero h1{margin:0;font-size:21px}.hero p{margin:4px 0 0;color:${muted};font-size:11px}.stamp{color:${muted};font-size:10px;font-weight:700;text-align:right}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;margin-bottom:12px}.card{background:${card};border:1px solid ${border};border-radius:7px;padding:10px 12px;box-shadow:0 1px 2px rgba(0,0,0,.05)}.card span{display:block;color:${muted};font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.45px}.card strong{display:block;color:${accent};font-size:21px;line-height:1.1;margin-top:4px}.toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px;background:${card};border:1px solid ${border};border-radius:7px}.search{height:32px;flex:1;border:1px solid ${border};border-radius:5px;background:${card2};color:${text};padding:5px 9px}.count{color:${muted};font-size:10px;font-weight:800}.shell{overflow:auto;max-height:calc(100vh - 128px);background:${card};border:1px solid ${border};border-radius:7px}table{width:100%;border-collapse:collapse;white-space:nowrap}th{position:sticky;top:0;z-index:1;background:${dark ? '#17251d' : '#e2e8f0'};color:${dark ? '#9fffb0' : '#475569'};padding:8px;text-align:left;text-transform:uppercase;font-size:9px;letter-spacing:.35px;border-bottom:1px solid ${border}}td{padding:8px;border-bottom:1px solid ${border};vertical-align:top}tbody tr:nth-child(even) td{background:${card2}}tbody tr:hover td{background:${dark ? '#1a3425' : '#eff6ff'}}.name,.loc{font-weight:800;color:${accent}}.pill{display:inline-block;margin:1px 3px 1px 0;padding:2px 6px;border:1px solid ${dark ? '#3b4a55' : '#d8e0ea'};border-radius:5px;background:${dark ? '#18222b' : '#f1f5f9'};color:${dark ? '#cbd5e1' : '#334155'};font-size:9px;font-weight:750}.pill.hub{background:${dark ? '#172554' : '#eff6ff'};color:${dark ? '#bfdbfe' : '#1d4ed8'};border-color:${dark ? '#1e3a8a' : '#bfdbfe'}}.pill.zone{background:${dark ? '#312e15' : '#fffbeb'};color:${dark ? '#fde68a' : '#92400e'};border-color:${dark ? '#713f12' : '#fde68a'}}.pill.location{background:${dark ? '#27203b' : '#f5f3ff'};color:${dark ? '#ddd6fe' : '#6d28d9'};border-color:${dark ? '#5b21b6' : '#ddd6fe'}}.pill.batch{background:${dark ? '#1f2937' : '#f8fafc'};color:${dark ? '#d1d5db' : '#475569'};border-color:${dark ? '#4b5563' : '#cbd5e1'}}.short-batch-link{font:inherit;cursor:pointer}.short-batch-link:hover{color:${accent};border-color:${accent};background:${dark ? '#172554' : '#eff6ff'}}.pill.person{background:${dark ? '#164e63' : '#ecfeff'};color:${dark ? '#a5f3fc' : '#0e7490'};border-color:${dark ? '#0e7490' : '#a5f3fc'}}.warn{background:${dark ? '#451a1a' : '#fff1f2'}!important;color:${dark ? '#fecaca' : '#be123c'}!important;border-color:${dark ? '#991b1b' : '#fecdd3'}!important}.status-active{color:${dark ? '#86efac' : '#15803d'};font-weight:800}.status-warm{color:${dark ? '#fde68a' : '#a16207'};font-weight:800}.status-idle{color:${dark ? '#fca5a5' : '#b91c1c'};font-weight:800}.bar{height:5px;min-width:80px;background:${dark ? '#26343d' : '#e2e8f0'};border-radius:99px;overflow:hidden;margin-top:4px}.bar>i{display:block;height:100%;background:${accent};border-radius:99px}.metric-note{margin-top:3px;color:${muted};font-size:9px}.last-pick-link{display:inline-flex;align-items:center;gap:5px;border:0;border-bottom:1px dotted ${accent};background:transparent;color:${accent};padding:0;font:inherit;font-weight:850;cursor:pointer}.last-pick-link:hover{filter:brightness(1.15)}.last-pick-link::after{content:'BATCH';padding:1px 4px;border:1px solid ${border};border-radius:4px;color:${muted};font-size:7px;letter-spacing:.35px}.batch-viewer{position:fixed;inset:0;z-index:100;background:${dark ? 'rgba(3,10,7,.92)' : 'rgba(15,23,42,.72)'};display:none;align-items:center;justify-content:center;padding:14px}.batch-viewer.open{display:flex}.batch-window{width:98vw;height:94vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid ${border};border-radius:9px;background:${card};box-shadow:0 24px 75px rgba(0,0,0,.45)}.batch-head{height:44px;flex:0 0 44px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;background:${dark ? '#17251d' : '#0f172a'};color:#fff}.batch-head strong{font-size:12px}.batch-head span{color:${dark ? '#a8bdb0' : '#cbd5e1'};font-size:9px}.batch-close{border:1px solid ${dark ? '#496052' : '#64748b'};border-radius:4px;background:${dark ? '#123b24' : '#1e293b'};color:#fff;padding:5px 11px;font-weight:850;cursor:pointer}.batch-frame{width:100%;flex:1;border:0;background:#fff}.batch-loading{position:absolute;color:#fff;font-weight:800;pointer-events:none}.muted{color:${muted}}.details{white-space:normal;min-width:220px;line-height:1.45}.empty{padding:36px;text-align:center;color:${muted}}</style></head><body><div class="wrap"><div class="hero"><div><h1>${escapeHTML(title)}</h1><p>${escapeHTML(subtitle)}</p></div><div class="stamp">Generated ${escapeHTML(new Date().toLocaleString())}</div></div>${summaryHtml ? `<div class="cards">${summaryHtml}</div>` : ''}<div class="toolbar"><input id="q" class="search" placeholder="Search every field..."><span id="visible" class="count"></span></div><div class="shell">${tableHtml}</div></div><div id="batchViewer" class="batch-viewer"><div class="batch-window"><div class="batch-head"><div><strong id="batchViewerTitle">Batch Detail</strong><br><span>Close to return to the exact Associate Pick Intelligence position</span></div><button id="closeBatchViewer" class="batch-close" type="button">Back to Intelligence</button></div><iframe id="batchViewerFrame" class="batch-frame"></iframe></div></div><script>const q=document.getElementById('q'),rows=[...document.querySelectorAll('tbody tr')],v=document.getElementById('visible'),viewer=document.getElementById('batchViewer'),frame=document.getElementById('batchViewerFrame'),viewerTitle=document.getElementById('batchViewerTitle');let savedScroll=0;function f(){const x=q.value.trim().toLowerCase();let n=0;rows.forEach(r=>{const ok=!x||r.innerText.toLowerCase().includes(x);r.style.display=ok?'':'none';if(ok)n++});v.textContent=n+' / '+rows.length+' rows'}function openBatch(btn){savedScroll=window.scrollY;const id=btn.dataset.batchId,url=btn.dataset.batchUrl;viewerTitle.textContent='Batch #'+id+' • '+(btn.dataset.pickLabel||'Pick')+' Detail';frame.src=url;viewer.classList.add('open');document.body.style.overflow='hidden'}function closeBatch(){viewer.classList.remove('open');frame.src='about:blank';document.body.style.overflow='';requestAnimationFrame(()=>window.scrollTo(0,savedScroll))}q.addEventListener('input',f);document.addEventListener('click',e=>{const btn=e.target.closest('.last-pick-link');if(btn){e.preventDefault();openBatch(btn)}});document.getElementById('closeBatchViewer').addEventListener('click',closeBatch);viewer.addEventListener('click',e=>{if(e.target===viewer)closeBatch()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&viewer.classList.contains('open'))closeBatch()});f();<\/script></body></html>`;
    }

    function getShareableAssociateStartGroupSettings() {
        const assignments = getManualAssociateStartGroups();
        return JSON.stringify({
            type: 'AssociateStartGroups',
            version: 1,
            exportedAt: new Date().toISOString(),
            assignments: Object.fromEntries(
                Object.entries(assignments)
                    .filter(([name, group]) => name && /^(?:1[0-2]|[1-9])\s(?:AM|PM)$/i.test(String(group || '').trim()))
                    .sort((a,b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
            )
        }, null, 2);
    }
    function importShareableAssociateStartGroupSettings(text) {
        const raw = String(text || '').trim();
        if (!raw) throw new Error('Paste exported start-time settings first.');
        let parsed;
        try { parsed = JSON.parse(raw); }
        catch (e) { throw new Error('The pasted settings are not valid JSON.'); }
        const source = parsed && parsed.assignments && typeof parsed.assignments === 'object'
            ? parsed.assignments
            : parsed;
        if (!source || Array.isArray(source) || typeof source !== 'object') {
            throw new Error('No associate assignments were found.');
        }
        const cleaned = {};
        Object.entries(source).forEach(([name, group]) => {
            const key = String(name || '').trim().toLocaleLowerCase();
            const value = String(group || '').trim().toUpperCase();
            if (!key || key === 'flr895jyc') return;
            if (!/^(?:1[0-2]|[1-9])\s(?:AM|PM)$/.test(value)) {
                throw new Error(`Invalid start group for ${name}: ${group}`);
            }
            cleaned[key] = value.replace(/^(\d{1,2})\s(AM|PM)$/, '$1 $2');
        });
        if (!Object.keys(cleaned).length) throw new Error('No valid associate assignments were found.');
        const existing = (() => {
            try {
                const value = JSON.parse(localStorage.getItem('__associate_manual_start_groups') || '{}');
                return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
            } catch (e) { return {}; }
        })();
        localStorage.setItem('__associate_manual_start_groups', JSON.stringify({ ...existing, ...cleaned }));
        return Object.keys(cleaned).length;
    }

    function getManualAssociateStartGroups() {
        const defaults = {
            'juana!': '9 AM',
            'nelsonb!': '9 AM',
            'riverac!': '11 AM',
            'kevinro!': '11 AM',
            'josev!': '11 AM',
            'josephc!': '11 AM',
            'raymondm!': '11 AM',
            'leonardr!': '11 AM'
        };
        try {
            const saved = JSON.parse(localStorage.getItem('__associate_manual_start_groups') || '{}');
            return { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
        } catch (e) {
            return { ...defaults };
        }
    }
    function saveManualAssociateStartGroup(associateName, startGroup) {
        const key = String(associateName || '').trim().toLocaleLowerCase();
        if (!key) return;
        const assignments = getManualAssociateStartGroups();
        if (!startGroup || startGroup === 'auto') delete assignments[key];
        else assignments[key] = startGroup;
        localStorage.setItem('__associate_manual_start_groups', JSON.stringify(assignments));
    }
    function formatStartGroupLabelFromHour(hour24) {
        const hour = Number(hour24);
        if (!Number.isFinite(hour) || hour < 0 || hour > 23) return 'Unknown';
        const ap = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour} ${ap}`;
    }
    function getStartGroupSortFromLabel(label) {
        const match = String(label || '').trim().match(/^(\d{1,2})\s*(AM|PM)$/i);
        if (!match) return 9999;
        let hour = Number(match[1]) % 12;
        if (match[2].toUpperCase() === 'PM') hour += 12;
        if (hour < 2) hour += 24;
        return hour;
    }

    function calculatePickerPace(events, fallbackCount = 0) {
        const sorted = (Array.isArray(events) ? events : [])
            .map(event => Number(typeof event === 'number' ? event : event?.ts))
            .filter(Number.isFinite)
            .sort((a,b) => a-b);
        const picks = Math.max(Number(fallbackCount) || 0, sorted.length);
        if (picks < 2 || sorted.length < 2) {
            return { picks, spanMinutes:0, spanPph:0, firstTs:0, lastTs:0 };
        }
        const firstTs = sorted[0];
        const lastTs = sorted[sorted.length - 1];
        const spanMinutes = Math.max(0, (lastTs - firstTs) / 60000);
        return {
            picks,
            spanMinutes,
            spanPph: spanMinutes > 0 ? picks / (spanMinutes / 60) : 0,
            firstTs,
            lastTs
        };
    }
    function formatPaceMinutes(minutes){const m=Math.max(0,Math.round(Number(minutes)||0)),h=Math.floor(m/60),r=m%60;return h?`${h}h ${r}m`:`${r}m`;}
    function getPaceBreakCredit(startGroup, lastPickTimestamp) {
        const group = String(startGroup || '').trim().toUpperCase();
        const lastPick = new Date(Number(lastPickTimestamp) || lastPickTimestamp);
        if (Number.isNaN(lastPick.getTime())) return { minutes:0, label:'', thresholdLabel:'' };
        const lastPickMinutes = lastPick.getHours() * 60 + lastPick.getMinutes();

        // Credit is earned only when the associate has a recorded main-area pick
        // after the assumed break window. The current clock alone never awards it.
        if ((group === '9 AM' || group === '11 AM') && lastPickMinutes >= (14 * 60 + 55)) {
            return { minutes:55, label:'55m lunch credit', thresholdLabel:'post-lunch pick at/after 2:55 PM' };
        }
        if (group === '2 PM' && lastPickMinutes >= (17 * 60 + 55)) {
            return { minutes:55, label:'55m lunch credit', thresholdLabel:'post-lunch pick at/after 5:55 PM' };
        }
        if (group === '4 PM' && lastPickMinutes >= (19 * 60 + 30)) {
            return { minutes:30, label:'30m break credit', thresholdLabel:'post-break pick at/after 7:30 PM' };
        }
        return { minutes:0, label:'', thresholdLabel:'' };
    }
    function applyPaceBreakCredit(pace, startGroup) {
        const credit = getPaceBreakCredit(startGroup, pace?.lastTs);
        const rawSpanMinutes = Math.max(0, Number(pace?.spanMinutes) || 0);
        const appliedCreditMinutes = credit.minutes > 0
            ? Math.min(credit.minutes, Math.max(0, rawSpanMinutes - 1))
            : 0;
        const creditedSpanMinutes = Math.max(0, rawSpanMinutes - appliedCreditMinutes);
        const picks = Number(pace?.picks) || 0;
        return {
            ...pace,
            rawSpanMinutes,
            creditedSpanMinutes,
            breakCreditMinutes: appliedCreditMinutes,
            breakCreditLabel: credit.label,
            breakCreditThresholdLabel: credit.thresholdLabel,
            creditedPph: creditedSpanMinutes > 0 && picks >= 2 ? picks / (creditedSpanMinutes / 60) : 0
        };
    }

    function openHistoricalAssociateIntelligenceReport(snapshot) {
        const window = getOperationalDayWindowForKey(snapshot.dateKey);
        const normalizeArea = batchType => {
            const type = String(batchType || '').toLocaleLowerCase();
            if (type.includes('pick by pallet')) return null;
            if (type.includes('calendar')) return 'Calendars';
            if (type.includes('unit pick')) return 'Unit Pick';
            if (type.includes('reserve')) return 'Reserve';
            if (type.includes('ptb') || type.includes('pick to belt')) return 'Pick to Belt';
            return 'Floor';
        };
        const associateEvents = new Map();
        (snapshot.batches || []).forEach(batch => {
            if (batch.hub === 'DIS' || isFullPalletPickBatch(batch.batchType)) return;
            const area = normalizeArea(batch.batchType);
            if (!area) return;
            (batch.cache?.pickers || []).forEach(picker => {
                if (!picker || typeof picker === 'string') return;
                const name = String(picker.name || '').trim();
                if (!name || name.includes('.') || name.toLocaleLowerCase() === 'flr895jyc') return;
                (picker.pickEvents || []).forEach(event => {
                    const ts = Number(event?.ts) || getScanTimestamp(event?.timeStr);
                    const carton = String(event?.carton || '').trim();
                    const status = String(event?.status || '').trim();
                    if (!carton || !status.toLocaleLowerCase().includes('picking complete') || ts < window.start || ts >= window.end) return;
                    const key = name.toLocaleLowerCase();
                    if (!associateEvents.has(key)) associateEvents.set(key, { name, events:new Map() });
                    associateEvents.get(key).events.set(`${batch.id}|${carton}`, {
                        name,
                        batchId:String(batch.id),
                        carton,
                        area,
                        status,
                        hub:batch.hub || 'Unknown',
                        location:String(event?.location || picker.location || 'Unknown'),
                        time:String(event?.timeStr || new Date(ts).toLocaleString()),
                        ts
                    });
                });
            });
        });
        const events = Array.from(associateEvents.values())
            .flatMap(associate => Array.from(associate.events.values()))
            .sort((a, b) => a.name.localeCompare(b.name) || a.ts - b.ts || a.batchId.localeCompare(b.batchId, undefined, { numeric:true }));
        const rows = events.map(event => `<tr><td>${escapeHTML(event.name)}</td><td>${escapeHTML(event.batchId)}</td><td>${escapeHTML(event.carton)}</td><td>${escapeHTML(event.area)}</td><td>${escapeHTML(event.status)}</td><td>${escapeHTML(event.hub)}</td><td>${escapeHTML(event.location)}</td><td>${escapeHTML(event.time)}</td></tr>`).join('');
        const table = events.length
            ? `<table><thead><tr><th>Associate</th><th>Batch</th><th>Carton</th><th>Area</th><th>Status</th><th>Hub</th><th>Location</th><th>Picked Time</th></tr></thead><tbody>${rows}</tbody></table>`
            : '<div class="empty">No completed pick events were saved for this operational day.</div>';
        openIntelligenceIframe('Associate Pick Intelligence', getIntelligenceReportShell(
            `Associate Pick Intelligence · ${snapshot.dateKey}`,
            `Saved completed pick events for ${snapshot.dateKey}; historical rows do not fetch live Batch Detail pages.`,
            `<div class="card"><span>Completed Pick Events</span><strong>${events.length.toLocaleString()}</strong></div><div class="card"><span>Associates</span><strong>${associateEvents.size.toLocaleString()}</strong></div>`,
            table
        ));
    }

    function bindBatchIntelFilters(iframe) {
        const doc = iframe?.contentDocument;
        if (!doc || doc.body.dataset.filtersBound === 'true') return;
        doc.body.dataset.filtersBound = 'true';
        const rows = Array.from(doc.querySelectorAll('#batchIntelRows tr[data-batch]'));
        const search = doc.getElementById('batchIntelSearch');
        const minTime = doc.getElementById('batchIntelMinTime');
        const maxTime = doc.getElementById('batchIntelMaxTime');
        const sort = doc.getElementById('batchIntelSort');
        const count = doc.getElementById('batchIntelCount');
        const columnFilters = Array.from(doc.querySelectorAll('input[data-column-filter]'));
        const countInputs = Array.from(doc.querySelectorAll('.batch-intel-range-picker input[data-count-field]'));
        const columnSelects = Array.from(doc.querySelectorAll('details[data-column-select]'));
        const columnRangeInputs = Array.from(doc.querySelectorAll('input[data-column-range]'));
        const columnDateInputs = Array.from(doc.querySelectorAll('input[data-column-date]'));
        const rangePickers = Array.from(doc.querySelectorAll('.batch-intel-range-picker'));
        const numericColumnFields = { 9:'pickedPercent', 10:'efficiency', 11:'timing', 16:'pickSpan' };
        const dateColumnFields = { 12:'printedAt', 13:'assignedAt', 14:'lastScan' };
        const categoryColumnFields = { 1:'workType', 2:'zone', 3:'hub', 4:'cutTime', 5:'status', 17:'shortState', 18:'misscanState' };
        const readColumnValue = (row, index) => {
            if (index === 15) {
                try { return JSON.parse(row.querySelector('[data-picker-names]')?.textContent || '[]'); }
                catch (error) { return []; }
            }
            return [row.dataset[categoryColumnFields[index]] || ''];
        };
        const apply = () => {
            const query = String(search?.value || '').trim().toLocaleLowerCase();
            const minimum = minTime?.value === '' ? null : Number(minTime?.value);
            const maximum = maxTime?.value === '' ? null : Number(maxTime?.value);
            const countRanges = Object.fromEntries(['pending', 'picked', 'total'].map(field => {
                const bound = name => countInputs.find(input => input.dataset.countField === field && input.dataset.countBound === name)?.value;
                return [field, { min:bound('min') === '' || bound('min') === undefined ? null : Number(bound('min')), max:bound('max') === '' || bound('max') === undefined ? null : Number(bound('max')) }];
            }));
            const columnSelections = Object.fromEntries(columnSelects.map(picker => [
                picker.dataset.columnSelect,
                Array.from(picker.querySelectorAll('input[type="checkbox"]:checked'), input => input.value)
            ]));
            const readBounds = (inputs, keyName) => Object.fromEntries(inputs.map(input => [
                `${input.dataset[keyName]}:${input.dataset[`${keyName}Bound`]}`,
                input.value
            ]));
            const savedFilters = {
                columnFilters:Object.fromEntries(columnFilters.map(input => [input.dataset.columnFilter, input.value])),
                columnSelections,
                columnRanges:readBounds(columnRangeInputs, 'columnRange'),
                columnDates:readBounds(columnDateInputs, 'columnDate'),
                ranges:Object.fromEntries(Object.entries(countRanges).map(([field, bounds]) => [field, Object.fromEntries(Object.entries(bounds).map(([bound, value]) => [bound, value === null ? '' : value]))]))
            };
            try { localStorage.setItem('__batch_intel_filter_exclusions_v1', JSON.stringify(savedFilters)); }
            catch (error) { console.warn('Could not save Batch Intel filters', error); }
            rows.forEach(row => {
                const duration = Number(row.dataset.timing);
                const countMatches = ['pending', 'picked', 'total'].every(field => {
                    const value = Number(row.dataset[field]);
                    const range = countRanges[field];
                    return (range.min === null || value >= range.min) && (range.max === null || value <= range.max);
                });
                const textMatches = columnFilters.every(input => {
                    const value = input.value.trim().toLocaleLowerCase();
                    const cell = row.querySelector(`td[data-column-index="${input.dataset.columnFilter}"]`);
                    return !value || String(cell?.innerText || '').toLocaleLowerCase().includes(value);
                });
                const selectionMatches = columnSelects.every(picker => {
                    const selected = columnSelections[picker.dataset.columnSelect];
                    if (!selected.length) return true;
                    return readColumnValue(row, Number(picker.dataset.columnSelect)).some(value => selected.includes(value));
                });
                const numericMatches = Object.entries(numericColumnFields).every(([index, field]) => {
                    const minimumValue = columnRangeInputs.find(input => input.dataset.columnRange === index && input.dataset.columnRangeBound === 'min')?.value;
                    const maximumValue = columnRangeInputs.find(input => input.dataset.columnRange === index && input.dataset.columnRangeBound === 'max')?.value;
                    if (minimumValue === '' && maximumValue === '') return true;
                    const value = Number(row.dataset[field]);
                    return value >= 0 && (minimumValue === '' || value >= Number(minimumValue)) && (maximumValue === '' || value <= Number(maximumValue));
                });
                const dateMatches = Object.entries(dateColumnFields).every(([index, field]) => {
                    const minimumValue = columnDateInputs.find(input => input.dataset.columnDate === index && input.dataset.columnDateBound === 'min')?.value;
                    const maximumValue = columnDateInputs.find(input => input.dataset.columnDate === index && input.dataset.columnDateBound === 'max')?.value;
                    if (!minimumValue && !maximumValue) return true;
                    const timestamp = Number(row.dataset[field]);
                    if (!timestamp) return false;
                    const start = minimumValue ? new Date(minimumValue).getTime() : null;
                    const end = maximumValue ? new Date(maximumValue).getTime() + 59999 : null;
                    return (start === null || timestamp >= start) && (end === null || timestamp <= end);
                });
                const matches =
                    (!query || row.dataset.search.includes(query)) &&
                    textMatches && selectionMatches && numericMatches && dateMatches &&
                    countMatches &&
                    !(minimum !== null && (duration < minimum || duration < 0)) &&
                    !(maximum !== null && (duration > maximum || duration < 0));
                row.hidden = !matches;
            });
            const visibleCount = rows.filter(row => !row.hidden).length;
            if (count) count.textContent = `${visibleCount} / ${rows.length} batches`;
        };
        [search, minTime, maxTime, sort, ...countInputs, ...columnFilters, ...columnRangeInputs, ...columnDateInputs].forEach(control => {
            control?.addEventListener('input', apply);
            control?.addEventListener('change', apply);
        });
        columnSelects.forEach(picker => {
            picker.querySelectorAll('input[type="checkbox"]').forEach(input => input.addEventListener('change', apply));
            const optionLabels = Array.from(picker.querySelectorAll('label')).filter(label => label.querySelector('input[type="checkbox"]'));
            picker.querySelector('input[data-option-search]')?.addEventListener('input', event => {
                const query = event.target.value.trim().toLocaleLowerCase();
                optionLabels.forEach(label => { label.style.display = !query || label.textContent.toLocaleLowerCase().includes(query) ? 'flex' : 'none'; });
            });
            picker.querySelectorAll('button[data-option-action]').forEach(button => {
                button.addEventListener('click', () => {
                    const checked = button.dataset.optionAction === 'all';
                    optionLabels.filter(label => label.style.display !== 'none').forEach(label => { label.querySelector('input').checked = checked; });
                    apply();
                });
            });
        });
        rangePickers.forEach(picker => {
            picker.addEventListener('click', event => event.stopPropagation());
            picker.addEventListener('keydown', event => event.stopPropagation());
            picker.addEventListener('toggle', () => {
                const header = picker.closest('th');
                if (picker.open) {
                    rangePickers.forEach(other => {
                        if (other === picker || !other.open) return;
                        other.open = false;
                        other.closest('th')?.style.removeProperty('z-index');
                    });
                    header?.style.setProperty('z-index', '5');
                } else {
                    header?.style.removeProperty('z-index');
                }
            });
        });
        doc.querySelectorAll('.batch-intel-table th[data-sort-index]').forEach(header => {
            header.addEventListener('click', () => setTimeout(apply, 0));
            header.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') setTimeout(apply, 0);
            });
        });
        apply();
    }

    function openBatchIntelligenceReport() {
        const dateKey = localStorage.getItem('__batch_status_history_date') || getOperationalDayKey();
        const historical = historicalViewActive;
        let filterExclusions = {};
        try {
            const storedExclusions = JSON.parse(localStorage.getItem('__batch_intel_filter_exclusions_v1') || '{}');
            if (storedExclusions && typeof storedExclusions === 'object' && !Array.isArray(storedExclusions)) filterExclusions = storedExclusions;
        } catch (error) {}
        const sourceIndex = displayBatchIndex || masterBatchIndex;
        const cacheMap = displayedBatchCache || getStoredBatchCache();
        const cutTimes = historical
            ? (getDailyHistory()[dateKey]?.hubCutTimes || getStoredHubCutTimes())
            : getStoredHubCutTimes();
        const formatTimestamp = timestamp => timestamp ? new Date(timestamp).toLocaleString() : '--';
        const records = Array.from(sourceIndex.values()).map(record => {
            const batchId = String(record.id || '');
            const cache = record.cache || cacheMap[batchId] || null;
            const type = String(record.batchType || 'Unknown');
            const zone = record.zone || classifyWorkZone(type) || 'Other';
            const hub = String(record.hub || 'Unknown');
            const pending = Math.max(0, Number(record.pending) || 0);
            const picked = Math.max(0, Number(record.picked) || 0);
            const total = Math.max(0, Number(record.total) || 0);
            const printInfo = cache?.batchPrintInfo || null;
            const printType = String(printInfo?.type || (printInfo?.manualPrint ? 'Manual' : '')).trim();
            const timingAvailable = printInfo && printInfo.minutesToPick !== null && printInfo.minutesToPick !== undefined && Number.isFinite(Number(printInfo.minutesToPick));
            const minutesToPick = timingAvailable ? Math.max(0, Number(printInfo.minutesToPick)) : null;
            const completion = cache?.completionInfo || {};
            const complete = pending === 0 || !!cache?.completionInfo?.effectivelyComplete;
            const hasStarted = completion.started === true || (completion.started !== false && (
                (Number(completion.completedCount) || 0) > 0 ||
                (Array.isArray(cache?.pickers) && cache.pickers.some(picker =>
                    Array.isArray(picker?.pickEvents) && picker.pickEvents.some(event => String(event?.status || '').toLocaleLowerCase().includes('picking'))
                ))
            ));
            const status = complete ? 'complete' : hasStarted ? 'active' : 'printed';
            const metric = historical && cache?.pickabilityRating
                ? cache.pickabilityRating
                : calculateBatchPickability(cache, type, total);
            const metricLabel = metric.state === 'scored' ? `${metric.score} / 100`
                : metric.state === 'low-sample' ? 'Low sample'
                : metric.state === 'excluded' ? (metric.reason === 'high-volume' ? 'High Vol' : 'Excluded')
                : metric.state === 'rescan' ? 'Rescan needed'
                : metric.state === 'no-location-data' ? 'No location data'
                : metric.state === 'unscanned' ? 'Not scanned' : '--';
            const pickerRecords = Array.isArray(cache?.pickers) ? cache.pickers : [];
            const pickerNames = pickerRecords.map(picker => typeof picker === 'string' ? picker : String(picker?.name || '').trim()).filter(Boolean);
            const pickerCartons = pickerRecords.reduce((sum, picker) => sum + (typeof picker === 'string' ? 0 : (Number(picker?.completedCartons) || 0)), 0);
            const pickEvents = pickerRecords.flatMap(picker => {
                if (!picker || typeof picker === 'string') return [];
                const events = Array.isArray(picker.pickEvents) ? picker.pickEvents : [];
                if (events.length) return events.map(event => Number(event?.ts) || getScanTimestamp(event?.timeStr)).filter(Boolean);
                return [Number(picker.firstTs) || getScanTimestamp(picker.firstTimeStr), Number(picker.lastTs) || getScanTimestamp(picker.timeStr)].filter(Boolean);
            }).sort((a, b) => a - b);
            const firstPick = pickEvents.length ? pickEvents[0] : 0;
            const lastPick = pickEvents.length ? pickEvents[pickEvents.length - 1] : 0;
            const pickSpanMinutes = firstPick && lastPick ? Math.max(0, Math.round((lastPick - firstPick) / 60000)) : null;
            const shorts = Array.isArray(cache?.shortLocations) ? cache.shortLocations : [];
            const shortCount = shorts.reduce((sum, item) => sum + (Number(item?.count) || 0), 0);
            const shortDetails = shorts.map(item => `${item.location || 'Unknown'} (${Number(item.count) || 0})`).join(', ');
            const possibleMisScans = Array.isArray(cache?.possibleMisScans) ? cache.possibleMisScans : [];
            const possibleMisScanDetails = possibleMisScans.map(issue =>
                `${issue.status || 'Unknown status'} · ${issue.location || 'Unknown location'} · carton ${issue.carton || 'Unknown'} · picker ${issue.picker || 'Unknown'}`
            ).join('\n');
            const signals = [];
            if (!cache) signals.push('Not scanned');
            if (cache?.isHighVol) signals.push('High Volume');
            if (isFullPalletPickBatch(type)) signals.push('Full pallet');
            if (cache && !printInfo) signals.push('Print metadata missing');
            else if (printInfo && !timingAvailable) signals.push('Table Time unavailable');
            if (possibleMisScans.length) signals.push(`${possibleMisScans.length} review flag${possibleMisScans.length === 1 ? '' : 's'}`);
            const filterFlags = signals.length ? signals.slice() : ['No flags'];
            if (possibleMisScans.length && !filterFlags.includes('Possible Mis-scan')) filterFlags.push('Possible Mis-scan');
            const lastScan = String(cache?.lastScanTime || '--');
            const lastScanTimestamp = getScanTimestamp(lastScan);
            const printedTimestamp = printInfo ? getBatchDetailTimestamp(printInfo.printedAt) : 0;
            const assignedTimestamp = printInfo ? getBatchDetailTimestamp(printInfo.assignedAt) : 0;
            const detailHref = record.detailHref || record.row?.querySelector("a[href*='BatchDetail']")?.getAttribute('href') || `/Home/BatchDetail?batchId=${encodeURIComponent(batchId)}`;
            const timingTitle = printInfo
                ? `Type: ${printType || 'not available'}\nPrinted: ${printInfo.printedAt || 'not available'}\nAssigned: ${printInfo.assignedAt || 'not available'}`
                : 'Print metadata is not available in this scan.';
            const pickerDetails = pickerRecords.map(picker => {
                if (typeof picker === 'string') return picker;
                return `${picker.name || 'Unknown'} · ${Number(picker.completedCartons) || 0} cartons · first ${picker.firstTimeStr || picker.timeStr || 'unknown'} · last ${picker.timeStr || 'unknown'}`;
            }).join('\n');
            const completionDetails = `Completed: ${Number(completion.completedCount) || 0}; actionable remaining: ${Number(completion.actionableRemaining) || 0}; canceled: ${Number(completion.canceledCount) || 0}; tickets: ${Number(completion.ticketCount) || 0}`;
            const searchText = [batchId, type, zone, hub, cutTimes[hub] || '', status, printType, printInfo?.printedAt || '', printInfo?.assignedAt || '', minutesToPick ?? '', lastScan, pickerNames.join(' '), pickerDetails, shortDetails, possibleMisScanDetails, completionDetails, metricLabel, pending, picked, total, signals.join(' ')].join(' ').toLocaleLowerCase();
            return {
                id:batchId, cache, type, zone, hub, pending, picked, total, printType, minutesToPick,
                timingTitle, status, complete, metric, metricLabel, pickerNames, pickerCartons, pickerDetails,
                firstPick, lastPick, pickSpanMinutes, shortCount, shortDetails, possibleMisScans,
                possibleMisScanDetails, completionDetails, signals, filterFlags, lastScan, lastScanTimestamp,
                printedTimestamp, assignedTimestamp,
                cutTime:String(cutTimes[hub] || 'No cut time'), detailHref, searchText
            };
        }).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric:true }));

        const filterGroups = [
            { key:'zone', label:'Zone', values:Array.from(new Set(records.map(record => record.zone))).sort() },
            { key:'workType', label:'Raw Batch Type', values:Array.from(new Set(records.map(record => record.type))).sort((a, b) => a.localeCompare(b)) },
            { key:'hub', label:'Hub', values:Array.from(new Set(records.map(record => record.hub))).sort((a, b) => a.localeCompare(b)) },
            { key:'cutTime', label:'Cut Time', values:Array.from(new Set(records.map(record => record.cutTime))).sort((a, b) => a.localeCompare(b)) },
            { key:'printType', label:'Print Type', values:Array.from(new Set(records.map(record => record.printType || 'Not recorded'))).sort((a, b) => a.localeCompare(b)) },
            { key:'status', label:'Status', values:['complete','active','printed'], labels:{ complete:'Complete', active:'In progress', printed:'Printed' } }
        ];
        const columnHeaders = ['Batch', 'Batch Type', 'Zone', 'Hub', 'Cut Time', 'Status / Tickets', 'Pending', 'Picked', 'Total', 'Picked %', 'Pick Efficiency', 'Table Time', 'Printed', 'Assigned', 'Last Scan', 'Pickers', 'Pick Span / Window', 'Shorts', 'Possible Mis-scans'];
        const savedRangeValue = (field, bound) => filterExclusions.ranges?.[field]?.[bound] ?? '';
        const columnPanel = '';
        const filterPanel = `<details class="batch-intel-filter-settings"><summary><span aria-hidden="true">⚙</span><strong>Filters</strong><small>Zone, type, hub, cut time, print type, status</small></summary><div class="batch-intel-filter-groups">` + filterGroups.map(group => {
            const excluded = Array.isArray(filterExclusions[group.key]) ? filterExclusions[group.key] : [];
            return `<section class="batch-intel-filter-group" data-filter-group="${group.key}"><div class="batch-intel-filter-heading"><strong title="${group.key === 'workType' ? 'Original Batch Detail type. Zone is the normalized work-area grouping.' : ''}">${escapeHTML(group.label)} <small data-filter-count>${group.values.length}/${group.values.length}</small></strong><span><button type="button" data-filter-action="all">All</button><button type="button" data-filter-action="clear">Clear</button></span></div><div class="batch-intel-filter-options">${group.values.map(value => `<label><input type="checkbox" data-filter-field="${group.key}" value="${escapeHTML(value)}" ${excluded.includes(value) ? '' : 'checked'}><span>${escapeHTML(group.labels?.[value] || value)}</span></label>`).join('')}</div></section>`;
        }).join('') + `</div></details><style>.batch-intel-filter-settings{grid-column:1/-1;min-width:0;border:1px solid ${document.body.classList.contains('tm-dark-mode') ? '#315443' : '#cbd5e1'};border-radius:4px;background:${document.body.classList.contains('tm-dark-mode') ? '#101a14' : '#fff'}}.batch-intel-filter-settings>summary{display:flex;align-items:center;gap:7px;padding:7px 10px;color:${document.body.classList.contains('tm-dark-mode') ? '#eaf7ee' : '#334155'};font-size:10px;cursor:pointer;list-style:none}.batch-intel-filter-settings>summary::-webkit-details-marker{display:none}.batch-intel-filter-settings>summary>span{color:${document.body.classList.contains('tm-dark-mode') ? '#9fffb0' : '#2563eb'};font-size:14px}.batch-intel-filter-settings>summary>strong{font-weight:800}.batch-intel-filter-settings>summary>small{margin-left:auto;color:#64748b;font-size:9px;font-weight:600}.batch-intel-filter-settings[open]>.batch-intel-filter-groups{border-top:1px solid ${document.body.classList.contains('tm-dark-mode') ? '#315443' : '#e2e8f0'}}.batch-intel-filter-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:7px;padding:8px}@media(max-width:720px){.batch-intel-filter-groups{grid-template-columns:repeat(auto-fit,minmax(155px,1fr))}}</style>` + `<style>.batch-intel-count-ranges{grid-column:1/-1;min-width:0;border:1px solid #e2e8f0;border-radius:4px;background:${document.body.classList.contains('tm-dark-mode') ? '#101a14' : '#fff'}}.batch-intel-count-ranges>.batch-intel-filter-heading{border-bottom:1px solid #e2e8f0}.batch-intel-count-ranges>label{display:grid!important;grid-template-columns:100px 250px!important;align-items:center;gap:10px;margin:0;padding:7px 10px}.batch-intel-count-name{font-size:10px;font-weight:700;color:${document.body.classList.contains('tm-dark-mode') ? '#d9eadf' : '#334155'}}.batch-intel-count-inputs{display:flex;align-items:center;gap:7px;min-width:0}.batch-intel-count-inputs input{width:112px;min-width:0;height:30px;flex:0 0 112px;border:1px solid ${document.body.classList.contains('tm-dark-mode') ? '#496052' : '#cbd5e1'};border-radius:4px;background:${document.body.classList.contains('tm-dark-mode') ? '#17251d' : '#f8fafc'};color:${document.body.classList.contains('tm-dark-mode') ? '#eaf7ee' : '#0f172a'};padding:4px 7px;font-size:11px;font-variant-numeric:tabular-nums}.batch-intel-count-inputs b{color:#64748b;font-size:10px;font-weight:600}.batch-intel-column-picker{position:relative;grid-column:1/-1;justify-self:start;min-width:230px;max-width:100%;border:1px solid #cbd5e1;border-radius:4px;background:${document.body.classList.contains('tm-dark-mode') ? '#101a14' : '#fff'}}.batch-intel-column-picker>summary{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:7px 10px;color:${document.body.classList.contains('tm-dark-mode') ? '#eaf7ee' : '#334155'};font-size:10px;font-weight:800;cursor:pointer;list-style:none}.batch-intel-column-picker>summary::-webkit-details-marker{display:none}.batch-intel-column-picker>summary::after{content:'▾';color:#64748b}.batch-intel-column-picker[open]>summary::after{content:'▴'}.batch-intel-column-picker>summary small{color:#64748b;font-size:9px;font-weight:700}.batch-intel-column-menu{padding:0 8px 8px;border-top:1px solid #e2e8f0}.batch-intel-column-actions{display:flex;gap:5px;padding:7px 0}.batch-intel-column-actions button{padding:3px 7px;border:1px solid #cbd5e1;border-radius:3px;background:#f8fafc;color:#334155;font-size:9px;font-weight:700;cursor:pointer}.batch-intel-column-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:3px 8px;max-height:220px;overflow:auto}.batch-intel-column-options label{display:flex;align-items:center;gap:6px;min-width:0;min-height:25px;margin:0;padding:3px 5px;border-radius:3px;color:${document.body.classList.contains('tm-dark-mode') ? '#c5d8cb' : '#475569'};font-size:10px;cursor:pointer}.batch-intel-column-options label:hover{background:${document.body.classList.contains('tm-dark-mode') ? '#17251d' : '#f1f5f9'}}.batch-intel-column-options input{flex:0 0 auto;margin:0;accent-color:${document.body.classList.contains('tm-dark-mode') ? '#39e66b' : '#2563eb'}}.batch-intel-column-options label span{min-width:0;overflow-wrap:anywhere}.batch-intel-table th[hidden],.batch-intel-table td[hidden]{display:none!important}@media(max-width:520px){.batch-intel-count-ranges>label{grid-template-columns:76px minmax(0,1fr)!important;gap:6px;padding:6px}.batch-intel-count-inputs{gap:4px}.batch-intel-count-inputs input{width:0;flex:1 1 0}.batch-intel-column-options{grid-template-columns:repeat(auto-fit,minmax(112px,1fr))}}</style>` + columnPanel;
        const tableRows = records.map(record => {
            const efficiencyValue = record.metric.state === 'scored' ? Number(record.metric.score) : -1;
            const efficiencyTitle = record.metric.state === 'scored' ? getBatchPickabilityTitle(record.metric) : record.metricLabel;
            const completion = record.cache?.completionInfo || {};
            const pickerLabel = record.pickerNames.length ? `${record.pickerNames.length} · ${record.pickerCartons} cartons` : '--';
            const exceptionLabel = record.possibleMisScans.length ? `${record.possibleMisScans.length} review flag${record.possibleMisScans.length === 1 ? '' : 's'}` : 'None';
            const exceptionTitle = record.possibleMisScanDetails || 'No possible mis-scan flags were recorded.';
            const exceptionDetails = record.possibleMisScans.length
                ? `<details class="batch-intel-issues"><summary>${exceptionLabel}</summary><div>${record.possibleMisScans.map(issue => {
                    const carton = String(issue.carton || '').trim();
                    const detailUrl = `${record.detailHref.split('#')[0]}#tm-carton=${encodeURIComponent(carton)}`;
                    const issueText = `${issue.status || 'Unknown status'} · ${issue.location || 'Unknown location'} · ${issue.item || 'Unknown item'} · picker ${issue.picker || 'Unknown'}`;
                    return `<article><a href="${escapeHTML(detailUrl)}" target="_blank" rel="noopener noreferrer">Batch #${escapeHTML(record.id)} · Carton ${escapeHTML(carton || 'Unknown')}</a><span>${escapeHTML(issueText)}</span></article>`;
                }).join('')}</div></details>`
                : 'None';
            return `<tr data-batch="true" data-search="${escapeHTML(record.searchText)}" data-zone="${escapeHTML(record.zone)}" data-work-type="${escapeHTML(record.type)}" data-hub="${escapeHTML(record.hub)}" data-cut-time="${escapeHTML(record.cutTime)}" data-print-type="${escapeHTML(record.printType || 'Not recorded')}" data-status="${record.status}" data-filter-flags="${escapeHTML(record.filterFlags.join('|'))}" data-pending="${record.pending}" data-picked="${record.picked}" data-total="${record.total}" data-picked-percent="${record.total ? Math.round(record.picked / record.total * 100) : -1}" data-timing="${record.minutesToPick === null ? -1 : record.minutesToPick}" data-efficiency="${efficiencyValue}" data-printed-at="${record.printedTimestamp}" data-assigned-at="${record.assignedTimestamp}" data-last-scan="${record.lastScanTimestamp}" data-picker-count="${record.pickerNames.length ? record.pickerNames.length : -1}" data-pick-span="${record.pickSpanMinutes === null ? -1 : record.pickSpanMinutes}" data-short-count="${record.shortCount}" data-misscan-count="${record.possibleMisScans.length}" data-short-state="${record.shortCount ? 'has' : 'none'}" data-misscan-state="${record.possibleMisScans.length ? 'has' : 'none'}">
                <td data-column-index="0"><a class="batch-intel-id" href="${escapeHTML(record.detailHref)}" target="_blank" rel="noopener noreferrer">${escapeHTML(record.id)}</a><div class="batch-intel-sub">${record.cache ? 'Scanned' : 'No scan cache'}</div></td>
                <td data-column-index="1">${escapeHTML(record.type)}</td><td data-column-index="2">${escapeHTML(record.zone)}</td><td data-column-index="3" class="batch-intel-hub">${escapeHTML(record.hub)}</td><td data-column-index="4" style="display:none">${escapeHTML(record.cutTime)}</td>
                <td data-column-index="5"><span class="batch-intel-status ${record.status}">${record.status === 'complete' ? 'Complete' : record.status === 'active' ? 'In progress' : 'Printed'}</span><div class="batch-intel-sub" title="${escapeHTML(record.completionDetails)}">${Number(completion.actionableRemaining) || 0} actionable · ${Number(completion.canceledCount) || 0} canceled</div></td>
                <td data-column-index="6" class="numeric">${record.pending.toLocaleString()}</td><td data-column-index="7" class="numeric">${record.picked.toLocaleString()}</td><td data-column-index="8" class="numeric">${record.total.toLocaleString()}</td>
                <td data-column-index="9" class="numeric">${record.total ? `${Math.round(record.picked / record.total * 100)}%` : '--'}</td>
                <td data-column-index="10" class="numeric" title="${escapeHTML(efficiencyTitle)}">${escapeHTML(record.metricLabel)}</td>
                <td data-column-index="11" class="numeric" title="${escapeHTML(record.timingTitle)}">${record.minutesToPick === null ? '--' : `${Math.round(record.minutesToPick)}m`}</td>
                <td data-column-index="12" title="${escapeHTML(record.timingTitle)}">${escapeHTML(record.cache?.batchPrintInfo?.printedAt || '--')}</td><td data-column-index="13" title="${escapeHTML(record.timingTitle)}">${escapeHTML(record.cache?.batchPrintInfo?.assignedAt || '--')}</td>
                <td data-column-index="14" title="${escapeHTML(record.lastScan)}">${escapeHTML(record.lastScan)}<div class="batch-intel-sub">${escapeHTML(getRelativeTimeStr(record.lastScan))}</div></td>
                <td data-column-index="15" title="${escapeHTML(record.pickerDetails || 'No picker details were recorded.')}">${escapeHTML(pickerLabel)}<span data-picker-names hidden>${escapeHTML(JSON.stringify(record.pickerNames))}</span></td>
                <td data-column-index="16">${record.pickSpanMinutes === null ? '--' : `${record.pickSpanMinutes}m`}</td>
                <td data-column-index="17" title="${escapeHTML(record.shortDetails || 'No short locations were recorded.')}">${record.shortCount ? record.shortCount.toLocaleString() : '--'}</td>
                <td data-column-index="18" title="${escapeHTML(exceptionTitle)}">${exceptionDetails}</td>
            </tr>`;
        }).join('');
        const totalCartons = records.reduce((sum, record) => sum + record.total, 0);
        const pendingCartons = records.reduce((sum, record) => sum + record.pending, 0);
        const timedRecords = records.filter(record => record.minutesToPick !== null);
        const averageMinutes = timedRecords.length ? Math.round(timedRecords.reduce((sum, record) => sum + record.minutesToPick, 0) / timedRecords.length) : null;
        const flaggedRecords = records.filter(record => record.signals.length || record.possibleMisScans.length).length;
        const summary = `<div class="card"><span>Batches</span><strong>${records.length.toLocaleString()}</strong></div><div class="card"><span>Assigned Cartons</span><strong>${totalCartons.toLocaleString()}</strong></div><div class="card"><span>Pending Cartons</span><strong>${pendingCartons.toLocaleString()}</strong></div><div class="card"><span>Table Time Captured</span><strong>${timedRecords.length.toLocaleString()} / ${records.length.toLocaleString()}</strong></div><div class="card"><span>Mean Table Time</span><strong>${averageMinutes === null ? '--' : `${averageMinutes}m`}</strong></div><div class="card"><span>Batches With Flags</span><strong>${flaggedRecords.toLocaleString()}</strong></div>`;
        const controls = `<div class="toolbar batch-intel-toolbar"><input id="batchIntelSearch" class="search" placeholder="Search batch, type, hub, picker, location..."><label class="batch-intel-time-filter">Table Time <input id="batchIntelMinTime" type="number" min="0" step="1" placeholder="Min" aria-label="Minimum Table Time minutes"><span>to</span><input id="batchIntelMaxTime" type="number" min="0" step="1" placeholder="Max" aria-label="Maximum Table Time minutes"> <small>min</small></label><select id="batchIntelSort" aria-label="Sort batches"><option value="id">Batch number</option><option value="pending">Pending high to low</option><option value="timing">Table Time high to low</option><option value="efficiency">Pick Efficiency high to low</option><option value="last-scan">Recently scanned</option></select><span id="batchIntelCount" class="count"></span></div>`;
        const countRangeFields = { 6:'pending', 7:'picked', 8:'total' };
        const categoryColumnValues = {
            1:Array.from(new Set(records.map(record => record.type))).sort((a, b) => a.localeCompare(b)).map(value => ({ value, label:value })),
            2:Array.from(new Set(records.map(record => record.zone))).sort((a, b) => a.localeCompare(b)).map(value => ({ value, label:value })),
            3:Array.from(new Set(records.map(record => record.hub))).sort((a, b) => a.localeCompare(b)).map(value => ({ value, label:value })),
            4:Array.from(new Set(records.map(record => record.cutTime))).sort((a, b) => a.localeCompare(b)).map(value => ({ value, label:value })),
            5:[{ value:'complete', label:'Complete' }, { value:'active', label:'In progress' }, { value:'printed', label:'Printed' }],
            17:[{ value:'has', label:'Has shorts' }, { value:'none', label:'No shorts' }],
            18:[{ value:'has', label:'Has review flags' }, { value:'none', label:'No flags' }],
            15:Array.from(new Set(records.flatMap(record => record.pickerNames))).sort((a, b) => a.localeCompare(b)).map(value => ({ value, label:value }))
        };
        const numericColumnLabels = { 9:'Picked %', 10:'Pick Efficiency', 11:'Table Time', 16:'Pick Span' };
        const numericColumnMeta = { 9:{ unit:'%', min:0, max:100 }, 10:{ unit:'score 0-100', min:0, max:100 }, 11:{ unit:'minutes', min:0 }, 16:{ unit:'minutes', min:0 } };
        const rangeAttrs = index => `min="${numericColumnMeta[index]?.min ?? 0}" ${numericColumnMeta[index]?.max !== undefined ? `max="${numericColumnMeta[index].max}"` : ''} step="1"`;
        const dateColumnLabels = { 12:'Printed', 13:'Assigned', 14:'Last Scan' };
        const savedColumnRangeValue = (index, bound) => filterExclusions.columnRanges?.[`${index}:${bound}`] ?? '';
        const savedColumnDateValue = (index, bound) => filterExclusions.columnDates?.[`${index}:${bound}`] ?? '';
        const rangeDarkMode = document.body.classList.contains('tm-dark-mode');
        const headerCells = columnHeaders.map((label, index) => {
            const field = countRangeFields[index];
            const selectionOptions = categoryColumnValues[index];
            const savedSelection = Array.isArray(filterExclusions.columnSelections?.[index]) ? filterExclusions.columnSelections[index] : [];
            const selectionPicker = selectionOptions ? `<details class="batch-intel-range-picker" data-column-select="${index}" style="position:relative;display:inline-block;margin-left:4px;vertical-align:middle;"><summary title="Choose ${escapeHTML(label)} values" aria-label="Choose ${escapeHTML(label)} values" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#fff'};color:${rangeDarkMode ? '#9fffb0' : '#475569'};font-size:12px;cursor:pointer;list-style:none;">⚙</summary><div style="position:absolute;top:calc(100% + 5px);left:0;z-index:20;width:220px;max-height:280px;overflow:auto;padding:8px;background:${rangeDarkMode ? '#101a14' : '#fff'};color:${rangeDarkMode ? '#d9eadf' : '#334155'};border:1px solid ${rangeDarkMode ? '#315443' : '#cbd5e1'};border-radius:4px;box-shadow:0 5px 16px rgba(15,23,42,.2);text-align:left;text-transform:none;white-space:normal;">${selectionOptions.length > 8 ? `<input type="search" data-option-search placeholder="Search ${escapeHTML(label)}..." aria-label="Search ${escapeHTML(label)} options" style="box-sizing:border-box;width:100%;height:26px;margin-bottom:6px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#f8fafc'};color:${rangeDarkMode ? '#eaf7ee' : '#0f172a'};padding:3px 6px;font-size:10px;">` : ''}<div style="display:flex;justify-content:flex-end;gap:5px;margin-bottom:6px;"><button type="button" data-option-action="all">All</button><button type="button" data-option-action="clear">Clear</button></div><div style="display:grid;gap:3px;">${selectionOptions.map(option => `<label style="display:flex;align-items:center;gap:6px;color:inherit;font-size:10px;font-weight:500;"><input type="checkbox" value="${escapeHTML(option.value)}" ${savedSelection.includes(option.value) ? 'checked' : ''}><span>${escapeHTML(option.label)}</span></label>`).join('')}</div></div></details>` : '';
            const numberRangePicker = numericColumnLabels[index] ? `<details class="batch-intel-range-picker" style="position:relative;display:inline-block;margin-left:4px;vertical-align:middle;"><summary title="Filter ${escapeHTML(label)} range" aria-label="Filter ${escapeHTML(label)} range" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#fff'};color:${rangeDarkMode ? '#9fffb0' : '#475569'};font-size:12px;cursor:pointer;list-style:none;">⚙</summary><div style="position:absolute;top:calc(100% + 5px);left:0;z-index:20;width:220px;padding:9px;background:${rangeDarkMode ? '#101a14' : '#fff'};color:${rangeDarkMode ? '#d9eadf' : '#334155'};border:1px solid ${rangeDarkMode ? '#315443' : '#cbd5e1'};border-radius:4px;box-shadow:0 5px 16px rgba(15,23,42,.2);text-align:left;text-transform:none;white-space:normal;"><strong style="display:block;margin-bottom:7px;font-size:10px;">${escapeHTML(numericColumnLabels[index])} <span style="font-weight:500;">(${numericColumnMeta[index]?.unit || ''})</span></strong><div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">${['min','max'].map(bound => `<label style="display:grid;gap:4px;color:inherit;font-size:9px;font-weight:700;">${bound === 'min' ? 'Min' : 'Max'}<input type="number" ${rangeAttrs(index)} data-column-range="${index}" data-column-range-bound="${bound}" value="${escapeHTML(savedColumnRangeValue(index, bound))}" aria-label="${bound === 'min' ? 'Minimum' : 'Maximum'} ${escapeHTML(numericColumnLabels[index])}" style="box-sizing:border-box;width:100%;min-width:0;height:29px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#f8fafc'};color:${rangeDarkMode ? '#eaf7ee' : '#0f172a'};padding:4px 6px;font-size:11px;"></label>`).join('')}</div></div></details>` : '';
            const dateRangePicker = dateColumnLabels[index] ? `<details class="batch-intel-range-picker" style="position:relative;display:inline-block;margin-left:4px;vertical-align:middle;"><summary title="Filter ${escapeHTML(label)} dates" aria-label="Filter ${escapeHTML(label)} dates" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#fff'};color:${rangeDarkMode ? '#9fffb0' : '#475569'};font-size:12px;cursor:pointer;list-style:none;">⚙</summary><div style="position:absolute;top:calc(100% + 5px);left:0;z-index:20;width:230px;padding:9px;background:${rangeDarkMode ? '#101a14' : '#fff'};color:${rangeDarkMode ? '#d9eadf' : '#334155'};border:1px solid ${rangeDarkMode ? '#315443' : '#cbd5e1'};border-radius:4px;box-shadow:0 5px 16px rgba(15,23,42,.2);text-align:left;text-transform:none;white-space:normal;"><strong style="display:block;margin-bottom:7px;font-size:10px;">${escapeHTML(dateColumnLabels[index])}</strong><div style="display:grid;grid-template-columns:1fr;gap:7px;">${['min','max'].map(bound => `<label style="display:grid;gap:4px;color:inherit;font-size:9px;font-weight:700;">${bound === 'min' ? 'From' : 'To'}<input type="datetime-local" data-column-date="${index}" data-column-date-bound="${bound}" value="${escapeHTML(savedColumnDateValue(index, bound))}" aria-label="${bound === 'min' ? 'From' : 'To'} ${escapeHTML(dateColumnLabels[index])}" style="box-sizing:border-box;width:100%;min-width:0;height:29px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#f8fafc'};color:${rangeDarkMode ? '#eaf7ee' : '#0f172a'};padding:4px 6px;font-size:10px;"></label>`).join('')}</div></div></details>` : '';
            const semanticPicker = selectionPicker || numberRangePicker || dateRangePicker;
            const savedColumnFilter = escapeHTML(filterExclusions.columnFilters?.[index] || '');
            const columnFilter = `<details class="batch-intel-range-picker" style="position:relative;display:inline-block;margin-left:4px;vertical-align:middle;"><summary title="Filter ${escapeHTML(label)}" aria-label="Filter ${escapeHTML(label)}" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#fff'};color:${rangeDarkMode ? '#9fffb0' : '#475569'};font-size:12px;cursor:pointer;list-style:none;">⚙</summary><div style="position:absolute;top:calc(100% + 5px);left:0;z-index:20;width:190px;padding:9px;background:${rangeDarkMode ? '#101a14' : '#fff'};color:${rangeDarkMode ? '#d9eadf' : '#334155'};border:1px solid ${rangeDarkMode ? '#315443' : '#cbd5e1'};border-radius:4px;box-shadow:0 5px 16px rgba(15,23,42,.2);text-align:left;text-transform:none;white-space:normal;"><label style="display:grid;gap:5px;color:inherit;font-size:10px;font-weight:700;">Contains<input type="search" data-column-filter="${index}" value="${savedColumnFilter}" aria-label="Filter ${escapeHTML(label)}" style="box-sizing:border-box;width:100%;height:29px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#f8fafc'};color:${rangeDarkMode ? '#eaf7ee' : '#0f172a'};padding:4px 6px;font-size:11px;"></label></div></details>`;
            const rangePicker = field ? `<details class="batch-intel-range-picker" data-range-field="${field}" style="position:relative;display:inline-block;margin-left:4px;vertical-align:middle;"><summary title="Set ${label} range" aria-label="Set ${label} range" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#fff'};color:${rangeDarkMode ? '#9fffb0' : '#475569'};font-size:12px;cursor:pointer;list-style:none;">⚙</summary><div class="batch-intel-range-popover" style="position:absolute;top:calc(100% + 5px);left:0;z-index:20;width:250px;padding:9px;background:${rangeDarkMode ? '#101a14' : '#fff'};color:${rangeDarkMode ? '#d9eadf' : '#334155'};border:1px solid ${rangeDarkMode ? '#315443' : '#cbd5e1'};border-radius:4px;box-shadow:0 5px 16px rgba(15,23,42,.2);text-align:left;text-transform:none;white-space:normal;"><strong style="display:block;margin-bottom:7px;font-size:10px;">${label} cartons</strong><div class="batch-intel-count-inputs" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><label style="display:grid;gap:4px;color:inherit;font-size:9px;font-weight:700;text-transform:none;">Min<input type="number" min="0" step="1" data-count-field="${field}" data-count-bound="min" value="${escapeHTML(savedRangeValue(field, 'min'))}" aria-label="Minimum ${field} cartons" style="box-sizing:border-box;width:100%;min-width:0;height:29px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#f8fafc'};color:${rangeDarkMode ? '#eaf7ee' : '#0f172a'};padding:4px 6px;font-size:11px;"></label><label style="display:grid;gap:4px;color:inherit;font-size:9px;font-weight:700;text-transform:none;">Max<input type="number" min="0" step="1" data-count-field="${field}" data-count-bound="max" value="${escapeHTML(savedRangeValue(field, 'max'))}" aria-label="Maximum ${field} cartons" style="box-sizing:border-box;width:100%;min-width:0;height:29px;border:1px solid ${rangeDarkMode ? '#496052' : '#cbd5e1'};border-radius:3px;background:${rangeDarkMode ? '#17251d' : '#f8fafc'};color:${rangeDarkMode ? '#eaf7ee' : '#0f172a'};padding:4px 6px;font-size:11px;"></label></div><small style="display:block;margin-top:7px;color:${rangeDarkMode ? '#a8bdb0' : '#64748b'};font-size:9px;">Inclusive; leave blank for no limit.</small></div></details>` : '';
            return `<th data-sort-index="${index}" tabindex="0" role="button" aria-sort="none" title="Sort by ${label}" style="${index === 4 ? 'display:none;' : ''}"><span>${label}</span>${rangePicker || semanticPicker || columnFilter}</th>`;
        }).join('');
        const table = records.length
            ? `${controls}<table class="batch-intel-table"><thead><tr>${headerCells}</tr></thead><tbody id="batchIntelRows">${tableRows}</tbody></table>`
            : '<div class="empty">No batch records are available for this view.</div>';
        const reportTitle = `Batch Intel${historical ? ` · ${dateKey}` : ''}`;
        const subtitle = historical
            ? 'Saved batch snapshot. Scan, exception, and print details are limited to the data captured for this day; Batch links open the live detail page.'
            : 'Batch-level research view combining status totals, route efficiency, print timing, picker activity, shorts, and scan exceptions.';
        let html = getIntelligenceReportShell(reportTitle, subtitle, summary, table);
        html = html.replace('</style>', `.batch-intel-filter-panel{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:7px;margin:0 0 10px;padding:8px;background:#fff;border:1px solid #cbd5e1;border-radius:5px}.batch-intel-filter-panel[hidden]{display:none!important}.batch-intel-filter-group{min-width:0;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden}.batch-intel-filter-heading{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:5px 7px;background:#f1f5f9;color:#334155;font-size:10px}.batch-intel-filter-heading strong{display:flex;align-items:center;gap:5px}.batch-intel-filter-heading small{color:#64748b;font-size:9px;font-weight:700}.batch-intel-filter-heading>span{display:flex;gap:3px}.batch-intel-filter-heading button{padding:2px 5px;border:1px solid #cbd5e1;border-radius:3px;background:#fff;color:#334155;font-size:9px;font-weight:700;cursor:pointer}.batch-intel-filter-heading button:hover{background:#e2e8f0}.batch-intel-filter-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 6px;max-height:132px;overflow:auto;padding:5px 7px}.batch-intel-filter-options label{display:flex;align-items:center;gap:5px;min-width:0;color:#475569;font-size:10px;cursor:pointer}.batch-intel-filter-options label span{overflow-wrap:anywhere}.batch-intel-filter-options input{flex:0 0 auto;margin:0}.batch-intel-toolbar #batchIntelFiltersToggle{height:32px;padding:0 9px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;color:#334155;font-size:10px;font-weight:800;cursor:pointer}.batch-intel-toolbar #batchIntelFiltersToggle:hover{background:#f1f5f9}body.tm-dark-mode .batch-intel-filter-panel{background:#101a14;border-color:#315443}body.tm-dark-mode .batch-intel-filter-group{border-color:#315443}body.tm-dark-mode .batch-intel-filter-heading{background:#17251d;color:#eaf7ee}body.tm-dark-mode .batch-intel-filter-heading small{color:#a8bdb0}body.tm-dark-mode .batch-intel-filter-heading button,body.tm-dark-mode .batch-intel-toolbar #batchIntelFiltersToggle{background:#123b24;color:#a7ffb5;border-color:#496052}body.tm-dark-mode .batch-intel-filter-options label{color:#c5d8cb}@media(max-width:720px){.batch-intel-filter-panel{grid-template-columns:repeat(auto-fit,minmax(155px,1fr))}}</style>`);
        html = html.replace('</style>', `.batch-intel-toolbar{top:0;display:flex;flex-wrap:wrap;gap:6px;padding:7px}.batch-intel-toolbar .search{min-width:190px;flex:1 1 220px}.batch-intel-toolbar select,.batch-intel-toolbar input[type=number]{height:32px;max-width:190px;border:1px solid #cbd5e1;border-radius:5px;background:#f8fafc;color:#0f172a;padding:4px 7px;font-size:10px}.batch-intel-time-filter{display:inline-flex;align-items:center;gap:4px;color:#475569;font-size:9px;font-weight:800;white-space:nowrap}.batch-intel-time-filter input[type=number]{width:58px;min-width:0}.batch-intel-time-filter small{font-size:9px}.batch-intel-table{min-width:1900px;font-size:10px}.batch-intel-table th{top:48px;text-align:center}.batch-intel-table th[data-sort-index]{cursor:pointer;user-select:none}.batch-intel-table th[data-sort-index]:hover{color:#1d4ed8}.batch-intel-table th[aria-sort=ascending]::after{content:' ▲';color:#2563eb}.batch-intel-table th[aria-sort=descending]::after{content:' ▼';color:#2563eb}.batch-intel-table td{text-align:center;vertical-align:middle}.batch-intel-table tbody tr[hidden]{display:none}.batch-intel-id{color:${document.body.classList.contains('tm-dark-mode') ? '#7dd3fc' : '#1d4ed8'};font-weight:900}.batch-intel-sub{margin-top:3px;color:#64748b;font-size:9px;white-space:nowrap}.batch-intel-hub{font-weight:900}.numeric{font-variant-numeric:tabular-nums}.batch-intel-status{display:inline-block;padding:3px 6px;border-radius:3px;font-size:9px;font-weight:900}.batch-intel-status.complete{background:#dcfce7;color:#047857}.batch-intel-status.active{background:#fef3c7;color:#92400e}.batch-intel-status.printed{background:#dbeafe;color:#1d4ed8}.batch-intel-issues{min-width:110px;text-align:left}.batch-intel-issues summary{color:#b91c1c;font-weight:800;cursor:pointer;white-space:nowrap}.batch-intel-issues>div{position:relative;z-index:3;min-width:260px;max-width:380px;max-height:240px;overflow:auto;padding:5px;background:#fff;border:1px solid #cbd5e1;border-radius:4px;box-shadow:0 4px 12px rgba(15,23,42,.14)}.batch-intel-issues article{display:grid;gap:3px;padding:6px;border-bottom:1px solid #e2e8f0;white-space:normal}.batch-intel-issues article:last-child{border-bottom:0}.batch-intel-issues article a{color:#1d4ed8;font-weight:800}.batch-intel-issues article span{color:#475569;font-size:9px}.batch-intel-table td[title]{cursor:help}body.tm-dark-mode .batch-intel-toolbar select,body.tm-dark-mode .batch-intel-toolbar input[type=number]{background:#17251d;color:#eaf7ee;border-color:#496052}body.tm-dark-mode .batch-intel-time-filter{color:#a8bdb0}body.tm-dark-mode .batch-intel-sub{color:#a8bdb0}body.tm-dark-mode .batch-intel-status.complete{background:#17492b;color:#9fffb0}body.tm-dark-mode .batch-intel-status.active{background:#3b2d0d;color:#ffdc70}body.tm-dark-mode .batch-intel-status.printed{background:#12364a;color:#9ce6ff}body.tm-dark-mode .batch-intel-issues>div{background:#101a14;border-color:#496052}body.tm-dark-mode .batch-intel-issues article{border-color:#315443}body.tm-dark-mode .batch-intel-issues article a{color:#7dd3fc}body.tm-dark-mode .batch-intel-issues article span{color:#c5d8cb}@media(max-width:720px){.batch-intel-toolbar select{flex:1 1 145px;max-width:none}.batch-intel-time-filter{flex:1 1 100%}.batch-intel-table{min-width:1750px}}</style>`);
        html = html.replace('</style>', `.batch-intel-count-ranges,.batch-intel-column-panel{grid-column:1/-1;min-width:0;overflow:hidden;border:1px solid #e2e8f0;border-radius:4px;background:#fff}.batch-intel-count-ranges>label{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0;padding:10px}.batch-intel-count-ranges>label>span{display:flex;align-items:center;gap:6px;min-width:0}.batch-intel-count-ranges input[type=number]{width:0;min-width:0;max-width:none;height:30px;flex:1 1 0;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;color:#0f172a;padding:4px 6px;font-size:11px;font-variant-numeric:tabular-nums}.batch-intel-count-ranges b{color:#64748b;font-size:10px;font-weight:600}.batch-intel-count-ranges .batch-intel-filter-heading,.batch-intel-column-panel .batch-intel-filter-heading{border-bottom:1px solid #e2e8f0}.batch-intel-column-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:3px 8px;padding:8px}.batch-intel-column-options label{display:flex;align-items:center;gap:6px;min-width:0;min-height:26px;margin:0;padding:3px 5px;border-radius:3px;color:#475569;font-size:10px;cursor:pointer}.batch-intel-column-options label:hover{background:#f1f5f9}.batch-intel-column-options input{flex:0 0 auto;margin:0;accent-color:#2563eb}.batch-intel-column-options label span{min-width:0;overflow-wrap:anywhere}body.tm-dark-mode .batch-intel-count-ranges,body.tm-dark-mode .batch-intel-column-panel{background:#101a14;border-color:#315443}body.tm-dark-mode .batch-intel-count-ranges .batch-intel-filter-heading,body.tm-dark-mode .batch-intel-column-panel .batch-intel-filter-heading{border-color:#315443}body.tm-dark-mode .batch-intel-count-ranges input[type=number]{background:#17251d;color:#eaf7ee;border-color:#496052}body.tm-dark-mode .batch-intel-count-ranges b,body.tm-dark-mode .batch-intel-column-options label{color:#a8bdb0}body.tm-dark-mode .batch-intel-column-options label:hover{background:#17251d}body.tm-dark-mode .batch-intel-column-options input{accent-color:#39e66b}@media(max-width:520px){.batch-intel-count-ranges>label{grid-template-columns:1fr;gap:6px}.batch-intel-column-options{grid-template-columns:repeat(auto-fit,minmax(110px,1fr))}}</style>`);
        html = html.replace('</body>', `<script>(()=>{const rows=Array.from(document.querySelectorAll('#batchIntelRows tr[data-batch]'));const search=document.getElementById('batchIntelSearch');const zone=document.getElementById('batchIntelZone');const workType=document.getElementById('batchIntelWorkType');const printType=document.getElementById('batchIntelPrintType');const status=document.getElementById('batchIntelStatus');const flags=document.getElementById('batchIntelFlags');const sort=document.getElementById('batchIntelSort');const minTime=document.getElementById('batchIntelMinTime');const maxTime=document.getElementById('batchIntelMaxTime');const count=document.getElementById('batchIntelCount');const headers=Array.from(document.querySelectorAll('.batch-intel-table th[data-sort-index]'));const numericColumns={6:'pending',7:'picked',8:'total',9:'pickedPercent',10:'efficiency',11:'timing',12:'printedAt',13:'assignedAt',14:'lastScan',15:'pickerCount',16:'pickSpan',17:'shortCount',18:'misscanCount'};let headerColumn=0,headerDirection=1;const updateHeaders=()=>headers.forEach(header=>{const index=Number(header.dataset.sortIndex);header.setAttribute('aria-sort',index===headerColumn?(headerDirection===1?'ascending':'descending'):'none')});const apply=()=>{const query=String(search?.value||'').trim().toLocaleLowerCase();const minimum=minTime?.value===''?null:Number(minTime.value);const maximum=maxTime?.value===''?null:Number(maxTime.value);rows.forEach(row=>{const duration=Number(row.dataset.timing);const outsideTimeRange=(minimum!==null&&(duration<minimum||duration<0))||(maximum!==null&&(duration>maximum||duration<0));row.hidden=!!((query&&!row.dataset.search.includes(query))||(zone?.value&&row.dataset.zone!==zone.value)||(workType?.value&&row.dataset.workType!==workType.value)||(printType?.value&&row.dataset.printType!==printType.value)||(status?.value&&row.dataset.status!==status.value)||(flags?.value&&row.dataset.flags!==flags.value)||outsideTimeRange)});const visible=rows.filter(row=>!row.hidden);let column=headerColumn,direction=headerDirection;if(sort?.value){const sortColumns={id:0,pending:6,timing:11,efficiency:10,'last-scan':14};column=sortColumns[sort.value]??0;direction=sort.value==='id'?1:-1}const dataKey=numericColumns[column];visible.sort((a,b)=>{if(dataKey){const first=Number(a.dataset[dataKey]);const second=Number(b.dataset[dataKey]);return ((Number.isFinite(first)?first:-1)-(Number.isFinite(second)?second:-1))*direction}return a.cells[column].innerText.trim().localeCompare(b.cells[column].innerText.trim(),undefined,{numeric:true,sensitivity:'base'})*direction}).forEach(row=>row.parentNode.appendChild(row));if(count)count.textContent=visible.length+' / '+rows.length+' batches'};headers.forEach(header=>{const sortHeader=()=>{const index=Number(header.dataset.sortIndex);if(headerColumn===index)headerDirection*=-1;else{headerColumn=index;headerDirection=1}if(sort)sort.value='';updateHeaders();apply()};header.addEventListener('click',sortHeader);header.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();sortHeader()}})});sort?.addEventListener('change',()=>{if(sort.value)headerColumn=null;headers.forEach(header=>header.setAttribute('aria-sort','none'));apply()});[search,zone,workType,printType,status,flags,minTime,maxTime].forEach(control=>{control?.addEventListener('input',apply);control?.addEventListener('change',apply)});updateHeaders();apply()})();<\/script></body>`);
        openIntelligenceIframe('Batch Intel', html, historical ? `Saved ${dateKey} snapshot` : 'Current 2:00 AM Operational Day');
    }

    function openAssociateIntelligenceReport() {
        const selectedDateKey = localStorage.getItem('__batch_status_history_date') || getOperationalDayKey();
        let historicalSnapshot = null;
        if (historicalViewActive) {
            if (selectedHistoricalBatchSnapshot?.dateKey === selectedDateKey) {
                historicalSnapshot = selectedHistoricalBatchSnapshot;
            } else {
                const unavailable = getIntelligenceReportShell(
                    `Associate Pick Intelligence · ${selectedDateKey}`,
                    'The selected day’s detailed batch snapshot is unavailable in this browser.',
                    '',
                    '<div class="empty">No historical pick events are available for this day.</div>'
                );
                openIntelligenceIframe('Associate Pick Intelligence', unavailable);
                return;
            }
        }
        const reportWindow = historicalSnapshot ? getOperationalDayWindowForKey(historicalSnapshot.dateKey) : getOperationalDayWindow();
        associateIntelReportWindow = reportWindow;
        associateIntelHistorical = !!historicalSnapshot;
        const cache = historicalSnapshot ? {} : getStoredBatchCache();
        const rowMap = new Map(Array.from(masterBatchIndex, ([id, record]) => [id, record.row]));

        const normalizeAssociateName = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
        const normalizeAreaName = raw => {
            const value = String(raw || '').trim().toLocaleLowerCase();
            if (value.includes('pick by pallet')) return null;
            if (value.includes('calendar')) return 'Calendars';
            if (value.includes('unit pick')) return 'Unit Pick';
            if (value.includes('reserve')) return 'Reserve';
            if (value.includes('ptb') || value.includes('pick to belt')) return 'Pick to Belt';
            // Every other type is Floor, including Furniture, Liquid, Boards,
            // Mats, Mats/Furniture, and future miscellaneous floor types.
            return 'Floor';
        };

        const associates = new Map();
        const getCurrentDayEventsForPicker = picker => {
            const window = reportWindow;
            const eventList = Array.isArray(picker?.pickEvents) ? picker.pickEvents : [];
            const currentEvents = eventList
                .map(event => {
                    const cachedTs = Number(event?.ts);
                    const ts = cachedTs >= window.start && cachedTs < window.end
                        ? cachedTs
                        : getScanTimestamp(event?.timeStr);
                    return { ...event, ts, timeStr: String(event?.timeStr || '').trim(), valid: !!ts };
                })
                .filter(event => event.valid && event.ts >= window.start && event.ts < window.end)
                .sort((a, b) => a.ts - b.ts);
            if (currentEvents.length) return currentEvents;

            const fallbackEvents = [];
            const cachedFirstTs = Number(picker?.firstTs);
            const cachedLastTs = Number(picker?.lastTs);
            const firstTs = cachedFirstTs >= window.start && cachedFirstTs < window.end
                ? cachedFirstTs
                : getScanTimestamp(picker?.firstTimeStr);
            const lastTs = cachedLastTs >= window.start && cachedLastTs < window.end
                ? cachedLastTs
                : getScanTimestamp(picker?.timeStr);
            if (firstTs >= window.start && firstTs < window.end) {
                fallbackEvents.push({
                    ts:firstTs,
                    timeStr:String(picker.firstTimeStr || picker.timeStr || '').trim(),
                    location:picker.firstLocation || picker.location || 'Unknown',
                    carton:String(picker.firstCarton || '').trim()
                });
            }
            if (lastTs >= window.start && lastTs < window.end && lastTs !== firstTs) {
                fallbackEvents.push({
                    ts:lastTs,
                    timeStr:String(picker.timeStr || '').trim(),
                    location:picker.location || 'Unknown',
                    carton:''
                });
            }
            return fallbackEvents;
        };
        const formatGapLabel = minutes => {
            if (!Number.isFinite(minutes) || minutes <= 0) return 'No gap';
            if (minutes < 60) return `${Math.round(minutes)}m gap`;
            const hours = Math.floor(minutes / 60);
            const leftover = Math.round(minutes % 60);
            return `${hours}h ${leftover}m gap`;
        };

        const batchSources = historicalSnapshot
            ? (historicalSnapshot.batches || []).map(item => ({ batchId:item.id, batch:item.cache, row:true, hub:String(item.hub || '').trim(), rawArea:String(item.batchType || '').trim(), detailUrl:`/Home/BatchDetail?batchId=${encodeURIComponent(item.id)}` }))
            : Object.entries(cache).map(([id, cachedBatch]) => {
                const row = rowMap.get(String(id));
                return { batchId:id, batch:cachedBatch, row, hub:String(row?.getAttribute('data-saved-hub') || '').trim(), rawArea:String(row?.getAttribute('data-saved-type') || '').trim(),
                    detailUrl:row?.querySelector("a[href*='BatchDetail']")?.getAttribute('href') || `/Home/BatchDetail?batchId=${encodeURIComponent(id)}` };
            });
        batchSources.forEach(({ batchId, batch, row, hub, rawArea, detailUrl }) => {
            const area = normalizeAreaName(rawArea);
            if (!row || !batch || hub === 'DIS' || !area || !Array.isArray(batch.pickers)) return;

            const shortQty = Array.isArray(batch.shortLocations)
                ? batch.shortLocations.reduce((sum, item) => sum + (parseInt(item?.count, 10) || 0), 0)
                : 0;

            batch.pickers.forEach(picker => {
                if (!picker || typeof picker === 'string') return;
                const name = String(picker.name || '').trim();
                if (!name || name.includes('.') || normalizeAssociateName(name) === 'flr895jyc') return;

                const currentDayEvents = getCurrentDayEventsForPicker(picker);
                if (!currentDayEvents.length) return;

                const firstEvent = currentDayEvents[0];
                const lastEvent = currentDayEvents[currentDayEvents.length - 1];
                const firstTs = Number(firstEvent.ts) || getScanTimestamp(firstEvent.timeStr);
                const lastTs = Number(lastEvent.ts) || getScanTimestamp(lastEvent.timeStr);
                const gaps = [];
                for (let i = 1; i < currentDayEvents.length; i++) {
                    const prev = Number(currentDayEvents[i - 1].ts) || getScanTimestamp(currentDayEvents[i - 1].timeStr);
                    const curr = Number(currentDayEvents[i].ts) || getScanTimestamp(currentDayEvents[i].timeStr);
                    if (prev > 0 && curr > prev) gaps.push((curr - prev) / 60000);
                }
                const longestGap = gaps.length ? Math.max(...gaps) : 0;
                const totalDowntime = gaps.reduce((sum, value) => sum + value, 0);
                const averageGap = gaps.length ? totalDowntime / gaps.length : 0;

                const key = normalizeAssociateName(name);
                if (!associates.has(key)) {
                    associates.set(key, {
                        name,
                        areas: { Floor:0, Calendars:0, 'Pick to Belt':0, Reserve:0, 'Unit Pick':0 },
                        total:0,
                        firstTs:0,
                        firstTime:'--',
                        firstLocation:'Unknown',
                        firstCarton:'',
                        firstBatchId:'',
                        firstBatchUrl:'',
                        lastTs:0,
                        lastTime:'--',
                        lastLocation:'Unknown',
                        lastBatchId:'',
                        lastBatchUrl:'',
                        linkedShorts:0,
                        cartonDetails:[],
                        associatedBatches:new Map(),
                        longestGapMinutes:0,
                        totalDowntimeMinutes:0,
                        averageGapMinutes:0,
                        totalGapMinutes:0
                    });
                }

                const associate = associates.get(key);
                const cartons = parseInt(picker.completedCartons, 10) || currentDayEvents.length || 0;
                associate.areas[area] += cartons;
                associate.total += cartons;
                associate.linkedShorts += shortQty;
                associate.longestGapMinutes = Math.max(associate.longestGapMinutes || 0, longestGap || 0);
                associate.totalDowntimeMinutes = (associate.totalDowntimeMinutes || 0) + totalDowntime;
                associate.averageGapMinutes = (associate.averageGapMinutes || 0) + averageGap;
                associate.associatedBatches.set(String(batchId), {
                    batchId:String(batchId), batchUrl:detailUrl, hub:hub || 'Unknown', area, rawArea
                });
                currentDayEvents.forEach(event => {
                    const carton = String(event?.carton || '').trim();
                    const eventTs = Number(event?.ts) || getScanTimestamp(event?.timeStr);
                    if (!carton || !eventTs) return;
                    associate.cartonDetails.push({
                        batchId:String(batchId), batchUrl:detailUrl, carton,
                        location:String(event?.location || picker.location || 'Unknown'),
                        hub:hub || 'Unknown', area, rawArea, ts:eventTs,
                        status:String(event?.status || 'Picking Complete'),
                        timeStr:String(event?.timeStr || new Date(eventTs).toLocaleString())
                    });
                });

                if (firstTs && (!associate.firstTs || firstTs < associate.firstTs)) {
                    associate.firstTs = firstTs;
                    associate.firstTime = firstEvent.timeStr || picker.firstTimeStr || picker.timeStr || '--';
                    associate.firstLocation = firstEvent.location || picker.firstLocation || picker.location || 'Unknown';
                    associate.firstCarton = String(firstEvent.carton || picker.firstCarton || '').trim();
                    associate.firstBatchId = String(batchId);
                    associate.firstBatchUrl = associate.firstCarton
                        ? `${detailUrl.split('#')[0]}#tm-carton=${encodeURIComponent(associate.firstCarton)}`
                        : detailUrl;
                }

                if (lastTs > associate.lastTs) {
                    associate.lastTs = lastTs;
                    associate.lastTime = lastEvent.timeStr || picker.timeStr || '--';
                    associate.lastLocation = lastEvent.location || picker.location || 'Unknown';
                    associate.lastBatchId = String(batchId);
                    associate.lastBatchUrl = detailUrl;
                }
            });
        });

        const list = Array.from(associates.values()).sort((a,b) => b.total - a.total || a.name.localeCompare(b.name));
        associateIntelDetailData = new Map();
        list.forEach(associate => {
            const seen = new Set();
            const details = associate.cartonDetails
                .sort((a,b) => String(a.batchId).localeCompare(String(b.batchId), undefined, {numeric:true}) || a.ts-b.ts || a.carton.localeCompare(b.carton))
                .filter(item => { const key=`${item.batchId}|${item.carton}`; if(seen.has(key))return false; seen.add(key); return true; });
            const chronologicalDetails = details.filter(item => item.ts > 0).slice().sort((a,b) => a.ts-b.ts);
            const associateGaps = chronologicalDetails.slice(1).map((item,index) => (item.ts - chronologicalDetails[index].ts) / 60000).filter(gap => gap >= 0);
            associate.totalGapMinutes = associateGaps.reduce((sum,gap) => sum + gap, 0);
            associate.longestGapMinutes = associateGaps.length ? Math.max(...associateGaps) : 0;
            associate.averageGapMinutes = associateGaps.length ? associate.totalGapMinutes / associateGaps.length : 0;
            associate.totalDowntimeMinutes = associate.totalGapMinutes;
            associateIntelDetailData.set(associate.name.toLocaleLowerCase(), {
                name:associate.name,
                cachedDetails:details,
                batches:Array.from(associate.associatedBatches.values()).sort((a,b) => String(a.batchId).localeCompare(String(b.batchId), undefined, {numeric:true}))
            });
        });
        const ageMinutes = associate => historicalSnapshot || !associate.lastTs
            ? 99999
            : Math.max(0, Math.floor((Date.now() - associate.lastTs) / 60000));

        const areaTotals = list.reduce((totals, associate) => {
            Object.keys(totals).forEach(area => totals[area] += associate.areas[area] || 0);
            return totals;
        }, { Floor:0, Calendars:0, 'Pick to Belt':0, Reserve:0, 'Unit Pick':0 });

        const rows = list.map((associate, index) => {
            const age = ageMinutes(associate);
            const state = age <= 15 ? ['ACTIVE','status-active'] : age <= 45 ? ['RECENT','status-warm'] : ['STALE','status-idle'];
            const cells = ['Floor','Calendars','Pick to Belt','Reserve','Unit Pick'].map(area => {
                const value = associate.areas[area] || 0;
                return `<td class="area-total ${value ? 'has-picks' : ''}" data-value="${value}">${value.toLocaleString()}</td>`;
            }).join('');
            const downtimeText = associate.totalGapMinutes > 0
                ? `<span class="pill warn">${formatGapLabel(associate.longestGapMinutes)}</span><div class="muted">${formatGapLabel(associate.totalGapMinutes)} total · ${Math.round(associate.averageGapMinutes)}m avg</div>`
                : '<span class="muted">No gaps</span>';
            return `<tr data-status="${state[0].toLowerCase()}" data-cartons="${associate.total}" data-shorts="${associate.linkedShorts}" data-gap-total="${associate.totalGapMinutes}" data-associate-key="${escapeHTML(associate.name.toLocaleLowerCase())}" class="associate-click-row" title="Open the full pick timeline for ${escapeHTML(associate.name)}">
                <td>${index + 1}</td>
                <td class="name">${escapeHTML(associate.name)}<div class="${state[1]}">${state[0]}</div></td>
                <td class="activity-cell">${historicalSnapshot ? '' : escapeHTML(getRelativeTimeStr(associate.lastTime))}<div class="muted">${escapeHTML(associate.lastTime)}</div></td>
                <td class="loc">${associate.lastBatchId
                    ? `<button type="button" class="last-pick-link" data-pick-label="Last Pick" data-batch-id="${escapeHTML(associate.lastBatchId)}" data-batch-url="${escapeHTML(associate.lastBatchUrl)}">${escapeHTML(associate.lastLocation)}</button><div class="metric-note">Batch #${escapeHTML(associate.lastBatchId)}</div>`
                    : escapeHTML(associate.lastLocation)}</td>
                <td class="total-picked"><strong>${associate.total.toLocaleString()}</strong></td>
                ${cells}
                <td>${downtimeText}</td>
            </tr>`;
        }).join('');

        const filterBar = `<div class="advanced-filters">
            <label>Status<select id="statusFilter"><option value="all">All activity</option><option value="active">Active ≤15 min</option><option value="recent">Recent 16–45 min</option><option value="stale">Stale 46+ min</option></select></label>
            <label>Minimum total<input id="minCartons" type="number" min="0" value="0"></label>
            <label>Area<select id="areaFilter"><option value="all">All areas</option><option value="floor">Floor</option><option value="calendars">Calendars</option><option value="pick-to-belt">Pick to Belt</option><option value="reserve">Reserve</option><option value="unit-pick">Unit Pick</option></select></label>
            <label class="filter-check"><input id="shortsOnly" type="checkbox"> Has linked shorts</label>
            <label>Sort<select id="sortFilter"><option value="total-desc">Total picked high to low</option><option value="gap-total">Total gap time high to low</option><option value="floor-desc">Floor high to low</option><option value="calendars-desc">Calendars high to low</option><option value="ptb-desc">Pick to Belt high to low</option><option value="reserve-desc">Reserve high to low</option><option value="unit-desc">Unit Pick high to low</option><option value="activity">Most recent activity</option><option value="name">Associate A-Z</option></select></label>
            <button id="resetFilters" type="button">Reset</button>
            <span id="filteredTotals"></span>
        </div>`;

        const totalsRow = `<tfoot><tr><th colspan="4">Visible Totals</th><th id="visibleTotalPicked">0</th><th id="visibleFloor">0</th><th id="visibleCalendars">0</th><th id="visiblePTB">0</th><th id="visibleReserve">0</th><th id="visibleUnit">0</th><th></th></tr></tfoot>`;
        const table = list.length
            ? `${filterBar}<table><thead><tr><th>Rank</th><th>Associate / Status</th><th>Last Activity</th><th>Last Location</th><th>Total Picked</th><th>Floor</th><th>Calendars</th><th>Pick to Belt</th><th>Reserve</th><th>Unit Pick</th><th>Downtime</th></tr></thead><tbody>${rows}</tbody>${totalsRow}</table>`
            : '<div class="empty">No current operational-day associate scan data is available. Run Smart Scan first.</div>';

        const subtitle = 'Current operational-day carton totals by consolidated area. PTB 13 and PTB 14 are combined as Pick to Belt. Reserve 1 and Reserve 2 are combined as Reserve. Furniture, Liquid, Boards, Mats, Mats/Furniture, and every unclassified area roll into Floor. Pick by Pallet and FLR895JYC are excluded.';
        const reportTitle = historicalSnapshot ? `Associate Pick Intelligence · ${historicalSnapshot.dateKey}` : 'Associate Pick Intelligence';
        const html = getIntelligenceReportShell(reportTitle, subtitle, '', table).replace('</style>', `.advanced-filters{position:sticky;top:0;z-index:3;display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;padding:9px;background:${document.body.classList.contains('tm-dark-mode')?'#101a14':'#fff'};border-bottom:1px solid ${document.body.classList.contains('tm-dark-mode')?'#315443':'#cbd5e1'}}.advanced-filters label{display:flex;align-items:center;gap:5px;color:${document.body.classList.contains('tm-dark-mode')?'#a8bdb0':'#475569'};font-size:9px;font-weight:800;text-transform:uppercase}.advanced-filters select,.advanced-filters input[type=number]{height:28px;border:1px solid ${document.body.classList.contains('tm-dark-mode')?'#496052':'#cbd5e1'};border-radius:4px;background:${document.body.classList.contains('tm-dark-mode')?'#17251d':'#f8fafc'};color:${document.body.classList.contains('tm-dark-mode')?'#eaf7ee':'#0f172a'};padding:3px 6px;font-size:10px}.advanced-filters input[type=number]{width:75px}.advanced-filters .filter-check{height:28px;padding:0 7px;border:1px solid ${document.body.classList.contains('tm-dark-mode')?'#496052':'#cbd5e1'};border-radius:4px}.advanced-filters button{height:28px;border:1px solid ${document.body.classList.contains('tm-dark-mode')?'#2fc85d':'#2563eb'};border-radius:4px;background:${document.body.classList.contains('tm-dark-mode')?'#123b24':'#2563eb'};color:#fff;padding:0 9px;font-size:9px;font-weight:850;cursor:pointer}#filteredTotals{margin-left:auto;color:${document.body.classList.contains('tm-dark-mode')?'#7dd3fc':'#2563eb'};font-size:10px;font-weight:900}th,td{text-align:center!important}.name{text-align:left!important}.loc,.activity-cell{text-align:center!important}.area-total,.total-picked{text-align:center;font-variant-numeric:tabular-nums}.associate-click-row{cursor:pointer}.associate-click-row:hover td{background:#dbeafe!important}.associate-click-row.drawer-open td{background:#bfdbfe!important}.associate-detail-drawer>td{padding:0!important;background:#eff6ff!important}.associate-detail-frame{display:block;width:100%;height:430px;border:0;background:#fff}body.tm-dark-mode .associate-detail-drawer>td{background:#0d1912!important}.area-total{min-width:82px;color:${document.body.classList.contains('tm-dark-mode')?'#94a3b8':'#64748b'}}.area-total.has-picks{color:${document.body.classList.contains('tm-dark-mode')?'#7dd3fc':'#1d4ed8'};font-weight:850}.total-picked strong{color:${document.body.classList.contains('tm-dark-mode')?'#86efac':'#15803d'};font-size:13px}tfoot th{position:sticky;bottom:0;z-index:2;background:${document.body.classList.contains('tm-dark-mode')?'#17251d':'#e2e8f0'}!important;color:${document.body.classList.contains('tm-dark-mode')?'#9fffb0':'#334155'}!important;border-top:2px solid ${document.body.classList.contains('tm-dark-mode')?'#2fc85d':'#2563eb'};text-align:right;font-variant-numeric:tabular-nums}</style>`);

        openIntelligenceIframe('Associate Pick Intelligence', html, historicalSnapshot ? `Saved ${historicalSnapshot.dateKey} snapshot` : 'Current 2:00 AM Operational Day');
    }

    function openShortLocationIntelligenceReport() {
        const cache = displayedBatchCache || getStoredBatchCache();
        const sourceIndex = displayBatchIndex || masterBatchIndex;
        const rowMap = new Map(Array.from(sourceIndex, ([id, record]) => [id, record.row]));
        const selectedDateKey = localStorage.getItem('__batch_status_history_date') || getOperationalDayKey();
        const historyWindow = historicalViewActive ? getOperationalDayWindowForKey(selectedDateKey) : null;
        const locations = new Map();
        Object.entries(cache).forEach(([batchId,batch]) => {
            const row=rowMap.get(String(batchId));
            const hub=String(row?.getAttribute('data-saved-hub')||'').trim();
            const zone=String(row?.getAttribute('data-saved-type')||'').trim();
            if (!batch || hub==='DIS' || !Array.isArray(batch.shortLocations)) return;
            const pickers=(batch.pickers||[]).filter(p=>{
                if (!p || typeof p === 'string') return false;
                const ts = Number(p.lastTs) || getScanTimestamp(p.timeStr);
                return historyWindow ? ts >= historyWindow.start && ts < historyWindow.end : isTimestampInCurrentOperationalDay(p.timeStr);
            });
            batch.shortLocations.forEach(item=>{
                const loc=String(item?.location||'Unknown').replace(/-/g,'').trim()||'Unknown';
                const count=parseInt(item?.count,10)||0;
                if(count<=0)return;
                const key=loc.toLocaleLowerCase();
                if(!locations.has(key))locations.set(key,{location:loc,count:0,hubs:new Map(),zones:new Map(),batches:new Map(),pickers:new Map(),newestTs:0,newest:'--'});
                const x=locations.get(key);x.count+=count;x.hubs.set(hub||'Unknown',(x.hubs.get(hub||'Unknown')||0)+count);x.zones.set(zone||'Unknown',(x.zones.get(zone||'Unknown')||0)+count);
                const detailUrl=historicalViewActive ? '' : (row?.querySelector("a[href*='BatchDetail']")?.getAttribute('href')||`/Home/BatchDetail?batchId=${encodeURIComponent(batchId)}`);
                const existingBatch=x.batches.get(batchId)||{count:0,url:detailUrl,cartons:[]};
                existingBatch.count+=count;
                const itemCartons=Array.isArray(item?.cartons)?item.cartons.map(c=>String(c||'').trim()).filter(Boolean):[];
                existingBatch.cartons=Array.from(new Set([...(existingBatch.cartons||[]),...itemCartons]));
                x.batches.set(batchId,existingBatch);
                pickers.forEach(p=>{x.pickers.set(p.name||'Unknown',(x.pickers.get(p.name||'Unknown')||0)+(parseInt(p.completedCartons,10)||0));const ts=getScanTimestamp(p.timeStr);if(ts>x.newestTs){x.newestTs=ts;x.newest=p.timeStr;}});
            });
        });
        const list=Array.from(locations.values()).sort((a,b)=>b.count-a.count || a.location.localeCompare(b.location,undefined,{numeric:true}));
        const total=list.reduce((n,x)=>n+x.count,0), critical=list.filter(x=>x.count>=10).length, hubs=new Set(list.flatMap(x=>Array.from(x.hubs.keys()))).size, batches=new Set(list.flatMap(x=>Array.from(x.batches.keys()))).size;
        const summary=`<div class="card"><span>Short Locations</span><strong>${list.length}</strong></div><div class="card"><span>Total Short Tickets</span><strong>${total.toLocaleString()}</strong></div><div class="card"><span>Locations With 10+</span><strong>${critical}</strong></div><div class="card"><span>Hubs Affected</span><strong>${hubs}</strong></div><div class="card"><span>Batches Affected</span><strong>${batches}</strong></div>`;
        const rows=list.map((x,i)=>{const fmt=(m,cls='')=>Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span class="pill ${cls}">${escapeHTML(k)} ${v.toLocaleString()}</span>`).join('')||'<span class="muted">--</span>';const batchImpact=Array.from(x.batches.entries()).sort((a,b)=>b[1].count-a[1].count).map(([id,b])=>`<button type="button" class="pill batch short-batch-link" data-batch-id="${escapeHTML(id)}" data-batch-url="${escapeHTML(b.url)}" data-location="${escapeHTML(x.location)}" data-carton="${escapeHTML((b.cartons||[])[0]||'')}" title="Open Batch #${escapeHTML(id)} and highlight short location ${escapeHTML(x.location)}">#${escapeHTML(id)} ${Number(b.count||0).toLocaleString()}</button>`).join('')||'<span class="muted">--</span>';const vision=escapeHTML(buildVisionShortUrl(x.location));return `<tr><td>${i+1}</td><td class="loc"><a href="${vision}" target="_blank" style="color:inherit;text-decoration:none">${escapeHTML(x.location)}</a></td><td><span class="pill warn">${x.count.toLocaleString()} short</span></td><td>${escapeHTML(getRelativeTimeStr(x.newest))}<div class="muted">${escapeHTML(x.newest)}</div></td><td class="details">${fmt(x.hubs,'hub')}</td><td class="details">${fmt(x.zones,'zone')}</td><td class="details">${batchImpact}</td><td class="details">${fmt(x.pickers,'person')}</td><td class="details"><a href="${vision}" target="_blank" style="color:inherit;font-weight:800">Open in Vision</a></td></tr>`}).join('');
        const table=list.length?`<table><thead><tr><th>Rank</th><th>Location</th><th>Short Qty</th><th>Newest Linked Pick</th><th>Hub Impact</th><th>Zone Impact</th><th>Batch Impact</th><th>Linked Pickers / Picks</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">No short locations are available in the scanned non-DIS batch cache. Run Scan Now first.</div>';
        openIntelligenceIframe('Short Location Intelligence',getIntelligenceReportShell('Short Location Intelligence','Prioritized short-location view with hub, zone, batch, picker and Vision detail.',summary,table));
    }

    function buildAssociateLastPickPanel() {
        const cache = displayedBatchCache || getStoredBatchCache();
        const sourceRows = displayedBatchRows || originalDataRows;
        const selectedDateKey = localStorage.getItem('__batch_status_history_date') || getOperationalDayKey();
        const historyWindow = historicalViewActive ? getOperationalDayWindowForKey(selectedDateKey) : null;
        const associateMap = new Map();
        const existingSearchValue = document.getElementById('associateLastPickSearch')?.value || '';
        const batchHubMap = new Map();
        sourceRows.forEach(row => {
            const batchId = String(row.getAttribute('data-saved-id') || '');
            const hub = String(row.getAttribute('data-saved-hub') || '').trim();
            if (batchId) batchHubMap.set(batchId, hub);
        });
        Object.entries(cache).forEach(([batchId, batch]) => {
            if (!batch || !Array.isArray(batch.pickers)) return;
            const batchHub = batchHubMap.get(String(batchId)) || '';
            if (batchHub === 'DIS') return;
            batch.pickers.forEach(picker => {
                if (!picker) return;
                const name = typeof picker === 'string' ? picker.trim() : String(picker.name || '').trim();
                if (!name || name.includes('.') || name.toLocaleLowerCase() === 'flr895jyc') return;
                const location = typeof picker === 'string' ? 'Unknown' : (picker.location || 'Unknown');
                const timeStr = typeof picker === 'string' ? 'Unknown' : (picker.timeStr || '--');
                const ts = typeof picker === 'string' ? getScanTimestamp(timeStr) : (Number(picker.lastTs) || getScanTimestamp(timeStr));
                if (historyWindow ? (ts < historyWindow.start || ts >= historyWindow.end) : !isTimestampInCurrentOperationalDay(timeStr)) return;
                const completedCartons = typeof picker === 'string' ? 0 : (parseInt(picker.completedCartons, 10) || 0);
                const key = name.toLocaleLowerCase();
                const existing = associateMap.get(key);
                if (!existing) {
                    associateMap.set(key, { name, location, timeStr, ts, hub: batchHub, completedCartons });
                } else {
                    existing.completedCartons += completedCartons;
                    if (ts > existing.ts) {
                        existing.name = name;
                        existing.location = location;
                        existing.timeStr = timeStr;
                        existing.ts = ts;
                        existing.hub = batchHub;
                    }
                }
            });
        });
        const associates = Array.from(associateMap.values())
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        const rows = associates.length ? associates.map(a => {
            const relativeTime = getRelativeTimeStr(a.timeStr);
            const staleClass = /(?:hr|d ago)/.test(relativeTime) ? ' associate-last-pick-stale' : '';
            const showHub = a.hub && a.hub.toUpperCase() !== 'MULTIPLE';
            const searchableText = `${a.name} ${a.location} ${showHub ? a.hub : ''} ${a.completedCartons}`.toLocaleLowerCase();
            return `
                <div class="associate-last-pick-row" data-search-text="${escapeHTML(searchableText)}" style="padding:7px 2px; border-bottom:1px solid #e2e8f0;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <div style="display:flex; align-items:center; gap:5px; min-width:0;">
                            <div style="font-weight:700; color:#0f172a; line-height:1.2; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(a.name)}</div>
                            <span title="Completed cartons in scanned batch details" style="flex:0 0 auto; padding:2px 5px; border-radius:999px; background:#dcfce7; color:#047857; font-size:9px; font-weight:800; line-height:1.2;">${a.completedCartons.toLocaleString()}</span>
                        </div>
                        ${showHub ? `<span style="flex:0 0 auto; padding:2px 5px; border-radius:3px; background:#dbeafe; color:#1d4ed8; font-size:9px; font-weight:800; line-height:1.2;">${escapeHTML(a.hub)}</span>` : ''}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-top:3px;">
                        <span style="color:#475569; font-weight:600; word-break:break-word;">${escapeHTML(a.location)}</span>
                        <span class="associate-last-pick-time${staleClass}" data-raw-time="${escapeHTML(a.timeStr)}" style="color:${staleClass ? '#dc2626' : '#64748b'}; font-size:10px; font-weight:${staleClass ? '700' : '600'}; white-space:nowrap;">${escapeHTML(relativeTime)}</span>
                    </div>
                </div>`;
        }).join('') : `<div style="padding:10px 2px; color:#64748b; font-size:11px;">No scanned associate data yet.</div>`;
        return `
            <div id="associate-last-pick-panel" style="margin-top:12px; padding:10px; border:1px solid #cbd5e1; border-radius:4px; background:#f8fafc;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:7px;">
                    <div><button type="button" id="openAssociateIntelligence" class="tm-panel-drilldown-title" title="Open full associate pick intelligence dashboard">Associate Last Pick</button><div style="margin-top:2px; color:#64748b; font-size:9px; font-weight:600;">Current 2:00 AM to 2:00 AM totals</div></div>
                    <span id="associateLastPickCount" style="font-size:10px; color:#64748b; font-weight:700;">${associates.length}</span>
                </div>
                <div style="position:relative; margin-bottom:8px;">
                    <span aria-hidden="true" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:11px; pointer-events:none;">⌕</span>
                    <input id="associateLastPickSearch" type="text" value="${escapeHTML(existingSearchValue)}" placeholder="Filter associates..." autocomplete="off" style="width:100%; height:28px; padding:4px 26px 4px 24px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; color:#334155; font-size:11px; outline:none;">
                    <button id="associateLastPickSearchClear" type="button" title="Clear filter" aria-label="Clear associate filter" style="display:${existingSearchValue ? 'block' : 'none'}; position:absolute; right:5px; top:50%; transform:translateY(-50%); width:18px; height:18px; padding:0; border:0; background:transparent; color:#64748b; font-size:14px; line-height:18px; cursor:pointer;">×</button>
                </div>
                <div style="display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:4px 2px 6px; border-bottom:2px solid #cbd5e1; color:#64748b; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.4px;">
                    <span>Name / Cartons / Location</span><span>Since Scan</span>
                </div>
                <div id="associateLastPickRows" style="max-height:360px; overflow-y:auto; padding-right:4px; font-size:11px;">${rows}</div>
                <div id="associateLastPickNoResults" style="display:none; padding:10px 2px; color:#64748b; font-size:11px; text-align:center;">No matching associates.</div>
            </div>`;
    }
    function formatVisionShortLocation(location) {
        const compact = String(location || '').trim().toUpperCase().replace(/-/g, '');
        let match = compact.match(/^(\d{2}[A-Z])(\d{3})$/);
        if (match) return `${match[1]}-${match[2]}`;
        match = compact.match(/^(\d{2}[A-Z])(\d{3})(\d)(\d)$/);
        if (match) return `${match[1]}-${match[2]}-${match[3]}-${match[4]}`;
        return compact;
    }
    function buildVisionShortUrl(location) {
        const formattedLocation = formatVisionShortLocation(location);
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('page_size', '25');
        ['NEW_ISSUE', 'IN_RESEARCH', 'WAITING_ON_REPLEN', 'SCRATCH', 'RESOLVED'].forEach(status => params.append('status', status));
        params.set('search', formattedLocation);
        return `https://sci-prod.az.staples.com/vision/clientWeb/flr/short/?${params.toString()}`;
    }
    function buildShortLocationsPanel() {
        const cache = displayedBatchCache || getStoredBatchCache();
        const sourceRows = displayedBatchRows || originalDataRows;
        const existingSearchValue = document.getElementById('shortLocationSearch')?.value || '';
        const batchHubMap = new Map();
        sourceRows.forEach(row => {
            const batchId = String(row.getAttribute('data-saved-id') || '');
            const hub = String(row.getAttribute('data-saved-hub') || '').trim();
            if (batchId) batchHubMap.set(batchId, hub);
        });
        const locationMap = new Map();
        Object.entries(cache).forEach(([batchId, batch]) => {
            if (!batch || !Array.isArray(batch.shortLocations)) return;
            const hub = batchHubMap.get(String(batchId)) || '';
            if (hub === 'DIS') return;
            batch.shortLocations.forEach(item => {
                const location = String(item?.location || 'Unknown').replace(/-/g, '').trim() || 'Unknown';
                const count = parseInt(item?.count, 10) || 0;
                if (count <= 0) return;
                const key = location.toLocaleLowerCase();
                if (!locationMap.has(key)) locationMap.set(key, { location, count: 0, hubs: new Map() });
                const entry = locationMap.get(key);
                entry.count += count;
                if (hub && hub.toUpperCase() !== 'MULTIPLE') entry.hubs.set(hub, (entry.hubs.get(hub) || 0) + count);
            });
        });
        const locations = Array.from(locationMap.values()).sort((a,b) => a.location.localeCompare(b.location, undefined, {numeric:true, sensitivity:'base'}));
        const rows = locations.length ? locations.map(item => {
            const hubs = Array.from(item.hubs.entries()).sort((a,b) => a[0].localeCompare(b[0], undefined, {sensitivity:'base'}));
            const hubBadges = hubs.map(([hub,count]) => `<span title="${count.toLocaleString()} short for ${escapeHTML(hub)}" style="display:inline-block; margin:2px 3px 0 0; padding:2px 5px; border-radius:3px; background:#dbeafe; color:#1d4ed8; font-size:9px; font-weight:800; cursor:help;">${count.toLocaleString()} ${escapeHTML(hub)}</span>`).join('');
            const searchable = `${item.location} ${hubs.map(([hub,count]) => `${hub} ${count}`).join(' ')}`.toLocaleLowerCase();
            return `<div class="short-location-row" data-search-text="${escapeHTML(searchable)}" style="padding:7px 2px; border-bottom:1px solid #e2e8f0;">
                <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
                    <a href="${escapeHTML(buildVisionShortUrl(item.location))}" target="_blank" rel="noopener noreferrer" title="Open ${escapeHTML(formatVisionShortLocation(item.location))} in Vision" style="font-weight:800; color:#2563eb; text-decoration:none; border-bottom:1px dotted #60a5fa;">${escapeHTML(item.location)}</a>
                    <span style="padding:2px 6px; border-radius:999px; background:#fee2e2; color:#b91c1c; font-size:10px; font-weight:800;">${item.count.toLocaleString()} short</span>
                </div>
                ${hubBadges ? `<div style="margin-top:3px;">${hubBadges}</div>` : ''}
            </div>`;
        }).join('') : `<div style="padding:10px 2px; color:#64748b; font-size:11px;">No short locations found.</div>`;
        return `<div id="short-locations-panel" style="margin-top:12px; padding:10px; border:1px solid #cbd5e1; border-radius:4px; background:#f8fafc;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:7px;">
                <button type="button" id="openShortLocationIntelligence" class="tm-panel-drilldown-title" title="Open full short-location intelligence dashboard">Short Locations</button>
                <span id="shortLocationCount" style="font-size:10px; color:#64748b; font-weight:700;">${locations.length}</span>
            </div>
            <div style="position:relative; margin-bottom:8px;">
                <span aria-hidden="true" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:11px; pointer-events:none;">⌕</span>
                <input id="shortLocationSearch" type="text" value="${escapeHTML(existingSearchValue)}" placeholder="Filter locations or hubs..." autocomplete="off" style="width:100%; height:28px; padding:4px 26px 4px 24px; border:1px solid #cbd5e1; border-radius:4px; background:#fff; color:#334155; font-size:11px; outline:none;">
                <button id="shortLocationSearchClear" type="button" title="Clear filter" style="display:${existingSearchValue ? 'block':'none'}; position:absolute; right:5px; top:50%; transform:translateY(-50%); width:18px; height:18px; padding:0; border:0; background:transparent; color:#64748b; font-size:14px; line-height:18px; cursor:pointer;">×</button>
            </div>
            <div id="shortLocationRows" style="max-height:320px; overflow-y:auto; padding-right:4px; font-size:11px;">${rows}</div>
            <div id="shortLocationNoResults" style="display:none; padding:10px 2px; color:#64748b; font-size:11px; text-align:center;">No matching locations.</div>
        </div>`;
    }
    const ASSISTANT_AI_DEFAULTS = {
        minimumInactivityMinutes: 20,
        minimumCompletedMatches: 1,
        maximumMissedInGroup: 20,
        minimumConfidenceScore: 20,
        completedMatchWeight: 7,
        isolatedGapBonus: 18,
        highCompletionRatioBonus: 18,
        longInactivityBonus: 12,
        printedStatusBonus: 15,
        knownPickerBonus: 5,
        oneMissOnlyBonus: 10,
        showLowConfidence: true,
        excludeStatusKeywords: 'picking,canceled,cancelled',
        reportSort: 'score',
        reportDensity: 'comfortable'
    };
    function getAssistantAISettings() {
        try { return { ...ASSISTANT_AI_DEFAULTS, ...JSON.parse(localStorage.getItem('__assistant_ai_misscan_settings') || '{}') }; }
        catch (e) { return { ...ASSISTANT_AI_DEFAULTS }; }
    }
    function saveAssistantAISettings(settings) {
        localStorage.setItem('__assistant_ai_misscan_settings', JSON.stringify({ ...ASSISTANT_AI_DEFAULTS, ...settings }));
    }
    function scorePossibleMisScan(issue, batch, settings) {
        const completed = Number(issue.completedItems) || 0;
        const missed = Number(issue.remainingItems) || 0;
        const total = Math.max(1, Number(issue.totalItems) || completed + missed);
        const ageMinutes = Math.max(0, Math.floor((Date.now() - getScanTimestamp(batch.lastScanTime)) / 60000));
        const status = String(issue.status || '').toLowerCase();
        let score = 18;
        const reasons = ['activity is within the current 2:00 AM operational day'];
        const matchPoints = Math.min(28, completed * Number(settings.completedMatchWeight || 0));
        score += matchPoints; if (completed) reasons.push(`${completed} matching carton${completed === 1 ? '' : 's'} completed`);
        if (missed === 1) { score += Number(settings.oneMissOnlyBonus || 0); reasons.push('single isolated unfinished carton'); }
        if (completed > 0 && missed === 1) { score += Number(settings.isolatedGapBonus || 0); reasons.push('isolated gap in a completed item/location run'); }
        const ratio = completed / total;
        if (ratio >= .75) { score += Number(settings.highCompletionRatioBonus || 0); reasons.push(`${Math.round(ratio * 100)}% of matching cartons completed`); }
        if (ageMinutes >= Number(settings.minimumInactivityMinutes || 30) * 2) { score += Number(settings.longInactivityBonus || 0); reasons.push(`batch inactive ${ageMinutes} minutes`); }
        if (status.includes('printed') || status.includes('label')) { score += Number(settings.printedStatusBonus || 0); reasons.push('downstream print/label status without pick completion'); }
        if (issue.picker && issue.picker !== 'Unknown') { score += Number(settings.knownPickerBonus || 0); reasons.push('picker identified from matching completed work'); }
        score = Math.max(0, Math.min(100, Math.round(score)));
        const confidence = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low';
        return { score, confidence, reasons, ageMinutes };
    }
    function getPossibleMisScanFindings() {
        const settings = getAssistantAISettings();
        const cache = getStoredBatchCache();
        const batchRows = new Map(Array.from(masterBatchIndex, ([id, record]) => [id, record.row]));
        const excluded = String(settings.excludeStatusKeywords || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        const findings = [];
        const operationalWindow = getOperationalDayWindow();
        Object.entries(cache).forEach(([batchId, batch]) => {
            if (!batch || !Array.isArray(batch.possibleMisScans)) return;
            // Never display findings produced by older parser rules. This prevents
            // a cached recommendation from surviving after a matching carton enters Picking.
            if (batch.aiMisScanRuleVersion !== AI_MISSCAN_RULE_VERSION) return;
            const lastTs = getScanTimestamp(batch.lastScanTime);
            // Assistant AI only reviews batches with activity in the current
            // 2:00 AM to 2:00 AM operational day. Unknown or older activity is excluded.
            if (!lastTs || lastTs < operationalWindow.start || lastTs >= operationalWindow.end) return;
            const age = (Date.now() - lastTs) / 60000;
            if (age < Number(settings.minimumInactivityMinutes || 0)) return;
            const row = batchRows.get(String(batchId));
            const hub = String(row?.getAttribute('data-saved-hub') || '').trim();
            const serverPending = parseInt(row?.getAttribute('data-saved-pending')) || 0;
            if (hub === 'DIS' || serverPending === 0 || batch.completionInfo?.effectivelyComplete) return;
            const detailsHref = row?.querySelector("a[href*='BatchDetail']")?.getAttribute('href') || `/Home/BatchDetail?batchId=${encodeURIComponent(batchId)}`;
            batch.possibleMisScans.forEach(issue => {
                const status = String(issue.status || '').toLowerCase();
                if (excluded.some(word => status === word || status.startsWith(word + ' '))) return;
                if ((Number(issue.completedItems) || 0) < Number(settings.minimumCompletedMatches || 0)) return;
                if ((Number(issue.remainingItems) || 0) > Number(settings.maximumMissedInGroup || 999)) return;
                const ai = scorePossibleMisScan(issue, batch, settings);
                if (ai.score < Number(settings.minimumConfidenceScore || 0)) return;
                if (!settings.showLowConfidence && ai.confidence === 'Low') return;
                findings.push({ batchId, hub, detailsHref, lastScanTime: batch.lastScanTime, ...issue, ...ai });
            });
        });
        const sort = settings.reportSort;
        findings.sort((a,b) => sort === 'age' ? b.ageMinutes-a.ageMinutes : sort === 'batch' ? String(a.batchId).localeCompare(String(b.batchId),undefined,{numeric:true}) : b.score-a.score || b.ageMinutes-a.ageMinutes);
        return findings;
    }
    function applyDarkMode(enabled) {
        document.body.classList.toggle('tm-dark-mode', !!enabled);
        const b=document.getElementById('tm-dark-mode-toggle');
        if(b){b.textContent=enabled?'Light Mode':'AS400 Mode';b.title=enabled?'Switch to light mode':'Switch to AS400 black and green mode';}
        refreshOpenBatchDetailIframeThemes();
    }
    function renderTopDarkModeToggle() {
        const refresh = document.querySelector('a.btn-primary[href*="BatchStatus?completed="], a[href*="BatchStatus?completed="], a.btn-primary');
        const aiButton = document.getElementById('openPossibleMisScansReportTop');
        const toolbar = refresh?.parentNode || aiButton?.parentNode;
        if (!toolbar) return;
        let button = document.getElementById('tm-dark-mode-toggle');
        if (!button) {
            button = document.createElement('button');
            button.id = 'tm-dark-mode-toggle';
            button.type = 'button';
            button.onclick = () => {
                const enabled = !document.body.classList.contains('tm-dark-mode');
                localStorage.setItem('__batch_status_dark_mode', String(enabled));
                applyDarkMode(enabled);
            };
        }
        if (refresh && refresh.parentNode === toolbar) toolbar.insertBefore(button, refresh);
        else if (aiButton && aiButton.parentNode === toolbar) aiButton.insertAdjacentElement('afterend', button);
        else toolbar.appendChild(button);
        applyDarkMode(localStorage.getItem('__batch_status_dark_mode') === 'true');
    }
    function renderTopAssociateIntelButton() {
        const refreshButton = document.querySelector('a.btn-primary[href*="BatchStatus?completed="], a[href*="BatchStatus?completed="]');
        if (!refreshButton) return;
        let button = document.getElementById('openAssociateIntelligenceTop');
        if (!button) {
            button = document.createElement('button');
            button.id = 'openAssociateIntelligenceTop';
            button.type = 'button';
            button.textContent = 'Associate Intel';
            button.title = 'Open Associate Pick Intelligence';
            button.style.cssText = 'height:34px;padding:0 10px;border:1px solid #2563eb;border-radius:5px;background:#2563eb;color:#fff;font-size:10px;font-weight:800;line-height:1;white-space:nowrap;cursor:pointer;box-shadow:none;';
            button.addEventListener('click', openAssociateIntelligenceReport);
            refreshButton.parentNode.insertBefore(button, refreshButton);
        }
    }
    function renderTopBatchIntelButton() {
        const refreshButton = document.querySelector('a.btn-primary[href*="BatchStatus?completed="], a[href*="BatchStatus?completed="]');
        if (!refreshButton) return;
        let button = document.getElementById('openBatchIntelligenceTop');
        if (!button) {
            button = document.createElement('button');
            button.id = 'openBatchIntelligenceTop';
            button.type = 'button';
            button.textContent = 'Batch Intel';
            button.title = 'Open batch-level research and scan details';
            button.style.cssText = 'height:34px;padding:0 10px;border:1px solid #2563eb;border-radius:5px;background:#2563eb;color:#fff;font-size:10px;font-weight:800;line-height:1;white-space:nowrap;cursor:pointer;box-shadow:none;';
            button.addEventListener('click', openBatchIntelligenceReport);
            refreshButton.parentNode.insertBefore(button, refreshButton);
        }
    }
    function renderTopScanFreshness() {
        const refreshButton = document.querySelector('a.btn-primary[href*="BatchStatus?completed="], a[href*="BatchStatus?completed="]');
        if (!refreshButton) return;
        let indicator = document.getElementById('tm-last-scan-freshness');
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.id = 'tm-last-scan-freshness';
            indicator.style.cssText = 'display:inline-flex;align-items:center;height:30px;padding:0 7px;color:#475569;font-size:9px;font-weight:800;white-space:nowrap;';
        }
        let record = null;
        try { record = JSON.parse(localStorage.getItem('__batch_status_last_scan_record') || 'null'); }
        catch (e) { record = null; }
        const scannedAt = record?.at ? new Date(record.at) : null;
        if (scannedAt && !Number.isNaN(scannedAt.getTime())) {
            const sameDay = scannedAt.toDateString() === new Date().toDateString();
            const time = scannedAt.toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
            indicator.textContent = `Last scan ${sameDay ? time : `${scannedAt.toLocaleDateString()} ${time}`} · ${record.mode || 'Scan'}`;
            indicator.title = `Last completed batch scan: ${scannedAt.toLocaleString()} (${record.mode || 'Scan'})`;
        } else {
            indicator.textContent = 'Last scan: Not yet';
            indicator.title = 'No completed batch scan has been recorded in this browser yet.';
        }
        indicator.style.color = document.body.classList.contains('tm-dark-mode') ? '#a8bdb0' : '#475569';
        if (refreshButton.parentNode) refreshButton.parentNode.insertBefore(indicator, refreshButton);
    }
    function recordBatchScan(mode) {
        const record = { at:new Date().toISOString(), mode };
        try { localStorage.setItem('__batch_status_last_scan_record', JSON.stringify(record)); }
        catch (e) { console.warn('Could not save last scan time', e); }
        renderTopScanFreshness();
    }
    function normalizeTopActionToolbar() {
        const batchIntelButton = document.getElementById('openBatchIntelligenceTop');
        const associateIntelButton = document.getElementById('openAssociateIntelligenceTop');
        const aiButton = document.getElementById('openPossibleMisScansReportTop');
        const darkButton = document.getElementById('tm-dark-mode-toggle');
        const refreshButton = document.querySelector('a.btn-primary[href*="BatchStatus?completed="], a[href*="BatchStatus?completed="]');
        if (!refreshButton) return;
        let toolbar = document.getElementById('tm-batch-top-actions');
        if (!toolbar) {
            toolbar = document.createElement('span');
            toolbar.id = 'tm-batch-top-actions';
            refreshButton.parentNode.insertBefore(toolbar, refreshButton);
        }
        if (batchIntelButton) toolbar.appendChild(batchIntelButton);
        if (associateIntelButton) toolbar.appendChild(associateIntelButton);
        if (aiButton) toolbar.appendChild(aiButton);
        if (darkButton) toolbar.appendChild(darkButton);
        toolbar.appendChild(refreshButton);
        renderTopScanFreshness();
        const host = toolbar.parentElement;
        if (host) {
            host.style.width = '100%';
            host.style.maxWidth = '100%';
            host.style.minWidth = '0';
            host.style.boxSizing = 'border-box';
            host.style.paddingRight = '4px';
            host.style.overflow = 'visible';
            host.style.display = 'flex';
            host.style.justifyContent = 'flex-end';
            host.style.alignItems = 'center';
        }
    }
    function renderTopPossibleMisScansButton() {
        const historical = historicalViewActive;
        const count = historical ? 0 : getPossibleMisScanFindings().length;
        let button = document.getElementById('openPossibleMisScansReportTop');
        const refreshButton = document.querySelector('a.btn-primary[href*="BatchStatus?completed="], a[href*="BatchStatus?completed="]');
        if (!refreshButton) return;
        if (!button) {
            button=document.createElement('button'); button.id='openPossibleMisScansReportTop'; button.type='button';
            button.addEventListener('click',openPossibleMisScansReport);
            button.style.cssText='height:34px;padding:0 10px;border:1px solid #2563eb;border-radius:5px;background:#2563eb;color:#fff;font-size:10px;font-weight:800;cursor:pointer;vertical-align:middle;box-shadow:none;white-space:nowrap;';
            refreshButton.parentNode.insertBefore(button,refreshButton);
        }
        button.disabled = historical;
        if (historical) {
            button.textContent = 'Assistant AI · Today';
            button.title = 'Assistant AI uses current-day batch data. Return to Today to open it.';
            return;
        }
        button.innerHTML=`Assistant AI <span style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;margin-left:6px;padding:0 6px;border-radius:999px;background:${count?'#fef3c7':'rgba(255,255,255,.18)'};color:${count?'#92400e':'#fff'};font-size:10px;">${count}</span>`;
        button.title=count ? `${count} possible mis-scan${count===1?'':'s'} to review` : 'No current-rule findings. Scan active batches to refresh the AI cache.';
    }
    function openPossibleMisScansReport() {
        document.getElementById('possible-misscans-modal')?.remove();
        const findings=getPossibleMisScanFindings(), settings=getAssistantAISettings();
        const esc=escapeHTML;
        const rows=findings.map(i=>{const hub=i.hub&&i.hub.toUpperCase()!=='MULTIPLE';const cls=i.confidence.toLowerCase();const search=`${i.batchId} ${i.carton||''} ${i.item||''} ${i.location||''} ${i.status||''} ${i.picker||''} ${i.hub||''} ${i.confidence} ${i.reasons.join(' ')}`.toLowerCase();return `<tr data-search="${esc(search)}" data-confidence="${cls}"><td><span class="confidence ${cls}">${i.confidence}<b>${i.score}</b></span></td><td><a href="${esc(i.detailsHref)}#tm-carton=${encodeURIComponent(i.carton||'')}" target="_blank">${esc(i.batchId)}</a></td><td class="carton">${esc(i.carton||'--')}</td><td>${esc(i.item||'--')}</td><td><a href="${esc(buildVisionShortUrl(i.location))}" target="_blank">${esc(String(i.location||'Unknown').replace(/-/g,''))}</a></td><td><span class="status">${esc(i.status||'--')}</span></td><td>${esc(i.picker||'Unknown')}</td><td>${hub?`<span class="hub">${esc(i.hub)}</span>`:'--'}</td><td>${i.completedItems||0}/${i.totalItems||0}</td><td class="age">${esc(getRelativeTimeStr(i.lastScanTime))}</td><td class="reason">${i.reasons.map(r=>`<span>✓ ${esc(r)}</span>`).join('')}</td></tr>`}).join('');
        const fields=[
            ['minimumInactivityMinutes','Minimum inactive minutes','number','A batch must have no newer scan for at least this many minutes before Assistant AI will show a candidate. Lower this to see findings sooner. Recommended: 20 to 30.'],
            ['minimumCompletedMatches','Minimum completed matches','number','Minimum number of completed cartons required for the same item and location before an unfinished carton can be considered unusual. Use 1 for broad detection or 2 to 3 for stronger evidence.'],
            ['maximumMissedInGroup','Maximum unfinished in group','number','Hides groups with more unfinished cartons than this value. A large unfinished group may indicate normal unfinished work rather than an isolated missed scan. Increase this if the report is empty.'],
            ['minimumConfidenceScore','Minimum confidence score','number','Only findings at or above this 0 to 100 score are displayed. Lower values show more review candidates. Recommended starting value: 20.'],
            ['completedMatchWeight','Completed-match weight','number','Points added for each completed matching carton, capped by the scoring model. Higher values make repeated completed picks stronger evidence.'],
            ['isolatedGapBonus','Isolated-gap bonus','number','Extra points when one unfinished carton is isolated inside a group where matching cartons were completed.'],
            ['highCompletionRatioBonus','High completion-ratio bonus','number','Extra points when at least 75% of cartons for the same item and location were completed.'],
            ['longInactivityBonus','Long inactivity bonus','number','Extra points when inactivity is at least twice the minimum inactive-minutes setting.'],
            ['printedStatusBonus','Printed/label status bonus','number','Extra points when the unexpected status mentions Printed or Label, which may indicate downstream processing without a completed pick scan.'],
            ['knownPickerBonus','Known picker bonus','number','Extra points when a picker can be identified from the matching completed work. This does not prove responsibility.'],
            ['oneMissOnlyBonus','Single miss bonus','number','Extra points when exactly one carton remains unfinished in the matching item/location group.']
        ];
        const helpIcon=tip=>`<span class="help" title="${esc(tip)}" tabindex="0">?</span>`;
        const settingsHtml=fields.map(([k,l,t,tip])=>`<label title="${esc(tip)}"><span>${l} ${helpIcon(tip)}</span><input data-setting="${k}" type="${t}" value="${esc(settings[k])}"></label>`).join('')+`<label title="Comma-separated status words that are always ignored. Defaults exclude active Picking and canceled work."><span>Excluded status keywords ${helpIcon('Comma-separated status words that Assistant AI will always ignore. Keep picking, canceled, and cancelled unless you intentionally want those statuses reviewed.')}</span><input data-setting="excludeStatusKeywords" value="${esc(settings.excludeStatusKeywords)}"></label><label title="Controls the default order of findings in the report."><span>Report sort ${helpIcon('Confidence score shows strongest findings first. Oldest activity shows the longest-inactive batches first. Batch number groups results numerically.')}</span><select data-setting="reportSort"><option value="score" ${settings.reportSort==='score'?'selected':''}>Confidence score</option><option value="age" ${settings.reportSort==='age'?'selected':''}>Oldest activity</option><option value="batch" ${settings.reportSort==='batch'?'selected':''}>Batch number</option></select></label><label class="check" title="When disabled, findings scored below 50 are hidden."><input data-setting="showLowConfidence" type="checkbox" ${settings.showLowConfidence?'checked':''}><span>Show low-confidence findings ${helpIcon('Leave enabled while tuning the tool. When disabled, Low-confidence candidates are removed even if they meet the minimum score.')}</span></label>`;
        const html=`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#0f172a;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial}.bar{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid #cbd5e1;padding:12px 16px}.head{display:flex;align-items:center;gap:10px}.head h2{margin:0;font-size:18px}.pill{background:#fef3c7;color:#92400e;padding:4px 8px;border-radius:99px;font-weight:800}.tabs{margin-left:auto;display:flex;gap:5px}.tab{border:1px solid #cbd5e1;background:#fff;padding:6px 10px;border-radius:4px;font-weight:700;cursor:pointer}.tab.active{background:#0f172a;color:#fff}.search{width:100%;height:34px;margin-top:10px;border:1px solid #cbd5e1;border-radius:5px;padding:6px 10px}.content{padding:14px 16px}.panel{display:none}.panel.active{display:block}.shell{overflow:auto;border:1px solid #cbd5e1;border-radius:7px;background:#fff}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#e2e8f0;color:#475569;text-transform:uppercase;font-size:9px;padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid #e2e8f0;vertical-align:middle;overflow:hidden;text-overflow:ellipsis}tbody tr:nth-child(even)td{background:#f8fafc}a{color:#2563eb;font-weight:800;text-decoration:none}.carton{font-family:Consolas,monospace}.status{display:block;background:#fef3c7;color:#92400e;padding:4px;border-radius:4px;white-space:normal}.hub{background:#dbeafe;color:#1d4ed8;padding:2px 5px;border-radius:3px;font-weight:800}.age{color:#dc2626;font-weight:700;white-space:nowrap}.confidence{display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;font-weight:800}.confidence.high{background:#fee2e2;color:#b91c1c}.confidence.medium{background:#fef3c7;color:#92400e}.confidence.low{background:#e0f2fe;color:#0369a1}.reason span{display:block;font-size:10px;color:#475569;white-space:normal;margin:2px 0}.settings{max-width:820px;background:#fff;border:1px solid #cbd5e1;border-radius:7px;padding:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px}.grid label{display:flex;align-items:center;justify-content:space-between;gap:12px}.grid label span{font-weight:600}.grid input,.grid select{width:190px;height:30px;border:1px solid #cbd5e1;border-radius:4px;padding:4px 7px}.grid .check{justify-content:flex-start}.grid .check input{width:auto}.help{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;margin-left:4px;border-radius:50%;background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:900;cursor:help}.help:focus{outline:2px solid #2563eb}.actions{display:flex;gap:8px;margin-top:16px}.btn{border:0;border-radius:4px;padding:8px 12px;font-weight:800;cursor:pointer}.save{background:#0f172a;color:#fff}.reset{background:#e2e8f0}.hint{color:#64748b;font-size:11px;margin:0 0 14px}.empty{text-align:center;padding:40px;color:#64748b}</style></head><body><div class="bar"><div class="head"><h2>Assistant AI Review</h2><span style="color:#64748b;font-size:10px;font-weight:700;">Current 2:00 AM to 2:00 AM window</span><span class="pill" id="count">${findings.length}</span><div class="tabs"><button class="tab active" data-tab="report">Report</button><button class="tab" data-tab="settings">AI Settings</button></div></div><input class="search" id="search" placeholder="Search carton, item, location, status, picker, hub, batch, confidence or reason..."></div><div class="content"><section class="panel active" id="report"><div class="shell">${findings.length?`<table><thead><tr><th>AI</th><th>Batch</th><th>Carton</th><th>Item</th><th>Location</th><th>Status</th><th>Picker</th><th>Hub</th><th>Done</th><th>Last Scan</th><th>Assistant reasoning</th></tr></thead><tbody id="rows">${rows}</tbody></table>`:'<div class="empty"><b>No findings meet the current settings.</b><br><br>Open AI Settings and click <b>Show More Candidates</b>, or lower Minimum confidence score and Minimum inactive minutes.<br><br>Run <b>Scan Now</b> if the cache has not been refreshed. Previous operational-day findings are excluded automatically.</div>'}</div></section><section class="panel" id="settings"><div class="settings"><h3>Assistant AI behavior</h3><p class="hint">Settings save in this browser. Higher thresholds produce fewer, stronger review candidates. This tool suggests review items and does not confirm associate errors.</p><div class="grid">${settingsHtml}</div><div class="actions"><button class="btn save" id="save">Save & Recalculate</button><button class="btn reset" id="broad">Show More Candidates</button><button class="btn reset" id="strict">Stricter Review</button><button class="btn reset" id="reset">Reset Defaults</button></div></div></section></div><script>const tabs=[...document.querySelectorAll('.tab')],panels=[...document.querySelectorAll('.panel')],search=document.getElementById('search');tabs.forEach(b=>b.onclick=()=>{tabs.forEach(x=>x.classList.toggle('active',x===b));panels.forEach(p=>p.classList.toggle('active',p.id===b.dataset.tab));search.style.display=b.dataset.tab==='report'?'block':'none'});search.oninput=()=>{const q=search.value.toLowerCase();let n=0;document.querySelectorAll('#rows tr').forEach(r=>{const ok=!q||r.dataset.search.includes(q);r.style.display=ok?'':'none';if(ok)n++});document.getElementById('count').textContent=q?n+'/'+document.querySelectorAll('#rows tr').length:n};function collect(){const o={};document.querySelectorAll('[data-setting]').forEach(e=>o[e.dataset.setting]=e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value);return o}document.getElementById('save').onclick=()=>parent.postMessage({type:'assistant-ai-save',settings:collect()},'*');document.getElementById('broad').onclick=()=>{const o=collect();Object.assign(o,{minimumInactivityMinutes:10,minimumCompletedMatches:1,maximumMissedInGroup:50,minimumConfidenceScore:0,showLowConfidence:true});parent.postMessage({type:'assistant-ai-save',settings:o},'*')};document.getElementById('strict').onclick=()=>{const o=collect();Object.assign(o,{minimumInactivityMinutes:30,minimumCompletedMatches:2,maximumMissedInGroup:3,minimumConfidenceScore:55,showLowConfidence:false});parent.postMessage({type:'assistant-ai-save',settings:o},'*')};document.getElementById('reset').onclick=()=>parent.postMessage({type:'assistant-ai-reset'},'*');<\/script></body></html>`;
        const modal=document.createElement('div');modal.id='possible-misscans-modal';modal.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:18px';modal.innerHTML=`<div style="width:98vw;height:94vh;background:#fff;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35)"><div style="height:42px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-weight:700"><span>Assistant AI Mis-Scan Tool • Current 2 AM Operational Day</span><button id="closeAI" style="border:1px solid #475569;background:#1e293b;color:#fff;border-radius:4px;padding:4px 10px;cursor:pointer">Close</button></div><iframe style="width:100%;flex:1;border:0"></iframe></div>`;document.body.appendChild(modal);modal.querySelector('iframe').srcdoc=html;
        const close=()=>{window.removeEventListener('message',onMessage);modal.remove()};
        const onMessage=e=>{if(e.data?.type==='assistant-ai-save'){saveAssistantAISettings(e.data.settings);renderTopPossibleMisScansButton();close();openPossibleMisScansReport()}if(e.data?.type==='assistant-ai-reset'){saveAssistantAISettings(ASSISTANT_AI_DEFAULTS);renderTopPossibleMisScansButton();close();openPossibleMisScansReport()}};
        window.addEventListener('message',onMessage);modal.querySelector('#closeAI').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
    }
    function renderSettingsPanel() {
        const panel = document.getElementById("hub-settings-panel");
        if (!panel) return;

        // Preserve Search Value/Focus if re-rendered
        const existingSearchVal = document.getElementById('cartonSearchInput')?.value || '';
        const wasFocused = document.activeElement && document.activeElement.id === 'cartonSearchInput';

        const isCompletedChecked = getStoredToggleState('__sidebar_show_completed', true);
        const wasDisChecked = getStoredToggleState('__sidebar_show_dis', false);
        const wasHighlightChecked = getStoredToggleState('__sidebar_highlight_done', true);
        const wasKpiChecked = getStoredToggleState('__sidebar_show_kpis', true);
        const pickabilityMinimumCartons = getPickabilityMinimumCartons();
        const isAutoScanChecked = getStoredToggleState('__sidebar_auto_scan_enabled', false);
        const currentWidth = getStoredWidth();

        const autoScanInterval = localStorage.getItem('__sidebar_auto_scan_interval') || 1;
        const thresholdVal = getStoredThresholdVal();
        const thresholdType = getStoredThresholdType();

        const HUB_CUT_TIMES = getStoredHubCutTimes();
        const sortedHubs = Object.keys(HUB_CUT_TIMES).sort((a, b) => getChronologicalWeight(HUB_CUT_TIMES[a]) - getChronologicalWeight(HUB_CUT_TIMES[b]));

        let html = `
            <div style="border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 12px;">
               <h5 class="text-dark font-weight-bold">Carton Search</h5>
               <div style="display: flex; gap: 6px;">
                   <input type="text" id="cartonSearchInput" value="${existingSearchVal}" placeholder="Barcode..." class="form-control form-control-sm" style="height: 30px; font-size: 12px; padding: 4px 8px;">
                   <button id="cartonSearchBtn" class="btn btn-primary btn-sm" style="height: 30px; font-size: 12px; font-weight: bold; padding: 0 12px;">Go</button>
               </div>
            </div>

            <details id="controls-section" ${getStoredSectionState('controls-section', true) ? 'open' : ''} style="border-bottom:1px solid #cbd5e1; padding-bottom:12px; margin-bottom:12px;">
                <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; color:#0f172a; font-size:12px; font-weight:700; user-select:none;">
                    <span>Controls</span><span style="color:#64748b; font-size:10px;">SETTINGS</span>
                </summary>
                <div style="margin-top:10px;">
               <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;" class="text-secondary mb-2">
                   <label style="display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer;">
                       <input type="checkbox" id="sidebarCompletedCB" ${isCompletedChecked ? 'checked' : ''}> Show Completed
                   </label>
                   <label style="display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer;">
                       <input type="checkbox" id="sidebarDisCB" ${wasDisChecked ? 'checked' : ''}> Show DIS
                   </label>
                   <label style="display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer;">
                       <input type="checkbox" id="sidebarHighlightDoneCB" ${wasHighlightChecked ? 'checked' : ''}> Highlight Low
                   </label>

                   <div id="thresholdInputsContainer" style="display: ${wasHighlightChecked ? 'flex' : 'none'}; align-items: center; gap: 6px; margin-left: 18px; font-size: 11px;">
                       <span style="font-weight: 500;">Cut:</span>
                       <input type="number" id="thresholdValInput" value="${thresholdVal}" style="width: 50px; height: 26px; padding: 1px 4px; text-align: center;" min="0">
                       <select id="thresholdTypeSelect" style="height: 26px; padding: 1px 4px;">
                           <option value="percent" ${thresholdType === 'percent' ? 'selected' : ''}>%</option>
                           <option value="count" ${thresholdType === 'count' ? 'selected' : ''}>Qty</option>
                       </select>
                   </div>

                   <label style="display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer;">
                       <input type="checkbox" id="sidebarKpiCB" ${wasKpiChecked ? 'checked' : ''}> Show KPIs
                   </label>
                   <label for="pickabilityMinCartons" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 0 18px;font-size:10px;">
                       <span>Pick Efficiency minimum cartons</span>
                       <input type="number" id="pickabilityMinCartons" min="0" step="1" value="${pickabilityMinimumCartons}" style="width:58px;height:24px;padding:1px 4px;text-align:center;">
                   </label>
               </div>

               <div style="padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 11px;" class="text-secondary">
                   <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                       <span style="font-weight: 600; color: #475569;">Width</span>
                       <span id="widthValueDisplay" style="font-weight: bold; color: #2563eb;">${currentWidth}%</span>
                   </div>
                   <input type="range" id="widthAdjusterSlider" min="70" max="100" value="${currentWidth}" style="width: 100%; cursor: pointer;">
               </div>
                    <div style="margin-top:10px; padding-top:10px; border-top:1px solid #cbd5e1;">
                <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; color:#0f172a; font-size:12px; font-weight:700; user-select:none;">
                    <span>Batch Scanner</span><span style="color:#64748b; font-size:10px;">TOOLS</span>
                </summary>
                <div style="display:flex; gap:6px; margin-top:8px;">
                    <button id="scanAllBatchesBtn" class="btn btn-primary btn-sm text-white" style="flex:1; height:30px; padding:4px 8px !important; font-size:11px; text-transform:none; letter-spacing:0;" title="Scan active batches and only completed batches whose cache is missing, outdated, incomplete, or changed">Smart Scan</button>
                    <button id="clearScanDataBtn" class="btn btn-outline-danger btn-sm" title="Clear saved scan data" style="width:58px; height:30px; padding:4px 6px !important; font-size:11px;">Clear</button>
                </div>
                <div id="scanAllBatchesProgress" style="font-size:10px; color:#2563eb; font-weight:700; text-align:center; margin-top:5px; min-height:12px;"></div>
                    </div>
                </div>
                    <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:7px;">
                            <span style="color:#0f172a; font-size:11px; font-weight:700;">Auto-Scan</span>
                            <span style="color:#64748b; font-size:9px; font-weight:700;">SCHEDULE</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; font-size:11px;" class="text-secondary">
                            <input type="checkbox" id="autoScanCB" ${isAutoScanChecked ? 'checked' : ''}>
                            <label for="autoScanCB" style="margin:0; cursor:pointer; font-weight:500;">Every</label>
                            <input type="number" id="autoScanIntervalInput" value="${autoScanInterval}" style="width:45px; height:24px; padding:1px 4px; text-align:center;" min="1">
                            <span style="font-weight:500;">min</span>
                        </div>
                    </div>
            </details>
            ${buildAssociateLastPickPanel()}
            ${buildShortLocationsPanel()}
            <details id="hub-cut-times-section" ${getStoredSectionState('hub-cut-times-section', false) ? 'open' : ''} style="margin-top:10px; padding-top:10px; border-top:1px solid #cbd5e1;">
                <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; color:#0f172a; font-size:12px; font-weight:700; user-select:none;">
                    <span>Hub Cut Times</span><span style="color:#64748b; font-size:10px;">SETTINGS</span>
                </summary>
                <div style="max-height:340px; overflow-y:auto; padding:8px 4px 0 0;">
               <table class="table table-sm table-borderless" style="font-size: 11px; margin: 0;">
                  <thead>
                      <tr style="border-bottom: 2px solid #cbd5e1;">
                        <th style="color: #64748b; font-weight: 700; text-transform: uppercase;">Hub</th>
                        <th style="width: 110px; color: #64748b; font-weight: 700; text-transform: uppercase;">Target</th>
                    </tr>
                  </thead>
                  <tbody>
        `;

        sortedHubs.forEach(hubName => {
            html += `
                <tr style="border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
                    <td style="padding: 6px 0; font-weight: 600;" class="text-secondary">${hubName}</td>
                    <td style="padding: 4px 0;">
                        <select class="form-control form-control-sm custom-hub-select" data-hub="${hubName}" style="height: 26px; font-size:11px; padding: 2px 6px;">
                            ${TIME_OPTIONS.map(opt => `<option value="${opt}" ${opt === HUB_CUT_TIMES[hubName] ? 'selected' : ''}>${opt}</option>`).join('')}
                        </select>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div></details>`;
        panel.innerHTML = html;
        if (historicalViewActive) {
            const scanButton = panel.querySelector('#scanAllBatchesBtn');
            const clearButton = panel.querySelector('#clearScanDataBtn');
            if (scanButton) { scanButton.disabled = true; scanButton.title = 'Return to Today to run a scan.'; }
            if (clearButton) { clearButton.disabled = true; clearButton.title = 'Return to Today before clearing live scan data.'; }
        }
        bindStoredSectionStates();

        // Restore Focus Safely
        if (wasFocused) {
            const inputEl = document.getElementById('cartonSearchInput');
            if (inputEl) {
                inputEl.focus();
                inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
            }
        }

        const associateSearchInput = document.getElementById('associateLastPickSearch');
        const associateSearchClear = document.getElementById('associateLastPickSearchClear');
        const filterAssociateLastPickRows = () => {
            const query = (associateSearchInput?.value || '').trim().toLocaleLowerCase();
            let visibleCount = 0;
            document.querySelectorAll('#associateLastPickRows .associate-last-pick-row').forEach(row => {
                const matches = !query || (row.getAttribute('data-search-text') || '').includes(query);
                row.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            });
            const countEl = document.getElementById('associateLastPickCount');
            if (countEl) countEl.textContent = query ? `${visibleCount}/${document.querySelectorAll('#associateLastPickRows .associate-last-pick-row').length}` : String(visibleCount);
            const noResults = document.getElementById('associateLastPickNoResults');
            if (noResults) noResults.style.display = query && visibleCount === 0 ? 'block' : 'none';
            if (associateSearchClear) associateSearchClear.style.display = query ? 'block' : 'none';
        };
        associateSearchInput?.addEventListener('input', filterAssociateLastPickRows);
        associateSearchClear?.addEventListener('click', () => {
            if (!associateSearchInput) return;
            associateSearchInput.value = '';
            filterAssociateLastPickRows();
            associateSearchInput.focus();
        });
        filterAssociateLastPickRows();

        const shortSearchInput = document.getElementById('shortLocationSearch');
        const shortSearchClear = document.getElementById('shortLocationSearchClear');
        const filterShortLocationRows = () => {
            const query = (shortSearchInput?.value || '').trim().toLocaleLowerCase();
            const rows = Array.from(document.querySelectorAll('#shortLocationRows .short-location-row'));
            let visible = 0;
            rows.forEach(row => {
                const matches = !query || (row.getAttribute('data-search-text') || '').includes(query);
                row.style.display = matches ? '' : 'none';
                if (matches) visible++;
            });
            const count = document.getElementById('shortLocationCount');
            if (count) count.textContent = query ? `${visible}/${rows.length}` : String(visible);
            const empty = document.getElementById('shortLocationNoResults');
            if (empty) empty.style.display = query && visible === 0 ? 'block' : 'none';
            if (shortSearchClear) shortSearchClear.style.display = query ? 'block' : 'none';
        };
        shortSearchInput?.addEventListener('input', filterShortLocationRows);
        shortSearchClear?.addEventListener('click', () => {
            if (!shortSearchInput) return;
            shortSearchInput.value = '';
            filterShortLocationRows();
            shortSearchInput.focus();
        });
        filterShortLocationRows();
        document.getElementById('openAssociateIntelligence')?.addEventListener('click', openAssociateIntelligenceReport);
        document.getElementById('openShortLocationIntelligence')?.addEventListener('click', openShortLocationIntelligenceReport);

        renderTopPossibleMisScansButton();
        renderTopDarkModeToggle();
        renderTopBatchIntelButton();
        renderTopAssociateIntelButton();
        normalizeTopActionToolbar();

        // --- FAST SILENT REFRESH OVERRIDE ---
        const nativeRefreshBtn = document.querySelector('a.btn-primary[href*="BatchStatus?completed="]');
        if (nativeRefreshBtn && !nativeRefreshBtn.dataset.bound) {
            nativeRefreshBtn.dataset.bound = "true";
            nativeRefreshBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                if (isScanning) return;

                const originalHtml = this.innerHTML;
                this.innerHTML = `<i class="fa fa-spinner fa-spin fa-fw"></i>&nbsp;Syncing...`;
                this.style.pointerEvents = 'none';
                this.style.opacity = '0.8';

                await Promise.all([refreshMainTable(), fetchZoneStatusData()]);
                rebuildTable();

                this.innerHTML = originalHtml;
                this.style.pointerEvents = 'auto';
                this.style.opacity = '1';
            });
        }

        // Listeners
        document.getElementById('sidebarCompletedCB')?.addEventListener('change', function() { setStoredToggleState('__sidebar_show_completed', this.checked); rebuildTable(); });
        document.getElementById('sidebarDisCB')?.addEventListener('change', function() { setStoredToggleState('__sidebar_show_dis', this.checked); rebuildTable(); });
        document.getElementById('sidebarHighlightDoneCB')?.addEventListener('change', function() { setStoredToggleState('__sidebar_highlight_done', this.checked); rebuildTable(); });
        document.getElementById('sidebarKpiCB')?.addEventListener('change', function() { setStoredToggleState('__sidebar_show_kpis', this.checked); rebuildTable(); });
        document.getElementById('pickabilityMinCartons')?.addEventListener('change', function() {
            const minimum = Math.max(0, parseInt(this.value, 10) || 0);
            localStorage.setItem('__pickability_min_cartons', String(minimum));
            rebuildTable();
        });

        document.getElementById('thresholdValInput')?.addEventListener('change', function() { setStoredThresholdVal(parseFloat(this.value) || 0); rebuildTable(); });
        document.getElementById('thresholdTypeSelect')?.addEventListener('change', function() { setStoredThresholdType(this.value); rebuildTable(); });

        // Auto-Scan Listeners
        document.getElementById('autoScanCB')?.addEventListener('change', function() {
            setStoredToggleState('__sidebar_auto_scan_enabled', this.checked);
            startAutoScanTimer();
        });
        document.getElementById('autoScanIntervalInput')?.addEventListener('change', function() {
            localStorage.setItem('__sidebar_auto_scan_interval', this.value);
            startAutoScanTimer();
        });

        document.getElementById('scanAllBatchesBtn')?.addEventListener('click', function() {
            runFullUpdateCycle(this, document.getElementById('scanAllBatchesProgress'), false);
        });

        document.getElementById('clearScanDataBtn')?.addEventListener('click', function() {
            if (confirm("Clear all cached scan times, high vol badges, and pickers?")) {
                clearBatchCache();
                rebuildTable();
            }
        });

        const widthSlider = document.getElementById('widthAdjusterSlider');
        const widthDisplay = document.getElementById('widthValueDisplay');
        if (widthSlider && widthDisplay) {
            widthSlider.addEventListener('input', function() { widthDisplay.textContent = `${this.value}%`; });
            widthSlider.addEventListener('change', function() { applyDynamicWidth(this.value); setStoredWidth(this.value); });
        }

        const performCartonSearch = () => {
            const barcode = document.getElementById('cartonSearchInput')?.value.trim();
            if (barcode) window.location.href = `http://lcvyprwbv05.staples.com:6801/Home/CartonDetail?barcode=${barcode}`;
        };

        document.getElementById('cartonSearchBtn')?.addEventListener('click', performCartonSearch);
        document.getElementById('cartonSearchInput')?.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); performCartonSearch(); }
        });

        panel.querySelectorAll(".custom-hub-select").forEach(select => {
            select.addEventListener("change", function() {
                const currentMap = getStoredHubCutTimes();
                currentMap[this.getAttribute("data-hub")] = this.value;
                saveHubCutTimes(currentMap);
                rebuildTable();
            });
        });
    }

    function modifyDetailsButtons() {
        document.querySelectorAll("table.datatable tbody tr a[href*='BatchDetail']").forEach(btn => {
            if (btn.dataset.accordionBound) return;
            btn.dataset.accordionBound = "true";
            btn.removeAttribute('target');
            if (!btn.querySelector('.tm-details-chevron')) {
                btn.innerHTML = `<span class="tm-details-chevron">▶</span>${btn.textContent.trim() || 'Details'}`;
            }
            btn.addEventListener('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                const parentRow = this.closest('tr');
                if (parentRow) {
                    const batchId = parentRow.getAttribute('data-saved-id') || '';
                    toggleAccordionDrawer(parentRow, this.getAttribute('href'), batchId ? `Batch #${batchId} Details` : 'Batch Details');
                }
            });
        });
    }

    function highlightReferencedCartonOnBatchDetail() {
        if (!window.location.pathname.toLowerCase().includes('/home/batchdetail')) return false;
        const match = window.location.hash.match(/^#tm-carton=(.*)$/i);
        if (!match) return true;
        const carton = decodeURIComponent(match[1] || '').trim();
        if (!carton) return true;
        const normalizedTarget = carton.replace(/\s+/g, '');
        const findAndHighlight = () => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            const targetRow = rows.find(row => Array.from(row.querySelectorAll('td')).some(cell => cell.textContent.trim().replace(/\s+/g, '') === normalizedTarget));
            if (!targetRow) return false;
            targetRow.id = 'tm-referenced-carton-row';
            targetRow.style.setProperty('background-color', '#fef3c7', 'important');
            targetRow.style.setProperty('box-shadow', 'inset 5px 0 0 #f59e0b, inset -2px 0 0 #f59e0b', 'important');
            targetRow.style.setProperty('outline', '2px solid #f59e0b', 'important');
            targetRow.style.setProperty('outline-offset', '-2px', 'important');
            targetRow.querySelectorAll('td').forEach(cell => cell.style.setProperty('background-color', '#fef3c7', 'important'));
            // Center the referenced row using an absolute page position instead of
            // relying on scrollIntoView alone. Batch Detail can continue changing height
            // after initial load, so repeat the correction as the page settles.
            const centerReferencedRow = (behavior = 'auto') => {
                const rect = targetRow.getBoundingClientRect();
                const rowCenter = window.scrollY + rect.top + (rect.height / 2);
                const viewportCenter = window.innerHeight / 2;
                const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
                const desiredTop = Math.max(0, Math.min(maxScroll, rowCenter - viewportCenter));
                window.scrollTo({ top: desiredTop, behavior });
            };
            centerReferencedRow('smooth');
            [250, 700, 1400, 2500].forEach((delay, index) => {
                setTimeout(() => centerReferencedRow(index === 0 ? 'smooth' : 'auto'), delay);
            });
            // Apply scroll margin as an extra safeguard for sticky headers.
            targetRow.style.setProperty('scroll-margin-top', '140px', 'important');
            targetRow.style.setProperty('scroll-margin-bottom', '140px', 'important');
            const banner = document.createElement('div');
            banner.id = 'tm-carton-jump-banner';
            banner.textContent = `Highlighted referenced carton: ${carton}`;
            banner.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;background:#92400e;color:#fff;padding:8px 14px;border-radius:4px;font:700 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.22);';
            document.body.appendChild(banner);
            setTimeout(() => banner.remove(), 5000);
            return true;
        };
        if (!findAndHighlight()) {
            const observer = new MutationObserver(() => {
                if (findAndHighlight()) observer.disconnect();
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            setTimeout(() => observer.disconnect(), 30000);
        }
        return true;
    }
    // --- MAIN INITIALIZATION FLOW ---
    if (highlightReferencedCartonOnBatchDetail()) return;
    if (forceServerCompletedBatchesOn()) return;

    applyDynamicWidth(getStoredWidth());
    injectStyles();
    applyDarkMode(localStorage.getItem('__batch_status_dark_mode')==='true');
    startAutoScanTimer();
    // Cache cleanup also runs on every cache read; this hourly pass handles pages
    // left open for long periods without requiring a reload.
    setInterval(() => getStoredBatchCache(), 60 * 60 * 1000);
    rebuildTable();

    // Kick off the first Zone Status fetch in the background, then patch the
    // KPI mini-cards in place once it lands (avoids a full table rebuild).
    fetchZoneStatusData().then(() => refreshKpiCardsOnly());

    // Keep Zone Status data fresh independent of manual/auto batch scans,
    // so the KPI "remaining" numbers don't go stale on a page left open.
    setInterval(() => {
        fetchZoneStatusData().then(() => refreshKpiCardsOnly());
    }, 60000);

    // Auto-focus Carton Search Input on initial page load
    setTimeout(() => {
        const searchInput = document.getElementById('cartonSearchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }, 100);

})();