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

    // ===== 시간 위젯 (통합) =====
    const TimeWidget = {
        currentTab: Storage.get('timeTab', 'clock'),
        clockType: Storage.get('clockType', 'digital'),
        timezones: Storage.get('timezones', ['America/New_York', 'Europe/London']),
        availableCities: [
            { name: '뉴욕', tz: 'America/New_York', code: 'NY' },
            { name: '런던', tz: 'Europe/London', code: 'LON' },
            { name: '도쿄', tz: 'Asia/Tokyo', code: 'TYO' },
            { name: '파리', tz: 'Europe/Paris', code: 'PAR' },
            { name: '시드니', tz: 'Australia/Sydney', code: 'SYD' },
            { name: '베이징', tz: 'Asia/Shanghai', code: 'BEJ' },
            { name: '두바이', tz: 'Asia/Dubai', code: 'DXB' },
            { name: '싱가포르', tz: 'Asia/Singapore', code: 'SIN' },
            { name: '홍콩', tz: 'Asia/Hong_Kong', code: 'HKG' },
            { name: 'LA', tz: 'America/Los_Angeles', code: 'LA' }
        ],
        // Timer state
        timerDuration: Storage.get('timerDuration', 25 * 60),
        timerRemaining: Storage.get('timerRemaining', 25 * 60),
        timerRunning: false,
        timerInterval: null,
        timerAlertType: Storage.get('timerAlertType', 'both'), // 'popup', 'sound', 'both'
        // Stopwatch state
        stopwatchTime: 0,
        stopwatchRunning: false,
        stopwatchInterval: null,
        stopwatchLaps: Storage.get('stopwatchLaps', []),
        stopwatchType: Storage.get('stopwatchType', 'digital'),

        init() {
            this.bindTabs();
            this.render();
            this.startHeaderClock();
        },

        bindTabs() {
            document.querySelectorAll('.time-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.currentTab = btn.id.replace('tab-', '');
                    Storage.set('timeTab', this.currentTab);
                    this.updateTabButtons();
                    this.render();
                });
            });
        },

        updateTabButtons() {
            document.querySelectorAll('.time-tab').forEach(btn => {
                const isActive = btn.id === `tab-${this.currentTab}`;
                btn.className = `time-tab px-3 py-1 text-xs ${isActive ? 'font-bold bg-white dark:bg-card-dark rounded shadow-sm' : 'font-medium text-slate-500'}`;
            });
        },

        startHeaderClock() {
            this.updateHeaderClock();
            setInterval(() => this.updateHeaderClock(), 1000);
        },

        updateHeaderClock() {
            const now = new Date();
            const format = (tz) => new Date(now.toLocaleString('en-US', { timeZone: tz })).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            document.getElementById('clock-seoul').textContent = format('Asia/Seoul');
            const tz1 = this.availableCities.find(c => c.tz === this.timezones[0]) || this.availableCities[0];
            const tz2 = this.availableCities.find(c => c.tz === this.timezones[1]) || this.availableCities[1];
            document.getElementById('clock-ny').textContent = format(tz1.tz);
            document.getElementById('clock-lon').textContent = format(tz2.tz);
            const labelNy = document.getElementById('clock-ny').previousElementSibling || document.getElementById('clock-ny').parentElement;
            const labelLon = document.getElementById('clock-lon').previousElementSibling || document.getElementById('clock-lon').parentElement;
            if (labelNy && labelNy.textContent) labelNy.childNodes[0].textContent = tz1.code + ' ';
            if (labelLon && labelLon.textContent) labelLon.childNodes[0].textContent = tz2.code + ' ';
        },

        render() {
            const container = document.getElementById('time-content');
            if (this.currentTab === 'clock') this.renderClock(container);
            else if (this.currentTab === 'timer') this.renderTimer(container);
            else if (this.currentTab === 'stopwatch') this.renderStopwatch(container);
        },

        renderClock(container) {
            const now = new Date();
            const hrs = now.getHours();
            const mins = now.getMinutes();
            const secs = now.getSeconds();
            const tzOptions = this.availableCities.map(c => `<option value="${c.tz}" ${this.timezones[0] === c.tz ? 'selected' : ''}>${c.name}</option>`).join('');
            const tzOptions2 = this.availableCities.map(c => `<option value="${c.tz}" ${this.timezones[1] === c.tz ? 'selected' : ''}>${c.name}</option>`).join('');

            container.innerHTML = `
                <div class="flex flex-col md:flex-row items-center justify-center gap-6 flex-1">
                    <div class="flex flex-col items-center">
                        ${this.clockType === 'analog' ? `
                        <div class="relative size-40 md:size-48">
                            <svg viewBox="0 0 100 100" class="size-full">
                                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" class="text-slate-200 dark:text-slate-700" stroke-width="2"/>
                                ${[...Array(12)].map((_, i) => `<line x1="50" y1="8" x2="50" y2="12" stroke="currentColor" class="text-slate-400" stroke-width="1.5" transform="rotate(${i * 30} 50 50)"/>`).join('')}
                                <line id="clock-hour" x1="50" y1="50" x2="50" y2="25" stroke="currentColor" class="text-slate-800 dark:text-white" stroke-width="3" stroke-linecap="round" transform="rotate(${(hrs % 12) * 30 + mins * 0.5} 50 50)"/>
                                <line id="clock-min" x1="50" y1="50" x2="50" y2="15" stroke="currentColor" class="text-slate-600 dark:text-slate-300" stroke-width="2" stroke-linecap="round" transform="rotate(${mins * 6} 50 50)"/>
                                <line id="clock-sec" x1="50" y1="50" x2="50" y2="12" stroke="currentColor" class="text-primary" stroke-width="1" stroke-linecap="round" transform="rotate(${secs * 6} 50 50)"/>
                                <circle cx="50" cy="50" r="3" fill="currentColor" class="text-primary"/>
                            </svg>
                        </div>` : `
                        <div class="text-5xl md:text-6xl font-bold font-mono tracking-tight" id="digital-clock">${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</div>
                        <div class="text-sm text-slate-500 mt-2">${now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
                        `}
                        <div class="flex gap-2 mt-4">
                            <button id="clock-type-toggle" class="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">${this.clockType === 'analog' ? '디지털' : '원형'} 시계</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-4 w-full md:w-auto">
                        <div class="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                            <div class="flex items-center justify-between gap-4">
                                <select id="tz-select-1" class="text-sm font-medium bg-transparent border-none p-0 pr-6 focus:ring-0 text-primary cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0_center]">${tzOptions}</select>
                                <span id="tz-time-1" class="text-lg font-mono font-bold">--:--</span>
                            </div>
                            <div class="flex items-center justify-between gap-4">
                                <select id="tz-select-2" class="text-sm font-medium bg-transparent border-none p-0 pr-6 focus:ring-0 text-primary cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0_center]">${tzOptions2}</select>
                                <span id="tz-time-2" class="text-lg font-mono font-bold">--:--</span>
                            </div>
                        </div>
                    </div>
                </div>`;

            document.getElementById('clock-type-toggle').addEventListener('click', () => {
                this.clockType = this.clockType === 'analog' ? 'digital' : 'analog';
                Storage.set('clockType', this.clockType);
                this.render();
            });

            ['tz-select-1', 'tz-select-2'].forEach((id, i) => {
                document.getElementById(id).addEventListener('change', (e) => {
                    this.timezones[i] = e.target.value;
                    Storage.set('timezones', this.timezones);
                    this.updateHeaderClock();
                    this.updateTzTimes();
                });
            });

            this.updateTzTimes();
            if (!this.clockInterval) {
                this.clockInterval = setInterval(() => {
                    if (this.currentTab === 'clock' && !document.activeElement.matches('#tz-select-1, #tz-select-2')) this.render();
                }, 1000);
            }
        },

        updateTzTimes() {
            const now = new Date();
            const format = (tz) => new Date(now.toLocaleString('en-US', { timeZone: tz })).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
            const tz1El = document.getElementById('tz-time-1');
            const tz2El = document.getElementById('tz-time-2');
            if (tz1El) tz1El.textContent = format(this.timezones[0]);
            if (tz2El) tz2El.textContent = format(this.timezones[1]);
        },

        renderTimer(container) {
            const mins = Math.floor(this.timerRemaining / 60);
            const secs = this.timerRemaining % 60;
            const progress = ((this.timerDuration - this.timerRemaining) / this.timerDuration) * 283;

            container.innerHTML = `
                <div class="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 flex-1">
                    <div class="relative size-40 md:size-48" id="timer-wheel-area">
                        <svg class="size-full -rotate-90 transform" viewBox="0 0 100 100">
                            <circle class="text-slate-100 dark:text-slate-800" cx="50" cy="50" fill="none" r="45" stroke="currentColor" stroke-width="6"></circle>
                            <circle id="timer-progress" class="text-primary transition-all duration-300" cx="50" cy="50" fill="none" r="45" stroke="currentColor" stroke-dasharray="283" stroke-dashoffset="${progress}" stroke-linecap="round" stroke-width="6"></circle>
                        </svg>
                        <div class="absolute top-0 left-0 flex size-full flex-col items-center justify-center">
                            <div id="timer-display-wrapper" class="cursor-pointer">
                                <span id="timer-display" class="text-4xl md:text-5xl font-bold font-mono tracking-tighter select-none">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</span>
                            </div>
                            <input id="timer-input" type="text" class="hidden text-4xl md:text-5xl font-bold font-mono tracking-tighter text-center w-32 bg-transparent border-b-2 border-primary focus:outline-none" placeholder="MM:SS" />
                            <span class="text-xs text-slate-400 mt-1">${!this.timerRunning ? '클릭하여 시간 입력' : '진행 중'}</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-4 w-full md:w-auto">
                        <div class="flex gap-2 justify-center">
                            <button id="timer-25" class="px-3 py-1 text-xs font-medium ${this.timerDuration === 25 * 60 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} rounded-full">25분</button>
                            <button id="timer-50" class="px-3 py-1 text-xs font-medium ${this.timerDuration === 50 * 60 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} rounded-full">50분</button>
                            <button id="timer-5" class="px-3 py-1 text-xs font-medium ${this.timerDuration === 5 * 60 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} rounded-full">5분</button>
                        </div>
                        <div class="flex gap-1 justify-center text-[10px]">
                            <button id="alert-popup" class="px-2 py-0.5 rounded ${this.timerAlertType === 'popup' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}">팝업</button>
                            <button id="alert-sound" class="px-2 py-0.5 rounded ${this.timerAlertType === 'sound' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}">소리</button>
                            <button id="alert-both" class="px-2 py-0.5 rounded ${this.timerAlertType === 'both' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}">둘다</button>
                        </div>
                        <button id="timer-toggle" class="w-full md:w-40 bg-primary hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                            <span class="material-symbols-outlined">${this.timerRunning ? 'pause' : 'play_arrow'}</span><span>${this.timerRunning ? '일시정지' : '시작'}</span>
                        </button>
                        <button id="timer-reset" class="w-full md:w-40 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-6 rounded-lg transition-all active:scale-95">초기화</button>
                    </div>
                </div>`;

            // Wheel adjustment (only when stopped)
            document.getElementById('timer-wheel-area').addEventListener('wheel', (e) => {
                if (this.timerRunning) return;
                e.preventDefault();
                const delta = e.deltaY > 0 ? -5 * 60 : 5 * 60;
                this.timerDuration = Math.max(5 * 60, Math.min(120 * 60, this.timerDuration + delta));
                this.timerRemaining = this.timerDuration;
                Storage.set('timerDuration', this.timerDuration);
                Storage.set('timerRemaining', this.timerRemaining);
                this.render();
            }, { passive: false });

            ['25', '50', '5'].forEach(m => {
                document.getElementById(`timer-${m}`).addEventListener('click', () => {
                    if (this.timerRunning) return;
                    this.timerDuration = parseInt(m) * 60;
                    this.timerRemaining = this.timerDuration;
                    Storage.set('timerDuration', this.timerDuration);
                    Storage.set('timerRemaining', this.timerRemaining);
                    this.render();
                });
            });

            document.getElementById('timer-toggle').addEventListener('click', () => this.toggleTimer());
            document.getElementById('timer-reset').addEventListener('click', () => this.resetTimer());
            ['popup', 'sound', 'both'].forEach(type => {
                document.getElementById(`alert-${type}`).addEventListener('click', () => {
                    this.timerAlertType = type;
                    Storage.set('timerAlertType', type);
                    this.render();
                });
            });

            // 클릭하여 시간 직접 입력
            const displayWrapper = document.getElementById('timer-display-wrapper');
            const display = document.getElementById('timer-display');
            const input = document.getElementById('timer-input');
            if (displayWrapper && !this.timerRunning) {
                displayWrapper.addEventListener('click', () => {
                    display.classList.add('hidden');
                    input.classList.remove('hidden');
                    input.value = '';
                    input.focus();
                });
                input.addEventListener('blur', () => this.handleTimerInput(input.value));
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') this.handleTimerInput(input.value);
                    if (e.key === 'Escape') this.render();
                });
            }
        },

        handleTimerInput(value) {
            const parts = value.split(':');
            let totalSeconds = 0;
            if (parts.length === 2) {
                totalSeconds = parseInt(parts[0] || 0) * 60 + parseInt(parts[1] || 0);
            } else if (parts.length === 1 && parts[0]) {
                totalSeconds = parseInt(parts[0]) * 60;
            }
            if (totalSeconds > 0 && totalSeconds <= 7200) {
                this.timerDuration = totalSeconds;
                this.timerRemaining = totalSeconds;
                Storage.set('timerDuration', this.timerDuration);
                Storage.set('timerRemaining', this.timerRemaining);
            }
            this.render();
        },

        toggleTimer() {
            this.timerRunning = !this.timerRunning;
            if (this.timerRunning) {
                this.timerInterval = setInterval(() => {
                    if (this.timerRemaining > 0) {
                        this.timerRemaining--;
                        Storage.set('timerRemaining', this.timerRemaining);
                        this.updateTimerDisplay();
                    } else {
                        this.timerRunning = false;
                        clearInterval(this.timerInterval);
                        this.playTimerAlert();
                        this.render();
                    }
                }, 1000);
            } else {
                clearInterval(this.timerInterval);
            }
            this.render();
        },

        updateTimerDisplay() {
            const mins = Math.floor(this.timerRemaining / 60);
            const secs = this.timerRemaining % 60;
            const display = document.getElementById('timer-display');
            const progress = document.getElementById('timer-progress');
            if (display) display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            if (progress) progress.setAttribute('stroke-dashoffset', ((this.timerDuration - this.timerRemaining) / this.timerDuration) * 283);
        },

        resetTimer() {
            this.timerRunning = false;
            clearInterval(this.timerInterval);
            this.timerRemaining = this.timerDuration;
            Storage.set('timerRemaining', this.timerRemaining);
            this.render();
        },

        playTimerAlert() {
            if (this.timerAlertType === 'popup' || this.timerAlertType === 'both') {
                alert('⏰ 타이머 완료!');
            }
            if (this.timerAlertType === 'sound' || this.timerAlertType === 'both') {
                try {
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 1);
                } catch (e) { console.log('Audio not supported'); }
            }
        },

        renderStopwatch(container) {
            const hrs = Math.floor(this.stopwatchTime / 3600);
            const mins = Math.floor((this.stopwatchTime % 3600) / 60);
            const secs = this.stopwatchTime % 60;
            const ms = Math.floor((this.stopwatchTime * 100) % 100);

            container.innerHTML = `
                <div class="flex flex-col md:flex-row items-center justify-center gap-6 flex-1">
                    <div class="flex flex-col items-center">
                        ${this.stopwatchType === 'analog' ? `
                        <div class="relative size-40 md:size-48">
                            <svg viewBox="0 0 100 100" class="size-full">
                                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" class="text-slate-200 dark:text-slate-700" stroke-width="2"/>
                                ${[...Array(60)].map((_, i) => `<line x1="50" y1="${i % 5 === 0 ? '6' : '8'}" x2="50" y2="10" stroke="currentColor" class="text-slate-400" stroke-width="${i % 5 === 0 ? '1.5' : '0.5'}" transform="rotate(${i * 6} 50 50)"/>`).join('')}
                                <line x1="50" y1="50" x2="50" y2="15" stroke="currentColor" class="text-primary" stroke-width="2" stroke-linecap="round" transform="rotate(${secs * 6} 50 50)"/>
                                <circle cx="50" cy="50" r="3" fill="currentColor" class="text-primary"/>
                            </svg>
                        </div>` : `
                        <div class="text-5xl md:text-6xl font-bold font-mono tracking-tight">${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</div>
                        `}
                        <div class="flex gap-2 mt-4">
                            <button id="sw-type-toggle" class="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200">${this.stopwatchType === 'analog' ? '디지털' : '원형'}</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-4 w-full md:w-auto">
                        <div class="flex gap-2 justify-center">
                            <button id="sw-toggle" class="flex-1 md:w-32 bg-primary hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                                <span class="material-symbols-outlined">${this.stopwatchRunning ? 'pause' : 'play_arrow'}</span>${this.stopwatchRunning ? '정지' : '시작'}
                            </button>
                            <button id="sw-lap" class="flex-1 md:w-32 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-lg transition-all active:scale-95 ${!this.stopwatchRunning && this.stopwatchTime === 0 ? 'opacity-50' : ''}">랩</button>
                            <button id="sw-reset" class="flex-1 md:w-32 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 font-semibold py-3 px-4 rounded-lg transition-all active:scale-95">초기화</button>
                        </div>
                        <div id="sw-laps" class="max-h-32 overflow-y-auto space-y-1 text-sm">
                            ${[...this.stopwatchLaps].reverse().map((lap, i) => `<div class="flex justify-between bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded"><span class="text-slate-500">#${this.stopwatchLaps.length - i}</span><span class="font-mono">${lap}</span></div>`).join('')}
                        </div>
                    </div>
                </div>`;

            document.getElementById('sw-type-toggle').addEventListener('click', () => {
                this.stopwatchType = this.stopwatchType === 'analog' ? 'digital' : 'analog';
                Storage.set('stopwatchType', this.stopwatchType);
                this.render();
            });

            document.getElementById('sw-toggle').addEventListener('click', () => this.toggleStopwatch());
            document.getElementById('sw-lap').addEventListener('click', () => this.lapStopwatch());
            document.getElementById('sw-reset').addEventListener('click', () => this.resetStopwatch());
        },

        toggleStopwatch() {
            this.stopwatchRunning = !this.stopwatchRunning;
            if (this.stopwatchRunning) {
                this.stopwatchInterval = setInterval(() => {
                    this.stopwatchTime++;
                    if (this.currentTab === 'stopwatch') this.render();
                }, 1000);
            } else {
                clearInterval(this.stopwatchInterval);
            }
            this.render();
        },

        lapStopwatch() {
            if (this.stopwatchTime === 0) return;
            const hrs = Math.floor(this.stopwatchTime / 3600);
            const mins = Math.floor((this.stopwatchTime % 3600) / 60);
            const secs = this.stopwatchTime % 60;
            const lapTime = `${hrs > 0 ? String(hrs).padStart(2, '0') + ':' : ''}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            this.stopwatchLaps.push(lapTime);
            if (this.stopwatchLaps.length > 10) this.stopwatchLaps.shift();
            Storage.set('stopwatchLaps', this.stopwatchLaps);
            this.render();
        },

        resetStopwatch() {
            this.stopwatchRunning = false;
            clearInterval(this.stopwatchInterval);
            this.stopwatchTime = 0;
            this.stopwatchLaps = [];
            Storage.set('stopwatchLaps', []);
            this.render();
        }
    };

    // ===== 캘린더 =====
    const Calendar = {
        date: new Date(),
        holidays: {},
        viewMode: Storage.get('calendarViewMode', 1), // 1, 2, 3 달 보기
        activeDdayInput: null, // 현재 포커스된 D-Day 입력 필드

        init() {
            this.loadHolidays();
            this.render();
            document.getElementById('go-today').addEventListener('click', () => { this.date = new Date(); this.render(); });

            // 휠로 월 단위 이동
            document.getElementById('calendar-area').addEventListener('wheel', (e) => {
                e.preventDefault();
                const direction = e.deltaY > 0 ? 1 : -1;
                this.date.setMonth(this.date.getMonth() + direction);
                this.render();
            }, { passive: false });

            // 다달 보기 버튼
            [1, 2, 3].forEach(m => {
                document.getElementById(`view-${m}m`).addEventListener('click', () => {
                    this.viewMode = m;
                    Storage.set('calendarViewMode', m);
                    this.updateViewButtons();
                    this.render();
                });
            });
            this.updateViewButtons();

            // D-Day 입력
            const fromInput = document.getElementById('dday-from');
            const toInput = document.getElementById('dday-to');
            const today = new Date();
            const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            fromInput.value = Storage.get('ddayFrom', todayStr);
            toInput.value = Storage.get('ddayTo', '');
            fromInput.addEventListener('input', () => { Storage.set('ddayFrom', fromInput.value); this.updateDday(); });
            toInput.addEventListener('input', () => { Storage.set('ddayTo', toInput.value); this.updateDday(); });
            fromInput.addEventListener('focus', () => { this.activeDdayInput = 'from'; });
            toInput.addEventListener('focus', () => { this.activeDdayInput = 'to'; });
            fromInput.addEventListener('blur', () => { setTimeout(() => { if (this.activeDdayInput === 'from') this.activeDdayInput = null; }, 200); });
            toInput.addEventListener('blur', () => { setTimeout(() => { if (this.activeDdayInput === 'to') this.activeDdayInput = null; }, 200); });
            this.updateDday();

            // 만나이 계산기
            const birthInput = document.getElementById('age-birth');
            const ageDateInput = document.getElementById('age-date');
            birthInput.value = Storage.get('ageBirth', '');
            ageDateInput.value = Storage.get('ageDate', todayStr);
            birthInput.addEventListener('input', () => { Storage.set('ageBirth', birthInput.value); this.updateAge(); });
            ageDateInput.addEventListener('input', () => { Storage.set('ageDate', ageDateInput.value); this.updateAge(); });
            birthInput.addEventListener('focus', () => { this.activeDdayInput = 'birth'; });
            ageDateInput.addEventListener('focus', () => { this.activeDdayInput = 'ageDate'; });
            birthInput.addEventListener('blur', () => { setTimeout(() => { if (this.activeDdayInput === 'birth') this.activeDdayInput = null; }, 200); });
            ageDateInput.addEventListener('blur', () => { setTimeout(() => { if (this.activeDdayInput === 'ageDate') this.activeDdayInput = null; }, 200); });
            this.updateAge();
        },

        updateViewButtons() {
            [1, 2, 3].forEach(m => {
                const btn = document.getElementById(`view-${m}m`);
                btn.className = `calendar-view-btn px-2 py-0.5 rounded ${this.viewMode === m ? 'bg-white dark:bg-card-dark shadow-sm font-medium' : 'text-slate-500'}`;
            });
        },

        loadHolidays() {
            const currentYear = this.date.getFullYear();
            for (let y = currentYear - 1; y <= currentYear + 1; y++) {
                this.holidays[`${y}-01-01`] = '신정';
                this.holidays[`${y}-03-01`] = '삼일절';
                this.holidays[`${y}-05-05`] = '어린이날';
                this.holidays[`${y}-06-06`] = '현충일';
                this.holidays[`${y}-08-15`] = '광복절';
                this.holidays[`${y}-10-03`] = '개천절';
                this.holidays[`${y}-10-09`] = '한글날';
                this.holidays[`${y}-12-25`] = '크리스마스';
            }
            this.holidays['2025-01-28'] = '설날 연휴'; this.holidays['2025-01-29'] = '설날'; this.holidays['2025-01-30'] = '설날 연휴';
            this.holidays['2025-05-06'] = '대체공휴일';
            this.holidays['2025-10-05'] = '추석 연휴'; this.holidays['2025-10-06'] = '추석'; this.holidays['2025-10-07'] = '추석 연해'; this.holidays['2025-10-08'] = '대체공휴일';
            // 2026년 공휴일
            this.holidays['2026-02-16'] = '설날 연휴'; this.holidays['2026-02-17'] = '설날'; this.holidays['2026-02-18'] = '설날 연휴';
            this.holidays['2026-03-02'] = '대체공휴일'; // 삼일절 대체
            this.holidays['2026-05-24'] = '부처님오신날'; this.holidays['2026-05-25'] = '대체공휴일';
            this.holidays['2026-08-17'] = '대체공해일'; // 광복절 대체
            this.holidays['2026-09-24'] = '추석 연휴'; this.holidays['2026-09-25'] = '추석'; this.holidays['2026-09-26'] = '추석 연휴'; this.holidays['2026-09-28'] = '대체공휴일';
            this.holidays['2026-10-05'] = '대체공휴일'; // 개천절 대체
            // 2027년 공휴일
            this.holidays['2027-02-06'] = '설날 연휴'; this.holidays['2027-02-07'] = '설날'; this.holidays['2027-02-08'] = '설날 연휴'; this.holidays['2027-02-09'] = '대체공휴일';
            this.holidays['2027-05-13'] = '부처님오신날';
            this.holidays['2027-08-16'] = '대체공휴일'; // 광복절 대체
            this.holidays['2027-10-11'] = '대체공휴일'; // 한글날 대체
            this.holidays['2027-10-14'] = '추석 연휴'; this.holidays['2027-10-15'] = '추석'; this.holidays['2027-10-16'] = '추석 연휴';
        },

        getHoliday(year, month, day) {
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return this.holidays[key] || null;
        },

        render() {
            const container = document.getElementById('calendar-container');
            const today = new Date();
            const todayMonth = today.getMonth();
            let html = '';
            const visibleHolidays = [];

            // 보기 모드에 따라 시작 월 결정
            let startOffset = 0;
            if (this.viewMode === 2) startOffset = 0; // 오늘이 있는 달이 위
            if (this.viewMode === 3) startOffset = -1; // 오늘이 있는 달이 가운데

            for (let m = 0; m < this.viewMode; m++) {
                const targetDate = new Date(this.date.getFullYear(), this.date.getMonth() + startOffset + m, 1);
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth();

                html += this.renderMonth(year, month, today, visibleHolidays, this.viewMode > 1);
            }

            container.innerHTML = html;
            document.getElementById('calendar-month-year').textContent = this.viewMode === 1
                ? `${this.date.getFullYear()}년 ${this.date.getMonth() + 1}월`
                : `${this.date.getFullYear()}년`;

            // 날짜 클릭 이벤트 (D-Day 및 만나이 입력)
            container.querySelectorAll('.cal-day').forEach(el => {
                el.addEventListener('click', () => {
                    if (this.activeDdayInput) {
                        const dateStr = el.dataset.date;
                        let inputId = '';
                        let storageKey = '';
                        if (this.activeDdayInput === 'from') { inputId = 'dday-from'; storageKey = 'ddayFrom'; }
                        else if (this.activeDdayInput === 'to') { inputId = 'dday-to'; storageKey = 'ddayTo'; }
                        else if (this.activeDdayInput === 'birth') { inputId = 'age-birth'; storageKey = 'ageBirth'; }
                        else if (this.activeDdayInput === 'ageDate') { inputId = 'age-date'; storageKey = 'ageDate'; }

                        if (inputId) {
                            const input = document.getElementById(inputId);
                            input.value = dateStr;
                            Storage.set(storageKey, dateStr);
                            this.updateDday();
                            this.updateAge();
                        }
                    }
                });
            });

            // 공휴일 목록
            const holidayList = document.getElementById('holiday-list');
            holidayList.innerHTML = visibleHolidays.length > 0
                ? visibleHolidays.map(h => `<span class="text-red-500">${h.month}/${h.day}</span> ${h.name}`).join('&emsp;')
                : '';

            this.loadHolidays();
        },

        renderMonth(year, month, today, visibleHolidays, showHeader = false) {
            const firstDay = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();

            let html = '';
            if (showHeader) {
                html += `<div class="text-center text-xs font-semibold text-slate-500 mt-3 mb-1">${year}년 ${month + 1}월</div>`;
            }
            html += `<div class="grid grid-cols-7 mb-1 text-[10px]">
                <span class="text-center text-red-500 font-semibold">일</span>
                <span class="text-center text-slate-500">월</span>
                <span class="text-center text-slate-500">화</span>
                <span class="text-center text-slate-500">수</span>
                <span class="text-center text-slate-500">목</span>
                <span class="text-center text-slate-500">금</span>
                <span class="text-center text-blue-500 font-semibold">토</span>
            </div>`;
            html += '<div class="grid grid-cols-7 gap-0.5">';

            for (let i = 0; i < firstDay; i++) html += '<div class="p-1 min-h-[28px]"></div>';

            for (let d = 1; d <= lastDate; d++) {
                const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
                const dayOfWeek = new Date(year, month, d).getDay();
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;
                const holiday = this.getHoliday(year, month, d);
                const dateStr = `${year}${String(month + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`;

                if (holiday) visibleHolidays.push({ month: month + 1, day: d, name: holiday });

                let cls = 'cal-day p-1 text-xs text-center font-medium rounded cursor-pointer transition-colors ';
                if (isToday) {
                    cls += 'bg-primary text-white font-bold hover:bg-blue-600';
                } else if (holiday || isSunday) {
                    cls += 'text-red-500 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20';
                } else if (isSaturday) {
                    cls += 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20';
                } else {
                    cls += 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800';
                }
                html += `<div class="${cls}" data-date="${dateStr}" title="${holiday || ''}">${d}</div>`;
            }
            html += '</div>';
            return html;
        },

        updateDday() {
            const fromVal = document.getElementById('dday-from').value;
            const toVal = document.getElementById('dday-to').value;
            const result = document.getElementById('dday-result');

            const parseDate = (str) => {
                if (str.length !== 8) return null;
                const y = parseInt(str.substring(0, 4));
                const m = parseInt(str.substring(4, 6)) - 1;
                const d = parseInt(str.substring(6, 8));
                const date = new Date(y, m, d);
                return isNaN(date.getTime()) ? null : date;
            };

            const fromDate = parseDate(fromVal);
            const toDate = parseDate(toVal);

            if (!fromDate && !toDate) { result.textContent = '-'; return; }

            if (fromDate && !toDate) {
                const today = new Date(); today.setHours(0, 0, 0, 0); fromDate.setHours(0, 0, 0, 0);
                const diff = Math.ceil((today - fromDate) / (1000 * 60 * 60 * 24));
                result.textContent = diff === 0 ? 'D-Day' : diff > 0 ? `D+${diff}` : `D${diff}`;
                return;
            }

            if (!fromDate && toDate) {
                const today = new Date(); today.setHours(0, 0, 0, 0); toDate.setHours(0, 0, 0, 0);
                const diff = Math.ceil((toDate - today) / (1000 * 60 * 60 * 24));
                result.textContent = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
                return;
            }

            fromDate.setHours(0, 0, 0, 0); toDate.setHours(0, 0, 0, 0);
            const diff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
            result.textContent = diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
        },

        updateAge() {
            const birthVal = document.getElementById('age-birth').value;
            const dateVal = document.getElementById('age-date').value;
            const result = document.getElementById('age-result');

            const parseDate = (str) => {
                if (str.length !== 8) return null;
                const y = parseInt(str.substring(0, 4));
                const m = parseInt(str.substring(4, 6)) - 1;
                const d = parseInt(str.substring(6, 8));
                const date = new Date(y, m, d);
                return isNaN(date.getTime()) ? null : date;
            };

            const birthDate = parseDate(birthVal);
            const targetDate = parseDate(dateVal);

            if (!birthDate || !targetDate) { result.textContent = '-'; return; }

            let age = targetDate.getFullYear() - birthDate.getFullYear();
            const m = targetDate.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) {
                age--;
            }
            result.textContent = age >= 0 ? `만 ${age}세` : '-';
        }
    };

    // ===== (Timer 모듈 제거 - TimeWidget으로 통합됨) =====

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
        TimeWidget.init();
        Calendar.init();
        Todo.init();
        Calc.init();
        Finance.init();
        Converter.init();
        Memo.init();
        Progress.update();
    });
})();
