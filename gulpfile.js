const gulp = require('gulp');
const eslint = require('gulp-eslint');
const uglify = require('gulp-uglify');
const pump = require('pump');
const babel = require('gulp-babel');

gulp.task('lint', function () {
    return gulp.src(['./src/**/*.js', './gulpfile.js'])
        .pipe(eslint({
            fix: true
        }))
        .pipe(eslint.format())
        .pipe(eslint.failOnError());
});

gulp.task('uglify', function (cb) {
    return pump([
        gulp.src(['./src/**/*.js'])
            .pipe(babel({
                presets: ['es2015'],
            })),
        uglify(),
        gulp.dest('dist')]);

});


