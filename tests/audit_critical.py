import glob, json, os, re
from pathlib import Path

OUT = Path('public')
pages = list(OUT.rglob('*.html'))

results = {
    'total_pages': len(pages),
    'canonicals': {},
    'titles': {},
    'descriptions': {},
    'h1s': {},
    'robots_noindex': [],
    'missing_canonical': [],
    'missing_title': [],
    'missing_desc': [],
    'missing_h1': [],
    'hreflang_pairs': {},
    'placeholders': [],
    'schema_errors': [],
    'sitemap_discrepancies': [],
}

# Check sitemap
sitemap_text = (OUT / 'sitemap.xml').read_text(encoding='utf-8')
sitemap_urls = set(re.findall(r'<loc>(.*?)</loc>', sitemap_text))

for p in pages:
    rel = str(p.relative_to(OUT)).replace('\\', '/')
    text = p.read_text(encoding='utf-8')
    
    # Title
    m = re.search(r'<title>(.*?)</title>', text, re.DOTALL)
    if m:
        t = m.group(1).strip()
        results['titles'][rel] = t
    else:
        results['missing_title'].append(rel)
        
    # Meta description
    m = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', text)
    if m:
        results['descriptions'][rel] = m.group(1).strip()
    else:
        results['missing_desc'].append(rel)
        
    # Canonical
    m = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\'](.*?)["\']', text)
    if m:
        c = m.group(1).strip()
        results['canonicals'][rel] = c
        if rel != '404.html' and c not in sitemap_urls:
            results['sitemap_discrepancies'].append((rel, c, 'canonical not in sitemap'))
    else:
        if rel != '404.html':
            results['missing_canonical'].append(rel)
            
    # H1
    h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', text, re.DOTALL)
    if not h1s and rel != '404.html':
        results['missing_h1'].append(rel)
    else:
        results['h1s'][rel] = [re.sub(r'<[^>]+>', '', h).strip() for h in h1s]
        
    # Robots
    m = re.search(r'<meta\s+name=["\']robots["\']\s+content=["\'](.*?)["\']', text)
    if m and 'noindex' in m.group(1) and rel != '404.html':
        results['robots_noindex'].append(rel)
        
    # Placeholders
    if 'example.com' in text:
        occurrences = [line.strip() for line in text.splitlines() if 'example.com' in line]
        results['placeholders'].append((rel, occurrences))
        
    # Hreflang reciprocal check
hreflangs = {}
for p in OUT.rglob('*.html'):
    rel = str(p.relative_to(OUT)).replace('\\', '/')
    text = p.read_text(encoding='utf-8')
    pairs = re.findall(r'<link\s+rel=["\']alternate["\']\s+hreflang=["\'](.*?)["\']\s+href=["\'](.*?)["\']', text)
    if pairs:
        hreflangs[rel] = dict(pairs)

print(f'Pages with hreflang: {len(hreflangs)}')
hreflang_errors = []
for page, alts in hreflangs.items():
    for lang, alt_url in alts.items():
        if lang == 'x-default':
            continue
        # Find which page has this canonical
        alt_rel = None
        for r, c in results['canonicals'].items():
            if c == alt_url:
                alt_rel = r
                break
        if not alt_rel:
            hreflang_errors.append(f'{page} points to non-existent alternate {alt_url}')
        elif alt_rel not in hreflangs:
            hreflang_errors.append(f'{page} points to {alt_rel} which has NO hreflangs')
        else:
            # Check reciprocal link exists
            recip = hreflangs[alt_rel]
            my_canonical = results['canonicals'][page]
            if my_canonical not in recip.values():
                hreflang_errors.append(f'{page} ({my_canonical}) points to {alt_rel}, but {alt_rel} does not point back')

print(f'Hreflang reciprocal errors: {hreflang_errors}')

# Check image files referenced in og:image
og_images = set()
missing_images = []
for p in OUT.rglob('*.html'):
    text = p.read_text(encoding='utf-8')
    m = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']https://ageason\.com(/assets/img/.*?)["\']', text)
    if m:
        img_rel = m.group(1).lstrip('/')
        if not (OUT / img_rel).exists():
            missing_images.append(img_rel)
        og_images.add(img_rel)

print(f'Unique OG images used: {len(og_images)}')
print(f'Missing OG image files: {missing_images}')

# Count schema types
schemas = {}
for p in OUT.rglob('*.html'):
    text = p.read_text(encoding='utf-8')
    scripts = re.findall(r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', text, re.DOTALL)
    for s in scripts:
        try:
            data = json.loads(s)
            rel = str(p.relative_to(OUT)).replace('\\', '/')
            if '@graph' in data:
                for item in data['@graph']:
                    schemas.setdefault(item.get('@type'), []).append(rel)
            else:
                schemas.setdefault(data.get('@type'), []).append(rel)
        except:
            pass

print('Schema Types Summary:')
for k, v in sorted(schemas.items()):
    print(f'  {k}: {len(v)} occurrences across {len(set(v))} pages')



print('--- AUDIT REPORT SUMMARY ---')
print(f'Total HTML pages: {results["total_pages"]}')
print(f'Missing titles: {results["missing_title"]}')
print(f'Missing descriptions: {results["missing_desc"]}')
print(f'Missing canonicals (excl 404): {results["missing_canonical"]}')
print(f'Missing H1s (excl 404): {results["missing_h1"]}')
print(f'Accidental noindex on public pages: {results["robots_noindex"]}')
print(f'Schema JSON-LD syntax errors: {results["schema_errors"]}')
print(f'Sitemap vs Canonical discrepancies: {results["sitemap_discrepancies"]}')
print(f'Duplicate Titles count: {len(results["titles"]) - len(set(results["titles"].values()))}')
print(f'Placeholder occurrences (example.com): {len(results["placeholders"])}')
for rel, occ in results['placeholders']:
    print(f'  {rel}: {occ}')
