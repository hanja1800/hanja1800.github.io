# Google 색인 분석: radicals.html만 색인된 이유

## 결론: 운이 아니라 **구조적 차이**가 있습니다

---

## 📊 3개 페이지 상태 비교

| 항목 | `radicals.html` ✅ | `index.html` ❌ | `hanja-1800-index.html` ❌ |
|------|:---:|:---:|:---:|
| **색인 상태** | 색인됨 | 크롤링됨 - 색인 미생성 | 크롤링됨 - 색인 미생성 |
| **사이트맵 포함** | ✅ 있음 | ✅ 있음 (`/` 경로) | ❌ **없음** |
| **HTML 정적 콘텐츠** | 풍부함 (테이블 구조, 198개 부수 언급) | 빈 테이블 (`<tbody>` 비어있음) | 1.1MB 정적 링크 목록 |
| **JS 렌더링 의존도** | 중간 (구조는 정적) | **높음** (데이터 100% JS 로드) | 낮음 (정적 HTML) |
| **canonical** | `radicals.html` (자기 자신) | `/` (자기 자신) | **blogspot** (다른 도메인!) |
| **내부 링크 수신** | ✅ `index.html`에서 링크 | `radicals.html`에서 링크 | ❌ **내부 링크 없음** |

---

## 🔍 각 페이지별 문제 분석

### 1. `index.html` — "크롤링됨 - 색인 미생성"

> [!WARNING]
> **핵심 원인: JS 렌더링 의존 + 빈 콘텐츠**

Googlebot이 이 페이지를 크롤링하면 보이는 것:
- `<tbody id="tableBody">` → **비어있음** (데이터가 `data.json`에서 JS로 로드)
- `<div id="loadingMsg">데이터를 불러오는 중입니다...</div>`
- 실질적 텍스트 콘텐츠가 필터 UI뿐

Google의 JS 렌더러(WRS)가 작동하더라도:
- **1,800자 × 7열 = 12,600개 셀**의 동적 테이블은 렌더링 부담이 큼
- 페이지네이션으로 한 번에 일부만 표시 → 대부분의 콘텐츠가 보이지 않음

### 2. `hanja-1800-index.html` — "크롤링됨 - 색인 미생성"

> [!WARNING]
> **핵심 원인: canonical이 다른 도메인을 가리킴**

```html
<link rel="canonical" href="https://korean-pronunciation.blogspot.com/2026/05/hanja-1800-index.html" />
```

- canonical이 **blogspot**을 가리키므로, Google은 "이 페이지의 원본은 blogspot에 있다"고 판단
- **GitHub Pages 버전을 색인할 이유가 없다**고 결정 → 색인 거부
- 추가로 사이트맵에도 이 URL이 없음
- `index.html`이나 `radicals.html`에서 이 페이지로 가는 내부 링크도 없음

### 3. `radicals.html` — ✅ 색인됨 (운이 아닌 이유)

- canonical이 **자기 자신**을 가리킴 → 정상
- 사이트맵에 포함 (priority 0.9)
- `index.html`에서 `<a href="radicals.html">🔍 부수별 검색 →</a>` 링크가 있음
- HTML에 정적 구조(테이블 헤더, 검색 UI, "198개 부수" 텍스트)가 있음
- 페이지의 meta description이 고유하고 의미 있음

---

## 🛠️ 해결 방안

### `index.html` 색인 개선

1. **SSR/정적 콘텐츠 추가**: 최소한 한자 목록 일부를 HTML에 정적으로 포함
2. 또는 `data.json` 로딩 후 `<noscript>` 태그에 주요 콘텐츠 요약 포함
3. 색인 생성을 다시 요청하고 **2~4주 대기** (새 사이트의 경우 시간이 필요)

### `hanja-1800-index.html` 색인 개선

> [!CAUTION]
> **canonical 태그가 blogspot을 가리키는 것이 의도적이라면**, 이 페이지는 GitHub Pages에서 색인되지 않는 것이 **정상적인 동작**입니다. canonical은 "원본은 저쪽에 있다"는 의미이므로.

**의도대로인 경우 (hub 페이지 역할만)**:
- 현재 설계가 맞음. 크롤러가 blogspot 링크를 따라가서 개별 페이지를 색인하는 것이 목적
- GitHub Pages 색인 자체는 불필요

**GitHub Pages도 색인하고 싶다면**:
- canonical을 자기 자신으로 변경: `https://hanja1800.github.io/hanja-1800-index.html`
- 사이트맵에 추가
- `index.html`에서 이 페이지로의 링크 추가

### 사이트맵 업데이트 필요

현재 `sitemap.xml`에 `hanja-1800-index.html`이 빠져 있습니다:

```xml
<!-- 현재 -->
<url><loc>https://hanja1800.github.io/</loc></url>
<url><loc>https://hanja1800.github.io/radicals.html</loc></url>

<!-- 추가 필요 -->
<url><loc>https://hanja1800.github.io/hanja-1800-index.html</loc></url>
```

---

## 📋 요약

| 페이지 | 색인 안 되는 이유 | 운인가? |
|--------|-------------------|---------|
| `radicals.html` | — | ❌ 운이 아님. 구조가 가장 좋음 |
| `index.html` | JS 의존 + 빈 HTML | 시간 문제일 수 있음 (2~4주 대기) |
| `hanja-1800-index.html` | canonical이 blogspot → **의도적 비색인** | 설계대로임 |
