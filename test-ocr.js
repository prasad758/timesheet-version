import Tesseract from 'tesseract.js';
import fs from 'fs/promises';

const imagePath = process.argv[2];

if (!imagePath) {
    console.error('Usage: node test-ocr.js <image-path>');
    process.exit(1);
}

console.log('Testing OCR on:', imagePath);

try {
    const result = await Tesseract.recognize(imagePath, 'eng', {
        logger: m => {
            if (m.status === 'recognizing text') {
                console.log(`Progress: ${Math.round(m.progress * 100)}%`);
            }
        }
    });

    console.log('\n=== EXTRACTED TEXT ===');
    console.log(result.data.text);

    console.log('\n=== WORDS WITH BOUNDING BOXES ===');
    result.data.words.slice(0, 20).forEach((word, i) => {
        console.log(`${i}: "${word.text}" at (${word.bbox.x0}, ${word.bbox.y0})`);
    });

    console.log('\n=== TESTING FIELD PATTERNS ===');

    const patterns = [
        { name: 'employeeName', pattern: /(?:Name|Employee\s*Name)\s*[:\-]?\s*(?:Mr\.|Ms\.|Mrs\.)?\s*([A-Za-z\s]{3,})/i },
        { name: 'employeeName2', pattern: /this\s+is\s+to\s+certify\s+that\s+(?:mr\.|ms\.|mrs\.)?\s*([A-Za-z\s]{3,})/i },
        { name: 'designation', pattern: /(?:Designation|Position|Role)\s*[:\-]?\s*([A-Za-z\s]{3,})/i },
        { name: 'dateOfJoining', pattern: /(?:Date\s*of\s*Joining|Joining\s*Date)\s*[:\-]?\s*([\d\/\-\w\s,]{6,})/i },
    ];

    patterns.forEach(({ name, pattern }) => {
        const match = result.data.text.match(pattern);
        if (match) {
            console.log(`✓ ${name}: "${match[1]}"`);
        } else {
            console.log(`✗ ${name}: NO MATCH`);
        }
    });

} catch (error) {
    console.error('OCR Error:', error);
    process.exit(1);
}
