Riaktive
========

Riaktive is the Riak database Management Tool. 

Tested on Linux Ubuntu (Chrome, Opera, Firefox).

Features
--------
   
1. CRUD document operations
2. List of documents (keys) of bucket
3. Bucket properties changing
4. Nodes and server information
5. File loading (using HTML5 File Api)

Installing
----------

It's simple. Just run install.sh with first parameter of your server:

		sudo bash ./install.sh http://127.0.0.1:8091

It use CURL to download Riaktive files to Riak. Then you can open {your server}/riak/8protons.com_riaktive/index.html and start work ;)

Using
-----

Open this URL in your browser:

		{your server}/riak/8protons.com_riaktive/index.html

Known Issues
--------------

There are some browser-based (browsers zoopark :) ) issues. Here is the list:

### Firefox

Firefox doesn't download massive json objects. When the keys count is more than approximately 3000 - Firefox blocks the object download.

### Opera

Opera doesn't support the HTML5 File API. So, Opera can not upload the files to server.

### Chrome

Some of AJAX request is rejected because Chrome identify this requests as "cross-site request forgery".

### All

Every browser add to Content-type 'charset=utf-8' string. This break up image and audio\video file uploading. If you need this files to be uploaded - use native clients or CURL.

Comments
--------

It simple and limited by browsers bugs and features, so use this only on test servers or with low count documents buckets.

Fork this if you found any bugs or have a suggestion ;) WARNING! Code is a restricted area! Just kidding :D Code may looks messy in some places.

ToDo! ToDo! (train!)
--------------------

1. Query interface (link walking and map\reduce)
2. All browser support (for example using the TCP connection with JavaScript-Flash bridge)
3. Audio\video\image uploading support (the same - it needs TCP connection)

Something else, but i can't remember :D

Enjoy!
------

Yeah, relax and enjoy development with Riak and Riaktive ;)

License
-------

The MIT License

Copyright (c) 2010 Anthony Sekatski &lt;WealthyThinker@8protons.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
