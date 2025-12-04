// 데이터 로드 및 초기화
let hanjaData = [];

// 페이지네이션 상태
let currentPage = 1;
const itemsPerPage = 20;

// 초성 및 음절 필터 상태
let selectedChosung = '';
let selectedSyllable = '';

// 즐겨찾기 상태
let favorites = new Set();
let showOnlyFavorites = false;

// 음절 캐시 (성능 개선)
let syllableCache = {};

// ===== 즐겨찾기 localStorage 관리 함수 =====

// localStorage에서 즐겨찾기 불러오기
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

// localStorage에 즐겨찾기 저장하기
function saveFavorites() {
    try {
        const favArray = Array.from(favorites);
        localStorage.setItem('hanja-favorites', JSON.stringify(favArray));
    } catch (error) {
        console.error('즐겨찾기 저장 실패:', error);
    }
}

// 즐겨찾기 토글 (추가/제거)
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

// 즐겨찾기 여부 확인
function isFavorite(huneum, gubun) {
    const uniqueKey = `${huneum}|${gubun}`;
    return favorites.has(uniqueKey);
}

// 즐겨찾기 개수 업데이트
function updateFavoritesCount() {
    const countElement = document.getElementById('favoritesCount');
    if (countElement) {
        countElement.textContent = favorites.size;
    }
}

// 즐겨찾기 필터 토글
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

// localStorage에서 다크모드 설정 불러오기
function loadDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        updateDarkModeButton(true);
    }
}

// 다크모드 토글
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark);
    updateDarkModeButton(isDark);
}

// 다크모드 버튼 아이콘 업데이트
function updateDarkModeButton(isDark) {
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
        btn.textContent = isDark ? '☀️' : '🌙';
        btn.title = isDark ? '라이트모드로 전환' : '다크모드로 전환';
    }
}

// 다크모드 버튼 초기화
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

// 기본 초성 매핑
function normalizeChosung(chosung) {
    const map = {
        'ㄲ': 'ㄱ',
        'ㄸ': 'ㄷ',
        'ㅃ': 'ㅂ',
        'ㅆ': 'ㅅ',
        'ㅉ': 'ㅈ'
    };
    return map[chosung] || chosung;
}

// 필드 정규화 함수 (BOM 처리)
function getField(item, fieldName) {
    return item[fieldName] || item[`\ufeff${fieldName}`] || '';
}

// 급수 배지 클래스 생성 함수
function getGradeClass(geubsu) {
    if (!geubsu || geubsu === '-') return 'grade-default';

    const gradeMap = {
        '8급': 'grade-8',
        '7-2급': 'grade-7-2',
        '7급': 'grade-7',
        '6-2급': 'grade-6-2',
        '6급': 'grade-6',
        '5-2급': 'grade-5-2',
        '5급': 'grade-5',
        '4-2급': 'grade-4-2',
        '4급': 'grade-4',
        '3-2급': 'grade-3-2',
        '3급': 'grade-3',
        '2급': 'grade-2',
        '1급': 'grade-1',
        '준특급': 'grade-special-2',
        '특급': 'grade-special'
    };

    return gradeMap[geubsu] || 'grade-default';
}


// 데이터 로드
fetch('data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // 데이터 유효성 검증
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('데이터가 비어있거나 형식이 올바르지 않습니다.');
        }

        hanjaData = data;
        loadFavorites();
        loadDarkMode();
        buildSyllableCache(); // 음절 캐시 생성
        displayData(hanjaData);
        initChosungFilter();
        initFavoritesButton();
        initClearFavoritesButton();
        initDarkModeButton();

        console.log(`✅ ${hanjaData.length}개의 한자 데이터 로드 완료`);
    })
    .catch(error => {
        console.error('데이터 로드 실패:', error);
        showErrorState(error);
    });

// 검색 및 필터
const searchInput = document.getElementById('searchInput');
const educationFilter = document.getElementById('educationFilter');
const gradeFilter = document.getElementById('gradeFilter');
const lengthFilter = document.getElementById('lengthFilter');

// Debounce 함수 (성능 최적화)
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

// 검색 입력에 debounce 적용 (300ms 지연)
searchInput.addEventListener('input', debounce(filterDataAndReset, 300));
educationFilter.addEventListener('change', filterDataAndReset);
gradeFilter.addEventListener('change', filterDataAndReset);
lengthFilter.addEventListener('change', filterDataAndReset);

// 음절 캐시 생성 함수 (성능 개선)
function buildSyllableCache() {
    syllableCache = {};
    const chosungs = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

    chosungs.forEach(chosung => {
        const syllables = new Set();
        hanjaData.forEach(item => {
            const eum = getField(item, '음').trim();
            const gubun = getField(item, '구분');

            if (!eum || eum.length === 0 || gubun.includes('끝음절')) {
                return;
            }

            const firstChar = eum.charAt(0);
            const actualChosung = getChosung(firstChar);
            const normalized = normalizeChosung(actualChosung);

            if (normalized === chosung) {
                syllables.add(eum);
            }
        });
        syllableCache[chosung] = Array.from(syllables).sort();
    });
}

// 초성 필터 초기화 함수
function initChosungFilter() {
    document.querySelectorAll('.chosung-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const chosung = this.dataset.chosung;

            document.querySelectorAll('.chosung-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            selectedChosung = chosung;
            selectedSyllable = '';

            if (chosung === '') {
                document.getElementById('syllableButtons').innerHTML = '';
                document.getElementById('syllableButtons').classList.remove('show');
            } else {
                generateSyllableButtons(chosung);
            }

            filterDataAndReset();
        });
    });
}

// 음절 버튼 생성 함수 (캐시 사용)
function generateSyllableButtons(chosung) {
    const syllableContainer = document.getElementById('syllableButtons');
    const sortedSyllables = syllableCache[chosung] || [];

    if (sortedSyllables.length === 0) {
        syllableContainer.innerHTML = '<div class="no-syllables-message">해당 초성으로 시작하는 한자가 없습니다.</div>';
        syllableContainer.classList.add('show');
        return;
    }

    let buttonsHTML = sortedSyllables.map(syllable =>
        `<button class="syllable-btn" data-syllable="${syllable}" aria-label="${syllable} 음절 필터">${syllable}</button>`
    ).join('');

    syllableContainer.innerHTML = buttonsHTML;
    syllableContainer.classList.add('show');

    syllableContainer.querySelectorAll('.syllable-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            syllableContainer.querySelectorAll('.syllable-btn').forEach(b => b.classList.remove('active'));

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
    const grade = gradeFilter.value;
    const length = lengthFilter.value;

    const filtered = hanjaData.filter(item => {
        const hanja = getField(item, '한자');
        const eum = getField(item, '음');
        const cheoteum = getField(item, '첫음');
        const ddeus = getField(item, '뜻');
        const gyoyuksujun = getField(item, '교육수준');
        const geubsu = getField(item, '급수');
        const jangdaneum = getField(item, '장단음');
        const gubun = getField(item, '구분');
        const huneum = getField(item, '훈음');

        const matchSearch = !searchTerm ||
            hanja.includes(searchTerm) ||
            eum.toLowerCase().includes(searchTerm) ||
            cheoteum.toLowerCase().includes(searchTerm) ||
            ddeus.toLowerCase().includes(searchTerm);

        const matchEducation = !education || gyoyuksujun === education;
        const matchGrade = !grade || geubsu.includes(grade);
        const matchLength = !length || jangdaneum === length;
        const matchSyllable = !selectedSyllable || eum === selectedSyllable;
        const notEndingWhenFiltered = !selectedSyllable || !gubun.includes('끝음절');
        const matchFavorites = !showOnlyFavorites || isFavorite(huneum, gubun);

        return matchSearch && matchEducation && matchGrade && matchLength && matchSyllable && notEndingWhenFiltered && matchFavorites;
    });

    displayData(filtered);

    // 접근성: 검색 결과 알림
    announceSearchResults(filtered.length);
}

function filterDataAndReset() {
    currentPage = 1;
    filterData();
}

// 접근성: 스크린 리더용 결과 알림
function announceSearchResults(count) {
    const uniqueCount = new Set([...hanjaData].filter(item => {
        // 현재 필터 조건에 맞는 항목들만 카운트
        const searchTerm = searchInput.value.toLowerCase();
        const education = educationFilter.value;
        const grade = gradeFilter.value;
        const length = lengthFilter.value;

        const hanja = getField(item, '한자');
        const eum = getField(item, '음');
        const cheoteum = getField(item, '첫음');
        const ddeus = getField(item, '뜻');
        const gyoyuksujun = getField(item, '교육수준');
        const geubsu = getField(item, '급수');
        const jangdaneum = getField(item, '장단음');
        const gubun = getField(item, '구분');
        const huneum = getField(item, '훈음');

        const matchSearch = !searchTerm ||
            hanja.includes(searchTerm) ||
            eum.toLowerCase().includes(searchTerm) ||
            cheoteum.toLowerCase().includes(searchTerm) ||
            ddeus.toLowerCase().includes(searchTerm);

        const matchEducation = !education || gyoyuksujun === education;
        const matchGrade = !grade || geubsu.includes(grade);
        const matchLength = !length || jangdaneum === length;
        const matchSyllable = !selectedSyllable || eum === selectedSyllable;
        const notEndingWhenFiltered = !selectedSyllable || !gubun.includes('끝음절');
        const matchFavorites = !showOnlyFavorites || isFavorite(huneum, gubun);

        return matchSearch && matchEducation && matchGrade && matchLength && matchSyllable && notEndingWhenFiltered && matchFavorites;
    }).map(item => getField(item, '한자'))).size;

    let announcement = document.getElementById('searchAnnouncement');
    if (!announcement) {
        announcement = document.createElement('div');
        announcement.id = 'searchAnnouncement';
        announcement.className = 'sr-only';
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        document.body.appendChild(announcement);
    }
    announcement.textContent = `${uniqueCount}개의 한자가 검색되었습니다.`;
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

    const sortedData = [...data].sort((a, b) => {
        const hanjaA = getField(a, '한자');
        const hanjaB = getField(b, '한자');
        const eumA = getField(a, '음');
        const eumB = getField(b, '음');
        const ddeusA = getField(a, '뜻');
        const ddeusB = getField(b, '뜻');
        const gubunA = getField(a, '구분');
        const gubunB = getField(b, '구분');

        if (hanjaA !== hanjaB) return hanjaA.localeCompare(hanjaB);
        if (eumA !== eumB) return eumA.localeCompare(eumB);
        if (ddeusA !== ddeusB) return ddeusA.localeCompare(ddeusB);

        const getNumber = (str) => {
            const match = str.match(/- (\d+)$/);
            return match ? parseInt(match[1]) : 0;
        };
        return getNumber(gubunA) - getNumber(gubunB);
    });

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = sortedData.slice(startIndex, endIndex);

    tbody.innerHTML = pageData.map(item => {
        const huneum = getField(item, '훈음');
        const gubun = getField(item, '구분');
        const gyoyuksujun = getField(item, '교육수준');
        const geubsu = getField(item, '급수');
        const jangdaneum = getField(item, '장단음');
        const url = getField(item, 'URL');
        const isFav = isFavorite(huneum, gubun);

        // XSS 방지를 위한 이스케이프
        const escapedHuneum = huneum.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedGubun = gubun.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        // 급수 배지 클래스 생성
        const gradeClass = getGradeClass(geubsu);

        return `
        <tr>
            <td>
                <button class="favorite-star ${isFav ? 'active' : ''}" 
                        onclick="toggleFavorite('${escapedHuneum}', '${escapedGubun}'); event.stopPropagation();"
                        aria-label="${huneum} ${isFav ? '즐겨찾기 제거' : '즐겨찾기 추가'}">
                    ${isFav ? '⭐' : '☆'}
                </button>
            </td>
            <td class="hanja-char">${huneum}</td>
            <td>${gubun || '-'}</td>
            <td>${gyoyuksujun || '-'}</td>
            <td><span class="grade-badge ${gradeClass}">${geubsu || '-'}</span></td>
            <td><span class="length-badge ${jangdaneum ? 'length-' + jangdaneum : 'length-없음'}">${jangdaneum || '없음'}</span></td>
            <td>
                ${url ?
                `<a href="${url}" target="_blank" rel="noopener noreferrer" class="blog-link" aria-label="${huneum} 한자 상세 보기">보기</a>` :
                '<span style="color:#999;">-</span>'}
            </td>
        </tr>
    `;
    }).join('');

    const uniqueHanja = new Set(sortedData.map(item => getField(item, '한자'))).size;
    resultCount.textContent = `${uniqueHanja}개 한자`;

    updatePagination(totalPages);

}

function updatePagination(totalPages) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageNumbers = document.getElementById('pageNumbers');

    if (totalPages === 0) {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        pageNumbers.innerHTML = '';
        return;
    }

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    const maxVisible = 10;
    let startPage, endPage;

    if (totalPages <= maxVisible) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const blockNumber = Math.ceil(currentPage / maxVisible);
        startPage = (blockNumber - 1) * maxVisible + 1;
        endPage = Math.min(blockNumber * maxVisible, totalPages);
    }

    let buttonsHTML = '';
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            buttonsHTML += `<button class="active" aria-label="현재 페이지 ${i}" aria-current="page">${i}</button>`;
        } else {
            buttonsHTML += `<button onclick="goToPage(${i})" aria-label="${i}페이지로 이동">${i}</button>`;
        }
    }

    pageNumbers.innerHTML = buttonsHTML;
}

function goToPage(page) {
    currentPage = page;
    filterData();
}

function nextPage() {
    currentPage++;
    filterData();
}

function prevPage() {
    currentPage--;
    filterData();
}

// 즐겨찾기 버튼 초기화
function initFavoritesButton() {
    const btn = document.getElementById('favoritesOnlyBtn');
    if (btn) {
        btn.addEventListener('click', toggleFavoritesFilter);
    }
}

// 즐겨찾기 전체 삭제
function clearAllFavorites() {
    if (favorites.size === 0) {
        alert('삭제할 즐겨찾기가 없습니다.');
        return;
    }

    if (confirm(`${favorites.size}개의 즐겨찾기를 모두 삭제하시겠습니까?`)) {
        favorites.clear();
        saveFavorites();
        updateFavoritesCount();

        if (showOnlyFavorites) {
            toggleFavoritesFilter();
        } else {
            filterData();
        }

        alert('모든 즐겨찾기가 삭제되었습니다.');
    }
}

function initClearFavoritesButton() {
    const btn = document.getElementById('clearFavoritesBtn');
    if (btn) {
        btn.addEventListener('click', clearAllFavorites);
    }
}

// 키보드 단축키 지원 (선택사항)
document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + K: 검색창 포커스
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }

    // 화살표 키로 페이지 이동 (검색창에 포커스가 없을 때만)
    if (document.activeElement !== searchInput) {
        if (e.key === 'ArrowLeft' && currentPage > 1) {
            prevPage();
        } else if (e.key === 'ArrowRight') {
            const totalPages = Math.ceil(
                hanjaData.filter(() => true).length / itemsPerPage
            );
            if (currentPage < totalPages) {
                nextPage();
            }
        }
    }
});
