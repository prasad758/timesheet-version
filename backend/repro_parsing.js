
const text = "We are pleased to confirm that *Shahzaib Ali* has successfully completed an internship";
const regex = /confirm\s+that\s+([\s\S]+?)\s+has\s+successfully/i;

const textBlocks = [
    { type: 'word', text: 'We', bbox: { x0: 10, y0: 10, x1: 20, y1: 20 } },
    { type: 'word', text: 'are', bbox: { x0: 25, y0: 10, x1: 35, y1: 20 } },
    { type: 'word', text: 'pleased', bbox: { x0: 40, y0: 10, x1: 50, y1: 20 } },
    { type: 'word', text: 'to', bbox: { x0: 55, y0: 10, x1: 65, y1: 20 } },
    { type: 'word', text: 'confirm', bbox: { x0: 70, y0: 10, x1: 80, y1: 20 } },
    { type: 'word', text: 'that', bbox: { x0: 85, y0: 10, x1: 95, y1: 20 } },
    { type: 'word', text: 'Shahzaib', bbox: { x0: 100, y0: 10, x1: 150, y1: 20 } }, // NO ASTERISKS in block
    { type: 'word', text: 'Ali', bbox: { x0: 160, y0: 10, x1: 180, y1: 20 } },     // NO ASTERISKS in block
    { type: 'word', text: 'has', bbox: { x0: 190, y0: 10, x1: 200, y1: 20 } },
    { type: 'word', text: 'successfully', bbox: { x0: 210, y0: 10, x1: 250, y1: 20 } }
];

console.log('Testing Regex...');
const match = text.match(regex);
if (match) {
    console.log('✅ Regex Matched:', match[1]);
    const value = match[1].trim();

    // LOGIC TO TEST:
    // Clean value of non-alphanumeric chars
    const valueClean = value.replace(/[^\w\s]/g, '');
    console.log('Cleaned Value:', valueClean);

    const valueWords = valueClean.split(/\s+/).filter(w => w.length > 1);
    console.log('Search Words:', valueWords);

    const foundWordBlocks = [];

    // Global search simulation
    valueWords.forEach(vw => {
        // Find blocks that include the word (case insensitive maybe?)
        // Note: My actual code used includes().
        const candidates = textBlocks.filter(b => b.text.includes(vw));
        if (candidates.length > 0) {
            console.log(`Found candidate for "${vw}":`, candidates[0].text);
            foundWordBlocks.push(candidates[0]);
        } else {
            console.log(`❌ No candidate for "${vw}"`);
        }
    });

    if (foundWordBlocks.length > 0) {
        console.log('✅ Success! Found blocks:', foundWordBlocks.length);
    } else {
        console.log('❌ Failed to find word blocks');
    }

} else {
    console.log('❌ Regex Failed');
}
