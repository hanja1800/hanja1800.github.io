/**
 * HanjaApp - Educational Hanja Search Application
 * Refactored for efficiency and maintainability
 */

// 급수별 CSS 클래스 매핑 (Moved to common.js)

class HanjaApp {
    constructor() {
        // Application State
        this.state = {
            data: [],
            sortedData: [],
            dataMap: new Map(), // ID 조회를 위한 Map
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
            syllableCache: {}
        };

        // Managers
        this.darkModeManager = new DarkModeManager();
        this.favoritesManager = new FavoritesManager();
        this.recentManager = new RecentHistoryManager();

        // Constants
        this.MAX_RECENT_ITEMS = 30;
        this.CHOSUNGS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

        // Cache DOM Elements
        this.dom = {
            loadingMsg: document.getElementById('loadingMsg'),
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
        // this.loadSettings(); // Managed by Managers now
        this.loadData();
        this.bindEvents();
        console.log('📚 HanjaApp Initialized');
    }

    // ==========================================
    // Data Loading & Processing
    // ==========================================

    async loadData() {
        if (this.dom.loadingMsg) this.dom.loadingMsg.style.display = 'block';

        try {
            // 1. 청크 메타데이터 가져오기
            const metaResponse = await fetch('chunks_metadata.json');
            if (!metaResponse.ok) throw new Error('메타데이터 로드 실패');
            const { total_chunks } = await metaResponse.json();

            const fetchPromises = [];

            // 2. 모든 조각 파일(.bin)을 병렬로 요청
            for (let i = 0; i < total_chunks; i++) {
                fetchPromises.push(
                    fetch(`./data_chunks/c_${i}.bin`)
                        .then(res => {
                            if (!res.ok) throw new Error(`조각 ${i} 로드 실패`);
                            return res.text();
                        })
                        .then(encoded => {
                            // Base64 디코딩 후 JSON 파싱
                            return JSON.parse(atob(encoded));
                        })
                );
            }

            // 3. 모든 조각 합치기
            const chunks = await Promise.all(fetchPromises);
            const data = [].concat(...chunks);

            if (!Array.isArray(data) || data.length === 0) throw new Error('데이터 형식이 올바르지 않습니다.');

            // 4. 상태 업데이트
            this.state.data = data;

            // 5. 검색용 데이터 가나다순 정렬
            this.state.sortedData = [...data].sort((a, b) => {
                const soundA = a.sound || '';
                const soundB = b.sound || '';
                if (soundA === soundB) {
                    return (a.hanja || '').localeCompare(b.hanja || '');
                }
                return soundA.localeCompare(soundB, 'ko');
            });

            // 6. Map 생성 (ID 기준)
            this.state.dataMap = new Map(data.map(item => [item.id, item]));

            this.buildSyllableCache();
            this.updateUI();
            console.log(`✅ Loaded ${this.state.data.length} Hanja entries from chunks`);

        } catch (error) {
            console.error('Data load failed:', error);
            if (this.dom.tableBody) {
                this.dom.tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">데이터 로드 실패<br>${error.message}</td></tr>`;
            }
        } finally {
            if (this.dom.loadingMsg) this.dom.loadingMsg.style.display = 'none';
        }
    }


    // loadSettings removed - handled by Managers

    // ==========================================
    // Event Binding
    // ==========================================

    bindEvents() {
        const d = this.dom;

        // Search
        if (d.searchInput) d.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        if (d.clearSearchBtn) d.clearSearchBtn.addEventListener('click', () => this.clearSearch());

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

        // Grade Filter
        if (d.gradeFilterBtn) {
            d.gradeFilterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                d.gradeDropdown.classList.toggle('open');
            });
        }

        document.addEventListener('click', (e) => {
            if (d.gradeDropdown && !d.gradeDropdown.contains(e.target)) {
                d.gradeDropdown.classList.remove('open');
            }
            // Recent Modal outside click handled by Manager
        });

        if (d.gradeDropdownMenu) {
            d.gradeDropdownMenu.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') this.handleGradeCheckboxChange(e.target);
            });
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

        // Chosung
        d.chosungButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleChosungClick(btn));
        });

        // Table & Syllable
        if (d.tableBody) d.tableBody.addEventListener('click', (e) => this.handleTableClick(e));
        if (d.syllableContainer) {
            d.syllableContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('syllable-btn')) {
                    this.handleSyllableClick(e.target);
                }
            });
        }
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

        // Recent & Dark Mode events handled by Managers
    }

    // ==========================================
    // Logic: Filtering & Search
    // ==========================================

    handleSearchInput(e) {
        const val = e.target.value;
        this.dom.clearSearchBtn.style.display = val ? 'block' : 'none';
        this.state.filters.search = val.toLowerCase();
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
        this.state.filters.syllable = '';
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
            const hanja = item.hanja || '';
            const eum = item.sound || '';
            const huneum = item.huneum || '';
            const gubun = item.gubun || '';
            const gyoyuksujun = item.edu_level || '';
            const geubsu = item.grade || '';
            const jangdaneum = item.length || '';

            // FIXED: Normalize search to handle Compatibility Jamo (e.g. 令 U+F968 vs 令 U+4EE4)
            const normalizedSearch = search.normalize('NFKC');
            const normalizedHanja = item.hanja || '';

            const matchSearch = !search ||
                normalizedHanja.includes(normalizedSearch) ||
                eum.includes(search) ||
                huneum.includes(search);

            const matchEdu = !education || gyoyuksujun === education;
            const matchGrade = grades.length === 0 || grades.includes(geubsu);
            const matchLength = !length || jangdaneum === length;
            // FIXED: Use ID for favorite check
            const isFav = this.isFavorite(item.id);
            const matchFav = !favoritesOnly || isFav;

            let matchChosung = true;
            if (syllable) {
                matchChosung = eum === syllable;
            } else if (chosung) {
                matchChosung = this.normalizeChosung(this.getChosung(eum.charAt(0))) === chosung;
            }

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

    // ==========================================
    // Logic: Data Helpers
    // ==========================================

    buildSyllableCache() {
        this.state.syllableCache = {};
        this.CHOSUNGS.forEach(chosung => {
            const syllables = new Set();
            this.state.data.forEach(item => {
                const eum = (item.sound || '').trim();
                const gubun = item.gubun || '';
                // '끝말' logic: originally excluded ending sounds from "syllable" filter?
                // Let's keep it consistent.
                if (eum && (!gubun || !gubun.includes('끝음절'))) {
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

        // Count UNIQUE Hanja characters for the count display
        const uniqueHanjaCount = new Set(data.map(item => item.hanja)).size;

        if (data.length === 0) {
            this.dom.tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">검색 결과가 없습니다.</td></tr>';
            this.dom.resultCount.textContent = '0개 한자';
            this.renderPagination(0);
            return;
        }

        const totalPages = Math.ceil(data.length / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const pageItems = data.slice(start, start + itemsPerPage);

        this.dom.tableBody.innerHTML = pageItems.map(item => {
            const isFav = this.isFavorite(item.id);
            return renderHanjaRow(item, isFav);
        }).join('');

        // Display UNIQUE Hanja count
        this.dom.resultCount.textContent = `${uniqueHanjaCount}개 한자`;
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

    // getGradeClass(geubsu) removed - using global from common.js

    // ==========================================
    // Interaction Handlers
    // ==========================================

    handleTableClick(e) {
        const star = e.target.closest('.favorite-star');
        if (star) {
            e.stopPropagation();
            this.toggleFavorite(parseInt(star.dataset.id));
            return;
        }
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
        const link = e.target.closest('.blog-link');
        if (link) {
            // ID lookup
            const targetId = parseInt(link.dataset.id);
            setTimeout(() => {
                const item = this.state.dataMap.get(targetId);
                if (item) this.recentManager.add(item);
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

    toggleFavorite(id) {
        this.favoritesManager.toggle(id);
        if (this.state.filters.favoritesOnly) {
            this.resetPageAndFilter();
        } else {
            this.updateUI();
        }
    }

    isFavorite(id) { return this.favoritesManager.has(id); }

    // Helper for clearing data (optional, logic moved to common.js)
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new HanjaApp();
    app.init();
});

