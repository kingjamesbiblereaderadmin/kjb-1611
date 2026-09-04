import re, json

def parse_blocks(path):
    with open(path) as f:
        text = f.read()
    blocks = text.split('\n\n')
    results = []
    for b in blocks:
        if not b.strip():
            continue
        fam = re.search(r"font-family:\s*'([^']+)'", b)
        weight = re.search(r"font-weight:\s*(\d+)", b)
        style = re.search(r"font-style:\s*(\w+)", b)
        url = re.search(r"url\(([^)]+)\)", b)
        fmt = re.search(r"format\('([^']+)'\)", b)
        if fam and weight and style and url:
            results.append({
                'family': fam.group(1),
                'weight': weight.group(1),
                'style': style.group(1),
                'url': url.group(1).strip('\'"'),
                'format': fmt.group(1) if fmt else 'woff2',
            })
    return results

all_fonts = parse_blocks('main-fonts.css.latin.txt') + parse_blocks('atkinson.css.latin.txt')
print('Total font files to fetch:', len(all_fonts))
for f in all_fonts:
    print(f['family'], f['weight'], f['style'], f['format'], f['url'][:70])

with open('manifest.json', 'w') as f:
    json.dump(all_fonts, f, indent=2)
