import json
import requests
import re
import sys
import io
from collections import defaultdict

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ENTRY_URL = 'https://s-file-2.ykt.cbern.com.cn/zxx/ndrs/resources/tch_material/version/data_version.json'
OUTPUT_PATH = r'F:\2026\欧洲儿童陪护机器人\project_source\data\smartedu-textbooks.json'

HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Referer': 'https://basic.smartedu.cn/',
}

def get_part_urls():
    """Fetch data_version.json to get part file URLs."""
    print("Fetching data_version.json...")
    resp = requests.get(ENTRY_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    urls = data.get('urls', '').split(',')
    print(f"Found {len(urls)} part files.")
    return urls

def fetch_part(url):
    """Fetch a single part file and return its JSON data."""
    print(f"  Fetching: {url.split('/')[-1]}")
    resp = requests.get(url, headers=HEADERS, timeout=60)
    resp.raise_for_status()
    return resp.json()

def parse_grade_from_title(title):
    """Extract grade level from textbook title."""
    # Primary school (Grades 1-6)
    grade_patterns = [
        (r'一年级', 'Grade 1'),
        (r'二年级', 'Grade 2'),
        (r'三年级', 'Grade 3'),
        (r'四年级', 'Grade 4'),
        (r'五年级', 'Grade 5'),
        (r'六年级', 'Grade 6'),
        (r'七年级', 'Grade 7'),
        (r'八年级', 'Grade 8'),
        (r'九年级', 'Grade 9'),
        (r'初一', 'Grade 7'),
        (r'初二', 'Grade 8'),
        (r'初三', 'Grade 9'),
    ]
    for pattern, grade in grade_patterns:
        if re.search(pattern, title):
            return grade

    # High school patterns
    if '普通高中' in title or '高中' in title:
        if '必修' in title:
            if '第一册' in title or '上册' in title:
                return 'Grade 10'
            elif '第二册' in title or '下册' in title:
                return 'Grade 10'
            elif '第三册' in title or '中册' in title:
                return 'Grade 11'
            elif '第四册' in title:
                return 'Grade 11'
            elif '第五册' in title:
                return 'Grade 12'
        if '选择性必修' in title:
            if '第一册' in title or '上册' in title:
                return 'Grade 11'
            elif '第二册' in title or '中册' in title:
                return 'Grade 11'
            elif '第三册' in title or '下册' in title:
                return 'Grade 12'
            elif '第四册' in title:
                return 'Grade 12'
        # Default high school grade based on context
        return 'Grade 10'  # Default for high school books

    return None

def parse_education_stage(grade_en, tags):
    """Determine education stage from grade and tags."""
    if grade_en:
        if grade_en in ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']:
            return '小学'
        elif grade_en in ['Grade 7', 'Grade 8', 'Grade 9']:
            return '初中'
        elif grade_en in ['Grade 10', 'Grade 11', 'Grade 12']:
            return '高中'

    # Fallback: check tags for stage hints
    for tag in tags:
        tag_name = tag.get('tag_name', '')
        if '小学' in tag_name:
            return '小学'
        elif '初中' in tag_name:
            return '初中'
        elif '高中' in tag_name or '普通高中' in tag_name:
            return '高中'
    return '其他'

def parse_subject_from_tags(tags):
    """Extract subject from tag list."""
    subject_keywords = {
        '语文': 'Chinese',
        '数学': 'Math',
        '英语': 'English',
        '物理': 'Physics',
        '化学': 'Chemistry',
        '生物': 'Biology',
        '历史': 'History',
        '地理': 'Geography',
        '政治': 'Politics',
        '道德与法治': 'Morality and Law',
        '思想政治': 'Ideology and Politics',
        '科学': 'Science',
        '音乐': 'Music',
        '美术': 'Art',
        '体育': 'PE',
        '体育与健康': 'PE and Health',
        '艺术': 'Art',
        '信息': 'Information Technology',
        '技术': 'Technology',
        '书法': 'Calligraphy',
    }
    for tag in tags:
        tag_name = tag.get('tag_name', '')
        for keyword, english in subject_keywords.items():
            if keyword in tag_name:
                return keyword, english
    return None, None

def parse_version_from_tags(tags):
    """Extract textbook version/publisher from tag list."""
    known_versions = [
        '统编版', '人教版', '北师大版', '苏教版', '外研版', '鲁教版',
        '冀教版', '沪教版', '译林版', '部编版', '语文版', '湘教版',
        '中图版', '人教B版', '人教A版', '鄂教版', '粤教版',
        '川教版', '科粤版', '华师大版', '浙教版', '教科版',
        '岳麓版', '商务星版', '人教版（PEP）', '人教版(新起点)',
        '人教版（三起）', '人教版（六三制）', '人教版（五四制）',
        '外研版（一起）', '外研版（三起）', '科普版',
        '人音版', '人美版', '湘艺版', '辽海版', '花城版',
        '西南师大版', '接力版', '泰山版', '苏少版',
        '广西美术版', '赣美版', '岭南版', '湖南文艺版',
        # Additional versions found in data
        '北京版', '青岛版', '重庆大学版', '闽教版',
        '粤教沪外教版', '粤教粤人版', '沪科版', '北师大（三起）',
        '首师大版', '桂美版', '冀美版', '陕西人美版',
        '安徽文艺版', '西师大版', '晋教版', '重大版',
    ]
    for tag in tags:
        tag_name = tag.get('tag_name', '')
        if tag_name in known_versions:
            return tag_name
    return '未知版本'

def parse_semester(title):
    """Determine if textbook is first or second semester."""
    if '上册' in title or '第一册' in title:
        return '上'
    elif '下册' in title or '第二册' in title:
        return '下'
    return None

def build_catalog(all_books):
    """Build structured catalog from all textbook data."""
    catalog = {
        'metadata': {
            'source': '国家中小学智慧教育平台 (National Smart Education Platform)',
            'source_url': 'https://basic.smartedu.cn/tchMaterial',
            'publisher': '中华人民共和国教育部 (Ministry of Education, PRC)',
            'total_textbooks': len(all_books),
            'fetched_at': '2026-05-19',
        },
        'summary': defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(list)))),
        'textbooks': [],
    }

    for book in all_books:
        book_id = book.get('id', '')
        title = book.get('title', '')
        tags = book.get('tag_list', [])
        custom_props = book.get('custom_properties', {})

        tag_names = [t.get('tag_name', '') for t in tags]

        # Parse subject
        subject_cn, subject_en = parse_subject_from_tags(tags)
        if subject_cn is None:
            # Try to infer from title
            for kw in ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理',
                       '政治', '道德与法治', '科学', '音乐', '美术', '体育', '信息',
                       '书法', '艺术', '技术', '心理健康']:
                if kw in title:
                    subject_cn = kw
                    break

        # Parse version
        version = parse_version_from_tags(tags)

        # Parse grade
        grade_en = parse_grade_from_title(title)
        stage = parse_education_stage(grade_en, tags)

        # Parse semester
        semester = parse_semester(title)

        # Build PDF URL
        pdf_url = f'https://r3-ndr.ykt.cbern.com.cn/edu_product/esp/assets/{book_id}.pkg/pdf.pdf'

        textbook_entry = {
            'contentId': book_id,
            'title': title,
            'subject': subject_cn or '其他',
            'subject_en': subject_en or 'Other',
            'version': version,
            'grade': grade_en,
            'stage': stage,
            'semester': semester,
            'pdf_url': pdf_url,
            'language': book.get('language', 'zh'),
            'tags': tag_names,
            'size': custom_props.get('size'),
            'resolution': custom_props.get('resolution'),
        }

        catalog['textbooks'].append(textbook_entry)

        # Build summary
        if stage and subject_cn and grade_en:
            catalog['summary'][stage][subject_cn][version][grade_en].append({
                'title': title,
                'contentId': book_id,
                'semester': semester,
            })

    # Convert defaultdicts to regular dicts for JSON serialization
    def convert_dict(d):
        if isinstance(d, defaultdict):
            return {k: convert_dict(v) for k, v in d.items()}
        return d

    catalog['summary'] = convert_dict(catalog['summary'])
    return catalog

def main():
    print("=" * 60)
    print("Smart Education Platform Textbook Catalog Builder")
    print("=" * 60)

    # Step 1: Get part URLs
    part_urls = get_part_urls()

    # Step 2: Fetch all parts
    all_books = []
    for url in part_urls:
        try:
            books = fetch_part(url)
            if isinstance(books, list):
                all_books.extend(books)
                print(f"    -> Got {len(books)} textbooks")
            else:
                print(f"    -> Unexpected format: {type(books)}")
        except Exception as e:
            print(f"    -> Error: {e}")

    print(f"\nTotal textbooks fetched: {len(all_books)}")

    # Deduplicate by contentId
    seen_ids = set()
    unique_books = []
    for book in all_books:
        book_id = book.get('id', '')
        if book_id and book_id not in seen_ids:
            seen_ids.add(book_id)
            unique_books.append(book)
    print(f"Unique textbooks (after dedup): {len(unique_books)}")
    all_books = unique_books

    if not all_books:
        print("ERROR: No textbooks fetched!")
        return

    # Step 3: Build catalog
    print("\nBuilding structured catalog...")
    catalog = build_catalog(all_books)

    # Step 4: Print summary
    print("\n" + "=" * 60)
    print("SUMMARY BY STAGE AND SUBJECT")
    print("=" * 60)
    for stage in ['小学', '初中', '高中']:
        if stage in catalog['summary']:
            print(f"\n[{stage}]")
            for subject, versions in catalog['summary'][stage].items():
                total = sum(len(grades) for ver in versions.values() for grades in ver.values())
                print(f"  {subject}: {total} textbooks ({len(versions)} versions)")

    # Step 5: Show sample entries
    print("\n" + "=" * 60)
    print("SAMPLE TEXTBOOK ENTRIES")
    print("=" * 60)
    shown = set()
    for tb in catalog['textbooks']:
        key = (tb['stage'], tb['subject'], tb['version'], tb['grade'])
        if key not in shown and tb['grade']:
            shown.add(key)
            print(f"\n  Stage: {tb['stage']}, Subject: {tb['subject']}, "
                  f"Grade: {tb['grade']}, Version: {tb['version']}")
            title_safe = tb['title'].replace('\u2022', '-').replace('\u30fb', '-')
            print(f"  Title: {title_safe}")
            print(f"  ID: {tb['contentId']}")
            print(f"  PDF: {tb['pdf_url'][:80]}...")
            if len(shown) >= 20:
                break

    # Step 6: Save to file
    print(f"\nSaving catalog to: {OUTPUT_PATH}")
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print(f"Done! File size: {len(json.dumps(catalog, ensure_ascii=False))} chars")

if __name__ == '__main__':
    main()
