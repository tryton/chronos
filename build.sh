#!/bin/sh
rm -f chronos.zip
zip -r chronos.zip \
    manifest.* \
    *.html \
    *.css \
    *.js \
    icons/*.{png,svg} \
    bower_components/bootstrap/{LICENSE,dist} \
    bower_components/jquery/{MIT-LICENSE.txt,dist/} \
    LICENSE
