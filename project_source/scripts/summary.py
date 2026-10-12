import json
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

d = json.load(open('F:\\2026\\欧洲儿童陪护机器人\\project_source\\data\\smartedu-textbooks.json','r',encoding='utf-8'))

print("=" * 70)
print("  国家中小学智慧教育平台 - Textbook Catalog Summary")
print("  National Smart Education Platform - Textbook Catalog Summary")
print("=" * 70)

m = d['metadata']
print(f"\nSource: {m['source']}")
print(f"URL: {m['source_url']}")
print(f"Publisher: {m['publisher']}")
print(f"Total Textbooks: {m['total_textbooks']}")
print(f"Fetched: {m['fetched_at']}")

print(f"\n{'=' * 70}")
print("  BREAKDOWN BY EDUCATION STAGE")
print(f"{'=' * 70}")

for stage_name in ['小学', '初中', '高中']:
    if stage_name not in d['summary']:
        continue
    stage_en = {'小学': 'Primary School (Grades 1-6)',
                '初中': 'Middle School (Grades 7-9)',
                '高中': 'High School (Grades 10-12)'}[stage_name]
    
    stage_data = d['summary'][stage_name]
    total = sum(
        count
        for subjects in stage_data.values()
        for versions in subjects.values()
        for grades in versions.values()
        for count in [len(grades)]
    )
    
    print(f"\n  {stage_name} ({stage_en}): {total} textbooks")
    print(f"  {'-' * 50}")
    
    for subject in sorted(stage_data.keys()):
        versions = stage_data[subject]
        subj_total = sum(
            len(grades)
            for ver in versions.values()
            for grades in ver.values()
        )
        ver_list = ', '.join(sorted(versions.keys())[:5])
        if len(versions) > 5:
            ver_list += f' ... (+{len(versions)-5} more)'
        print(f"    {subject}: {subj_total} textbooks")
        print(f"      Versions: {ver_list}")

print(f"\n{'=' * 70}")
print("  HIGH SCHOOL DETAIL")
print(f"{'=' * 70}")

hs_data = d['summary'].get('高中', {})
for subject in sorted(hs_data.keys()):
    versions = hs_data[subject]
    for ver in sorted(versions.keys()):
        grades = versions[ver]
        for grade in sorted(grades.keys()):
            books = grades[grade]
            for b in books:
                sem = b.get('semester', '?') or '?'
                title_short = b['title'][:60].replace('\u2022', '-')
                print(f"  [{subject}/{ver}/{grade}/{sem}] {title_short}")

print(f"\n{'=' * 70}")
print("  SAMPLE PDF URLS")
print(f"{'=' * 70}")

for tb in d['textbooks']:
    if tb['stage'] == '高中' and tb['subject'] == '数学' and 'A版' in tb.get('version', ''):
        print(f"\n  {tb['title'][:50]}")
        print(f"  PDF: {tb['pdf_url']}")
        if d['textbooks'].index(tb) > 5:
            break

print(f"\n{'=' * 70}")
print("  EUROPEAN GRADE MAPPING GUIDE")
print(f"{'=' * 70}")
print("""
  Chinese Grade   -> Approximate European Grade (ISCED)
  -----------------------------------------------------------
  一年级 (Grade 1)  -> Year 1 / CP  (age 6-7)
  二年级 (Grade 2)  -> Year 2 / CE1 (age 7-8)
  三年级 (Grade 3)  -> Year 3 / CE2 (age 8-9)
  四年级 (Grade 4)  -> Year 4 / CM1 (age 9-10)
  五年级 (Grade 5)  -> Year 5 / CM2 (age 10-11)
  六年级 (Grade 6)  -> Year 6 / 6eme (age 11-12) [ISLevel 1]
  七年级 (Grade 7)  -> Year 7 / 5eme (age 12-13) [ISLevel 2]
  八年级 (Grade 8)  -> Year 8 / 4eme (age 13-14)
  九年级 (Grade 9)  -> Year 9 / 3eme (age 14-15)
  高一 (Grade 10)   -> Year 10 / 2nde (age 15-16) [ISLevel 3]
  高二 (Grade 11)   -> Year 11 / 1ere (age 16-17)
  高三 (Grade 12)   -> Year 12 / Term (age 17-18)
""")

import os
fsize = os.path.getsize('F:\\2026\\欧洲儿童陪护机器人\\project_source\\data\\smartedu-textbooks.json')
print(f"File: smartedu-textbooks.json")
print(f"Size: {fsize/1024:.1f} KB")
print(f"Lines: 93054")
