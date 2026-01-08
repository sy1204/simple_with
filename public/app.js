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

            // 휠로 월 단위 이동 (데스크톱)
            document.getElementById('calendar-area').addEventListener('wheel', (e) => {
                e.preventDefault();
                const direction = e.deltaY > 0 ? 1 : -1;
                this.date.setMonth(this.date.getMonth() + direction);
                this.render();
            }, { passive: false });

            // 터치 스와이프로 월 이동 (모바일)
            const calendarArea = document.getElementById('calendar-area');
            let touchStartX = 0;
            let touchStartY = 0;
            let isSwiping = false;

            calendarArea.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
                isSwiping = true;
            }, { passive: true });

            calendarArea.addEventListener('touchmove', (e) => {
                if (!isSwiping) return;
                const deltaX = Math.abs(e.changedTouches[0].screenX - touchStartX);
                const deltaY = Math.abs(e.changedTouches[0].screenY - touchStartY);
                // 수평 스와이프가 수직보다 크면 스크롤 방지
                if (deltaX > deltaY && deltaX > 10) {
                    e.preventDefault();
                }
            }, { passive: false });

            calendarArea.addEventListener('touchend', (e) => {
                if (!isSwiping) return;
                isSwiping = false;

                const touchEndX = e.changedTouches[0].screenX;
                const touchEndY = e.changedTouches[0].screenY;
                const deltaX = touchStartX - touchEndX;
                const deltaY = Math.abs(touchStartY - touchEndY);

                // 수평 스와이프가 충분히 크고, 수직 이동보다 클 때만 동작
                if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
                    if (deltaX > 0) {
                        // 왼쪽 스와이프 → 다음 달
                        this.date.setMonth(this.date.getMonth() + 1);
                    } else {
                        // 오른쪽 스와이프 → 이전 달
                        this.date.setMonth(this.date.getMonth() - 1);
                    }
                    this.render();
                }
            }, { passive: true });

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
            e.preventDefault(); // 드래그 핸들에서만 텍스트 선택 방지

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
                     style="margin-left: ${marginLeft}px">

                    <!-- 체크박스 (Google Keep 스타일) -->
                    <button onclick="event.stopPropagation(); window.Todo.toggle(${item.id}); window.Todo.select(${item.id});"
                            class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                   ${item.done
                        ? 'bg-primary border-primary'
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary'}">
                        ${item.done ? '<span class="material-symbols-outlined text-white text-sm">check</span>' : ''}
                    </button>

                    <!-- 텍스트 (복사 가능) -->
                    <span class="flex-1 text-sm ${item.done
                        ? 'text-slate-400 line-through decoration-slate-400'
                        : 'text-slate-700 dark:text-slate-200'} cursor-text select-text user-select-text"
                          style="user-select: text; -webkit-user-select: text;">${item.text}</span>
                    
                    <!-- 드래그 & 삭제 (hover 시 표시) -->
                    <div class="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <div class="cursor-grab text-slate-300 hover:text-slate-500 p-0.5"
                             onmousedown="event.stopPropagation(); window.Todo.handleDragStart(event, ${item.id})"
                             onclick="event.stopPropagation(); window.Todo.select(${item.id})">
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
                { t: 'AC', cls: 'gray' }, { t: '⌫', v: 'DEL', cls: 'gray' }, { t: '(', cls: 'gray' }, { t: ')', cls: 'gray' },
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

                container.innerHTML += `<button class="${cls}" data-val="${b.v || b.t}">${b.t}</button>`;
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
        rateUnit: 'year',   // 'year' (연이율) or 'month' (월이율)
        periodUnit: 'year', // 'year' or 'month'
        stockData: null,    // 주식 데이터
        currentStockSymbol: null, // 현재 조회 중인 종목 코드

        // 주요 종목 매핑 테이블 (종목명 → 종목코드) - 200개+
        stockMapping: {
            // 시가총액 상위 + 주요 종목
            '삼성전자': '005930', '삼전': '005930',
            'SK하이닉스': '000660', 'SK하닉': '000660', 'sk하이닉스': '000660',
            'LG에너지솔루션': '373220', 'LG엔솔': '373220', 'lg에너지솔루션': '373220',
            '삼성바이오로직스': '207940', '현대차': '005380', '현차': '005380',
            '셀트리온': '068270', 'POSCO홀딩스': '005490', 'POSCO': '005490', 'posco': '005490',
            '기아': '000270', '삼성물산': '028260',
            'LG화학': '051910', 'lg화학': '051910',
            'NAVER': '035420', 'naver': '035420', '네이버': '035420',
            '현대모비스': '012330', '삼성SDI': '006400', 'sdi': '006400',
            '카카오': '035720', 'SK이노베이션': '096770', 'sk이노베이션': '096770',
            '한국전력': '015760', '한전': '015760', 'KEPCO': '015760', 'kepco': '015760',
            'KB금융': '105560', 'kb금융': '105560', '신한지주': '055550',
            '삼성생명': '032830', 'SK': '034730', 'sk': '034730', '포스코퓨처엠': '003670',
            '삼성전기': '009150', 'LG전자': '066570', 'lg전자': '066570', 'LG': '003550', 'lg': '003550',
            '크래프톤': '259960', 'krafton': '259960',
            '하이브': '352820', 'HMM': '011200', 'hmm': '011200',
            'HD현대중공업': '329180', 'hd현대중공업': '329180',
            'SK텔레콤': '017670', 'skt': '017670', 'sk텔레콤': '017670',
            'KT&G': '033780', 'kt&g': '033780', 'ktng': '033780',
            '기업은행': '024110', 'IBK': '024110', 'ibk': '024110',
            '현대글로비스': '086280', '삼성화재': '000810',
            '아모레퍼시픽': '090430', '아모레': '090430',
            'LG생활건강': '051900', 'lg생활건강': '051900',
            'SK스퀘어': '402340', 'sk스퀘어': '402340',
            '두산에너빌리티': '034020', '한화에어로스페이스': '012450',
            'CJ제일제당': '097950', 'cj제일제당': '097950', 'cj': '097950',
            '고려아연': '010130', '한국조선해양': '009540', '메리츠금융지주': '138040',
            'S-Oil': '010950', 's-oil': '010950', 'soil': '010950', '에쓰오일': '010950',
            '엔씨소프트': '036570', 'NC소프트': '036570', 'nc소프트': '036570', 'nc': '036570',
            '현대건설': '000720', '대한항공': '003490', '대항': '003490',
            'KT': '030200', 'kt': '030200', '삼성엔지니어링': '028050',
            '롯데케미칼': '011170', '한화': '000880',
            'LG유플러스': '032640', 'lg유플러스': '032640', 'lgu+': '032640', 'LGU+': '032640',
            '카카오뱅크': '323410', '펄어비스': '263750', '삼성중공업': '010140',
            '현대제철': '004020', 'SK바이오팜': '326030', '포스코인터내셔널': '047050',
            'DB손해보험': '005830', 'SK바이오사이언스': '302440', '삼성카드': '029780',
            '하나금융지주': '086790', '우리금융지주': '316140', '넷마블': '251270',
            '강원랜드': '035250', 'LG디스플레이': '034220', '코웨이': '021240',
            '한국타이어앤테크놀로지': '161390', '한국타이어': '161390', 'GS': '078930', '호텔신라': '008770',
            '삼성증권': '016360', '카카오게임즈': '293490', '셀트리온헬스케어': '091990',
            '셀트리온제약': '068760', '미래에셋증권': '006800', '현대백화점': '069960',
            'HD현대': '267250', 'SK케미칼': '285130', 'BGF리테일': '282330',
            'CJ': '001040', 'GS리테일': '007070', '한화솔루션': '009830',
            '한국가스공사': '036460', '한국항공우주': '047810',
            // 추가 주요 종목 (IT/게임/엔터)
            '에코프로': '086520', '에코프로비엠': '247540', 'POSCO홀딩스': '005490',
            '카카오페이': '377300', '두산밥캣': '241560', '천보': '278280',
            '알테오젠': '196170', '위메이드': '112040', '컴투스': '078340',
            '펄어비스': '263750', '데브시스터즈': '194480', '게임빌': '063080',
            '넥슨게임즈': '225570', '엔씨소프트': '036570', '위지윅스튜디오': '299900',
            // 엔터테인먼트
            'SM': '041510', 'sm': '041510', 'SM엔터테인먼트': '041510', '에스엠': '041510',
            'JYP': '035900', 'jyp': '035900', 'JYP엔터테인먼트': '035900',
            '와이지엔터테인먼트': '122870', 'YG엔터테인먼트': '122870', 'YG': '122870', 'yg': '122870',
            '하이브': '352820', 'HYBE': '352820', 'hybe': '352820',
            '카카오엔터테인먼트': '293490',
            // 바이오/제약
            '셀트리온': '068270', '삼성바이오로직스': '207940', '셀트리온헬스케어': '091990',
            '셀트리온제약': '068760', 'SK바이오팜': '326030', 'SK바이오사이언스': '302440',
            '신라젠': '215600', '파미셀': '005690', '유한양행': '000100',
            '녹십자': '006280', '종근당': '185750', '한미약품': '128940',
            '대웅제약': '069620', '한올바이오파마': '009420', '씨젠': '096530',
            // 금융
            'KB금융': '105560', '신한지주': '055550', '하나금융지주': '086790',
            '우리금융지주': '316140', 'JB금융지주': '175330', 'BNK금융지주': '138930',
            'DGB금융지주': '139130', '메리츠금융지주': '138040', '삼성생명': '032830',
            '삼성화재': '000810', 'DB손해보험': '005830', '삼성증권': '016360',
            '미래에셋증권': '006800', 'NH투자증권': '005940', '한국금융지주': '071050',
            // 유통/소비재
            '롯데쇼핑': '023530', 'GS리테일': '007070', 'BGF리테일': '282330',
            '이마트': '139480', '신세계': '004170', '현대백화점': '069960',
            '롯데하이마트': '071840', '하이트진로': '000080', '오리온': '271560',
            '농심': '004370', 'CJ제일제당': '097950', '삼양식품': '003230',
            '오뚜기': '007310', '동원F&B': '049770', '동원산업': '006040',
            '사조대림': '003960', 'SPC삼립': '005610', '빙그레': '005180',
            '매일유업': '267980', '남양유업': '003920', '롯데칠성': '005300',
            '롯데제과': '280360', '크라운제과': '264900', '해태제과식품': '136480',
            // 건설/부동산
            '삼성물산': '028260', '현대건설': '000720', '대림산업': '000210',
            'GS건설': '006360', '대우건설': '047040', '포스코이앤씨': '028050',
            'DL이앤씨': '375500', 'HDC현대산업개발': '294870', '롯데건설': '000490',
            // 화학/소재
            'LG화학': '051910', 'SK이노베이션': '096770', 'S-Oil': '010950',
            '롯데케미칼': '011170', '한화솔루션': '009830', '고려아연': '010130',
            '영풍': '000670', 'LG생활건강': '051900', '아모레퍼시픽': '090430',
            // 자동차/부품
            '현대차': '005380', '기아': '000270', '현대모비스': '012330',
            '현대위아': '011210', '만도': '204320', '현대트랜시스': '012330',
            // 조선/기계
            '한국조선해양': '009540', 'HD현대중공업': '329180', '삼성중공업': '010140',
            'HD현대미포': '010620', '두산밥캣': '241560', '두산에너빌리티': '034020',
            // 항공/운송
            '대한항공': '003490', 'HMM': '011200', 'CJ대한통운': '000120',
            '한진칼': '180640', '아시아나항공': '020560',
            // 반도체/전자
            '삼성전자': '005930', 'SK하이닉스': '000660', '삼성전기': '009150',
            'LG전자': '066570', 'LG이노텍': '011070', '삼성SDI': '006400',
            'DB하이텍': '000990', 'SK스퀘어': '402340',
            // 2차전지/신재생
            'LG에너지솔루션': '373220', '삼성SDI': '006400', '에코프로': '086520',
            '에코프로비엠': '247540', '포스코퓨처엠': '003670', 'SK온': '000000',
            // 통신
            'SK텔레콤': '017670', 'KT': '030200', 'LG유플러스': '032640',
            'SK브로드밴드': '033630',
            // 기타 주요 종목
            '한국전력': '015760', '한국가스공사': '036460', '한국전력공사': '015760',
            'KEPCO': '015760', '코웨이': '021240', '쿠팡': '000000', // 쿠팡은 미국 상장
            '배달의민족': '000000' // 비상장
        },

        init() {
            this.render();
            document.getElementById('finance-interest').addEventListener('click', () => { this.mode = 'interest'; this.render(); this.updateButtons(); });
            document.getElementById('finance-discount').addEventListener('click', () => { this.mode = 'discount'; this.render(); this.updateButtons(); });
            document.getElementById('finance-stock').addEventListener('click', () => { this.mode = 'stock'; this.render(); this.updateButtons(); this.loadStockIndex(); });
        },
        updateButtons() {
            document.getElementById('finance-interest').className = this.mode === 'interest' ? 'px-3 py-1 text-xs font-bold bg-white dark:bg-card-dark rounded shadow-sm' : 'px-3 py-1 text-xs font-medium text-slate-500';
            document.getElementById('finance-discount').className = this.mode === 'discount' ? 'px-3 py-1 text-xs font-bold bg-white dark:bg-card-dark rounded shadow-sm' : 'px-3 py-1 text-xs font-medium text-slate-500';
            document.getElementById('finance-stock').className = this.mode === 'stock' ? 'px-3 py-1 text-xs font-bold bg-white dark:bg-card-dark rounded shadow-sm' : 'px-3 py-1 text-xs font-medium text-slate-500';
        },
        toggleRateUnit() {
            this.rateUnit = this.rateUnit === 'year' ? 'month' : 'year';
            const btn = document.getElementById('fin-rate-toggle');
            const label = document.getElementById('fin-rate-label');
            if (btn && label) {
                btn.textContent = this.rateUnit === 'year' ? '연' : '월';
                label.textContent = this.rateUnit === 'year' ? '연이율 (%)' : '월이율 (%)';
            }
        },
        togglePeriodUnit() {
            this.periodUnit = this.periodUnit === 'year' ? 'month' : 'year';
            const btn = document.getElementById('fin-period-toggle');
            const label = document.getElementById('fin-period-label');
            if (btn && label) {
                btn.textContent = this.periodUnit === 'year' ? '년' : '월';
                label.textContent = `기간 (${this.periodUnit === 'year' ? '년' : '개월'})`;
            }
        },
        render() {
            const container = document.getElementById('finance-content');
            if (this.mode === 'interest') {
                container.innerHTML = `
                    <div class="flex-1 min-w-0 space-y-3">
                        <div class="space-y-1"><label class="text-xs font-medium text-slate-500">예치금 (원금)</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₩</span><input id="fin-principal" class="w-full pl-7 bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="10,000,000" /></div></div>
                        <div class="flex gap-2">
                            <div class="space-y-1 flex-1 max-w-[45%]">
                                <label id="fin-rate-label" class="text-xs font-medium text-slate-500">${this.rateUnit === 'year' ? '연이율' : '월이율'} (%)</label>
                                <div class="flex gap-1">
                                    <input id="fin-rate" class="flex-1 min-w-0 bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="${this.rateUnit === 'year' ? '3.5' : '0.3'}" />
                                    <button id="fin-rate-toggle" class="px-2 h-9 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors shrink-0">${this.rateUnit === 'year' ? '연' : '월'}</button>
                                </div>
                            </div>
                            <div class="space-y-1 flex-1 max-w-[45%]">
                                <label id="fin-period-label" class="text-xs font-medium text-slate-500">기간 (${this.periodUnit === 'year' ? '년' : '개월'})</label>
                                <div class="flex gap-1">
                                    <input id="fin-period" class="flex-1 min-w-0 bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="${this.periodUnit === 'year' ? '1' : '12'}" />
                                    <button id="fin-period-toggle" class="px-2 h-9 bg-primary text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors shrink-0">${this.periodUnit === 'year' ? '년' : '월'}</button>
                                </div>
                            </div>
                        </div>
                        <button id="fin-calc" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium py-2 rounded-lg text-sm hover:opacity-90">계산하기</button>
                    </div>
                    <div class="flex-1 min-w-0 bg-background-light dark:bg-[#111822] rounded-lg p-4 flex flex-col justify-center overflow-hidden">
                        <div id="fin-result-info" class="text-[10px] text-slate-400 text-right mb-2 truncate"></div>
                        <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-700"><span class="text-xs text-slate-500">이자</span><span id="fin-interest" class="text-base font-bold text-emerald-500 truncate">-</span></div>
                        <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-700"><span class="text-xs text-slate-500">최종 수령액</span><span id="fin-total" class="text-lg font-bold truncate">-</span></div>
                        <div id="fin-yearly-info" class="text-xs text-slate-400 hidden truncate"></div>
                    </div>`;
                document.getElementById('fin-calc').addEventListener('click', () => this.calcInterest());
                document.getElementById('fin-rate-toggle').addEventListener('click', () => this.toggleRateUnit());
                document.getElementById('fin-period-toggle').addEventListener('click', () => this.togglePeriodUnit());
            } else if (this.mode === 'discount') {
                container.innerHTML = `
                    <div class="flex-1 min-w-0 space-y-3">
                        <div class="space-y-1"><label class="text-xs font-medium text-slate-500">원래 가격</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₩</span><input id="fin-original" class="w-full pl-7 bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="100,000" /></div></div>
                        <div class="space-y-1"><label class="text-xs font-medium text-slate-500">할인율 (%)</label><input id="fin-discount-rate" class="w-full bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm font-semibold focus:ring-2 focus:ring-primary h-9" type="text" value="20" /></div>
                        <button id="fin-calc" class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium py-2 rounded-lg text-sm hover:opacity-90">계산하기</button>
                    </div>
                    <div class="flex-1 min-w-0 bg-background-light dark:bg-[#111822] rounded-lg p-4 flex flex-col justify-center overflow-hidden">
                        <div class="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-700 pb-2"><span class="text-xs text-slate-500">할인 금액</span><span id="fin-saved" class="text-base font-bold text-emerald-500 truncate">-</span></div>
                        <div class="flex items-center justify-between"><span class="text-xs font-medium">최종 가격</span><span id="fin-final" class="text-lg font-bold truncate">-</span></div>
                    </div>`;
                document.getElementById('fin-calc').addEventListener('click', () => this.calcDiscount());
            } else if (this.mode === 'stock') {
                container.innerHTML = `
                    <div class="flex-1 space-y-4">
                        <!-- 코스피/코스닥 지수 -->
                        <div id="stock-indexes" class="grid grid-cols-2 gap-3">
                            <div class="bg-background-light dark:bg-[#111822] rounded-lg p-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onclick="window.open('https://finance.naver.com/sise/sise_index.naver?code=KOSPI', '_blank')">
                                <p class="text-xs text-slate-400 mb-1">KOSPI</p>
                                <p id="kospi-price" class="text-lg font-bold">-</p>
                                <p id="kospi-change" class="text-xs">-</p>
                            </div>
                            <div class="bg-background-light dark:bg-[#111822] rounded-lg p-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" onclick="window.open('https://finance.naver.com/sise/sise_index.naver?code=KOSDAQ', '_blank')">
                                <p class="text-xs text-slate-400 mb-1">KOSDAQ</p>
                                <p id="kosdaq-price" class="text-lg font-bold">-</p>
                                <p id="kosdaq-change" class="text-xs">-</p>
                            </div>
                        </div>

                        <!-- 주식 검색 -->
                        <div class="space-y-2">
                            <label class="text-xs font-medium text-slate-500">종목 검색</label>
                            <div class="flex gap-2">
                                <input id="stock-search-input" class="flex-1 bg-background-light dark:bg-[#111822] rounded-lg border-none text-sm px-3 py-2 focus:ring-2 focus:ring-primary" type="text" placeholder="종목명 또는 종목코드 (예: 삼성전자, 005930)" />
                                <button id="stock-search-btn" class="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">검색</button>
                            </div>
                            <p class="text-xs text-slate-400">※ 종목명(삼성전자) 또는 6자리 코드(005930) 입력</p>

                            <!-- 검색 매칭 리스트 -->
                            <div id="stock-matches" class="hidden bg-background-light dark:bg-[#111822] rounded-lg border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
                                <p class="text-xs text-slate-500 p-3 pb-2 font-medium" id="stock-matches-title"></p>
                                <ul id="stock-matches-list" class="divide-y divide-slate-200 dark:divide-slate-700"></ul>
                            </div>
                        </div>

                        <!-- 검색 결과 -->
                        <div id="stock-result" class="hidden bg-background-light dark:bg-[#111822] rounded-lg p-4 space-y-3">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <p id="stock-name" class="font-bold text-base"></p>
                                    <p id="stock-code" class="text-xs text-slate-400"></p>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button id="stock-refresh-btn" class="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="새로고침">
                                        <span class="material-symbols-outlined text-lg text-slate-500">refresh</span>
                                    </button>
                                    <span id="stock-market" class="px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600"></span>
                                </div>
                            </div>
                            <div class="border-t border-slate-200 dark:border-slate-700 pt-3 flex gap-4">
                                <!-- 주가 정보 (클릭 가능) -->
                                <div class="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" id="stock-price-wrapper">
                                    <p id="stock-price" class="text-2xl font-bold mb-1">-</p>
                                    <p id="stock-change" class="text-sm">-</p>
                                    <p id="stock-prev" class="text-xs text-slate-400 mt-2">-</p>
                                </div>
                                <!-- 차트 -->
                                <div class="flex-1 min-w-0">
                                    <canvas id="stock-chart" class="w-full" height="100"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>`;

                // 검색 버튼 이벤트
                const searchBtn = document.getElementById('stock-search-btn');
                const searchInput = document.getElementById('stock-search-input');

                searchBtn.addEventListener('click', () => this.searchStock());
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.searchStock();
                });

                // 실시간 자동완성 (심플 버전)
                let searchTimeout;
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value.trim();

                    // 빈 입력 → 숨김
                    if (!query) {
                        this.hideStockMatches();
                        return;
                    }

                    // 6자리 숫자(종목코드)면 자동완성 안함
                    if (/^\d{6}$/.test(query)) {
                        this.hideStockMatches();
                        return;
                    }

                    // 2글자 이상만 검색
                    if (query.length < 2) {
                        this.hideStockMatches();
                        return;
                    }

                    // Debounce 300ms
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => this.fetchStockSuggestions(query), 300);
                });

                // 외부 클릭 시 자동완성 닫기
                document.addEventListener('click', (e) => {
                    const matchesDiv = document.getElementById('stock-matches');
                    if (matchesDiv && !matchesDiv.contains(e.target) && e.target !== searchInput) {
                        this.hideStockMatches();
                    }
                });
            }
        },

        // 주식 자동완성 검색
        async fetchStockSuggestions(query) {
            try {
                const response = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`);
                const result = await response.json();

                if (result.success && result.data && result.data.length > 0) {
                    this.showStockMatches(result.data);
                } else {
                    this.hideStockMatches();
                }
            } catch (error) {
                console.log('[Stock] 자동완성 오류');
            }
        },
        calcInterest() {
            const p = parseFloat(document.getElementById('fin-principal').value.replace(/,/g, ''));
            const inputRate = parseFloat(document.getElementById('fin-rate').value) / 100;
            const period = parseFloat(document.getElementById('fin-period').value);

            // 연이율로 환산 (월이율 입력 시 × 12)
            const annualRate = this.rateUnit === 'year' ? inputRate : inputRate * 12;
            // 기간을 년 단위로 환산
            const years = this.periodUnit === 'year' ? period : period / 12;

            const interest = Math.round(p * annualRate * years);
            const total = p + interest;

            document.getElementById('fin-interest').textContent = '+' + interest.toLocaleString() + '원';
            document.getElementById('fin-total').textContent = total.toLocaleString() + '원';

            // 정보 표시
            const resultInfo = document.getElementById('fin-result-info');
            const yearlyInfo = document.getElementById('fin-yearly-info');

            // 이율 & 기간 정보 조합
            let infoText = '';
            if (this.rateUnit === 'month') {
                infoText += `월 ${(inputRate * 100).toFixed(2)}% → 연 ${(annualRate * 100).toFixed(2)}%`;
            }
            if (this.periodUnit === 'month') {
                infoText += (infoText ? ' · ' : '') + `${period}개월 (${(years).toFixed(1)}년)`;
            } else {
                infoText += (infoText ? ' · ' : '') + `${period}년`;
            }
            resultInfo.textContent = infoText;

            // 1년 기준 이자 표시 (기간이 1년이 아닐 때)
            if (years !== 1) {
                const yearlyInterest = Math.round(p * annualRate);
                yearlyInfo.innerHTML = `📊 1년 기준: 이자 <span class="text-emerald-500 font-medium">+${yearlyInterest.toLocaleString()}원</span>`;
                yearlyInfo.classList.remove('hidden');
            } else {
                yearlyInfo.classList.add('hidden');
            }
        },
        calcDiscount() {
            const o = parseFloat(document.getElementById('fin-original').value.replace(/,/g, ''));
            const d = parseFloat(document.getElementById('fin-discount-rate').value) / 100;
            const saved = Math.round(o * d);
            document.getElementById('fin-saved').textContent = '-' + saved.toLocaleString();
            document.getElementById('fin-final').textContent = (o - saved).toLocaleString() + '원';
        },

        // 주식 지수 조회 (코스피/코스닥)
        async loadStockIndex() {
            try {
                const response = await fetch('/api/stock?type=index');
                const result = await response.json();

                if (result.success && result.data) {
                    // 코스피
                    if (result.data.KOSPI) {
                        const kospi = result.data.KOSPI;
                        const changeClass = kospi.change >= 0 ? 'text-red-500' : 'text-blue-500';
                        const sign = kospi.change >= 0 ? '+' : '';
                        document.getElementById('kospi-price').textContent = kospi.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        document.getElementById('kospi-change').innerHTML = `<span class="${changeClass}">${sign}${kospi.change.toFixed(2)} (${sign}${kospi.changePercent.toFixed(2)}%)</span>`;
                    }

                    // 코스닥
                    if (result.data.KOSDAQ) {
                        const kosdaq = result.data.KOSDAQ;
                        const changeClass = kosdaq.change >= 0 ? 'text-red-500' : 'text-blue-500';
                        const sign = kosdaq.change >= 0 ? '+' : '';
                        document.getElementById('kosdaq-price').textContent = kosdaq.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        document.getElementById('kosdaq-change').innerHTML = `<span class="${changeClass}">${sign}${kosdaq.change.toFixed(2)} (${sign}${kosdaq.changePercent.toFixed(2)}%)</span>`;
                    }
                }
            } catch (error) {
                console.error('Stock index error:', error);
                document.getElementById('kospi-price').textContent = '오류';
                document.getElementById('kosdaq-price').textContent = '오류';
            }
        },

        // 개별 주식 검색
        async searchStock() {
            const input = document.getElementById('stock-search-input');
            const searchTerm = input.value.trim();

            if (!searchTerm) {
                alert('종목명 또는 종목코드를 입력하세요');
                return;
            }

            this.hideStockMatches();

            // 6자리 숫자 → 바로 종목 조회
            if (/^\d{6}$/.test(searchTerm)) {
                this.loadStockDetail(searchTerm);
                return;
            }

            try {
                const response = await fetch(`/api/stock-search?q=${encodeURIComponent(searchTerm)}`);
                const result = await response.json();

                if (!result.success || !result.data || result.data.length === 0) {
                    const confirmGo = confirm(`"${searchTerm}" 종목을 찾을 수 없습니다.\n\n네이버 금융에서 검색하시겠습니까?`);
                    if (confirmGo) {
                        window.open(`https://finance.naver.com/search/search.naver?query=${encodeURIComponent(searchTerm)}`, '_blank');
                    }
                    return;
                }

                const matches = result.data;

                if (matches.length === 1) {
                    // 1개 → 바로 조회
                    this.loadStockDetail(matches[0].code);
                    input.value = matches[0].name;
                } else {
                    // 여러 개 → 리스트 표시
                    this.showStockMatches(matches);
                }
            } catch (error) {
                console.error('[Stock] 검색 오류:', error);
                alert('검색 중 오류가 발생했습니다');
            }
        },

        // 종목 상세 정보 조회
        async loadStockDetail(code) {
            const resultDiv = document.getElementById('stock-result');

            try {
                const response = await fetch(`/api/stock?code=${encodeURIComponent(code)}`);
                const result = await response.json();

                if (!result.success || !result.data) {
                    alert(result.error || '종목을 찾을 수 없습니다');
                    resultDiv.classList.add('hidden');
                    return;
                }

                const stock = result.data;
                const changeClass = stock.change >= 0 ? 'text-red-500' : 'text-blue-500';
                const sign = stock.change >= 0 ? '▲' : '▼';

                // 현재 종목 코드 저장 (새로고침용)
                this.currentStockSymbol = stock.code;

                // 화면에 표시
                document.getElementById('stock-name').textContent = stock.name;
                document.getElementById('stock-code').textContent = stock.code;
                document.getElementById('stock-market').textContent = stock.market;
                document.getElementById('stock-price').textContent = stock.price.toLocaleString() + '원';
                document.getElementById('stock-change').innerHTML = `<span class="${changeClass}">${sign} ${Math.abs(stock.change).toLocaleString()}원 (${sign}${Math.abs(stock.changePercent).toFixed(2)}%)</span>`;
                document.getElementById('stock-prev').textContent = `전일 종가: ${(stock.previousClose || 0).toLocaleString()}원`;

                // 주가 클릭 시 네이버 증권으로 이동
                const priceWrapper = document.getElementById('stock-price-wrapper');
                if (priceWrapper) {
                    priceWrapper.onclick = () => {
                        window.open(`https://finance.naver.com/item/main.naver?code=${stock.code}`, '_blank');
                    };
                }

                // 차트 그리기
                if (stock.chart && stock.chart.length > 0) {
                    this.drawStockChart(stock.chart, stock.previousClose);
                }

                resultDiv.classList.remove('hidden');

                // 새로고침 버튼 이벤트 (한 번만 등록)
                const refreshBtn = document.getElementById('stock-refresh-btn');
                if (refreshBtn && !refreshBtn.hasAttribute('data-listener')) {
                    refreshBtn.setAttribute('data-listener', 'true');
                    refreshBtn.addEventListener('click', () => {
                        if (this.currentStockSymbol) {
                            const icon = refreshBtn.querySelector('.material-symbols-outlined');
                            icon.style.animation = 'spin 0.5s linear';
                            setTimeout(() => { icon.style.animation = ''; }, 500);
                            this.loadStockDetail(this.currentStockSymbol);
                        }
                    });
                }
            } catch (error) {
                console.error('[Stock] 조회 오류:', error);
                alert('주식 정보를 불러올 수 없습니다');
                resultDiv.classList.add('hidden');
            }
        },
        drawStockChart(chartData, previousClose) {
            const canvas = document.getElementById('stock-chart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.width = canvas.offsetWidth;
            const height = canvas.height;

            // 캔버스 초기화
            ctx.clearRect(0, 0, width, height);

            if (!chartData || chartData.length === 0) return;

            // 가격 데이터 추출
            const prices = chartData.map(d => d.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceRange = maxPrice - minPrice;

            // 여백 설정 (하단에 시간 레이블 공간 추가)
            const padding = { top: 10, right: 10, bottom: 20, left: 10 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            // 다크모드 감지
            const isDark = document.documentElement.classList.contains('dark');
            const lineColor = isDark ? '#60a5fa' : '#3b82f6';
            const gridColor = isDark ? '#334155' : '#e2e8f0';
            const textColor = isDark ? '#94a3b8' : '#64748b';

            // 그리드 라인 (수평선 3개)
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            for (let i = 0; i <= 2; i++) {
                const y = padding.top + (chartHeight / 2) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();
            }

            // 전일 종가 기준선 (있는 경우)
            if (previousClose && priceRange > 0) {
                const baseY = padding.top + chartHeight - ((previousClose - minPrice) / priceRange) * chartHeight;
                ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(padding.left, baseY);
                ctx.lineTo(width - padding.right, baseY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // 가격 라인 그리기
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 2;
            ctx.beginPath();

            chartData.forEach((point, index) => {
                const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
                const y = padding.top + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // 최고/최저 가격 표시
            ctx.fillStyle = textColor;
            ctx.font = '9px sans-serif';
            ctx.fillText(maxPrice.toLocaleString(), padding.left + 2, padding.top + 10);
            ctx.fillText(minPrice.toLocaleString(), padding.left + 2, height - padding.bottom - 2);

            // x축 시간 레이블 (30분 간격)
            if (chartData.length > 0) {
                ctx.fillStyle = textColor;
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';

                // 30분 = 1800초 = 1800000ms
                const thirtyMinutes = 30 * 60 * 1000;

                // 시작/종료 시간
                const startTime = chartData[0].time * 1000; // Unix timestamp to ms
                const endTime = chartData[chartData.length - 1].time * 1000;

                // 첫 30분 단위 시점 찾기
                const firstLabel = Math.ceil(startTime / thirtyMinutes) * thirtyMinutes;

                // 30분 간격으로 레이블 추가
                for (let t = firstLabel; t <= endTime; t += thirtyMinutes) {
                    // 해당 시간에 가장 가까운 데이터 포인트 찾기
                    const index = chartData.findIndex((d, i) => {
                        const currentTime = d.time * 1000;
                        const nextTime = chartData[i + 1] ? chartData[i + 1].time * 1000 : Infinity;
                        return currentTime <= t && t < nextTime;
                    });

                    if (index !== -1) {
                        const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
                        const timeStr = new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

                        // 시간 레이블
                        ctx.fillText(timeStr, x, height - 5);

                        // 수직 눈금선 (옅게)
                        ctx.strokeStyle = isDark ? '#1e293b' : '#f1f5f9';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x, padding.top);
                        ctx.lineTo(x, height - padding.bottom);
                        ctx.stroke();
                    }
                }

                ctx.textAlign = 'left'; // 원래대로 복원
            }
        },

        // 주식 검색 결과 표시
        showStockMatches(matches) {
            const matchesDiv = document.getElementById('stock-matches');
            const matchesList = document.getElementById('stock-matches-list');

            if (!matchesDiv || !matchesList) return;

            matchesList.innerHTML = '';

            matches.slice(0, 15).forEach(stock => {
                const li = document.createElement('li');
                li.className = 'px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors';
                li.innerHTML = `
                    <div class="flex justify-between items-center gap-3">
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium">${stock.name}</div>
                            <div class="text-xs text-slate-500">${stock.market}</div>
                        </div>
                        <span class="text-xs text-slate-500 font-mono">${stock.code}</span>
                    </div>
                `;
                li.addEventListener('click', () => {
                    this.hideStockMatches();
                    document.getElementById('stock-search-input').value = stock.name;
                    this.loadStockDetail(stock.code);
                });
                matchesList.appendChild(li);
            });

            matchesDiv.classList.remove('hidden');
        },

        // 매칭 리스트 숨기기
        hideStockMatches() {
            const matchesDiv = document.getElementById('stock-matches');
            if (matchesDiv) {
                matchesDiv.classList.add('hidden');
            }
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
                infoEl.innerHTML = `환율 기준: ${this.exchangeDate}`;
                infoEl.classList.remove('hidden');
            }
        },

        async refreshExchangeRates() {
            const refreshBtn = document.getElementById('exchange-refresh');
            if (refreshBtn) {
                refreshBtn.classList.add('animate-spin');
            }
            await this.loadExchangeRates();
            if (refreshBtn) {
                refreshBtn.classList.remove('animate-spin');
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
                ${isCurrency ? `<div id="exchange-info" class="flex items-center justify-end gap-2 text-[10px] text-slate-400 mb-2 ${this.exchangeDate ? '' : 'hidden'}">
                    <span>환율 기준: ${this.exchangeDate || ''}</span>
                    <button id="exchange-refresh" class="p-0.5 hover:text-primary transition-colors" title="환율 새로고침">
                        <span class="material-symbols-outlined text-sm">refresh</span>
                    </button>
                </div>` : ''}
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

            // 환율 새로고침 버튼
            const refreshBtn = document.getElementById('exchange-refresh');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refreshExchangeRates());
            }

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
            const editor = document.getElementById('memo-text');

            // 기존 텍스트 메모 마이그레이션
            const oldMemo = Storage.get('memo', '');
            let savedContent = Storage.get('memoHtml', '');
            if (!savedContent && oldMemo) {
                savedContent = oldMemo.replace(/\n/g, '<br>');
                Storage.set('memoHtml', savedContent);
            }

            editor.innerHTML = savedContent;
            this.updatePlaceholder(editor);

            // 저장
            editor.addEventListener('input', () => {
                Storage.set('memoHtml', editor.innerHTML);
                this.updatePlaceholder(editor);
            });

            // 키보드 단축키
            editor.addEventListener('keydown', (e) => {
                // Tab = 4칸 띄어쓰기
                if (e.key === 'Tab') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Shift+Tab: 들여쓰기 제거 (TODO: 구현 가능)
                    } else {
                        document.execCommand('insertText', false, '    ');
                    }
                    Storage.set('memoHtml', editor.innerHTML);
                }

                // Ctrl+B = 굵게
                if (e.ctrlKey && !e.shiftKey && e.key === 'b') {
                    e.preventDefault();
                    this.toggleBold();
                }

                // Alt+Shift+5 = 취소선 (Google Docs 표준)
                if (e.altKey && e.shiftKey && e.key === '5') {
                    e.preventDefault();
                    this.toggleStrikethrough();
                }

                // Ctrl+Shift+. = 글씨 크게
                if (e.ctrlKey && e.shiftKey && e.key === '.') {
                    e.preventDefault();
                    this.changeFontSize(1);
                }

                // Ctrl+Shift+, = 글씨 작게
                if (e.ctrlKey && e.shiftKey && e.key === ',') {
                    e.preventDefault();
                    this.changeFontSize(-1);
                }
            });

            // 버튼 이벤트
            document.getElementById('memo-bold')?.addEventListener('click', () => {
                this.toggleBold();
                editor.focus();
            });

            document.getElementById('memo-strike')?.addEventListener('click', () => {
                this.toggleStrikethrough();
                editor.focus();
            });

            document.getElementById('memo-size-up')?.addEventListener('click', () => {
                this.changeFontSize(1);
                editor.focus();
            });

            document.getElementById('memo-size-down')?.addEventListener('click', () => {
                this.changeFontSize(-1);
                editor.focus();
            });
        },

        updatePlaceholder(editor) {
            if (!editor.textContent.trim() && !editor.querySelector('img')) {
                editor.classList.add('empty');
            } else {
                editor.classList.remove('empty');
            }
        },

        toggleBold() {
            document.execCommand('bold', false, null);
            Storage.set('memoHtml', document.getElementById('memo-text').innerHTML);
        },

        toggleStrikethrough() {
            document.execCommand('strikeThrough', false, null);
            Storage.set('memoHtml', document.getElementById('memo-text').innerHTML);
        },

        changeFontSize(delta) {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            if (range.collapsed) return;

            // 선택된 텍스트를 span으로 감싸기
            const span = document.createElement('span');
            try {
                range.surroundContents(span);
            } catch (e) {
                // 복잡한 선택의 경우 execCommand 사용
                const currentSize = parseInt(window.getComputedStyle(range.startContainer.parentElement).fontSize);
                const newSize = Math.max(10, Math.min(32, currentSize + delta * 2));
                document.execCommand('fontSize', false, '7');
                const fontElements = document.getElementById('memo-text').querySelectorAll('font[size="7"]');
                fontElements.forEach(el => {
                    el.removeAttribute('size');
                    el.style.fontSize = newSize + 'px';
                });
                Storage.set('memoHtml', document.getElementById('memo-text').innerHTML);
                return;
            }

            const currentSize = parseInt(window.getComputedStyle(span).fontSize);
            const newSize = Math.max(10, Math.min(32, currentSize + delta * 2));
            span.style.fontSize = newSize + 'px';

            Storage.set('memoHtml', document.getElementById('memo-text').innerHTML);
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
        airQuality: null,  // 미세먼지 데이터
        livingIndex: null, // 생활기상지수 데이터
        sunRiseSet: null,  // 일출/일몰 데이터

        // 시도명/지역코드 매핑 (미세먼지, 생활기상지수, 일출일몰용)
        areaMapping: {
            '서울': { sidoName: '서울', areaNo: '1100000000', location: '서울' },
            '부산': { sidoName: '부산', areaNo: '2600000000', location: '부산' },
            '대구': { sidoName: '대구', areaNo: '2700000000', location: '대구' },
            '인천': { sidoName: '인천', areaNo: '2800000000', location: '인천' },
            '광주': { sidoName: '광주', areaNo: '2900000000', location: '광주' },
            '대전': { sidoName: '대전', areaNo: '3000000000', location: '대전' },
            '울산': { sidoName: '울산', areaNo: '3100000000', location: '울산' },
            '세종': { sidoName: '세종', areaNo: '3600000000', location: '세종' },
            '경기': { sidoName: '경기', areaNo: '4100000000', location: '수원' },
            '강원': { sidoName: '강원', areaNo: '4200000000', location: '춘천' },
            '충북': { sidoName: '충북', areaNo: '4300000000', location: '청주' },
            '충남': { sidoName: '충남', areaNo: '4400000000', location: '대전' },
            '전북': { sidoName: '전북', areaNo: '4500000000', location: '전주' },
            '전남': { sidoName: '전남', areaNo: '4600000000', location: '광주' },
            '경북': { sidoName: '경북', areaNo: '4700000000', location: '대구' },
            '경남': { sidoName: '경남', areaNo: '4800000000', location: '부산' },
            '제주': { sidoName: '제주', areaNo: '5000000000', location: '제주' },
        },

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

            // 천문정보 링크 버튼
            document.getElementById('weather-astro-link')?.addEventListener('click', () => {
                const loc = this.currentLocation;
                const cityName = loc.name.split(' ')[0]; // "서울 강남구" → "서울"
                const gaismaUrls = {
                    '서울': 'https://www.gaisma.com/en/location/soul.html',
                    '부산': 'https://www.gaisma.com/en/location/busan.html',
                    '대구': 'https://www.gaisma.com/en/location/daegu.html',
                    '인천': 'https://www.gaisma.com/en/location/incheon.html',
                    '대전': 'https://www.gaisma.com/en/location/daejeon.html',
                    '광주': 'https://www.gaisma.com/en/location/gwangju.html',
                    '울산': 'https://www.gaisma.com/en/location/ulsan.html',
                    '제주': 'https://www.gaisma.com/en/location/jeju.html',
                };
                const url = gaismaUrls[cityName] || gaismaUrls['서울'];
                window.open(url, '_blank', 'noopener,noreferrer');
            });

            // 새로고침 버튼
            document.getElementById('weather-refresh-btn')?.addEventListener('click', () => {
                const btn = document.getElementById('weather-refresh-btn');
                btn.querySelector('span').classList.add('animate-spin');
                this.load().finally(() => {
                    setTimeout(() => btn.querySelector('span').classList.remove('animate-spin'), 500);
                });
            });

            // 출처 정보 버튼
            document.getElementById('weather-source-info')?.addEventListener('click', () => {
                document.getElementById('weather-source-popup')?.classList.remove('hidden');
            });
            document.getElementById('weather-source-close')?.addEventListener('click', () => {
                document.getElementById('weather-source-popup')?.classList.add('hidden');
            });
            document.getElementById('weather-source-popup')?.addEventListener('click', (e) => {
                if (e.target.id === 'weather-source-popup') {
                    document.getElementById('weather-source-popup')?.classList.add('hidden');
                }
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
                <button class="weather-fav-btn px-3 py-1 text-xs font-medium rounded-full transition-colors ${idx === this.currentIdx
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
            const areaInfo = this.getAreaInfo(loc.name);

            // 오늘 날짜 (YYYYMMDD 형식)
            const now = new Date();
            const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
            const today = kst.toISOString().slice(0, 10).replace(/-/g, '');
            const currentHour = String(kst.getUTCHours()).padStart(2, '0');

            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <span class="material-symbols-outlined text-4xl mb-2 animate-pulse">cloud_sync</span>
                <p class="text-sm">날씨 정보를 불러오는 중...</p>
            </div>`;

            try {
                // 기본 날씨 + 미세먼지 동시 요청
                const [currentRes, forecastRes, midRes, airRes] = await Promise.all([
                    fetch(`/api/weather?nx=${loc.nx}&ny=${loc.ny}&type=ultra`),
                    fetch(`/api/weather?nx=${loc.nx}&ny=${loc.ny}&type=short`),
                    fetch(`/api/midforecast?regId=${regionCode.regId}&stnId=${regionCode.stnId}`),
                    fetch(`/api/airquality?sidoName=${encodeURIComponent(areaInfo.sidoName)}`)
                ]);

                const currentData = await currentRes.json();
                const forecastData = await forecastRes.json();
                const midData = await midRes.json();
                const airData = await airRes.json();

                if (currentData.error) {
                    this.showError(currentData.error.message);
                    return;
                }

                this.data = this.parseCurrentWeather(currentData);
                this.forecast = forecastData.error ? { hourly: [], daily: [] } : this.parseForecast(forecastData);

                // 현재 데이터를 과거 기록에 저장 (예보 데이터도 함께 전달)
                this.saveToHistory(this.data, loc.name, this.forecast);

                // 중기예보 파싱
                if (midData.error) {
                    console.error('[Weather] Mid forecast error:', midData.error.message);
                    this.midForecast = [];
                } else {
                    this.midForecast = this.parseMidForecast(midData);
                }

                // 미세먼지 파싱
                this.airQuality = this.parseAirQuality(airData);

                // 일출/일몰 계산 (서울 기준, 대한민국 평균)
                this.sunRiseSet = this.calcSunRiseSet();

                // 생활기상지수 로드 (자외선)
                await this.loadLivingIndex(areaInfo.areaNo, today + currentHour);

                console.log('[Weather] All data loaded:', {
                    shortDays: this.forecast.daily?.length || 0,
                    midDays: this.midForecast?.length || 0,
                    airQuality: this.airQuality ? 'OK' : 'N/A',
                    sunRiseSet: this.sunRiseSet ? 'OK' : 'N/A',
                    livingIndex: this.livingIndex ? 'OK' : 'N/A'
                });

                this.render();
            } catch (error) {
                console.error('[Weather] Load error:', error);
                this.showError('날씨 정보를 불러올 수 없습니다: ' + error.message);
            }
        },

        // 일출/일몰 시간 계산 (현재 위치 기준)
        calcSunRiseSet() {
            const loc = this.currentLocation;
            // 지역별 대략적인 위도/경도 (서울 기본값)
            let lat = 37.5, lon = 126.97;

            // 주요 도시별 좌표 매핑
            const cityName = loc.name.split(' ')[0];
            const coords = {
                '서울': [37.57, 126.98],
                '부산': [35.18, 129.08],
                '대구': [35.87, 128.60],
                '인천': [37.46, 126.71],
                '광주': [35.16, 126.85],
                '대전': [36.35, 127.38],
                '울산': [35.54, 129.31],
                '제주': [33.49, 126.53],
                '세종': [36.48, 127.29],
                '경기': [37.41, 127.52],
                '강원': [37.88, 127.73],
                '충북': [36.64, 127.49],
                '충남': [36.66, 126.67],
                '전북': [35.82, 127.11],
                '전남': [34.81, 126.46],
                '경북': [36.49, 128.89],
                '경남': [35.18, 128.25]
            };

            if (coords[cityName]) {
                [lat, lon] = coords[cityName];
            }

            return this.calculateSunriseSunset(lat, lon);
        },

        // 생활기상지수 로드 (자외선 지수)
        async loadLivingIndex(areaNo, time) {
            const indices = {};

            // time 형식: YYYYMMDDHH → 06시 또는 18시로 맞춤
            const baseTime = time.slice(0, 8) + '06';
            console.log('[Weather] Living index request - areaNo:', areaNo, 'time:', baseTime);

            try {
                // 자외선 지수 (연중)
                const uvRes = await fetch(`/api/livingindex?type=UV&areaNo=${areaNo}&time=${baseTime}`);
                const uvData = await uvRes.json();
                console.log('[Weather] UV response:', JSON.stringify(uvData).substring(0, 500));

                if (!uvData.error && uvData.response?.body?.items?.item) {
                    const items = uvData.response.body.items.item;
                    const item = Array.isArray(items) ? items[0] : items;
                    if (item) {
                        // h0, h3, h6 등 시간대별 값 중 현재와 가까운 값 사용
                        indices.UV = item.h0 || item.h3 || item.h6 || item.h9 || item.h12;
                    }
                }
            } catch (error) {
                console.error('[Weather] Living index error:', error);
            }

            console.log('[Weather] Living indices loaded:', indices);
            this.livingIndex = Object.keys(indices).length > 0 ? indices : null;
        },

        // 자외선 지수 텍스트 및 색상
        getUVInfo(value) {
            const v = parseInt(value);
            if (v <= 2) return { text: '낮음', class: 'text-green-600' };
            if (v <= 5) return { text: '보통', class: 'text-yellow-600' };
            if (v <= 7) return { text: '높음', class: 'text-orange-500' };
            if (v <= 10) return { text: '매우높음', class: 'text-red-500' };
            return { text: '위험', class: 'text-purple-600' };
        },

        // 일출/일몰 계산 (Sunrise Equation)
        calculateSunriseSunset(lat = 37.5, lon = 126.97) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();

            // 율리우스일 계산
            const a = Math.floor((14 - month) / 12);
            const y = year + 4800 - a;
            const m = month + 12 * a - 3;
            const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
            const n = jdn - 2451545 + 0.0008;

            // 평균 태양 경도
            const J = n - lon / 360;
            const M = (357.5291 + 0.98560028 * J) % 360;
            const Mrad = M * Math.PI / 180;
            const C = 1.9148 * Math.sin(Mrad) + 0.0200 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);
            const lambda = (M + C + 180 + 102.9372) % 360;

            // 적위 계산
            const lambdaRad = lambda * Math.PI / 180;
            const sinDec = Math.sin(lambdaRad) * Math.sin(23.44 * Math.PI / 180);
            const cosDec = Math.cos(Math.asin(sinDec));

            // 시간각 계산 (지평선 아래 -0.833도)
            const latRad = lat * Math.PI / 180;
            const cosH = (Math.sin(-0.833 * Math.PI / 180) - Math.sin(latRad) * sinDec) / (Math.cos(latRad) * cosDec);

            if (cosH > 1 || cosH < -1) {
                // 극지방 (백야 또는 극야)
                return null;
            }

            const H = Math.acos(cosH) * 180 / Math.PI;

            // 일출/일몰 시각 계산 (UTC)
            const Jtransit = 2451545 + J + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);
            const Jrise = Jtransit - H / 360;
            const Jset = Jtransit + H / 360;

            // 현지시로 변환 (한국 UTC+9)
            const toLocalTime = (jd) => {
                const hour = ((jd + 0.5 - Math.floor(jd + 0.5)) * 24 + 9) % 24;
                const h = Math.floor(hour);
                const m = Math.floor((hour - h) * 60);
                return String(h).padStart(2, '0') + String(m).padStart(2, '0');
            };

            return {
                sunrise: toLocalTime(Jrise),
                sunset: toLocalTime(Jset)
            };
        },

        // 과거 데이터를 sessionStorage에 저장 (24시간 유지)
        saveToHistory(data, location) {
            const now = new Date();
            const key = 'weatherHistory_' + location.replace(/\s/g, '_');
            const history = JSON.parse(sessionStorage.getItem(key) || '[]');

            // 현재 시간 (시 단위로 반올림)
            const hour = now.getHours();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const timeKey = `${dateStr}${String(hour).padStart(2, '0')}`;

            // 이미 같은 시간 데이터가 있으면 업데이트
            const existingIdx = history.findIndex(h => h.timeKey === timeKey);
            const record = {
                timeKey,
                date: dateStr,
                hour,
                temp: data.T1H || data.TMP,
                humidity: data.REH,
                pty: data.PTY,
                timestamp: now.getTime()
            };

            if (existingIdx >= 0) {
                history[existingIdx] = record;
            } else {
                history.push(record);
            }

            // 24시간 이전 데이터 삭제
            const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
            const filtered = history.filter(h => h.timestamp > cutoff);

            // 시간순 정렬
            filtered.sort((a, b) => a.timeKey.localeCompare(b.timeKey));

            sessionStorage.setItem(key, JSON.stringify(filtered));
            console.log('[Weather] History saved:', filtered.length, 'records');
        },

        // 과거 데이터 가져오기
        getHistory(location) {
            const key = 'weatherHistory_' + location.replace(/\s/g, '_');
            return JSON.parse(sessionStorage.getItem(key) || '[]');
        },

        // 미세먼지 데이터 파싱
        parseAirQuality(data) {
            console.log('[Weather] AirQuality raw data:', JSON.stringify(data).substring(0, 500));
            const items = data.response?.body?.items;
            if (!items || items.length === 0) {
                console.log('[Weather] AirQuality: No items found');
                return null;
            }

            const item = items[0];
            console.log('[Weather] AirQuality item:', item);
            return {
                pm10: item.pm10Value,
                pm25: item.pm25Value,
                pm10Grade: item.pm10Grade,
                pm25Grade: item.pm25Grade,
                khaiValue: item.khaiValue,
                khaiGrade: item.khaiGrade,
                stationName: item.stationName,
                dataTime: item.dataTime
            };
        },


        // 미세먼지 등급 텍스트
        getAirGradeText(grade) {
            const grades = { '1': '좋음', '2': '보통', '3': '나쁨', '4': '매우나쁨' };
            return grades[grade] || '-';
        },

        // 미세먼지 등급 색상 클래스
        getAirGradeClass(grade) {
            const classes = {
                '1': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                '2': 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                '3': 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
                '4': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            };
            return classes[grade] || 'bg-slate-100 text-slate-500';
        },

        // 풍향 (VEC: 0~360도) → 방향 텍스트 및 화살표
        getWindDirection(vec) {
            if (vec === null || vec === undefined || vec === '-') return { text: '-', arrow: '→' };
            const v = parseFloat(vec);
            const directions = [
                { min: 0, max: 22.5, text: '북', arrow: '↓' },
                { min: 22.5, max: 67.5, text: '북동', arrow: '↙' },
                { min: 67.5, max: 112.5, text: '동', arrow: '←' },
                { min: 112.5, max: 157.5, text: '남동', arrow: '↖' },
                { min: 157.5, max: 202.5, text: '남', arrow: '↑' },
                { min: 202.5, max: 247.5, text: '남서', arrow: '↗' },
                { min: 247.5, max: 292.5, text: '서', arrow: '→' },
                { min: 292.5, max: 337.5, text: '북서', arrow: '↘' },
                { min: 337.5, max: 360, text: '북', arrow: '↓' }
            ];
            for (const d of directions) {
                if (v >= d.min && v < d.max) return d;
            }
            return { text: '북', arrow: '↓' };
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

        // 지역명에서 미세먼지/생활지수/일출일몰용 지역 정보 찾기
        getAreaInfo(name) {
            for (const [key, value] of Object.entries(this.areaMapping)) {
                if (name.includes(key)) {
                    return value;
                }
            }
            // 기본값: 서울
            return { sidoName: '서울', areaNo: '1100000000', location: '서울' };
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
            const vec = this.data.VEC || this.data.UUU || '-'; // 풍향
            const windDir = this.getWindDirection(vec);

            const icon = this.getWeatherIcon(pty, '1');
            const condition = this.getWeatherName(pty, '1');
            const feelsLike = this.calcFeelsLike(temp, wind, humidity);

            console.log('[Weather] Render data:', {
                airQuality: this.airQuality,
                sunRiseSet: this.sunRiseSet,
                livingIndex: this.livingIndex
            });

            // 시간대별 예보 HTML (과거 + 미래)
            let hourlyHtml = '';
            const history = this.getHistory(loc.name);
            const hasHistory = history.length > 0;
            const hasForecast = this.forecast?.hourly?.length > 0;

            if (hasHistory || hasForecast) {
                let lastDate = '';

                // 과거 데이터 HTML
                const historyHtml = history.map(h => {
                    const showDate = h.date !== lastDate;
                    lastDate = h.date;
                    const dateLabel = showDate ? this.getDayName(h.date).slice(0, 2) : '';
                    const hIcon = this.getWeatherIcon(h.pty || '0', '1');
                    return `
                        <div class="flex-shrink-0 flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 min-w-[44px] opacity-70 ${showDate ? 'border-l-2 border-amber-400/50' : ''}">
                            ${showDate ? `<span class="text-[9px] text-amber-600 font-bold">${dateLabel}</span>` : ''}
                            <span class="text-[10px] text-amber-600">${h.hour}시</span>
                            <span class="material-symbols-outlined text-base text-amber-500">${hIcon}</span>
                            <span class="text-xs font-bold text-amber-700 dark:text-amber-400">${h.temp || '-'}°</span>
                        </div>
                    `;
                }).join('');

                // 미래 예보 HTML
                const forecastHtml = (this.forecast?.hourly || []).map(h => {
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
                }).join('');

                hourlyHtml = `
                    <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <p class="text-xs font-medium text-slate-500 mb-3">⏰ 시간대별 ${hasHistory ? '<span class="text-amber-500">(과거)</span> + ' : ''}예보</p>
                        <div class="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                            ${historyHtml}
                            ${hasHistory && hasForecast ? '<div class="flex-shrink-0 w-0.5 bg-primary/50 mx-1 self-stretch rounded"></div>' : ''}
                            ${forecastHtml}
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

            // 미세먼지 정보 HTML (info 아이콘 + 팝업)
            let airHtml = '';
            if (this.airQuality) {
                const pm10 = this.airQuality.pm10 || '-';
                const pm25 = this.airQuality.pm25 || '-';
                const pm10Class = this.getAirGradeClass(this.airQuality.pm10Grade);
                const pm25Class = this.getAirGradeClass(this.airQuality.pm25Grade);
                const pm10Text = this.getAirGradeText(this.airQuality.pm10Grade);
                const pm25Text = this.getAirGradeText(this.airQuality.pm25Grade);

                airHtml = `
                    <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div class="flex items-center justify-center gap-1 mb-2">
                            <span class="text-xs text-slate-400">대기질</span>
                            <button id="air-info-btn" class="text-slate-400 hover:text-primary transition-colors" title="기준 보기">
                                <span class="material-symbols-outlined text-sm">info</span>
                            </button>
                        </div>
                        <div class="flex items-center justify-around">
                            <div class="text-center">
                                <p class="text-[10px] text-slate-400 mb-1">미세먼지</p>
                                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold ${pm10Class}">${pm10Text}</span>
                                <p class="text-[10px] text-slate-500 mt-1">${pm10}㎍/㎥</p>
                            </div>
                            <div class="text-center">
                                <p class="text-[10px] text-slate-400 mb-1">초미세먼지</p>
                                <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold ${pm25Class}">${pm25Text}</span>
                                <p class="text-[10px] text-slate-500 mt-1">${pm25}㎍/㎥</p>
                            </div>
                        </div>
                        <!-- 기준 설명 팝업 (숨김) -->
                        <div id="air-info-popup" class="hidden mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-slate-600 dark:text-slate-300">대기질 기준 (㎍/㎥)</span>
                                <button id="air-info-close" class="text-slate-400 hover:text-slate-600">
                                    <span class="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                            <table class="w-full text-center">
                                <thead>
                                    <tr class="text-slate-400">
                                        <th class="py-1">등급</th>
                                        <th class="py-1">미세먼지</th>
                                        <th class="py-1">초미세먼지</th>
                                    </tr>
                                </thead>
                                <tbody class="text-slate-600 dark:text-slate-300">
                                    <tr><td class="py-1"><span class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600">좋음</span></td><td>0~30</td><td>0~15</td></tr>
                                    <tr><td class="py-1"><span class="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600">보통</span></td><td>31~80</td><td>16~35</td></tr>
                                    <tr><td class="py-1"><span class="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600">나쁨</span></td><td>81~150</td><td>36~75</td></tr>
                                    <tr><td class="py-1"><span class="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600">매우나쁨</span></td><td>151~</td><td>76~</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // 일출/일몰 + 자외선 HTML
            let lifeHtml = '';
            const lifeItems = [];

            // 자외선 지수
            if (this.livingIndex?.UV) {
                const uvInfo = this.getUVInfo(this.livingIndex.UV);
                lifeItems.push(`<span class="text-xs ${uvInfo.class} font-medium">☀️ 자외선 ${uvInfo.text}</span>`);
            }

            // 일출/일몰 + 낮 길이
            if (this.sunRiseSet?.sunrise && this.sunRiseSet?.sunset) {
                const sunrise = this.sunRiseSet.sunrise.slice(0, 2) + ':' + this.sunRiseSet.sunrise.slice(2, 4);
                const sunset = this.sunRiseSet.sunset.slice(0, 2) + ':' + this.sunRiseSet.sunset.slice(2, 4);

                // 낮 길이 계산
                const sunriseMin = parseInt(this.sunRiseSet.sunrise.slice(0, 2)) * 60 + parseInt(this.sunRiseSet.sunrise.slice(2, 4));
                const sunsetMin = parseInt(this.sunRiseSet.sunset.slice(0, 2)) * 60 + parseInt(this.sunRiseSet.sunset.slice(2, 4));
                const daylightMin = sunsetMin - sunriseMin;
                const daylightHours = Math.floor(daylightMin / 60);
                const daylightMins = daylightMin % 60;

                lifeItems.push(`<span class="text-xs text-slate-500">일출 ${sunrise}</span>`);
                lifeItems.push(`<span class="text-xs text-slate-500">일몰 ${sunset}</span>`);
                lifeItems.push(`<span class="text-xs text-slate-500">낮 ${daylightHours}h ${daylightMins}m</span>`);
            }

            if (lifeItems.length > 0) {
                lifeHtml = `
                    <div class="mt-2 flex justify-center gap-4">
                        ${lifeItems.join('')}
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
                            <div class="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <span class="material-symbols-outlined text-lg">thermostat</span>
                                <span>체감 ${feelsLike}°</span>
                            </div>
                        ` : ''}
                        <div class="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span class="material-symbols-outlined text-lg">water_drop</span>
                            <span>습도 ${humidity}%</span>
                        </div>
                        <div class="flex items-center justify-end gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <span class="text-lg font-bold">${windDir.arrow}</span>
                            <span>${windDir.text}풍 ${wind}m/s</span>
                        </div>
                    </div>
                </div>
                ${airHtml}
                ${lifeHtml}
                <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-center">
                    ${loc.name} · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
                </div>
                ${hourlyHtml}
                ${dailyHtml}
            `;

            // 대기질 info 버튼 이벤트
            const airInfoBtn = document.getElementById('air-info-btn');
            const airInfoPopup = document.getElementById('air-info-popup');
            const airInfoClose = document.getElementById('air-info-close');

            if (airInfoBtn && airInfoPopup) {
                airInfoBtn.addEventListener('click', () => {
                    airInfoPopup.classList.toggle('hidden');
                });
            }
            if (airInfoClose && airInfoPopup) {
                airInfoClose.addEventListener('click', () => {
                    airInfoPopup.classList.add('hidden');
                });
            }
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

    // ===== 네비게이션 (메뉴 클릭 시 위젯으로 이동) =====
    const Navigation = {
        init() {
            const mainContent = document.getElementById('main-content');

            // 페이지 로드 시 맨 위로 스크롤
            if (mainContent) {
                mainContent.scrollTop = 0;
            }
            window.scrollTo(0, 0);

            // 네비게이션 링크 클릭 시 해당 위젯으로 스크롤
            document.querySelectorAll('nav a[href^="#"]').forEach(link => {
                link.addEventListener('click', (e) => {
                    const targetId = link.getAttribute('href').slice(1);
                    if (!targetId) {
                        // 전체보기(#) 클릭 시 맨 위로
                        e.preventDefault();
                        if (mainContent) mainContent.scrollTop = 0;
                        window.scrollTo(0, 0);
                        return;
                    }

                    e.preventDefault();
                    this.scrollToWidget(targetId);
                });
            });
        },

        scrollToWidget(targetId) {
            const targetEl = document.getElementById(targetId);
            if (!targetEl) return;

            // 가장 간단하고 확실한 방법: scrollIntoView
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // 하이라이트 효과
            this.highlightWidget(targetEl);
        },

        highlightWidget(el) {
            // 기존 하이라이트 제거
            document.querySelectorAll('.widget-highlight').forEach(w => {
                w.classList.remove('widget-highlight');
            });

            // 새 하이라이트 추가
            setTimeout(() => {
                el.classList.add('widget-highlight');
                setTimeout(() => {
                    el.classList.remove('widget-highlight');
                }, 1500);
            }, 400);
        }
    };

    // ===== 위젯 레이아웃 관리자 =====
    const WidgetLayout = {
        editMode: false,
        draggedElement: null,
        placeholder: null,
        longPressTimer: null,
        touchStartX: 0,
        touchStartY: 0,
        LONG_PRESS_DURATION: 500,
        // 자동 스크롤 관련
        autoScrollInterval: null,
        SCROLL_EDGE_SIZE: 80, // 화면 경계에서 스크롤 시작하는 영역 (px)
        SCROLL_SPEED: 10, // 스크롤 속도 (px/프레임)

        init() {
            this.setupEditModeToggle();
            this.loadLayout();
            this.attachWidgetEvents();
        },

        setupEditModeToggle() {
            const btn = document.getElementById('edit-mode-toggle');
            if (btn) {
                btn.addEventListener('click', () => this.toggleEditMode());
            }
        },

        toggleEditMode() {
            this.editMode = !this.editMode;
            const btn = document.getElementById('edit-mode-toggle');
            const container = document.getElementById('main-content');
            const grid = document.querySelector('.grid');

            if (this.editMode) {
                btn.classList.add('bg-primary', 'text-white');
                btn.classList.remove('text-slate-600', 'dark:text-slate-400');
                container.classList.add('edit-mode');
                if (grid) grid.classList.add('edit-mode');
                this.showEditUI();
            } else {
                btn.classList.remove('bg-primary', 'text-white');
                btn.classList.add('text-slate-600', 'dark:text-slate-400');
                container.classList.remove('edit-mode');
                if (grid) grid.classList.remove('edit-mode');
                this.hideEditUI();
                this.saveLayout();
            }
        },

        showEditUI() {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                card.style.cursor = 'move';
                card.classList.add('edit-mode-active');
                this.addResizeHandles(card);
            });
        },

        hideEditUI() {
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                card.style.cursor = '';
                card.classList.remove('edit-mode-active');
                this.removeResizeHandles(card);
            });
        },

        addResizeHandles(card) {
            if (card.querySelector('.resize-handle')) return;

            // 우측 하단 코너 핸들만 생성
            const handle = document.createElement('div');
            handle.className = 'resize-handle resize-corner';
            handle.style.cssText = `
                position: absolute;
                bottom: 0;
                right: 0;
                width: 20px;
                height: 20px;
                background: rgba(59, 130, 246, 0.7);
                cursor: nwse-resize;
                z-index: 100;
                border-radius: 0 0 8px 0;
                transition: background 0.2s;
            `;

            // 핸들 내부에 드래그 아이콘 추가
            handle.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px; color: white; position: absolute; bottom: 2px; right: 2px;">drag_indicator</span>';

            handle.addEventListener('mouseenter', () => {
                handle.style.background = 'rgba(59, 130, 246, 1)';
            });
            handle.addEventListener('mouseleave', () => {
                handle.style.background = 'rgba(59, 130, 246, 0.7)';
            });

            let startX, startY, startColSpan, startRowSpan;

            const onMouseMove = (e) => {
                e.preventDefault();
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                // 가로 크기 조절
                const newColSpan = Math.max(1, Math.min(4, startColSpan + Math.floor(deltaX / 150)));
                // 세로 크기 조절
                const newRowSpan = Math.max(1, Math.min(3, startRowSpan + Math.floor(deltaY / 100)));

                this.updateWidgetSize(card, newColSpan, newRowSpan);
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.saveLayout();
            };

            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                startX = e.clientX;
                startY = e.clientY;
                startColSpan = this.getWidgetColSpan(card);
                startRowSpan = this.getWidgetRowSpan(card);

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            card.appendChild(handle);
        },

        removeResizeHandles(card) {
            const handles = card.querySelectorAll('.resize-handle');
            handles.forEach(handle => handle.remove());
        },

        getWidgetColSpan(card) {
            const classes = card.className.match(/(?:lg:)?col-span-(\d+)/);
            return classes ? parseInt(classes[1]) : 1;
        },

        getWidgetRowSpan(card) {
            const classes = card.className.match(/row-span-(\d+)/);
            return classes ? parseInt(classes[1]) : 1;
        },

        updateWidgetSize(card, colSpan, rowSpan) {
            // col-span 업데이트
            card.className = card.className.replace(/col-span-\d+/g, `col-span-1`);
            card.className = card.className.replace(/lg:col-span-\d+/g, `lg:col-span-${colSpan}`);

            // row-span 업데이트
            if (rowSpan > 1) {
                card.className = card.className.replace(/row-span-\d+/g, `row-span-${rowSpan}`);
                if (!card.className.includes('row-span-')) {
                    card.className += ` row-span-${rowSpan}`;
                }
            } else {
                card.className = card.className.replace(/row-span-\d+\s*/g, '');
            }
        },

        attachWidgetEvents() {
            const container = document.querySelector('.grid');
            if (!container) return;

            container.addEventListener('mousedown', (e) => this.handleDragStart(e));
            container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });

            document.addEventListener('mousemove', (e) => this.handleDragMove(e));
            document.addEventListener('mouseup', (e) => this.handleDragEnd(e));

            document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        },

        handleDragStart(e) {
            if (!this.editMode) return;

            const card = e.target.closest('.card');
            if (!card || e.target.closest('.resize-handle')) return;

            this.draggedElement = card;
            this.createPlaceholder(card);
            card.classList.add('dragging');
            card.style.position = 'fixed';
            card.style.zIndex = '9999';
            card.style.pointerEvents = 'none';
            card.style.transform = 'scale(1.05)';
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
        },

        handleTouchStart(e) {
            if (!this.editMode) return;

            const card = e.target.closest('.card');
            if (!card || e.target.closest('.resize-handle')) return;

            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;

            // 길게 누르기 감지
            this.longPressTimer = setTimeout(() => {
                this.draggedElement = card;
                this.createPlaceholder(card);
                card.classList.add('dragging');
                card.style.position = 'fixed';
                card.style.zIndex = '9999';
                card.style.pointerEvents = 'none';
                card.style.transform = 'scale(1.05)';
                card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';

                // 햅틱 피드백 (지원하는 경우)
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }, this.LONG_PRESS_DURATION);
        },

        createPlaceholder(card) {
            const placeholder = document.createElement('div');
            placeholder.className = 'widget-placeholder ' + card.className.replace('card', '').replace('dragging', '');
            placeholder.style.cssText = 'background: rgba(59, 130, 246, 0.1); border: 2px dashed rgba(59, 130, 246, 0.5); border-radius: 8px; min-height: 100px;';
            card.parentNode.insertBefore(placeholder, card);
            this.placeholder = placeholder;
        },

        removePlaceholder() {
            if (this.placeholder) {
                this.placeholder.remove();
                this.placeholder = null;
            }
        },

        handleDragMove(e) {
            if (!this.draggedElement || !this.editMode) return;
            e.preventDefault();

            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);

            // 마지막 드래그 위치 저장
            this.lastDragX = clientX;
            this.lastDragY = clientY;

            // 드래그된 요소를 마우스 위치로 이동
            const rect = this.draggedElement.getBoundingClientRect();
            this.draggedElement.style.left = `${clientX - rect.width / 2}px`;
            this.draggedElement.style.top = `${clientY - rect.height / 2}px`;

            // 화면 경계 자동 스크롤
            this.handleAutoScroll(clientY);

            // 드롭 위치 찾기 (더 정확한 위치 계산)
            const afterElement = this.getDragAfterElement(clientX, clientY);
            const container = document.querySelector('.grid');

            if (this.placeholder && afterElement !== this.placeholderAfter) {
                this.placeholderAfter = afterElement;

                if (afterElement == null) {
                    container.appendChild(this.placeholder);
                } else {
                    container.insertBefore(this.placeholder, afterElement);
                }

                // 다른 위젯들이 자동으로 재배치됨 (CSS Grid auto-flow)
                this.updateGridLayout();
            }
        },

        // 화면 경계에서 자동 스크롤
        handleAutoScroll(clientY) {
            const mainContent = document.getElementById('main-content');
            if (!mainContent) return;

            const windowHeight = window.innerHeight;
            const headerHeight = 130; // 헤더 높이 (대략)

            // 이전 스크롤 인터벌 정리
            if (this.autoScrollInterval) {
                clearInterval(this.autoScrollInterval);
                this.autoScrollInterval = null;
            }

            // 상단 경계 (헤더 아래)
            if (clientY < headerHeight + this.SCROLL_EDGE_SIZE && clientY > headerHeight) {
                const intensity = 1 - (clientY - headerHeight) / this.SCROLL_EDGE_SIZE;
                const speed = Math.ceil(this.SCROLL_SPEED * intensity);
                this.autoScrollInterval = setInterval(() => {
                    mainContent.scrollTop -= speed;
                }, 16);
            }
            // 하단 경계
            else if (clientY > windowHeight - this.SCROLL_EDGE_SIZE) {
                const intensity = 1 - (windowHeight - clientY) / this.SCROLL_EDGE_SIZE;
                const speed = Math.ceil(this.SCROLL_SPEED * intensity);
                this.autoScrollInterval = setInterval(() => {
                    mainContent.scrollTop += speed;
                }, 16);
            }
        },

        stopAutoScroll() {
            if (this.autoScrollInterval) {
                clearInterval(this.autoScrollInterval);
                this.autoScrollInterval = null;
            }
        },

        updateGridLayout() {
            // CSS Grid가 자동으로 레이아웃을 조정하므로
            // 명시적인 위치 업데이트는 필요 없음
            // 필요시 여기서 충돌 감지 및 해결 로직 추가 가능
        },

        handleTouchMove(e) {
            if (!this.draggedElement) return;

            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - this.touchStartX);
            const deltaY = Math.abs(touch.clientY - this.touchStartY);

            // 움직임이 있으면 longPress 취소
            if ((deltaX > 10 || deltaY > 10) && this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }

            if (this.draggedElement && this.editMode) {
                e.preventDefault();
                this.handleDragMove(e);
            }
        },

        handleDragEnd(e) {
            if (!this.draggedElement) return;

            // 자동 스크롤 중지
            this.stopAutoScroll();

            // placeholder 위치에 원본 요소 삽입 (DOM 순서만 변경)
            if (this.placeholder && this.placeholder.parentNode) {
                this.placeholder.parentNode.insertBefore(this.draggedElement, this.placeholder);
            }

            // grid 좌표 초기화 (CSS Grid auto-flow에 맡김)
            this.draggedElement.style.gridColumnStart = '';
            this.draggedElement.style.gridRowStart = '';

            // 스타일 복원
            this.draggedElement.classList.remove('dragging');
            this.draggedElement.style.position = '';
            this.draggedElement.style.zIndex = '';
            this.draggedElement.style.pointerEvents = '';
            this.draggedElement.style.transform = '';
            this.draggedElement.style.boxShadow = '';
            this.draggedElement.style.left = '';
            this.draggedElement.style.top = '';

            this.removePlaceholder();
            this.draggedElement = null;
            this.lastDragX = undefined;
            this.lastDragY = undefined;

            this.saveLayout();
        },

        handleTouchEnd(e) {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }

            this.handleDragEnd(e);
        },

        // 마우스 위치를 그리드 좌표로 변환
        getGridCoordinates(clientX, clientY) {
            const container = document.querySelector('.grid');
            const rect = container.getBoundingClientRect();

            // 그리드 설정 가져오기
            const computedStyle = window.getComputedStyle(container);
            const gap = parseInt(computedStyle.gap) || 0;

            // 뷰포트 크기에 따라 컬럼 수 결정
            const viewportWidth = window.innerWidth;
            let columns;
            if (viewportWidth >= 1024) {
                columns = 4; // lg 이상
            } else if (viewportWidth >= 768) {
                columns = 2; // md
            } else {
                columns = 1; // 모바일
            }

            // 컨테이너 내 상대 위치
            const relativeX = clientX - rect.left;
            const relativeY = clientY - rect.top;

            // 각 셀의 크기 계산 (gap 포함)
            const cellWidth = (rect.width - gap * (columns - 1)) / columns;
            const cellHeight = 200; // 기본 row 높이

            // 그리드 좌표 계산
            const column = Math.floor(relativeX / (cellWidth + gap)) + 1;
            const row = Math.floor(relativeY / (cellHeight + gap)) + 1;

            return {
                column: Math.max(1, Math.min(column, columns)),
                row: Math.max(1, row)
            };
        },

        getDragAfterElement(x, y) {
            const container = document.querySelector('.grid');
            const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

            // 각 요소의 위치를 확인하고, 마우스 위치 다음에 올 요소를 찾음
            let closestElement = null;
            let closestOffset = Number.POSITIVE_INFINITY;

            for (const child of draggableElements) {
                const box = child.getBoundingClientRect();

                // 요소의 상단 중앙점
                const elementY = box.top + box.height / 2;
                const elementX = box.left + box.width / 2;

                // 마우스가 이 요소보다 위에 있는지 확인
                // 수직 위치 차이 계산 (마우스가 요소 위에 있으면 음수)
                const offsetY = elementY - y;

                // 마우스가 요소의 상단 위에 있고, 가장 가까운 요소를 찾음
                if (offsetY > 0 && offsetY < closestOffset) {
                    closestOffset = offsetY;
                    closestElement = child;
                }
                // 같은 행에 있는 경우 (Y 차이가 적음) X 위치도 고려
                else if (Math.abs(offsetY) < 50) {
                    const offsetX = elementX - x;
                    if (offsetX > 0 && offsetX < closestOffset) {
                        closestOffset = offsetX;
                        closestElement = child;
                    }
                }
            }

            return closestElement;
        },

        saveLayout() {
            const cards = document.querySelectorAll('.card');
            const layout = [];

            cards.forEach((card, index) => {
                layout.push({
                    id: card.id,
                    colSpan: this.getWidgetColSpan(card),
                    rowSpan: this.getWidgetRowSpan(card),
                    order: index
                });
            });

            sessionStorage.setItem('widgetLayout', JSON.stringify(layout));
        },

        loadLayout() {
            const saved = sessionStorage.getItem('widgetLayout');
            if (!saved) return;

            try {
                const layout = JSON.parse(saved);
                const container = document.querySelector('.grid');
                if (!container) return;

                // DOM 순서대로 재배치
                layout.sort((a, b) => a.order - b.order).forEach(item => {
                    const card = document.getElementById(item.id);
                    if (card) {
                        this.updateWidgetSize(card, item.colSpan, item.rowSpan);
                        // grid 좌표는 사용하지 않음 (CSS Grid auto-flow에 맡김)
                        card.style.gridColumnStart = '';
                        card.style.gridRowStart = '';
                        container.appendChild(card);
                    }
                });
            } catch (e) {
                console.error('Failed to load widget layout:', e);
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
        Dictionary.init();
        Weather.init();
        Navigation.init();
        WidgetLayout.init();
    });
})();
