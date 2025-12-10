/**
 * HanjaApp - Educational Hanja Search Application
 * Refactored for modularity and maintainability
 */

class HanjaApp {
    constructor() {
        // Application State
        this.state = {
            data: [],
            sortedData: [],
            currentPage: 1,
            itemsPerPage: 20,
            filters: {
                search: '',
                education: '',
                grades: [],
                length: '',
                chosung: '',
                syllable: '',
                favoritesOnly: false
            },
            favorites: new Set(),
            recentHistory: [],
            syllableCache: {}
        };

        // Constants
        this.MAX_RECENT_ITEMS = 30;
        this.CHOSUNGS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

        // Cache DOM Elements
        this.dom = {
            searchInput: document.getElementById('searchInput'),
            clearSearchBtn: document.getElementById('clearSearchBtn'),
            educationFilter: document.getElementById('educationFilter'),
            lengthFilter: document.getElementById('lengthFilter'),
            gradeFilterBtn: document.getElementById('gradeFilterBtn'),
            gradeDropdown: document.getElementById('gradeDropdown'),
            gradeDropdownMenu: document.getElementById('gradeDropdownMenu'),
            gradeApplyBtn: document.getElementById('gradeApplyBtn'),
            gradeResetBtn: document.getElementById('gradeResetBtn'),
            favoritesOnlyBtn: document.getElementById('favoritesOnlyBtn'),
            favoritesCount: document.getElementById('favoritesCount'),
            recentViewBtn: document.getElementById('recentViewBtn'),
            recentViewCount: document.getElementById('recentViewCount'),
            recentModal: document.getElementById('recentModal'),
            recentList: document.getElementById('recentList'),
            closeRecentBtn: document.getElementById('closeRecentBtn'),
            clearRecentBtn: document.getElementById('clearRecentBtn'),
            emptyRecentMsg: document.getElementById('emptyRecentMsg'),
            darkModeBtn: document.getElementById('darkModeBtn'),
            chosungButtons: document.querySelectorAll('.chosung-btn'),
            syllableContainer: document.getElementById('syllableButtons'),
            resultCount: document.getElementById('resultCount'),
            activeFilters: document.getElementById('activeFilters'),
            tableBody: document.getElementById('tableBody'),
            pageNumbers: document.getElementById('pageNumbers'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn')
        };
    }

    init() {
        this.loadSettings();
        this.loadData();
        this.bindEvents();
        console.log('📚 HanjaApp Initialized');
    }

    // ==========================================
    // Data Loading & Processing
    // ==========================================

    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const rawData = await response.json();
            if (!Array.isArray(rawData) || rawData.length === 0) throw new Error('Invalid data format');

            // Clean BOM and sanitize
            const cleanData = rawData.map(item => {
                const cleanItem = {};
                for (const key in item) {
                    const cleanKey = key.replace(/^\ufeff/, '');
                    cleanItem[cleanKey] = item[key];
                }
                return cleanItem;
            });

            // Initial Sort by Hanja
            this.state.data = cleanData;
            this.state.sortedData = [...cleanData].sort((a, b) => {
                const hA = a['한자'] || '';
                const hB = b['한자'] || '';
                return hA.localeCompare(hB);
            });

            this.buildSyllableCache();
            this.updateUI();
            console.log(`✅ Loaded ${this.state.data.length} Hanja entries`);

        } catch (error) {
            console.error('Data load failed:', error);
            if (this.dom.tableBody) {
                this.dom.tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">데이터 로드 실패<br>${error.message}</td></tr>`;
            }
        }
    }

    loadSettings() {
        // Load Favorites
        try {
            const favs = localStorage.getItem('hanja-favorites');
            if (favs) this.state.favorites = new Set(JSON.parse(favs));
        } catch (e) { console.error('Favorites load error:', e); }

        // Load Recent History
        try {
            const hist = localStorage.getItem('hanja-recent-view');
            if (hist) this.state.recentHistory = JSON.parse(hist);
        } catch (e) { console.error('History load error:', e); }

        // Load Dark Mode
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
            this.updateDarkModeButton(true);
        }

        this.updateCounts();
    }

    // ==========================================
    // Event Binding
    // ==========================================

    bindEvents() {
        const d = this.dom;

        // Search
        if (d.searchInput) {
            d.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        }
        if (d.clearSearchBtn) {
            d.clearSearchBtn.addEventListener('click', () => this.clearSearch());
        }

        // Basic Filters
        if (d.educationFilter) {
            d.educationFilter.addEventListener('change', (e) => {
                this.state.filters.education = e.target.value;
                this.resetPageAndFilter();
            });
        }
        if (d.lengthFilter) {
            d.lengthFilter.addEventListener('change', (e) => {
                this.state.filters.length = e.target.value;
                this.resetPageAndFilter();
            });
        }

        // Grade Filter (Custom Dropdown)
        if (d.gradeFilterBtn) {
            d.gradeFilterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                d.gradeDropdown.classList.toggle('open');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (d.gradeDropdown && !d.gradeDropdown.contains(e.target)) {
                d.gradeDropdown.classList.remove('open');
            }

            // Recent Modal outside click
            if (d.recentModal && d.recentModal.style.display === 'flex' &&
                !d.recentModal.contains(e.target) && !d.recentViewBtn.contains(e.target)) {
                d.recentModal.style.display = 'none';
            }
        });

        if (d.gradeDropdownMenu) {
            // Checkbox changes
            d.gradeDropdownMenu.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') this.handleGradeCheckboxChange(e.target);
            });
            // Stop propagation inside menu
            d.gradeDropdownMenu.addEventListener('click', (e) => e.stopPropagation());
        }

        if (d.gradeApplyBtn) {
            d.gradeApplyBtn.addEventListener('click', () => {
                this.updateGradeButtonLabel();
                d.gradeDropdown.classList.remove('open');
                this.resetPageAndFilter();
            });
        }
        if (d.gradeResetBtn) {
            d.gradeResetBtn.addEventListener('click', () => {
                this.state.filters.grades = [];
                this.updateGradeCheckboxes();
                this.updateGradeButtonLabel();
                this.resetPageAndFilter();
            });
        }

        // Favorites
        if (d.favoritesOnlyBtn) {
            d.favoritesOnlyBtn.addEventListener('click', () => {
                this.state.filters.favoritesOnly = !this.state.filters.favoritesOnly;
                d.favoritesOnlyBtn.classList.toggle('active', this.state.filters.favoritesOnly);
                this.resetPageAndFilter();
            });
        }

        // Chosung Buttons
        d.chosungButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleChosungClick(btn));
        });

        // Event Delegation for Dynamic Elements
        // 1. Table Body (Stars, Badges, Links)
        if (d.tableBody) {
            d.tableBody.addEventListener('click', (e) => this.handleTableClick(e));
        }

        // 2. Syllable Buttons (Delegation)
        if (d.syllableContainer) {
            d.syllableContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('syllable-btn')) {
                    this.handleSyllableClick(e.target);
                }
            });
        }

        // 3. Active Filters (Remove)
        if (d.activeFilters) {
            d.activeFilters.addEventListener('click', (e) => {
                const btn = e.target.closest('.filter-chip-remove');
                if (btn) this.handleRemoveFilter(btn.dataset.filterType);
            });
        }

        // Pagination
        if (d.prevBtn) d.prevBtn.addEventListener('click', () => this.changePage(-1));
        if (d.nextBtn) d.nextBtn.addEventListener('click', () => this.changePage(1));
        if (d.pageNumbers) {
            d.pageNumbers.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const page = parseInt(e.target.dataset.page);
                    if (!isNaN(page)) this.goToPage(page);
                }
            });
        }

        // Recent History
        if (d.recentViewBtn) d.recentViewBtn.addEventListener('click', () => this.toggleRecentModal());
        if (d.closeRecentBtn) d.closeRecentBtn.addEventListener('click', () => d.recentModal.style.display = 'none');
        if (d.clearRecentBtn) d.clearRecentBtn.addEventListener('click', () => this.clearRecentHistory());
        if (d.recentList) {
            d.recentList.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.delete-recent-btn');
                if (delBtn) {
                    e.stopPropagation();
                    this.deleteRecentItem(parseInt(delBtn.dataset.index));
                }
            });
        }

        // Dark Mode
        if (d.darkModeBtn) {
            d.darkModeBtn.addEventListener('click', () => this.toggleDarkMode());
        }
    }

    // ==========================================
    // Logic: Filtering & Search
    // ==========================================

    handleSearchInput(e) {
        const val = e.target.value;
        this.dom.clearSearchBtn.style.display = val ? 'block' : 'none';
        this.state.filters.search = val.toLowerCase();

        // Debounce filter
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.resetPageAndFilter(), 300);
    }

    clearSearch() {
        this.dom.searchInput.value = '';
        this.dom.clearSearchBtn.style.display = 'none';
        this.state.filters.search = '';
        this.dom.searchInput.focus();
        this.resetPageAndFilter();
    }

    handleChosungClick(btn) {
        this.dom.chosungButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const chosung = btn.dataset.chosung;
        this.state.filters.chosung = chosung;
        this.state.filters.syllable = ''; // Reset syllable when chosung changes

        this.generateSyllableButtons(chosung);
        this.resetPageAndFilter();
    }

    generateSyllableButtons(chosung) {
        if (!chosung) {
            this.dom.syllableContainer.classList.remove('show');
            this.dom.syllableContainer.innerHTML = '';
            return;
        }

        const syllables = this.state.syllableCache[chosung] || [];
        if (syllables.length === 0) {
            this.dom.syllableContainer.innerHTML = '<div class="no-syllables-message">해당 초성 한자 없음</div>';
        } else {
            this.dom.syllableContainer.innerHTML = syllables.map(s =>
                `<button class="syllable-btn" data-syllable="${s}">${s}</button>`
            ).join('');
        }
        this.dom.syllableContainer.classList.add('show');
    }

    handleSyllableClick(btn) {
        const syllable = btn.dataset.syllable;
        const current = this.state.filters.syllable;

        const buttons = this.dom.syllableContainer.querySelectorAll('.syllable-btn');
        buttons.forEach(b => b.classList.remove('active'));

        if (current === syllable) {
            this.state.filters.syllable = '';
        } else {
            this.state.filters.syllable = syllable;
            btn.classList.add('active');
        }
        this.resetPageAndFilter();
    }

    handleGradeCheckboxChange(checkbox) {
        const val = checkbox.value;
        const isAll = checkbox.dataset.grade === 'all';
        let grades = this.state.filters.grades;

        if (isAll) {
            grades = [];
        } else {
            if (checkbox.checked) {
                if (!grades.includes(val)) grades.push(val);
            } else {
                grades = grades.filter(g => g !== val);
            }
        }
        this.state.filters.grades = grades;
        this.updateGradeCheckboxes();
    }

    updateGradeCheckboxes() {
        const checkboxes = this.dom.gradeDropdownMenu.querySelectorAll('input[type="checkbox"]');
        const grades = this.state.filters.grades;

        checkboxes.forEach(cb => {
            if (cb.dataset.grade === 'all') {
                cb.checked = grades.length === 0;
            } else {
                cb.checked = grades.includes(cb.value);
            }
        });
    }

    updateGradeButtonLabel() {
        const grades = this.state.filters.grades;
        const label = this.dom.gradeFilterBtn.querySelector('.dropdown-label');

        if (grades.length === 0) label.textContent = '전체';
        else if (grades.length === 1) label.textContent = grades[0];
        else label.textContent = `${grades[0]} 외 ${grades.length - 1}개`;
    }

    handleRemoveFilter(type) {
        if (type === 'education') {
            this.state.filters.education = '';
            this.dom.educationFilter.value = '';
        } else if (type === 'length') {
            this.state.filters.length = '';
            this.dom.lengthFilter.value = '';
        } else if (type === 'grade') {
            this.state.filters.grades = [];
            this.updateGradeCheckboxes();
            this.updateGradeButtonLabel();
        }
        this.resetPageAndFilter();
    }

    getFilteredData() {
        const { search, education, grades, length, favoritesOnly, chosung, syllable } = this.state.filters;

        return this.state.sortedData.filter(item => {
            // Null safety
            const hanja = item['한자'] || '';
            const eum = item['음'] || '';
            const huneum = item['훈음'] || '';
            const gubun = item['구분'] || '';
            const gyoyuksujun = item['교육수준'] || '';
            const geubsu = item['급수'] || '';
            const jangdaneum = item['장단음'] || '';

            // 1. Text Search
            const matchSearch = !search ||
                hanja.includes(search) ||
                eum.includes(search) ||
                huneum.includes(search);

            // 2. Dropdown Filters
            const matchEdu = !education || gyoyuksujun === education;
            const matchGrade = grades.length === 0 || grades.includes(geubsu);
            const matchLength = !length || jangdaneum === length;

            // 3. Favorites
            const isFav = this.isFavorite(huneum, gubun);
            const matchFav = !favoritesOnly || isFav;

            // 4. Chosung/Syllable
            let matchChosung = true;
            if (syllable) {
                matchChosung = eum === syllable;
            } else if (chosung) {
                matchChosung = this.normalizeChosung(this.getChosung(eum.charAt(0))) === chosung;
            }

            // 5. Filter out Ending syllables if not searching for them specificially
            const notEnding = !syllable || !gubun.includes('끝음절');

            return matchSearch && matchEdu && matchGrade && matchLength && matchFav && matchChosung && notEnding;
        });
    }

    resetPageAndFilter() {
        this.state.currentPage = 1;
        this.updateUI();
    }

    updateUI() {
        const filtered = this.getFilteredData();
        this.renderTable(filtered);
        this.renderActiveFilters();
    }

    // ==========================================
    // Logic: Data Helpers
    // ==========================================

    buildSyllableCache() {
        this.state.syllableCache = {};
        this.CHOSUNGS.forEach(chosung => {
            const syllables = new Set();
            this.state.data.forEach(item => {
                const eum = (item['음'] || '').trim();
                const gubun = item['구분'] || '';
                if (eum && !gubun.includes('끝음절')) {
                    const normalized = this.normalizeChosung(this.getChosung(eum.charAt(0)));
                    if (normalized === chosung) syllables.add(eum);
                }
            });
            this.state.syllableCache[chosung] = Array.from(syllables).sort();
        });
    }

    getChosung(char) {
        const code = char.charCodeAt(0) - 0xAC00;
        if (code < 0 || code > 11171) return null;
        const chosungIndex = Math.floor(code / 588);
        return ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'][chosungIndex];
    }

    normalizeChosung(chosung) {
        const map = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
        return map[chosung] || chosung;
    }

    // ==========================================
    // Rendering
    // ==========================================

    renderTable(data) {
        const { currentPage, itemsPerPage } = this.state;

        if (data.length === 0) {
            this.dom.tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">검색 결과가 없습니다.</td></tr>';
            this.dom.resultCount.textContent = '0개 한자';
            this.renderPagination(0);
            return;
        }

        const totalPages = Math.ceil(data.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const pageData = data.slice(start, start + itemsPerPage);

        this.dom.tableBody.innerHTML = pageData.map(item => {
            const huneum = item['훈음'] || '';
            const gubun = item['구분'] || '';
            const isFav = this.isFavorite(huneum, gubun);
            const gradeClass = this.getGradeClass(item['급수']);

            let url = item['URL'] || '';
            if (url && !url.startsWith('http')) url = '';

            return `<tr>
                <td><button class="favorite-star ${isFav ? 'active' : ''}" data-huneum="${huneum}" data-gubun="${gubun}">${isFav ? '⭐' : '☆'}</button></td>
                <td class="hanja-char">${huneum}</td>
                <td>${gubun || '-'}</td>
                <td>${item['교육수준'] || '-'}</td>
                <td><span class="grade-badge ${gradeClass}" data-action="filter-grade" data-grade="${item['급수']}">${item['급수'] || '-'}</span></td>
                <td><span class="length-badge length-${item['장단음'] || '없음'}" data-action="filter-length" data-length="${item['장단음']}">${item['장단음'] || '없음'}</span></td>
                <td>${url ? `<a href="${url}" target="_blank" class="blog-link" title="블로그 보기" aria-label="블로그 보기">🔗</a>` : '-'}</td>
            </tr>`;
        }).join('');

        this.dom.resultCount.textContent = `${new Set(data.map(i => i['한자'])).size}개 한자`;
        this.renderPagination(totalPages);
    }

    renderPagination(totalPages) {
        const { prevBtn, nextBtn, pageNumbers } = this.dom;
        const { currentPage } = this.state;

        if (totalPages === 0) {
            pageNumbers.innerHTML = '';
            prevBtn.disabled = nextBtn.disabled = true;
            return;
        }

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;

        const maxVisible = 10;
        const startPage = Math.floor((currentPage - 1) / maxVisible) * maxVisible + 1;
        const endPage = Math.min(startPage + maxVisible - 1, totalPages);

        let html = '';
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        pageNumbers.innerHTML = html;
    }

    renderActiveFilters() {
        const { education, length, grades } = this.state.filters;
        const container = this.dom.activeFilters;
        const chips = [];

        if (education) chips.push({ type: 'education', label: '교육수준', value: education });
        if (length) chips.push({ type: 'length', label: '장단음', value: length });
        if (grades.length > 0) {
            chips.push({
                type: 'grade',
                label: '급수',
                value: grades.length <= 2 ? grades.join(', ') : `${grades[0]} 외 ${grades.length - 1}개`
            });
        }

        if (chips.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = chips.map(chip =>
            `<div class="filter-chip" data-filter-type="${chip.type}">
                <span class="filter-chip-label">${chip.label}:</span> 
                <span class="filter-chip-value">${chip.value}</span> 
                <button class="filter-chip-remove" data-filter-type="${chip.type}">×</button>
            </div>`
        ).join('');
    }

    getGradeClass(geubsu) {
        if (!geubsu || geubsu === '-') return 'grade-default';
        const gradeMap = {
            '8급': 'grade-8', '준7급': 'grade-7-2', '7급': 'grade-7',
            '준6급': 'grade-6-2', '6급': 'grade-6', '준5급': 'grade-5-2',
            '5급': 'grade-5', '준4급': 'grade-4-2', '4급': 'grade-4',
            '준3급': 'grade-3-2', '3급': 'grade-3', '2급': 'grade-2',
            '1급': 'grade-1', '준특급': 'grade-special-2', '특급': 'grade-special'
        };
        return gradeMap[geubsu] || 'grade-default';
    }

    // ==========================================
    // Interaction Handlers (Delegated)
    // ==========================================

    handleTableClick(e) {
        // Favorite Star
        const star = e.target.closest('.favorite-star');
        if (star) {
            e.stopPropagation();
            this.toggleFavorite(star.dataset.huneum, star.dataset.gubun);
            return;
        }

        // Grade Badge Filter
        const gradeBadge = e.target.closest('.grade-badge[data-action="filter-grade"]');
        if (gradeBadge) {
            const val = gradeBadge.dataset.grade;
            if (val && val !== '-') {
                e.stopPropagation();
                this.state.filters.grades = [val];
                this.updateGradeCheckboxes();
                this.updateGradeButtonLabel();
                this.resetPageAndFilter();
            }
            return;
        }

        // Length Badge Filter
        const lengthBadge = e.target.closest('.length-badge[data-action="filter-length"]');
        if (lengthBadge) {
            const val = lengthBadge.dataset.length;
            if (val && val !== '없음') {
                e.stopPropagation();
                this.state.filters.length = val;
                this.dom.lengthFilter.value = val;
                this.resetPageAndFilter();
            }
            return;
        }

        // Blog Link (Recent History)
        const link = e.target.closest('.blog-link');
        if (link) {
            const url = link.getAttribute('href');
            // We need to find the full item data. 
            // Since we don't have item ID, we match by URL or Huneum in the current sorted list.
            setTimeout(() => {
                const item = this.state.data.find(d => d['URL'] === url);
                if (item) this.addToRecent(item);
            }, 0);
        }
    }

    changePage(delta) {
        this.state.currentPage += delta;
        this.updateUI();
    }

    goToPage(page) {
        this.state.currentPage = page;
        this.updateUI();
    }

    // ==========================================
    // Favorites
    // ==========================================

    toggleFavorite(huneum, gubun) {
        const key = `${huneum}|${gubun}`;
        if (this.state.favorites.has(key)) {
            this.state.favorites.delete(key);
        } else {
            this.state.favorites.add(key);
        }
        this.saveFavorites();
        this.updateCounts();

        // If viewing favorites only, refresh
        if (this.state.filters.favoritesOnly) {
            this.resetPageAndFilter();
        } else {
            // Just refresh current view to update star icons
            this.updateUI();
        }
    }

    isFavorite(huneum, gubun) {
        return this.state.favorites.has(`${huneum}|${gubun}`);
    }

    saveFavorites() {
        try {
            localStorage.setItem('hanja-favorites', JSON.stringify([...this.state.favorites]));
        } catch (e) {
            console.error('Save failed', e);
            if (e.name === 'QuotaExceededError') alert('저장 공간 부족');
        }
    }

    // ==========================================
    // Recent History
    // ==========================================

    addToRecent(item) {
        const historyItem = {
            hanja: item['한자'] || '',
            huneum: item['훈음'] || '',
            gubun: item['구분'] || '',
            url: item['URL'] || '',
            grade: item['급수'] || '',
            timestamp: Date.now()
        };

        const uniqueKey = `${historyItem.huneum}|${historyItem.gubun}`;
        this.state.recentHistory = this.state.recentHistory.filter(h => `${h.huneum}|${h.gubun}` !== uniqueKey);
        this.state.recentHistory.unshift(historyItem);

        if (this.state.recentHistory.length > this.MAX_RECENT_ITEMS) {
            this.state.recentHistory.pop();
        }

        this.saveRecentHistory();
        this.updateCounts();

        // Live update modal if open
        if (this.dom.recentModal.style.display === 'flex') {
            this.renderRecentList();
        }
    }

    saveRecentHistory() {
        try {
            localStorage.setItem('hanja-recent-view', JSON.stringify(this.state.recentHistory));
        } catch (e) { console.error('History save error', e); }
    }

    deleteRecentItem(index) {
        this.state.recentHistory.splice(index, 1);
        this.saveRecentHistory();
        this.updateCounts();
        this.renderRecentList();
    }

    clearRecentHistory() {
        if (confirm('모든 기록을 삭제하시겠습니까?')) {
            this.state.recentHistory = [];
            this.saveRecentHistory();
            this.updateCounts();
            this.renderRecentList();
        }
    }

    renderRecentList() {
        const list = this.dom.recentList;
        list.innerHTML = '';

        if (this.state.recentHistory.length === 0) {
            this.dom.emptyRecentMsg.style.display = 'block';
            return;
        }
        this.dom.emptyRecentMsg.style.display = 'none';

        this.state.recentHistory.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            const displayHanja = this.formatRecentHanja(item);

            li.innerHTML = `
                <a href="${item.url}" target="_blank" class="recent-item-link">
                    <span class="recent-hanja">${displayHanja}</span>
                    <div class="recent-info">
                        <span class="recent-huneum">${item.huneum}</span>
                        <span class="recent-detail">${item.grade} | ${item.gubun}</span>
                    </div>
                </a>
                <button class="delete-recent-btn" data-index="${index}">×</button>
            `;
            list.appendChild(li);
        });
    }

    formatRecentHanja(item) {
        const hanja = item.hanja;
        const gubun = item.gubun || '';
        const huneum = item.huneum || '';
        let sup = '';
        const match = huneum.match(/\s-\s(\d+)$/);
        if (match) sup = `<sup>${match[1]}</sup>`;

        if (gubun.includes('첫말')) return `${hanja}${sup}-`;
        if (gubun.includes('끝말') || gubun.includes('끝음절')) return `-${hanja}${sup}`;
        return `${hanja}${sup}`;
    }

    toggleRecentModal() {
        const modal = this.dom.recentModal;
        if (modal.style.display === 'none' || !modal.style.display) {
            this.renderRecentList();
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    }

    // ==========================================
    // Misc
    // ==========================================

    updateCounts() {
        if (this.dom.favoritesCount) this.dom.favoritesCount.textContent = this.state.favorites.size;
        if (this.dom.recentViewCount) this.dom.recentViewCount.textContent = this.state.recentHistory.length;
    }

    toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);
        this.updateDarkModeButton(isDark);
    }

    updateDarkModeButton(isDark) {
        if (this.dom.darkModeBtn) {
            this.dom.darkModeBtn.textContent = isDark ? '☀️' : '🌙';
            this.dom.darkModeBtn.title = isDark ? '라이트모드' : '다크모드';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const app = new HanjaApp();
    app.init();
});
