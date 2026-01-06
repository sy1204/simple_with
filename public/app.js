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
        activeItemId: null,
        draggedItem: null,

        init() {
            this.render();
            document.getElementById('todo-add').addEventListener('click', () => this.add());
            document.getElementById('todo-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.add();
            });

            // 키보드 조작 (Tab: 들여쓰기, Shift+Tab: 내어쓰기)
            document.addEventListener('keydown', (e) => {
                if (this.activeItemId && e.key === 'Tab') {
                    // 할 일 목록이나 입력창에 포커스가 있거나, 활성 아이템이 있을 때만 동작해야 함
                    // 하지만 전역으로 잡으면 다른 Tab 동작을 방해할 수 있으므로 주의.
                    // 여기서는 activeItemId가 있을 때만 동작하도록 함.
                    e.preventDefault();
                    this.changeDepth(this.activeItemId, e.shiftKey ? -1 : 1);
                }
            });

            // 드래그 이벤트
            document.addEventListener('mousemove', (e) => this.handleDragMove(e));
            document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        },

        add() {
            const input = document.getElementById('todo-input');
            if (!input.value.trim()) return;

            // 새 항목은 마지막 항목의 depth를 따르거나 0으로 시작
            const lastItem = this.items[this.items.length - 1];
            const newDepth = lastItem ? (lastItem.depth || 0) : 0;

            this.items.push({
                id: Date.now(),
                text: input.value.trim(),
                done: false,
                time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
                depth: newDepth
            });
            input.value = '';
            this.save(); this.render();
        },

        toggle(id) {
            const item = this.items.find(i => i.id === id);
            if (item) item.done = !item.done;
            this.save(); this.render();
        },

        remove(id) {
            this.items = this.items.filter(i => i.id !== id);
            if (this.activeItemId === id) this.activeItemId = null;
            this.save(); this.render();
        },

        select(id) {
            this.activeItemId = id;
            this.render();
        },

        changeDepth(id, delta) {
            const index = this.items.findIndex(i => i.id === id);
            if (index === -1) return;

            const item = this.items[index];
            let newDepth = (item.depth || 0) + delta;

            // Depth 제한 (0 이상)
            if (newDepth < 0) newDepth = 0;

            // 부모보다 최대 1단계까지만 깊어질 수 있음
            if (index > 0) {
                const prevItem = this.items[index - 1];
                const maxDepth = (prevItem.depth || 0) + 1;
                if (newDepth > maxDepth) newDepth = maxDepth;
            } else {
                newDepth = 0; // 첫 번째 항목은 항상 0
            }

            if (item.depth !== newDepth) {
                item.depth = newDepth;
                this.save(); this.render();
            }
        },

        handleDragStart(e, id) {
            // 마우스 왼쪽 버튼만 허용
            if (e.button !== 0) return;
            e.preventDefault(); // 텍스트 선택 방지

            this.draggedItem = this.items.find(i => i.id === id);
            this.activeItemId = id;
            this.render();
            document.body.style.cursor = 'grabbing';
        },

        handleDragMove(e) {
            if (!this.draggedItem) return;

            const list = document.getElementById('todo-list');
            const items = Array.from(list.children);
            const mouseY = e.clientY;

            // 마우스 위치에 가장 가까운 아이템 찾기
            let closestItem = null;
            let closestOffset = Number.NEGATIVE_INFINITY;

            items.forEach(item => {
                const box = item.getBoundingClientRect();
                const offset = mouseY - box.top - box.height / 2;
                // 위쪽 절반에 가까운지 확인
                if (offset < 0 && offset > closestOffset) {
                    closestOffset = offset;
                    closestItem = item;
                }
            });

            const currentIndex = this.items.findIndex(i => i.id === this.draggedItem.id);
            let targetIndex = this.items.length; // 기본: 맨 뒤

            if (closestItem) {
                targetIndex = this.items.findIndex(i => i.id === parseInt(closestItem.dataset.id));
            } else {
                // 리스트 내부지만 아이템들보다 아래에 있을 때 등 처리 가능
                // 여기서는 간단히 구현
            }

            // 배열 내 이동
            if (closestItem) {
                const targetId = parseInt(closestItem.dataset.id);
                const targetIdx = this.items.findIndex(i => i.id === targetId);

                if (currentIndex !== targetIdx) {
                    const [movedItem] = this.items.splice(currentIndex, 1);
                    this.items.splice(targetIdx, 0, movedItem);
                    this.render();
                }
            } else {
                // 맨 마지막으로 이동 (마우스가 리스트 하단 영역일 때)
                const listRect = list.getBoundingClientRect();
                // 마지막 아이템이 아니면서, 리스트 바닥 근처에 마우스가 있을 때
                if (currentIndex !== this.items.length - 1 && mouseY > listRect.bottom - 20) {
                    const [movedItem] = this.items.splice(currentIndex, 1);
                    this.items.push(movedItem);
                    this.render();
                }
            }
        },

        handleDragEnd(e) {
            if (!this.draggedItem) return;
            this.draggedItem = null;
            document.body.style.cursor = 'default';

            // 드래그 종료 후 Depth 유효성 검사 (순서 변경 시 위계 깨짐 방지)
            this.items.forEach((item, index) => {
                if (index === 0) {
                    item.depth = 0;
                } else {
                    const prevDepth = this.items[index - 1].depth || 0;
                    if ((item.depth || 0) > prevDepth + 1) {
                        item.depth = prevDepth + 1;
                    }
                }
            });

            this.save(); this.render();
        },

        save() { Storage.set('todos', this.items); },

        render() {
            const list = document.getElementById('todo-list');
            if (!list) return;

            // 완료되지 않은 항목과 완료된 항목 분리
            const activeItems = this.items.filter(i => !i.done);
            const doneItems = this.items.filter(i => i.done);

            const renderItem = (item) => {
                const depth = item.depth || 0;
                const marginLeft = depth * 20;
                const isActive = this.activeItemId === item.id;

                return `
                <div data-id="${item.id}" 
                     class="flex items-center gap-2 py-1.5 group/item transition-all ${isActive ? 'bg-primary/5' : ''}"
                     style="margin-left: ${marginLeft}px"
                     onclick="window.Todo.select(${item.id})">
                     
                    <!-- 체크박스 (Google Keep 스타일) -->
                    <button onclick="event.stopPropagation(); window.Todo.toggle(${item.id})" 
                            class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                   ${item.done 
                                       ? 'bg-primary border-primary' 
                                       : 'border-slate-300 dark:border-slate-600 hover:border-primary'}">
                        ${item.done ? '<span class="material-symbols-outlined text-white text-sm">check</span>' : ''}
                    </button>
                    
                    <!-- 텍스트 -->
                    <span class="flex-1 text-sm ${item.done 
                        ? 'text-slate-400 line-through decoration-slate-400' 
                        : 'text-slate-700 dark:text-slate-200'} cursor-text select-text">${item.text}</span>
                    
                    <!-- 드래그 & 삭제 (hover 시 표시) -->
                    <div class="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <div class="cursor-grab text-slate-300 hover:text-slate-500 p-0.5"
                             onmousedown="event.stopPropagation(); window.Todo.handleDragStart(event, ${item.id})">
                            <span class="material-symbols-outlined text-base">drag_indicator</span>
                        </div>
                        <button onclick="event.stopPropagation(); window.Todo.remove(${item.id})" 
                                class="text-slate-300 hover:text-red-500 p-0.5">
                            <span class="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                </div>`;
            };

            let html = activeItems.map(renderItem).join('');
            
            // 완료된 항목이 있으면 구분선과 함께 표시
            if (doneItems.length > 0) {
                html += `
                <details class="mt-3" open>
                    <summary class="text-xs text-slate-400 cursor-pointer hover:text-slate-600 py-1 flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">expand_more</span>
                        완료됨 (${doneItems.length})
                    </summary>
                    <div class="mt-1 opacity-60">
                        ${doneItems.map(renderItem).join('')}
                    </div>
                </details>`;
            }

            list.innerHTML = html;
        }
    };
    window.Todo = Todo;

    // ===== 계산기 =====
    // ===== 계산기 =====
    const Calc = {
        historyList: Storage.get('calcHistoryList', []),
        lastExpression: null, // 되돌리기 기능을 위한 변수

        init() {
            this.renderHistory();
            const display = document.getElementById('calc-display');
            display.focus();

            // 되돌리기, 히스토리 삭제 버튼 로직
            const undoBtn = document.getElementById('calc-undo');
            const clearHistoryBtn = document.getElementById('calc-clear-history');

            undoBtn.addEventListener('click', () => this.undo());
            clearHistoryBtn.addEventListener('click', () => this.clearHistory());

            // 버튼 생성 (괄호 추가, 레이아웃 수정)
            const buttons = [
                { t: 'AC', cls: 'gray' }, { t: 'DEL', cls: 'gray' }, { t: '(', cls: 'gray' }, { t: ')', cls: 'gray' },
                { t: '7' }, { t: '8' }, { t: '9' }, { t: '+', cls: 'orange' },
                { t: '4' }, { t: '5' }, { t: '6' }, { t: '-', cls: 'orange' },
                { t: '1' }, { t: '2' }, { t: '3' }, { t: '×', cls: 'orange' },
                { t: '0' }, { t: '.' }, { t: '=', cls: 'primary' }, { t: '÷', cls: 'orange' }
            ];

            // 0 버튼이 1칸으로 줄고 . 버튼이 넓어지는 배치가 이상할 수 있음.
            // 보통 0이 넓음. 사용자 요청 "괄호 버튼 생성"을 위해 0을 줄이고 괄호를 넣음.
            // 위 배열에서 0과 .의 클래스를 반대로 하거나 조정 필요.
            // 수정: 마지막 줄 [0, ., =, +] -> 4칸. 0을 1칸으로.

            const container = document.getElementById('calc-buttons');
            container.innerHTML = '';

            buttons.forEach(b => {
                let cls = 'rounded-lg text-sm font-medium h-10 transition-colors ';
                if (b.cls === 'gray') cls += 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200';
                else if (b.cls === 'orange') cls += 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/40';
                else if (b.cls === 'primary') cls += 'bg-primary text-white hover:bg-blue-600 shadow-md shadow-blue-200 dark:shadow-none';
                else if (b.cls === 'wide') cls += 'col-span-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-lg'; // 여기서는 사용 안 함
                else cls += 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-700'; // 숫자

                container.innerHTML += `<button class="${cls}" data-val="${b.t}">${b.t}</button>`;
            });

            // 이벤트 리스너
            container.addEventListener('click', (e) => {
                const val = e.target.dataset.val;
                if (val) {
                    this.input(val);
                    display.focus();
                }
            });

            // 키보드 입력
            display.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.calculate();
                } else if (e.key === 'Escape') {
                    this.input('AC');
                } else {
                    // 계산 결과가 표시된 상태에서 숫자/기호 입력 시 되돌리기 버튼 숨김 로직 필요할 수 있음
                    // (input 함수에서 처리)
                }
            });

            // 히스토리 항목 클릭 복사
            document.getElementById('calc-history-container').addEventListener('click', (e) => {
                const item = e.target.closest('.history-item');
                if (item) {
                    const text = item.dataset.expr;
                    if (text) {
                        display.value = text;
                        display.focus();
                        this.toggleUndo(false); // 새로 값을 썼으니 undo 불가
                    }
                }
            });
        },

        input(val) {
            const display = document.getElementById('calc-display');
            const preview = document.getElementById('calc-preview');
            const current = display.value;

            // 계산 결과가 표시된 직후였다면, 숫자를 누르면 새 시작, 연산자를 누르면 이어가기?
            // 현재 로직은 그냥 이어붙임.
            // 하지만 undo 버튼이 떠 있다면, 사용자가 입력을 시작하는 순간 undo 버튼은 사라져야 자연스러움.
            if (document.getElementById('calc-undo').style.display !== 'none') {
                if (['AC', 'DEL', '='].includes(val) || !val) {
                    // 기능키는 유지? 아니면 숨김?
                    // 새 입력이 들어오면 과거 식 복구 기회는 사라지는게 일반적이나
                    // 여기서는 명시적으로 '식으로 돌아가기'이므로 유지하다가, 식이 변형되면 그때 사라지게?
                    // 단순히: 입력이 발생하면 undo 숨김.
                }
                this.toggleUndo(false);
                // 결과값 상태에서 숫자를 치면 덮어쓰기? 연산자를 치면 이어쓰기?
                // 일반 계산기: 결과 30 -> '+ 5' -> 30+5
                // 결과 30 -> '5' -> 5 (새로운 숫자)
                // 이를 구현하려면 isResultState 같은 플래그 필요.
                // 여기서는 간단히: 결과값도 그냥 텍스트로 취급.
                if (preview.textContent.includes('=') && !['+', '-', '×', '÷', '%'].includes(val) && !isNaN(parseInt(val))) {
                    // 결과가 나왔는데 숫자를 입력하면 초기화 후 입력 (일반적 계산기 UX)
                    // 하지만 여기는 텍스트 에디터 방식이므로 그대로 둠. 사용자가 직접 지우거나 해야 함.
                    // 사용자 경험사 AC 누르고 하는게 맞음.
                }
                preview.textContent = ''; // 프리뷰 초기화
            }

            if (val === 'AC') {
                display.value = '';
                preview.textContent = '';
                this.toggleUndo(false);
            } else if (val === 'DEL') {
                display.value = current.slice(0, -1);
            } else if (val === '=') {
                this.calculate();
            } else {
                let inputVal = val;
                if (val === '×') inputVal = '*';
                if (val === '÷') inputVal = '/';
                display.value = current + inputVal;
            }
        },

        calculate() {
            const display = document.getElementById('calc-display');
            const preview = document.getElementById('calc-preview');
            let expression = display.value;

            if (!expression.trim()) return;

            try {
                // 저장해두기 (Undo용)
                this.lastExpression = expression;

                const calcExpr = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/%/g, '/100');
                if (/[^0-9+\-*/().\s]/.test(calcExpr)) throw new Error("Invalid Input");

                const result = eval(calcExpr);
                const formattedResult = result.toString();

                this.historyList.push({ expr: expression, res: formattedResult });
                if (this.historyList.length > 5) this.historyList.shift(); // 5개만 유지 (요청사항)

                Storage.set('calcHistoryList', this.historyList);
                this.renderHistory();

                preview.textContent = expression + ' =';
                display.value = formattedResult;

                // 되돌리기 버튼 표시
                this.toggleUndo(true);

            } catch (e) {
                display.value = 'Error';
                setTimeout(() => { if (display.value === 'Error') display.value = expression; }, 1500);
            }
        },

        undo() {
            if (this.lastExpression) {
                const display = document.getElementById('calc-display');
                display.value = this.lastExpression;
                document.getElementById('calc-preview').textContent = '';
                this.toggleUndo(false);
                display.focus();
            }
        },

        toggleUndo(show) {
            const btn = document.getElementById('calc-undo');
            if (btn) {
                // tailwind 'hidden' 클래스 토글 대신 style.display 사용 (transition 효과 위해 opacity 조절하지만 display도 필요)
                // hidden 클래스를 쓰면 transition 안됨.
                if (show) {
                    btn.classList.remove('hidden');
                    // 약간의 딜레이 후 opacity 1 (fade in)
                    setTimeout(() => btn.classList.remove('opacity-0'), 10);
                } else {
                    btn.classList.add('opacity-0');
                    setTimeout(() => btn.classList.add('hidden'), 300); // transition duration 후 숨김
                }
            }
        },

        clearHistory() {
            this.historyList = [];
            Storage.set('calcHistoryList', []);
            this.renderHistory();
        },

        renderHistory() {
            const container = document.getElementById('calc-history-container');
            if (!container) return;

            if (this.historyList.length === 0) {
                container.innerHTML = '<div class="text-center py-4 text-[10px] opacity-50">기록 없음</div>';
                return;
            }

            // 최신 기록이 아래에? 위에? 
            // "계산 기록은 5개까지 표시하고 더 길어지면 스크롤바로"
            // 보통 계산기는 아래에 최신이 쌓임.
            container.innerHTML = this.historyList.map(item => `
                <div class="history-item cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-1 transition-colors group" title="클릭하여 수식 복사" data-expr="${item.expr}">
                    <div class="text-[10px] text-slate-300 group-hover:text-slate-500">${item.expr} =</div>
                    <div class="font-medium text-slate-500 group-hover:text-primary transition-colors">${item.res}</div>
                </div>
            `).join('');

            container.scrollTop = container.scrollHeight;
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
        exchangeDate: null,
        units: {
            currency: { from: 'USD', to: 'KRW', options: ['USD', 'EUR', 'KRW', 'JPY', 'CNY', 'GBP'], rates: { USD: 1, EUR: 0.92, KRW: 1350, JPY: 157, CNY: 7.2, GBP: 0.79 } },
            length: { from: 'cm', to: 'm', options: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'], rates: { mm: 1000, cm: 100, m: 1, km: 0.001, in: 39.37, ft: 3.281, yd: 1.094, mi: 0.000621 } },
            area: { from: '㎡', to: '평', options: ['㎡', '평', 'ft²', 'ac'], rates: { '㎡': 1, '평': 0.3025, 'ft²': 10.764, 'ac': 0.000247 } },
            weight: { from: 'kg', to: 'g', options: ['mg', 'g', 'kg', 't', 'lb', 'oz'], rates: { mg: 1000000, g: 1000, kg: 1, t: 0.001, lb: 2.2046, oz: 35.274 } },
            speed: { from: 'km/h', to: 'm/s', options: ['m/s', 'km/h', 'mph', 'knot', 'mach'], rates: { 'm/s': 1, 'km/h': 3.6, mph: 2.237, knot: 1.944, mach: 0.002939 } }
        },
        init() {
            this.render();
            this.loadExchangeRates(); // 실시간 환율 로드
            document.querySelectorAll('.conv-type').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.type = btn.dataset.type;
                    Storage.set('convType', this.type);
                    this.updateButtons();
                    this.render();
                });
            });
        },
        async loadExchangeRates() {
            try {
                const res = await fetch('/api/exchange');
                const data = await res.json();
                if (data.rates) {
                    this.units.currency.rates = data.rates;
                    this.exchangeDate = data.date;
                    // 환율 탭이 활성화되어 있으면 다시 변환
                    if (this.type === 'currency') {
                        this.convert();
                        this.updateExchangeInfo();
                    }
                    console.log('[Exchange] 실시간 환율 로드 완료:', data.date);
                }
            } catch (e) {
                console.error('[Exchange] 환율 로드 실패:', e);
            }
        },
        updateExchangeInfo() {
            const infoEl = document.getElementById('exchange-info');
            if (infoEl && this.exchangeDate) {
                infoEl.textContent = `환율 기준: ${this.exchangeDate}`;
                infoEl.classList.remove('hidden');
            }
        },
        updateButtons() {
            document.querySelectorAll('.conv-type').forEach(btn => {
                const isActive = btn.dataset.type === this.type;
                btn.className = `conv-type ${isActive ? 'text-primary relative after:content-[\'\'] after:absolute after:bottom-[-9px] after:left-0 after:w-full after:h-0.5 after:bg-primary' : 'text-slate-400 hover:text-slate-600'} p-1 transition-colors`;
            });
        },
        render() {
            const u = this.units[this.type];
            const container = document.getElementById('converter-content');

            const createUnitChips = (current, idPrefix) => {
                return `<div class="flex flex-wrap gap-1.5 mb-2">
                    ${u.options.map(o => `
                        <button class="unit-chip px-2.5 py-1 text-[10px] font-medium rounded-full border transition-all ${o === current ? 'bg-primary text-white border-primary shadow-sm shadow-blue-100' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-primary/50'}" 
                                data-unit="${o}" data-prefix="${idPrefix}">
                            ${o}
                        </button>
                    `).join('')}
                </div>`;
            };

            const isCurrency = this.type === 'currency';
            container.innerHTML = `
                ${isCurrency ? `<div id="exchange-info" class="text-[10px] text-slate-400 mb-2 text-right ${this.exchangeDate ? '' : 'hidden'}">환율 기준: ${this.exchangeDate || ''}</div>` : ''}
                <div class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                    <div class="text-[10px] text-slate-400 mb-2 font-medium">From</div>
                    ${createUnitChips(u.from, 'from')}
                    <input id="conv-input" class="w-full bg-transparent text-xl font-bold border-none p-0 focus:ring-0 text-slate-700 dark:text-slate-200 placeholder-slate-300" type="text" value="1" placeholder="값을 입력하세요" />
                </div>
                
                <div class="flex justify-center -my-2.5 relative z-10">
                    <button id="conv-swap" class="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-2 text-slate-400 hover:text-primary shadow-md hover:shadow-lg transition-all active:scale-95">
                        <span class="material-symbols-outlined text-base">swap_vert</span>
                    </button>
                </div>
                
                <div class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                    <div class="text-[10px] text-slate-400 mb-2 font-medium">To</div>
                    ${createUnitChips(u.to, 'to')}
                    <input id="conv-output" class="w-full bg-transparent text-xl font-bold border-none p-0 focus:ring-0 text-primary" type="text" readonly />
                </div>`;

            // 단위 선택 이벤트
            container.querySelectorAll('.unit-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const prefix = btn.dataset.prefix;
                    const unit = btn.dataset.unit;
                    if (prefix === 'from') u.from = unit;
                    else u.to = unit;
                    this.render(); // 상태 변경 후 즉시 리렌더링 (가장 안전한 방식)
                });
            });

            const input = document.getElementById('conv-input');
            input.addEventListener('input', () => this.convert());
            input.focus(); // 탭 전환 시 입력창 포커스 (편의성)

            document.getElementById('conv-swap').addEventListener('click', () => this.swap());
            this.convert();
        },
        convert() {
            const u = this.units[this.type];
            const valStr = document.getElementById('conv-input').value.replace(/,/g, '');
            const val = parseFloat(valStr) || 0;
            const from = u.from;
            const to = u.to;

            // 기준 단위(u.rates에서 값이 1인 단위 또는 정규화된 값)로 변환 후 대상 단위로 변환
            // rates가 기준 단위 대비 비율이라면: result = val * (rates[to] / rates[from])
            const result = val * (u.rates[to] / u.rates[from]);

            // 결과 포맷팅
            const displayResult = Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
            document.getElementById('conv-output').value = displayResult.toLocaleString(undefined, { maximumFractionDigits: 6 });
        },
        swap() {
            const u = this.units[this.type];
            [u.from, u.to] = [u.to, u.from];
            this.render();
        }
    };

    // ===== 메모 =====
    const Memo = {
        init() {
            const textarea = document.getElementById('memo-text');
            textarea.value = Storage.get('memo', '');

            textarea.addEventListener('input', () => Storage.set('memo', textarea.value));

            textarea.addEventListener('keydown', (e) => {
                const { selectionStart, selectionEnd, value } = textarea;
                const lines = value.substring(0, selectionStart).split('\n');
                const currentLine = lines[lines.length - 1];

                // 1. Enter 키 처리 (자동 리스트 생성)
                if (e.key === 'Enter') {
                    // 불렛 리스트 (*, -) 또는 숫자 리스트 (1.) 패턴 매칭
                    const bulletMatch = currentLine.match(/^(\s*)([*-])\s(.*)/);
                    const numberMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)/);

                    if (bulletMatch || numberMatch) {
                        e.preventDefault();
                        const indent = (bulletMatch ? bulletMatch[1] : numberMatch[1]);
                        const content = (bulletMatch ? bulletMatch[3] : numberMatch[3]);

                        // 현재 행에 내용이 없으면 리스트 종료
                        if (!content.trim()) {
                            const newText = value.substring(0, selectionStart - currentLine.length) + '\n' + value.substring(selectionEnd);
                            textarea.value = newText;
                            textarea.selectionStart = textarea.selectionEnd = selectionStart - currentLine.length + 1;
                            return;
                        }

                        let nextPrefix = bulletMatch ? bulletMatch[2] : (parseInt(numberMatch[2]) + 1) + '.';
                        const insertion = `\n${indent}${nextPrefix} `;

                        textarea.value = value.substring(0, selectionStart) + insertion + value.substring(selectionEnd);
                        textarea.selectionStart = textarea.selectionEnd = selectionStart + insertion.length;
                        Storage.set('memo', textarea.value);
                    }
                }

                // 2. Tab 키 처리 (위계 설정 - 2칸 들여쓰기)
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const isShift = e.shiftKey;

                    // 여러 줄 선택 대응
                    const before = value.substring(0, selectionStart);
                    const after = value.substring(selectionEnd);
                    const startOfLine = before.lastIndexOf('\n') + 1;
                    const endOfLine = selectionEnd + (after.indexOf('\n') !== -1 ? after.indexOf('\n') : after.length);

                    const selection = value.substring(startOfLine, endOfLine);
                    const selectedLines = selection.split('\n');

                    const newLines = selectedLines.map(line => {
                        if (isShift) {
                            // 앞의 공백 2칸 제거 (또는 탭 1개 제거)
                            return line.startsWith('  ') ? line.substring(2) : (line.startsWith('\t') ? line.substring(1) : line);
                        } else {
                            // 공백 2칸 추가
                            return '  ' + line;
                        }
                    });

                    const newContent = newLines.join('\n');
                    textarea.value = value.substring(0, startOfLine) + newContent + value.substring(endOfLine);

                    // 포커스 유지 및 선택 영역 복구
                    if (selectionStart === selectionEnd) {
                        const diff = newLines[0].length - selectedLines[0].length;
                        textarea.selectionStart = textarea.selectionEnd = Math.max(startOfLine, selectionStart + diff);
                    } else {
                        textarea.selectionStart = startOfLine;
                        textarea.selectionEnd = startOfLine + newContent.length;
                    }
                    Storage.set('memo', textarea.value);
                }
            });
        }
    };

    // ===== 사전 (Dictionary) =====
    const Dictionary = {
        currentTab: Storage.get('dictTab', 'korean'), // 'korean', 'english', 'etymology'
        isLoading: false,
        lastQuery: '',
        searchHistory: Storage.get('dictHistory', []),
        historyIndex: -1,

        init() {
            this.bindEvents();
            this.updateTabButtons();
            this.updateNavButtons();
            this.updatePlaceholder();
            this.updateFooter();
        },

        bindEvents() {
            // 탭 버튼들
            ['korean', 'english', 'etymology'].forEach(tab => {
                const btn = document.getElementById(`dict-tab-${tab}`);
                if (btn) {
                    btn.addEventListener('click', () => {
                        this.currentTab = tab;
                        Storage.set('dictTab', tab);
                        this.updateTabButtons();
                        this.updatePlaceholder();
                        this.updateFooter();
                        this.clearResults();
                    });
                }
            });

            // 검색 버튼
            const searchBtn = document.getElementById('dict-search-btn');
            const searchInput = document.getElementById('dict-search-input');

            if (searchBtn) {
                searchBtn.addEventListener('click', () => this.search());
            }

            if (searchInput) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.search();
                });

                // 드래그 앤 드롭
                searchInput.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    searchInput.classList.add('border-primary', 'bg-primary/5');
                });
                searchInput.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    searchInput.classList.remove('border-primary', 'bg-primary/5');
                });
                searchInput.addEventListener('drop', (e) => {
                    e.preventDefault();
                    searchInput.classList.remove('border-primary', 'bg-primary/5');
                    const text = e.dataTransfer.getData('text/plain').trim();
                    if (text) {
                        searchInput.value = text;
                        this.search();
                    }
                });
            }

            // 히스토리 네비게이션
            document.getElementById('dict-nav-prev')?.addEventListener('click', () => this.navigateHistory('prev'));
            document.getElementById('dict-nav-next')?.addEventListener('click', () => this.navigateHistory('next'));
        },

        updateTabButtons() {
            ['korean', 'english', 'etymology'].forEach(tab => {
                const btn = document.getElementById(`dict-tab-${tab}`);
                if (btn) {
                    btn.className = this.currentTab === tab
                        ? 'dict-tab px-3 py-1 text-xs font-bold bg-white dark:bg-card-dark rounded shadow-sm'
                        : 'dict-tab px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-700';
                }
            });
        },

        updatePlaceholder() {
            const input = document.getElementById('dict-search-input');
            if (!input) return;
            const placeholders = {
                korean: '국어 단어를 검색하세요 (예: 사랑, 행복)...',
                english: '영어 또는 한글 단어를 입력하세요 (자동 전환)...',
                etymology: '영어 단어의 어원을 검색하세요 (예: love, computer)...'
            };
            input.placeholder = placeholders[this.currentTab];
        },

        updateFooter() {
            const source = document.getElementById('dict-source');
            const link = document.getElementById('dict-link');
            if (!source || !link) return;

            const footers = {
                korean: { text: '출처: 국립국어원 표준국어대사전', url: 'https://stdict.korean.go.kr', label: '사전 사이트 방문' },
                english: { text: '출처: Free Dictionary API + 파파고', url: 'https://dictionaryapi.dev', label: 'API 정보' },
                etymology: { text: '출처: Online Etymology Dictionary', url: 'https://www.etymonline.com', label: 'Etymonline 방문' }
            };
            const f = footers[this.currentTab];
            source.textContent = f.text;
            link.href = f.url;
            link.innerHTML = `<span class="material-symbols-outlined text-sm">open_in_new</span>${f.label}`;
        },

        clearResults() {
            const container = document.getElementById('dict-results');
            if (!container) return;
            const msgs = {
                korean: '국어 단어를 검색해보세요 (조사, 합성어도 검색 가능)',
                english: '영어 입력 시 영한사전, 한글 입력 시 한영사전으로 자동 전환됩니다',
                etymology: '영어 단어의 어원과 역사를 알아보세요'
            };
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">search</span>
                    <p class="text-sm">${msgs[this.currentTab]}</p>
                </div>`;
        },

        updateNavButtons() {
            const prevBtn = document.getElementById('dict-nav-prev');
            const nextBtn = document.getElementById('dict-nav-next');
            if (prevBtn) prevBtn.disabled = this.historyIndex >= this.searchHistory.length - 1;
            if (nextBtn) nextBtn.disabled = this.historyIndex <= 0;
        },

        navigateHistory(direction) {
            if (direction === 'prev' && this.historyIndex < this.searchHistory.length - 1) {
                this.historyIndex++;
            } else if (direction === 'next' && this.historyIndex > 0) {
                this.historyIndex--;
            }
            const query = this.searchHistory[this.historyIndex];
            if (query) {
                document.getElementById('dict-search-input').value = query;
                this.searchWithoutHistory(query);
            }
        },

        async searchWithoutHistory(query) {
            if (!query || this.isLoading) return;
            this.isLoading = true;
            this.lastQuery = query;
            this.showLoading();

            try {
                let data;
                if (this.currentTab === 'korean') {
                    data = await this.fetchKorean(query);
                    this.renderKoreanResults(data, query);
                } else if (this.currentTab === 'english') {
                    data = await this.fetchEnglish(query);
                    this.renderEnglishResults(data, query);
                } else {
                    // etymology - iframe 표시
                    this.renderEtymologyResults(query);
                }
                this.updateNavButtons();
            } catch (error) {
                this.showMessage('검색 중 오류: ' + error.message, 'error');
            } finally {
                this.isLoading = false;
            }
        },

        async search() {
            const query = document.getElementById('dict-search-input')?.value.trim();
            if (!query) {
                this.showMessage('검색어를 입력해주세요.', 'warning');
                return;
            }
            await this.searchWithoutHistory(query);
            this.addToHistory(query);
        },

        async fetchKorean(query) {
            const res = await fetch(`/api/dictionary?q=${encodeURIComponent(query)}`);
            return res.json();
        },

        async fetchEnglish(query) {
            const res = await fetch(`/api/english?q=${encodeURIComponent(query)}`);
            return res.json();
        },

        renderKoreanResults(data, query) {
            const container = document.getElementById('dict-results');
            if (!container) return;

            if (data.error) {
                this.showMessage(data.error.message, 'error');
                return;
            }

            let items = data.channel?.item;
            if (!items || items.length === 0) {
                container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">search_off</span>
                    <p class="text-sm">'${this.escapeHtml(query)}'에 대한 결과가 없습니다.</p>
                </div>`;
                return;
            }

            // 정확히 일치하는 결과를 상위로 정렬
            const queryLower = query.toLowerCase().replace(/\s/g, '');
            items = [...items].sort((a, b) => {
                const aWord = (a.word || '').toLowerCase().replace(/\s/g, '').replace(/-/g, '');
                const bWord = (b.word || '').toLowerCase().replace(/\s/g, '').replace(/-/g, '');
                const aExact = aWord === queryLower ? 0 : 1;
                const bExact = bWord === queryLower ? 0 : 1;
                if (aExact !== bExact) return aExact - bExact;
                // 그 다음은 시작하는 단어 우선
                const aStarts = aWord.startsWith(queryLower) ? 0 : 1;
                const bStarts = bWord.startsWith(queryLower) ? 0 : 1;
                return aStarts - bStarts;
            });

            let html = `<div class="mb-3"><span class="text-xs text-slate-500">총 <strong class="text-primary">${data.channel?.total || 0}</strong>개</span></div><div class="space-y-2">`;
            items.forEach(item => {
                const word = item.word || '';
                const pos = item.pos || '';
                const def = item.sense?.definition || '';
                const link = item.sense?.link || '';
                // 정확히 일치하는 단어 하이라이트
                const isExact = word.toLowerCase().replace(/\s/g, '').replace(/-/g, '') === queryLower;
                html += `<div class="bg-white dark:bg-card-dark rounded-lg p-3 border ${isExact ? 'border-primary/50 bg-primary/5' : 'border-slate-100 dark:border-slate-700'} hover:border-primary/30 transition-colors">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1">
                            <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span class="text-base font-bold">${this.escapeHtml(word)}</span>
                                ${pos ? `<span class="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded">${this.escapeHtml(pos)}</span>` : ''}
                                ${isExact ? '<span class="px-1.5 py-0.5 text-[10px] font-medium bg-primary/20 text-primary rounded">일치</span>' : ''}
                            </div>
                            <p class="text-sm text-slate-600 dark:text-slate-300">${this.escapeHtml(def)}</p>
                        </div>
                        ${link ? `<a href="${link}" target="_blank" class="shrink-0 p-1.5 text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-lg">open_in_new</span></a>` : ''}
                    </div>
                </div>`;
            });
            container.innerHTML = html + '</div>';
        },

        renderEnglishResults(data, query) {
            const container = document.getElementById('dict-results');
            if (!container) return;

            if (data.error) {
                this.showMessage(data.error.message, 'error');
                return;
            }

            const isKoToEn = data.direction === 'ko→en';
            const directionBadge = isKoToEn 
                ? '<span class="px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 rounded">한→영</span>'
                : '<span class="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">영→한</span>';

            let html = `<div class="space-y-4">`;
            
            // 단어 헤더
            html += `<div class="bg-white dark:bg-card-dark rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl font-bold">${this.escapeHtml(data.word)}</span>
                        ${data.phonetic ? `<span class="text-sm text-slate-500">${this.escapeHtml(data.phonetic)}</span>` : ''}
                        ${data.audio ? `<button onclick="new Audio('${data.audio}').play()" class="p-1 text-primary hover:bg-primary/10 rounded-full"><span class="material-symbols-outlined text-lg">volume_up</span></button>` : ''}
                    </div>
                    ${directionBadge}
                </div>`;
            
            // 한글/영어 뜻 (메인으로 크게 표시)
            if (isKoToEn && data.englishMeaning) {
                html += `<div class="text-xl text-primary font-bold border-l-4 border-primary pl-3">${this.escapeHtml(data.englishMeaning)}</div>`;
            } else if (!isKoToEn && data.koreanMeaning) {
                html += `<div class="text-xl text-primary font-bold border-l-4 border-primary pl-3">${this.escapeHtml(data.koreanMeaning)}</div>`;
            } else if (!isKoToEn && data.papagoError) {
                html += `<div class="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg">warning</span>
                    ${this.escapeHtml(data.papagoError)}
                </div>`;
            } else if (!isKoToEn) {
                html += `<div class="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">한글 뜻을 가져오려면 파파고 API가 필요합니다.</div>`;
            }
            html += `</div>`;

            // 영영 정의 (보조 정보로 축소 표시)
            if (data.meanings && data.meanings.length > 0 && !isKoToEn) {
                html += `<details class="bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-hidden">
                    <summary class="p-3 cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">expand_more</span>
                        영영 정의 보기
                    </summary>
                    <div class="px-3 pb-3 space-y-2">`;
                data.meanings.forEach(meaning => {
                    html += `<div class="text-xs">
                        <span class="font-semibold text-primary">${this.escapeHtml(meaning.partOfSpeech)}</span>
                        <ul class="mt-1 space-y-1 text-slate-600 dark:text-slate-400">`;
                    meaning.definitions.slice(0, 2).forEach((def, i) => {
                        html += `<li>${i + 1}. ${this.escapeHtml(def.definition)}</li>`;
                    });
                    html += `</ul></div>`;
                });
                html += `</div></details>`;
            } else if (data.meanings && data.meanings.length > 0 && isKoToEn) {
                // 한영일 때는 영어 정의를 펼쳐서 보여줌
                data.meanings.forEach(meaning => {
                    html += `<div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                        <div class="text-xs font-semibold text-primary mb-2">${this.escapeHtml(meaning.partOfSpeech)}</div>
                        <ul class="space-y-2">`;
                    meaning.definitions.forEach((def, i) => {
                        html += `<li class="text-sm">
                            <span class="text-slate-400 mr-1">${i + 1}.</span>
                            <span class="text-slate-700 dark:text-slate-200">${this.escapeHtml(def.definition)}</span>
                            ${def.example ? `<div class="text-xs text-slate-500 mt-1 italic">"${this.escapeHtml(def.example)}"</div>` : ''}
                        </li>`;
                    });
                    html += `</ul></div>`;
                });
            }

            container.innerHTML = html + '</div>';
        },

        renderEtymologyResults(query) {
            const container = document.getElementById('dict-results');
            if (!container) return;

            // etymonline.com 검색 URL
            const searchUrl = `https://www.etymonline.com/search?q=${encodeURIComponent(query)}`;

            container.innerHTML = `
                <div class="h-full flex flex-col">
                    <div class="mb-2 flex items-center justify-between">
                        <span class="text-xs text-slate-500">검색어: <strong class="text-primary">${this.escapeHtml(query)}</strong></span>
                        <a href="${searchUrl}" target="_blank" class="text-xs text-primary hover:underline flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">open_in_new</span>새 탭에서 열기
                        </a>
                    </div>
                    <div class="flex-1 relative rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden" style="min-height: 400px;">
                        <iframe 
                            src="${searchUrl}" 
                            class="absolute inset-0 w-full h-full bg-white origin-top-left"
                            style="transform: scale(0.85); width: 117.6%; height: 117.6%;"
                            sandbox="allow-scripts allow-same-origin allow-popups"
                        ></iframe>
                    </div>
                </div>`;
        },

        showLoading() {
            const container = document.getElementById('dict-results');
            if (!container) return;
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400">
                <div class="animate-spin mb-3"><span class="material-symbols-outlined text-4xl text-primary">progress_activity</span></div>
                <p class="text-sm">검색 중...</p>
            </div>`;
        },

        showMessage(message, type = 'info') {
            const container = document.getElementById('dict-results');
            if (!container) return;
            const icons = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle' };
            const colors = { info: 'text-blue-500', warning: 'text-amber-500', error: 'text-red-500', success: 'text-green-500' };
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400">
                <span class="material-symbols-outlined text-4xl mb-2 ${colors[type]}">${icons[type]}</span>
                <p class="text-sm text-center">${message}</p>
            </div>`;
        },

        addToHistory(query) {
            this.searchHistory = this.searchHistory.filter(q => q !== query);
            this.searchHistory.unshift(query);
            if (this.searchHistory.length > 10) this.searchHistory.pop();
            Storage.set('dictHistory', this.searchHistory);
            this.historyIndex = 0;
            this.updateNavButtons();
        },

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // ===== 날씨 (Weather) =====
    const Weather = {
        // 즐겨찾기 (최대 3개)
        favorites: Storage.get('weatherFavorites', [
            { name: '서울', nx: 60, ny: 127, regId: '11B00000', stnId: '108' }
        ]),
        currentIdx: Storage.get('weatherCurrentIdx', 0),
        data: null,
        midForecast: null, // 중기예보 데이터

        // 중기예보 지역 코드 매핑
        regionCodes: {
            // 서울/경기
            '서울': { regId: '11B00000', stnId: '108' },
            '인천': { regId: '11B00000', stnId: '112' },
            '경기': { regId: '11B00000', stnId: '108' },
            '수원': { regId: '11B00000', stnId: '119' },
            // 강원
            '강원': { regId: '11D10000', stnId: '101' },
            '춘천': { regId: '11D10000', stnId: '101' },
            '강릉': { regId: '11D20000', stnId: '105' },
            // 충청
            '대전': { regId: '11C20000', stnId: '133' },
            '세종': { regId: '11C20000', stnId: '133' },
            '충북': { regId: '11C10000', stnId: '131' },
            '청주': { regId: '11C10000', stnId: '131' },
            '충남': { regId: '11C20000', stnId: '129' },
            // 전라
            '광주': { regId: '11F20000', stnId: '156' },
            '전북': { regId: '11F10000', stnId: '146' },
            '전주': { regId: '11F10000', stnId: '146' },
            '전남': { regId: '11F20000', stnId: '156' },
            // 경상
            '부산': { regId: '11H20000', stnId: '159' },
            '대구': { regId: '11H10000', stnId: '143' },
            '울산': { regId: '11H20000', stnId: '152' },
            '경북': { regId: '11H10000', stnId: '143' },
            '경남': { regId: '11H20000', stnId: '155' },
            // 제주
            '제주': { regId: '11G00000', stnId: '184' },
        },

        // 전국 주요 지역 격자 좌표 (시/구/동 단위)
        locations: [
            // === 서울특별시 (구 단위) ===
            { name: '서울 종로구', nx: 60, ny: 127 }, { name: '서울 중구', nx: 60, ny: 127 },
            { name: '서울 용산구', nx: 60, ny: 126 }, { name: '서울 성동구', nx: 61, ny: 127 },
            { name: '서울 광진구', nx: 62, ny: 126 }, { name: '서울 동대문구', nx: 61, ny: 127 },
            { name: '서울 중랑구', nx: 62, ny: 128 }, { name: '서울 성북구', nx: 61, ny: 128 },
            { name: '서울 강북구', nx: 61, ny: 129 }, { name: '서울 도봉구', nx: 61, ny: 130 },
            { name: '서울 노원구', nx: 61, ny: 130 }, { name: '서울 은평구', nx: 59, ny: 128 },
            { name: '서울 서대문구', nx: 59, ny: 127 }, { name: '서울 마포구', nx: 59, ny: 127 },
            { name: '서울 양천구', nx: 57, ny: 126 }, { name: '서울 강서구', nx: 57, ny: 126 },
            { name: '서울 구로구', nx: 57, ny: 125 }, { name: '서울 금천구', nx: 58, ny: 124 },
            { name: '서울 영등포구', nx: 58, ny: 126 }, { name: '서울 동작구', nx: 59, ny: 125 },
            { name: '서울 관악구', nx: 59, ny: 125 }, { name: '서울 서초구', nx: 61, ny: 125 },
            { name: '서울 강남구', nx: 61, ny: 126 }, { name: '서울 송파구', nx: 62, ny: 126 },
            { name: '서울 강동구', nx: 63, ny: 126 },
            // 서울 동 단위
            { name: '종로구 종로동', nx: 60, ny: 127 }, { name: '종로구 청운효자동', nx: 60, ny: 127 },
            { name: '중구 명동', nx: 60, ny: 127 }, { name: '중구 을지로동', nx: 60, ny: 127 },
            { name: '용산구 이태원동', nx: 60, ny: 126 }, { name: '용산구 한남동', nx: 60, ny: 126 },
            { name: '성동구 성수동', nx: 61, ny: 127 }, { name: '성동구 왕십리동', nx: 61, ny: 127 },
            { name: '광진구 건대입구', nx: 62, ny: 126 }, { name: '광진구 자양동', nx: 62, ny: 127 },
            { name: '동대문구 회기동', nx: 61, ny: 127 }, { name: '동대문구 청량리동', nx: 61, ny: 127 },
            { name: '중랑구 면목동', nx: 62, ny: 128 }, { name: '중랑구 상봉동', nx: 62, ny: 128 },
            { name: '성북구 성북동', nx: 61, ny: 128 }, { name: '성북구 정릉동', nx: 61, ny: 128 },
            { name: '강북구 수유동', nx: 61, ny: 129 }, { name: '강북구 미아동', nx: 61, ny: 129 },
            { name: '도봉구 창동', nx: 61, ny: 130 }, { name: '도봉구 쌍문동', nx: 61, ny: 130 },
            { name: '노원구 상계동', nx: 61, ny: 130 }, { name: '노원구 중계동', nx: 61, ny: 130 },
            { name: '은평구 불광동', nx: 59, ny: 128 }, { name: '은평구 연신내', nx: 59, ny: 128 },
            { name: '서대문구 신촌동', nx: 59, ny: 127 }, { name: '서대문구 연희동', nx: 59, ny: 127 },
            { name: '마포구 홍대입구', nx: 59, ny: 127 }, { name: '마포구 합정동', nx: 58, ny: 127 },
            { name: '양천구 목동', nx: 57, ny: 126 }, { name: '양천구 신정동', nx: 57, ny: 126 },
            { name: '강서구 화곡동', nx: 57, ny: 126 }, { name: '강서구 발산동', nx: 56, ny: 126 },
            { name: '구로구 구로동', nx: 57, ny: 125 }, { name: '구로구 신도림동', nx: 58, ny: 125 },
            { name: '금천구 가산동', nx: 58, ny: 124 }, { name: '금천구 독산동', nx: 58, ny: 124 },
            { name: '영등포구 여의도동', nx: 58, ny: 126 }, { name: '영등포구 당산동', nx: 58, ny: 126 },
            { name: '동작구 노량진동', nx: 59, ny: 125 }, { name: '동작구 사당동', nx: 59, ny: 125 },
            { name: '관악구 신림동', nx: 59, ny: 125 }, { name: '관악구 봉천동', nx: 59, ny: 125 },
            { name: '서초구 서초동', nx: 61, ny: 125 }, { name: '서초구 반포동', nx: 60, ny: 125 },
            { name: '강남구 역삼동', nx: 61, ny: 126 }, { name: '강남구 삼성동', nx: 62, ny: 126 },
            { name: '강남구 논현동', nx: 61, ny: 126 }, { name: '강남구 청담동', nx: 62, ny: 126 },
            { name: '강남구 대치동', nx: 61, ny: 125 }, { name: '강남구 도곡동', nx: 61, ny: 125 },
            { name: '송파구 잠실동', nx: 62, ny: 126 }, { name: '송파구 문정동', nx: 62, ny: 125 },
            { name: '송파구 가락동', nx: 62, ny: 125 }, { name: '송파구 석촌동', nx: 62, ny: 125 },
            { name: '강동구 천호동', nx: 63, ny: 126 }, { name: '강동구 길동', nx: 63, ny: 126 },
            // 경기도
            { name: '성남시 분당구 정자동', nx: 63, ny: 124 }, { name: '성남시 분당구 서현동', nx: 63, ny: 124 },
            { name: '성남시 판교', nx: 62, ny: 123 }, { name: '성남시 야탑동', nx: 63, ny: 124 },
            { name: '수원시 영통구', nx: 61, ny: 120 }, { name: '수원시 권선구', nx: 60, ny: 120 },
            { name: '수원시 팔달구', nx: 60, ny: 121 }, { name: '수원시 장안구', nx: 60, ny: 121 },
            { name: '용인시 수지구', nx: 62, ny: 121 }, { name: '용인시 기흥구', nx: 62, ny: 120 },
            { name: '고양시 일산동구', nx: 56, ny: 129 }, { name: '고양시 일산서구', nx: 56, ny: 129 },
            { name: '고양시 덕양구', nx: 57, ny: 128 }, { name: '파주시 운정', nx: 56, ny: 131 },
            { name: '부천시 원미구', nx: 56, ny: 125 }, { name: '부천시 소사구', nx: 56, ny: 125 },
            { name: '안양시 동안구', nx: 59, ny: 123 }, { name: '안양시 만안구', nx: 59, ny: 124 },
            { name: '안산시 단원구', nx: 57, ny: 121 }, { name: '안산시 상록구', nx: 58, ny: 121 },
            { name: '광명시', nx: 58, ny: 125 }, { name: '시흥시', nx: 57, ny: 123 },
            { name: '군포시', nx: 59, ny: 122 }, { name: '의왕시', nx: 60, ny: 122 },
            { name: '하남시', nx: 64, ny: 126 }, { name: '과천시', nx: 60, ny: 124 },
            { name: '구리시', nx: 62, ny: 127 }, { name: '남양주시 다산', nx: 64, ny: 128 },
            { name: '의정부시', nx: 61, ny: 130 }, { name: '양주시', nx: 61, ny: 131 },
            { name: '김포시', nx: 55, ny: 128 }, { name: '화성시 동탄', nx: 62, ny: 118 },
            { name: '평택시', nx: 62, ny: 114 }, { name: '오산시', nx: 62, ny: 118 },
            // 인천
            { name: '인천 중구', nx: 54, ny: 125 }, { name: '인천 동구', nx: 54, ny: 125 },
            { name: '인천 미추홀구', nx: 54, ny: 124 }, { name: '인천 연수구', nx: 55, ny: 123 },
            { name: '인천 남동구', nx: 56, ny: 124 }, { name: '인천 부평구', nx: 55, ny: 125 },
            { name: '인천 계양구', nx: 56, ny: 126 }, { name: '인천 서구', nx: 55, ny: 126 },
            { name: '인천 송도', nx: 55, ny: 123 },
            // 부산
            { name: '부산 중구', nx: 97, ny: 74 }, { name: '부산 서구', nx: 97, ny: 74 },
            { name: '부산 동구', nx: 98, ny: 75 }, { name: '부산 영도구', nx: 98, ny: 74 },
            { name: '부산 부산진구', nx: 97, ny: 75 }, { name: '부산 동래구', nx: 98, ny: 76 },
            { name: '부산 남구', nx: 98, ny: 75 }, { name: '부산 북구', nx: 96, ny: 76 },
            { name: '부산 해운대구', nx: 99, ny: 75 }, { name: '부산 사하구', nx: 96, ny: 74 },
            { name: '부산 금정구', nx: 98, ny: 77 }, { name: '부산 강서구', nx: 96, ny: 76 },
            { name: '부산 연제구', nx: 98, ny: 76 }, { name: '부산 수영구', nx: 99, ny: 75 },
            { name: '부산 사상구', nx: 96, ny: 75 }, { name: '부산 기장군', nx: 100, ny: 77 },
            // 대구
            { name: '대구 중구', nx: 89, ny: 90 }, { name: '대구 동구', nx: 90, ny: 91 },
            { name: '대구 서구', nx: 88, ny: 90 }, { name: '대구 남구', nx: 89, ny: 90 },
            { name: '대구 북구', nx: 89, ny: 91 }, { name: '대구 수성구', nx: 89, ny: 90 },
            { name: '대구 달서구', nx: 88, ny: 90 }, { name: '대구 달성군', nx: 86, ny: 88 },
            // 대전
            { name: '대전 동구', nx: 68, ny: 100 }, { name: '대전 중구', nx: 68, ny: 100 },
            { name: '대전 서구', nx: 67, ny: 100 }, { name: '대전 유성구', nx: 67, ny: 101 },
            { name: '대전 대덕구', nx: 68, ny: 101 },
            // 광주
            { name: '광주 동구', nx: 60, ny: 74 }, { name: '광주 서구', nx: 59, ny: 74 },
            { name: '광주 남구', nx: 59, ny: 73 }, { name: '광주 북구', nx: 59, ny: 75 },
            { name: '광주 광산구', nx: 57, ny: 74 },
            // 울산
            { name: '울산 중구', nx: 102, ny: 84 }, { name: '울산 남구', nx: 102, ny: 84 },
            { name: '울산 동구', nx: 104, ny: 83 }, { name: '울산 북구', nx: 103, ny: 85 },
            { name: '울산 울주군', nx: 101, ny: 84 },
            // 세종
            { name: '세종시', nx: 66, ny: 103 },
            // 제주
            { name: '제주시', nx: 53, ny: 38 }, { name: '서귀포시', nx: 52, ny: 33 },
            // 강원도
            { name: '춘천시', nx: 73, ny: 134 }, { name: '원주시', nx: 76, ny: 122 },
            { name: '강릉시', nx: 92, ny: 131 }, { name: '속초시', nx: 87, ny: 141 },
            { name: '동해시', nx: 97, ny: 127 }, { name: '삼척시', nx: 98, ny: 125 },
            // 충청북도
            { name: '청주시 상당구', nx: 69, ny: 107 }, { name: '청주시 흥덕구', nx: 67, ny: 106 },
            { name: '충주시', nx: 76, ny: 114 }, { name: '제천시', nx: 81, ny: 118 },
            // 충청남도
            { name: '천안시 동남구', nx: 63, ny: 110 }, { name: '천안시 서북구', nx: 63, ny: 112 },
            { name: '공주시', nx: 63, ny: 102 }, { name: '아산시', nx: 60, ny: 110 },
            { name: '서산시', nx: 51, ny: 110 }, { name: '논산시', nx: 62, ny: 97 },
            // 전라북도
            { name: '전주시 완산구', nx: 63, ny: 89 }, { name: '전주시 덕진구', nx: 63, ny: 89 },
            { name: '익산시', nx: 60, ny: 91 }, { name: '군산시', nx: 56, ny: 92 },
            // 전라남도
            { name: '목포시', nx: 50, ny: 67 }, { name: '여수시', nx: 73, ny: 66 },
            { name: '순천시', nx: 70, ny: 70 }, { name: '광양시', nx: 73, ny: 70 },
            // 경상북도
            { name: '포항시 남구', nx: 102, ny: 94 }, { name: '포항시 북구', nx: 102, ny: 95 },
            { name: '경주시', nx: 100, ny: 91 }, { name: '구미시', nx: 84, ny: 96 },
            { name: '안동시', nx: 91, ny: 106 }, { name: '김천시', nx: 80, ny: 96 },
            // 경상남도
            { name: '창원시 의창구', nx: 90, ny: 77 }, { name: '창원시 성산구', nx: 91, ny: 76 },
            { name: '창원시 마산', nx: 89, ny: 76 }, { name: '창원시 진해', nx: 91, ny: 75 },
            { name: '진주시', nx: 81, ny: 75 }, { name: '김해시', nx: 95, ny: 77 },
            { name: '양산시', nx: 97, ny: 79 }, { name: '거제시', nx: 90, ny: 69 }
        ],

        init() {
            this.renderFavoriteButtons();
            this.bindEvents();
            this.load();
        },

        get currentLocation() {
            return this.favorites[this.currentIdx] || this.favorites[0] || { name: '서울', nx: 60, ny: 127 };
        },

        // 버튼에 표시할 짧은 이름 생성
        getShortName(name) {
            const parts = name.split(' ');
            // 2단어 이하면 전체 표시
            if (parts.length <= 2) return name;
            // 3단어 이상이면 마지막 2단어
            return parts.slice(-2).join(' ');
        },

        bindEvents() {
            // 설정 버튼
            document.getElementById('weather-settings-btn')?.addEventListener('click', () => this.openModal());
            document.getElementById('weather-modal-close')?.addEventListener('click', () => this.closeModal());
            document.getElementById('weather-modal')?.addEventListener('click', (e) => {
                if (e.target.id === 'weather-modal') this.closeModal();
            });

            // 새로고침 버튼
            document.getElementById('weather-refresh-btn')?.addEventListener('click', () => {
                const btn = document.getElementById('weather-refresh-btn');
                btn.querySelector('span').classList.add('animate-spin');
                this.load().finally(() => {
                    setTimeout(() => btn.querySelector('span').classList.remove('animate-spin'), 500);
                });
            });

            // 동 검색
            const searchInput = document.getElementById('weather-search-input');
            let searchTimeout;
            searchInput?.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.searchLocations(e.target.value), 200);
            });
        },

        renderFavoriteButtons() {
            const container = document.getElementById('weather-favorites');
            if (!container) return;

            container.innerHTML = this.favorites.map((fav, idx) => `
                <button class="weather-fav-btn px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    idx === this.currentIdx 
                        ? 'bg-primary text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/20'
                }" data-idx="${idx}">
                    ${this.getShortName(fav.name)}
                </button>
            `).join('');

            // 버튼 이벤트
            container.querySelectorAll('.weather-fav-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.currentIdx = parseInt(btn.dataset.idx);
                    Storage.set('weatherCurrentIdx', this.currentIdx);
                    this.renderFavoriteButtons();
                    this.load();
                });
            });
        },

        openModal() {
            document.getElementById('weather-modal')?.classList.remove('hidden');
            document.getElementById('weather-search-input').value = '';
            document.getElementById('weather-search-results').classList.add('hidden');
            this.renderFavoriteList();
        },

        closeModal() {
            document.getElementById('weather-modal')?.classList.add('hidden');
        },

        searchLocations(query) {
            const resultsEl = document.getElementById('weather-search-results');
            if (!resultsEl) return;

            if (!query || query.length < 2) {
                resultsEl.classList.add('hidden');
                return;
            }

            const q = query.toLowerCase();
            const matches = this.locations.filter(loc => 
                loc.name.toLowerCase().includes(q)
            ).slice(0, 10);

            if (matches.length === 0) {
                resultsEl.innerHTML = `<div class="text-sm text-slate-400 py-2 text-center">검색 결과가 없습니다</div>`;
            } else {
                resultsEl.innerHTML = matches.map(loc => `
                    <button class="weather-search-item w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                        data-name="${loc.name}" data-nx="${loc.nx}" data-ny="${loc.ny}">
                        <span>📍 ${loc.name}</span>
                        <span class="text-xs text-slate-400">${loc.nx},${loc.ny}</span>
                    </button>
                `).join('');

                resultsEl.querySelectorAll('.weather-search-item').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this.addFavorite({
                            name: btn.dataset.name,
                            nx: parseInt(btn.dataset.nx),
                            ny: parseInt(btn.dataset.ny)
                        });
                    });
                });
            }

            resultsEl.classList.remove('hidden');
        },

        addFavorite(location) {
            // 이미 있는지 확인
            const exists = this.favorites.findIndex(f => f.nx === location.nx && f.ny === location.ny);
            if (exists >= 0) {
                // 이미 있으면 해당 위치로 전환
                this.currentIdx = exists;
                Storage.set('weatherCurrentIdx', this.currentIdx);
                this.closeModal();
                this.renderFavoriteButtons();
                this.load();
                return;
            }

            // 최대 3개 제한
            if (this.favorites.length >= 3) {
                alert('즐겨찾기는 최대 3곳까지 등록할 수 있습니다.\n기존 항목을 삭제 후 추가해주세요.');
                return;
            }

            this.favorites.push(location);
            this.currentIdx = this.favorites.length - 1;
            Storage.set('weatherFavorites', this.favorites);
            Storage.set('weatherCurrentIdx', this.currentIdx);

            this.renderFavoriteList();
            this.renderFavoriteButtons();
            this.closeModal();
            this.load();
        },

        removeFavorite(idx) {
            if (this.favorites.length <= 1) {
                alert('최소 1곳은 등록되어 있어야 합니다.');
                return;
            }

            this.favorites.splice(idx, 1);
            if (this.currentIdx >= this.favorites.length) {
                this.currentIdx = this.favorites.length - 1;
            }
            Storage.set('weatherFavorites', this.favorites);
            Storage.set('weatherCurrentIdx', this.currentIdx);

            this.renderFavoriteList();
            this.renderFavoriteButtons();
            this.load();
        },

        renderFavoriteList() {
            const container = document.getElementById('weather-favorite-list');
            if (!container) return;

            if (this.favorites.length === 0) {
                container.innerHTML = `<div class="text-sm text-slate-400 text-center py-4">등록된 즐겨찾기가 없습니다</div>`;
                return;
            }

            container.innerHTML = this.favorites.map((fav, idx) => `
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg ${idx === this.currentIdx ? 'text-primary' : 'text-slate-400'}">
                            ${idx === this.currentIdx ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                        <span class="text-sm font-medium">${fav.name}</span>
                        <span class="text-xs text-slate-400">(${fav.nx},${fav.ny})</span>
                    </div>
                    <button class="weather-fav-remove p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500" data-idx="${idx}">
                        <span class="material-symbols-outlined text-lg">delete</span>
                    </button>
                </div>
            `).join('');

            container.querySelectorAll('.weather-fav-remove').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.removeFavorite(parseInt(btn.dataset.idx));
                });
            });
        },

        async load() {
            const container = document.getElementById('weather-content');
            if (!container) return;

            const loc = this.currentLocation;
            const regionCode = this.getRegionCode(loc.name);

            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <span class="material-symbols-outlined text-4xl mb-2 animate-pulse">cloud_sync</span>
                <p class="text-sm">날씨 정보를 불러오는 중...</p>
            </div>`;

            try {
                // 현재 날씨 + 단기예보 + 중기예보 동시 요청
                const [currentRes, forecastRes, midRes] = await Promise.all([
                    fetch(`/api/weather?nx=${loc.nx}&ny=${loc.ny}&type=ultra`),
                    fetch(`/api/weather?nx=${loc.nx}&ny=${loc.ny}&type=short`),
                    fetch(`/api/midforecast?regId=${regionCode.regId}&stnId=${regionCode.stnId}`)
                ]);

                const currentData = await currentRes.json();
                const forecastData = await forecastRes.json();
                const midData = await midRes.json();

                if (currentData.error) {
                    this.showError(currentData.error.message);
                    return;
                }

                this.data = this.parseCurrentWeather(currentData);
                this.forecast = forecastData.error ? { hourly: [], daily: [] } : this.parseForecast(forecastData);
                // 중기예보 파싱 및 에러 확인
                if (midData.error) {
                    console.error('[Weather] Mid forecast error:', midData.error.message);
                    this.midForecast = [];
                } else {
                    this.midForecast = this.parseMidForecast(midData);
                }
                console.log('[Weather] Combined status:', {
                    shortDays: this.forecast.daily?.length || 0,
                    midDays: this.midForecast?.length || 0
                });
                this.render();
            } catch (error) {
                this.showError('날씨 정보를 불러올 수 없습니다: ' + error.message);
            }
        },

        // 지역명에서 중기예보 지역 코드 찾기
        getRegionCode(name) {
            for (const [key, value] of Object.entries(this.regionCodes)) {
                if (name.includes(key)) {
                    return value;
                }
            }
            // 기본값: 서울
            return { regId: '11B00000', stnId: '108' };
        },

        // 중기예보 파싱
        parseMidForecast(data) {
            const tempItems = data.temperature?.response?.body?.items?.item || [];
            const landItems = data.land?.response?.body?.items?.item || [];

            if (!tempItems.length && !landItems.length) return [];

            const temp = tempItems[0] || {};
            const land = landItems[0] || {};

            const result = [];
            // 중기예보: +3일 ~ +10일
            for (let i = 3; i <= 10; i++) {
                const day = {
                    dayOffset: i,
                    min: temp[`taMin${i}`] ?? null,
                    max: temp[`taMax${i}`] ?? null,
                    amPop: land[`rnSt${i}Am`] ?? land[`rnSt${i}`] ?? 0,
                    pmPop: land[`rnSt${i}Pm`] ?? land[`rnSt${i}`] ?? 0,
                    amSky: land[`wf${i}Am`] ?? land[`wf${i}`] ?? '맑음',
                    pmSky: land[`wf${i}Pm`] ?? land[`wf${i}`] ?? '맑음',
                };
                if (day.min !== null || day.max !== null) {
                    result.push(day);
                }
            }

            return result;
        },

        parseCurrentWeather(data) {
            const items = data.response?.body?.items?.item || [];
            const result = {};
            items.forEach(item => {
                result[item.category] = item.obsrValue || item.fcstValue;
            });
            return result;
        },

        parseForecast(data) {
            const items = data.response?.body?.items?.item || [];
            console.log('[Weather] Forecast items:', items.length);
            if (!items.length) return { hourly: [], daily: [] };

            // 시간별로 그룹핑
            const byTime = {};
            items.forEach(item => {
                const key = `${item.fcstDate}_${item.fcstTime}`;
                if (!byTime[key]) {
                    byTime[key] = { date: item.fcstDate, time: item.fcstTime };
                }
                byTime[key][item.category] = item.fcstValue;
            });

            const forecasts = Object.values(byTime).sort((a, b) => 
                `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
            );

            // 한국 시간 기준 오늘 날짜
            const now = new Date();
            const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            const currentHour = kstNow.getUTCHours();
            const today = kstNow.toISOString().slice(0, 10).replace(/-/g, '');
            console.log('[Weather] Today:', today, 'Current hour:', currentHour);
            
            // 현재 시간부터 48시간까지 시간대별 예보
            const nowStr = `${today}${String(currentHour).padStart(2, '0')}00`;
            
            // 48시간 후 계산
            const futureTime = new Date(kstNow.getTime() + 48 * 60 * 60 * 1000);
            const futureDate = futureTime.toISOString().slice(0, 10).replace(/-/g, '');
            const futureHour = futureTime.getUTCHours();
            const futureStr = `${futureDate}${String(futureHour).padStart(2, '0')}00`;

            const hourly = forecasts
                .filter(f => {
                    const fStr = `${f.date}${f.time}`;
                    return fStr >= nowStr && fStr <= futureStr && f.TMP;
                });
            console.log('[Weather] Hourly forecasts:', hourly.length);

            // 일별 (최저/최고 기온) - 전체 (필터링은 getCombinedDailyForecast에서)
            const byDate = {};
            forecasts.forEach(f => {
                if (!byDate[f.date]) {
                    byDate[f.date] = { date: f.date, temps: [], sky: [], pop: [] };
                }
                if (f.TMP) byDate[f.date].temps.push(parseFloat(f.TMP));
                if (f.TMN) byDate[f.date].min = parseFloat(f.TMN);
                if (f.TMX) byDate[f.date].max = parseFloat(f.TMX);
                if (f.SKY) byDate[f.date].sky.push(f.SKY);
                if (f.POP) byDate[f.date].pop.push(parseInt(f.POP));
            });

            const daily = Object.values(byDate)
                .map(d => ({
                    date: d.date,
                    min: d.min ?? (d.temps.length ? Math.min(...d.temps) : null),
                    max: d.max ?? (d.temps.length ? Math.max(...d.temps) : null),
                    sky: d.sky.length ? d.sky[Math.floor(d.sky.length / 2)] : '1',
                    pop: d.pop.length ? Math.max(...d.pop) : 0
                }))
                .filter(d => d.min !== null && d.max !== null)
                .sort((a, b) => a.date.localeCompare(b.date));

            console.log('[Weather] Daily forecasts:', daily.length, daily.map(d => d.date));
            return { hourly, daily };
        },

        // 체감온도 계산 (Wind Chill / Heat Index)
        calcFeelsLike(temp, wind, humidity) {
            const t = parseFloat(temp);
            const w = parseFloat(wind) * 3.6; // m/s → km/h
            const h = parseFloat(humidity);

            if (isNaN(t)) return null;

            // 추운 날씨: Wind Chill (10°C 이하, 풍속 4.8km/h 이상)
            if (t <= 10 && w >= 4.8) {
                const wc = 13.12 + 0.6215 * t - 11.37 * Math.pow(w, 0.16) + 0.3965 * t * Math.pow(w, 0.16);
                return Math.round(wc * 10) / 10;
            }
            
            // 더운 날씨: Heat Index (27°C 이상)
            if (t >= 27 && !isNaN(h)) {
                const hi = -8.78469475556 + 1.61139411 * t + 2.33854883889 * h
                    - 0.14611605 * t * h - 0.012308094 * t * t
                    - 0.0164248277778 * h * h + 0.002211732 * t * t * h
                    + 0.00072546 * t * h * h - 0.000003582 * t * t * h * h;
                return Math.round(hi * 10) / 10;
            }

            return null;
        },

        getWeatherIcon(pty, sky) {
            // PTY(강수형태): 0없음, 1비, 2비/눈, 3눈, 4소나기
            // SKY(하늘상태): 1맑음, 3구름많음, 4흐림
            if (pty && pty !== '0') {
                const ptyIcons = { '1': 'rainy', '2': 'weather_mix', '3': 'weather_snowy', '4': 'rainy' };
                return ptyIcons[pty] || 'cloud';
            }
            const skyIcons = { '1': 'sunny', '3': 'partly_cloudy_day', '4': 'cloud' };
            return skyIcons[sky] || 'sunny';
        },

        getWeatherName(pty, sky) {
            if (pty && pty !== '0') {
                const ptyNames = { '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };
                return ptyNames[pty] || '흐림';
            }
            const skyNames = { '1': '맑음', '3': '구름많음', '4': '흐림' };
            return skyNames[sky] || '맑음';
        },

        getDayName(dateStr) {
            const date = new Date(
                parseInt(dateStr.slice(0, 4)),
                parseInt(dateStr.slice(4, 6)) - 1,
                parseInt(dateStr.slice(6, 8))
            );
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diff = Math.floor((date - today) / (1000 * 60 * 60 * 24));
            
            if (diff === 0) return '오늘';
            if (diff === 1) return '내일';
            if (diff === 2) return '모레';
            
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            return days[date.getDay()] + '요일';
        },

        getDayNameByOffset(offset) {
            const date = new Date();
            date.setDate(date.getDate() + offset);
            
            if (offset === 0) return '오늘';
            if (offset === 1) return '내일';
            if (offset === 2) return '모레';
            
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            return days[date.getDay()] + '요일';
        },

        // 중기예보 날씨 텍스트 → 아이콘
        getMidWeatherIcon(sky) {
            if (!sky) return 'sunny';
            if (typeof sky === 'string') {
                if (sky.includes('맑')) return 'sunny';
                if (sky.includes('구름많') || sky.includes('구름 많')) return 'partly_cloudy_day';
                if (sky.includes('흐') && sky.includes('비')) return 'rainy';
                if (sky.includes('흐') && sky.includes('눈')) return 'weather_snowy';
                if (sky.includes('흐')) return 'cloud';
                if (sky.includes('비')) return 'rainy';
                if (sky.includes('눈')) return 'weather_snowy';
            }
            // SKY 코드인 경우
            const skyIcons = { '1': 'sunny', '3': 'partly_cloudy_day', '4': 'cloud' };
            return skyIcons[sky] || 'sunny';
        },

        // 단기예보 + 중기예보 합치기 (모레부터 7일)
        getCombinedDailyForecast() {
            const result = [];
            const now = new Date();
            const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            
            // 오늘 날짜 (KST)
            const todayKST = new Date(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate());

            // 모레(+2일)부터 10일 후까지 확인
            for (let i = 2; i <= 10; i++) {
                const targetDate = new Date(todayKST);
                targetDate.setDate(targetDate.getDate() + i);
                
                const year = targetDate.getFullYear();
                const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                const day = String(targetDate.getDate()).padStart(2, '0');
                const dateStr = `${year}${month}${day}`;
                
                let found = false;
                
                // 1. 단기예보에서 먼저 찾기 (보통 오늘~모레까지 제공)
                if (this.forecast?.daily?.length) {
                    const shortDay = this.forecast.daily.find(d => d.date === dateStr);
                    if (shortDay) {
                        result.push({
                            dayOffset: i,
                            dayName: this.getDayNameByOffset(i),
                            min: shortDay.min,
                            max: shortDay.max,
                            pop: shortDay.pop,
                            sky: shortDay.sky
                        });
                        found = true;
                    }
                }
                
                // 2. 단기예보에 없으면 중기예보에서 찾기 (+3일~+10일)
                if (!found && this.midForecast?.length) {
                    // 중기예보는 dayOffset(3~10)으로 직접 매핑되어 있음
                    const midDay = this.midForecast.find(d => d.dayOffset === i);
                    if (midDay) {
                        result.push({
                            dayOffset: i,
                            dayName: this.getDayNameByOffset(i),
                            min: midDay.min,
                            max: midDay.max,
                            pop: Math.max(midDay.amPop || 0, midDay.pmPop || 0),
                            sky: midDay.pmSky || midDay.amSky || '맑음'
                        });
                    }
                }
            }

            console.log('[Weather] Combined daily items:', result.length);
            return result;
        },

        render() {
            const container = document.getElementById('weather-content');
            if (!container || !this.data) return;

            const loc = this.currentLocation;
            const temp = this.data.T1H || this.data.TMP || '-';
            const humidity = this.data.REH || '-';
            const pty = this.data.PTY || '0';
            const wind = this.data.WSD || '-';

            const icon = this.getWeatherIcon(pty, '1');
            const condition = this.getWeatherName(pty, '1');
            const feelsLike = this.calcFeelsLike(temp, wind, humidity);

            // 시간대별 예보 HTML (48시간)
            let hourlyHtml = '';
            if (this.forecast?.hourly?.length) {
                // 날짜별로 구분하여 표시
                let lastDate = '';
                hourlyHtml = `
                    <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p class="text-xs font-medium text-slate-500 mb-3">⏰ 48시간 예보</p>
                        <div class="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                            ${this.forecast.hourly.map(h => {
                                const hour = h.time.slice(0, 2);
                                const hIcon = this.getWeatherIcon(h.PTY, h.SKY);
                                const showDate = h.date !== lastDate;
                                lastDate = h.date;
                                const dateLabel = showDate ? this.getDayName(h.date).slice(0, 2) : '';
                                return `
                                    <div class="flex-shrink-0 flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 min-w-[44px] ${showDate ? 'border-l-2 border-primary/30' : ''}">
                                        ${showDate ? `<span class="text-[9px] text-primary font-bold">${dateLabel}</span>` : ''}
                                        <span class="text-[10px] text-slate-500">${hour}시</span>
                                        <span class="material-symbols-outlined text-base text-primary">${hIcon}</span>
                                        <span class="text-xs font-bold">${h.TMP || '-'}°</span>
                                        ${h.POP && h.POP !== '0' ? `<span class="text-[9px] text-blue-500">💧${h.POP}%</span>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            // 주간 예보 HTML (단기 + 중기 합치기, 7일 고정)
            let dailyHtml = '';
            const combinedDaily = this.getCombinedDailyForecast();
            if (combinedDaily.length) {
                dailyHtml = `
                    <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p class="text-xs font-medium text-slate-500 mb-3">📅 주간 예보</p>
                        <div class="space-y-2">
                            ${combinedDaily.slice(0, 7).map(d => {
                                const dIcon = this.getMidWeatherIcon(d.sky);
                                return `
                                    <div class="flex items-center justify-between py-1">
                                        <span class="text-sm font-medium w-14">${d.dayName}</span>
                                        <span class="material-symbols-outlined text-lg text-primary">${dIcon}</span>
                                        ${d.pop > 0 ? `<span class="text-xs text-blue-500 w-10">💧${d.pop}%</span>` : '<span class="w-10"></span>'}
                                        <div class="flex items-center gap-2 text-sm">
                                            <span class="text-blue-500">${d.min !== null ? Math.round(d.min) + '°' : '-'}</span>
                                            <div class="w-16 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-red-400 opacity-50"></div>
                                            <span class="text-red-500">${d.max !== null ? Math.round(d.max) + '°' : '-'}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <span class="material-symbols-outlined text-6xl text-primary">${icon}</span>
                        <div>
                            <div class="text-4xl font-bold">${temp}°</div>
                            <div class="text-sm text-slate-500">${condition}</div>
                        </div>
                    </div>
                    <div class="text-right space-y-1">
                        ${feelsLike !== null ? `
                            <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <span class="material-symbols-outlined text-lg">thermostat</span>
                                <span>체감 ${feelsLike}°</span>
                            </div>
                        ` : ''}
                        <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span class="material-symbols-outlined text-lg">water_drop</span>
                            <span>습도 ${humidity}%</span>
                        </div>
                        <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span class="material-symbols-outlined text-lg">air</span>
                            <span>풍속 ${wind}m/s</span>
                        </div>
                    </div>
                </div>
                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-center">
                    ${loc.name} · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
                </div>
                ${hourlyHtml}
                ${dailyHtml}
            `;

        },

        showError(message) {
            const container = document.getElementById('weather-content');
            if (!container) return;
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <span class="material-symbols-outlined text-4xl mb-2 text-red-400">cloud_off</span>
                <p class="text-sm text-center">${message}</p>
            </div>`;
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
        Dictionary.init();
        Weather.init();
    });
})();
