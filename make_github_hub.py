import pandas as pd
import os

# 데이터 파일 경로 설정
csv_path = 'e:/Program/Antigravity/hanja-search/블로그스팟검색_초성.csv'
html_output_path = 'e:/Program/Antigravity/hanja-search/public/hanja-1800-index.html'

df = pd.read_csv(csv_path)

def get_chosung(text):
    chosung_list = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
    if pd.isna(text) or not text: return ''
    char = str(text)[0]
    if '가' <= char <= '힣':
        ch1 = (ord(char) - ord('가')) // 588
        return chosung_list[ch1]
    return char

df['초성'] = df['음'].apply(get_chosung)

html = []

# --- 깃허브용 HTML 뼈대(머리) 및 캐노니컬 태그 ---
html.append('<!DOCTYPE html>')
html.append('<html lang="ko">')
html.append('<head>')
html.append('    <meta charset="UTF-8">')
html.append('    <meta name="viewport" content="width=device-width, initial-scale=1.0">')
html.append('    <title>한문교육용 기초한자 1800자 전체목차</title>')
html.append('    <!-- 원본(블로그스팟) 주소를 가리키는 캐노니컬 태그 -->')
html.append('    <link rel="canonical" href="https://korean-pronunciation.blogspot.com/2026/05/hanja-1800-index.html" />')
html.append('    <style>')
html.append('        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }')
html.append('        h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }')
html.append('        a { text-decoration: none; color: #0056b3; }')
html.append('        a:hover { text-decoration: underline; }')
html.append('        summary { font-size: 1.5em; font-weight: bold; cursor: pointer; padding: 5px; background-color: #f1f1f1; border-radius: 5px; }')
html.append('    </style>')
html.append('</head>')
html.append('<body>')
html.append('<h1>한문교육용 기초한자 1800자 전체목차</h1>')

# 본문 내용 생성 (블로그스팟과 동일하게 깔끔한 바 형태)
for chosung, group1 in df.groupby('초성'):
    html.append(f'<details style="margin-bottom: 10px;">')
    html.append(f'  <summary>[{chosung}] 그룹</summary>')
    html.append('  <div style="margin-left: 20px; padding-top: 10px;">')
    
    for eum, group2 in group1.groupby('음'):
        html.append(f'    <details style="margin-bottom: 5px;">')
        html.append(f'      <summary style="font-size: 1.2em; font-weight: bold; cursor: pointer; padding: 0; background: none; border-radius: 0;">{eum}</summary>')
        html.append('      <ul style="margin-top: 5px;">')
        
        for _, row in group2.iterrows():
            url = row['URL']
            hun_eum = row['훈음'] if not pd.isna(row['훈음']) else f"{row['한자']} {row['뜻']} {row['음']}"
            gubun = row['구분']
            
            gubun_label = f"<span style='color: #0066cc;'>[{gubun}]</span> " if gubun == '첫말' else f"<span style='color: #cc3300;'>[{gubun}]</span> "
            if pd.isna(gubun): gubun_label = ""
            
            html.append(f'        <li><a href="{url}" target="_blank" rel="noopener noreferrer">{gubun_label}{hun_eum}</a></li>')
            
        html.append('      </ul>')
        html.append('    </details>')
        
    html.append('  </div>')
    html.append('</details>')

html.append('</body>')
html.append('</html>')

with open(html_output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(html))

print(f"완벽한 깃허브 배포용 {html_output_path} 파일이 생성되었습니다!")
