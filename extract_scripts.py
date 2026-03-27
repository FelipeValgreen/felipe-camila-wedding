import re
import os

html_path = 'index.html'
js_path = 'js/main.js'

with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

# We want to extract scripts that are not external (no src attribute)
# except the tailwind config and gtag in <head>.
# Let's target scripts after <body> tag.

body_start = html_content.find('<body')
head_content = html_content[:body_start]
body_content = html_content[body_start:]

# Find all inline scripts in body
script_pattern = re.compile(r'<script>(.*?)</script>', re.DOTALL)
scripts = script_pattern.findall(body_content)

if scripts:
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write('// Extracted from index.html\n\n')
        # We also need a simple Toast implementation so we prepend it
        f.write('''
// TOAST NOTIFICATION SYSTEM
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-sage';
    toast.className = `fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-white ${bgColor} shadow-xl z-[9999] opacity-0 transition-opacity duration-300 flex items-center gap-2 text-sm font-sans tracking-wide`;
    
    let icon = type === 'error' ? '<i class="fa-solid fa-circle-exclamation"></i>' : '<i class="fa-solid fa-circle-check"></i>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Fade out
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Global alert override
window.alert = function(msg) {
    showToast(msg, msg.toLowerCase().includes('error') || msg.includes('falta') || msg.includes('favor') ? 'error' : 'success');
};

''')
        for s in scripts:
            f.write(s)
            f.write('\n\n')

# Replace inline scripts in body with a single reference to main.js
# Just remove them all, and add <script src="js/main.js"></script> before </body>
new_body_content = script_pattern.sub('', body_content)

# Add our custom script reference at the bottom of the body
new_body_content = new_body_content.replace('</body>', '<script src="js/main.js"></script>\n</body>')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(head_content + new_body_content)

print(f"Extracted {len(scripts)} scripts to {js_path}")
