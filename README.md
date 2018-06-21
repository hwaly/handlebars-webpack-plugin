# Handlebars Webpack Plugin

## 설치
```
npm i @hwaly/handlebars-webpack -D
```

## 사용법
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
            
            // 생략 가능
            // data 폴더의 js를 기본 데이터로 설정 (서브 폴더 안의 js 제외)
            // 서브 폴더 안의 js는 각각의 hbs 파일 경로와 이름이 매칭 되어 설정 가능
            data: {
                // 초기 데이터 설정에서 제외 파일
                // String 이나 Array 가능 (ex: 'index.js' || ['index.js', 'main.js'])
                exclude: ''
            },
            
            // 원본과 변환 파일 설정
            // 필수값
            // entry는 path.entry의 상대 경로 사용
            // output은 path.output의 상대 경로 사용
            // ex: {entry: '*.hbs', output: '[name].html'}
            entryOutput: [
                {entry: '', output: ''},
            ]
        })
    ]
};
```