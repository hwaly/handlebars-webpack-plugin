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

const err = (...args) => {
    args.unshift(chalk.gray('HandlebarsPlugin: '));
    throw (args ? args.join('') : '에러');
};



class HandlebarsPlugin {
    constructor(options = {}) {
        this.options = options;

        this.init();

        console.log(this.options);


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
    }

    init() {
        const options = this.options;
        const entryOutput = options.entryOutput;

        if (!(entryOutput && entryOutput.length)) {
            err(chalk.red('init '), '"entryOutput"을 지정해주세요.');
        }

        if (!Array.isArray(entryOutput)) {
            err(chalk.red('init '), '"entryOutput"는 배열로 이루어져 있어야 합니다.');
        }

        if (entryOutput.some(item => !(item.entry && item.output))) {
            err(chalk.red('init '), '"entryOutput" 안의 {entry: 경로, output: 경로} 확인해주세요.');
        }

        this
            .initPath()
            .initFile()
            .initEntryOutput()
            .initData()
            .register('helpers');
    }

    initPath() {
        const folder = {
            entry: path.resolve(process.cwd(), '../../handlebars'),
            output: path.resolve(process.cwd(), '../../../'),
            partials: '_partials',
            helpers: '_helpers',
            data: '_data'
        };
        const pathes =  this.options['path'];

        if (pathes) {
            const pathTypes = Object.keys(pathes);
            const isString = pathTypes.some(pathType => typeof pathes[pathType] !== 'string');
            const isEmpty = pathTypes.some(pathType => !pathes[pathType].trim());

            if (isString) {
                err(chalk.red('initPath '), '파일 경로를 확인해주세요.');
            }

            if (isEmpty) {
                err(chalk.red('initPath '), '파일 경로의 값이 없습니다.');
            }

            ['entry', 'output'].forEach(pathType => {
                if (pathes[pathType]) {
                    folder[pathType] = pathes[pathType];
                }
            });

            ['partials', 'helpers', 'data'].forEach(pathType => {
                folder[pathType] = path.resolve(folder['entry'], (pathes[pathType] || folder[pathType]));
            });
        }

        Object.assign(this.options, {path: folder});

        return this;
    }

    initFile() {
        const options = this.options;
        const pathes = options.path;

        Object.assign(options, {
            file: {
                partials: path.resolve(pathes['partials'], '**/*.hbs'),
                helpers: path.resolve(pathes['helpers'], '**/*.js'),
                data: path.resolve(pathes['data'], '*.js'),
            }
        });

        return this;
    }

    initEntryOutput() {
        const options = this.options;
        const pathEntry = options.path.entry;
        const pathOutput = options.path.output;

        const entryOutput = options.entryOutput.reduce((eachItems, filesPath) => {
            const entryFiles = this.files(path.resolve(pathEntry, filesPath.entry));

            const outputFiles = entryFiles.map((file) => {
                const entryFileName = path.basename(file.replace(pathEntry, '')).replace(path.extname(file), '');

                return path.resolve(pathOutput, filesPath.output.replace('[name]', entryFileName));
            });

            eachItems.entries = eachItems.entries.concat(entryFiles);
            eachItems.outputs = eachItems.outputs.concat(outputFiles);

            return eachItems;
        }, {entries: [], outputs: []});

        delete options['entryOutput'];

        Object.assign(options.file, entryOutput);

        return this;
    }

    initData() {
        const options = this.options;
        const files = this.files(options.file.data);
        const data = {};

        files.forEach(file => Object.assign(data, require(file)));

        Object.assign(options, {data});

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
        const method = {
            helpers: path => this.toCamelCase(path.replace(`${this.options.path[type]}/`, '').replace(/.js$/, '')),
            partials: path => path.match(/\/([^/]+\/[^/]+)\.[^.]+$/).pop()
        };

        return method[type](path);
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
    toCamelCase(text) {
        return text.replace(/[-\/](\w)/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * helpers와 partials에 등록
     *
     * @param {string} type
     */
    register(type) {
        const files = this.files(this.options.file[type]);
        const registerType = this.toCamelCase(`register-${type.replace(/s$/, '')}`);

        files.forEach(path => {
            const id = this.getId(type, path);
            const source = (type === 'partials' ? this.read(path) : require(path));

            Handlebars[registerType](id, source);
        });

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
        const pathEntry = this.options.entry;
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