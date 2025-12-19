// ==================== Global Variables ====================
let allData = []; // Full list from data.json
let radicalsList = []; // Derived list of Unique Radicals
let currentRadical = null;
let currentStroke = 0; // Track selected stroke for combined filtering
let allHanjaForRadical = []; // Filtered raw items
let filteredHanja = []; // Grouped/Deduped items for display
let currentPage = 1;
let favoritesOnly = false;
const itemsPerPage = 50;

// ==================== Local Storage Keys (Unified with Main Page) ====================
// Managers
const darkModeManager = new DarkModeManager();
const favoritesManager = new FavoritesManager();
const recentManager = new RecentHistoryManager();

// 급수별 CSS 클래스 매핑
const GRADE_CLASS_MAP = {
    '8급': 'grade-8', '준7급': 'grade-7-2', '7급': 'grade-7',
    '준6급': 'grade-6-2', '6급': 'grade-6', '준5급': 'grade-5-2',
    '5급': 'grade-5', '준4급': 'grade-4-2', '4급': 'grade-4',
    '준3급': 'grade-3-2', '3급': 'grade-3', '2급': 'grade-2',
    '1급': 'grade-1', '준특급': 'grade-special-2', '특급': 'grade-special'
};

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadRadicalsData();
    initializeEventListeners();
    displayStrokes();
});

// ==================== Data Loading ====================
// ==================== Data Loading ====================
async function loadRadicalsData() {
    try {
        // 1. FAST LOAD: Fetch Pre-calculated Metadata for Instant UI
        const metaResponse = await fetch('radicals_metadata.json');
        const metadata = await metaResponse.json();

        radicalsList = metadata.radicals;
        console.log('⚡ Fast Loaded metadata:', radicalsList.length, 'radicals');

        // Render UI immediately
        displayStrokes();

        // 2. BACKGROUND LOAD: Fetch detailed data for logic
        // Don't await this if we want truly non-blocking? 
        // Actually, we must await it before search/filtering works fully, 
        // but the INITIAL render is done.
        // Let's run it asynchronously.
        fetchFullData();

    } catch (error) {
        console.error('Error loading metadata:', error);
        // Fallback to old full load if metadata fails
        fetchFullData();
    }
}

async function fetchFullData() {
    try {
        const response = await fetch('data.json');
        allData = await response.json();

        // Sort by Sound (Eum) to match Main Page
        allData.sort((a, b) => {
            const soundA = a.sound || '';
            const soundB = b.sound || '';
            if (soundA === soundB) {
                return (a.hanja || '').localeCompare(b.hanja || '');
            }
            return soundA.localeCompare(soundB, 'ko');
        });

        console.log('✅ Full data loaded in background:', allData.length);

        // If we didn't have metadata (fallback case), we process manually
        if (radicalsList.length === 0) {
            processRadicals();
            displayStrokes();
        }
    } catch (error) {
        console.error('Error loading full data:', error);
    }
}

// Deprecated: Only used as fallback
function processRadicals() {
    const radMap = new Map();

    // Extract unique radicals from the main data
    allData.forEach(item => {
        if (!item.radical) return;

        // Use radical char as key
        if (!radMap.has(item.radical)) {
            radMap.set(item.radical, {
                부수: item.radical,
                획수: item.radical_strokes || 0,
                훈음: item.radical_name,
                한자수: item.radical_count || 0
            });
        }
    });

    // Convert map to array and sort by stroke then by radical (Unicode order)
    radicalsList = Array.from(radMap.values()).sort((a, b) => {
        if (a.획수 !== b.획수) return a.획수 - b.획수;
        return a.부수.codePointAt(0) - b.부수.codePointAt(0);
    });
}


// ==================== Radicals Display ====================
function displayStrokes() {
    // Get unique stroke counts
    const strokes = [...new Set(radicalsList.map(r => r.획수))].sort((a, b) => a - b);
    const strokeContainer = document.getElementById('strokeFilterSection');

    // Create stroke filter HTML
    let html = `
        <div class="stroke-buttons">
            <button class="stroke-btn active" onclick="selectStroke(0, this)">전체</button>
    `;

    strokes.forEach(stroke => {
        html += `
            <button class="stroke-btn" onclick="selectStroke(${stroke}, this)">
                ${stroke}획
            </button>
        `;
    });

    html += `</div>`;
    strokeContainer.innerHTML = html;

    // Display all radicals by default (0)
    displayRadicals(0);
}

function selectStroke(stroke, btnElement) {
    // Update active button
    document.querySelectorAll('.stroke-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    currentStroke = stroke;

    // If Favorites Mode is active, update the Hanja list immediately
    if (favoritesOnly) {
        currentRadical = null; // Clear specific radical selection
        currentPage = 1;
        applyFilters();
    }

    displayRadicals(stroke);
}

function displayRadicals(targetStroke = 0, searchTerm = '') {
    const grid = document.getElementById('radicalsGrid');
    grid.innerHTML = '';

    let radicals = radicalsList;

    // Filter by stroke if not 'All' (0)
    if (targetStroke > 0) {
        radicals = radicals.filter(r => r.획수 === targetStroke);
    }

    // Filter by search term
    if (searchTerm.trim()) {
        const term = searchTerm.trim();
        radicals = radicalsList.filter(r =>
            r.부수.includes(term) ||
            (r.훈음 && r.훈음.includes(term))
        );
        // If searching, reset stroke filter visually
        if (targetStroke > 0) {
            document.querySelectorAll('.stroke-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.stroke-btn').classList.add('active'); // Activate 'All'
        }
    }

    document.getElementById('radicalCount').textContent = `${radicals.length}개 부수`;

    if (radicals.length === 0) {
        grid.innerHTML = '<div class="no-radicals">검색 결과가 없습니다.</div>';
        return;
    }

    radicals.forEach(radicalInfo => {
        const button = document.createElement('button');
        button.className = 'radical-btn';
        button.innerHTML = `
            <span class="radical-char">${radicalInfo.부수}</span>
            <span class="radical-info">
                <span class="radical-meaning">${radicalInfo.훈음 || ''}</span>
            </span>
        `;
        button.onclick = () => selectRadical(radicalInfo.부수, radicalInfo.훈음);
        grid.appendChild(button);
    });
}

// ==================== Radical Selection ====================
function selectRadical(radical, meaning = '') {
    currentRadical = radical;
    // Filter from ALL data
    // Use 'radical' field from main data
    allHanjaForRadical = allData.filter(item => item.radical === radical);
    currentPage = 1;

    applyFilters();

    document.getElementById('hanjaSection').style.display = 'block';

    // Display Radical with Meaning
    const displayHtml = meaning
        ? `<strong>${radical}</strong> <span class="selected-radical-meaning">(${meaning})</span>`
        : `<strong>부수: ${radical}</strong>`;

    document.getElementById('selectedRadical').innerHTML = displayHtml;
}

// ==================== Filtering ====================
function applyFilters() {
    let source = allHanjaForRadical;
    let isGlobalFavorites = false;

    // 0. Handle Global/Stroke Favorites Mode (No radical selected but Favorites ON)
    if (favoritesOnly && (!source.length || !currentRadical)) {
        isGlobalFavorites = true;

        if (currentStroke > 0) {
            // Filter by Stroke
            source = allData.filter(item => item.radical_strokes === currentStroke);
            document.getElementById('selectedRadical').innerHTML = `<strong>${currentStroke}획 부수 즐겨찾기</strong>`;
        } else {
            // All Favorites
            source = allData;
            document.getElementById('selectedRadical').innerHTML = '<strong>전체 즐겨찾기</strong>';
        }

        document.getElementById('hanjaSection').style.display = 'block';
    } else if (!source.length) {
        filteredHanja = [];
        displayTable();
        // Hide section if truly empty and not global mode? 
        // Actually keep it hidden or let displayTable handle it?
        // Existing logic returned early, leaving section hidden if not already shown.
        return;
    }

    // 1. No Grouping (Raw Data)
    let filtered = [...source];

    // 2. Favorites Filter
    if (favoritesOnly) {
        filtered = filtered.filter(item => isFavorite(item.id));
    }

    // Restore Radical Title if turning OFF favorites while radical is selected
    if (!favoritesOnly && currentRadical && !isGlobalFavorites) {
        // We might need to restore the radical name title? 
        // Actually selectRadical sets it. If we switch favorites off, it stays set?
        // Yes, innerHTML stays unless we overwrote it with "전체 즐겨찾기".
        // If we overwrote it, we need to restore it.
        // Let's re-find the radical info to restore title?
        const r = radicalsList.find(r => r.부수 === currentRadical);
        if (r) {
            const displayHtml = r.훈음
                ? `<strong>${r.부수}</strong> <span class="selected-radical-meaning">(${r.훈음})</span>`
                : `<strong>부수: ${r.부수}</strong>`;
            document.getElementById('selectedRadical').innerHTML = displayHtml;
        }
    }

    filteredHanja = filtered;
    displayTable();
}



// Helper to check favorites
function isFavorite(id) {
    return favoritesManager.has(id);
}

// ==================== Table Display ====================
function displayTable(uniqueCount = null) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    // Count UNIQUE Hanja characters for the count display
    const uniqueHanjaCount = new Set(filteredHanja.map(item => item.hanja)).size;

    if (!filteredHanja.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    한자가 없습니다.
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

    pageItems.forEach(item => {
        const row = document.createElement('tr');

        // Unified Favorites Check
        const isFav = isFavorite(item.id);
        const gradeClass = getGradeClass(item.grade);

        row.innerHTML = `
            <td>
                <button class="favorite-star ${isFav ? 'active' : ''}" 
                        data-id="${item.id}"
                        aria-label="${isFav ? '즐겨찾기 제거' : '즐겨찾기 추가'}">
                    ${isFav ? '⭐' : '☆'}
                </button>
            </td>
            <td class="huneum-cell">${item.huneum}</td>
            <td>${item.gubun || '-'}</td>
            <td>${item.edu_level || '-'}</td>
            <td><span class="grade-badge ${gradeClass}">${item.grade || '-'}</span></td>
            <td><span class="length-badge length-${item.length || '없음'}">${item.length || '없음'}</span></td>
            <td>
                <a href="${item.url}" target="_blank" class="blog-link" 
                   data-id="${item.id}"
                   title="블로그 보기" aria-label="블로그 보기">🔗</a>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Display UNIQUE Hanja count
    document.getElementById('resultCount').textContent = `${uniqueHanjaCount}개 한자`;
    updatePagination();
}

function getGradeClass(geubsu) { return GRADE_CLASS_MAP[geubsu] || 'grade-default'; }

// ==================== Interaction Handlers ====================
function handleTableClick(e) {
    // 1. Favorite Button Click
    const favBtn = e.target.closest('.favorite-star');
    if (favBtn) {
        e.stopPropagation(); // Just in case
        const id = parseInt(favBtn.getAttribute('data-id'));
        favoritesManager.toggle(id);
        displayTable(); // Refresh UI to show new star state
        return;
    }

    // 2. Blog Link Click (Add to Recent)
    const link = e.target.closest('.blog-link');
    if (link) {
        const id = parseInt(link.getAttribute('data-id'));

        // Lookup item from allHanjaForRadical (since it contains full data)
        const item = allData.find(h => h.id === id); // Look up in allData to be safe

        if (item) {
            recentManager.add(item);
        }
    }
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

// ==================== Event Listeners ====================
function initializeEventListeners() {
    // Radical search
    const radicalSearch = document.getElementById('radicalSearchInput');
    radicalSearch.addEventListener('input', (e) => {
        // When searching, we pass 0 as stroke to search entire database
        displayRadicals(0, e.target.value);
        const clearBtn = document.getElementById('clearRadicalSearchBtn');
        clearBtn.style.display = e.target.value ? 'block' : 'none';
    });

    const favBtn = document.getElementById('favoritesOnlyBtn');
    if (favBtn) {
        favBtn.addEventListener('click', () => {
            favoritesOnly = !favoritesOnly;
            favBtn.classList.toggle('active', favoritesOnly);
            applyFilters();
        });
    }

    document.getElementById('clearRadicalSearchBtn').addEventListener('click', () => {
        radicalSearch.value = '';
        displayRadicals();  // Will display active stroke or 'All'
        document.getElementById('clearRadicalSearchBtn').style.display = 'none';
        radicalSearch.focus();
    });

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) goToPage(currentPage - 1);
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredHanja.length / itemsPerPage);
        if (currentPage < totalPages) goToPage(currentPage + 1);
    });

    // Table Delegation (Favorites & Recent)
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
        tableBody.addEventListener('click', handleTableClick);
    }
}
