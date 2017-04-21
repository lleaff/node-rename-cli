module.exports = {
    entry: './src/main.js',
    output: {
        filename: 'rename.js'
    },
    target: "node",
    externals: [
        'node_modules'
    ],
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel',
                query: {
                    presets: ['es2015'],
                    plugins: ['transform-es2015-destructuring']
                }
            }
        ]
    }
};
