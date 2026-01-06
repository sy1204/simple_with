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

            list.innerHTML = this.items.map(item => {
                const depth = item.depth || 0;
                const marginLeft = depth * 24; // Depth 당 24px
                const isActive = this.activeItemId === item.id;

                return `
                <div data-id="${item.id}" 
                     class="flex items-start gap-2 p-2 rounded-lg group/item transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}"
                     style="margin-left: ${marginLeft}px"
                     onclick="window.Todo.select(${item.id})">
                     
                    <!-- 드래그 핸들 (마우스 다운 시 시작) -->
                    <div class="cursor-grab text-slate-300 hover:text-slate-500 mt-1 opacity-0 group-hover/item:opacity-100"
                         onmousedown="event.stopPropagation(); window.Todo.handleDragStart(event, ${item.id})">
                        <span class="material-symbols-outlined text-lg">drag_indicator</span>
                    </div>

                    <button onclick="event.stopPropagation(); window.Todo.toggle(${item.id})" 
                            class="${item.done ? 'text-primary' : 'text-slate-300 hover:text-primary'} mt-0.5">
                        <span class="material-symbols-outlined text-xl">${item.done ? 'check_box' : 'check_box_outline_blank'}</span>
                    </button>
                    
                    <div class="flex-1 min-w-0">
                        <p class="text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'} leading-snug truncate">${item.text}</p>
                        <span class="text-[10px] text-slate-400">${item.time}</span>
                    </div>
                    
                    <button onclick="event.stopPropagation(); window.Todo.remove(${item.id})" 
                            class="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            `}).join('');
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
        units: {
            currency: { from: 'USD', to: 'KRW', options: ['USD', 'EUR', 'KRW', 'JPY', 'CNY'], rates: { USD: 1, EUR: 0.92, KRW: 1350, JPY: 157, CNY: 7.2 } },
            length: { from: 'cm', to: 'm', options: ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'], rates: { mm: 1000, cm: 100, m: 1, km: 0.001, in: 39.37, ft: 3.281, yd: 1.094, mi: 0.000621 } },
            area: { from: '㎡', to: '평', options: ['㎡', '평', 'ft²', 'ac'], rates: { '㎡': 1, '평': 0.3025, 'ft²': 10.764, 'ac': 0.000247 } },
            weight: { from: 'kg', to: 'g', options: ['mg', 'g', 'kg', 't', 'lb', 'oz'], rates: { mg: 1000000, g: 1000, kg: 1, t: 0.001, lb: 2.2046, oz: 35.274 } },
            speed: { from: 'km/h', to: 'm/s', options: ['m/s', 'km/h', 'mph', 'knot', 'mach'], rates: { 'm/s': 1, 'km/h': 3.6, mph: 2.237, knot: 1.944, mach: 0.002939 } }
        },
        init() {
            this.render();
            document.querySelectorAll('.conv-type').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.type = btn.dataset.type;
                    Storage.set('convType', this.type);
                    this.updateButtons();
                    this.render();
                });
            });
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

            container.innerHTML = `
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
        currentTab: Storage.get('dictTab', 'korean'), // 'korean', 'english', 'translate'
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
            ['korean', 'english', 'translate'].forEach(tab => {
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
            ['korean', 'english', 'translate'].forEach(tab => {
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
                korean: '국어 단어를 검색하세요...',
                english: '영어 단어를 검색하세요 (예: hello, computer)...',
                translate: '번역할 문장을 입력하세요 (한↔영 자동 감지)...'
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
                translate: { text: '출처: 네이버 파파고', url: 'https://papago.naver.com', label: '파파고 방문' }
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
                korean: '국어 단어를 검색해보세요',
                english: '영어 단어를 검색하면 뜻과 발음을 확인할 수 있습니다',
                translate: '한국어 또는 영어 문장을 입력하면 자동으로 번역됩니다'
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
                    data = await this.fetchTranslate(query);
                    this.renderTranslateResults(data, query);
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

        async fetchTranslate(query) {
            const res = await fetch(`/api/translate?text=${encodeURIComponent(query)}&source=auto&target=auto`);
            return res.json();
        },

        renderKoreanResults(data, query) {
            const container = document.getElementById('dict-results');
            if (!container) return;

            if (data.error) {
                this.showMessage(data.error.message, 'error');
                return;
            }

            const items = data.channel?.item;
            if (!items || items.length === 0) {
                container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">search_off</span>
                    <p class="text-sm">'${this.escapeHtml(query)}'에 대한 결과가 없습니다.</p>
                </div>`;
                return;
            }

            let html = `<div class="mb-3"><span class="text-xs text-slate-500">총 <strong class="text-primary">${data.channel?.total || 0}</strong>개</span></div><div class="space-y-2">`;
            items.forEach(item => {
                const word = item.word || '';
                const pos = item.pos || '';
                const def = item.sense?.definition || '';
                const link = item.sense?.link || '';
                html += `<div class="bg-white dark:bg-card-dark rounded-lg p-3 border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-colors">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1">
                            <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span class="text-base font-bold">${this.escapeHtml(word)}</span>
                                ${pos ? `<span class="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded">${this.escapeHtml(pos)}</span>` : ''}
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

            let html = `<div class="space-y-4">`;
            
            // 단어 헤더
            html += `<div class="bg-white dark:bg-card-dark rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl font-bold">${this.escapeHtml(data.word)}</span>
                        ${data.phonetic ? `<span class="text-sm text-slate-500">${this.escapeHtml(data.phonetic)}</span>` : ''}
                        ${data.audio ? `<button onclick="new Audio('${data.audio}').play()" class="p-1 text-primary hover:bg-primary/10 rounded-full"><span class="material-symbols-outlined text-lg">volume_up</span></button>` : ''}
                    </div>
                </div>
                ${data.koreanMeaning ? `<div class="text-lg text-primary font-medium">${this.escapeHtml(data.koreanMeaning)}</div>` : ''}
            </div>`;

            // 의미들
            if (data.meanings && data.meanings.length > 0) {
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

        renderTranslateResults(data, query) {
            const container = document.getElementById('dict-results');
            if (!container) return;

            if (data.error) {
                this.showMessage(data.error.message, 'error');
                return;
            }

            const langNames = { ko: '한국어', en: '영어', ja: '일본어', zh: '중국어' };
            const sourceLang = langNames[data.source] || data.source;
            const targetLang = langNames[data.target] || data.target;

            container.innerHTML = `
                <div class="space-y-4">
                    <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-medium text-slate-500">${sourceLang}</span>
                        </div>
                        <p class="text-slate-700 dark:text-slate-200">${this.escapeHtml(data.text)}</p>
                    </div>
                    <div class="flex justify-center">
                        <span class="material-symbols-outlined text-2xl text-primary">arrow_downward</span>
                    </div>
                    <div class="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border-2 border-primary/20">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-medium text-primary">${targetLang}</span>
                        </div>
                        <p class="text-lg font-medium text-slate-800 dark:text-white">${this.escapeHtml(data.translatedText)}</p>
                    </div>
                    <button onclick="navigator.clipboard.writeText('${this.escapeHtml(data.translatedText).replace(/'/g, "\\'")}'); this.textContent='복사됨!'; setTimeout(() => this.innerHTML='<span class=\\'material-symbols-outlined text-sm\\'>content_copy</span> 번역 복사', 2000);"
                        class="w-full py-2 text-sm font-medium text-slate-600 hover:text-primary bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center gap-1 transition-colors">
                        <span class="material-symbols-outlined text-sm">content_copy</span> 번역 복사
                    </button>
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
        city: Storage.get('weatherCity', '60,127'), // 서울 기본값
        cities: {
            '60,127': '서울', '97,74': '부산', '89,90': '대구',
            '55,124': '인천', '67,100': '대전', '62,123': '판교', '52,38': '제주'
        },
        data: null,

        init() {
            this.bindEvents();
            this.load();
        },

        bindEvents() {
            const select = document.getElementById('weather-city');
            if (select) {
                select.value = this.city;
                select.addEventListener('change', (e) => {
                    this.city = e.target.value;
                    Storage.set('weatherCity', this.city);
                    this.load();
                });
            }
        },

        async load() {
            const container = document.getElementById('weather-content');
            if (!container) return;

            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <span class="material-symbols-outlined text-4xl mb-2 animate-pulse">cloud_sync</span>
                <p class="text-sm">날씨 정보를 불러오는 중...</p>
            </div>`;

            try {
                const [nx, ny] = this.city.split(',');
                const res = await fetch(`/api/weather?nx=${nx}&ny=${ny}&type=ultra`);
                const data = await res.json();

                if (data.error) {
                    this.showError(data.error.message);
                    return;
                }

                this.data = this.parseWeatherData(data);
                this.render();
            } catch (error) {
                this.showError('날씨 정보를 불러올 수 없습니다: ' + error.message);
            }
        },

        parseWeatherData(data) {
            const items = data.response?.body?.items?.item || [];
            const result = {};
            items.forEach(item => {
                result[item.category] = item.obsrValue || item.fcstValue;
            });
            return result;
        },

        render() {
            const container = document.getElementById('weather-content');
            if (!container || !this.data) return;

            const temp = this.data.T1H || this.data.TMP || '-';
            const humidity = this.data.REH || '-';
            const sky = this.data.PTY || '0'; // 강수형태
            const wind = this.data.WSD || '-';

            // 날씨 아이콘 결정
            const weatherIcons = { '0': 'sunny', '1': 'rainy', '2': 'weather_mix', '3': 'weather_snowy', '4': 'rainy' };
            const weatherNames = { '0': '맑음', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };
            const icon = weatherIcons[sky] || 'cloud';
            const condition = weatherNames[sky] || '흐림';

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
                <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-center">
                    ${this.cities[this.city]} · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
                </div>`;
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

    // ===== 맛집 검색 (Place) =====
    const Place = {
        lastQuery: Storage.get('placeLastQuery', ''),
        results: [],

        init() {
            this.bindEvents();
            if (this.lastQuery) {
                document.getElementById('place-search-input').value = this.lastQuery;
            }
        },

        bindEvents() {
            const searchBtn = document.getElementById('place-search-btn');
            const searchInput = document.getElementById('place-search-input');
            const randomBtn = document.getElementById('place-random-btn');

            searchBtn?.addEventListener('click', () => this.search());
            searchInput?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.search();
            });
            randomBtn?.addEventListener('click', () => this.randomPick());

            // 카테고리 버튼
            document.querySelectorAll('.place-cat').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cat = btn.dataset.cat;
                    const input = document.getElementById('place-search-input');
                    const current = input.value.trim();
                    // 지역명이 있으면 카테고리 추가, 없으면 경고
                    if (current && !current.includes(cat)) {
                        input.value = current + ' ' + cat;
                    } else if (!current) {
                        input.value = cat;
                    }
                    this.search();
                });
            });
        },

        async search() {
            const input = document.getElementById('place-search-input');
            const query = input?.value.trim();

            if (!query) {
                this.showMessage('검색어를 입력해주세요. 예: "강남역 맛집"', 'warning');
                return;
            }

            this.lastQuery = query;
            Storage.set('placeLastQuery', query);
            this.showLoading();

            try {
                const res = await fetch(`/api/place?q=${encodeURIComponent(query)}&display=10`);
                const data = await res.json();

                if (data.error) {
                    this.showMessage(data.error.message, 'error');
                    return;
                }

                this.results = data.items || [];
                this.renderResults(data);
            } catch (error) {
                this.showMessage('검색 중 오류: ' + error.message, 'error');
            }
        },

        renderResults(data) {
            const container = document.getElementById('place-results');
            if (!container) return;

            if (!data.items || data.items.length === 0) {
                container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2">search_off</span>
                    <p class="text-sm">검색 결과가 없습니다</p>
                </div>`;
                return;
            }

            let html = `<div class="mb-3"><span class="text-xs text-slate-500">총 <strong class="text-primary">${data.total}</strong>개</span></div><div class="space-y-2">`;

            data.items.forEach(item => {
                const categoryBadge = item.category ? `<span class="px-1.5 py-0.5 text-[10px] font-medium bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded">${this.escapeHtml(item.category.split('>').pop())}</span>` : '';
                
                html += `<div class="bg-white dark:bg-card-dark rounded-lg p-3 border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-colors">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span class="text-base font-bold text-slate-800 dark:text-white">${this.escapeHtml(item.title)}</span>
                                ${categoryBadge}
                            </div>
                            <p class="text-xs text-slate-500 mb-1">${this.escapeHtml(item.roadAddress || item.address)}</p>
                            ${item.telephone ? `<p class="text-xs text-slate-400"><span class="material-symbols-outlined text-sm align-middle">call</span> ${this.escapeHtml(item.telephone)}</p>` : ''}
                        </div>
                        ${item.link ? `<a href="${item.link}" target="_blank" class="shrink-0 p-1.5 text-slate-400 hover:text-primary" title="네이버에서 보기"><span class="material-symbols-outlined text-lg">open_in_new</span></a>` : ''}
                    </div>
                </div>`;
            });

            container.innerHTML = html + '</div>';
        },

        randomPick() {
            if (this.results.length === 0) {
                this.showMessage('먼저 검색을 해주세요!', 'warning');
                return;
            }

            const container = document.getElementById('place-results');
            if (!container) return;

            // 애니메이션 효과
            let count = 0;
            const interval = setInterval(() => {
                const random = this.results[Math.floor(Math.random() * this.results.length)];
                container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                    <span class="material-symbols-outlined text-5xl mb-3 text-primary animate-bounce">casino</span>
                    <p class="text-xl font-bold text-slate-700 dark:text-white">${this.escapeHtml(random.title)}</p>
                </div>`;
                count++;
                if (count >= 10) {
                    clearInterval(interval);
                    // 최종 선택
                    const final = this.results[Math.floor(Math.random() * this.results.length)];
                    container.innerHTML = `<div class="flex flex-col items-center justify-center h-full py-6">
                        <span class="material-symbols-outlined text-5xl mb-3 text-primary">restaurant</span>
                        <p class="text-xl font-bold text-slate-800 dark:text-white mb-2">${this.escapeHtml(final.title)}</p>
                        <p class="text-sm text-slate-500 mb-1">${final.category ? this.escapeHtml(final.category.split('>').pop()) : ''}</p>
                        <p class="text-xs text-slate-400 mb-4">${this.escapeHtml(final.roadAddress || final.address)}</p>
                        ${final.link ? `<a href="${final.link}" target="_blank" class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-1"><span class="material-symbols-outlined text-sm">open_in_new</span>상세보기</a>` : ''}
                    </div>`;
                }
            }, 100);
        },

        showLoading() {
            const container = document.getElementById('place-results');
            if (!container) return;
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <div class="animate-spin mb-3"><span class="material-symbols-outlined text-4xl text-primary">progress_activity</span></div>
                <p class="text-sm">검색 중...</p>
            </div>`;
        },

        showMessage(message, type = 'info') {
            const container = document.getElementById('place-results');
            if (!container) return;
            const icons = { info: 'info', warning: 'warning', error: 'error' };
            const colors = { info: 'text-blue-500', warning: 'text-amber-500', error: 'text-red-500' };
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <span class="material-symbols-outlined text-4xl mb-2 ${colors[type]}">${icons[type]}</span>
                <p class="text-sm text-center">${message}</p>
            </div>`;
        },

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
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
        Place.init();
    });
})();
