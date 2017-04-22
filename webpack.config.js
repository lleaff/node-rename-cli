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
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            }
        ]
    }
};
