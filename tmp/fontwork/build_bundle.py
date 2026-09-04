import json, re, os, shutil

with open('manifest.json') as f:
    data = json.load(f)

# Map each unique remote URL -> a stable local filename.
url_to_local = {}
def slug(family):
    return re.sub(r'[^a-z0-9]+', '-', family.lower()).strip('-')

for d in data:
    if d['url'] not in url_to_local:
        fam_slug = slug(d['family'])
        # Distinguish files only when the same family+style actually has
        # multiple distinct source URLs (e.g. Comic Neue, Atkinson) --
        # variable-font families share one URL across all their weights.
        same_family_style_urls = sorted(set(
            x['url'] for x in data
            if x['family'] == d['family'] and x['style'] == d['style']
        ))
        if len(same_family_style_urls) > 1:
            idx = same_family_style_urls.index(d['url'])
            name = f"{fam_slug}-{d['style']}-{d['weight']}.woff2"
        else:
            name = f"{fam_slug}-{d['style']}.woff2"
        url_to_local[d['url']] = name

print('Local filenames:')
for u, n in url_to_local.items():
    print(' ', n, '<-', u[-40:])

# Copy each downloaded file to its final local name.
os.makedirs('bundled_fonts', exist_ok=True)
for u, local_name in url_to_local.items():
    src = 'downloads/' + u.split('/')[-1]
    shutil.copy(src, f'bundled_fonts/{local_name}')

# Rewrite each source CSS (latin-only blocks) with local url() paths.
def rewrite_css(latin_txt_path, out_path):
    with open(latin_txt_path) as f:
        text = f.read()
    blocks = [b for b in text.split('\n\n') if b.strip()]
    out_blocks = []
    for b in blocks:
        m = re.search(r"url\(([^)]+)\)", b)
        if not m:
            out_blocks.append(b)
            continue
        orig_url = m.group(1).strip('\'"')
        local_name = url_to_local[orig_url]
        new_url = f"/__native/fonts/{local_name}"
        new_block = b[:m.start()] + f"url({new_url})" + b[m.end():]
        out_blocks.append(new_block)
    with open(out_path, 'w') as f:
        f.write('\n\n'.join(out_blocks) + '\n')

rewrite_css('main-fonts.css.latin.txt', 'main-fonts.local.css')
rewrite_css('atkinson.css.latin.txt', 'atkinson.local.css')

print('\nDone. Files in bundled_fonts/:', len(os.listdir('bundled_fonts')))
print('Rewritten CSS: main-fonts.local.css, atkinson.local.css')
