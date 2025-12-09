// 한자 데이터
let hanjaData = [];
let sortedHanjaData = [];

// 페이지네이션 상태
let currentPage = 1;
const itemsPerPage = 20;

// 초성 및 음절 필터 상태
let selectedChosung = '';
let selectedSyllable = '';

// 즐겨찾기 상태
let favorites = new Set();
let showOnlyFavorites = false;

// 음절 캐시
let syllableCache = {};

// ===== 즐겨찾기 localStorage 관리 함수 =====
function loadFavorites() {
    try {
        const saved = localStorage.getItem('hanja-favorites');
        if (saved) {
            const favArray = JSON.parse(saved);
            favorites = new Set(favArray);
        }
    } catch (error) {
        console.error('즐겨찾기 로드 실패:', error);
        favorites = new Set();
    }
    updateFavoritesCount();
}

function saveFavorites() {
    try {
        const favArray = Array.from(favorites);
        localStorage.setItem('hanja-favorites', JSON.stringify(favArray));
    } catch (e) {
        console.error('즐겨찾기 저장 실패:', e);
        if (e.name === 'QuotaExceededError') {
            alert('저장 공간이 부족하여 즐겨찾기를 추가할 수 없습니다.');
        }
    }
}

function toggleFavorite(huneum, gubun) {
    const uniqueKey = `${huneum}|${gubun}`;
    if (favorites.has(uniqueKey)) {
        favorites.delete(uniqueKey);
    } else {
        favorites.add(uniqueKey);
    }
    saveFavorites();
    updateFavoritesCount();
    filterData(); // 현재 화면 갱신
}

function isFavorite(huneum, gubun) {
    const uniqueKey = `${huneum}|${gubun}`;
    return favorites.has(uniqueKey);
}

function updateFavoritesCount() {
    const countElement = document.getElementById('favoritesCount');
    if (countElement) {
        countElement.textContent = favorites.size;
    }
}

function toggleFavoritesFilter() {
    showOnlyFavorites = !showOnlyFavorites;
    const btn = document.getElementById('favoritesOnlyBtn');
    if (btn) {
        if (showOnlyFavorites) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
    filterDataAndReset();
}

// ===== 다크모드 관리 함수 =====
function loadDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        updateDarkModeButton(true);
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeButton(isDark);
}

function updateDarkModeButton(isDark) {
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        btn.textContent = isDark ? '☀️' : '🌙';
        btn.title = isDark ? '라이트모드로 전환' : '다크모드로 전환';
    }
}

function initDarkModeButton() {
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        btn.addEventListener('click', toggleDarkMode);
    }
}

// 한글 초성 추출 함수
function getChosung(char) {
    const code = char.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return null;
    const chosungIndex = Math.floor(code / 588);
    const chosungs = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return chosungs[chosungIndex];
}

function normalizeChosung(chosung) {
    const map = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
    return map[chosung] || chosung;
}

function getGradeClass(geubsu) {
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

// 데이터 로드 및 초기화
fetch('data.json').then(response => {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
}).then(data => {
    if (!Array.isArray(data) || data.length === 0) throw new Error('데이터 오류');

    // 데이터 정제 및 안전한 파싱
    hanjaData = data.map(item => {
        const cleanItem = {};
        for (const key in item) {
            // BOM 제거를 더 안전하게 처리
            const cleanKey = key.trim().replace(/^\ufeff/, '');
            cleanItem[cleanKey] = item[key];
        }
        return cleanItem;
    });

    // 정렬된 데이터 생성
    sortedHanjaData = [...hanjaData].sort((a, b) => {
        const hanjaA = a['한자'] || '';
        const hanjaB = b['한자'] || '';
        return hanjaA.localeCompare(hanjaB);
    });

    loadFavorites();
    loadDarkMode();
    initRecentView();
    buildSyllableCache();
    displayData(sortedHanjaData);
    initChosungFilter();
    initFavoritesButton();
    initDarkModeButton();

    console.log(`✅ ${hanjaData.length} 개의 한자 데이터 로드 완료`);
}).catch(error => {
    console.error('데이터 로드 실패:', error);
    document.getElementById('tableBody').innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">데이터 로드 실패<br>${error.message}</td></tr>`;
});

// 검색 및 필터 요소
const searchInput = document.getElementById('searchInput');
const educationFilter = document.getElementById('educationFilter');
const lengthFilter = document.getElementById('lengthFilter');

// 급수 다중 선택 필터
let selectedGrades = [];
const gradeDropdown = document.getElementById('gradeDropdown');
const gradeFilterBtn = document.getElementById('gradeFilterBtn');
const gradeDropdownMenu = document.getElementById('gradeDropdownMenu');

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// [핵심 수정] 이벤트 위임 통합 - 모든 클릭 이벤트를 여기서 관리
document.addEventListener('click', (e) => {
    // 1. 즐겨찾기 별 클릭
    const starBtn = e.target.closest('.favorite-star');
    if (starBtn) {
        e.stopPropagation();
        toggleFavorite(starBtn.dataset.huneum, starBtn.dataset.gubun);
        return;
    }

    // 2. 급수 배지 클릭
    const gradeBadge = e.target.closest('.grade-badge');
    if (gradeBadge) {
        const gradeValue = gradeBadge.dataset.grade;
        if (gradeValue && gradeValue !== '-') {
            e.stopPropagation();
            selectedGrades = [gradeValue];
            updateGradeCheckboxes();
            updateGradeButtonLabel();
            filterDataAndReset();
        }
        return;
    }

    // 3. 장단음 배지 클릭
    const lengthBadge = e.target.closest('.length-badge');
    if (lengthBadge) {
        const lengthValue = lengthBadge.dataset.length;
        if (lengthValue && lengthValue !== '없음') {
            e.stopPropagation();
            document.getElementById('lengthFilter').value = lengthValue;
            filterDataAndReset();
        }
        return;
    }

    // 4. 필터 칩 삭제 버튼
    const removeChipBtn = e.target.closest('.filter-chip-remove');
    if (removeChipBtn) {
        e.stopPropagation();
        const type = removeChipBtn.dataset.filterType;
        if (type === 'education') educationFilter.value = '';
        if (type === 'length') lengthFilter.value = '';
        if (type === 'grade') {
            selectedGrades = [];
            updateGradeCheckboxes();
            updateGradeButtonLabel();
        }
        filterDataAndReset();
        return;
    }

    // 5. 링크 클릭 시 최근 본 항목에 추가 (이벤트 위임)
    const linkBtn = e.target.closest('.blog-link');
    if (linkBtn) {
        const targetUrl = linkBtn.getAttribute('href');
        setTimeout(() => {
            const item = sortedHanjaData.find(d => d['URL'] === targetUrl);
            if (item) addToRecent(item);
        }, 0);
        // 링크 기본 동작은 허용
    }

    // 6. 드롭다운 외부 클릭 감지
    if (gradeDropdown && !gradeDropdown.contains(e.target)) {
        gradeDropdown.classList.remove('open');
    }
});

// 검색 X 버튼 기능
const clearSearchBtn = document.getElementById('clearSearchBtn');

searchInput.addEventListener('input', (e) => {
    clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
    debounce(filterDataAndReset, 300)();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    filterDataAndReset();
});

educationFilter.addEventListener('change', filterDataAndReset);
lengthFilter.addEventListener('change', filterDataAndReset);

function buildSyllableCache() {
    syllableCache = {};
    const chosungs = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    chosungs.forEach(chosung => {
        const syllables = new Set();
        hanjaData.forEach(item => {
            const eum = (item['음'] || '').trim();
            const gubun = item['구분'] || '';
            if (eum && !gubun.includes('끝음절')) {
                const normalized = normalizeChosung(getChosung(eum.charAt(0)));
                if (normalized === chosung) syllables.add(eum);
            }
        });
        syllableCache[chosung] = Array.from(syllables).sort();
    });
}

function initChosungFilter() {
    document.querySelectorAll('.chosung-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.chosung-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedChosung = this.dataset.chosung;
            selectedSyllable = '';

            if (selectedChosung === '') {
                document.getElementById('syllableButtons').classList.remove('show');
                document.getElementById('syllableButtons').innerHTML = '';
            } else {
                generateSyllableButtons(selectedChosung);
            }
            filterDataAndReset();
        });
    });
}

function generateSyllableButtons(chosung) {
    const container = document.getElementById('syllableButtons');
    const syllables = syllableCache[chosung] || [];

    if (syllables.length === 0) {
        container.innerHTML = '<div class="no-syllables-message">해당 초성 한자 없음</div>';
    } else {
        container.innerHTML = syllables.map(s =>
            `<button class="syllable-btn" data-syllable="${s}">${s}</button>`
        ).join('');
    }
    container.classList.add('show');

    container.querySelectorAll('.syllable-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            container.querySelectorAll('.syllable-btn').forEach(b => b.classList.remove('active'));
            if (selectedSyllable === this.dataset.syllable) {
                selectedSyllable = '';
            } else {
                selectedSyllable = this.dataset.syllable;
                this.classList.add('active');
            }
            filterDataAndReset();
        });
    });
}

function filterData() {
    const searchTerm = searchInput.value.toLowerCase();
    const education = educationFilter.value;
    const length = lengthFilter.value;

    const filtered = sortedHanjaData.filter(item => {
        const hanja = item['한자'] || '';
        const eum = item['음'] || '';
        const huneum = item['훈음'] || '';
        const gubun = item['구분'] || '';
        const gyoyuksujun = item['교육수준'] || '';
        const geubsu = item['급수'] || '';
        const jangdaneum = item['장단음'] || '';

        const matchSearch = !searchTerm || hanja.includes(searchTerm) || eum.includes(searchTerm) || huneum.includes(searchTerm);
        const matchEducation = !education || gyoyuksujun === education;
        const matchGrade = selectedGrades.length === 0 || selectedGrades.includes(geubsu);
        const matchLength = !length || jangdaneum === length;
        const matchFavorites = !showOnlyFavorites || isFavorite(huneum, gubun);

        let matchChosung = true;
        if (selectedSyllable) {
            matchChosung = eum === selectedSyllable;
        } else if (selectedChosung) {
            matchChosung = normalizeChosung(getChosung(eum.charAt(0))) === selectedChosung;
        }

        const notEnding = !selectedSyllable || !gubun.includes('끝음절');

        return matchSearch && matchEducation && matchGrade && matchLength && matchFavorites && matchChosung && notEnding;
    });

    displayData(filtered);
    updateActiveFiltersDisplay();
}

function filterDataAndReset() {
    currentPage = 1;
    filterData();
}

function displayData(data) {
    const tbody = document.getElementById('tableBody');
    const resultCount = document.getElementById('resultCount');

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">검색 결과가 없습니다.</td></tr>';
        resultCount.textContent = '0개 한자';
        updatePagination(0);
        return;
    }

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const pageData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // [보안 및 모바일 UI 개선]
    // 모바일에서 각 셀의 내용을 알 수 있도록 data-label 속성 추가
    tbody.innerHTML = pageData.map(item => {
        const huneum = item['훈음'] || '';
        const gubun = item['구분'] || '';
        const isFav = isFavorite(huneum, gubun);
        const gradeClass = getGradeClass(item['급수']);
        
        let url = item['URL'] || '';
        // 안전하지 않은 URL 필터링
        if (url && !url.startsWith('http')) {
           url = ''; 
        }

        return `<tr>
            <td data-label="즐겨찾기"><button class="favorite-star ${isFav ? 'active' : ''}" data-huneum="${huneum}" data-gubun="${gubun}" aria-label="즐겨찾기 토글">${isFav ? '⭐' : '☆'}</button></td>
            <td class="hanja-char" data-label="훈음">${huneum}</td>
            <td data-label="구분">${gubun || '-'}</td>
            <td data-label="교육수준">${item['교육수준'] || '-'}</td>
            <td data-label="급수"><span class="grade-badge ${gradeClass}" data-grade="${item['급수']}">${item['급수'] || '-'}</span></td>
            <td data-label="장단음"><span class="length-badge length-${item['장단음'] || '없음'}" data-length="${item['장단음']}">${item['장단음'] || '없음'}</span></td>
            <td data-label="링크">${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="blog-link" title="블로그 보기" aria-label="블로그 보기">🔗</a>` : '-'}</td>
        </tr>`;
    }).join('');

    resultCount.textContent = `${new Set(data.map(i => i['한자'])).size}개 한자`;
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

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
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    pageNumbers.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    filterData();
}

function nextPage() { currentPage++; filterData(); }
function prevPage() { currentPage--; filterData(); }

function initFavoritesButton() {
    const btn = document.getElementById('favoritesOnlyBtn');
    if (btn) btn.addEventListener('click', toggleFavoritesFilter);
}

function updateActiveFiltersDisplay() {
    const container = document.getElementById('activeFilters');
    const chips = [];

    if (educationFilter.value) chips.push({ type: 'education', label: '교육수준', value: educationFilter.value });
    if (lengthFilter.value) chips.push({ type: 'length', label: '장단음', value: lengthFilter.value });
    if (selectedGrades.length > 0) {
        chips.push({
            type: 'grade',
            label: '급수',
            value: selectedGrades.length <= 2 ? selectedGrades.join(', ') : `${selectedGrades[0]} 외 ${selectedGrades.length - 1}개`
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
            <button class="filter-chip-remove" data-filter-type="${chip.type}" aria-label="필터 삭제">×</button>
        </div>`
    ).join('');
}

// 급수 필터 드롭다운 UI 로직
function toggleGradeDropdown(e) {
    e.stopPropagation();
    gradeDropdown.classList.toggle('open');
}

gradeDropdownMenu.addEventListener('click', (e) => e.stopPropagation());

function updateGradeButtonLabel() {
    const label = document.querySelector('#gradeFilterBtn .dropdown-label');
    if (selectedGrades.length === 0) label.textContent = '전체';
    else if (selectedGrades.length === 1) label.textContent = selectedGrades[0];
    else label.textContent = `${selectedGrades[0]} 외 ${selectedGrades.length - 1}개`;
}

function updateGradeCheckboxes() {
    gradeDropdownMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.dataset.grade === 'all') cb.checked = selectedGrades.length === 0;
        else cb.checked = selectedGrades.includes(cb.value);
    });
}

gradeDropdownMenu.addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    const val = e.target.value;
    if (e.target.dataset.grade === 'all') selectedGrades = [];
    else {
        if (e.target.checked) { if (!selectedGrades.includes(val)) selectedGrades.push(val); }
        else selectedGrades = selectedGrades.filter(g => g !== val);
    }
    updateGradeCheckboxes();
});

document.getElementById('gradeApplyBtn').addEventListener('click', () => {
    updateGradeButtonLabel();
    gradeDropdown.classList.remove('open');
    filterDataAndReset();
});

document.getElementById('gradeResetBtn').addEventListener('click', () => {
    selectedGrades = [];
    updateGradeCheckboxes();
    updateGradeButtonLabel();
    filterDataAndReset();
});

gradeFilterBtn.addEventListener('click', toggleGradeDropdown);
updateGradeButtonLabel();

// ==========================================
//  📖 최근 본 한자 (History) 관리 기능
// ==========================================

let recentHistory = [];
const MAX_RECENT_ITEMS = 30;

function initRecentView() {
    loadRecentHistory();
    
    const recentBtn = document.getElementById('recentViewBtn');
    const closeBtn = document.getElementById('closeRecentBtn');
    const clearBtn = document.getElementById('clearRecentBtn');
    const modal = document.getElementById('recentModal');

    if (recentBtn) recentBtn.addEventListener('click', toggleRecentModal);
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (clearBtn) clearBtn.addEventListener('click', clearRecentHistory);
    
    // 영역 밖 클릭 시 모달 닫기
    document.addEventListener('click', function(e) {
        if (modal && modal.style.display === 'flex' && 
            !modal.contains(e.target) && 
            !recentBtn.contains(e.target)) {
            modal.style.display = 'none';
        }
    });
}

function loadRecentHistory() {
    try {
        const saved = localStorage.getItem('hanja-recent-view');
        if (saved) {
            recentHistory = JSON.parse(saved);
        }
    } catch (e) {
        console.error('History load error', e);
        recentHistory = [];
    }
    updateRecentCount();
}

function saveRecentHistory() {
    try {
        localStorage.setItem('hanja-recent-view', JSON.stringify(recentHistory));
        updateRecentCount();
        
        if (document.getElementById('recentModal') && document.getElementById('recentModal').style.display === 'flex') {
            renderRecentList();
        }
    } catch (e) {
        console.error('로컬 스토리지 저장 실패:', e);
        if (e.name === 'QuotaExceededError') {
            alert('저장 공간이 부족하여 최근 본 한자를 저장할 수 없습니다.');
        }
    }
}

function updateRecentCount() {
    const countSpan = document.getElementById('recentViewCount');
    if (countSpan) {
        countSpan.textContent = recentHistory.length;
    }
}

function addToRecent(item) {
    const historyItem = {
        hanja: item['한자'] || '',
        huneum: item['훈음'] || '',
        gubun: item['구분'] || '',
        url: item['URL'] || '',
        grade: item['급수'] || '',
        timestamp: Date.now()
    };
    
    // 중복 제거
    const uniqueKey = `${historyItem.huneum}|${historyItem.gubun}`;
    recentHistory = recentHistory.filter(h => `${h.huneum}|${h.gubun}` !== uniqueKey);
    
    recentHistory.unshift(historyItem);
    
    if (recentHistory.length > MAX_RECENT_ITEMS) {
        recentHistory = recentHistory.slice(0, MAX_RECENT_ITEMS);
    }
    
    saveRecentHistory();
}

function formatRecentHanja(item) {
    const hanja = item.hanja;
    const gubun = item.gubun || '';
    const huneum = item.huneum || '';
    
    let sup = '';
    const match = huneum.match(/\s-\s(\d+)$/);
    
    if (match) {
        sup = `<sup>${match[1]}</sup>`;
    }
    
    if (gubun.includes('첫말')) {
        return `${hanja}${sup}-`;
    } else if (gubun.includes('끝말') || gubun.includes('끝음절')) {
        return `-${hanja}${sup}`;
    } else {
        return `${hanja}${sup}`;
    }
}

function renderRecentList() {
    const list = document.getElementById('recentList');
    const emptyMsg = document.getElementById('emptyRecentMsg');
    
    list.innerHTML = '';
    
    if (recentHistory.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }
    
    emptyMsg.style.display = 'none';
    
    recentHistory.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'recent-item';
        const displayHanja = formatRecentHanja(item);
        
        li.innerHTML = `
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="recent-item-link" title="새 탭에서 보기">
                <span class="recent-hanja">${displayHanja}</span>
                <div class="recent-info">
                    <span class="recent-huneum">${item.huneum}</span>
                    <span class="recent-detail">${item.grade} | ${item.gubun}</span>
                </div>
            </a>
            <button class="delete-recent-btn" onclick="deleteRecentItem(${index}, event)" aria-label="삭제" title="기록에서 삭제">×</button>
        `;
        list.appendChild(li);
    });
}

window.deleteRecentItem = function(index, event) {
    if (event) event.stopPropagation();
    recentHistory.splice(index, 1);
    saveRecentHistory();
};

function clearRecentHistory() {
    if (recentHistory.length === 0) return;
    if (confirm('최근 본 한자 기록을 모두 삭제하시겠습니까?')) {
        recentHistory = [];
        saveRecentHistory();
        renderRecentList();
    }
}

function toggleRecentModal() {
    const modal = document.getElementById('recentModal');
    if (modal.style.display === 'none' || !modal.style.display) {
        renderRecentList();
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}