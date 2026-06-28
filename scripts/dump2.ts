const res = await fetch('https://bdocodex.com/tip.php?id=skill--1119&l=us&nf=on', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://bdocodex.com/us/skillbuilder/',
  },
})
const text = await res.text()
console.log('First 200:', JSON.stringify(text.slice(0, 200)))
console.log('Has tag_skill-description:', text.includes('tag_skill-description'))
console.log('Has card item_info:', text.includes('card item_info'))
