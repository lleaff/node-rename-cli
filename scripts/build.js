#!/usr/bin/env node

const spawnSync = require('child_process').spawnSync;

const makeExecutable = (filename) => spawnSync('chmod', ['+x', filename]);

const fs = require('fs');
const path = require('path');

const MemoryFS = require("memory-fs"); /* Pulled in by Webpack */
const mfs = new MemoryFS();

const webpack = require('webpack');
const webpackConfig = require('../webpack.config.js');

const outputFile = path.resolve(__dirname, '..', webpackConfig.output.filename)
                     .toString();

const shebang = '#!/usr/bin/env node\n\n';

const compiler = webpack(webpackConfig);
compiler.outputFileSystem = mfs;
compiler.run((err, _stats) => {
    if (err) { throw err; }
  console.log('outputFILE:',outputFile);//DEBUG
    let fileContent = mfs.readFileSync(outputFile);
    fileContent = shebang + fileContent;
    const tmpFile = `${outputFile}~`;
    fs.writeFile(tmpFile, fileContent, { flag: 'w' }, (err) => {
        if (err) { throw err; }
        fs.rename(tmpFile, outputFile, (err) => {
            if (err) { throw err; }
            makeExecutable(outputFile);
            console.log(`Build done (${outputFile}).`);
        });
    });
});
