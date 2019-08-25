#!/bin/sh
rm -f chronos.zip
for icon in icons/*.svg; do
    icon=`basename $icon`
    for size in 16 48 128; do
        convert -background none -resize $sizex$size icons/$icon icons/`basename $icon .svg`-$size.png
    done
done
zip -r chronos.zip \
    manifest.* \
    *.html \
    *.css \
    *.js \
    icons/*.svg \
    icons/*.png \
    bower_components/bootstrap/LICENSE \
    bower_components/bootstrap/dist/js/bootstrap.js \
    bower_components/bootstrap/dist/css/bootstrap.css \
    bower_components/bootstrap/dist/fonts/ \
    bower_components/jquery/LICENSE.txt \
    bower_components/jquery/dist/jquery.js \
    bower_components/mousetrap/LICENSE  \
    bower_components/mousetrap/mousetrap.js \
    LICENSE
