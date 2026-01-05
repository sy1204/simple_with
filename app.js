// c:\Users\User\workspace\simple_with\app.js
// 직장인 올인원 대시보드 - JavaScript 로직

(function () {
    'use strict';

    // ===== SessionStorage 유틸리티 =====
    const Storage = {
        get: (key, defaultValue = null) => {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch { return defaultValue; }
        },
        set: (key, value) => {
            try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { }
        }
    };

    // ===== 테마 관리 =====
    const Theme = {
        themes: ['light', 'dark', 'anti-blue'],
        current: Storage.get('theme', 'light'),
        init() {
            this.apply();
            document.getElementById('theme-toggle').addEventListener('click', () => this.toggle());
        },
        apply() {
            document.documentElement.classList.remove('dark', 'anti-blue');
            if (this.current === 'dark') document.documentElement.classList.add('dark');
            else if (this.current === 'anti-blue') document.documentElement.classList.add('anti-blue');
            const icon = document.querySelector('#theme-toggle .material-symbols-outlined');
            icon.textContent = this.current === 'dark' ? 'light_mode' : this.current === 'anti-blue' ? 'visibility' : 'dark_mode';
        },
        toggle() {
            const idx = (this.themes.indexOf(this.current) + 1) % this.themes.length;
            this.current = this.themes[idx];
            Storage.set('theme', this.current);
            this.apply();
        }
    };

    // ===== 시계 =====
    const Clock = {
        init() {
            this.update();
            setInterval(() => this.update(), 1000);
        },
        update() {
            const now = new Date();
            const format = (d) => d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            document.getElementById('clock-seoul').textContent = format(now);
            const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const lon = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
            document.getElementById('clock-ny').textContent = format(ny);
            document.getElementById('clock-lon').textContent = format(lon);
        }
    };

    // ===== 캘린더 =====
    const Calendar = {
        date: new Date(),
        init() {
            this.render();
            document.getElementById('prev-month').addEventListener('click', () => { this.date.setMonth(this.date.getMonth() - 1); this.render(); });
            document.getElementById('next-month').addEventListener('click', () => { this.date.setMonth(this.date.getMonth() + 1); this.render(); });
            const ddayInput = document.getElementById('dday-input');
            ddayInput.value = Storage.get('dday', '');
            ddayInput.addEventListener('input', () => { Storage.set('dday', ddayInput.value); this.updateDday(); });
            this.updateDday();
        },
        render() {
            const year = this.date.getFullYear();
            const month = this.date.getMonth();
            document.getElementById('calendar-month-year').textContent = `${year}년 ${month + 1}월`;
            const firstDay = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();
            const today = new Date();
            const grid = document.getElementById('calendar-grid');
            grid.innerHTML = '';
            for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div class="p-1 min-h-[40px]"></div>';
            for (let d = 1; d <= lastDate; d++) {
                const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
                const dayOfWeek = new Date(year, month, d).getDay();
                const isSunday = dayOfWeek === 0;
                let cls = 'p-1 text-sm text-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer ';
                if (isToday) cls += 'bg-primary text-white font-bold shadow-lg shadow-blue-500/30';
                else if (isSunday) cls += 'text-red-500';
                else cls += 'text-slate-900 dark:text-white';
                grid.innerHTML += `<div class="${cls}">${d}</div>`;
            }
        },
        updateDday() {
            const input = document.getElementById('dday-input').value.replace(/\./g, '-');
            const target = new Date(input);
            const result = document.getElementById('dday-result');
            if (isNaN(target.getTime())) { result.textContent = '-'; return; }
            const today = new Date(); today.setHours(0, 0, 0, 0); target.setHours(0, 0, 0, 0);
            const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
            result.textContent = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
        }
    };

    // ===== 타이머 =====
    const Timer = {
        duration: 25 * 60,
        remaining: Storage.get('timerRemaining', 25 * 60),
        isRunning: false,
        isPomodoro: true,
        interval: null,
        init() {
            this.update();
            document.getElementById('timer-toggle').addEventListener('click', () => this.toggle());
            document.getElementById('timer-reset').addEventListener('click', () => this.reset());
            document.getElementById('timer-pomodoro').addEventListener('click', () => this.setMode(true));
            document.getElementById('timer-break').addEventListener('click', () => this.setMode(false));
        },
        setMode(isPomodoro) {
            this.isPomodoro = isPomodoro;
            this.duration = isPomodoro ? 25 * 60 : 5 * 60;
            this.reset();
            document.getElementById('timer-pomodoro').className = isPomodoro ? 'px-3 py-1 bg-primary text-white text-xs font-bold rounded-full' : 'px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-full';
            document.getElementById('timer-break').className = !isPomodoro ? 'px-3 py-1 bg-primary text-white text-xs font-bold rounded-full' : 'px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold rounded-full';
            document.getElementById('timer-mode').textContent = isPomodoro ? '집중 모드' : '휴식 모드';
        },
        toggle() {
            this.isRunning = !this.isRunning;
            const btn = document.getElementById('timer-toggle');
            if (this.isRunning) {
                btn.innerHTML = '<span class="material-symbols-outlined">pause</span><span>일시정지</span>';
                this.interval = setInterval(() => this.tick(), 1000);
            } else {
                btn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span><span>시작</span>';
                clearInterval(this.interval);
            }
        },
        tick() {
            if (this.remaining > 0) {
                this.remaining--;
                Storage.set('timerRemaining', this.remaining);
                this.update();
            } else {
                this.toggle();
                alert(this.isPomodoro ? '집중 시간 완료! 휴식하세요.' : '휴식 끝! 다시 집중하세요.');
            }
        },
        reset() {
            this.remaining = this.duration;
            this.isRunning = false;
            clearInterval(this.interval);
            Storage.set('timerRemaining', this.remaining);
            document.getElementById('timer-toggle').innerHTML = '<span class="material-symbols-outlined">play_arrow</span><span>시작</span>';
            this.update();
        },
        update() {
            const mins = Math.floor(this.remaining / 60).toString().padStart(2, '0');
            const secs = (this.remaining % 60).toString().padStart(2, '0');
            document.getElementById('timer-display').textContent = `${mins}:${secs}`;
            const progress = ((this.duration - this.remaining) / this.duration) * 283;
            document.getElementById('timer-progress').setAttribute('stroke-dashoffset', progress);
        }
    };

    // ===== 할 일 목록 =====
    const Todo = {
        items: Storage.get('todos', []),
        init() {
            this.render();
            document.getElementById('todo-add').addEventListener('click', () => this.add());
            document.getElementById('todo-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.add(); });
        },
        add() {
            const input = document.getElementById('todo-input');
            if (!input.value.trim()) return;
            this.items.push({ id: Date.now(), text: input.value.trim(), done: false, time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) });
            input.value = '';
            this.save(); this.render(); Progress.update();
        },
        toggle(id) {
            const item = this.items.find(i => i.id === id);
            if (item) item.done = !item.done;
            this.save(); this.render(); Progress.update();
        },
        remove(id) {
            this.items = this.items.filter(i => i.id !== id);
            this.save(); this.render(); Progress.update();
        },
        save() { Storage.set('todos', this.items); },
        render() {
            const list = document.getElementById('todo-list');
            list.innerHTML = this.items.map(item => `
                <div class="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg group/item transition-colors">
                    <button onclick="window.Todo.toggle(${item.id})" class="${item.done ? 'text-primary' : 'text-slate-300 hover:text-primary'} mt-0.5">
                        <span class="material-symbols-outlined text-xl">${item.done ? 'check_box' : 'check_box_outline_blank'}</span>
                    </button>
                    <div class="flex-1">
                        <p class="text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'} leading-snug">${item.text}</p>
                        <span class="text-[10px] text-slate-400">${item.time}</span>
                    </div>
                    <button onclick="window.Todo.remove(${item.id})" class="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            `).join('');
        }
    };
    window.Todo = Todo;

    // ===== 계산기 =====
    const Calc = {
        display: '0', history: '', lastResult: Storage.get('calcResult', '0'),
        init() {
            const buttons = [
                { t: 'sin', cls: 'func' }, { t: 'cos', cls: 'func' }, { t: 'tan', cls: 'func' }, { t: 'log', cls: 'func' },
                { t: 'AC', cls: 'gray' }, { t: '+/-', cls: 'gray' }, { t: '%', cls: 'gray' }, { t: '÷', cls: 'orange' },
                { t: '7' }, { t: '8' }, { t: '9' }, { t: '×', cls: 'orange' },
                { t: '4' }, { t: '5' }, { t: '6' }, { t: '-', cls: 'orange' },
                { t: '1' }, { t: '2' }, { t: '3' }, { t: '+', cls: 'orange' },
                { t: '0', cls: 'wide' }, { t: '.' }, { t: '=', cls: 'primary' }
            ];
            const container = document.getElementById('calc-buttons');
            buttons.forEach(b => {
                let cls = 'rounded-lg text-sm font-medium h-10 ';
                if (b.cls === 'func') cls += 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 text-[10px]';
                else if (b.cls === 'gray') cls += 'bg-slate-50 dark:bg-slate-800 text-slate-600 hover:bg-slate-100';
                else if (b.cls === 'orange') cls += 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 hover:bg-orange-200';
                else if (b.cls === 'primary') cls += 'bg-primary text-white hover:bg-blue-600';
                else if (b.cls === 'wide') cls += 'col-span-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-lg';
                else cls += 'hover:bg-slate-50 dark:hover:bg-slate-800 text-lg';
                container.innerHTML += `<button class="${cls}" data-val="${b.t}">${b.t}</button>`;
            });
            container.addEventListener('click', (e) => { if (e.target.dataset.val) this.input(e.target.dataset.val); });
            this.update();
        },
        input(val) {
            if (val === 'AC') { this.display = '0'; this.history = ''; }
            else if (val === '+/-') { this.display = (parseFloat(this.display) * -1).toString(); }
            else if (val === '%') { this.display = (parseFloat(this.display) / 100).toString(); }
            else if (val === '=') { this.calculate(); }
            else if (['sin', 'cos', 'tan', 'log'].includes(val)) { this.display = Math[val === 'log' ? 'log10' : val](parseFloat(this.display) * (val !== 'log' ? Math.PI / 180 : 1)).toFixed(6); }
            else if (['+', '-', '×', '÷'].includes(val)) { this.history = this.display + ' ' + val + ' '; this.display = '0'; }
            else { this.display = this.display === '0' && val !== '.' ? val : this.display + val; }
            this.update();
        },
        calculate() {
            try {
                const expr = (this.history + this.display).replace(/×/g, '*').replace(/÷/g, '/');
                this.history = this.history + this.display + ' =';
                this.display = eval(expr).toString();
                Storage.set('calcResult', this.display);
            } catch { this.display = 'Error'; }
        },
        update() {
            document.getElementById('calc-display').textContent = this.display;
            document.getElementById('calc-history').textContent = this.history;
        }
    };

    // ===== 금융 계산기 =====
    const Finance = {
        mode: 'interest',
        init() {
            this.render();
            document.getElementById('finance-interest').addEventListener('click', () => { this.mode = 'interest'; this.render(); this.updateButtons(); });
            document.getElementById('finance-discount').addEventListener('click', () => { this.mode = 'discount'; this.render(); this.updateButtons(); });
        },
        updateButtons() {
            document.getElementById('finance-interest').className = this.mode === 'interest' ? 'px-3 py-1 text-xs font-bold bg-white dark:bg-card-dark rounded shadow-sm' : 'px-3 py-1 text-xs font-medium text-slate-500';
            document.getElementById('finance-discount').className = this.mode === 'discount' ? 'px-3 py-1 text-xs font-bold bg-white dark:bg-card-dark rounded shadow-sm' : 'px-3 py-1 text-xs font-medium text-slate-500';
        },
        render() {
            const container = document.getElementById('finance-content');
            if (this.mode === 'interest') {
                container.innerHTML = `
                    <div class="flex-1 space-y-3">
                        <div class="space-y-1"><label class="text-xs font-medium text-slate-500">예치금 (원금)</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₩</span><input id="fin-principal" class="w-full pl-7 bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="10,000,000" /></div></div>
                        <div class="flex gap-3"><div class="space-y-1 flex-1"><label class="text-xs font-medium text-slate-500">금리 (%)</label><input id="fin-rate" class="w-full bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="3.5" /></div><div class="space-y-1 flex-1"><label class="text-xs font-medium text-slate-500">기간 (년)</label><input id="fin-years" class="w-full bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="1" /></div></div>
                        <button id="fin-calc" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium py-2 rounded-lg text-sm hover:opacity-90">계산하기</button>
                    </div>
                    <div class="flex-1 bg-background-light dark:bg-[#111822] rounded-lg p-4 flex flex-col justify-center">
                        <div class="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2"><span class="text-xs text-slate-500">총 이자 수익</span><span id="fin-interest" class="text-base font-bold text-emerald-500">-</span></div>
                        <div class="flex items-center justify-between"><span class="text-xs font-medium">최종 수령액</span><span id="fin-total" class="text-lg font-bold">-</span></div>
                    </div>`;
                document.getElementById('fin-calc').addEventListener('click', () => this.calcInterest());
            } else {
                container.innerHTML = `
                    <div class="flex-1 space-y-3">
                        <div class="space-y-1"><label class="text-xs font-medium text-slate-500">원래 가격</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₩</span><input id="fin-original" class="w-full pl-7 bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="100,000" /></div></div>
                        <div class="space-y-1"><label class="text-xs font-medium text-slate-500">할인율 (%)</label><input id="fin-discount-rate" class="w-full bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="20" /></div>
                        <button id="fin-calc" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium py-2 rounded-lg text-sm hover:opacity-90">계산하기</button>
                    </div>
                    <div class="flex-1 bg-background-light dark:bg-[#111822] rounded-lg p-4 flex flex-col justify-center">
                        <div class="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2"><span class="text-xs text-slate-500">할인 금액</span><span id="fin-saved" class="text-base font-bold text-emerald-500">-</span></div>
                        <div class="flex items-center justify-between"><span class="text-xs font-medium">최종 가격</span><span id="fin-final" class="text-lg font-bold">-</span></div>
                    </div>`;
                document.getElementById('fin-calc').addEventListener('click', () => this.calcDiscount());
            }
        },
        calcInterest() {
            const p = parseFloat(document.getElementById('fin-principal').value.replace(/,/g, ''));
            const r = parseFloat(document.getElementById('fin-rate').value) / 100;
            const y = parseFloat(document.getElementById('fin-years').value);
            const interest = Math.round(p * r * y);
            document.getElementById('fin-interest').textContent = '+' + interest.toLocaleString();
            document.getElementById('fin-total').textContent = (p + interest).toLocaleString() + '원';
        },
        calcDiscount() {
            const o = parseFloat(document.getElementById('fin-original').value.replace(/,/g, ''));
            const d = parseFloat(document.getElementById('fin-discount-rate').value) / 100;
            const saved = Math.round(o * d);
            document.getElementById('fin-saved').textContent = '-' + saved.toLocaleString();
            document.getElementById('fin-final').textContent = (o - saved).toLocaleString() + '원';
        }
    };

    // ===== 단위 변환 =====
    const Converter = {
        type: Storage.get('convType', 'currency'),
        units: {
            currency: { from: 'USD', to: 'KRW', rate: 1350, options: ['USD', 'EUR', 'KRW', 'JPY'], rates: { USD: 1, EUR: 0.92, KRW: 1350, JPY: 157 } },
            length: { from: 'cm', to: 'inch', options: ['cm', 'inch', 'm', 'ft'], rates: { cm: 1, inch: 2.54, m: 0.01, ft: 0.0328 } },
            area: { from: '㎡', to: '평', options: ['㎡', '평'], rates: { '㎡': 1, '평': 0.3025 } },
            weight: { from: 'kg', to: 'lb', options: ['kg', 'lb', 'g', 'oz'], rates: { kg: 1, lb: 2.205, g: 1000, oz: 35.274 } }
        },
        init() {
            this.render();
            document.querySelectorAll('.conv-type').forEach(btn => {
                btn.addEventListener('click', () => { this.type = btn.dataset.type; Storage.set('convType', this.type); this.updateButtons(); this.render(); });
            });
        },
        updateButtons() {
            document.querySelectorAll('.conv-type').forEach(btn => {
                const isActive = btn.dataset.type === this.type;
                btn.className = `conv-type ${isActive ? 'text-primary relative after:content-[\'\'] after:absolute after:bottom-[-9px] after:left-0 after:w-full after:h-0.5 after:bg-primary' : 'text-slate-400 hover:text-slate-600'} p-1`;
            });
        },
        render() {
            const u = this.units[this.type];
            const container = document.getElementById('converter-content');
            container.innerHTML = `
                <div class="bg-background-light dark:bg-[#111822] p-2.5 rounded-lg border border-transparent focus-within:border-primary">
                    <select id="conv-from" class="bg-transparent text-[11px] font-bold text-primary border-none p-0 focus:ring-0 cursor-pointer w-full mb-1">${u.options.map(o => `<option ${o === u.from ? 'selected' : ''}>${o}</option>`).join('')}</select>
                    <input id="conv-input" class="w-full bg-transparent text-lg font-bold border-none p-0 focus:ring-0" type="text" value="1" />
                </div>
                <div class="flex justify-center -my-3 relative z-10"><button id="conv-swap" class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-1 text-slate-500 hover:text-primary shadow-sm"><span class="material-symbols-outlined text-base">swap_vert</span></button></div>
                <div class="bg-background-light dark:bg-[#111822] p-2.5 rounded-lg">
                    <select id="conv-to" class="bg-transparent text-[11px] font-bold text-primary border-none p-0 focus:ring-0 cursor-pointer w-full mb-1">${u.options.map(o => `<option ${o === u.to ? 'selected' : ''}>${o}</option>`).join('')}</select>
                    <input id="conv-output" class="w-full bg-transparent text-lg font-bold border-none p-0 focus:ring-0" type="text" readonly />
                </div>`;
            document.getElementById('conv-input').addEventListener('input', () => this.convert());
            document.getElementById('conv-from').addEventListener('change', () => this.convert());
            document.getElementById('conv-to').addEventListener('change', () => this.convert());
            document.getElementById('conv-swap').addEventListener('click', () => this.swap());
            this.convert();
        },
        convert() {
            const u = this.units[this.type];
            const val = parseFloat(document.getElementById('conv-input').value) || 0;
            const from = document.getElementById('conv-from').value;
            const to = document.getElementById('conv-to').value;
            const baseVal = val / u.rates[from];
            const result = baseVal * u.rates[to];
            document.getElementById('conv-output').value = result.toLocaleString(undefined, { maximumFractionDigits: 4 });
        },
        swap() {
            const from = document.getElementById('conv-from');
            const to = document.getElementById('conv-to');
            [from.value, to.value] = [to.value, from.value];
            this.convert();
        }
    };

    // ===== 메모 =====
    const Memo = {
        init() {
            const textarea = document.getElementById('memo-text');
            textarea.value = Storage.get('memo', '');
            textarea.addEventListener('input', () => Storage.set('memo', textarea.value));
        }
    };

    // ===== 진행률 =====
    const Progress = {
        update() {
            const todos = Storage.get('todos', []);
            const total = todos.length;
            const done = todos.filter(t => t.done).length;
            const percent = total ? Math.round((done / total) * 100) : 0;
            document.getElementById('progress-percent').textContent = percent + '%';
            document.getElementById('progress-text').textContent = total ? `${total}개 중 ${done}개를 완료했습니다.` : '할 일을 추가하고 완료해보세요!';
            const bar = document.getElementById('progress-bar');
            bar.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const filled = percent >= (i + 1) * 20;
                bar.innerHTML += `<span class="h-2 flex-1 bg-white/30 rounded-full overflow-hidden"><span class="block h-full ${filled ? 'bg-white' : 'bg-transparent'} w-full rounded-full"></span></span>`;
            }
        }
    };

    // ===== 초기화 =====
    document.addEventListener('DOMContentLoaded', () => {
        Theme.init();
        Clock.init();
        Calendar.init();
        Timer.init();
        Todo.init();
        Calc.init();
        Finance.init();
        Converter.init();
        Memo.init();
        Progress.update();
    });
})();
