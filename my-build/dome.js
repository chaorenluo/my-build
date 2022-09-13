const fs = require('fs');
const { build } = require('./dist/index');

async function buildTest() {
  const bundle = await build({
    inpurt: './test/index.js'
  });
  const res = bundle.generate();
  fs.writeFileSync('./test/bundle.js', res.code);
}

buildTest();