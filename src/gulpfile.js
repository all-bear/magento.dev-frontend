var gulp = require('gulp');
var htmlrender = require('./lib/gulp-htmlrender');

gulp.task('templates', function(){
    gulp.src('./*.html')
        .pipe(htmlrender.render())
        .pipe(gulp.dest('../dist'));
});