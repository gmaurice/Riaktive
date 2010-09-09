#!/bin/bash

curl -X PUT $1/riak/8protons.com_riaktive/index.html -H "Content-type: text/html" --data-binary @./core/index.html
curl -X PUT $1/riak/8protons.com_riaktive/bucket.html -H "Content-type: text/html" --data-binary @./core/bucket.html
curl -X PUT $1/riak/8protons.com_riaktive/document.html -H "Content-type: text/html" --data-binary @./core/document.html
curl -X PUT $1/riak/8protons.com_riaktive/riaktive.js -H "Content-type: application/javascript" --data-binary @./core/riaktive.js

curl -X PUT $1/riak/8protons.com_riaktive/8protons-logo.png -H "Content-type: image/png" --data-binary @./core/images/8protons-logo.png
curl -X PUT $1/riak/8protons.com_riaktive/delete-icon.png -H "Content-type: image/png" --data-binary @./core/images/delete-icon.png
curl -X PUT $1/riak/8protons.com_riaktive/fancybox.png -H "Content-type: image/png" --data-binary @./core/images/fancybox.png
curl -X PUT $1/riak/8protons.com_riaktive/fancybox-x.png -H "Content-type: image/png" --data-binary @./core/images/fancybox-x.png
curl -X PUT $1/riak/8protons.com_riaktive/fancybox-y.png -H "Content-type: image/png" --data-binary @./core/images/fancybox-y.png
curl -X PUT $1/riak/8protons.com_riaktive/gritter.png -H "Content-type: image/png" --data-binary @./core/images/gritter.png
curl -X PUT $1/riak/8protons.com_riaktive/left-icon.png -H "Content-type: image/png" --data-binary @./core/images/left-icon.png
curl -X PUT $1/riak/8protons.com_riaktive/plus-icon.png -H "Content-type: image/png" --data-binary @./core/images/plus-icon.png
curl -X PUT $1/riak/8protons.com_riaktive/riak-logo.png -H "Content-type: image/png" --data-binary @./core/images/riak-logo.png
curl -X PUT $1/riak/8protons.com_riaktive/right-icon.png -H "Content-type: image/png" --data-binary @./core/images/right-icon.png
curl -X PUT $1/riak/8protons.com_riaktive/tick-icon.png -H "Content-type: image/png" --data-binary @./core/images/tick-icon.png

curl -X PUT $1/riak/8protons.com_riaktive/favicon.ico -H "Content-type: image/x-icon" --data-binary @./core/images/favicon.ico

curl -X PUT $1/riak/8protons.com_riaktive/energycore.css -H "Content-type: text/css" --data-binary @./core/css/energycore.css

curl -X PUT $1/riak/8protons.com_riaktive/jquery.js -H "Content-type: application/javascript" --data-binary @./core/js/jquery.js
curl -X PUT $1/riak/8protons.com_riaktive/json2.js -H "Content-type: application/javascript" --data-binary @./core/js/json2.js
curl -X PUT $1/riak/8protons.com_riaktive/riak.js -H "Content-type: application/javascript" --data-binary @./core/js/riak.js
