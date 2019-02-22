const gulp = require('gulp');
const gutil = require('gulp-util');
const cp = require('child_process');
const sass = require('gulp-sass');
const browserSync = require('browser-sync').create();
const header = require('gulp-header');
const rename = require('gulp-rename');
const postcss = require('gulp-postcss');
const cssnano = require('gulp-cssnano');
const autoprefixer = require('autoprefixer')
const pkg = require('./package.json');

/**
 * node-sass has an "includePaths" option that we can use to pass
 * an array of file paths where we want it to look for sass files
 * to import. Makes it much easier to include the sass files from
 * the Rivet npm package.
 */
const sassPaths = ['./node_modules/rivet-uits/sass/'];

const banner = `/*!
 *
 * Copyright (C) 2018 The Trustees of Indiana University
 * SPDX-License-Identifier: BSD-3-Clause

 * ${pkg.name} - @version ${pkg.version}
 */

`;

/**
 * Using Eleventy static site generator to compile Markdown docs
 * into HTML for testing/demo purposes. Uses the Nunjuck templates
 * inside './src/_includes` for layout.
 *
 * More about Eleventy here:
 * https://www.11ty.io/docs/
 *
 * More about Nunjucks here:
 * https://mozilla.github.io/nunjucks/
 */
gulp.task('eleventy', function (cb) {
  cp.exec('npx eleventy', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  })
})

gulp.task('eleventy:watch', function () {
  const eleventy = cp.spawn('npx', ['eleventy', '--watch']);

  const eleventyLogger = function (buffer) {
    buffer.toString()
      .split(/\n/)
      .forEach((message) => gutil.log('Eleventy: ' + message));
  };

  eleventy.stdout.on('data', eleventyLogger);
  eleventy.stderr.on('data', eleventyLogger);
})

gulp.task('sass', function () {
  return gulp
    .src('src/sass/**/*.scss')
    .pipe(sass({
      outputStyle: 'expanded',
      includePaths: sassPaths
    }).on('error', sass.logError))
    .pipe(gulp.dest('docs/css/'));
});

gulp.task('sass:watch', function() {
  gulp.watch('src/sass/**/*.scss', gulp.task('sass'));
});

// Development server
gulp.task('serve', function () {
  browserSync.init(
    ['docs/css/**/*.css', 'docs/js/**/*.js', 'docs/**/*.html'],
    {
      server: {
        baseDir: './docs'
      }
    }
  );
  gulp.watch('src/sass/**/*.scss', gulp.task('sass'));
  gulp.watch(['src/**/*.md', 'src/**/*.njk'], gulp.task('eleventy'));
});


gulp.task('css:copy', function() {
  return gulp.src('./docs/css/**/*.css')
    .pipe(gulp.dest('./dist/css/'));
});

gulp.task('css:minify', function () {
  return gulp.src('dist/css/' + pkg.name + '.css')
    .pipe(cssnano())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('dist/css/'));
});

gulp.task('css:prefix', function () {
  return gulp.src('dist/css/' + pkg.name + '.css')
    .pipe(postcss([autoprefixer({ browsers: ['last 2 versions'] })]))
    .pipe(gulp.dest('dist/css/'));
});


gulp.task('css:header', function (done) {
  gulp.src('dist/css/' + pkg.name + '.css')
    .pipe(header(banner, { pkg: pkg }))
    .pipe(gulp.dest('dist/css/'));

  gulp.src('dist/css/' + pkg.name + '.min.css')
    .pipe(header(banner, { pkg: pkg }))
    .pipe(gulp.dest('dist/css/'));

  done();
});

// Compiles, prefixes, minifies, and versions CSS
gulp.task(
  'release',
  gulp.series(
    'eleventy',
    'sass',
    'css:copy',
    'css:prefix',
    'css:minify',
    'css:header'
  )
);

gulp.task('default', gulp.parallel('eleventy:watch', 'serve'));