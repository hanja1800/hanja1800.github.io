// ==================== Global Variables ====================
let allData = []; // Full list from chunks
let radicalsList = []; // Derived list of Unique Radicals
let currentRadical = null;
let currentStroke = 0;
let allHanjaForRadical = [];
let filteredHanja = [];
let currentPage = 1;
let favoritesOnly = false;
const itemsPerPage = 50;

// ==================== Managers ====================
const darkModeManager = new DarkModeManager();
const favoritesManager = new FavoritesManager();
const recentHistoryManager = new RecentHistoryManager();

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', async () => {
    await loadRadicalsData();
    initializeEventListeners();
    displayStrokes();
});

// ==================== Data Loading (수정된 핵심 부분) ====================
async function loadRadicalsData() {
    try {
        const metaResponse = await fetch('radicals_metadata.json');
        const metadata = await metaResponse.json();
        radicalsList = metadata.radicals;
        console.log('⚡ Fast Loaded metadata:', radicalsList.length, 'radicals');

        displayStrokes();
        fetchFullData();
    } catch (error) {
        console.error('Error loading metadata:', error);
        fetchFullData();
    }
}

async function fetchFullData() {
    try {
        const metaResponse = await fetch('chunks_metadata.json');
        if (!metaResponse.ok) throw new Error('메타데이터 로드 실패');
        const { total_chunks } = await metaResponse.json();

        const fetchPromises = [];
        const SECRET_KEY = 185; // 설정하신 비밀키

        for (let i = 0; i < total_chunks; i++) {
            fetchPromises.push(
                fetch(`./data_chunks/c_${i}.bin`)
                    .then(res => {
                        if (!res.ok) throw new Error(`조각 ${i} 로드 실패`);
                        return res.text();
                    })
                    .then(encoded => {
                        const binaryString = atob(encoded);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let j = 0; j < len; j++) {
                            bytes[j] = binaryString.charCodeAt(j) ^ SECRET_KEY;
                        }
                        const decoded = new TextDecoder('utf-8').decode(bytes);
                        return JSON.parse(decoded);
                    })
            );
        }

        const chunks = await Promise.all(fetchPromises);
        allData = [].concat(...chunks);

        allData.sort((a, b) => {
            const soundA = a.sound || '';
            const soundB = b.sound || '';
            if (soundA === soundB) {
                return (a.hanja || '').localeCompare(b.hanja || '');
            }
            return soundA.localeCompare(soundB, 'ko');
        });

        console.log('✅ Full data loaded from chunks:', allData.length);

        if (radicalsList.length === 0) {
            processRadicals();
            displayStrokes();
        }
    } catch (error) {
        console.error('Error loading full data from chunks:', error);
    }
}

function processRadicals() {
    const radMap = new Map();
    allData.forEach(item => {
        if (!item.radical) return;
        if (!radMap.has(item.radical)) {
            radMap.set(item.radical, {
                부수: item.radical,
                획수: item.radical_strokes || 0,
                훈음: item.radical_name,
                한자수: item.radical_count || 0
            });
        }
    });

    radicalsList = Array.from(radMap.values()).sort((a, b) => {
        if (a.획수 !== b.획수) return a.획수 - b.획수;
        return a.부수.codePointAt(0) - b.부수.codePointAt(0);
    });
}

// ==================== UI Rendering & Interaction ====================
function displayStrokes() {
    const strokes = [...new Set(radicalsList.map(r => r.획수))].sort((a, b) => a - b);
    const strokeContainer = document.getElementById('strokeFilterSection');

    let html = `<div class="stroke-buttons"><button class="stroke-btn active" onclick="selectStroke(0, this)">전체</button>`;
    strokes.forEach(stroke => {
        html += `<button class="stroke-btn" onclick="selectStroke(${stroke}, this)">${stroke}획</button>`;
    });
    html += `</div>`;
    strokeContainer.innerHTML = html;
    displayRadicals(0);
}

function selectStroke(stroke, btnElement) {
    document.querySelectorAll('.stroke-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    currentStroke = stroke;
    if (favoritesOnly) {
        currentRadical = null;
        currentPage = 1;
        applyFilters();
    }
    displayRadicals(stroke);
}

function displayRadicals(targetStroke = 0, searchTerm = '') {
    const grid = document.getElementById('radicalsGrid');
    grid.innerHTML = '';
    let radicals = radicalsList;

    if (targetStroke > 0) radicals = radicals.filter(r => r.획수 === targetStroke);
    if (searchTerm.trim()) {
        const term = searchTerm.trim();
        radicals = radicalsList.filter(r => r.부수.includes(term) || (r.훈음 && r.훈음.includes(term)));
        if (targetStroke > 0) {
            document.querySelectorAll('.stroke-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.stroke-btn').classList.add('active');
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
        button.innerHTML = `<span class="radical-char">${radicalInfo.부수}</span><span class="radical-info"><span class="radical-meaning">${radicalInfo.훈음 || ''}</span></span>`;
        button.onclick = () => selectRadical(radicalInfo.부수, radicalInfo.훈음);
        grid.appendChild(button);
    });
}

function selectRadical(radical, meaning = '') {
    currentRadical = radical;
    allHanjaForRadical = allData.filter(item => item.radical === radical);
    currentPage = 1;
    applyFilters();
    document.getElementById('hanjaSection').style.display = 'block';
    const displayHtml = meaning ? `<strong>${radical}</strong> <span class="selected-radical-meaning">(${meaning})</span>` : `<strong>부수: ${radical}</strong>`;
    document.getElementById('selectedRadical').innerHTML = displayHtml;
}

function applyFilters() {
    let source = allHanjaForRadical;
    let isGlobalFavorites = false;

    if (favoritesOnly && (!source.length || !currentRadical)) {
        isGlobalFavorites = true;
        if (currentStroke > 0) {
            source = allData.filter(item => item.radical_strokes === currentStroke);
            document.getElementById('selectedRadical').innerHTML = `<strong>${currentStroke}획 부수 즐겨찾기</strong>`;
        } else {
            source = allData;
            document.getElementById('selectedRadical').innerHTML = '<strong>전체 즐겨찾기</strong>';
        }
        document.getElementById('hanjaSection').style.display = 'block';
    } else if (!source.length) {
        filteredHanja = [];
        displayTable();
        return;
    }

    let filtered = [...source];
    if (favoritesOnly) filtered = filtered.filter(item => isFavorite(item.id));

    if (!favoritesOnly && currentRadical && !isGlobalFavorites) {
        const r = radicalsList.find(rad => rad.부수 === currentRadical);
        if (r) {
            const displayHtml = r.훈음 ? `<strong>${r.부수}</strong> <span class="selected-radical-meaning">(${r.훈음})</span>` : `<strong>부수: ${r.부수}</strong>`;
            document.getElementById('selectedRadical').innerHTML = displayHtml;
        }
    }

    filteredHanja = filtered;
    displayTable();
}

function isFavorite(id) { return favoritesManager.has(id); }

function displayTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    const uniqueHanjaCount = new Set(filteredHanja.map(item => item.hanja)).size;

    if (!filteredHanja.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">한자가 없습니다.</td></tr>';
        document.getElementById('resultCount').textContent = '0개 한자';
        updatePagination();
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredHanja.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(item => {
        const isFav = isFavorite(item.id);
        return renderHanjaRow(item, isFav);
    }).join('');

    document.getElementById('resultCount').textContent = `${uniqueHanjaCount}개 한자`;
    updatePagination();
}

function handleTableClick(e) {
    const favBtn = e.target.closest('.favorite-star');
    if (favBtn) {
        const id = parseInt(favBtn.getAttribute('data-id'));
        favoritesManager.toggle(id);
        if (favoritesOnly) applyFilters();
        else displayTable();
        return;
    }
    const link = e.target.closest('.blog-link');
    if (link) {
        const id = parseInt(link.getAttribute('data-id'));
        const item = allData.find(h => h.id === id);
        if (item) recentHistoryManager.add(item);
    }
}

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
    if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

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
    const section = document.getElementById('hanjaSection');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}

function initializeEventListeners() {
    const radicalSearch = document.getElementById('radicalSearchInput');
    if (radicalSearch) {
        radicalSearch.addEventListener('input', (e) => {
            displayRadicals(0, e.target.value);
            document.getElementById('clearRadicalSearchBtn').style.display = e.target.value ? 'block' : 'none';
        });
    }

    const favBtn = document.getElementById('favoritesOnlyBtn');
    if (favBtn) {
        favBtn.addEventListener('click', () => {
            favoritesOnly = !favoritesOnly;
            favBtn.classList.toggle('active', favoritesOnly);
            applyFilters();
        });
    }

    const clearBtn = document.getElementById('clearRadicalSearchBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            radicalSearch.value = '';
            displayRadicals();
            clearBtn.style.display = 'none';
            radicalSearch.focus();
        });
    }

    document.getElementById('prevBtn').addEventListener('click', () => { if (currentPage > 1) goToPage(currentPage - 1); });
    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredHanja.length / itemsPerPage);
        if (currentPage < totalPages) goToPage(currentPage + 1);
    });

    const tableBody = document.getElementById('tableBody');
    if (tableBody) tableBody.addEventListener('click', handleTableClick);
}
