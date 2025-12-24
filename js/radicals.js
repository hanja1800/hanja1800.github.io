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
// 급수별 CSS 클래스 매핑 (Moved to common.js)

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
                        // 보안 키 (파이썬 스크립트의 SECRET_KEY와 똑같은 숫자여야 합니다!)
                   const SECRET_KEY = 158; 

                   // 1. Base64 암호 해독
                  const binaryString = atob(encoded);
                  const len = binaryString.length;
                  const bytes = new Uint8Array(len);
    
                  for (let j = 0; j < len; j++) {
                  // 2. [복호화 핵심] 비밀 키를 사용하여 꼬인 비트를 원래대로 되돌림 (XOR 연산)
                     bytes[j] = binaryString.charCodeAt(j) ^ SECRET_KEY;
                  }
    
                 // 3. 한글(UTF-8)로 변환
                 const decoded = new TextDecoder('utf-8').decode(bytes);
    
                 // 4. JSON으로 변환
                 return JSON.parse(decoded);
                 })
            );
        }

        // 3. 모든 조각 합치기
        const chunks = await Promise.all(fetchPromises);
        allData = [].concat(...chunks);

        // 4. 소리(음) 기준으로 정렬
        allData.sort((a, b) => {
            const soundA = a.sound || '';
            const soundB = b.sound || '';
            if (soundA === soundB) {
                return (a.hanja || '').localeCompare(b.hanja || '');
            }
            return soundA.localeCompare(soundB, 'ko');
        });

        console.log('✅ Full data loaded from chunks:', allData.length);

        // 메타데이터가 없는 경우를 대비한 처리 (기존 로직 유지)
        if (radicalsList.length === 0) {
            processRadicals();
            displayStrokes();
        }

    } catch (error) {
        console.error('Error loading full data from chunks:', error);
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
        // Unified Favorites Check
        const isFav = isFavorite(item.id);
        const row = document.createElement('tr'); // Wrapper needed for innerHTML or just append string? 
        // Our common function returns a string "<tr>...</tr>".
        // To append it to tbody, we can accumulate strings and set innerHTML at end, OR create element.
        // let's follow script.js pattern for efficiency: modify displayTable to use map().join('')

        // Wait, radicals.js was using appending elements?
        // Original code:
        // const row = document.createElement('tr');
        // row.innerHTML = ...
        // tbody.appendChild(row);

        // Let's refactor to matching script.js for better performance too.
    });

    // REPLACING THE WHOLE LOOP with map/join approach
    tbody.innerHTML = pageItems.map(item => {
        const isFav = isFavorite(item.id);
        return renderHanjaRow(item, isFav);
    }).join('');

    // Display UNIQUE Hanja count
    document.getElementById('resultCount').textContent = `${uniqueHanjaCount}개 한자`;
    updatePagination();
}

// getGradeClass(geubsu) removed - using global from common.js

// ==================== Interaction Handlers ====================
function handleTableClick(e) {
    // 1. Favorite Button Click
    const favBtn = e.target.closest('.favorite-star');
    if (favBtn) {
        e.stopPropagation(); // Just in case
        const id = parseInt(favBtn.getAttribute('data-id'));
        favoritesManager.toggle(id);

        // If in Favorites Mode, we need to refresh the list to remove un-favorited items
        if (favoritesOnly) {
            applyFilters();
        } else {
            displayTable(); // Just refresh UI to show new star state
        }
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


