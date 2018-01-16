const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');
const chalk = require('chalk');
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
        if (!options.entryOutput) {
            log(chalk.red('"entryOutput"을 지정해주세요.'));
            return;
        }

        this.root = path.resolve(__dirname, (options.root ? options.root : '../../handlebars'));
        this.outputRoot = path.resolve(__dirname, (options.outputRoot ? options.outputRoot : '../../../'));
        this.entries = [];
        this.outputs = [];
        this.data = {};
        this.fileDependencies = [];

        this.options = {
            entryOutput: options.entryOutput,
            data: path.resolve(this.root, '_data/_config.js'),
            partials: path.resolve(this.root, '_partials/**/*.hbs'),
            helpers: path.resolve(this.root, '_helpers/**/*.js')
        };

        this.build();
    }

    build() {
        this
            .buildEntryOutput()
            .register('helpers')
            .updateData()
    }

    buildEntryOutput() {
        this.options.entryOutput.forEach((filesPath) => {
            const entryFiles = this.files(path.resolve(this.root, filesPath[0]));
            const outputFiles = entryFiles.map(file => {
                const entryFileName = path.basename(file.replace(this.root, '')).replace(path.extname(file), '');

                return path.resolve(this.outputRoot, filesPath[1].replace('[name]', entryFileName));
            });

            this.entries = this.entries.concat(entryFiles);
            this.outputs = this.outputs.concat(outputFiles);
        });

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