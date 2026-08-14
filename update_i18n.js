const fs = require('fs');

function updateJson(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  if (!data.study) {
    data.study = {};
  }
  
  data.study.filterAll = file.includes('ar.json') ? "All Decks / جميع البطاقات" : "All Decks";
  data.study.filterPart61 = file.includes('ar.json') ? "Part 61 (الرخص والأهلية)" : "Part 61 (Licensing)";
  data.study.filterPart91 = file.includes('ar.json') ? "Part 91 (قواعد الطيران التشغيلية)" : "Part 91 (Operating Rules)";
  data.study.filterPart121_135 = file.includes('ar.json') ? "Part 121 / 135 (النقل التجاري والرحلات العارضة)" : "Part 121 / 135 (Commercial)";
  data.study.filterSaelpt = file.includes('ar.json') ? "SAELPT (مصطلحات الطيران بالإنجليزية)" : "SAELPT (Aviation English)";

  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

updateJson('src/i18n/en.json');
updateJson('src/i18n/ar.json');
