# Handlebars Webpack Plugin

npm i @hwaly/handlebars-webpack -D

```
// webpack.config.js

const path = require('path');
const HandlebarsPlugin = require('@hwaly/handlebars-webpack');

const module.exports = {
    // ... 기타 설정
    
    plugins: [
    
        new HandlebarsPlugin({
            // 생략 가능
            path: {
                // handlebars 파일 경로
                // default: path.resolve(process.cwd(), '../../handlebars')
                entry: '',
                
                // 변환 파일 경로
                // default: path.resolve(process.cwd(), '../../../')
                output: '',
                
                // Partials 폴더 설정
                // entry의 경로 안의 폴더명
                // default: '_partials'
                partials: '',
                
                // Helpers 폴더 설정
                // entry의 경로 안의 폴더명
                // default: '_helpers'
                helpers: '',
                
                // data 폴더 설정
                // entry의 경로 안의 폴더명
                // default: '_data'
                data: '',
            },
            
            // 원본과 변환 파일 설정
            // 필수값
            entryOutput: [
                {entry: '*.hbs', output: '[name].html'},
                {entry: 'sample/*.hbs', output: 'sample/[name].html'}
            ]

            // hooks
            onBeforeSetup: function (Handlebars) {},
            onBeforeAddPartials: function (Handlebars, partialsMap) {},
            onBeforeCompile: function (Handlebars, templateContent) {},
            onBeforeRender: function (Handlebars, data) {},
            onBeforeSave: function (Handlebars, resultHtml, filename) {},
            onDone: function (Handlebars, filename) {}
        })
        
    ]
};
```