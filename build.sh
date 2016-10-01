#!/bin/sh
rm -f chronos.zip
zip -r chronos.zip \
    manifest.* \
    *.html \
    *.css \
    *.js \
    bower_components/bootstrap/{LICENSE,dist} \
    bower_components/jquery/{LICENSE.txt,dist/} \
    LICENSE
