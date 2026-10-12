import json
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

d = json.load(open('F:\\2026\\欧洲儿童陪护机器人\\project_source\\data\\smartedu-textbooks.json','r',encoding='utf-8'))

# Show unique tag names for books with unknown version
unknown_ver = [tb for tb in d['textbooks'] if tb['version'] == '未知版本']
print(f"Books with unknown version: {len(unknown_ver)}")

# Show first 10 unique tag patterns
seen_tags = set()
for tb in unknown_ver[:50]:
    for tag in tb['tags']:
        if tag not in seen_tags:
            seen_tags.add(tag)
            print(f"  Tag: {tag}")
            if len(seen_tags) >= 50:
                break
    if len(seen_tags) >= 50:
        break

print(f"\nTotal unique tags in unknown version books: {len(seen_tags)}")

# Show books with high school stage
hs = [tb for tb in d['textbooks'] if tb['stage'] == '高中']
print(f"\nHigh school books: {len(hs)}")
for tb in hs[:5]:
    t = tb['title'].replace('\u2022','-')[:80]
    print(f"  {t}")
    print(f"    Version: {tb['version']}, Grade: {tb['grade']}")
    print(f"    Tags: {tb['tags']}")

# Show books with unknown stage
unknown_stage = [tb for tb in d['textbooks'] if tb['stage'] == '未知']
print(f"\nUnknown stage books: {len(unknown_stage)}")
for tb in unknown_stage[:3]:
    t = tb['title'].replace('\u2022','-')[:80]
    print(f"  {t}")
    print(f"    Tags: {tb['tags']}")
