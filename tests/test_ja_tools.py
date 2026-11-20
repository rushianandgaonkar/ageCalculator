from pathlib import Path
import re

for rel in ['ja/days/index.html', 'ja/era/index.html']:
    p = Path('public') / rel
    assert p.exists(), f'{rel} does not exist'
    text = p.read_text(encoding='utf-8')
    title = re.search(r'<title>(.*?)</title>', text).group(1)
    desc = re.search(r'<meta name="description" content="(.*?)"', text).group(1)
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', text, re.DOTALL).group(1)
    lede = re.search(r'<p class="lede">(.*?)</p>', text, re.DOTALL).group(1)
    print(f'=== {rel} ===')
    print('Title:', title)
    print('Desc:', desc)
    print('H1:', h1.strip())
    print('Lede:', lede.strip())
    # Check dashes in page title part before site name
    page_title = title.split(' | ')[0]
    assert '-' not in page_title, f'Dash in title: {page_title}'
    assert '–' not in page_title, f'En-dash in title: {page_title}'
    assert '—' not in page_title, f'Em-dash in title: {page_title}'
    
    # Check words in lede
    words = lede.strip().split()
    print('Lede word count:', len(words))
    
    # Check scripts
    scripts = re.findall(r'<script src="([^"]+)"', text)
    print('Scripts:', scripts)
    
    # Check breadcrumb and FAQ
    assert 'class="faq-section"' in text, f'FAQ missing in {rel}'
    assert 'class="site-footer' in text, f'Footer missing in {rel}'
    assert 'schema.org' in text, f'Schema missing in {rel}'

print('All ja tool verification assertions passed!')
