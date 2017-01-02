#!/bin/sh
rm -f chronos.zip
zip -r chronos.zip \
    manifest.* \
    *.html \
    *.css \
    *.js \
    icons/*.{png,svg} \
    bower_components/bootstrap/LICENSE \
    bower_components/bootstrap/dist/js/bootstrap.js \
    bower_components/bootstrap/dist/css/bootstrap.css \
    bower_components/bootstrap/dist/fonts/ \
    bower_components/jquery/LICENSE.txt \
    bower_components/jquery/dist/jquery.js \
    LICENSE
