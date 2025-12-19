/**
 * Common Logic for Hanja App
 * Shared managers for Storage, Favorites, Recent History, and Dark Mode.
 */

// ==========================================
// UI & Formatting Constants
// ==========================================
// 급수별 CSS 클래스 매핑
const GRADE_CLASS_MAP = {
    '8급': 'grade-8', '준7급': 'grade-7-2', '7급': 'grade-7',
    '준6급': 'grade-6-2', '6급': 'grade-6', '준5급': 'grade-5-2',
    '5급': 'grade-5', '준4급': 'grade-4-2', '4급': 'grade-4',
    '준3급': 'grade-3-2', '3급': 'grade-3', '2급': 'grade-2',
    '1급': 'grade-1', '준특급': 'grade-special-2', '특급': 'grade-special'
};

// ==========================================
// Storage Manager
// ==========================================
const StorageManager = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Error getting ${key} from storage:`, e);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Error setting ${key} to storage:`, e);
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`Error removing ${key} from storage:`, e);
        }
    }
};

// ==========================================
// Dark Mode Manager
// ==========================================
class DarkModeManager {
    constructor(buttonId = 'darkModeBtn', storageKey = 'darkMode') {
        this.button = document.getElementById(buttonId);
        this.storageKey = storageKey;
        this.init();
    }

    init() {
        const isDark = localStorage.getItem(this.storageKey) === 'true';
        if (isDark) {
            document.body.classList.add('dark-mode');
        }
        this.updateButton(isDark);

        if (this.button) {
            this.button.addEventListener('click', () => this.toggle());
        }
    }

    toggle() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem(this.storageKey, isDark);
        this.updateButton(isDark);
    }

    updateButton(isDark) {
        if (this.button) {
            this.button.textContent = isDark ? '☀️' : '🌙';
            this.button.title = isDark ? '라이트모드' : '다크모드';
        }
    }
}

// ==========================================
// Favorites Manager
// ==========================================
class FavoritesManager {
    constructor(storageKey = 'hanja-favorites', countElementId = 'favoritesCount') {
        this.storageKey = storageKey;
        this.countElement = document.getElementById(countElementId);
        this.favorites = new Set(StorageManager.get(this.storageKey, []));
        this.updateCount(); // Sync count on init
    }

    toggle(id) {
        if (this.favorites.has(id)) {
            this.favorites.delete(id);
        } else {
            this.favorites.add(id);
        }
        this.save();
        this.updateCount();
        return this.favorites.has(id);
    }

    has(id) {
        return this.favorites.has(id);
    }

    save() {
        // Save as array of IDs
        StorageManager.set(this.storageKey, [...this.favorites]);
    }

    updateCount() {
        if (this.countElement) {
            this.countElement.textContent = this.favorites.size;
        }
    }
}

// ==========================================
// Recent History Manager
// ==========================================
class RecentHistoryManager {
    constructor(options = {}) {
        this.storageKey = options.storageKey || 'hanja-recent-view';
        this.maxItems = options.maxItems || 30;

        // DOM Elements
        this.modal = document.getElementById(options.modalId || 'recentModal');
        this.list = document.getElementById(options.listId || 'recentList');
        this.emptyMsg = document.getElementById(options.emptyMsgId || 'emptyRecentMsg');
        this.countEl = document.getElementById(options.countId || 'recentViewCount');
        this.openBtn = document.getElementById(options.openBtnId || 'recentViewBtn');
        this.closeBtn = document.getElementById(options.closeBtnId || 'closeRecentBtn');
        this.clearBtn = document.getElementById(options.clearBtnId || 'clearRecentBtn');

        this.history = StorageManager.get(this.storageKey, []);

        this.bindEvents();
        this.updateCount();
    }

    bindEvents() {
        if (this.openBtn) this.openBtn.addEventListener('click', () => this.toggle());
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
        if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.clearAll());

        if (this.modal) {
            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (this.modal.style.display === 'flex' &&
                    !this.modal.contains(e.target) &&
                    !this.openBtn.contains(e.target)) {
                    this.close();
                }
            });
        }

        if (this.list) {
            this.list.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.delete-recent-btn');
                if (delBtn) {
                    e.stopPropagation();
                    this.remove(parseInt(delBtn.dataset.index));
                }
            });
        }
    }

    add(item) {
        if (!item.id) {
            console.error('Cannot add item without ID to history:', item);
            return;
        }

        const historyItem = {
            id: item.id,
            hanja: item.hanja,
            huneum: item.huneum,
            gubun: item.gubun,
            url: item.url,
            grade: item.grade,
            radical: item.radical, // Useful for display
            radical_name: item.radical_name,
            timestamp: Date.now()
        };

        // Dedupe by ID
        this.history = this.history.filter(h => h.id !== historyItem.id);
        this.history.unshift(historyItem);

        if (this.history.length > this.maxItems) {
            this.history.pop();
        }

        this.save();
        this.updateCount();

        if (this.isValidModal()) {
            this.render();
        }
    }

    remove(index) {
        this.history.splice(index, 1);
        this.save();
        this.updateCount();
        this.render();
    }

    clearAll() {
        if (this.history.length === 0) {
            alert('삭제할 기록이 없습니다.');
            return;
        }
        if (confirm('모든 기록을 삭제하시겠습니까?')) {
            this.history = [];
            this.save();
            this.updateCount();
            this.render();
        }
    }

    save() {
        StorageManager.set(this.storageKey, this.history);
    }

    updateCount() {
        if (this.countEl) this.countEl.textContent = this.history.length;
    }

    open() {
        if (this.isValidModal()) {
            this.render();
            // Force flex to match CSS
            this.modal.style.display = 'flex';
        }
    }

    toggle() {
        if (!this.isValidModal()) return;
        if (this.modal.style.display === 'flex') {
            this.close();
        } else {
            this.open();
        }
    }

    close() {
        if (this.isValidModal()) {
            this.modal.style.display = 'none';
        }
    }

    render() {
        if (!this.list) return;

        this.list.innerHTML = '';
        if (this.history.length === 0) {
            if (this.emptyMsg) this.emptyMsg.style.display = 'block';
            return;
        }

        if (this.emptyMsg) this.emptyMsg.style.display = 'none';

        this.history.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'recent-item';

            const displayHanja = this.formatHanja(item);

            li.innerHTML = `
                <a href="${item.url}" target="_blank" class="recent-item-link">
                    <span class="recent-hanja">${displayHanja}</span>
                    <div class="recent-info">
                        <span class="recent-huneum">${item.huneum}</span>
                        <span class="recent-detail">${item.grade} | ${item.gubun}</span>
                    </div>
                </a>
                <button class="delete-recent-btn" data-index="${index}" aria-label="기록 삭제">×</button>
            `;
            this.list.appendChild(li);
        });
    }

    formatHanja(item) {
        const hanja = item.hanja;
        const gubun = item.gubun || '';
        const huneum = item.huneum || '';

        // Handle "Hanja - Number" format in Huneum if present
        let sup = '';
        const match = huneum.match(/\s-\s(\d+)$/);
        if (match) sup = `<sup>${match[1]}</sup>`;

        if (gubun.includes('첫말')) return `${hanja}${sup}-`;
        if (gubun.includes('끝말') || gubun.includes('끝음절')) return `-${hanja}${sup}`;
        return `${hanja}${sup}`;
    }

    isValidModal() {
        return this.modal && this.list;
    }
}

// ==========================================
// Shared Rendering Helpers
// ==========================================

function getGradeClass(geubsu) {
    return GRADE_CLASS_MAP[geubsu] || 'grade-default';
}

/**
 * Renders a single table row for a Hanja item.
 * @param {Object} item - The Hanja data object.
 * @param {boolean} isFav - Whether the item is favorited.
 * @returns {string} HTML string for the tr element.
 */
function renderHanjaRow(item, isFav) {
    const gradeClass = getGradeClass(item.grade);

    let url = item.url || '';
    if (url && !url.startsWith('http')) url = '';

    return `
        <tr>
            <td>
                <button class="favorite-star ${isFav ? 'active' : ''}" 
                        data-id="${item.id}"
                        aria-label="${isFav ? '즐겨찾기 제거' : '즐겨찾기 추가'}">
                    ${isFav ? '⭐' : '☆'}
                </button>
            </td>
            <td class="huneum-cell hanja-char">${item.huneum}</td>
            <td>${item.gubun || '-'}</td>
            <td>${item.edu_level || '-'}</td>
            <td><span class="grade-badge ${gradeClass}" data-action="filter-grade" data-grade="${item.grade}">${item.grade || '-'}</span></td>
            <td><span class="length-badge length-${item.length || '없음'}" data-action="filter-length" data-length="${item.length}">${item.length || '없음'}</span></td>
            <td>
                ${url ? `<a href="${url}" target="_blank" class="blog-link" data-id="${item.id}" title="블로그 보기" aria-label="블로그 보기">🔗</a>` : '-'}
            </td>
        </tr>
    `;
}
