// ==========================================
//  ê°œì„ ëœ í•œìž ê²€ìƒ‰ ì• í”Œë¦¬ì¼€ì´ì…˜
// ==========================================

// HTML ì´ìŠ¤ì¼€ì´í”„ í•¨ìˆ˜ (XSS ë°©ì§€)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ë””ë°”ìš´ìŠ¤ ìœ í‹¸ë¦¬í‹°
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
//  ìƒìˆ˜ ì •ì˜
// ==========================================
const CONSTANTS = {
    GRADE_MAP: {
        '8ê¸‰': 'grade-8', 'ì¤€7ê¸‰': 'grade-7-2', '7ê¸‰': 'grade-7',
        'ì¤€6ê¸‰': 'grade-6-2', '6ê¸‰': 'grade-6', 'ì¤€5ê¸‰': 'grade-5-2',
        '5ê¸‰': 'grade-5', 'ì¤€4ê¸‰': 'grade-4-2', '4ê¸‰': 'grade-4',
        'ì¤€3ê¸‰': 'grade-3-2', '3ê¸‰': 'grade-3', '2ê¸‰': 'grade-2',
        '1ê¸‰': 'grade-1', 'ì¤€íŠ¹ê¸‰': 'grade-special-2', 'íŠ¹ê¸‰': 'grade-special'
    },
    DISPLAY_CHOSUNGS: ['ã„±', 'ã„´', 'ã„·', 'ã„¹', 'ã…', 'ã…‚', 'ã……', 'ã…‡', 'ã…ˆ', 'ã…Š', 'ã…‹', 'ã…Œ', 'ã…', 'ã…Ž']
};

// ==========================================
//  ë°ì´í„° ì²˜ë¦¬ ìœ í‹¸ë¦¬í‹°
// ==========================================
const DataUtils = {
    filterData(data, criteria) {
        const {
            searchTerm, education, length, selectedGrades,
            showOnlyFavorites, selectedChosung, selectedSyllable
        } = criteria;

        return data.filter(item => {
            const hanja = item['í•œìž'] || '';
            const eum = item['ìŒ'] || '';
            const huneum = item['í›ˆìŒ'] || '';
            const gubun = item['êµ¬ë¶„'] || '';
            const gyoyuksujun = item['êµìœ¡ìˆ˜ì¤€'] || '';
            const geubsu = item['ê¸‰ìˆ˜'] || '';
            const jangdaneum = item['ìž¥ë‹¨ìŒ'] || '';

            const matchSearch = !searchTerm ||
                hanja.includes(searchTerm) ||
                eum.includes(searchTerm) ||
                huneum.includes(searchTerm);
            const matchEducation = !education || gyoyuksujun === education;
            const matchGrade = selectedGrades.length === 0 ||
                selectedGrades.includes(geubsu);
            const matchLength = !length || jangdaneum === length;
            const matchFavorites = !showOnlyFavorites ||
                Favorites.isFavorite(huneum, gubun);

            let matchChosung = true;
            if (selectedSyllable) {
                matchChosung = eum === selectedSyllable;
            } else if (selectedChosung) {
                const normalized = HangulUtils.normalizeChosung(
                    HangulUtils.getChosung(eum.charAt(0))
                );
                matchChosung = normalized === selectedChosung;
            }

            const notEnding = !selectedSyllable || !gubun.includes('ëìŒì ˆ');

            return matchSearch && matchEducation && matchGrade &&
                matchLength && matchFavorites && matchChosung && notEnding;
        });
    },

    createRowHtml(item) {
        const huneum = item['í›ˆìŒ'] || '';
        const gubun = item['êµ¬ë¶„'] || '';
        const isFav = Favorites.isFavorite(huneum, gubun);
        const gradeClass = Renderer.getGradeClass(item['ê¸‰ìˆ˜']);

        let url = item['URL'] || '';
        if (url && !url.startsWith('http')) {
            url = '';
        }

        return `<tr>
                <td>
                    <button class="favorite-star ${isFav ? 'active' : ''}" 
                            data-huneum="${escapeHtml(huneum)}" 
                            data-gubun="${escapeHtml(gubun)}">
                        ${isFav ? 'â­' : 'â˜†'}
                    </button>
                </td>
                <td class="hanja-char">${escapeHtml(huneum)}</td>
                <td>${escapeHtml(gubun) || '-'}</td>
                <td>${escapeHtml(item['êµìœ¡ìˆ˜ì¤€']) || '-'}</td>
                <td>
                    <span class="grade-badge ${gradeClass}" 
                          data-grade="${escapeHtml(item['ê¸‰ìˆ˜'] || '')}">
                        ${escapeHtml(item['ê¸‰ìˆ˜']) || '-'}
                    </span>
                </td>
                <td>
                    <span class="length-badge length-${item['ìž¥ë‹¨ìŒ'] || 'ì—†ìŒ'}" 
                          data-length="${escapeHtml(item['ìž¥ë‹¨ìŒ'] || '')}">
                        ${escapeHtml(item['ìž¥ë‹¨ìŒ']) || 'ì—†ìŒ'}
                    </span>
                </td>
                <td>
                    ${url ? `<a href="${escapeHtml(url)}" target="_blank" 
                                class="blog-link" title="ë¸”ë¡œê·¸ ë³´ê¸°" 
                                aria-label="ë¸”ë¡œê·¸ ë³´ê¸°" 
                                rel="noopener noreferrer">ðŸ”—</a>` : '-'}
                </td>
            </tr>`;
    }
};

// ==========================================
//  ìƒíƒœ ê´€ë¦¬ ê°ì²´
// ==========================================
const AppState = {
    hanjaData: [],
    sortedHanjaData: [],
    currentPage: 1,
    itemsPerPage: 20,
    selectedChosung: '',
    selectedSyllable: '',
    favorites: new Set(),
    showOnlyFavorites: false,
    syllableCache: {},
    selectedGrades: [],
    recentHistory: [],
    MAX_RECENT_ITEMS: 30,

    // DOM ìš”ì†Œ ìºì‹œ
    elements: {},

    initElements() {
        this.elements = {
            searchInput: document.getElementById('searchInput'),
            clearSearchBtn: document.getElementById('clearSearchBtn'),
            educationFilter: document.getElementById('educationFilter'),
            lengthFilter: document.getElementById('lengthFilter'),
            gradeDropdown: document.getElementById('gradeDropdown'),
            gradeFilterBtn: document.getElementById('gradeFilterBtn'),
            gradeDropdownMenu: document.getElementById('gradeDropdownMenu'),
            tableBody: document.getElementById('tableBody'),
            resultCount: document.getElementById('resultCount'),
            pageNumbers: document.getElementById('pageNumbers'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            favoritesOnlyBtn: document.getElementById('favoritesOnlyBtn'),
            favoritesCount: document.getElementById('favoritesCount'),
            darkModeBtn: document.getElementById('darkModeBtn'),
            syllableButtons: document.getElementById('syllableButtons'),
            activeFilters: document.getElementById('activeFilters'),
            recentModal: document.getElementById('recentModal'),
            recentList: document.getElementById('recentList'),
            recentViewBtn: document.getElementById('recentViewBtn'),
            recentViewCount: document.getElementById('recentViewCount')
        };
    }
};

// ==========================================
//  localStorage ì•ˆì „ ëž˜í¼
// ==========================================
const Storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Storage get error for ${key}:`, error);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Storage set error for ${key}:`, error);
            if (error.name === 'QuotaExceededError') {
                alert('ì €ìž¥ ê³µê°„ì´ ë¶€ì¡±í•©ë‹ˆë‹¤.');
            }
            return false;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Storage remove error for ${key}:`, error);
            return false;
        }
    }
};

// ==========================================
//  ì¦ê²¨ì°¾ê¸° ê´€ë¦¬
// ==========================================
const Favorites = {
    load() {
        const saved = Storage.get('hanja-favorites', []);
        AppState.favorites = new Set(saved);
        this.updateCount();
    },

    save() {
        const favArray = Array.from(AppState.favorites);
        Storage.set('hanja-favorites', favArray);
        this.updateCount();
    },

    toggle(huneum, gubun) {
        const uniqueKey = `${huneum}|${gubun}`;
        if (AppState.favorites.has(uniqueKey)) {
            AppState.favorites.delete(uniqueKey);
        } else {
            AppState.favorites.add(uniqueKey);
        }
        this.save();
        Filter.applyAndRender();
    },

    isFavorite(huneum, gubun) {
        return AppState.favorites.has(`${huneum}|${gubun}`);
    },

    updateCount() {
        if (AppState.elements.favoritesCount) {
            AppState.elements.favoritesCount.textContent = AppState.favorites.size;
        }
    },

    toggleFilter() {
        AppState.showOnlyFavorites = !AppState.showOnlyFavorites;
        const btn = AppState.elements.favoritesOnlyBtn;
        if (btn) {
            btn.classList.toggle('active', AppState.showOnlyFavorites);
        }
        Filter.applyAndReset();
    }
};

// ==========================================
//  ë‹¤í¬ëª¨ë“œ ê´€ë¦¬
// ==========================================
const DarkMode = {
    load() {
        const isDark = Storage.get('darkMode', false);
        if (isDark) {
            document.body.classList.add('dark-mode');
        }
        this.updateButton(isDark);
    },

    toggle() {
        const isDark = document.body.classList.toggle('dark-mode');
        Storage.set('darkMode', isDark);
        this.updateButton(isDark);
    },

    updateButton(isDark) {
        const btn = AppState.elements.darkModeBtn;
        if (btn) {
            btn.textContent = isDark ? 'â˜€ï¸' : 'ðŸŒ™';
            btn.title = isDark ? 'ë¼ì´íŠ¸ëª¨ë“œë¡œ ì „í™˜' : 'ë‹¤í¬ëª¨ë“œë¡œ ì „í™˜';
        }
    }
};

// ==========================================
//  ìµœê·¼ ë³¸ í•œìž ê´€ë¦¬
// ==========================================
const RecentView = {
    load() {
        AppState.recentHistory = Storage.get('hanja-recent-view', []);
        this.updateCount();
    },

    save() {
        Storage.set('hanja-recent-view', AppState.recentHistory);
        this.updateCount();
        if (AppState.elements.recentModal?.style.display === 'flex') {
            this.render();
        }
    },

    add(item) {
        if (!item) return;

        const historyItem = {
            hanja: item['í•œìž'] || '',
            huneum: item['í›ˆìŒ'] || '',
            gubun: item['êµ¬ë¶„'] || '',
            url: item['URL'] || '',
            grade: item['ê¸‰ìˆ˜'] || '',
            timestamp: Date.now()
        };

        // ì¤‘ë³µ ì œê±°
        const uniqueKey = `${historyItem.huneum}|${historyItem.gubun}`;
        AppState.recentHistory = AppState.recentHistory.filter(
            h => `${h.huneum}|${h.gubun}` !== uniqueKey
        );

        // ë§¨ ì•žì— ì¶”ê°€
        AppState.recentHistory.unshift(historyItem);

        // ìµœëŒ€ ê°œìˆ˜ ì œí•œ
        if (AppState.recentHistory.length > AppState.MAX_RECENT_ITEMS) {
            AppState.recentHistory = AppState.recentHistory.slice(0, AppState.MAX_RECENT_ITEMS);
        }

        this.save();
    },

    delete(index, event) {
        if (event) event.stopPropagation();
        AppState.recentHistory.splice(index, 1);
        this.save();
    },

    clear() {
        if (AppState.recentHistory.length === 0) return;
        if (confirm('ìµœê·¼ ë³¸ í•œìž ê¸°ë¡ì„ ëª¨ë‘ ì‚­ì œí•˜ì‹œê² ìŠµë‹ˆê¹Œ?')) {
            AppState.recentHistory = [];
            this.save();
            this.render();
        }
    },

    toggleModal() {
        const modal = AppState.elements.recentModal;
        if (!modal) return;

        if (modal.style.display === 'none' || !modal.style.display) {
            this.render();
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    },

    formatHanja(item) {
        const hanja = escapeHtml(item.hanja);
        const gubun = item.gubun || '';
        const huneum = item.huneum || '';

        let sup = '';
        const match = huneum.match(/\s-\s(\d+)$/);
        if (match) {
            sup = `<sup>${escapeHtml(match[1])}</sup>`;
        }

        if (gubun.includes('ì²«ë§')) {
            return `${hanja}${sup}-`;
        } else if (gubun.includes('ëë§') || gubun.includes('ëìŒì ˆ')) {
            return `-${hanja}${sup}`;
        } else {
            return `${hanja}${sup}`;
        }
    },

    render() {
        const list = AppState.elements.recentList;
        const emptyMsg = document.getElementById('emptyRecentMsg');

        if (!list) return;

        list.innerHTML = '';

        if (AppState.recentHistory.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            return;
        }

        if (emptyMsg) emptyMsg.style.display = 'none';

        AppState.recentHistory.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            const displayHanja = this.formatHanja(item);

            li.innerHTML = `
                <a href="${escapeHtml(item.url)}" target="_blank" class="recent-item-link" 
                   title="ìƒˆ íƒ­ì—ì„œ ë³´ê¸°" rel="noopener noreferrer">
                    <span class="recent-hanja">${displayHanja}</span>
                    <div class="recent-info">
                        <span class="recent-huneum">${escapeHtml(item.huneum)}</span>
                        <span class="recent-detail">${escapeHtml(item.grade)} | ${escapeHtml(item.gubun)}</span>
                    </div>
                </a>
                <button class="delete-recent-btn" data-index="${index}" 
                        aria-label="ì‚­ì œ" title="ê¸°ë¡ì—ì„œ ì‚­ì œ">Ã—</button>
            `;

            list.appendChild(li);
        });
    },

    updateCount() {
        if (AppState.elements.recentViewCount) {
            AppState.elements.recentViewCount.textContent = AppState.recentHistory.length;
        }
    }
};

// ==========================================
//  í•œê¸€ ì²˜ë¦¬ ìœ í‹¸ë¦¬í‹°
// ==========================================
const HangulUtils = {
    getChosung(char) {
        const code = char.charCodeAt(0) - 0xAC00;
        if (code < 0 || code > 11171) return null;
        const chosungIndex = Math.floor(code / 588);
        const chosungs = ['ã„±', 'ã„²', 'ã„´', 'ã„·', 'ã„¸', 'ã„¹', 'ã…', 'ã…‚', 'ã…ƒ', 'ã……', 'ã…†', 'ã…‡', 'ã…ˆ', 'ã…‰', 'ã…Š', 'ã…‹', 'ã…Œ', 'ã…', 'ã…Ž'];
        return chosungs[chosungIndex];
    },

    normalizeChosung(chosung) {
        const map = { 'ã„²': 'ã„±', 'ã„¸': 'ã„·', 'ã…ƒ': 'ã…‚', 'ã…†': 'ã……', 'ã…‰': 'ã…ˆ' };
        return map[chosung] || chosung;
    }
};

// ==========================================
//  í•„í„°ë§ ë¡œì§
// ==========================================
const Filter = {
    applyAndReset() {
        AppState.currentPage = 1;
        this.applyAndRender();
    },

    applyAndRender() {
        const criteria = {
            searchTerm: AppState.elements.searchInput.value.toLowerCase(),
            education: AppState.elements.educationFilter.value,
            length: AppState.elements.lengthFilter.value,
            selectedGrades: AppState.selectedGrades,
            showOnlyFavorites: AppState.showOnlyFavorites,
            selectedChosung: AppState.selectedChosung,
            selectedSyllable: AppState.selectedSyllable
        };

        const filtered = DataUtils.filterData(AppState.sortedHanjaData, criteria);

        Renderer.displayData(filtered);
        this.updateActiveFiltersDisplay();
    },

    updateActiveFiltersDisplay() {
        const container = AppState.elements.activeFilters;
        if (!container) return;

        const chips = [];

        if (AppState.elements.educationFilter.value) {
            chips.push({
                type: 'education',
                label: 'êµìœ¡ìˆ˜ì¤€',
                value: AppState.elements.educationFilter.value
            });
        }

        if (AppState.elements.lengthFilter.value) {
            chips.push({
                type: 'length',
                label: 'ìž¥ë‹¨ìŒ',
                value: AppState.elements.lengthFilter.value
            });
        }

        if (AppState.selectedGrades.length > 0) {
            chips.push({
                type: 'grade',
                label: 'ê¸‰ìˆ˜',
                value: AppState.selectedGrades.length <= 2
                    ? AppState.selectedGrades.join(', ')
                    : `${AppState.selectedGrades[0]} ì™¸ ${AppState.selectedGrades.length - 1}ê°œ`
            });
        }

        if (chips.length === 0) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = chips.map(chip => `
            <div class="filter-chip" data-filter-type="${chip.type}">
                <span class="filter-chip-label">${escapeHtml(chip.label)}:</span>
                <span class="filter-chip-value">${escapeHtml(chip.value)}</span>
                <button class="filter-chip-remove" data-filter-type="${chip.type}">Ã—</button>
            </div>
        `).join('');
    }
};

// ==========================================
//  ë Œë”ë§
// ==========================================
const Renderer = {
    getGradeClass(geubsu) {
        if (!geubsu || geubsu === '-') return 'grade-default';
        return CONSTANTS.GRADE_MAP[geubsu] || 'grade-default';
    },

    displayData(data) {
        const tbody = AppState.elements.tableBody;
        const resultCount = AppState.elements.resultCount;

        if (!tbody || !resultCount) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">ê²€ìƒ‰ ê²°ê³¼ê°€ ì—†ìŠµë‹ˆë‹¤.</td></tr>';
            resultCount.textContent = '0ê°œ í•œìž';
            this.updatePagination(0);
            return;
        }

        const totalPages = Math.ceil(data.length / AppState.itemsPerPage);
        const start = (AppState.currentPage - 1) * AppState.itemsPerPage;
        const pageData = data.slice(start, start + AppState.itemsPerPage);

        tbody.innerHTML = pageData.map(item => DataUtils.createRowHtml(item)).join('');

        resultCount.textContent = `${new Set(data.map(i => i['í•œìž'])).size}ê°œ í•œìž`;
        this.updatePagination(totalPages);
    },

    updatePagination(totalPages) {
        const pageNumbers = AppState.elements.pageNumbers;
        const prevBtn = AppState.elements.prevBtn;
        const nextBtn = AppState.elements.nextBtn;

        if (!pageNumbers || !prevBtn || !nextBtn) return;

        if (totalPages === 0) {
            pageNumbers.innerHTML = '';
            prevBtn.disabled = nextBtn.disabled = true;
            return;
        }

        prevBtn.disabled = AppState.currentPage === 1;
        nextBtn.disabled = AppState.currentPage === totalPages;

        const maxVisible = 10;
        const startPage = Math.floor((AppState.currentPage - 1) / maxVisible) * maxVisible + 1;
        const endPage = Math.min(startPage + maxVisible - 1, totalPages);

        let html = '';
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === AppState.currentPage ? 'active' : ''}" 
                             data-page="${i}">${i}</button>`;
        }
        pageNumbers.innerHTML = html;
    }
};

// ==========================================
//  ì´ˆì„± í•„í„°
// ==========================================
const ChosungFilter = {
    init() {
        this.buildSyllableCache();

        document.querySelectorAll('.chosung-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.chosung-btn').forEach(b =>
                    b.classList.remove('active')
                );
                e.target.classList.add('active');
                AppState.selectedChosung = e.target.dataset.chosung;
                AppState.selectedSyllable = '';

                if (AppState.selectedChosung === '') {
                    AppState.elements.syllableButtons.classList.remove('show');
                    AppState.elements.syllableButtons.innerHTML = '';
                } else {
                    this.generateSyllableButtons(AppState.selectedChosung);
                }
                Filter.applyAndReset();
            });
        });
    },

    buildSyllableCache() {
        AppState.syllableCache = {};
        const chosungs = CONSTANTS.DISPLAY_CHOSUNGS;

        chosungs.forEach(chosung => {
            const syllables = new Set();
            AppState.hanjaData.forEach(item => {
                const eum = (item['ìŒ'] || '').trim();
                const gubun = item['êµ¬ë¶„'] || '';

                if (eum && !gubun.includes('ëìŒì ˆ')) {
                    const normalized = HangulUtils.normalizeChosung(
                        HangulUtils.getChosung(eum.charAt(0))
                    );
                    if (normalized === chosung) {
                        syllables.add(eum);
                    }
                }
            });
            AppState.syllableCache[chosung] = Array.from(syllables).sort();
        });
    },

    generateSyllableButtons(chosung) {
        const container = AppState.elements.syllableButtons;
        const syllables = AppState.syllableCache[chosung] || [];

        if (syllables.length === 0) {
            container.innerHTML = '<div class="no-syllables-message">í•´ë‹¹ ì´ˆì„± í•œìž ì—†ìŒ</div>';
        } else {
            container.innerHTML = syllables.map(s =>
                `<button class="syllable-btn" data-syllable="${escapeHtml(s)}">${escapeHtml(s)}</button>`
            ).join('');
        }
        container.classList.add('show');

        // ì´ë²¤íŠ¸ ìœ„ìž„ ì‚¬ìš© (ë©”ëª¨ë¦¬ ëˆ„ìˆ˜ ë°©ì§€)
        container.querySelectorAll('.syllable-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.syllable-btn').forEach(b =>
                    b.classList.remove('active')
                );

                if (AppState.selectedSyllable === e.target.dataset.syllable) {
                    AppState.selectedSyllable = '';
                } else {
                    AppState.selectedSyllable = e.target.dataset.syllable;
                    e.target.classList.add('active');
                }
                Filter.applyAndReset();
            });
        });
    }
};

// ==========================================
//  ê¸‰ìˆ˜ í•„í„°
// ==========================================
const GradeFilter = {
    init() {
        const btn = AppState.elements.gradeFilterBtn;
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                AppState.elements.gradeDropdown.classList.toggle('open');
            });
        }

        document.addEventListener('click', (e) => {
            if (!AppState.elements.gradeDropdown.contains(e.target)) {
                AppState.elements.gradeDropdown.classList.remove('open');
            }
        });

        AppState.elements.gradeDropdownMenu?.addEventListener('click', (e) =>
            e.stopPropagation()
        );

        AppState.elements.gradeDropdownMenu?.addEventListener('change', (e) => {
            if (e.target.type !== 'checkbox') return;
            const val = e.target.value;

            if (e.target.dataset.grade === 'all') {
                AppState.selectedGrades = [];
            } else {
                if (e.target.checked) {
                    if (!AppState.selectedGrades.includes(val)) {
                        AppState.selectedGrades.push(val);
                    }
                } else {
                    AppState.selectedGrades = AppState.selectedGrades.filter(g => g !== val);
                }
            }
            this.updateCheckboxes();
        });

        document.getElementById('gradeApplyBtn')?.addEventListener('click', () => {
            this.updateButtonLabel();
            AppState.elements.gradeDropdown.classList.remove('open');
            Filter.applyAndReset();
        });

        document.getElementById('gradeResetBtn')?.addEventListener('click', () => {
            AppState.selectedGrades = [];
            this.updateCheckboxes();
            this.updateButtonLabel();
            Filter.applyAndReset();
        });

        this.updateButtonLabel();
    },

    updateButtonLabel() {
        const label = document.querySelector('#gradeFilterBtn .dropdown-label');
        if (!label) return;

        if (AppState.selectedGrades.length === 0) {
            label.textContent = 'ì „ì²´';
        } else if (AppState.selectedGrades.length === 1) {
            label.textContent = AppState.selectedGrades[0];
        } else {
            label.textContent = `${AppState.selectedGrades[0]} ì™¸ ${AppState.selectedGrades.length - 1}ê°œ`;
        }
    },

    updateCheckboxes() {
        AppState.elements.gradeDropdownMenu?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.dataset.grade === 'all') {
                cb.checked = AppState.selectedGrades.length === 0;
            } else {
                cb.checked = AppState.selectedGrades.includes(cb.value);
            }
        });
    }
};

// ==========================================
//  ì´ë²¤íŠ¸ í•¸ë“¤ëŸ¬ ë“±ë¡
// ==========================================
const EventHandlers = {
    init() {
        // ê²€ìƒ‰
        const debouncedFilter = debounce(() => Filter.applyAndReset(), 300);
        AppState.elements.searchInput?.addEventListener('input', (e) => {
            AppState.elements.clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
            debouncedFilter();
        });

        AppState.elements.clearSearchBtn?.addEventListener('click', () => {
            AppState.elements.searchInput.value = '';
            AppState.elements.clearSearchBtn.style.display = 'none';
            AppState.elements.searchInput.focus();
            Filter.applyAndReset();
        });

        // í•„í„°
        AppState.elements.educationFilter?.addEventListener('change', () => Filter.applyAndReset());
        AppState.elements.lengthFilter?.addEventListener('change', () => Filter.applyAndReset());

        // ì¦ê²¨ì°¾ê¸°
        AppState.elements.favoritesOnlyBtn?.addEventListener('click', () => Favorites.toggleFilter());

        // ë‹¤í¬ëª¨ë“œ
        AppState.elements.darkModeBtn?.addEventListener('click', () => DarkMode.toggle());

        // ìµœê·¼ ë³¸ í•œìž
        AppState.elements.recentViewBtn?.addEventListener('click', () => RecentView.toggleModal());
        document.getElementById('closeRecentBtn')?.addEventListener('click', () => {
            AppState.elements.recentModal.style.display = 'none';
        });
        document.getElementById('clearRecentBtn')?.addEventListener('click', () => RecentView.clear());

        // íŽ˜ì´ì§€ë„¤ì´ì…˜
        AppState.elements.pageNumbers?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.dataset.page) {
                AppState.currentPage = parseInt(btn.dataset.page);
                Filter.applyAndRender();
            }
        });

        AppState.elements.prevBtn?.addEventListener('click', () => {
            if (AppState.currentPage > 1) {
                AppState.currentPage--;
                Filter.applyAndRender();
            }
        });

        AppState.elements.nextBtn?.addEventListener('click', () => {
            AppState.currentPage++;
            Filter.applyAndRender();
        });

        // ì´ë²¤íŠ¸ ìœ„ìž„: ì¦ê²¨ì°¾ê¸° ë²„íŠ¼
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.favorite-star');
            if (btn) {
                e.stopPropagation();
                Favorites.toggle(btn.dataset.huneum, btn.dataset.gubun);
            }
        });

        // ì´ë²¤íŠ¸ ìœ„ìž„: ê¸‰ìˆ˜ ë°°ì§€ í´ë¦­
        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.grade-badge');
            if (badge) {
                const gradeValue = badge.dataset.grade;
                if (gradeValue && gradeValue !== '-') {
                    e.stopPropagation();
                    AppState.selectedGrades = [gradeValue];
                    GradeFilter.updateCheckboxes();
                    GradeFilter.updateButtonLabel();
                    Filter.applyAndReset();
                }
            }
        });

        // ì´ë²¤íŠ¸ ìœ„ìž„: ìž¥ë‹¨ìŒ ë°°ì§€ í´ë¦­
        document.addEventListener('click', (e) => {
            const badge = e.target.closest('.length-badge');
            if (badge) {
                const lengthValue = badge.dataset.length;
                if (lengthValue && lengthValue !== 'ì—†ìŒ') {
                    e.stopPropagation();
                    AppState.elements.lengthFilter.value = lengthValue;
                    Filter.applyAndReset();
                }
            }
        });

        // ì´ë²¤íŠ¸ ìœ„ìž„: í•„í„° ì¹© ì œê±°
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-chip-remove');
            if (btn) {
                e.stopPropagation();
                const type = btn.dataset.filterType;
                if (type === 'education') AppState.elements.educationFilter.value = '';
                if (type === 'length') AppState.elements.lengthFilter.value = '';
                if (type === 'grade') {
                    AppState.selectedGrades = [];
                    GradeFilter.updateCheckboxes();
                    GradeFilter.updateButtonLabel();
                }
                Filter.applyAndReset();
            }
        });

        // ì´ë²¤íŠ¸ ìœ„ìž„: ìµœê·¼ ë³¸ í•œìž ì‚­ì œ
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.delete-recent-btn');
            if (btn) {
                const index = parseInt(btn.dataset.index);
                RecentView.delete(index, e);
            }
        });

        // ì´ë²¤íŠ¸ ìœ„ìž„: ë¸”ë¡œê·¸ ë§í¬ í´ë¦­ (ìµœê·¼ ê¸°ë¡ ì¶”ê°€)
        AppState.elements.tableBody?.addEventListener('click', (e) => {
            const linkBtn = e.target.closest('.blog-link');
            if (linkBtn) {
                const targetUrl = linkBtn.getAttribute('href');
                setTimeout(() => {
                    const item = AppState.sortedHanjaData.find(d => d['URL'] === targetUrl);
                    if (item) {
                        RecentView.add(item);
                    }
                }, 0);
            }
        });

        // ëª¨ë‹¬ ì™¸ë¶€ í´ë¦­ ì‹œ ë‹«ê¸°
        document.addEventListener('click', (e) => {
            const modal = AppState.elements.recentModal;
            if (modal && modal.style.display === 'flex' &&
                !modal.contains(e.target) &&
                !AppState.elements.recentViewBtn.contains(e.target)) {
                modal.style.display = 'none';
            }
        });

        // í‚¤ë³´ë“œ ì ‘ê·¼ì„±: ESCë¡œ ëª¨ë‹¬ ë‹«ê¸°
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = AppState.elements.recentModal;
                if (modal && modal.style.display === 'flex') {
                    modal.style.display = 'none';
                }
                if (AppState.elements.gradeDropdown.classList.contains('open')) {
                    AppState.elements.gradeDropdown.classList.remove('open');
                }
            }
        });
    }
};

// ==========================================
//  ë°ì´í„° ë¡œë“œ ë° ì´ˆê¸°í™”
// ==========================================
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('ìœ íš¨í•˜ì§€ ì•Šì€ ë°ì´í„° í˜•ì‹');
        }

        // BOM ì œê±° ë° ë°ì´í„° ì •ì œ
        AppState.hanjaData = data.map(item => {
            const cleanItem = {};
            for (const key in item) {
                const cleanKey = key.replace(/^\ufeff/, '');
                cleanItem[cleanKey] = item[key];
            }
            return cleanItem;
        });

        // ì •ë ¬ëœ ë°ì´í„° ìƒì„±
        AppState.sortedHanjaData = [...AppState.hanjaData].sort((a, b) => {
            const hanjaA = a['í•œìž'] || '';
            const hanjaB = b['í•œìž'] || '';
            return hanjaA.localeCompare(hanjaB);
        });

        console.log(`âœ… ${AppState.hanjaData.length}ê°œì˜ í•œìž ë°ì´í„° ë¡œë“œ ì™„ë£Œ`);
        return true;
    } catch (error) {
        console.error('ë°ì´í„° ë¡œë“œ ì‹¤íŒ¨:', error);
        if (AppState.elements.tableBody) {
            AppState.elements.tableBody.innerHTML =
                `<tr><td colspan="7" style="text-align:center;padding:40px;">
                    ë°ì´í„° ë¡œë“œ ì‹¤íŒ¨<br>${escapeHtml(error.message)}
                </td></tr>`;
        }
        return false;
    }
}

// ==========================================
//  ë©”ì¸ ì´ˆê¸°í™”
// ==========================================
async function init() {
    // DOM ìš”ì†Œ ìºì‹œ
    AppState.initElements();

    // ë°ì´í„° ë¡œë“œ
    const success = await loadData();
    if (!success) return;

    // ì €ìž¥ëœ ì„¤ì • ë¡œë“œ
    Favorites.load();
    DarkMode.load();
    RecentView.load();

    // í•„í„° ë° UI ì´ˆê¸°í™”
    ChosungFilter.init();
    GradeFilter.init();
    EventHandlers.init();

    // ì´ˆê¸° ë°ì´í„° í‘œì‹œ
    Renderer.displayData(AppState.sortedHanjaData);
}

// DOM ë¡œë“œ ì™„ë£Œ í›„ ì´ˆê¸°í™”
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
