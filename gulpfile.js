var gulp = require('gulp');
var download = require('gulp-download');
var through = require('through');
var $Factory = require('jquery');
var jsdom = require("jsdom").jsdom;
var fs = require('filendir');
var path = require('path');
var rename = require('gulp-rename');
var crypto = require('crypto');
var config = JSON.parse(require('fs').readFileSync('./config.json'));

var PROJECT_DIR = 'src';
var TEMPLATES_FOLDER_NAME = 'templates';

/**
 *
 * @param content
 *
 * @return {content: (any), templates: Array} like {content: content, templates: {filename: fileContent}}
 */
function parseTemplates(content) {
    var doc = jsdom(content);
    var window = doc.defaultView;
    var $ = $Factory(window);
    var templates = {};

    function firstLevel(el, sel) {
        var allChilds = el.find(sel);

        return allChilds.not(allChilds.find(sel));
    }

    function parseTemplates(el) {
        var templateEls = firstLevel(el, config.magento.debugTemplateSelector);

        templateEls.each(function (i, el) {
            parseTemplates($(el));
        });

        var templateFileEl = el.find(config.magento.debugTemplateFileSelector);

        if (templateFileEl.length) {
            var templatePath = TEMPLATES_FOLDER_NAME + '/' + templateFileEl.text().replace(config.magento.folder, '');

            templateFileEl.remove();

            var templateContent = el.html().trim();

            templatePath = templatePath + '.' + crypto.createHash('md5').update(templateContent).digest("hex");

            if (!templateContent) {
                templateContent = '<!-- empty template in ' + templatePath + ' -->';
            }

            templates[templateContent] = templatePath;

            el.replaceWith('<!--include src="' + templatePath + '"-->');
        }
    }

    parseTemplates($('body'));

    return {content: $('html')[0].outerHTML, templates: templates};
}

function saveTemplates(templates, page) {
    Object.keys(templates).forEach(function(content) {
        var name = templates[content];
        var templateFullPath = path.resolve(__dirname, PROJECT_DIR, name);

        fs.writeFileSync(templateFullPath, content);
    });
}

gulp.task('parse', function () {
    config.parse.pages.forEach(function (page) {
        var url = config.magento.url + '/' + page;

        download(url)
            .pipe(through(function (file) {
                var pageContent = String(file.contents);
                var parsedData = parseTemplates(pageContent);

                var pageName = page.replace(/[^a-zA-Z0-9]/, '-');
                if (!pageName) {
                    pageName = 'index';
                }

                saveTemplates(parsedData.templates, pageName);

                file.contents = new Buffer(parsedData.content);
                file.path = pageName;

                this.push(file);
            }))
            .pipe(rename(function (path) {
                path.extname = ".html"
            }))
            .pipe(gulp.dest(path.resolve(__dirname, PROJECT_DIR)));
    });
});


