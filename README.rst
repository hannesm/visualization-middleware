.. figure:: http://opendylan.org/~hannes/screen3.png
   :align: right

Compiler Intermediate Language Visualization
============================================

Building compilers is hard. Test cases for compilers are also
hard. Compiler optimizations are hard to debug (what failed that this
optimization did not kick in?). Some visualizations exist which
generate graph files (.dot or similar) which represents the control
and data flow at given points in time. These already make the life of
a compiler engineer much easier (instead of reading text output, she
can look at rendered graphs).

This project moves compiler visualization further on: it shows
animated graphs during compilation. The animations show the
modifications which were done during a specific optimization phase.

`Demo video of an earlier implementation.  <https://opendylan.org/~hannes/test4.avi>`__

This implementation uses a JavaScript frontend, thus the visualization is available in a browser.



Dependencies
============

* An open dylan compiler from `opendylan <https://opendylan.org>`__
* `http server <https://github.com/dylan-lang/http>`__
* `serialization <https://github.com/dylan-foundry/serialization>`__
* `graph.js <https://github.com/hannesm/graph.js>`__

Installation
============

Adjust path to document root in ``visualization-middleware.dylan``
Checkout graph.js into static/graph
Compile visualization-middleware
Start visualization-middleware

It listens by default on 8888 for webbrowser requests. It uses an
event stream (server-sent events from HTTP spec) to deliver the
tracing events of the compiler.
