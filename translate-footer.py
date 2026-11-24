import os
import re
import time

base = os.path.expanduser('~/100panik')
js_path = os.path.join(base, 'public/js/app.js')

with open(js_path, 'r') as f:
    js = f.read()

# Nou ranplase mo Franse/Kreyòl yo ak mo Anglè
replacements = {
    '<h4>BOUTIQUE</h4>': '<h4>Shop</h4>',
    'Collection complète': 'All Collections',
    'Sweats à capuche': 'Hoodies',
    'Soulye': 'Shoes',
    '<h4>KLIYAN</h4>': '<h4>Customers</h4>',
    'Swiv Kòmand': 'Track Order',
    'Panier': 'Cart',
    'Kòmand': 'Checkout',
    '<h4>KONTAK</h4>': '<h4>Contact</h4>',
    'Tout dwa rezève.': 'All rights reserved.'
}

for old, new in replacements.items():
    js = js.replace(old, new)

with open(js_path, 'w') as f:
    f.write(js)

print("✅ app.js footer mete an Anglè.")

# Fòse yon nouvo vèsyon pou cache a pa kenbe l
version = str(int(time.time()))
html_files = ['index.html', 'collection.html', 'product.html', 'cart.html', 'checkout.html', 'track.html', 'account.html', 'ads.html', 'affiliate.html']

for file in html_files:
    path = os.path.join(base, 'public', file)
    if os.path.exists(path):
        with open(path, 'r') as f:
            html = f.read()
        html = re.sub(r'src="/js/app\.js(\?v=\d+)?"', 'src="/js/app.js?v=' + version + '"', html)
        with open(path, 'w') as f:
            f.write(html)

print("✅ Cache refresh fèt ak vèsyon " + version)

# Pouse sou GitHub
os.system("git add .")
os.system("git commit -m 'Translate footer to English and fix cache'")
os.system("git push")
