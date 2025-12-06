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
    } catch (error) {
        console.error('즐겨찾기 저장 실패:', error);
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

function getField(item, fieldName) {
    return item[fieldName] || item[`\ufeff${fieldName}`] || '';
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

    hanjaData = data;
    sortedHanjaData = [...hanjaData].sort((a, b) => {
        const hanjaA = getField(a, '한자');
        const hanjaB = getField(b, '한자');
        if (hanjaA !== hanjaB) return hanjaA.localeCompare(hanjaB);
        return 0;
    });

    loadFavorites();
    loadDarkMode();
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
            const eum = getField(item, '음').trim();
            const gubun = getField(item, '구분');
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
        const hanja = getField(item, '한자');
        const eum = getField(item, '음');
        const huneum = getField(item, '훈음');
        const gubun = getField(item, '구분');
        const gyoyuksujun = getField(item, '교육수준');
        const geubsu = getField(item, '급수');
        const jangdaneum = getField(item, '장단음');

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
        const huneum = getField(item, '훈음');
        const gubun = getField(item, '구분');
        const isFav = isFavorite(huneum, gubun);
        const gradeClass = getGradeClass(getField(item, '급수'));
        const url = getField(item, 'URL');

        return `<tr>
            <td><button class="favorite-star ${isFav ? 'active' : ''}" data-huneum="${huneum}" data-gubun="${gubun}">${isFav ? '⭐' : '☆'}</button></td>
            <td class="hanja-char">${huneum}</td>
            <td>${gubun || '-'}</td>
            <td>${getField(item, '교육수준') || '-'}</td>
            <td><span class="grade-badge ${gradeClass}" data-grade="${getField(item, '급수')}">${getField(item, '급수') || '-'}</span></td>
            <td><span class="length-badge length-${getField(item, '장단음') || '없음'}" data-length="${getField(item, '장단음')}">${getField(item, '장단음') || '없음'}</span></td>
            <td>${url ? `<a href="${url}" target="_blank" class="blog-link">블로그 보기</a>` : '-'}</td>
        </tr>`;
    }).join('');

    resultCount.textContent = `${new Set(data.map(i => getField(i, '한자'))).size}개 한자`;
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
