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
    filterData();
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

    // 1. 데이터 정제 (BOM 제거)
    hanjaData = data.map(item => {
        const cleanItem = {};
        for (const key in item) {
            const cleanKey = key.replace(/^\ufeff/, '');
            cleanItem[cleanKey] = item[key];
        }
        return cleanItem;
    });

    // ▼▼▼ [누락된 부분 복구] 정렬된 데이터 생성 ▼▼▼
    sortedHanjaData = [...hanjaData].sort((a, b) => {
        const hanjaA = a['한자'];
        const hanjaB = b['한자'];
        if (hanjaA !== hanjaB) return hanjaA.localeCompare(hanjaB);
        return 0;
    });
    // ▲▲▲ 여기까지 ▲▲▲

    loadFavorites();
    loadDarkMode();
    initRecentView(); // <--- ★ 여기 추가해 주세요 ★
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

// 이벤트 리스너들
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.favorite-star');
    if (btn) {
        e.stopPropagation();
        toggleFavorite(btn.dataset.huneum, btn.dataset.gubun);
    }
});

document.addEventListener('click', (e) => {
    const badge = e.target.closest('.grade-badge');
    if (badge) {
        const gradeValue = badge.dataset.grade;
        if (gradeValue && gradeValue !== '-') {
            e.stopPropagation();
            selectedGrades = [gradeValue];
            updateGradeCheckboxes();
            updateGradeButtonLabel();
            filterDataAndReset();
        }
    }
});

document.addEventListener('click', (e) => {
    const badge = e.target.closest('.length-badge');
    if (badge) {
        const lengthValue = badge.dataset.length;
        if (lengthValue && lengthValue !== '없음') {
            e.stopPropagation();
            document.getElementById('lengthFilter').value = lengthValue;
            filterDataAndReset();
        }
    }
});

// 검색 X 버튼 기능
const clearSearchBtn = document.getElementById('clearSearchBtn');

searchInput.addEventListener('input', (e) => {
    // 검색어가 있을 때만 X 버튼 표시
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
            // [▼ 이렇게 수정하세요]
            const eum = (item['음'] || '').trim();  // 괄호로 감싸고 || '' 추가
            const gubun = item['구분'] || '';       // || '' 추가
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
        // [▼ 이렇게 수정하세요] (전부 다 || '' 붙이기)
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

    tbody.innerHTML = pageData.map(item => {
        // [▼ 이렇게 수정하세요]
        const huneum = item['훈음'] || '';
        const gubun = item['구분'] || '';
        const isFav = isFavorite(huneum, gubun);
        const gradeClass = getGradeClass(item['급수']);
        // ▼ 수정된 코드 (추천)
        let url = item['URL'] || '';
        // url이 있고(참이고), 동시에 'http'로 시작하지 않으면(이상한 데이터면) 빈 값으로 만들어버림
        if (url && !url.startsWith('http')) {
           url = ''; 
        }

        return `<tr>
            <td><button class="favorite-star ${isFav ? 'active' : ''}" data-huneum="${huneum}" data-gubun="${gubun}">${isFav ? '⭐' : '☆'}</button></td>
            <td class="hanja-char">${huneum}</td>
            <td>${gubun || '-'}</td>
            <td>${item['교육수준'] || '-'}</td>
            <td><span class="grade-badge ${gradeClass}" data-grade="${item['급수']}">${item['급수'] || '-'}</span></td>
            <td><span class="length-badge length-${item['장단음'] || '없음'}" data-length="${item['장단음']}">${item['장단음'] || '없음'}</span></td>
            <td>${url ? `<a href="${url}" target="_blank" class="blog-link" title="블로그 보기" aria-label="블로그 보기">🔗</a>` : '-'}</td>
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



// ===== 오류가 났던 부분 수정 (updateActiveFiltersDisplay) =====
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
    // 이 부분에서 줄바꿈 문제 해결을 위해 백틱(`)을 확실하게 사용
    container.innerHTML = chips.map(chip =>
        `<div class="filter-chip" data-filter-type="${chip.type}">
            <span class="filter-chip-label">${chip.label}:</span> 
            <span class="filter-chip-value">${chip.value}</span> 
            <button class="filter-chip-remove" data-filter-type="${chip.type}">×</button>
        </div>`
    ).join('');
}

// 필터 칩 삭제 이벤트
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip-remove');
    if (btn) {
        e.stopPropagation();
        const type = btn.dataset.filterType;
        if (type === 'education') educationFilter.value = '';
        if (type === 'length') lengthFilter.value = '';
        if (type === 'grade') {
            selectedGrades = [];
            updateGradeCheckboxes();
            updateGradeButtonLabel();
        }
        filterDataAndReset();
    }
});

// 급수 필터 드롭다운 UI 로직
function toggleGradeDropdown(e) {
    e.stopPropagation();
    gradeDropdown.classList.toggle('open');
}

document.addEventListener('click', (e) => {
    if (!gradeDropdown.contains(e.target)) gradeDropdown.classList.remove('open');
});

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
const MAX_RECENT_ITEMS = 30; // 저장할 최대 개수

function initRecentView() {
    loadRecentHistory();
    
    // 버튼 이벤트 연결
    const recentBtn = document.getElementById('recentViewBtn');
    const closeBtn = document.getElementById('closeRecentBtn');
    const clearBtn = document.getElementById('clearRecentBtn');
    const modal = document.getElementById('recentModal');

    if (recentBtn) recentBtn.addEventListener('click', toggleRecentModal);
    if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
    if (clearBtn) clearBtn.addEventListener('click', clearRecentHistory);
    
    // [수정됨] 테이블 내 링크 클릭 이벤트 위임
    document.getElementById('tableBody').addEventListener('click', function(e) {
        const linkBtn = e.target.closest('.blog-link'); // 클릭한 링크 요소(<a> 태그)
        
        if (linkBtn) {
            // 1. 클릭한 링크의 주소(href)를 가져옵니다. (이건 절대 변하지 않는 값!)
            const targetUrl = linkBtn.getAttribute('href');
            
            setTimeout(() => {
                // 2. 훈음 글자 대신 'URL'이 같은지 확인해서 데이터를 찾습니다.
                const item = sortedHanjaData.find(d => d['URL'] === targetUrl);
                
                if (item) {
                    addToRecent(item);
                } else {
                    console.log('데이터를 찾을 수 없습니다:', targetUrl); // 디버깅용
                }
            }, 0);
        }
    });

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
        
        // 모달이 열려있다면 리스트 즉시 갱신
        if (document.getElementById('recentModal') && document.getElementById('recentModal').style.display === 'flex') {
            renderRecentList();
        }
    } catch (e) {
        // 저장 실패 시 (용량 초과 등)
        console.error('로컬 스토리지 저장 실패:', e);
        
        // 만약 용량이 꽉 찼다면 가장 오래된(마지막) 항목을 하나 더 지우고 재시도하는 로직을 넣을 수도 있습니다.
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            alert('저장 공간이 부족하여 최근 본 한자를 저장할 수 없습니다.');
            // 선택 사항: 오래된 항목 강제 삭제 후 재시도 로직
            // recentHistory.pop(); 
            // saveRecentHistory();
        }
    }
}

function updateRecentCount() {
    const countSpan = document.getElementById('recentViewCount');
    if (countSpan) {
        countSpan.textContent = recentHistory.length;
    }
}

// [수정된 코드] addToRecent 함수
function addToRecent(item) {
    // 필요한 정보만 객체로 저장
    const historyItem = {
        hanja: item['한자'] || '',
        huneum: item['훈음'] || '',
        gubun: item['구분'] || '',
        url: item['URL'] || '',
        grade: item['급수'] || '',
        timestamp: Date.now()
    };
    
    // [개선됨] 중복 제거 로직 강화 (훈음 + 구분 조합으로 비교)
    // 즐겨찾기와 동일한 방식으로 완벽하게 고유성을 보장합니다.
    const uniqueKey = `${historyItem.huneum}|${historyItem.gubun}`;
    recentHistory = recentHistory.filter(h => `${h.huneum}|${h.gubun}` !== uniqueKey);
    
    // 맨 앞에 추가
    recentHistory.unshift(historyItem);
    
    // 최대 개수 제한
    if (recentHistory.length > MAX_RECENT_ITEMS) {
        recentHistory = recentHistory.slice(0, MAX_RECENT_ITEMS);
    }
    
    saveRecentHistory();
}

// [핵심] 한자 포맷팅 함수 (윗첨자 + 붙임표 처리)
function formatRecentHanja(item) {
    const hanja = item.hanja;
    const gubun = item.gubun || '';
    const huneum = item.huneum || '';
    
    // 1. 윗첨자 숫자 추출 (예: "式 법 식 - 2" -> "2")
    let sup = '';
    const match = huneum.match(/\s-\s(\d+)$/); // " - 숫자" 패턴 찾기
    
    if (match) {
        sup = `<sup>${match[1]}</sup>`;
    }
    
    // 2. 붙임표(-) 위치 결정
    if (gubun.includes('첫말')) {
        return `${hanja}${sup}-`;  // 예: 式²-
    } else if (gubun.includes('끝말') || gubun.includes('끝음절')) {
        return `-${hanja}${sup}`;  // 예: -式²
    } else {
        return `${hanja}${sup}`;   // 예: 式²
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
            <a href="${item.url}" target="_blank" class="recent-item-link" title="새 탭에서 보기">
                <span class="recent-hanja">${displayHanja}</span>
                <div class="recent-info">
                    <span class="recent-huneum">${item.huneum}</span>
                    <span class="recent-detail">${item.grade} | ${item.gubun}</span>
                </div>
            </a>
            <!-- onclick에 event 매개변수 추가 -->
            <button class="delete-recent-btn" onclick="deleteRecentItem(${index}, event)" aria-label="삭제" title="기록에서 삭제">×</button>
        `;
        list.appendChild(li);
    });
}

// HTML 문자열 onclick에서 호출하기 위해 window 객체에 등록
window.deleteRecentItem = function(index, event) {
    // 이벤트 전파 방지 추가 (모달 닫힘 방지)
    if (event) {
        event.stopPropagation();
    }
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
// ==========================================
//  🏗️ 테이블 헤더 고정 위치 자동 계산
// ==========================================

function adjustTableHeaderOffset() {
    const searchSection = document.querySelector('.search-section');
    const ths = document.querySelectorAll('th');
    
    if (!searchSection || ths.length === 0) return;

    // 검색 영역의 현재 높이 측정
    const headerHeight = searchSection.getBoundingClientRect().height;

    // 모든 th(테이블 헤더)에 top 위치 적용
    ths.forEach(th => {
        th.style.top = `${headerHeight}px`;
    });
}

// 이벤트 리스너 등록
window.addEventListener('resize', adjustTableHeaderOffset);
window.addEventListener('load', adjustTableHeaderOffset);
window.addEventListener('scroll', adjustTableHeaderOffset, { passive: true });

const observer = new MutationObserver(adjustTableHeaderOffset);
const searchSection = document.querySelector('.search-section');

if (searchSection) {
    observer.observe(searchSection, { 
        childList: true, 
        subtree: true,   
        attributes: true 
    });
}
