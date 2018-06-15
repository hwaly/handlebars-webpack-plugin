const path = require('path');
const chalk = require('chalk');
const glob = require('glob');
const fs = require('fs-extra');
const Handlebars = require('handlebars');

/**
 *
 * @param {mixed} args
 */
const log = (...args) => {
    args.unshift(chalk.gray('HandlebarsPlugin: '));
    console.log.apply(console, args);
};



class HandlebarsPlugin {
    constructor(options) {
        this.options = Object.assign({
            pathEntry: path.join(__dirname, '../../handlebars'),
            pathOutput: path.join(__dirname, '../../../')
        }, options);


        //this.isValid({type: 'emptyEntryOutput', value: options.entryOutput});
        //this.isValid({type: 'ckeckEntryOutput', value: options.entryOutput});




        // if (!options.entryOutput) {
        //     throw log(chalk.red('"entryOutput"을 지정해주세요.'));
        // }
        //
        // this.root = path.resolve(__dirname, options.root);
        // this.outputRoot = path.resolve(__dirname, options.outputRoot);
        // this.entries = [];
        // this.outputs = [];
        // this.data = {};
        // this.fileDependencies = [];
        //
        // this.options = {
        //     entryOutput: options.entryOutput,
        //     data: path.resolve(this.root, '_data/_config.js'),
        //     partials: path.resolve(this.root, '_partials/**/*.hbs'),
        //     helpers: path.resolve(this.root, '_helpers/**/*.js')
        // };
        //
        // Object.assign(this.options, options);
        //
        // this.build();
    }

    isValid(type) {
        switch (type) {
            case 'emptyEntryOutput':
                if (!this.options.entryOutput || !this.options.entryOutput.length) {
                    return log(chalk.red('"entryOutput"을 지정해주세요.'));
                }

            case 'checkEntryOutput':
                if (!Array.isArray(this.options.entryOutput)) {
                    return log(chalk.red('"entryOutput"는 배열로 이루어져 있어야 합니다.'));
                }

                if (this.options.entryOutput.some(item => !(item.entry && item.output))) {
                    return log(chalk.red('"entryOutput" 안의  {entry: 경로, output: 경로}" 확인해주세요.'));
                }
        }
    }

    build() {
        this
            .buildEntryOutput()
            .register('helpers')
            .updateData()
    }

    buildEntryOutput() {
        isValid('emptyEntryOutput');
        isValid('checkEntryOutput');

        const options = this.options;
        const entryOutput = options.entryOutput.reduce((eachItems, filesPath) => {
            const pathEntry = options.pathEntry;
            const entryFiles = this.files(path.resolve(pathEntry, filesPath.entry));

            const outputFiles = entryFiles.map(file => {
                const entryFileName = path.basename(file.replace(pathEntry, '')).replace(path.extname(file), '');

                return path.resolve(options.pathOutput, filesPath.output.replace('[name]', entryFileName));
            });

            eachItems.entries = eachItems.entries.concat(entryFiles);
            eachItems.outputs = eachItems.outputs.concat(outputFiles);
        }, {entries: [], outputs: []});

        Object.assign(options, entryOutput);

        return this;
    }

    updateData(filePath) {
        this.data = Object.assign(this.data, require(filePath ? filePath : this.options.data));

        return this;
    }

    /**
     * helpers와 partials에 사용되는 아이디 생성
     *
     * @param {string} type
     * @param {string} path
     * @returns {string}
     */
    getId(type, path) {
        const id = {
            helpers: path => this.dashToUpper(path.match(/\/([^/]*).js$/).pop()),
            partials: path => path.match(/\/([^/]+\/[^/]+)\.[^.]+$/).pop()
        };

        return id[type](path);
    }

    /**
     * glob 패턴 파일들
     *
     * @param {string} globPath
     * @returns {array}
     */
    files(globPath) {
        return [].concat(glob.sync(globPath));
    }

    /**
     * 파일 내용 가져오기
     *
     * @param {string} filePath
     */
    read(filePath) {
        this.fileDependencies.push(filePath);

        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * 케밥 케이스를 카멜 케이스로 변경
     *
     * @param {string} text
     */
    dashToUpper(text) {
        return text.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * helpers와 partials에 등록
     *
     * @param {string} type
     */
    register(type) {
        this.files(this.options[type])
            .forEach(path => Handlebars[this.dashToUpper(`register-${type.replace(/s$/, '')}`)](this.getId(type, path), (type == 'partials' ? this.read(path) : require(path))));

        return this;
    }

    /**
     * 웹팩 플러그인 훅
     *
     * @param {compiler} compiler
     */
    apply(compiler) {
        compiler.plugin('make', (compilation, done) => {
            console.log('\n');
            this.register('partials');
            this.compileAllFile(done);
        });

        compiler.plugin('emit', (compilation, done) => {
            this.fileDependencies.forEach((fileDependency) => {
                const fileDependencyPath = path.normalize(fileDependency);

                if (!compilation.fileDependencies.includes(fileDependencyPath)) {
                    compilation.fileDependencies.push(fileDependencyPath);
                }
            });

            done();
        });
    }

    /**
     * 전체 파일 생성
     *
     * @param done
     */
    compileAllFile(done) {
        this.entries.forEach((entry, idx) => this.compileFile(entry, this.outputs[idx]));

        done();
    }

    /**
     * 파일 생성
     *
     * @param {string} entry
     * @param {string} output
     */
    compileFile(entry, output) {
        const templateContent = this.read(entry);
        const templateContentData = path.resolve(this.root, '_data', path.relative(this.root, entry).replace('.hbs', '.js'));
        const template = Handlebars.compile(templateContent);

        if (fs.existsSync(templateContentData)) {
            Object.assign(this.data, require(templateContentData));
        }

        const result = template(this.data);

        fs.outputFileSync(output, result, 'utf-8');

        log(chalk.magenta('파일 생성'), chalk.cyan(`'${output.replace(`${this.outputRoot}/`, '')}'`));
    }
}

HandlebarsPlugin.Handlebars = Handlebars;

module.exports = HandlebarsPlugin;