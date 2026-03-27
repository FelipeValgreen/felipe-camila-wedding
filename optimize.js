const fs = require('fs');
const htmlPath = 'index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add lazy loading and async decoding to all images
content = content.replace(/<img(.*?)>/gi, (match, p1) => {
    let newMatch = match;
    if (!p1.includes('loading="lazy"')) {
        newMatch = `<img${p1} loading="lazy" decoding="async">`;
    }
    return newMatch;
});

// 2. Add Theme Color for SEO/Mobile
if (!content.includes('<meta name="theme-color"')) {
    content = content.replace('</head>', '    <meta name="theme-color" content="#8FA382">\n</head>');
}

// 3. Defer non-critical scripts
// Only JS at the very end like supabase/main.js
content = content.replace('<script src="js/supabase-client.js"></script>', '<script src="js/supabase-client.js" defer></script>');
content = content.replace('<script src="js/main.js"></script>', '<script src="js/main.js" defer></script>');

// 4. Preload hero fonts
if (!content.includes('<link rel="preload"')) {
    const preloadFonts = `    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" as="style">`;
    content = content.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', preloadFonts + '\n    <link rel="preconnect" href="https://fonts.googleapis.com">');
}

fs.writeFileSync(htmlPath, content);
console.log('SEO and Performance optimizations applied successfully!');
