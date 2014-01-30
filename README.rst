Compiler Intermediate Language Visualization
============================================

This is a reimplementation of an `earlier flow graph visualization <https://github.com/hannesm/FlowGraphVisualization>`__ developed in Java using the yfiles graph library. A short `demo video <https://opendylan.org/~hannes/test4.avi>`__ is available.

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
It listens on 1234 for compiler connections, and 8888 for webbrowser requests

It uses an event stream (server-sent events from HTTP spec)
