import csv
import json
import os

CSV_FILE = '블로그스팟검색_초성.csv'
JSON_FILE = 'public/data.json'

def generate_data():
    if not os.path.exists(CSV_FILE):
        print(f"❌ 오류: '{CSV_FILE}' 파일을 찾을 수 없습니다.")
        return

    json_data = []
    
    # utf-8-sig 처리를 통해 BOM(Byte Order Mark) 문제 방지
    with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            try:
                # '2획' 같은 문자열에서 숫자만 추출
                strokes_str = row.get('부수획수', '0').replace('획', '').strip()
                strokes = int(strokes_str) if strokes_str.isdigit() else 0
                
                # 부수 개수 추출
                count_str = row.get('부수개수', '0').strip()
                count = int(count_str) if count_str.isdigit() else 0
                
                # ID 추출
                id_str = row.get('ID', '0').strip()
                item_id = int(id_str) if id_str.isdigit() else 0

                item = {
                    "id": item_id,
                    "hanja": row.get('한자', '').strip(),
                    "huneum": row.get('훈음', '').strip(),
                    "sound": row.get('음', '').strip(),
                    "gubun": row.get('구분', '').strip(),
                    "edu_level": row.get('교육수준', '').strip(),
                    "grade": row.get('급수', '').strip(),
                    "length": row.get('장단음', '').strip(),
                    "url": row.get('URL', '').strip(),
                    "radical": row.get('부수', '').strip(),
                    "radical_name": row.get('부수훈음', '').strip(),
                    "radical_strokes": strokes,
                    "radical_count": count
                }
                
                # 빈 데이터 필터링 (아이디가 있는 유효한 데이터만 추가)
                if item["id"] > 0 and item["hanja"]:
                    json_data.append(item)
                    
            except Exception as e:
                print(f"⚠️ 데이터 파싱 오류 (ID: {row.get('ID', 'Unknown')}): {e}")

    # public 폴더가 없으면 생성
    os.makedirs('public', exist_ok=True)

    with open(JSON_FILE, mode='w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=1)

    print(f"✅ 변환 완료! 총 {len(json_data)}개의 데이터가 '{JSON_FILE}'에 저장되었습니다.")

if __name__ == '__main__':
    generate_data()
