import json
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

d = json.load(open('F:\\2026\\欧洲儿童陪护机器人\\project_source\\data\\smartedu-textbooks.json','r',encoding='utf-8'))
print(f"Total textbooks: {d['metadata']['total_textbooks']}")

# Stage distribution
stages = {}
for tb in d['textbooks']:
    s = tb.get('stage','unknown')
    stages[s] = stages.get(s, 0) + 1
print("\nBy Stage:")
for k,v in sorted(stages.items()):
    print(f"  {k}: {v}")

# Check high school
hs = [tb for tb in d['textbooks'] if tb.get('grade') and 'Grade 10' <= tb['grade'] <= 'Grade 12']
print(f"\nHigh school books: {len(hs)}")
if hs:
    t = hs[0]['title'].replace('\u2022','-')[:60]
    print(f"  Sample: {t}")

# Grade distribution
grades = {}
for tb in d['textbooks']:
    g = tb.get('grade')
    if g:
        grades[g] = grades.get(g, 0) + 1
print("\nBy Grade:")
for k,v in sorted(grades.items()):
    print(f"  {k}: {v}")

# Subject distribution
subjects = {}
for tb in d['textbooks']:
    s = tb.get('subject','other')
    subjects[s] = subjects.get(s, 0) + 1
print("\nBy Subject:")
for k,v in sorted(subjects.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}")

# Version distribution
versions = {}
for tb in d['textbooks']:
    v = tb.get('version','unknown')
    versions[v] = versions.get(v, 0) + 1
print("\nBy Version:")
for k,v in sorted(versions.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v}")

# File size
import os
size = os.path.getsize('F:\\2026\\欧洲儿童陪护机器人\\project_source\\data\\smartedu-textbooks.json')
print(f"\nFile size: {size/1024:.1f} KB")
