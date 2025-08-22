const gulp = require('gulp');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const del = require('del');

// Configuration
const config = {
  src: 'functions',
  dest: 'functions',
  pattern: '*.js'
};

// Clean minified files
function clean() {
  return del([
    `${config.dest}/*.min.js`
  ]);
}

// Minify JavaScript files
function minifyJS() {
  return gulp.src(`${config.src}/${config.pattern}`)
    .pipe(uglify({
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 1
      },
      mangle: {
        toplevel: false,
        reserved: ['window', 'document', 'console', 'Error', 'Promise', 'Set', 'Map']
      },
      output: {
        beautify: false,
        comments: false
      }
    }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(config.dest))
    .on('end', () => {
      console.log('✓ JavaScript files minified successfully');
    });
}

// Watch for changes
function watch() {
  gulp.watch(`${config.src}/${config.pattern}`, minifyJS);
}

// Build task
const build = gulp.series(clean, minifyJS);

// Export tasks
exports.clean = clean;
exports.minifyJS = minifyJS;
exports.watch = watch;
exports.build = build;
exports.default = build;
