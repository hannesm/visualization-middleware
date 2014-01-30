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


function initialize () {
    var graph = new Graph()
    var canvas = document.getElementById('canvas')
    var ctx = canvas.getContext('2d')
    graph.context = ctx
    canvas.onclick = function (event) {
        var x = event.pageX - canvas.offsetLeft
        var y = event.pageY - canvas.offsetTop
        var node = graph.findNodeAt(x, y)
        graph.setselected(node)
    }

    var phases = document.getElementById('phases')
    var output = document.getElementById("output")
    var debug = document.getElementById("debug")


    function handle_event (output, control, graph, event) {
        output.className = "normal"
        try {
            var val = event.data
            var res = eval(val)[0]
            var fun = "handle_" + res.type.replace(new RegExp("-", 'g'), "_")
            console.log("fun is " + fun)
            control[fun](graph, res)
            console.log("safely called")
        } catch (e) {
            output.className = "error"
            output.innerHTML = "error during " +  event + ": " + e
        }
    }

    var control = new Control()

    var evtSource = new EventSource("events")
    evtSource.onmessage = handle_event.curry(output, control, graph)


    var layout = document.getElementById("layout")
    layout.onclick = function () {
        graph.layout(canvas)
        graph.draw(ctx)
    }

}

function Control () {
}

Control.prototype = {
    handle_hello: function (graph, json) {
        console.log("handler called")
        alert("hello " + json["connection-identifier"])
    },

    handle_new_computation: function (graph, json) {
        graph.insertNodeByID(json.nodeid, json.description[1])
    },

    handle_add_temporary: function (graph, json) {
        graph.insertNodeByID(json.nodeid, json.description[1])
    },

    handle_next_computation_setter: function (graph, json) {
        var node = graph.findNodeByID(json.nodeid)
        var n, o = null
        if (json.other)
            n = graph.findNodeByID(json.other)
        if (json.old)
            o = graph.findNodeByID(json.old)
        if (n != o) {
            if (o) graph.disconnect(node, o)
            if (n) graph.connect(node, n, "control")
        }
    },

    handle_add_temporary_user: function (graph, json) {
        var node = graph.findNodeByID(json.nodeid)
        var o = null
        if (json.other)
            o = graph.findNodeByID(json.other)
        if (o)
            graph.connect(o, node, "data")
    }

}

function clear_element (element) {
    while (element.hasChildNodes())
        element.removeChild(element.firstChild)
}
