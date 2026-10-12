import json
import re
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

d = json.load(open('F:\\2026\\欧洲儿童陪护机器人\\project_source\\data\\smartedu-textbooks.json','r',encoding='utf-8'))

# Test grade parsing on some titles
grade_patterns = [
    (r'一年级', 'Grade 1'),
    (r'二年级', 'Grade 2'),
    (r'三年级', 'Grade 3'),
    (r'四年级', 'Grade 4'),
    (r'五年级', 'Grade 5'),
    (r'六年级', 'Grade 6'),
    (r'七年级|初一', 'Grade 7'),
    (r'八年级|初二', 'Grade 8'),
    (r'九年级|初三', 'Grade 9'),
    (r'高一', 'Grade 10'),
    (r'高二', 'Grade 11'),
    (r'高三', 'Grade 12'),
]

# Find titles with high school keywords
hs_titles = []
for tb in d['textbooks']:
    title = tb['title']
    if '高中' in title or '必修' in title or '选择性必修' in title:
        grade = None
        for pattern, g in grade_patterns:
            if re.search(pattern, title):
                grade = g
                break
        if grade and 'Grade 10' <= grade <= 'Grade 12':
            hs_titles.append((title, grade))
        elif not grade:
            hs_titles.append((title, 'NO GRADE DETECTED'))

print(f"High school related titles: {len(hs_titles)}")
for title, grade in hs_titles[:30]:
    t = title.replace('\u2022','-')[:80]
    print(f"  [{grade}] {t}")
