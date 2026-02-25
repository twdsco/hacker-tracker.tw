        // --- 1. 活動資料 (從 JSON 載入) ---
        // 資料結構：使用 start 與 end 取代 date, endDate, time
        let events = [];
        let activeTagFilters = [];

        let displayYearForMonth = 2026;
        let displayMonth = 5;
        let displayYearForYear = 2026;

        async function loadEvents() {
            const empty = [];
            try {
                const cacheBuster = CONFIG.data.cacheBusting ? `?ts=${Date.now()}` : '';
                const allRes = await fetch(`${CONFIG.data.allPath}${cacheBuster}`);
                const allData = allRes.ok ? await allRes.json() : empty;
                const combined = Array.isArray(allData) ? allData : empty;

                events = combined.map((ev, index) => ({
                    id: index + 1,
                    title: ev.title,
                    start: ev.start,
                    end: ev.end,
                    location: ev.location,
                    organizer: ev.organizer,
                    url: ev.url,
                    contact: ev.contact,
                    status: ev.status,
                    tags: filterSupportedTags(ev.tags)
                }));
            } catch (err) {
                console.error('Failed to load events:', err);
                events = [];
            }
        }

        // --- 輔助函式 ---
        function isDateInEvent(targetDateStr, ev) {
            const startDateStr = ev.start.split('T')[0];
            const endDateStr = ev.end.split('T')[0];
            return targetDateStr >= startDateStr && targetDateStr <= endDateStr;
        }
        
        function formatDateStr(dateObj) {
            const y = dateObj.getFullYear();
            const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const d = dateObj.getDate().toString().padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        // 格式化顯示「開始 ~ 結束」的時間字串
        function formatDateTimeDisplay(startStr, endStr) {
            const startDate = startStr.split('T')[0];
            const startTime = startStr.split('T')[1] || '';
            const endDate = endStr.split('T')[0];
            const endTime = endStr.split('T')[1] || '';

            if (startDate === endDate) {
                return `${startDate} ${startTime} ~ ${endTime}`;
            } else {
                return `${startDate} ${startTime} ~ ${endDate} ${endTime}`;
            }
        }

        function hasValue(value) {
            return value !== undefined && value !== null && value !== '';
        }

        function escapeHTML(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function normalizeUrl(value) {
            if (!hasValue(value)) return '';
            try {
                const url = new URL(value, window.location.origin);
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    return url.href;
                }
            } catch (err) {
                return '';
            }
            return '';
        }

        function normalizeTag(tag) {
            return tag.trim();
        }

        function parseTagsInput(value) {
            if (!value) return [];
            const supported = new Set(CONFIG.supportedTags.map(normalizeTag));
            const rawTags = value.split(',').map(normalizeTag).filter(Boolean);
            const deduped = Array.from(new Set(rawTags));
            return deduped.filter(tag => supported.has(tag));
        }

        function filterSupportedTags(tags) {
            if (!Array.isArray(tags)) return [];
            const supported = new Set(CONFIG.supportedTags.map(normalizeTag));
            const normalized = tags.map(normalizeTag).filter(Boolean);
            const deduped = Array.from(new Set(normalized));
            return deduped.filter(tag => supported.has(tag));
        }

        function renderTagsHint() {
            const hintEl = document.getElementById('add-tags-hint');
            if (!hintEl) return;
            hintEl.textContent = "請至少選擇「實體」或「線上」。";
        }

        function getVisibleEvents() {
            if (activeTagFilters.length === 0) return events;
            return events.filter(ev => Array.isArray(ev.tags) && ev.tags.some(tag => activeTagFilters.includes(tag)));
        }

        function readTagFiltersFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const raw = params.get('tags');
            if (!raw) return [];
            const decoded = raw.split(',').map(value => value.trim()).filter(Boolean);
            return filterSupportedTags(decoded);
        }

        function writeTagFiltersToUrl(tags) {
            const params = new URLSearchParams(window.location.search);
            if (!tags || tags.length === 0) {
                params.delete('tags');
            } else {
                params.set('tags', tags.join(','));
            }
            const query = params.toString();
            const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
            window.history.replaceState(null, '', nextUrl);
        }

        function renderTagFilterOptions() {
            const container = document.getElementById('tag-filter-options');
            if (!container) return;
            container.innerHTML = CONFIG.supportedTags.map(tag => `
                <button type="button" class="tag-option" data-tag="${tag}" aria-pressed="false">${tag}</button>
            `).join('');
            const selected = new Set(activeTagFilters);
            container.querySelectorAll('.tag-option').forEach(btn => {
                const isSelected = selected.has(btn.dataset.tag);
                btn.classList.toggle('is-active', isSelected);
                btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
                btn.addEventListener('click', () => {
                    const nowActive = btn.classList.toggle('is-active');
                    btn.setAttribute('aria-pressed', nowActive ? 'true' : 'false');
                    activeTagFilters = Array.from(container.querySelectorAll('.tag-option.is-active'))
                        .map(el => el.dataset.tag)
                        .filter(Boolean);
                    writeTagFiltersToUrl(activeTagFilters);
                    renderList();
                    renderMonth();
                    renderYear();
                });
            });
        }

        function renderTagOptions() {
            const container = document.getElementById('add-tags-options');
            if (!container) return;
            container.innerHTML = CONFIG.supportedTags.map(tag => `
                <button type="button" class="tag-option" data-tag="${tag}" aria-pressed="false">${tag}</button>
            `).join('');
            container.querySelectorAll('.tag-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const isActive = btn.classList.toggle('is-active');
                    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                });
            });
        }

        function bindOnlineToggle() {
            const checkbox = document.getElementById('add-online');
            const locationInput = document.getElementById('add-location');
            if (!checkbox || !locationInput) return;

            const applyState = () => {
                if (checkbox.checked) {
                    locationInput.value = "線上活動";
                    locationInput.setAttribute('disabled', 'disabled');
                } else {
                    locationInput.removeAttribute('disabled');
                    if (locationInput.value === "線上活動") {
                        locationInput.value = "";
                    }
                }
            };

            checkbox.addEventListener('change', applyState);
            applyState();
        }

        function getSelectedTags() {
            return Array.from(document.querySelectorAll('#add-tags-options .tag-option.is-active'))
                .map(btn => btn.dataset.tag)
                .filter(Boolean);
        }

        function buildDateTimeWithTimezone(dateStr, timeStr) {
            if (!dateStr) return '';
            if (!timeStr) return dateStr;
            const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
            return `${dateStr}T${normalizedTime}+08:00`;
        }

        function renderTagPills(tags) {
            if (!Array.isArray(tags) || tags.length === 0) return '';
            return `<div class="event-tags">${tags.map(tag => `<span class="tag-pill">${escapeHTML(tag)}</span>`).join('')}</div>`;
        }

        function setDefaultDisplayDates() {
            if (events.length === 0) {
                const today = new Date();
                displayYearForMonth = today.getFullYear();
                displayMonth = today.getMonth() + 1;
                displayYearForYear = today.getFullYear();
                return;
            }

            const earliest = [...events].sort((a, b) => new Date(a.start) - new Date(b.start))[0];
            const earliestDate = new Date(earliest.start);
            displayYearForMonth = earliestDate.getFullYear();
            displayMonth = earliestDate.getMonth() + 1;
            displayYearForYear = earliestDate.getFullYear();
        }

        // --- 2. 視圖切換邏輯 ---
        function switchView(viewName) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            // 改為透過選擇器尋找按鈕，以便支援程式碼觸發的頁籤切換
            const targetBtn = document.querySelector(`.tab-btn[onclick="switchView('${viewName}')"]`);
            if (targetBtn) targetBtn.classList.add('active');
            
            document.querySelectorAll('.view-container').forEach(container => container.classList.remove('active'));
            document.getElementById('view-' + viewName).classList.add('active');
        }

        // --- 3. 渲染列表模式 ---
        function renderList() {
            const container = document.getElementById('view-list');
            container.innerHTML = '';
            const visibleEvents = getVisibleEvents();
            const sortedEvents = [...visibleEvents].sort((a, b) => new Date(a.start) - new Date(b.start));

            const groupedEvents = {};
            sortedEvents.forEach(ev => {
                const dateObj = new Date(ev.start);
                const year = dateObj.getFullYear();
                const month = dateObj.getMonth() + 1;
                const monthKey = `${year}年 ${month}月`;
                if (!groupedEvents[monthKey]) groupedEvents[monthKey] = [];
                groupedEvents[monthKey].push(ev);
            });

            for (const [monthKey, monthEvents] of Object.entries(groupedEvents)) {
                let cardsHTML = '';
                
                monthEvents.forEach(ev => {
                    const badgeHTML = ev.status === 'tentative' ? `<div class="badge absolute-top tentative">⚠️ 暫定</div>` : '';
                    const dateDisplay = formatDateTimeDisplay(ev.start, ev.end);
                    const tagsHTML = renderTagPills(ev.tags);
                    const infoItems = [];
                    infoItems.push(`<span class="info-item">🕒 ${escapeHTML(dateDisplay)}</span>`);
                    if (hasValue(ev.location)) infoItems.push(`<span class="info-item">📍 ${escapeHTML(ev.location)}</span>`);
                    if (hasValue(ev.organizer)) infoItems.push(`<span class="info-item">🏢 ${escapeHTML(ev.organizer)}</span>`);
                    if (hasValue(ev.contact)) infoItems.push(`<span class="info-item">👤 ${escapeHTML(ev.contact)}</span>`);
                    const safeUrl = normalizeUrl(ev.url);
                    if (safeUrl) {
                        infoItems.push(`<span class="info-item">🔗<a href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(safeUrl)}</a></span>`);
                    }
                    
                    cardsHTML += `
                        <div class="event-card">
                            ${badgeHTML}
                            <div class="event-title">${escapeHTML(ev.title)}</div>
                            ${tagsHTML}
                            <div class="event-info">
                                ${infoItems.join('')}
                            </div>
                        </div>
                    `;
                });

                container.innerHTML += `
                    <div class="list-month-group">
                        <h3 class="list-month-header">${monthKey}</h3>
                        <div class="list-timeline-content">
                            ${cardsHTML}
                        </div>
                    </div>
                `;
            }
        }

        // --- 4. 渲染月曆模式 (CSS Grid Span 架構) ---
        function changeMonth(delta) {
            displayMonth += delta;
            if (displayMonth > 12) { displayMonth = 1; displayYearForMonth++; } 
            else if (displayMonth < 1) { displayMonth = 12; displayYearForMonth--; }
            renderMonth();
        }

        function renderMonth() {
            document.getElementById('month-view-title').innerText = `${displayYearForMonth}年 ${displayMonth}月`;
            const grid = document.getElementById('month-grid');
            grid.innerHTML = '';
            
            // 寫入星期表頭 (Row 1)
            const weekDays = ['日','一','二','三','四','五','六'];
            weekDays.forEach((day, i) => {
                grid.innerHTML += `<div class="cal-header" style="grid-column: ${i+1}; grid-row: 1;">${day}</div>`;
            });

            // 計算月曆涵蓋的日期範圍 (補齊首尾週)
            const firstDayOfMonth = new Date(displayYearForMonth, displayMonth - 1, 1);
            const lastDayOfMonth = new Date(displayYearForMonth, displayMonth, 0);
            const startCalendarDate = new Date(firstDayOfMonth);
            startCalendarDate.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

            const weeks = [];
            let current = new Date(startCalendarDate);
            while (current <= lastDayOfMonth || current.getDay() !== 0) {
                if (current.getDay() === 0) weeks.push([]);
                weeks[weeks.length - 1].push(new Date(current));
                current.setDate(current.getDate() + 1);
            }

            weeks.forEach((week, weekIndex) => {
                const gridRow = weekIndex + 2; // Row 1 是表頭

                // 1. 渲染背景與日期數字
                week.forEach((dateObj, dayIndex) => {
                    const isCurrentMonth = dateObj.getMonth() + 1 === displayMonth;
                    const numColor = isCurrentMonth ? 'var(--text-primary)' : '#555';
                    const bgColor = isCurrentMonth ? 'var(--bg-panel)' : '#161616';
                    grid.innerHTML += `
                        <div class="cal-day" style="grid-column: ${dayIndex + 1}; grid-row: ${gridRow}; background-color: ${bgColor};">
                            <div class="day-num" style="color: ${numColor};">${dateObj.getDate()}</div>
                        </div>
                    `;
                });

                // 2. 渲染活動 (Span跨欄)
                const weekStartStr = formatDateStr(week[0]);
                const weekEndStr = formatDateStr(week[6]);

                // 篩選出有與本週重疊的活動
                const weekEvents = getVisibleEvents().filter(ev => {
                    const evStartStr = ev.start.split('T')[0];
                    const evEndStr = ev.end.split('T')[0];
                    return evStartStr <= weekEndStr && evEndStr >= weekStartStr;
                });

                // 排序：長天數優先，再來是日期早的優先
                weekEvents.sort((a, b) => {
                    const aDur = new Date(a.end) - new Date(a.start);
                    const bDur = new Date(b.end) - new Date(b.start);
                    if (bDur !== aDur) return bDur - aDur;
                    return new Date(a.start) - new Date(b.start);
                });

                const slotOccupied = [0,0,0,0,0,0,0]; // 記錄本週每一天的垂直空間被佔用了多少

                weekEvents.forEach(ev => {
                    const evStartStr = ev.start.split('T')[0];
                    const evEndStr = ev.end.split('T')[0];

                    // 計算在「本週」內的起始與結束欄位 (0~6)
                    let startCol = 0, endCol = 6;
                    for(let i=0; i<7; i++) {
                        const dayStr = formatDateStr(week[i]);
                        if (dayStr === evStartStr) startCol = i;
                        if (dayStr === evEndStr) endCol = i;
                    }
                    if (evStartStr < weekStartStr) startCol = 0;
                    if (evEndStr > weekEndStr) endCol = 6;

                    // 尋找可以塞入的垂直插槽 (Slot)
                    let slot = 0, found = false;
                    while(!found) {
                        let conflict = false;
                        for(let i=startCol; i<=endCol; i++) {
                            if(slotOccupied[i] > slot) { conflict = true; break; }
                        }
                        if(!conflict) found = true; else slot++;
                    }
                    // 標記插槽已被佔用
                    for(let i=startCol; i<=endCol; i++) slotOccupied[i] = slot + 1;

                    // 樣式設定
                    const isConfirmed = ev.status === 'confirmed';
                    const bg = isConfirmed ? 'var(--confirmed-bg)' : 'var(--tentative-bg)';
                    const border = isConfirmed ? 'var(--accent)' : 'var(--tentative-border)';
                    // 修正：暫定活動的字體顏色改為橘色 (--tentative-border)
                    const color = isConfirmed ? 'var(--accent)' : 'var(--tentative-border)';
                    
                    const marginTop = 30 + slot * 28; // 避開日期數字並依 slot 疊加
                    
                    // 判斷是否為跨週切斷的區塊，處理圓角與邊框
                    const isContinuesLeft = evStartStr < weekStartStr;
                    const isContinuesRight = evEndStr > weekEndStr;
                    
                    let bLeft = `1px solid ${border}`, bRight = `1px solid ${border}`, brStyle = '4px';
                    if (isContinuesLeft && isContinuesRight) { brStyle = '0'; bLeft = 'none'; bRight = 'none'; } 
                    else if (isContinuesLeft) { brStyle = '0 4px 4px 0'; bLeft = 'none'; } 
                    else if (isContinuesRight) { brStyle = '4px 0 0 4px'; bRight = 'none'; }

                    const marginLeft = isContinuesLeft ? '0' : '4px';
                    const marginRight = isContinuesRight ? '0' : '4px';
                    const paddingLeft = isContinuesLeft ? '10px' : '6px';

                    grid.innerHTML += `
                        <div class="cal-event-pill" 
                             onclick="openModal(${ev.id})" title="${escapeHTML(ev.title)}"
                             style="grid-column: ${startCol + 1} / span ${endCol - startCol + 1}; 
                                    grid-row: ${gridRow}; 
                                    margin-top: ${marginTop}px; margin-left: ${marginLeft}; margin-right: ${marginRight};
                                    padding-left: ${paddingLeft}; background: ${bg}; 
                                    border-top: 1px solid ${border}; border-bottom: 1px solid ${border}; 
                                    border-left: ${bLeft}; border-right: ${bRight}; color: ${color}; 
                                    border-radius: ${brStyle};">
                            ${escapeHTML(ev.title)}
                        </div>
                    `;
                });
            });
        }

        // --- 5. 渲染年曆模式 ---
        function changeYear(delta) { displayYearForYear += delta; renderYear(); }

        function renderYear() {
            document.getElementById('year-view-title').innerText = `${displayYearForYear}年`;
            const grid = document.getElementById('year-grid');
            grid.innerHTML = ''; 
            const year = displayYearForYear;
            const visibleEvents = getVisibleEvents();
            const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            
            months.forEach((monthName, monthIndex) => {
                const firstDay = new Date(year, monthIndex, 1).getDay();
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                const monthNumStr = (monthIndex + 1).toString().padStart(2, '0');
                
                const hasEventInMonth = visibleEvents.some(ev => {
                    const monthStart = `${year}-${monthNumStr}-01`;
                    const monthEnd = `${year}-${monthNumStr}-${daysInMonth}`;
                    return ev.start.split('T')[0] <= monthEnd && ev.end.split('T')[0] >= monthStart; 
                });
                const highlightStyle = hasEventInMonth ? `border-color: var(--accent); box-shadow: 0 0 10px rgba(0,255,204,0.1);` : ``;

                let daysHTML = '';
                ['日','一','二','三','四','五','六'].forEach(day => daysHTML += `<div class="mini-cal-header">${day}</div>`);
                for (let i = 0; i < firstDay; i++) daysHTML += `<div></div>`;

                for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${year}-${monthNumStr}-${d.toString().padStart(2, '0')}`;
                    const dayEvents = visibleEvents.filter(ev => isDateInEvent(dateStr, ev));
                    
                    if (dayEvents.length > 0) {
                        const hasConfirmed = dayEvents.some(ev => ev.status === 'confirmed');
                        const eventClass = hasConfirmed ? 'has-event-confirmed' : 'has-event-tentative';
                        // 加入 event 參數傳遞，以便控制事件冒泡
                        daysHTML += `<div class="mini-cal-day has-event ${eventClass}" 
                                          onclick="handleYearDateClick(event, '${dateStr}')" 
                                          title="點擊查看 ${dayEvents.length} 個活動">${d}</div>`;
                    } else {
                        daysHTML += `<div class="mini-cal-day">${d}</div>`;
                    }
                }

                // 在外層的 month-box 加上 onclick，跳轉至該月份
                grid.innerHTML += `
                    <div class="month-box" style="${highlightStyle}" onclick="goToMonthFromYear(${year}, ${monthIndex + 1})" title="前往 ${monthName} 月曆">
                        <div class="month-name">${monthName}</div>
                        <div class="mini-cal-grid">${daysHTML}</div>
                    </div>
                `;
            });
        }

        function goToMonthFromYear(year, month) {
            displayYearForMonth = year;
            displayMonth = month;
            renderMonth();
            switchView('month');
        }

        function handleYearDateClick(event, dateStr) {
            // 阻止事件冒泡，這樣點擊日期圈圈時，就不會觸發外層 month-box 的跳轉月曆事件
            event.stopPropagation(); 
            
            const dayEvents = getVisibleEvents().filter(ev => isDateInEvent(dateStr, ev));
            if (dayEvents.length === 1) {
                openModal(dayEvents[0].id);
            } else if (dayEvents.length > 1) {
                const multiModal = document.getElementById('multi-event-modal');
                document.getElementById('multi-modal-title').innerText = `${dateStr} 活動列表`;
                const listContainer = document.getElementById('multi-modal-list');
                listContainer.innerHTML = ''; 
                dayEvents.forEach(ev => {
                    const isConfirmed = ev.status === 'confirmed';
                    const statusBadge = isConfirmed ? '' : `<span class="badge tentative" style="padding: 2px 6px; font-size: 0.7rem; margin-right: 5px; position: static; display: inline-block;">⚠️ 暫定</span>`;
                    listContainer.innerHTML += `
                        <div class="year-event-item" onclick="closeTargetModal('multi-event-modal'); openModal(${ev.id})"
                             style="background: ${isConfirmed ? 'var(--confirmed-bg)' : 'var(--tentative-bg)'}; 
                                    border: 1px solid ${isConfirmed ? 'var(--accent)' : 'var(--tentative-border)'}; 
                                    color: ${isConfirmed ? 'var(--accent)' : 'var(--text-primary)'}; padding: 12px; font-size: 1rem;">
                            ${statusBadge} ${escapeHTML(ev.title)}
                        </div>
                    `;
                });
                multiModal.style.display = 'flex';
                setTimeout(() => { multiModal.classList.add('show'); }, 10);
            }
        }

        // --- 6. 選擇器邏輯 (Picker Logic) ---
        let pickerTempYearForMonth = 2026;
        function openMonthPicker() {
            pickerTempYearForMonth = displayYearForMonth;
            updateMonthPickerUI();
            const modal = document.getElementById('month-picker-modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
        function changePickerYear(delta) {
            pickerTempYearForMonth += delta;
            updateMonthPickerUI();
        }
        function updateMonthPickerUI() {
            document.getElementById('picker-month-year-title').innerText = `${pickerTempYearForMonth}年`;
            const container = document.getElementById('picker-months-grid');
            container.innerHTML = '';
            for(let i=1; i<=12; i++) {
                const isCurrent = (pickerTempYearForMonth === displayYearForMonth && i === displayMonth);
                container.innerHTML += `<button class="picker-btn ${isCurrent ? 'active' : ''}" onclick="selectMonth(${i})">${i}月</button>`;
            }
        }
        function selectMonth(m) {
            displayYearForMonth = pickerTempYearForMonth;
            displayMonth = m;
            renderMonth();
            closeTargetModal('month-picker-modal');
        }

        let pickerTempDecadeStart = 2020;
        function openYearPicker() {
            pickerTempDecadeStart = Math.floor(displayYearForYear / 12) * 12;
            updateYearPickerUI();
            const modal = document.getElementById('year-picker-modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
        function changePickerDecade(delta) {
            pickerTempDecadeStart += delta * 12;
            updateYearPickerUI();
        }
        function updateYearPickerUI() {
            const end = pickerTempDecadeStart + 11;
            document.getElementById('picker-year-range-title').innerText = `${pickerTempDecadeStart} - ${end}`;
            const container = document.getElementById('picker-years-grid');
            container.innerHTML = '';
            for(let i=0; i<12; i++) {
                const y = pickerTempDecadeStart + i;
                const isCurrent = (y === displayYearForYear);
                container.innerHTML += `<button class="picker-btn ${isCurrent ? 'active' : ''}" onclick="selectYear(${y})">${y}</button>`;
            }
        }
        function selectYear(y) {
            displayYearForYear = y;
            renderYear();
            closeTargetModal('year-picker-modal');
        }

        // --- 7. Modal (彈出視窗) 共同邏輯 ---
        function openModal(id) {
            const ev = events.find(e => e.id === id);
            if (!ev) return;

            document.getElementById('modal-title').innerText = ev.title;
            document.getElementById('modal-tags').innerHTML = renderTagPills(ev.tags);
            const dateDisplay = formatDateTimeDisplay(ev.start, ev.end);
            const modalDate = document.getElementById('modal-datetime');
            const modalLocation = document.getElementById('modal-location');
            const modalOrganizer = document.getElementById('modal-organizer');
            const modalContact = document.getElementById('modal-contact');
            const urlContainer = document.getElementById('modal-url-container');

            modalDate.innerHTML = `🕒 <strong>日期/時間：</strong> ${dateDisplay}`;
            modalDate.style.display = 'flex';

            if (hasValue(ev.location)) {
                modalLocation.innerHTML = `📍 <strong>地點：</strong> ${escapeHTML(ev.location)}`;
                modalLocation.style.display = 'flex';
            } else {
                modalLocation.style.display = 'none';
            }

            if (hasValue(ev.organizer)) {
                modalOrganizer.innerHTML = `🏢 <strong>主辦單位：</strong> ${escapeHTML(ev.organizer)}`;
                modalOrganizer.style.display = 'flex';
            } else {
                modalOrganizer.style.display = 'none';
            }

            if (hasValue(ev.contact)) {
                modalContact.innerHTML = `👤 <strong>聯絡資訊：</strong> ${escapeHTML(ev.contact)}`;
                modalContact.style.display = 'flex';
            } else {
                modalContact.style.display = 'none';
            }

            const safeUrl = normalizeUrl(ev.url);
            if (safeUrl) {
                urlContainer.innerHTML = `🔗 <strong>活動網址：</strong> <a href="${escapeHTML(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(safeUrl)}</a>`;
                urlContainer.style.display = 'flex';
            } else {
                urlContainer.style.display = 'none';
            }

            const badge = document.getElementById('modal-badge');
            badge.className = 'badge';
            if (ev.status === 'tentative') {
                badge.classList.add('tentative');
                badge.innerText = '⚠️ 暫定';
                badge.style.display = 'inline-block';
            } else { badge.style.display = 'none'; }

            const modal = document.getElementById('event-modal');
            modal.style.display = 'flex';
            setTimeout(() => { modal.classList.add('show'); }, 10);
        }

        function closeTargetModal(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            modal.classList.remove('show');
            setTimeout(() => { modal.style.display = 'none'; }, 300);
        }

        // 點擊視窗外部深色背景時關閉對應的 Modal
        window.onclick = function(event) {
            ['event-modal', 'multi-event-modal', 'month-picker-modal', 'year-picker-modal', 'add-event-modal'].forEach(id => {
                if (event.target.id === id) closeTargetModal(id);
            });
        }

        // --- 8. 新增活動產生 JSON ---
        function openAddEventModal() {
            const modal = document.getElementById('add-event-modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }

        function submitNewEvent(e) {
            e.preventDefault();

            // 取得表單資料
            const title = document.getElementById('add-title').value.trim();
            const startDate = document.getElementById('add-start-date').value;
            const startTime = document.getElementById('add-start-time').value;
            const endDate = document.getElementById('add-end-date').value;
            const endTime = document.getElementById('add-end-time').value;
            const start = buildDateTimeWithTimezone(startDate, startTime);
            const end = buildDateTimeWithTimezone(endDate, endTime);
            const location = document.getElementById('add-location').value.trim();
            const organizer = document.getElementById('add-organizer').value.trim();
            const contact = document.getElementById('add-contact').value.trim();
            const url = document.getElementById('add-url').value.trim();
            const status = document.getElementById('add-status').value;
            const tags = getSelectedTags();

            const hasStartTime = startTime !== "";
            const hasEndTime = endTime !== "";
            if (hasStartTime !== hasEndTime) {
                alert("開始時間與結束時間需同時填寫或同時留空。");
                return;
            }

            if (!tags.includes('實體') && !tags.includes('線上')) {
                alert("請至少選擇「實體」或「線上」其中一個標籤。");
                return;
            }

            // 驗證時間
            if (new Date(end) < new Date(start)) {
                alert("結束時間必須晚於開始時間！");
                return;
            }

            // 組裝成 JSON 物件 (使用 Date.now() 產生一組不重複的 ID)
            const newEvent = {
                title: title,
                start: start,
                end: end,
                location: location,
                organizer: organizer,
                url: url,
                contact: contact,
                status: status,
                tags: tags
            };

            const slug = title
                .toLowerCase()
                .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 40);
            const fileName = `${slug || 'event'}.json`;
            const jsonString = JSON.stringify(newEvent, null, 4);

            const output = document.getElementById('add-json-output');
            if (output) {
                output.value = jsonString;
                output.dataset.filename = fileName;
            }
            const filenameLabel = document.getElementById('json-output-filename');
            if (filenameLabel) {
                filenameLabel.textContent = `檔名：${fileName}`;
            }
            const jsonModal = document.getElementById('json-output-modal');
            if (jsonModal) {
                jsonModal.style.display = 'flex';
                setTimeout(() => jsonModal.classList.add('show'), 10);
            }
        }

        // --- 初始化執行 ---
        async function init() {
            await loadEvents();
            setDefaultDisplayDates();
            activeTagFilters = readTagFiltersFromUrl();
            renderList();
            renderMonth();
            renderYear();

            const footerRepoLink = document.getElementById('footer-repo-link');
            if (footerRepoLink) footerRepoLink.href = CONFIG.github.repoUrl;

            renderTagOptions();
            renderTagsHint();
            bindOnlineToggle();
            renderTagFilterOptions();

            const copyBtn = document.getElementById('copy-json-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    const output = document.getElementById('add-json-output');
                    if (!output || !output.value) {
                        alert("尚未產生 JSON，請先送出表單。");
                        return;
                    }
                    output.select();
                    output.setSelectionRange(0, output.value.length);
                    try {
                        document.execCommand('copy');
                        const name = output.dataset.filename ? ` (${output.dataset.filename})` : '';
                        alert(`✅ 已複製 JSON 到剪貼簿${name}！`);
                    } catch (err) {
                        alert("複製失敗，請手動複製內容。");
                    }
                });
            }
        }

        init();
