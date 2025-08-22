const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const rename = require('gulp-rename');
const del = require('del');
const through = require('through2');

// Configuration
const config = {
  src: 'origin',
  dest: 'dist',
  exclude: ['body.html', 'head.html']
};

// Clean dist folder
function clean() {
  return del([config.dest]);
}

// Minify all HTML files except excluded ones with individual file error handling
function minifyHTML() {
  return gulp.src([
    `${config.src}/*.html`,
    `!${config.src}/body.html`,
    `!${config.src}/head.html`
  ])
    .pipe(through.obj(function(file, enc, cb) {
      if (file.isNull()) {
        return cb(null, file);
      }
      
      const htmlminInstance = require('html-minifier').minify;
      
      try {
        const minified = htmlminInstance(file.contents.toString(), {
          collapseWhitespace: true,
          removeComments: false,
          removeEmptyAttributes: false,
          removeRedundantAttributes: false,
          removeScriptTypeAttributes: false,
          removeStyleLinkTypeAttributes: false,
          useShortDoctype: false,
          minifyCSS: false,
          minifyJS: false,
          processScripts: [],
          processConditionalComments: false,
          removeAttributeQuotes: false,
          removeEmptyElements: false,
          removeOptionalTags: false,
          removeTagWhitespace: false,
          sortAttributes: false,
          sortClassName: false,
          trimCustomFragments: false,
          collapseBooleanAttributes: false,
          conservativeCollapse: true,
          preserveLineBreaks: false,
          maxLineLength: 0,
          keepClosingSlash: false,
          caseSensitive: false,
          quoteCharacter: '"',
          customAttrAssign: [],
          customAttrSurround: [],
          customAttrCollapse: /^data-/
        });
        
        file.contents = Buffer.from(minified);
        console.log(`✓ Minified: ${file.relative}`);
      } catch (error) {
        console.log(`⚠ Skipped minification for ${file.relative} (keeping original)`);
        // Keep file as-is if minification fails
      }
      
      cb(null, file);
    }))
    .pipe(gulp.dest(config.dest));
}

// Copy excluded files without minification
function copyExcluded() {
  return gulp.src(config.exclude.map(file => `${config.src}/${file}`))
    .pipe(gulp.dest(config.dest));
}

// Watch for changes
function watch() {
  gulp.watch(`${config.src}/*.html`, gulp.series(minifyHTML, copyExcluded));
}

// Build task
const build = gulp.series(clean, minifyHTML, copyExcluded);

// Export tasks
exports.clean = clean;
exports.minifyHTML = minifyHTML;
exports.copyExcluded = copyExcluded;
exports.watch = watch;
exports.build = build;
exports.default = build;
