const autoprefixer = require('autoprefixer')
const csso = require('postcss-csso')
const sass = require('gulp-sass')
const gulp = require('gulp')
const rename = require('gulp-rename')
const postcss = require('gulp-postcss')

function css() {
    return gulp.src('./src/base.css', { sourcemaps: true })
        .pipe(sass())
        .pipe(postcss([autoprefixer, csso]))
        .pipe(rename('bundle.css'))
        .pipe(gulp.dest('./dist', { sourcemaps: '.' }))
}

exports.css = css
