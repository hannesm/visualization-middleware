Function.prototype.curry = function () {
  // wir merken uns f
  var f = this
  if (arguments.length < 1) {
    return f //nothing to curry with - return function
  }
  var a = toArray(arguments)
  return function () {
    var b = toArray(arguments)
    return f.apply(this, a.concat(b))
  }
}

function toArray (xs) {
  return Array.prototype.slice.call(xs)
}

var shouldi = true

function initialize () {
    var canvas = document.getElementById('canvas')
    var graph = new Graph(canvas)
    graph.layouter = new HierarchicLayouter(canvas.width, canvas.height)
    canvas.onclick = function (event) {
        var x = event.pageX - canvas.offsetLeft
        var y = event.pageY - canvas.offsetTop
        var node = graph.findNodeAt(x, y)
        graph.setselected(node)
    }

    var phases = document.getElementById('phases')
    var output = document.getElementById("output")
    var debug = document.getElementById("debug")


    var lastfun = ""
    function handle_event (output, control, graph, event) {
        output.className = "normal"
        try {
            var val = event.data
            var res = eval(val)[0]
            var fun = "handle_" + res.type.replace(new RegExp("-", 'g'), "_")
            lastfun = fun
            var args = [graph, res]
            if (res.nodeid != undefined)
                args.push(graph.findNodeByID(res.nodeid))
            if (res.other != undefined)
                args.push(graph.findNodeByID(res.other))
            if (res.old != undefined)
                args.push(graph.findNodeByID(res.old))
            control[fun].apply(control, args)
            console.log("safely called " + fun)
        } catch (e) {
            console.log("failed at or after " + lastfun)
            output.className = "error"
            output.innerHTML = "error during " +  event + ": " + e
        }
    }

    var control = new Control()

    var evtSource = new EventSource("events")
    evtSource.onmessage = handle_event.curry(output, control, graph)


    var layout = document.getElementById("layout")
    layout.onclick = function () {
        graph.layout()
        graph.draw()
    }

}

function Control () {
}

Control.prototype = {
    handle_hello: function (graph, json) {
        //clearing graphs
        graph.clear()
    },

    handle_new_computation: function (graph, json) {
        graph.insertNodeByID(json.nodeid, json.description[1])
    },

    handle_add_temporary: function (graph, json, node, other) {
        var node = graph.insertNodeByID(json.nodeid, json.description[1])
        node.fillStyle = "lightblue"
        //it is the generator!
        var edge = graph.connect(other, node)
        edge.strokeStyle = "lightblue"
    },

    handle_next_computation_setter: function (graph, json, node, other, old) {
        graph.disconnect(node, old)
        var edge = graph.connect(node, other)
        edge.strokeStyle = "black"
    },

    handle_remove_temporary: function (graph, json, node) {
        graph.remove(node)
    },

    handle_remove_computation: function (graph, json, node) {
        graph.remove(node)
    },

    handle_remove_temporary_user: function (graph, json, node, other) {
        graph.disconnect(node, other)
    },

    handle_add_temporary_user: function (graph, json, node, other) {
        var edge = graph.connect(node, other)
        edge.strokeStyle = "lightblue"
    },

    handle_function_setter: function (graph, json, node, other, old) {
        graph.disconnect(old, node)
        var edge = graph.connect(other, node)
        edge.strokeStyle = "lightblue"
    },

    handle_generator_setter: function (graph, json, node, other, old) {
        graph.disconnect(old, node)
        var edge = graph.connect(other, node)
        edge.strokeStyle = "lightblue"
    },

    handle_highlight_queue: function (graph, json) {
        shouldi = false
    }
}

function clear_element (element) {
    while (element.hasChildNodes())
        element.removeChild(element.firstChild)
}
