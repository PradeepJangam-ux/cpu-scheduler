/* ================= SYSTEM STATE ================= */
let processes = [];
let nextId = 1;
let timeline = [];
let isRunning = false;
let animationId = null;
let currentSimTime = 0;

// DOM Elements
const form = document.getElementById('processForm');
const pList = document.getElementById('processList');
const runBtn = document.getElementById('runBtn');
const stopBtn = document.getElementById('stopBtn');
const demoBtn = document.getElementById('demoBtn');
const clearBtn = document.getElementById('clearBtn');
const algoSelect = document.getElementById('algoSelect');
const rrBox = document.getElementById('rrQuantumBox');
const ganttBox = document.getElementById('ganttContainer');
const tableBody = document.querySelector('#resultTable tbody');
const speedRange = document.getElementById('speedRange');
const exportBtn = document.getElementById('exportBtn');
const themeBtn = document.getElementById('themeToggle');

/* ================= THEME TOGGLE ================= */
themeBtn.addEventListener('click', () => {
  const body = document.body;
  const current = body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  body.setAttribute('data-theme', next);
  document.getElementById('themeIcon').textContent = next === 'light' ? '🌙' : '☀️';
  localStorage.setItem('theme', next);
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);
document.getElementById('themeIcon').textContent = savedTheme === 'light' ? '🌙' : '☀️';

/* ================= INPUT HANDLING ================= */
algoSelect.addEventListener('change', () => {
  rrBox.style.display = algoSelect.value === 'RR' ? 'block' : 'none';
});

speedRange.addEventListener('input', (e) => {
  document.getElementById('speedVal').textContent = (e.target.value / 100).toFixed(1) + 'x';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const arr = parseInt(document.getElementById('arrival').value);
  const bur = parseInt(document.getElementById('burst').value);
  const pri = parseInt(document.getElementById('priority').value);
  
  addProcess(arr, bur, pri);
  
  // Reset arrival to 0, burst to 1, but keep inputs focused for rapid entry
  document.getElementById('arrival').value = 0;
  document.getElementById('burst').value = 1;
  document.getElementById('priority').value = 0;
});

function addProcess(arrival, burst, priority) {
  processes.push({
    id: nextId++,
    arrival,
    burst,
    initialBurst: burst,
    priority
  });
  renderList();
}

function renderList() {
  if(processes.length === 0) {
    pList.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted)">No processes added yet.</div>';
    return;
  }
  pList.innerHTML = '';
  processes.sort((a,b) => a.id - b.id);
  
  processes.forEach(p => {
    const div = document.createElement('div');
    div.className = 'process-item';
    div.innerHTML = `
      <div>
        <span style="font-weight:bold; color:var(--accent)">P${p.id}</span>
        <span class="badge">Arr: ${p.arrival}</span>
        <span class="badge">Burst: ${p.initialBurst}</span>
        <span class="badge">Prio: ${p.priority}</span>
      </div>
      <button onclick="deleteProcess(${p.id})" class="btn-danger" style="padding:4px 8px; font-size:0.7rem;">✕</button>
    `;
    pList.appendChild(div);
  });
}

window.deleteProcess = function(id) {
  processes = processes.filter(p => p.id !== id);
  renderList();
};

clearBtn.addEventListener('click', () => {
  processes = [];
  nextId = 1;
  renderList();
  resetSimulation();
});

demoBtn.addEventListener('click', () => {
  processes = [
    { id: 1, arrival: 0, burst: 8, initialBurst: 8, priority: 1 },
    { id: 2, arrival: 1, burst: 4, initialBurst: 4, priority: 2 },
    { id: 3, arrival: 2, burst: 9, initialBurst: 9, priority: 3 },
    { id: 4, arrival: 3, burst: 5, initialBurst: 5, priority: 1 }
  ];
  nextId = 5;
  renderList();
});

/* ================= ALGORITHMS ================= */
function solveScheduler() {
  const algo = algoSelect.value;
  const q = parseInt(document.getElementById('quantum').value);
  
  // Deep copy processes
  let pool = JSON.parse(JSON.stringify(processes));
  
  if(algo === 'FCFS') return runFCFS(pool);
  if(algo === 'SJF') return runSJF(pool);
  if(algo === 'PRIO') return runPrio(pool);
  if(algo === 'RR') return runRR(pool, q);
}

function runFCFS(pool) {
  pool.sort((a,b) => a.arrival - b.arrival || a.id - b.id);
  let time = 0;
  let history = [];
  
  pool.forEach(p => {
    if(time < p.arrival) {
      history.push({ type: 'idle', start: time, end: p.arrival });
      time = p.arrival;
    }
    history.push({ type: 'process', id: p.id, start: time, end: time + p.burst });
    time += p.burst;
  });
  return history;
}

function runSJF(pool) {
  let time = 0;
  let history = [];
  let completed = 0;
  let n = pool.length;
  
  while(completed < n) {
    let available = pool.filter(p => p.arrival <= time && !p.done);
    
    if(available.length === 0) {
      let nextArrive = Math.min(...pool.filter(p=>!p.done).map(p=>p.arrival));
      history.push({ type:'idle', start:time, end: nextArrive });
      time = nextArrive;
      continue;
    }
    
    // Sort by Burst, then Arrival
    available.sort((a,b) => a.burst - b.burst || a.arrival - b.arrival);
    let p = available[0];
    
    history.push({ type:'process', id: p.id, start: time, end: time + p.burst });
    time += p.burst;
    p.done = true;
    completed++;
  }
  return history;
}

function runPrio(pool) {
  let time = 0;
  let history = [];
  let completed = 0;
  let n = pool.length;

  while(completed < n) {
    let available = pool.filter(p => p.arrival <= time && !p.done);
    
    if(available.length === 0) {
      let nextArrive = Math.min(...pool.filter(p=>!p.done).map(p=>p.arrival));
      history.push({ type:'idle', start:time, end: nextArrive });
      time = nextArrive;
      continue;
    }
    
    // Sort by Priority (Ascending = lower number is higher priority)
    available.sort((a,b) => a.priority - b.priority || a.arrival - b.arrival);
    let p = available[0];
    
    history.push({ type:'process', id: p.id, start: time, end: time + p.burst });
    time += p.burst;
    p.done = true;
    completed++;
  }
  return history;
}

function runRR(pool, quantum) {
  let time = 0;
  let history = [];
  let queue = [];
  let completed = 0;
  let n = pool.length;
  
  // Sort initial arrival to handle queue correctly
  let incoming = pool.map(p => ({...p, remaining: p.burst}));
  incoming.sort((a,b) => a.arrival - b.arrival);
  
  let i = 0; // index for incoming
  
  // Push first process(es)
  while(i < n && incoming[i].arrival <= time) {
    queue.push(incoming[i]);
    i++;
  }
  
  while(completed < n) {
    if(queue.length === 0) {
      if(i < n) {
         let nextArrive = incoming[i].arrival;
         history.push({ type: 'idle', start: time, end: nextArrive });
         time = nextArrive;
         while(i < n && incoming[i].arrival <= time) {
            queue.push(incoming[i]);
            i++;
         }
      } else {
        break; 
      }
    }
    
    let p = queue.shift();
    let exec = Math.min(quantum, p.remaining);
    
    history.push({ type: 'process', id: p.id, start: time, end: time + exec });
    time += exec;
    p.remaining -= exec;
    
    // Check for new arrivals while this process was running
    while(i < n && incoming[i].arrival <= time) {
      queue.push(incoming[i]);
      i++;
    }
    
    if(p.remaining > 0) {
      queue.push(p);
    } else {
      completed++;
    }
  }
  return history;
}

/* ================= ANIMATION & RENDER ================= */
runBtn.addEventListener('click', () => {
  if(processes.length === 0) { alert("Please add processes first!"); return; }
  
  timeline = solveScheduler();
  if(!timeline || timeline.length === 0) return;
  
  prepareGantt();
  startAnimation();
});

stopBtn.addEventListener('click', () => {
  isRunning = false;
  cancelAnimationFrame(animationId);
  stopBtn.disabled = true;
  runBtn.disabled = false;
});

function prepareGantt() {
  ganttBox.innerHTML = '';
  const totalDuration = timeline[timeline.length-1].end;
  
  timeline.forEach((block, idx) => {
    const div = document.createElement('div');
    const widthPct = ((block.end - block.start) / totalDuration) * 100;
    
    div.className = block.type === 'idle' ? 'gantt-block idle' : 'gantt-block process';
    div.style.width = widthPct + '%';
    div.setAttribute('data-id', block.id || '');
    div.setAttribute('data-idx', idx);
    
    div.innerHTML = `
      <div class="progress-fill"></div>
      <span style="z-index:2">${block.type==='idle'?'Idle':'P'+block.id}</span>
      <span class="time-marker">${block.end}</span>
    `;
    
    ganttBox.appendChild(div);
  });
  
  // Reset table
  tableBody.innerHTML = '';
  processes.forEach(p => {
    const tr = document.createElement('tr');
    tr.id = `row-p${p.id}`;
    tr.innerHTML = `<td>P${p.id}</td><td>${p.arrival}</td><td>${p.initialBurst}</td><td>${p.priority}</td>
      <td class="start">-</td><td class="finish">-</td><td class="wait">-</td><td class="turn">-</td>`;
    tableBody.appendChild(tr);
  });
}

function startAnimation() {
  if(isRunning) return;
  isRunning = true;
  runBtn.disabled = true;
  stopBtn.disabled = false;
  
  currentSimTime = 0;
  let lastTime = performance.now();
  
  function step(now) {
    if(!isRunning) return;
    
    const speed = parseInt(speedRange.value) / 100;
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    
    currentSimTime += dt * speed * 2; // *2 base speed multiplier
    
    updateVisuals(currentSimTime);
    
    const totalDuration = timeline[timeline.length-1].end;
    if(currentSimTime >= totalDuration) {
      finishSimulation();
    } else {
      animationId = requestAnimationFrame(step);
    }
  }
  animationId = requestAnimationFrame(step);
}

function updateVisuals(simTime) {
  document.getElementById('timerDisplay').textContent = 'T=' + simTime.toFixed(1);
  
  timeline.forEach((block, idx) => {
    const el = ganttBox.children[idx];
    const fill = el.querySelector('.progress-fill');
    
    // Calculate progress within this block
    let p = 0;
    if (simTime >= block.end) p = 100;
    else if (simTime > block.start) {
      p = ((simTime - block.start) / (block.end - block.start)) * 100;
      
      // Highlight table row if processing
      if(block.type === 'process') {
        document.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
        const row = document.getElementById(`row-p${block.id}`);
        if(row) row.classList.add('active-row');
      }
    }
    
    fill.style.width = p + '%';
  });
}

function finishSimulation() {
  isRunning = false;
  runBtn.disabled = false;
  stopBtn.disabled = true;
  document.querySelectorAll('tr').forEach(r => r.classList.remove('active-row'));
  
  // Final Calculations
  calculateMetrics();
}

function calculateMetrics() {
  let totalWait = 0;
  let totalTurn = 0;
  let totalIdle = 0;
  const finishTimes = {};
  const startTimes = {}; // First time a process gets CPU
  
  // Calculate finish times and start times from timeline
  timeline.forEach(block => {
    if(block.type === 'process') {
      if(finishTimes[block.id] === undefined || block.end > finishTimes[block.id]) {
        finishTimes[block.id] = block.end;
      }
      if(startTimes[block.id] === undefined || block.start < startTimes[block.id]) {
        startTimes[block.id] = block.start;
      }
    } else {
      totalIdle += (block.end - block.start);
    }
  });

  processes.forEach(p => {
    const finish = finishTimes[p.id];
    const turnaround = finish - p.arrival;
    const waiting = turnaround - p.initialBurst;
    const start = startTimes[p.id];
    
    totalWait += waiting;
    totalTurn += turnaround;
    
    // Update Table
    const row = document.getElementById(`row-p${p.id}`);
    if(row) {
      row.querySelector('.start').textContent = start;
      row.querySelector('.finish').textContent = finish;
      row.querySelector('.wait').textContent = waiting;
      row.querySelector('.turn').textContent = turnaround;
    }
  });

  const n = processes.length;
  document.getElementById('avgWait').textContent = (totalWait / n).toFixed(2);
  document.getElementById('avgTurn').textContent = (totalTurn / n).toFixed(2);
  
  const totalTime = timeline[timeline.length-1].end;
  const util = ((totalTime - totalIdle) / totalTime) * 100;
  document.getElementById('cpuUtil').textContent = util.toFixed(1) + '%';
}

function resetSimulation() {
  ganttBox.innerHTML = '<div style="width:100%; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">Run simulation to view chart</div>';
  tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No results yet</td></tr>';
  document.getElementById('avgWait').textContent = '-';
  document.getElementById('avgTurn').textContent = '-';
  document.getElementById('cpuUtil').textContent = '-';
  document.getElementById('timerDisplay').textContent = 'T=0';
}

/* ================= CSV EXPORT ================= */
exportBtn.addEventListener('click', () => {
  const rows = Array.from(tableBody.querySelectorAll('tr'));
  if(rows.length === 0 || rows[0].innerText.includes('No results')) {
    alert("No results to export. Run the simulation first.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "PID,Arrival,Burst,Priority,Start,Finish,Waiting,Turnaround\n";

  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    const data = Array.from(cols).map(c => c.textContent).join(",");
    csvContent += data + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "scheduler_results.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});