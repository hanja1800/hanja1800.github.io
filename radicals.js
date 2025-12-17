// ==================== Global Variables ====================
let radicalsData = null;
let currentRadical = null;
let allHanjaForRadical = [];
let filteredHanja = [];
let currentPage = 1;
const itemsPerPage = 50;
let favoritesOnly = false;

// ==================== Local Storage Keys ====================
const FAVORITES_KEY = 'hanjaFavorites';
const RECENT_KEY = 'hanjaRecent';
const DARK_MODE_KEY = 'darkMode';

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadRadicalsData();
    initializeDarkMode();
    initializeEventListeners();
    displayRadicals();
    updateFavoritesCount();
    updateRecentViewCount();
});

// ==================== Data Loading ====================
async function loadRadicalsData() {
    try {
        const response = await fetch('radicals_data.json');
        radicalsData = await response.json();
        console.log('Loaded radicals data:', radicalsData.radicals.length, 'radicals');
    } catch (error) {
        console.error('Error loading radicals data:', error);
        alert('부수 데이터를 불러오는데 실패했습니다.');
    }
}

// ==================== Radicals Display ====================
function displayRadicals(searchTerm = '') {
    const grid = document.getElementById('radicalsGrid');
    grid.innerHTML = '';

    let radicals = radicalsData.radicals;

    // Filter by search term
    if (searchTerm.trim()) {
        radicals = radicals.filter(r => r.부수.includes(searchTerm.trim()));
    }

    document.getElementById('radicalCount').textContent = `${radicals.length}개 부수`;

    radicals.forEach(radicalInfo => {
        const button = document.createElement('button');
        button.className = 'radical-btn';
        button.innerHTML = `
            <span class="radical-char">${radicalInfo.부수}</span>
            <span class="radical-count">${radicalInfo.한자수}자</span>
        `;
        button.onclick = () => selectRadical(radicalInfo.부수);
        grid.appendChild(button);
    });
}

// ==================== Radical Selection ====================
function selectRadical(radical) {
    currentRadical = radical;
    allHanjaForRadical = radicalsData.data[radical] || [];
    currentPage = 1;

    applyFilters();

    document.getElementById('hanjaSection').style.display = 'block';
    document.getElementById('selectedRadical').innerHTML =
        `<strong>부수: ${radical}</strong>`;

    // Scroll to hanja section
    document.getElementById('hanjaSection').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// ==================== Filtering ====================
function applyFilters() {
    if (!allHanjaForRadical.length) {
        filteredHanja = [];
        displayTable();
        return;
    }

    filteredHanja = [...allHanjaForRadical];

    // Apply favorites filter
    if (favoritesOnly) {
        const favorites = getFavorites();
        filteredHanja = filteredHanja.filter(item =>
            favorites.some(fav => fav.훈음 === item.훈음)
        );
    }

    displayTable();
}

// ==================== Table Display ====================
function displayTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!filteredHanja.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    ${favoritesOnly ? '즐겨찾기에 추가된 한자가 없습니다.' : '한자가 없습니다.'}
                </td>
            </tr>
        `;
        document.getElementById('resultCount').textContent = '0개 한자';
        updatePagination();
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredHanja.slice(startIndex, endIndex);

    const favorites = getFavorites();

    pageItems.forEach(item => {
        const row = document.createElement('tr');
        const isFavorite = favorites.some(fav => fav.훈음 === item.훈음);

        row.innerHTML = `
            <td>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                        data-huneum="${item.훈음}" 
                        aria-label="${isFavorite ? '즐겨찾기 제거' : '즐겨찾기 추가'}">
                    ${isFavorite ? '⭐' : '☆'}
                </button>
            </td>
            <td class="huneum-cell">${item.훈음}</td>
            <td>${item.교육수준}</td>
            <td>${item.급수}</td>
            <td>${item.장단음}</td>
            <td>
                <a href="${item.URL}" target="_blank" class="blog-link" 
                   title="블로그 보기" aria-label="블로그 보기">🔗</a>
            </td>
        `;

        row.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-btn') && !e.target.closest('.blog-link')) {
                addToRecentViews(item);
                window.open(item.URL, '_blank');
            }
        });

        tbody.appendChild(row);
    });

    document.getElementById('resultCount').textContent = `${filteredHanja.length}개 한자`;
    updatePagination();
    attachFavoriteListeners();
}

// ==================== Pagination ====================
function updatePagination() {
    const totalPages = Math.ceil(filteredHanja.length / itemsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    pageNumbers.innerHTML = '';

    if (totalPages <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }

    prevBtn.style.display = 'block';
    nextBtn.style.display = 'block';
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.onclick = () => goToPage(i);
        pageNumbers.appendChild(btn);
    }
}

function goToPage(page) {
    currentPage = page;
    displayTable();
    document.getElementById('hanjaSection').scrollIntoView({ behavior: 'smooth' });
}

// ==================== Favorites Management ====================
function getFavorites() {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    updateFavoritesCount();
}

function toggleFavorite(huneum) {
    let favorites = getFavorites();
    const index = favorites.findIndex(fav => fav.훈음 === huneum);

    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        const item = allHanjaForRadical.find(h => h.훈음 === huneum);
        if (item) {
            favorites.push(item);
        }
    }

    saveFavorites(favorites);
    displayTable();
}

function attachFavoriteListeners() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const huneum = btn.getAttribute('data-huneum');
            toggleFavorite(huneum);
        });
    });
}

function updateFavoritesCount() {
    const count = getFavorites().length;
    document.getElementById('favoritesCount').textContent = count;
}

// ==================== Recent Views Management ====================
function addToRecentViews(item) {
    let recent = getRecentViews();

    // Remove if already exists
    recent = recent.filter(r => r.훈음 !== item.훈음);

    // Add to beginning
    recent.unshift(item);

    // Keep only last 20
    recent = recent.slice(0, 20);

    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    updateRecentViewCount();
}

function getRecentViews() {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
}

function updateRecentViewCount() {
    const count = getRecentViews().length;
    document.getElementById('recentViewCount').textContent = count;
}

function showRecentModal() {
    const recent = getRecentViews();
    const modal = document.getElementById('recentModal');
    const list = document.getElementById('recentList');
    const emptyMsg = document.getElementById('emptyRecentMsg');

    list.innerHTML = '';

    if (recent.length === 0) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
        recent.forEach(item => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            li.innerHTML = `
                <a href="${item.URL}" target="_blank" class="recent-link">
                    ${item.훈음}
                </a>
            `;
            list.appendChild(li);
        });
    }

    modal.style.display = 'block';
}

function closeRecentModal() {
    document.getElementById('recentModal').style.display = 'none';
}

function clearRecentHistory() {
    if (confirm('최근 본 기록을 모두 삭제하시겠습니까?')) {
        localStorage.removeItem(RECENT_KEY);
        updateRecentViewCount();
        closeRecentModal();
    }
}

// ==================== Dark Mode ====================
function initializeDarkMode() {
    const darkModeEnabled = localStorage.getItem(DARK_MODE_KEY) === 'true';
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
        updateDarkModeButton();
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem(DARK_MODE_KEY, isDark);
    updateDarkModeButton();
}

function updateDarkModeButton() {
    const btn = document.getElementById('darkModeBtn');
    const isDark = document.body.classList.contains('dark-mode');
    btn.textContent = isDark ? '☀️' : '🌙';
}

// ==================== Event Listeners ====================
function initializeEventListeners() {
    // Dark mode toggle
    document.getElementById('darkModeBtn').addEventListener('click', toggleDarkMode);

    // Radical search
    const radicalSearch = document.getElementById('radicalSearchInput');
    radicalSearch.addEventListener('input', (e) => {
        displayRadicals(e.target.value);
        const clearBtn = document.getElementById('clearRadicalSearchBtn');
        clearBtn.style.display = e.target.value ? 'block' : 'none';
    });

    document.getElementById('clearRadicalSearchBtn').addEventListener('click', () => {
        radicalSearch.value = '';
        displayRadicals();
        document.getElementById('clearRadicalSearchBtn').style.display = 'none';
        radicalSearch.focus();
    });

    // Favorites filter
    document.getElementById('favoritesOnlyBtn').addEventListener('click', () => {
        favoritesOnly = !favoritesOnly;
        const btn = document.getElementById('favoritesOnlyBtn');
        if (favoritesOnly) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        currentPage = 1;
        applyFilters();
    });

    // Recent views modal
    document.getElementById('recentViewBtn').addEventListener('click', showRecentModal);
    document.getElementById('closeRecentBtn').addEventListener('click', closeRecentModal);
    document.getElementById('clearRecentBtn').addEventListener('click', clearRecentHistory);

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('recentModal');
        if (e.target === modal) {
            closeRecentModal();
        }
    });

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) goToPage(currentPage - 1);
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredHanja.length / itemsPerPage);
        if (currentPage < totalPages) goToPage(currentPage + 1);
    });
}
